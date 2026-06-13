# DOX — app/api/admin/

Parent: [`../AGENTS.md`](../AGENTS.md) → [`../../AGENTS.md`](../../AGENTS.md) → [`../../../AGENTS.md`](../../../AGENTS.md)

## Purpose

Internal admin tooling. All endpoints are protected by `x-admin-secret` header. Never exposed to end users.

## Ownership

These routes are called by cron jobs, manual curl commands, and CI scripts — never by the frontend UI.

## Local Contracts

### Auth pattern (required on every handler)

```typescript
function auth(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev fallback when CRON_SECRET not set
  return req.headers.get("x-admin-secret") === secret;
}
// In handler:
if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

### Response shape (required)

```typescript
{ ok: true, processed: number, failed: number, matches?: string[], errors?: string[] }
```

### Route inventory

| Route | Method | Purpose |
|---|---|---|
| `generate-stats/` | POST | Seed `match_stats` for finished matches. Uses Claude if `ANTHROPIC_API_KEY` set; algorithmic fallback otherwise. Body: `{ days?: number, matchId?: number }` |
| `bulk-analyze/` | POST | Seed `ai_analyses` for unanalyzed matches. Uses Claude; template fallback otherwise. Body: `{ days?: number, maxMatches?: number }` |
| `seed-wc-teams/` | POST | Insert 48 WC2026 nations into `teams` table. Idempotent — de-duped by `short_name`. |
| `matches/` | POST | Bulk-create matches. Body: `{ matches: MatchInput[] }` or single `MatchInput`. Skips self-matches. |
| `live/[matchId]/` | POST / PATCH | POST: inject a live event (goal auto-scores, own_goal scores for opponent). PATCH: update status/score/current_minute/stats. |
| `indexes/` | POST | Create DB indexes. Safe to run multiple times. |
| `env-check/` | GET | Returns `{ ok, env: { [key]: { set: boolean, length: number \| null } } }` for all known env vars. Values are masked. |

### Stats generation (`generate-stats/`)

- Uses seeded PRNG (`seededRand(matchId * 17 + homeScore * 100 + awayScore)`) — same matchId always yields same stats.
- Claude called first if key present; `algorithmicStats()` used on failure or absence.
- Response includes `method: "claude" | "algorithmic"`.

### Bulk analysis (`bulk-analyze/`)

- Calls Claude → falls back to `templateInsights()` on error or missing key.
- Template insights are keyed to win/draw/loss + xG comparison.
- Response includes `methods: { claude?: number, template?: number }`.

### Live event injection (`live/[matchId]`)

- `POST` body: `{ type: string, minute?: number, playerId?: number, description?: string }`
- Goal types: `"goal"` increments `home_score` or `away_score` depending on `teamId`. `"own_goal"` increments the **opponent's** score.
- `ensureTables()` runs schema setup before any operation.

## Work Guidance

- All new admin endpoints must follow the auth pattern above — no exceptions.
- Idempotent by default: use `ON CONFLICT DO NOTHING` on all inserts.
- Cap external API call loops at 20 items. Add delays between Claude calls (500 ms min) to avoid rate limits.
- Never return raw DB error messages in the response — slice to 40–60 chars max.

## Verification

- All endpoints return 401 without `x-admin-secret`.
- `env-check` returns correct `set: false` for `ANTHROPIC_API_KEY` in current production environment.
- `generate-stats` with `{"days":30}` returns `processed > 0` when finished matches exist without stats.

## Child DOX Index

No child AGENTS.md. Individual route subdirectories are leaf nodes covered by this doc.
