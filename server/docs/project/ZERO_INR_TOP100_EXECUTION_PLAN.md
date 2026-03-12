# Zero-INR Top-100 Execution Plan (Non-AI, Fire-and-Forget)

Date: March 10, 2026  
Owner: Engineering  
Scope: `Mhub/` monorepo  
Constraint Mode: `NO_AI + ZERO_INR + ZERO_INFRA + ZERO_MAINTENANCE`

---

## 1) Mission

Build compounding growth, trust, and conversion under strict constraints:

- no AI features of any kind,
- no mandatory paid infrastructure,
- no always-on operational overhead,
- cloud deployment posture compatible with Cloudflare Free tier.

This is an execution plan for the already-defined top-100 feature catalog in `README.md` Appendix F.

---

## 2) Non-Negotiable Constraints

| Rule | Required |
|---|---|
| AI | Never ship ML/LLM/vector/inference features |
| Cost | Avoid paid dependencies as requirements |
| Infra | Prefer Cloudflare edge/static/browser-native patterns |
| Ops | Prefer CI-enforced and policy-as-code guardrails |
| Scope | Thin, testable vertical slices only |

---

## 3) ROI Prioritization Formula

Each feature is scored with this deterministic rule:

`ROI Score = (Impact x Confidence x Compounding) / Effort`

Where:

- Impact: security, conversion, acquisition, retention, performance uplift.
- Confidence: implementation certainty using current codebase.
- Compounding: likelihood of long-term multiplier effect.
- Effort: engineering + migration + regression risk.

Execution order is locked by ROI score and dependency chain.

---

## 4) Top-100 Catalog Canonical Source

Canonical feature definitions and leverage rationale are in:

- `README.md` -> `Appendix F: Top 100 Non-AI Zero-INR Feature Catalog`.

This plan maps those IDs into implementation waves, KPIs, and acceptance gates.

---

## 5) Wave Plan (Top-50 First)

## Wave 1 (Weeks 1-2): Abuse + Trust Baseline

Features:
- `F001`, `F002`, `F006`, `F008`, `F012`, `F014`, `F025`

KPIs:
- Auth abuse events down 30%+
- Unauthorized session complaints down 20%+
- Mean triage time down 30%+

## Wave 2 (Weeks 3-4): Performance Baseline

Features:
- `F026`, `F027`, `F029`, `F030`, `F033`, `F034`, `F040`

KPIs:
- Mobile p95 page load down 25%+
- JS transfer size down 15%+
- Bounce rate down 8%+

## Wave 3 (Weeks 5-6): SEO Growth Core

Features:
- `F051`, `F053`, `F055`, `F058`, `F059`, `F060`, `F062`

KPIs:
- Indexed pages up 2x
- Non-brand impressions up 50%+
- Organic sessions up 30%+

## Wave 4 (Weeks 7-8): Conversion + Re-Engagement

Features:
- `F067`, `F068`, `F069`, `F070`, `F071`, `F077`, `F081`

KPIs:
- Return-user conversion up 12%+
- Alert CTR up 20%+
- Cart-to-checkout progression up 10%+

## Wave 5 (Weeks 9-10): Reliability + Release Discipline

Features:
- `F044`, `F045`, `F096`, `F097`, `F098`, `F099`, `F100`

KPIs:
- Failed deploy rate down 40%+
- Regression escape rate down 35%+
- Recovery drill pass rate above 95%

---

## 6) Extended Top-100 Waves (Post Top-50)

## Wave 6: Security Depth

Features:
- `F003`, `F004`, `F005`, `F007`, `F009`, `F010`, `F011`, `F013`, `F015`, `F016`, `F017`, `F018`, `F019`, `F020`, `F021`, `F022`, `F023`, `F024`

Outcome:
- Security baseline reaches repeatable, policy-tested maturity.

## Wave 7: Performance Depth

Features:
- `F028`, `F031`, `F032`, `F035`, `F036`, `F037`, `F038`, `F039`, `F041`, `F042`, `F043`, `F046`, `F047`, `F048`, `F049`, `F050`

Outcome:
- Faster app with stronger scaling behavior and low infra pressure.

## Wave 8: SEO + Discovery Depth

Features:
- `F052`, `F054`, `F056`, `F057`, `F061`, `F063`, `F065`, `F066`

Outcome:
- Better crawlability, social visibility, and attribution clarity.

## Wave 9: Retention + Marketplace Quality

Features:
- `F064`, `F072`, `F073`, `F074`, `F075`, `F076`, `F078`, `F079`, `F080`, `F082`, `F083`, `F084`, `F085`, `F086`, `F087`, `F088`, `F089`, `F090`

Outcome:
- Compounding retention and trust loops without paid channels.

## Wave 10: Rollout + Communication Scale

Features:
- `F091`, `F092`, `F093`, `F094`, `F095`

Outcome:
- Faster safe rollout cycles and user-facing transparency.

---

## 7) Definition Of Done (Per Feature)

A feature is `DONE` only when all are true:

1. Code merged behind stable contracts.
2. Unit/integration coverage for critical paths.
3. Regression guard added (lint/test/script/CI gate).
4. README/docs updated with exact commands and behavior.
5. KPI defined and baseline captured.

---

## 8) Risk Controls

| Risk | Control |
|---|---|
| Scope bloat | Lock active wave; backlog untouched until wave gate passes |
| Hidden ops cost | Reject features requiring manual daily intervention |
| Quality drift | Enforce doctor + tests + lint + build on every merge |
| Security regression | Keep security contract checks mandatory |
| Performance decay | Keep bundle budget and route-smoke checks mandatory |

---

## 9) Implementation Ledger (Live)

Status legend:
- `DONE` = implemented and validated
- `IN_PROGRESS` = currently under execution
- `PLANNED` = queued by wave

| Feature ID | Status | Notes |
|---|---|---|
| `F053` | DONE | Sitemap generation automation added (`npm run seo:generate`) |
| `F054` | DONE | Robots policy generation aligned with sitemap |
| `F094` | DONE | Automated changelog generation added (`npm run changelog:generate`) |
| `F099` | DONE | PR checklist enforcement template added |
| `F095` | DONE | Static public status fallback page added |
| `F051` | DONE | Route-level SEO metadata templates + canonical/OG/Twitter updates |

---

## 10) Command Runbook

Execution:

```bash
npm run doctor
npm run release:gate
```

SEO + docs automation:

```bash
npm run seo:generate
npm run changelog:generate
SITE_URL=https://your-domain.com npm run seo:generate
```

Validation:

```bash
npm --prefix client run lint
npm --prefix client run test
npm --prefix client run build
npm --prefix server test
```

---

## 11) Billion-Scale Leverage Logic (No-Hype, Deterministic)

How this plan creates outsized outcomes without spend:

1. Security-first trust raises conversion and lowers fraud drag.
2. Fast pages improve retention and reduce acquisition wastage.
3. SEO/indexable surfaces compound free discovery over time.
4. Referral/share/re-engagement loops reduce CAC dependence.
5. CI gate discipline prevents quality debt from compounding.

This is not a “single feature win”; it is a compounding system.

---

## 12) Next Action

Immediate action from this plan:

- start Wave-1 abuse and trust baseline (`F001`, `F002`, `F006`, `F008`, `F012`, `F014`, `F025`),
- wire CI execution for `seo:generate` and `changelog:generate`,
- keep remaining features scheduled by wave without expanding active scope.
