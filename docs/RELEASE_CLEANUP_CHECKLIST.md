# Release Cleanup Checklist

Generated: 2026-03-02T06:02:35.336Z

## Snapshot
- Total changed paths: 4
- Safe-to-restore paths: 0
- Intentional-review paths: 4
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
- modified: 2
- untracked: 2

### By reason
- configuration: 2
- other: 2

### Top-level paths
- server: 2
- package.json: 1
- scripts: 1

## Samples
### Safe-to-restore (first 80)
- none

### Intentional-review (first 80)
-  M package.json
-  M server/package.json
- ?? scripts/release-cleanup-checklist.js
- ?? server/scripts/preflight-schema.js

### High-risk intentional deletions (first 80)
- none
