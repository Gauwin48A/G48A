<p align="center">
  <img src="public/icons/icon-192x192.png" alt="MHub Logo" width="120" height="120" />
</p>

<h1 align="center">MHub</h1>

<p align="center">
  <strong>The Category-Native Marketplace Platform</strong><br/>
  <em>One app. Every category. Every community.</em><br/><br/>
  <sub>Built with ❤️ — React 18 · Capacitor 8 · Express 5 · PostgreSQL 17 · Redis 7 · Socket.IO 4</sub>
</p>

<p align="center">
  <a href="#-quick-start"><img src="https://img.shields.io/badge/Quick_Start-0078D4?style=for-the-badge&logo=rocket&logoColor=white" alt="Quick Start" /></a>&nbsp;
  <a href="#-architecture"><img src="https://img.shields.io/badge/Architecture-7C3AED?style=for-the-badge&logo=blueprint&logoColor=white" alt="Architecture" /></a>&nbsp;
  <a href="#-features"><img src="https://img.shields.io/badge/Features-059669?style=for-the-badge&logo=sparkles&logoColor=white" alt="Features" /></a>&nbsp;
  <a href="#-visual-design-specification--pin-to-pin-per-page-report"><img src="https://img.shields.io/badge/Visual_Specs-EC4899?style=for-the-badge&logo=palette&logoColor=white" alt="Visual Specs" /></a>&nbsp;
  <a href="#-api-reference--57-endpoint-groups"><img src="https://img.shields.io/badge/API_Reference-F59E0B?style=for-the-badge&logo=api&logoColor=white" alt="API" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/Vite-6.4-646CFF?logo=vite&logoColor=white" alt="Vite 6" />
  <img src="https://img.shields.io/badge/Express-5.1-000000?logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-336791?logo=postgresql&logoColor=white" alt="PostgreSQL 17" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white" alt="Redis 7" />
  <img src="https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socket.io&logoColor=white" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor&logoColor=white" alt="Capacitor 8" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/i18n-26_Languages-F7DF1E" alt="26 Languages" />
  <img src="https://img.shields.io/badge/Tests-Vitest_|_Jest_|_Playwright-6E9F18" alt="Testing" />
  <img src="https://img.shields.io/badge/UX_Audit-98/100-00C853" alt="UX Score" />
  <img src="https://img.shields.io/badge/License-Proprietary-red" alt="License" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Routes-68_Pages-blueviolet" alt="68 Routes" />
  <img src="https://img.shields.io/badge/API-57_Endpoint_Groups-blue" alt="57 API Groups" />
  <img src="https://img.shields.io/badge/Controllers-48-orange" alt="48 Controllers" />
  <img src="https://img.shields.io/badge/Services-64-green" alt="64 Services" />
  <img src="https://img.shields.io/badge/Middleware-40_Security_Layers-red" alt="40 Middleware" />
  <img src="https://img.shields.io/badge/Migrations-61-yellow" alt="61 Migrations" />
  <img src="https://img.shields.io/badge/Design_Tokens-100+-EC4899" alt="Design Tokens" />
  <img src="https://img.shields.io/badge/Dark_Mode-Full_Coverage-1E293B" alt="Dark Mode" />
</p>

---

<details>
<summary><strong>Table of Contents</strong> (click to expand)</summary>

### Foundation
- [Platform Vision](#-platform-vision)
- [Quick Start](#-quick-start)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)

### Application
- [Features](#-features)
- [Page Directory (All 68 Routes)](#-page-directory--all-68-routes)
- [Page-by-Page Feature Map](#-page-by-page-feature-map)
- [Navigation Architecture](#-navigation-architecture)
- [Authentication and Access Control](#-authentication-and-access-control)

### Backend
- [API Reference (57 Endpoint Groups)](#-api-reference--57-endpoint-groups)
- [Database Schema](#-database-schema)
- [Middleware Pipeline (40 Layers)](#-middleware-pipeline--40-layers)
- [Service Layer (64 Services)](#-service-layer--64-services)

### Frontend
- [Component Library](#-component-library)
- [State Management (6 Contexts, 19 Hooks)](#-state-management--6-contexts-19-hooks)
- [Theming and Design System](#-theming-and-design-system)
- [🎨 Visual Design Specification (15 Pages Pin-to-Pin)](#-visual-design-specification--pin-to-pin-per-page-report)
- [Internationalization (26 Languages)](#-internationalization--26-languages)

### Platform Systems
- [Rewards and Gamification System](#-rewards-and-gamification-system)
- [Coin Economy](#-coin-economy)
- [Referral Chain System](#-referral-chain-system)
- [Trust and Safety Engine](#-trust-and-safety-engine)
- [Realtime Infrastructure](#-realtime-infrastructure)
- [Mobile and PWA](#-mobile-and-pwa)

### Operations
- [Testing Strategy (134 Test Files)](#-testing-strategy--134-test-files)
- [Scripts and Automation](#-scripts-and-automation)
- [Environment Configuration](#-environment-configuration)
- [Security Architecture](#-security-architecture)
- [Performance and Optimization](#-performance-and-optimization)
- [Deployment and Infrastructure](#-deployment-and-infrastructure)

### Reference
- [Migration History (61 Migrations)](#-migration-history--61-migrations)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Changelog](#-changelog)

</details>

---

## Platform Vision

MHub is a **category-native marketplace** that behaves like multiple specialized marketplace apps inside a single product.

Unlike generic classified platforms where all categories feed into one undifferentiated feed, MHub pivots its entire user experience -- discovery, filters, recommendations, and seller flow -- based on the user's active category context. Browsing electronics feels different from browsing fashion, which feels different from browsing real estate.

**What "category-native" means in practice:**

| Aspect | Generic Marketplace | MHub |
|:-------|:-------------------|:-----|
| Discovery | Same feed for everything | Feed, filters, and sort tuned per category |
| Seller Flow | One-size-fits-all form | Category-aware fields, specs, and pricing |
| Trust Signals | Star ratings only | Trust score + verification + category-specific review dimensions |
| Monetization | Flat listing fee | Tier-based plans with category-scoped visibility boosts |
| Community | None | Category-scoped channels, feeds, and centre pages |

**For Users:**
- Browse thousands of listings with intelligent, category-aware discovery
- Sell with a guided posting flow, tier-based visibility, and seller analytics
- Earn coins and rewards through daily activity, referrals, and streaks
- Trust every seller via computed trust scores, verification badges, and review history
- Chat in realtime with buyers and sellers
- Save favorites to wishlists, track searches, and get price alerts

**For Developers:**
- 68 distinct routes across marketplace, social, commerce, and admin surfaces
- 57 API endpoint groups covering auth, commerce, trust, gamification, and platform ops
- 40 security middleware layers from WAF to device binding to zero-trust
- 64 backend services spanning fraud detection to fleet orchestration
- 19 custom React hooks and 6 context providers
- 26 languages with full i18n infrastructure (1,250+ translation keys)
- 134 test files across unit, integration, E2E, security, and load testing

---

## Quick Start

### Prerequisites

| Tool | Version | Purpose |
|:-----|:--------|:--------|
| Node.js | 18 or newer | Runtime for both client and server |
| PostgreSQL | 15 or newer | Primary database |
| Redis | 7 or newer | Cache, sessions, rate limiting |
| npm | 9 or newer | Package manager |

### 1. Clone and Install

```bash
git clone https://github.com/your-org/mhub.git
cd mhub

# Server
cd server
cp .env.example .env    # Configure database credentials
npm install

# Client
cd ../client
npm install
```

### 2. Database Setup

```bash
cd server
node scripts/ops/run_migration.js           # Run migration script
npm run seed:sample-data        # Seed sample data (optional)
```

### 3. Start Development

```bash
# Terminal 1 -- API Server (port 5001)
cd server && npm run dev

# Terminal 2 -- Client App (port 5173)
cd client && npm run dev
```

### 4. Open in Browser

```
http://localhost:5173
```

### Quick Verification

```bash
# Build check
cd client && npm run build

# Server tests
cd server && npm test

# Schema validation
cd server && npm run preflight:schema

# Route contract check
cd server && npm run check:route-contract
```

---

## Tech Stack

### Client Application

| Technology | Role | Details |
|:-----------|:-----|:--------|
| React 18 | UI framework | Concurrent features, Suspense, lazy loading |
| Vite 5 | Build tool | Sub-second HMR, tree-shaking, code splitting |
| React Router 6 | Navigation | Nested routes, lazy loading, auth guards |
| TanStack Query 5 | Server state | Cache, refetch, infinite scroll, optimistic updates |
| Tailwind CSS 3.4 | Styling | Utility-first, dark mode, responsive design tokens |
| Radix UI | Primitives | Accessible dialog, dropdown, tabs, toast, switch |
| Lucide React | Icons | Consistent, tree-shakeable icon library |
| Socket.IO Client | Realtime | Bidirectional chat and notification delivery |
| Capacitor 8 | Native bridge | Android/iOS with native GPS, contacts, push |
| i18next | i18n | 26 languages, lazy loading, localStorage cache |
| Axios | HTTP | Interceptors, token refresh, CSRF, abort controllers |

### Server Application

| Technology | Role | Details |
|:-----------|:-----|:--------|
| Express 5 | HTTP framework | Async/await native, middleware-driven |
| PostgreSQL 17 | Database | ACID, JSONB, full-text search, CTEs, triggers |
| Redis (ioredis) | Cache layer | Sessions, rate limiting, cache invalidation |
| Socket.IO 4 | Realtime server | Room-based events, reconnection, acknowledgments |
| Argon2 + bcrypt | Password hashing | Dual-algo support, memory-hard hashing |
| JWT + Refresh | Token auth | Short-lived access + long-lived refresh rotation |
| SimpleWebAuthn | Passkeys | FIDO2/WebAuthn passwordless authentication |
| Sharp | Image processing | Resize, compress, format conversion |
| Cloudinary | Media CDN | Image hosting, transformation, optimization |
| Helmet | Security headers | CSP, HSTS, X-Frame, referrer policy |
| Web Push (VAPID) | Notifications | Push notifications via VAPID protocol |
| Pusher | Realtime backup | Backup channel for critical event delivery |

### Infrastructure and Tooling

| Tool | Purpose |
|:-----|:--------|
| Vitest | Frontend unit and integration testing |
| Jest | Backend testing with critical path coverage |
| Playwright | End-to-end browser testing (smoke and visual) |
| ESLint | Code quality enforcement |
| PostCSS | CSS processing pipeline |
| PM2 | Production process management |
| Nginx | Reverse proxy and static serving |
| Vercel | Client deployment (with edge config) |

---

## Architecture

### System Overview

```mermaid
graph TB
    subgraph Devices["User Devices"]
        Browser["Web Browser"]
        Android["Android (Capacitor)"]
        PWA["PWA"]
    end

    subgraph Client["Client App -- React + Vite"]
        Router["React Router<br/>68 Routes"]
        Components["100+ Components"]
        Contexts["6 Context Providers"]
        Hooks["19 Custom Hooks"]
    end

    subgraph Server["Express API Server"]
        Routes["57 API Groups"]
        Controllers["48 Controllers"]
        Middleware["40 Middleware Layers"]
        Services["64 Services"]
    end

    subgraph Realtime["Realtime Engine"]
        SocketIO["Socket.IO<br/>Chat + Notifications"]
        SSE["Server-Sent Events<br/>Rewards Updates"]
    end

    subgraph Data["Data Layer"]
        PG["PostgreSQL 17<br/>20+ Tables<br/>61 Migrations"]
        Redis["Redis 7<br/>Sessions + Cache"]
    end

    subgraph External["External Services"]
        Cloudinary["Cloudinary CDN"]
        FCM["Firebase Cloud Messaging"]
        Aadhaar["Aadhaar KYC"]
        Payment["Payment Gateway"]
    end

    Devices --> Client
    Client -->|"HTTP/REST (Axios)"| Server
    Client -->|"WebSocket"| Realtime
    Server --> Data
    Realtime --> Data
    Server --> External
```

### Request Lifecycle

```mermaid
sequenceDiagram
    participant U as User Browser
    participant C as React Client
    participant M as Middleware Stack
    participant R as Express Router
    participant S as Service Layer
    participant DB as PostgreSQL
    participant Ca as Redis Cache

    U->>C: User Action (click, navigate)
    C->>M: HTTP Request (Axios + JWT)
    M->>M: 1. Helmet (security headers)
    M->>M: 2. CORS validation
    M->>M: 3. Rate limiter
    M->>M: 4. WAF enforcement
    M->>M: 5. VPN blocker
    M->>M: 6. Zero-trust gate
    M->>M: 7. JWT authentication
    M->>M: 8. Risk restrictions
    M->>R: Validated request
    R->>S: Controller delegates to service
    S->>Ca: Check cache
    Ca-->>S: Cache hit/miss
    S->>DB: Query (on cache miss)
    DB-->>S: Result rows
    S-->>R: Business result
    R-->>C: JSON response
    C-->>U: UI update
```

### Frontend Architecture

```
client/src/
|-- App.jsx                  # Root: Router + Providers + 68 Routes
|-- main.jsx                 # Entry: React DOM + i18n bootstrap
|-- index.css                # Global styles + theme imports
|
|-- pages/                   # 56 page-level components
|   |-- AllPosts.jsx         # Discovery feed (category-scoped)
|   |-- PostDetail.jsx       # Listing detail with trust badges
|   |-- Profile.jsx          # User account hub (multi-tab)
|   |-- RewardsPage.jsx      # Gamification hub (5 tabs)
|   |-- Chat.jsx             # Realtime messaging
|   |-- ChannelPage.jsx      # Centre Pages (like Facebook Pages)
|   +-- ...                  # 50 more page files
|
|-- components/              # 100+ reusable UI components
|   |-- GreenNavbar.jsx      # Primary navigation (top + bottom)
|   |-- GreenProductCard.jsx # Listing card with trust badge
|   |-- RequireAuth.jsx      # Auth guard HOC
|   |-- StarRating.jsx       # Star rating widget
|   |-- ui/                  # Radix UI primitives (shadcn)
|   |-- rewards/             # Rewards section components
|   |-- referral/            # Referral chain tree
|   |-- ratings/             # User rating profiles
|   |-- centre/              # Centre page tabs + analytics
|   +-- page-state/          # Loading/Error/Empty states
|
|-- context/                 # 6 React Context providers
|   |-- AuthContext.jsx      # Auth state, login, logout, refresh
|   |-- CartContext.jsx      # Shopping cart state
|   |-- CategoryModeContext.jsx  # Category app mode pivot
|   |-- FilterContext.jsx    # Global filter state
|   |-- LocationContext.jsx  # GPS and location state
|   +-- ThemeContext.jsx     # Dark/light/system theme
|
|-- hooks/                   # 19 custom hooks
|   |-- useNotifications.js  # TanStack Query notification hooks
|   |-- useRealtimeChat.js   # Socket.IO chat integration
|   |-- useTrustScore.js     # Trust badge computation
|   |-- useInfiniteScroll.js # Cursor-based pagination
|   |-- useCoins.js          # Coin balance + operations
|   |-- useRewards.js        # Rewards state management
|   +-- ...13 more hooks
|
|-- services/                # Client-side service layer
|   |-- api.js               # Axios instance + interceptors
|   |-- vpnDetection.js      # VPN/proxy detection
|   |-- deviceFingerprint.js # Browser fingerprinting
|   +-- nativeGpsService.js  # Capacitor GPS bridge
|
|-- utils/                   # 25 utility modules
|   |-- authStorage.js       # Token and session helpers
|   |-- savedPosts.js        # Wishlist local state
|   |-- formatPrice.js       # Rs currency formatting
|   |-- coinConversion.js    # Coin-to-rupee display (100 coins = Rs 1)
|   +-- relativeTime.js      # "2 hours ago" formatting
|
|-- lib/                     # Core library integrations
|   |-- socket.js            # Socket.IO client setup
|   |-- firebase.js          # FCM integration
|   |-- pushService.js       # Web Push subscription
|   +-- requestSecurity.js   # Hardened request headers
|
|-- styles/                  # Theme and design tokens
|   |-- themes/
|   |   |-- light-theme.css  # 100+ CSS variable tokens
|   |   |-- dark-theme.css   # Dark palette tokens
|   |   +-- dark-overrides.css
|   |-- ui-enhancements.css  # Glass morphism, hero cards
|   +-- rewards-profile-enhancements.css
|
|-- locales/                 # i18n translation files
|   +-- en.json              # 1,250+ translation keys
|
+-- i18n/                    # i18n configuration
    +-- index.js             # i18next setup with backends
```

### Backend Architecture

```
server/src/
|-- index.js                 # Express app + route mounting + Socket.IO
|
|-- routes/                  # 63 API route files (57 mounted)
|   |-- auth.js              # /api/auth
|   |-- posts.js             # /api/posts
|   |-- chat.js              # /api/chat
|   |-- rewards.js           # /api/rewards
|   |-- coins.js             # /api/coins
|   |-- referral.js          # /api/referral
|   |-- reviews.js           # /api/reviews
|   +-- ...56 more route files
|
|-- controllers/             # 48 controller files
|   |-- authController.js    # Login, signup, OTP, passkeys
|   |-- postController.js    # CRUD + search + boost
|   |-- coinController.js    # Coin economy (spin, checkin, scratch)
|   |-- referralController.js# Referral chain tree + rewards
|   |-- complaintsController.js # Complaints + SLA tracking
|   +-- ...43 more controllers
|
|-- services/                # 64 business logic services
|   |-- rewardsLedgerService.js      # Idempotent point mutations
|   |-- referralJoinRewards.js       # 5-level join rewards (100/40/20/10/5)
|   |-- referralChainRewards.js      # Activity-triggered chain rewards
|   |-- streakRewardsService.js      # Visit/post streak tracking
|   |-- leaderboardRewardsService.js # Weekly leaderboard rewards
|   |-- trustScoreService.js         # Trust score computation
|   |-- fraudService.js              # Fraud detection
|   |-- riskEngine.js                # Risk scoring engine
|   |-- cacheService.js              # Redis cache with stampede protection
|   +-- ...55 more services
|
|-- middleware/               # 40 middleware layers
|   |-- auth.js              # JWT verification
|   |-- rbac.js              # Role-based access control
|   |-- wafEnforcement.js    # Web application firewall
|   |-- vpnBlocker.js        # VPN/proxy blocking
|   |-- deviceBinding.js     # Session-device pinning
|   |-- zeroTrust.js         # Zero-trust verification
|   +-- ...34 more middleware
|
|-- utils/                   # Database helpers, logger
|   |-- dbHelpers.js         # Pool, query timeouts
|   +-- logger.js            # Structured logging
|
+-- worker/                  # Background job processing
```

---

## Features

### Feature Matrix

| Category | Feature | Status | Auth | Route |
|:---------|:--------|:------:|:----:|:------|
| **Discovery** | | | | |
| | Category Hub (Home) | Done | -- | `/category-hub` |
| | All Posts Feed | Done | -- | `/all-posts` |
| | Personalized For You | Done | -- | `/for-you` |
| | Community Feed | Done | -- | `/feed` |
| | Feed Post Detail | Done | -- | `/feed/:id` |
| | Nearby Listings (GPS) | Done | Auth | `/nearby` |
| | Global Search | Done | -- | `/search` |
| | Public Wall | Done | -- | `/public-wall` |
| | Home Discovery | Done | -- | `/home` |
| | Offers and Deals | Done | -- | `/offers` |
| **Listings** | | | | |
| | Listing Detail | Done | -- | `/post/:id` |
| | Add Post (Sell) | Done | Auth | `/add-post` |
| | Quick Post | Done | Auth | `/post_add` |
| | Feed Post (text only) | Done | Auth | `/feed/feedpostadd` |
| | Edit Post | Done | Auth | `/edit-post/:postId` |
| | My Posts | Done | Auth | `/my-home` |
| | Post Welcome | Done | Auth | `/post-welcome` |
| **Commerce** | | | | |
| | Shopping Cart | Done | Auth | `/cart` |
| | Wishlist | Done | Auth | `/wishlist` |
| | Buy History | Done | Auth | `/bought-posts` |
| | Sell History | Done | Auth | `/sold-posts` |
| | Sale Complete | Done | Auth | `/saledone` |
| | Sale Undo | Done | Auth | `/saleundone` |
| | Buyer View | Done | Auth | `/buyer-view` |
| | Payments | Done | Auth | `/payment` |
| **Social** | | | | |
| | Realtime Chat | Done | Auth | `/chat` |
| | Channels | Done | -- | `/channels` |
| | Centre Pages | Done | Auth | `/centre` |
| | Centre Listings | Done | Auth | `/centre/:id/listings` |
| | Create Centre/Channel | Done | Auth | `/centre/create` |
| | Activity Hub | Done | Auth | `/activity` |
| | Reviews | Done | -- | `/reviews/:userId` |
| | My Feed | Done | Auth | `/my-feed` |
| **Rewards** | | | | |
| | Rewards Dashboard (5 tabs) | Done | Auth | `/rewards` |
| | Daily Check-in | Done | Auth | API only |
| | Spin the Wheel | Done | Auth | API only |
| | Scratch Cards | Done | Auth | API only |
| | Referral Chain (5 levels) | Done | Auth | API only |
| | Streak Bonuses | Done | Auth | API only |
| | Leaderboard | Done | Auth | API only |
| | Tier System | Done | Auth | API only |
| **Account** | | | | |
| | Profile | Done | Auth | `/profile` |
| | Dashboard | Done | Auth | `/dashboard` |
| | Notifications | Done | Auth | `/notifications` |
| | Security Settings | Done | Auth | `/security` |
| | Tier Selection | Done | Auth | `/tier-selection` |
| | KYC Verification | Done | Auth | `/kyc` |
| | Aadhaar Verify | Done | Auth | `/aadhaar-verify` |
| | Verification | Done | Auth | `/verification` |
| | Complaints | Done | Auth | `/complaints` |
| | Feedback | Done | Auth | `/feedback` |
| | Saved Searches | Done | Auth | `/saved-searches` |
| | Recently Viewed | Done | Auth | `/recently-viewed` |
| **Admin** | | | | |
| | Admin Panel | Done | Admin | `/admin-panel` |
| | Analytics | Done | -- | `/analytics` |
| **Legal** | | | | |
| | Terms and Conditions | Done | -- | `/terms` |
| | Privacy Policy | Done | -- | `/privacy-policy` |
| | Refund Policy | Done | -- | `/refund-policy` |
| | Support Ticket Policy | Done | -- | `/support-ticket-policy` |

> Auth = Requires login. Admin = Requires admin/super_admin role. -- = Public access.

---

### Category-Native Marketplace

The core differentiator. MHub pivots its entire experience based on category context.

```mermaid
flowchart LR
    User["User selects category"] --> CM["CategoryModeContext"]
    CM --> Feed["Feed filters by category"]
    CM --> Search["Search scopes to category"]
    CM --> Cart["Cart shows category items"]
    CM --> Nav["Navbar adjusts subcategories"]
    CM --> Sell["Post form shows category fields"]
```

**How it works:**
- `CategoryModeContext` provides `activeApp`, `activeCategory`, and `categories` to all components
- `categoryModeFilters.js` utility builds matchers for filtering posts by active mode
- `GreenNavbar` dynamically adjusts subcategory dropdowns per category
- All API calls include category mode as query parameter via Axios interceptor
- Selection persists across sessions via localStorage

### Seller and Buyer Ratings

Two-dimensional rating system with category-specific dimensions:

**Seller Rating Categories:**
- Communication (responsiveness, clarity)
- Product Quality (accuracy vs listing)
- Value for Money (fair pricing)
- Shipping Speed (delivery timeliness)

**Buyer Rating Categories:**
- Communication (responsiveness)
- Fair Pricing (reasonable offer behavior)

**Features:**
- 1-5 star rating with half-star display
- Review text (title + comment)
- Helpful votes on reviews
- Seller responses to reviews
- Abuse flagging with auto-hide threshold
- Daily rate limit + update cooldown
- Moderation controls (admin hide/unhide)

**Components:** `StarRating.jsx`, `UserRatingProfile.jsx` (seller + buyer breakdown), `ReviewSummary` (bar chart distribution)

### Centre Pages

Professional business pages for sellers, similar to Facebook Pages or YouTube Channels:

**Features:**
- Tabbed interface: About, Listings, Updates, Reviews, Analytics
- Follow/unfollow system with follower counts
- Updates feed from followed Centre Pages
- Featured Centre Pages showcase on discovery
- Verification badge (Verified) and Premium badge
- Owner-only analytics dashboard
- Product listings grid with pagination
- Premium tier required to create

**Routes:** `/centre` (browse), `/centre/create` (new), `/centre/:id` (detail), `/centre/:id/listings` (products)

---

## Page Directory (All 68 Routes)

### Public Routes (No Authentication Required)

| # | Path | Component | Purpose |
|:-:|:-----|:----------|:--------|
| 1 | `/` | Redirect | Redirects to `/category-hub` |
| 2 | `/category-hub` | CategoryHubPage | Main landing page with category grid |
| 3 | `/all-posts` | AllPostsPage | Full discovery feed with filters |
| 4 | `/listings` | AllPostsPage | Alias for `/all-posts` |
| 5 | `/home` | HomePage | Curated home discovery page |
| 6 | `/for-you` | ForYouPage | Personalized recommendations |
| 7 | `/public-wall` | PublicWallPage | Community public wall |
| 8 | `/feed` | FeedPage | Social/community feed |
| 9 | `/feed/:id` | FeedPostDetailPage | Individual feed post |
| 10 | `/post/:id` | PostDetailPage | Listing detail page |
| 11 | `/listing/:id` | PostDetailPage | Alias for `/post/:id` |
| 12 | `/search` | SearchPage | Global search with filters |
| 13 | `/categories` | SubcategoriesPage | Category browser |
| 14 | `/subcategories` | SubcategoriesPage | Alias for `/categories` |
| 15 | `/categories/:slug` | Redirect | Redirects to `/all-posts` |
| 16 | `/category-mode` | Redirect | Redirects to `/category-hub` |
| 17 | `/channels` | ChannelsListPage | Browse all channels |
| 18 | `/channels/:id` | ChannelPage | Channel detail page |
| 19 | `/offers` | OffersPage | Deals and offers listing |
| 20 | `/reviews/:userId` | ReviewsPage | Public review page for a user |
| 21 | `/analytics` | AnalyticsPage | Public analytics dashboard |
| 22 | `/login` | LoginPage | User login |
| 23 | `/signup` | SignUpPage | User registration |
| 24 | `/invite/:code` | InviteRedirectPage | Referral invite handler |
| 25 | `/forgot-password` | ForgotPasswordPage | Password reset request |
| 26 | `/reset-password` | ResetPasswordPage | Password reset form |
| 27 | `/reset-password/:token` | ResetPasswordPage | Token-based reset |
| 28 | `/terms` | TermsPage | Terms and Conditions |
| 29 | `/t&c` | TermsPage | Alias for `/terms` |
| 30 | `/terms-and-conditions` | TermsPage | Alias for `/terms` |
| 31 | `/privacy-policy` | PrivacyPage | Privacy Policy |
| 32 | `/refund-policy` | RefundPage | Refund Policy |
| 33 | `/support-ticket-policy` | SupportTicketPage | Support Policy |
| 34 | `*` | Redirect | Catch-all redirects to `/category-hub` |

### Authenticated Routes (Login Required)

| # | Path | Component | Purpose |
|:-:|:-----|:----------|:--------|
| 35 | `/dashboard` | DashboardPage | Seller dashboard with stats |
| 36 | `/activity` | ActivityHubPage | Activity feed and notifications |
| 37 | `/profile` | ProfilePage | User profile with multi-tab layout |
| 38 | `/security` | SecuritySettingsPage | Password, 2FA, sessions, devices |
| 39 | `/add-post` | AddPostPage | Full listing creation flow |
| 40 | `/sell` | AddPostPage | Alias for `/add-post` |
| 41 | `/post-welcome` | PostWelcomePage | Post-creation onboarding |
| 42 | `/post_add` | PostAddPage | Quick post creation |
| 43 | `/feed/feedpostadd` | PostAddPage | Text-only feed post (no images) |
| 44 | `/edit-post/:postId` | EditPostPage | Edit existing listing |
| 45 | `/my-home` | MyHomePage | My listings management |
| 46 | `/my-posts` | MyHomePage | Alias for `/my-home` |
| 47 | `/tier-selection` | TierSelectionPage | Subscription tier picker |
| 48 | `/tiers` | TierSelectionPage | Alias for `/tier-selection` |
| 49 | `/pricing` | TierSelectionPage | Alias for `/tier-selection` |
| 50 | `/bought-posts` | BoughtPostsPage | Purchase history |
| 51 | `/sold-posts` | SoldPostsPage | Sales history |
| 52 | `/saledone` | SaledonePage | Sale completion confirmation |
| 53 | `/saleundone` | SaleUndonePage | Sale reversal flow |
| 54 | `/buyer-view` | BuyerViewPage | Buyer's order view |
| 55 | `/cart` | CartPage | Shopping cart |
| 56 | `/wishlist` | WishlistPage | Saved favorites with filters |
| 57 | `/recently-viewed` | RecentlyViewedPage | Browsing history |
| 58 | `/saved-searches` | SavedSearchesPage | Saved search queries |
| 59 | `/nearby` | NearbyPostsPage | GPS-based nearby listings |
| 60 | `/chat` | ProtectedChatPage | Realtime messaging |
| 61 | `/chats` | ProtectedChatPage | Alias for `/chat` |
| 62 | `/notifications` | NotificationsPage | Notification center |
| 63 | `/complaints` | ComplaintsPage | File and track complaints |
| 64 | `/feedback` | FeedbackPage | Submit product feedback |
| 65 | `/rewards` | RewardsPage | Rewards hub (5 tabs) |
| 66 | `/my-feed` | MyFeedPage | Personal feed management |
| 67 | `/centre` | ChannelsListPage | Browse Centre Pages (variant) |
| 68 | `/centre/create` | CreateChannelPage | Create a Centre Page |
| 69 | `/centre/:id` | ChannelPage | Centre Page detail (variant) |
| 70 | `/centre/:id/listings` | CentreListingsPage | Centre product listings |
| 71 | `/channels/create` | CreateChannelPage | Create a channel |
| 72 | `/verification` | VerificationPage | Identity verification |
| 73 | `/kyc` | KycVerificationPage | KYC document upload |
| 74 | `/aadhaar-verify` | AadhaarVerifyPage | Aadhaar verification flow |
| 75 | `/payment` | PaymentPage | Payment processing |

### Admin Routes (Admin Role Required)

| # | Path | Component | Roles |
|:-:|:-----|:----------|:------|
| 76 | `/admin-panel` | AdminPanelPage | admin, super_admin, superadmin |

---

## Page-by-Page Feature Map

### Discovery Pages

#### `/category-hub` -- Category Hub (Landing Page)

The main entry point. Displays a grid of all marketplace categories, each represented as a card with icon, name, and listing count.

**User perspective:** You land here first. Tap a category to enter that marketplace vertical. The entire app experience adjusts to your chosen category.

**Technical details:**
- Component: `CategoryHubPage`
- Auth: Public
- Data: Fetches categories from `/api/categories`
- Context: Sets `CategoryModeContext` on category selection
- State: Category selection persists in localStorage

#### `/all-posts` -- All Posts Discovery Feed

The primary marketplace feed showing all active listings. Supports infinite scroll, real-time search, multi-faceted filtering, and sorting.

**User perspective:** Scroll through listings. Filter by price, category, condition, location. Sort by newest, price, or relevance. Save items to wishlist, add to cart, or start a chat with the seller.

**Technical details:**
- Component: `AllPostsPage` (~2800 lines)
- Auth: Public (enhanced features with auth)
- API: `GET /api/posts` with query params for search, filters, sort, pagination
- Features: Infinite scroll via `useInfiniteScroll`, category mode filtering via `CategoryModeContext`, cursor-based pagination, search debounce, filter/sort persistence
- Cards: `GreenProductCard` with trust badge, price, location, seller info
- Performance: Lazy image loading, virtualized grid, deduplication

#### `/for-you` -- Personalized Recommendations

AI-powered personalized feed based on user behavior, preferences, and interaction history.

**User perspective:** See listings curated for you based on your browsing history, saved searches, and category preferences.

**Technical details:**
- Component: `ForYouPage`
- Auth: Public (personalized when logged in)
- API: `GET /api/recommendations`
- Features: Behavior-based recommendation engine, category affinity scoring

#### `/nearby` -- Nearby Posts (Location-Based)

Location-based listing discovery using device GPS. Shows listings within a selectable radius, sorted by distance.

**User perspective:** See what is being sold near you. Adjust the radius from 1 km to 100 km. Each listing shows its distance from your current location.

**Technical details:**
- Component: `NearbyPostsPage`
- Auth: Required
- API: `GET /api/nearby?lat={lat}&long={lng}&radius={km}`
- Context: Uses `LocationContext` for GPS coordinates
- Features: Radius selector (1, 2, 5, 10, 25, 50, 100 km), distance badges on cards, location permission handling, category mode filtering
- Native: Uses Capacitor GPS bridge on mobile

#### `/search` -- Global Search

Full-text search across all listings with rich filtering, autocomplete suggestions, and search history.

**User perspective:** Type to search. Results update in real-time. Filter by price range, category, location, condition. Save searches for price alerts.

**Technical details:**
- Component: `SearchPage`
- Auth: Public
- API: `GET /api/posts` with `q` parameter
- Features: Debounced search, saved search integration, filter persistence, search history

#### `/feed` -- Community Feed

Social-style feed for community updates, discussions, and text posts. Similar to a social media timeline.

**User perspective:** Browse community posts, like and comment, share updates. Post text updates (no product listing required).

**Technical details:**
- Component: `FeedPage`
- Auth: Public (posting requires auth)
- API: `GET /api/feed`
- Hooks: `useFeed` for infinite scroll and real-time updates

#### `/public-wall` -- Public Wall

Open community board for public announcements, discussions, and community engagement.

**Technical details:**
- Component: `PublicWallPage`
- Auth: Public
- API: `GET /api/publicwall` or `GET /api/public-wall`

#### `/offers` -- Deals and Offers

Curated deals, flash sales, and special offers from sellers.

**Technical details:**
- Component: `OffersPage`
- Auth: Public
- API: `GET /api/offers`
- Hooks: `useOffers`

### Listing Pages

#### `/post/:id` -- Listing Detail

Full listing detail page with images, description, pricing, seller info, trust badges, and action buttons (buy, chat, save).

**User perspective:** See all details about a listing. View the seller's trust score, ratings, and verification badges. Start a chat, make an offer, or buy directly. See similar listings below.

**Technical details:**
- Component: `PostDetailPage`
- Auth: Public (actions require auth)
- API: `GET /api/posts/:id` with trust data enrichment
- Features: Image gallery with lightbox, seller trust badges, review summary, similar listings, share functionality, price history, report listing
- Trust: Displays computed trust score from `trustScoreService`

#### `/add-post` -- Create Listing

Guided multi-step listing creation flow with category-aware fields.

**User perspective:** Create a new listing. Select category, add title, description, price, images, location, condition. The form adapts based on the selected category.

**Technical details:**
- Component: `AddPostPage`
- Auth: Required
- API: `POST /api/posts`
- Middleware: `validatePost` for server-side validation
- Features: Image upload via Cloudinary, location picker, category-specific fields, tier-based posting limits
- Aliases: `/sell` points here

#### `/edit-post/:postId` -- Edit Listing

Edit an existing listing with pre-populated form data.

**Technical details:**
- Component: `EditPostPage`
- Auth: Required (must be post owner)
- API: `PATCH /api/posts/:id`

#### `/my-home` -- My Listings

Management dashboard for all of the user's listings with status tabs, quick actions, and analytics summary.

**User perspective:** See all your listings in one place. Filter by active, sold, or expired. Quick-edit, boost, or delete. See views and engagement stats.

**Technical details:**
- Component: `MyHomePage`
- Auth: Required
- API: `GET /api/posts/my`
- Aliases: `/my-posts`

### Commerce Pages

#### `/cart` -- Shopping Cart

Full shopping cart with quantity management, price totals, and checkout flow.

**Technical details:**
- Component: `CartPage`
- Auth: Required
- Context: `CartContext` for global cart state
- API: `GET/POST/DELETE /api/cart`

#### `/wishlist` -- Saved Favorites

Wishlist management with search, sort, filter, bulk actions, and real-time sync.

**User perspective:** All your saved items in one place. Search within your wishlist, sort by price or date, filter by status. Select multiple items to add to cart or remove at once. Toggle between grid and list view.

**Technical details:**
- Component: `WishlistPage`
- Auth: Required
- API: `GET /api/wishlist` with params for search, sort, filter, cursor
- Features: Cursor-based pagination (24 items per page), deduplication, bulk select/remove/add-to-cart, grid/list toggle, wishlist sync via `subscribeSavedPosts`, undo removal via toast action, category mode filtering
- Hero: Premium glass-morphism hero card with gradient background

#### `/bought-posts` -- Purchase History

Complete purchase history with order details and seller info.

**Technical details:**
- Component: `BoughtPostsPage`
- Auth: Required

#### `/sold-posts` -- Sales History

Complete sales history with buyer info and transaction details.

**Technical details:**
- Component: `SoldPostsPage`
- Auth: Required

#### `/saledone` -- Sale Completion

Confirms a sale transaction. Triggers coin rewards and updates transaction status.

**Technical details:**
- Component: `SaledonePage`
- Auth: Required
- API: `POST /api/sale/confirm`
- Side effects: Rewards via `transactionRewardService`, referral chain rewards via `referralChainRewards`

#### `/saleundone` -- Sale Reversal

Reverses a completed sale, handling refund flow and inventory restoration.

**Technical details:**
- Component: `SaleUndonePage`
- Auth: Required
- API: `POST /api/sale/undo`

#### `/payment` -- Payment Processing

Payment flow for purchases and subscription upgrades.

**Technical details:**
- Component: `PaymentPage`
- Auth: Required
- API: `POST /api/payments`
- Service: `paymentGateway.js`, `paymentReconciliationService.js`

### Social Pages

#### `/chat` -- Realtime Messaging

Full-featured chat interface with real-time message delivery, read receipts, and conversation management.

**User perspective:** Message buyers and sellers directly. See when messages are read. Conversations are organized by listing.

**Technical details:**
- Component: `ProtectedChatPage`
- Auth: Required
- API: `GET/POST /api/chat`
- Realtime: Socket.IO rooms per conversation
- Hooks: `useRealtimeChat` for message subscription
- Aliases: `/chats`

#### `/channels` and `/channels/:id` -- Channels

Browse and view community channels for discussions and updates.

**Technical details:**
- Component: `ChannelsListPage`, `ChannelPage`
- Auth: Public (creating/posting requires auth)
- API: `GET /api/channels`, `GET /api/channel/:id`

#### `/centre` -- Centre Pages

Professional business pages for sellers (similar to Facebook Pages / YouTube Channels).

**User perspective:** Browse seller pages with their listings, updates, reviews, and about info. Follow pages to get updates in your feed.

**Technical details:**
- Component: `ChannelsListPage` (variant="centre")
- Auth: Required
- API: `GET /api/channel?variant=centre`
- Tabs: About (stats, description, contact), Listings, Updates, Reviews, Analytics (owner-only)
- Components: `CentrePageTabs`, `CentrePageAnalytics`, `CentreVerificationBadge`
- Features: Follow/unfollow, featured showcase, verification badges, premium creation gate

#### `/reviews/:userId` -- User Reviews

Public review page showing all reviews for a specific user (both as seller and buyer).

**Technical details:**
- Component: `ReviewsPage`
- Auth: Public
- API: `GET /api/reviews/user/:userId`, `GET /api/reviews/stats/:userId`
- Features: Star distribution chart, category breakdown, helpful votes

### Rewards and Gamification

#### `/rewards` -- Rewards Hub

The gamification center with 5 tabs: Overview, Network, Earn, Store, and History.

**User perspective:** See your coin balance (with Rs equivalent), tier progress, referral code, and all ways to earn. The Network tab shows your referral tree. Earn tab lists daily actions. History shows transaction log.

**Technical details:**
- Component: `RewardsPage`
- Auth: Required
- API: `GET /api/coins/rewards-config`, `GET /api/coins/wallet-stats`
- Tabs:
  - **Overview:** Balance card with Rs conversion, tier progress bar, referral code share, achievement badges
  - **Network:** `ReferralChainTree` component showing 5-level referral hierarchy with color-coded depth
  - **Earn:** Daily check-in, spin wheel, scratch cards, streak progress, action list
  - **Store:** Coin redemption marketplace (coming)
  - **History:** Transaction ledger with filters
- Coin display: `coinConversion.js` utility (100 coins = Rs 1)

### Account and Settings

#### `/profile` -- User Profile

Multi-tab user profile with personal info, settings, and activity summary.

**User perspective:** View and edit your profile. See your average rating, trust score, and verification status. Manage preferences, linked accounts, and notification settings.

**Technical details:**
- Component: `ProfilePage`
- Auth: Required
- API: `GET /api/profile`, `GET /api/reviews/stats/:userId`, `GET /api/posts/trust/:userId`
- Features: Avatar upload, trust score display, rating summary, review count, link to Centre Page

#### `/dashboard` -- Seller Dashboard

Analytics dashboard for sellers with listing performance, engagement metrics, and revenue tracking.

**Technical details:**
- Component: `DashboardPage`
- Auth: Required
- API: `GET /api/dashboard`, `GET /api/seller-analytics`

#### `/security` -- Security Settings

Comprehensive security management: password change, 2FA setup, active sessions, trusted devices.

**Technical details:**
- Component: `SecuritySettingsPage`
- Auth: Required
- API: `POST /api/auth/change-password`, `GET/POST /api/auth/2fa`
- Features: TOTP 2FA setup, session management, device list, passkey registration

#### `/notifications` -- Notifications

Notification center with categorized alerts (orders, messages, rewards, system).

**Technical details:**
- Component: `NotificationsPage`
- Auth: Required
- API: `GET /api/notifications`
- Hooks: `useNotifications`
- Realtime: Socket.IO push for new notifications

#### `/complaints` -- Complaints

File and track complaints against sellers or listings. SLA tracking with breach detection.

**Technical details:**
- Component: `ComplaintsPage`
- Auth: Required
- API: `GET /api/complaints/my`, `POST /api/complaints`
- Features: Complaint types, severity levels, evidence upload, SLA timer, status history, admin response

#### `/tier-selection` -- Posting Plans

Subscription tier picker for sellers. Each tier unlocks different posting limits, visibility boosts, and features.

**Technical details:**
- Component: `TierSelectionPage`
- Auth: Required
- API: `GET /api/tiers`, `POST /api/subscriptions`
- Aliases: `/tiers`, `/pricing`

#### `/kyc` and `/aadhaar-verify` -- Verification

Identity verification flows: KYC document upload and Aadhaar-based verification.

**Technical details:**
- Components: `KycVerificationPage`, `AadhaarVerifyPage`
- Auth: Required
- API: `POST /api/aadhaar/verify`
- Service: `AadhaarService.js`, `kycAutomationService.js`

### Admin

#### `/admin-panel` -- Admin Panel

Full admin dashboard for platform management: user management, listing moderation, complaint resolution, analytics.

**Technical details:**
- Component: `AdminPanelPage`
- Auth: Required (roles: admin, super_admin, superadmin)
- API: `GET /api/admin/dashboard`, various admin endpoints
- Guard: `RequireAuth` with `requiredRoles` prop

---

## Navigation Architecture

### GreenNavbar (Primary Navigation)

The main navigation component that adapts to screen size and context:

```mermaid
flowchart TB
    subgraph Desktop["Desktop Navigation (top bar)"]
        Logo --> Search
        Search --> NavLinks["All Posts | For You | Feed | Channels"]
        NavLinks --> Actions["Cart | Wishlist | Notifications | Profile"]
    end

    subgraph Mobile["Mobile Navigation (bottom bar)"]
        Home["Home"] --> Explore["Explore"]
        Explore --> Sell["Sell (+)"]
        Sell --> Chat["Chat"]
        Chat --> Profile2["Profile"]
    end
```

**Key behaviors:**
- Dynamic subcategory dropdowns based on active category mode
- Badge counts for cart, notifications, and chat
- Auth-aware: shows Login/Signup for unauthenticated users
- Responsive: collapses to bottom navigation bar on mobile
- Category mode indicator in nav when active

### Route Guards

```mermaid
flowchart TD
    Request["Page Request"] --> RequireAuth{"RequireAuth?"}
    RequireAuth -->|"No"| Public["Render Page"]
    RequireAuth -->|"Yes"| CheckAuth{"Is Authenticated?"}
    CheckAuth -->|"No"| Login["Redirect to /login<br/>with returnTo"]
    CheckAuth -->|"Yes"| CheckRole{"Role Required?"}
    CheckRole -->|"No"| Render["Render Page"]
    CheckRole -->|"Yes"| HasRole{"Has Required Role?"}
    HasRole -->|"Yes"| Render
    HasRole -->|"No"| Forbidden["Redirect to /"]
```

---

## Authentication and Access Control

### Auth Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client
    participant A as /api/auth
    participant DB as Database
    participant R as Redis

    Note over U,R: Registration
    U->>C: Fill signup form
    C->>A: POST /api/auth/signup
    A->>DB: Create user + profile
    A->>A: Hash password (Argon2)
    A->>A: Generate JWT + refresh token
    A-->>C: { accessToken, refreshToken, user }
    C->>C: Store tokens (authStorage.js)

    Note over U,R: Login
    U->>C: Enter credentials
    C->>A: POST /api/auth/login
    A->>A: Verify password
    A->>A: Check 2FA requirement
    A->>R: Create session
    A-->>C: { accessToken, refreshToken }

    Note over U,R: Token Refresh
    C->>A: POST /api/auth/refresh
    A->>A: Verify refresh token
    A->>A: Rotate refresh token
    A-->>C: { newAccessToken, newRefreshToken }

    Note over U,R: Passkey (WebAuthn)
    U->>C: Tap "Sign in with Passkey"
    C->>A: POST /api/auth/webauthn/login/options
    A-->>C: Challenge
    C->>C: navigator.credentials.get()
    C->>A: POST /api/auth/webauthn/login/verify
    A-->>C: { accessToken, refreshToken }
```

### Authentication Methods

| Method | Implementation | Security |
|:-------|:---------------|:---------|
| Email + Password | Argon2 hashing, bcrypt fallback | Memory-hard, timing-safe comparison |
| OTP (One-Time Password) | `otpService.js`, `otpDeliveryService.js` | Rate-limited, time-bound |
| WebAuthn / Passkeys | `SimpleWebAuthn`, FIDO2 standard | Phishing-resistant, device-bound |
| Two-Factor (TOTP) | `twoFactorController.js` | 6-digit rotating code, backup codes |
| JWT + Refresh | Short-lived access (15 min), long refresh | Automatic rotation, revocation support |

### Role-Based Access Control

| Role | Access Level | Capabilities |
|:-----|:-------------|:-------------|
| user | Standard | Browse, buy, sell, chat, rewards |
| seller | Enhanced | Centre Pages, analytics, boost |
| admin | Administrative | User management, moderation |
| super_admin | Full | All admin + system configuration |

### Security Middleware Chain

Every API request passes through this pipeline in order:

1. **Helmet** -- Security headers (CSP, HSTS, X-Frame-Options)
2. **CORS** -- Origin validation against allowlist
3. **Rate Limiter** -- Request flood protection
4. **WAF Enforcement** -- Payload scanning for injection patterns
5. **VPN Blocker** -- Proxy and VPN detection
6. **Request Logger** -- Audit trail
7. **Zero-Trust Gate** -- Device and session verification
8. **Tenant Context** -- Multi-tenant isolation
9. **Optional Auth** -- JWT extraction (non-blocking)
10. **Risk Restrictions** -- Dynamic risk-based access control
11. **Auth (per-route)** -- JWT verification + user resolution
12. **RBAC (per-route)** -- Role-based permission check
13. **Device Binding** -- Session-device pinning verification

---

## API Reference (57 Endpoint Groups)

### Authentication

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| POST | `/api/auth/signup` | -- | Register new user |
| POST | `/api/auth/login` | -- | Login with credentials |
| POST | `/api/auth/logout` | Yes | Terminate session |
| POST | `/api/auth/refresh` | -- | Refresh access token |
| GET | `/api/auth/me` | Yes | Get current user |
| POST | `/api/auth/forgot-password` | -- | Request password reset |
| POST | `/api/auth/reset-password` | -- | Reset password with token |
| POST | `/api/auth/change-password` | Yes | Change current password |
| POST | `/api/auth/2fa/setup` | Yes | Initialize TOTP 2FA |
| POST | `/api/auth/2fa/verify` | Yes | Verify 2FA code |
| POST | `/api/auth/webauthn/register` | Yes | Register passkey |
| POST | `/api/auth/webauthn/login/options` | -- | Get passkey challenge |
| POST | `/api/auth/webauthn/login/verify` | -- | Verify passkey response |

### Posts (Listings)

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/posts` | -- | List/search posts with filters |
| GET | `/api/posts/:id` | -- | Get post detail |
| POST | `/api/posts` | Yes | Create new listing |
| PATCH | `/api/posts/:id` | Yes | Update listing |
| DELETE | `/api/posts/:id` | Yes | Delete listing |
| GET | `/api/posts/my` | Yes | Get user's own posts |
| GET | `/api/posts/trust/:userId` | -- | Get user trust data |
| POST | `/api/posts/:id/boost` | Yes | Boost listing visibility |

### Commerce

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/cart` | Yes | Get cart items |
| POST | `/api/cart` | Yes | Add item to cart |
| DELETE | `/api/cart/:id` | Yes | Remove from cart |
| GET | `/api/wishlist` | Yes | Get wishlist |
| POST | `/api/wishlist` | Yes | Add to wishlist |
| DELETE | `/api/wishlist/:postId` | Yes | Remove from wishlist |
| GET | `/api/wishlist/check/:postId` | Yes | Check if post is wishlisted |
| GET | `/api/offers` | -- | Get offers/deals |
| POST | `/api/offers` | Yes | Create an offer |
| POST | `/api/sale/confirm` | Yes | Confirm a sale |
| POST | `/api/sale/undo` | Yes | Reverse a sale |
| GET | `/api/transactions` | Yes | Transaction history |
| POST | `/api/payments` | Yes | Process payment |
| GET | `/api/price-alerts` | Yes | Get price alerts |
| POST | `/api/price-alerts` | Yes | Set price alert |
| GET | `/api/price-history/:postId` | -- | Price history for listing |

### Social

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/chat` | Yes | Get conversations |
| POST | `/api/chat` | Yes | Send message |
| GET | `/api/channel` | -- | List channels |
| POST | `/api/channel` | Yes | Create channel |
| GET | `/api/channel/:id` | -- | Get channel detail |
| POST | `/api/channel/:id/follow` | Yes | Follow channel |
| DELETE | `/api/channel/:id/follow` | Yes | Unfollow channel |
| GET | `/api/channel/updates/following` | Yes | Updates from followed |
| GET | `/api/feed` | -- | Get community feed |
| POST | `/api/feed` | Yes | Create feed post |
| GET | `/api/publicwall` | -- | Public wall posts |
| GET | `/api/contacts` | Yes | Contact list |

### Reviews and Ratings

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/reviews/user/:userId` | -- | Reviews for user |
| GET | `/api/reviews/buyer/:userId` | -- | Buyer reviews |
| GET | `/api/reviews/stats/:userId` | -- | Rating statistics |
| POST | `/api/reviews` | Yes | Create/update review |
| PATCH | `/api/reviews/:id/helpful` | Yes | Mark review helpful |
| POST | `/api/reviews/:id/respond` | Yes | Seller response |
| POST | `/api/reviews/:id/flag` | Yes | Flag abusive review |
| DELETE | `/api/reviews/:id` | Yes | Delete review |

### Rewards and Coins

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/rewards` | Yes | User rewards summary |
| GET | `/api/rewards/tiers` | -- | Tier definitions |
| GET | `/api/rewards/leaderboard` | -- | Public leaderboard |
| POST | `/api/rewards/checkin` | Yes | Daily check-in |
| POST | `/api/rewards/spin` | Yes | Spin the wheel |
| POST | `/api/rewards/scratch` | Yes | Scratch card |
| GET | `/api/coins/wallet-stats` | Yes | Coin balance + stats |
| GET | `/api/coins/rewards-config` | Yes | Full rewards config |
| GET | `/api/coins/transactions` | Yes | Coin transaction log |
| GET | `/api/wallet` | Yes | Wallet overview |

### Referrals

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/referral` | Yes | Referral info + stats |
| GET | `/api/referral/tree` | Yes | Referral tree (5 levels) |
| GET | `/api/referral/list` | Yes | Flat referral list |
| GET | `/api/referral/transactions` | Yes | Referral reward log |
| GET | `/api/referral/chain-status` | Yes | Per-referral status |
| GET | `/api/referral/leaderboard` | -- | Top referrers |
| POST | `/api/referral/create` | Yes | Generate referral code |
| POST | `/api/referral/track` | -- | Track referral (captcha) |

### User and Profile

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/profile` | Yes | Get user profile |
| PATCH | `/api/profile` | Yes | Update profile |
| GET | `/api/users/:id` | -- | Public user info |
| POST | `/api/aadhaar/verify` | Yes | Aadhaar verification |
| GET | `/api/gdpr/export` | Yes | GDPR data export |
| DELETE | `/api/gdpr/delete` | Yes | GDPR data deletion |

### Notifications and Push

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/notifications` | Yes | Get notifications |
| PATCH | `/api/notifications/:id/read` | Yes | Mark as read |
| POST | `/api/push/subscribe` | Yes | Push subscription |
| DELETE | `/api/push/subscribe` | Yes | Unsubscribe push |

### Discovery and Search

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/categories` | -- | All categories |
| GET | `/api/subcategories` | -- | Subcategories |
| GET | `/api/nearby` | Yes | Nearby posts (lat/lng/radius) |
| GET | `/api/recommendations` | Yes | Personalized recommendations |
| GET | `/api/recently-viewed` | Yes | Browsing history |
| GET | `/api/saved-searches` | Yes | Saved search queries |
| POST | `/api/saved-searches` | Yes | Save a search |
| GET | `/api/brands` | -- | Brand listing |
| GET | `/api/products` | -- | Product catalog |
| GET | `/api/translation` | -- | Auto-translation |

### Subscriptions and Tiers

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/tiers` | -- | Available posting tiers |
| GET | `/api/subscriptions` | Yes | User subscriptions |
| POST | `/api/subscriptions` | Yes | Purchase subscription |
| GET | `/api/seller-analytics` | Yes | Seller performance data |

### Admin and Platform Operations

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/admin/dashboard` | Admin | Admin analytics |
| GET | `/api/admin` | Admin | Admin operations |
| GET | `/api/analytics` | -- | Public analytics |
| GET | `/api/complaints` | Admin | All complaints (admin) |
| GET | `/api/complaints/my` | Yes | User's own complaints |
| POST | `/api/complaints` | Yes | File complaint |
| PATCH | `/api/complaints/:id/status` | Admin | Update complaint status |
| POST | `/api/feedback` | Yes | Submit feedback |
| GET | `/api/cms` | -- | CMS content |
| POST | `/api/telemetry` | -- | Event ingestion |

### Infrastructure

| Method | Endpoint | Auth | Purpose |
|:-------|:---------|:----:|:--------|
| GET | `/api/location` | -- | Location services |
| GET | `/api/v1/location` | -- | Location verification |
| POST | `/api/device-lifecycle` | Yes | Device provisioning |
| GET | `/api/fleet-orchestration` | Admin | Service fleet management |
| GET | `/api/security-operations` | Admin | Security operations |
| GET | `/api/reliability` | Admin | DR/backup controls |
| GET | `/api/operator-platform` | Admin | Operator workflows |
| GET | `/api/intelligence-finops` | Admin | Cost optimization |
| GET | `/api/launch-governance` | Admin | Launch readiness |
| GET | `/api/automation` | Admin | Automation rules |

---

## Database Schema

### Core Tables

```mermaid
erDiagram
    users ||--o{ posts : "creates"
    users ||--o| profiles : "has"
    users ||--o{ wishlists : "saves"
    users ||--o{ transactions : "buys/sells"
    users ||--o{ reviews : "writes"
    users ||--o{ complaints : "files"
    users ||--o{ referral_rewards : "earns"
    posts ||--o{ wishlists : "saved_in"
    posts ||--o{ transactions : "sold_via"
    posts }o--|| categories : "belongs_to"
    posts }o--o| subcategories : "scoped_to"

    users {
        serial user_id PK
        varchar username
        varchar name
        varchar email
        text password_hash
        varchar phone
        decimal rating
        integer trust_score
        integer referred_by FK
        timestamp created_at
    }

    profiles {
        serial profile_id PK
        integer user_id FK
        varchar full_name
        text bio
        varchar avatar_url
        varchar location
        timestamp updated_at
    }

    posts {
        serial post_id PK
        integer user_id FK
        varchar title
        decimal price
        text description
        integer category_id FK
        integer subcategory_id FK
        text location
        jsonb images
        varchar condition
        varchar status
        timestamp created_at
    }

    categories {
        serial category_id PK
        varchar name
        varchar slug
        varchar icon
        varchar category_group
    }

    subcategories {
        serial subcategory_id PK
        integer category_id FK
        varchar name
        varchar slug
    }

    transactions {
        serial transaction_id PK
        integer buyer_id FK
        integer seller_id FK
        integer post_id FK
        decimal agreed_price
        varchar status
        text otp_hash
        timestamp completed_at
    }

    wishlists {
        serial wishlist_id PK
        integer user_id FK
        integer post_id FK
        text notes
        timestamp created_at
    }
```

### Rewards and Gamification Tables

```mermaid
erDiagram
    users ||--o| rewards : "has_balance"
    users ||--o{ reward_log : "earns"
    users ||--o{ daily_checkins : "checks_in"
    users ||--o{ spin_history : "spins"
    users ||--o{ scratch_claims : "scratches"
    users ||--o{ referral_rewards : "referred"
    users ||--o{ user_streaks : "streaks"

    rewards {
        integer user_id PK
        integer points
        varchar tier
    }

    reward_log {
        serial id PK
        integer user_id FK
        varchar action
        integer points
        text description
        timestamp created_at
    }

    reward_idempotency {
        serial id PK
        integer user_id FK
        varchar idempotency_key
        varchar action
        integer points_delta
    }

    daily_checkins {
        integer user_id PK
        date last_checkin_date
        integer streak
        integer best_streak
    }

    spin_history {
        serial id PK
        integer user_id FK
        date spin_date
        integer reward_amount
    }

    scratch_claims {
        serial id PK
        integer user_id FK
        integer referral_user_id FK
        integer reward_amount
    }

    referral_rewards {
        integer referrer_id FK
        integer referred_user_id FK
        integer level
        integer reward_coins
    }

    referral_closure {
        integer ancestor_id FK
        integer descendant_id FK
        integer depth
    }

    user_streaks {
        integer user_id PK
        integer visit_streak
        integer post_streak
        date last_visit_date
    }
```

### Reviews and Trust Tables

```
reviews
  - review_id (PK)
  - reviewer_id (FK -> users)
  - reviewed_user_id (FK -> users)
  - post_id (FK -> posts)
  - review_type (seller/buyer)
  - rating (1-5)
  - title, comment
  - communication_rating, quality_rating, value_rating, shipping_rating
  - is_hidden, flag_count, abuse_score
  - seller_response, seller_responded_at
  - created_at, updated_at

review_flags
  - flag_id (PK)
  - review_id (FK)
  - flagger_id (FK -> users)
  - reason
  - created_at

helpful_votes
  - vote_id (PK)
  - review_id (FK)
  - user_id (FK)
  - created_at

complaints
  - complaint_id (PK)
  - buyer_id, seller_id, post_id
  - complaint_type, description
  - status, severity
  - evidence_metadata (JSONB)
  - sla_due_at, sla_breached_at
  - status_history (JSONB)
  - admin_response, resolved_by, resolved_at
```

### Other Core Tables

```
channels               -- Centre Pages and community channels
channel_followers      -- Follow/unfollow relationships
channel_updates        -- Posts from channels
notifications          -- User notification queue
cart_items             -- Shopping cart persistence
recently_viewed        -- Browsing history tracking
saved_searches         -- Search query persistence
price_alerts           -- Price drop notifications
login_history          -- Auth audit trail
user_sessions          -- Active session tracking
user_devices           -- Device binding records
webauthn_credentials   -- FIDO2 passkey storage
subscription_plans     -- Tier definitions
user_subscriptions     -- Active subscriptions
coin_transactions      -- Coin ledger (with expires_at, remaining for FIFO)
```

---

## Middleware Pipeline (40 Layers)

### Global API Middleware (Applied to All Routes)

| Order | Middleware | File | Purpose |
|:-----:|:-----------|:-----|:--------|
| 1 | Helmet | (express config) | Security headers: CSP, HSTS, X-Frame |
| 2 | CORS | (express config) | Origin validation against allowlist |
| 3 | Body Parser | (express config) | JSON/URL-encoded body parsing |
| 4 | VPN Enforcement | `vpnEnforcement.js` | Block requests from VPN/proxy |
| 5 | Activity Tracker | `activityTracker.js` | Track user activity for analytics |
| 6 | Runtime Budget | `runtimeBudget.js` | Request timeout enforcement |
| 7 | API Contract | `apiContract.js` | Validate request structure |
| 8 | Zero-Trust Gate | `zeroTrust.js` | Device + session verification |
| 9 | Tenant Context | `tenantContext.js` | Multi-tenant isolation |
| 10 | Optional Auth | `auth.js` | JWT extraction (non-blocking) |
| 11 | Risk Restrictions | `riskRestrictions.js` | Dynamic risk-based throttling |

### Per-Route Middleware

| Middleware | File | Purpose |
|:-----------|:-----|:--------|
| Auth (protect) | `auth.js` | JWT verification, user resolution |
| RBAC | `rbac.js` | Role-based permission check |
| WAF | `wafEnforcement.js` | SQL injection, XSS, payload scanning |
| Rate Limiter | `rateLimiter.js` | Per-endpoint rate limiting |
| Enhanced Rate Limiter | `enhancedRateLimiter.js` | Adaptive rate limiting |
| CSRF | `csrf.js` | State-changing operation protection |
| Device Binding | `deviceBinding.js` | Session-device pin verification |
| Device Binding Post-Auth | `deviceBindingPostAuth.js` | Post-login device association |
| Captcha | `captcha.js` | CAPTCHA verification for sensitive ops |
| Image Upload | `upload.js` | Multer file upload handling |
| Image Optimizer | `imageOptimizer.js` | Auto resize/compress on upload |
| Image Processor | `imageProcessor.js` | Format conversion |
| Validate Post | `validatePost.js` | Listing data validation |
| Validate User | `validateUser.js` | User data validation |
| Validators | `validators.js` | Generic input validation |
| Fraud Check | `fraudCheck.js` | Real-time fraud scoring |
| Breach Check | `breachCheck.js` | Credential breach detection |
| VPN Blocker | `vpnBlocker.js` | VPN/proxy IP blocking |
| Auth Anomaly Throttle | `authAnomalyThrottle.js` | Unusual auth pattern detection |
| Auth Audit | `authAuditMiddleware.js` | Auth event logging |
| Auth Logger | `authLogger.js` | Detailed auth logging |
| Auth Response Hardening | `authResponseHardening.js` | Strip sensitive data from responses |
| Auth Session Retention | `authSessionRetentionMiddleware.js` | Session cleanup |
| Adaptive MFA | `adaptiveMfaLogin.js` | Risk-based MFA triggering |
| Device Identity | `deviceIdentity.js` | Device fingerprint validation |
| Device Tracker | `deviceTracker.js` | Track device for binding |
| Geo Alert | `geoAlert.js` | Geolocation anomaly detection |
| Request Logger | `requestLogger.js` | Full audit trail |
| Revoke Access Token | `revokeCurrentAccessToken.js` | Token revocation |
| Security | `security.js` | General security utilities |
| Tenant Write Guard | `tenantContext.js` | Write operation tenant check |
| Two-Factor | `twoFactor.js` | 2FA verification gate |
| Error Handler | `errorHandler.js` | Global error response formatting |

---

## Service Layer (64 Services)

### Rewards and Gamification Services

| Service | Purpose |
|:--------|:--------|
| `rewardsLedgerService.js` | Idempotent point mutations with deduplication |
| `referralJoinRewards.js` | 5-level join rewards (L1=100, L2=40, L3=20, L4=10, L5=5 coins) |
| `referralChainRewards.js` | Activity-triggered chain rewards (posting, transactions) |
| `streakRewardsService.js` | Visit streak and post streak tracking with bonuses |
| `leaderboardRewardsService.js` | Weekly leaderboard calculation and reward distribution |
| `transactionRewardService.js` | Transaction completion coin rewards |
| `rewardsRealtimeService.js` | SSE push for real-time rewards updates |
| `coinHooks.js` | Coin-related event hooks for cross-service integration |

### Trust and Safety Services

| Service | Purpose |
|:--------|:--------|
| `trustScoreService.js` | Multi-signal trust score computation |
| `trustBadgeService.js` | Trust badge assignment and display logic |
| `fraudService.js` | Fraud detection and pattern matching |
| `riskEngine.js` | Real-time risk scoring engine |
| `riskEngineService.js` | Risk engine orchestration |
| `riskStateService.js` | Risk state management |
| `riskTelemetryService.js` | Risk event telemetry |
| `mlFraudScoringService.js` | ML-based fraud scoring |
| `flagAuditService.js` | Content flagging audit trail |

### Authentication Services

| Service | Purpose |
|:--------|:--------|
| `otpService.js` | One-time password generation and verification |
| `otpDeliveryService.js` | OTP delivery via SMS/email |
| `twoFactorPolicyService.js` | 2FA enforcement policies |
| `twoFactorValidationService.js` | 2FA code validation |
| `accessTokenPolicyService.js` | Token lifecycle management |
| `tokenVerificationCache.js` | JWT verification caching |
| `authAuditService.js` | Auth event auditing |
| `authSessionRetentionService.js` | Session lifecycle management |

### Infrastructure Services

| Service | Purpose |
|:--------|:--------|
| `cacheService.js` | Redis cache with stampede protection |
| `cacheWarming.js` | Cache pre-warming on startup |
| `emailService.js` | Email delivery |
| `imageService.js` | Image processing (Sharp) |
| `fcm.js` | Firebase Cloud Messaging |
| `socketService.js` | Socket.IO server management |
| `searchService.js` | PostgreSQL full-text search |
| `notificationEmitter.js` | Cross-service notification dispatch |

### Platform Operations Services

| Service | Purpose |
|:--------|:--------|
| `featureFlagService.js` | Feature flag management |
| `automationEngineService.js` | Rule-based automation |
| `telemetryPipelineService.js` | Event ingestion pipeline |
| `deviceLifecycleService.js` | Device provisioning |
| `fleetOrchestrationService.js` | Service fleet management |
| `reliabilityOpsService.js` | DR and backup operations |
| `securityTrustOpsService.js` | Security operations |
| `operatorPlatformService.js` | Operator workflows |
| `intelligenceFinopsService.js` | Cost optimization |
| `launchGovernanceService.js` | Launch readiness checks |
| `foundationGuardService.js` | Schema and foundation health |
| `schemaGuard.js` | Runtime schema validation |
| `readinessService.js` | Health check probes |
| `failoverSafetyService.js` | Failover orchestration |

### Business Logic Services

| Service | Purpose |
|:--------|:--------|
| `AadhaarService.js` | Aadhaar KYC verification |
| `PanService.js` | PAN verification |
| `ChannelService.js` | Channel/Centre business logic |
| `paymentGateway.js` | Payment processing |
| `paymentReconciliationService.js` | Payment reconciliation |
| `subscriptionNotifications.js` | Subscription event alerts |
| `subscriptionSchemaService.js` | Subscription data management |
| `kycAutomationService.js` | Automated KYC processing |
| `locationVerificationService.js` | GPS location verification |
| `locationRetentionService.js` | Location data management |
| `postViewBufferService.js` | View count buffering |
| `ipInfoService.js` | IP geolocation lookup |
| `vpnDetection.js` | VPN/proxy detection service |
| `errorReporter.js` | Error aggregation and reporting |
| `auditLogger.js` | Structured audit logging |

---

## Component Library

### Core UI Components

| Component | Purpose |
|:----------|:--------|
| `GreenNavbar.jsx` | Primary navigation (responsive top/bottom bar) |
| `GreenProductCard.jsx` | Listing card with image, price, trust badge |
| `CompactProductCard.jsx` | Compact listing card for grids |
| `StarRating.jsx` | Interactive 1-5 star rating with half-star support |
| `RequireAuth.jsx` | Auth guard HOC with role support |
| `BreadcrumbsBar.jsx` | Contextual breadcrumb navigation |
| `CategoryAppSwitcher.jsx` | Category mode switching UI |
| `DealsSection.jsx` | Featured deals carousel |
| `FeaturedCentrePages.jsx` | Featured Centre Page cards |
| `CentreUpdatesFeed.jsx` | Updates from followed Centre Pages |

### Rewards Components (client/src/components/rewards/)

| Component | Purpose |
|:----------|:--------|
| `RewardsHeroCard.jsx` | Balance display with Rs conversion |
| `TierProgressBar.jsx` | Visual tier progress |
| `DailyCheckInButton.jsx` | One-tap daily check-in |
| `SpinWheelModal.jsx` | Animated spin wheel game |
| `ScratchCardModal.jsx` | Scratch card animation |
| `StreakTracker.jsx` | Visit/post streak display |
| `LeaderboardTable.jsx` | Weekly leaderboard |

### Referral Components (client/src/components/referral/)

| Component | Purpose |
|:----------|:--------|
| `ReferralChainTree.jsx` | Interactive 5-level referral tree with expand/collapse |
| `RewardRulesCard.jsx` | Reward ladder display with caps |

### Rating Components (client/src/components/ratings/)

| Component | Purpose |
|:----------|:--------|
| `UserRatingProfile.jsx` | Full seller + buyer rating breakdown with category bars |

### Centre Page Components (client/src/components/centre/)

| Component | Purpose |
|:----------|:--------|
| `CentrePageTabs.jsx` | Tabbed interface (About, Listings, Updates, Reviews, Analytics) |
| `CentrePageAnalytics.jsx` | Owner-only analytics dashboard |
| `CentreVerificationBadge.jsx` | Verified + Premium badge display |

### UI Primitives (client/src/components/ui/)

Built on Radix UI (shadcn pattern):

| Component | Based On |
|:----------|:---------|
| Dialog | Radix Dialog |
| Dropdown Menu | Radix DropdownMenu |
| Tabs | Radix Tabs |
| Toast | Radix Toast |
| Switch | Radix Switch |
| Select | Radix Select |
| Checkbox | Radix Checkbox |
| Button | Custom with variants |
| Input | Custom with validation |
| Badge | Custom with color variants |
| Card | Custom with glass morphism |

### Page State Components (client/src/components/page-state/)

| Component | Purpose |
|:----------|:--------|
| Loading | Skeleton loading states with shimmer animation |
| Error | Error display with retry action |
| Empty | Empty state with illustration and CTA |

---

## State Management (6 Contexts, 19 Hooks)

### React Context Providers

```mermaid
flowchart TB
    App["App.jsx"] --> Auth["AuthContext"]
    App --> Cart["CartContext"]
    App --> CM["CategoryModeContext"]
    App --> Filter["FilterContext"]
    App --> Location["LocationContext"]
    App --> Theme["ThemeContext"]

    Auth --> |"isAuth, userId, login, logout"| Pages
    Cart --> |"items, addToCart, removeFromCart"| Pages
    CM --> |"activeApp, activeCategory"| Pages
    Filter --> |"filters, setFilter, resetFilters"| Pages
    Location --> |"lat, lng, locationName"| Pages
    Theme --> |"theme, setTheme, isDark"| Pages
```

| Context | File | Provides | Persistence |
|:--------|:-----|:---------|:------------|
| AuthContext | `AuthContext.jsx` | `isAuth`, `userId`, `user`, `login()`, `logout()`, `refresh()` | Tokens in authStorage |
| CartContext | `CartContext.jsx` | `items`, `addToCart()`, `removeFromCart()`, `clearCart()`, `cartCount` | localStorage + API sync |
| CategoryModeContext | `CategoryModeContext.jsx` | `activeApp`, `activeCategory`, `categories`, `setCategory()` | localStorage |
| FilterContext | `FilterContext.jsx` | `filters`, `setFilter()`, `resetFilters()` | Session state |
| LocationContext | `LocationContext.jsx` | `lat`, `lng`, `locationName`, `requestPermission()` | GPS/Capacitor |
| ThemeContext | `ThemeContext.jsx` | `theme`, `setTheme()`, `isDark` | localStorage, system preference |

### Custom Hooks (19)

| Hook | Purpose | Key Features |
|:-----|:--------|:-------------|
| `useNotifications.js` | Notification management | TanStack Query, real-time via Socket.IO |
| `useRealtimeChat.js` | Chat integration | Socket.IO rooms, message subscription |
| `useTrustScore.js` | Trust badge computation | Score normalization, risk state detection |
| `useInfiniteScroll.js` | Pagination | Cursor-based, intersection observer |
| `useCoins.js` | Coin operations | Balance, spend, earn, history |
| `useRewards.js` | Rewards state | Config, tier progress, daily status |
| `useFeed.js` | Feed management | Infinite scroll, like/comment |
| `useOffers.js` | Offer management | CRUD, real-time updates |
| `useAnalytics.js` | Analytics tracking | Event dispatch, page views |
| `useCmsPage.js` | CMS content | Dynamic page loading |
| `useFocusTrap.js` | Accessibility | Focus management for modals |
| `useLocationPermission.js` | GPS permission | Permission state, request flow |
| `useLikePost.js` | Post engagement | Optimistic like/unlike |
| `usePageDensity.js` | Layout density | Compact/comfortable/spacious modes |
| `usePullToRefresh.jsx` | Mobile UX | Pull-down refresh gesture |
| `useRecommendations.js` | Recommendations | Personalized feed data |
| `useTranslatedContent.js` | Translation | Auto-translate listing content |
| `use-mobile.jsx` | Responsiveness | Mobile viewport detection |
| `use-toast.jsx` | Notifications | Toast message management |

---

## Theming and Design System

### Theme Architecture

MHub uses a CSS custom property (variable) system with 100+ design tokens:

```
client/src/styles/
|-- themes/
|   |-- light-theme.css         # Light mode tokens
|   |-- dark-theme.css          # Dark mode tokens
|   |-- dark-overrides.css      # Dark mode component overrides
|   +-- dark-comprehensive.css  # Full dark mode coverage
|
|-- ui-enhancements.css          # Glass morphism, hero cards, premium surfaces
|-- rewards-profile-enhancements.css  # Rewards page + profile page styles
+-- (imported in index.css and main.jsx)
```

### Key Design Tokens

| Token | Light | Dark | Purpose |
|:------|:------|:-----|:--------|
| `--background` | #ffffff | #0a0e17 | Page background |
| `--foreground` | #0f172a | #e2e8f0 | Primary text |
| `--primary` | #3b82f6 | #5b8dff | Brand accent |
| `--glass-border` | rgba(255,255,255,0.35) | rgba(255,255,255,0.08) | Glass edges |
| `--nav-bg` | rgba(255,255,255,0.9) | rgba(10,14,23,0.95) | Navigation |

### Premium UI Classes

| Class | Effect |
|:------|:-------|
| `mhub-premium-page` | Page wrapper with gradient orbs (dark mode), isolation context |
| `mhub-premium-surface` | Glass morphism card with backdrop blur |
| `mhub-hero-card` | Frosted glass hero section with radial glow accents |
| `profile-hero-bg` | Blue-to-purple gradient for hero backgrounds |
| `mhub-page-pad-bottom` | Safe bottom padding for mobile bottom nav |

### Dark Mode

- Toggle: `ThemeContext` with system preference detection
- Coverage: All 68 routes tested for dark mode compatibility
- Implementation: Tailwind `dark:` variant classes + CSS custom properties
- Glass morphism: Semi-transparent surfaces with blur in both modes

---

## 🎨 Visual Design Specification — Pin-to-Pin Per-Page Report

> **Audit Score:** 98/100 | **WCAG AA Compliant** | **Mobile UX Optimized**  
> Every element below is documented with exact Tailwind classes, hex values, pixel measurements, gradients, animations, and responsive breakpoints.

<details>
<summary><strong>📐 Complete Design Token Reference</strong> (click to expand)</summary>

### Font Family Stack

```css
font-sans: 'Manrope', ui-sans-serif, system-ui, -apple-system, sans-serif;
font-display: 'Sora', 'Manrope', ui-sans-serif, system-ui, sans-serif;
```

### Color Palette — Light Mode

| Token | Hex | RGB | Usage |
|:------|:----|:----|:------|
| `--background` | `#ffffff` | 255, 255, 255 | Page base |
| `--foreground` | `#0f172a` | 15, 23, 42 | Primary text |
| `--primary` | `#3b82f6` | 59, 130, 246 | Brand blue |
| `--primary-hover` | `#1d4ed8` | 29, 78, 216 | Interactive blue |
| `--surface-0` | `#ffffff` | 255, 255, 255 | Card base |
| `--surface-1` | `#f7f8fa` | 247, 248, 250 | Elevated surface |
| `--surface-2` | `#f1f5f9` | 241, 245, 249 | Inset surface |
| `--text-primary` | `#1a1a1a` | 26, 26, 26 | Headings |
| `--text-secondary` | `#6b7280` | 107, 114, 128 | Body text |
| `--border` | `#e5e7eb` | 229, 231, 235 | Borders |
| `--card-shadow` | — | `0 8px 24px rgba(15,23,42,0.08)` | Card elevation |
| `--shadow-soft` | — | `0 10px 26px rgba(15,23,42,0.08)` | Soft elevation |

### Color Palette — Dark Mode

| Token | Hex | RGB | Usage |
|:------|:----|:----|:------|
| `--background` | `#0b0e14` | 11, 14, 20 | Page base |
| `--foreground` | `#e2e8f0` | 226, 232, 240 | Primary text |
| `--primary` | `#5b8dff` | 91, 141, 255 | Brand blue |
| `--surface-0` | `#0f141c` | 15, 20, 28 | Card base |
| `--surface-1` | `#0f141c` | 15, 20, 28 | Elevated surface |
| `--text-primary` | `#f2f5f9` | 242, 245, 249 | Headings |
| `--text-secondary` | `#c1c9d6` | 193, 201, 214 | Body text |
| `--border` | `#273043` | 39, 48, 67 | Borders |
| `--shadow-soft` | — | `0 18px 36px rgba(0,0,0,0.5)` | Deep elevation |

### Navigation Tokens

| Token | Value | Context |
|:------|:------|:--------|
| `--nav-pill-bg` | `rgba(0, 50, 150, 0.35)` | Nav bar background |
| `--nav-text` | `#ffffff` | Nav label color |
| `--nav-text-active` | `#ffffff` | Active nav text |
| `--nav-icon` | `rgba(255, 255, 255, 0.85)` | Nav icon default |
| `--nav-icon-active` | `#ffffff` | Active nav icon |

### Typography Scale

| Class | Size (px) | Line-Height | Weight | Usage |
|:------|:----------|:------------|:-------|:------|
| `text-3xl` | 30 | 36px | — | Hero headings |
| `text-2xl` | 24 | 32px | — | Section headings |
| `text-xl` | 20 | 28px | — | Card titles, Profile name |
| `text-lg` | 18 | 28px | — | Subheadings |
| `text-base` | 16 | 24px | — | Body text, button labels |
| `text-sm` | 14 | 20px | — | Secondary text, labels |
| `text-xs` | 12 | 16px | — | Badges, timestamps |
| `text-[10px]` | 10 | 14px | — | Sponsor labels |
| `text-display` | 24 | 28px | 600 | Hero display text |
| Clamp title | `clamp(20px, 2.1vw, 28px)` | 1.1 | 700 | Responsive hero |

### Font Weight Map

| Class | CSS Value | Usage |
|:------|:----------|:------|
| `font-black` | 900 | Coin amounts, emphasis numbers |
| `font-bold` | 700 | Headings, prices, CTA buttons |
| `font-semibold` | 600 | Card titles, button text, labels |
| `font-medium` | 500 | Stat values, metadata |
| `font-normal` | 400 | Body paragraphs |

### Border Radius Scale

| Class | Size (px) | Usage |
|:------|:----------|:------|
| `rounded-full` | 9999px | Pills, badges, avatars, toggle buttons |
| `rounded-3xl` | 24px | Auth cards on tablet+ |
| `rounded-2xl` | 16px | Page cards, hero sections, modals |
| `rounded-xl` | 12px | Input fields, inner cards, buttons |
| `rounded-lg` | 8px | Image thumbnails, small containers |
| `rounded-md` | 6px | Discount badges |

### Shadow System

| Class | CSS Value | Usage |
|:------|:----------|:------|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.1)` | Cards default |
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` | Elevated cards |
| `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.1)` | Auth cards, modals |
| `shadow-2xl` | `0 25px 50px -12px rgba(0,0,0,0.25)` | Category hover |
| `shadow-blue-500/25` | `0 10px 15px rgba(59,130,246,0.25)` | Primary CTA glow |
| `shadow-pink-500/20` | `0 10px 15px rgba(236,72,153,0.2)` | Wishlist actions |
| `shadow-purple-500/25` | `0 10px 15px rgba(168,85,247,0.25)` | Auth/SignUp glow |
| `shadow-emerald-500/25` | `0 10px 15px rgba(16,185,129,0.25)` | Publish button |
| `shadow-orange-500/25` | `0 10px 15px rgba(249,115,22,0.25)` | CTA orange glow |

### Spacing Scale (Key Values)

| Class | Pixels | Common Usage |
|:------|:-------|:-------------|
| `gap-0.5` | 2px | Dot indicators |
| `gap-1` | 4px | Icon + text tight |
| `gap-1.5` | 6px | Button + icon |
| `gap-2` | 8px | Card grid tight, button rows |
| `gap-3` | 12px | Default card gap |
| `gap-4` | 16px | Section spacing |
| `gap-6` | 24px | Major sections |
| `p-3` | 12px | Compact card padding |
| `p-4` | 16px | Standard card padding |
| `p-5` | 20px | Form padding mobile |
| `p-6` | 24px | Form padding |
| `p-8` | 32px | Form padding desktop |
| `py-4` | 16px | Section vertical |
| `px-2.5` | 10px | Badge horizontal |
| `min-h-[44px]` | 44px | Touch target minimum |

### Animation & Transition Tokens

| Pattern | Value | Usage |
|:--------|:------|:------|
| Card hover | `transition-all duration-300` | Cards, list items |
| Image zoom | `transition-transform duration-500` | Card image hover |
| Button press | `active:scale-[0.97]` | Submit buttons |
| Shimmer | `animate-[shimmer_2s_infinite]` | Loading skeletons |
| Pulse | `animate-pulse` | Aurora blobs, connecting states |
| Spin | `animate-spin` | Loading spinners |
| Bounce | `animate-[bounce_3s_ease-in-out_infinite]` | Empty state dots |
| Ring spin | `animate-[spin_20s_linear_infinite]` | Wishlist empty state |
| Slide in | `animate-in fade-in slide-in-from-top-4 duration-300` | OTP section reveal |
| Hover lift | `hover:-translate-y-0.5` | Cards elevation |
| Deep lift | `hover:-translate-y-1` | Category cards |
| 3D perspective | `perspective(600px) rotateX() rotateY() scale(1.03)` | CategoryHub cards |

### Responsive Breakpoints

| Breakpoint | Min-Width | Usage |
|:-----------|:----------|:------|
| Default (mobile) | 0px | Base styles, single column |
| `sm:` | 640px | Tablet, 2-column grids |
| `md:` | 768px | 3-column grids |
| `lg:` | 1024px | Desktop, 4-column grids |
| `xl:` | 1280px | Large desktop |

</details>

---

<details>
<summary><strong>🧭 Navigation Component — Pixel-Perfect Specification</strong></summary>

### Top Navigation Bar `.mhub-top-nav--primary`

| Property | Value |
|:---------|:------|
| Position | `fixed`, `top: 0`, `z-index: 9000` |
| Height | `56px` |
| Background | `rgba(0, 50, 150, 0.35)` |
| Backdrop | `blur(40px) saturate(1.8)` |
| Border-bottom | `1px solid rgba(255, 255, 255, 0.08)` |
| Padding | `0 16px` |
| Display | `flex`, `align-items: center` |

### Logo Chip `.mhub-nav-logo-chip`

| Property | Value |
|:---------|:------|
| Background | `rgba(255, 255, 255, 0.12)` |
| Border | `1px solid rgba(255, 255, 255, 0.15)` |
| Border Radius | `12px` |
| Padding | `6px 14px` |
| Font | `700 15px/1 system-ui` |
| Color | `#ffffff` |
| Letter Spacing | `0.3px` |
| Text Shadow | `0 1px 2px rgba(0, 0, 0, 0.25)` |

### Navigation Pill `.mhub-nav-pill`

| Property | Value |
|:---------|:------|
| Background | `rgba(255, 255, 255, 0.08)` |
| Border | `1px solid rgba(255, 255, 255, 0.12)` |
| Border Radius | `14px` |
| Padding | `6px 8px` |
| Gap | `2px` |

### Pill Link (Default) `.mhub-nav-pill a`

| Property | Value |
|:---------|:------|
| Height | `36px` |
| Min Width | `36px` |
| Border Radius | `10px` |
| Font | `600 12px/1 system-ui` |
| Color | `rgba(255, 255, 255, 0.75)` |
| Transition | `all 0.2s cubic-bezier(0.4, 0, 0.2, 1)` |
| Icon Size | `18px` |

### Pill Link (Active) `.mhub-nav-pill a.active`

| Property | Value |
|:---------|:------|
| Background | `rgba(255, 255, 255, 0.18)` |
| Color | `#ffffff` |
| Box Shadow | `0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)` |

### Action Button `.mhub-nav-action`

| Property | Value |
|:---------|:------|
| Size | `36px × 36px` |
| Border Radius | `10px` |
| Background | `rgba(255, 255, 255, 0.08)` |
| Border | `1px solid rgba(255, 255, 255, 0.1)` |
| Color | `rgba(255, 255, 255, 0.85)` |
| Hover BG | `rgba(255, 255, 255, 0.15)` |
| Transition | `all 0.2s ease` |

</details>

---

<details>
<summary><strong>🏠 Page 1: CategoryHub — Visual Blueprint</strong></summary>

**File:** `src/pages/CategoryHub.jsx` | **Route:** `/` → `/category-hub`

### Aurora Background System

```
┌────────────────────────────────────────────────┐
│  ● Blob 1: bg-indigo-500/20                   │
│    Size: w-96 h-96 (384px)                     │
│    Position: top-10 left-10                    │
│    Filter: blur-3xl (48px)                     │
│    Animation: animate-pulse                    │
│                                                │
│         ● Blob 2: bg-pink-500/20              │
│           Size: w-72 h-72 (288px)             │
│           Position: top-40 right-20           │
│           Animation: animate-pulse (delay 1s) │
│                                                │
│  ● Blob 3: bg-emerald-500/20                  │
│    Size: w-80 h-80 (320px)                    │
│    Position: bottom-20 left-1/3               │
│    Animation: animate-pulse (delay 2s)        │
│                                                │
│  Dark mode: all opacity reduced to /10         │
└────────────────────────────────────────────────┘
```

### Page Title

| Property | Value |
|:---------|:------|
| Text | "Explore Categories" |
| Font Size | `text-2xl` (24px) → `sm:text-3xl` (30px) |
| Font Weight | `font-bold` (700) |
| Color | Gradient text: `from-indigo-500 via-purple-500 to-pink-500` |
| Technique | `bg-clip-text text-transparent` |
| Margin | `mb-8` (32px) |

### Category Grid

| Property | Value |
|:---------|:------|
| Layout | `grid grid-cols-2` |
| Gap | `gap-4` (16px) → `sm:gap-6` (24px) |
| Max Width | `max-w-[640px] mx-auto` |

### Category Card

| Property | Value |
|:---------|:------|
| Container | `rounded-2xl overflow-hidden cursor-pointer group` |
| Min Height | `min-h-[180px]` → `sm:min-h-[220px]` |
| Padding | `p-5` → `sm:p-6` |
| Position | `relative` |
| Transition | `transition-all duration-300` |
| Hover Transform | `hover:-translate-y-1` |
| Hover Shadow | `hover:shadow-2xl` |

### Per-Category Gradients

| Category | Direction | Colors |
|:---------|:----------|:-------|
| **Electronics** | `to-br` | `from-blue-500 via-indigo-600 to-violet-700` |
| **Fashion** | `to-br` | `from-pink-500 via-rose-500 to-red-500` |
| **Vehicles** | `to-br` | `from-emerald-500 via-teal-500 to-cyan-600` |
| **Others** | `to-br` | `from-purple-500 via-violet-600 to-indigo-700` |

### Card Interior Elements

| Element | Specification |
|:--------|:-------------|
| Icon Container | `w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3` |
| Icon | `w-6 h-6 text-white` |
| Title | `text-lg sm:text-xl font-bold text-white mb-1` |
| Subtitle | `text-sm text-white/80` |
| Count Badge | `absolute top-3 right-3 bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full` |

### 3D Mouse Hover Effect (Desktop Only)

| Property | Value |
|:---------|:------|
| Transform | `perspective(600px) rotateX(Xdeg) rotateY(Ydeg) scale(1.03)` |
| Transition | `transform 0.1s ease-out` |
| Shine Overlay | `absolute inset-0 bg-gradient-radial from-white/20 to-transparent` |
| Shine Opacity | `opacity-0 → group-hover:opacity-100` |
| Calculation | Mouse position mapped to -5° to +5° rotation |

</details>

---

<details>
<summary><strong>✨ Page 2: ForYou — AI Recommendations Visual Blueprint</strong></summary>

**File:** `src/pages/ForYou.jsx` | **Route:** `/for-you`

### Page Background

```css
Light: bg-gradient-to-b from-white to-slate-50
Dark:  bg-gradient-to-b from-gray-900 to-gray-950
```

### Hero Section

| Property | Value |
|:---------|:------|
| Container | `rounded-2xl overflow-hidden relative` |
| Background | `bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600` |
| Dark | `from-blue-800 via-indigo-800 to-purple-800` |
| Padding | `px-5 py-4 sm:py-5` |
| Min Height | `min-h-[120px]` |

### AI Badge

| Property | Value |
|:---------|:------|
| Background | `bg-white/30` |
| Text | `text-white text-xs font-semibold` |
| Border Radius | `rounded-full` |
| Padding | `px-3 py-1` |
| Icon | Sparkles `w-3.5 h-3.5` |
| Gap | `gap-1.5` |

### Stats Chips (Hero)

| Property | Value |
|:---------|:------|
| Background | `bg-white/10 backdrop-blur-sm` |
| Border | `border border-white/20` |
| Radius | `rounded-full` |
| Padding | `px-3 py-1.5` |
| Text | `text-white text-xs font-medium` |

### Hero Typography

| Element | Classes |
|:--------|:--------|
| Title | `text-xl sm:text-2xl font-bold text-white leading-tight` |
| Subtitle | `text-sm text-white/80 mt-1` |

### Filter Button Row

| Property | Value |
|:---------|:------|
| Container | `flex gap-2 overflow-x-auto scrollbar-hide py-3 px-1` |
| Button Height | `h-10` (40px) |
| Padding | `px-4` |
| Radius | `rounded-full` |
| Font | `text-sm font-medium whitespace-nowrap` |
| Active BG | `bg-blue-600` |
| Active Text | `text-white` |
| Active Shadow | `shadow-md shadow-blue-500/25` |
| Inactive BG | `bg-slate-50 dark:bg-slate-800` |
| Inactive Text | `text-slate-700 dark:text-slate-300` |
| Inactive Border | `border border-slate-200 dark:border-slate-700` |

### Sponsored Horizontal Cards

| Property | Value |
|:---------|:------|
| Container | `flex gap-3 overflow-x-auto scrollbar-hide pb-2` |
| Card Width | `min-w-[160px] max-w-[180px]` |
| Card Radius | `rounded-xl` |
| Card Shadow | `shadow-md` |
| Card Border | `border border-slate-100 dark:border-slate-700` |
| Image Height | `h-[100px]` |
| Body Padding | `p-2.5` |
| Title | `text-xs font-semibold line-clamp-1` |
| Price | `text-sm font-bold text-emerald-600` |
| Sponsor Label | `text-[10px] text-gray-400 uppercase tracking-wide` |

### Main Feed Grid

| Property | Value |
|:---------|:------|
| Layout | `grid grid-cols-2 gap-2 sm:gap-3` |
| Card | Same as AllPosts card specification |

</details>

---

<details>
<summary><strong>📋 Page 3: AllPosts — Discovery Feed Visual Blueprint</strong></summary>

**File:** `src/pages/AllPosts.jsx` (4,312 lines) | **Route:** `/all-posts`

### Hero Card

| Property | Value |
|:---------|:------|
| Container | `mhub-hero-card rounded-2xl` |
| Min Height | `min-h-[116px] sm:min-h-[132px]` |
| Padding | `px-4 py-3.5 sm:px-6 sm:py-4.5` |
| Gradient | `from-sky-500/95 via-blue-500/95 to-violet-500/95` |
| Dark | `from-sky-700/90 via-blue-700/90 to-violet-700/90` |
| Title Font | `text-[clamp(20px,2.1vw,28px)] leading-[1.1] font-bold text-white` |
| Subtitle | `text-[clamp(12px,1.3vw,16px)] text-white/80` |

### Hero Action Buttons

| Button | Specification |
|:-------|:-------------|
| Back | `rounded-full border-white/30 bg-white/20 px-3.5 py-2.5 min-h-[44px] text-xs font-semibold` |
| Refresh | `rounded-full border-white/25 bg-white/10 px-3.5 py-2.5 min-h-[44px] text-xs` |
| Count Badge | `rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/80` |

### Search & Sort Controls

| Element | Specification |
|:--------|:-------------|
| Container | `flex flex-col sm:flex-row gap-2 mt-4` |
| Search Input | `h-10 rounded-xl border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-slate-900/60 text-sm` |
| Sort Dropdown | `h-10 rounded-xl border-gray-200 dark:border-gray-700 text-sm px-3` |
| Status Filter | `h-10 rounded-xl border-gray-200 dark:border-gray-700 text-sm` |

### Post Card — Complete Anatomy

```
┌──────────────────────────────────┐
│ ┌──────────────────────────────┐ │  ← Image: h-[200px] sm:h-[240px]
│ │                              │ │     object-cover, hover:scale-105
│ │     IMAGE AREA               │ │     duration-500
│ │                              │ │
│ │  ┌─────────┐                 │ │  ← Price Badge: absolute bottom-2.5
│ │  │ ₹1,200  │                 │ │     left-3, bg-emerald-50
│ │  └─────────┘                 │ │     border-emerald-200, rounded-lg
│ └──────────────────────────────┘ │     px-2.5 py-1, text-sm font-bold
│                                  │     text-emerald-800
│  Title of Post ·············     │  ← font-semibold text-sm line-clamp-1
│  📍 Location  ·  2h ago         │  ← text-xs text-gray-500 gap-1
│                                  │
│  ♡  🛒  ↗️                       │  ← h-11 rounded-full, w-4 h-4 icons
│                                  │     gap-1.5
└──────────────────────────────────┘
Card: rounded-2xl, border-gray-100/80
      shadow-md, hover:-translate-y-0.5
      transition-all duration-300
Body: p-3 sm:p-3.5
```

### Loading Skeleton

| Element | Specification |
|:--------|:-------------|
| Grid | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4` |
| Card | `mhub-premium-surface backdrop-blur-sm rounded-2xl border-gray-100` |
| Image Area | `aspect-[4/3] bg-gray-200 dark:bg-gray-700` |
| Shimmer | `animate-[shimmer_2s_infinite] from-transparent via-white/40 to-transparent` |
| Text Lines | `h-4 bg-gray-200 dark:bg-gray-700 rounded-full` |

</details>

---

<details>
<summary><strong>📄 Page 4: PostDetail — Listing Detail Visual Blueprint</strong></summary>

**File:** `src/pages/PostDetail.jsx` | **Route:** `/post/:id`

### Sticky Navigation Header

| Property | Value |
|:---------|:------|
| Position | `sticky top-0 z-40` |
| Background | `backdrop-blur-xl bg-white/80 dark:bg-slate-900/80` |
| Shadow | `0 1px 3px rgba(0,0,0,0.08)` |
| Border | `border-b border-gray-200/50 dark:border-gray-700/50` |
| Tab (Active) | `bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25 rounded-full min-h-[36px]` |
| Tab (Inactive) | `text-gray-600 font-semibold hover:bg-blue-50 rounded-full` |

### Image Gallery

| Element | Specification |
|:--------|:-------------|
| Container | `mhub-premium-surface rounded-2xl shadow-lg overflow-hidden` |
| Image Area | `aspect-[4/3] lg:min-h-[480px] bg-gray-100 dark:bg-gray-950` |
| Image | `object-contain cursor-zoom-in group-hover:scale-[1.05] duration-300` |
| Nav Arrow | `absolute top-1/2 -translate-y-1/2 bg-[var(--surface-1)] p-3 rounded-full shadow-lg opacity-90` |
| Dots (Active) | `h-2 w-6 bg-blue-500 rounded-full` |
| Dots (Inactive) | `h-2 w-2 bg-white/70 rounded-full` |
| Counter | `absolute bottom-3 right-3 bg-white/85 rounded-full px-2.5 py-1 text-xs font-semibold` |

### Tier Badges (On Image)

| Tier | Gradient | Text |
|:-----|:---------|:-----|
| Premium | `from-yellow-400 to-orange-500` | White |
| Silver | `from-gray-400 to-gray-500` | White |
| Standard | `from-green-400 to-emerald-500` | White |

### Price Display

| Element | Classes |
|:--------|:--------|
| Current Price | `text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100` |
| Original | `text-lg text-gray-400 line-through` |
| Discount | `bg-green-600 text-white px-2.5 py-1 rounded-md text-sm font-bold` |
| Savings | `text-xs font-semibold text-emerald-600 dark:text-emerald-300` |

### Action Buttons

| Button | Specification |
|:-------|:-------------|
| Chat Seller | `bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 rounded-xl shadow-sm` |
| Make Offer | `outline border-gray-200 text-gray-700 h-11 rounded-xl` |
| Save (Active) | `bg-blue-50 border-blue-200 text-blue-600 h-11 rounded-xl` |
| Contact CTA | `w-full py-4 font-bold rounded-xl shadow-lg from-orange-500 to-orange-600 text-white` |
| Offer CTA | `w-full py-4 font-bold rounded-xl shadow-lg from-yellow-400 to-yellow-500 text-gray-900` |

### Seller Card

| Element | Specification |
|:--------|:-------------|
| Container | `mhub-premium-surface rounded-2xl` |
| Avatar | `h-14 w-14 ring-4 ring-white dark:ring-gray-600 shadow-lg` |
| Fallback | `bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg` |
| Name | `font-bold text-gray-900 dark:text-gray-100` |
| Stats Grid | `grid-cols-2 sm:grid-cols-3 gap-3` |
| Stat Card | `rounded-lg bg-white/80 dark:bg-slate-900/80 px-2.5 py-2` |

</details>

---

<details>
<summary><strong>➕ Page 5: AddPost — Listing Creation Visual Blueprint</strong></summary>

**File:** `src/pages/AddPost.jsx` | **Route:** `/add-post`

### Page Background

```css
Light: bg-gradient-to-br from-sky-50 to-blue-100
Dark:  bg-gradient-to-br from-sky-950 to-blue-950
Max-width: max-w-[640px] mx-auto px-4
```

### Hero Header

| Property | Value |
|:---------|:------|
| Gradient | `from-blue-600 via-indigo-600 to-purple-700` |
| Radius | `rounded-2xl` |
| Pattern | `absolute inset-0 opacity-10` (SVG) |
| Title | `text-lg sm:text-xl font-bold text-white` |
| Breadcrumb | `text-xs font-semibold uppercase tracking-[0.16em] text-white/70` |
| Back Link | `text-white/80 hover:text-white text-sm h-11` |

### Universal Input Styling

| Property | Value |
|:---------|:------|
| Height | `h-12` (48px) |
| Border | `border-2 border-gray-200 dark:border-gray-700` |
| Radius | `rounded-xl` |
| Focus Ring | `ring-4 ring-blue-400/30` |
| Focus Border | `border-blue-500 dark:border-blue-500/40` |
| Focus Shadow | `shadow-lg shadow-blue-500/10` |
| Label | `text-sm font-semibold text-gray-700 dark:text-gray-200` |

### Image Upload Area

| Property | Value |
|:---------|:------|
| Border | `border-2 border-dashed border-blue-300 dark:border-blue-600/40` |
| Radius | `rounded-2xl` |
| Padding | `p-6 sm:p-8` |
| Background | `from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10` |
| Hover | `border-solid border-blue-400 shadow-xl shadow-blue-500/10` |
| Active | `scale-[0.98]` |
| Icon | `Upload w-12 h-12 text-sky-400` |
| Upload Btn | `from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25` |

### Flash Sale Toggle

| Property | Value |
|:---------|:------|
| Container Border | `border-2 border-dashed border-orange-200 dark:border-orange-600/40` |
| Container BG | `from-orange-50 to-amber-50 dark:from-orange-900/10` |
| Switch Size | `h-11 w-14 rounded-full` |
| Active Color | `bg-orange-500` |
| Inactive | `bg-gray-300 dark:bg-gray-600` |
| Knob | `h-6 w-6 bg-white shadow-lg rounded-full` |

### Sticky Action Bar

| Property | Value |
|:---------|:------|
| Position | `sticky bottom-0 z-[60]` |
| Background | `mhub-premium-bar backdrop-blur-xl` |
| Shadow | `0 -8px 24px rgba(0,0,0,0.08)` |
| Border Top | `border-gray-200/60 dark:border-gray-700/60` |
| Preview Btn | `outline border-blue-300 text-blue-600 font-semibold px-6 py-3 min-w-[120px]` |
| Publish Btn | `from-emerald-500 to-blue-600 font-bold px-6 py-3 min-w-[140px] shadow-lg shadow-emerald-500/25` |

</details>

---

<details>
<summary><strong>👤 Page 6: Profile — User Account Visual Blueprint</strong></summary>

**File:** `src/pages/Profile.jsx` (4,179 lines) | **Route:** `/profile`

### Hero Section

| Property | Value |
|:---------|:------|
| Gradient | `from-sky-500 via-blue-500 to-violet-400` |
| Dark | `from-sky-700 via-blue-700 to-violet-600` |
| Padding | `px-5 py-6 sm:py-8` |
| Radius | `rounded-2xl` |

### Avatar Ring (SVG Animated)

| Property | Value |
|:---------|:------|
| Ring Size | 72px (mobile) / 88px (desktop) |
| Ring Track | `stroke-white/20, stroke-width: 3` |
| Ring Fill | `stroke-white, stroke-width: 3` |
| Animation | Animated `stroke-dasharray` based on profile completion % |
| Fallback BG | `from-blue-400 to-purple-500 text-white font-bold text-2xl` |

### Profile Info

| Element | Classes |
|:--------|:--------|
| Name | `text-xl font-bold text-white` |
| Username | `text-sm text-white/70` |
| Bio | `text-sm text-white/80 mt-1 line-clamp-2` |
| Verified Badge | `bg-white/20 rounded-full px-2.5 py-1 text-xs text-white` |

### Stats Row

| Element | Classes |
|:--------|:--------|
| Container | `flex items-center gap-4 mt-3` |
| Value | `text-lg font-bold text-white` |
| Label | `text-xs text-white/70` |
| Divider | `h-8 w-px bg-white/20` |

### Sticky Tab Bar

| Property | Value |
|:---------|:------|
| Position | `sticky top-[56px] z-40` |
| Container | `rounded-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl` |
| Border | `border-gray-200/50 dark:border-gray-700/50` |
| Tab Active | `bg-blue-600 text-white shadow-sm h-9 px-4 rounded-xl text-xs font-semibold` |
| Tab Inactive | `text-gray-600 dark:text-gray-300 hover:bg-gray-100 h-9 px-4 rounded-xl` |

</details>

---

<details>
<summary><strong>📊 Page 7: Dashboard — Seller Analytics Visual Blueprint</strong></summary>

**File:** `src/pages/Dashboard.jsx` | **Route:** `/dashboard`

### Welcome Header

| Property | Value |
|:---------|:------|
| Container | `mhub-premium-surface rounded-2xl overflow-hidden` |
| Gradient | `from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-900` |
| Avatar | `h-12 w-12 lg:h-16 lg:w-16 ring-4 ring-white/30` |
| Heading | `text-lg sm:text-2xl lg:text-3xl font-bold text-white truncate` |
| Coins | `text-lg sm:text-2xl lg:text-3xl font-bold text-white` |
| Star Rating | `w-4 h-4 text-yellow-300 fill-current` |

### Stats Grid

| Property | Value |
|:---------|:------|
| Layout | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4` |
| Card | `mhub-premium-surface rounded-xl hover:shadow-xl duration-300` |
| Padding | `p-4 lg:p-6 space-y-3` |
| Icon Box | `p-2 lg:p-3 rounded-xl bg-[color]-100` |
| Value | `text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100` |
| Label | `text-sm text-gray-600 dark:text-gray-200` |
| Trend | `bg-green-100 text-green-800 dark:bg-green-950/20 text-xs` |

### Activity Feed

| Property | Value |
|:---------|:------|
| Container | `mhub-premium-surface rounded-2xl h-full` |
| Header | `bg-blue-500 dark:bg-blue-800/30 text-white` |
| Item | `flex space-x-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-950 hover:shadow-md` |
| Icon Box | `p-2 rounded-lg bg-white dark:bg-slate-900` |
| Title | `font-semibold text-sm lg:text-base text-gray-800 dark:text-gray-100` |
| Time | `text-xs lg:text-sm text-gray-600 dark:text-gray-200` |

</details>

---

<details>
<summary><strong>🏆 Page 8: Rewards — Gamification Hub Visual Blueprint</strong></summary>

**File:** `src/pages/Rewards.jsx` | **Route:** `/rewards`

### Coin Display

| Element | Classes |
|:--------|:--------|
| Amount | `text-3xl font-black text-amber-600 dark:text-amber-400` |
| Icon | `w-8 h-8 text-amber-500` |
| Label | `text-sm text-gray-500 dark:text-gray-400` |

### XP Progress Bar

| Element | Classes |
|:--------|:--------|
| Track | `h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700` |
| Fill | `h-2 rounded-full bg-gradient-to-r from-yellow-300 to-orange-400 transition-all duration-500` |
| Level | `text-sm font-bold text-gray-700 dark:text-gray-200` |

### Tab Bar

| Property | Value |
|:---------|:------|
| Container | `rounded-[18px] bg-gray-100 dark:bg-gray-800 p-1` |
| Tab Active | `rounded-[14px] bg-white dark:bg-gray-700 text-gray-900 shadow-sm px-4 py-2 text-sm font-medium` |
| Tab Inactive | `text-gray-500 dark:text-gray-400 hover:text-gray-700 px-4 py-2` |

### Streak Card

| Element | Classes |
|:--------|:--------|
| Container | `rounded-2xl p-4 border-orange-100 dark:border-orange-900/30` |
| BG | `from-orange-50 to-amber-50 dark:from-orange-950/20` |
| Flame | `w-8 h-8 text-orange-500 animate-bounce` |
| Count | `text-2xl font-bold text-orange-600 dark:text-orange-400` |
| Day (done) | `w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold` |
| Day (todo) | `w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-400` |

### Reward Card

| Element | Classes |
|:--------|:--------|
| Container | `rounded-2xl p-4 border-gray-100 dark:border-gray-700` |
| Icon Area | `w-12 h-12 rounded-xl bg-gradient-to-br [varies]` |
| Title | `text-sm font-semibold text-gray-900 dark:text-white` |
| Reward | `text-sm font-bold text-amber-600 dark:text-amber-400` |
| Claim Btn | `h-9 px-4 rounded-full from-amber-500 to-orange-500 text-white text-xs font-semibold` |
| Claimed | `bg-emerald-100 text-emerald-700 border-emerald-200` |

</details>

---

<details>
<summary><strong>🛒 Page 9: Cart — Shopping Cart Visual Blueprint</strong></summary>

**File:** `src/pages/Cart.jsx` | **Route:** `/cart`

### Cart Item Card

| Element | Classes |
|:--------|:--------|
| Container | `rounded-2xl mhub-premium-surface border-gray-100 dark:border-gray-700 p-3 sm:p-4 flex gap-3 sm:gap-4` |
| Image | `w-16 h-16 sm:w-24 sm:h-24 rounded-xl object-cover border-gray-100` |
| Title | `text-sm font-semibold text-gray-900 dark:text-white line-clamp-2` |
| Price | `text-sm font-bold text-indigo-600 dark:text-indigo-400` |
| Original | `text-xs text-gray-400 line-through` |
| Stepper Btn | `h-10 w-10 rounded-full border-gray-200 dark:border-gray-600` |
| Remove | `absolute top-2 right-2 w-8 h-8 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500` |

### Summary Card

| Property | Value |
|:---------|:------|
| Container | `rounded-2xl mhub-premium-surface backdrop-blur-xl shadow-xl sticky bottom-4` |
| Border | `border-gray-200/50 dark:border-gray-700/50` |
| Padding | `p-4 sm:p-5` |
| Subtotal | `text-sm text-gray-600 / font-medium text-gray-900` |
| Divider | `border-t border-dashed border-gray-200 dark:border-gray-700` |
| Total | `text-lg font-bold text-indigo-600 dark:text-indigo-400` |
| Checkout Btn | `w-full h-12 from-indigo-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25` |

</details>

---

<details>
<summary><strong>💗 Page 10: Wishlist — Favorites Visual Blueprint</strong></summary>

**File:** `src/pages/Wishlist.jsx` | **Route:** `/wishlist`

### View Toggle

| State | Classes |
|:------|:--------|
| Container | `bg-white/70 dark:bg-slate-900/60 border-gray-200 dark:border-gray-700 rounded-xl p-1` |
| Active | `h-11 w-11 rounded-lg bg-pink-500 text-white shadow-md shadow-pink-500/20` |
| Inactive | `h-11 w-11 text-gray-500 dark:text-gray-300 hover:bg-white/80` |

### Wishlist Card (Grid)

| Element | Classes |
|:--------|:--------|
| Container | `mhub-premium-surface backdrop-blur-md rounded-2xl border-gray-100/80 dark:border-gray-700/40` |
| Hover Border | `hover:border-pink-200/60 dark:hover:border-pink-500/20` |
| Shadow | `shadow-md shadow-gray-200/40 hover:shadow-lg hover:shadow-pink-500/10` |
| Selection | `ring-2 ring-pink-400/60` |
| Hover | `hover:-translate-y-0.5 duration-300` |
| Image | `aspect-[4/3] object-cover group-hover:scale-105 duration-500` |
| Gradient | `h-20 from-black/60 to-transparent` (bottom overlay) |
| Price Badge | `absolute bottom-2.5 left-3 bg-black/20 backdrop-blur-md rounded-lg px-2.5 py-1 text-lg font-bold text-white` |
| Title | `font-semibold text-sm line-clamp-1 group-hover:text-pink-600` |
| Notes | `border-l-2 border-pink-400 bg-pink-50/50 text-xs italic text-pink-700 pl-2 py-1` |

### Action Buttons

| Row | Buttons |
|:----|:--------|
| Row 1 | View: `from-pink-500 to-purple-600 text-white h-9 sm:h-10 rounded-xl` / Buy: `from-amber-500 to-orange-600 h-9 sm:h-10` |
| Row 2 | Cart: `border-gray-200 text-gray-500 hover:border-pink-300 h-9 sm:h-10 rounded-xl` / Share: same |
| Cart (added) | `border-emerald-300 text-emerald-600 bg-emerald-50/50` |

### Empty State

| Element | Classes |
|:--------|:--------|
| Outer Ring | `border-2 border-dashed border-pink-200 animate-[spin_20s_linear_infinite]` |
| Icon Circle | `w-20 h-20 rounded-full from-pink-500 to-purple-600` |
| Heart | `w-9 h-9 text-white fill-white` |
| Dots | `w-2.5 h-2.5 bg-pink-400 rounded-full animate-[bounce_3s_infinite]` |
| Title | `text-xl font-bold` |
| Browse Btn | `from-pink-500 to-purple-600 text-white px-6 h-11 rounded-xl font-semibold` |

</details>

---

<details>
<summary><strong>💬 Page 11: Chat — Real-Time Messaging Visual Blueprint</strong></summary>

**File:** `src/pages/Chat.jsx` | **Route:** `/chat`

### Chat Header

| Property | Value |
|:---------|:------|
| Gradient | `from-blue-600 to-indigo-600 dark:from-[#0b1220] dark:to-[#1b2542]` |
| Padding | `px-4 py-6` |
| Title | `text-lg sm:text-2xl font-bold text-white` |
| Subtitle | `text-sm text-blue-100 dark:text-blue-200` |

### Connection Status

| Property | Value |
|:---------|:------|
| BG | `bg-amber-50/80 dark:bg-amber-950/10 border-b border-amber-200/60` |
| Icon | `WifiOff/Wifi w-3.5 h-3.5` (animate-pulse when connecting) |
| Text | `text-xs text-amber-700 dark:text-amber-300` |

### Chat Container

| Property | Value |
|:---------|:------|
| Max Width | `max-w-[640px] mx-auto` |
| Inner | `mhub-premium-surface rounded-2xl overflow-hidden` |
| Height | `calc(100vh - 240px)` |

### Conversation Item

| Property | Value |
|:---------|:------|
| Container | `p-4 cursor-pointer border-b dark:border-gray-700` |
| Hover | `hover:bg-gray-50 dark:hover:bg-gray-950` |
| Selected | `bg-blue-50 dark:bg-gray-700` |
| Name | `font-semibold text-gray-900 dark:text-gray-100 truncate` |
| Time | `text-xs text-gray-500 dark:text-gray-300` |
| Preview | `text-sm text-gray-500 truncate` |
| Unread Badge | `bg-blue-600 dark:bg-blue-700/40` |

### Message Bubbles

| Type | Specification |
|:-----|:-------------|
| **Sent** | `bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2 max-w-[70%]` |
| **Received** | `bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-sm px-4 py-2 max-w-[70%]` |
| Sent Time | `text-xs text-blue-100` |
| Received Time | `text-xs text-gray-500` |
| Failed | `text-xs text-red-200` |

### Input Area

| Element | Classes |
|:--------|:--------|
| Container | `p-4 border-t flex gap-2` |
| Input | `flex-1` (standard Input component) |
| Send Btn | `bg-blue-600 hover:bg-blue-700 dark:bg-blue-700/40` |
| Send Icon | `Send w-5 h-5` |

</details>

---

<details>
<summary><strong>🔔 Page 12: Notifications — Alert Center Visual Blueprint</strong></summary>

**File:** `src/pages/Notifications.jsx` | **Route:** `/notifications`

### Hero

| Property | Value |
|:---------|:------|
| Min Height | `min-h-[132px]` |
| Gradient | `from-blue-600 to-indigo-600 dark:from-[#0b1220] dark:to-[#1b2542]` |
| Bell Icon | `w-6 h-6 text-white` |
| Badge | `bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full` |

### Tab Bar

| State | Classes |
|:------|:--------|
| Active | `from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25 rounded-full px-4 py-2 text-sm font-medium` |
| Inactive | `bg-white/80 dark:bg-slate-800 text-gray-600 border-gray-200 rounded-full px-4 py-2` |

### Notification Card

| Element | Classes |
|:--------|:--------|
| Container | `rounded-2xl p-4 mhub-premium-surface border-gray-100 dark:border-gray-700 hover:shadow-md` |
| Unread Bar | `absolute left-0 w-[2px] bg-blue-500 rounded-l-2xl` |
| Unread BG | `bg-blue-50/50 dark:bg-blue-950/20 border-l-2 border-blue-500` |

### Notification Icons by Type

| Type | BG Color | Text Color |
|:-----|:---------|:-----------|
| Message | `bg-blue-100 dark:bg-blue-900/30` | `text-blue-600` |
| Like | `bg-pink-100 dark:bg-pink-900/30` | `text-pink-600` |
| Sale | `bg-emerald-100 dark:bg-emerald-900/30` | `text-emerald-600` |
| System | `bg-amber-100 dark:bg-amber-900/30` | `text-amber-600` |
| Coins | `bg-yellow-100 dark:bg-yellow-900/30` | `text-yellow-600` |

### Notification Content

| Element | Classes |
|:--------|:--------|
| Title | `text-sm font-semibold text-gray-900 dark:text-white` |
| Body | `text-xs text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2` |
| Time | `text-xs text-gray-400 dark:text-gray-500 mt-1` |
| Action | `text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline` |

</details>

---

<details>
<summary><strong>🔍 Page 13: Search — Global Search Visual Blueprint</strong></summary>

**File:** `src/pages/SearchPage.jsx` | **Route:** `/search`

### Search Input

| Element | Classes |
|:--------|:--------|
| Height | `h-10` |
| Border | `border-2 border-gray-200 dark:border-gray-700` |
| Radius | `rounded-2xl` |
| Focus Ring | `ring-4 ring-blue-400/30` |
| Focus Border | `border-blue-500` |
| Padding | `pl-10 pr-4` |
| Search Icon | `absolute left-3 w-4 h-4 text-gray-400` |

### Submit Button

| Property | Value |
|:---------|:------|
| Gradient | `from-blue-600 to-indigo-600` |
| Hover | `from-blue-700 to-indigo-700` |
| Text | `text-white font-semibold` |
| Height | `h-10` |
| Radius | `rounded-xl` |
| Shadow | `shadow-md shadow-blue-500/20` |

### Filter Chips

| State | Classes |
|:------|:--------|
| Active | `h-11 rounded-full bg-blue-600 text-white shadow-sm shadow-blue-500/20 px-4 text-sm font-medium` |
| Inactive | `h-11 rounded-full bg-white dark:bg-slate-800 text-gray-700 border-gray-200 px-4` |

### Results

| Property | Value |
|:---------|:------|
| Grid | `grid-cols-2 gap-2 sm:gap-3` |
| Card Image | `aspect-[4/3] object-cover` |
| Card Style | Same as AllPosts specification |

</details>

---

<details>
<summary><strong>🔐 Page 14: Login — Authentication Visual Blueprint</strong></summary>

**File:** `src/pages/Auth/Login.jsx` | **Route:** `/login`

### AuthShell Container

| Property | Value |
|:---------|:------|
| Gradient | `from-sky-50 via-blue-50 to-indigo-100` |
| Dark | `from-gray-950 via-gray-900 to-gray-800` |
| Flex | `min-h-screen flex items-start sm:items-center justify-center` |
| Padding | `px-4 pt-10 pb-8 sm:py-12` |

### Logo Box

| Property | Value |
|:---------|:------|
| Size | `w-14 h-14 sm:w-16 sm:h-16` |
| Gradient | `from-sky-500 to-blue-600` |
| Radius | `rounded-2xl` |
| Shadow | `shadow-lg shadow-blue-500/25` |
| Icon | Shield `h-7 w-7 sm:h-8 sm:h-8 text-white` |

### Form Card

| Property | Value |
|:---------|:------|
| Shadow | `shadow-xl` |
| Radius | `rounded-2xl sm:rounded-3xl` |
| Classes | `mhub-premium-surface backdrop-blur-sm` |
| Header BG | `from-sky-500 to-blue-600 text-white py-5 sm:py-6` |
| Header Title | `text-xl sm:text-2xl font-bold text-white` |
| Content Pad | `p-5 sm:p-8 space-y-5` |

### Mobile Number Input

| Element | Classes |
|:--------|:--------|
| Prefix | `px-3 bg-gray-100 dark:bg-gray-950 border-2 border-r-0 border-gray-200 rounded-l-xl text-sm text-gray-500` |
| Input | `h-11 sm:h-12 border-2 border-gray-200 dark:border-gray-700 rounded-r-xl focus:border-sky-500` |

### Password Input

| Element | Classes |
|:--------|:--------|
| Input | `h-11 sm:h-12 border-2 rounded-xl pr-12 focus:border-sky-500` |
| Toggle | `absolute right-2 top-1/2 -translate-y-1/2` Eye/EyeOff `w-4 h-4 text-gray-500` |

### OTP Challenge

| Element | Classes |
|:--------|:--------|
| Animation | `animate-in fade-in slide-in-from-top-4 duration-300` |
| Info Box | `bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-600/40 rounded-xl p-3` |
| OTP Input | `h-12 sm:h-14 border-2 border-orange-300 rounded-xl text-center text-2xl tracking-[0.3em] font-mono` |
| OTP Focus | `focus:border-orange-500 dark:focus:border-orange-500/40` |

### Submit Button

| Property | Value |
|:---------|:------|
| Size | `w-full h-11 sm:h-12` |
| Radius | `rounded-xl` |
| Normal | `from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700` |
| OTP Mode | `bg-orange-500 hover:bg-orange-600` |
| Font | `text-base sm:text-lg font-semibold text-white` |
| Spinner | `w-4 h-4 animate-spin mr-2` |

### Error Alert

| Property | Value |
|:---------|:------|
| Border | `border-amber-200 dark:border-amber-600/40` |
| BG | `bg-amber-50 dark:bg-amber-950/20` |
| Radius | `rounded-xl` |
| Text | `text-xs text-amber-800 dark:text-amber-200` |
| Icon | AlertCircle `w-4 h-4` |

</details>

---

<details>
<summary><strong>📝 Page 15: SignUp — Registration Visual Blueprint</strong></summary>

**File:** `src/pages/Auth/SignUp.jsx` | **Route:** `/signup`

### Page Container

| Property | Value |
|:---------|:------|
| Gradient | `from-indigo-50 via-purple-50 to-pink-50` |
| Dark | `from-gray-950 via-purple-950/30 to-gray-900` |
| Flex | `min-h-screen flex items-center justify-center py-8 px-4` |

### Decorative Blobs

| Blob | Specification |
|:-----|:-------------|
| Top-Right | `absolute -top-40 -right-40 w-80 h-80 bg-purple-300/30 dark:bg-purple-900/30 rounded-full blur-3xl animate-pulse` |
| Bottom-Left | `absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300/30 dark:bg-indigo-900/30 blur-3xl animate-pulse` (delay 1s) |

### Logo & Title

| Element | Classes |
|:--------|:--------|
| Icon Box | `w-14 h-14 sm:w-16 sm:h-16 rounded-2xl from-indigo-500 to-purple-600 shadow-lg shadow-purple-500/25` |
| Icon | Sparkles `h-7 w-7 sm:h-8 sm:h-8 text-white` |
| Title | `text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100` |

### Step Indicator

| Element | Classes |
|:--------|:--------|
| Container | `flex justify-center gap-3 sm:gap-6 px-2` |
| Dot Active | `w-4 h-4 rounded-full bg-purple-500 scale-110 transition-all duration-300` |
| Dot Inactive | `w-4 h-4 rounded-full bg-gray-300 dark:bg-gray-600` |
| Label Active | `text-xs font-medium text-purple-600 dark:text-purple-400` |
| Label Inactive | `text-xs font-medium text-gray-400 dark:text-gray-500` |

### Card Header (Purple)

| Property | Value |
|:---------|:------|
| Gradient | `from-indigo-600 to-purple-600` |
| Padding | `py-6 sm:py-8 text-center` |
| Icon Box | `w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20` |
| Title | `text-xl sm:text-2xl text-white font-bold` |
| Subtitle | `text-purple-100 dark:text-purple-200 text-sm` |

### Password Strength Indicator

| Level | Color | Bar |
|:------|:------|:----|
| Weak | `bg-red-500` | 1 of 3 bars filled |
| Medium | `bg-yellow-500` | 2 of 3 bars filled |
| Strong | `bg-green-500` | 3 of 3 bars filled |
| Inactive | `bg-gray-200 dark:bg-gray-600` | Unfilled |
| Bar Size | `h-1 flex-1 rounded-full transition-all` | — |

### Primary Action Button

| Property | Value |
|:---------|:------|
| Size | `w-full h-11 sm:h-12` |
| Gradient | `from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700` |
| Shadow | `shadow-lg shadow-purple-500/25` |
| Font | `text-white font-semibold` |
| Radius | `rounded-xl` |
| Disabled | `disabled:opacity-50` |
| Icon | ArrowRight / Loader2 (animate-spin) |

### Steps Summary

| Step | Title | Key Input |
|:-----|:------|:----------|
| 1 | Aadhaar Verification | 12-digit input with live validation |
| 2 | OTP Verification | `text-center text-lg tracking-widest` |
| 3 | PAN Verification | 10-char alphanumeric |
| 4 | Create Password | With strength bars + requirements box |

</details>

---

### 🎨 Visual Pattern Summary — Cross-Page Consistency

| Pattern | Implementation | Pages Using |
|:--------|:---------------|:------------|
| **Premium Surface** | `mhub-premium-surface` + `backdrop-blur-md` + subtle border | All 15 pages |
| **Hero Gradient** | Directional gradient in header card, `rounded-2xl` | AllPosts, Wishlist, Notifications, Profile, ForYou |
| **Glass Morphism** | `bg-white/80 backdrop-blur-xl border-white/50` | Nav, summary cards, modals |
| **Card Hover** | `hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300` | Feed cards, product cards |
| **Touch Target** | `min-h-[44px]` or `h-11` on all interactive elements | Universal |
| **Input Pattern** | `h-11 sm:h-12 border-2 rounded-xl focus:ring-4 focus:ring-blue-400/30` | All forms |
| **Primary CTA** | Gradient bg + `font-semibold` + `rounded-xl` + `shadow-lg shadow-[color]/25` | All submit buttons |
| **Badge Pattern** | `rounded-full px-2.5 py-1 text-xs font-medium` | Status, category, count |
| **Empty State** | Centered column + icon/illustration + heading + description + CTA | Wishlist, Cart, Chat |
| **Loading** | Shimmer skeleton + `animate-[shimmer_2s_infinite]` + matching aspect ratios | All data pages |
| **Dark Mode** | All elements have `dark:` variants with `/30`-`/40` opacity adjustments | Universal |

### 🌈 Color Palette by Page

| Page | Primary Gradient | Accent Color | CTA |
|:-----|:----------------|:-------------|:----|
| CategoryHub | Per-category (blue/pink/emerald/purple) | Indigo→Pink title | — |
| ForYou | `Blue→Indigo→Purple` | Blue-600 filters | Blue-600 |
| AllPosts | `Sky→Blue→Violet` | Emerald prices | Blue actions |
| PostDetail | Slate gradient bg | Orange CTA | Orange→Orange |
| AddPost | `Blue→Indigo→Purple` hero | Blue inputs | Emerald→Blue |
| Profile | `Sky→Blue→Violet` hero | Blue tabs | Blue-600 |
| Dashboard | `Blue-500→Blue-600` | Blue stats | Blue-700 |
| Rewards | Amber/Orange | Orange streak | Amber→Orange |
| Cart | Neutral | Indigo prices | Indigo→Blue |
| Wishlist | `Sky→Blue→Violet` hero | Pink actions | Pink→Purple |
| Chat | `Blue→Indigo` | Blue-600 sent | Blue-600 |
| Notifications | `Blue→Indigo` | Per-type icons | Blue pills |
| Search | Neutral | Blue submit | Blue→Indigo |
| Login | `Sky→Blue` page bg | Orange OTP | Sky→Blue |
| SignUp | `Indigo→Purple` page bg | Purple steps | Indigo→Purple |

---

## Internationalization (26 Languages)

### Supported Languages

| Code | Language | Code | Language |
|:-----|:---------|:-----|:---------|
| en | English | hi | Hindi |
| ta | Tamil | te | Telugu |
| kn | Kannada | ml | Malayalam |
| mr | Marathi | gu | Gujarati |
| bn | Bengali | pa | Punjabi |
| or | Odia | as | Assamese |
| ur | Urdu | ne | Nepali |
| sa | Sanskrit | ks | Kashmiri |
| sd | Sindhi | kok | Konkani |
| doi | Dogri | mai | Maithili |
| sat | Santali | mni | Manipuri |
| brx | Bodo | ar | Arabic |
| fr | French | es | Spanish |

### Implementation

```
client/src/i18n/index.js         # i18next configuration
client/src/locales/en.json       # 1,250+ English translation keys
client/public/locales/           # Per-language JSON bundles
```

**Setup:** i18next with `react-i18next`, lazy-loaded language bundles from `/locales/{lang}.json`, localStorage persistence for language preference.

**Usage pattern:**
```jsx
const { t } = useTranslation();
const tr = (key, fallback) => t(key, { defaultValue: fallback });

// In JSX:
<h1>{tr("my_wishlist", "My Wishlist")}</h1>
```

**Auto-translation:** `useTranslatedContent` hook with server-side translation API (`/api/translation`) for listing content translation on the fly.

---

## Rewards and Gamification System

### Overview

MHub uses a unified **Coins** currency for all rewards. Every action earns coins, which have a direct monetary value.

```
100 Coins = Rs 1
```

### Coin Economy

```mermaid
flowchart LR
    subgraph Earn["Ways to Earn"]
        Checkin["Daily Check-in<br/>10-50 coins"]
        Spin["Spin the Wheel<br/>5-500 coins"]
        Scratch["Scratch Cards<br/>10-100 coins"]
        Referral["Referrals<br/>5-100 coins/level"]
        Streak["Streaks<br/>Bonus multiplier"]
        Post["Posting<br/>10-50 coins"]
        Sale["Sale Complete<br/>50-200 coins"]
    end

    subgraph Balance["Coin Wallet"]
        Total["Total Coins"]
        Expiry["Expiry: Earned=365d<br/>Promo=90d"]
        FIFO["FIFO Spend Order"]
    end

    subgraph Spend["Ways to Spend"]
        Boost["Post Boosts"]
        Premium["Premium Features"]
        Store["Rewards Store"]
    end

    Earn --> Balance
    Balance --> Spend
```

### Coin Ledger

Each coin transaction is recorded in the `coin_transactions` table with:
- `amount` -- Coins earned or spent
- `remaining` -- Coins still available (for FIFO tracking)
- `expires_at` -- Expiry timestamp
- `idempotency_key` -- Prevents duplicate rewards

**Expiry Rules:**
- Earned coins: Expire after 365 days
- Promotional coins: Expire after 90 days
- FIFO spending: Oldest coins are spent first

### Tier System

| Tier | Coins Required | Benefits |
|:-----|:--------------|:---------|
| Bronze | 0 -- 499 | Basic marketplace access |
| Silver | 500 -- 1,999 | Priority support, enhanced visibility |
| Gold | 2,000 -- 4,999 | Premium badge, analytics dashboard |
| Platinum | 5,000+ | All Gold benefits + exclusive features |

Tier is computed from lifetime earned coins (not current balance).

### Daily Engagement

| Action | Base Reward | Streak Bonus |
|:-------|:-----------|:-------------|
| Daily Check-in | 10 coins | Up to 5x multiplier at 7-day streak |
| Spin the Wheel | 5-500 coins (random) | Once per day |
| Scratch Card | 10-100 coins (random) | Unlocked by referrals |
| Visit Streak | Bonus coins | Consecutive day rewards |
| Post Streak | Bonus coins | Consecutive posts |

---

## Referral Chain System

### 5-Level Reward Ladder

When a new user joins via a referral link, coins cascade up to 5 levels of the referral chain:

```
New User Joins
    |
    +-- Level 1 (Direct Referrer):     100 coins
    +-- Level 2 (Referrer's Referrer):  40 coins
    +-- Level 3:                        20 coins
    +-- Level 4:                        10 coins
    +-- Level 5:                         5 coins
```

### Safety Caps

| Cap | Limit | Period |
|:----|:------|:-------|
| Daily | 500 coins | Per ancestor, per day |
| Monthly | 5,000 coins | Per ancestor, per month |
| Lifetime | 50,000 coins | Per ancestor, total |

### Chain Status

Each referral has a status:
- **Pending** -- User signed up but not yet qualified
- **Qualified** -- User completed required actions
- **Rewarded** -- Coins distributed to referrer chain

### Activity-Triggered Chain Rewards

Beyond join bonuses, the referral chain also rewards for downstream activity:
- Default chain points: [2, 1, 0.5] coins per level
- Triggered by: new posts, completed transactions
- Service: `referralChainRewards.js`

### Technical Implementation

| Component | Purpose |
|:----------|:--------|
| `referralJoinRewards.js` (server) | 5-level join reward distribution |
| `referralChainRewards.js` (server) | Activity-triggered chain rewards |
| `referral_closure` (table) | Materialized ancestor-descendant paths |
| `ReferralChainTree.jsx` (client) | Interactive tree visualization |
| `RewardRulesCard.jsx` (client) | Rules and caps display |
| `GET /api/referral/tree` | Recursive CTE or closure table query |

### Visualization

The `ReferralChainTree` component renders an interactive tree:
- Color-coded by depth (L0-L4 with distinct colors)
- Expand/collapse per node
- Status badge (rewarded/qualified/pending)
- Reward amount indicator per level
- Statistics: direct count, total count, direct earnings, indirect earnings

---

## Trust and Safety Engine

### Trust Score Computation

Every user has a computed trust score (0-100) based on multiple signals:

```mermaid
flowchart LR
    subgraph Signals["Trust Signals"]
        Age["Account Age"]
        Verify["Verification Status"]
        Rating["Avg Rating"]
        Reviews["Review Count"]
        Trans["Transaction History"]
        Complaints["Complaint History"]
        Aadhaar["Aadhaar/KYC Status"]
    end

    Signals --> Engine["trustScoreService.js"]
    Engine --> Score["Trust Score (0-100)"]
    Score --> Badge["Trust Badge"]
    Score --> Risk["Risk Level"]

    Badge --> Display["Displayed on:<br/>- Profile<br/>- Listing Cards<br/>- Post Detail"]
```

### Trust Levels

| Score Range | Level | Badge |
|:------------|:------|:------|
| 0-25 | Low | Caution indicator |
| 26-50 | Moderate | Standard |
| 51-75 | Good | Verified checkmark |
| 76-100 | Excellent | Gold trusted badge |

### Fraud Detection Pipeline

```
Request --> WAF Enforcement --> VPN Detection --> Device Binding
    --> Risk Engine --> ML Fraud Scoring --> Decision
```

| Service | Purpose |
|:--------|:--------|
| `fraudService.js` | Pattern matching and rule-based detection |
| `riskEngine.js` | Real-time risk scoring |
| `mlFraudScoringService.js` | ML-based scoring model |
| `riskTelemetryService.js` | Event collection for analysis |
| `riskStateService.js` | User risk state management |

### Complaint SLA System

Complaints have severity-based SLAs:

| Severity | SLA Due | Auto-Escalation |
|:---------|:--------|:----------------|
| Low | 72 hours | After breach |
| Medium | 48 hours | After breach |
| High | 24 hours | After breach |
| Critical | 4 hours | Immediate |

Tracked via `sla_due_at` and `sla_breached_at` columns. `markSlaBreaches()` runs on complaint access to flag overdue items.

---

## Realtime Infrastructure

### Socket.IO Architecture

```mermaid
flowchart TB
    Client1["User A Browser"] -->|"WebSocket"| SocketServer["Socket.IO Server"]
    Client2["User B Browser"] -->|"WebSocket"| SocketServer

    SocketServer --> ChatRoom["Chat Rooms<br/>(per conversation)"]
    SocketServer --> NotifRoom["Notification Rooms<br/>(per user)"]
    SocketServer --> RewardSSE["Rewards SSE<br/>(real-time balance)"]

    ChatRoom -->|"message:new"| Client2
    NotifRoom -->|"notification:push"| Client1
    RewardSSE -->|"coins:updated"| Client1
```

### Event Types

| Event | Direction | Purpose |
|:------|:----------|:--------|
| `message:new` | Server to Client | New chat message |
| `message:read` | Client to Server | Read receipt |
| `notification:push` | Server to Client | New notification |
| `coins:updated` | Server to Client | Balance change |
| `typing:start` | Client to Server | Typing indicator |
| `typing:stop` | Client to Server | Stop typing |
| `user:online` | Server to Client | Online status |

### Push Notifications

| Channel | Technology | Use Case |
|:--------|:-----------|:---------|
| Web Push | VAPID protocol | Browser notifications when app is closed |
| FCM | Firebase Cloud Messaging | Android push notifications |
| Socket.IO | WebSocket | Real-time in-app notifications |
| Pusher | Backup channel | Critical event delivery fallback |

---

## Mobile and PWA

### Capacitor Native Bridge

MHub runs as a native Android app via Capacitor 8:

```
client/android/          # Native Android project
client/capacitor.config.json  # Capacitor configuration
```

**Native capabilities:**
- GPS location via `nativeGpsService.js`
- Push notifications via FCM
- Camera access for image upload
- Contacts access for referral invitations
- Deep linking for share URLs

### Progressive Web App

PWA configuration in `client/public/`:

| File | Purpose |
|:-----|:--------|
| `manifest.json` | PWA manifest (name, icons, theme color) |
| `sw.js` | Service worker for offline support |
| `push-sw.js` | Push notification service worker |
| `firebase-messaging-sw.js` | FCM background message handler |

**PWA Features:**
- Installable to home screen
- Offline-capable with service worker caching
- Push notifications
- Full-screen mode

---

## Testing Strategy (134 Test Files)

### Test Distribution

| Category | Framework | Count | Location |
|:---------|:----------|:-----:|:---------|
| Client Unit/Integration | Vitest | 42 | `client/tests/` |
| Server Unit/Integration | Jest | 87 | `server/tests/` |
| Server E2E | Jest + Python | 4 | `server/tests/e2e/` |
| Server Load | Custom | 1 | `server/tests/load/` |
| Client E2E | Playwright | -- | `client/e2e/` |

### Client Test Categories

| Category | Tests | Purpose |
|:---------|:-----:|:--------|
| Component Tests | 3 | Auth event routing, RequireAuth guard, Select component |
| Context Tests | 3 | AuthContext bootstrap/refresh, CartContext |
| Library Tests | 5 | API client, preflight, network config, profile sync, socket |
| Page Tests | 26 | Route contracts, state management, navigation, regression |
| Utility Tests | 3 | Auth error mapping, category mode filters, security |
| Smoke Tests | 1 | Basic render validation |

### Server Test Categories

| Category | Tests | Purpose |
|:---------|:-----:|:--------|
| Security Tests | 15 | WAF, auth, permissions, XSS, injection |
| Regression Tests | 12 | Controller behavior stability |
| Integration Tests | 8 | Full request lifecycle |
| Service Tests | 14 | Business logic unit tests |
| Middleware Tests | 10 | Request pipeline validation |
| Route Tests | 12 | API contract compliance |
| E2E Tests | 4 | User journey flows (top 10 journeys) |
| Load Tests | 1 | Throughput and latency measurement |

### Running Tests

```bash
# Client tests
cd client
npm test                    # Vitest unit/integration
npm run test:e2e:smoke      # Playwright E2E

# Server tests
cd server
npm test                    # All Jest tests
npm run test:critical-paths # Critical path integration
npm run test:e2e:journeys   # Top 10 user journeys
npm run test:waf            # WAF enforcement
npm run test:auth:integration # Real auth flow
npm run load:test           # Load testing
```

---

## Scripts and Automation

### Client Scripts

| Script | Purpose |
|:-------|:--------|
| `npm run dev` | Start dev server (via `dev-safe.mjs` with checks) |
| `npm run dev:fresh` | Clean start with cache clear |
| `npm run build` | Production build (Vite) |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint with zero-warning policy |
| `npm test` | Vitest unit/integration tests |
| `npm run test:e2e:smoke` | Playwright smoke tests |
| `npm run check:bundle-budget` | Bundle size enforcement |
| `npm run check:performance-budget` | Performance metrics check |
| `npm run check:no-hardcoded-localhost` | No hardcoded URLs |
| `npm run check:network-contract` | API contract validation |
| `npm run check:ux-smoke` | UX route smoke test |

### Server Scripts

| Script | Purpose |
|:-------|:--------|
| `npm start` | Production start (preflight + node) |
| `npm run dev` | Development with nodemon |
| `npm test` | Jest test suite |
| `npm run test:critical-paths` | Critical integration tests |
| `npm run test:e2e:journeys` | Top 10 user journey E2E |
| `npm run test:waf` | WAF enforcement tests |
| `npm run preflight:schema` | Schema validation before start |
| `npm run seed:sample-data` | Seed sample data |
| `npm run check:schema-contract` | Schema contract validation |
| `npm run check:route-contract` | Route contract validation |
| `npm run check:foundation-contract` | Foundation health check |
| `npm run check:runtime-contract` | Runtime probe |
| `npm run check:page-flow-contract` | Page flow probe |
| `npm run security:check` | npm audit (high severity) |
| `npm run load:test` | Load testing |
| `npm run readiness:probe-matrix` | Readiness check matrix |
| `npm run flags:simulate-rollout` | Feature flag simulation |
| `npm run failover:tabletop` | Failover drill |
| `npm run failover:active-active` | Active-active orchestration |
| `npm run risk:telemetry:export` | Export risk telemetry |
| `npm run backup:drill` | Backup verification drill |
| `npm run auth:verify` | Auth rollout verification |

---

## Environment Configuration

### Server Environment Variables

Create `server/.env` from `.env.example`:

```
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mhub
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mhub
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Cloudinary (Image Upload)
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret

# Firebase (Push Notifications)
FCM_SERVER_KEY=your_fcm_key

# Web Push (VAPID)
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key

# Aadhaar Verification
AADHAAR_API_KEY=your_key

# Referral Chain (overridable)
REFERRAL_CHAIN_COINS=100,40,20,10,5
REFERRAL_DAILY_CAP=500
REFERRAL_MONTHLY_CAP=5000
REFERRAL_LIFETIME_CAP=50000

# Feature Flags
FORCE_PREMIUM_CENTREPAGE=true
AUTO_CREATE_COMPLAINTS_TABLE=true
```

### Client Configuration

| File | Purpose |
|:-----|:--------|
| `vite.config.js` | Vite build configuration |
| `tailwind.config.js` | Tailwind CSS customization |
| `postcss.config.js` | PostCSS plugin pipeline |
| `eslint.config.js` | ESLint rules |
| `vercel.json` | Vercel deployment config |
| `capacitor.config.json` | Capacitor native config |
| `playwright.config.mjs` | Playwright test config |

---

## Security Architecture

### Defense in Depth

```mermaid
flowchart TB
    Internet["Internet"] --> CDN["CDN / Vercel Edge"]
    CDN --> Nginx["Nginx Reverse Proxy"]
    Nginx --> Helmet["Helmet (Security Headers)"]
    Helmet --> CORS["CORS (Origin Check)"]
    CORS --> Rate["Rate Limiter"]
    Rate --> WAF["WAF (Payload Scan)"]
    WAF --> VPN["VPN Blocker"]
    VPN --> ZT["Zero-Trust Gate"]
    ZT --> Auth["JWT Authentication"]
    Auth --> RBAC["Role-Based Access"]
    Auth --> Device["Device Binding"]
    Device --> App["Application Logic"]
    App --> DB["PostgreSQL<br/>(Parameterized Queries)"]
```

### Security Features by Layer

| Layer | Implementation | Threats Mitigated |
|:------|:---------------|:-----------------|
| Transport | HTTPS + HSTS | Man-in-the-middle |
| Headers | Helmet (CSP, X-Frame, etc.) | XSS, clickjacking |
| Origin | CORS allowlist | Cross-origin attacks |
| Rate Limiting | Per-IP + per-user limits | DDoS, brute force |
| WAF | Regex payload scanning | SQL injection, XSS |
| VPN/Proxy | IP reputation check | Evasion, fraud |
| Authentication | JWT + refresh rotation | Session hijacking |
| Authorization | RBAC + resource ownership | Privilege escalation |
| Device Binding | Fingerprint + session pin | Session theft |
| Zero-Trust | Continuous verification | Lateral movement |
| Fraud Detection | ML scoring + rule engine | Account takeover |
| 2FA/MFA | TOTP + adaptive trigger | Credential stuffing |
| Passkeys | WebAuthn/FIDO2 | Phishing |
| Data | Argon2 hashing, encryption | Data breach |
| Audit | Structured logging | Forensics |

### OWASP Top 10 Coverage

| OWASP Risk | Mitigation |
|:-----------|:-----------|
| A01 Broken Access Control | RBAC, resource ownership checks, RequireAuth |
| A02 Cryptographic Failures | Argon2 hashing, HTTPS, JWT signing |
| A03 Injection | Parameterized queries, WAF, input validation |
| A04 Insecure Design | Threat modeling, defense in depth |
| A05 Security Misconfiguration | Helmet, CSP, env validation |
| A06 Vulnerable Components | npm audit, dependency review |
| A07 Auth Failures | 2FA, passkeys, rate limiting, breach check |
| A08 Data Integrity Failures | CSRF tokens, signed JWTs |
| A09 Logging Failures | Structured audit logging, request logger |
| A10 SSRF | URL validation, allowlisting |

---

## Performance and Optimization

### Frontend Performance

| Technique | Implementation |
|:----------|:---------------|
| Code Splitting | `React.lazy()` with `lazyWithRetry` wrapper for all 56 page components |
| Tree Shaking | Vite 5 production build with dead code elimination |
| Image Optimization | Lazy loading, Cloudinary transformations, responsive sizes |
| Bundle Budget | `check-bundle-budget.mjs` script enforces size limits |
| Performance Budget | `check-performance-budget.mjs` enforces load time targets |
| Caching | TanStack Query with stale-while-revalidate |
| Virtualization | Intersection observer for infinite scroll |
| Deduplication | Cursor-based pagination with item deduplication |

### Backend Performance

| Technique | Implementation |
|:----------|:---------------|
| Query Optimization | 61 migration files include targeted indexes |
| Connection Pooling | PostgreSQL pool with configurable limits |
| Redis Caching | `cacheService.js` with stampede protection |
| Cache Warming | `cacheWarming.js` pre-loads hot data on startup |
| View Buffering | `postViewBufferService.js` batches view count writes |
| Full-Text Search | PostgreSQL tsvector with ranked results |
| N+1 Prevention | JOIN-based queries with selective column loading |
| Runtime Budget | `runtimeBudget.js` middleware enforces request timeouts |

### Database Indexes

Key indexes from migrations:

| Index | Purpose |
|:------|:--------|
| `idx_posts_category_status` | Category-filtered queries |
| `idx_posts_user_id` | User's posts lookup |
| `idx_posts_created_at` | Time-sorted feeds |
| `idx_wishlists_user_post` | Wishlist uniqueness + lookup |
| `idx_complaints_sla_due_open` | SLA breach detection |
| `idx_complaints_severity_status` | Severity-based filtering |
| `idx_referral_closure_ancestor` | Referral tree traversal |
| Composite indexes | Multi-column query optimization (migration 009) |
| Full-text search indexes | Text search ranking (migration 005) |

---

## Deployment and Infrastructure

### Production Architecture

```
                    +-------------------+
                    |   Vercel Edge     |
                    |   (Client SPA)    |
                    +---------+---------+
                              |
                    +---------+---------+
                    |  Nginx Reverse    |
                    |     Proxy         |
                    +---------+---------+
                              |
                    +---------+---------+
                    |   PM2 Process     |
                    |   Manager         |
                    |   (Node.js)       |
                    +---------+---------+
                              |
              +---------------+---------------+
              |               |               |
        +-----+-----+  +-----+-----+  +------+------+
        | PostgreSQL |  |   Redis   |  | Cloudinary  |
        |     17     |  |     7     |  |    CDN      |
        +-----------+  +-----------+  +-------------+
```

### PM2 Configuration

Defined in `server/ecosystem.config.js`:
- Cluster mode with max instances
- Memory restart threshold: 500 MB
- Production process management

### Client Deployment (Vercel)

Configuration in `client/vercel.json`:
- SPA routing (all paths to index.html)
- Static asset caching headers
- Edge function configuration

### Nginx Configuration

`server/nginx.conf` provides:
- Reverse proxy to Node.js
- Static file serving
- SSL termination
- Gzip compression
- WebSocket upgrade handling

---

## Migration History (61 Migrations)

### Numbered Migrations (Ordered)

| # | File | Purpose |
|:-:|:-----|:--------|
| 001 | `location_village_colony` | Village/colony location granularity |
| 002 | `subscription_plans` | Tier-based subscription system |
| 003 | `coin_economy` | Coin transaction infrastructure |
| 004 | `performance_indexes` | Query optimization indexes |
| 005 | `search_ranking` | Full-text search scoring |
| 006 | `coin_transactions_uuid_fix` | UUID compatibility for coins |
| 007 | `user_subscriptions_uuid_fix` | UUID compatibility for subscriptions |
| 008 | `feature_consolidation` | Feature flag cleanup |
| 008b | `bronze_support` | Bronze tier support |
| 009 | `composite_indexes` | Multi-column query optimization |
| 009 | `user_locations_village_colony` | User location updates |
| 010 | `update_subscription_plan_quotas` | Plan limits enforcement |
| 011 | `webauthn_passkeys` | FIDO2/WebAuthn credential storage |
| 012 | `rewards_engagement` | Daily check-in, spin, scratch tables |
| 013 | `subcategory_metadata` | Subcategory metadata fields |
| 013 | `subscription_rewards_foundation` | Rewards-subscription integration |
| 014 | `missing_tables_20260319` | Schema gap fill |
| 015 | `reward_idempotency` | Idempotent reward mutations |
| 016 | `referral_chain_rewards` | Multi-level referral chain |
| 017 | `notifications_cart_recently_viewed` | Notification + cart + history tables |
| 018 | `cart_tables_legacy_int` | Legacy integer cart support |
| 019 | `user_rating_count_and_aadhaar_flag` | Rating count + Aadhaar flag |
| 020 | `rewards_chain_complete` | Full referral closure + streaks + XP/level |
| 021 | `schema_migrations_tracking` | Migration tracking table |

### Feature Migrations (Alphabetical)

| File | Purpose |
|:-----|:--------|
| `add_admin_moderation_contract` | Admin moderation schema |
| `add_category_grouping_leo` | Category grouping logic |
| `add_complaint_sla_and_evidence` | Complaint SLA + evidence metadata |
| `add_device_analytics` | Device analytics tables |
| `add_kyc_fields` | KYC document fields |
| `add_kyc_review_queue` | KYC review queue |
| `add_location_verification_tables` | Location verification |
| `add_lockout_columns` | Account lockout fields |
| `add_login_history` | Login audit trail |
| `add_offers_and_flash_sales` | Offers and flash sales |
| `add_otp_delivery_tracking` | OTP delivery tracking |
| `add_post_boosts` | Post boost functionality |
| `add_query_path_indexes` | Query path optimization |
| `add_review_moderation_controls` | Review moderation (hide, flag, abuse) |
| `add_rewards_referral_hierarchy` | Referral hierarchy |
| `add_risk_decision_events` | Risk decision log |
| `add_subcategories` | Subcategory system |
| `add_tier_enforcement` | Tier-based limits |
| `add_user_streaks` | User streak tracking |

### Backfill and Seed Migrations

| File | Purpose |
|:-----|:--------|
| `backfill_active_post_expiry` | Post expiration dates |
| `backfill_engagement_counts` | Engagement metrics |
| `backfill_missing_profiles` | Profile records for all users |
| `backfill_seed_categories` | Default category data |
| `backfill_seed_coordinates` | Location coordinates |
| `backfill_seed_images` | Sample listing images |
| `seed_sample_data` | Development sample data |
| `create_test_user` | Test user for E2E |

### Security and Performance Migrations

| File | Purpose |
|:-----|:--------|
| `defender_schema` | Security defender tables |
| `defender_payment_tables` | Payment security |
| `device_binding_and_rate_limiting` | Device binding + rate limit tables |
| `flipkart_auth_migration` | Advanced auth schema |
| `login_history_setup` | Login history infrastructure |
| `migration_security` | Migration security audit |
| `performance_indexes` | Performance-critical indexes |
| `performance_optimization_2025` | 2025 optimization pass |
| `production_hardening` | Production hardening |
| `schema_remediation` | Schema fix-ups |
| `uuid_final_fix` | UUID type consistency |
| `zero_trust_hardening` | Zero-trust tables |

---

## Roadmap

### Planned Features

| Feature | Status | Description |
|:--------|:------:|:-----------|
| Coin Rewards Store | Planned | Redeem coins for marketplace benefits |
| Advanced Seller Analytics | In Progress | Revenue trends, buyer demographics |
| Video Listings | Planned | Video upload support for listings |
| AI-Powered Search | Planned | Semantic search with embeddings |
| Rich Centre Pages | Planned | Cover photos, pinned listings, social links |
| Multi-Currency Support | Planned | Beyond INR |
| Seller Badges | Planned | Achievement-based seller recognition |
| In-App Payments (UPI) | Planned | Direct payment processing |
| Buyer Protection | Planned | Escrow-based transaction safety |
| Push Notification Campaigns | Planned | Targeted push via segmentation |

---

## Contributing

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
5. Submit a pull request with description of changes

### Code Conventions

| Area | Convention |
|:-----|:----------|
| Components | PascalCase, `.jsx` extension |
| Hooks | `useHookName.js` pattern |
| Services | camelCase, `.js` extension |
| Controllers | `nameController.js` pattern |
| Middleware | camelCase, `.js` extension |
| Routes | camelCase, `.js` extension |
| Tests | `name.test.js` or `name.test.jsx` |
| CSS | Tailwind utilities + CSS custom properties |
| i18n | `tr("key", "Fallback text")` pattern |

### File Organization Rules

- Pages go in `client/src/pages/`
- Reusable components go in `client/src/components/`
- Domain-specific components get sub-folders (e.g., `components/rewards/`)
- Hooks go in `client/src/hooks/`
- Server routes go in `server/src/routes/`
- Controllers go in `server/src/controllers/`
- Business logic goes in `server/src/services/`

---

## Changelog

### 2026-04 (Current)

**Rewards System Overhaul**
- Unified "Coins" terminology across entire platform
- 5-tab RewardsPage: Overview, Network, Earn, Store, History
- Coin-to-rupee display utility (100 coins = Rs 1)
- FIFO spend logic with expiry (earned: 365 days, promo: 90 days)
- Tier progress visualization (Bronze/Silver/Gold/Platinum)
- Referral chain tree visualization (5-level interactive tree)

**Referral Chain System**
- 5-level reward ladder: L1=100, L2=40, L3=20, L4=10, L5=5 coins
- Safety caps: 500/day, 5,000/month, 50,000/lifetime per ancestor
- Chain status tracking (pending/qualified/rewarded)
- Activity-triggered chain rewards for posts and transactions
- `referral_closure` materialized table for efficient tree queries

**Seller and Buyer Ratings**
- Category-specific rating dimensions (communication, quality, value, shipping)
- Review moderation: flagging, auto-hide, abuse scoring
- Helpful votes and seller responses
- `UserRatingProfile` component with full breakdown

**Centre Pages**
- Professional seller pages with 5-tab interface
- Follow/unfollow system with updates feed
- Featured Centre Page showcase
- Verification and Premium badges
- Owner-only analytics dashboard

**Bug Fixes**
- Fixed complaints/my 500 error: `users.full_name` column reference corrected to JOIN with `profiles` table
- Fixed `post_id` type mismatch in complaints query (TEXT vs INTEGER casting)
- Removed deprecated `/my-recommendations` route
- Redirected `/category-mode` to `/category-hub`

### 2026-03

**Foundation**
- Initial platform launch with React 18 + Vite 5 + Express 5
- PostgreSQL 17 database with 20+ core tables
- 57 API endpoint groups
- 40 security middleware layers
- 26-language i18n infrastructure
- Capacitor 8 Android native bridge
- Socket.IO realtime chat and notifications
- WebAuthn/FIDO2 passkey authentication
- Trust score computation engine
- Fraud detection pipeline (WAF + VPN + ML scoring)

---

<p align="center">
  <strong>MHub</strong> -- The Category-Native Marketplace Platform<br/>
  <em>Built with care for users, sellers, and developers.</em>
</p>
<p align="center">
  <img src="client/public/icons/icon-192x192.png" alt="MHub Logo" width="80" height="80" />
</p>

<h1 align="center">MHub</h1>

<p align="center">
  <strong>The Category-Native Marketplace Platform</strong><br/>
  <em>One app. Every category. Every community.</em>
</p>

<p align="center">
  <a href="#-quick-start"><img src="https://img.shields.io/badge/Quick_Start-→-blue?style=for-the-badge" alt="Quick Start" /></a>
  <a href="#-architecture"><img src="https://img.shields.io/badge/Architecture-→-purple?style=for-the-badge" alt="Architecture" /></a>
  <a href="#-features"><img src="https://img.shields.io/badge/Features-→-green?style=for-the-badge" alt="Features" /></a>
  <a href="#-api-reference"><img src="https://img.shields.io/badge/API_Ref-→-orange?style=for-the-badge" alt="API" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/PostgreSQL-17-336791?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socket.io&logoColor=white" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor&logoColor=white" alt="Capacitor" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/i18n-26_Languages-F7DF1E" alt="i18n" />
  <img src="https://img.shields.io/badge/Tests-Vitest_|_Jest_|_Playwright-6E9F18" alt="Tests" />
  <img src="https://img.shields.io/badge/License-Proprietary-red" alt="License" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Pages-67_Routes-blueviolet" alt="Pages" />
  <img src="https://img.shields.io/badge/API_Endpoints-60+_Route_Files-blue" alt="API Endpoints" />
  <img src="https://img.shields.io/badge/Components-100+_UI_Components-green" alt="Components" />
  <img src="https://img.shields.io/badge/Services-55+_Backend_Services-orange" alt="Services" />
  <img src="https://img.shields.io/badge/Middleware-40+_Security_Layers-red" alt="Middleware" />
</p>

---

<details>
<summary><strong>📑 Table of Contents</strong> <em>(click to expand)</em></summary>

### Foundation
- [Platform Vision](#-platform-vision)
- [Quick Start](#-quick-start)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)

### Application
- [Features](#-features)
- [Page Directory (All 67 Routes)](#-page-directory--all-67-routes)
- [App Flow Atlas (User + Developer Lens)](#-app-flow-atlas-user--developer-lens)
- [Product + Engineering Handbook (Printable Layout)](#-product--engineering-handbook-printable-layout)
- [Page-by-Page Feature Map](#-page-by-page-feature-map)
- [Navigation Architecture](#-navigation-architecture)
- [Authentication & Access Control](#-authentication--access-control)

### Backend
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Middleware Pipeline](#-middleware-pipeline)
- [Service Layer](#-service-layer)

### Frontend
- [Component Library](#-component-library)
- [State Management](#-state-management)
- [Theming & Design System](#-theming--design-system)
- [Internationalization](#-internationalization)

### Platform
- [Rewards & Gamification System](#-rewards--gamification-system)
- [Trust & Safety Engine](#-trust--safety-engine)
- [Realtime Infrastructure](#-realtime-infrastructure)
- [Mobile & PWA](#-mobile--pwa)

### Operations
- [Testing Strategy](#-testing-strategy)
- [Scripts & Automation](#-scripts--automation)
- [Environment Configuration](#-environment-configuration)
- [Security Architecture](#-security-architecture)
- [Performance & Optimization](#-performance--optimization)

### Reference
- [World-Class Repo Inspirations](#-world-class-repo-inspirations)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Changelog](#-changelog)

</details>

---

## 🌟 Platform Vision

> **MHub is a category-native marketplace** that behaves like multiple specialized marketplace apps inside a single product.

Unlike generic classifieds where all categories live in one undifferentiated feed, MHub pivots its entire UI — discovery, filters, recommendations, and seller flow — based on the user's chosen category context. This makes buying electronics feel different from buying fashion, which feels different from browsing real estate.

### For Users
- **Browse** thousands of listings across categories with intelligent discovery
- **Sell** with a guided posting flow, tier-based visibility, and seller analytics
- **Earn** coins & rewards through daily activity, referrals, and streaks
- **Trust** — every seller has a computed trust score, verification badges, and review history
- **Chat** — real-time messaging with buyers and sellers
- **Save** — wishlists, saved searches, recently viewed, and price alerts

### For Developers
- **67 distinct routes** across marketplace, social, commerce, and admin surfaces
- **60+ API route files** covering auth, commerce, trust, gamification, and platform ops
- **40+ security middleware** layers from WAF to device binding to zero-trust
- **55+ backend services** spanning fraud detection to fleet orchestration
- **100+ reusable components** built on Radix UI + Tailwind primitives
- **26 languages** with full i18n infrastructure
- **Full-stack type safety** via consistent API contracts and validation

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | ≥ 18.x | Runtime |
| **PostgreSQL** | ≥ 15 | Database |
| **Redis** | ≥ 7.x | Cache & sessions |
| **npm** | ≥ 9.x | Package manager |

### 1. Clone & Install

```bash
git clone https://github.com/your-org/mhub.git
cd mhub

# Install server dependencies
cd server
cp .env.example .env        # Configure your database credentials
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Database Setup

```bash
cd server

# Run the complete schema setup
node scripts/ops/run_migration.js

# Seed sample data (optional)
npm run seed:sample-data
```

### 3. Start Development

```bash
# Terminal 1 — API Server (port 5001)
cd server
npm run dev

# Terminal 2 — Client App (port 5173)
cd client
npm run dev
```

### 4. Open in Browser

```
http://localhost:5173
```

### Quick Verify

```bash
# Client build check
cd client && npm run build

# Server test suite
cd server && npm test

# Schema validation
cd server && npm run preflight:schema
```

---

## 🧱 Tech Stack

### Client Application

| Technology | Role | Why |
|------------|------|-----|
| **React 18** | UI framework | Component model, concurrent features, ecosystem |
| **Vite 5** | Build tool | Sub-second HMR, optimized production builds |
| **React Router 6** | Navigation | Nested routes, lazy loading, auth guards |
| **TanStack Query 5** | Server state | Cache, refetch, infinite scroll, optimistic updates |
| **Tailwind CSS 3.4** | Styling | Utility-first, dark mode, responsive, design tokens |
| **Radix UI** | Primitives | Accessible dialog, dropdown, tabs, toast, switch |
| **Lucide React** | Icons | Consistent, tree-shakeable icon library |
| **Socket.IO Client** | Realtime | Bidirectional communication for chat & notifications |
| **Capacitor 8** | Native bridge | Android/iOS with native GPS, contacts, push |
| **i18next** | Internationalization | 26 languages with lazy loading & localStorage cache |
| **Axios** | HTTP client | Interceptors, token refresh, CSRF, abort controllers |

### Server Application

| Technology | Role | Why |
|------------|------|-----|
| **Express 5** | HTTP framework | Mature, middleware-driven, async/await native |
| **PostgreSQL 17** | Database | ACID, JSONB, full-text search, CTEs, triggers |
| **Redis (ioredis)** | Cache layer | Session store, rate limiting, cache invalidation |
| **Socket.IO 4** | Realtime server | Room-based events, reconnection, acknowledgments |
| **Argon2 + bcrypt** | Password hashing | Dual-algo support, memory-hard hashing |
| **JWT + Refresh** | Token auth | Short-lived access + long-lived refresh rotation |
| **SimpleWebAuthn** | Passkeys/WebAuthn | Passwordless auth, FIDO2 standard |
| **Sharp** | Image processing | Resize, compress, format conversion |
| **Cloudinary** | Media CDN | Image hosting, transformation, optimization |
| **Helmet** | Security headers | CSP, HSTS, X-Frame, referrer policy |
| **Web Push** | Notifications | Push notifications via VAPID protocol |
| **Pusher** | Realtime events | Backup channel for critical event delivery |

### Infrastructure & Tooling

| Tool | Purpose |
|------|---------|
| **Vitest** | Frontend unit & integration testing |
| **Jest** | Backend testing with critical path coverage |
| **Playwright** | End-to-end browser testing (smoke & visual) |
| **ESLint** | Code quality enforcement |
| **PostCSS** | CSS processing pipeline |
| **PM2** | Production process management |
| **Nginx** | Reverse proxy & static serving |

---

## 🏗 Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER DEVICES                                │
│           Web Browser  ·  Android (Capacitor)  ·  PWA              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    ┌──────────┴──────────┐
                    │   CLIENT APP        │
                    │   React + Vite      │
                    │   67 Routes         │
                    │   100+ Components   │
                    │   6 Context Providers│
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │ HTTP/REST      │ WebSocket       │ Push
              │ (Axios)        │ (Socket.IO)     │ (FCM/VAPID)
              │                │                 │
    ┌─────────┴─────────┐  ┌──┴──────────┐  ┌──┴──────────┐
    │   EXPRESS API      │  │  REALTIME   │  │   PUSH      │
    │   60+ Route Files  │  │  ENGINE     │  │   SERVICE   │
    │   46 Controllers   │  │  Chat/Notif │  │   FCM/Web   │
    │   40+ Middleware   │  │  Rewards SSE│  │   Push      │
    │   55+ Services     │  └─────────────┘  └─────────────┘
    └─────────┬─────────┘
              │
    ┌─────────┼──────────────────────┐
    │         │                      │
┌───┴───┐ ┌──┴────┐ ┌───────────────┴─────────────────┐
│Postgre│ │ Redis │ │ External Services                │
│  SQL  │ │       │ │ Cloudinary · Aadhaar · Payments  │
│ 20+   │ │ Cache │ │ FCM · VAPID · Geolocation        │
│Tables │ │Session│ │                                   │
└───────┘ └───────┘ └─────────────────────────────────────┘
```

### Frontend Architecture

```
client/src/
├── App.jsx                 # Root: Router + Providers + 67 Routes
├── main.jsx                # Entry: React DOM + i18n bootstrap
├── index.css               # Global styles + theme imports
│
├── pages/                  # 60+ page-level components
│   ├── AllPosts.jsx        # Discovery feed
│   ├── PostDetail.jsx      # Listing detail
│   ├── Profile.jsx         # User account (4 tabs)
│   ├── Rewards.jsx         # Gamification hub
│   ├── Chat.jsx            # Realtime messaging
│   └── ...
│
├── components/             # 100+ reusable UI components
│   ├── GreenNavbar.jsx     # Primary navigation (top + bottom)
│   ├── GreenProductCard.jsx# Listing card
│   ├── RequireAuth.jsx     # Auth guard HOC
│   ├── ui/                 # Radix UI primitives (shadcn)
│   ├── rewards/            # Rewards section components
│   ├── legal/              # Legal page components
│   └── page-state/         # Loading/Error/Empty states
│
├── context/                # 6 React Context providers
│   ├── AuthContext.jsx     # Auth state, login, logout, refresh
│   ├── CartContext.jsx     # Shopping cart state
│   ├── CategoryModeContext.jsx  # Category app mode
│   ├── FilterContext.jsx   # Global filter state
│   ├── LocationContext.jsx # GPS & location state
│   └── ThemeContext.jsx    # Dark/light/system theme
│
├── hooks/                  # 18 custom hooks
│   ├── useNotifications.js # TanStack Query notification hooks
│   ├── useRealtimeChat.js  # Socket.IO chat integration
│   ├── useTrustScore.js    # Trust badge computation
│   ├── useInfiniteScroll.js# Pagination hook
│   └── ...
│
├── services/               # Client-side service layer
│   ├── api.js              # Axios instance + interceptors
│   ├── vpnDetection.js     # VPN/proxy detection
│   ├── deviceFingerprint.js# Browser fingerprinting
│   └── nativeGpsService.js # Capacitor GPS bridge
│
├── utils/                  # 25 utility modules
│   ├── authStorage.js      # Token & session helpers
│   ├── savedPosts.js       # Wishlist local state
│   ├── formatPrice.js      # Rs currency formatting
│   ├── relativeTime.js     # "2 hours ago" formatting
│   └── ...
│
├── lib/                    # Core library integrations
│   ├── socket.js           # Socket.IO client setup
│   ├── firebase.js         # FCM integration
│   ├── pushService.js      # Web Push subscription
│   └── requestSecurity.js  # Hardened request headers
│
├── styles/                 # Theme & design tokens
│   └── themes/
│       ├── light-theme.css # 100+ CSS variable tokens
│       ├── dark-theme.css  # Dark palette tokens
│       ├── dark-overrides.css
│       └── dark-comprehensive.css
│
├── locales/                # i18n translation files
│   └── en.json             # 1,250+ translation keys
│
├── constants/              # App constants
│   ├── languages.js        # 26 supported languages
│   └── categoryIcons.js    # Category → icon mapping
│
└── i18n/                   # i18n configuration
    └── index.js            # i18next setup with backends
```

### Backend Architecture

```
server/src/
├── index.js                # Express app + route mounting + Socket.IO
│
├── routes/                 # 60+ API route files
│   ├── auth.js             # /api/auth/*
│   ├── posts.js            # /api/posts/*
│   ├── chat.js             # /api/chat/*
│   ├── rewards.js          # /api/rewards/*
│   ├── coins.js            # /api/coins/*
│   ├── notifications.js    # /api/notifications/*
│   ├── payments.js         # /api/payments/*
│   └── ...                 # 53 more route files
│
├── controllers/            # 46 controller files
│   ├── authController.js   # Auth logic (login, signup, OTP, passkeys)
│   ├── postController.js   # CRUD + search + boost
│   ├── chatController.js   # Conversations + messages
│   ├── rewardsController.js# Points, tiers, leaderboard
│   ├── coinController.js   # Coin economy (spin, checkin, scratch)
│   └── ...
│
├── services/               # 55+ business logic services
│   ├── rewardsLedgerService.js     # Idempotent point mutations
│   ├── referralChainRewards.js     # Multi-level referral chain
│   ├── streakRewardsService.js     # Visit/post streak tracking
│   ├── leaderboardRewardsService.js# Weekly leaderboard rewards
│   ├── trustScoreService.js        # Trust score computation
│   ├── fraudService.js             # Fraud detection
│   ├── riskEngine.js               # Risk scoring engine
│   └── ...
│
├── middleware/              # 40+ middleware layers
│   ├── auth.js             # JWT verification
│   ├── rbac.js             # Role-based access control
│   ├── wafEnforcement.js   # Web application firewall
│   ├── vpnBlocker.js       # VPN/proxy blocking
│   ├── deviceBinding.js    # Session-device pinning
│   ├── zeroTrust.js        # Zero-trust verification
│   └── ...
│
├── utils/                  # Database helpers, logger, etc.
│   ├── dbHelpers.js        # Pool, query timeouts, helpers
│   └── logger.js           # Structured logging
│
└── worker/                 # Background job processing
```

---

## 🎯 Features

### Feature Matrix

| Category | Feature | Status | Auth | Route |
|:---------|:--------|:------:|:----:|:------|
| **Discovery** | | | | |
| | Category Hub (Home) | ✅ | — | `/category-hub` |
| | All Posts Feed | ✅ | — | `/all-posts` |
| | Personalized For You | ✅ | — | `/for-you` |
| | Community Feed | ✅ | — | `/feed` |
| | Nearby Listings | ✅ | 🔒 | `/nearby` |
| | Global Search | ✅ | — | `/search` |
| | Public Wall | ✅ | — | `/public-wall` |
| | Home Discovery | ✅ | — | `/home` |
| **Listings** | | | | |
| | Listing Detail | ✅ | — | `/post/:id` |
| | Add Post (Sell) | ✅ | 🔒 | `/add-post` |
| | Quick Post | ✅ | 🔒 | `/post_add` |
| | Feed Post | ✅ | 🔒 | `/feed/feedpostadd` |
| | Edit Post | ✅ | 🔒 | `/edit-post/:postId` |
| | My Posts | ✅ | 🔒 | `/my-home` |
| | Seller Dashboard | ✅ | 🔒 | `/dashboard` |
| **Commerce** | | | | |
| | Cart | ✅ | 🔒 | `/cart` |
| | Wishlist | ✅ | 🔒 | `/wishlist` |
| | Offers | ✅ | — | `/offers` |
| | Buy History | ✅ | 🔒 | `/bought-posts` |
| | Sell History | ✅ | 🔒 | `/sold-posts` |
| | Sale Complete | ✅ | 🔒 | `/saledone` |
| | Sale Undo | ✅ | 🔒 | `/saleundone` |
| | Buyer View | ✅ | 🔒 | `/buyer-view` |
| **Social** | | | | |
| | Realtime Chat | ✅ | 🔒 | `/chat` |
| | Channels | ✅ | — | `/channels` |
| | Centre Pages | ✅ | 🔒 | `/centre` |
| | Activity Hub | ✅ | 🔒 | `/activity` |
| | Reviews | ✅ | — | `/reviews/:userId` |
| | My Feed | ✅ | 🔒 | `/my-feed` |
| **Rewards** | | | | |
| | Rewards Dashboard | ✅ | 🔒 | `/rewards` |
| | Daily Check-in | ✅ | 🔒 | API |
| | Spin the Wheel | ✅ | 🔒 | API |
| | Scratch Cards | ✅ | 🔒 | API |
| | Referral Chain | ✅ | 🔒 | API |
| | Streak Bonuses | ✅ | 🔒 | API |
| | Leaderboard | ✅ | 🔒 | API |
| | Tier System | ✅ | 🔒 | API |
| **Account** | | | | |
| | Profile (4 tabs) | ✅ | 🔒 | `/profile` |
| | Notifications | ✅ | 🔒 | `/notifications` |
| | Security Settings | ✅ | 🔒 | `/security` |
| | Payments | ✅ | 🔒 | `/payment` |
| | KYC Verification | ✅ | 🔒 | `/kyc` |
| | Aadhaar Verify | ✅ | 🔒 | `/aadhaar-verify` |
| | Posting Plans | ✅ | 🔒 | `/tier-selection` |
| **Admin** | | | | |
| | Admin Panel | ✅ | 🔒👑 | `/admin-panel` |
| | Analytics | ✅ | — | `/analytics` |
| | Seller Analytics | ✅ | 🔒 | API |

> 🔒 = Requires authentication &nbsp;&nbsp; 👑 = Requires admin role &nbsp;&nbsp; ✅ = Implemented

---

### 1. Category-Native Marketplace

> *The core differentiator — MHub pivots its entire experience based on category context.*

```
User selects "Electronics" → UI shows tech-optimized filters, specs,
  price comparisons, and electronics-specific discovery

User switches to "Fashion" → UI pivots to size filters, style
  recommendations, and fashion-optimized card layouts
```

**Key Behaviors:**
- **Category Mode Selector** — Full-screen mode picker at `/category-mode`
- **Scoped Filtering** — Search, price range, subcategories, and condition filters scope to active category
- **Cart Scoping** — Cart badge reflects items in current category context
- **Feed Scoping** — Discovery feeds filter by active category mode
- **Persistent Selection** — Category mode persists across sessions via localStorage

**Technical Implementation:**
- `CategoryModeContext` provides `activeApp`, `activeCategory`, and `categories` to all components
- `categoryModeFilters.js` utility builds matchers for filtering posts by active mode
- `GreenNavbar` dynamically adjusts subcategory dropdowns per category
- All API calls include category mode as query parameter via Axios interceptor

---

### 2. Discovery & Search

> *Multiple discovery surfaces ensure users find what they need, however they browse.*

| Surface | Description | Key Feature |
|---------|-------------|-------------|
| **Category Hub** | Grid of all categories with stats | Hub stats, trending sections |
| **All Posts** | Infinite-scroll listing feed | Sort, filter, condition, price range |
| **For You** | ML-powered recommendations | Preference-aware, personalized |
| **Feed** | Community/social activity stream | Posts, updates, engagement |
| **Nearby** | Location-based discovery | GPS radius, distance display |
| **Search** | Global text search | Cross-category, instant results |
| **Public Wall** | Social proof surface | Top sellers, buyers, activity |

**Search & Filter Capabilities:**
- Text search with debouncing
- Price range (min/max)
- Condition filter (New, Like New, Good, Fair)
- Subcategory scoping
- Location-based filtering
- Verified sellers only toggle
- Sort by: newest, price low/high, relevance
- Infinite scroll with `useInfiniteScroll` hook

---

### 3. Listing & Seller Workflow

> *From posting to sale completion — a full listing lifecycle.*

```
Sell Welcome → Add Post → My Posts → Offers → Sale Done
     │              │          │                  │
     ▼              ▼          ▼                  ▼
  Guide &      Multi-image   Manage &        Transaction
  tier info    upload, GPS   boost, edit      stepper
               auto-location
```

**Post Creation:**
- Multi-image upload with compression (`browser-image-compression`)
- Server-side image optimization (`sharp`)
- CDN hosting via Cloudinary
- GPS auto-location detection
- Category & subcategory selection
- Condition, price, description, and contact info
- Draft saving and edit capability

**Seller Tools:**
- **My Posts** (`/my-home`) — View, edit, delete, boost listings
- **Dashboard** (`/dashboard`) — Sales analytics, view counts, engagement
- **Seller Analytics** — Revenue tracking, performance metrics
- **Post Boost** — Visibility enhancement via coin spending
- **Guaranteed Reach** — Premium visibility tier

---

### 4. Commerce & Transactions

> *End-to-end transaction flow from interest to completion.*

| Step | Component | Description |
|------|-----------|-------------|
| 1 | **Buyer Interest** | Buyer sends interest via `BuyerInterestModal` |
| 2 | **Offer** | Price negotiation through `MakeOfferModal` |
| 3 | **Chat** | Real-time negotiation via Socket.IO |
| 4 | **Sale Done** | Seller marks complete with `TransactionStepper` |
| 5 | **Sale Undo** | Revert if needed with audit trail |
| 6 | **Review** | Post-transaction rating at `/reviews/:userId` |

**Cart System:**
- Add to cart from listing detail
- Category-scoped cart count in navbar
- `MiniCartPopover` for quick overview
- Quantity management
- Price subtotals

**Transaction History:**
- **Bought Posts** — All purchases with status tracking
- **Sold Posts** — All sales with revenue summary
- **Buyer View** — Buyer-centric interface for active transactions

---

### 5. Chat & Messaging

> *Real-time communication powered by Socket.IO with typing indicators and online presence.*

**Features:**
- 1-on-1 conversations between buyers and sellers
- Real-time message delivery via WebSocket
- Typing indicators with debouncing
- Online/offline presence tracking
- Message history with infinite scroll
- Audio recording capability (`AudioRecorder` component)
- Push notification fallback for offline users

**Technical Stack:**
- `Socket.IO` with token-authenticated connections
- `useRealtimeChat` hook for UI integration
- Room-based architecture (`user_{id}` channels)
- Reconnection with exponential backoff
- Server-side message persistence in PostgreSQL

---

### 6. User Profile System

> *Rich profile with 4 tabs covering every aspect of the user account.*

```
/profile
├── ?tab=overview     # Activity summary, trust score, stats
├── ?tab=personal     # Name, email, phone, avatar
├── ?tab=preferences  # Category preferences, notifications, language
└── ?tab=settings     # Privacy, security, data export, delete
```

**Profile Features:**
- Avatar with intelligent color generation (`avatarColor.js`)
- Trust score display with badge (Verified/New/Risky)
- Activity statistics (listings, sales, purchases)
- Verification status indicator
- Edit personal information
- Notification preference management
- Language selection (26 languages)
- Privacy controls and data management

---

### 7. Notifications System

> *Multi-channel notification delivery with real-time updates.*

**Channels:**
| Channel | Technology | Use Case |
|---------|-----------|----------|
| In-App | TanStack Query polling | Badge counts, notification list |
| WebSocket | Socket.IO events | Instant delivery, chat messages |
| Web Push | VAPID/FCM | Background/offline notifications |
| Email | SMTP service | Critical alerts, password reset |

**In-App Notifications:**
- Unread count badge on navbar bell icon
- Paginated notification list at `/notifications`
- Mark as read (individual + bulk)
- Delete notifications
- Search and filter by type
- Optimistic updates via TanStack Query

---

## ?? Page Directory � All 67 Routes

This is the authoritative navigation inventory used by product, QA, and engineering.

Auth legend: `??` = authenticated, `??` = authenticated + role, `�` = public.

### Primary Nav (Bottom Bar)

| # | Page | Route(s) | Auth | Description |
|:-:|:-----|:---------|:----:|:------------|
| 1 | **Category Hub** | `/category-hub` | � | Category landing / discovery home |
| 2 | **All Posts** | `/all-posts`, `/listings` | � | Product listing feed |
| 3 | **For You** | `/for-you` (alias: `/my-recommendations` ? `/for-you`) | � | Personalized recommendations |
| 4 | **Feed** | `/feed` | � | Community/activity feed |
| 5 | **Rewards** | `/rewards` | ?? | Loyalty & gamification hub |
| 6 | **Profile** | `/profile` | ?? | User account hub |
| 7 | **More** | Hamburger menu | � | Secondary navigation drawer |

### Profile Tabs (Inside /profile)

| Tab | Route | Purpose |
|:----|:------|:--------|
| Overview | `/profile?tab=overview` | Snapshot of profile health, completion, and quick actions |
| Personal | `/profile?tab=personal` | Personal information and identity fields |
| Preferences | `/profile?tab=preferences` | Discovery preferences, category interests, and filters |
| Settings | `/profile?tab=settings` | Security, notifications, language, and privacy settings |

### More Menu Pages (Secondary Navigation)

| # | Page | Route(s) | Auth | Description |
|:-:|:-----|:---------|:----:|:------------|
| 8 | **Sell Welcome** | `/post-welcome` | ?? | Start selling flow |
| 9 | **Posting Plans** | `/tier-selection`, `/tiers`, `/pricing` | ?? | Tier selection and pricing |
| 10 | **Centre** | `/centre` | ?? | Centre channel list |
| 11 | **Nearby** | `/nearby` | ?? | Nearby listings |
| 12 | **Category Mode** | `/category-mode` | � | App/category mode selector |
| 13 | **Subcategories** | `/subcategories`, `/categories` | � | Category browser |
| 14 | **Chat** | `/chat`, `/chats` | ?? | Messaging |
| 15 | **Feedback** | `/feedback` | ?? | Feedback form |
| 16 | **Complaints** | `/complaints` | ?? | Issue reporting |
| 17 | **Verification** | `/verification` | ?? | Verification entry point |
| 18 | **Dashboard** | `/dashboard` | ?? | Seller dashboard |
| 19 | **Admin Panel** | `/admin-panel` | ?? | Admin tools |

### Auth & Access

| # | Page | Route(s) | Description |
|:-:|:-----|:---------|:------------|
| 20 | **Login** | `/login` | Sign in |
| 21 | **Sign Up** | `/signup` | Create account |
| 22 | **Invite Redirect** | `/invite/:code` | Referral/invite handling |
| 23 | **Forgot Password** | `/forgot-password` | Password reset request |
| 24 | **Reset Password** | `/reset-password`, `/reset-password/:token` | Reset flow |

### Discovery & Search

| # | Page | Route(s) | Auth | Description |
|:-:|:-----|:---------|:----:|:------------|
| 25 | **Home Discovery** | `/home` | � | Curated discovery landing |
| 26 | **Activity Hub** | `/activity` | ?? | Shortcut hub (chat/offers/reviews/nearby) |
| 27 | **Public Wall** | `/public-wall` | � | Public listings/social wall |
| 28 | **Search** | `/search` | � | Global search |

### Listings & Post Flow

| # | Page | Route(s) | Auth | Description |
|:-:|:-----|:---------|:----:|:------------|
| 29 | **Listing Detail** | `/post/:id`, `/listing/:id` | � | Item detail view |
| 30 | **Add Post** | `/add-post`, `/sell` | ?? | Create listing form |
| 31 | **Quick Post** | `/post_add` | ?? | Alternate add-post flow |
| 32 | **Feed Post Add** | `/feed/feedpostadd` | ?? | Feed-only post creation (no image upload) |
| 33 | **Edit Post** | `/edit-post/:postId` | ?? | Edit listing |

### My Inventory & Transactions

| # | Page | Route(s) | Auth | Description |
|:-:|:-----|:---------|:----:|:------------|
| 34 | **My Posts** | `/my-home`, `/my-posts` | ?? | Manage your listings |
| 35 | **Bought Posts** | `/bought-posts` | ?? | Purchase history |
| 36 | **Sold Posts** | `/sold-posts` | ?? | Sold history |
| 37 | **Buyer View** | `/buyer-view` | ?? | Buyer-centric view |
| 38 | **Sale Done** | `/saledone` | ?? | Mark sale complete |
| 39 | **Sale Undone** | `/saleundone` | ?? | Revert sale |

### Feed & Social Extensions

| # | Page | Route(s) | Auth | Description |
|:-:|:-----|:---------|:----:|:------------|
| 40 | **Feed Detail** | `/feed/:id` | � | Feed post detail |
| 41 | **My Feed** | `/my-feed` | ?? | Personal feed |
| 42 | **Offers** | `/offers` | � | Transaction offers |
| 43 | **Reviews** | `/reviews/:userId` | � | User reviews/ratings |

### Commerce & Saved

| # | Page | Route(s) | Auth | Description |
|:-:|:-----|:---------|:----:|:------------|
| 44 | **Wishlist** | `/wishlist` | ?? | Saved items |
| 45 | **Cart** | `/cart` | ?? | Cart |
| 46 | **Recently Viewed** | `/recently-viewed` | ?? | Browsing history |
| 47 | **Saved Searches** | `/saved-searches` | ?? | Stored searches |

### Messaging & Channels

| # | Page | Route(s) | Auth | Description |
|:-:|:-----|:---------|:----:|:------------|
| 48 | **Channels** | `/channels` | � | Channel list |
| 49 | **Channel Create** | `/channels/create` | ?? | Create channel |
| 50 | **Channel Detail** | `/channels/:id` | � | Channel page |
| 51 | **Centre Create** | `/centre/create` | ?? | Create centre page |
| 52 | **Centre Detail** | `/centre/:id` | ?? | Centre page |
| 53 | **Centre Listings** | `/centre/:id/listings` | ?? | Centre listings |

### Account, Trust & Payments

| # | Page | Route(s) | Auth | Description |
|:-:|:-----|:---------|:----:|:------------|
| 54 | **Notifications** | `/notifications` | ?? | Notification center |
| 55 | **Security Settings** | `/security` | ?? | Account security |
| 56 | **Payment Methods** | `/payment` | ?? | Payments |
| 57 | **KYC Verification** | `/kyc` | ?? | KYC flow |
| 58 | **Aadhaar Verify** | `/aadhaar-verify` | ?? | Aadhaar verification |
| 59 | **Analytics** | `/analytics` | � | Analytics insights |

### Legal & Policies

| # | Page | Route(s) | Description |
|:-:|:-----|:---------|:------------|
| 60 | **Terms (Short)** | `/t&c` | Terms & conditions |
| 61 | **Terms** | `/terms`, `/terms-and-conditions` | Full terms & conditions |
| 62 | **Privacy Policy** | `/privacy-policy` | Privacy policy |
| 63 | **Refund Policy** | `/refund-policy` | Refund policy |
| 64 | **Support Ticket Policy** | `/support-ticket-policy` | Support ticket policy |

### Redirects & Fallbacks

| # | Route | Target | Description |
|:-:|:------|:-------|:------------|
| 65 | `/` | `/category-hub` | Root redirect |
| 66 | `/categories/:slug` | `/all-posts` | Category slug redirect |
| 67 | `*` | `/category-hub` | Not found fallback |

---

## ?? App Flow Atlas (User + Developer Lens)

This section documents end-to-end journeys in two voices: the **User View** (plain language) and the **Developer View** (implementation lens).

### Dual-Lens Summary

| User Language | Developer Language |
|:-------------|:-------------------|
| Discover items by category and intent. | Category mode state shapes filters, endpoints, and UI layouts. |
| See personalized picks that reflect interests. | Preferences + recommendation signals feed `/for-you`. |
| Trust sellers through verification and reputation. | Trust score, verification, and review services annotate listings. |
| Close transactions with clear states. | Offers + sale state changes create audit trails and ledger updates. |
| Stay engaged with rewards and streaks. | Rewards engine tracks events, streaks, and leaderboards. |

### Flow 1: Discover ? Decide ? Contact (Guest & Buyer)

| Step | User View | Pages | Developer View |
|:----:|:----------|:------|:---------------|
| 1 | Choose a category or mode. | `/category-hub`, `/category-mode` | Category mode drives filters and query scopes. |
| 2 | Browse the main feed. | `/all-posts`, `/listings` | Paginated post feed with filters and caching. |
| 3 | Explore personalized picks. | `/for-you` | Recommendation pipeline using preference snapshot. |
| 4 | Open a listing. | `/post/:id`, `/listing/:id` | Listing detail + media pipeline + trust badges. |
| 5 | Start a conversation or offer. | `/chat`, `/chats`, `/offers` | Socket.IO chat + offers state updates. |
| 6 | Complete or revert a sale. | `/saledone`, `/saleundone` | Transaction state changes with audit logging. |

### Flow 2: Sell ? Manage ? Close (Seller)

| Step | User View | Pages | Developer View |
|:----:|:----------|:------|:---------------|
| 1 | Start the selling journey. | `/post-welcome` | Onboarding and tier awareness entry point. |
| 2 | Choose a posting plan. | `/tier-selection`, `/tiers`, `/pricing` | Plan/tier gating for visibility and features. |
| 3 | Create a listing. | `/add-post`, `/sell`, `/post_add` | Listing creation, validation, media upload. |
| 4 | Track your listings. | `/my-home`, `/my-posts` | Seller inventory management and status. |
| 5 | Negotiate offers. | `/offers` | Offer lifecycle and transaction state. |
| 6 | Mark transactions complete. | `/saledone`, `/saleundone` | Sale confirmation and reversal with audit. |
| 7 | Build a premium presence. | `/centre`, `/centre/create`, `/centre/:id` | Centre page creation and premium branding. |

### Flow 3: Trust & Safety ? Account Confidence

| Step | User View | Pages | Developer View |
|:----:|:----------|:------|:---------------|
| 1 | Create or sign in to an account. | `/signup`, `/login` | Auth pipelines, sessions, refresh tokens. |
| 2 | Verify identity. | `/verification`, `/kyc`, `/aadhaar-verify` | Verification providers + trust score updates. |
| 3 | Manage security settings. | `/security` | 2FA, passkeys, session controls. |
| 4 | Review reputation. | `/reviews/:userId` | Ratings and review aggregation. |
| 5 | Report issues. | `/complaints` | Complaint intake and escalation. |

### Flow 4: Rewards → Loyalty → Progression

| Step | User View | Pages | Developer View |
|:----:|:----------|:------|:---------------|
| 1 | Open rewards hub. | `/rewards` | Loads coin balance, tier, config from `/coins/rewards-config`. |
| 2 | Daily check-in / spin. | `/rewards` | `POST /coins/daily-checkin`, `POST /coins/spin`. Idempotent per IST day. |
| 3 | Share referral code. | `/rewards` (Referral tab) | Deep link `/invite/:code` triggers chain on signup + activity. |
| 4 | Track referral network. | `/rewards` (Network tab) | `ReferralChainTree` shows 5-level tree with status badges. |
| 5 | Redeem coins in store. | `/rewards` (Store tab) | `POST /coins/redeem` — FIFO spend, oldest non-expired coins first. |
| 6 | View history. | `/rewards` (History tab) | `GET /coins/history` — paginated ledger with earn/spend entries. |
| 7 | See Rs value everywhere. | `/rewards`, `/cart` | `coinConversion.js` shows rupee equivalents (100 coins = Rs 1). |

### Flow 5: Community ? Social Signal ? Discovery

| Step | User View | Pages | Developer View |
|:----:|:----------|:------|:---------------|
| 1 | Browse community feed. | `/feed` | Feed ranking and engagement signals. |
| 2 | Deep dive into a post. | `/feed/:id` | Feed detail with comments and reactions. |
| 3 | Explore public activity. | `/public-wall` | Public visibility layer. |

### Flow 6: Support ? Resolution

| Step | User View | Pages | Developer View |
|:----:|:----------|:------|:---------------|
| 1 | Send feedback. | `/feedback` | Feedback capture and tagging. |
| 2 | File a complaint. | `/complaints` | Issue workflow and investigation. |
| 3 | Review policies. | `/support-ticket-policy`, `/terms`, `/privacy-policy` | Legal and policy surfaces. |

### Flow 7: Admin & Operations

| Step | User View | Pages | Developer View |
|:----:|:----------|:------|:---------------|
| 1 | Access admin tools. | `/admin-panel` | Role-gated admin controls. |
| 2 | Monitor platform health. | `/analytics` | Admin and ops insights dashboards. |

### Navigation Graph (High Level)

```mermaid
flowchart TD
  A["Category Hub"] --> B["All Posts"]
  A --> C["For You"]
  A --> D["Feed"]
  A --> E["Rewards (Auth)"]
  A --> F["Profile (Auth)"]
  A --> G["More Menu"]
  G --> H["Sell Welcome"]
  G --> I["Posting Plans"]
  G --> J["Centre"]
  G --> K["Nearby"]
  G --> L["Category Mode"]
  G --> M["Subcategories"]
  G --> N["Chat"]
  G --> O["Feedback"]
  G --> P["Complaints"]
  G --> Q["Verification"]
  G --> R["Dashboard"]
  G --> S["Admin Panel"]
```

## ?? Product + Engineering Handbook (Printable Layout)

This layout is optimized for printing or PDF export while remaining readable in-repo.

### Printable Cover Sheet

| Field | Value |
|:------|:------|
| Document | MHub Product + Engineering Handbook |
| Version | v2026.04.05 |
| Owners | Product + Engineering |
| Audience | Product, Engineering, QA, Ops |
| Scope | End-to-end app flows, navigation, architecture, trust, rewards |
| Classification | Internal |

**How to use this handbook:**
- Use the Page Directory for route coverage.
- Use the Sequence Diagrams and Acceptance Criteria for QA.
- Use the Page Specs for implementation alignment.

<div style="page-break-after: always;"></div>

### Print Guide

1. Use your browser�s print dialog and select �Save as PDF.�
2. Enable background graphics for consistent diagrams and tables.
3. Set scale to 90�95% for tighter page flow.
4. Prefer portrait orientation for tables; use landscape only for wide diagrams.

### Handbook Structure (At-a-Glance)

| Part | Audience | What You�ll Get |
|:-----|:---------|:----------------|
| Product Overview | Everyone | Platform vision, value proposition, and user promise |
| User Journeys | Product + QA | End-to-end flows and expected outcomes |
| Navigation + Pages | Product + Eng | Complete route inventory and purpose |
| System Architecture | Engineering | Frontend, backend, realtime, and data layout |
| Data + APIs | Engineering | Service boundaries, data contracts, and core endpoints |
| Trust + Safety | Product + Eng | Verification, risk, and safety controls |
| Rewards + Loyalty | Product + Eng | Gamification engine and user progression |
| Mobile + PWA | Engineering | Native capabilities and offline behavior |
| Operations | Engineering + QA | Testing, performance, and security posture |

<div style="page-break-after: always;"></div>

### End-to-End Sequence Diagrams

#### 1) Buy Flow � Discover ? Decide ? Contact ? Complete

```mermaid
sequenceDiagram
  autonumber
  actor Buyer
  participant App
  participant API
  participant DB
  participant Chat
  participant Rewards

  Buyer->>App: Open Category Hub
  App->>API: Fetch listings (category-scoped)
  API->>DB: Query listings + trust metadata
  DB-->>API: Listings
  API-->>App: Feed data

  Buyer->>App: View listing detail
  App->>API: Fetch listing + seller
  API->>DB: Read listing record
  DB-->>API: Listing detail
  API-->>App: Detail view

  Buyer->>App: Start chat / make offer
  App->>Chat: Join conversation room
  App->>API: Create offer
  API->>DB: Persist offer state
  DB-->>API: Offer id
  API-->>App: Offer status

  Buyer->>App: Mark sale complete
  App->>API: Confirm sale
  API->>DB: Update transaction
  API->>Rewards: Emit reward event
  Rewards-->>API: Reward confirmation
  API-->>App: Completion state
```

<div style="page-break-after: always;"></div>

#### 2) Sell Flow � Onboard ? List ? Manage ? Close

```mermaid
sequenceDiagram
  autonumber
  actor Seller
  participant App
  participant API
  participant Media
  participant DB
  participant Rewards

  Seller->>App: Start Sell Welcome
  App->>API: Fetch plan options
  API-->>App: Plans + pricing

  Seller->>App: Create listing
  App->>Media: Upload images
  Media-->>App: Media URLs
  App->>API: Submit listing payload
  API->>DB: Create listing record
  DB-->>API: Listing id
  API-->>App: Listing live

  Seller->>App: Manage offers
  App->>API: Fetch offers
  API->>DB: Query offers
  DB-->>API: Offers
  API-->>App: Offer list

  Seller->>App: Confirm sale
  App->>API: Close transaction
  API->>DB: Update status
  API->>Rewards: Emit seller reward
  Rewards-->>API: Reward confirmation
  API-->>App: Success state
```

<div style="page-break-after: always;"></div>

#### 3) Rewards Flow — Activity → Ledger → Progression

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant App
  participant API
  participant CoinCtrl as coinController
  participant DB
  participant Notif

  User->>App: Open Rewards (/rewards)
  App->>API: GET /coins/rewards-config
  API-->>App: Config v2.0.0 (coinsPerRupee, tiers, expiry)
  App->>API: GET /rewards (balance + tier)
  API->>CoinCtrl: Compute tier from points
  CoinCtrl->>DB: Read rewards + coin_transactions
  DB-->>CoinCtrl: Ledger data
  CoinCtrl-->>API: Coins, tier, XP
  API-->>App: Balance (with Rs value), tier badge

  User->>App: Daily check-in
  App->>API: POST /coins/daily-checkin
  API->>CoinCtrl: addCoins() with idempotency
  CoinCtrl->>DB: INSERT coin_transactions (remaining, expires_at)
  CoinCtrl->>DB: UPDATE users SET coins += amount
  CoinCtrl-->>API: { applied, newBalance, expiresAt }
  API->>Notif: Send reward notification
  Notif-->>App: In-app update

  User->>App: Redeem boost (100 coins)
  App->>API: POST /coins/redeem
  API->>CoinCtrl: spendCoins() FIFO
  CoinCtrl->>DB: SELECT oldest non-expired FOR UPDATE
  CoinCtrl->>DB: Deduct remaining on each row
  CoinCtrl->>DB: INSERT negative transaction
  CoinCtrl-->>API: { applied, newBalance }
  API-->>App: Redemption success
```

---

### Acceptance Criteria (Print-Ready)

#### Buy Flow Acceptance Criteria

| ID | Scenario | Expected |
|:---|:---------|:---------|
| B1 | Open Category Hub | Categories and discovery shortcuts render with loading skeletons then data. |
| B2 | Apply category filters | Listing feed updates to category-scoped results with correct counts. |
| B3 | Open listing detail | Gallery, price, seller, and trust indicators render without layout shift. |
| B4 | Start chat or offer (guest) | User is prompted to log in before message/offer submission. |
| B5 | Start chat or offer (auth) | Conversation or offer is created and visible in `/chat` or `/offers`. |
| B6 | Mark sale complete | Transaction state changes for both parties and appears in history. |
| B7 | Sale undone | Transaction reverts with audit trail; both users see updated state. |
| B8 | Network error | Friendly retry state appears; cached data stays visible when possible. |

#### Sell Flow Acceptance Criteria

| ID | Scenario | Expected |
|:---|:---------|:---------|
| S1 | Open Sell Welcome | Onboarding and plan guidance loads with CTA to start posting. |
| S2 | Select posting plan | Plan selection is persisted and reflected in listing privileges. |
| S3 | Create listing with images | Media uploads succeed and preview matches uploaded order. |
| S4 | Submit listing form | Validation errors are clear; successful submission redirects to listing. |
| S5 | Manage listings | `/my-home` shows new listing with correct status and analytics. |
| S6 | Review offers | Offers list reflects latest buyer offers and status changes. |
| S7 | Confirm sale | Listing status updates to sold and triggers reward event. |
| S8 | Create Centre page | Centre profile saves and appears on `/centre/:id`. |

#### Rewards Flow Acceptance Criteria

| ID | Scenario | Expected |
|:---|:---------|:---------|
| R1 | Open Rewards | Current coin balance with Rs value, tier badge, progress bar, and streaks render correctly. |
| R2 | Daily check-in | One check-in per day; repeated attempts are idempotent. Streak day 1–7 awards 5–100 coins. |
| R3 | Activity reward | Eligible actions add ledger entries with correct coin amounts and daily caps enforced. |
| R4 | Spin wheel | Weighted random reward (5–100 coins); 1x/day limit enforced. |
| R5 | Referral chain | Coins distributed to 5 ancestor levels (100/40/20/10/5) only after referred user has real activity. |
| R6 | Coin expiry | Promo coins expire in 90 days; earned coins in 365 days. Expired coins not spendable. |
| R7 | FIFO spend | Oldest non-expired coins consumed first when spending (boost, badge, etc.). |
| R8 | Coin-to-Rs display | Hero card shows balance + Rs value. Store items show rupee equivalent. Cart shows coin equivalent. |
| R9 | Leaderboard update | Weekly refresh reflects new ranks without duplicates. |
| R10 | Reward notification | In-app notification appears with correct balance delta. |
| R11 | Offline or error | Rewards view shows cached state and retry messaging. |

<div style="page-break-after: always;"></div>

### Page Specs (Condensed, Print-Ready)

Each page below includes its intent, primary actions, and key states. This section complements the route inventory.

#### Primary Nav Specs

| Page | Route(s) | User Goal | Key Actions | Key States |
|:-----|:---------|:----------|:------------|:-----------|
| Category Hub | `/category-hub` | Choose discovery path | Browse categories, jump to feed | Loading, empty, error |
| All Posts | `/all-posts`, `/listings` | Browse listings | Filter, sort, open listing | Loading, empty, error |
| For You | `/for-you` | Personalized picks | Refresh, open listing | Loading, cold-start, error |
| Feed | `/feed` | Community updates | Open post, react | Loading, empty, error |
| Rewards | `/rewards` | See rewards | Check-in, view ledger | Loading, auth required, error |
| Profile | `/profile` | Manage account | Edit profile, navigate tabs | Loading, auth required, error |
| More | Hamburger | Reach secondary pages | Open drawer, navigate | Open, closed |

#### Profile Tab Specs

| Tab | Route | User Goal | Key Actions | Key States |
|:----|:------|:----------|:------------|:-----------|
| Overview | `/profile?tab=overview` | Snapshot health | Quick actions, completion tasks | Loading, empty, error |
| Personal | `/profile?tab=personal` | Edit profile | Update details, save | Editing, validation, saved |
| Preferences | `/profile?tab=preferences` | Set preferences | Update filters, save | Editing, saved |
| Settings | `/profile?tab=settings` | Configure account | Security, language, privacy | Loading, saved |

#### More Menu Specs

| Page | Route(s) | User Goal | Key Actions | Key States |
|:-----|:---------|:----------|:------------|:-----------|
| Sell Welcome | `/post-welcome` | Start selling | Begin posting flow | Loading, error |
| Posting Plans | `/tier-selection`, `/tiers`, `/pricing` | Choose plan | Compare plans, select | Loading, error |
| Centre | `/centre` | Manage centre pages | Open centre, create new | Loading, error |
| Nearby | `/nearby` | Find local listings | Enable GPS, browse | Permission, loading |
| Category Mode | `/category-mode` | Switch mode | Select category/app mode | Loading, error |
| Subcategories | `/subcategories`, `/categories` | Browse categories | Navigate subcategory tree | Loading, empty |
| Chat | `/chat`, `/chats` | Messaging | Open threads, send messages | Loading, empty |
| Feedback | `/feedback` | Send feedback | Submit form | Validation, success |
| Complaints | `/complaints` | Report issues | Submit complaint | Validation, success |
| Verification | `/verification` | Verify identity | Start verification flow | Loading, error |
| Dashboard | `/dashboard` | Seller analytics | View stats, manage listings | Loading, empty |
| Admin Panel | `/admin-panel` | Admin tools | Manage platform | Role-gated, error |

#### Auth & Access Specs

| Page | Route(s) | User Goal | Key Actions | Key States |
|:-----|:---------|:----------|:------------|:-----------|
| Login | `/login` | Sign in | Password/OTP/passkey | Validation, error |
| Sign Up | `/signup` | Create account | Submit details, referral | Validation, success |
| Invite Redirect | `/invite/:code` | Apply referral | Redirect to signup | Invalid code |
| Forgot Password | `/forgot-password` | Reset request | Submit email | Success, error |
| Reset Password | `/reset-password`, `/reset-password/:token` | Set new password | Submit password | Invalid token |

#### Discovery & Search Specs

| Page | Route(s) | User Goal | Key Actions | Key States |
|:-----|:---------|:----------|:------------|:-----------|
| Home Discovery | `/home` | Curated discovery | Browse sections | Loading, empty |
| Activity Hub | `/activity` | Quick access | Jump to chat/offers/reviews | Loading, error |
| Public Wall | `/public-wall` | Public activity | Browse public listings | Loading, empty |
| Search | `/search` | Find items | Query, refine, open | Loading, empty |

#### Listings & Post Flow Specs

| Page | Route(s) | User Goal | Key Actions | Key States |
|:-----|:---------|:----------|:------------|:-----------|
| Listing Detail | `/post/:id`, `/listing/:id` | Evaluate item | View media, contact seller | Loading, not found |
| Add Post | `/add-post`, `/sell` | Create listing | Upload, submit | Validation, success |
| Quick Post | `/post_add` | Fast listing | Minimal fields, submit | Validation, success |
| Feed Post Add | `/feed/feedpostadd` | Create feed post | Compose, submit | Validation, success |
| Edit Post | `/edit-post/:postId` | Update listing | Edit fields, save | Validation, success |

#### My Inventory & Transactions Specs

| Page | Route(s) | User Goal | Key Actions | Key States |
|:-----|:---------|:----------|:------------|:-----------|
| My Posts | `/my-home`, `/my-posts` | Manage listings | Edit, pause, delete | Loading, empty |
| Bought Posts | `/bought-posts` | Track purchases | View status | Loading, empty |
| Sold Posts | `/sold-posts` | Track sales | View status | Loading, empty |
| Buyer View | `/buyer-view` | Buyer transactions | Review offers | Loading, error |
| Sale Done | `/saledone` | Confirm sale | Mark complete | Success, error |
| Sale Undone | `/saleundone` | Revert sale | Submit issue | Success, error |

#### Feed & Social Specs

| Page | Route(s) | User Goal | Key Actions | Key States |
|:-----|:---------|:----------|:------------|:-----------|
| Feed Detail | `/feed/:id` | View post | React, comment | Loading, not found |
| My Feed | `/my-feed` | Personal feed | Manage posts | Loading, empty |
| Offers | `/offers` | Manage offers | Accept, reject | Loading, empty |
| Reviews | `/reviews/:userId` | View reputation | Read reviews | Loading, empty |

#### Commerce & Saved Specs

| Page | Route(s) | User Goal | Key Actions | Key States |
|:-----|:---------|:----------|:------------|:-----------|
| Wishlist | `/wishlist` | Saved items | Remove, open | Loading, empty |
| Cart | `/cart` | Cart actions | Update quantity | Loading, empty |
| Recently Viewed | `/recently-viewed` | Recall items | Open listing | Loading, empty |
| Saved Searches | `/saved-searches` | Re-run searches | Open, delete | Loading, empty |

#### Messaging & Channels Specs

| Page | Route(s) | User Goal | Key Actions | Key States |
|:-----|:---------|:----------|:------------|:-----------|
| Channels | `/channels` | Browse channels | Open channel | Loading, empty |
| Channel Create | `/channels/create` | Create channel | Submit details | Validation, success |
| Channel Detail | `/channels/:id` | View channel | Join, view content | Loading, not found |
| Centre Create | `/centre/create` | Create centre page | Submit profile | Validation, success |
| Centre Detail | `/centre/:id` | View centre | Open listings | Loading, not found |
| Centre Listings | `/centre/:id/listings` | View centre listings | Browse listings | Loading, empty |

#### Account, Trust & Payments Specs

| Page | Route(s) | User Goal | Key Actions | Key States |
|:-----|:---------|:----------|:------------|:-----------|
| Notifications | `/notifications` | View alerts | Mark read, delete | Loading, empty |
| Security Settings | `/security` | Secure account | Enable 2FA, passkeys | Saved, error |
| Payment Methods | `/payment` | Manage payments | Add/remove method | Saved, error |
| KYC Verification | `/kyc` | Verify identity | Submit docs | Pending, approved |
| Aadhaar Verify | `/aadhaar-verify` | Aadhaar verify | Submit Aadhaar | Pending, error |
| Analytics | `/analytics` | View insights | Filter, export | Loading, empty |

#### Legal & Policies Specs

| Page | Route(s) | User Goal | Key Actions | Key States |
|:-----|:---------|:----------|:------------|:-----------|
| Terms (Short) | `/t&c` | Review summary | Read | � |
| Terms | `/terms`, `/terms-and-conditions` | Read terms | Read | � |
| Privacy Policy | `/privacy-policy` | Understand privacy | Read | � |
| Refund Policy | `/refund-policy` | Review refunds | Read | � |
| Support Ticket Policy | `/support-ticket-policy` | Review support policy | Read | � |

#### Redirects & Fallbacks Specs

| Route | Target | Purpose | Key States |
|:------|:-------|:--------|:-----------|
| `/` | `/category-hub` | Root redirect | � |
| `/categories/:slug` | `/all-posts` | Category slug redirect | � |
| `*` | `/category-hub` | Not found fallback | 404 |

## 📄 Page-by-Page Feature Map

Each page below follows the same spec so product, QA, and engineering have a shared reference.
Auth legend: Public = no login required. Auth = login required. Admin = admin role required. Mixed = some features gated.

### Redirects & Aliases (not pages)

| Route | Target | Note |
|-------|--------|------|
| `/` | `/category-hub` | Root redirect |
| `/categories/:slug` | `/all-posts` | Legacy category slug redirect |
| `*` | `/category-hub` | 404 fallback |

### /aadhaar-verify -- AadhaarVerifyPage
- Routes: /aadhaar-verify
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\GetVerified.jsx`
- Access: Auth
- Purpose: Aadhaar-based identity verification flow with OTP.
- Key Features: OTP send and verify, CMS-driven instructions, verification CTA.
- User Flows: Review requirements, enter Aadhaar, verify OTP, get verified badge.
- Data Sources / APIs: Services: api.post (send OTP, verify OTP). Hooks: useToast.
- State & Context: Contexts: AuthContext.

### /activity -- ActivityHubPage
- Routes: /activity
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\ActivityHub.jsx`
- Access: Auth
- Purpose: Central shortcut hub for conversations, offers, reviews, and nearby.
- Key Features: Quick-action cards, CMS-driven layout, jump links to Chat, Offers, Nearby, Reviews.
- User Flows: Open hub, tap action card, navigate to destination page.
- Data Sources / APIs: Services: useCmsPage("activity-hub"). Hooks: useCmsPage.
- State & Context: Contexts: AuthContext.

### /add-post, /sell -- AddPostPage
- Routes: /add-post, /sell
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\AddPost.jsx`
- Access: Auth
- Purpose: Create a marketplace listing with media, location, pricing and category.
- Key Features: Multi-image upload with compression, GPS auto-location, category/subcategory picker, condition selector, pricing, audio description, draft save.
- User Flows: Fill form -> upload media -> select category -> set price -> submit -> redirect to My Posts.
- Data Sources / APIs: Services: api.post (listing creation), fetchCategoriesCached, fetchSubcategories. Hooks: useToast.
- State & Context: Contexts: AuthContext, CategoryModeContext.

### /admin-panel -- AdminPanelPage
- Routes: /admin-panel
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\AdminPanel.jsx`
- Access: Admin (requires admin or super_admin role)
- Purpose: Platform administration dashboard for moderation and management.
- Key Features: User management, post moderation, platform metrics, system controls.
- User Flows: Login as admin -> access panel -> manage users/posts/complaints.
- Data Sources / APIs: Services: api (management endpoints). Hooks: useToast.
- State & Context: Contexts: AuthContext.

### /all-posts, /listings -- AllPostsPage
- Routes: /all-posts, /listings
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\AllPosts.jsx`
- Access: Public
- Purpose: Primary marketplace listing feed with filtering and sorting.
- Key Features: Hero context banner, category/subcategory bar, quick filters (price, condition, sort), shuffle, live refresh toggle, listing cards with infinite scroll.
- User Flows: Browse listings -> apply filters -> sort -> open listing detail -> contact seller.
- Data Sources / APIs: Services: api.get (posts with query params). Hooks: useInfiniteScroll.
- State & Context: Contexts: AuthContext, CartContext, CategoryModeContext, FilterContext.

### /analytics -- AnalyticsPage
- Routes: /analytics
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Analytics.jsx`
- Access: Public
- Purpose: Seller analytics showing views, sales trends, and performance metrics.
- Key Features: Charts, KPIs, time-range filters, export.
- User Flows: View dashboard -> filter by date -> review metrics.
- Data Sources / APIs: Services: api (seller metrics). Hooks: none.
- State & Context: Contexts: CategoryModeContext.

### /bought-posts -- BoughtPostsPage
- Routes: /bought-posts
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\BoughtPosts.jsx`
- Access: Auth
- Purpose: History view of items purchased by the current user.
- Key Features: Purchase list with status, price, date, and seller info.
- User Flows: Browse purchase history -> open listing detail -> leave review.
- Data Sources / APIs: Services: api.get (purchase history). Hooks: none.
- State & Context: Contexts: AuthContext, CategoryModeContext.

### /buyer-view -- BuyerViewPage
- Routes: /buyer-view
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\BuyerView.jsx`
- Access: Auth
- Purpose: Buyer-centric browsing layout optimized for active transactions.
- Key Features: Active transactions list, seller contact, status tracking.
- User Flows: View active purchases -> track status -> contact seller.
- Data Sources / APIs: Services: api.get (listings, transactions). Hooks: none.
- State & Context: Contexts: none.

### /cart -- CartPage
- Routes: /cart
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Cart.jsx`
- Access: Auth
- Purpose: Shopping cart with category-scoped filtering, coupon support, and coin equivalent display.
- Key Features: Category mode filtering, bulk ops, coupon codes, quantity management, delivery ETA, order summary with coin equivalent (100 coins = Rs 1).
- User Flows: Review cart -> adjust quantities -> apply coupon -> view total (with coin equivalent) -> proceed.
- Data Sources / APIs: Services: via CartContext (local state). Hooks: none.
- State & Context: Contexts: CartContext, CategoryModeContext.

### /category-hub -- CategoryHubPage
- Routes: /category-hub
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\CategoryHub.jsx`
- Access: Public
- Purpose: Category discovery landing page and default home screen.
- Key Features: Category grid with icons, trending sections, recent activity, CMS-driven hero banner.
- User Flows: Browse categories -> select one -> navigate to filtered All Posts.
- Data Sources / APIs: Services: fetchCategoriesCached, useCmsPage. Hooks: useCmsPage, useTheme.
- State & Context: Contexts: CategoryModeContext, FilterContext, ThemeContext.

### /centre -- CentreListPage
- Routes: /centre
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\ChannelsListPage.jsx` (variant="centre")
- Access: Auth
- Purpose: List of seller Centre Pages (premium brand storefronts).
- Key Features: Centre discovery, follow/unfollow, create new centre.
- User Flows: Browse centres -> follow -> open centre detail.
- Data Sources / APIs: Services: getAllChannels, getPremiumChannels, followChannel. Hooks: none.
- State & Context: Contexts: none.

### /centre/create -- CreateCentrePage
- Routes: /centre/create
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\CreateChannelPage.jsx` (variant="centre")
- Access: Auth
- Purpose: Create or edit a Centre Page (premium brand storefront).
- Key Features: Profile form, logo/cover upload, description, category selection.
- User Flows: Fill form -> upload media -> save -> redirect to centre page.
- Data Sources / APIs: Services: createChannel, updateChannel, uploadChannelMedia. Hooks: none.
- State & Context: Contexts: AuthContext.

### /centre/:id -- CentreDetailPage
- Routes: /centre/:id
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\ChannelPage.jsx` (variant="centre")
- Access: Auth
- Purpose: Individual Centre Page profile with posts and listings.
- Key Features: Centre profile, posts feed, follow/unfollow, post creation, links to centre listings.
- User Flows: View centre -> browse posts -> follow -> view listings.
- Data Sources / APIs: Services: getChannelById, createChannelPost, followChannel. Hooks: useToast.
- State & Context: Contexts: none.

### /centre/:id/listings -- CentreListingsPage
- Routes: /centre/:id/listings
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\CentreListings.jsx`
- Access: Auth
- Purpose: Browse all marketplace listings belonging to a specific Centre.
- Key Features: Filtered listing grid scoped to the centre, sorting.
- User Flows: View centre listings -> open listing detail.
- Data Sources / APIs: Services: getChannelById, api.get (listings). Hooks: none.
- State & Context: Contexts: none.

### /channels -- ChannelsListPage
- Routes: /channels
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\ChannelsListPage.jsx`
- Access: Public
- Purpose: Discovery page for community channels.
- Key Features: Channel list, follow/unfollow, premium badge, create channel CTA.
- User Flows: Browse channels -> follow -> open channel detail.
- Data Sources / APIs: Services: getAllChannels, getPremiumChannels, followChannel. Hooks: none.
- State & Context: Contexts: none.

### /channels/create -- CreateChannelPage
- Routes: /channels/create
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\CreateChannelPage.jsx`
- Access: Auth
- Purpose: Create or edit a community channel.
- Key Features: Channel form, media upload, description.
- User Flows: Fill form -> save -> redirect to channel page.
- Data Sources / APIs: Services: createChannel, updateChannel, uploadChannelMedia. Hooks: none.
- State & Context: Contexts: AuthContext.

### /channels/:id -- ChannelPage
- Routes: /channels/:id
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\ChannelPage.jsx`
- Access: Public
- Purpose: Individual channel profile with posts and followers.
- Key Features: Channel profile, posts feed, follow/unfollow, post creation.
- User Flows: View channel -> browse posts -> follow -> create post.
- Data Sources / APIs: Services: getChannelById, createChannelPost, followChannel. Hooks: useToast.
- State & Context: Contexts: none.

### /chat, /chats -- ProtectedChatPage
- Routes: /chat, /chats
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\ProtectedChat.jsx`
- Access: Auth
- Purpose: Real-time messaging between buyers and sellers.
- Key Features: Conversation list, 1-on-1 chat, typing indicators, online presence, audio recording, message history with infinite scroll.
- User Flows: Open conversations -> select thread -> send message -> receive reply.
- Data Sources / APIs: Services: Socket.IO (real-time). Hooks: useRealtimeChat.
- State & Context: Contexts: AuthContext.

### /complaints -- ComplaintsPage
- Routes: /complaints
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Complaints.jsx`
- Access: Auth
- Purpose: Report issues with sellers, transactions, or platform behavior.
- Key Features: Complaint form, category selection, file attachment, status tracking.
- User Flows: Select complaint type -> fill details -> submit -> track status.
- Data Sources / APIs: Services: api (complaint submission). Hooks: useToast.
- State & Context: Contexts: AuthContext.
- Known Issue: Backend /api/complaints/my returns 500. Investigating server-side handler.

### /dashboard -- DashboardPage
- Routes: /dashboard
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Dashboard.jsx`
- Access: Auth
- Purpose: Seller overview showing active listings, sales, views, and rewards summary.
- Key Features: Stats cards, active listings, recent sales, engagement metrics.
- User Flows: View stats -> manage listings -> view analytics.
- Data Sources / APIs: Services: api.get (stats/user data). Hooks: none.
- State & Context: Contexts: AuthContext.

### /edit-post/:postId -- EditPostPage
- Routes: /edit-post/:postId
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\EditPost.jsx`
- Access: Auth
- Purpose: Edit an existing marketplace listing.
- Key Features: Pre-filled form, media management, field validation.
- User Flows: Load listing -> edit fields -> save -> redirect.
- Data Sources / APIs: Services: api.get (fetch post), api.put (update post). Hooks: useToast.
- State & Context: Contexts: AuthContext.

### /feed -- FeedPage
- Routes: /feed
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\FeedPage.jsx`
- Access: Public
- Purpose: Social-style community feed showing marketplace updates and posts.
- Key Features: Vertical scroll, reactions, comments, share, pull-to-refresh.
- User Flows: Browse feed -> react/comment -> open detail -> share.
- Data Sources / APIs: Services: api.get (social feed posts). Hooks: none.
- State & Context: Contexts: AuthContext, CategoryModeContext.

### /feed/:id -- FeedPostDetailPage
- Routes: /feed/:id
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\FeedPostDetail.jsx`
- Access: Public
- Purpose: Detailed view of a single feed/social post.
- Key Features: Full post content, comments, reactions, share.
- User Flows: View post -> comment -> react -> navigate back.
- Data Sources / APIs: Services: api.get (post detail). Hooks: none.
- State & Context: Contexts: none.

### /feed/feedpostadd -- PostAddPage (no image upload)
- Routes: /feed/feedpostadd
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\PostAdd.jsx`
- Access: Auth
- Purpose: Simple text/media post creation for the social feed (no image upload variant).
- Key Features: Text input, submit. No image upload when accessed via this route.
- User Flows: Compose text -> submit -> redirect to feed.
- Data Sources / APIs: Services: api.post (feed post submission). Hooks: none.
- State & Context: Contexts: none.

### /feedback -- FeedbackPage
- Routes: /feedback
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Feedback.jsx`
- Access: Auth
- Purpose: General platform feedback and bug reporting form.
- Key Features: Feedback form, category tags, submit CTA.
- User Flows: Select type -> write feedback -> submit.
- Data Sources / APIs: Services: api (feedback submission). Hooks: useToast.
- State & Context: Contexts: AuthContext.

### /for-you -- ForYouPage
- Routes: /for-you
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\ForYou.jsx`
- Access: Public (personalized for logged-in users)
- Purpose: Algorithmic feed tailored to user interests, preferences, and browsing behavior.
- Key Features: Personalized listing cards, preference-aware sorting, infinite scroll, translated posts.
- User Flows: Browse personalized picks -> open listing -> contact seller.
- Data Sources / APIs: Services: api.get (recommendations), fetchUserPreferencesCached. Hooks: useTranslatedPosts.
- State & Context: Contexts: AuthContext, CartContext, CategoryModeContext.

### /forgot-password -- ForgotPasswordPage
- Routes: /forgot-password
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Auth\ForgotPassword.jsx`
- Access: Public
- Purpose: Password recovery via phone or email OTP.
- Key Features: Phone/email input, OTP request.
- User Flows: Enter phone/email -> request OTP -> redirect to reset page.
- Data Sources / APIs: Services: api.post("/auth/forgot-password"). Hooks: useToast.
- State & Context: Contexts: none.

### /home -- HomePage
- Routes: /home
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Home.jsx`
- Access: Public
- Purpose: Public landing page with featured content and platform highlights.
- Key Features: Featured listings, platform value props, CTA sections.
- User Flows: Browse featured -> navigate to category or listing.
- Data Sources / APIs: Services: api.get("/posts"). Hooks: none.
- State & Context: Contexts: AuthContext.

### /invite/:code -- InviteRedirectPage
- Routes: /invite/:code
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\InviteRedirect.jsx`
- Access: Public
- Purpose: Landing handler for referral invite links.
- Key Features: Store referral code, CMS welcome content, redirect to signup.
- User Flows: Click invite link -> store code -> redirect to /signup with referral param.
- Data Sources / APIs: Services: useCmsPage("invite-redirect"). Hooks: useCmsPage.
- State & Context: Contexts: none.

### /kyc -- KycVerificationPage
- Routes: /kyc
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\KYC\KycVerification.jsx`
- Access: Auth
- Purpose: File-upload based KYC verification form.
- Key Features: Document upload (ID, address proof), status tracking.
- User Flows: Upload documents -> submit -> track verification status.
- Data Sources / APIs: Services: api.get("/users/kyc/status"), api.post (submission). Hooks: none.
- State & Context: Contexts: none.

### /login -- LoginPage
- Routes: /login
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Auth\Login.jsx`
- Access: Public
- Purpose: User sign-in with mobile, password, OTP, or passkey.
- Key Features: Phone/email input, password login, OTP login, WebAuthn/passkey, remember me.
- User Flows: Enter credentials -> authenticate -> redirect to previous page or home.
- Data Sources / APIs: Services: api.post (auth login), login() from AuthContext. Hooks: useToast.
- State & Context: Contexts: AuthContext, LocationContext.

### /my-feed -- MyFeedPage
- Routes: /my-feed
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\MyFeedPage.jsx`
- Access: Auth
- Purpose: Private view of the user's own feed posts and interactions.
- Key Features: Personal posts list, edit/delete, pull-to-refresh, translated content.
- User Flows: Browse own posts -> edit -> delete.
- Data Sources / APIs: Services: api.get (personal feed). Hooks: usePullToRefresh, useTranslatedPosts.
- State & Context: Contexts: AuthContext, CategoryModeContext.

### /my-home, /my-posts -- MyHomePage
- Routes: /my-home, /my-posts
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\MyHome.jsx`
- Access: Auth
- Purpose: Manage your own marketplace listings.
- Key Features: Listing grid, edit/pause/delete/boost controls, status filters, pull-to-refresh.
- User Flows: View listings -> edit listing -> boost -> delete.
- Data Sources / APIs: Services: api (personal listings management). Hooks: usePullToRefresh, useToast.
- State & Context: Contexts: AuthContext, CategoryModeContext.

### /nearby -- NearbyPostsPage
- Routes: /nearby
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\NearbyPosts.jsx`
- Access: Auth
- Purpose: Location-based listing discovery using the logged-in user's detected GPS position.
- Key Features: Same listing card layout as /all-posts and /for-you but filtered by proximity to the user's current location. Distance display, radius filter. Requires GPS permission.
- User Flows: Grant GPS permission -> browse nearby listings -> open listing -> contact seller.
- Data Sources / APIs: Services: api.get (location-based listings query with lat/lng). Hooks: none.
- State & Context: Contexts: CategoryModeContext, LocationContext.

### /notifications -- NotificationsPage
- Routes: /notifications
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Notifications.jsx`
- Access: Auth
- Purpose: Inbox for user alerts, system updates, reward events, and social interactions.
- Key Features: Paginated notification list, mark as read (single + bulk), delete, search, filter by type, unread count badge.
- User Flows: Browse notifications -> mark read -> delete -> navigate to linked content.
- Data Sources / APIs: Services: api.get (alerts), api.delete (remove). Hooks: useToast.
- State & Context: Contexts: AuthContext, CategoryModeContext.

### /offers -- OffersPage
- Routes: /offers
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Offers.jsx`
- Access: Public (full features require auth)
- Purpose: Management of buy/sell price negotiation offers.
- Key Features: Offer list (sent/received), accept/reject/counter, status tracking, CMS content.
- User Flows: View offers -> accept/reject -> negotiate -> finalize.
- Data Sources / APIs: Services: api (offers tracking), useCmsPage. Hooks: useCmsPage, useToast.
- State & Context: Contexts: AuthContext, CategoryModeContext.

### /payment -- PaymentPage
- Routes: /payment
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Payments\PaymentPage.jsx`
- Access: Auth
- Purpose: Payment gateway interface for UPI and Razorpay transactions.
- Key Features: Payment method management, transaction history, UPI integration, Razorpay checkout.
- User Flows: Select payment method -> initiate payment -> confirm -> view receipt.
- Data Sources / APIs: Services: api (payment config/history), useCmsPage. Hooks: useCmsPage, useToast.
- State & Context: Contexts: AuthContext.

### /post/:id, /listing/:id -- PostDetailPage
- Routes: /post/:id, /listing/:id
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\PostDetail.jsx`
- Access: Public
- Purpose: Comprehensive detail view of a single marketplace listing.
- Key Features: Image gallery, seller profile with trust badge, price, condition, specifications, contact seller CTA, share, wishlist toggle, similar listings.
- User Flows: View listing -> view gallery -> contact seller -> make offer -> add to cart.
- Data Sources / APIs: Services: api.get("/posts/:id"), api.post (interaction). Hooks: useTrustScore, useToast.
- State & Context: Contexts: AuthContext.

### /post-welcome -- PostWelcomePage
- Routes: /post-welcome
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\PostWelcome.jsx`
- Access: Auth
- Purpose: Sell onboarding page explaining listing tiers and popular categories.
- Key Features: Tier comparison, category highlights, CMS content, CTA to start posting.
- User Flows: Review tiers -> choose plan -> proceed to add-post.
- Data Sources / APIs: Services: useCmsPage. Hooks: useCmsPage.
- State & Context: Contexts: AuthContext.

### /post_add -- PostAddPage
- Routes: /post_add
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\PostAdd.jsx`
- Access: Auth
- Purpose: Quick text/media post creation for social feed.
- Key Features: Simple text input, optional media, submit.
- User Flows: Compose -> submit -> redirect to feed.
- Data Sources / APIs: Services: api.post (feed submission). Hooks: none.
- State & Context: Contexts: none.

### /pricing, /tiers, /tier-selection -- TierSelectionPage
- Routes: /tier-selection, /tiers, /pricing
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\TierSelection.jsx`
- Access: Auth
- Purpose: Select listing promotion tier (Basic, Bronze, Silver, Premium).
- Key Features: Tier comparison cards, feature lists, pricing, CMS content, coin discount display.
- User Flows: Compare tiers -> choose plan -> proceed to payment.
- Data Sources / APIs: Services: api.get (tiers), useCmsPage. Hooks: useCmsPage, useToast.
- State & Context: Contexts: none.

### /privacy-policy -- PrivacyPage
- Routes: /privacy-policy
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\PrivacyPolicy.jsx`
- Access: Public
- Purpose: Privacy policy documentation.
- Key Features: CMS-rendered legal content.
- User Flows: Read policy.
- Data Sources / APIs: Services: useCmsPage("privacy-policy"). Hooks: useCmsPage.
- State & Context: Contexts: none.

### /profile -- ProfilePage
- Routes: /profile (with tabs: ?tab=overview, ?tab=personal, ?tab=preferences, ?tab=settings)
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Profile.jsx`
- Access: Auth
- Purpose: User account management with 4 tabs.
- Key Features: Avatar with color generation, trust score badge, activity stats, edit personal info, notification preferences, language selection (26 languages), privacy controls, data export, account deletion.
- User Flows: Navigate tabs -> edit fields -> save -> view trust score.
- Data Sources / APIs: Services: getChannelByUser, api.get (profile data). Hooks: useToast.
- State & Context: Contexts: AuthContext, CategoryModeContext.

### /public-wall -- PublicWallPage
- Routes: /public-wall
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\PublicWall.jsx`
- Access: Public
- Purpose: Social proof surface showing platform insights, top sellers, and activity.
- Key Features: Public rankings, activity stream, platform stats.
- User Flows: Browse top sellers/buyers -> view profiles.
- Data Sources / APIs: Services: api.get (social/wall data). Hooks: none.
- State & Context: Contexts: none.

### /recently-viewed -- RecentlyViewedPage
- Routes: /recently-viewed
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\RecentlyViewed.jsx`
- Access: Auth
- Purpose: Browsing history log of recently opened listings.
- Key Features: Chronological list, open listing, translated posts.
- User Flows: Browse history -> open listing.
- Data Sources / APIs: Services: api.get (view history). Hooks: useTranslatedPosts.
- State & Context: Contexts: AuthContext, CategoryModeContext.

### /refund-policy -- RefundPage
- Routes: /refund-policy
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\RefundPolicy.jsx`
- Access: Public
- Purpose: Refund policy documentation.
- Key Features: CMS-rendered legal content.
- User Flows: Read policy.
- Data Sources / APIs: Services: useCmsPage("refund-policy"). Hooks: useCmsPage.
- State & Context: Contexts: none.

### /reset-password, /reset-password/:token -- ResetPasswordPage
- Routes: /reset-password, /reset-password/:token
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Auth\ResetPassword.jsx`
- Access: Public
- Purpose: Token or OTP verified form for setting a new password.
- Key Features: New password input, confirm password, token validation.
- User Flows: Enter new password -> confirm -> submit -> redirect to login.
- Data Sources / APIs: Services: api.post (password update). Hooks: useToast.
- State & Context: Contexts: none.

### /reviews/:userId -- ReviewsPage
- Routes: /reviews/:userId
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Reviews.jsx`
- Access: Public
- Purpose: View seller/buyer ratings and review comments.
- Key Features: Star rating display, review list, filter by rating, seller response, submit new review.
- User Flows: View reviews -> filter -> submit review.
- Data Sources / APIs: Services: api.get (user reviews), api.post (new review). Hooks: useToast.
- State & Context: Contexts: AuthContext.

### /rewards -- RewardsPage
- Routes: /rewards
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Rewards.jsx`
- Access: Auth
- Purpose: Gamification hub showing coin balance, tiers, referral network, earning guide, store, and history.
- Key Features: Hero card with balance and Rs value (100 coins = Rs 1), tier progress bar, daily check-in, spin wheel, referral code sharing (WhatsApp/Telegram/SMS), 5 tabs (Overview, Referral Network, Earn, Store, History).
- User Flows: View balance -> daily check-in -> spin -> share referral -> redeem in store -> view history.
- Data Sources / APIs: Services: GET /rewards, GET /coins/rewards-config, GET /coins/engagement, GET /coins/history, POST /coins/daily-checkin, POST /coins/spin. Hooks: none.
- State & Context: Contexts: AuthContext.

### /saledone -- SaledonePage
- Routes: /saledone
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Saledone.jsx`
- Access: Auth
- Purpose: Sale completion confirmation page with transaction stepper.
- Key Features: Transaction confirmation, status display, reward notification.
- User Flows: Confirm sale -> view confirmation -> return to listings.
- Data Sources / APIs: Services: api.get/post (transaction status). Hooks: useToast.
- State & Context: Contexts: none.

### /saleundone -- SaleUndonePage
- Routes: /saleundone
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\SaleUndone.jsx`
- Access: Auth
- Purpose: Revert a transaction with audit trail.
- Key Features: Cancellation form, reason selection, CMS content.
- User Flows: Select reason -> confirm revert -> view updated status.
- Data Sources / APIs: Services: api (transaction revert), useCmsPage. Hooks: useCmsPage, useToast.
- State & Context: Contexts: CategoryModeContext.

### /saved-searches -- SavedSearchesPage
- Routes: /saved-searches
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\SavedSearches.jsx`
- Access: Auth
- Purpose: Manage saved search queries and automated alerts.
- Key Features: Saved search list, re-run search, delete, create alert.
- User Flows: View saved searches -> re-run -> delete.
- Data Sources / APIs: Services: api.get (saved searches). Hooks: none.
- State & Context: Contexts: AuthContext, CategoryModeContext.

### /search -- SearchPage
- Routes: /search
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\SearchPage.jsx`
- Access: Public
- Purpose: Global text search across all listings and content.
- Key Features: Search input with history, suggestions, category-scoped results, filters.
- User Flows: Type query -> view suggestions -> filter results -> open listing.
- Data Sources / APIs: Services: api.get, fetchCategoriesCached. Hooks: none.
- State & Context: Contexts: FilterContext, CategoryModeContext.

### /security -- SecuritySettingsPage
- Routes: /security
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\SecuritySettings.jsx`
- Access: Auth
- Purpose: Account security management (sessions, 2FA, passkeys).
- Key Features: Active sessions list, revoke session, 2FA toggle, passkey management.
- User Flows: View sessions -> revoke suspicious -> enable 2FA -> add passkey.
- Data Sources / APIs: Services: api.get (sessions), api.post (revoke). Hooks: useToast.
- State & Context: Contexts: AuthContext.

### /signup -- SignUpPage
- Routes: /signup
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Auth\SignUp.jsx`
- Access: Public
- Purpose: New user registration with optional referral code.
- Key Features: Phone/email, password, name, referral code pre-fill from invite links.
- User Flows: Fill form -> submit -> auto-login -> welcome bonus -> redirect to home.
- Data Sources / APIs: Services: api (auth registration). Hooks: useToast.
- State & Context: Contexts: AuthContext.

### /sold-posts -- SoldPostsPage
- Routes: /sold-posts
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\SoldPosts.jsx`
- Access: Auth
- Purpose: History of items successfully sold by the user.
- Key Features: Sold items list with buyer info, price, date, revenue summary.
- User Flows: Browse sold history -> view details.
- Data Sources / APIs: Services: api.get (sales history). Hooks: none.
- State & Context: Contexts: AuthContext, CategoryModeContext.

### /subcategories, /categories -- SubcategoriesPage
- Routes: /subcategories, /categories
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Subcategories.jsx`
- Access: Public
- Purpose: Deep-dive category/subcategory browser tree.
- Key Features: Hierarchical category tree, search within categories, icons.
- User Flows: Browse tree -> select subcategory -> navigate to filtered listings.
- Data Sources / APIs: Services: fetchAllSubcategories, useCmsPage. Hooks: useCmsPage, useTheme.
- State & Context: Contexts: CategoryModeContext, ThemeContext.

### /support-ticket-policy -- SupportTicketPage
- Routes: /support-ticket-policy
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\SupportTicketPolicy.jsx`
- Access: Public
- Purpose: Support ticket categorization and escalation guidelines.
- Key Features: CMS-rendered policy content.
- User Flows: Read policy.
- Data Sources / APIs: Services: useCmsPage("support-ticket-policy"). Hooks: useCmsPage.
- State & Context: Contexts: none.

### /t&c, /terms, /terms-and-conditions -- TermsPage
- Routes: /t&c, /terms, /terms-and-conditions
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\TermsAndConditions.jsx`
- Access: Public
- Purpose: Terms and conditions documentation.
- Key Features: CMS-rendered legal content.
- User Flows: Read terms.
- Data Sources / APIs: Services: useCmsPage("terms-and-conditions"). Hooks: useCmsPage.
- State & Context: Contexts: none.

### /verification -- VerificationPage
- Routes: /verification
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Verification.jsx`
- Access: Auth
- Purpose: Verification entry point with multiple paths (Aadhaar, KYC, PAN).
- Key Features: Verification type selector, status display, start flow CTA.
- User Flows: Choose verification type -> proceed to Aadhaar or KYC page.
- Data Sources / APIs: Services: api.get (KYC status), api.post (uploads). Hooks: useToast.
- State & Context: Contexts: AuthContext.

### /wishlist -- WishlistPage
- Routes: /wishlist
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Wishlist.jsx`
- Access: Auth
- Purpose: User's collection of saved marketplace listings.
- Key Features: Saved items grid, remove/open actions, translated post content.
- User Flows: Browse saved items -> open listing -> remove from wishlist.
- Data Sources / APIs: Services: api.get (wishlist items). Hooks: useToast, useTranslatedPosts.
- State & Context: Contexts: AuthContext, CartContext, CategoryModeContext.
- Known Issue: Page currently displays blank white. The /api/complaints/my endpoint returns 500 which may block page load if Wishlist shares a data-fetching pattern with Complaints. Under investigation.

### Deprecated / Removed Routes
- /category-mode (CategoryModeSelectPage): Removed. Category selection is handled within CategoryHub and GreenNavbar.
- /my-recommendations: Removed. Redirects to /for-you.

---


---
## 🧭 Navigation Architecture

### Top Navigation Bar (`GreenNavbar`)

```
┌────────────────────────────────────────────────────────────┐
│  🔍 Search  │  📍 Location  │  🔔 ❤️ 🛒 ⏰  │  🌙/☀️  │ 🌐 │
│             │  Filter Panel │  Badges        │  Theme  │Lang│
└────────────────────────────────────────────────────────────┘
```

**Elements:**
- **Search bar** with category-scoped filtering
- **Location display** with GPS detection
- **Notification bell** with unread count badge (auth-gated)
- **Wishlist bookmark** with saved count badge (auth-gated)
- **Cart icon** with category-filtered count badge (auth-gated)
- **Recently viewed** clock icon
- **Language selector** (26 languages)
- **Theme toggle** (Light / System / Dark)
- **Filter drawer** with price, condition, subcategory, sort controls

### Bottom Navigation Bar

```
┌──────────────────────────────────────────────────────────┐
│  🏠 Hub  │  📋 Posts  │  ⭐ For You  │  📰 Feed  │  ⋮More │
│          │           │             │          │       │
│ rewards  │  profile  │             │          │       │
└──────────────────────────────────────────────────────────┘
```

**7 Primary Tabs:**
1. **Category Hub** � Category discovery home (`/category-hub`)
2. **All Posts** � Listing feed (`/all-posts`, `/listings`)
3. **For You** � Personalized recommendations (`/for-you`, alias `/my-recommendations`)
4. **Feed** � Community/activity feed (`/feed`)
5. **Rewards** � Loyalty & gamification (`/rewards`, auth-gated)
6. **Profile** � Account hub with Overview, Personal, Preferences, Settings tabs (`/profile`)
7. **More** � Secondary navigation drawer

### More Menu (Hamburger)

```
┌──────────────────────────┐
│ TRADE                    │
│  + Sell    ★ Plans       │
│  🏪 Centre  📍 Nearby    │
│  🧭 Category  📂 Subcats │
│                          │
│ SOCIAL                   │
│  💬 Chat   ⭐ Feedback   │
│  📋 Complaints           │
│                          │
│ ACCOUNT                  │
│  ✓ Verification          │
│  📊 Dashboard            │
│  🔐 Admin Panel          │
└──────────────────────────┘
```

---

## 🔐 Authentication & Access Control

### Auth Flow

```
                    ┌─────────────┐
                    │   Login     │
                    │  /login     │
                    └──────┬──────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
     ┌──────┴─────┐ ┌─────┴──────┐ ┌────┴──────┐
     │  Password  │ │   OTP      │ │  Passkey  │
     │  + Argon2  │ │  delivery  │ │  WebAuthn │
     └──────┬─────┘ └─────┬──────┘ └────┬──────┘
            └──────────────┼──────────────┘
                           │
                    ┌──────┴──────┐
                    │ JWT Access  │
                    │ + Refresh   │
                    │ Token Pair  │
                    └─────────────┘
```

### Token Architecture

| Token | Lifetime | Storage | Purpose |
|-------|----------|---------|---------|
| Access Token | Short (15-30 min) | Memory + localStorage | API authorization |
| Refresh Token | Long (7-30 days) | HttpOnly cookie preferred | Token rotation |
| CSRF Token | Session-scoped | Cookie + header | Cross-site protection |

### Role-Based Access Control

| Role | Capabilities | Pages |
|------|------------|-------|
| **Guest** | Browse, search, view listings | Public routes |
| **User** | All guest + sell, buy, chat, rewards | Auth-gated routes |
| **Seller** | All user + dashboard, analytics | `/dashboard`, `/my-home` |
| **Admin** | All seller + moderation, user management | `/admin-panel` |
| **Super Admin** | Full platform access | All routes |

---

## 📡 API Reference

### Route File Index (60+ Files)

<details>
<summary><strong>🔐 Authentication & Identity</strong></summary>

| File | Base Path | Key Endpoints |
|------|-----------|---------------|
| `auth.js` | `/api/auth` | Login, signup, refresh, logout, OTP, verify |
| `twoFactor.js` | `/api/2fa` | Enable/disable 2FA, verify, backup codes |
| `profile.js` | `/api/profile` | Get/update profile, preferences, avatar |
| `users.js` | `/api/users` | User lookup, search, admin operations |
| `gdpr.js` | `/api/gdpr` | Data export, deletion requests |

</details>

<details>
<summary><strong>🛍️ Marketplace & Commerce</strong></summary>

| File | Base Path | Key Endpoints |
|------|-----------|---------------|
| `posts.js` | `/api/posts` | CRUD, search, filter, boost, nearby |
| `categories.js` | `/api/categories` | Category list, stats, hub data |
| `subcategories.js` | `/api/subcategories` | Subcategory CRUD and metadata |
| `cart.js` | `/api/cart` | Cart operations |
| `wishlist.js` | `/api/wishlist` | Save/unsave items |
| `offers.js` | `/api/offers` | Price negotiation |
| `sale.js` | `/api/sale` | Sale completion flow |
| `saleundone.js` | `/api/saleundone` | Sale reversal |
| `tiers.js` | `/api/tiers` | Subscription tier plans |
| `subscriptions.js` | `/api/subscriptions` | Subscription management |
| `payments.js` | `/api/payments` | Payment processing |

</details>

<details>
<summary><strong>💬 Social & Communication</strong></summary>

| File | Base Path | Key Endpoints |
|------|-----------|---------------|
| `chat.js` | `/api/chat` | Conversations, messages, typing |
| `feed.js` | `/api/feed` | Community feed CRUD |
| `channels.js` | `/api/channels` | Channel CRUD, follow/unfollow |
| `reviews.js` | `/api/reviews` | User reviews and ratings |
| `notifications.js` | `/api/notifications` | Notification CRUD, unread count |
| `pushNotifications.js` | `/api/push` | Push subscription management |

</details>

<details>
<summary><strong>🏆 Rewards & Gamification</strong></summary>

| File | Base Path | Key Endpoints |
|------|-----------|---------------|
| `rewards.js` | `/api/rewards` | Rewards profile, log, streaks, SSE stream |
| `coins.js` | `/api/coins` | Balance, check-in, spin, scratch, engagement |
| `referral.js` | `/api/referral` | Referral code, chain, invites |
| `wallet.js` | `/api/wallet` | Coin wallet operations |

</details>

<details>
<summary><strong>🔒 Trust & Safety</strong></summary>

| File | Base Path | Key Endpoints |
|------|-----------|---------------|
| `aadhaar.js` | `/api/aadhaar` | Aadhaar verification flow |
| `kyc.js` | `/api/kyc` | KYC document submission |
| `complaints.js` | `/api/complaints` | Issue reporting |
| `feedback.js` | `/api/feedback` | User feedback |
| `loginAudit.js` | `/api/login-audit` | Login history and anomaly tracking |

</details>

<details>
<summary><strong>📊 Analytics & Discovery</strong></summary>

| File | Base Path | Key Endpoints |
|------|-----------|---------------|
| `analytics.js` | `/api/analytics` | Platform analytics |
| `sellerAnalytics.js` | `/api/seller-analytics` | Seller performance metrics |
| `recommendations.js` | `/api/recommendations` | ML-powered suggestions |
| `nearby.js` | `/api/nearby` | Geo-proximity search |
| `savedSearches.js` | `/api/saved-searches` | Search persistence |
| `recentlyViewed.js` | `/api/recently-viewed` | View history tracking |
| `priceHistory.js` | `/api/price-history` | Price trend data |
| `priceAlerts.js` | `/api/price-alerts` | Price drop notifications |
| `publicWall.js` | `/api/public-wall` | Public social wall data |

</details>

<details>
<summary><strong>⚙️ Platform Operations</strong></summary>

| File | Base Path | Key Endpoints |
|------|-----------|---------------|
| `admin.js` | `/api/admin` | Admin CRUD operations |
| `adminDashboard.js` | `/api/admin/dashboard` | Admin analytics |
| `cms.js` | `/api/cms` | Content management |
| `translation.js` | `/api/translation` | Auto-translation API |
| `telemetry.js` | `/api/telemetry` | Event ingestion pipeline |
| `automation.js` | `/api/automation` | Rule-based automation |
| `deviceLifecycle.js` | `/api/devices` | Device provisioning |
| `fleetOrchestration.js` | `/api/fleet` | Service fleet management |
| `reliability.js` | `/api/reliability` | DR/backup controls |
| `securityOperations.js` | `/api/security-ops` | Security operations |
| `operatorPlatform.js` | `/api/operator` | Operator workflows |
| `intelligenceFinops.js` | `/api/finops` | Cost optimization |
| `launchGovernance.js` | `/api/governance` | Launch readiness checks |

</details>

---

## 💾 Database Schema

### Core Tables

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│    users     │    │    posts     │    │ transactions │
├──────────────┤    ├──────────────┤    ├──────────────┤
│ user_id (PK) │◄──┤ author (FK)  │    │ buyer_id(FK) │
│ email        │    │ title        │    │ seller_id(FK)│
│ password_hash│    │ description  │    │ post_id (FK) │
│ phone        │    │ price        │    │ agreed_price │
│ coins        │    │ category     │    │ status       │
│ xp           │    │ subcategory  │    │ otp_hash     │
│ level        │    │ location     │    │ completed_at │
│ tier         │    │ images       │    └──────────────┘
│ referred_by  │    │ condition    │
│ created_at   │    │ status       │
└──────────────┘    │ created_at   │
                    └──────────────┘
```

### Rewards Tables

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│     rewards      │   │   reward_log     │   │ reward_idempot.  │
├──────────────────┤   ├──────────────────┤   ├──────────────────┤
│ user_id (PK)     │   │ id (PK)          │   │ id (PK)          │
│ points           │   │ user_id          │   │ user_id          │
│ tier             │   │ action           │   │ idempotency_key  │
└──────────────────┘   │ points           │   │ action           │
                       │ description      │   │ points_delta     │
                       │ created_at       │   └──────────────────┘
                       └──────────────────┘

┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ daily_checkins   │   │ spin_history     │   │ scratch_claims   │
├──────────────────┤   ├──────────────────┤   ├──────────────────┤
│ user_id (PK)     │   │ id (PK)          │   │ id (PK)          │
│ last_checkin_date│   │ user_id          │   │ user_id          │
│ streak           │   │ spin_date        │   │ referral_user_id │
│ best_streak      │   │ reward_amount    │   │ reward_amount    │
└──────────────────┘   └──────────────────┘   └──────────────────┘

┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ referral_rewards │   │ referral_closure │   │  user_streaks    │
├──────────────────┤   ├──────────────────┤   ├──────────────────┤
│ referrer_id      │   │ ancestor_id      │   │ user_id (PK)     │
│ referred_user_id │   │ descendant_id    │   │ visit_streak     │
│ level            │   │ depth            │   │ post_streak      │
│ reward_coins     │   └──────────────────┘   │ last_visit_date  │
└──────────────────┘                          └──────────────────┘
```

### Migration History (20 Migrations)

| # | Migration | Purpose |
|:-:|:----------|:--------|
| 001 | `location_village_colony` | Village/colony location granularity |
| 002 | `subscription_plans` | Tier-based subscription system |
| 003 | `coin_economy` | Coin transaction infrastructure |
| 004 | `performance_indexes` | Query optimization indexes |
| 005 | `search_ranking` | Full-text search scoring |
| 006 | `coin_transactions_uuid_fix` | UUID compatibility for coins |
| 007 | `user_subscriptions_uuid_fix` | UUID compatibility for subscriptions |
| 008 | `feature_consolidation` | Feature flag cleanup |
| 009 | `composite_indexes` | Multi-column query optimization |
| 010 | `subscription_plan_quotas` | Plan limits enforcement |
| 011 | `webauthn_passkeys` | FIDO2/WebAuthn credential storage |
| 012 | `rewards_engagement` | Daily check-in, spin, scratch tables |
| 013 | `subscription_rewards_foundation` | Rewards-subscription integration |
| 014 | `missing_tables_20260319` | Schema gap fill |
| 015 | `reward_idempotency` | Idempotent reward mutations |
| 016 | `referral_chain_rewards` | Multi-level referral chain |
| 017 | `notifications_cart_recently_viewed` | Notification + cart + history tables |
| 018 | `cart_tables_legacy_int` | Legacy integer cart support |
| 019 | `user_rating_count_aadhaar_flag` | Rating count + Aadhaar verification flag |
| 020 | `rewards_chain_complete` | Full referral closure + streaks + XP/level |

---

## 🛡 Middleware Pipeline

### Request Processing Order

```
Request
  │
  ├─ 1. Helmet (security headers)
  ├─ 2. CORS (origin validation)
  ├─ 3. Rate Limiter (flood protection)
  ├─ 4. WAF Enforcement (payload scanning)
  ├─ 5. VPN Blocker (proxy detection)
  ├─ 6. Request Logger (audit trail)
  ├─ 7. CSRF Validation (state-changing ops)
  ├─ 8. Auth (JWT verification)
  ├─ 9. Device Binding (session-device pin)
  ├─ 10. RBAC (role check)
  ├─ 11. Runtime Budget (performance guard)
  ├─ 12. API Contract (version validation)
  │
  ├─ → Controller Logic
  │
  ├─ 13. Error Handler (structured errors)
  └─ Response
```

### Middleware Inventory (40+ Files)

| Category | Files | Purpose |
|----------|-------|---------|
| **Auth** | `auth.js`, `twoFactor.js`, `adaptiveMfaLogin.js` | Token verify, 2FA, adaptive MFA |
| **Security** | `wafEnforcement.js`, `vpnBlocker.js`, `vpnEnforcement.js`, `zeroTrust.js` | Input scanning, proxy blocking, zero-trust |
| **Session** | `deviceBinding.js`, `deviceBindingPostAuth.js`, `deviceIdentity.js`, `deviceTracker.js` | Device pinning, fingerprinting |
| **Access** | `rbac.js`, `riskRestrictions.js`, `authAnomalyThrottle.js` | Role checking, risk gating |
| **Integrity** | `apiContract.js`, `apiIntegrity.js`, `tenantContext.js`, `runtimeBudget.js` | API versioning, performance budgets |
| **Audit** | `requestLogger.js`, `authLogger.js`, `authAuditMiddleware.js`, `activityTracker.js` | Request logging, auth audit |
| **Validation** | `validatePost.js`, `validateUser.js`, `validators.js`, `captcha.js` | Input validation, CAPTCHA |
| **Media** | `upload.js`, `imageOptimizer.js`, `imageProcessor.js` | File upload, image optimization |
| **Rate Limit** | `rateLimiter.js`, `enhancedRateLimiter.js` | Request throttling |

---

## 🏆 Rewards & Gamification System

### Program Goals
- Drive daily engagement and repeat visits without devaluing the coin economy.
- Reward real marketplace outcomes (listings, sales, purchases, quality reviews).
- Grow high-quality referrals while preventing abuse.

### Coin Economics (Config-Driven)
- Currency: Coins only (no "Points" terminology anywhere in codebase or UI).
- Conversion: 100 coins = Rs 1 (default, server-configurable via COINS_PER_RUPEE).
- Redemption: Coins can cover up to 10% of Silver or Premium plan cost only.
- Eligible spend: Plan upgrades only (no cash-out).
- Expiry: Earned coins expire after 12 months; promo coins expire after 90 days.
- Spend order: FIFO -- oldest non-expired coins are consumed first.
- Source of truth: GET /coins/rewards-config returns amounts, caps, tiers, and store items.

### Earn Methods

| Action | Coins | Cap / Frequency | Notes |
|--------|:-----:|:---------------:|-------|
| Welcome bonus | 100 | Once | New user onboarding bonus |
| Daily check-in | 5 to 100 | 1/day | 7-day streak: 5, 10, 15, 20, 30, 50, 100 |
| Spin the wheel | 5-100 | 1/day | Weighted random pool |
| Create listing | 5 | 50/day (10 listings) | Encourages supply growth |
| Complete sale | 25 | 250/day | Strongest marketplace signal |
| Make purchase | 10 | 100/day | Buyer activation |
| 5-star review received | 15 | No daily cap | Quality signal |
| First listing | 25 | Once | One-time seller activation |
| First sale | 50 | Once | One-time seller milestone |
| Referral L1 (direct) | 100 | Shared referral caps | Direct invite |
| Referral L2 | 40 | Shared referral caps | 2nd-gen invite |
| Referral L3 | 20 | Shared referral caps | 3rd-gen invite |
| Referral L4 | 10 | Shared referral caps | 4th-gen invite |
| Referral L5 | 5 | Shared referral caps | 5th-gen invite |
| Referral milestone (3 refs) | 50 | Once | 3 qualified referrals bonus |

### Referral Ladder and Anti-Abuse Caps
- Ladder: L1 = 100, L2 = 40, L3 = 20, L4 = 10, L5 = 5 coins.
- Referral rewards only trigger after the referred user completes real activity (transaction OR 2+ verified listings).
- Caps: 500 coins/day, 5,000/month, 50,000 lifetime across all referral rewards per ancestor.
- checkReferralCaps() in referralJoinRewards.js reads referral_rewards usage and clamps awards to remaining cap budget.

### Expiry and FIFO
- Promo coin types (90-day expiry): welcome_bonus, daily_checkin, spin_wheel, scratch_card, referral_milestone_3.
- All other types (marketplace activity, referral chain) are earned coins with 365-day expiry.
- Each credit row in coin_transactions has a remaining column tracking unspent balance.
- spendCoins() queries oldest non-expired rows with remaining > 0 (ORDER BY created_at ASC FOR UPDATE) and deducts FIFO.

### Tier System

| Tier | Coins Required | Perks |
|------|:--------------:|-------|
| Bronze | 0-499 | Standard visibility |
| Silver | 500-1,999 | Priority support, 5% boost discount |
| Gold | 2,000-4,999 | Premium badge, 10% boost discount, featured profile |
| Platinum | 5,000+ | VIP support, 20% boost discount, exclusive deals |

### Backend Implementation
- server/src/services/referralJoinRewards.js: 5-level referral distribution + daily/monthly/lifetime cap enforcement.
- server/src/controllers/coinController.js: Earn events (addCoins with expiry), spend events (spendCoins with FIFO), daily caps, engagement (check-in, spin, scratch), store redemption, getRewardsConfig endpoint.
- server/src/routes/coins.js: GET /coins/rewards-config (public, no auth), GET /coins/history, POST /coins/daily-checkin, POST /coins/spin, POST /coins/redeem.
- Migration 020: index on referrer_id, created_at for fast cap queries; adds expires_at and remaining columns.

### Frontend Experience
- Rewards hub: client/src/pages/RewardsPage.jsx.
- Hero card with coin balance, Rs equivalent (100 coins = Rs 1), tier badge, and progress bar to next tier.
- Quick Actions: Daily check-in and Spin buttons with live availability state.
- 5 Tabs: Overview, Referral Network, Earn, Store, History.
- Earn tab is config-driven via GET /coins/rewards-config and shows exact amounts, caps, and anti-abuse rules.
- History tab uses GET /coins/history (paginated ledger with earn/spend entries).
- Referral Network tab: client/src/components/rewards/ReferralChainTree.jsx shows all 5 levels with status badges (pending/qualified/rewarded) and cap info.
- Cart (client/src/pages/Cart.jsx) shows coin equivalent of the order total in the summary.

## 🔒 Trust & Safety Engine

### Trust Score System

```
Trust Score = f(
  verification_level,       // Aadhaar, KYC, email, phone
  transaction_history,      // Successful sales/purchases
  account_age,              // Time since registration
  complaint_ratio,          // Complaints vs transactions
  review_average,           // Star rating average
  activity_consistency      // Regular engagement
)
```

### Trust Levels

| Level | Score Range | Badge | Effect |
|-------|:----------:|:-----:|--------|
| **Verified** | 70-100 | 🟢 | Full access, premium visibility |
| **New** | 40-69 | 🟡 | Standard access, building trust |
| **Risky** | 0-39 | 🔴 | Restricted visibility, flagged |
| **Under Review** | — | ⚠️ | Active investigation |
| **Frozen** | — | ❄️ | Account suspended |

### Security Layers

```
Layer 1: Network     → Helmet, CORS, HSTS
Layer 2: Input       → WAF enforcement, input validation, CAPTCHA
Layer 3: Identity    → VPN blocking, device fingerprinting, geo-alert
Layer 4: Auth        → JWT + Refresh, Argon2, 2FA, Passkeys/WebAuthn
Layer 5: Session     → Device binding, session retention, token rotation
Layer 6: Access      → RBAC, risk restrictions, anomaly throttle
Layer 7: Data        → Parameterized queries, advisory locks, idempotency
Layer 8: Audit       → Request logging, auth audit, activity tracking
Layer 9: Operations  → Breach check, fraud scoring, risk engine, zero trust
```

---

## ⚡ Realtime Infrastructure

### Socket.IO Architecture

```
Client                          Server
  │                                │
  ├── connect (with JWT) ─────►   ├── authenticate
  │                                ├── join_room user_{id}
  ├── send_message ────────────►  ├── persist + broadcast
  ◄── receive_message ────────    │
  ├── typing_start ────────────►  ├── broadcast to room
  ◄── reward_update ───────────   ├── SSE from rewards engine
  ◄── notification ────────────   ├── notification service
```

---

## 📱 Mobile & PWA

### Capacitor Config

| Setting | Value |
|---------|-------|
| App ID | `com.mhub.app` |
| App Name | `MHub` |
| Deep Link Scheme | `mhub://` |
| Web Directory | `dist` |

### Native Capabilities

| Capability | Plugin | Usage |
|-----------|--------|-------|
| GPS Location | `@capacitor/geolocation` | Nearby listings, auto-location |
| Contacts | `@capacitor-community/contacts` | Contact-based referrals |
| Deep Links | `@capacitor/app` | `mhub://` scheme handling |
| Push Notifications | FCM + VAPID | Background notifications |

### PWA Features

- Service Worker for offline caching (`sw.js`, `push-sw.js`)
- Web Manifest for installability (`manifest.json`)
- Firebase Cloud Messaging integration (`firebase-messaging-sw.js`)

---

## 🎨 Theming & Design System

### Theme Architecture

| Mode | Trigger | Strategy |
|------|---------|----------|
| Light | Default | CSS variables (`:root`) |
| Dark | `html.dark` class | Tailwind `darkMode: 'class'` |
| System | `prefers-color-scheme` | Auto-detect + persist |

### Design Tokens (200+ CSS Variables)

| Category | Examples |
|----------|---------|
| **Colors** | `--primary`, `--secondary`, `--accent`, `--background`, `--foreground` |
| **Surfaces** | `--surface-0` through `--surface-3` |
| **Cards** | `--card`, `--card-foreground` |
| **Semantic** | `--destructive`, `--muted`, `--border`, `--ring` |

### Typography

| Family | Usage |
|--------|-------|
| **Manrope** | Body text (sans-serif) |
| **Sora** | Display headings |

---

## 🌍 Internationalization

### 26 Supported Languages

| Region | Languages |
|--------|-----------|
| **Indian** | en, hi, te, ta, kn, ml, mr, bn, gu, pa, ur, or, as |
| **International** | ar, zh, es, fr, de, id, it, ja, ko, pt, ru, th, tr, vi |

- **1,250+ translation keys** in `en.json`
- Lazy loading via `i18next-http-backend`
- localStorage caching via `i18next-localstorage-backend`
- Browser language auto-detection

---

## 🧪 Testing Strategy

### Client

```bash
npm run test                        # Vitest unit tests
npm run test:e2e:smoke              # Playwright smoke flows
npm run check:bundle-budget         # Bundle size validation
npm run check:performance-budget    # Performance metrics
npm run check:no-hardcoded-localhost # Code hygiene
npm run check:network-contract      # API contract validation
npm run check:ux-smoke              # UX route validation
```

### Server

```bash
npm run test                        # Jest test suite
npm run test:critical-paths         # Critical user journey tests
npm run test:e2e:journeys           # End-to-end journey tests
npm run test:waf                    # WAF rule validation
npm run preflight:schema            # Database schema validation
npm run check:schema-contract       # Schema integrity
npm run check:route-contract        # Route coverage
npm run check:foundation-contract   # Foundation config validation
npm run failover:tabletop           # Failover simulation
npm run backup:drill                # Backup/restore drill
```

---

## 🔐 Security Architecture

### Defense-in-Depth

```
Layer 1: Network    → Helmet (headers), CORS, HSTS
Layer 2: Input      → WAF, validation, CAPTCHA
Layer 3: Identity   → VPN block, device fingerprint, geo-alert
Layer 4: Auth       → JWT, Argon2, 2FA, Passkeys
Layer 5: Session    → Device binding, token rotation
Layer 6: Access     → RBAC, risk restrictions
Layer 7: Data       → Parameterized queries, advisory locks
Layer 8: Audit      → Request/auth logging
Layer 9: Ops        → Fraud scoring, risk engine, zero trust
```

### Auth Methods

| Method | Implementation | Strength |
|--------|---------------|:--------:|
| Password + Argon2id | `authController.js` | ⬛⬛⬛ |
| OTP (SMS/Email) | `otpService.js` | ⬛⬛⬜ |
| WebAuthn/Passkeys | `webauthnController.js` | ⬛⬛⬛⬛ |
| 2FA (TOTP) | `twoFactorController.js` | ⬛⬛⬛ |

---

## 🚄 Performance & Optimization

### Client-Side

| Technique | Implementation |
|-----------|---------------|
| Code splitting | React.lazy() + Suspense per route |
| Image compression | `browser-image-compression` + `sharp` |
| Lazy loading | `LazyImage` with IntersectionObserver |
| Infinite scroll | `useInfiniteScroll` + TanStack Query |
| Bundle budgets | `check-bundle-budget.mjs` |
| CDN images | Cloudinary with transforms |
| Skeleton loading | Per-component skeletons |
| FOUC prevention | Inline theme detection script |

### Server-Side

| Technique | Implementation |
|-----------|---------------|
| Connection pooling | `pg` pool with timeouts |
| Redis caching | `cacheService.js` with invalidation |
| Query indexes | 20+ migration index additions |
| Rate limiting | Per-endpoint adaptive limiting |
| Runtime budgets | `runtimeBudget.js` P95 tracking |
| View buffering | `postViewBufferService.js` batch writes |
| Full-text search | PostgreSQL tsvector + ranking |

---

## 🌟 World-Class Repo Inspirations

| Repository | Inspiration For |
|-----------|-----------------|
| [**React**](https://github.com/facebook/react) | Component architecture, hooks pattern |
| [**Next.js**](https://github.com/vercel/next.js) | Production web architecture, DX |
| [**Vite**](https://github.com/vitejs/vite) | Build tooling, developer experience |
| [**Express**](https://github.com/expressjs/express) | Middleware pattern, routing |
| [**Prisma**](https://github.com/prisma/prisma) | Database schema, migrations |
| [**Stripe**](https://github.com/stripe/stripe-node) | API design, idempotency |
| [**Supabase**](https://github.com/supabase/supabase) | Real-time, auth, PostgreSQL |
| [**Cal.com**](https://github.com/calcom/cal.com) | Full-stack monorepo, i18n |
| [**Medusa**](https://github.com/medusajs/medusa) | E-commerce backend, cart |
| [**Discourse**](https://github.com/discourse/discourse) | Community, trust levels, gamification |
| [**Ghost**](https://github.com/TryGhost/Ghost) | CMS, membership, subscriptions |
| [**Kubernetes**](https://github.com/kubernetes/kubernetes) | Orchestration, control planes |
| [**PostgreSQL**](https://github.com/postgres/postgres) | Database reliability, optimization |
| [**Django**](https://github.com/django/django) | Security patterns, admin |
| [**Redis**](https://github.com/redis/redis) | Cache patterns, pub/sub |
| [**Airbnb JavaScript**](https://github.com/airbnb/javascript) | Style guides and linting discipline |
| [**Shopify Polaris**](https://github.com/Shopify/polaris) | Design system patterns at scale |
| [**Radix UI**](https://github.com/radix-ui/primitives) | Accessible UI primitives |
| [**Tailwind CSS**](https://github.com/tailwindlabs/tailwindcss) | Utility-first styling and tokens |
| [**Storybook**](https://github.com/storybookjs/storybook) | Component documentation workflows |
| [**Sentry**](https://github.com/getsentry/sentry) | Observability and incident workflows |
| [**OpenTelemetry**](https://github.com/open-telemetry/opentelemetry-collector) | Tracing and telemetry standards |
| [**React Native**](https://github.com/facebook/react-native) | Mobile cross-platform patterns |

---

## 🗺 Roadmap

### Active Development

| Priority | Initiative | Status |
|:--------:|-----------|:------:|
| 🔴 | Server-backed cart with stock/price validation | Planned |
| 🔴 | Notification real-time sync + reliable pagination | In Progress |
| 🟡 | Wishlist management features (sort, filter, bulk) | Planned |
| 🟡 | Sale confirmation with transaction evidence | Planned |
| 🟢 | Large list virtualization | Partial |
| 🟢 | Offline-first PWA guarantees | Partial |

### Completed Milestones

| Date | Milestone |
|------|-----------|
| 2026-04 | Page-by-Page Feature Map (50+ pages documented), removed /category-mode and /my-recommendations |
| 2026-04 | Rewards Config v2.0.0 schema + coin-to-Rs conversion (100 coins = Rs 1) |
| 2026-04 | Coin expiry (365d earned / 90d promo) + FIFO spend logic |
| 2026-04 | 5-level referral chain with validation + anti-abuse caps |
| 2026-04 | Rewards chain infrastructure (migration 020) |
| 2026-04 | Centre page premium redesign |
| 2026-04 | Dark mode comprehensive system |
| 2026-04 | Auth-guard bug fixes across all surfaces |
| 2026-03 | GPS refinement + location accuracy improvements |
| 2026-03 | 26-language i18n system |
| 2026-03 | WebAuthn/Passkey authentication |
| 2026-03 | Full rewards gamification system |

---

## 🤝 Contributing

### Pre-PR Checklist

```bash
# Client checks
cd client
npm run lint                    # Code quality
npm run test                    # Unit tests
npm run build                   # Build validation
npm run check:bundle-budget     # Bundle size

# Server checks
cd server
npm run test                    # Test suite
npm run test:critical-paths     # Critical paths
npm run preflight:schema        # Schema validation
```

### Coding Standards

| Area | Standard |
|------|----------|
| Components | Functional with hooks |
| Server state | TanStack Query |
| Styling | Tailwind utilities + CSS variables |
| Auth guards | Check `isLoggedIn` before user-specific data |
| API calls | Guard `useEffect` calls with auth check |
| i18n | `t()` with `defaultValue` for all user text |

---

## 📋 Changelog

| Date | Change |
|------|--------|
| **2026-04-06** | Page-by-Page Feature Map with 50+ pages, updated Rewards section (coins-only, FIFO, expiry, ASCII-safe), removed /category-mode and /my-recommendations |
| **2026-04-06** | Rewards Config v2.0.0 (expiry, FIFO, coin-to-Rs conversion), comprehensive rewards documentation |
| **2026-04-05** | Navigation map refresh, app flow atlas, and dual-lens user/developer documentation |
| **2026-04-05** | Rewards chain infrastructure (migration 020), Centre page premium redesign, auth-guard bug fixes |
| **2026-04-04** | Dark mode comprehensive system, Tailwind token expansion |
| **2026-03-23** | Initial platform handbook with features, risks, and roadmap |

---

<p align="center">
  <strong>Built with ❤️ by the MHub Team</strong><br/>
  <sub>Last updated: April 6, 2026</sub>
</p>
















