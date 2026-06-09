---
title: "Activity Log"
type: log
created: 2026-06-06
updated: 2026-06-06
tags:
  - log
---

# 📋 Activity Log

Append-only chronological record of all build activity. Format: `## [YYYY-MM-DD] action | description`

Quick grep: `grep "^## \[" log.md | tail -10`

---

## [2026-06-06] setup | Wiki initialized

> [!success] Wiki created
> - Created 10 phase folders with 43 section notes
> - Connected Neon DB (tables: `phases`, `tasks`, `logs`)
> - Deployed progress tracker to Vercel: https://testproject-omega-seven.vercel.app
> - Inserted 10 phases and 116 sub-tasks into DB

**Status at initialization:** 0 / 116 tasks complete across 10 phases.

---

## [2026-06-06] setup | Static HTML mockup assessed

> [!info] Starting point
> - `index.html` — static Football AI Match Analyst with hardcoded data
> - Fake AI analysis (random string picker)
> - No backend, no real data
> - Neon DB connected with `neon_auth` schema already scaffolded

---

*Add new entries above this line as you work.*

## [2026-06-09] complete | Phase 10 — Scale & Observability

> [!success] Phase 10 Complete ✅ — ALL 10 PHASES DONE
> All 13 tasks done across 4 sections.

**What was built:**

*10.1 — Performance:*
- Analysis caching: `GET /api/analysis/[matchId]` checks for <24h cached result BEFORE calling Claude or consuming quota
- `POST /api/admin/indexes` creates 10 DB indexes with `CREATE INDEX IF NOT EXISTS`
- Neon serverless driver uses HTTP per query — no pooling config needed

*10.2 — Background Job Queue:*
- `lib/inngest.ts` — Inngest client + `generateAnalysis` function (retries: 2, sends push on completion)
- `app/api/inngest/route.ts` — dynamic serve: activates only when `INNGEST_SIGNING_KEY`/`INNGEST_DEV=1` set
- Analysis route: dispatches to Inngest if configured → returns `{status:"queued"}` immediately; falls back to synchronous execution otherwise
- MatchClient: amber pulsing "queued" state, polls every 3s until result appears

*10.3 — Monitoring:*
- Sentry: `sentry.client.config.ts`, `sentry.server.config.ts`, `instrumentation.ts` (no-op when DSN unset)
- PostHog: `components/PostHogProvider.tsx` wraps layout (no-op when key unset; dev opt-out)
- `GET /api/health` — uptime check returns DB status + latency; returns 503 if DB unreachable

*10.4 — Security Hardening:*
- `lib/rateLimit.ts` — sliding-window in-memory rate limiter; auth=10/15min, analysis=5/min, search=30/min
- `lib/sanitize.ts` — stripHtml, sanitizeSearch, sanitizeName, sanitizeUrl, safeInt
- Applied to: login, register, analysis, scouting search, org create
- Stripe webhook signature verification: already implemented in Phase 4 ✅

**Key decisions:**
- In-memory rate limiter chosen over Upstash Redis (no external service dep); swap-ready interface
- Inngest serves as optional accelerator — app works without it (synchronous fallback)
- Sentry/PostHog/Inngest are all no-ops when env vars unset — zero config required to run locally

**Key unlock:** Ready for growth — monitoring, caching, background jobs, and hardened security in place.

---

## [2026-06-09] complete | Phase 9 — Mobile & PWA

> [!success] Phase 9 Complete ✅
> All 7 tasks done across 2 sections.

**What was built:**
- `public/manifest.json` — full Web App Manifest (standalone display, theme #10b981, SVG icon, shortcuts)
- `public/icon.svg` — custom football AI SVG app icon
- `public/offline.html` — offline fallback page with "Go to home" CTA
- `public/sw.js` — three-layer offline caching: cache-first for `/_next/static/`, network-first+cache for match report pages (`/matches/`, `/share/`), network-first with offline fallback for all others; API routes bypass SW
- `components/InstallPrompt.tsx` — Add to Home Screen slide-up banner; listens for `beforeinstallprompt`; respects dismissed state in localStorage; hidden in standalone mode
- `app/layout.tsx` — manifest link, theme-color, apple-touch-icon, viewport-fit=cover
- Mobile UI fixes in `app/matches/[id]/MatchClient.tsx`: responsive score text, `min-w-0` overflow guards, stats grid `grid-cols-2 sm:grid-cols-3`
- Mobile UI fixes in `app/matches/page.tsx`: tighter center margin on mobile, `truncate` on team names

**Key decisions:**
- API routes (`/api/`) completely bypass the service worker — always fresh, never stale
- Install prompt uses native `beforeinstallprompt` (no third-party library)
- `display: standalone` in manifest hides browser chrome when installed

**Key unlock:** Coaches adopt — app installable as PWA, works offline for last-viewed reports.

---

## [2026-06-09] complete | Phase 8 — API & Integrations

> [!success] Phase 8 Complete ✅
> All 14 tasks done across 4 sections.

**What was built:**
- `lib/apiAuth.ts` — API key auth helper; key format `faa_` + 32 hex; SHA256 hash in DB; rate limiting via `api_usage` table
- `lib/webhooks.ts` — HMAC-SHA256 signed webhook delivery; fire-and-forget with 10s timeout
- `app/api/keys/` — GET list + POST create (Pro+ only, max 5) + DELETE revoke
- `app/api/v1/match/[id]/analysis` + `app/api/v1/player/[id]/stats` — public REST API with Bearer auth
- `app/settings/api-keys/page.tsx` — copy-once key reveal, usage bar, revoke button
- `app/docs/page.tsx` — full API reference (auth, rate limits, endpoints, widget embed, webhooks, errors)
- `app/api/widget/[matchId]` — public widget data endpoint (no auth)
- `app/widget/match/[id]/page.tsx` — iframe-embeddable match card; `?whitelabel=1` removes branding
- `app/api/fantasy/picks` — FPL scoring (goals×6 + assists×3 + rating/appearance bonuses), best XI picker, Claude Haiku reasoning
- `app/fantasy/page.tsx` — Best XI + All Players tabs with FPL score display
- `app/api/webhooks/config/` — CRUD for org webhook endpoints (Team+ gated, HTTPS only, max 3)
- `app/settings/webhooks/page.tsx` — webhook config UI with event checkboxes and secret reveal
- Webhook fired automatically after match analysis completes for org members

**Key decisions:**
- `organizations.id` is UUID (TEXT), not INT — all FK references use TEXT
- `ensureTables()` calls are memoized with module-level flags to avoid per-request DDL
- Neon cold-start retry improved: 1.5s + 2s double-retry instead of single 500ms retry
- `api_keys` and `api_usage` tables auto-created with `IF NOT EXISTS` in route handlers (no migrations)

**Key unlock:** Distribution — external developers can integrate Football AI into their apps.

---

## [2026-06-09] complete | Phase 7 — AI Depth

> [!success] Phase 7 Complete ✅
> All 14 tasks done across 4 sections.

**What was built:**
- `app/api/formation/[matchId]` — detects formation (e.g. 4-3-3) from player positions, maps to pitch coordinates, Claude Haiku generates tactical description
- `app/matches/[id]/FormationViz.tsx` — SVG pitch diagram (360×540) with home/away player nodes, heatmap blobs, goal indicators, hover tooltip; lazy-loaded via `next/dynamic`
- `app/scouting/page.tsx` — player search UI with position/rating/goals filters + natural language query (Claude ranks results by query intent); shortlist tab with save/remove/PDF download
- `app/api/scouting/players` — filters players from DB; Claude Haiku ranks by NL query when provided
- `app/api/scouting/shortlist` — saves/lists player shortlist per user (auto-creates `player_shortlists` table)
- `app/api/report/scout/[playerId]` — PDF scout report (A4, dark theme, @react-pdf/renderer)
- `app/pre-match/page.tsx` — team selector UI, generates Claude Sonnet pre-match tactical brief from last 5 matches per team; saves to DB; PDF download; Pro+ gated
- `app/api/pre-match` — POST generates report via Claude Sonnet 4.6 (form analysis, tactical profile, key match-ups, set pieces, prediction); GET returns past reports (auto-creates `pre_match_reports` table)
- `app/api/report/pre-match/[reportId]` — PDF of pre-match tactical brief with markdown-to-PDF renderer
- `app/api/team/[id]/trends` — per-match trend data + league average benchmarks + Claude Haiku season narrative
- `app/team/[id]/SeasonTrends.tsx` — pure SVG line charts (xG, possession, press intensity, pass accuracy), benchmark bars (team vs league avg with colored indicators), AI narrative; lazy-loaded
- `app/api/teams/list` — simple GET all teams for dropdowns
- Header updated with Scouting + Pre-Match links for logged-in users

**Key decisions:**
- SVG pitch rendered client-side only (`next/dynamic` + `ssr: false`) to avoid SSR mismatch with mouse events
- `player_shortlists` and `pre_match_reports` tables created with `IF NOT EXISTS` inline in route handlers (no separate migration)
- Pre-match report uses Claude Sonnet 4.6 (not Haiku) for higher-quality tactical analysis
- Season trend charts use pure SVG — no Recharts dependency added
- TypeScript clean; 54 routes in production build

---

## [2026-06-09] complete | Phase 6 — Real-Time & Alerts

> [!success] Phase 6 Complete ✅
> All 11 tasks done across 3 sections.

**What was built:**
- DB migration: `live_events(match_id, minute, event_type, team_id, player_name, detail, ai_comment)`, `push_subscriptions(user_id, endpoint, p256dh, auth)`
- `app/api/live/[matchId]/route.ts` — SSE endpoint; `ReadableStream` with `Content-Type: text/event-stream`; polls DB every 10s; emits `connected`, `state`, `event`, `heartbeat`, `finished`, `error` message types
- Claude Haiku generates AI commentary inline for goal/var/penalty events
- `app/live/[matchId]/page.tsx` — live match UI with `EventSource`; animated score, reverse-chronological event timeline with icons and AI comments
- `lib/push.ts` — `sendPushToUser()` + `sendPushToTeamFollowers()` via `web-push` VAPID; removes stale subscriptions on HTTP 410
- `lib/email.ts` — `sendPostMatchEmail()` + `sendWeeklyDigest()` via Resend; no-ops if `RESEND_API_KEY` unset
- `app/api/push/subscribe/route.ts` — GET (VAPID key), POST (subscribe), DELETE (unsubscribe)
- `public/sw.js` — service worker handles `push` (show notification) and `notificationclick` (open URL)
- `components/ServiceWorkerRegistrar.tsx` — registers `/sw.js` on mount; added to `app/layout.tsx`
- `components/PushSubscribeButton.tsx` — subscribe/unsubscribe toggle; browser support check; added to dashboard header
- `app/api/cron/nightly-results/route.ts` — sends push + email to team followers; runs daily 06:00 UTC
- `app/api/cron/weekly-digest/route.ts` — weekly email digest; runs Mondays 08:00 UTC
- `vercel.json` — cron schedule for nightly-results, weekly-digest, sync-teams

**Key decisions:**
- `export const runtime = "nodejs"` + `export const dynamic = "force-dynamic"` required for SSE in Next.js 16 App Router
- `applicationServerKey` cast to `ArrayBuffer` to satisfy TypeScript `PushSubscribeOptions` type in Node 20 lib
- Cron routes gated with `x-cron-secret` header; Resend + web-push are no-ops if env vars not set (safe in dev)
- TypeScript clean; production build: 43 routes

---

## [2026-06-09] complete | Phase 5 — Export & Sharing

> [!success] Phase 5 Complete ✅
> All 10 tasks done across 3 sections.

**What was built:**
- `GET /api/report/[matchId]/pdf` — server-side PDF generation via `@react-pdf/renderer` v4; gated Pro+ only
- PDF includes: match header, team stats table, player ratings, AI insights, branded footer
- `GET /api/og/match/[id]` — 1200×630 Open Graph image (ImageResponse from `next/og`); score, teams, top AI insight
- `app/share/[matchId]/page.tsx` — public (no login) shareable match analysis with full stats, ratings, AI insights
- `app/share/[matchId]/ShareButtons.tsx` — Twitter/X, WhatsApp, LinkedIn, copy-link share buttons
- `app/sitemap.ts` — generates `/sitemap.xml` from all matches + teams + share pages
- `app/matches/[id]/page.tsx` converted to server wrapper with `generateMetadata` (og:title, og:image, twitter:card) + JSON-LD (SportsEvent schema)
- `app/team/[id]/page.tsx` converted to server wrapper with `generateMetadata` + JSON-LD (SportsTeam schema)
- PDF download button on match page, share bar (Twitter/X, WhatsApp, public link)
- `next.config.ts` — `serverExternalPackages: ["@react-pdf/renderer"]` to prevent bundling issues

**Key decisions:**
- PDF gated behind Pro+ (403 for free users with upgrade URL)
- `renderToBuffer` + `new Uint8Array(buffer)` pattern for `NextResponse` compatibility
- Match/team pages split into server wrapper + existing client component (preserves client-side interactivity while adding SEO)
- Sitemap uses `force-dynamic` to avoid static prerender failure on Neon DB call

## [2026-06-09] complete | Phase 4 — Payments

> [!success] Phase 4 Complete ✅
> All 11 tasks done across 3 sections.

**What was built:**
- `lib/stripe.ts` — Stripe v22 client (API version `2026-05-27.dahlia`), `PLANS` constant (Free/Pro/Team tiers)
- DB migration: `subscription_tier`, `subscription_status`, `stripe_customer_id`, `stripe_subscription_id`, `subscription_period_end` added to `users` and `organizations`
- `POST /api/billing/checkout` — creates Stripe Checkout session with 7-day trial, redirects to Stripe hosted page
- `POST /api/billing/portal` — creates Stripe Customer Portal session for self-service billing management
- `POST /api/webhooks/stripe` — handles `checkout.session.completed`, `customer.subscription.updated/deleted`, `invoice.payment_failed`; updates user tier in DB
- `app/pricing/page.tsx` — tier comparison table (Free/Pro/Team), upgrade CTA buttons
- `components/Paywall.tsx` — gated feature UI component with upgrade link
- `components/BillingPortalButton.tsx` — client component for portal redirect
- Updated `app/api/analysis/[matchId]/route.ts` — uses `subscription_tier` for per-user quota limits
- Updated `app/dashboard/page.tsx` — shows current plan, upgrade CTA, billing portal button
- Updated `components/Header.tsx` — added Pricing nav link

**Key decisions:**
- Free: 5/mo · Pro ($29): 100/mo · Team ($99): 500/mo (org-shared)
- `subscription_period_end` read from `sub.items.data[0].current_period_end` (Stripe v22 moved it off the Subscription root)
- Stripe keys/price IDs set in `.env.local` (never committed); placeholder values in repo comments

## [2026-06-06] complete | Phase 3 — Orgs + Multi-Tenancy

> [!success] Phase 3 Complete ✅
> All 14 tasks done across 3 sections.

**What was built:**
- DB tables: `organizations`, `org_members`, `org_invitations`, `org_usage`, `followed_teams`
- `lib/orgs.ts` — `getUserOrgs`, `getOrgBySlug`, `getUserRoleInOrg`, `getOrgMembers`, `getPendingInvitations`, `toSlug`
- `POST /api/org/create`, `GET /api/org/[slug]` — create and read org with members + usage
- `POST /api/org/[slug]/invite`, `DELETE /api/org/[slug]/invite/[id]` — manage invitations
- `DELETE /api/org/[slug]/members/[userId]` — remove member
- `GET /api/invite/[token]`, `POST /api/invite/[token]` — validate and accept invite
- `POST /api/team/[id]/follow`, `DELETE /api/team/[id]/follow`, `GET /api/user/teams` — team following
- `GET /api/teams/[id]`, `GET /api/teams/[id]/matches`, `GET /api/teams/[id]/season-stats`
- `app/org/create/page.tsx`, `app/org/[slug]/page.tsx` — org creation and full org dashboard
- `app/invite/[token]/page.tsx` — accept invitation flow
- `app/team/[id]/page.tsx` — team profile with follow button + season stats
- Updated dashboard and header to show orgs + followed teams
- `lib/db.ts` — auto-retry on ETIMEDOUT for Neon cold-start resilience

## [2026-06-06] complete | Phase 2 — Auth + User Accounts

> [!success] Phase 2 Complete ✅
> All 10 tasks done across 3 sections.

**What was built:**
- `lib/auth.ts` — `signToken()`, `verifyToken()`, `getSession()` via `jose` (HS256 JWT, 7-day, httpOnly cookie `fa_token`)
- `proxy.ts` — Next.js 16 renamed middleware protecting `/dashboard/:path*`
- DB: `users` + `user_usage` tables (Neon) — email/password auth, per-month usage tracking
- `POST /api/auth/register` — bcryptjs v3 named exports, `crypto.randomUUID()`
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET /api/user/usage` — returns `{ used, limit: 5, remaining }`
- `POST /api/analysis/[matchId]` — now enforces 5 free reports/month, increments usage via `ON CONFLICT DO UPDATE`
- `app/(auth)/login/page.tsx`, `register/page.tsx` — dark theme, error handling, redirect to /dashboard
- `app/dashboard/page.tsx` — server component, session-gated, usage stats + recent analyses
- `app/matches/page.tsx` — server-rendered list with `revalidate=60`
- `app/matches/[id]/page.tsx` — client component, full stats + AI button with usage display
- `components/Header.tsx` + `LogoutButton.tsx` — sticky nav, session-aware, global in layout
- `components/UsageBar.tsx` — animated progress bar, amber at limit, upgrade CTA
- Build: 13 routes + `ƒ Proxy (Middleware)`, TypeScript clean

**Key decisions:**
- bcryptjs v3 = named ESM exports (not default export)
- Next.js 16: `proxy.ts` replaces `middleware.ts`; `cookies()` must be awaited
- Usage tracked separately from analyses (no user_id FK on ai_analyses yet)

## [2026-06-06] complete | Phase 1 — Foundation

> [!success] Phase 1 Complete ✅
> All 15 tasks done across 4 sections.

**What was built:**
- Next.js 16 app with TypeScript, Tailwind v4 at `/home/oc/football-analyst/`
- DB schema: `teams`, `matches`, `match_stats`, `players`, `player_ratings`, `ai_analyses`
- Seeded: 6 teams, 1 Premier League match (City 3–1 Arsenal) with full stats and 8 player ratings
- `GET /api/matches/[id]` — returns live match data from Neon DB
- `POST /api/analysis/[matchId]` — calls Claude `claude-sonnet-4-6` with real stats, stores result
- `app/page.tsx` — fetches real data, real AI, proper loading skeletons, xG comparison panel
- Build passes TypeScript clean, dev server running on port 3000

**Key unlock:** Product exists — real data, real AI, real DB.
