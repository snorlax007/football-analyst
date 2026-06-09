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
