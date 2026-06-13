# DOX — app/api/cron/

Parent: [`../AGENTS.md`](../AGENTS.md) → [`../../AGENTS.md`](../../AGENTS.md) → [`../../../AGENTS.md`](../../../AGENTS.md)

## Purpose

Scheduled background jobs invoked daily by Vercel cron. Sync match fixtures, update scores, send digest emails, and refresh team metadata from external APIs.

## Ownership

Vercel Hobby plan: daily schedules only. Defined in [`vercel.json`](../../../vercel.json).

## Local Contracts

### Schedule (from `vercel.json`)

| Cron | Route | Purpose |
|---|---|---|
| `0 7 * * *` | `sync-matches/` | Fetch today's fixtures from football-data.org |
| `0 6 * * *` | `nightly-results/` | Update scores for matches that finished yesterday |
| `0 8 * * 1` | `weekly-digest/` | Send weekly summary emails via Resend |
| `0 2 * * *` | `sync-teams/` | Refresh team metadata from football-data.org |

### Auth pattern

Vercel invokes crons as `GET` with `Authorization: Bearer <CRON_SECRET>`.

```typescript
const auth = req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

### football-data.org integration (`sync-matches/`)

- Competitions synced: `["WC", "UNL", "EC", "CLI"]`.
- Free tier limit: **10 requests per minute**. Add ≥ 7 s delay between competition fetches.
- `ensureTeam(fdTeam)` matches existing teams by TLA before inserting new ones.
- Deduplication: `external_id INT UNIQUE` on both `teams` and `matches`. Use `ON CONFLICT (external_id) DO UPDATE`.
- If `FOOTBALL_DATA_API_KEY` is not set, return `503` with setup instructions — do not crash silently.

### Email digest (`weekly-digest/`)

- Uses Resend via `lib/email.ts`. If `RESEND_API_KEY` is absent, skip gracefully — log but do not error.
- Digest covers matches from the past 7 days with at least one AI analysis.

## Work Guidance

- All cron routes must export `export const dynamic = "force-dynamic"` and `export const maxDuration = 60`.
- Log progress at each step (processed/skipped/failed counts) — cron failures are diagnosed from logs only.
- Never change cron schedules to sub-daily without migrating to a paid Vercel plan first.
- `sync-matches/` inserts use `ON CONFLICT (external_id) DO UPDATE` — safe to re-run any number of times.

## Verification

- Each cron route returns 401 when called without the correct `Authorization` header.
- `sync-matches/` returns `503` with a descriptive message when `FOOTBALL_DATA_API_KEY` is not set.
- `sync-matches/` returns `{ ok: true, synced: N }` when called with a valid key and reachable API.

## Child DOX Index

No child AGENTS.md. Leaf node.
