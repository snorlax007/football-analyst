@AGENTS.md

# Football AI Analyst — Wiki Schema

This is the schema for the LLM-maintained build wiki inside this Obsidian vault.
Read this before making any changes to wiki files. Follow it exactly.

## What this vault is

A persistent knowledge base tracking the build of **Football AI Match Analyst** — a YC-level
football analytics SaaS. Follows the [LLM Wiki pattern by Karpathy](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

The vault doubles as a Next.js project root (`app/`, `package.json`, etc.). Only touch wiki
markdown files — never modify app source code unless explicitly asked.

## Vault structure

```
football-analyst/
├── index.md                          ← Master index (always read first)
├── log.md                            ← Append-only activity log
├── CLAUDE.md                         ← This file (wiki schema)
├── Phase-01-Foundation/
│   ├── _index.md                     ← Phase overview + Dataview progress table
│   ├── 1.1-Project-Scaffold.md
│   ├── 1.2-Database-Schema.md
│   ├── 1.3-Real-Data-Integration.md
│   └── 1.4-Real-AI-Analysis.md
├── Phase-02-Auth-and-User-Accounts/
│   ├── _index.md
│   ├── 2.1-Wire-Up-Neon-Auth.md
│   ├── 2.2-User-Dashboard.md
│   └── 2.3-Usage-Limits.md
├── Phase-03-Orgs-and-Multi-Tenancy/
│   ├── _index.md
│   ├── 3.1-Organization-Model.md
│   ├── 3.2-Org-Dashboard.md
│   └── 3.3-League-and-Team-Tracking.md
├── Phase-04-Payments/
│   ├── _index.md
│   ├── 4.1-Stripe-Integration.md
│   ├── 4.2-Checkout-and-Billing.md
│   └── 4.3-Feature-Gating.md
├── Phase-05-Export-and-Sharing/
│   ├── _index.md
│   ├── 5.1-PDF-Report-Export.md
│   ├── 5.2-Shareable-Match-Cards.md
│   └── 5.3-Public-SEO-Pages.md
├── Phase-06-Real-Time-and-Alerts/
│   ├── _index.md
│   ├── 6.1-Live-Match-Tracker.md
│   ├── 6.2-Push-Notifications-and-Email-Alerts.md
│   └── 6.3-Scheduled-Jobs.md
├── Phase-07-AI-Depth/
│   ├── _index.md
│   ├── 7.1-Tactical-Formation-Visualizer.md
│   ├── 7.2-Player-Scouting-Module.md
│   ├── 7.3-Opposition-Pre-Match-Reports.md
│   └── 7.4-Season-Trends-and-Benchmarking.md
├── Phase-08-API-and-Integrations/
│   ├── _index.md
│   ├── 8.1-Public-API.md
│   ├── 8.2-Embeddable-Widget.md
│   ├── 8.3-Fantasy-Football-Integration.md
│   └── 8.4-Webhook-Support.md
├── Phase-09-Mobile-and-PWA/
│   ├── _index.md
│   ├── 9.1-Progressive-Web-App.md
│   └── 9.2-Mobile-UI-Optimization.md
└── Phase-10-Scale-and-Observability/
    ├── _index.md
    ├── 10.1-Performance.md
    ├── 10.2-Background-Job-Queue.md
    ├── 10.3-Monitoring.md
    └── 10.4-Security-Hardening.md
```

## Color coding (PLN Nord theme)

Each phase has a fixed callout color. Use it consistently in all notes for that phase.

| Phase | Title | Callout type | Color |
|---|---|---|---|
| 1 | Foundation | `[!info]` | 🔵 Blue |
| 2 | Auth | `[!success]` | 🟢 Green |
| 3 | Orgs | `[!example]` | 🟣 Purple |
| 4 | Payments | `[!warning]` | 🟡 Yellow |
| 5 | Export | `[!tip]` | 🩵 Cyan |
| 6 | Real-Time | `[!caution]` | 🟠 Orange |
| 7 | AI Depth | `[!danger]` | 🔴 Red |
| 8 | API | `[!note]` | ⚪ Grey |
| 9 | Mobile | `[!check]` | 🟢 Green |
| 10 | Scale | `[!bug]` | ⚫ Dark red |

Status callouts (use in the ## Status section of every note):

```
> [!info] ⬜ Not Started
> [!warning] 🔄 In Progress — X of Y tasks complete
> [!success] ✅ Done — all tasks complete
> [!danger] 🚫 Blocked — describe blocker here
```

## Frontmatter schema

Every section note must have this frontmatter:

```yaml
---
phase: <number>
phase_title: "<string>"
section: "<e.g. 1.1>"
title: "<section title>"
status: todo | in_progress | done | blocked
tasks_total: <number>
tasks_done: <number>
week: "<e.g. 1-2>"
color: <callout type>
tags:
  - phase-<nn>
  - <phase-slug>
  - <status>
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

Phase `_index.md` notes use the same schema but also include `key_unlock`.

## Operations

### When starting a section

1. Open the section note (e.g. `Phase-01-Foundation/1.1-Project-Scaffold.md`)
2. Update frontmatter: `status: in_progress`, `updated: <today>`
3. Update the Status callout block
4. Update `tasks_done` as tasks are checked off
5. Append an entry to `log.md`
6. Also update status in the Neon DB: `UPDATE tasks SET status='in_progress' WHERE title=...`

### When completing a section

1. Check off all tasks in the note
2. Update frontmatter: `status: done`, `tasks_done: <total>`, `updated: <today>`
3. Update Status callout to `[!success] ✅ Done`
4. Update parent `_index.md` progress count
5. Append to `log.md`
6. Update Neon DB

### When adding notes/learnings

- Add under `## Implementation Notes` in the relevant section file
- If a decision affects multiple phases, create a new note and link to it
- Update `log.md` with a summary

### Log entry format

```markdown
## [YYYY-MM-DD] <action> | <description>

> [!<level>] <title>
> - bullet points of what happened

**Impact:** what changed or was learned
```

Actions: `ingest`, `complete`, `start`, `blocked`, `decision`, `deploy`, `query`

## Key external references

- **Neon DB:** `postgresql://neondb_owner:...@ep-divine-frog-aq1vnbfq-pooler...`
  - Tables: `phases`, `tasks` (with `status` column), `logs`
- **Vercel:** https://testproject-omega-seven.vercel.app
- **Progress tracker:** https://testproject-omega-seven.vercel.app (Flask + Neon)
- **Vercel project:** `ayanghoshoneconvergens-projects/test_project`
- **API-Football:** needed for Phase 1.3
- **Claude API:** needed for Phase 1.4 (model: `claude-sonnet-4-6`)

## What NOT to do

- Do not modify files in `app/`, `public/`, `node_modules/`, `.next/`
- Do not overwrite `log.md` — only append
- Do not change the callout color scheme — it is fixed per phase
- Do not delete section notes — mark them `done` instead
