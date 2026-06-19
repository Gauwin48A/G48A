# MHUB Marketplace — Master Product Specification & Implementation Blueprint
## Version 1.0 — Zero-Infra, Billion-Dollar Architecture

---

> **Document Type:** Master Product Requirements & Technical Specification
> **Target Audience:** Development Team, AI Agents, Product Managers
> **Status:** Final v1.0
> **Date:** June 2026

---

# PART I: EXECUTIVE SUMMARY

## 1.1 Product Vision

MHUB is a full-featured, peer-to-peer marketplace platform connecting buyers and sellers within localized communities. It is designed to be the **default marketplace for every Indian city and village**, operating with **zero infrastructure cost at launch** while scaling to serve millions of users through a carefully architected, cloud-agnostic platform.

### Core Differentiators

| Feature | Why It Wins |
|---------|------------|
| **Zero-infra architecture** | Static-first, serverless, edge-optimized — runs on free tiers |
| **Local-first, India-optimized** | Multi-language support (Hindi, Telugu, Tamil, etc.), UPI payments, local categories |
| **Trust-first marketplace** | Aadhaar/PAN-based verification, seller reputation, fraud prevention |
| **Full PWA** | Works offline, installable on mobile, 60fps performance |
| **AI-native** | Translation, recommendations, fraud detection built-in |

## 1.2 Success Metrics (KRs)

| Metric | Target |
|--------|--------|
| Time to first listing | < 2 minutes |
| Page load (LCP) | < 1.5s on 3G |
| JS bundle size | < 150KB initial |
| Offline support | Full catalog browsing |
| Language coverage | 12 Indian languages at launch |
| Seller verification time | < 24 hours |
| Transaction success rate | > 99.9% |

---

# PART II: SYSTEM ARCHITECTURE

## 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLOUDFLARE CDN                        │
│              (DDoS Protection, Caching, SSL)             │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              STATIC HOSTING (Netlify/Vercel)             │
│              ┌──────────────────────────────┐            │
│              │  Next.js App (React 19)      │            │
│              │  • PWA Service Worker        │            │
│              │  • ISR for listing pages     │            │
│              │  • Client-side routing       │            │
│              └──────────────┬───────────────┘            │
└─────────────────────────────┼───────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────┐
│                    EDGE FUNCTIONS                         │
│     Cloudflare Workers + Vercel Edge Functions           │
│     • Authentication middleware                          │
│     • Request validation                                 │
│     • Rate limiting                                      │
│     • Image optimization redirects                       │
└─────────────────────────────┬───────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────┐
│                    SUPABASE BACKEND                       │
│     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│     │ PostgreSQL    │  │ Row Level    │  │ Realtime     ││
│     │ (Database)    │  │ Security     │  │ (WebSocket)  ││
│     └──────────────┘  └──────────────┘  └──────────────┘│
│     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐│
│     │ Auth         │  │ Storage      │  │ Edge Functions││
│     │ (GoTrue)     │  │ (S3-compat)  │  │ (Deno)       ││
│     └──────────────┘  └──────────────┘  └──────────────┘│
└─────────────────────────────────────────────────────────┘
```

## 2.2 Technology Stack

| Layer | Technology | Free Tier | Why |
|-------|-----------|-----------|-----|
| **Frontend** | React 19 + Next.js 18 | — | Best DX, SSR/ISR, RSC support |
| **State (Server)** | TanStack Query v5 | — | Stale-while-revalidate, caching |
| **State (UI)** | Zustand | — | Minimal boilerplate, TypeScript-first |
| **Styling** | Tailwind CSS v4 + shadcn/ui | — | Utility-first, dark mode, accessible |
| **Form Validation** | Zod | — | Runtime type safety, shared client/server |
| **i18n** | i18next + react-i18next | — | 12+ languages, lazy loading |
| **Virtualization** | @tanstack/react-virtual | — | Infinite lists at 60fps |
| **Animations** | Framer Motion | — | Declarative, performant |
| **Hosting** | Netlify (Free Tier) | 100GB bandwidth, 300 build mins | Commercial-use friendly |
| **CDN** | Cloudflare (Free Tier) | Unlimited bandwidth, DDoS | Global edge network |
| **Database** | Supabase (Free Tier) | 500MB DB, 5GB storage, 50k users | Postgres, RLS, Realtime |
| **Auth** | Supabase Auth (Free) | 50k active users | GoTrue, OAuth, SSO |
| **Storage** | Supabase Storage (Free) | 5GB, 50k downloads | S3-compatible, CDN-backed |
| **Edge Functions** | Cloudflare Workers (Free) | 100k requests/day | Auth middleware, validation |
| **Search** | Typesense (Self-hosted or Cloud Free) | Open source | 50ms search, typo-tolerant |
| **Email** | Resend (Free Tier) | 100 emails/day | React Email templates |
| **Analytics** | Umami (Self-hosted) | Unlimited | GDPR-compliant, lightweight |
| **Error Tracking** | Sentry (Free Tier) | 5k events/month | Breadcrumbs, source maps |
| **Monitoring** | Grafana + Prometheus (Self-hosted) | Unlimited | Metrics, dashboards, alerts |
| **Images** | Sharp (self-hosted) + Cloudinary (Free) | 25GB CDN, transformations | AVIF, WebP, responsive |
| **Payments** | Razorpay (India) | 0% setup, per-transaction | UPI, cards, netbanking, wallets |
| **Real-time** | Supabase Realtime (Free) | Included in DB tier | Broadcast, presence, Postgres changes |

## 2.3 Zero-Cost Infrastructure Strategy

```
┌──────────────────────────────────────────────────────────┐
│              MONTHLY FREE TIER ALLOCATION                 │
├──────────────────────────────────────────────────────────┤
│ Netlify (Hosting):          $0 — 100GB BW, 300 builds    │
│ Cloudflare (CDN):           $0 — Unlimited BW, DDoS      │
│ Supabase (DB + Auth):       $0 — 500MB, 50k users       │
│ Resend (Email):              $0 — 100 emails/day          │
│ Sentry (Errors):             $0 — 5k events/month         │
│ Umami (Analytics):           $0 — Self-hosted on Railway │
│ Typesense (Search):          $0 — Self-hosted on Railway │
│ Cloudinary (Images):         $0 — 25GB CDN bandwidth      │
│ Grafana/Prometheus:          $0 — Self-hosted             │
├──────────────────────────────────────────────────────────┤
│ TOTAL:                      $0/month                      │
│ SCALING LIMIT:              ~10k MAU before upgrade       │
└──────────────────────────────────────────────────────────┘
```

---

# PART III: UI/UX DESIGN SYSTEM

## 3.1 Design Principles

1. **Mobile-first, everywhere** — India's primary internet access is via smartphone
2. **Under 3 taps to buy** — Every action should be reachable in 3 taps or fewer
3. **Language-agnostic** — UI must work identically in all 12 supported languages
4. **Offline-resilient** — Core browsing should work on 2G/spotty connections
5. **Trust signals everywhere** — Verification badges, seller ratings, transaction history

## 3.2 Design Tokens (Tailwind Config)

```javascript
// theme.js — Core design tokens
colors: {
  brand: {
    50: '#f0fdf4',   // Lightest — backgrounds
    100: '#dcfce7',  // Light — surfaces
    500: '#22c55e',  // Primary — CTAs, links
    600: '#16a34a',  // Darker — hover states
    700: '#15803d',  // Darkest — active states
    900: '#14532d',  // Text on brand
  },
  surface: {
    DEFAULT: '#ffffff',
    muted: '#f8fafc',
    dark: '#0f172a',
    'dark-muted': '#1e293b',
  },
  trust: {
    verified: '#3b82f6',
    premium: '#f59e0b',
    featured: '#ef4444',
    bronze: '#cd7f32',
    silver: '#c0c0c0',
    gold: '#ffd700',
  },
  feedback: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  }
}

spacing: {
  // 4px base unit
  'touch': '44px',  // Minimum touch target
}

typography: {
  fonts: {
    sans: ['Inter', 'Noto Sans Devanagari', 'system-ui'],
    display: ['Cal Sans', 'Inter Display', 'system-ui'],
  },
  sizes: {
    'body': '16px',      // Minimum readable size
    'body-small': '14px', // Secondary text
    'caption': '12px',    // Metadata
  }
}
```

## 3.3 Component Architecture

```
components/
├── ui/                          # Atomic design system
│   ├── button/                  # Variants: primary, secondary, ghost, danger
│   ├── card/                    # Base card, interactive card, product card
│   ├── input/                   # Text input, search, select, textarea
│   ├── badge/                   # Status, trust, premium, featured badges
│   ├── avatar/                  # User avatar, fallback initials
│   ├── dialog/                  # Modal, alert dialog, confirm dialog
│   ├── dropdown-menu/           # Context menus, action menus
│   ├── sheet/                   # Bottom sheet, side panel
│   ├── toast/                   # Toast notifications, snackbar
│   ├── skeleton/                # Loading skeletons
│   ├── tabs/                    # Tab navigation
│   └── tooltip/                 # Hover tooltips
│
├── layout/                      # Layout components
│   ├── app-shell/               # Main app wrapper, nav, footer
│   ├── bottom-nav/              # Mobile bottom navigation
│   ├── top-nav/                 # Desktop top navigation
│   ├── sidebar/                 # Desktop sidebar
│   └── page-shell/              # Page-level layout wrapper
│
├── product/                     # Product-related components
│   ├── product-card/            # List card with image, price, location
│   ├── product-grid/            # Virtualized grid using @tanstack/react-virtual
│   ├── product-detail/          # Full product view with gallery
│   ├── product-gallery/         # Image carousel, zoom, share
│   ├── compare-panel/           # Side-by-side comparison
│   └── seller-card/             # Seller profile card
│
├── feed/                        # Feed components
│   ├── feed-post/               # Feed post card
│   ├── feed-create/             # Create feed post form
│   └── feed-actions/            # Like, share, save, report actions
│
├── search/                      # Search and filter
│   ├── search-bar/              # Search input with autocomplete
│   ├── filter-panel/            # Advanced filter drawer
│   ├── filter-chips/            # Active filter chips
│   ├── sort-selector/           # Sort dropdown
│   └── category-browser/        # Category and subcategory tree
│
├── centre/                      # Centre pages (stores)
│   ├── centre-hero/             # Cover image, avatar, stats
│   ├── centre-listings/         # Paginated listing grid
│   └── centre-branding/         # Logo, banner, colors
│
├── auth/                        # Authentication
│   ├── login-form/              # Email/phone login
│   ├── signup-form/             # Registration with phone
│   ├── otp-verify/              # OTP verification screen
│   ├── forgot-password/         # Password reset flow
│   └── profile-completion/      # Onboarding flow
│
├── compare/                     # Comparison
│   ├── compare-bar/             # Floating comparison bar
│   └── compare-table/           # Spec comparison table
│
└── shared/                      # Shared utilities
    ├── theme-toggle/            # Dark/light mode switch
    ├── language-switcher/       # Language selector
    ├── density-toggle/          # Compact/comfortable view
    └── scroll-restore/          # Scroll position restoration
```

## 3.4 Page Structure (Sitemap)

| Route | Page | Auth | Notes |
|-------|------|------|-------|
| `/` | Landing/Home | No | Featured listings, categories, CTA |
| `/all-posts` | All Listings | No | Full search, filter, sort |
| `/post/[id]` | Post Detail | No | Full product view with CTAs |
| `/feed` | Community Feed | No | Text posts, updates, news |
| `/feed/[id]` | Feed Post Detail | No | Single feed post view |
| `/my-feed` | My Feed | Yes | User's own feed posts |
| `/centre/[id]` | Centre Page | No | Store/seller page |
| `/centre/create` | Create Centre | Premium | Store creation wizard |
| `/compare` | Compare | No | Side-by-side products |
| `/search` | Search | No | Full-text search with filters |
| `/cart` | Cart | Yes | Shopping cart |
| `/wishlist` | Saved | Yes | Saved/wishlisted posts |
| `/add-post` | Create Post | Yes | New product listing |
| `/profile` | Profile | Yes | User profile dashboard |
| `/settings` | Settings | Yes | App settings |
| `/tier-selection` | Plans | No | Premium plan selection |
| `/kyc` | KYC | Yes | Identity verification |
| `/complaints` | Complaints | Yes | Report issues |
| `/chat` | Messages | Yes | Real-time chat |
| `/notifications` | Notifications | Yes | Activity feed |
| `/bought` | Bought Items | Yes | Purchase history |
| `/sold` | Sold Items | Yes | Sales history |
| `/for-you` | For You | No | Personalized feed |

---

# PART IV: SECURITY ARCHITECTURE

## 4.1 Authentication System

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│  Edge    │────▶│ Supabase │
│  Device  │     │  Auth    │     │  Auth    │
└──────────┘     └──────────┘     └──────────┘
     │                │                │
     │ Phone/Email    │ JWT Verify     │ PKCE Flow
     │ + OTP          │ + Rate Limit   │ + Refresh Tokens
     ▼                ▼                ▼
  ┌──────────┐     ┌──────────┐     ┌──────────┐
  │ Local    │     │ Cloudfl. │     │ PostgreSQL│
  │ Storage  │     │ KV Store │     │ (Users   │
  │ (JWT)    │     │ (Black-  │     │  Table)  │
  │          │     │  list)   │     │          │
  └──────────┘     └──────────┘     └──────────┘
```

### Auth Flow
1. User enters phone number or email
2. One-time password (OTP) sent via SMS/email
3. User verifies OTP → Supabase issues JWT
4. JWT stored in HTTP-only cookie + localStorage
5. Edge Functions verify JWT on every API request
6. Refresh tokens rotate automatically (7-day expiry)

### Security Measures
- **Passwordless by default** — Phone + OTP primary auth
- **Rate limiting** — 5 OTP requests per phone per hour (Edge KV)
- **Token blacklisting** — Invalidated JWTs stored in Cloudflare KV
- **CSRF protection** — Double-submit cookie pattern
- **XSS prevention** — Content-Security-Policy headers, DOMPurify for HTML
- **SQL injection prevention** — Parameterized queries via Supabase RLS + Zod validation

## 4.2 Row-Level Security (Supabase RLS)

```sql
-- Example RLS policies
CREATE POLICY "Users can view their own data"
ON public.users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Anyone can view active listings"
ON public.posts FOR SELECT
USING (status = 'active');

CREATE POLICY "Sellers can edit their own listings"
ON public.posts FOR UPDATE
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Premium users can create centres"
ON public.centres FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_tiers
    WHERE user_id = auth.uid()
    AND tier IN ('premium', 'pro', 'business')
    AND (expires_at IS NULL OR expires_at > now())
  )
);
```

## 4.3 Data Encryption

| Data Type | At Rest | In Transit | Notes |
|-----------|---------|------------|-------|
| Passwords | bcrypt hash | TLS 1.3 | Never stored raw |
| JWTs | — | TLS 1.3 | Rotated every 7 days |
| PII (Phone, Email) | AES-256-GCM | TLS 1.3 | Application-level encryption |
| Aadhaar/PAN | AES-256-GCM + Tokenization | TLS 1.3 | Masked in UI (last 4 digits) |
| Payment tokens | External (Razorpay) | TLS 1.3 | Never touch our servers |
| Chat messages | — | TLS 1.3 | Ephemeral, not stored |
| Images/Uploads | Supabase Storage (encrypted) | HTTPS | CDN-backed, signed URLs |

## 4.4 India-Specific Compliance

| Regulation | Requirement | Implementation |
|-----------|-------------|----------------|
| DPDP Act 2023 | Data minimization | Collect only essential fields |
| DPDP Act 2023 | Consent management | Audit-logged consent records |
| DPDP Act 2023 | Breach notification | Automated CERT-In + DPA reporting |
| GST Act | TCS collection | Automatic TCS on every transaction |
| GST Act | GSTIN validation | API-based validation at onboarding |
| RBI Guidelines | Payment Aggregator | Use Razorpay (licensed PA) |
| IT Act 2000 | Intermediary Guidelines | Complaint mechanism, 36hr response |

---

# PART V: DATABASE SCHEMA

## 5.1 Entity Relationship Diagram (Core Tables)

```
users
├── id: UUID (PK)
├── phone: TEXT (UNIQUE, encrypted)
├── email: TEXT (UNIQUE, encrypted)
├── display_name: TEXT
├── avatar_url: TEXT
├── is_verified: BOOLEAN (Aadhaar/PAN check)
├── preferred_language: TEXT
├── location_city: TEXT
├── location_state: TEXT
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

user_tiers
├── id: UUID (PK)
├── user_id: UUID (FK → users)
├── tier: TEXT (basic, premium, pro, business)
├── trial_start: TIMESTAMPTZ
├── trial_end: TIMESTAMPTZ
├── subscribed_at: TIMESTAMPTZ
├── expires_at: TIMESTAMPTZ
├── payment_provider: TEXT (razorpay)
├── payment_subscription_id: TEXT
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

categories
├── id: UUID (PK)
├── name: JSONB (multi-language)
├── slug: TEXT (UNIQUE)
├── icon: TEXT
├── parent_id: UUID (FK → categories, self-referencing)
├── display_order: INTEGER
├── image_url: TEXT
├── is_active: BOOLEAN
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

posts
├── id: UUID (PK)
├── seller_id: UUID (FK → users)
├── category_id: UUID (FK → categories)
├── subcategory_id: UUID (FK → categories)
├── title: TEXT
├── description: TEXT
├── price: DECIMAL(12,2)
├── condition: TEXT (new, like_new, good, fair)
├── location_city: TEXT
├── location_state: TEXT
├── location_area: TEXT
├── status: TEXT (active, sold, archived, draft)
├── images: JSONB (array of URLs)
├── videos: JSONB (array of URLs)
├── attributes: JSONB (dynamic specs)
├── is_featured: BOOLEAN
├── is_premium: BOOLEAN
├── is_boosted: BOOLEAN
├── boost_expires_at: TIMESTAMPTZ
├── view_count: INTEGER (DEFAULT 0)
├── like_count: INTEGER (DEFAULT 0)
├── share_count: INTEGER (DEFAULT 0)
├── search_vector: TSVECTOR (for full-text search)
├── created_at: TIMESTAMPTZ
├── updated_at: TIMESTAMPTZ
└── deleted_at: TIMESTAMPTZ (soft delete)

indexes:
├── posts_seller_id_idx ON posts(seller_id)
├── posts_category_id_idx ON posts(category_id)
├── posts_status_idx ON posts(status) WHERE status = 'active'
├── posts_created_at_idx ON posts(created_at DESC)
├── posts_search_idx ON posts USING GIN(search_vector)
├── posts_price_idx ON posts(price)
├── posts_location_idx ON posts(location_city, location_state)
└── posts_featured_idx ON posts(is_featured, is_premium, is_boosted)

feed_posts
├── id: UUID (PK)
├── author_id: UUID (FK → users)
├── title: TEXT
├── content: TEXT
├── images: JSONB
├── category_id: UUID (FK → categories)
├── likes_count: INTEGER (DEFAULT 0)
├── views_count: INTEGER (DEFAULT 0)
├── shares_count: INTEGER (DEFAULT 0)
├── is_sponsored: BOOLEAN
├── search_vector: TSVECTOR
├── created_at: TIMESTAMPTZ
├── updated_at: TIMESTAMPTZ
└── deleted_at: TIMESTAMPTZ

centres
├── id: UUID (PK)
├── owner_id: UUID (FK → users, UNIQUE per category)
├── category_id: UUID (FK → categories)
├── name: TEXT
├── slug: TEXT (UNIQUE)
├── description: TEXT
├── avatar_url: TEXT
├── cover_url: TEXT
├── branding_colors: JSONB (primary, accent)
├── is_verified: BOOLEAN
├── follower_count: INTEGER (DEFAULT 0)
├── listing_count: INTEGER (DEFAULT 0)
├── avg_rating: DECIMAL(2,1)
├── rating_count: INTEGER
├── is_active: BOOLEAN
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

wishlist
├── id: UUID (PK)
├── user_id: UUID (FK → users)
├── post_id: UUID (FK → posts)
├── created_at: TIMESTAMPTZ
└── UNIQUE(user_id, post_id)

cart_items
├── id: UUID (PK)
├── user_id: UUID (FK → users)
├── post_id: UUID (FK → posts)
├── created_at: TIMESTAMPTZ
└── UNIQUE(user_id, post_id)

transactions
├── id: UUID (PK)
├── post_id: UUID (FK → posts)
├── buyer_id: UUID (FK → users)
├── seller_id: UUID (FK → users)
├── amount: DECIMAL(12,2)
├── payment_provider: TEXT (razorpay)
├── payment_id: TEXT
├── status: TEXT (pending, completed, failed, refunded)
├── tcs_amount: DECIMAL(12,2)
├── platform_fee: DECIMAL(12,2)
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

complaints
├── id: UUID (PK)
├── reporter_id: UUID (FK → users)
├── post_id: UUID (FK → posts)
├── type: TEXT (fraud, spam, inappropriate, copyright, other)
├── description: TEXT
├── status: TEXT (open, investigating, resolved, dismissed)
├── created_at: TIMESTAMPTZ
└── resolved_at: TIMESTAMPTZ

ratings
├── id: UUID (PK)
├── post_id: UUID (FK → posts)
├── rater_id: UUID (FK → users)
├── rating: INTEGER (1-5)
├── review: TEXT
├── created_at: TIMESTAMPTZ
└── UNIQUE(post_id, rater_id)

notifications
├── id: UUID (PK)
├── user_id: UUID (FK → users)
├── type: TEXT (like, comment, follow, sale, message, system)
├── title: TEXT
├── body: TEXT
├── data: JSONB (action payload)
├── is_read: BOOLEAN (DEFAULT false)
├── created_at: TIMESTAMPTZ
└── INDEX(user_id, is_read, created_at DESC)

messages
├── id: UUID (PK)
├── sender_id: UUID (FK → users)
├── receiver_id: UUID (FK → users)
├── post_id: UUID (FK → posts, nullable)
├── content: TEXT
├── is_read: BOOLEAN (DEFAULT false)
├── created_at: TIMESTAMPTZ
└── INDEX(sender_id, receiver_id, created_at)

kyc_verifications
├── id: UUID (PK)
├── user_id: UUID (FK → users, UNIQUE)
├── aadhaar_token: TEXT (tokenized, not raw)
├── pan_token: TEXT (tokenized, not raw)
├── aadhaar_verified: BOOLEAN
├── pan_verified: BOOLEAN
├── gstin: TEXT (for sellers)
├── gstin_verified: BOOLEAN
├── verification_status: TEXT (pending, verified, rejected)
├── verified_at: TIMESTAMPTZ
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ

post_views
├── id: BIGSERIAL (PK)
├── post_id: UUID (FK → posts)
├── viewer_id: UUID (FK → users, nullable)
├── viewed_at: TIMESTAMPTZ (DEFAULT now())
└── INDEX(post_id, viewed_at)

analytics_events
├── id: BIGSERIAL (PK)
├── event_name: TEXT
├── user_id: UUID (nullable)
├── page: TEXT
├── metadata: JSONB
├── session_id: TEXT
├── timestamp: TIMESTAMPTZ (DEFAULT now())
└── INDEX(event_name, timestamp)
```

---

# PART VI: API DESIGN

## 6.1 API Architecture

```
Base URL: /api/v1
Authentication: Bearer JWT (supabase.auth.token)
Content-Type: application/json
Rate Limiting: 100 req/min per IP (Edge Functions)
```

## 6.2 Endpoint Specification

### Authentication
```
POST   /api/v1/auth/otp/send        — Send OTP to phone/email
POST   /api/v1/auth/otp/verify       — Verify OTP, return JWT
POST   /api/v1/auth/refresh           — Refresh expired JWT
POST   /api/v1/auth/logout            — Invalidate JWT
GET    /api/v1/auth/me                — Get current user profile
PUT    /api/v1/auth/profile           — Update user profile
```

### Posts (Listings)
```
GET    /api/v1/posts                  — List posts (paginated, filtered)
GET    /api/v1/posts/for-you          — Personalized recommendations
GET    /api/v1/posts/:id              — Get single post
POST   /api/v1/posts                  — Create new listing
PUT    /api/v1/posts/:id              — Update listing
DELETE /api/v1/posts/:id              — Soft-delete listing
PATCH  /api/v1/posts/:id/status       — Update status (sold, active)
POST   /api/v1/posts/:id/like          — Toggle like
POST   /api/v1/posts/:id/view          — Record view
POST   /api/v1/posts/:id/share         — Record share
POST   /api/v1/posts/batch-view        — Batch view recording
```

### Query Parameters (GET /posts)
| Param | Type | Description |
|-------|------|-------------|
| `page` | int | Page number (default: 1) |
| `limit` | int | Items per page (default: 20, max: 100) |
| `search` | string | Full-text search query |
| `category_id` | UUID | Filter by category |
| `subcategory_id` | UUID | Filter by subcategory |
| `minPrice` | decimal | Minimum price filter |
| `maxPrice` | decimal | Maximum price filter |
| `location` | string | City/area filter |
| `condition` | string | new, like_new, good, fair |
| `sortBy` | string | created_at, price, views, likes |
| `sortOrder` | string | asc, desc |
| `verifiedOnly` | bool | Verified sellers only |
| `featured` | bool | Featured listings only |

### Feed Posts
```
GET    /api/v1/feed                   — List feed posts
GET    /api/v1/feed/mine              — User's own feed posts
POST   /api/v1/feed                   — Create feed post
PUT    /api/v1/feed/:id               — Update feed post
DELETE /api/v1/feed/:id               — Delete feed post
POST   /api/v1/feed/:id/like          — Toggle like
POST   /api/v1/feed/:id/view          — Record view
```

### Centres (Stores)
```
GET    /api/v1/centres                — List centres
GET    /api/v1/centres/:id            — Get centre with listings
POST   /api/v1/centres                — Create centre (premium)
PUT    /api/v1/centres/:id            — Update centre
POST   /api/v1/centres/:id/follow     — Toggle follow
```

### Categories
```
GET    /api/v1/categories             — All categories (tree structure)
GET    /api/v1/categories/:id         — Category with subcategories
```

### Wishlist / Cart
```
GET    /api/v1/wishlist               — Get saved posts
POST   /api/v1/wishlist               — Add to wishlist
DELETE /api/v1/wishlist/:postId       — Remove from wishlist
GET    /api/v1/cart                   — Get cart items
POST   /api/v1/cart                   — Add to cart
DELETE /api/v1/cart/:postId           — Remove from cart
```

### Chat / Messages
```
GET    /api/v1/messages               — List conversations
GET    /api/v1/messages/:userId       — Get conversation with user
POST   /api/v1/messages               — Send message
PATCH  /api/v1/messages/:id/read      — Mark as read
```

### Notifications
```
GET    /api/v1/notifications          — List notifications
PATCH  /api/v1/notifications/:id/read — Mark as read
PATCH  /api/v1/notifications/read-all  — Mark all as read
```

### KYC / Verification
```
POST   /api/v1/kyc/aadhaar            — Submit Aadhaar verification
POST   /api/v1/kyc/pan                — Submit PAN verification
POST   /api/v1/kyc/gstin              — Validate GSTIN
GET    /api/v1/kyc/status             — Get KYC status
```

### Subscriptions (Premium)
```
GET    /api/v1/subscriptions/plans    — Available plans
POST   /api/v1/subscriptions/trial    — Activate trial
POST   /api/v1/subscriptions/create   — Create subscription
POST   /api/v1/subscriptions/cancel   — Cancel subscription
GET    /api/v1/subscriptions/status   — Current subscription status
```

### Analytics
```
POST   /api/v1/analytics/track        — Track event
GET    /api/v1/analytics/seller-stats  — Seller dashboard stats
```

---

# PART VII: PERFORMANCE ENGINEERING

## 7.1 Bundle Optimization Targets

| Metric | Current | Target | Strategy |
|--------|---------|--------|----------|
| Initial JS | ~500KB | < 150KB | Code splitting, dynamic imports, tree shaking |
| First Paint | 2.5s | < 0.8s | SSR, critical CSS inline, font-display swap |
| LCP | 4.2s | < 1.5s | Image optimization, lazy loading, preload hints |
| TTI | 3.8s | < 2.0s | Selective hydration, deferred frameworks |
| FID | 120ms | < 50ms | Reduced main thread work, web workers |
| CLS | 0.15 | < 0.05 | Explicit dimensions, skeleton screens |
| Lighthouse | 65 | > 95 | All audits passing |

## 7.2 Image Optimization Pipeline

```
User Upload → Sharp Processing → Multiple Variants → CDN Delivery
                   │
                   ├── thumbnail: 150×150 (WebP)
                   ├── small: 400×300 (WebP)
                   ├── medium: 800×600 (WebP, AVIF)
                   ├── large: 1200×900 (WebP, AVIF)
                   └── original: preserved (private, signed URL)
```

## 7.3 Caching Strategy

| Resource | Cache Strategy | Max-Age | Stale-While-Revalidate |
|----------|---------------|---------|----------------------|
| Static assets (CSS, JS, fonts) | Cache-First | 365 days | 7 days |
| Category data | Cache-First (SWR) | 1 hour | 1 day |
| Post listings | Network-First (SWR) | 30 seconds | 5 minutes |
| Post detail | Cache-First (ISR) | 5 minutes | 1 hour |
| User profiles | Network-First | 1 minute | 10 minutes |
| Centre pages | Cache-First (ISR) | 5 minutes | 1 hour |
| API responses | Network-First | 30 seconds | 5 minutes |
| Images (CDN) | Cache-First | 30 days | 7 days |

## 7.4 Virtualization Strategy

All listing pages use `@tanstack/react-virtual` for windowed rendering:

```javascript
// Example: Virtualized product grid
function ProductGrid({ items }) {
  const parentRef = useRef(null);
  
  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(items.length / 2),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 320, // Estimated row height
    overscan: 4, // Extra rows rendered off-screen
  });

  return (
    <div ref={parentRef} style={{ height: '100vh', overflow: 'auto' }}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div key={virtualRow.index} style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${virtualRow.size}px`,
            transform: `translateY(${virtualRow.start}px)`,
          }}>
            <ProductRow
              items={items.slice(virtualRow.index * 2, virtualRow.index * 2 + 2)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 7.5 Service Worker (PWA)

```javascript
// sw.js — Service Worker Strategy
workbox.routing.registerRoute(
  /\/api\/v1\/posts/,
  new workbox.strategies.NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new workbox.expiration.Plugin({ maxEntries: 50, maxAgeSeconds: 300 }),
      new workbox.broadcastUpdate.Plugin({ channelName: 'api-updates' }),
    ],
  })
);

workbox.routing.registerRoute(
  /\.(?:png|jpg|jpeg|gif|webp|avif)$/,
  new workbox.strategies.CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new workbox.expiration.Plugin({ maxEntries: 100, maxAgeSeconds: 86400 }),
    ],
  })
);

// Background Sync for offline actions
workbox.routing.registerRoute(
  /\/api\/v1\/posts\/\d+\/like/,
  new workbox.strategies.NetworkOnly()
);

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-likes') {
    event.waitUntil(syncQueuedLikes());
  }
});
```

---

# PART VIII: STATE MANAGEMENT ARCHITECTURE

## 8.1 State Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    ZUSTAND (UI State)                        │
│  • Theme (dark/light)                                       │
│  • Density (compact/comfortable)                            │
│  • Active filters (temporary UI state)                      │
│  • Sidebar/sheet open/close                                 │
│  • Compare panel items (temporary)                          │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                TANSTACK QUERY (Server State)                  │
│  • Posts, listings, feed posts                              │
│  • Categories, subcategories                                │
│  • User profile, settings                                   │
│  • Notifications, messages                                  │
│  • Cart, wishlist items                                     │
│  • Centre data, analytics                                   │
│  • Automatic cache invalidation & revalidation              │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                SUPABASE REALTIME (Live State)                │
│  • Live notifications                                       │
│  • Chat messages                                            │
│  • Post updates (sold, price change)                        │
└─────────────────────────────────────────────────────────────┘
```

## 8.2 TanStack Query Configuration

```javascript
// queryClient.js
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,      // 30 seconds
      gcTime: 5 * 60 * 1000,     // 5 minutes (cache retention)
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

## 8.3 Zustand Stores

```javascript
// stores/useThemeStore.js
const useThemeStore = create((set) => ({
  mode: 'light', // 'light' | 'dark' | 'system'
  setMode: (mode) => set({ mode }),
  toggle: () => set((s) => ({ mode: s.mode === 'light' ? 'dark' : 'light' })),
}));

// stores/useFilterStore.js
const useFilterStore = create((set) => ({
  filters: {
    search: '',
    category: 'All',
    subcategory: 'All',
    minPrice: '',
    maxPrice: '',
    location: '',
    sortBy: 'date_desc',
    condition: '',
    verifiedOnly: false,
  },
  setFilter: (key, value) => set((s) => ({
    filters: { ...s.filters, [key]: value }
  })),
  clearFilters: () => set({
    filters: { search: '', category: 'All', subcategory: 'All',
                minPrice: '', maxPrice: '', location: '',
                sortBy: 'date_desc', condition: '', verifiedOnly: false }
  }),
}));

// stores/useCompareStore.js
const useCompareStore = create((set, get) => ({
  items: [],
  addItem: (item) => set((s) => ({
    items: s.items.length < 4 ? [...s.items, item] : s.items,
  })),
  removeItem: (id) => set((s) => ({
    items: s.items.filter((i) => i.id !== id),
  })),
  clearAll: () => {
    set({ items: [] });
    sessionStorage.removeItem('compareItems');
  },
  persistToSession: () => {
    sessionStorage.setItem('compareItems', JSON.stringify(get().items));
  },
  loadFromSession: () => {
    try {
      const stored = sessionStorage.getItem('compareItems');
      if (stored) set({ items: JSON.parse(stored) });
    } catch {}
  },
}));
```

---

# PART IX: FEATURE SPECIFICATIONS

## 9.1 Navigation System

### Requirements
- Bottom navigation always visible on mobile (5 tabs: Home, All Posts, Feed, Profile, More)
- Top navigation on desktop with search bar, notifications, cart, saved items
- Hamburger menu (More) opens as bottom sheet on mobile, sidebar on desktop
- Back navigation must respect the navigation stack (not hard-coded to HOME)
- Each category should feel like its own app (category isolation)

### Implementation
```javascript
// Bottom Navigation Items
const BOTTOM_NAV_ITEMS = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/all-posts', label: 'All Posts', icon: Grid3X3 },
  { path: '/feed', label: 'Feed', icon: Newspaper },
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/more', label: 'More', icon: MoreHorizontal },
];
```

### Category Isolation
```javascript
// routes/categoryRoutes.js
const CATEGORY_ROUTES = {
  electronics: {
    basePath: '/electronics',
    apiPrefix: 'category_group=electronics',
    allowedRoutes: ['/listings', '/post/:id', '/centre/:id'],
  },
  fashion: {
    basePath: '/fashion',
    apiPrefix: 'category_group=fashion',
    allowedRoutes: ['/listings', '/post/:id', '/centre/:id'],
  },
  // ... each category is isolated
};
```

## 9.2 All Posts Page (Core Listing Page)

### Must-Have Features
- [ ] Virtualized grid/list view with toggle
- [ ] Infinite scroll with IntersectionObserver (1000px margin)
- [ ] Search bar (auto-debounce, 300ms delay)
- [ ] Advanced filter panel (slide-in drawer):
  - Category + subcategory tree
  - Price range slider (min/max)
  - Location filter (state → district → village cascade)
  - Condition filter (new, like_new, good, fair)
  - Date filter (today, last 7 days, last 30 days)
  - Verified sellers only toggle
  - Premium/Featured only toggle
- [ ] Sort options: Latest, Oldest, Price Low-High, Price High-Low, Most Viewed, Most Liked
- [ ] Active filter chips (removable)
- [ ] Compare checkbox on each card (max 4 items)
- [ ] Floating compare bar when items selected
- [ ] Save/wishlist toggle
- [ ] Share button with dialog
- [ ] Like/heart interaction
- [ ] Carousel for multi-image posts
- [ ] Trust badge (verified seller)
- [ ] Premium/featured badges
- [ ] Back to top button
- [ ] Density toggle (compact/comfortable)
- [ ] Auto-refresh toggle (30s interval)
- [ ] "New" badge for posts < 24h
- [ ] Scroll position restoration on back navigation

### API Integration
```javascript
// Query key factory for posts
const postKeys = {
  all: ['posts'],
  lists: () => [...postKeys.all, 'list'],
  list: (filters) => [...postKeys.lists(), filters],
  details: () => [...postKeys.all, 'detail'],
  detail: (id) => [...postKeys.details(), id],
};

// Fetch posts with infinite scrolling
function usePosts(filters) {
  return useInfiniteQuery({
    queryKey: postKeys.list(filters),
    queryFn: ({ pageParam = 1 }) =>
      api.get('/posts', { params: { ...filters, page: pageParam, limit: 20 } }),
    getNextPageParam: (lastPage) =>
      lastPage.posts.length === 20 ? lastPage.page + 1 : undefined,
    staleTime: 30 * 1000,
  });
}
```

## 9.3 Post Detail Page

### Must-Have Features
- [ ] Full-width image gallery with pinch-to-zoom
- [ ] Image carousel with dots and navigation arrows
- [ ] Rich product description with "Read more" expand
- [ ] Price display (prominent, with currency)
- [ ] Condition badge
- [ ] Seller card with:
  - Avatar, name, member since
  - Trust score and badge
  - Response time
  - Contact seller button (chat)
  - View centre/store link
- [ ] Action buttons:
  - Save/wishlist
  - Share (WhatsApp, copy link, etc.)
  - Compare (add to compare list)
  - Report listing
- [ ] Similar listings (same subcategory)
- [ ] Featured posts carousel
- [ ] Seller's other listings
- [ ] Recently viewed tracking
- [ ] View count display
- [ ] Like count display
- [ ] Post date
- [ ] Location with map (optional)
- [ ] WhatsApp share direct link
- [ ] Schema.org markup for SEO

## 9.4 Feed Page

### Must-Have Features
- [ ] Card-based feed posts with avatar, seller name, timestamp
- [ ] Text content with "Read more" expand (250 char preview)
- [ ] Image support in feed posts
- [ ] Like/heart with count
- [ ] Share with dialog
- [ ] Save/bookmark
- [ ] Promote (for post owners)
- [ ] Report
- [ ] Sort: Discover, Newest, Popular, Updated
- [ ] Sort order: Newest first / Oldest first
- [ ] Search within feed
- [ ] Category/group filter
- [ ] Infinite scroll with IntersectionObserver
- [ ] Guest mode preview (3 posts, then auth gate)
- [ ] "Share your update" prompt for authenticated users
- [ ] Category and subcategory badges
- [ ] Price badge (if feed post is a listing)
- [ ] Location marker
- [ ] 3-dot menu with all actions
- [ ] FAB for creating new feed post (mobile)

## 9.5 My Feed Page

### Must-Have Features
- [ ] Stats dashboard: total posts, total views, total likes
- [ ] Search within own posts
- [ ] Status filter: All, Active, Draft, Sold, Archived
- [ ] Sort: Newest, Recently Updated, Most Viewed, Most Liked, Title
- [ ] Sort order: Asc / Desc
- [ ] Post management:
  - Edit post
  - Delete post with confirmation
  - Share post
  - Save/bookmark
  - Promote
  - View details
- [ ] Pull-to-refresh
- [ ] Auto-refresh metrics every 45s
- [ ] Empty state with CTA to create first post
- [ ] Pagination / load more
- [ ] Post thumbnail display
- [ ] Like count and view count per post

## 9.6 Compare Feature

### Must-Have Features
- [ ] Select up to 4 items via checkbox on listing cards
- [ ] Floating compare bar showing count, subcategory, clear all button
- [ ] "Compare Now" button navigates to /compare
- [ ] Items persist via sessionStorage (survive navigation)
- [ ] Side-by-side product cards (responsive grid)
- [ ] Dynamic spec comparison table:
  - Base fields: Price, Condition, Brand, Model, Category, Subcategory, Location, Seller, Posted, Warranty, Delivery, Storage, Color, Year, Status
  - Dynamic fields: Auto-detected from item attributes/specs
- [ ] Remove item from comparison (individual remove or clear all)
- [ ] Browse listings CTA when no items selected
- [ ] Enforce same-subcategory comparison
- [ ] "View Details" button per item

## 9.7 Centre Page (Store/Storefront)

### Must-Have Features
- [ ] Hero section with cover image
- [ ] Avatar, store name, badges
- [ ] Member since, verified status
- [ ] Stats: total listings, followers, avg rating
- [ ] Description/bio
- [ ] All listings grid with view toggle (grid/list)
- [ ] Pagination / load more
- [ ] Listing cards with image, title, price, location
- [ ] Refresh button
- [ ] Share button
- [ ] Follow button (future)
- [ ] Premium gate for creation (non-premium users see upsell)
- [ ] 1-week trial option for new users
- [ ] 1 centre per category limit

## 9.8 Search & Filters

### Must-Have Features
- [ ] Full-text search across: Title, Description, Category, Subcategory, Location, Tags, User Name
- [ ] Debounced search (300ms delay)
- [ ] Search results update immediately as user types
- [ ] Filter panel (slide-in drawer on mobile, sidebar on desktop):
  - Category tree (with subcategories)
  - Price range (min/max with INR formatting)
  - Date filter: Today, Last 7 Days, Last 30 Days
  - Location: State → District → Village cascade dropdown
  - Condition: New, Like New, Good, Fair
  - Post type: All, Premium, Featured, Normal
  - User type: All, Verified, Premium
  - Verified sellers only toggle
- [ ] Sort options:
  - Latest
  - Oldest
  - Most Viewed
  - Most Liked
  - Featured First
  - Premium First
  - Price: Low to High
  - Price: High to Low
- [ ] Active filter chips (click to remove individual filter)
- [ ] Clear all filters button
- [ ] Results count badge
- [ ] URL-based filter persistence (shareable filtered URLs)

## 9.9 Language System

### Must-Have Features
- [ ] Support for 12 Indian languages at launch:
  - English (en), Hindi (hi), Telugu (te), Tamil (ta), Kannada (kn)
  - Malayalam (ml), Marathi (mr), Bengali (bn), Gujarati (gu)
  - Punjabi (pa), Odia (or), Assamese (as), Urdu (ur)
- [ ] Language switcher in header/settings
- [ ] URL-based language override (?lng=hi)
- [ ] LocalStorage persistence
- [ ] Preferred language in user profile
- [ ] Instant switching (no page reload)
- [ ] Auto-detect browser language on first visit
- [ ] Lazy-load translation files (only load needed languages)
- [ ] Translation of user-generated content (posts, descriptions) via server-side AI
- [ ] RTL support for Urdu

### Translation File Structure
```
locales/
├── en/
│   ├── common.json       — UI labels, buttons, navigation
│   ├── posts.json         — Post-related translations
│   ├── feed.json          — Feed-related translations
│   ├── auth.json          — Auth/verification translations
│   ├── errors.json        — Error messages
│   └── validation.json    — Form validation messages
├── hi/
│   ├── common.json
│   └── ...
└── te/
    └── ...
```

## 9.10 Premium/Subscription System

### Tier Structure
| Tier | Price (Monthly) | Features |
|------|----------------|----------|
| Basic | Free | Browse, search, buy, basic posting |
| Premium | ₹99 | Centre page, boosted listings, priority support, analytics |
| Pro | ₹199 | Premium + 2 centre pages, featured listings, promoted posts |
| Business | ₹499 | Pro + 5 centre pages, API access, dedicated manager, custom branding |

### Trial System
- New users get a **7-day Premium trial** immediately
- Trial gives full Premium access including Centre creation
- After trial, Centre creation becomes Premium-only
- Users can also create centres during initial free trial
- Trial conversion rate tracked via analytics

---

# PART X: TESTING STRATEGY

## 10.1 Testing Pyramid

```
              ╱─────╲
             ╱  E2E  ╲           ← 5% — Playwright/Cypress
            ╱─────────╲
           ╱Integration╲         ← 15% — React Testing Library + MSW
          ╱─────────────╲
         ╱   Unit Tests   ╲      ← 80% — Vitest + Testing Library
        ╱───────────────────╲
```

## 10.2 Test Configuration

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './test/setup.js',
    coverage: {
      reporter: ['text', 'json', 'html'],
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## 10.3 Unit Test Example

```javascript
// __tests__/components/ProductCard.test.jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductCard } from '@/components/product/ProductCard';

describe('ProductCard', () => {
  const mockPost = {
    id: '1',
    title: 'iPhone 15 Pro Max',
    price: 85000,
    condition: 'like_new',
    location: 'Hyderabad',
    created_at: '2024-01-15T10:00:00Z',
    images: ['https://example.com/iphone.jpg'],
    user: { name: 'John Doe', verified: true },
  };

  it('renders product title and price', () => {
    render(<ProductCard post={mockPost} />);
    expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
    expect(screen.getByText('₹85,000')).toBeInTheDocument();
  });

  it('shows verified badge for verified sellers', () => {
    render(<ProductCard post={mockPost} />);
    expect(screen.getByLabelText('Verified')).toBeInTheDocument();
  });

  it('navigates to post detail on click', async () => {
    const navigate = vi.fn();
    render(<ProductCard post={mockPost} navigate={navigate} />);
    await userEvent.click(screen.getByText('iPhone 15 Pro Max'));
    expect(navigate).toHaveBeenCalledWith('/post/1', expect.any(Object));
  });
});
```

## 10.4 Integration Test Example

```javascript
// __tests__/pages/AllPosts.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { AllPosts } from '@/pages/AllPosts';
import { QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/test/mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('AllPosts Page', () => {
  it('fetches and displays posts', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AllPosts />
      </QueryClientProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument();
      expect(screen.getByText('Samsung Galaxy S24')).toBeInTheDocument();
    });
  });

  it('shows loading skeleton initially', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AllPosts />
      </QueryClientProvider>
    );
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });
});
```

## 10.5 E2E Test Example

```javascript
// e2e/all-posts.spec.js
import { test, expect } from '@playwright/test';

test('user can browse and filter listings', async ({ page }) => {
  await page.goto('/all-posts');
  
  // Wait for posts to load
  await expect(page.getByTestId('product-grid')).toBeVisible();
  
  // Filter by category
  await page.getByRole('button', { name: 'Electronics' }).click();
  await expect(page).toHaveURL(/category=Electronics/);
  
  // Search
  await page.getByPlaceholder('Search...').fill('iPhone');
  await page.waitForTimeout(500);
  await expect(page.getByText('iPhone')).toBeVisible();
  
  // Select compare
  await page.getByLabel('Compare').first().click();
  await expect(page.getByText('1 item selected')).toBeVisible();
  
  // Navigate to compare
  await page.getByText('Compare Now').click();
  await expect(page).toHaveURL('/compare');
});
```

---

# PART XI: CI/CD PIPELINE

## 11.1 Deployment Architecture

```
Git Push → GitHub → GitHub Actions → Build → Deploy
  │                                           │
  │                                           ├── Preview (PR)
  │                                           └── Production (main)
  │
  ├── Lint (ESLint + Prettier)
  ├── Type Check (TypeScript)
  ├── Unit Tests (Vitest)
  ├── Integration Tests
  └── Build (Vite)
```

## 11.2 GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test -- --coverage
      - run: pnpm build

  deploy:
    needs: quality
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install && pnpm build
      - uses: nwtgck/actions-netlify@v3
        with:
          publish-dir: './dist'
          production-branch: main
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: 'Deploy from GitHub Actions'
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## 11.3 Environment Configuration

```bash
# .env.development
VITE_API_URL=http://localhost:54321
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=development-anon-key
VITE_SENTRY_DSN=
VITE_UMAMI_URL=http://localhost:3000

# .env.production
VITE_API_URL=https://api.mhub.in/v1
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=production-anon-key
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
VITE_UMAMI_URL=https://analytics.mhub.in
VITE_CLOUDFLARE_TURNSTILE_SITE_KEY=xxx
```

---

# PART XII: IMPLEMENTATION ROADMAP

## 12.1 Phase Breakdown

### Phase 1: Foundation (Week 1-2)
```
Priority: CRITICAL
Goal: Working app shell with auth, navigation, and basic listing browsing

Tasks:
├── Initialize Next.js + TypeScript + Tailwind
├── Set up design system (shadcn/ui components)
├── Configure Supabase (DB, Auth, Storage)
├── Implement auth flow (phone + OTP)
├── Build bottom navigation + app shell
├── Implement TanStack Query with Supabase
├── Create database migrations (users, categories, posts)
├── Build AllPosts page with basic listing grid
├── Implement infinite scroll with virtualizer
├── Set up CI/CD pipeline (GitHub Actions + Netlify)
├── Deploy preview environment

Deliverables:
- [ ] Working auth (login, signup, OTP verify)
- [ ] AllPosts page with infinite scroll
- [ ] Post detail page
- [ ] Bottom navigation working
- [ ] CI/CD pipeline deployed
```

### Phase 2: Core Features (Week 3-4)
```
Priority: HIGH
Goal: Full listing lifecycle, search, compare, wishlist

Tasks:
├── Build post creation flow (add-post)
├── Implement image upload (Supabase Storage + sharp)
├── Build search + advanced filter panel
├── Build compare feature (sessionStorage persistence)
├── Implement wishlist/save functionality
├── Build cart feature
├── Implement category browser + subcategories
├── Build PostDetail page with gallery
├── Implement like, share, view tracking
├── Build "For You" personalized page
├── Implement URL-based filter persistence

Deliverables:
- [ ] Post creation with images
- [ ] Search with advanced filters
- [ ] Compare working with 4 items
- [ ] Wishlist + cart functional
- [ ] Category browsing with subcategories
```

### Phase 3: Social & Community (Week 5-6)
```
Priority: HIGH
Goal: Feed, centre pages, chat, notifications

Tasks:
├── Build Feed page (with infinite scroll)
├── Build My Feed page (with stats dashboard)
├── Build feed post creation
├── Build Centre page (storefront)
├── Build Centre creation flow (with premium gate + trial)
├── Implement real-time chat (Supabase Realtime)
├── Build notification system
├── Implement pull-to-refresh
├── Build share dialogs (WhatsApp, copy link)
├── Implement Promote post flow

Deliverables:
- [ ] Feed with like, share, save, comment
- [ ] My Feed with stats and management
- [ ] Centre pages with listings
- [ ] Real-time chat working
- [ ] Notifications functional
```

### Phase 4: Trust & Monetization (Week 7-8)
```
Priority: MEDIUM
Goal: KYC, premium subscriptions, payment integration

Tasks:
├── Build KYC verification flow (Aadhaar + PAN)
├── Integrate payment gateway (Razorpay)
├── Build premium subscription system
├── Implement trial system (1-week free trial)
├── Build tier selection page
├── Implement TCS tax calculation
├── Build transaction history
├── Implement GSTIN validation
├── Build complaint/report system
├── Implement seller rating system

Deliverables:
- [ ] KYC verification working
- [ ] Razorpay payments integrated
- [ ] Premium subscriptions with trials
- [ ] Transaction history
- [ ] Complaint/report system
```

### Phase 5: Performance & Polish (Week 9-10)
```
Priority: MEDIUM
Goal: PWA, offline, i18n, performance optimization

Tasks:
├── Implement PWA (manifest, service worker)
├── Add offline support (Workbox)
├── Implement background sync for offline actions
├── Build language system (i18next)
├── Add 12 Indian language translations
├── Implement dark mode (system-aware)
├── Optimize bundle with code splitting
├── Implement image optimization pipeline
├── Add skeleton loading states everywhere
├── Implement scroll position restoration
├── Optimize Core Web Vitals
├── Add meta tags, schema.org markup for SEO
├── Implement analytics (Umami)

Deliverables:
- [ ] PWA installable on mobile
- [ ] Offline browsing working
- [ ] 12 language translations
- [ ] Dark mode complete
- [ ] Lighthouse score > 95
- [ ] SEO optimized
```

### Phase 6: Production Hardening (Week 11-12)
```
Priority: HIGH
Goal: Security audit, testing, monitoring, launch readiness

Tasks:
├── Security audit (XSS, CSRF, SQL injection)
├── Implement rate limiting (Edge Functions)
├── Add CSP headers
├── Set up Sentry error tracking
├── Configure Grafana + Prometheus monitoring
├── Load testing (k6)
├── Write unit tests (80% coverage)
├── Write integration tests
├── Write E2E tests (Playwright)
├── Set up uptime monitoring
├── Create incident response plan
├── Create backup and disaster recovery plan
├── Documentation
├── Launch checklist verification

Deliverables:
- [ ] Security audit passed
- [ ] Monitoring and alerting active
- [ ] Test coverage > 80%
- [ ] Load testing passes
- [ ] Launch-ready
```

---

## 12.2 Execution Prompts for AI/Dev Teams

### Prompt Template Format
Each task below is a complete prompt that can be given to an AI agent or developer.

### Prompt P1: Initialize Project
```markdown
## Task: Initialize MHUB Marketplace Project

### Objective
Set up a Next.js 18 project with TypeScript, Tailwind CSS v4, shadcn/ui components, 
and all required dependencies for a marketplace application.

### Requirements
- Next.js 18 with App Router (use `app/` directory)
- TypeScript strict mode
- Tailwind CSS v4 with custom design tokens
- shadcn/ui component library
- ESLint + Prettier configuration
- Path alias `@/` pointing to `src/`

### Dependencies to Install
```json
{
  "dependencies": {
    "next": "^18",
    "react": "^19",
    "react-dom": "^19",
    "@tanstack/react-query": "^5",
    "@tanstack/react-virtual": "^3",
    "zustand": "^5",
    "react-router-dom": "^7",
    "react-i18next": "^14",
    "i18next": "^23",
    "zod": "^3",
    "framer-motion": "^11",
    "lucide-react": "^0.400",
    "react-icons": "^5",
    "clsx": "^2",
    "tailwind-merge": "^2",
    "@supabase/supabase-js": "^2"
  },
  "devDependencies": {
    "typescript": "^5.5",
    "vitest": "^2",
    "@testing-library/react": "^16",
    "@testing-library/jest-dom": "^6",
    "eslint": "^9",
    "prettier": "^3",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4"
  }
}
```

### Deliverables
- [ ] `npm run dev` starts the app
- [ ] TypeScript compilation has no errors
- [ ] shadcn/ui button renders correctly
- [ ] Tailwind dark mode classes work
```

### Prompt P2: Database Setup
```markdown
## Task: Set Up Supabase Database

### Objective
Create all database tables, indexes, Row-Level Security policies, 
and seed data for the MHUB marketplace.

### Table Creation (in order)
1. users — user profiles
2. user_tiers — subscription tiers
3. categories — product categories (self-referencing parent_id)
4. posts — product listings
5. feed_posts — community feed posts
6. centres — store pages
7. wishlist — saved posts
8. cart_items — shopping cart
9. transactions — payment records
10. complaints — report system
11. ratings — seller ratings
12. notifications — user notifications
13. messages — chat messages
14. kyc_verifications — KYC records
15. post_views — view tracking
16. analytics_events — analytics

### RLS Policies (Critical)
Every table MUST have Row-Level Security enabled. 
All RLS policies must follow these rules:
- SELECT: Public data is readable by anyone
- INSERT: Authenticated users can create their own records
- UPDATE: Users can only update their own records
- DELETE: Users can only delete their own records

### Seed Data
- Insert 10+ parent categories (Electronics, Fashion, Furniture, etc.)
- Insert 50+ subcategories
- Insert sample users and posts for development
```

### Prompt P3: Auth System
```markdown
## Task: Implement Authentication System

### Objective
Build phone-based OTP authentication with Supabase Auth, 
including login, signup, and profile completion flows.

### Components
1. `LoginForm.jsx` — Phone number input with country code
2. `OtpVerify.jsx` — 6-digit OTP input with auto-submit
3. `SignupForm.jsx` — Phone + basic profile fields
4. `ProfileCompletion.jsx` — Onboarding flow after first login

### API Integration
- Use Supabase Auth `signInWithOtp()` for OTP sending
- Use Supabase Auth `verifyOtp()` for OTP verification
- On success, redirect to profile completion or home

### Edge Cases
- Handle OTP expiry (2 minutes)
- Handle wrong OTP (max 3 attempts, then cooldown)
- Handle existing accounts (show "Login" instead of "Signup")
- Handle network errors with retry
- Handle private browsing (sessionStorage unavailable)

### Security
- Rate limit OTP sends (5 per phone per hour)
- Use HTTP-only cookies for session
- Invalidate sessions on password change
```

### Prompt P4: AllPosts Page
```markdown
## Task: Build All Posts Listing Page

### Objective
Create the main listing page with virtualized grid, infinite scroll, 
search, filters, sort, and compare functionality.

### Critical Implementation Details

#### 1. Virtualized Grid
Use `@tanstack/react-virtual` to render only visible items.
- Rows of 2 items (responsive: 1 on mobile, 3 on desktop)
- Overscan of 4 rows
- Estimate row height at 320px
- Smooth scroll restoration

#### 2. Infinite Scroll
Use IntersectionObserver with 1000px root margin.
- Load 20 items per page
- Show skeleton loader at bottom while loading
- Show "End of results" when all items loaded
- Implement load-more cooldown (1.2s to prevent rapid requests)

#### 3. Search
- Debounce search input by 300ms
- Search across: title, description, category, location, tags
- Update URL params on search (shareable URLs)

#### 4. Filter Panel (Slide-in Drawer)
- Category tree (click to expand subcategories)
- Price range (min INR, max INR inputs)
- Location (state → district → village cascade)
- Condition (New, Like New, Good, Fair)
- Date (Today, Last 7 days, Last 30 days)
- Verified sellers only (toggle)
- Active filter chips (removable)

#### 5. Sort
Options: Latest, Oldest, Price Low-High, Price High-Low, 
Most Viewed, Most Liked

#### 6. Compare
- Checkbox on each product card
- Floating bar showing count + "Compare Now" button
- Max 4 items, same-subcategory enforcement
- Items persist in sessionStorage

### Data Flow
- URL params drive API requests
- TanStack Query caches responses (30s stale time)
- Optimistic updates for like/save actions
- Server state separated from UI state

### URLs
- `/all-posts` — All categories
- `/all-posts?category=Electronics` — Filtered
- `/all-posts?search=iphone&minPrice=10000&maxPrice=50000` — Search + filter
```

### Prompt P5: Compare Feature
```markdown
## Task: Build Compare Feature

### Objective
Implement product comparison allowing users to select up to 4 items 
and view a side-by-side spec comparison table.

### Components
1. Compare checkbox on each product card in AllPosts
2. Floating compare bar (shows count, clear all, compare now)
3. ComparePage (/compare) with:
   - Product cards row (side-by-side)
   - Spec comparison table (dynamic fields)
   - Item removal (individual + clear all)

### Session Storage Persistence
- On selecting items in AllPosts call `sessionStorage.setItem('compareItems', JSON.stringify(items))`
- On navigating to /compare, read from sessionStorage as fallback when location.state is empty
- On "Clear All" in ComparePage, clear sessionStorage
- This ensures compare items survive page refreshes and navigation

### Comparison Rules
- Max 4 items
- Items must be from the same subcategory (enforce on addition)
- Spec table includes: Price, Condition, Brand, Model, Category, Subcategory,
  Location, Seller, Posted date, Warranty, Delivery, Storage, Color, Year, Status
- Dynamic spec fields auto-detected from item attributes
- "—" shown for missing values

### Edge Cases
- No items selected → Show empty state with "Browse Listings" CTA
- Invalid sessionStorage data → Fall back to empty array
- Navigating directly to /compare without going through AllPosts → Read from sessionStorage
```

### Prompt P6: Feed + My Feed
```markdown
## Task: Build Feed and My Feed Pages

### Objective
Create the community feed page for browsing posts and the My Feed page 
for managing the user's own posts.

### Feed Page (/feed)
- Card-based layout with avatar, seller name, timestamp, location
- Text content with "Read more" expand (preview at 250 characters)
- Like, Share, Save, Promote actions
- 3-dot menu: View Details, Share, Save, Promote, Report
- Sort: Discover, Newest, Popular, Updated
- Sort order: Newest first / Oldest first
- Search within feed
- Infinite scroll with IntersectionObserver
- Guest mode: Show 3 posts then auth gate
- "Share your update" prompt for authenticated users
- Category/group badges
- Price badge if post has price
- Location badge
- FAB for creating new feed post (mobile)
- Scroll position restoration

### My Feed Page (/my-feed)
- Stats dashboard: Total posts, Views, Likes
- Search within own posts
- Status filter: All, Active, Draft, Sold, Archived
- Sort: Newest, Recently Updated, Most Viewed, Most Liked, Title
- Sort order: Asc / Desc
- Edit, Delete (with confirmation), Share, Save, Promote actions
- Delete confirmation dialog
- Pull-to-refresh
- Auto-refresh metrics every 45 seconds
- Empty state with CTA to create first post
- Load more pagination

### API Endpoints
- GET /feed — List feed posts (paginated)
- GET /feed/mine — User's feed posts (with stats)
- POST /feed — Create feed post
- DELETE /feed/:id — Delete feed post
- POST /feed/:id/like — Toggle like
```

---

# PART XIII: MONITORING & OBSERVABILITY

## 13.1 Metrics to Track

### Business Metrics
| Metric | Where | Alert Threshold |
|--------|-------|-----------------|
| Active users (DAU/MAU) | Umami | N/A (reporting) |
| Listings created/day | Supabase | N/A (reporting) |
| Transactions completed | Database | N/A (reporting) |
| Search-to-list ratio | Analytics | < 10% (flag) |
| Conversion rate | Analytics | < 1% (flag) |
| Registration completion | Analytics | < 50% (flag) |
| Premium conversion | Database | N/A (reporting) |

### Technical Metrics
| Metric | Where | Alert Threshold |
|--------|-------|-----------------|
| Page load time (LCP) | Sentry | > 2.5s |
| API response time | Grafana | > 500ms (p95) |
| Error rate | Sentry | > 1% |
| Bundle size | Build CI | > 250KB |
| API 4xx errors | Grafana | > 5% |
| API 5xx errors | Grafana | > 0.1% |
| Supabase query time | Database | > 100ms |

## 13.2 Sentry Configuration

```javascript
// sentry.js
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: `mhub@${__COMMIT_HASH__}`,
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
    Sentry.httpClientIntegration(),
  ],
});
```

## 13.3 Health Check Endpoints

```
GET /api/v1/health          — Basic health check
GET /api/v1/health/db       — Database connectivity
GET /api/v1/health/cache    — Cache layer status
GET /api/v1/health/storage  — Storage service status
```

---

# PART XIV: LAUNCH CHECKLIST

## Pre-Launch

- [ ] All critical bugs fixed (P0, P1)
- [ ] Security audit completed
- [ ] Load testing passed (1000 concurrent users)
- [ ] Test coverage > 80%
- [ ] All E2E tests passing
- [ ] Sentry error tracking active
- [ ] Umami analytics active
- [ ] Uptime monitoring active
- [ ] Backup strategy implemented
- [ ] Disaster recovery plan documented
- [ ] SSL certificate valid
- [ ] DNS configured (CDN proxied via Cloudflare)
- [ ] Custom domain set up
- [ ] Email sending configured (Resend)
- [ ] Payment gateway live keys active
- [ ] Rate limiting configured (Edge Functions)
- [ ] CSP headers set
- [ ] PWA audit passed (Lighthouse)
- [ ] SEO audit passed
- [ ] Schema.org markup valid
- [ ] Sitemap submitted to Google
- [ ] Google Search Console verified
- [ ] Social preview images set
- [ ] Terms of Service and Privacy Policy published
- [ ] GDPR / DPDP compliance verified
- [ ] Cookie consent banner implemented
- [ ] `.env.production` fully configured
- [ ] CI/CD deployment confirmed
- [ ] Rollback plan documented
- [ ] Incident response team on-call

## Post-Launch (First 24 Hours)

- [ ] Monitor error rates every hour
- [ ] Check Sentry for new issues
- [ ] Verify payment transactions processed
- [ ] Check email deliverability
- [ ] Monitor database performance
- [ ] Verify CDN caching working
- [ ] Check mobile rendering on 3 devices
- [ ] Verify all languages rendering
- [ ] Check dark mode on all pages
- [ ] Run Lighthouse audit
- [ ] Verify PWA installation works
- [ ] Test offline browsing
- [ ] Verify OTP delivery
- [ ] Test user registration flow
- [ ] Monitor server response times

---

# PART XV: APPENDIX

## A. Key Libraries & Versions (June 2026)

| Library | Version | Purpose |
|---------|---------|---------|
| React | 19.0.x | UI framework |
| Next.js | 18.x | SSR/SSG/ISR framework |
| TypeScript | 5.5+ | Type safety |
| Tailwind CSS | 4.x | Utility CSS |
| shadcn/ui | latest | Accessible components |
| TanStack Query | 5.x | Server state management |
| TanStack Virtual | 3.x | Virtualized rendering |
| Zustand | 5.x | UI state management |
| i18next | 23.x | Internationalization |
| Zod | 3.x | Schema validation |
| Framer Motion | 11.x | Animations |
| Supabase JS | 2.x | Backend client |
| Razorpay JS | latest | Payment gateway |
| Workbox | 7.x | Service worker |
| Lucide React | 0.400+ | Icons |
| Sentry React | 8.x | Error tracking |
| Vitest | 2.x | Unit testing |
| Playwright | latest | E2E testing |
| ESLint | 9.x | Linting |
| Prettier | 3.x | Formatting |

## B. Performance Budgets

| Asset | Budget |
|-------|--------|
| Initial HTML | < 20KB |
| Initial JS (main bundle) | < 100KB |
| Initial CSS | < 20KB |
| Total JS (all routes) | < 300KB |
| Total CSS (all routes) | < 50KB |
| Font files | < 50KB |
| First view images | < 200KB |
| Total page weight | < 500KB (first view) |

## C. Accessibility Targets

- WCAG 2.2 AA compliance
- All interactive elements reachable via keyboard
- Screen reader announcements for dynamic content
- Focus indicators visible on all elements
- Color contrast ratio > 4.5:1 for text
- Touch targets > 44px
- Reduced motion support for animations
- Semantic HTML throughout

## D. Responsive Breakpoints

| Breakpoint | Width | Device |
|------------|-------|--------|
| `xs` | < 480px | Small phones |
| `sm` | 480-768px | Large phones |
| `md` | 768-1024px | Tablets |
| `lg` | 1024-1280px | Small desktops |
| `xl` | 1280-1536px | Desktops |
| `2xl` | > 1536px | Large desktops |

---

> **End of Master Specification Document**
> 
> This document serves as the single source of truth for the MHUB Marketplace application.
> It should be read in its entirety before any implementation begins.
> For each phase, refer to the specific prompts in Section 12.2.
> For architecture decisions, refer to Sections 2-8.
> For feature details, refer to Section 9.
> For testing, refer to Section 10.
> For deployment, refer to Section 11.
>
> **Version:** 1.0
> **Last Updated:** June 2026
> **Document Status:** Final
