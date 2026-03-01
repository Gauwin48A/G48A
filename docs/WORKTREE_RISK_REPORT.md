# Worktree Risk Report

Generated: 2026-03-01T18:43:04.369Z

## Summary
- Total changed paths: 2651
- Dependency changes: 2463
- Artifact changes: 119
- Source changes: 28
- Source deletions: 0
- Config changes: 9
- Config deletions: 0
- Untracked changes: 17

## Risk Findings
1. [BLOCKER] Very large worktree delta (2651 files). High release risk until scope is reduced.
2. [BLOCKER] Tracked dependency churn detected (2463 changes under node_modules).
3. [INFO] Generated artifact churn detected (119 files). Usually safe but verify intent.

## Status Breakdown
- deleted: 2590
- modified: 44
- untracked: 17

## Top-Level Breakdown
- server: 2606
- client: 32
- scripts: 7
- .github: 2
- docs: 2
- README.md: 1
- package.json: 1

## Samples
### Dependency Changes
- server/node_modules/.bin/mkdirp
- server/node_modules/.bin/mkdirp.cmd
- server/node_modules/.bin/mkdirp.ps1
- server/node_modules/.bin/node-gyp-build
- server/node_modules/.bin/node-gyp-build-optional
- server/node_modules/.bin/node-gyp-build-optional.cmd
- server/node_modules/.bin/node-gyp-build-optional.ps1
- server/node_modules/.bin/node-gyp-build-test
- server/node_modules/.bin/node-gyp-build-test.cmd
- server/node_modules/.bin/node-gyp-build-test.ps1
- server/node_modules/.bin/node-gyp-build.cmd
- server/node_modules/.bin/node-gyp-build.ps1
- server/node_modules/.bin/semver
- server/node_modules/.bin/semver.cmd
- server/node_modules/.bin/semver.ps1
- server/node_modules/.package-lock.json
- server/node_modules/accepts/HISTORY.md
- server/node_modules/accepts/LICENSE
- server/node_modules/accepts/README.md
- server/node_modules/accepts/index.js
- server/node_modules/accepts/package.json
- server/node_modules/append-field/.npmignore
- server/node_modules/append-field/LICENSE
- server/node_modules/append-field/README.md
- server/node_modules/append-field/index.js

### Artifact Changes
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T05-15-25-220Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T05-16-13-974Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T05-17-09-518Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T05-18-03-656Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T05-32-20-280Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T05-32-20-335Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T05-32-30-427Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T05-38-40-136Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T05-39-10-441Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T05-39-20-806Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T05-45-31-169Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T05-51-17-803Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T05-51-39-110Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T05-56-34-192Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T06-06-37-663Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T06-29-04-458Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T06-29-04-465Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T06-31-53-220Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T06-31-53-360Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T06-35-05-357Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T06-35-05-426Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T06-36-55-195Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T06-41-18-416Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T06-41-18-417Z.json
- server/docs/artifacts/active_active_dependency_gate_2026-02-28T06-41-41-233Z.json

### Source Deletions
- none

### Config Deletions
- none
