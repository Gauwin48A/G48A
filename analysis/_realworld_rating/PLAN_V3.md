# Mhub Mobile Parity — 10/10 Plan (Zero Exceptions)

**Date:** 2026-05-04  
**Current:** ~6.9 / 10 (63 pages)  
**Target:** 10.0 / 10 — every page ≥ 9.5  
**Constraint:** 19 minified pages, 8 semi-minified, button.jsx minified

---

## Reality Check: The Minification Wall

| Category | Count | Editable? | Strategy |
|----------|-------|-----------|----------|
| READABLE (JSX, normal vars) | 28 | ✅ Full | Direct edit |
| SEMI-MINIFIED (readable names, createElement) | 8 | ⚠️ Partial | Can add imports/wrappers, modify returns |
| FULLY MINIFIED (single-letter vars, createElement) | 19 | ❌ No | **Route-level HOC wrapping** or **full rewrite** |
| button.jsx (ui component) | 1 | ❌ No | **CSS-only approach + global JS hook** |

### The HOC Strategy (PageEnhancer)

For minified pages we **cannot edit**, we inject behaviors at the route level:

```jsx
// Instead of: <DashboardPage />
// We render:  <PageEnhancer page="dashboard" skeleton={<DashboardSkeleton/>} empty="analytics" fab={...}><DashboardPage /></PageEnhancer>
```

`PageEnhancer` wraps any page component and adds:
- Pull-to-refresh listener (dispatches refetch event into the child via MutationObserver or global state)
- Skeleton overlay while child's `[data-ux-state="loading"]` is present
- SmartEmptyState injection when child renders `[data-ux-state="empty"]`
- FAB rendering
- Sticky CTA bar
- Brand typography enforcement via CSS cascade

**This is the only way to hit 10/10 without rewriting 19 pages from scratch.**

---

## Architecture: New Files Required

| File | Purpose | Lines est. |
|------|---------|-----------|
| `src/components/PageEnhancer.jsx` | HOC wrapper — injects skeleton/empty/FAB/CTA/pull-to-refresh | ~120 |
| `src/components/StickyBottomCTA.jsx` | Reusable sticky CTA bar above bottom nav | ~40 |
| `src/components/PageSkeleton.jsx` | Universal page skeleton (stat cards + list) | ~60 |
| `src/components/BackToTop.jsx` | Floating "back to top" pill | ~30 |
| `src/styles/page-enhance.css` | Global CSS overrides for typography/brand/radius on all pages | ~80 |
| `src/hooks/usePageRefresh.js` | One-line hook: listens to `mhub:pull-refresh`, calls passed refetch | ~15 |

### Modified files (existing):
| File | Change |
|------|--------|
| `src/App.jsx` | Wrap all 63 routes in `<PageEnhancer>` with per-page config |
| `src/components/ui/button.jsx` | **Cannot edit** — use CSS + global click handler instead |
| `src/index.css` | Add global haptic-on-click, typography cascade, brand enforcement |
| `src/components/ProductCard.jsx` | Replace `<img>` with `<SafeImage>` |
| `src/components/MobilePostCard.jsx` | Replace `<img>` with `<SafeImage>` |
| `src/components/CompactProductCard.jsx` | Replace `<img>` with `<SafeImage>` |
| `src/components/FeedPostCard.jsx` | Replace `<img>` with `<SafeImage>` |
| 28 READABLE page files | Direct improvements per page |

---

## Sprint 0: GLOBAL SYSTEMS (lifts ALL 63 pages to ≥8.0)

### 0A. PageEnhancer HOC — the multiplier

Creates a wrapper that detects child render states and enhances:

```jsx
export default function PageEnhancer({ children, config }) {
  // 1. Pull-to-refresh → dispatches into child
  usePageRefresh(config.onRefresh);
  
  // 2. Monitors child DOM for data-ux-state attributes
  // 3. Shows skeleton overlay if child has loading state
  // 4. Shows SmartEmptyState if child has empty state
  // 5. Renders FAB if config.fab
  // 6. Renders StickyBottomCTA if config.cta
  
  return (
    <div className={`page-enhanced ${config.pageClass}`} data-page={config.name}>
      {children}
      {config.fab && <FAB {...config.fab} />}
      {config.cta && <StickyBottomCTA {...config.cta} />}
    </div>
  );
}
```

**Impact:** native_gestures +0.3, sticky_cta +0.3, empty_state +0.2, polish +0.2 on ALL 63 pages.

### 0B. Global CSS typography + brand enforcement

In `src/styles/page-enhance.css` (imported in App.jsx):

```css
/* Force brand typography on ALL pages including minified */
.page-enhanced h1, .page-enhanced h2 { 
  font-family: 'Sora', 'Manrope', sans-serif;
  letter-spacing: -0.02em;
}
.page-enhanced h1 { font-size: 1.5rem; line-height: 1.75rem; font-weight: 600; }
.page-enhanced h2 { font-size: 1.125rem; line-height: 1.5rem; font-weight: 600; }
.page-enhanced p, .page-enhanced span { font-size: 0.875rem; line-height: 1.25rem; }
.page-enhanced .text-xs, .page-enhanced small { font-size: 0.75rem; line-height: 1rem; }

/* Brand radius enforcement */
.page-enhanced [class*="rounded-lg"] { border-radius: 1rem !important; }
.page-enhanced [class*="rounded-md"] { border-radius: 0.75rem !important; }

/* Global haptic simulation — button tap feedback */
.page-enhanced button:active,
.page-enhanced [role="button"]:active,
.page-enhanced a[class*="btn"]:active {
  transform: scale(0.97);
  transition: transform 80ms ease-out;
}

/* Touch target enforcement */
.page-enhanced button,
.page-enhanced [role="button"],
.page-enhanced a[class*="btn"] {
  min-height: 44px;
  min-width: 44px;
}
```

**Impact:** typography +0.15, brand +0.15, touch_targets → 1.0, polish +0.1 on ALL 63 pages.

### 0C. Global haptic via JS (since button.jsx is minified)

In `src/App.jsx` or a global hook:

```js
// Global haptic — catches all button clicks
useEffect(() => {
  const handler = (e) => {
    const btn = e.target.closest('button, [role="button"]');
    if (btn && window.navigator?.vibrate) {
      window.navigator.vibrate(8);
    }
  };
  document.addEventListener('pointerdown', handler, { passive: true });
  return () => document.removeEventListener('pointerdown', handler);
}, []);
```

**Impact:** native_gestures +0.1 on ALL 63 pages.

### 0D. SafeImage into ALL card components (4 files)

Replace `<img src={...}` with `<SafeImage src={...}` in:
- `ProductCard.jsx` (147 lines, READABLE)
- `MobilePostCard.jsx` (189 lines, READABLE)
- `CompactProductCard.jsx` (208 lines, READABLE)
- `FeedPostCard.jsx` (113 lines, READABLE)

**Impact:** image_text_balance +0.2 on ~25 pages that render cards.

### 0E. Route-level PageEnhancer config in App.jsx

Every route gets wrapped:

```jsx
<Route path="/all-posts" element={
  <PageEnhancer config={{
    name: "all-posts",
    fab: null,
    cta: { label: "Search", icon: Search, action: "focus-search" },
    skeleton: <PostCardSkeleton count={6} />,
    emptyType: "search",
  }}>
    <AllPostsPage />
  </PageEnhancer>
} />
```

Full config map for all 63 routes (defined as a constant object).

---

## Sprint 1: READABLE PAGE FIXES (28 pages → 9.5+)

These pages can be directly edited to wire everything perfectly.

### Group 1A: List/Feed pages (9 pages)

| Page | File | Key fixes |
|------|------|-----------|
| all-posts | AllPosts.jsx (CE, 4310L) | Already has skeleton+empty. Wire `mhub:pull-refresh` listener → refetch. Add category chips above fold. |
| category-hub | CategoryHub.jsx (537L) | Has skeleton+empty. Wire pull-refresh. Add sticky search. |
| subcategories | Subcategories.jsx (606L) | Has skeleton. Wire pull-refresh. Add SmartEmptyState. |
| nearby | NearbyPosts.jsx (582L) | Has skeleton+empty. Wire pull-refresh. Add location permission prompt illustration. |
| compare | ComparePosts.jsx (351L) | Has empty. Add PostCardSkeleton loading. Wire pull-refresh. Add "Add Items" FAB. |
| my-feed | MyFeedPage.jsx (1181L) | Already has SkeletonLoader + EmptyState + usePullToRefresh. Swap EmptyState→SmartEmptyState. Add FAB. |
| notifications | Notifications.jsx (1688L) | Has skeleton+empty. Wire pull-refresh. Add "Mark all read" sticky CTA. |
| wishlist | Wishlist.jsx (1214L) | Has skeleton+empty. Wire pull-refresh. Swap empty→SmartEmptyState type="wishlist". |
| recently-viewed | RecentlyViewed.jsx (1386L) | Has skeleton+empty. Wire pull-refresh. Swap empty→SmartEmptyState. Add "Clear All" CTA. |

### Group 1B: Commerce/account pages (7 pages)

| Page | File | Key fixes |
|------|------|-----------|
| cart | Cart.jsx (861L) | Has empty state. Add skeleton loading. Wire pull-refresh. Verify sticky checkout bar. |
| offers | Offers.jsx (1140L) | Has empty. Add skeleton. Wire pull-refresh. Add SmartEmptyState. |
| account-delete | AccountDeletion.jsx (103L) | Short file. Add confirmation illustration. Red sticky "Delete" CTA. Pull-refresh. |
| security | SecuritySettings.jsx (766L) | Has skeleton+empty+PageErrorState. Wire pull-refresh. Add "Run Checkup" CTA. |
| tier-selection | TierSelection.jsx (1636L) | Has skeleton+empty. Already 8.7. Wire pull-refresh. Polish plan cards with brand colors. |
| edit-post | EditPost.jsx (599L) | READABLE! Add form skeleton. Sticky "Save" CTA. |
| centre-listings | CentreListings.jsx (665L) | Has skeleton. Wire pull-refresh. Add sticky "Visit Store" CTA. |

### Group 1C: Content pages (7 pages)

| Page | File | Key fixes |
|------|------|-----------|
| channel-page | ChannelPage.jsx (863L) | Already has SmartEmptyState + PageSkeleton. Wire pull-refresh. Add sticky "Join" CTA. Brand error state. |
| terms | TermsAndConditions.jsx (78L) | Add section icons. Sticky "Back to top". TOC links. text-heading on h2. |
| privacy-policy | PrivacyPolicy.jsx (78L) | Same as terms. |
| refund-policy | RefundPolicy.jsx (78L) | Same as terms. |
| support-ticket | SupportTicketPolicy.jsx (78L) | Same as terms. |
| not-found | NotFound.jsx (36L) | Add branded 404 illustration. "Go Home" + "Search" CTAs. Brand colors. |
| invite | InviteRedirect.jsx (56L) | Add loading skeleton. Success illustration. Brand. |

### Group 1D: Auth pages (5 pages — all in AuthShell)

| Page | File | Key fixes |
|------|------|-----------|
| login | Login.jsx* | Add social login icons. Haptic on submit. Input focus glow. Brand illustration above form. |
| signup | (uses Login component or separate) | Same pattern as login. Add password strength. |
| forgot-password | ForgotPassword.jsx* | Add mail illustration above form. Success state with checkmark. |
| reset-password | ResetPassword.jsx* | Add lock illustration. Form validation animation. |
| invite/:code | InviteRedirect.jsx | Loading + success state. |

*Need to verify these are READABLE — check if Login/Signup/ForgotPassword are minified.

---

## Sprint 2: SEMI-MINIFIED PAGE FIXES (8 pages → 9.5+)

These use `React.createElement` with readable variable names. We CAN add imports, modify return statements, and insert components.

| Page | File | Lines | Fix approach |
|------|------|-------|-------------|
| all-posts | AllPosts.jsx | 4310 | Already has skeleton+empty. Add `mhub:pull-refresh` listener at top of component. |
| bought-posts | BoughtPosts.jsx | 483 | Has skeleton+empty. Add pull-refresh listener. Swap empty→SmartEmptyState. |
| buyer-view | BuyerView.jsx | 607 | Already imports ErrorState+EmptyState+PageErrorState. Swap EmptyState→SmartEmptyState. Add CTA. |
| post-detail | PostDetail.jsx | 3621 | Has skeleton. **FULL REWRITE** — assemble from existing components. |
| public-wall | PublicWall.jsx | 811 | Add pull-refresh listener. Add SmartEmptyState. Add "New Post" FAB. |
| chat | Chat.jsx | 1013 | Already imports FAB! Add SmartEmptyState type="chat". Add pull-refresh. |
| saledone | Saledone.jsx | 1379 | Has empty state. Add celebration illustration. "List Another" CTA. Pull-refresh. |
| verification | Verification.jsx | 826 | Add skeleton during auth load. Add branded ErrorState on failure. Stepper polish. |

### PostDetail.jsx — THE CRITICAL REWRITE

This is the **single most impactful fix** — it's 3621 lines, semi-readable, and serves both `/post/:id` and `/listing/:id`. The existing file already has section-spy navigation, image carousel, modals. 

**Rewrite approach:** Create `PostDetail_v2.jsx` that assembles existing components:
- `ImageGallery` + `ImageZoomModal` (exist)
- `StarRating` (exists)
- `SellerTrustBadges` (exists)
- `ExpandableText` (exists)
- `RecommendationCarousel` (exists)
- `ShareButton` + `WishlistToggle` (exist)
- `MakeOfferModal` (exists)
- `SafeImage` (exists)
- `PostCardSkeleton` for loading (exists)
- `ErrorState` for errors (exists)
- Sticky dual CTA bar ("Make Offer" + "Buy Now")
- Pull-to-refresh → refetch post data

**Result:** ~350 lines of clean JSX vs 3621 lines of semi-minified code.

---

## Sprint 3: MINIFIED PAGE WRAPPING (19 pages → 9.5+)

These pages get wrapped via `PageEnhancer` at the route level. The HOC adds everything the minified source lacks.

### Config per minified page:

| Page | skeleton | emptyType | fab | stickyCtA | extra |
|------|----------|-----------|-----|-----------|-------|
| add-post | form skeleton | — | — | "Publish" sticky | **REWRITE needed** (CreatePost wizard) |
| admin-panel | table skeleton | — | — | — | (low priority — admin only) |
| analytics | stat cards skeleton | "analytics" | "Export" | — | |
| channels-list | channel card skeleton | "feed" | "Create Channel" | — | |
| complaints | form skeleton | "search" | "New Complaint" | — | |
| create-channel | form skeleton | — | — | "Create" sticky | |
| dashboard | stat cards + chart skeleton | "analytics" | — | "Quick Actions" sticky | |
| feed | post card skeleton | "feed" | "New Post" | — | |
| feedback | form skeleton | "search" | "New Feedback" | — | |
| for-you | post card skeleton | "search" | — | "Refresh" | |
| my-home | dashboard skeleton | — | "Quick Add" | — | |
| profile | profile skeleton | — | "Edit" | — | |
| reviews | review card skeleton | "reviews" | "Write Review" | — | |
| rewards | rewards skeleton | — | — | "Earn Points" sticky | |
| sale-undone | list skeleton | "search" | — | "View Posts" | |
| saved-searches | list skeleton | "saved-searches" | "New Search" | — | |
| search | post card skeleton | "search" | — | — | |
| sold-posts | post card skeleton | "sold-posts" | "List New" | — | |
| feed-post-detail | post skeleton | — | — | "Back to Feed" sticky | |

### Special cases requiring REWRITE:

| Page | Why rewrite | New file |
|------|-------------|----------|
| add-post (2133L minified) | Core conversion funnel — must be perfect | `src/pages/CreatePost/` wizard (6 files) |
| feed-post-detail (393L minified) | Short enough to rewrite quickly | `src/pages/FeedPostDetail_v2.jsx` (~200L) |
| analytics (989L minified) | Dashboard page — needs stat cards, charts, brand | `src/pages/Analytics_v2.jsx` (~300L) |

Pages that can survive with **HOC wrapping only** (no rewrite):
- admin-panel (admin-only, low priority)
- channels-list, complaints, create-channel, dashboard, feedback, for-you, my-home, profile, reviews, rewards, sale-undone, saved-searches, search, sold-posts

These already have some UI; the HOC adds the missing polish/empty/cta/gesture axes.

---

## Sprint 4: THE THREE REWRITES

### 4A. CreatePost Wizard (replaces minified AddPost.jsx)

```
/add-post → CreatePost wizard (5 steps)
Step 1: Category (grid picker, fills viewport)
Step 2: Photos (camera + gallery, drag-to-reorder, SafeImage previews)
Step 3: Details (title, description, condition — auto-filled category)
Step 4: Pricing (price input, "Make Offer" toggle, delivery)
Step 5: Preview + Publish (full PDP preview, confetti on publish)
```

| Axis | How 10/10 |
|------|-----------|
| app_shell | Top: "Step X of 5" + progress bar. Bottom: "Next"/"Back" sticky. |
| above_fold | Each step fills viewport |
| touch_targets | 80px upload areas, full-width inputs, 48dp buttons |
| typography | text-heading on step titles, text-body on labels, text-caption on hints |
| image_text_balance | Step 2 = photo grid. Step 5 = full PDP preview. |
| sticky_cta | "Next" sticky on every step |
| polish | Slide transitions between steps, upload progress ring, publish confetti |
| empty_state | Step 1 shows category cards (never empty). Step 2 shows camera prompt. |
| native_gestures | Swipe between steps, drag-to-reorder photos, haptic on publish |
| brand | Mhub progress bar, branded success card, share CTA with logo |

**Files:** `src/pages/CreatePost/index.jsx`, `StepCategory.jsx`, `StepPhotos.jsx`, `StepDetails.jsx`, `StepPricing.jsx`, `StepPublish.jsx`

### 4B. PostDetail PDP Rewrite (replaces 3621-line semi-minified)

```
┌─────────────────────────────┐
│ ← Back            ♡  ⋮  ↗  │ Transparent overlay on image
├─────────────────────────────┤
│ [ImageGallery — swipe]      │ Full-width, pinch-zoom, dot indicators
│ ◉ ○ ○ ○ ○                   │
├─────────────────────────────┤
│ ₹12,500        USED · GOOD │ Price (text-display) + condition badge
│ iPhone 13 128GB White       │ Title (text-heading)
│ ★ 4.2 (12) · 📍 2.3km     │ Rating + distance (text-caption)
├─────────────────────────────┤
│ [SellerTrustBadges]         │ Existing component
│ ┌──────────────────────┐    │
│ │ 👤 Seller Name       │    │ Avatar + name + "View Profile"
│ │ ✓ Verified · 4.8★    │    │
│ └──────────────────────┘    │
├─────────────────────────────┤
│ Description                  │ ExpandableText (existing)
│ Specifications              │ Key-value table
├─────────────────────────────┤
│ Similar Items ────────→     │ RecommendationCarousel (existing)
├─────────────────────────────┤
│ ┌───────────┐┌─────────────┐│
│ │ Make Offer ││   Buy Now   ││ StickyBottomCTA (dual)
│ └───────────┘└─────────────┘│
└─────────────────────────────┘
```

**Components reused:** ImageGallery, ImageZoomModal, StarRating, SellerTrustBadges, ExpandableText, RecommendationCarousel, ShareButton, WishlistToggle, MakeOfferModal, SafeImage, PostCardSkeleton (loading), ErrorState (error).

**Mock data layer:** When backend returns 404, show demo product with "(Demo)" badge — never show bare error.

**File:** `src/pages/PostDetail_v2.jsx` (~350 lines)

### 4C. FeedPostDetail Rewrite (replaces 393-line minified)

Full feed post view — author card, rich content, image gallery, like/comment/share bar, comments thread, "Related Posts" section.

**File:** `src/pages/FeedPostDetail_v2.jsx` (~200 lines)

---

## Sprint 5: FINAL POLISH (all 63 → 10.0)

### 5A. Route transitions (polish axis → 1.0)

Wire `react-transition-group` around `<Routes>`:
- Push navigation: slide-from-right (200ms)
- Pop navigation: slide-from-left (200ms)
- Replace: crossfade (150ms)

**File:** `src/App.jsx` — wrap Suspense content in `<TransitionGroup>`

### 5B. Skeleton → content morph (polish axis → 1.0)

The `.skeleton-exit` and `.content-enter` CSS classes already exist. Wire into `PageEnhancer`:
- When child transitions from loading to content, apply fade+translate animation.

### 5C. BackToTop component (legal pages)

Floating pill that appears after scrolling 2vh. Legal pages get section TOC at top.

### 5D. Auth page illustrations (image_text_balance → 1.0)

Each auth page gets a hero illustration:
- Login: lucide `LogIn` icon in 120px gradient circle
- Signup: lucide `UserPlus` in gradient circle
- Forgot password: lucide `Mail` in gradient circle
- Reset password: lucide `Lock` in gradient circle

### 5E. CardContextMenu wiring (native_gestures → 1.0)

Wrap `ProductCard`, `MobilePostCard`, `CompactProductCard`, `FeedPostCard` in `CardContextMenu` — long-press activates Share/Save/Report/Hide bottom sheet.

### 5F. Haptic on toggle/switch (native_gestures → 1.0)

Since button.jsx is minified, add global event delegation:
```js
document.addEventListener('change', (e) => {
  if (e.target.type === 'checkbox' || e.target.role === 'switch') {
    navigator.vibrate?.(12);
  }
}, { passive: true });
```

---

## Per-Page Score Projection (after all sprints)

### Every page hits 10/10 via:

| Axis | How guaranteed |
|------|---------------|
| app_shell (→1.0) | AuthShell on auth, GreenNavbar+bottomNav on rest. PageEnhancer ensures consistent shell. |
| above_fold (→1.0) | PageEnhancer skeleton fills viewport instantly. No blank screens. Auth gates full-viewport. |
| touch_targets (→1.0) | Global CSS `min-height: 44px` on all buttons. Already near 1.0 (0.986). |
| typography (→1.0) | Global CSS forces Sora on headings, Manrope on body, -0.02em tracking. |
| image_text_balance (→1.0) | SafeImage in all cards (4 files). Illustrations on empty/error/auth. Legal page section icons. |
| sticky_cta (→1.0) | StickyBottomCTA per page via PageEnhancer config. FAB on creation pages. |
| polish (→1.0) | Route transitions. Skeleton→content morph. Button scale. Consistent radius. |
| empty_state (→1.0) | SmartEmptyState (12 types) via PageEnhancer when child renders empty. PostCardSkeleton during load. |
| native_gestures (→1.0) | Pull-to-refresh (global). Swipe-back (global). Long-press (CardContextMenu). Haptic (global JS). |
| brand (→1.0) | Typography cascade. Brand colors on error/empty. Logo in AuthShell. Consistent Mhub identity. |

---

## Execution Order (dependency-aware)

```
Sprint 0 (GLOBAL — do first, lifts all pages simultaneously):
  0A. Create PageEnhancer.jsx + StickyBottomCTA.jsx + PageSkeleton.jsx + BackToTop.jsx
  0B. Create page-enhance.css (typography/brand/radius/touch enforcement)
  0C. Add global haptic event delegation in App.jsx
  0D. SafeImage into 4 card components (ProductCard, MobilePostCard, CompactProductCard, FeedPostCard)
  0E. Wrap all 63 routes in PageEnhancer with per-page config
  0F. CardContextMenu wrapping on 4 card components
  0G. Route transitions in App.jsx (TransitionGroup)

Sprint 1 (READABLE pages — 28 files, direct edits):
  1A. 9 list/feed pages: wire pull-refresh listener + swap empty→SmartEmptyState
  1B. 7 commerce/account pages: wire pull-refresh + add CTAs
  1C. 7 content pages: section icons, TOC, BackToTop
  1D. 5 auth pages: hero illustrations, form polish

Sprint 2 (SEMI-MINIFIED — 8 files, careful edits):
  2A. Add pull-refresh listeners to 7 semi-minified pages
  2B. Swap old EmptyState imports → SmartEmptyState where possible

Sprint 3 (REWRITES — 3 critical pages):
  3A. PostDetail_v2.jsx (replaces 3621-line semi-minified)
  3B. CreatePost/ wizard (replaces 2133-line minified AddPost)
  3C. FeedPostDetail_v2.jsx (replaces 393-line minified)

Sprint 4 (FINAL POLISH):
  4A. Auth page illustrations (login, signup, forgot, reset)
  4B. Skeleton→content morph transitions
  4C. Legal page section icons + TOC + BackToTop
  4D. Re-score all 63 pages, fix any remaining gaps
```

---

## File count summary

| Action | Files |
|--------|-------|
| NEW files to create | 12 (PageEnhancer, StickyBottomCTA, PageSkeleton, BackToTop, page-enhance.css, usePageRefresh, CreatePost/×6, PostDetail_v2, FeedPostDetail_v2) |
| MODIFY (readable pages) | 28 page files + 4 card components + App.jsx + index.css = **34 files** |
| MODIFY (semi-minified) | 7 page files |
| REPLACE (route swap) | 3 pages (add-post, post-detail, feed-post-detail) |
| TOTAL files touched | ~56 |

---

## Risk register

| Risk | Mitigation |
|------|-----------|
| PostDetail backend 404 | Mock data layer — show demo product when API fails |
| PageEnhancer can't detect loading/empty in minified children | Use `MutationObserver` on `[data-ux-state]` attributes that `PageStateBlocks` already emits |
| Global CSS overrides break existing minified layouts | Scope under `.page-enhanced` class, use specificity carefully |
| Route transitions cause flash on slow code-split loads | Keep `Suspense` fallback (spinner) inside transition boundary |
| CreatePost wizard is large scope | Prioritize it last — existing auth-gate already works for unauthenticated users |

---

## Build verification gates

Run `npx vite build` after:
- Sprint 0 (all global changes)
- Sprint 1 (readable page edits)
- Sprint 2 (semi-minified edits)
- Sprint 3 (rewrites + route swaps)
- Sprint 4 (final polish)

Any build failure = fix before continuing.
