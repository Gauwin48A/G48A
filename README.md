# 📱 Zaruda Platform — Android Native Application & Backend Service

Welcome to the **Zaruda Platform** repository (`G48A`). This repository is dedicated exclusively to the fully functional **Native Android Application** and its supporting **Node.js Express Backend Service**.

---

## 🏛️ Repository Architecture

```text
G48A/
├── android-native/          # 📱 Native Android Application (Jetpack Compose, Hilt, Room, Retrofit)
│   ├── app/src/main/        # App source code (ui, data, domain, core, components)
│   └── build.gradle.kts     # Gradle build configurations & dependencies
│
├── server/                  # ⚡ Node.js / Express Backend API Service
│   ├── src/                 # Controllers, Routes, Services, Middleware, Workers
│   ├── tests/               # Master E2E & Integration Test Suites (39/39 passing)
│   └── package.json         # Backend dependencies and scripts
│
├── docs/                    # 📄 Centralized Specs & Documentation
│   ├── analysis/            # Visual specs & Web-to-Android parity audits
│   ├── architecture/        # Database schema & system design docs
│   └── screenshots/         # UI audit & emulator captures
│
├── scripts/                 # 🛠️ Maintenance & Test Runner Scripts
│   ├── i18n/                # Localization audit utility scripts
│   ├── run-jest.js          # Master QA test runner
│   └── seed-real-data.js    # Database seeding script
│
├── archive/                 # 📦 Archived Experiments & Legacy Tools
├── docker-compose.yml       # 🐳 Local PostgreSQL + Redis development setup
└── README.md                # 📖 Developer documentation
```

> 📌 *Note: The legacy website codebase has been extracted out of `G48A` into `web_app_archive`.*

---

## 🚀 Quick Start Commands

### 1. Backend Server & E2E Test Suite
```bash
cd server
npm install
npm run dev

# Run Master QA Suite (39/39 Passing)
node scripts/run-jest.js tests/e2e/master_qa_checklist.e2e.test.js tests/critical_paths.integration.test.js tests/channelsRoute.quotas.test.js tests/e2e/top10_user_journeys.e2e.test.js tests/usersRoute.security.test.js
```

### 2. Native Android App (Compile & Package)
```bash
cd android-native

# Compile Debug Kotlin
./gradlew.bat compileDebugKotlin

# Build Production Android App Bundle (.aab)
./gradlew.bat bundleRelease
```
