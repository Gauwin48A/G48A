<div align="center">

<img src="https://img.shields.io/badge/%F0%9F%8F%AA_MHub-Trust--First_Marketplace-00C853?style=for-the-badge&labelColor=1B5E20" alt="MHub" />

<br/><br/>

# MHub

### **The Trust-First Marketplace Platform**

*Where every transaction is verified, every seller is accountable, and every user earns rewards.*

<br/>

<p>
  <img alt="react" src="https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img alt="vite" src="https://img.shields.io/badge/Vite-5.2-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img alt="tailwind" src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white" />
  <img alt="express" src="https://img.shields.io/badge/Express-5.1-000000?style=flat-square&logo=express&logoColor=white" />
  <img alt="postgres" src="https://img.shields.io/badge/PostgreSQL-13+-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img alt="socket" src="https://img.shields.io/badge/Socket.io-4.x-010101?style=flat-square&logo=socket.io&logoColor=white" />
  <img alt="pwa" src="https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat-square" />
</p>

<p>
  <img alt="routes" src="https://img.shields.io/badge/API_Routes-59-blue?style=flat-square" />
  <img alt="pages" src="https://img.shields.io/badge/Pages-65-blueviolet?style=flat-square" />
  <img alt="components" src="https://img.shields.io/badge/Components-118-ff69b4?style=flat-square" />
  <img alt="locales" src="https://img.shields.io/badge/Languages-26-orange?style=flat-square" />
  <img alt="controllers" src="https://img.shields.io/badge/Controllers-42-green?style=flat-square" />
  <img alt="services" src="https://img.shields.io/badge/Services-52-yellow?style=flat-square" />
  <img alt="migrations" src="https://img.shields.io/badge/Migrations-33-red?style=flat-square" />
  <img alt="middleware" src="https://img.shields.io/badge/Middleware-31-teal?style=flat-square" />
  <img alt="license" src="https://img.shields.io/badge/License-ISC-brightgreen?style=flat-square" />
</p>

<br/>

**[Documentation](#-table-of-contents)** · **[Quick Start](#-quick-start)** · **[Features](#-feature-highlights)** · **[Architecture](#-architecture)** · **[Security](#-security-fortress)** · **[Monetization](#-marketplace-monetization-engine)**

<br/>

---

</div>

<br/>

## Why MHub?

Most marketplace platforms are either **too simple** (Craigslist-style, zero trust) or **too complex** (enterprise SaaS nobody can afford). MHub sits right in the sweet spot:

```
+------------------------------------------------------------------+
|                                                                    |
|   MHub = Trust + Simplicity + Real Revenue                         |
|                                                                    |
|   OTP-verified transactions (no fake "sold" claims)                |
|   3-tier seller plans with real payment integration                |
|   Boost/Feature/Spotlight monetization per listing                 |
|   26 languages out of the box                                      |
|   KYC verification with Aadhaar + PAN (India-first)                |
|   Referral chain rewards (multi-level)                             |
|   Real-time chat, notifications, push alerts                       |
|   Admin dashboard with full moderation tools                       |
|   PWA - installs like a native app on any phone                    |
|   120,000+ lines of production-grade code                          |
|                                                                    |
+------------------------------------------------------------------+
```

> **Built for India-first marketplaces** - UPI payments, Aadhaar KYC, INR pricing, Hindi/Tamil/Telugu/Kannada and 22 more languages. Works globally too.

<br/>

---

## Table of Contents

<details open>
<summary><strong>Click to expand full table of contents</strong></summary>

<br/>

| Section | What you will learn |
|---|---|
| [Why MHub?](#why-mhub) | The problem MHub solves and why it exists |
| [Feature Highlights](#-feature-highlights) | Every feature explained in simple terms |
| [Who Is This For?](#-who-is-this-for) | Target users and use cases |
| [Quick Start](#-quick-start) | Get running in under 5 minutes |
| [Architecture](#-architecture) | System design, data flow, and topology |
| [Tech Stack](#-tech-stack) | Every technology used and why |
| [Project Structure](#-project-structure) | How the codebase is organized |
| [Marketplace Monetization](#-marketplace-monetization-engine) | Tiers, boosts, payments, and revenue streams |
| [Authentication and Security](#-authentication--authorization) | JWT, CSRF, 2FA, rate limiting, WAF |
| [Security Fortress](#-security-fortress) | 31 middleware layers protecting your platform |
| [Localization](#-localization--26-languages) | 26 languages with instant switching |
| [Pages and Screens](#-pages--screens-65-total) | Every page in the application |
| [Component Library](#-component-library-118-components) | Reusable UI building blocks |
| [API Reference](#-api-reference-59-route-modules) | All 59 API route modules |
| [Real-Time Features](#-real-time-features) | Chat, notifications, live updates |
| [Rewards and Referrals](#-rewards--referral-engine) | Points, streaks, leaderboards, referral chains |
| [Discovery and Search](#-discovery--search) | For You feed, recommendations, saved searches |
| [Commerce Flow](#-commerce--transaction-flow) | Cart to Offer to Sale to OTP to Verified |
| [Admin and Moderation](#-admin--moderation-dashboard) | Full admin panel with bulk actions |
| [Analytics](#-seller-analytics) | Seller dashboards, device tracking, conversion rates |
| [Testing](#-testing-strategy) | Unit, integration, E2E, and contract testing |
| [Deployment](#-deployment--cicd) | CI/CD pipeline and production readiness |
| [Performance](#-performance) | Budgets, caching, virtualization |
| [Database](#-database--migrations-33-migrations) | Schema, entities, and migration history |
| [Roadmap](#-roadmap) | What is coming next |
| [License](#-license) | ISC License |

</details>

<br/>

---

## Feature Highlights

### Core Marketplace

| Feature | What it does | Why it matters |
|---|---|---|
| **Create Listings** | Sellers post items with photos, price, category, location | Core marketplace functionality |
| **Smart Search** | Full-text search with filters (category, price range, location, condition) | Buyers find exactly what they need |
| **Nearby Posts** | Location-based discovery - see what is selling near you | Hyper-local commerce |
| **Categories** | Organized product categories with visual grid | Easy browsing experience |
| **Cart System** | Add items to cart, manage quantities | Familiar shopping experience |
| **Make Offers** | Buyers can make price offers on any listing | Negotiation built-in |
| **Wishlist** | Save favorite items for later | Increases return visits |
| **Recently Viewed** | Track browsing history across sessions | Easy to find items again |
| **Price Alerts** | Get notified when a saved item price drops | Drives conversion |
| **Price History** | See how a listing price has changed over time | Transparency for buyers |

### Trust and Verification

| Feature | What it does | Why it matters |
|---|---|---|
| **OTP-Verified Sales** | Seller initiates sale then Buyer confirms with OTP then Post moves to Sold | **No fake sales. Ever.** |
| **KYC Verification** | Aadhaar + PAN validation with OCR confidence scoring | Verified sellers = trusted marketplace |
| **Reviews and Ratings** | Buyers rate sellers after transactions | Reputation transparency |
| **Complaint System** | Report bad actors with SLA-based resolution | Community safety |
| **Fraud Detection** | Risk engine scores suspicious activity in real time | Prevents scams before they happen |
| **Admin Moderation** | Bulk approve/remove/flag posts and users | Platform integrity |

### Monetization Engine

| Feature | What it does | Why it matters |
|---|---|---|
| **Free Tier** | 3 free posts/month, normal visibility | Low barrier to entry |
| **Silver Plan** | 499 INR for 6 months - 1 post/day, verified badge, boost access | Regular sellers |
| **Premium Plan** | 999 INR per year - unlimited posts, top feed priority, free boosts | Power sellers |
| **Boost (49 INR)** | Push listing higher in search for 7 days | Quick visibility bump |
| **Featured (99 INR)** | Prominent placement + badge for 14 days | Stand out from crowd |
| **Spotlight (199 INR)** | Homepage + detail page promotion for 30 days | Maximum exposure |
| **UPI Payments** | Manual UPI + Razorpay + Stripe webhook support | Indian payment rails |
| **Promo Codes** | LAUNCH50 WELCOME20 - configurable discount codes | User acquisition |

### Rewards and Engagement

| Feature | What it does | Why it matters |
|---|---|---|
| **Reward Points** | Earn points for sales, purchases, referrals | Incentivizes activity |
| **Referral Chain** | Multi-level referral tree with chain rewards | Viral growth engine |
| **Streaks** | Daily activity streaks with bonus rewards | Habit building |
| **Leaderboards** | Weekly seller/buyer rankings with prizes | Friendly competition |
| **Push Notifications** | Web push + in-app + socket-based alerts | Never miss an update |
| **Real-Time Chat** | Instant messaging between buyers and sellers | Fast deal closing |
| **Channels** | Create/join topic-based community channels | Community building |

### Platform Operations

| Feature | What it does | Why it matters |
|---|---|---|
| **Admin Dashboard** | Stats, flagged content, user management, CSV export | Full platform visibility |
| **Seller Analytics** | Views, inquiries, offers, conversion rates per listing | Data-driven selling |
| **Device Analytics** | Browser, OS, screen size tracking across users | Product decisions backed by data |
| **Payment Reconciliation** | Automated mismatch detection + stale payment handling | Revenue integrity |
| **Audit Logging** | Every admin action logged with correlation IDs | Compliance + accountability |
| **Readiness Probes** | /health and /api/ready endpoints | Zero-downtime deployments |

<br/>

---

## Who Is This For?

<table>
<tr>
<td width="33%" valign="top">

### Buyers
- Browse verified listings near you
- Search by category, price, location
- Make offers and negotiate prices
- OTP-verify purchases for safety
- Track wishlist and get price alerts
- Earn rewards on every purchase

</td>
<td width="33%" valign="top">

### Sellers
- List items in seconds with photos
- Choose your plan: Free, Silver, or Premium
- Boost individual listings for more views
- See who is interested in your posts
- Track analytics: views, leads, conversions
- Earn trust badges and referral rewards

</td>
<td width="33%" valign="top">

### Admins
- Full moderation dashboard
- Bulk approve/remove flagged content
- KYC verification queue
- Payment verification + reconciliation
- Revenue stats and user analytics
- Audit trail for every action

</td>
</tr>
</table>

<br/>

---

## Quick Start

### Prerequisites

| Tool | Version | Why |
|---|---|---|
| **Node.js** | 18+ LTS | Runtime for both client and server |
| **npm** | 9+ | Package manager |
| **PostgreSQL** | 13+ | Primary database |
| **Redis** | Optional | Caching + sessions (falls back to in-memory) |

### Get Running in 4 Steps

```bash
# 1. Clone
git clone https://github.com/your-org/mhub.git && cd Mhub

# 2. Install everything
npm run install:all

# 3. Configure environment
cp client/.env.example client/.env
cp server/.env.example server/.env
# Edit both .env files with your DB credentials, JWT secrets, etc.

# 4. Start the full stack
npm run dev
```

> **That is it.** Client runs on `http://localhost:8081`, API on `http://localhost:5001`

### Essential Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start client + server in dev mode |
| `npm run doctor` | Health check the entire repository |
| `npm run install:all` | Install deps for client + server |
| `npm --prefix client run build` | Production build |
| `npm --prefix client run test` | Run frontend tests |
| `npm --prefix server run test` | Run backend tests |
| `npm run release:gate` | Full release readiness check |

<details>
<summary><strong>See all 56 workspace scripts</strong></summary>

<br/>

| Command | Description |
|---|---|
| `npm run dev` | Start workspace dev orchestrator |
| `npm run doctor` | Repository health checks and diagnostics |
| `npm run install:all` | Install both client and server deps |
| `npm run install:all:optimized` | Install + dedupe + footprint report |
| `npm run install:all:prod` | Production-only install |
| `npm run ops:gate` | Operations readiness gate |
| `npm run ops:gate:strict` | Strict operations gate |
| `npm run ops:gate:strict:enforced` | Enforced gate (failover + backup + foundation) |
| `npm run release:gate` | Full pre-release validation |
| `npm run continuous:run` | Continuous improvement runner |
| `npm run continuous:run:strict` | Strict mode with fail-fast |
| `npm run continuous:watch` | Watch mode (5-minute intervals) |
| `npm run proactive:test` | Proactive quality checks |
| `npm run footprint:report` | Bundle size report |
| `npm run footprint:guard` | Bundle budget enforcement |
| `npm run lines:report` | Line count by module |
| `npm run lines:guard` | Line budget enforcement |
| `npm run validate:locales` | Translation coverage check |
| `npm run optimize:locales` | Optimize locale files |
| `npm run optimize:run` | Full optimization pipeline |
| `npm run seo:generate` | Generate SEO artifacts |
| `npm run check:no-secrets` | Scan for leaked credentials |
| `npm run check:hardcoded-strings` | Find un-translated strings |
| `npm run check:repo-structure` | Validate project structure |
| `npm run audit:worktree` | Worktree risk analysis |
| `npm run changelog:generate` | Auto-generate changelog |
| `npm run cleanup:checklist` | Release cleanup runner |
| `npm run backup:evidence:refresh` | Refresh backup evidence |

</details>

<br/>

---

## Architecture

### High-Level System Design

```
+-------------------------------------------------------------------+
|                        CLIENT LAYER                                |
|                                                                    |
|   React 18 + Vite 5 + TailwindCSS + Radix UI                      |
|   65 Pages - 118 Components - 6 Context Providers - PWA Shell      |
|   26 Languages - Dark Mode - Offline Support                       |
|                                                                    |
+---------------+---------------------------+-----------------------+
                | REST API (/api/*)         | WebSocket
                v                           v
+-------------------------------------------------------------------+
|                        API LAYER                                   |
|                                                                    |
|   Express 5 - 59 Route Modules - 42 Controllers - 52 Services     |
|   31 Middleware (auth, WAF, rate-limit, CSRF, tenant, budget)      |
|   JWT + Refresh Tokens - RBAC (5 roles) - 2FA Support              |
|                                                                    |
+------+----------+----------+----------+----------+----------------+
       |          |          |          |          |
       v          v          v          v          v
   +--------+ +--------+ +--------+ +--------+ +--------+
   | Postgre| | Redis  | |Cloudnry| | Socket | | Pusher |
   | SQL    | | Cache  | | Media  | | .io    | | Push   |
   | + 33   | |(optnal)| | CDN    | | Chat   | | Notify |
   | migrtns| |        | |        | |        | |        |
   +--------+ +--------+ +--------+ +--------+ +--------+
```

### Request Lifecycle

```
User Action -> React Component -> Context/Hook -> Axios (api.js)
    -> Express Router -> Middleware Chain (auth, WAF, rate-limit, CSRF)
        -> Controller -> Service -> PostgreSQL/Redis
            -> JSON Response -> React Query Cache -> UI Update
```

### Design Principles

| Principle | Implementation |
|---|---|
| **Trust-first commerce** | OTP-verified sale flow, reward ledger, review moderation |
| **Mobile-first UX** | PWA shell, responsive layouts, touch-target standards |
| **Contract-driven APIs** | Schema preflight, route probes, API contract guards |
| **Operational rigor** | Ops gates, readiness checks, release scripts, backup drills |
| **Localization by default** | 26 locale pipelines with cached translations |
| **Resilience over perfection** | Redis fallback, graceful shutdowns, offline shell |

<br/>

---

## Tech Stack

### Frontend

| Technology | Purpose | Why This Choice |
|---|---|---|
| **React 18** | UI framework | Component-driven, hooks, massive ecosystem |
| **Vite 5** | Build tool | 10x faster than Webpack, instant HMR |
| **TailwindCSS 3.4** | Styling | Utility-first, zero dead CSS, tiny bundles |
| **Radix UI** | Accessible primitives | WAI-ARIA compliant, unstyled base components |
| **React Query** | Server state | Automatic caching, retry, background refetch |
| **Axios** | HTTP client | Interceptors, retry, CSRF token injection |
| **i18next** | Localization | 26 locales, namespace splitting, lazy loading |
| **React Router** | Navigation | Nested routes, guards, lazy loading |
| **Lucide + React Icons** | Iconography | Tree-shakeable, consistent design |
| **Capacitor** | Native mobile | PWA to Android/iOS with one codebase |

### Backend

| Technology | Purpose | Why This Choice |
|---|---|---|
| **Express 5** | API framework | Battle-tested, massive middleware ecosystem |
| **PostgreSQL 13+** | Primary database | ACID transactions, JSON support, free |
| **Redis** | Cache + sessions | Sub-ms reads, pub/sub, optional (in-memory fallback) |
| **Socket.io** | Real-time | WebSocket with fallback, rooms, namespaces |
| **Pusher** | Push channels | Scalable real-time without infrastructure |
| **Cloudinary** | Media CDN | Auto-optimization, responsive images |
| **node-cron** | Scheduling | 10+ background jobs for rewards, cleanup, alerts |
| **Pino** | Logging | Structured JSON logs, correlation IDs |
| **Helmet** | Security headers | CSP, HSTS, XSS protection out of the box |

### Testing and Quality

| Tool | Scope |
|---|---|
| **Vitest** | Frontend unit tests |
| **Playwright** | E2E smoke tests |
| **Jest** | Backend integration tests |
| **ESLint** | Code quality enforcement |
| **56 custom scripts** | Ops gates, budget guards, locale validation |

<br/>

---

## Project Structure

```
Mhub/
|-- client/                              # React + Vite Frontend
|   |-- public/
|   |   +-- locales/                     # 26 language folders (ar, bn, de, en, es, fr...)
|   +-- src/
|       |-- components/                  # 118 reusable UI components
|       |   |-- ui/                      # 45 base primitives (Button, Card, Dialog...)
|       |   |-- PostBoostPanel.jsx       # Boost/Feature/Spotlight purchase UI
|       |   |-- SponsoredListings.jsx    # Promoted post carousel
|       |   |-- NotificationPermission.jsx
|       |   |-- VirtualizedFeed.jsx      # Performance-optimized infinite scroll
|       |   +-- ...71 more components
|       |-- context/                     # 6 React context providers
|       |   |-- AuthContext.jsx          # JWT auth state
|       |   |-- CartContext.jsx          # Shopping cart
|       |   |-- FilterContext.jsx        # Search filters
|       |   |-- LocationContext.jsx      # Geolocation
|       |   |-- LanguageContext.jsx      # i18n state
|       |   +-- ThemeContext.jsx         # Dark/light mode
|       |-- hooks/                       # 7 custom hooks
|       |-- pages/                       # 65 route-level screens
|       |   |-- Auth/                    # Login, SignUp, ForgotPassword, ResetPassword
|       |   |-- KYC/                     # Aadhaar verification flow
|       |   |-- Payments/               # Payment page
|       |   |-- Home.jsx, AllPosts.jsx, ForYou.jsx, PostDetail.jsx...
|       |   +-- TierSelection.jsx       # Pricing plans page
|       |-- services/                    # API client + helpers
|       +-- utils/                       # Shared utilities
|
|-- server/                              # Express Backend
|   |-- src/
|   |   |-- config/                      # 11 config modules (DB, JWT, Redis, Cloudinary...)
|   |   |-- controllers/                 # 42 request handlers
|   |   |-- middleware/                  # 31 security + policy middleware
|   |   |-- routes/                      # 59 API route modules
|   |   |-- services/                    # 52 business logic services
|   |   +-- index.js                     # Server entry point
|   |-- database/
|   |   +-- migrations/                  # 33 SQL migrations
|   |-- worker/                          # Background job runner
|   +-- tests/                           # Backend test suites
|
|-- scripts/                             # 56 workspace automation scripts
|-- package.json                         # Workspace orchestrator
+-- README.md                            # You are here
```

<br/>

---

## Marketplace Monetization Engine

MHub has **5 distinct revenue streams** - all built-in:

### Revenue Stream 1: Tiered Subscriptions

```
+-----------------+-----------------+-----------------+
|   FREE           |   SILVER         |   PREMIUM       |
|                   |   499/6 months   |   999/year      |
| - 3 free posts/mo| - 1 post/day     | - Unlimited     |
| - Normal search  | - Verified badge | - Top feed spot |
| - No boosts      | - Can buy boosts | - Free boosts/mo|
| - Basic support  | - Medium priority| - Priority supp |
|                   | - 7-day trial    | - 14-day trial  |
+-----------------+-----------------+-----------------+
```

### Revenue Stream 2: Post Boosting (Micro-Transactions)

| Boost Type | Price | Duration | Effect |
|---|---|---|---|
| **Boost** | 49 INR | 7 days | Higher in search results |
| **Featured** | 99 INR | 14 days | Prominent badge + priority placement |
| **Spotlight** | 199 INR | 30 days | Homepage + detail page + top of everything |

### Revenue Stream 3: Sponsored Listings

When a buyer views any post, a carousel of **Sponsored Listings** appears at the bottom showing boosted posts, premium seller listings, and featured items. This is the marketplace equivalent of Sponsored Products on Amazon.

### Revenue Stream 4: Pay-Per-Post (Free Users)

Free users get 3 posts/month. Additional posts cost 49 INR each via the `post_credits` system.

### Revenue Stream 5: Payment Processing

Full payment stack:
- **Manual UPI** - User pays via any UPI app, submits transaction ID
- **Razorpay Webhooks** - Automatic verification with signature validation
- **Stripe Webhooks** - International payment support
- **Admin Verification** - Manual verify/reject with audit trail
- **Payment Reconciliation** - Automated mismatch detection every 2 hours

<br/>

---

## Authentication and Authorization

### Auth Flow

```
SignUp -> Email/Phone -> JWT Access Token + Refresh Token
    -> Access Token (short-lived, in header or cookie)
    -> Refresh Token (long-lived, rotated on use)
    -> Password-change invalidation (all sessions revoked)
    -> Login lockout after failed attempts
    -> Optional 2FA step-up verification
```

### Role-Based Access Control (5 Roles)

| Role | Can Do |
|---|---|
| **Guest** | Browse listings, search, read reviews |
| **User** | Create posts, chat, wishlist, cart, make offers, earn rewards |
| **Verified User** | Access KYC-gated features, higher trust actions |
| **Admin** | Moderation dashboard, complaints, user management, payment verification |
| **Super Admin** | System configuration, security operations, full platform control |

<br/>

---

## Security Fortress

MHub runs behind **31 middleware layers** - here is what protects every request:

| Layer | Middleware | What It Does |
|---|---|---|
| 1 | **WAF Enforcement** | Blocks malicious payloads, SQL injection, XSS at the edge |
| 2 | **Helmet + HPP** | Secure headers, CSP, prevent parameter pollution |
| 3 | **CSRF Protection** | Double-submit cookie pattern, token rotation |
| 4 | **JWT Auth** | Access token verification + revocation check + password-change invalidation |
| 5 | **Token Refresh** | Automatic rotation, expiry enforcement, concurrent refresh protection |
| 6 | **Rate Limiter** | Adaptive limits - stricter for auth, relaxed for reads |
| 7 | **CAPTCHA** | Optional reCAPTCHA for sensitive flows |
| 8 | **2FA Middleware** | TOTP-based step-up authentication |
| 9 | **RBAC** | Role-based route guarding (guest/user/verified/admin/super) |
| 10 | **Tenant Context** | Multi-tenant isolation enforcement |
| 11 | **Runtime Budget** | Auto-terminate expensive queries exceeding p95 budget |
| 12 | **Fraud Check** | Real-time risk scoring on transactions |
| 13 | **Geo Alert** | Flag suspicious location changes |
| 14 | **Device Identity** | Fingerprint tracking across sessions |
| 15 | **Auth Anomaly** | Detect unusual login patterns and throttle |
| 16 | **Audit Logger** | Every action logged with correlation IDs |
| 17 | **Breach Check** | Compromised credential detection |
| 18 | **Auth Response Hardening** | Strip sensitive data from error responses |
| 19 | **Input Validation** | Schema validation on all inputs |
| 20 | **Image Processing** | Sanitize + optimize uploaded images |

<br/>

---

## Localization - 26 Languages

MHub ships with full translations for **26 languages** out of the box:

| | | | | |
|---|---|---|---|---|
| Arabic | Bengali | German | English | Spanish |
| French | Gujarati | Hindi | Indonesian | Italian |
| Japanese | Kannada | Korean | Malayalam | Marathi |
| Punjabi | Portuguese | Russian | Swahili | Tamil |
| Telugu | Thai | Turkish | Urdu | Vietnamese |
| Chinese | | | | |

**How it works:**
- Translations are stored as JSON in `client/public/locales/{language}/`
- Language switching is instant (cache-first rendering)
- CI gate prevents new un-translated strings from being merged
- `npm run validate:locales` checks coverage across all 26 languages

<br/>

---

## Pages and Screens (65 Total)

<details>
<summary><strong>Authentication (4 pages)</strong></summary>

| Page | Purpose |
|---|---|
| **Login** | Email/phone login with JWT |
| **SignUp** | New user registration |
| **ForgotPassword** | Password reset request |
| **ResetPassword** | Set new password via email link |

</details>

<details>
<summary><strong>Marketplace (16 pages)</strong></summary>

| Page | Purpose |
|---|---|
| **Home** | Landing page with hero, categories, deals |
| **AllPosts** | Full marketplace listing with search + filters |
| **PostDetail** | Detailed view with images, seller info, leads, boost panel, sponsored carousel |
| **ForYou** | Personalized recommendations + trending |
| **NearbyPosts** | Location-based listings |
| **Categories** | Category browser grid |
| **SearchPage** | Full search experience |
| **Cart** | Shopping cart manager |
| **Wishlist** | Saved items |
| **RecentlyViewed** | Browsing history |
| **SavedSearches** | Saved search queries with alerts |
| **Offers** | Active offers (made and received) |
| **MyRecommendations** | AI-powered suggestions |
| **BuyerView** | Buyer-specific interface |
| **PublicWall** | Community post wall |
| **AddPost / EditPost** | Listing creation + editing |

</details>

<details>
<summary><strong>Commerce and Payments (6 pages)</strong></summary>

| Page | Purpose |
|---|---|
| **TierSelection** | Pricing plans - Free / Silver / Premium |
| **PaymentPage** | UPI payment submission + status |
| **Saledone** | Seller initiates then Buyer OTP confirms then Sale complete |
| **SaleUndone** | Reverse/cancel a transaction |
| **SoldPosts** | Your sold listings history |
| **BoughtPosts** | Your purchase history |

</details>

<details>
<summary><strong>Profile and Account (8 pages)</strong></summary>

| Page | Purpose |
|---|---|
| **Profile** | View/edit profile, preferences |
| **MyHome** | Dashboard - active, sold, bought, undone posts |
| **Analytics** | Seller performance dashboard |
| **SecuritySettings** | Password, 2FA, login history |
| **AadhaarVerify** | Aadhaar number verification flow |
| **KycVerification** | Full KYC document upload + OCR |
| **GetVerified** | Seller verification landing |
| **Verification** | Verification status page |

</details>

<details>
<summary><strong>Rewards and Social (6 pages)</strong></summary>

| Page | Purpose |
|---|---|
| **Rewards** | Points balance, earning history |
| **RewardsPage** | Detailed rewards dashboard |
| **FeedPage** | Community social feed |
| **FeedPostAdd** | Create feed posts |
| **FeedPostDetail** | View feed post + comments |
| **MyFeedPage** | Your personal feed |

</details>

<details>
<summary><strong>Communication (5 pages)</strong></summary>

| Page | Purpose |
|---|---|
| **Chat** | 1:1 messaging between buyers and sellers |
| **ProtectedChat** | Auth-gated chat |
| **Notifications** | All notification history |
| **ChannelsListPage** | Browse community channels |
| **ChannelPage** | View/post in a channel |
| **CreateChannelPage** | Create new channel |

</details>

<details>
<summary><strong>Admin and Support (5 pages)</strong></summary>

| Page | Purpose |
|---|---|
| **AdminPanel** | Full moderation dashboard |
| **Dashboard** | Platform stats overview |
| **Complaints** | Complaint management |
| **Reviews** | Review moderation |
| **Support** | Help center |
| **Feedback** | User feedback form |

</details>

<details>
<summary><strong>Legal and Policies (4 pages)</strong></summary>

| Page | Purpose |
|---|---|
| **PrivacyPolicy** | Privacy policy |
| **TermsAndConditions** | Terms of service |
| **RefundPolicy** | Refund policy |
| **SupportTicketPolicy** | Ticket handling policy |

</details>

<br/>

---

## Component Library (118 Components)

### UI Primitives (45 base components)

Built on **Radix UI + TailwindCSS** for accessibility + consistency:

<details>
<summary><strong>See all 45 UI primitives</strong></summary>

`Accordion` `AlertDialog` `Alert` `AspectRatio` `Avatar` `Badge` `Breadcrumb` `Button` `Calendar` `Card` `CardContent` `CardDescription` `CardHeader` `CardTitle` `Carousel` `Checkbox` `Collapsible` `Command` `ContextMenu` `Dialog` `Drawer` `DropdownMenu` `Input` `InputOTP` `Label` `Menubar` `Pagination` `Popover` `Progress` `Select` `Separator` `Sheet` `Sidebar` `Slider` `Sonner` `Switch` `Tabs` `Textarea` `Toast` `Toaster` `Toggle` `ToggleGroup` `Tooltip` `UseToast`

</details>

### Feature Components (73 components)

| Category | Components |
|---|---|
| **Marketplace** | PostCard, PostFeed, PostActions, PostImageCarousel, PostDetailView, VirtualizedFeed, VirtualizedList, DealsCarousel, DealsSection, DealsSlider |
| **Discovery** | SearchBar, CategoriesGrid, CategoryGrid, PopularCategories, GreenCategoryCard, GreenHeroBanner, GreenProductCard, ProductCard |
| **Trust** | PostBoostPanel, SponsoredListings, TransactionStepper, StarRating, BuyerInterestModal, MakeOfferModal, BargainActions |
| **Auth** | RequireAuth, AuthEventRouter, LoginPromptModal, AadhaarOtpVerify, OtpAutoRead, PasswordStrengthIndicator |
| **Media** | ImageGallery, ImageUpload, ImageZoomModal, SmartImage, LazyImage, AudioRecorder |
| **Navigation** | PageHeader, Header, GreenNavbar, GreenFooter, AppRoutes, LocationGate, LocationSelector, ForceLocationModal |
| **Engagement** | NotificationPermission, ShareButton, ShareLinkDialog, PriceAlertButton, DarkModeToggle |
| **i18n** | LanguageSelector, LanguageSheet, LanguageSwitcher, GlobalContentTranslator |
| **System** | ErrorBoundary, ErrorState, EmptyState, GreenEmptyState, GreenSkeletonLoader, Skeleton, RouteTelemetry, ToastDemo, HeroBanner, HeroSection |

<br/>

---

## API Reference (59 Route Modules)

<details>
<summary><strong>Complete API Route Map</strong></summary>

| Module | Endpoint Prefix | Purpose |
|---|---|---|
| `auth` | `/api/auth` | Login, signup, refresh, forgot/reset password |
| `profile` | `/api/profile` | View/update user profile |
| `users` | `/api/users` | User management, tier upgrades |
| `posts` | `/api/posts` | CRUD listings, boost, sponsored, search |
| `feed` | `/api/feed` | Personalized feed with tier-priority ordering |
| `categories` | `/api/categories` | Category management |
| `cart` | `/api/cart` | Shopping cart operations |
| `wishlist` | `/api/wishlist` | Saved items management |
| `offers` | `/api/offers` | Make/accept/reject price offers |
| `sale` | `/api/sale` | Initiate/confirm/cancel verified sales |
| `saleundone` | `/api/saleundone` | Reverse completed sales |
| `transactions` | `/api/transactions` | Transaction history + pending |
| `payments` | `/api/payments` | Submit, verify, reject, webhook, reconcile |
| `tiers` | `/api/tiers` | Available plans + upgrade info |
| `rewards` | `/api/rewards` | Points, leaderboard, earnings |
| `referral` | `/api/referral` | Referral tree + chain rewards |
| `chat` | `/api/chat` | Real-time messaging |
| `channels` | `/api/channels` | Community channels |
| `notifications` | `/api/notifications` | In-app alerts |
| `pushNotifications` | `/api/push` | Web push registration + delivery |
| `reviews` | `/api/reviews` | Rating/review CRUD |
| `complaints` | `/api/complaints` | File + track complaints |
| `analytics` | `/api/analytics` | Seller + device analytics |
| `adminDashboard` | `/api/admin-dashboard` | Admin stats, moderation, bulk actions |
| `admin` | `/api/admin` | User management, system config |
| `aadhaar` | `/api/aadhaar` | Aadhaar verification |
| `twoFactor` | `/api/2fa` | TOTP setup, verify, disable |
| `nearby` | `/api/nearby` | Geolocation-based discovery |
| `recommendations` | `/api/recommendations` | AI-powered suggestions |
| `priceAlerts` | `/api/price-alerts` | Price drop notifications |
| `priceHistory` | `/api/price-history` | Historical price tracking |
| `savedSearches` | `/api/saved-searches` | Persistent search queries |
| `recentlyViewed` | `/api/recently-viewed` | Browsing history |
| `feedback` | `/api/feedback` | User feedback submission |
| `inquiries` | `/api/inquiries` | Buyer interest/inquiry tracking |
| `publicWall` | `/api/public-wall` | Community wall posts |
| `feeds` | `/api/feeds` | Social feed CRUD |
| `brands` | `/api/brands` | Brand management |
| `products` | `/api/products` | Product catalog |
| `contacts` | `/api/contacts` | Contact management |
| `audit` | `/api/audit` | Audit log access |
| `loginAudit` | `/api/login-audit` | Login history |
| `locationRoutes` | `/api/location` | Location services |
| `locationVerification` | `/api/location-verify` | Location fraud detection |
| `translation` | `/api/translation` | Runtime translation |
| `telemetry` | `/api/telemetry` | Client-side telemetry |
| `gdpr` | `/api/gdpr` | Data export/deletion (GDPR) |
| `securityOperations` | `/api/security` | Security ops endpoints |
| `reliability` | `/api/reliability` | Health, readiness, probes |
| `deviceLifecycle` | `/api/device-lifecycle` | Device registration + tracking |
| `dashboard` | `/api/dashboard` | General dashboard data |
| `dailycode` | `/api/daily-code` | Daily verification codes |
| `automation` | `/api/automation` | Automated workflows |
| `fleetOrchestration` | `/api/fleet` | Multi-instance coordination |
| `intelligenceFinops` | `/api/finops` | Operational intelligence |
| `launchGovernance` | `/api/launch` | Feature launch gates |
| `operatorPlatform` | `/api/operator` | Operator controls |

</details>

<br/>

---

## Real-Time Features

```
+-------------------------------------------+
|  Client                                    |
|                                            |
|  Socket.io  <-------->  Express Server     |
|  - Chat messages        - socketService    |
|  - Notifications        - channelService   |
|  - Reward updates       - pushService      |
|  - Sale confirmations   - fcm.js           |
|                                            |
|  Pusher     <-------->  Pusher Service     |
|  - Channel events       - pusher.js        |
|  - Scalable push                           |
|                                            |
|  Web Push   <-------->  VAPID Keys         |
|  - Background alerts    - pushService.js   |
|  - Works when app closed                   |
+-------------------------------------------+
```

<br/>

---

## Rewards and Referral Engine

### How Rewards Work

| Action | Points | How |
|---|---|---|
| Complete a sale (seller) | Variable | transactionRewardService.js calculates based on amount |
| Confirm a purchase (buyer) | Variable | Bonus for first purchase |
| Refer a friend | 50 pts | When referral completes first transaction |
| Daily streak | Bonus | streakRewardsService.js tracks consecutive activity |
| Weekly leaderboard | Prizes | leaderboardRewardsService.js awards top sellers/buyers |

### Referral Chain

MHub supports **multi-depth referral trees**:

```
You -> Friend (Level 1: 50 pts) -> Their Friend (Level 2: 25 pts) -> ...
```

The referralChainRewards.js service traverses the referral hierarchy and distributes rewards up the chain. All mutations are **ledger-backed** via rewardsLedgerService.js - every point is auditable.

<br/>

---

## Discovery and Search

| Feature | Implementation | File |
|---|---|---|
| **For You Feed** | Personalized recommendations, trending, categories | ForYou.jsx + feedController.js |
| **Guaranteed Reach** | Fair-feed algorithm ensuring all posts get minimum visibility | postGuaranteedReachController.js |
| **Nearby** | Location-based with configurable radius | nearby.js + locationController.js |
| **Saved Searches** | Persistent search queries with price alerts | savedSearchesController.js |
| **Price Alerts** | Notification when saved item drops in price | priceAlertsController.js |
| **Price History** | Track listing price changes over time | priceHistoryController.js |
| **Recently Viewed** | Cross-session browsing history | recentlyViewedController.js |

<br/>

---

## Commerce and Transaction Flow

```
                    THE MHUB SALE LIFECYCLE

  Seller                                          Buyer
    |                                               |
    |  1. Lists item (post)                         |
    |---------------------------------------------->|
    |                                               |
    |  2. Buyer clicks Interested or Make Offer     |
    |<----------------------------------------------|
    |                                               |
    |  3. They agree on price (chat/offer system)   |
    |<--------------------------------------------->|
    |                                               |
    |  4. Seller goes to the Sale Done page         |
    |     Enters: Post ID, Buyer ID, Amount         |
    |     System creates Transaction + OTP          |
    |                                               |
    |  5. Seller shares OTP with Buyer              |
    |---------------------------------------------->|
    |                                               |
    |  6. Buyer enters Transaction ID + OTP         |
    |     System verifies and Sale is CONFIRMED     |
    |                                               |
    |  7. Post moves to Sold                        |
    |     Both get reward points                    |
    |     Referral chain rewards distributed         |
    +-----------------------------------------------+
```

<br/>

---

## Admin and Moderation Dashboard

| Feature | What It Does |
|---|---|
| **Platform Stats** | Total users, posts, signups today, flagged content counts |
| **Flagged Users** | View users with complaints, flag count, status, bulk actions |
| **Flagged Posts** | Filter/search flagged listings, approve/remove/reflag/archive in bulk |
| **KYC Queue** | Review pending verification documents, approve/reject with notes |
| **Payment Verification** | View pending payments, verify/reject with admin notes |
| **Payment Stats** | Revenue by period, plan breakdown, pending/verified/rejected counts |
| **CSV Export** | Export flagged posts to CSV for offline review |
| **Audit Trail** | Every moderation action logged with actor, timestamp, IP, user-agent |

<br/>

---

## Seller Analytics

```
+-----------------------------------------------------+
|  Seller Dashboard                                    |
|                                                      |
|  Overview                                            |
|  |-- Total Posts: 24    Active: 18    Sold: 6        |
|  |-- Total Views: 3,847                              |
|  |-- Total Inquiries: 156   Offers: 42               |
|  |-- Conversion Rate: 26.9%                          |
|  |-- Total Revenue: 1,23,500 INR                     |
|  +-- Avg Rating: 4.6 stars (32 reviews)              |
|                                                      |
|  Post Performance (Top 20)                           |
|  |-- iPhone 14 Pro - 847 views, 23 inquiries         |
|  |-- Royal Enfield - 612 views, 18 inquiries         |
|  +-- ...                                             |
|                                                      |
|  Category Breakdown                                  |
|  |-- Electronics: 12 posts, 2,100 views, 4 sold     |
|  |-- Vehicles: 5 posts, 980 views, 2 sold            |
|  +-- ...                                             |
+-----------------------------------------------------+
```

<br/>

---

## Testing Strategy

| Layer | Tool | Scope | Command |
|---|---|---|---|
| **Frontend Unit** | Vitest | Components, hooks, utilities | `npm --prefix client run test` |
| **Frontend E2E** | Playwright | Top 10 user journeys | `npm --prefix client run test:e2e:smoke` |
| **Backend Integration** | Jest | Controllers, services, auth flows | `npm --prefix server run test` |
| **API Contracts** | Custom scripts | Route schema + response validation | `npm run check:proactive-workflow-contract` |
| **Bundle Budget** | Custom | Vite build size enforcement | `npm --prefix client run check:bundle-budget` |
| **Network Contract** | Custom | API call pattern validation | `npm --prefix client run check:network-contract` |
| **Locale Coverage** | Custom | Translation completeness | `npm run validate:locales` |
| **Security Scan** | Custom | No leaked secrets/credentials | `npm run check:no-secrets` |

<br/>

---

## Deployment and CI/CD

### Pipeline

```
Commit -> Lint -> Tests -> Build -> Contract Checks -> Ops Gate -> Deploy
                                                         |
                                          +--------------+---------------+
                                          |  Readiness Checks:           |
                                          |  - DB migration status       |
                                          |  - /api/ready probe          |
                                          |  - Cache health              |
                                          |  - SSL + CORS config         |
                                          |  - No leaked secrets         |
                                          |  - Bundle budget pass        |
                                          +------------------------------+
```

### Production Checklist

- [x] Run all migrations before API boot
- [x] Validate readiness with /api/health and /api/ready
- [x] Verify cache + queue health
- [x] Ensure SSL + CORS configuration
- [x] Run `npm run release:gate` for full pre-flight

<br/>

---

## Performance

### Targets

| Metric | Target | How |
|---|---|---|
| **LCP** | < 2.5s | Vite code-splitting, lazy routes, optimized images |
| **TTI** | < 3.0s | Tree-shaking, minimal main bundle |
| **API Read p95** | under 220ms | Redis caching, indexed queries, runtime budgets |
| **API Write p95** | under 350ms | Optimized transactions, connection pooling |

### Built-in Optimizations

- **VirtualizedFeed** - renders only visible items in long lists
- **LazyImage** - intersection observer for image lazy loading
- **Redis cache** with in-memory fallback when Redis is unavailable
- **PostViewBuffer** - batches view count updates to reduce DB writes
- **Runtime budget middleware** - auto-kills queries exceeding p95 latency

<br/>

---

## Database - 33 Migrations

<details>
<summary><strong>See complete migration history</strong></summary>

| Migration | Purpose |
|---|---|
| `defender_schema.sql` | Core tables: users, posts, categories, notifications |
| `defender_payment_tables.sql` | Payments + user_subscriptions tables |
| `add_tier_enforcement.sql` | Tier, subscription_expiry, post_credits columns |
| `add_post_boosts.sql` | Post boost system: post_boosts table + boost_level |
| `add_rewards_referral_hierarchy.sql` | Rewards ledger + referral tree tables |
| `add_kyc_fields.sql` | Aadhaar + PAN KYC columns |
| `add_kyc_review_queue.sql` | KYC review queue for admin |
| `add_offers_and_flash_sales.sql` | Offers + flash sale tables |
| `add_device_analytics.sql` | Device tracking table |
| `add_login_history.sql` | Login history for security |
| `add_lockout_columns.sql` | Account lockout fields |
| `add_complaint_sla_and_evidence.sql` | SLA tracking for complaints |
| `add_review_moderation_controls.sql` | Review moderation flags |
| `add_admin_moderation_contract.sql` | Admin action audit tables |
| `add_user_streaks.sql` | Streak tracking for rewards |
| `add_risk_decision_events.sql` | Fraud risk event log |
| `add_otp_delivery_tracking.sql` | OTP delivery audit trail |
| `add_location_verification_tables.sql` | Location verification data |
| `performance_indexes.sql` | Database performance indexes |
| `performance_optimization_2025.sql` | Advanced query optimization |
| `add_query_path_indexes_20260227.sql` | Critical query path indexes |
| `production_hardening.sql` | Production-ready constraints |
| `zero_trust_hardening.sql` | Security hardening |
| `migration_security.sql` | Migration integrity checks |
| `flipkart_auth_migration.sql` | Auth system migration |
| `schema_remediation.sql` | Schema cleanup |
| `backfill_active_post_expiry.sql` | Backfill visibility expiry |
| `backfill_missing_profiles.sql` | Profile data backfill |
| `fix_user_sessions_user_id_type.sql` | Session table fix |
| `uuid_final_fix.sql` | UUID type consistency |
| `update_users_location_schema.sql` | Location schema update |
| `login_history_setup.sql` | Login tracking setup |
| `create_test_user.sql` | Development test user |

</details>

### Entity Relationship

```
users --< posts --< transactions --< rewards
  |         |            |              |
  |         |-- reviews  +-- complaints |
  |         |-- offers                  |
  |         |-- post_boosts             |
  |         +-- buyer_inquiries         |
  |-- referrals --< rewards             |
  |-- payments --< user_subscriptions   |
  |-- notifications                     |
  |-- kyc_review_queue                  |
  |-- device_analytics                  |
  +-- login_history                     |
```

<br/>

---

## Background Jobs (10 Cron Jobs)

| Job | Schedule | What It Does |
|---|---|---|
| **Post Expiry** | Daily 00:00 IST | Expire listings based on tier visibility days |
| **Expiry Warnings** | Daily 09:00 IST | Notify sellers about expiring posts |
| **Subscription Check** | Daily 10:00 IST | Warn users about expiring subscriptions |
| **Transaction Expiry** | Hourly | Release stale pending transactions |
| **Payment Reconciliation** | Every 2 hours | Flag mismatched or stale payments |
| **Offer Expiry** | Hourly | Expire old flash deals |
| **Daily Digest** | Daily 09:30 IST | Aggregate notification summary email |
| **Fraud Batch Review** | Every 6 hours | Detect suspicious login/payment patterns |
| **Auto-Close Complaints** | Daily 02:00 IST | Resolve stale, unresponded complaints |
| **Leaderboard Rewards** | Monday 00:10 IST | Award weekly top seller/buyer rewards |

<br/>

---

## Roadmap

| Priority | Item | Status |
|---|---|---|
| P0 | Post credit enforcement for free-tier limits | Planned |
| P0 | Boost payment integration (Razorpay/UPI flow) | Planned |
| P0 | Subscription auto-expiry cron job | Planned |
| P1 | Premium auto-featured rotation | Planned |
| P1 | Free monthly boosts for Premium tier | Planned |
| P1 | Trial start endpoint + UI flow | Planned |
| P1 | Contextual upsell banners | Planned |
| P1 | Rewards dashboard UI page | Planned |
| P2 | Security hardening (rate-limits, CSP, security lint CI) | Planned |
| P2 | E2E test expansion (beyond top-10 journeys) | Planned |
| P2 | Advanced seller growth analytics | Planned |
| P3 | ML-assisted fraud scoring pipeline | Future |
| P3 | Multi-region active-active deployment | Blocked (infra) |

<br/>

---

## Codebase Stats

```
+------------------------------------------+
|  MHub Codebase - By the Numbers           |
|                                           |
|  Total Lines of Code:  ~120,000           |
|  Source Files:          827               |
|                                           |
|  .js files:    513 files   54,015 lines   |
|  .jsx files:   208 files   54,631 lines   |
|  .sql files:    45 files    4,757 lines   |
|  .css files:     9 files    1,136 lines   |
|  .md files:     49 files    5,057 lines   |
|  .html files:    2 files      132 lines   |
|  .ts files:      1 file       79 lines    |
|                                           |
|  Client Pages:         65                |
|  Server Routes:        59                |
|  Controllers:          42                |
|  Services:             52                |
|  Components:          118                |
|  Middleware:            31                |
|  DB Migrations:        33                |
|  Languages:            26                |
|  Workspace Scripts:    56                |
+------------------------------------------+
```

<br/>

---

## Environment Configuration

<details>
<summary><strong>Core environment variables</strong></summary>

| Variable | Purpose |
|---|---|
| `PORT` | API listening port (default: 5001) |
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET`, `REFRESH_SECRET` | Auth token signing keys |
| `CLIENT_URL` | CORS origin allowlist |
| `VITE_API_BASE_URL` | Client API origin |
| `VITE_SOCKET_URL` | Real-time socket origin |
| `VITE_PUSHER_KEY`, `VITE_PUSHER_CLUSTER` | Pusher real-time |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Media CDN |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` | Web push |
| `REDIS_URL` | Redis cache (optional) |
| `UPI_ID`, `MERCHANT_NAME` | UPI payment config |
| `PAYMENT_WEBHOOK_SECRET` | Razorpay/Stripe webhook verification |
| `CAPTCHA_SECRET_KEY` | reCAPTCHA verification |

</details>

<br/>

---

## License

This project is licensed under the **ISC License**.

---

## Acknowledgments

- **React**, **Vite**, **Express**, **PostgreSQL** communities
- **Radix UI** + **TailwindCSS** for the design system foundation
- **Lucide Icons** for beautiful, tree-shakeable iconography
- Open-source maintainers who make platforms like this possible

---

<div align="center">

<br/>

**Built with love for the Indian marketplace ecosystem**

*MHub - Trust-First Commerce, Verified by Design*

<br/>

<img src="https://img.shields.io/badge/Made_in-India-FF9933?style=for-the-badge&labelColor=138808" alt="Made in India" />

</div>

<br/>

---

## Deployment and CI/CD

### Pipeline

```
Commit -> Lint -> Tests -> Build -> Contract Checks -> Ops Gate -> Deploy
                                                         |
                                          +--------------+---------------+
                                          |  Readiness Checks:           |
                                          |  - DB migration status       |
                                          |  - /api/ready probe          |
                                          |  - Cache health              |
                                          |  - SSL + CORS config         |
                                          |  - No leaked secrets         |
                                          |  - Bundle budget pass        |
                                          +------------------------------+
```

### Production Checklist

- [x] Run all migrations before API boot
- [x] Validate readiness with /api/health and /api/ready
- [x] Verify cache + queue health
- [x] Ensure SSL + CORS configuration
- [x] Run `npm run release:gate` for full pre-flight

<br/>

---

## Performance

### Targets

| Metric | Target | How |
|---|---|---|
| **LCP** | < 2.5s | Vite code-splitting, lazy routes, optimized images |
| **TTI** | < 3.0s | Tree-shaking, minimal main bundle |
| **API Read p95** | under 220ms | Redis caching, indexed queries, runtime budgets |
| **API Write p95** | under 350ms | Optimized transactions, connection pooling |

### Built-in Optimizations

- **VirtualizedFeed** - renders only visible items in long lists
- **LazyImage** - intersection observer for image lazy loading
- **Redis cache** with in-memory fallback when Redis is unavailable
- **PostViewBuffer** - batches view count updates to reduce DB writes
- **Runtime budget middleware** - auto-kills queries exceeding p95 latency

<br/>

---

## Database - 33 Migrations

<details>
<summary><strong>See complete migration history</strong></summary>

| Migration | Purpose |
|---|---|
| `defender_schema.sql` | Core tables: users, posts, categories, notifications |
| `defender_payment_tables.sql` | Payments + user_subscriptions tables |
| `add_tier_enforcement.sql` | Tier, subscription_expiry, post_credits columns |
| `add_post_boosts.sql` | Post boost system: post_boosts table + boost_level |
| `add_rewards_referral_hierarchy.sql` | Rewards ledger + referral tree tables |
| `add_kyc_fields.sql` | Aadhaar + PAN KYC columns |
| `add_kyc_review_queue.sql` | KYC review queue for admin |
| `add_offers_and_flash_sales.sql` | Offers + flash sale tables |
| `add_device_analytics.sql` | Device tracking table |
| `add_login_history.sql` | Login history for security |
| `add_lockout_columns.sql` | Account lockout fields |
| `add_complaint_sla_and_evidence.sql` | SLA tracking for complaints |
| `add_review_moderation_controls.sql` | Review moderation flags |
| `add_admin_moderation_contract.sql` | Admin action audit tables |
| `add_user_streaks.sql` | Streak tracking for rewards |
| `add_risk_decision_events.sql` | Fraud risk event log |
| `add_otp_delivery_tracking.sql` | OTP delivery audit trail |
| `add_location_verification_tables.sql` | Location verification data |
| `performance_indexes.sql` | Database performance indexes |
| `performance_optimization_2025.sql` | Advanced query optimization |
| `add_query_path_indexes_20260227.sql` | Critical query path indexes |
| `production_hardening.sql` | Production-ready constraints |
| `zero_trust_hardening.sql` | Security hardening |
| `migration_security.sql` | Migration integrity checks |
| `flipkart_auth_migration.sql` | Auth system migration |
| `schema_remediation.sql` | Schema cleanup |
| `backfill_active_post_expiry.sql` | Backfill visibility expiry |
| `backfill_missing_profiles.sql` | Profile data backfill |
| `fix_user_sessions_user_id_type.sql` | Session table fix |
| `uuid_final_fix.sql` | UUID type consistency |
| `update_users_location_schema.sql` | Location schema update |
| `login_history_setup.sql` | Login tracking setup |
| `create_test_user.sql` | Development test user |

</details>

### Entity Relationship

```
users --< posts --< transactions --< rewards
  |         |            |              |
  |         |-- reviews  +-- complaints |
  |         |-- offers                  |
  |         |-- post_boosts             |
  |         +-- buyer_inquiries         |
  |-- referrals --< rewards             |
  |-- payments --< user_subscriptions   |
  |-- notifications                     |
  |-- kyc_review_queue                  |
  |-- device_analytics                  |
  +-- login_history                     |
```

<br/>

---

## Background Jobs (10 Cron Jobs)

| Job | Schedule | What It Does |
|---|---|---|
| **Post Expiry** | Daily 00:00 IST | Expire listings based on tier visibility days |
| **Expiry Warnings** | Daily 09:00 IST | Notify sellers about expiring posts |
| **Subscription Check** | Daily 10:00 IST | Warn users about expiring subscriptions |
| **Transaction Expiry** | Hourly | Release stale pending transactions |
| **Payment Reconciliation** | Every 2 hours | Flag mismatched or stale payments |
| **Offer Expiry** | Hourly | Expire old flash deals |
| **Daily Digest** | Daily 09:30 IST | Aggregate notification summary email |
| **Fraud Batch Review** | Every 6 hours | Detect suspicious login/payment patterns |
| **Auto-Close Complaints** | Daily 02:00 IST | Resolve stale, unresponded complaints |
| **Leaderboard Rewards** | Monday 00:10 IST | Award weekly top seller/buyer rewards |

<br/>

---

## Roadmap

| Priority | Item | Status |
|---|---|---|
| P0 | Post credit enforcement for free-tier limits | Planned |
| P0 | Boost payment integration (Razorpay/UPI flow) | Planned |
| P0 | Subscription auto-expiry cron job | Planned |
| P1 | Premium auto-featured rotation | Planned |
| P1 | Free monthly boosts for Premium tier | Planned |
| P1 | Trial start endpoint + UI flow | Planned |
| P1 | Contextual upsell banners | Planned |
| P1 | Rewards dashboard UI page | Planned |
| P2 | Security hardening (rate-limits, CSP, security lint CI) | Planned |
| P2 | E2E test expansion (beyond top-10 journeys) | Planned |
| P2 | Advanced seller growth analytics | Planned |
| P3 | ML-assisted fraud scoring pipeline | Future |
| P3 | Multi-region active-active deployment | Blocked (infra) |

<br/>

---

## Codebase Stats

```
+------------------------------------------+
|  MHub Codebase - By the Numbers           |
|                                           |
|  Total Lines of Code:  ~120,000           |
|  Source Files:          827               |
|                                           |
|  .js files:    513 files   54,015 lines   |
|  .jsx files:   208 files   54,631 lines   |
|  .sql files:    45 files    4,757 lines   |
|  .css files:     9 files    1,136 lines   |
|  .md files:     49 files    5,057 lines   |
|  .html files:    2 files      132 lines   |
|  .ts files:      1 file       79 lines    |
|                                           |
|  Client Pages:         65                |
|  Server Routes:        59                |
|  Controllers:          42                |
|  Services:             52                |
|  Components:          118                |
|  Middleware:            31                |
|  DB Migrations:        33                |
|  Languages:            26                |
|  Workspace Scripts:    56                |
+------------------------------------------+
```

<br/>

---

## Environment Configuration

<details>
<summary><strong>Core environment variables</strong></summary>

| Variable | Purpose |
|---|---|
| `PORT` | API listening port (default: 5001) |
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET`, `REFRESH_SECRET` | Auth token signing keys |
| `CLIENT_URL` | CORS origin allowlist |
| `VITE_API_BASE_URL` | Client API origin |
| `VITE_SOCKET_URL` | Real-time socket origin |
| `VITE_PUSHER_KEY`, `VITE_PUSHER_CLUSTER` | Pusher real-time |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Media CDN |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` | Web push |
| `REDIS_URL` | Redis cache (optional) |
| `UPI_ID`, `MERCHANT_NAME` | UPI payment config |
| `PAYMENT_WEBHOOK_SECRET` | Razorpay/Stripe webhook verification |
| `CAPTCHA_SECRET_KEY` | reCAPTCHA verification |

</details>

<br/>

---

## License

This project is licensed under the **ISC License**.

---

## Acknowledgments

- **React**, **Vite**, **Express**, **PostgreSQL** communities
- **Radix UI** + **TailwindCSS** for the design system foundation
- **Lucide Icons** for beautiful, tree-shakeable iconography
- Open-source maintainers who make platforms like this possible

---

<div align="center">

<br/>

**Built with love for the Indian marketplace ecosystem**

*MHub - Trust-First Commerce, Verified by Design*

<br/>

<img src="https://img.shields.io/badge/Made_in-India-FF9933?style=for-the-badge&labelColor=138808" alt="Made in India" />

</div>

## Environment Configuration

<details>
<summary><strong>Core environment variables</strong></summary>

| Variable | Purpose |
|---|---|
| `PORT` | API listening port (default: 5001) |
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET`, `REFRESH_SECRET` | Auth token signing keys |
| `CLIENT_URL` | CORS origin allowlist |
| `VITE_API_BASE_URL` | Client API origin |
| `VITE_SOCKET_URL` | Real-time socket origin |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Media CDN |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` | Web push |
| `REDIS_URL` | Redis cache (optional) |
| `UPI_ID`, `MERCHANT_NAME` | UPI payment config |
| `PAYMENT_WEBHOOK_SECRET` | Razorpay/Stripe webhook verification |
| `CAPTCHA_SECRET_KEY` | reCAPTCHA verification |

</details>

<br/>

---

## License

This project is licensed under the **ISC License**.

---

## Acknowledgments

- **React**, **Vite**, **Express**, **PostgreSQL** communities
- **Radix UI** + **TailwindCSS** for the design system foundation
- **Lucide Icons** for beautiful, tree-shakeable iconography
- Open-source maintainers who make platforms like this possible

---

<div align="center">

<br/>

**Built with love for the Indian marketplace ecosystem**

*MHub - Trust-First Commerce, Verified by Design*

<br/>

<img src="https://img.shields.io/badge/Made_in-India-FF9933?style=for-the-badge&labelColor=138808" alt="Made in India" />

</div>
