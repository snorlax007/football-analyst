# DOX — app/

Parent: [`../AGENTS.md`](../AGENTS.md)

## Purpose

Next.js App Router root. Contains all pages (Server and Client Components) and the global layout. API routes live in `app/api/` and are covered by their own AGENTS.md.

## Ownership

Page files (`page.tsx`) are Server Components by default. Interactive UI is split into co-located Client Components.

## Local Contracts

### Layout (`layout.tsx`)
- Renders `WC2026Banner` before `Header` — do not change this order.
- `theme-color` meta is `#f0b429`. Keep in sync if palette changes.
- `ServiceWorkerRegistrar` and `PostHogProvider` must stay in the root layout.

### Route map

| Route | Auth required | Notes |
|-------|--------------|-------|
| `/` | No | WC2026 hero home page |
| `/matches` | No | Match list with competition filter tabs and live polling |
| `/matches/[id]` | No | Match detail: stats panel + AI insights (cached) |
| `/live/[matchId]` | No | SSE live match page with clock, events, stats |
| `/share/[matchId]` | No | Public shareable summary (no login needed) |
| `/pricing` | No | Plan comparison, WC2026 gold theme |
| `/docs` | No | Developer docs |
| `/pre-match` | No | Pre-match AI prediction |
| `/scouting` | No | Player scouting tool |
| `/fantasy` | No | Fantasy picks |
| `/login` | No | Auth page |
| `/register` | No | Auth page |
| `/dashboard` | Yes → 307 | Redirect to login if unauthenticated |
| `/settings/api-keys` | Yes | API key management |
| `/settings/webhooks` | Yes | Webhook config |
| `/org/create` | Yes → 307 | Redirect to login if unauthenticated |
| `/org/[slug]` | Yes | Org dashboard |
| `/invite/[token]` | No | Accept org invite |
| `/team/[id]` | No | Team profile |
| `/widget/match/[id]` | No | Embeddable match widget |

### Matches pages (`app/matches/`)
- `page.tsx` — Server Component. Runs `ALTER TABLE matches ADD COLUMN IF NOT EXISTS competition TEXT` migration. Passes data to `MatchesShell`.
- `MatchesShell.tsx` — `"use client"`. Owns competition filter tab state.
- `MatchList.tsx` — `"use client"`. Polls `/api/matches/live` every 15 s. Exports `MatchRow` interface.
- `MatchesShell` imports `type MatchRow` from `MatchList` — keep this import typed.

### Live page (`app/live/[matchId]/`)
- `"use client"` — uses `EventSource` for SSE.
- `GoalToast` component: slide-in, 5 s auto-dismiss.
- `StatDualBar` component: renders possession/xG/shots/corners/fouls.
- `EVENT_COLOR` and `EVENT_ICON` maps must stay in sync with event types emitted by `/api/live/[matchId]`.

### Auth pages (`app/(auth)/`)
- Route group — does not add a URL segment.
- No server-side session check needed; middleware handles redirect.

## Work Guidance

- New pages default to Server Components — add `"use client"` only when needed.
- Page-level data fetching: query `lib/db.ts` directly in the Server Component, pass typed props to Client children.
- Do not fetch from API routes inside Server Components — query the DB directly.
- Co-locate page-specific components in the same `app/` subdirectory. Only truly shared components go in `components/`.

## Verification

- `npm run build` with no `any` TypeScript errors in page files.
- Auth-protected routes redirect to `/login` (307) when session is absent.
- `/matches`, `/live/[matchId]`, and `/matches/[id]` render without crashing when DB returns empty results.

## Child DOX Index

| Path | Owns |
|------|------|
| [`app/api/AGENTS.md`](api/AGENTS.md) | All API route handlers |
