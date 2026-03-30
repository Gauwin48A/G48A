# Database Guide

Last updated: 2026-02-27

## Setup
- Use migration scripts under `server/database/migrations`.
- Avoid committing real credentials in any markdown or env template.

## Notes
- Hot-path index migration added: `add_query_path_indexes_20260227.sql`.
- Apply migrations in staging before production rollout.

## Validation
- Run relevant server tests after migration application.
- Verify read/write behavior on feed, payment, inquiry, and channel paths.
