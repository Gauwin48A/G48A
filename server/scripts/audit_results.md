# Audit Results

Last updated: 2026-03-13

## Purpose
Tracks repository hardcoded-string audit findings for localization and content cleanup.

## Current Status
- Latest scan (2026-03-13) found `178` potential hardcoded strings across `49` files (229 files scanned).
- Generated report: `server/scripts/hardcoded-strings-audit.generated.md`.
- CI guard `npm run check:hardcoded-strings` blocks newly introduced hardcoded UI strings in added lines.
- This remains a non-blocking localization backlog item for high-traffic screens.
 - Re-audit focus pages (Profile, Rewards, MyHome, Support): no actionable hardcoded UI strings found beyond known false positives.

## Action State
- [ ] Execute phased i18n replacement for high-traffic pages first.
- [x] Re-run scan and publish latest finding count (2026-03-13).
- [x] Add CI warning gate for newly introduced hardcoded strings.

## Related Artifact
- `server/scripts/hardcoded-strings-audit.md`
