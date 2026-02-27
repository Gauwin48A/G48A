# Hardcoded Strings Audit

Last updated: 2026-02-27

## Summary
This file records the hardcoded-string audit status for localization work.

## Status
- Large number of hardcoded strings remain in client pages/components.
- Findings are tracked as localization backlog and are not blocking backend/runtime optimization completion.

## Recommended Next Steps
1. Prioritize top user-facing screens (`Home`, `Feed`, `Post`, `Auth`, `Complaints`, `Offers`).
2. Replace literals with translation keys via i18n utilities.
3. Re-run scan and update this report with before/after counts.
