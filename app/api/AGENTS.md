# DOX — app/api/

Parent: [`../AGENTS.md`](../AGENTS.md) → [`../../AGENTS.md`](../../AGENTS.md)

## Purpose

All Next.js App Router API route handlers. Every file exports named HTTP method functions (`GET`, `POST`, `PATCH`, `DELETE`) — never a default export.

## Ownership

Route handlers are server-only. No browser APIs. Every handler that reads from the DB or inspects request headers must export `export const dynamic = "force-dynamic"`.

## Local Contracts

### Universal handler rules

- Return `NextResponse.json({ error: "..." }, { status: N })` for all error paths — never throw unhandled.
- Auth-required routes call `getSession()` first; return 401 before touching the DB.
- Admin routes check `x-admin-secret === process.env.CRON_SECRET` before processing.
- `maxDuration = 60` on any route that calls an external API or loops over DB rows.

### Route group map

| Subdirectory | Responsibility |
|---|---|
| `admin/` | Internal admin tools — stats seeding, bulk analysis, live event injection, env diagnostics |
| `analysis/[matchId]` | On-demand Claude analysis with quota enforcement and 24 h cache |
| `auth/` | Login, logout, register, session check (`/me`) |
| `billing/` | Stripe checkout session and portal redirect |
| `cron/` | Daily scheduled jobs — match sync, nightly results, weekly digest, team sync |
| `live/[matchId]` | SSE stream: `connected` → `state` → `event` / `stats` every 5 s |
| `matches/` | Match CRUD; `matches/live` polled every 15 s by the UI |
| `org/` | Org creation, invite management, member CRUD |
| `push/` | Web Push subscription management |
| `report/` | PDF generation via `@react-pdf/renderer` |
| `scouting/` | Player search, shortlist management |
| `team/` | Team follow, trends, season stats |
| `teams/` | Team listing and detail |
| `user/` | User team preferences, usage stats |
| `v1/` | Public REST API (requires `Authorization: Bearer <api-key>` header) |
| `webhooks/` | Stripe webhook receiver; user webhook config CRUD |
| `keys/` | API key create/revoke |
| `invite/[token]` | Accept org invite via token |
| `fantasy/` | Fantasy pick submission |
| `formation/[matchId]` | Tactical formation data |
| `og/` | Dynamic OG image generation |
| `pre-match/` | Pre-match AI prediction |
| `inngest/` | Inngest background job receiver |
| `health/` | `GET /api/health` — returns `200 ok` |
| `widget/[matchId]` | Embeddable match widget data |

### SSE rules (`live/[matchId]`)
- Headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`.
- Always emit `connected` event immediately on open.
- Poll DB no more than once every 5 s.
- Use hash comparison to detect stat changes before emitting a `stats` event.
- Own-goal events increment the **opponent's** score, not the scoring team's.

### Cron rules (`cron/`)
- All cron routes accept `GET` only (Vercel invokes them as GET).
- Verify `Authorization: Bearer ${CRON_SECRET}` header.
- Vercel Hobby: daily schedule only. Currently: `0 7 * * *`, `0 6 * * *`, `0 8 * * 1`, `0 2 * * *`.
- football-data.org free tier: max 10 req/min. Add ≥ 7 s delay between competition fetches.

### v1 public API (`v1/`)
- Auth via `Authorization: Bearer <api-key>` — validated through `lib/apiAuth.ts`.
- Rate limits apply. Do not bypass `checkRateLimit`.
- Responses must be stable — breaking changes require a version bump.

## Work Guidance

- New route handlers: export `runtime = "nodejs"`, `dynamic = "force-dynamic"`, and `maxDuration` if needed.
- Parse request body with `.catch(() => ({}))` fallback — never let JSON parse errors crash the handler.
- For new admin endpoints, follow the pattern in `admin/generate-stats/route.ts`: auth check → query → process → return `{ ok, processed, failed, errors }`.
- Never expose internal error messages to unauthenticated callers. Log internally; return generic messages externally.

## Verification

- Every new route returns a well-formed JSON response for all code paths (no empty body 200s).
- Admin routes return 401 when `x-admin-secret` header is absent.
- SSE routes set the three required headers.

## Child DOX Index

| Path | Owns |
|------|------|
| [`admin/AGENTS.md`](admin/AGENTS.md) | Admin-only internal tooling |
| [`auth/AGENTS.md`](auth/AGENTS.md) | Authentication endpoints |
| [`cron/AGENTS.md`](cron/AGENTS.md) | Scheduled jobs |
| [`live/AGENTS.md`](live/AGENTS.md) | Real-time SSE match stream |
| [`analysis/AGENTS.md`](analysis/AGENTS.md) | AI analysis with quota |
