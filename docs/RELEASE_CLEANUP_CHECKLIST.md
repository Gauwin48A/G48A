# Release Cleanup Checklist

Generated: 2026-03-04T02:14:34.361Z

## Snapshot
- Total changed paths: 263
- Safe-to-restore paths: 0
- Intentional-review paths: 263
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
- modified: 255
- untracked: 8

### By reason
- source_code: 232
- other: 19
- configuration: 6
- documentation: 6

### Top-level paths
- client: 126
- server: 121
- scripts: 9
- docs: 6
- package.json: 1

## Samples
### Safe-to-restore (first 80)
- none

### Intentional-review (first 80)
-  M client/package-lock.json
-  M client/package.json
-  M client/scripts/verify-all-languages.js
-  M client/src/App.jsx
-  M client/src/components/AadhaarOtpVerify.jsx
-  M client/src/components/AudioRecorder.jsx
-  M client/src/components/BargainActions.jsx
-  M client/src/components/BuyerInterestModal.jsx
-  M client/src/components/CategoriesGrid.jsx
-  M client/src/components/EmptyState.jsx
-  M client/src/components/ErrorBoundary.jsx
-  M client/src/components/GreenNavbar.jsx
-  M client/src/components/LanguageSelector.jsx
-  M client/src/components/LocationGate.jsx
-  M client/src/components/LocationSelector.jsx
-  M client/src/components/LoginPromptModal.jsx
-  M client/src/components/MakeOfferModal.jsx
-  M client/src/components/PageHeader.jsx
-  M client/src/components/RouteTelemetry.jsx
-  M client/src/components/TransactionStepper.jsx
-  M client/src/components/page-state/PageStateBlocks.jsx
-  M client/src/components/ui/alert-dialog.jsx
-  M client/src/components/ui/alert.jsx
-  M client/src/components/ui/avatar.jsx
-  M client/src/components/ui/badge.jsx
-  M client/src/components/ui/button.jsx
-  M client/src/components/ui/card.jsx
-  M client/src/components/ui/checkbox.jsx
-  M client/src/components/ui/dialog.jsx
-  M client/src/components/ui/dropdown-menu.jsx
-  M client/src/components/ui/input.jsx
-  M client/src/components/ui/label.jsx
-  M client/src/components/ui/select.jsx
-  M client/src/components/ui/separator.jsx
-  M client/src/components/ui/switch.jsx
-  M client/src/components/ui/tabs.jsx
-  M client/src/components/ui/textarea.jsx
-  M client/src/components/ui/toast.jsx
-  M client/src/components/ui/toaster.jsx
-  M client/src/components/ui/use-toast.jsx
-  M client/src/constants/languages.js
-  M client/src/context/AuthContext.jsx
-  M client/src/context/FilterContext.jsx
-  M client/src/context/LocationContext.jsx
-  M client/src/hooks/use-toast.jsx
-  M client/src/hooks/useTranslatedContent.js
-  M client/src/i18n/index.js
-  M client/src/index.css
-  M client/src/lib/api.js
-  M client/src/lib/auth.js
-  M client/src/lib/backendPreflight.js
-  M client/src/lib/errorReporting.js
-  M client/src/lib/networkConfig.js
-  M client/src/lib/profileSync.js
-  M client/src/lib/queryClient.js
-  M client/src/lib/socket.js
-  M client/src/lib/utils.js
-  M client/src/lib/uxTelemetry.js
-  M client/src/lib/validate.js
-  M client/src/main.jsx
-  M client/src/pages/AadhaarVerify.jsx
-  M client/src/pages/AddPost.jsx
-  M client/src/pages/AdminPanel.jsx
-  M client/src/pages/AllPosts.jsx
-  M client/src/pages/Analytics.jsx
-  M client/src/pages/Auth/ForgotPassword.jsx
-  M client/src/pages/Auth/Login.jsx
-  M client/src/pages/Auth/ResetPassword.jsx
-  M client/src/pages/Auth/SignUp.jsx
-  M client/src/pages/BoughtPosts.jsx
-  M client/src/pages/BuyerView.jsx
-  M client/src/pages/Categories.jsx
-  M client/src/pages/ChannelPage.jsx
-  M client/src/pages/ChannelsListPage.jsx
-  M client/src/pages/Chat.jsx
-  M client/src/pages/Complaints.jsx
-  M client/src/pages/CreateChannelPage.jsx
-  M client/src/pages/Dashboard.jsx
-  M client/src/pages/FeedPage.jsx
-  M client/src/pages/FeedPostDetail.jsx

### High-risk intentional deletions (first 80)
- none
