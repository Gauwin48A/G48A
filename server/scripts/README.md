# Server Scripts

This directory contains operational and release scripts used by npm commands.

Primary execution entrypoints live in:

- `scripts/ops/`

Archive policy:

- one-off localization and migration helper scripts live in `scripts/archive/translations/`
- legacy security/dev helpers live in `scripts/archive/security/`
- only actively maintained production/runtime scripts stay at `scripts/`

Run `npm run check:structure` before release to validate the script layout.
