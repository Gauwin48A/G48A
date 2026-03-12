# Audit Results

Last updated: 2026-03-12

## Purpose
Tracks repository hardcoded-string audit findings for localization and content cleanup.

## Current Status
- Latest scan (2026-03-12) found `222` potential hardcoded strings across `53` files (227 files scanned).
- Generated report: `server/scripts/hardcoded-strings-audit.generated.md`.
- CI guard `npm run check:hardcoded-strings` blocks newly introduced hardcoded UI strings in added lines.
- This remains a non-blocking localization backlog item for high-traffic screens.

## Action State
- [ ] Execute phased i18n replacement for high-traffic pages first.
- [x] Re-run scan and publish latest finding count (2026-03-12).
- [x] Add CI warning gate for newly introduced hardcoded strings.

## Related Artifact
- `server/scripts/hardcoded-strings-audit.md`
