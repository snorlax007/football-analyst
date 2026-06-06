---
title: "Football AI Analyst — Master Index"
type: index
created: 2026-06-06
updated: 2026-06-06
tags:
  - index
  - root
---

# ⚽ Football AI Analyst — Build Wiki

> [!note] About this Wiki
> This is a persistent knowledge base tracking the build of **Football AI Match Analyst** — a YC-level football analytics SaaS. Maintained using the [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). The LLM writes and updates these notes; you browse and direct.

## Overall Progress

```dataview
TABLE phase as "Phase", week as "Week", tasks_done + " / " + tasks_total as "Progress", status as "Status", key_unlock as "Unlock"
FROM ""
WHERE type = "phase-index" OR phase_index = true
SORT phase ASC
```

## Phases

| # | Phase | Week | Color | Key Unlock |
|---|---|---|---|---|
| [[Phase-01-Foundation/_index\|1]] | [[Phase-01-Foundation/_index\|Foundation]] | 1–2 | 🔵 Blue | Product exists |
| [[Phase-02-Auth-and-User-Accounts/_index\|2]] | [[Phase-02-Auth-and-User-Accounts/_index\|Auth + User Accounts]] | 3 | 🟢 Green | Users exist |
| [[Phase-03-Orgs-and-Multi-Tenancy/_index\|3]] | [[Phase-03-Orgs-and-Multi-Tenancy/_index\|Orgs + Multi-Tenancy]] | 4 | 🟣 Purple | B2B possible |
| [[Phase-04-Payments/_index\|4]] | [[Phase-04-Payments/_index\|Payments]] | 5 | 🟡 Yellow | Revenue starts |
| [[Phase-05-Export-and-Sharing/_index\|5]] | [[Phase-05-Export-and-Sharing/_index\|Export & Sharing]] | 6 | 🩵 Cyan | Viral loop |
| [[Phase-06-Real-Time-and-Alerts/_index\|6]] | [[Phase-06-Real-Time-and-Alerts/_index\|Real-Time & Alerts]] | 7–8 | 🟠 Orange | Daily usage |
| [[Phase-07-AI-Depth/_index\|7]] | [[Phase-07-AI-Depth/_index\|AI Depth]] | 9–10 | 🔴 Red | Moat built |
| [[Phase-08-API-and-Integrations/_index\|8]] | [[Phase-08-API-and-Integrations/_index\|API & Integrations]] | 11–12 | ⚪ Grey | Distribution |
| [[Phase-09-Mobile-and-PWA/_index\|9]] | [[Phase-09-Mobile-and-PWA/_index\|Mobile & PWA]] | 13 | 🟢 Green | Coaches adopt |
| [[Phase-10-Scale-and-Observability/_index\|10]] | [[Phase-10-Scale-and-Observability/_index\|Scale & Observability]] | 14–15 | ⚫ Dark | Ready for growth |

## YC Readiness

> [!warning] Apply to YC after Phase 4
> You need: real users + at least one paying customer + defensible AI layer. Phases 1–4 get you there. Everything after is growth.

## Key Files

- [[log|📋 Activity Log]] — chronological record of all work
- [[CLAUDE.md|🤖 Wiki Schema]] — instructions for LLM wiki maintenance

## App URLs

- **Tracker:** https://testproject-omega-seven.vercel.app
- **Football App:** https://testproject-omega-seven.vercel.app/football
- **Neon DB:** `neondb` on `ep-divine-frog-aq1vnbfq`
