# Hardcoded Strings Audit

Last updated: 2026-03-12

## Summary
This file records the hardcoded-string audit status for localization work.

## Status
- Latest scan (2026-03-12) found `222` potential hardcoded strings across `53` files (227 files scanned).
- Generated report: `server/scripts/hardcoded-strings-audit.generated.md`.
- CI guard `npm run check:hardcoded-strings` blocks newly introduced hardcoded UI strings in added lines.
- Findings are tracked as localization backlog and are not blocking backend/runtime optimization completion.

## Recommended Next Steps
1. Prioritize top user-facing screens (`Home`, `Feed`, `Post`, `Auth`, `Complaints`, `Offers`).
2. Replace literals with translation keys via i18n utilities.
3. Re-run scan and update this report with before/after counts.
