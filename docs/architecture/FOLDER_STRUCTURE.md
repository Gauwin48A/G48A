# Production Folder Structure Standard

## Root

```
Mhub/
  client/        # React + Vite web app
  server/        # Express API + jobs
  scripts/       # Cross-cutting repo scripts
  docs/          # Architecture and operating docs
  analysis/      # QA screenshots and visual audits
```

## Client Standard

```
client/
  reports/       # optional local test summaries (prefer analysis/reports for committed outputs)
  src/
    app/         # app composition (providers/routes/bootstrap)
    features/    # domain-specific feature modules
    shared/      # reusable cross-feature pieces
    components/  # legacy shared UI (migration target: src/shared/components)
    pages/       # legacy route pages (migration target: src/features/*)
  e2e/           # smoke/comprehensive/visual
  scripts/       # checks, audits, dev helpers
  scripts/archive/tmp/  # temporary scripts
```

## Server Standard

```
server/
  src/
    modules/     # target modular domain layout
    shared/      # cross-module helpers/types/errors
    controllers/ # legacy layout (gradual migration)
    routes/      # legacy layout (gradual migration)
    services/    # legacy layout (gradual migration)
  scripts/
    ops/         # operational executable scripts referenced by npm scripts
    archive/     # historical or one-off scripts
  scripts/archive/translations/ # one-off localization scripts
  tests/         # integration/e2e/load tests
```

## Enforcement

- Client: `npm run check:structure` in `client/`
- Server: `npm run check:structure` in `server/`

## Migration Rule

No hard cutovers in a launch window. Move incrementally:

1. Add new code in `app/features/shared` (client) and `modules/shared` (server).
2. Keep legacy folders stable while migrations happen.
3. Keep CI green after each structural change.
