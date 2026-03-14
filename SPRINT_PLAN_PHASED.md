# MHub Phased Sprint Plan (Consolidated)

Date: 2026-03-14
Owner: Engineering
Scope: Client + Server + Ops + Docs
Sources: README.md, SPRINT_PLAN_WEEK1_TO_WEEK10.md, MD_IMPLEMENTATION_MASTER_CHECKLIST.md, server/docs/project/*, verification_report.txt, server/scripts/verification_report.txt, server/scripts/audit_results.md, server/docs/BACKUP_RESTORE_DRILL.md, client/docs/*, client/stderr.txt, client/lint_log.txt, --Tier setup -subscription.txt

## Current State Snapshot
- Backend baseline and ops gates are COMPLETE/OPERATIONAL; live multi-region active-active remains BLOCKED by external infra (MR-001/002/003/006).
- Auth hardening implementation is largely done (auth_improve + Sprint A-D); Sprint E rollout tasks are partially complete (auth suite run + release gate docs updated), with owner signoff still pending.
- Phase 3/4 product work is mid-flight: determinism fixes and tests landed; remaining UX consistency and rewards/referral reliability are open.
- Localization coverage (canonical report 2026-03-14): 80-84% translated for hi/te/ta/kn/mr/bn with 336-410 EN fallbacks; no missing keys detected for Tamil in current locale sources.
- Hardcoded-string audit is active: 178 potential strings across 49 files; CI guard exists but high-traffic replacement pass is still open.
- Tooling gates re-run and green (client `npm run lint` + `npm run build` passed on 2026-03-14); Firebase env warnings remain for production placeholders.
- Release hygiene is not closed: worktree cleanup checklist and backup/restore drill evidence require completion.

## Recent Progress (2026-03-14)
- Added saved-post mutation guard to prevent duplicate wishlist writes across feeds, detail, and wishlist.
- Synced wishlist view with saved-post updates (prune removed items, refresh on new saves).
- Aligned AllPosts URL query building with navbar (price range normalization, reset sortBy on empty query).
- Added regression tests for save dedupe, navbar search/filter determinism, and save/cart state sync.
- Regenerated translation readiness report from current locale sources and synced server/scripts copy.
- Normalized auth backlog into canonical `AUTH_DONE.md`, `AUTH_NOW.md`, and `AUTH_DEFERRED.md` trackers.
- Added one-command auth rollout verifier (`npm run auth:verify`) for Sprint E operability.
- Fixed My Posts load gating to allow cookie-based auth sessions (removed hard dependency on local access token).
- Reconciled Tamil missing-keys report; current locale sources show no missing keys.
- Replaced Radix separator dependency with local UI separator to unblock client build.
- Added My Home listing stats row (views/likes/shares) for owner posts.
- Added deterministic back-navigation fallback for Post Detail and Sale Done flows.
- Ran client lint/build gates successfully (2026-03-14).
- Auth integration suite passed after fixing `??`/`||` precedence in location verification service (`npm run test:auth:integration`, 2026-03-14).
- Updated release cleanup checklist with auth verification gate entries.
- Began Phase 3 hardcoded-string replacement: Wishlist + Sold Posts now use i18n keys; added `sold_posts_empty_*` + `untitled_post` locale keys and bumped i18n cache version to `v1.0.12`.

## Phase 0 - Baseline Alignment and Tooling Gates (Now)
Goal: Make reports trustworthy and unblock CI/build gates before new feature work.
Scope:
- Fix client build break (@radix-ui/react-separator) and update lint script for ESLint flat config.
- Regenerate translation readiness report and reconcile mismatch between root and server script outputs.
- Normalize AUTH_README backlog into done/now/deferred (canonical tracker).
- Reconcile root and server sprint plans into a single source of truth.
Exit Criteria:
- Build and lint succeed locally with updated scripts/deps.
- One canonical translation readiness report with current counts.
- Auth backlog has one owner-tagged tracker with statuses.

## Phase 1 - Auth Hardening Closure (SPRINT_PLAN_AUTH_E2E)
Goal: Close remaining auth Sprint E items and publish rollout readiness.
Scope:
- Verify auth bootstrap, refresh, and revoke flows in CI/local.
- Add rollout checklist and rollback notes with owner signoff.
- Eliminate any remaining open-handle warnings in auth test teardown.
Exit Criteria:
- Auth tests green with no open-handle warnings.
- Rollout checklist published and accepted.

## Phase 2 - Marketplace Determinism and UX Consistency
Goal: Remove state drift and UX inconsistencies across core marketplace flows.
Scope:
- Search/filter parity from navbar to AllPosts results (including price range normalization).
- Save/cart state sync across feed, detail, wishlist, and cart surfaces.
- Fix My Posts view behavior (remove buyer-only buttons; show leads/interest stats).
- Fix Sale Done page flow and notification popup persistence issues.
- Add back-navigation affordances where missing.
Exit Criteria:
- Same post state reflected on all surfaces with no duplicate writes.
- Mobile/tablet UX checks pass on key routes.

## Phase 3 - Rewards/Referral Reliability and Localization Hygiene
Goal: Stabilize rewards/referral logic and reduce English fallbacks on high-traffic screens.
Scope:
- Rewards/referral correctness (ledger totals, referral tree, unauthorized gating).
- Reconcile missing-keys.txt vs current locale sources and close real gaps.
- Execute high-traffic hardcoded-string replacement pass.
- Re-run translation readiness and hardcoded-string audits and publish deltas.
Exit Criteria:
- Rewards totals match ledger events; referrals render without broken nodes.
- Translation coverage > 95% for high-traffic screens and decreasing hardcoded-string count.

## Phase 4 - Reliability and Ops Gates
Goal: Close remaining ops checklists and automate reliability budgets.
Scope:
- Run backup/restore drill and complete all manual validations.
- Add automated performance budget checks in CI.
- Add dependency security automation in CI.
- Expand live load test cadence beyond dry-run.
- Execute release cleanup checklist and worktree audit.
Exit Criteria:
- Backup drill evidence logged and accepted.
- Performance and dependency gates enforced in CI.
- Worktree audit shows no blocker findings.

## Phase 5 - QA Automation and Regression Shields
Goal: Increase UI regression coverage without slowing delivery.
Scope:
- Expand Playwright smoke coverage for critical routes and auth states.
- Add mobile navbar visual/UX checks.
- Document and enforce release gate criteria in CI.
Exit Criteria:
- CI green for lint/test/build/smoke with deterministic failures.
- Regression coverage for navbar/i18n/auth flows in place.

## Phase 6 - Monetization and Growth (Tier/Boost)
Goal: Implement tiered plans and boosted listings strategy.
Scope:
- Pricing page redesign with Free/Silver/Premium tiers (separate listing vs boost vs subscription).
- Boost/featured listing purchase flows.
- Sponsored listings block on post detail pages with priority rules.
Exit Criteria:
- Tier selection flow and boost APIs integrated end-to-end.

## Phase 7 - External Infra (Blocked)
Goal: Execute live multi-region active-active runbook.
Scope:
- MR-001/002/003/006 from 34_MULTI_REGION_ACTIVE_ACTIVE_EXECUTION_BACKLOG.md.
Exit Criteria:
- Live shift evidence published with RTO/RPO acceptance.
