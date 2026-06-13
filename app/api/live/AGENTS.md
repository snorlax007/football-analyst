# DOX — app/api/live/

Parent: [`../AGENTS.md`](../AGENTS.md) → [`../../AGENTS.md`](../../AGENTS.md) → [`../../../AGENTS.md`](../../../AGENTS.md)

## Purpose

Server-Sent Events (SSE) endpoint that streams real-time match state, events, and stats to the live match page. Polled by the browser every 5 seconds via `EventSource`.

## Ownership

`app/api/live/[matchId]/route.ts` is the only SSE stream in this project. The companion admin injection endpoint lives in `app/api/admin/live/[matchId]/`.

## Local Contracts

### Required response headers

```typescript
"Content-Type": "text/event-stream"
"Cache-Control": "no-cache"
"Connection": "keep-alive"
```

All three must be present. Missing any of these causes proxies or CDNs to buffer the stream and break real-time delivery.

### Event protocol

Events are emitted as `data: <JSON>\n\n`. Types:

| Type | When emitted | Payload |
|---|---|---|
| `connected` | Immediately on stream open | `{ type: "connected", matchId }` |
| `state` | Every poll tick | Full match snapshot: `{ id, homeScore, awayScore, status, currentMinute, homeName, awayName, homeShort, awayShort, homeTeamId, awayTeamId }` |
| `event` | When a new row appears in `live_events` | `{ type, minute, teamId, playerId?, description? }` |
| `stats` | When possession/shots/xG change | `{ homeStats: {...}, awayStats: {...} }` |
| `error` | On unrecoverable DB failure | `{ type: "error", message }` |

### Polling and diffing

- Poll DB every **5 seconds** — no tighter. Tighter loops exhaust Neon's connection pool.
- Track `lastEventId` and `lastStatsHash` between ticks. Only emit `event` and `stats` when values change.
- Stats hash: `JSON.stringify({ homePoss, awaySoss, homeShots, awayShots, homeXg, awayXg })`.

### Schema dependency

- Requires `current_minute INT` column on `matches`. Route runs `ALTER TABLE matches ADD COLUMN IF NOT EXISTS current_minute INT DEFAULT NULL` before first poll.
- Requires `live_events` table. `ensureTables()` creates it if absent.

### Commentary event types

`COMMENTARY_TYPES = new Set(["goal","own_goal","var","penalty","red_card","yellow_card","substitution","corner"])`

Only these types trigger a fan-out to push notification subscribers.

## Work Guidance

- Do not add any auth requirement to this endpoint — the live page is public.
- Do not increase poll frequency below 5 s without testing connection pool exhaustion on Neon free tier.
- When adding new event types, add them to `COMMENTARY_TYPES` if they should trigger push notifications, and add icon/color entries in `app/live/[matchId]/page.tsx`.
- The SSE stream must close cleanly when the client disconnects — check `req.signal.aborted`.

## Verification

- `curl https://football-analyst-beryl.vercel.app/api/live/2` returns `data: {"type":"connected",...}` within 2 s.
- Response headers include `content-type: text/event-stream`.
- Subsequent `data:` lines follow within 5 s of the first.

## Child DOX Index

No child AGENTS.md. Leaf node.
