<p align="center">
  <img src="client/public/icons/icon-192x192.png" alt="MHub Logo" width="80" height="80" />
</p>

<h1 align="center">MHub</h1>

<p align="center">
  <strong>The Category-Native Marketplace Platform</strong><br/>
  <em>One app. Every category. Every community.</em>
</p>

<p align="center">
  <a href="#-quick-start"><img src="https://img.shields.io/badge/Quick_Start-â†’-blue?style=for-the-badge" alt="Quick Start" /></a>
  <a href="#-architecture"><img src="https://img.shields.io/badge/Architecture-â†’-purple?style=for-the-badge" alt="Architecture" /></a>
  <a href="#-features"><img src="https://img.shields.io/badge/Features-â†’-green?style=for-the-badge" alt="Features" /></a>
  <a href="#-api-reference"><img src="https://img.shields.io/badge/API_Ref-â†’-orange?style=for-the-badge" alt="API" /></a>
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
<summary><strong>ðŸ“‘ Table of Contents</strong> <em>(click to expand)</em></summary>

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

## ðŸŒŸ Platform Vision

> **MHub is a category-native marketplace** that behaves like multiple specialized marketplace apps inside a single product.

Unlike generic classifieds where all categories live in one undifferentiated feed, MHub pivots its entire UI â€” discovery, filters, recommendations, and seller flow â€” based on the user's chosen category context. This makes buying electronics feel different from buying fashion, which feels different from browsing real estate.

### For Users
- **Browse** thousands of listings across categories with intelligent discovery
- **Sell** with a guided posting flow, tier-based visibility, and seller analytics
- **Earn** coins & rewards through daily activity, referrals, and streaks
- **Trust** â€” every seller has a computed trust score, verification badges, and review history
- **Chat** â€” real-time messaging with buyers and sellers
- **Save** â€” wishlists, saved searches, recently viewed, and price alerts

### For Developers
- **67 distinct routes** across marketplace, social, commerce, and admin surfaces
- **60+ API route files** covering auth, commerce, trust, gamification, and platform ops
- **40+ security middleware** layers from WAF to device binding to zero-trust
- **55+ backend services** spanning fraud detection to fleet orchestration
- **100+ reusable components** built on Radix UI + Tailwind primitives
- **26 languages** with full i18n infrastructure
- **Full-stack type safety** via consistent API contracts and validation

---

## ðŸš€ Quick Start

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | â‰¥ 18.x | Runtime |
| **PostgreSQL** | â‰¥ 15 | Database |
| **Redis** | â‰¥ 7.x | Cache & sessions |
| **npm** | â‰¥ 9.x | Package manager |

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
node run_migration.js

# Seed sample data (optional)
npm run seed:sample-data
```

### 3. Start Development

```bash
# Terminal 1 â€” API Server (port 5001)
cd server
npm run dev

# Terminal 2 â€” Client App (port 5173)
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

## ðŸ§± Tech Stack

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

## ðŸ— Architecture

### System Overview

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                         USER DEVICES                                â”‚
â”‚           Web Browser  Â·  Android (Capacitor)  Â·  PWA              â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                               â”‚
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚   CLIENT APP        â”‚
                    â”‚   React + Vite      â”‚
                    â”‚   67 Routes         â”‚
                    â”‚   100+ Components   â”‚
                    â”‚   6 Context Providersâ”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                               â”‚
              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
              â”‚ HTTP/REST      â”‚ WebSocket       â”‚ Push
              â”‚ (Axios)        â”‚ (Socket.IO)     â”‚ (FCM/VAPID)
              â”‚                â”‚                 â”‚
    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
    â”‚   EXPRESS API      â”‚  â”‚  REALTIME   â”‚  â”‚   PUSH      â”‚
    â”‚   60+ Route Files  â”‚  â”‚  ENGINE     â”‚  â”‚   SERVICE   â”‚
    â”‚   46 Controllers   â”‚  â”‚  Chat/Notif â”‚  â”‚   FCM/Web   â”‚
    â”‚   40+ Middleware   â”‚  â”‚  Rewards SSEâ”‚  â”‚   Push      â”‚
    â”‚   55+ Services     â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
              â”‚
    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
    â”‚         â”‚                      â”‚
â”Œâ”€â”€â”€â”´â”€â”€â”€â” â”Œâ”€â”€â”´â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚Postgreâ”‚ â”‚ Redis â”‚ â”‚ External Services                â”‚
â”‚  SQL  â”‚ â”‚       â”‚ â”‚ Cloudinary Â· Aadhaar Â· Payments  â”‚
â”‚ 20+   â”‚ â”‚ Cache â”‚ â”‚ FCM Â· VAPID Â· Geolocation        â”‚
â”‚Tables â”‚ â”‚Sessionâ”‚ â”‚                                   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Frontend Architecture

```
client/src/
â”œâ”€â”€ App.jsx                 # Root: Router + Providers + 67 Routes
â”œâ”€â”€ main.jsx                # Entry: React DOM + i18n bootstrap
â”œâ”€â”€ index.css               # Global styles + theme imports
â”‚
â”œâ”€â”€ pages/                  # 60+ page-level components
â”‚   â”œâ”€â”€ AllPosts.jsx        # Discovery feed
â”‚   â”œâ”€â”€ PostDetail.jsx      # Listing detail
â”‚   â”œâ”€â”€ Profile.jsx         # User account (4 tabs)
â”‚   â”œâ”€â”€ Rewards.jsx         # Gamification hub
â”‚   â”œâ”€â”€ Chat.jsx            # Realtime messaging
â”‚   â””â”€â”€ ...
â”‚
â”œâ”€â”€ components/             # 100+ reusable UI components
â”‚   â”œâ”€â”€ GreenNavbar.jsx     # Primary navigation (top + bottom)
â”‚   â”œâ”€â”€ GreenProductCard.jsx# Listing card
â”‚   â”œâ”€â”€ RequireAuth.jsx     # Auth guard HOC
â”‚   â”œâ”€â”€ ui/                 # Radix UI primitives (shadcn)
â”‚   â”œâ”€â”€ rewards/            # Rewards section components
â”‚   â”œâ”€â”€ legal/              # Legal page components
â”‚   â””â”€â”€ page-state/         # Loading/Error/Empty states
â”‚
â”œâ”€â”€ context/                # 6 React Context providers
â”‚   â”œâ”€â”€ AuthContext.jsx     # Auth state, login, logout, refresh
â”‚   â”œâ”€â”€ CartContext.jsx     # Shopping cart state
â”‚   â”œâ”€â”€ CategoryModeContext.jsx  # Category app mode
â”‚   â”œâ”€â”€ FilterContext.jsx   # Global filter state
â”‚   â”œâ”€â”€ LocationContext.jsx # GPS & location state
â”‚   â””â”€â”€ ThemeContext.jsx    # Dark/light/system theme
â”‚
â”œâ”€â”€ hooks/                  # 18 custom hooks
â”‚   â”œâ”€â”€ useNotifications.js # TanStack Query notification hooks
â”‚   â”œâ”€â”€ useRealtimeChat.js  # Socket.IO chat integration
â”‚   â”œâ”€â”€ useTrustScore.js    # Trust badge computation
â”‚   â”œâ”€â”€ useInfiniteScroll.js# Pagination hook
â”‚   â””â”€â”€ ...
â”‚
â”œâ”€â”€ services/               # Client-side service layer
â”‚   â”œâ”€â”€ api.js              # Axios instance + interceptors
â”‚   â”œâ”€â”€ vpnDetection.js     # VPN/proxy detection
â”‚   â”œâ”€â”€ deviceFingerprint.js# Browser fingerprinting
â”‚   â””â”€â”€ nativeGpsService.js # Capacitor GPS bridge
â”‚
â”œâ”€â”€ utils/                  # 25 utility modules
â”‚   â”œâ”€â”€ authStorage.js      # Token & session helpers
â”‚   â”œâ”€â”€ savedPosts.js       # Wishlist local state
â”‚   â”œâ”€â”€ formatPrice.js      # â‚¹ currency formatting
â”‚   â”œâ”€â”€ relativeTime.js     # "2 hours ago" formatting
â”‚   â””â”€â”€ ...
â”‚
â”œâ”€â”€ lib/                    # Core library integrations
â”‚   â”œâ”€â”€ socket.js           # Socket.IO client setup
â”‚   â”œâ”€â”€ firebase.js         # FCM integration
â”‚   â”œâ”€â”€ pushService.js      # Web Push subscription
â”‚   â””â”€â”€ requestSecurity.js  # Hardened request headers
â”‚
â”œâ”€â”€ styles/                 # Theme & design tokens
â”‚   â””â”€â”€ themes/
â”‚       â”œâ”€â”€ light-theme.css # 100+ CSS variable tokens
â”‚       â”œâ”€â”€ dark-theme.css  # Dark palette tokens
â”‚       â”œâ”€â”€ dark-overrides.css
â”‚       â””â”€â”€ dark-comprehensive.css
â”‚
â”œâ”€â”€ locales/                # i18n translation files
â”‚   â””â”€â”€ en.json             # 1,250+ translation keys
â”‚
â”œâ”€â”€ constants/              # App constants
â”‚   â”œâ”€â”€ languages.js        # 26 supported languages
â”‚   â””â”€â”€ categoryIcons.js    # Category â†’ icon mapping
â”‚
â””â”€â”€ i18n/                   # i18n configuration
    â””â”€â”€ index.js            # i18next setup with backends
```

### Backend Architecture

```
server/src/
â”œâ”€â”€ index.js                # Express app + route mounting + Socket.IO
â”‚
â”œâ”€â”€ routes/                 # 60+ API route files
â”‚   â”œâ”€â”€ auth.js             # /api/auth/*
â”‚   â”œâ”€â”€ posts.js            # /api/posts/*
â”‚   â”œâ”€â”€ chat.js             # /api/chat/*
â”‚   â”œâ”€â”€ rewards.js          # /api/rewards/*
â”‚   â”œâ”€â”€ coins.js            # /api/coins/*
â”‚   â”œâ”€â”€ notifications.js    # /api/notifications/*
â”‚   â”œâ”€â”€ payments.js         # /api/payments/*
â”‚   â””â”€â”€ ...                 # 53 more route files
â”‚
â”œâ”€â”€ controllers/            # 46 controller files
â”‚   â”œâ”€â”€ authController.js   # Auth logic (login, signup, OTP, passkeys)
â”‚   â”œâ”€â”€ postController.js   # CRUD + search + boost
â”‚   â”œâ”€â”€ chatController.js   # Conversations + messages
â”‚   â”œâ”€â”€ rewardsController.js# Points, tiers, leaderboard
â”‚   â”œâ”€â”€ coinController.js   # Coin economy (spin, checkin, scratch)
â”‚   â””â”€â”€ ...
â”‚
â”œâ”€â”€ services/               # 55+ business logic services
â”‚   â”œâ”€â”€ rewardsLedgerService.js     # Idempotent point mutations
â”‚   â”œâ”€â”€ referralChainRewards.js     # Multi-level referral chain
â”‚   â”œâ”€â”€ streakRewardsService.js     # Visit/post streak tracking
â”‚   â”œâ”€â”€ leaderboardRewardsService.js# Weekly leaderboard rewards
â”‚   â”œâ”€â”€ trustScoreService.js        # Trust score computation
â”‚   â”œâ”€â”€ fraudService.js             # Fraud detection
â”‚   â”œâ”€â”€ riskEngine.js               # Risk scoring engine
â”‚   â””â”€â”€ ...
â”‚
â”œâ”€â”€ middleware/              # 40+ middleware layers
â”‚   â”œâ”€â”€ auth.js             # JWT verification
â”‚   â”œâ”€â”€ rbac.js             # Role-based access control
â”‚   â”œâ”€â”€ wafEnforcement.js   # Web application firewall
â”‚   â”œâ”€â”€ vpnBlocker.js       # VPN/proxy blocking
â”‚   â”œâ”€â”€ deviceBinding.js    # Session-device pinning
â”‚   â”œâ”€â”€ zeroTrust.js        # Zero-trust verification
â”‚   â””â”€â”€ ...
â”‚
â”œâ”€â”€ utils/                  # Database helpers, logger, etc.
â”‚   â”œâ”€â”€ dbHelpers.js        # Pool, query timeouts, helpers
â”‚   â””â”€â”€ logger.js           # Structured logging
â”‚
â””â”€â”€ worker/                 # Background job processing
```

---

## ðŸŽ¯ Features

### Feature Matrix

| Category | Feature | Status | Auth | Route |
|:---------|:--------|:------:|:----:|:------|
| **Discovery** | | | | |
| | Category Hub (Home) | âœ… | â€” | `/category-hub` |
| | All Posts Feed | âœ… | â€” | `/all-posts` |
| | Personalized For You | âœ… | â€” | `/for-you` |
| | Community Feed | âœ… | â€” | `/feed` |
| | Nearby Listings | âœ… | ðŸ”’ | `/nearby` |
| | Global Search | âœ… | â€” | `/search` |
| | Public Wall | âœ… | â€” | `/public-wall` |
| | Home Discovery | âœ… | â€” | `/home` |
| **Listings** | | | | |
| | Listing Detail | âœ… | â€” | `/post/:id` |
| | Add Post (Sell) | âœ… | ðŸ”’ | `/add-post` |
| | Quick Post | âœ… | ðŸ”’ | `/post_add` |
| | Feed Post | âœ… | ðŸ”’ | `/feed/feedpostadd` |
| | Edit Post | âœ… | ðŸ”’ | `/edit-post/:postId` |
| | My Posts | âœ… | ðŸ”’ | `/my-home` |
| | Seller Dashboard | âœ… | ðŸ”’ | `/dashboard` |
| **Commerce** | | | | |
| | Cart | âœ… | ðŸ”’ | `/cart` |
| | Wishlist | âœ… | ðŸ”’ | `/wishlist` |
| | Offers | âœ… | â€” | `/offers` |
| | Buy History | âœ… | ðŸ”’ | `/bought-posts` |
| | Sell History | âœ… | ðŸ”’ | `/sold-posts` |
| | Sale Complete | âœ… | ðŸ”’ | `/saledone` |
| | Sale Undo | âœ… | ðŸ”’ | `/saleundone` |
| | Buyer View | âœ… | ðŸ”’ | `/buyer-view` |
| **Social** | | | | |
| | Realtime Chat | âœ… | ðŸ”’ | `/chat` |
| | Channels | âœ… | â€” | `/channels` |
| | Centre Pages | âœ… | ðŸ”’ | `/centre` |
| | Activity Hub | âœ… | ðŸ”’ | `/activity` |
| | Reviews | âœ… | â€” | `/reviews/:userId` |
| | My Feed | âœ… | ðŸ”’ | `/my-feed` |
| **Rewards** | | | | |
| | Rewards Dashboard | âœ… | ðŸ”’ | `/rewards` |
| | Daily Check-in | âœ… | ðŸ”’ | API |
| | Spin the Wheel | âœ… | ðŸ”’ | API |
| | Scratch Cards | âœ… | ðŸ”’ | API |
| | Referral Chain | âœ… | ðŸ”’ | API |
| | Streak Bonuses | âœ… | ðŸ”’ | API |
| | Leaderboard | âœ… | ðŸ”’ | API |
| | Tier System | âœ… | ðŸ”’ | API |
| **Account** | | | | |
| | Profile (4 tabs) | âœ… | ðŸ”’ | `/profile` |
| | Notifications | âœ… | ðŸ”’ | `/notifications` |
| | Security Settings | âœ… | ðŸ”’ | `/security` |
| | Payments | âœ… | ðŸ”’ | `/payment` |
| | KYC Verification | âœ… | ðŸ”’ | `/kyc` |
| | Aadhaar Verify | âœ… | ðŸ”’ | `/aadhaar-verify` |
| | Posting Plans | âœ… | ðŸ”’ | `/tier-selection` |
| **Admin** | | | | |
| | Admin Panel | âœ… | ðŸ”’ðŸ‘‘ | `/admin-panel` |
| | Analytics | âœ… | â€” | `/analytics` |
| | Seller Analytics | âœ… | ðŸ”’ | API |

> ðŸ”’ = Requires authentication &nbsp;&nbsp; ðŸ‘‘ = Requires admin role &nbsp;&nbsp; âœ… = Implemented

---

### 1. Category-Native Marketplace

> *The core differentiator â€” MHub pivots its entire experience based on category context.*

```
User selects "Electronics" â†’ UI shows tech-optimized filters, specs,
  price comparisons, and electronics-specific discovery

User switches to "Fashion" â†’ UI pivots to size filters, style
  recommendations, and fashion-optimized card layouts
```

**Key Behaviors:**
- **Category Mode Selector** â€” Full-screen mode picker at `/category-mode`
- **Scoped Filtering** â€” Search, price range, subcategories, and condition filters scope to active category
- **Cart Scoping** â€” Cart badge reflects items in current category context
- **Feed Scoping** â€” Discovery feeds filter by active category mode
- **Persistent Selection** â€” Category mode persists across sessions via localStorage

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

> *From posting to sale completion â€” a full listing lifecycle.*

```
Sell Welcome â†’ Add Post â†’ My Posts â†’ Offers â†’ Sale Done
     â”‚              â”‚          â”‚                  â”‚
     â–¼              â–¼          â–¼                  â–¼
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
- **My Posts** (`/my-home`) â€” View, edit, delete, boost listings
- **Dashboard** (`/dashboard`) â€” Sales analytics, view counts, engagement
- **Seller Analytics** â€” Revenue tracking, performance metrics
- **Post Boost** â€” Visibility enhancement via coin spending
- **Guaranteed Reach** â€” Premium visibility tier

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
- **Bought Posts** â€” All purchases with status tracking
- **Sold Posts** â€” All sales with revenue summary
- **Buyer View** â€” Buyer-centric interface for active transactions

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
â”œâ”€â”€ ?tab=overview     # Activity summary, trust score, stats
â”œâ”€â”€ ?tab=personal     # Name, email, phone, avatar
â”œâ”€â”€ ?tab=preferences  # Category preferences, notifications, language
â””â”€â”€ ?tab=settings     # Privacy, security, data export, delete
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

## 📍 Page Directory — All 67 Routes

This is the authoritative navigation inventory used by product, QA, and engineering.

Auth legend: `🔒` = authenticated, `🔐` = authenticated + role, `—` = public.

### Primary Nav (Bottom Bar)

| # | Page | Route(s) | Auth | Description |
|:-:|:-----|:---------|:----:|:------------|
| 1 | **Category Hub** | `/category-hub` | — | Category landing / discovery home |
| 2 | **All Posts** | `/all-posts`, `/listings` | — | Product listing feed |
| 3 | **For You** | `/for-you` (alias: `/my-recommendations` → `/for-you`) | — | Personalized recommendations |
| 4 | **Feed** | `/feed` | — | Community/activity feed |
| 5 | **Rewards** | `/rewards` | 🔒 | Loyalty & gamification hub |
| 6 | **Profile** | `/profile` | 🔒 | User account hub |
| 7 | **More** | Hamburger menu | — | Secondary navigation drawer |

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
| 8 | **Sell Welcome** | `/post-welcome` | 🔒 | Start selling flow |
| 9 | **Posting Plans** | `/tier-selection`, `/tiers`, `/pricing` | 🔒 | Tier selection and pricing |
| 10 | **Centre** | `/centre` | 🔒 | Centre channel list |
| 11 | **Nearby** | `/nearby` | 🔒 | Nearby listings |
| 12 | **Category Mode** | `/category-mode` | — | App/category mode selector |
| 13 | **Subcategories** | `/subcategories`, `/categories` | — | Category browser |
| 14 | **Chat** | `/chat`, `/chats` | 🔒 | Messaging |
| 15 | **Feedback** | `/feedback` | 🔒 | Feedback form |
| 16 | **Complaints** | `/complaints` | 🔒 | Issue reporting |
| 17 | **Verification** | `/verification` | 🔒 | Verification entry point |
| 18 | **Dashboard** | `/dashboard` | 🔒 | Seller dashboard |
| 19 | **Admin Panel** | `/admin-panel` | 🔐 | Admin tools |

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
| 25 | **Home Discovery** | `/home` | — | Curated discovery landing |
| 26 | **Activity Hub** | `/activity` | 🔒 | Shortcut hub (chat/offers/reviews/nearby) |
| 27 | **Public Wall** | `/public-wall` | — | Public listings/social wall |
| 28 | **Search** | `/search` | — | Global search |

### Listings & Post Flow

| # | Page | Route(s) | Auth | Description |
|:-:|:-----|:---------|:----:|:------------|
| 29 | **Listing Detail** | `/post/:id`, `/listing/:id` | — | Item detail view |
| 30 | **Add Post** | `/add-post`, `/sell` | 🔒 | Create listing form |
| 31 | **Quick Post** | `/post_add` | 🔒 | Alternate add-post flow |
| 32 | **Feed Post Add** | `/feed/feedpostadd` | 🔒 | Feed-only post creation (no image upload) |
| 33 | **Edit Post** | `/edit-post/:postId` | 🔒 | Edit listing |

### My Inventory & Transactions

| # | Page | Route(s) | Auth | Description |
|:-:|:-----|:---------|:----:|:------------|
| 34 | **My Posts** | `/my-home`, `/my-posts` | 🔒 | Manage your listings |
| 35 | **Bought Posts** | `/bought-posts` | 🔒 | Purchase history |
| 36 | **Sold Posts** | `/sold-posts` | 🔒 | Sold history |
| 37 | **Buyer View** | `/buyer-view` | 🔒 | Buyer-centric view |
| 38 | **Sale Done** | `/saledone` | 🔒 | Mark sale complete |
| 39 | **Sale Undone** | `/saleundone` | 🔒 | Revert sale |

### Feed & Social Extensions

| # | Page | Route(s) | Auth | Description |
|:-:|:-----|:---------|:----:|:------------|
| 40 | **Feed Detail** | `/feed/:id` | — | Feed post detail |
| 41 | **My Feed** | `/my-feed` | 🔒 | Personal feed |
| 42 | **Offers** | `/offers` | — | Transaction offers |
| 43 | **Reviews** | `/reviews/:userId` | — | User reviews/ratings |

### Commerce & Saved

| # | Page | Route(s) | Auth | Description |
|:-:|:-----|:---------|:----:|:------------|
| 44 | **Wishlist** | `/wishlist` | 🔒 | Saved items |
| 45 | **Cart** | `/cart` | 🔒 | Cart |
| 46 | **Recently Viewed** | `/recently-viewed` | 🔒 | Browsing history |
| 47 | **Saved Searches** | `/saved-searches` | 🔒 | Stored searches |

### Messaging & Channels

| # | Page | Route(s) | Auth | Description |
|:-:|:-----|:---------|:----:|:------------|
| 48 | **Channels** | `/channels` | — | Channel list |
| 49 | **Channel Create** | `/channels/create` | 🔒 | Create channel |
| 50 | **Channel Detail** | `/channels/:id` | — | Channel page |
| 51 | **Centre Create** | `/centre/create` | 🔒 | Create centre page |
| 52 | **Centre Detail** | `/centre/:id` | 🔒 | Centre page |
| 53 | **Centre Listings** | `/centre/:id/listings` | 🔒 | Centre listings |

### Account, Trust & Payments

| # | Page | Route(s) | Auth | Description |
|:-:|:-----|:---------|:----:|:------------|
| 54 | **Notifications** | `/notifications` | 🔒 | Notification center |
| 55 | **Security Settings** | `/security` | 🔒 | Account security |
| 56 | **Payment Methods** | `/payment` | 🔒 | Payments |
| 57 | **KYC Verification** | `/kyc` | 🔒 | KYC flow |
| 58 | **Aadhaar Verify** | `/aadhaar-verify` | 🔒 | Aadhaar verification |
| 59 | **Analytics** | `/analytics` | — | Analytics insights |

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

## 🧭 App Flow Atlas (User + Developer Lens)

This section documents end-to-end journeys in two voices: the **User View** (plain language) and the **Developer View** (implementation lens).

### Dual-Lens Summary

| User Language | Developer Language |
|:-------------|:-------------------|
| Discover items by category and intent. | Category mode state shapes filters, endpoints, and UI layouts. |
| See personalized picks that reflect interests. | Preferences + recommendation signals feed `/for-you`. |
| Trust sellers through verification and reputation. | Trust score, verification, and review services annotate listings. |
| Close transactions with clear states. | Offers + sale state changes create audit trails and ledger updates. |
| Stay engaged with rewards and streaks. | Rewards engine tracks events, streaks, and leaderboards. |

### Flow 1: Discover → Decide → Contact (Guest & Buyer)

| Step | User View | Pages | Developer View |
|:----:|:----------|:------|:---------------|
| 1 | Choose a category or mode. | `/category-hub`, `/category-mode` | Category mode drives filters and query scopes. |
| 2 | Browse the main feed. | `/all-posts`, `/listings` | Paginated post feed with filters and caching. |
| 3 | Explore personalized picks. | `/for-you` | Recommendation pipeline using preference snapshot. |
| 4 | Open a listing. | `/post/:id`, `/listing/:id` | Listing detail + media pipeline + trust badges. |
| 5 | Start a conversation or offer. | `/chat`, `/chats`, `/offers` | Socket.IO chat + offers state updates. |
| 6 | Complete or revert a sale. | `/saledone`, `/saleundone` | Transaction state changes with audit logging. |

### Flow 2: Sell → Manage → Close (Seller)

| Step | User View | Pages | Developer View |
|:----:|:----------|:------|:---------------|
| 1 | Start the selling journey. | `/post-welcome` | Onboarding and tier awareness entry point. |
| 2 | Choose a posting plan. | `/tier-selection`, `/tiers`, `/pricing` | Plan/tier gating for visibility and features. |
| 3 | Create a listing. | `/add-post`, `/sell`, `/post_add` | Listing creation, validation, media upload. |
| 4 | Track your listings. | `/my-home`, `/my-posts` | Seller inventory management and status. |
| 5 | Negotiate offers. | `/offers` | Offer lifecycle and transaction state. |
| 6 | Mark transactions complete. | `/saledone`, `/saleundone` | Sale confirmation and reversal with audit. |
| 7 | Build a premium presence. | `/centre`, `/centre/create`, `/centre/:id` | Centre page creation and premium branding. |

### Flow 3: Trust & Safety → Account Confidence

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
| 1 | Open rewards hub. | `/rewards` | Rewards ledger, coins, XP, tiers. |
| 2 | Track activity milestones. | `/activity` | Activity feed with rewardable events. |
| 3 | Receive updates. | `/notifications` | Reward notifications and streak reminders. |
| 4 | See progress on profile. | `/profile?tab=overview` | Completion percentage and next actions. |

### Flow 5: Community → Social Signal → Discovery

| Step | User View | Pages | Developer View |
|:----:|:----------|:------|:---------------|
| 1 | Browse community feed. | `/feed` | Feed ranking and engagement signals. |
| 2 | Deep dive into a post. | `/feed/:id` | Feed detail with comments and reactions. |
| 3 | Explore public activity. | `/public-wall` | Public visibility layer. |

### Flow 6: Support → Resolution

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

## 📘 Product + Engineering Handbook (Printable Layout)

This layout is optimized for printing or PDF export while remaining readable in‑repo.

### Printable Cover Sheet

| Field | Value |
|:------|:------|
| Document | MHub Product + Engineering Handbook |
| Version | v2026.04.05 |
| Owners | Product + Engineering |
| Audience | Product, Engineering, QA, Ops |
| Scope | End‑to‑end app flows, navigation, architecture, trust, rewards |
| Classification | Internal |

**How to use this handbook:**
- Use the Page Directory for route coverage.
- Use the Sequence Diagrams and Acceptance Criteria for QA.
- Use the Page Specs for implementation alignment.

<div style="page-break-after: always;"></div>

### Print Guide

1. Use your browser’s print dialog and select “Save as PDF.”
2. Enable background graphics for consistent diagrams and tables.
3. Set scale to 90–95% for tighter page flow.
4. Prefer portrait orientation for tables; use landscape only for wide diagrams.

### Handbook Structure (At‑a‑Glance)

| Part | Audience | What You’ll Get |
|:-----|:---------|:----------------|
| Product Overview | Everyone | Platform vision, value proposition, and user promise |
| User Journeys | Product + QA | End‑to‑end flows and expected outcomes |
| Navigation + Pages | Product + Eng | Complete route inventory and purpose |
| System Architecture | Engineering | Frontend, backend, realtime, and data layout |
| Data + APIs | Engineering | Service boundaries, data contracts, and core endpoints |
| Trust + Safety | Product + Eng | Verification, risk, and safety controls |
| Rewards + Loyalty | Product + Eng | Gamification engine and user progression |
| Mobile + PWA | Engineering | Native capabilities and offline behavior |
| Operations | Engineering + QA | Testing, performance, and security posture |

<div style="page-break-after: always;"></div>

### End‑to‑End Sequence Diagrams

#### 1) Buy Flow — Discover → Decide → Contact → Complete

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
  App->>API: Fetch listings (category‑scoped)
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

#### 2) Sell Flow — Onboard → List → Manage → Close

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
  participant Rewards
  participant DB
  participant Notif

  User->>App: Open Rewards
  App->>API: Get reward summary
  API->>Rewards: Compute current tier
  Rewards->>DB: Read ledger + streaks
  DB-->>Rewards: Ledger data
  Rewards-->>API: Reward state
  API-->>App: Coins, XP, tier

  User->>App: Complete activity
  App->>API: Submit activity event
  API->>Rewards: Validate + award points
  Rewards->>DB: Append ledger entry
  Rewards->>Notif: Send reward notification
  Notif-->>App: In‑app update
  API-->>App: Updated balance
```

---

### Acceptance Criteria (Print‑Ready)

#### Buy Flow Acceptance Criteria

| ID | Scenario | Expected |
|:---|:---------|:---------|
| B1 | Open Category Hub | Categories and discovery shortcuts render with loading skeletons then data. |
| B2 | Apply category filters | Listing feed updates to category‑scoped results with correct counts. |
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
| R1 | Open Rewards | Current coin balance, XP, tier, and streaks render correctly. |
| R2 | Daily check‑in | One check‑in per day; repeated attempts are idempotent. |
| R3 | Activity reward | Eligible actions add ledger entries with correct points. |
| R4 | Leaderboard update | Weekly refresh reflects new ranks without duplicates. |
| R5 | Reward notification | In‑app notification appears with correct balance delta. |
| R6 | Offline or error | Rewards view shows cached state and retry messaging. |

<div style="page-break-after: always;"></div>

### Page Specs (Condensed, Print‑Ready)

Each page below includes its intent, primary actions, and key states. This section complements the route inventory.

#### Primary Nav Specs

| Page | Route(s) | User Goal | Key Actions | Key States |
|:-----|:---------|:----------|:------------|:-----------|
| Category Hub | `/category-hub` | Choose discovery path | Browse categories, jump to feed | Loading, empty, error |
| All Posts | `/all-posts`, `/listings` | Browse listings | Filter, sort, open listing | Loading, empty, error |
| For You | `/for-you` | Personalized picks | Refresh, open listing | Loading, cold‑start, error |
| Feed | `/feed` | Community updates | Open post, react | Loading, empty, error |
| Rewards | `/rewards` | See rewards | Check‑in, view ledger | Loading, auth required, error |
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
| Admin Panel | `/admin-panel` | Admin tools | Manage platform | Role‑gated, error |

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
| Saved Searches | `/saved-searches` | Re‑run searches | Open, delete | Loading, empty |

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
| Terms (Short) | `/t&c` | Review summary | Read | — |
| Terms | `/terms`, `/terms-and-conditions` | Read terms | Read | — |
| Privacy Policy | `/privacy-policy` | Understand privacy | Read | — |
| Refund Policy | `/refund-policy` | Review refunds | Read | — |
| Support Ticket Policy | `/support-ticket-policy` | Review support policy | Read | — |

#### Redirects & Fallbacks Specs

| Route | Target | Purpose | Key States |
|:------|:-------|:--------|:-----------|
| `/` | `/category-hub` | Root redirect | — |
| `/categories/:slug` | `/all-posts` | Category slug redirect | — |
| `*` | `/category-hub` | Not found fallback | 404 |
---
## ðŸ§­ Navigation Architecture

### Top Navigation Bar (`GreenNavbar`)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  ðŸ” Search  â”‚  ðŸ“ Location  â”‚  ðŸ”” â¤ï¸ ðŸ›’ â°  â”‚  ðŸŒ™/â˜€ï¸  â”‚ ðŸŒ â”‚
â”‚             â”‚  Filter Panel â”‚  Badges        â”‚  Theme  â”‚Langâ”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
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
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  ðŸ  Hub  â”‚  ðŸ“‹ Posts  â”‚  â­ For You  â”‚  ðŸ“° Feed  â”‚  â‹®More â”‚
â”‚          â”‚           â”‚             â”‚          â”‚       â”‚
â”‚ rewards  â”‚  profile  â”‚             â”‚          â”‚       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**7 Primary Tabs:**
1. **Category Hub** — Category discovery home (`/category-hub`)
2. **All Posts** — Listing feed (`/all-posts`, `/listings`)
3. **For You** — Personalized recommendations (`/for-you`, alias `/my-recommendations`)
4. **Feed** — Community/activity feed (`/feed`)
5. **Rewards** — Loyalty & gamification (`/rewards`, auth-gated)
6. **Profile** — Account hub with Overview, Personal, Preferences, Settings tabs (`/profile`)
7. **More** — Secondary navigation drawer

### More Menu (Hamburger)

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ TRADE                    â”‚
â”‚  + Sell    â˜… Plans       â”‚
â”‚  ðŸª Centre  ðŸ“ Nearby    â”‚
â”‚  ðŸ§­ Category  ðŸ“‚ Subcats â”‚
â”‚                          â”‚
â”‚ SOCIAL                   â”‚
â”‚  ðŸ’¬ Chat   â­ Feedback   â”‚
â”‚  ðŸ“‹ Complaints           â”‚
â”‚                          â”‚
â”‚ ACCOUNT                  â”‚
â”‚  âœ“ Verification          â”‚
â”‚  ðŸ“Š Dashboard            â”‚
â”‚  ðŸ” Admin Panel          â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## ðŸ” Authentication & Access Control

### Auth Flow

```
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚   Login     â”‚
                    â”‚  /login     â”‚
                    â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜
                           â”‚
            â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
            â”‚              â”‚              â”‚
     â”Œâ”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”
     â”‚  Password  â”‚ â”‚   OTP      â”‚ â”‚  Passkey  â”‚
     â”‚  + Argon2  â”‚ â”‚  delivery  â”‚ â”‚  WebAuthn â”‚
     â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜
            â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                           â”‚
                    â”Œâ”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”
                    â”‚ JWT Access  â”‚
                    â”‚ + Refresh   â”‚
                    â”‚ Token Pair  â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
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

## ðŸ“¡ API Reference

### Route File Index (60+ Files)

<details>
<summary><strong>ðŸ” Authentication & Identity</strong></summary>

| File | Base Path | Key Endpoints |
|------|-----------|---------------|
| `auth.js` | `/api/auth` | Login, signup, refresh, logout, OTP, verify |
| `twoFactor.js` | `/api/2fa` | Enable/disable 2FA, verify, backup codes |
| `profile.js` | `/api/profile` | Get/update profile, preferences, avatar |
| `users.js` | `/api/users` | User lookup, search, admin operations |
| `gdpr.js` | `/api/gdpr` | Data export, deletion requests |

</details>

<details>
<summary><strong>ðŸ›ï¸ Marketplace & Commerce</strong></summary>

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
<summary><strong>ðŸ’¬ Social & Communication</strong></summary>

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
<summary><strong>ðŸ† Rewards & Gamification</strong></summary>

| File | Base Path | Key Endpoints |
|------|-----------|---------------|
| `rewards.js` | `/api/rewards` | Rewards profile, log, streaks, SSE stream |
| `coins.js` | `/api/coins` | Balance, check-in, spin, scratch, engagement |
| `referral.js` | `/api/referral` | Referral code, chain, invites |
| `wallet.js` | `/api/wallet` | Coin wallet operations |

</details>

<details>
<summary><strong>ðŸ”’ Trust & Safety</strong></summary>

| File | Base Path | Key Endpoints |
|------|-----------|---------------|
| `aadhaar.js` | `/api/aadhaar` | Aadhaar verification flow |
| `kyc.js` | `/api/kyc` | KYC document submission |
| `complaints.js` | `/api/complaints` | Issue reporting |
| `feedback.js` | `/api/feedback` | User feedback |
| `loginAudit.js` | `/api/login-audit` | Login history and anomaly tracking |

</details>

<details>
<summary><strong>ðŸ“Š Analytics & Discovery</strong></summary>

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
<summary><strong>âš™ï¸ Platform Operations</strong></summary>

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

## ðŸ’¾ Database Schema

### Core Tables

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚    users     â”‚    â”‚    posts     â”‚    â”‚ transactions â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤    â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤    â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ user_id (PK) â”‚â—„â”€â”€â”¤ author (FK)  â”‚    â”‚ buyer_id(FK) â”‚
â”‚ email        â”‚    â”‚ title        â”‚    â”‚ seller_id(FK)â”‚
â”‚ password_hashâ”‚    â”‚ description  â”‚    â”‚ post_id (FK) â”‚
â”‚ phone        â”‚    â”‚ price        â”‚    â”‚ agreed_price â”‚
â”‚ coins        â”‚    â”‚ category     â”‚    â”‚ status       â”‚
â”‚ xp           â”‚    â”‚ subcategory  â”‚    â”‚ otp_hash     â”‚
â”‚ level        â”‚    â”‚ location     â”‚    â”‚ completed_at â”‚
â”‚ tier         â”‚    â”‚ images       â”‚    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
â”‚ referred_by  â”‚    â”‚ condition    â”‚
â”‚ created_at   â”‚    â”‚ status       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚ created_at   â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Rewards Tables

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚     rewards      â”‚   â”‚   reward_log     â”‚   â”‚ reward_idempot.  â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤   â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤   â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ user_id (PK)     â”‚   â”‚ id (PK)          â”‚   â”‚ id (PK)          â”‚
â”‚ points           â”‚   â”‚ user_id          â”‚   â”‚ user_id          â”‚
â”‚ tier             â”‚   â”‚ action           â”‚   â”‚ idempotency_key  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚ points           â”‚   â”‚ action           â”‚
                       â”‚ description      â”‚   â”‚ points_delta     â”‚
                       â”‚ created_at       â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ daily_checkins   â”‚   â”‚ spin_history     â”‚   â”‚ scratch_claims   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤   â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤   â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ user_id (PK)     â”‚   â”‚ id (PK)          â”‚   â”‚ id (PK)          â”‚
â”‚ last_checkin_dateâ”‚   â”‚ user_id          â”‚   â”‚ user_id          â”‚
â”‚ streak           â”‚   â”‚ spin_date        â”‚   â”‚ referral_user_id â”‚
â”‚ best_streak      â”‚   â”‚ reward_amount    â”‚   â”‚ reward_amount    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ referral_rewards â”‚   â”‚ referral_closure â”‚   â”‚  user_streaks    â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤   â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤   â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ referrer_id      â”‚   â”‚ ancestor_id      â”‚   â”‚ user_id (PK)     â”‚
â”‚ referred_user_id â”‚   â”‚ descendant_id    â”‚   â”‚ visit_streak     â”‚
â”‚ level            â”‚   â”‚ depth            â”‚   â”‚ post_streak      â”‚
â”‚ reward_coins     â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â”‚ last_visit_date  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                          â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
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

## ðŸ›¡ Middleware Pipeline

### Request Processing Order

```
Request
  â”‚
  â”œâ”€ 1. Helmet (security headers)
  â”œâ”€ 2. CORS (origin validation)
  â”œâ”€ 3. Rate Limiter (flood protection)
  â”œâ”€ 4. WAF Enforcement (payload scanning)
  â”œâ”€ 5. VPN Blocker (proxy detection)
  â”œâ”€ 6. Request Logger (audit trail)
  â”œâ”€ 7. CSRF Validation (state-changing ops)
  â”œâ”€ 8. Auth (JWT verification)
  â”œâ”€ 9. Device Binding (session-device pin)
  â”œâ”€ 10. RBAC (role check)
  â”œâ”€ 11. Runtime Budget (performance guard)
  â”œâ”€ 12. API Contract (version validation)
  â”‚
  â”œâ”€ â†’ Controller Logic
  â”‚
  â”œâ”€ 13. Error Handler (structured errors)
  â””â”€ Response
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

## ðŸ† Rewards & Gamification System

### System Architecture

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    REWARDS ENGINE                        â”‚
â”‚                                                         â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”‚
â”‚  â”‚  Daily       â”‚  â”‚  Activity   â”‚  â”‚  Referral   â”‚    â”‚
â”‚  â”‚  Check-in    â”‚  â”‚  Streaks    â”‚  â”‚  Chain      â”‚    â”‚
â”‚  â”‚  (1x/day)    â”‚  â”‚  (Visit+    â”‚  â”‚  (3 levels) â”‚    â”‚
â”‚  â”‚              â”‚  â”‚   Post)     â”‚  â”‚  2/1/0.5 ptsâ”‚    â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜    â”‚
â”‚         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜           â”‚
â”‚                           â”‚                             â”‚
â”‚                    â”Œâ”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”                      â”‚
â”‚                    â”‚   Ledger    â”‚  â† Idempotent        â”‚
â”‚                    â”‚  Service    â”‚  â† Advisory locks    â”‚
â”‚                    â”‚ (Points +   â”‚  â† Audit log         â”‚
â”‚                    â”‚  Tier calc) â”‚                      â”‚
â”‚                    â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”˜                      â”‚
â”‚              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                â”‚
â”‚         â”Œâ”€â”€â”€â”€â”´â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”´â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”´â”€â”€â”€â”            â”‚
â”‚         â”‚ Coins  â”‚  â”‚  XP    â”‚  â”‚  Tier  â”‚            â”‚
â”‚         â”‚Balance â”‚  â”‚ Level  â”‚  â”‚ Badge  â”‚            â”‚
â”‚         â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”˜            â”‚
â”‚                                                         â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”‚
â”‚  â”‚             LEADERBOARD ENGINE                    â”‚  â”‚
â”‚  â”‚  Weekly Top Sellers: 500 / 300 / 150 pts         â”‚  â”‚
â”‚  â”‚  Weekly Top Buyers:  300 / 150 / 75 pts          â”‚  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Reward Actions

| Action | Points | Frequency | Idempotency |
|--------|:------:|:---------:|:-----------:|
| Daily check-in | Variable | 1x/day | `checkin:daily:{userId}:{date}` |
| Spin the wheel | 1-100 (weighted) | 1x/day | `spin:{userId}:{date}` |
| Scratch card | Varies | Per referral | `scratch:{userId}:{referralId}` |
| Visit streak: 3 days | +10 | Milestone | `visit:streak:{userId}:3` |
| Visit streak: 7 days | +25 | Milestone | `visit:streak:{userId}:7` |
| Visit streak: 14 days | +50 | Milestone | `visit:streak:{userId}:14` |
| Visit streak: 30 days | +100 | Milestone | `visit:streak:{userId}:30` |
| Post streak: 3 days | +20 | Milestone | `post:streak:{userId}:3` |
| Post streak: 7 days | +50 | Milestone | `post:streak:{userId}:7` |
| Referral chain L1 | +2 | Per event | `chain:{event}:{ref}:L1` |
| Referral chain L2 | +1 | Per event | `chain:{event}:{ref}:L2` |
| Referral chain L3 | +0.5 | Per event | `chain:{event}:{ref}:L3` |
| Top seller #1 | +500 | Weekly | `leaderboard:{week}:seller:1` |
| Top seller #2 | +300 | Weekly | `leaderboard:{week}:seller:2` |
| Top seller #3 | +150 | Weekly | `leaderboard:{week}:seller:3` |

### Tier System

| Tier | Points Required | Badge |
|------|:--------------:|:-----:|
| ðŸ¥‰ Bronze | 0 - 499 | Default |
| ðŸ¥ˆ Silver | 500 - 1,999 | Earned |
| ðŸ¥‡ Gold | 2,000 - 4,999 | Earned |
| ðŸ’Ž Platinum | 5,000+ | Elite |

---

## ðŸ”’ Trust & Safety Engine

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
| **Verified** | 70-100 | ðŸŸ¢ | Full access, premium visibility |
| **New** | 40-69 | ðŸŸ¡ | Standard access, building trust |
| **Risky** | 0-39 | ðŸ”´ | Restricted visibility, flagged |
| **Under Review** | â€” | âš ï¸ | Active investigation |
| **Frozen** | â€” | â„ï¸ | Account suspended |

### Security Layers

```
Layer 1: Network     â†’ Helmet, CORS, HSTS
Layer 2: Input       â†’ WAF enforcement, input validation, CAPTCHA
Layer 3: Identity    â†’ VPN blocking, device fingerprinting, geo-alert
Layer 4: Auth        â†’ JWT + Refresh, Argon2, 2FA, Passkeys/WebAuthn
Layer 5: Session     â†’ Device binding, session retention, token rotation
Layer 6: Access      â†’ RBAC, risk restrictions, anomaly throttle
Layer 7: Data        â†’ Parameterized queries, advisory locks, idempotency
Layer 8: Audit       â†’ Request logging, auth audit, activity tracking
Layer 9: Operations  â†’ Breach check, fraud scoring, risk engine, zero trust
```

---

## âš¡ Realtime Infrastructure

### Socket.IO Architecture

```
Client                          Server
  â”‚                                â”‚
  â”œâ”€â”€ connect (with JWT) â”€â”€â”€â”€â”€â–º   â”œâ”€â”€ authenticate
  â”‚                                â”œâ”€â”€ join_room user_{id}
  â”œâ”€â”€ send_message â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º  â”œâ”€â”€ persist + broadcast
  â—„â”€â”€ receive_message â”€â”€â”€â”€â”€â”€â”€â”€    â”‚
  â”œâ”€â”€ typing_start â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–º  â”œâ”€â”€ broadcast to room
  â—„â”€â”€ reward_update â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€   â”œâ”€â”€ SSE from rewards engine
  â—„â”€â”€ notification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€   â”œâ”€â”€ notification service
```

---

## ðŸ“± Mobile & PWA

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

## ðŸŽ¨ Theming & Design System

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

## ðŸŒ Internationalization

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

## ðŸ§ª Testing Strategy

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

## ðŸ” Security Architecture

### Defense-in-Depth

```
Layer 1: Network    â†’ Helmet (headers), CORS, HSTS
Layer 2: Input      â†’ WAF, validation, CAPTCHA
Layer 3: Identity   â†’ VPN block, device fingerprint, geo-alert
Layer 4: Auth       â†’ JWT, Argon2, 2FA, Passkeys
Layer 5: Session    â†’ Device binding, token rotation
Layer 6: Access     â†’ RBAC, risk restrictions
Layer 7: Data       â†’ Parameterized queries, advisory locks
Layer 8: Audit      â†’ Request/auth logging
Layer 9: Ops        â†’ Fraud scoring, risk engine, zero trust
```

### Auth Methods

| Method | Implementation | Strength |
|--------|---------------|:--------:|
| Password + Argon2id | `authController.js` | â¬›â¬›â¬› |
| OTP (SMS/Email) | `otpService.js` | â¬›â¬›â¬œ |
| WebAuthn/Passkeys | `webauthnController.js` | â¬›â¬›â¬›â¬› |
| 2FA (TOTP) | `twoFactorController.js` | â¬›â¬›â¬› |

---

## ðŸš„ Performance & Optimization

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

## ðŸŒŸ World-Class Repo Inspirations

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

## ðŸ—º Roadmap

### Active Development

| Priority | Initiative | Status |
|:--------:|-----------|:------:|
| ðŸ”´ | Server-backed cart with stock/price validation | Planned |
| ðŸ”´ | Notification real-time sync + reliable pagination | In Progress |
| ðŸŸ¡ | Wishlist management features (sort, filter, bulk) | Planned |
| ðŸŸ¡ | Sale confirmation with transaction evidence | Planned |
| ðŸŸ¢ | Large list virtualization | Partial |
| ðŸŸ¢ | Offline-first PWA guarantees | Partial |

### Completed Milestones

| Date | Milestone |
|------|-----------|
| 2026-04 | Rewards chain infrastructure (migration 020) |
| 2026-04 | Centre page premium redesign |
| 2026-04 | Dark mode comprehensive system |
| 2026-04 | Auth-guard bug fixes across all surfaces |
| 2026-03 | GPS refinement + location accuracy improvements |
| 2026-03 | 26-language i18n system |
| 2026-03 | WebAuthn/Passkey authentication |
| 2026-03 | Full rewards gamification system |

---

## ðŸ¤ Contributing

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

## ðŸ“‹ Changelog

| Date | Change |
|------|--------|
| **2026-04-05** | Navigation map refresh, app flow atlas, and dual-lens user/developer documentation |
| **2026-04-05** | Rewards chain infrastructure (migration 020), Centre page premium redesign, auth-guard bug fixes |
| **2026-04-04** | Dark mode comprehensive system, Tailwind token expansion |
| **2026-03-23** | Initial platform handbook with features, risks, and roadmap |

---

<p align="center">
  <strong>Built with â¤ï¸ by the MHub Team</strong><br/>
  <sub>Last updated: April 5, 2026</sub>
</p>









