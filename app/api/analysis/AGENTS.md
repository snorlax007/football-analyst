# DOX — app/api/analysis/

Parent: [`../AGENTS.md`](../AGENTS.md) → [`../../AGENTS.md`](../../AGENTS.md) → [`../../../AGENTS.md`](../../../AGENTS.md)

## Purpose

On-demand AI match analysis for authenticated users. Enforces per-user and per-org monthly quotas. Caches results in `ai_analyses` for 24 hours to avoid quota double-spend.

## Ownership

`app/api/analysis/[matchId]/route.ts` is the only route that exposes Claude-generated analysis to end users. Bulk admin seeding is handled separately in `app/api/admin/bulk-analyze/`.

## Local Contracts

### Auth and quota flow

1. `getSession()` — return 401 if not authenticated.
2. `checkRateLimit()` — return 429 if rate limit hit.
3. Resolve effective tier: org tier overrides personal tier when user is an org member.
4. `getPlanLimits(effectiveTier).analysesPerMonth` — return 403 with `upgradeUrl` if quota exhausted.
5. Check `ai_analyses` cache (last 24 h) — return cached result immediately, quota not consumed.
6. Guard `if (!process.env.ANTHROPIC_API_KEY)` — return 503.
7. Increment quota **before** calling Claude (prevents races on concurrent requests).
8. Call Claude, parse JSON, insert into `ai_analyses`.
9. Fire webhook async for org members.

### Plan quotas (from `lib/stripe.ts`)

| Tier | `analysesPerMonth` |
|---|---|
| `free` | 3 |
| `pro` | 30 |
| `org_*` | Varies — check `getPlanLimits()` |

### Anthropic client

- **Lazy singleton only.** `let _anthropic = null; function getAnthropic() { ... }`.
- Module-level `new Anthropic(...)` was the root cause of a production outage — never revert to it.
- Model: `claude-sonnet-4-6` for on-demand user analysis (higher quality than Haiku used in bulk).

### Cache key

- `ai_analyses` row with `match_id = id AND created_at > NOW() - INTERVAL '24 hours'`.
- Cache hit: return `{ insights, model, remaining, quotaType, cached: true }`.
- Cache miss: generate, insert, return `{ insights, model, remaining, quotaType }`.

### Inngest background dispatch

- If `INNGEST_EVENT_KEY` is set and not `"local"`, dispatch `analysis/requested` event and return `{ status: "queued" }` immediately.
- Quota is still incremented before dispatch.

## Work Guidance

- Never remove the 24 h cache check — it prevents quota drain on page refreshes.
- If adding a new model option, update the `model` field stored in `ai_analyses` accordingly.
- The `ai_analyses` table uses `ON CONFLICT DO NOTHING` — bulk-seeded template analyses have `model: "template-v1"` and will be replaced when a user triggers real Claude analysis (cache expires after 24 h).
- Webhook delivery (`deliverWebhook(...)`) must always be fire-and-forget `.catch(() => {})`.

## Verification

- Unauthenticated `POST` returns 401.
- Authenticated `POST` on a match with a cached analysis returns the cached result without calling Claude.
- After quota is exhausted, returns 403 with `upgradeUrl: "/pricing"`.

## Child DOX Index

No child AGENTS.md. Leaf node.
