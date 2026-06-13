# DOX — app/api/auth/

Parent: [`../AGENTS.md`](../AGENTS.md) → [`../../AGENTS.md`](../../AGENTS.md) → [`../../../AGENTS.md`](../../../AGENTS.md)

## Purpose

Authentication endpoints: login, logout, register, and session check. These are the only routes that create or destroy JWT sessions.

## Ownership

Auth logic must not be duplicated elsewhere. `lib/auth.ts` is the single source of truth for session creation and validation.

## Local Contracts

### Route inventory

| Route | Method | Purpose |
|---|---|---|
| `login/` | POST | Validates credentials, sets JWT cookie. Body: `{ email, password }` |
| `logout/` | POST | Clears the JWT cookie. No body required. |
| `register/` | POST | Creates user account, sets JWT cookie. Body: `{ email, password, name? }` |
| `me/` | GET | Returns current session user or 401. Used by client components to check auth state. |

### Session contract

- JWT signed with `process.env.JWT_SECRET` using the algorithm set in `lib/auth.ts`.
- Cookie: `httpOnly`, `sameSite: lax`, `secure` in production. Do not change these flags.
- `getSession()` from `lib/auth.ts` is how every other route reads the session — never re-parse the cookie manually.

### Password rules

- Passwords hashed with `bcryptjs` (rounds ≥ 10). Never store plaintext.
- Compare with `bcrypt.compare` — do not write a custom comparison.

### Error responses

- Invalid credentials: `{ error: "Invalid email or password" }` — always the same message for both wrong email and wrong password (prevents user enumeration).
- Duplicate email on register: `{ error: "Email already in use" }` with 409.
- Missing fields: `{ error: "..." }` with 400.

## Work Guidance

- No changes to the cookie configuration without explicit instruction — session breakage affects all logged-in users.
- If adding OAuth or SSO: add a new route, do not modify the existing password flow.
- Rate-limit login attempts if brute-force protection is needed — use `lib/rateLimit.ts`.

## Verification

- `POST /api/auth/login` with valid credentials sets a cookie and returns user data.
- `POST /api/auth/logout` clears the cookie.
- `GET /api/auth/me` returns 401 when no cookie is present.

## Child DOX Index

No child AGENTS.md. Leaf node.
