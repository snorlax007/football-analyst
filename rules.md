# Football Analyst — Project Rules

**Governing principles for all development on this codebase.**  
Inspired by [Karpathy-style LLM coding guidelines](https://github.com/multica-ai/andrej-karpathy-skills). Read this before writing a single line.

**Tradeoff:** These rules bias toward correctness and safety over speed. For trivial one-liners, use judgment.

---

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing anything:

- State your assumptions explicitly. If uncertain, ask.
- If a request has multiple valid interpretations, present them — don't pick silently.
- If a simpler approach exists, say so and push back when warranted.
- If the schema, auth flow, or API contract is unclear, stop and name what's missing.

**This project has real production users and a live database. A wrong assumption here has real consequences.**

Ask before touching:
- Any `ALTER TABLE` or schema change — columns can't be easily un-added.
- Auth logic (`lib/auth.ts`, session handling) — a bug locks real users out.
- Stripe billing or quota logic — wrong counts cost money or lock features.
- Push notification or webhook delivery — silent failures are hard to diagnose.

---

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code. A standalone `async function` beats a class every time.
- No "flexibility" that wasn't requested. Don't add a config object for one hardcoded value.
- No error handling for scenarios that cannot happen inside this codebase.
- If you write 200 lines and it could be 50, rewrite it.

**Specific to this stack:**

- Prefer `sql\`...\`` tagged literals directly in route handlers over query builder layers.
- Don't introduce ORMs, new DB clients, or state management libraries without discussion.
- Don't add `try/catch` around every DB call — let errors surface so the auto-retry proxy in `lib/db.ts` can handle cold-start failures naturally.
- Don't wrap Next.js Server Components in unnecessary client boundaries. Use `"use client"` only when you need browser APIs or event handlers.

Ask yourself: *Would a senior Next.js engineer say this is overcomplicated?* If yes, simplify.

---

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting unless asked.
- Don't refactor things that aren't broken.
- Match existing style: tagged SQL literals, inline types, no barrel re-exports.
- If you notice unrelated dead code, **mention it — don't delete it**.

When your changes create orphans:

- Remove imports, variables, and functions that **your** changes made unused.
- Don't remove pre-existing dead code unless explicitly asked.

**The test:** Every changed line should trace directly to the user's request.

---

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Don't just implement — define what "done" looks like before starting:

- "Add a filter to the matches list" → "The `/matches` page shows only WC matches when the WC tab is active; all other tabs return the correct filtered set"
- "Fix the stats generation" → "POST `/api/admin/generate-stats` returns `processed > 0` and the `match_stats` table has rows for the target match"
- "Deploy the fix" → "The production URL returns the expected JSON; the error no longer appears in Vercel logs"

For multi-step tasks, state a brief plan and verify each checkpoint before moving to the next.

---

## 5. Security — Non-Negotiable

**These rules are absolute. No exceptions, no shortcuts.**

### Secrets management

- `.env.local` **must never be committed to git.** It contains `DATABASE_URL` and `JWT_SECRET`. Verify `.gitignore` before every commit.
- `football.env` and any file matching `*.env*` must stay out of git.
- Never hardcode secrets, connection strings, or API keys in source files.
- All secrets travel via `process.env.*` only. Use `process.env.CRON_SECRET` for admin endpoint auth, never a hardcoded string.

### Input handling

- Every admin endpoint must check `x-admin-secret === process.env.CRON_SECRET` before processing. No secret, no access — even in development.
- Never trust user-supplied `matchId`, `userId`, or `orgId` values without validating them against the DB.
- All SQL runs through the `sql` tagged template from `lib/db.ts`. Never string-concatenate SQL. Never use raw queries.
- Rate-limit all AI-generating endpoints (already wired in `lib/rateLimit.ts` — don't bypass it).

### Auth

- `getSession()` from `lib/auth.ts` is the one source of truth for the current user. Don't re-implement session parsing inline.
- Return `401` before touching the database for unauthenticated requests.
- Org quota checks must be done server-side, never rely on client-sent tier claims.

---

## 6. Database Patterns

**Neon PostgreSQL has specific constraints. Follow these or face production outages.**

### Schema migrations

- Never run `ALTER TABLE` in development and assume production is in sync. All migrations must be idempotent:
  ```sql
  ALTER TABLE matches ADD COLUMN IF NOT EXISTS current_minute INT DEFAULT NULL;
  ```
- Run migrations inside the route handler that needs the column, not in a separate migration file. This ensures zero-downtime deployment.
- Always use `ON CONFLICT ... DO NOTHING` or `ON CONFLICT ... DO UPDATE` for inserts that might replay. Never assume an insert is unique without a constraint.

### Cold-start handling

- `lib/db.ts` wraps the Neon client with a two-step retry for `ETIMEDOUT` / `ECONNREFUSED`. Don't add your own retry logic on top — it causes duplicate writes.
- Never set a query timeout shorter than 5 seconds. Neon cold-start can take 1–3 seconds before the first query resolves.

### UUIDs vs integers

- `organizations.id` is a UUID stored as `TEXT`. Never cast it to `INT`. All other primary keys (`users.id`, `matches.id`, `teams.id`) are serial integers.

---

## 7. Next.js App Router Patterns

**This project is App Router only. Pages Router patterns do not apply.**

- Route handlers live in `app/api/**/route.ts`. Export named HTTP methods (`GET`, `POST`, `PATCH`, `DELETE`), never a default export.
- Always export `export const dynamic = "force-dynamic"` on routes that read from the database or depend on request headers.
- Use `next/dynamic` with `{ ssr: false }` for components that use browser APIs (`window`, `navigator`, `localStorage`).
- Server Components fetch data directly via `lib/db.ts`. Don't create a client→server fetch chain when a Server Component can query directly.
- `"use client"` components must not import `lib/db.ts` or `lib/auth.ts`. Those are server-only.

### Vercel Hobby plan constraints

- Max function duration: **60 seconds**. Always set `export const maxDuration = 60` on long-running routes and design for it. Do not assume 300s.
- Cron schedules: **daily only**. `*/30 * * * *` and sub-daily patterns are silently rejected. Always use `0 H * * *` format.
- Do not deploy functions that import large models or binary blobs at the module level — cold starts will time out.

---

## 8. External SDK Lazy Init

**Never instantiate external SDK clients at module level.**

If an SDK throws during construction (missing key, invalid config), the entire serverless function fails to load — including code paths that don't need that SDK at all.

**Pattern: lazy singleton**

```typescript
// Bad — crashes the module if key is absent
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Good — only instantiated when actually called
let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}
```

This applies to: **Anthropic**, **Stripe**, **web-push VAPID**, **Resend**, **Inngest**, and any other SDK that reads env vars during construction.

Always guard the call site separately:

```typescript
if (!process.env.ANTHROPIC_API_KEY) return fallback();
const client = getClient();
```

---

## 9. AI Features — Graceful Degradation

**AI is an enhancement, not a dependency. The app must work without it.**

- Every AI-powered feature must have a non-AI fallback:
  - `generate-stats`: algorithmic stats from scoreline (seeded PRNG, deterministic per matchId)
  - `bulk-analyze`: template-based tactical insights keyed to win/draw/loss
  - On-demand analysis: serve from `ai_analyses` cache first; only call Claude on cache miss
- Never return a 503 just because `ANTHROPIC_API_KEY` is absent. Return the best available data.
- The `method` field in admin responses should always indicate whether output came from Claude or a fallback (`"claude"` | `"algorithmic"` | `"template"`).

---

## 10. Live Match System

**SSE streams are long-lived connections. Handle them carefully.**

- Every SSE handler must set `Cache-Control: no-cache` and `Connection: keep-alive` headers. Missing these causes proxies to buffer the stream and break real-time delivery.
- Always send a `connected` event immediately after opening the stream — clients use this to confirm the connection is alive.
- Poll the DB no more than once every **5 seconds** inside an SSE handler. Tighter loops will exhaust Neon's connection pool.
- Use hash comparison to detect stat changes before emitting a `stats` event — don't broadcast on every poll tick.
- Live event injection via `POST /api/admin/live/[matchId]` must auto-increment the correct team's score: own goals increment the *opponent's* score, not the scoring team's.

---

## 11. WC2026 Design System

**The visual identity is gold-on-dark. Don't introduce off-brand colours.**

Core palette:
- Background: `#06080f` (deep navy)
- Primary accent: `#f0b429` (WC gold)
- Live/danger: `#e63946` (red)
- Success/pitch: `rgba(16,185,129,...)` (emerald, used sparingly)

Rules:
- All new cards must use `.wc-card` and `.wc-card-hover` utility classes from `globals.css`.
- Gold text uses `.wc-gold-text` (CSS gradient). Don't use plain `color: #f0b429` for headings — use the gradient class.
- Live indicators use `.live-dot` (animated red pulse). Don't roll your own.
- New animations must be defined as `@keyframes` in `globals.css` and applied via utility classes. Don't use inline `style` animation props.
- Competition badges follow the `COMP_BADGE` map in `MatchList.tsx`. Add new competitions there, not inline.

---

## These rules are working if:

- Diffs are small and focused — no reformatted files, no incidental refactors.
- Schema changes are idempotent and don't require a manual migration step.
- New external SDKs are lazy-initialized without exception.
- Secrets never appear in git history (`git log -p | grep -i "sk_\|password\|secret"` returns nothing).
- The app serves real data on every page even when `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, or `FOOTBALL_DATA_API_KEY` are absent.
- Clarifying questions come **before** implementation, not after a wrong diff lands.
