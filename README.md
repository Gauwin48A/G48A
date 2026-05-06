<div align="center">

<!-- Logo & Branding -->
<img src="client/public/icons/icon-192x192.png" alt="MHub Logo" width="120" height="120" />

# **MHub**

### 🏪 The Category-Native Marketplace Platform

> _One app. Every category. Every community._

[![React 18](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Vite 5](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Express 5](https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![PostgreSQL 17](https://img.shields.io/badge/PostgreSQL-17-336791?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis 7](https://img.shields.io/badge/Redis-7-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io)
[![Kotlin 2.1](https://img.shields.io/badge/Kotlin-2.1-7F52FF?style=flat-square&logo=kotlin&logoColor=white)](https://kotlinlang.org)
[![Jetpack Compose](https://img.shields.io/badge/Compose-2024.12-4285F4?style=flat-square&logo=jetpackcompose&logoColor=white)](https://developer.android.com/jetpack/compose)
[![Capacitor 8](https://img.shields.io/badge/Capacitor-8-119EFF?style=flat-square&logo=capacitor&logoColor=white)](https://capacitorjs.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![i18n](https://img.shields.io/badge/i18n-26_Languages-F7DF1E?style=flat-square)](https://www.i18next.com)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](./LICENSE)

---

**67+ Routes** · **61 API Route Files** · **63 Backend Services** · **40+ Security Middleware** · **67 Database Migrations** · **134+ Test Files** · **22 Custom Hooks** · **100+ Components** · **26 Languages** · **Native Android App**

---

[**🚀 Quick Start**](#-quick-start) · [**🏗️ Architecture**](#️-architecture) · [**✨ Features**](#-features) · [**📡 API Reference**](#-api-reference) · [**🔒 Security**](#-security-architecture) · [**📱 Mobile**](#-mobile--native-apps) · [**🧪 Testing**](#-testing-strategy) · [**🗺️ Roadmap**](#️-roadmap)

</div>

---

## 📑 Table of Contents

<details>
<summary><strong>Click to expand full table of contents</strong></summary>

### 🏛️ Foundation
- [Platform Vision & Philosophy](#-platform-vision--philosophy)
- [Quick Start](#-quick-start)
- [Repository Structure](#-repository-structure)
- [Tech Stack](#-tech-stack)
- [Architecture](#️-architecture)

### 🎯 Application
- [Features](#-features)
- [Category-Native Marketplace](#-category-native-marketplace)
- [Page Directory (All 67+ Routes)](#-page-directory-all-67-routes)
- [Page-by-Page Feature Map](#-page-by-page-feature-map)
- [Navigation Architecture](#-navigation-architecture)
- [Authentication & Access Control](#-authentication--access-control)

### ⚙️ Backend
- [API Reference (61 Route Groups)](#-api-reference)
- [Database Schema & ERD](#-database-schema--erd)
- [Middleware Pipeline (40+ Layers)](#-middleware-pipeline-40-layers)
- [Service Layer (63 Services)](#-service-layer-63-services)
- [Background Jobs & Workers](#-background-jobs--workers)

### 🎨 Frontend
- [Component Library (100+ Components)](#-component-library-100-components)
- [State Management (6 Contexts, 22 Hooks)](#-state-management-6-contexts-22-hooks)
- [Theming & Design System](#-theming--design-system)
- [Internationalization (26 Languages)](#-internationalization-26-languages)

### 🎮 Platform Systems
- [Rewards & Gamification Engine](#-rewards--gamification-engine)
- [Coin Economy](#-coin-economy)
- [Referral Chain System (5 Levels)](#-referral-chain-system-5-levels)
- [Trust & Safety Engine](#-trust--safety-engine)
- [Realtime Infrastructure](#-realtime-infrastructure)

### 📱 Mobile
- [Mobile & Native Apps](#-mobile--native-apps)
- [Android Native (Kotlin + Compose)](#-android-native-kotlin--compose)
- [Capacitor Hybrid App](#-capacitor-hybrid-app)
- [Progressive Web App (PWA)](#-progressive-web-app-pwa)

### 🔒 Security
- [Security Architecture](#-security-architecture)
- [Defense in Depth (13 Layers)](#-defense-in-depth-13-layers)
- [OWASP Top 10 Coverage](#-owasp-top-10-coverage)
- [Fraud Detection Pipeline](#-fraud-detection-pipeline)

### 🧪 Operations
- [Testing Strategy (134+ Test Files)](#-testing-strategy)
- [Scripts & Automation](#-scripts--automation)
- [Environment Configuration](#-environment-configuration)
- [Docker & Deployment](#-docker--deployment)
- [Performance & Optimization](#-performance--optimization)
- [Production Readiness (89/100)](#-production-readiness)

### 📚 Reference
- [Migration History (67 Migrations)](#-migration-history-67-migrations)
- [World-Class Inspirations](#-world-class-inspirations)
- [Roadmap](#️-roadmap)
- [Contributing](#-contributing)
- [Changelog](#-changelog)

</details>

---

## 🌟 Platform Vision & Philosophy

<div align="center">

> **MHub is not just another classified marketplace.**
>
> It is a **category-native platform** that morphs its entire experience — discovery, filters, seller flows, trust signals, and monetization — based on the user's active category context.

</div>

### The Category-Native Difference

| Aspect | Generic Marketplace | **MHub** |
|:-------|:-------------------|:---------|
| **Discovery** | Same feed for everything | Feed, filters, and sort **tuned per category** |
| **Seller Flow** | One-size-fits-all form | Category-aware fields, specs, and pricing |
| **Trust Signals** | Star ratings only | Trust score + verification + category-specific review dimensions |
| **Monetization** | Flat listing fee | Tier-based plans with category-scoped visibility boosts |
| **Community** | None | Category-scoped channels, feeds, and Centre Pages |
| **Rewards** | None | Unified coin economy with referral chains + gamification |

### Platform Scale

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MHUB PLATFORM AT A GLANCE                        │
├─────────────────┬──────────────────────┬───────────────────────────────────┤
│  CLIENT APP     │  SERVER API          │  ANDROID NATIVE                  │
│  ─────────────  │  ──────────────      │  ────────────────                │
│  67+ Routes     │  61 Route Files      │  9 Feature Modules              │
│  60+ Pages      │  46 Controllers      │  4 Core Modules                 │
│  100+ Components│  63 Services         │  Kotlin 2.1 + Compose           │
│  22 Hooks       │  40+ Middleware      │  MVVM + Clean Architecture      │
│  6 Contexts     │  67 Migrations       │  Hilt DI + Room DB              │
│  26 Languages   │  20+ DB Tables       │  Macrobenchmark Tests           │
│                 │  134+ Test Files     │                                  │
└─────────────────┴──────────────────────┴───────────────────────────────────┘
```

### For Users

- 🛍️ **Browse** thousands of listings with intelligent, category-aware discovery
- 💰 **Sell** with guided posting flow, tier-based visibility, and seller analytics
- 🪙 **Earn** coins and rewards through daily activity, referrals, and streaks
- 🛡️ **Trust** every seller via computed trust scores, verification badges, and review history
- 💬 **Chat** in realtime with buyers and sellers
- ❤️ **Save** favorites to wishlists, track searches, and get price alerts
- 🌍 **Discover nearby** with GPS-based location search
- 📱 **Use anywhere** — web, PWA, or native Android app

### For Developers

- 🏗️ **Full-stack monorepo** with clear separation of concerns
- 🔒 **Enterprise-grade security** — 40+ middleware layers, zero-trust architecture
- ⚡ **Performance-first** — code splitting, Redis caching, cursor pagination
- 🧪 **Comprehensive testing** — unit, integration, E2E, load, security tests
- 📐 **Typed API contracts** — schema validation, route contracts, runtime budgets
- 🐳 **Docker-ready** — one command to run the entire stack

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Purpose |
|:-----|:--------|:--------|
| **Node.js** | ≥ 18.x | Runtime for client and server |
| **PostgreSQL** | ≥ 15 | Primary relational database |
| **Redis** | ≥ 7.x | Cache, sessions, rate limiting |
| **npm** | ≥ 9.x | Package manager |
| **Docker** _(optional)_ | ≥ 24.x | Containerized deployment |

### Option A: Docker (Recommended)

```bash
git clone https://github.com/your-org/mhub.git
cd mhub

# Create environment file
cp server/.env.example .env

# Start all services (PostgreSQL, Redis, Server, Client)
docker compose up -d

# Access the app
open http://localhost:4173
```

### Option B: Manual Setup

```bash
git clone https://github.com/your-org/mhub.git
cd mhub

# ─── Server Setup ────────────────────────────────────────────
cd server
cp .env.example .env          # Configure DB credentials
npm install
node scripts/ops/run_migration.js   # Run all migrations
npm run seed:sample-data             # Seed sample data (optional)

# ─── Client Setup ────────────────────────────────────────────
cd ../client
npm install

# ─── Start Development ───────────────────────────────────────
# Terminal 1: API Server (port 5001)
cd server && npm run dev

# Terminal 2: Client App (port 5173)
cd client && npm run dev
```

### Option C: Android Native

```bash
cd android

# Debug build (dev flavor → emulator localhost)
./gradlew assembleDevDebug

# Run unit tests
./gradlew testDevDebugUnitTest

# Release AAB (requires signing config)
./gradlew bundleProdRelease
```

### Quick Verification

```bash
# Full stack health check
cd client && npm run build                    # Client builds
cd ../server && npm test                       # Server tests pass
cd ../server && npm run preflight:schema       # Schema is valid
cd ../server && npm run check:route-contract   # API contracts intact
cd ../server && npm run check:foundation-contract # Foundation healthy
```

---

## 📁 Repository Structure

```
mhub/
├── 📂 client/                    # React 18 + Vite 5 SPA
│   ├── src/
│   │   ├── pages/               # 60+ page components
│   │   ├── components/          # 100+ reusable UI components
│   │   ├── hooks/               # 22 custom hooks
│   │   ├── context/             # 6 React Context providers
│   │   ├── services/            # Client-side services (API, VPN, fingerprint)
│   │   ├── utils/               # 25+ utility modules
│   │   ├── lib/                 # Socket.IO, Firebase, Push, Security
│   │   ├── styles/              # Themes (light/dark), design tokens
│   │   ├── locales/             # i18n translations (1,250+ keys)
│   │   └── i18n/               # i18next configuration
│   ├── e2e/                     # Playwright E2E tests
│   ├── tests/                   # Vitest unit/integration tests
│   ├── public/                  # PWA assets, service workers
│   ├── android/                 # Capacitor Android project
│   └── scripts/                 # Build scripts, checks, audits
│
├── 📂 server/                    # Express 5 API Server
│   ├── src/
│   │   ├── routes/              # 61 API route files
│   │   ├── controllers/         # 46 controller files
│   │   ├── services/            # 63 business logic services
│   │   ├── middleware/          # 40+ middleware layers
│   │   ├── shared/              # Shared utilities
│   │   └── utils/               # DB helpers, logger
│   ├── database/
│   │   └── migrations/          # 67 migration files
│   ├── tests/                   # Jest test suites (87+ files)
│   ├── scripts/                 # Ops, deployment, probes
│   ├── worker/                  # Background job processing
│   └── certs/                   # SSL certificates
│
├── 📂 android/                   # Native Android App (Kotlin + Compose)
│   ├── app/                     # Application module
│   ├── core/                    # Common, UI, Network, Data modules
│   ├── feature/                 # 9 feature modules
│   ├── benchmark/               # Macrobenchmark tests
│   └── docs/                    # Android-specific docs
│
├── 📂 analysis/                  # Production readiness audits
├── 📂 docs/                      # Architecture & workspace docs
├── 📂 scripts/                   # Workspace-level scripts
├── 📂 tools/                     # i18n audit, backfill tools
│
├── docker-compose.yml           # Full stack orchestration
└── README.md                    # ← You are here
```

---

## 🧱 Tech Stack

### Frontend (Client)

| Technology | Version | Role |
|:-----------|:-------:|:-----|
| React | 18.2 | Component-based UI framework with concurrent features |
| Vite | 5.x | Lightning-fast HMR, optimized production builds |
| React Router | 6.x | Nested routing, lazy loading, auth guards |
| TanStack Query | 5.x | Server state management, caching, infinite scroll |
| Tailwind CSS | 3.4 | Utility-first styling, dark mode, responsive design |
| Radix UI | Latest | Accessible primitives (Dialog, Tabs, Toast, Switch) |
| Lucide React | Latest | Consistent, tree-shakeable icon set |
| Socket.IO Client | 4.x | Bidirectional realtime communication |
| Capacitor | 8.x | Native bridge (GPS, contacts, push, camera) |
| i18next | Latest | 26-language internationalization |
| Axios | 1.15 | HTTP client with interceptors, retry, CSRF |
| Vitest | Latest | Unit and integration testing |
| Playwright | Latest | E2E browser testing |

### Backend (Server)

| Technology | Version | Role |
|:-----------|:-------:|:-----|
| Express | 5.x | Async/await native HTTP framework |
| PostgreSQL | 17 | ACID database with JSONB, FTS, CTEs, triggers |
| Redis (ioredis) | 7.x | Sessions, cache, rate limiting, pub/sub |
| Socket.IO | 4.8 | Realtime server (rooms, reconnection, ACK) |
| Argon2 + bcrypt | Latest | Dual-algo memory-hard password hashing |
| JWT + Refresh | — | Short-lived access (15 min) + rotating refresh |
| SimpleWebAuthn | 13.x | FIDO2/WebAuthn passwordless authentication |
| Sharp | Latest | Image resize, compress, format conversion |
| Cloudinary | — | CDN image hosting and transformation |
| Helmet | Latest | Security headers (CSP, HSTS, X-Frame) |
| Web Push (VAPID) | — | Browser push notifications |
| PM2 | Latest | Production process management |
| Jest | Latest | Backend testing framework |

### Android Native

| Technology | Version | Role |
|:-----------|:-------:|:-----|
| Kotlin | 2.1.0 | Primary language |
| Jetpack Compose | 2024.12 BOM | Declarative UI framework |
| Hilt | 2.53 | Dependency injection |
| Retrofit + OkHttp | 2.11 / 4.12 | Networking with interceptors |
| Kotlinx Serialization | 1.7.3 | JSON parsing |
| Room | 2.6.1 | Local database |
| Navigation Compose | 2.8.5 | Screen navigation |
| WorkManager | 2.10 | Background tasks |
| Coil | Latest | Image loading |
| Material 3 | Latest | Design system |
| Macrobenchmark | Latest | Performance profiling |

### Infrastructure

| Tool | Purpose |
|:-----|:--------|
| Docker Compose | Multi-container orchestration (4 services) |
| Nginx | Reverse proxy, SSL termination, WebSocket upgrade |
| Vercel | Client deployment with edge configuration |
| PM2 | Production Node.js process management |
| GitHub Actions | CI/CD pipeline |

---

## 🏗️ Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   INTERNET                                              │
└───────────────┬───────────────────────┬──────────────────────────┬──────────────────────┘
                │                       │                          │
    ┌───────────┴───────────┐ ┌────────┴────────┐    ┌───────────┴───────────┐
    │   WEB BROWSER / PWA   │ │  ANDROID NATIVE │    │   ANDROID (CAPACITOR) │
    │   React 18 SPA        │ │  Kotlin + Compose│    │   WebView + Native    │
    │   67+ Routes          │ │  9 Features      │    │   GPS, Push, Camera   │
    └───────────┬───────────┘ └────────┬────────┘    └───────────┬───────────┘
                │                       │                          │
                └───────────────────────┼──────────────────────────┘
                                        │
                          ┌─────────────┴─────────────┐
                          │       VERCEL EDGE CDN     │
                          │    (Static Assets + SPA)  │
                          └─────────────┬─────────────┘
                                        │
                          ┌─────────────┴─────────────┐
                          │     NGINX REVERSE PROXY   │
                          │  SSL · Gzip · WS Upgrade  │
                          └─────────────┬─────────────┘
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        │                               │                               │
┌───────┴───────┐             ┌────────┴────────┐            ┌────────┴────────┐
│   REST API    │             │   SOCKET.IO     │            │   PUSH SERVICE  │
│   Express 5   │             │   REALTIME      │            │   FCM + VAPID   │
│   ─────────── │             │   ──────────    │            │   ──────────    │
│   61 Routes   │             │   Chat Rooms    │            │   Web Push      │
│   46 Controllers            │   Notifications │            │   FCM Android   │
│   63 Services │             │   Rewards SSE   │            │   Pusher Backup │
│   40+ Middleware            │   Typing Events │            │                 │
└───────┬───────┘             └────────┬────────┘            └─────────────────┘
        │                               │
        └───────────────┬───────────────┘
                        │
    ┌───────────────────┼───────────────────┐
    │                   │                   │
┌───┴───────┐    ┌─────┴─────┐    ┌───────┴────────────────────┐
│PostgreSQL │    │   Redis   │    │   EXTERNAL SERVICES        │
│    17     │    │     7     │    │   ──────────────────        │
│─────────  │    │─────────  │    │   Cloudinary (CDN/Images)  │
│ 20+ Tables│    │ Sessions  │    │   Firebase (FCM Push)      │
│ 67 Migr.  │    │ Cache     │    │   Aadhaar (KYC/Identity)   │
│ FTS Index │    │ Rate Limit│    │   Payment Gateway          │
│ Triggers  │    │ Pub/Sub   │    │   IP Info (Geolocation)    │
└───────────┘    └───────────┘    └────────────────────────────┘
```

### Request Lifecycle

```
User Action → React Client → Axios (JWT + CSRF + Fingerprint)
    │
    ▼
┌─────────────────── MIDDLEWARE PIPELINE (13 Global Layers) ───────────────────┐
│ 1. Helmet (CSP/HSTS)  → 2. CORS  → 3. Body Parser  → 4. VPN Enforcement   │
│ 5. Activity Tracker   → 6. Runtime Budget  → 7. API Contract               │
│ 8. Zero-Trust Gate    → 9. Tenant Context  → 10. Optional Auth             │
│ 11. Risk Restrictions → [Per-Route: Auth → RBAC → WAF → Rate Limit]        │
└──────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
Controller → Service Layer → Redis Cache Check → PostgreSQL Query
    │
    ▼
JSON Response → Client State Update → UI Re-render
```

### Frontend Architecture

```
client/src/
├── App.jsx                    # Root: Router + Providers + 67 Routes
├── main.jsx                   # Entry: React DOM + i18n bootstrap
├── index.css                  # Global styles + theme imports
│
├── pages/                     # 60+ page-level components
│   ├── AllPosts.jsx           # Discovery feed (category-scoped, ~2800 lines)
│   ├── PostDetail.jsx         # Listing detail with trust badges
│   ├── Profile.jsx            # User account hub (multi-tab)
│   ├── RewardsPage.jsx        # Gamification hub (5 tabs)
│   ├── Chat.jsx               # Realtime messaging
│   ├── ChannelPage.jsx        # Centre Pages (like Facebook Pages)
│   └── ...                    # 54 more page files
│
├── components/                # 100+ reusable UI components
│   ├── GreenNavbar.jsx        # Primary navigation (top + bottom)
│   ├── GreenProductCard.jsx   # Listing card with trust badge
│   ├── RequireAuth.jsx        # Auth guard HOC
│   ├── ui/                    # Radix UI primitives (shadcn-style)
│   ├── rewards/               # Rewards section components
│   ├── referral/              # Referral chain tree
│   ├── ratings/               # User rating profiles
│   ├── centre/                # Centre page tabs + analytics
│   └── page-state/            # Loading/Error/Empty states
│
├── context/                   # 6 React Context providers
│   ├── AuthContext.jsx        # Auth state, login, logout, refresh
│   ├── CartContext.jsx        # Shopping cart state
│   ├── CategoryModeContext.jsx # Category app mode pivot
│   ├── FilterContext.jsx      # Global filter state
│   ├── LocationContext.jsx    # GPS and location state
│   └── ThemeContext.jsx       # Dark/light/system theme
│
├── hooks/                     # 22 custom hooks
├── services/                  # API, VPN detection, device fingerprint
├── utils/                     # 25+ utility modules
├── lib/                       # Socket.IO, Firebase, Push, Security
├── styles/                    # Theme tokens (light/dark)
└── locales/                   # i18n (1,250+ keys)
```

### Backend Architecture

```
server/src/
├── index.js                   # Express + route mounting + Socket.IO
│
├── routes/                    # 61 API route files
│   ├── auth.js                # /api/auth (login, signup, OTP, passkeys)
│   ├── posts.js               # /api/posts (CRUD, search, boost)
│   ├── chat.js                # /api/chat (messaging)
│   ├── rewards.js             # /api/rewards (gamification)
│   ├── coins.js               # /api/coins (economy)
│   ├── referral.js            # /api/referral (chain, tree)
│   ├── reviews.js             # /api/reviews (ratings)
│   └── ...                    # 54 more route files
│
├── controllers/               # 46 controller files
├── services/                  # 63 business logic services
├── middleware/                # 40+ security & utility middleware
├── utils/                     # DB helpers, logger
└── worker/                    # Background job processing
```

### Android Architecture (Multi-Module)

```
android/
├── app/                       # Application module (DI, Navigation, MainActivity)
├── core/
│   ├── common/                # Result type, shared models, utilities
│   ├── ui/                    # Theme, reusable Compose components
│   ├── network/               # Retrofit APIs, OkHttp interceptors, CookieJar
│   └── data/                  # Room database, repositories, WorkManager
├── feature/
│   ├── auth/                  # Login, Signup, Forgot Password
│   ├── home/                  # Home feed with categories
│   ├── listings/              # All Listings, Add Post, Search
│   ├── detail/                # Post detail with image pager
│   ├── profile/               # User profile with logout
│   ├── notifications/         # Notification list
│   ├── chat/                  # Messaging
│   ├── search/                # Search
│   └── settings/              # Settings
└── benchmark/                 # Macrobenchmark + baseline profiles
```

---

## ✨ Features

### Complete Feature Matrix

| Category | Feature | Status | Auth | Route |
|:---------|:--------|:------:|:----:|:------|
| **🔍 Discovery** | | | | |
| | Category Hub (Landing Page) | ✅ | — | `/category-hub` |
| | All Posts Feed (Category-Scoped) | ✅ | — | `/all-posts` |
| | Personalized "For You" | ✅ | — | `/for-you` |
| | Community Feed | ✅ | — | `/feed` |
| | Nearby Listings (GPS) | ✅ | 🔐 | `/nearby` |
| | Global Search | ✅ | — | `/search` |
| | Public Wall | ✅ | — | `/public-wall` |
| | Offers & Deals | ✅ | — | `/offers` |
| **📦 Listings** | | | | |
| | Listing Detail with Trust Badges | ✅ | — | `/post/:id` |
| | Add Post (Category-Aware Form) | ✅ | 🔐 | `/add-post` |
| | Quick Post | ✅ | 🔐 | `/post_add` |
| | Edit Post | ✅ | 🔐 | `/edit-post/:postId` |
| | My Listings Management | ✅ | 🔐 | `/my-home` |
| | Post Boost (Visibility) | ✅ | 🔐 | API |
| **🛒 Commerce** | | | | |
| | Shopping Cart | ✅ | 🔐 | `/cart` |
| | Wishlist with Bulk Actions | ✅ | 🔐 | `/wishlist` |
| | Purchase History | ✅ | 🔐 | `/bought-posts` |
| | Sales History | ✅ | 🔐 | `/sold-posts` |
| | Sale Confirmation (OTP-Verified) | ✅ | 🔐 | `/saledone` |
| | Payment Processing | ✅ | 🔐 | `/payment` |
| | Price Alerts | ✅ | 🔐 | API |
| **💬 Social** | | | | |
| | Realtime Chat | ✅ | 🔐 | `/chat` |
| | Channels (Community) | ✅ | — | `/channels` |
| | Centre Pages (Seller Pages) | ✅ | 🔐 | `/centre` |
| | Activity Hub | ✅ | 🔐 | `/activity` |
| | Reviews & Ratings | ✅ | — | `/reviews/:userId` |
| **🪙 Rewards** | | | | |
| | Rewards Dashboard (5 Tabs) | ✅ | 🔐 | `/rewards` |
| | Daily Check-in | ✅ | 🔐 | API |
| | Spin the Wheel | ✅ | 🔐 | API |
| | Scratch Cards | ✅ | 🔐 | API |
| | Referral Chain (5 Levels) | ✅ | 🔐 | API |
| | Streak Bonuses | ✅ | 🔐 | API |
| | Tier System (Bronze→Platinum) | ✅ | 🔐 | API |
| | Leaderboard | ✅ | — | API |
| **👤 Account** | | | | |
| | Profile (Multi-Tab) | ✅ | 🔐 | `/profile` |
| | Seller Dashboard + Analytics | ✅ | 🔐 | `/dashboard` |
| | Notifications | ✅ | 🔐 | `/notifications` |
| | Security Settings (2FA, Passkeys) | ✅ | 🔐 | `/security` |
| | KYC / Aadhaar Verification | ✅ | 🔐 | `/kyc` |
| | Complaints (SLA Tracked) | ✅ | 🔐 | `/complaints` |
| | Tier Selection / Pricing | ✅ | 🔐 | `/tier-selection` |
| **🛡️ Admin** | | | | |
| | Admin Panel | ✅ | 👑 | `/admin-panel` |
| | User Moderation | ✅ | 👑 | API |
| | Complaint Resolution | ✅ | 👑 | API |

> 🔐 = Login required · 👑 = Admin role required · — = Public access

---

## 🏪 Category-Native Marketplace

The core differentiator that makes MHub unique:

```
┌──────────────────────────────────────────────────────────────────┐
│                   USER SELECTS CATEGORY                          │
│                         │                                        │
│         ┌───────────────┼───────────────┐                        │
│         ▼               ▼               ▼                        │
│   ┌───────────┐  ┌───────────┐  ┌───────────┐                   │
│   │   FEED    │  │  SEARCH   │  │   SELL    │                   │
│   │ Filters   │  │  Scopes   │  │  Fields   │                   │
│   │ by category  │ to category│  │  per category                │
│   └───────────┘  └───────────┘  └───────────┘                   │
│         │               │               │                        │
│         ▼               ▼               ▼                        │
│   ┌───────────┐  ┌───────────┐  ┌───────────┐                   │
│   │   NAV     │  │   CART    │  │  TRUST    │                   │
│   │ Adjusts   │  │  Shows    │  │  Scores   │                   │
│   │subcategory│  │ category  │  │ per-category                  │
│   │ dropdowns │  │  items    │  │ dimensions│                   │
│   └───────────┘  └───────────┘  └───────────┘                   │
└──────────────────────────────────────────────────────────────────┘
```

**Implementation:**
- `CategoryModeContext` provides `activeApp`, `activeCategory`, and `categories` to all components
- `categoryModeFilters.js` builds matchers for filtering posts by active mode
- `GreenNavbar` dynamically adjusts subcategory dropdowns per category
- All API calls include category mode as query parameter via Axios interceptor
- Selection persists across sessions via localStorage

---

## 📖 Page Directory (All 67+ Routes)

### Public Routes (No Auth Required)

| # | Path | Component | Purpose |
|:-:|:-----|:----------|:--------|
| 1 | `/` | Redirect | → `/category-hub` |
| 2 | `/category-hub` | CategoryHubPage | Main landing — category grid |
| 3 | `/all-posts` | AllPostsPage | Full discovery feed with filters |
| 4 | `/home` | HomePage | Curated home discovery |
| 5 | `/for-you` | ForYouPage | Personalized recommendations |
| 6 | `/public-wall` | PublicWallPage | Community public wall |
| 7 | `/feed` | FeedPage | Social/community feed |
| 8 | `/feed/:id` | FeedPostDetailPage | Individual feed post |
| 9 | `/post/:id` | PostDetailPage | Listing detail |
| 10 | `/search` | SearchPage | Global search |
| 11 | `/categories` | SubcategoriesPage | Category browser |
| 12 | `/channels` | ChannelsListPage | Browse channels |
| 13 | `/channels/:id` | ChannelPage | Channel detail |
| 14 | `/offers` | OffersPage | Deals listing |
| 15 | `/reviews/:userId` | ReviewsPage | Public reviews |
| 16 | `/analytics` | AnalyticsPage | Public analytics |
| 17 | `/login` | LoginPage | User login |
| 18 | `/signup` | SignUpPage | Registration |
| 19 | `/invite/:code` | InviteRedirectPage | Referral handler |
| 20 | `/forgot-password` | ForgotPasswordPage | Password reset |
| 21-27 | Legal pages | Various | Terms, Privacy, Refund, Support |

### Authenticated Routes (Login Required)

| # | Path | Component | Purpose |
|:-:|:-----|:----------|:--------|
| 28 | `/dashboard` | DashboardPage | Seller dashboard |
| 29 | `/activity` | ActivityHubPage | Activity feed |
| 30 | `/profile` | ProfilePage | User profile (multi-tab) |
| 31 | `/security` | SecuritySettingsPage | 2FA, passkeys, sessions |
| 32 | `/add-post` | AddPostPage | Create listing |
| 33 | `/edit-post/:postId` | EditPostPage | Edit listing |
| 34 | `/my-home` | MyHomePage | My listings |
| 35 | `/tier-selection` | TierSelectionPage | Subscription tiers |
| 36 | `/bought-posts` | BoughtPostsPage | Purchase history |
| 37 | `/sold-posts` | SoldPostsPage | Sales history |
| 38 | `/cart` | CartPage | Shopping cart |
| 39 | `/wishlist` | WishlistPage | Saved favorites |
| 40 | `/recently-viewed` | RecentlyViewedPage | Browsing history |
| 41 | `/saved-searches` | SavedSearchesPage | Saved searches |
| 42 | `/nearby` | NearbyPostsPage | GPS-based listings |
| 43 | `/chat` | ProtectedChatPage | Realtime messaging |
| 44 | `/notifications` | NotificationsPage | Notification center |
| 45 | `/complaints` | ComplaintsPage | File/track complaints |
| 46 | `/feedback` | FeedbackPage | Product feedback |
| 47 | `/rewards` | RewardsPage | Rewards hub (5 tabs) |
| 48 | `/centre` | ChannelsListPage | Centre Pages |
| 49 | `/centre/create` | CreateChannelPage | Create Centre Page |
| 50 | `/centre/:id` | ChannelPage | Centre detail |
| 51 | `/kyc` | KycVerificationPage | KYC upload |
| 52 | `/aadhaar-verify` | AadhaarVerifyPage | Aadhaar verification |
| 53 | `/payment` | PaymentPage | Payment processing |
| 54+ | Various aliases | Various | `/sell`, `/my-posts`, `/tiers`, etc. |

### Admin Routes

| # | Path | Roles | Purpose |
|:-:|:-----|:------|:--------|
| 67 | `/admin-panel` | admin, super_admin | Full admin dashboard |

---

## 📡 API Reference

### Endpoint Groups (61 Route Files)

<details>
<summary><strong>🔐 Authentication (13 endpoints)</strong></summary>

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| POST | `/api/auth/signup` | — | Register new user |
| POST | `/api/auth/login` | — | Login with credentials |
| POST | `/api/auth/logout` | ✅ | Terminate session |
| POST | `/api/auth/refresh` | — | Refresh access token |
| GET | `/api/auth/me` | ✅ | Get current user |
| POST | `/api/auth/forgot-password` | — | Request reset |
| POST | `/api/auth/reset-password` | — | Reset with token |
| POST | `/api/auth/change-password` | ✅ | Change password |
| POST | `/api/auth/2fa/setup` | ✅ | Initialize TOTP |
| POST | `/api/auth/2fa/verify` | ✅ | Verify 2FA code |
| POST | `/api/auth/webauthn/register` | ✅ | Register passkey |
| POST | `/api/auth/webauthn/login/options` | — | Passkey challenge |
| POST | `/api/auth/webauthn/login/verify` | — | Verify passkey |

</details>

<details>
<summary><strong>📦 Posts / Listings (8 endpoints)</strong></summary>

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/posts` | — | List/search with filters |
| GET | `/api/posts/:id` | — | Get post detail |
| POST | `/api/posts` | ✅ | Create listing |
| PATCH | `/api/posts/:id` | ✅ | Update listing |
| DELETE | `/api/posts/:id` | ✅ | Delete listing |
| GET | `/api/posts/my` | ✅ | User's own posts |
| GET | `/api/posts/trust/:userId` | — | User trust data |
| POST | `/api/posts/:id/boost` | ✅ | Boost visibility |

</details>

<details>
<summary><strong>🛒 Commerce (16 endpoints)</strong></summary>

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/cart` | ✅ | Get cart |
| POST | `/api/cart` | ✅ | Add to cart |
| DELETE | `/api/cart/:id` | ✅ | Remove from cart |
| GET | `/api/wishlist` | ✅ | Get wishlist |
| POST | `/api/wishlist` | ✅ | Add to wishlist |
| DELETE | `/api/wishlist/:postId` | ✅ | Remove from wishlist |
| GET | `/api/offers` | — | Get offers |
| POST | `/api/sale/confirm` | ✅ | Confirm sale |
| POST | `/api/sale/undo` | ✅ | Reverse sale |
| POST | `/api/payments` | ✅ | Process payment |
| GET | `/api/price-alerts` | ✅ | Get price alerts |
| POST | `/api/price-alerts` | ✅ | Set price alert |
| GET | `/api/price-history/:postId` | — | Price history |
| GET | `/api/transactions` | ✅ | Transaction history |
| GET | `/api/tiers` | — | Available tiers |
| POST | `/api/subscriptions` | ✅ | Purchase subscription |

</details>

<details>
<summary><strong>💬 Social (12 endpoints)</strong></summary>

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/chat` | ✅ | Get conversations |
| POST | `/api/chat` | ✅ | Send message |
| GET | `/api/channel` | — | List channels |
| POST | `/api/channel` | ✅ | Create channel |
| GET | `/api/channel/:id` | — | Channel detail |
| POST | `/api/channel/:id/follow` | ✅ | Follow channel |
| DELETE | `/api/channel/:id/follow` | ✅ | Unfollow |
| GET | `/api/feed` | — | Community feed |
| POST | `/api/feed` | ✅ | Create feed post |
| GET | `/api/publicwall` | — | Public wall |
| GET | `/api/contacts` | ✅ | Contact list |
| GET | `/api/channel/updates/following` | ✅ | Following updates |

</details>

<details>
<summary><strong>⭐ Reviews & Ratings (8 endpoints)</strong></summary>

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/reviews/user/:userId` | — | User reviews |
| GET | `/api/reviews/buyer/:userId` | — | Buyer reviews |
| GET | `/api/reviews/stats/:userId` | — | Rating stats |
| POST | `/api/reviews` | ✅ | Create/update review |
| PATCH | `/api/reviews/:id/helpful` | ✅ | Mark helpful |
| POST | `/api/reviews/:id/respond` | ✅ | Seller response |
| POST | `/api/reviews/:id/flag` | ✅ | Flag review |
| DELETE | `/api/reviews/:id` | ✅ | Delete review |

</details>

<details>
<summary><strong>🪙 Rewards & Coins (10 endpoints)</strong></summary>

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/rewards` | ✅ | Rewards summary |
| GET | `/api/rewards/tiers` | — | Tier definitions |
| GET | `/api/rewards/leaderboard` | — | Public leaderboard |
| POST | `/api/rewards/checkin` | ✅ | Daily check-in |
| POST | `/api/rewards/spin` | ✅ | Spin the wheel |
| POST | `/api/rewards/scratch` | ✅ | Scratch card |
| GET | `/api/coins/wallet-stats` | ✅ | Coin balance |
| GET | `/api/coins/rewards-config` | ✅ | Full rewards config |
| GET | `/api/coins/transactions` | ✅ | Coin transaction log |
| GET | `/api/wallet` | ✅ | Wallet overview |

</details>

<details>
<summary><strong>🔗 Referrals (8 endpoints)</strong></summary>

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/referral` | ✅ | Referral info |
| GET | `/api/referral/tree` | ✅ | 5-level tree |
| GET | `/api/referral/list` | ✅ | Flat list |
| GET | `/api/referral/transactions` | ✅ | Reward log |
| GET | `/api/referral/chain-status` | ✅ | Per-referral status |
| GET | `/api/referral/leaderboard` | — | Top referrers |
| POST | `/api/referral/create` | ✅ | Generate code |
| POST | `/api/referral/track` | — | Track referral |

</details>

<details>
<summary><strong>👤 User & Profile (6 endpoints)</strong></summary>

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/profile` | ✅ | Get profile |
| PATCH | `/api/profile` | ✅ | Update profile |
| GET | `/api/users/:id` | — | Public user info |
| POST | `/api/aadhaar/verify` | ✅ | Aadhaar KYC |
| GET | `/api/gdpr/export` | ✅ | Data export |
| DELETE | `/api/gdpr/delete` | ✅ | Data deletion |

</details>

<details>
<summary><strong>🔔 Notifications & Push (4 endpoints)</strong></summary>

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/notifications` | ✅ | Get notifications |
| PATCH | `/api/notifications/:id/read` | ✅ | Mark read |
| POST | `/api/push/subscribe` | ✅ | Subscribe |
| DELETE | `/api/push/subscribe` | ✅ | Unsubscribe |

</details>

<details>
<summary><strong>🔍 Discovery (10 endpoints)</strong></summary>

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/categories` | — | All categories |
| GET | `/api/subcategories` | — | Subcategories |
| GET | `/api/nearby` | ✅ | Nearby (lat/lng/radius) |
| GET | `/api/recommendations` | ✅ | Personalized feed |
| GET | `/api/recently-viewed` | ✅ | Browsing history |
| GET | `/api/saved-searches` | ✅ | Saved searches |
| POST | `/api/saved-searches` | ✅ | Save search |
| GET | `/api/brands` | — | Brand list |
| GET | `/api/products` | — | Product catalog |
| GET | `/api/translation` | — | Auto-translate |

</details>

<details>
<summary><strong>🏢 Platform Operations (10 endpoints)</strong></summary>

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/admin/dashboard` | 👑 | Admin analytics |
| GET | `/api/complaints` | 👑 | All complaints |
| POST | `/api/complaints` | ✅ | File complaint |
| POST | `/api/feedback` | ✅ | Submit feedback |
| POST | `/api/device-lifecycle` | ✅ | Device provisioning |
| GET | `/api/fleet-orchestration` | 👑 | Fleet management |
| GET | `/api/security-operations` | 👑 | Security ops |
| GET | `/api/reliability` | 👑 | DR/backup |
| GET | `/api/automation` | 👑 | Automation rules |
| GET | `/api/launch-governance` | 👑 | Launch readiness |

</details>

---

## 🗃️ Database Schema & ERD

### Core Tables

```
┌───────────────────────────────────────────────────────────────────────────┐
│                            CORE ENTITIES                                  │
├─────────────┬────────────────┬───────────────┬───────────────────────────┤
│   users     │   posts        │  categories   │   transactions            │
│   ────────  │   ──────       │  ──────────   │   ────────────            │
│   user_id   │   post_id      │  category_id  │   transaction_id          │
│   username  │   user_id FK   │  name         │   buyer_id FK             │
│   email     │   title        │  slug         │   seller_id FK            │
│   password  │   price        │  icon         │   post_id FK              │
│   rating    │   category FK  │  group        │   agreed_price            │
│   trust_score│  location     │               │   status                  │
│   referred_by│  images (JSONB)│              │   otp_hash                │
└─────────────┴────────────────┴───────────────┴───────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                         REWARDS & GAMIFICATION                            │
├────────────────┬───────────────┬──────────────┬───────────────────────────┤
│   rewards      │   reward_log  │  daily_checkins│ referral_closure        │
│   ────────     │   ──────────  │  ─────────────│ ────────────────         │
│   user_id PK   │   user_id FK  │  user_id PK   │ ancestor_id FK          │
│   points       │   action      │  streak       │ descendant_id FK         │
│   tier         │   points      │  best_streak  │ depth (0-4)             │
│                │   idempotency │  last_checkin │                           │
├────────────────┼───────────────┼──────────────┼───────────────────────────┤
│ spin_history   │ scratch_claims│ user_streaks │ coin_transactions         │
│ ────────────   │ ──────────────│ ────────────  │ ─────────────────         │
│ user_id FK     │ user_id FK    │ visit_streak │ amount, remaining         │
│ reward_amount  │ reward_amount │ post_streak  │ expires_at, idempotency   │
└────────────────┴───────────────┴──────────────┴───────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                         TRUST & SAFETY                                    │
├─────────────────┬────────────────┬────────────────────────────────────────┤
│   reviews       │   complaints   │   Other Tables                        │
│   ────────      │   ──────────   │   ────────────                        │
│   reviewer_id   │   buyer_id     │   channels, channel_followers         │
│   reviewed_user │   seller_id    │   notifications, cart_items           │
│   rating (1-5)  │   severity     │   recently_viewed, saved_searches     │
│   category dims │   sla_due_at   │   price_alerts, login_history         │
│   helpful_votes │   sla_breached │   user_sessions, user_devices         │
│   abuse_score   │   evidence     │   webauthn_credentials                │
│   seller_response│  admin_response│  subscription_plans                  │
└─────────────────┴────────────────┴────────────────────────────────────────┘
```

### Migration Stats

- **Total migrations:** 67 files
- **Numbered (sequential):** 22 (001 → 022)
- **Feature migrations:** 45 (ad-hoc)
- **Categories:** Schema setup, security hardening, performance indexes, backfills, seeds

---

## 🔧 Middleware Pipeline (40+ Layers)

### Global Middleware (Every Request)

| Order | Layer | Purpose |
|:-----:|:------|:--------|
| 1 | **Helmet** | Security headers (CSP, HSTS, X-Frame-Options) |
| 2 | **CORS** | Origin validation against allowlist |
| 3 | **Body Parser** | JSON/URL-encoded parsing |
| 4 | **VPN Enforcement** | Block requests from VPN/proxy IPs |
| 5 | **Activity Tracker** | Track user activity for analytics |
| 6 | **Runtime Budget** | Request timeout enforcement (P95 targets) |
| 7 | **API Contract** | Request structure validation |
| 8 | **Zero-Trust Gate** | Device + session continuous verification |
| 9 | **Tenant Context** | Multi-tenant isolation |
| 10 | **Optional Auth** | JWT extraction (non-blocking) |
| 11 | **Risk Restrictions** | Dynamic risk-based throttling |

### Per-Route Middleware

| Category | Middleware | Purpose |
|:---------|:-----------|:--------|
| **Auth** | `auth`, `twoFactor`, `adaptiveMfaLogin` | JWT verify, 2FA gate, risk-based MFA |
| **Access** | `rbac`, `tenantContext` | Role check, tenant write guard |
| **Security** | `wafEnforcement`, `csrf`, `captcha`, `breachCheck` | WAF scan, CSRF, CAPTCHA, breach |
| **Device** | `deviceBinding`, `deviceIdentity`, `deviceTracker` | Session-device pinning |
| **Rate** | `rateLimiter`, `enhancedRateLimiter` | Per-endpoint + adaptive |
| **Fraud** | `fraudCheck`, `vpnBlocker`, `authAnomalyThrottle` | Fraud scoring, VPN block |
| **Media** | `upload`, `imageOptimizer`, `imageProcessor` | File upload, resize, convert |
| **Validation** | `validatePost`, `validateUser`, `validators` | Input validation |
| **Audit** | `requestLogger`, `authAuditMiddleware`, `geoAlert` | Logging, geo anomaly |
| **Response** | `authResponseHardening`, `errorHandler` | Strip sensitive data, errors |

---

## 🧩 Service Layer (63 Services)

### Services by Domain

<details>
<summary><strong>🪙 Rewards & Gamification (8 services)</strong></summary>

| Service | Purpose |
|:--------|:--------|
| `rewardsLedgerService` | Idempotent point mutations with deduplication |
| `referralJoinRewards` | 5-level join rewards (100/40/20/10/5 coins) |
| `referralChainRewards` | Activity-triggered chain rewards |
| `streakRewardsService` | Visit & post streak tracking with bonuses |
| `leaderboardRewardsService` | Weekly leaderboard calculation |
| `transactionRewardService` | Sale completion rewards |
| `rewardsRealtimeService` | SSE push for real-time balance updates |
| `coinHooks` | Cross-service coin event hooks |

</details>

<details>
<summary><strong>🛡️ Trust & Safety (9 services)</strong></summary>

| Service | Purpose |
|:--------|:--------|
| `trustScoreService` | Multi-signal trust score (0-100) computation |
| `trustBadgeService` | Trust badge assignment logic |
| `fraudService` | Pattern-based fraud detection |
| `riskEngine` | Real-time risk scoring |
| `riskEngineService` | Risk engine orchestration |
| `riskStateService` | User risk state management |
| `riskTelemetryService` | Risk event telemetry |
| `mlFraudScoringService` | ML-based fraud scoring model |
| `flagAuditService` | Content flagging audit trail |

</details>

<details>
<summary><strong>🔐 Authentication (7 services)</strong></summary>

| Service | Purpose |
|:--------|:--------|
| `otpService` | OTP generation & verification |
| `otpDeliveryService` | OTP delivery via SMS/email |
| `twoFactorPolicyService` | 2FA enforcement policies |
| `twoFactorValidationService` | 2FA code validation |
| `accessTokenPolicyService` | Token lifecycle management |
| `tokenVerificationCache` | JWT verification caching |
| `authAuditService` | Auth event auditing |

</details>

<details>
<summary><strong>🏗️ Infrastructure (8 services)</strong></summary>

| Service | Purpose |
|:--------|:--------|
| `cacheService` | Redis cache with stampede protection |
| `cacheWarming` | Pre-warm hot data on startup |
| `emailService` | Email delivery |
| `imageService` | Image processing (Sharp) |
| `fcm` | Firebase Cloud Messaging |
| `socketService` | Socket.IO server management |
| `searchService` | PostgreSQL full-text search |
| `notificationEmitter` | Cross-service notification dispatch |

</details>

<details>
<summary><strong>🏢 Platform Operations (12 services)</strong></summary>

| Service | Purpose |
|:--------|:--------|
| `featureFlagService` | Feature flag management |
| `automationEngineService` | Rule-based automation |
| `telemetryPipelineService` | Event ingestion pipeline |
| `deviceLifecycleService` | Device provisioning |
| `fleetOrchestrationService` | Service fleet management |
| `reliabilityOpsService` | DR & backup operations |
| `securityTrustOpsService` | Security operations |
| `operatorPlatformService` | Operator workflows |
| `intelligenceFinopsService` | Cost optimization |
| `launchGovernanceService` | Launch readiness checks |
| `foundationGuardService` | Schema & foundation health |
| `readinessService` | Health check probes |

</details>

<details>
<summary><strong>💼 Business Logic (19 services)</strong></summary>

| Service | Purpose |
|:--------|:--------|
| `AadhaarService` | Aadhaar KYC verification |
| `PanService` | PAN verification |
| `ChannelService` | Channel/Centre business logic |
| `paymentGateway` | Payment processing |
| `paymentReconciliationService` | Payment reconciliation |
| `subscriptionNotifications` | Subscription event alerts |
| `subscriptionSchemaService` | Subscription data management |
| `kycAutomationService` | Automated KYC processing |
| `locationVerificationService` | GPS verification |
| `locationRetentionService` | Location data management |
| `postViewBufferService` | Batched view count writes |
| `ipInfoService` | IP geolocation lookup |
| `vpnDetection` | VPN/proxy detection |
| `errorReporter` | Error aggregation |
| `auditLogger` | Structured audit logging |
| `schemaGuard` | Runtime schema validation |
| `failoverSafetyService` | Failover orchestration |
| `authSessionRetentionService` | Session lifecycle |
| `coinHooks` | Coin event hooks |

</details>

---

## 🎨 Component Library (100+ Components)

### Core Components

| Component | Purpose |
|:----------|:--------|
| `GreenNavbar` | Primary navigation (responsive top + bottom bar) |
| `GreenProductCard` | Listing card with image, price, trust badge |
| `CompactProductCard` | Compact card for grids |
| `StarRating` | Interactive 1-5 star rating with half-star |
| `RequireAuth` | Auth guard HOC with role support |
| `CategoryAppSwitcher` | Category mode switching |
| `DealsSection` | Featured deals carousel |
| `FeaturedCentrePages` | Featured Centre Page cards |

### Rewards Components

| Component | Purpose |
|:----------|:--------|
| `RewardsHeroCard` | Balance with Rs conversion |
| `TierProgressBar` | Visual tier progress |
| `DailyCheckInButton` | One-tap check-in |
| `SpinWheelModal` | Animated spin wheel game |
| `ScratchCardModal` | Scratch card animation |
| `StreakTracker` | Streak display |
| `LeaderboardTable` | Weekly leaderboard |
| `ReferralChainTree` | Interactive 5-level tree |

### UI Primitives (Radix UI / shadcn-style)

Dialog · Dropdown Menu · Tabs · Toast · Switch · Select · Checkbox · Button · Input · Badge · Card · Progress · Separator · Avatar · Alert Dialog

---

## 🧠 State Management (6 Contexts, 22 Hooks)

### Context Providers

| Context | Provides | Persistence |
|:--------|:---------|:------------|
| **AuthContext** | `isAuth`, `userId`, `login()`, `logout()`, `refresh()` | Token storage |
| **CartContext** | `items`, `addToCart()`, `removeFromCart()`, `cartCount` | localStorage + API |
| **CategoryModeContext** | `activeApp`, `activeCategory`, `setCategory()` | localStorage |
| **FilterContext** | `filters`, `setFilter()`, `resetFilters()` | Session |
| **LocationContext** | `lat`, `lng`, `locationName`, `requestPermission()` | GPS/Capacitor |
| **ThemeContext** | `theme`, `setTheme()`, `isDark` | localStorage + system |

### Custom Hooks (22)

| Hook | Purpose |
|:-----|:--------|
| `useNotifications` | TanStack Query + Socket.IO notifications |
| `useRealtimeChat` | Socket.IO chat integration |
| `useTrustScore` | Trust badge computation |
| `useInfiniteScroll` | Cursor-based pagination |
| `useCoins` | Coin balance & operations |
| `useRewards` | Rewards config & tier progress |
| `useFeed` | Feed management |
| `useOffers` | Offers/deals |
| `useAnalytics` | Event tracking |
| `useCmsPage` | CMS content |
| `useFocusTrap` | Accessibility focus |
| `useLocationPermission` | GPS permission |
| `useLikePost` | Optimistic like/unlike |
| `usePageDensity` | Layout density modes |
| `usePullToRefresh` | Pull-down refresh |
| `useRecommendations` | Personalized feed |
| `useTranslatedContent` | Auto-translate content |
| `use-mobile` | Mobile viewport detection |
| `use-toast` | Toast management |
| `useBeforeUnload` | Unsaved changes warning |
| `useDocumentTitle` | Dynamic page titles |
| `useOfflineQueue` | Offline action queue |

---

## 🎨 Theming & Design System

### Theme Architecture

```
client/src/styles/
├── themes/
│   ├── light-theme.css          # 100+ CSS variable tokens
│   ├── dark-theme.css           # Dark palette tokens
│   ├── dark-overrides.css       # Component dark overrides
│   └── dark-comprehensive.css   # Full dark mode coverage
├── ui-enhancements.css          # Glass morphism, hero cards
└── rewards-profile-enhancements.css
```

### Design Tokens

| Token | Light | Dark | Purpose |
|:------|:------|:-----|:--------|
| `--background` | `#ffffff` | `#0a0e17` | Page background |
| `--foreground` | `#0f172a` | `#e2e8f0` | Primary text |
| `--primary` | `#3b82f6` | `#5b8dff` | Brand accent |
| `--glass-border` | `rgba(255,255,255,0.35)` | `rgba(255,255,255,0.08)` | Glass edges |

### Premium UI Classes

| Class | Effect |
|:------|:-------|
| `mhub-premium-page` | Gradient orbs + isolation context |
| `mhub-premium-surface` | Glass morphism + backdrop blur |
| `mhub-hero-card` | Frosted glass with radial glow |
| `profile-hero-bg` | Blue-to-purple gradient |

---

## 🌍 Internationalization (26 Languages)

### Supported Languages

| Indian Languages | | | |
|:---|:---|:---|:---|
| 🇮🇳 English (en) | 🇮🇳 Hindi (hi) | 🇮🇳 Tamil (ta) | 🇮🇳 Telugu (te) |
| 🇮🇳 Kannada (kn) | 🇮🇳 Malayalam (ml) | 🇮🇳 Marathi (mr) | 🇮🇳 Gujarati (gu) |
| 🇮🇳 Bengali (bn) | 🇮🇳 Punjabi (pa) | 🇮🇳 Odia (or) | 🇮🇳 Assamese (as) |
| 🇮🇳 Urdu (ur) | 🇮🇳 Nepali (ne) | 🇮🇳 Sanskrit (sa) | 🇮🇳 Kashmiri (ks) |
| 🇮🇳 Sindhi (sd) | 🇮🇳 Konkani (kok) | 🇮🇳 Dogri (doi) | 🇮🇳 Maithili (mai) |
| 🇮🇳 Santali (sat) | 🇮🇳 Manipuri (mni) | 🇮🇳 Bodo (brx) | |

| International | | |
|:---|:---|:---|
| 🇸🇦 Arabic (ar) | 🇫🇷 French (fr) | 🇪🇸 Spanish (es) |

**Implementation:** i18next with lazy-loaded language bundles, localStorage persistence, 1,250+ translation keys.

---

## 🪙 Rewards & Gamification Engine

### Coin Economy

```
                    ┌─────────────────────────────────────┐
                    │        100 Coins = ₹1               │
                    └─────────────────────────────────────┘

    ┌─────── EARN ────────┐          ┌─────── SPEND ───────┐
    │                     │          │                      │
    │  Daily Check-in     │          │  Post Boosts         │
    │  (10-50 coins)      │          │  Premium Features    │
    │                     │          │  Rewards Store       │
    │  Spin the Wheel     │          │                      │
    │  (5-500 coins)      │          │  ┌────────────────┐  │
    │                     │   ┌──┐   │  │  FIFO Spending │  │
    │  Scratch Cards      │──▶│💰│──▶│  │  Oldest first  │  │
    │  (10-100 coins)     │   └──┘   │  └────────────────┘  │
    │                     │          │                      │
    │  Referrals          │          │  Expiry:            │
    │  (5-100/level)      │          │  Earned: 365 days   │
    │                     │          │  Promo: 90 days     │
    │  Post/Sale Rewards  │          │                      │
    │  (10-200 coins)     │          │                      │
    │                     │          │                      │
    │  Streak Bonuses     │          │                      │
    │  (multiplier)       │          │                      │
    └─────────────────────┘          └──────────────────────┘
```

### Tier System

| Tier | Coins Required | Benefits |
|:-----|:--------------|:---------|
| 🥉 Bronze | 0 – 499 | Basic marketplace access |
| 🥈 Silver | 500 – 1,999 | Priority support, enhanced visibility |
| 🥇 Gold | 2,000 – 4,999 | Premium badge, analytics dashboard |
| 💎 Platinum | 5,000+ | All Gold + exclusive features |

---

## 🔗 Referral Chain System (5 Levels)

### Reward Ladder

```
New User Joins via Referral Link
    │
    ├── Level 1 (Direct Referrer):      100 coins
    ├── Level 2 (Referrer's Referrer):   40 coins
    ├── Level 3:                         20 coins
    ├── Level 4:                         10 coins
    └── Level 5:                          5 coins
                                        ─────────
                                  Total: 175 coins distributed
```

### Safety Caps

| Cap | Limit | Period |
|:----|:------|:-------|
| Daily | 500 coins | Per ancestor, per day |
| Monthly | 5,000 coins | Per ancestor, per month |
| Lifetime | 50,000 coins | Per ancestor, total |

### Implementation

- **`referral_closure` table** — Materialized ancestor-descendant paths (O(1) lookups)
- **`referralJoinRewards.js`** — 5-level join distribution with cap enforcement
- **`referralChainRewards.js`** — Activity-triggered chain rewards
- **`ReferralChainTree.jsx`** — Interactive tree visualization (color-coded, expandable)

---

## 🛡️ Trust & Safety Engine

### Trust Score (0–100)

| Signal | Weight | Source |
|:-------|:------:|:-------|
| Account Age | Medium | Registration date |
| Verification Status | High | KYC, Aadhaar, email |
| Average Rating | High | Review aggregation |
| Review Count | Medium | Total reviews received |
| Transaction History | High | Completed sales |
| Complaint History | High | Filed/resolved ratio |
| Aadhaar/KYC Status | Very High | Identity verification |

### Trust Levels

| Score | Level | Badge Display |
|:------|:------|:------|
| 0–25 | ⚠️ Low | Caution indicator |
| 26–50 | 🔵 Moderate | Standard |
| 51–75 | ✅ Good | Verified checkmark |
| 76–100 | 🏆 Excellent | Gold trusted badge |

### Complaint SLA

| Severity | SLA Due | Auto-Escalation |
|:---------|:--------|:----------------|
| Critical | 4 hours | Immediate |
| High | 24 hours | After breach |
| Medium | 48 hours | After breach |
| Low | 72 hours | After breach |

---

## ⚡ Realtime Infrastructure

### Socket.IO Events

| Event | Direction | Purpose |
|:------|:----------|:--------|
| `message:new` | Server → Client | New chat message |
| `message:read` | Client → Server | Read receipt |
| `notification:push` | Server → Client | New notification |
| `coins:updated` | Server → Client | Balance change (SSE) |
| `typing:start/stop` | Client → Server | Typing indicator |
| `user:online` | Server → Client | Online status |

### Push Notification Channels

| Channel | Technology | When |
|:--------|:-----------|:-----|
| Socket.IO | WebSocket | App is open |
| Web Push | VAPID | Browser closed |
| FCM | Firebase | Android native |
| Pusher | Backup | Critical events fallback |

---

## 📱 Mobile & Native Apps

### Android Native (Kotlin + Compose)

**Architecture:** MVVM + Clean Architecture with multi-module structure

| Module | Purpose |
|:-------|:--------|
| `app` | DI wiring, navigation, MainActivity |
| `core:common` | Shared models, Result type |
| `core:ui` | Theme, reusable Compose components |
| `core:network` | Retrofit, OkHttp, CookieJar |
| `core:data` | Room DB, repositories, WorkManager |
| `feature:auth` | Login, Signup, Forgot Password |
| `feature:home` | Home feed with categories |
| `feature:listings` | All Listings, Add Post |
| `feature:detail` | Post detail with image pager |
| `feature:profile` | User profile |
| `feature:notifications` | Notification list |
| `feature:chat` | Messaging |
| `feature:search` | Search |
| `feature:settings` | Settings |

**Build Flavors:**

| Flavor | Package Suffix | API Target |
|:-------|:--------------|:-----------|
| `dev` | `.dev` | `http://10.0.2.2:3000` (emulator) |
| `staging` | `.staging` | `https://staging-api.mhub.app` |
| `prod` | _(none)_ | `https://api.mhub.app` |

**Auth Flow:**
1. `GET /api/auth/csrf-token` → seed XSRF-TOKEN cookie
2. `GET /api/auth/session` → check existing session
3. `POST /api/auth/login` → authenticate
4. OkHttp CookieJar persists session cookies
5. CSRF interceptor reads cookie, attaches X-XSRF-TOKEN header
6. 401 → Token refresh interceptor retries
7. Device fingerprint on every request (X-Device-Fingerprint)

### Capacitor Hybrid App

Native capabilities bridged via Capacitor 8:
- 📍 GPS Location (`nativeGpsService.js`)
- 📷 Camera (image upload)
- 📱 Push Notifications (FCM)
- 👥 Contacts (referral invitations)
- 🔗 Deep Linking (share URLs)

### Progressive Web App (PWA)

- ✅ Installable to home screen
- ✅ Offline-capable (service worker caching)
- ✅ Push notifications
- ✅ Full-screen mode
- Config: `manifest.json`, `push-sw.js`, `firebase-messaging-sw.js`

---

## 🔒 Security Architecture

### Defense in Depth (13 Layers)

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1:  HTTPS + HSTS (Transport Security)                   │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2:  CDN / Vercel Edge (DDoS protection)                 │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3:  Nginx (Reverse proxy, SSL termination)              │
├─────────────────────────────────────────────────────────────────┤
│  Layer 4:  Helmet (CSP, X-Frame, Referrer-Policy)              │
├─────────────────────────────────────────────────────────────────┤
│  Layer 5:  CORS (Origin allowlist)                             │
├─────────────────────────────────────────────────────────────────┤
│  Layer 6:  Rate Limiter (Per-IP + Per-User)                    │
├─────────────────────────────────────────────────────────────────┤
│  Layer 7:  WAF (SQL injection, XSS, payload scanning)          │
├─────────────────────────────────────────────────────────────────┤
│  Layer 8:  VPN/Proxy Blocker (IP reputation)                   │
├─────────────────────────────────────────────────────────────────┤
│  Layer 9:  Zero-Trust Gate (Continuous verification)           │
├─────────────────────────────────────────────────────────────────┤
│  Layer 10: JWT Authentication (Short-lived + rotation)         │
├─────────────────────────────────────────────────────────────────┤
│  Layer 11: RBAC + Resource Ownership (Authorization)           │
├─────────────────────────────────────────────────────────────────┤
│  Layer 12: Device Binding (Session-device pinning)             │
├─────────────────────────────────────────────────────────────────┤
│  Layer 13: ML Fraud Detection (Scoring + Rules)                │
└─────────────────────────────────────────────────────────────────┘
```

### OWASP Top 10 Coverage

| # | Risk | Mitigation |
|:-:|:-----|:-----------|
| A01 | Broken Access Control | RBAC, resource ownership, RequireAuth |
| A02 | Cryptographic Failures | Argon2, HTTPS, JWT signing |
| A03 | Injection | Parameterized queries, WAF, input validation |
| A04 | Insecure Design | Threat modeling, defense in depth |
| A05 | Security Misconfiguration | Helmet, CSP, env validation |
| A06 | Vulnerable Components | `npm audit`, dependency review |
| A07 | Auth Failures | 2FA, passkeys, rate limiting, breach check |
| A08 | Data Integrity | CSRF tokens, signed JWTs |
| A09 | Logging Failures | Structured audit logging |
| A10 | SSRF | URL validation, allowlisting |

### Authentication Methods

| Method | Security Level | Use Case |
|:-------|:---:|:---------|
| Email + Password | ⭐⭐⭐ | Standard login (Argon2 hashed) |
| OTP (SMS/Email) | ⭐⭐⭐ | Password reset, phone verify |
| TOTP 2FA | ⭐⭐⭐⭐ | Second factor (Google Authenticator) |
| WebAuthn/Passkeys | ⭐⭐⭐⭐⭐ | Phishing-resistant passwordless |
| Adaptive MFA | ⭐⭐⭐⭐⭐ | Risk-based MFA triggering |

---

## 🧪 Testing Strategy

### Test Distribution (134+ Files)

| Category | Framework | Files | Location |
|:---------|:----------|:-----:|:---------|
| Client Unit/Integration | Vitest | 42 | `client/tests/` |
| Server Unit/Integration | Jest | 87 | `server/tests/` |
| Server E2E | Jest + Python | 4 | `server/tests/e2e/` |
| Server Load | Custom | 1 | `server/tests/load/` |
| Client E2E | Playwright | — | `client/e2e/` |
| Android Unit | JUnit + MockK | — | `android/*/src/test/` |
| Android Benchmark | Macrobenchmark | — | `android/benchmark/` |

### Test Categories

| Type | Coverage |
|:-----|:---------|
| **Security** | WAF enforcement, auth, XSS, injection (15 files) |
| **Regression** | Controller behavior stability (12 files) |
| **Integration** | Full request lifecycle (8 files) |
| **Service** | Business logic unit tests (14 files) |
| **Middleware** | Pipeline validation (10 files) |
| **Route** | API contract compliance (12 files) |
| **E2E** | Top 10 user journey flows (4 files) |
| **Load** | Throughput and latency (1 file) |
| **Component** | Auth routing, guards, UI (3 files) |
| **Page** | Route contracts, navigation (26 files) |

### Running Tests

```bash
# ─── Client ───────────────────────────────────────
cd client
npm test                          # Vitest unit/integration
npm run test:e2e:smoke            # Playwright smoke
npm run test:e2e:comprehensive    # Full E2E suite
npm run test:e2e:visual           # Visual regression

# ─── Server ───────────────────────────────────────
cd server
npm test                          # Full Jest suite
npm run test:critical-paths       # Critical integration
npm run test:e2e:journeys         # Top 10 user journeys
npm run test:waf                  # WAF enforcement
npm run test:auth:integration     # Real auth flow
npm run load:test                 # Load testing

# ─── Android ──────────────────────────────────────
cd android
./gradlew testDevDebugUnitTest    # Unit tests
./gradlew lint                    # Lint checks
```

---

## 📜 Scripts & Automation

### Client Scripts

| Script | Purpose |
|:-------|:--------|
| `npm run dev` | Start dev server (safe mode with checks) |
| `npm run build` | Production build |
| `npm run lint` | ESLint (zero-warning policy) |
| `npm run check:bundle-budget` | Bundle size enforcement |
| `npm run check:performance-budget` | Load time targets |
| `npm run check:no-hardcoded-localhost` | No hardcoded URLs |
| `npm run check:network-contract` | API contract validation |
| `npm run check:ux-smoke` | UX route smoke test |
| `npm run check:structure` | Folder structure validation |

### Server Scripts

| Script | Purpose |
|:-------|:--------|
| `npm start` | Production (preflight + start) |
| `npm run dev` | Development with nodemon |
| `npm run preflight:schema` | Schema validation |
| `npm run check:schema-contract` | Schema contract |
| `npm run check:route-contract` | Route contract |
| `npm run check:foundation-contract` | Foundation health |
| `npm run check:runtime-contract` | Runtime probe |
| `npm run readiness:probe-matrix` | Readiness checks |
| `npm run failover:tabletop` | Failover drill |
| `npm run failover:active-active` | Active-active orchestration |
| `npm run backup:drill` | Backup verification |
| `npm run risk:telemetry:export` | Risk telemetry export |
| `npm run flags:simulate-rollout` | Feature flag simulation |
| `npm run auth:verify` | Auth rollout verification |

---

## ⚙️ Environment Configuration

### Server `.env` (Key Variables)

```env
# ─── Database ────────────────────────────────────
DATABASE_URL=postgresql://user:pass@localhost:5432/mhub
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mhub
DB_USER=postgres
DB_PASSWORD=your_password

# ─── Redis ───────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── Authentication ──────────────────────────────
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# ─── Media ───────────────────────────────────────
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret

# ─── Push Notifications ─────────────────────────
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
FCM_SERVER_KEY=your_fcm_key

# ─── Referral Economy ───────────────────────────
REFERRAL_CHAIN_COINS=100,40,20,10,5
REFERRAL_DAILY_CAP=500
REFERRAL_MONTHLY_CAP=5000
REFERRAL_LIFETIME_CAP=50000

# ─── Foundation Guards ───────────────────────────
FOUNDATION_STRICT_MODE=true
API_SUPPORTED_VERSIONS=1
RUNTIME_BUDGET_READ_P95_MS=220
RUNTIME_BUDGET_WRITE_P95_MS=350
```

---

## 🐳 Docker & Deployment

### Docker Compose (4 Services)

```yaml
services:
  postgres:    # PostgreSQL 17 Alpine — port 5432
  redis:       # Redis 7 Alpine — port 6379, 128MB max, LRU eviction
  server:      # Express API — port 5001, depends on postgres + redis
  client:      # Vite build — port 4173, depends on server
```

```bash
# Start everything
docker compose up -d

# View logs
docker compose logs -f server

# Reset database
docker compose down -v && docker compose up -d
```

### Production Architecture

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| CDN | Vercel Edge | Static assets, SPA routing |
| Proxy | Nginx | SSL, gzip, WebSocket upgrade |
| Process | PM2 | Cluster mode, memory restart (500MB) |
| Database | PostgreSQL 17 | Primary data store |
| Cache | Redis 7 | Sessions, rate limiting, cache |
| Media | Cloudinary | Image CDN + transformations |

---

## ⚡ Performance & Optimization

### Frontend

| Technique | Implementation |
|:----------|:---------------|
| Code Splitting | `React.lazy()` with retry wrapper (all 60+ pages) |
| Tree Shaking | Vite 5 dead code elimination |
| Image Optimization | Lazy loading, Cloudinary transforms, responsive |
| Bundle Budget | `check-bundle-budget.mjs` enforces limits |
| Performance Budget | Load time targets enforced |
| Server State | TanStack Query (stale-while-revalidate) |
| Infinite Scroll | Intersection observer + cursor pagination |
| Deduplication | Item-level dedup in feeds |

### Backend

| Technique | Implementation |
|:----------|:---------------|
| Connection Pooling | PostgreSQL pool with configurable limits |
| Redis Caching | Stampede protection via `cacheService` |
| Cache Warming | Pre-load hot data on startup |
| View Buffering | Batched view count writes |
| Full-Text Search | PostgreSQL tsvector with ranking |
| Runtime Budgets | P95 timeout enforcement (220ms read, 350ms write) |
| Query Optimization | 67 migrations include targeted indexes |
| N+1 Prevention | JOIN queries with selective columns |

---

## 📊 Production Readiness

**Overall Score: 89/100** (Rev 8 — April 2026)

| Category | Score | Status |
|:---------|:-----:|:------:|
| Security | 9/10 | ✅ All `err.message` leaks fixed |
| API Stability | 8/10 | ✅ Payment admin checks added |
| Database | 7/10 | ⚠️ Missing indexes on 9 tables |
| Client Quality | 8/10 | ✅ CategoryHub i18n fixed |
| UI/UX Design | 9/10 | ✅ Bottom nav restored |
| Dark Mode | 9/10 | ✅ 20+ pages fixed |
| i18n | 7/10 | ⚠️ 4 pages need coverage |
| Performance | 9/10 | ✅ Redis TTL fixed |
| Deployment | 8/10 | ⚠️ Port mismatch tracked |
| SEO/Accessibility | 7/10 | ⚠️ Hardcoded titles |
| Feature Completeness | 9/10 | ✅ All core flows work |

---

## 🌐 World-Class Inspirations

This project draws architectural and documentation inspiration from:

| Repository | Inspiration |
|:-----------|:-----------|
| [next.js](https://github.com/vercel/next.js) | Monorepo structure, documentation depth |
| [supabase](https://github.com/supabase/supabase) | README visual design, badge usage |
| [cal.com](https://github.com/calcom/cal.com) | Full-stack monorepo, feature modularity |
| [medusa](https://github.com/medusajs/medusa) | E-commerce architecture, plugin system |
| [appwrite](https://github.com/appwrite/appwrite) | Multi-platform support, API design |
| [immich](https://github.com/immich-app/immich) | Docker compose, mobile + web parity |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | Component library pattern, Radix primitives |
| [bulletproof-react](https://github.com/alan2207/bulletproof-react) | React architecture best practices |
| [nowinandroid](https://github.com/android/nowinandroid) | Multi-module Android architecture |

---

## 🗺️ Roadmap

| Feature | Status | Description |
|:--------|:------:|:-----------|
| Coin Rewards Store | 📋 Planned | Redeem coins for benefits |
| Advanced Seller Analytics | 🔨 In Progress | Revenue trends, demographics |
| Video Listings | 📋 Planned | Video upload support |
| AI-Powered Search | 📋 Planned | Semantic search with embeddings |
| Rich Centre Pages | 📋 Planned | Cover photos, pinned listings |
| Multi-Currency (beyond INR) | 📋 Planned | International support |
| In-App Payments (UPI) | 📋 Planned | Direct payment processing |
| Buyer Protection (Escrow) | 📋 Planned | Transaction safety |
| iOS Native App | 📋 Planned | Swift + SwiftUI |
| Push Campaigns | 📋 Planned | Targeted push segmentation |

---

## 🤝 Contributing

### Development Workflow

1. Create a feature branch from `main`
2. Make changes following existing code patterns
3. Run tests: `npm test` in both `client/` and `server/`
4. Run quality checks:
   ```bash
   cd client && npm run lint
   cd server && npm run check:schema-contract
   cd server && npm run check:route-contract
   ```
5. Submit a pull request

### Code Conventions

| Area | Convention |
|:-----|:----------|
| Components | PascalCase, `.jsx` |
| Hooks | `useHookName.js` |
| Services | camelCase, `.js` |
| Controllers | `nameController.js` |
| Middleware | camelCase, `.js` |
| Tests | `name.test.js` / `name.test.jsx` |
| CSS | Tailwind utilities + CSS custom properties |
| i18n | `tr("key", "Fallback text")` |

### File Organization

| What | Where |
|:-----|:------|
| Pages | `client/src/pages/` |
| Reusable Components | `client/src/components/` |
| Domain Components | `client/src/components/{domain}/` |
| Hooks | `client/src/hooks/` |
| Routes | `server/src/routes/` |
| Controllers | `server/src/controllers/` |
| Business Logic | `server/src/services/` |
| Middleware | `server/src/middleware/` |
| Migrations | `server/database/migrations/` |

---

## 📝 Changelog

### 2026-04 (Latest)

**Rewards System Overhaul**
- Unified "Coins" terminology platform-wide
- 5-tab RewardsPage (Overview, Network, Earn, Store, History)
- Coin-to-rupee display (100 coins = ₹1)
- FIFO spend logic with expiry (earned: 365d, promo: 90d)
- Tier progress visualization (Bronze → Platinum)

**Referral Chain System**
- 5-level reward ladder: L1=100, L2=40, L3=20, L4=10, L5=5
- Safety caps: 500/day, 5K/month, 50K/lifetime
- Activity-triggered chain rewards
- `referral_closure` materialized table

**Centre Pages**
- Professional seller pages (5-tab interface)
- Follow/unfollow with updates feed
- Verification + Premium badges

**Seller & Buyer Ratings**
- Category-specific rating dimensions
- Review moderation (flag, auto-hide, abuse scoring)
- Helpful votes and seller responses

### 2026-03

**Foundation Launch**
- React 18 + Vite 5 + Express 5 stack
- PostgreSQL 17 with 20+ tables
- 57 API endpoint groups
- 40 security middleware layers
- 26-language i18n infrastructure
- Capacitor 8 Android bridge
- Socket.IO realtime chat/notifications
- WebAuthn/FIDO2 passkeys
- Trust score computation engine
- Fraud detection (WAF + VPN + ML scoring)

---

<div align="center">

---

**MHub** — The Category-Native Marketplace Platform

_Built with care for users, sellers, and developers._

[![Made with ❤️](https://img.shields.io/badge/Made_with-❤️-red?style=flat-square)](.)
[![Powered by Node.js](https://img.shields.io/badge/Powered_by-Node.js-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Styled with Tailwind](https://img.shields.io/badge/Styled_with-Tailwind-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>
