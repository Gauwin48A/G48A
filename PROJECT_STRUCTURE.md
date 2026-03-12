# MHub Project Structure

Last updated: March 11, 2026

## Root Layout

```text
Mhub/
├─ .github/                  # CI workflows and repository automation
├─ client/                   # React + Vite frontend
├─ server/                   # Express + PostgreSQL backend
├─ package.json              # Workspace scripts
├─ README.md                 # Primary documentation
├─ PROJECT_STRUCTURE.md      # This file
└─ SPRINT_PLAN_WEEK1_TO_WEEK10.md
```

## Client Structure

```text
client/
├─ public/                   # Static assets, locales, PWA files
├─ src/
│  ├─ components/            # Shared UI components and layouts
│  ├─ context/               # React context providers (auth, filter, location, cart)
│  ├─ hooks/                 # Reusable hooks
│  ├─ pages/                 # Route-level screens
│  ├─ services/              # API/data services
│  ├─ utils/                 # Shared utilities
│  ├─ i18n/                  # i18n setup/runtime
│  ├─ locales/               # Client-bundled locale JSON
│  └─ main.jsx               # Bootstrap + root mount
├─ tests/                    # Frontend tests
└─ vite.config.*             # Build/dev configuration
```

## Server Structure

```text
server/
├─ src/
│  ├─ config/                # DB/JWT/security config
│  ├─ controllers/           # Route handlers
│  ├─ middleware/            # Auth/security/rbac/throttle middleware
│  ├─ routes/                # API route modules
│  ├─ services/              # Domain services
│  └─ index.js               # Server entrypoint
├─ database/
│  ├─ migrations/            # SQL migrations
│  └─ schema/                # Schema/seed artifacts
├─ docs/                     # Backend operations/security docs
├─ scripts/                  # Server-side maintenance scripts
└─ tests/                    # Backend tests
```

## Boundary Rules

- Frontend-only code stays in `client/`.
- Backend-only code stays in `server/`.
- Root should keep only orchestration + governance docs/scripts.
- New feature work should touch both `README.md` and sprint plan when behavior changes.

