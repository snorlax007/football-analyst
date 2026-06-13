# DOX — lib/

Parent: [`../AGENTS.md`](../AGENTS.md)

## Purpose

Shared server-side utilities imported by route handlers and Server Components. Nothing in this directory runs in the browser.

## Ownership

All files in `lib/` are server-only. Never import them from `"use client"` components.

## Local Contracts

### `db.ts`
- Exports a single `sql` tagged-template proxy wrapping the Neon client.
- The proxy auto-retries on `ETIMEDOUT` / `ECONNREFUSED` (Neon cold-start) with 1.5 s → 2 s back-off.
- Do not add a second retry layer on top — causes duplicate writes.
- `neonConfig.fetchFunction` opts out of Next.js fetch caching. Do not remove this.
- `organizations.id` is UUID / TEXT. All other PKs are serial integers. Never cast org IDs to INT.

### `auth.ts`
- `getSession()` is the one source of truth for the current user. Never re-implement inline.
- Returns `null` when unauthenticated. Always check and return 401 before any DB access.
- JWT signed with `process.env.JWT_SECRET`. Never change the signing algorithm without a migration plan.

### `push.ts`
- VAPID keys initialised lazily via `ensureVapid()`. Never call `webpush.setVapidDetails()` at module level.
- `sendPushToUser` and `sendPushToTeamFollowers` both call `if (!ensureVapid()) return` — do not remove this guard.

### `stripe.ts`
- `getPlanLimits(tier)` returns quota caps per plan. Update here when plan pricing changes — not in individual route handlers.
- Stripe client must be lazy-init. Do not call `new Stripe(...)` at module level.

### `rateLimit.ts`
- In-memory per-user limiter. `checkRateLimit(key, limit)` returns `{ allowed: boolean }`.
- Do not bypass in any route handler. Do not loosen limits without updating this file.

### `webhooks.ts`
- `deliverWebhook(orgId, event, payload)` fires async — always `.catch(() => {})` to avoid unhandled rejections crashing the route.

### `sanitize.ts`
- Use for all user-supplied string fields before storing or rendering. Do not skip.

### `types.ts`
- Canonical shared TypeScript interfaces. Add new shared types here; do not redefine them inline in routes.

## Work Guidance

- New utility files in `lib/` must be server-only (no browser APIs).
- All SDK clients (Anthropic, Stripe, Resend, Inngest) must use the lazy singleton pattern.
- Functions that touch the DB must rely on the `sql` proxy from `db.ts` — no direct Neon client usage.

## Verification

- No `"use client"` directive in any file under `lib/`.
- `import { sql } from "@/lib/db"` is the only DB import pattern used across the codebase.

## Child DOX Index

No child AGENTS.md. All files in `lib/` are flat and covered by this doc.
