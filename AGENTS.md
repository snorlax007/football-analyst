<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# DOX — Football Analyst (Root Contract)

- DOX is the binding work contract for this entire repository
- Walk the full AGENTS.md chain before editing any file
- No child doc may weaken a rule defined here

## Purpose

AI-powered football match intelligence platform for FIFA World Cup 2026 and major international competitions. Features: live SSE match tracking, Claude tactical analysis, real-time stats, push notifications, PDF reports, multi-tenant org system, Stripe billing.

**Production:** https://football-analyst-beryl.vercel.app  
**Repo:** https://github.com/snorlax007/football-analyst  
**Governing rules:** [`rules.md`](rules.md)

## Ownership

- Primary developer: ayan.ghosh@oneconvergence.com
- Hosting: Vercel Hobby plan — 60 s max function duration, daily-only cron schedules
- Database: Neon PostgreSQL — serverless, auto-suspend, cold-start retry handled in `lib/db.ts`

## Local Contracts

### Security — absolute, no exceptions

- `.env.local` and `football.env` must **never** be committed. Check `.gitignore` before every commit.
- All secrets via `process.env.*` only. No hardcoded tokens, keys, or connection strings anywhere.
- Every admin endpoint checks `x-admin-secret === process.env.CRON_SECRET` before any processing.
- All SQL through the `sql` tagged template from `lib/db.ts`. Zero string-concatenated queries.
- `getSession()` from `lib/auth.ts` is the only source of truth for the current user.

### Known production env state

| Variable | Status |
|----------|--------|
| `DATABASE_URL` | ✅ Set |
| `JWT_SECRET` | ✅ Set |
| `CRON_SECRET` | ✅ Set |
| `VAPID_*` | ✅ Set |
| `STRIPE_SECRET_KEY` | ✅ Set (verify it is a real key, currently 19 chars) |
| `ANTHROPIC_API_KEY` | ❌ Not set — AI routes fall back to algorithmic/template output |
| `FOOTBALL_DATA_API_KEY` | ❌ Not set — cron sync returns 503 gracefully |

### Stack constraints

- Next.js 16 App Router + Turbopack. TypeScript 5. Tailwind CSS v4.
- No Pages Router. No ORMs. No barrel re-exports.
- `"use client"` only for browser APIs or event handlers. Server Components query `lib/db.ts` directly.
- `export const dynamic = "force-dynamic"` on every route that reads from the DB or request headers.

### Schema migrations

- Always idempotent: `ALTER TABLE x ADD COLUMN IF NOT EXISTS …`
- Run inside the route handler that needs the column — not in a separate migration file.
- Every insert that may replay uses `ON CONFLICT DO NOTHING` or `ON CONFLICT DO UPDATE`.

### External SDK lazy init

- Never instantiate Anthropic, Stripe, web-push, Resend, or Inngest at module level.
- Pattern: `let _c = null; function get() { if (!_c) _c = new SDK(…); return _c; }`

### AI graceful degradation

- `generate-stats` → seeded algorithmic stats when `ANTHROPIC_API_KEY` absent.
- `bulk-analyze` → template-based insights when `ANTHROPIC_API_KEY` absent.
- Never return 503 solely because an AI key is missing.

### Vercel Hobby limits

- `export const maxDuration = 60` on all long-running routes.
- Cron: daily only (`0 H * * *`). Sub-daily schedules are silently rejected.

### WC2026 design system

- Background `#06080f`, gold accent `#f0b429`, live red `#e63946`.
- Cards: `.wc-card` / `.wc-card-hover`. Headings: `.wc-gold-text`.
- All animations defined as `@keyframes` in `app/globals.css` and applied via utility classes only.

## Work Guidance

1. Read this root AGENTS.md.
2. Identify every file or folder you will touch.
3. Walk from repo root to each target — read every AGENTS.md along the route.
4. Use the nearest AGENTS.md as the local contract; this doc for repo-wide rules.
5. If docs conflict, the closer doc controls local detail; no child may weaken root rules.
6. After any meaningful change: update the nearest owning AGENTS.md, refresh its Child DOX Index, remove stale text.

## Verification

- `npm run build` passes with zero TypeScript errors before any commit.
- `git log -p | grep -iE "(sk_live|sk_test|password\s*=|_secret\s*=)" | grep -v "process\.env"` returns nothing.
- `GET /api/admin/env-check` with correct `x-admin-secret` returns `{"ok":true}`.
- Admin endpoints return 401 when called without `x-admin-secret`.

## Child DOX Index

| Path | Owns |
|------|------|
| [`app/AGENTS.md`](app/AGENTS.md) | All UI pages and layouts |
| [`app/api/AGENTS.md`](app/api/AGENTS.md) | All API route handlers |
| [`lib/AGENTS.md`](lib/AGENTS.md) | Shared server-side utilities |
| [`components/AGENTS.md`](components/AGENTS.md) | Shared React components |
