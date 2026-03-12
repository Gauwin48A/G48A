# Release Cleanup Checklist

Generated: 2026-03-11T12:40:40.515Z

## Snapshot
- Total changed paths: 172
- Safe-to-restore paths: 0
- Intentional-review paths: 172
- High-risk intentional deletions: 0

## Release Blockers
1. [INFO] No automatic release blockers detected from worktree triage.

## Checklist
- [ ] Re-run `git status --short` and confirm this snapshot still matches.
- [ ] Restore tracked safe-to-restore changes.
- [ ] Remove untracked safe-to-restore files/directories.
- [ ] Review each intentional change and mark it KEEP or RESTORE.
- [ ] Explicitly confirm every source/config/database deletion.
- [ ] Run `npm run audit:worktree` and verify no BLOCKER findings remain.

## Command Hints
### Restore tracked safe changes
- none

### Clean untracked safe changes
- none

## Breakdown
### By status
- modified: 68
- deleted: 56
- untracked: 48

### By reason
- other: 90
- source_code: 71
- documentation: 7
- configuration: 2
- database: 2

### Top-level paths
- client: 75
- server: 37
- scripts: 25
- docs: 13
- .gitignore: 1
- AUTH_README.md: 1
- DEPLOYMENT_GUIDE.sh: 1
- EXECUTIVE_SUMMARY.md: 1
- FEATURE_COMPLETION_MATRIX.md: 1
- FEATURE_STATUS_REPORT.md: 1
- HALF_PENDING_OR_YET_TO_IMPLEMENT_FEATURES.md: 1
- IMMEDIATE_ACTION_ITEMS.md: 1
- IMPLEMENTATION_CHECKLIST.md: 1
- IMPLEMENTATION_REPORT.md: 1
- IMPROVEMENTS_SUMMARY.md: 1

## Samples
### Safe-to-restore (first 80)
- none

### Intentional-review (first 80)
-  M .gitignore
-  D AUTH_README.md
-  D DEPLOYMENT_GUIDE.sh
-  D EXECUTIVE_SUMMARY.md
-  D FEATURE_COMPLETION_MATRIX.md
-  D FEATURE_STATUS_REPORT.md
-  D HALF_PENDING_OR_YET_TO_IMPLEMENT_FEATURES.md
-  D IMMEDIATE_ACTION_ITEMS.md
-  D IMPLEMENTATION_CHECKLIST.md
-  D IMPLEMENTATION_REPORT.md
-  D IMPROVEMENTS_SUMMARY.md
-  D ISSUES_FOUND_ANALYSIS.md
-  D NEW_ADDITIONAL_FEATURES.md
-  D ORDERED_EXECUTION_CHECKLIST.md
-  D OrderedExecutionChecklist.md
-  D PRODUCTION_LAUNCH_ROADMAP.md
-  M README.md
-  D README_END_TO_END.md
-  D SPRINT_PLAN_WEEK1_TO_WEEK10.md
-  M client/.env.example
-  M client/index.html
-  M client/public/locales/bn/translation.json
-  M client/public/locales/en/translation.json
-  M client/public/locales/hi/translation.json
-  M client/public/locales/kn/translation.json
-  M client/public/locales/mr/translation.json
-  M client/public/locales/ta/translation.json
-  M client/public/locales/te/translation.json
-  M client/public/manifest.json
-  M client/public/robots.txt
-  M client/public/sw.js
-  M client/scripts/dev-safe.mjs
-  M client/src/App.jsx
-  M client/src/components/GlobalContentTranslator.jsx
-  M client/src/components/GreenNavbar.jsx
-  M client/src/components/LanguageSelector.jsx
-  M client/src/components/LocationSelector.jsx
-  M client/src/context/AuthContext.jsx
-  M client/src/context/FilterContext.jsx
-  M client/src/context/LocationContext.jsx
-  M client/src/hooks/useTranslatedContent.js
-  M client/src/i18n/index.js
-  M client/src/index.css
-  M client/src/locales/bn.json
-  M client/src/locales/en.json
-  M client/src/locales/hi.json
-  M client/src/locales/kn.json
-  M client/src/locales/mr.json
-  M client/src/locales/ta.json
-  M client/src/locales/te.json
-  M client/src/main.jsx
-  M client/src/pages/AdminPanel.jsx
-  M client/src/pages/AllPosts.jsx
-  M client/src/pages/Categories.jsx
-  M client/src/pages/FeedPage.jsx
-  M client/src/pages/MyFeedPage.jsx
-  M client/src/pages/MyHome.jsx
-  M client/src/pages/MyRecommendations.jsx
-  M client/src/pages/PostDetail.jsx
-  M client/src/pages/Profile.jsx
-  M client/src/pages/Rewards.jsx
-  M client/src/pages/SecuritySettings.jsx
-  M client/src/services/api.js
-  M client/src/services/locationService.js
-  M client/src/utils/translateContent.js
-  M client/tests/pages/tier-selection.flow.test.jsx
-  D docs/INCIDENT_RESPONSE.md
-  D docs/MASTER_FIX_PROMPT.md
-  D docs/PHASED_PAGE_ENHANCEMENT_CHECKLIST.md
-  D docs/RELEASE_CLEANUP_CHECKLIST.json
-  D docs/RELEASE_CLEANUP_CHECKLIST.md
-  D docs/SAFE_E2E_IMPLEMENTATION_REPORT.json
-  D docs/SAFE_E2E_IMPLEMENTATION_REPORT.md
-  D docs/SAFE_E2E_IMPLEMENTATION_REPORT_REAL.json
-  D docs/SAFE_E2E_IMPLEMENTATION_REPORT_REAL.md
-  D docs/UI_STATE_MATRIX.md
-  D docs/WORKTREE_RISK_REPORT.json
-  D docs/WORKTREE_RISK_REPORT.md
-  D docs/testcase.md
-  M package.json

### High-risk intentional deletions (first 80)
- none
