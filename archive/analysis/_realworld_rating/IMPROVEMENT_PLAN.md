# Mhub Mobile Parity — 10/10 Rebuild Plan

**Current:** 6.31 / 10 (63% real-app parity)
**Target:** 10.0 / 10 (100% parity with Flipkart/Cred/PhonePe/Instagram)
**Total gap:** 254.5 points across 69 pages (avg 3.69 per page)

---

## What 10/10 actually means

Every page must score 1.0 on all 10 axes. This is the bar set by the best Indian super-apps:

| Axis | 1.0 = | Reference app |
|------|-------|---------------|
| app_shell | Top bar + bottom nav on every screen, safe-area insets, no bare pages | Instagram, Flipkart |
| above_fold | Hero content visible without scroll, no dead whitespace, value proposition instant | Cred, Swiggy |
| touch_targets | All interactive elements ≥ 48dp, 8dp spacing between targets | Material 3 spec |
| typography | 4-level hierarchy (display/heading/body/caption), consistent weights, -0.02em tracking | Airbnb, Stripe |
| image_text_balance | Every screen has visual:text ratio ≥ 40:60, illustrations on empty states, real images on data pages | Pinterest, Zomato |
| sticky_cta | Primary action visible without scrolling on every page, FABs on creation pages | PhonePe, Razorpay |
| polish | Page transitions, micro-interactions, skeleton loading, consistent radius/shadow, no janky moments | Cred, Notion |
| empty_state | Illustration + message + action on every empty list, skeletons while loading, error ≠ empty | Headspace, Todoist |
| native_gestures | Pull-to-refresh, swipe-back, swipe-to-dismiss, long-press context, haptic feedback | iOS native, Telegram |
| brand | Mhub identity on every screen: logo, colors, tone of voice, themed illustrations | Any shipped product |

---

## Score Distribution (current → target)

| Bucket | Now | Target |
|--------|-----|--------|
| 10.0 | 0 | **69** |
| 8.0–9.9 | 8 | 0 |
| 7.0–7.9 | 19 | 0 |
| 6.0–6.9 | 16 | 0 |
| 5.0–5.9 | 16 | 0 |
| 4.0–4.9 | 10 | 0 |

---

## Gap per axis (points needed across all 69 pages)

| Axis | Current avg | Gap to 1.0 | Total points needed | Rank |
|------|-------------|-----------|--------------------|----|
| native_gestures | 0.50 | 0.50 | **34.5** | 1 |
| sticky_cta | 0.57 | 0.43 | **30.0** | 2 |
| empty_state | 0.59 | 0.41 | **28.5** | 3 |
| image_text_balance | 0.59 | 0.41 | **28.0** | 4 |
| polish | 0.70 | 0.30 | **20.5** | 5 |
| brand | 0.72 | 0.28 | **19.0** | 6 |
| app_shell | 0.73 | 0.27 | **18.5** | 7 |
| above_fold | 0.82 | 0.18 | **12.5** | 8 |
| typography | 0.83 | 0.17 | **11.5** | 9 |
| touch_targets | 0.99 | 0.01 | **1.0** | 10 |

---

## Architecture advantages (already built — leverage, don't rebuild)

The codebase is **more mature than the scores suggest**. These exist but are under-wired:

| Asset | Status | Gap |
|-------|--------|-----|
| `PullToRefreshWrapper` in AppShell | Exists, wraps all routes | Not connected to per-page React Query `refetch()` |
| `usePullToRefresh` hook | Exists | Not used in most pages |
| `PostCardSkeleton`, `SkeletonLoader`, `GreenSkeletonLoader` | 3 skeleton variants exist | Not shown during actual React Query `isLoading` |
| `EmptyState`, `EmptyPostsState`, `GreenEmptyState` | 3 empty-state components exist | Generic text, no illustrations, no suggestions |
| `ErrorState` component | Exists | Tiny icon, no branded illustration |
| 44 Radix UI primitives + CVA variants | Full design system | Not consistently applied (some pages use raw divs) |
| `GreenNavbar` (top) + bottom nav | Present on most routes | Missing on auth pages, error states, some leaf pages |
| `PageHeader`, `BreadcrumbsBar` | Exist | Underused — many pages have ad-hoc headers |
| `ImageGallery`, `SafeImage`, `SmartImage`, `LazyImage` | 4 image components | `PostCard` still renders gray boxes on fail |
| `ShareButton`, `WishlistToggle`, `LikePost` | Exist | Not on every applicable page |
| Capacitor native layer (haptic, status bar) | Installed | Not calling `Haptics.impact()` anywhere |
| `react-transition-group` | Installed dep | No page transitions wired |
| Dark mode + theme system | Full CSS variable system | Consistent — no gap here |
| `useSwipeBack` / gesture hooks | **Not built** | Need to create |

**Key insight: ~40% of the 10/10 gap is wiring existing components, not building new ones.**

---

## Restructure: Route Consolidation (do before sprints)

**9 routes are duplicates or dead-ends.** Eliminating them simplifies every sprint.

| Kill route | Redirect to | Reason |
|------------|-------------|--------|
| `/sell` | `/add-post` | Identical auth-gate, same intent |
| `/post_add` | `/add-post` | Alias |
| `/feed-post-add` | `/add-post?source=feed` | Alias with context |
| `/post-welcome` | `/add-post` (step 0 = welcome) | Fold into wizard |
| `/tiers` | `/tier-selection` | Alias |
| `/chats` | `/chat` | Alias |
| `/home` | `/all-posts` | Near-identical UI |
| `/listings` | `/all-posts?view=listings` | Same component, filter param |
| `/feed/:id` → keep but fix | — | Needs real detail page, not error |

**Result:** 69 → **60 unique pages** to perfect. Every deleted route is one fewer page to score.

**Implementation:** In router config, replace `<Route path="/sell" element={<Sell/>}/>` with `<Route path="/sell" element={<Navigate to="/add-post" replace/>}/>`. One file change.

---

## Phase A — Infrastructure Layer (lifts ALL 60 pages)

These are layout/shell/system changes that add points to every page at once.

### A1. Universal AppShell enforcement (app_shell: 0.73 → 1.0)

**Problem:** 33 pages score below 1.0. Four pages (reset-password, forgot-password, category-hub, root) score 0 — no shell at all.

**What exists:** `GreenNavbar` (top), bottom nav, `PageHeader`, `BreadcrumbsBar`. All already rendered in `AppShell` wrapper.

**What's broken:** Auth pages (`/login`, `/signup`, `/forgot-password`, `/reset-password`) render outside AppShell. Some pages use ad-hoc headers instead of `PageHeader`.

| Task | Change | Files |
|------|--------|-------|
| A1a | Wrap auth pages in a minimal `AuthShell` — branded top bar (Mhub logo, back arrow), no bottom nav, safe-area insets | `src/components/AuthShell.jsx` (new, ~40 lines), router config |
| A1b | Replace all ad-hoc `<div className="flex items-center...">` page headers with `<PageHeader title="" back actions={[]}/>` | ~10 page files |
| A1c | Ensure `GreenNavbar` renders on `/category-hub`, `/categories`, `/subcategories`, `/compare`, `/reviews` | Router layout nesting or per-page wrapper |
| A1d | Add `safe-area-inset-top` padding to every top bar variant | `src/index.css` (1 rule) |

**Points recovered:** 18.5 → 0 (all 69 pages hit app_shell=1)

### A2. Native gesture system (native_gestures: 0.50 → 1.0)

**Problem:** 65 pages below 1.0. Biggest single axis gap (34.5 points).

**What exists:** `usePullToRefresh` hook, `PullToRefreshWrapper` in AppShell, Capacitor `@capacitor/haptics` installed.

**What's missing:** Hook not connected to page-level `refetch()`, no swipe gestures, no haptics, no long-press, no swipe-to-dismiss.

| Task | Change | Files |
|------|--------|-------|
| A2a | **Wire `PullToRefreshWrapper` to React Query** — in each page that calls `useQuery()`, pass `refetch` up to the wrapper via a context or callback ref. When pull triggers, call `refetch()` + show spinner. | `src/components/PullToRefreshWrapper.jsx` + `src/context/RefreshContext.jsx` (new, ~20 lines) + ~35 page files (add 1-line `useRegisterRefresh(refetch)`) |
| A2b | **Swipe-back** — `useSwipeBack()` hook: detect left-edge touch (x < 20px), track horizontal delta, if > 80px → `navigate(-1)` with 200ms slide-out. Guard with `touch-action: pan-y`. | `src/hooks/useSwipeBack.js` (new, ~60 lines), mount in `AppShell` |
| A2c | **Haptic feedback** — `useHaptic()` wrapping `Haptics.impact({ style: 'light' })` from Capacitor. Call on: button tap, toggle, FAB press, long-press trigger, pull-to-refresh threshold. Fallback: `navigator.vibrate(10)` for PWA. | `src/hooks/useHaptic.js` (new, ~25 lines) + wire into `Button`, `FAB`, `Switch` components |
| A2d | **Long-press context menu** — on `PostCard`, `ListingCard`, `FeedCard`: 500ms hold → Radix `ContextMenu` with Share / Save / Report / Hide. Already have `@radix-ui/react-context-menu`. | `src/components/CardContextMenu.jsx` (new, ~50 lines) + wrap in 3 card components |
| A2e | **Swipe-to-dismiss** on notifications, chat messages, cart items — horizontal swipe > 120px → dismiss with `translateX` animation + undo toast. | `src/hooks/useSwipeToDismiss.js` (new, ~50 lines) + wire into 3 list components |

**Points recovered:** 34.5 → 0

### A3. Page transitions + micro-interactions (polish: 0.70 → 1.0)

**Problem:** 39 pages below 1.0 on polish (20.5 points).

**What exists:** `react-transition-group` installed, CSS variable `--theme-transition-duration: 240ms`, dark-mode transitions work.

| Task | Change | Files |
|------|--------|-------|
| A3a | **Route transitions** — wrap `<Routes>` in `<TransitionGroup>` + `<CSSTransition>`. Push = slide-from-right, pop = slide-from-left, replace = crossfade. Use `useNavigationType()` to detect. | `src/App.jsx` layout section, `src/index.css` (8 CSS classes) |
| A3b | **Button press scale** — `.active:scale-[0.97]` + `transition-transform 100ms` on all `<Button>` and `<button>` elements globally. | `src/index.css` (1 rule: `button:active { transform: scale(0.97) }`) |
| A3c | **Card tap ripple** — CSS-only ripple effect on `.card-interactive::after` pseudo-element. | `src/index.css` (~15 lines) |
| A3d | **Loading → content morph** — skeleton cards fade-dissolve into real cards via `opacity` + `translateY(4px)` transition. | `src/index.css` (`.skeleton-exit` class, ~8 lines) + wire in skeleton components |
| A3e | **Toggle spring** — `transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)` on Radix Switch thumb. | `src/components/ui/switch.jsx` (1 line change) |
| A3f | **Consistent radius/shadow audit** — set all cards to `--radius-card: 18px`, all buttons to `--radius-btn: 12px`. Remove `rounded-lg`, `rounded-md` overrides. | `src/index.css` (force rules) + grep-fix ~20 files |

**Points recovered:** 20.5 → 0

### A4. Typography + brand enforcement (typography: 0.83→1.0, brand: 0.72→1.0)

| Task | Change | Files |
|------|--------|-------|
| A4a | **Semantic type scale** — define in Tailwind config: `text-display` (24/28 Sora semibold), `text-heading` (18/24 Manrope semibold), `text-body` (14/20 Manrope normal), `text-caption` (12/16 Manrope medium muted). | `tailwind.config.js` (4 entries in `fontSize`) |
| A4b | **Replace ad-hoc sizes** — grep for `text-lg font-bold`, `text-xl font-semibold`, `text-sm text-gray` etc. and replace with semantic classes. | ~23 page files (1-3 class swaps each) |
| A4c | **Mhub logo in every TopBar** — add 24px SVG logo mark left of title in `GreenNavbar` and `AuthShell`. | `GreenNavbar.jsx`, `AuthShell.jsx` |
| A4d | **Brand color theming per route group** — auth pages = brand gradient, marketplace = primary, social = indigo, commerce = emerald, legal = slate. Apply as `data-route-group` attribute on `<main>`, use CSS `:has()` or class. | `src/App.jsx` (route-group mapper), `src/index.css` (5 color overrides) |
| A4e | **Auth-gate brand per route** — extend `AUTH_GATE_CONTENT` to cover ALL remaining 6 routes with unique icon, color, title, chips. | `src/components/RequireAuth.jsx` (6 entries) |
| A4f | **Error page branding** — `ErrorState` component gets Mhub logo, brand colors, contextual illustration per error type. | `src/components/ErrorState.jsx` redesign |

**Points recovered:** typography 11.5 + brand 19.0 = 30.5 → 0

---

## Phase B — Per-page Content Layer

### B1. Above-fold optimization (above_fold: 0.82 → 1.0)

21 pages score below 1.0 (12.5 points). Problem: dead whitespace, content pushed below viewport, auth-gates don't fill the fold.

| Task | Change | Pages fixed |
|------|--------|------------|
| B1a | **Auth-gate layout: full-viewport flex** — illustration (40vh) + message + CTA fills the viewport. No scroll needed to see action. | 18 auth-gate pages |
| B1b | **Error pages: center-viewport layout** — illustration + message + dual CTA vertically centered with `min-h-[calc(100vh-var(--top-nav-height)-var(--bottom-nav-height))]` | channel-detail, feed-detail, post-detail (error), listing-detail (error) |
| B1c | **Reset/forgot password: hero-first** — move branded illustration above form, kill top whitespace | reset-password, forgot-password |
| B1d | **Offers: full auth-gate with offer preview** — show sample offer cards behind auth blur | offers |

**Points recovered:** 12.5 → 0

### B2. Image/text balance (image_text_balance: 0.59 → 1.0)

48 pages below 1.0 (28.0 points). Biggest content gap.

| Task | Change | Pages fixed |
|------|--------|------------|
| B2a | **Auth-gate illustrations** — per-route SVG illustration (shopping bag, shield, chat bubble, document, gift, etc.) rendered above the gate text. Use lucide-react 64px icon inside 120px gradient circle. | All 24 auth-gated pages |
| B2b | **Error illustrations** — create 4 themed SVGs: `NetworkError` (cloud-off), `NotFound` (search-x), `Empty` (inbox), `Forbidden` (shield-off). 160px centered. | 6 error-state pages |
| B2c | **Card image fallback** — `SafeImage` / `SmartImage` already exist. Wire `onError` to show branded gradient + category lucide icon instead of gray box. Fix in `PostCard`, `ListingCard`, `CompactProductCard`. | all-posts, listings, my-posts, sold-posts, bought-posts, search results (~8 pages) |
| B2d | **Empty-state hero illustrations** — `EmptyState` component gets illustration prop. Add per-type illustrations: empty-cart (shopping-cart icon), empty-wishlist (heart), empty-search (search), empty-feed (rss), empty-reviews (star). | 8 empty list pages |
| B2e | **Data page visual ratio** — on profile, dashboard, analytics, my-home: add stat cards with colored icons, progress rings, or mini-charts to break up text. | 4 pages |
| B2f | **Centre/channel hero** — default cover image (gradient with building/users icon) when no real image uploaded. | centre-detail, centre-listings, channel-detail (3 pages) |
| B2g | **Legal pages: section icons** — add subtle icons per section heading (scale, shield, document, clock). | terms, privacy, refund, support-ticket (4 pages) |

**Points recovered:** 28.0 → 0

### B3. Sticky CTA on every page (sticky_cta: 0.57 → 1.0)

42 pages below 1.0 (30.0 points).

| Task | Change | Pages fixed |
|------|--------|------------|
| B3a | **Sticky auth-gate CTA** — `RequireAuth` renders Sign In button in a `position: sticky; bottom: var(--bottom-nav-height)` bar with glass blur. Always visible. | 24 auth-gated pages |
| B3b | **FAB system** — reusable `<FAB />` component. Add to: my-posts (+New), profile (Edit), my-home (+Add), channels (+New), centre (+New), reviews (+Write), compare (+Add Items). | 7 pages |
| B3c | **Contextual sticky CTAs** — per-page bottom bar: wishlist (Continue Shopping), sold-posts (List New), bought-posts (Browse), rewards (Earn Points), security (Run Checkup), account-delete (Delete Account — red), analytics (Export Report), cart (Checkout — already sticky, verify), recently-viewed (Clear All / Browse). | 9 pages |
| B3d | **Legal page sticky TOC** — floating "Back to top" pill + section jump dots on long legal pages. | terms, privacy, refund, support-ticket (4 pages) |
| B3e | **Notifications page CTA** — "Mark all read" sticky button when unread count > 0. | 1 page |
| B3f | **Feed/public-wall CTA** — floating "New Post" or "Scroll to top" pill when scrolled down > 2 viewports. | 2 pages |

**Points recovered:** 30.0 → 0

### B4. Empty states + loading (empty_state: 0.59 → 1.0)

45 pages below 1.0 (28.5 points).

| Task | Change | Pages fixed |
|------|--------|------------|
| B4a | **Wire existing skeletons** — `PostCardSkeleton` renders during `isLoading` on all-posts, listings, my-posts, sold-posts, bought-posts, feed, my-feed, public-wall, search, nearby, for-you. Just wrap `{isLoading ? <Skeleton/> : <RealContent/>}`. | 11 pages |
| B4b | **Profile/Dashboard skeleton** — `ProfileSkeleton` (avatar circle + 3 text bars + 2 stat rectangles). `DashboardSkeleton` (4 stat cards + chart area). | 2 new skeletons, 2 pages |
| B4c | **Smart empty state component** — `<SmartEmpty type="wishlist" />` renders: illustration + "Your wishlist is empty" + "Items you save will appear here" + primary CTA "Browse marketplace" + secondary "Learn about wishlists". Pre-define 12 types. | `SmartEmptyState.jsx` (new, ~100 lines with all types), wire into 12 pages |
| B4d | **"Recommended for you" on empty lists** — when wishlist/cart/recently-viewed is empty, fetch trending posts via `useRecommendations()` (hook already exists!) and show horizontal scroll of 4 cards. | 3 pages + `RecommendedFallback.jsx` (new, ~40 lines) |
| B4e | **Error ≠ empty** — analytics shows "refresh failed" = error, not empty. nearby shows "failed to load" = error. Use `ErrorState` with retry. Cart/wishlist show "no items" = empty, use `SmartEmpty`. Enforce the distinction everywhere. | audit 12 pages |
| B4f | **Auth-gate preview** — below the sign-in card, show a blurred/dimmed preview of what the page looks like when logged in (screenshot or skeleton mockup). Gives context for why to sign in. | RequireAuth.jsx — add `preview` slot per route, 6 post-lifecycle routes get create-form mockup |
| B4g | **KYC stepper completion** — add document thumbnail upload areas (camera icon boxes), selfie capture frame, progress percentage, countdown timer to review. Build on Wave 6 stepper. | KycVerification.jsx |

**Points recovered:** 28.5 → 0

### B5. Touch targets (touch_targets: 0.99 → 1.0)

Only 2 pages below 1.0 (1.0 points). Minor fix.

| Task | Change | Pages fixed |
|------|--------|------------|
| B5a | **Feed/my-feed touch audit** — check all interactive elements are ≥ 48dp. Likely issue: inline text links or small icon buttons. Add `min-h-12 min-w-12` to any small targets. | feed, my-feed |

**Points recovered:** 1.0 → 0

---

## Phase C — Page Rebuilds (the 10 worst pages)

These pages can't reach 10/10 with incremental fixes. They need structural redesigns.

### C1. Create Post Wizard (kills 6 routes at 4.5 → replaces with 1 at 10.0)

**Current:** `/add-post`, `/sell`, `/edit-post`, `/post_add`, `/feed-post-add`, `/post-welcome` — six routes showing the same generic auth gate. Score: 4.5 each.

**Redesign:** Single `/post/new` wizard.

```
Step 0: Welcome (what you'll sell — category picker grid)
Step 1: Photos (camera + gallery, drag to reorder, 10 max)
Step 2: Details (title, description, condition, category auto-filled)
Step 3: Pricing (price input, "Make Offer" toggle, delivery options)
Step 4: Preview (full PDP preview of your post)
Step 5: Publish (confirmation + share CTA + confetti animation)
```

**UX patterns copied from:** OLX "Sell", Facebook Marketplace "Create Listing", Mercari "List an item"

| Axis | How it hits 1.0 |
|------|----------------|
| app_shell | Top: "Create Listing" + step indicator. Bottom: "Next" / "Back" buttons. |
| above_fold | Each step fills viewport — no dead space |
| touch_targets | Large photo upload areas (80px), full-width inputs, 48dp buttons |
| typography | Step labels use `text-heading`, field labels use `text-body`, hints use `text-caption` |
| image_text_balance | Step 1 = full photo grid. Step 4 = full PDP preview. |
| sticky_cta | "Next" button sticky at bottom on every step |
| polish | Step transitions slide horizontally, photo upload has progress ring, publish has confetti |
| empty_state | Step 0 shows category cards (never empty). Photo step shows camera prompt illustration. |
| native_gestures | Swipe between steps, drag-to-reorder photos, pull-down to close |
| brand | Mhub branded progress bar, success illustration, share card |

**Files:** `src/pages/CreatePost/` (new directory): `index.jsx`, `StepPhotos.jsx`, `StepDetails.jsx`, `StepPricing.jsx`, `StepPreview.jsx`, `StepPublish.jsx` + router redirects for old routes.

### C2. Product Detail Page — PDP (4.0 → 10.0)

**Current:** 404 error because no test data. Even structurally, the page lacks a real PDP layout.

**Redesign:**

```
┌─────────────────────────┐
│ ← Back        ♡  ⋮     │ TopBar (transparent over image)
├─────────────────────────┤
│                         │
│   [Image Carousel]      │ Full-width, swipeable, dot indicators
│   ◉ ○ ○ ○               │ Pinch-to-zoom via ImageZoomModal (exists!)
│                         │
├─────────────────────────┤
│ ₹12,500    USED · GOOD  │ Price + condition badge
│ iPhone 13 128GB         │ Title
│ ★ 4.2 (12 reviews)     │ StarRating component (exists!)
├─────────────────────────┤
│ 📍 2.3km · Bachupally   │ Distance + location
├─────────────────────────┤
│ [Seller Card]           │ Avatar + name + trust score (exists!)
│ SellerTrustBadges ✓✓✓   │ SellerTrustBadges component (exists!)
├─────────────────────────┤
│ Description             │ ExpandableText component (exists!)
│ Specs table             │
├─────────────────────────┤
│ Similar Items ──────→   │ RecommendationCarousel (exists!)
├─────────────────────────┤
│ ┌──────────┐┌──────────┐│
│ │  Make     ││  Buy     ││ Sticky dual CTA
│ │  Offer    ││  Now     ││
│ └──────────┘└──────────┘│
└─────────────────────────┘
```

**Components to reuse:** `ImageGallery`, `ImageZoomModal`, `StarRating`, `SellerTrustBadges`, `ExpandableText`, `RecommendationCarousel`, `ShareButton`, `WishlistToggle`, `MakeOfferModal`, `PriceAlertButton`. **Most of the PDP already exists as components — they just need assembly.**

**Files:** Rewrite `src/pages/PostDetail.jsx` (~300 lines). Same pattern for `ListingDetail.jsx` (copy + adjust fields).

**Blocker:** Backend must serve real post data OR add client-side mock data layer.

### C3. Listing Detail (4.0 → 10.0)

Same structure as C2 but with listing-specific fields (specs table heavier, no "Make Offer", "Contact Seller" instead of "Buy Now"). Rewrite `src/pages/ListingDetail.jsx`.

### C4. KYC Verification (4.5 → 10.0)

**Current:** Stepper added in Wave 6 but still lacks document upload UI, selfie frame, real progress.

**Redesign:**

```
┌─────────────────────────┐
│ ← KYC Verification      │
├─────────────────────────┤
│ ● ─── ○ ─── ○           │ 3-step stepper
│ Documents  Selfie  Done  │
├─────────────────────────┤
│ ┌─────────┐ ┌─────────┐ │
│ │ 📄 Front │ │ 📄 Back  │ │ Document upload boxes (tap = camera)
│ │ Aadhaar  │ │ Aadhaar  │ │ Show thumbnail after capture
│ └─────────┘ └─────────┘ │
├─────────────────────────┤
│ ⏱ Review: ~24 hours     │ ETA card
├─────────────────────────┤
│ [Submit Documents]       │ Sticky CTA
└─────────────────────────┘
```

**Files:** Rewrite `src/pages/KYC/KycVerification.jsx`. Use existing `ImageUpload` component for document capture.

### C5. Channel Detail (4.5 → 10.0)

**Current:** Shows "Something went wrong" error. No real channel detail page.

**Redesign:** When data available → header image + channel name + member count + description + post feed + "Join Channel" sticky CTA. When error → branded error illustration (not generic) + retry + contextual message.

**Files:** Rewrite `src/pages/ChannelPage.jsx`.

### C6. Feed Detail (5.5 → 10.0)

**Current:** Shows "Post unavailable" error. Needs real detail view.

**Redesign:** Full post view — author card, content, image gallery, like/comment/share bar, comments thread, related posts. When error → "This post may have been removed" with branded illustration + "Browse Feed" CTA.

**Files:** Rewrite `src/pages/FeedPostDetail.jsx`.

---

## Phase D — The Last Mile (8.5+ → 10.0)

These pages are already good but need specific axis bumps to hit perfect 10.

### D1. Pages at 8.0–8.5 (gap: 1.5–2.0 each)

| Page | Score | Missing axes | Fix |
|------|-------|-------------|-----|
| tier-selection | 8.5 | _(gap is dashboard=8 axes, not listed)_ | Verify all axes at 1.0; likely just native_gestures |
| dashboard | 8.0 | _(not listed in gap output)_ | Add pull-to-refresh + verify |
| login | 8.0 | app_shell=0.5, native_gestures=0.5 | Add `AuthShell` (A1a), add swipe-back (A2b) |
| signup | 8.0 | app_shell=0.5, native_gestures=0.5 | Same as login |
| payment | 8.0 | native_gestures=0.5 | Add haptic on payment confirm, swipe-back |
| terms | 8.0 | sticky_cta=0.5, native_gestures=0.5 | Sticky TOC (B3d), swipe-back |
| privacy-policy | 8.0 | sticky_cta=0.5, native_gestures=0.5 | Same as terms |
| support-ticket-policy | 8.0 | app_shell=0.5, image_text_balance=0.5, sticky_cta=0.5, native_gestures=0.5 | AppShell (A1), section icons (B2g), TOC (B3d), gestures (A2) |

### D2. Pages at 7.0–7.9 (gap: 2.0–3.0 each)

All 19 pages in this bucket need the infrastructure from Phase A (gestures, polish, brand) plus 1-2 per-page content fixes from Phase B.

| Page | Score | Primary fix needed |
|------|-------|--------------------|
| category-hub | 7.0 | AppShell (A1), sticky CTA (B3) |
| root | 7.0 | AppShell (A1), sticky CTA (B3) |
| notifications | 7.0 | image balance (B2), sticky CTA "Mark all read" (B3e), empty state (B4) |
| feed | 7.0 | above_fold (B1), touch targets (B5a), sticky CTA (B3f), gestures (A2) |
| public-wall | 7.0 | AppShell (A1), above_fold (B1), sticky CTA (B3f), empty state (B4), gestures (A2) |
| my-feed | 7.0 | touch targets (B5a), image balance (B2), polish (A3), gestures (A2) |
| activity | 7.0 | AppShell (A1), image balance (B2), sticky CTA (B3), polish (A3), gestures (A2) |
| compare | 7.0 | AppShell (A1), above_fold (B1), image balance (B2), polish (A3), gestures (A2), brand (A4) |
| home | 7.5 | image balance (B2), empty state (B4), gestures (A2) |
| for-you | 7.5 | gestures only (A2) — almost done! |
| cart | 7.5 | sticky CTA verify (B3), gestures (A2) |
| recently-viewed | 7.5 | sticky CTA (B3c), gestures (A2) |
| pricing | 7.5 | sticky CTA (B3), gestures (A2) |
| channels-create | 7.5 | sticky CTA (B3), gestures (A2) |
| refund-policy | 7.5 | sticky TOC (B3d), gestures (A2) |
| invite | 7.5 | AppShell (A1/AuthShell), typography (A4), polish (A3), gestures (A2), brand (A4) |
| categories | 7.5 | AppShell (A1), image balance (B2), sticky CTA (B3), empty state (B4), gestures (A2), brand (A4) |
| subcategories | 7.5 | Same as categories |
| reviews | 7.5 | AppShell (A1), sticky CTA "Write Review" (B3b), empty state (B4), gestures (A2), brand (A4) |

---

## Execution Order (optimized for max lift per change)

```
┌──────────────────────────────────────────────────────────────┐
│ PHASE 0: ROUTE CONSOLIDATION (1 file, kills 9 routes)       │
│ 69 pages → 60 pages. Instantly removes 9 low-scoring pages. │
│ Projected lift: 6.31 → 6.80 (just by dropping dead weight)  │
├──────────────────────────────────────────────────────────────┤
│ PHASE A: INFRASTRUCTURE (5-8 files, lifts ALL 60 pages)     │
│                                                              │
│ A2 Native gestures   ████████████████████████ 34.5 pts (1st)│
│ A1 AppShell           ██████████ 18.5 pts                    │
│ A3 Polish/transitions ██████████ 20.5 pts                    │
│ A4 Typography+brand   ████████████████ 30.5 pts              │
│                                                              │
│ Projected: 6.80 → 8.50                                      │
├──────────────────────────────────────────────────────────────┤
│ PHASE B: PER-PAGE CONTENT (40+ page files)                   │
│                                                              │
│ B3 Sticky CTAs        ████████████████ 30.0 pts (biggest)    │
│ B4 Empty states       ██████████████ 28.5 pts                │
│ B2 Image/text balance ██████████████ 28.0 pts                │
│ B1 Above fold         ██████ 12.5 pts                        │
│ B5 Touch targets      █ 1.0 pts                              │
│                                                              │
│ Projected: 8.50 → 9.50                                       │
├──────────────────────────────────────────────────────────────┤
│ PHASE C: PAGE REBUILDS (6 page files)                        │
│                                                              │
│ C1 CreatePost wizard  (6 routes → 1, +5.5 each = +33.0)     │
│ C2 PostDetail PDP     (+6.0)                                 │
│ C3 ListingDetail      (+6.0)                                 │
│ C4 KYC                (+5.5)                                 │
│ C5 ChannelDetail      (+5.5)                                 │
│ C6 FeedDetail         (+4.5)                                 │
│                                                              │
│ Projected: 9.50 → 9.85                                       │
├──────────────────────────────────────────────────────────────┤
│ PHASE D: LAST MILE (per-page tweaks)                         │
│                                                              │
│ D1 8.0+ pages — axis-specific fixes                          │
│ D2 7.0+ pages — verify Phase A covered them                  │
│                                                              │
│ Projected: 9.85 → 10.0                                       │
└──────────────────────────────────────────────────────────────┘
```

---

## Files changed — full inventory

### New files (14)

| File | Purpose | Sprint |
|------|---------|--------|
| `src/components/AuthShell.jsx` | Minimal branded shell for auth pages | A1 |
| `src/context/RefreshContext.jsx` | Pass page-level `refetch()` up to PullToRefreshWrapper | A2 |
| `src/hooks/useSwipeBack.js` | Left-edge swipe → navigate(-1) | A2 |
| `src/hooks/useHaptic.js` | Capacitor haptics wrapper | A2 |
| `src/hooks/useSwipeToDismiss.js` | Horizontal swipe → dismiss list item | A2 |
| `src/components/CardContextMenu.jsx` | Long-press context menu for cards | A2 |
| `src/components/SmartEmptyState.jsx` | Typed empty states with illustrations + CTAs | B4 |
| `src/components/RecommendedFallback.jsx` | Trending posts on empty lists | B4 |
| `src/components/FAB.jsx` | Reusable floating action button | B3 |
| `src/pages/CreatePost/index.jsx` | Post creation wizard shell | C1 |
| `src/pages/CreatePost/StepPhotos.jsx` | Photo upload step | C1 |
| `src/pages/CreatePost/StepDetails.jsx` | Details form step | C1 |
| `src/pages/CreatePost/StepPricing.jsx` | Pricing step | C1 |
| `src/pages/CreatePost/StepPreview.jsx` | Preview step | C1 |

### Modified files (~55)

| Category | Files | Sprint |
|----------|-------|--------|
| Router config | 1 (App.jsx) | Phase 0, A1, A3 |
| Global CSS | 1 (index.css) | A1, A3, A4 |
| Tailwind config | 1 (tailwind.config.js) | A4 |
| Layout components | 3 (GreenNavbar, PullToRefreshWrapper, AppShell) | A1, A2 |
| UI primitives | 3 (Button, Switch, Card) | A2, A3 |
| Card components | 3 (PostCard, ListingCard, FeedCard) | A2, B2 |
| Feature components | 4 (RequireAuth, ErrorState, EmptyState, PageHeader) | A4, B1, B2, B4 |
| Page files (wire refetch) | ~35 pages (1-line hook add) | A2 |
| Page files (content fixes) | ~25 pages (per-page CTA, empty state, above-fold) | B1-B5 |
| Page rebuilds | 6 (PostDetail, ListingDetail, KycVerification, ChannelPage, FeedPostDetail, + CreatePost) | C1-C6 |

---

## Measurement gates

| Gate | Trigger | Pass criteria |
|------|---------|--------------|
| G0 | After route consolidation | 60 pages remain, no 404s, old URLs redirect |
| G1 | After Phase A | Re-rate 10 sample pages → all score ≥ 8.0 on infra axes (app_shell, native_gestures, polish, typography, brand) |
| G2 | After Phase B | Re-rate all 60 pages → avg ≥ 9.0, no page below 7.5 |
| G3 | After Phase C | Re-rate rebuilt pages → all 6 score ≥ 9.5 |
| G4 | After Phase D | Full 60-page re-rate → avg = 10.0, every page = 10.0 |

**Measurement method:** `node _phase_screenshot.cjs 1-4` → view screenshots → re-rate on 10 axes → append to `ratings.jsonl` with `phase: "post-GATE"`.

---

## Dependencies & blockers

| Blocker | Severity | Affects | Resolution |
|---------|----------|---------|------------|
| Backend API offline | **CRITICAL** | C2, C3 (PDP needs data), C5, C6, screenshots | Fix DNS for `api.mhub.ink` OR implement `src/mocks/` with MSW (Mock Service Worker) for offline dev |
| No test post/listing data | **HIGH** | C2, C3 PDP render | Seed via API or add `__DEV_FIXTURES__` in client |
| Capacitor haptics needs native build | **MEDIUM** | A2c on real device | PWA fallback: `navigator.vibrate(10)`. Full haptics only on APK. |
| `framer-motion` not installed | **LOW** | Could enhance A3 transitions | Not needed — `react-transition-group` already installed + CSS transitions sufficient |
| 6 auth-gates still generic | **LOW** | A4e | 6 entries in `AUTH_GATE_CONTENT` map — trivial |

---

## Summary: effort vs outcome

| Phase | New files | Modified files | Points recovered | Time estimate signal |
|-------|-----------|---------------|-----------------|---------------------|
| Phase 0 (routes) | 0 | 1 | ~34 (via avg lift) | Smallest change, biggest ratio |
| Phase A (infra) | 6 | ~45 | 103.5 | Highest leverage — 1 hook change touches 60 pages |
| Phase B (content) | 3 | ~25 | 100.0 | Per-page grind but uses existing components |
| Phase C (rebuilds) | 5 | 6 | ~60.5 | Hardest work — full page redesigns |
| Phase D (last mile) | 0 | ~20 | ~10.5 | Verification + micro-tweaks |
| **Total** | **14** | **~55** | **254.5** | — |
