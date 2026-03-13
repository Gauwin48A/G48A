# Markdown Implementation Master Checklist

Last updated: 2026-03-12  
Owner: Engineering  
Scope analyzed: all markdown files under `Mhub/` (including hidden `.github/`)

## 1) Analysis Summary

- Total markdown files analyzed: `49`
- Files with checkbox items: `13`
- Total open checkbox items found: `282`
- Open items excluding this checklist file: `208`
- Open items excluding this file and PR template process checks: `192`
- Files containing missing markdown references: `0`

Top open-item sources:
1. `server/docs/project/AUTH_README.md` (`162`)
2. `MD_IMPLEMENTATION_MASTER_CHECKLIST.md` (`74`)
3. `.github/PULL_REQUEST_TEMPLATE.md` (`16`)
4. `README.md` (`11`)
5. `server/docs/BACKUP_RESTORE_DRILL.md` (`6`)
6. `server/docs/project/RELEASE_CLEANUP_CHECKLIST.md` (`6`)
7. `server/docs/project/IMPLEMENTATION_CHECKLIST.md` (`3`)
8. `server/scripts/audit_results.md` (`3`)
9. `server/docs/project/IMMEDIATE_ACTION_ITEMS.md` (`1`)

## 2) Missing-Reference Repair Checklist

Resolved stale links to removed docs in:

- [x] `SPRINT_PLAN_WEEK1_TO_WEEK10.md` (4 stale refs)
- [x] `server/docs/project/ORDERED_EXECUTION_CHECKLIST.md` (3 stale refs)
- [x] `server/docs/project/PRODUCTION_LAUNCH_ROADMAP.md` (3 stale refs)
- [x] `server/docs/security-policy.md` (3 stale refs)
- [x] `README.md` (2 stale refs)
- [x] `server/docs/PHASE5_VALIDATION_EVIDENCE_2026-02-27.md` (2 stale refs)
- [x] `server/docs/project/AUTH_README.md` (2 stale refs)
- [x] `server/docs/project/README_END_TO_END.md` (2 stale refs)
- [x] `server/README.md` (2 stale refs)
- [x] `server/docs/INCIDENT_RESPONSE.md` (1 stale ref)
- [x] `server/docs/project/FEATURE_STATUS_REPORT.md` (1 stale ref)
- [x] `server/docs/project/IMMEDIATE_ACTION_ITEMS.md` (1 stale ref)
- [x] `server/docs/SECURITY.md` (1 stale ref)
- [x] `server/docs/waf-rules.md` (1 stale ref)

## 3) Consolidated Implementation Checklist

### Phase A - Documentation Canonicalization (P0)

- [x] Fix all stale references listed in Section 2.
 - [x] Deduplicate `server/docs/project/ORDERED_EXECUTION_CHECKLIST.md` vs `server/docs/project/OrderedExecutionChecklist.md` and keep only one canonical checklist.
- [x] Update `README.md` docs index to only existing files.
- [x] Update `server/README.md` and `server/docs/project/README_END_TO_END.md` evidence links to current canonical docs.

### Phase B - Quality Gates from Process Docs (P0)

Source docs: `.github/PULL_REQUEST_TEMPLATE.md`, `README.md`

- [x] Enforce in CI: `npm run doctor`, client lint/test/build, server test.
- [x] Enforce route/contract validation checks for touched surfaces.
- [x] Enforce screenshot evidence for UI-impacting PRs (CI gate for PRs).
- [x] Enforce no-secrets check in merge gate.
- [x] Keep Zero-INR / Non-AI policy checks explicit in PR template and CI policy docs.

### Phase C - Product/UX Sprint Backlog (P1)

Source docs: `SPRINT_PLAN_WEEK1_TO_WEEK10.md`, `README.md`

- [ ] Complete Phase 3 auth hardening exit criteria (token lifecycle, guard reliability, session diagnostics).
- [ ] Complete Phase 4 determinism goals (navbar search/filter to `AllPosts` parity, save/cart state sync).
- [ ] Complete Phase 5 rewards/referral reliability criteria.
- [ ] Verify and close mobile UX checklist: sticky quick filters, visible category rail, single-line action row behavior at target breakpoints.
- [x] Add navbar search/filter -> AllPosts determinism test (`client/tests/pages/navbar-allposts-determinism.test.jsx`).
- [x] Keep wishlist removals in sync with saved-posts state (`client/src/pages/Wishlist.jsx`).
- [x] Add save/cart state regression tests (`client/tests/pages/all-posts-save-cart-state.test.jsx`).
- [x] Add auth refresh regression tests (`client/tests/context/auth-context.refresh.test.jsx`).

### Phase D - Localization and Language-Latency Backlog (P1)

Source docs: `server/scripts/audit_results.md`, `server/scripts/hardcoded-strings-audit.md`, `client/docs/PHASE2_LOCALIZATION_AUDIT.md`

- [ ] Execute high-traffic hardcoded-string replacement pass.
- [x] Re-run hardcoded-string audit and publish delta in `server/scripts/audit_results.md`.
- [x] Add CI gate for newly introduced untranslated hardcoded UI strings.
- [x] Re-verify audited pages after pass: `Profile.jsx`, `Rewards.jsx`, `MyHome.jsx`, `Support.jsx`.

### Phase E - Reliability, Security, and Testing Ops (P1)

Source docs: `server/docs/BACKUP_RESTORE_DRILL.md`, `server/docs/PERFORMANCE.md`, `server/docs/SECURITY.md`, `server/docs/TEST_CASES.md`

- [ ] Run backup/restore drill and complete all six manual validation checks.
- [ ] Append dated backup evidence artifact and owner.
- [ ] Add automated performance budget checks in CI.
- [ ] Expand live load cadence beyond dry-run profile generation.
- [ ] Add dependency-security automation in CI.
- [ ] Expand UI regression and performance-budget test coverage.

### Phase F - Release Hygiene and Worktree Safety (P1)

Source docs: `server/docs/project/RELEASE_CLEANUP_CHECKLIST.md`

- [ ] Execute release cleanup checklist before next release tag.
- [ ] Run `npm run audit:worktree` and ensure zero blocker findings.
- [ ] Explicitly confirm each intentional deletion in release notes.

### Phase G - External/Blocked Backlog Tracking (P2)

Source docs: `server/docs/34_MULTI_REGION_ACTIVE_ACTIVE_EXECUTION_BACKLOG.md`, `server/docs/project/IMMEDIATE_ACTION_ITEMS.md`, `server/docs/project/IMPLEMENTATION_CHECKLIST.md`

- [ ] Track and unblock MR-001, MR-002, MR-003, MR-006 (external infra dependent).
- [ ] Keep blocked state explicit in roadmap docs until prerequisites exist.
- [ ] Do not mark these complete until live infra evidence exists.

## 4) AUTH_README Normalization Checklist (Large Backlog Cleanup)

`server/docs/project/AUTH_README.md` currently contains 162 open checklist entries with duplicate/overlapping items.

- [ ] Split `server/docs/project/AUTH_README.md` into:
  - auth_done.md (already implemented/validated)
  - auth_now.md (current actionable items only)
  - auth_deferred.md (external or long-range items)
- [ ] Remove duplicated tasks repeated across "priority", "sprint", "week", and "launch day" sections.
- [ ] Convert all remaining auth items to one normalized tracker with `owner`, `status`, `proof`, `target_date`.
- [ ] Reconcile docs against actual code/tests before carrying any item forward.

## 5) File-by-File Disposition

### Actionable (implement/update now)

- [ ] `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] `README.md`
- [ ] `SPRINT_PLAN_WEEK1_TO_WEEK10.md`
- [ ] `server/README.md`
- [ ] `server/docs/BACKUP_RESTORE_DRILL.md`
- [ ] `server/docs/INCIDENT_RESPONSE.md`
- [ ] `server/docs/PERFORMANCE.md`
- [ ] `server/docs/PHASE5_VALIDATION_EVIDENCE_2026-02-27.md`
- [ ] `server/docs/SECURITY.md`
- [ ] `server/docs/TEST_CASES.md`
- [ ] `server/docs/project/AUTH_README.md`
- [ ] `server/docs/project/FEATURE_STATUS_REPORT.md`
- [ ] `server/docs/project/HALF_PENDING_OR_YET_TO_IMPLEMENT_FEATURES.md`
- [ ] `server/docs/project/IMMEDIATE_ACTION_ITEMS.md`
- [ ] `server/docs/project/IMPLEMENTATION_CHECKLIST.md`
- [ ] `server/docs/project/ORDERED_EXECUTION_CHECKLIST.md`
- [ ] `server/docs/project/PRODUCTION_LAUNCH_ROADMAP.md`
- [ ] `server/docs/project/README_END_TO_END.md`
- [ ] `server/docs/project/RELEASE_CLEANUP_CHECKLIST.md`
- [ ] `server/docs/security-policy.md`
- [ ] `server/docs/waf-rules.md`
- [ ] `server/scripts/audit_results.md`
- [ ] `server/scripts/hardcoded-strings-audit.md`

### Keep as reference/evidence (no immediate implementation task)

- [ ] `PROJECT_STRUCTURE.md`
- [ ] `client/README.md`
- [ ] `client/docs/E2E_SMOKE.md`
- [ ] `client/docs/NETWORK_RELIABILITY_RUNBOOK.md`
- [ ] `client/docs/PHASE2_LOCALIZATION_AUDIT.md`
- [ ] `server/database/README.md`
- [ ] `server/docs/29_ML_FRAUD_SPIKE_PLAN.md`
- [ ] `server/docs/30_MULTI_REGION_FAILOVER_PLAYBOOK_DRAFT.md`
- [ ] `server/docs/31_PROGRESSIVE_FEATURE_ROLLOUT_BASELINE.md`
- [ ] `server/docs/32_FAILOVER_DRILL_EVIDENCE.md`
- [ ] `server/docs/33_FLAG_ROLLOUT_OPERATIONAL_AUDIT.md`
- [ ] `server/docs/34_MULTI_REGION_ACTIVE_ACTIVE_EXECUTION_BACKLOG.md`
- [ ] `server/docs/edge-caching-setup.md`
- [ ] `server/docs/project/CHANGELOG_AUTO.md`
- [ ] `server/docs/project/EXECUTIVE_SUMMARY.md`
- [ ] `server/docs/project/FEATURE_COMPLETION_MATRIX.md`
- [ ] `server/docs/project/IMPLEMENTATION_REPORT.md`
- [ ] `server/docs/project/IMPROVEMENTS_SUMMARY.md`
- [ ] `server/docs/project/ISSUES_FOUND_ANALYSIS.md`
- [ ] `server/docs/project/NEW_ADDITIONAL_FEATURES.md`
- [ ] `server/docs/project/OrderedExecutionChecklist.md`
- [ ] `server/docs/project/SPRINT_PLAN_AUTH_E2E.md`
- [ ] `server/docs/project/SPRINT_PLAN_WEEK1_TO_WEEK10.md`
- [ ] `server/docs/project/WORKTREE_RISK_REPORT.md`
- [ ] `server/docs/project/ZERO_INR_TOP100_EXECUTION_PLAN.md`
- [ ] `server/docs/project/auth_improve.md`

## 6) Recommended Execution Order

1. Phase A (docs canonicalization and stale-reference cleanup).
2. Phase B (CI/PR quality gates from process docs).
3. Phase D + Phase C (i18n quality and product UX determinism).
4. Phase E (ops/security/testing reliability tasks).
5. Phase F (release cleanup gate before tagging).
6. Phase G (external blocked items, tracked but not force-closed).
