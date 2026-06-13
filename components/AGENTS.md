# DOX — components/

Parent: [`../AGENTS.md`](../AGENTS.md)

## Purpose

Shared React components used across multiple pages. All files here are client components unless explicitly noted.

## Ownership

Components must be independently renderable — no page-specific logic, no direct DB queries, no `getSession()` calls.

## Local Contracts

### Design system rules (from root)
- Background `#06080f`, gold `#f0b429`, live red `#e63946`.
- All cards use `.wc-card` / `.wc-card-hover` CSS utility classes.
- Headings use `.wc-gold-text` gradient class — not plain `color: #f0b429`.
- New animations go in `app/globals.css` as named `@keyframes`, not inline styles.

### Component inventory

| File | Purpose |
|------|---------|
| `Header.tsx` | Global nav — WC2026 gold logo, float-ball ⚽, shimmer CTA. Auth state via server-passed prop or fetch. |
| `WC2026Banner.tsx` | Countdown banner to kickoff `2026-06-11T18:00:00Z`. Dismissible via `localStorage`. Includes scrolling facts ticker. |
| `Paywall.tsx` | Upgrade prompt shown when user hits quota. Accepts `tier` and `upgradeUrl` props. |
| `UsageBar.tsx` | Visual quota bar. Props: `used`, `quota`, `label`. |
| `LogoutButton.tsx` | Calls `POST /api/auth/logout` then redirects. |
| `BillingPortalButton.tsx` | Calls `POST /api/billing/portal` and redirects to Stripe portal URL. |
| `PushSubscribeButton.tsx` | Registers service worker and POSTs subscription to `/api/push/subscribe`. |
| `InstallPrompt.tsx` | PWA install prompt. Uses `beforeinstallprompt` browser event. |
| `ServiceWorkerRegistrar.tsx` | Registers `/sw.js`. Must be rendered once at layout level. |
| `PostHogProvider.tsx` | PostHog analytics wrapper. Must wrap the app in `layout.tsx`. |

## Work Guidance

- New shared components go here. Page-specific components stay co-located in `app/`.
- Never import `lib/db.ts` or `lib/auth.ts` from any component in this directory.
- Props should be typed via interfaces — no `any`, no untyped props.
- `WC2026Banner.tsx`: the dismissal key is `"wc2026-banner-v2"` in localStorage. Bump the version suffix if the banner content changes significantly.
- `Header.tsx`: the float-ball animation class is `animate-float-ball` — defined in `globals.css`. Do not duplicate inline.

## Verification

- No direct DB or auth imports in any component file.
- All new components render without errors when given only their declared props.

## Child DOX Index

No child AGENTS.md. All components are flat in this directory.
