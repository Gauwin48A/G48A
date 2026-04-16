# Client Scripts

Production scripts live at this level and are grouped by purpose through naming:

- `dev-*` for local runtime helpers
- `check-*` for quality gates and CI checks
- `audit-*` and `screenshot-*` for QA capture

Temporary or exploratory scripts must go under:

- `scripts/archive/tmp/`

Textual test run reports should be kept under:

- `../analysis/reports/client/`

Lint/i18n report artifacts should also be stored under:

- `../analysis/reports/client/`
