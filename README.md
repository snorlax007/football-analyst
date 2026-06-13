# Football Analyst — AI-Powered Match Intelligence · WC 2026 Edition

> Live match tracking, AI tactical analysis, and real-time stats for the FIFA World Cup 2026 and major international football competitions.

**Production:** [football-analyst-beryl.vercel.app](https://football-analyst-beryl.vercel.app)  
**GitHub:** [github.com/snorlax007/football-analyst](https://github.com/snorlax007/football-analyst)

---

## Table of Contents

- [Live Links](#live-links)
- [Tech Stack](#tech-stack)
- [Phase 1 — Core Foundation](#phase-1--core-foundation)
- [Phase 2 — AI Analysis & Match Intelligence](#phase-2--ai-analysis--match-intelligence)
- [Phase 3 — Live Match System](#phase-3--live-match-system)
- [Phase 4 — World Cup 2026 Makeover](#phase-4--world-cup-2026-makeover)
- [Phase 5 — International Football Data & WC2026 Fixtures](#phase-5--international-football-data--wc2026-fixtures)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [API Reference](#api-reference)

---

## Live Links

| Page | URL |
|------|-----|
| Home | https://football-analyst-beryl.vercel.app |
| Matches | https://football-analyst-beryl.vercel.app/matches |
| Live Match | https://football-analyst-beryl.vercel.app/live/2 |
| Match Detail | https://football-analyst-beryl.vercel.app/matches/2 |
| Pricing | https://football-analyst-beryl.vercel.app/pricing |
| Docs | https://football-analyst-beryl.vercel.app/docs |
| Pre-Match | https://football-analyst-beryl.vercel.app/pre-match |
| Scouting | https://football-analyst-beryl.vercel.app/scouting |
| Fantasy | https://football-analyst-beryl.vercel.app/fantasy |
| Share a match | https://football-analyst-beryl.vercel.app/share/2 |
| Login | https://football-analyst-beryl.vercel.app/login |
| Register | https://football-analyst-beryl.vercel.app/register |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database | Neon PostgreSQL (serverless) |
| AI | Anthropic Claude (Haiku / Sonnet) |
| Auth | JWT via `jose`, bcrypt password hashing |
| Payments | Stripe |
| Email | Resend |
| Push Notifications | Web Push (VAPID) |
| Analytics | PostHog |
| Error Monitoring | Sentry |
| Background Jobs | Inngest |
| PDF Export | @react-pdf/renderer |
| Hosting | Vercel (Hobby plan) |
| Live Updates | Server-Sent Events (SSE) |
| External Data | football-data.org API |

---

## Phase 1 — Core Foundation

**Goal:** User authentication, match CRUD, team management, and org structure.

### What was built

- **Auth system** — JWT-based sessions with bcrypt hashing, login/register pages, middleware-protected routes. Session stored in an HTTP-only cookie.
- **Database schema** — Neon PostgreSQL with tables: `users`, `teams`, `matches`, `match_stats`, `players`, `player_ratings`, `organizations`, `org_members`, `ai_analyses`, `user_usage`, `org_usage`.
- **Match management** — Create, list, and view matches. Home/away teams, scores, status (`scheduled` / `live` / `finished`), venue, season.
- **Organization support** — Users can create orgs, invite members via token links, and share an analysis quota across the org.
- **Dashboard** — Authenticated landing page with recent matches and quick-access cards.
- **Settings** — API key management (`/settings/api-keys`) and webhook configuration (`/settings/webhooks`).
- **Rate limiting** — In-memory per-user rate limiter for AI generation endpoints.
- **Webhook delivery** — `POST` to user-configured URLs on `match.analysis.completed`.

### Key files

```
app/(auth)/login/page.tsx
app/(auth)/register/page.tsx
app/dashboard/page.tsx
app/org/
lib/auth.ts
lib/db.ts
app/api/auth/
app/api/org/
app/api/keys/
app/api/webhooks/
```

---

## Phase 2 — AI Analysis & Match Intelligence

**Goal:** Generate Claude-powered tactical insights from match data and expose them to users within a quota system.

### What was built

- **On-demand analysis** (`POST /api/analysis/[matchId]`) — Authenticated users POST to generate 4 tactical insights per match. Results cached in `ai_analyses` for 24 hours (no quota consumed on cache hits).
- **Quota system** — Free tier: 3 analyses/month. Pro tier: 30. Org plans pool quota across all members. Usage tracked in `user_usage` / `org_usage`.
- **Inngest background jobs** — When `INNGEST_EVENT_KEY` is set, analysis is dispatched to a background worker so the API responds instantly.
- **Bulk admin analysis** (`POST /api/admin/bulk-analyze`) — Batch-generate insights for all unanalyzed matches in a date window. Falls back to template-based insights when `ANTHROPIC_API_KEY` is absent.
- **Stats generation** (`POST /api/admin/generate-stats`) — Populate `match_stats` for finished matches. Uses Claude when the API key is set; falls back to a seeded-deterministic algorithmic generator (consistent stats per matchId) with no external dependency.
- **PDF export** (`/api/report/[matchId]`) — Download a styled PDF report of match stats and insights.
- **OG image** (`/api/og/[matchId]`) — Dynamic social share image for each match.
- **Share page** (`/share/[matchId]`) — Public shareable match summary without requiring login.
- **Pre-match analysis** (`/pre-match`) — AI-powered pre-game prediction and lineup suggestions.
- **Scouting reports** (`/scouting`) — Player scouting and comparison tool.
- **Formation builder** (`/api/formation`) — Tactical formation visualizer.

### Key files

```
app/api/analysis/[matchId]/route.ts   — on-demand Claude analysis
app/api/admin/generate-stats/route.ts — bulk stats (Claude + algorithmic fallback)
app/api/admin/bulk-analyze/route.ts   — bulk analysis (Claude + template fallback)
app/api/report/[matchId]/
app/api/og/[matchId]/
app/share/[matchId]/page.tsx
lib/stripe.ts                          — plan limits + quota helpers
```

---

## Phase 3 — Live Match System

**Goal:** Real-time match tracking with live scores, event feed, stats panel, match clock, and admin tools to inject events.

### What was built

- **SSE live stream** (`GET /api/live/[matchId]`) — Server-Sent Events endpoint polled every 5 seconds. Streams:
  - `connected` — initial handshake
  - `state` — full match snapshot (score, status, currentMinute, team IDs)
  - `event` — goal, red card, yellow card, substitution, VAR, corner, etc.
  - `stats` — possession / shots / xG update when values change (hash-based diffing)
- **Live match page** (`/live/[matchId]`) — Real-time UI with:
  - Live clock showing `73'` from `current_minute`
  - Goal toast notifications (slide-in, 5s auto-dismiss)
  - `StatDualBar` panels for possession, xG, shots, corners, fouls
  - Colour-coded event feed with icons per event type
- **Admin event injection** (`POST /api/admin/live/[matchId]`) — Inject live events (goal auto-increments correct team's score, own_goal increments opponent's). Auth via `x-admin-secret` header.
- **Admin PATCH** (`PATCH /api/admin/live/[matchId]`) — Update status, score, `current_minute`, or stats in bulk.
- **Matches list live polling** — `MatchList` polls `/api/matches/live` every 15 seconds and updates scores in place.
- **Push notifications** (`/api/push`) — Web Push (VAPID) subscriptions for goal alerts. Lazy-init pattern prevents module-level crash when keys are absent.
- **Schema migrations** — `ALTER TABLE matches ADD COLUMN IF NOT EXISTS current_minute INT` and `live_events` table created at request time (zero-downtime).

### Key files

```
app/api/live/[matchId]/route.ts          — SSE endpoint
app/api/admin/live/[matchId]/route.ts    — admin event injection
app/api/matches/live/route.ts            — live scores for matches list
app/live/[matchId]/page.tsx              — live match UI
app/matches/MatchList.tsx                — polling match list
lib/push.ts                              — Web Push with lazy VAPID init
```

---

## Phase 4 — World Cup 2026 Makeover

**Goal:** Redesign the entire visual identity to celebrate FIFA World Cup 2026 (USA/Canada/Mexico, June–July 2026).

### What was built

- **Global design system** (`app/globals.css`) — Deep navy background (`#06080f`) with gold radial gradients. CSS custom properties and keyframe animations:
  - `float-ball` — floating ⚽ icon in the header
  - `shimmer-sweep` — gold shimmer on CTA buttons
  - `ticker-scroll` — horizontal scrolling WC2026 fact ticker
  - `wc-gold-pulse` — pulsing gold glow on live indicators
  - `floodlight-sweep` — stadium floodlight beams on the hero
  - `score-pop` — score entrance animation on the home page
  - `slide-up` — staggered card entrance animations
- **WC2026 Banner** (`components/WC2026Banner.tsx`) — Dismissible countdown banner with:
  - Live seconds countdown to kickoff (`2026-06-11T18:00:00Z`)
  - Scrolling facts ticker (48 teams, 16 venues, 104 matches…)
  - Dismisses permanently via `localStorage`
- **Header redesign** (`components/Header.tsx`) — Gold gradient `Football AI · WC 2026 Edition` logo, floating ⚽, shimmer "Get started" button.
- **Home page** (`app/page.tsx`) — Stadium hero image, 3 floodlight SVG beams, animated `InsightCard` grid, WC2026 feature callout section, 15-nation scrolling ticker.
- **Matches page** — Competition filter tabs (All / WC / UNL / EC / Copa Lib.), live count badge, gold active tab styling.
- **Pricing page** — WC2026 gold theme, `featured` prop on the Pro plan upgrade button.
- **CSS utilities** — `.wc-card`, `.wc-card-hover`, `.wc-gold-text` (gradient text), `.pitch-lines-bg` (SVG pitch pattern), `.live-dot` (pulsing red dot).

### Key files

```
app/globals.css
components/WC2026Banner.tsx
components/Header.tsx
app/page.tsx
app/pricing/page.tsx
app/matches/MatchesShell.tsx
app/layout.tsx
```

---

## Phase 5 — International Football Data & WC2026 Fixtures

**Goal:** Populate the DB with all 48 WC2026 nations and real international match data; connect to football-data.org for live sync.

### What was built

- **WC2026 team seeding** (`POST /api/admin/seed-wc-teams`) — Seeds all 48 nations across 6 confederations (CONCACAF hosts, CONMEBOL, UEFA, CAF, AFC, OFC). De-duplicates by `short_name`. Adds `confederation` and `country` columns to the `teams` table.
- **15 WC2026 Group Stage fixtures** — Manually seeded matches (`status: finished`, with scores) covering 8 groups across all 3 host nations.
- **Stats seeded for all 15 matches** — Algorithmic generator runs via `POST /api/admin/generate-stats`. Seeded deterministically (same matchId → same stats every time).
- **AI analysis for all 15 matches** — Template-based insights seeded via `POST /api/admin/bulk-analyze`. Upgrades to real Claude insights automatically once `ANTHROPIC_API_KEY` is set in Vercel.
- **Football-data.org sync cron** (`GET /api/cron/sync-matches`) — Daily cron (`0 7 * * *`) fetches live fixtures from competitions `WC`, `UNL`, `EC`, `CLI`. Uses `external_id INT UNIQUE` for deduplication. `ON CONFLICT DO UPDATE` for upserts.
- **`external_id` columns** — Added to both `teams` and `matches` tables for safe repeated syncing.
- **Competition badges** — `MatchList` shows coloured left-edge badges: `🏆 World Cup 2026`, `⚔️ Nations League`, `🌍 Euro Quals`, `🌎 Copa Lib.`
- **Match grouping by date** — Matches list groups fixtures under date headers (`Today`, `Yesterday`, or `DD MMM`).
- **Admin env-check endpoint** (`GET /api/admin/env-check`) — Returns which environment variables are set (values masked, lengths shown) for production debugging.

### Key files

```
app/api/admin/seed-wc-teams/route.ts
app/api/cron/sync-matches/route.ts
app/api/admin/matches/route.ts
app/api/admin/env-check/route.ts
app/matches/MatchList.tsx
vercel.json
```

---

## Environment Variables

Set these in Vercel → Project Settings → Environment Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing JWT session tokens |
| `CRON_SECRET` | Yes | Shared secret for `x-admin-secret` header on admin endpoints |
| `ANTHROPIC_API_KEY` | No* | Enables real Claude AI analysis. Routes fall back to algorithmic/template generation when absent. |
| `FOOTBALL_DATA_API_KEY` | No* | football-data.org API key for live fixture sync (free tier: 10 req/min) |
| `STRIPE_SECRET_KEY` | No | Enables paid plan upgrades |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | Stripe publishable key for the frontend |
| `VAPID_PUBLIC_KEY` | No | Web Push public key for push notifications |
| `VAPID_PRIVATE_KEY` | No | Web Push private key |
| `VAPID_SUBJECT` | No | `mailto:` or URL for VAPID identity |
| `RESEND_API_KEY` | No | For transactional emails (invites, digests) |
| `INNGEST_EVENT_KEY` | No | Background job processing via Inngest |
| `SENTRY_DSN` | No | Error monitoring |

\* The app runs fully without these — AI features show cached or algorithmic data.

---

## Local Development

```bash
# 1. Clone
git clone https://github.com/snorlax007/football-analyst.git
cd football-analyst

# 2. Install dependencies
npm install

# 3. Set environment variables
cp .env.example .env.local
# Edit .env.local — at minimum set DATABASE_URL and JWT_SECRET

# 4. Run dev server
npm run dev
# → http://localhost:3000
```

> The dev server uses Turbopack for fast refresh.

### Seeding data locally

```bash
# Seed 48 WC2026 nations
curl -X POST http://localhost:3000/api/admin/seed-wc-teams \
  -H "x-admin-secret: your-cron-secret"

# Create WC2026 Group Stage fixtures
# See scripts/ or use the admin matches endpoint

# Generate stats for all finished matches
curl -X POST http://localhost:3000/api/admin/generate-stats \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: your-cron-secret" \
  -d '{"days": 30}'

# Generate AI analysis (uses Claude if ANTHROPIC_API_KEY set, templates otherwise)
curl -X POST http://localhost:3000/api/admin/bulk-analyze \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: your-cron-secret" \
  -d '{"days": 30, "maxMatches": 20}'
```

---

## Deployment

The project deploys automatically to Vercel on every push to `main`.

```bash
# Manual production deploy
vercel --prod --token <your-vercel-token>
```

**Cron jobs** (configured in `vercel.json`):

| Schedule | Endpoint | Purpose |
|----------|----------|---------|
| `0 7 * * *` | `/api/cron/sync-matches` | Fetch today's fixtures from football-data.org |
| `0 6 * * *` | `/api/cron/nightly-results` | Update scores for yesterday's matches |
| `0 8 * * 1` | `/api/cron/weekly-digest` | Send weekly digest emails |
| `0 2 * * *` | `/api/cron/sync-teams` | Sync team metadata |

> Vercel Hobby plan only supports daily cron schedules.

---

## API Reference

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/matches/live` | Live match scores (polled every 15s by the UI) |
| `GET` | `/api/live/[matchId]` | SSE stream for a specific match |
| `GET` | `/api/og/[matchId]` | Dynamic OG image for social sharing |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/v1/*` | Public REST API (requires API key header) |
| `GET` | `/api/widget/match/[id]` | Embeddable match widget |

### Authenticated

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Log in, returns JWT cookie |
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/logout` | Clear session |
| `POST` | `/api/analysis/[matchId]` | Generate / fetch cached AI analysis |
| `GET` | `/api/report/[matchId]` | Download PDF report |
| `POST` | `/api/push/subscribe` | Subscribe to push notifications |
| `GET/POST` | `/api/billing/*` | Stripe billing management |

### Admin (require `x-admin-secret` header)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/matches` | Bulk create matches |
| `POST` | `/api/admin/generate-stats` | Generate stats for finished matches |
| `POST` | `/api/admin/bulk-analyze` | Generate AI insights in bulk |
| `POST` | `/api/admin/seed-wc-teams` | Seed 48 WC2026 nations |
| `POST/PATCH` | `/api/admin/live/[matchId]` | Inject live events / update match state |
| `GET` | `/api/admin/env-check` | Show which environment variables are set |
| `POST` | `/api/admin/indexes` | Create DB indexes |
| `POST` | `/api/admin/bulk-analyze` | Batch AI analysis |
