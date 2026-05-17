# MHub Android — Production Readiness Plan

> Generated from live emulator scan on May 17, 2026
> Every page was scanned via `uiautomator dump` + visual analysis

---

## 1. Live App Scan Results

### Pages Scanned (18 screens)

| # | Page | Route | Status | Notes |
|---|------|-------|--------|-------|
| 1 | CategoryHub (Home) | `main/category-hub` | ⚠️ | No TopBar, back-stack broken |
| 2 | Product Listing | `cat/{key}` | ✅ | Grid/list, filters, sort, ratings |
| 3 | Product Detail | `post/{postId}` | ✅ | Carousel, specs, reviews, related |
| 4 | Sell (PostWelcome) | `post/welcome` | ⚠️ | Static info — no Start CTA |
| 5 | Rewards Dashboard | `main/rewards` | ✅ | 4 tabs, tiers, points |
| 6 | Rewards Earn | (tab) | ✅ | Daily code, 7 challenges, store |
| 7 | Rewards Referrals | (tab) | ✅ | Share, badges, network |
| 8 | Rewards Activity | (tab) | ✅ | Stats, actions |
| 9 | Profile | `main/profile` | ✅ | Full: info, actions, settings |
| 10 | Notifications | `main/notifications` | ✅ | Search, tabs, stats |
| 11 | Search | `search` | ⚠️ | No recent/trending on empty |
| 12 | Login | `auth/login` | ✅ | Mobile + password, demo login |
| 13 | Create Post | `post/create` | ✅ | Multi-image, full form, KYC gate |
| 14 | Chat | `chat` | ✅ | WebSocket, typing, attachments |
| 15 | KYC | `kyc` | ✅ | Doc upload, Aadhaar OTP |
| 16 | Checkout | `checkout/*` | ❌ | UI only, no order API |
| 17 | Admin Panel | `admin-panel` | ❌ | Route exists, no screen |
| 18 | Nearby | `nearby` | ⚠️ | No map, cached GPS only |

### Navigation Issues Found

1. **Back button always returns to CategoryHub** — entering category then navigating to Profile/Rewards/Sell, pressing back drops all the way to the launcher
2. **Home & Explore tabs overlap** — both show product listings (CategoryHub → auto-enters Electronics)
3. **CategoryHub hides TopBar** — `showTopBar=false, showBottomBar=false` means no quick access to notifications/cart

---

## 2. Implementation Plan

### 🔴 P0 — Blockers (Implement Now)

#### P0-1: Fix Navigation Back Stack
**File:** `MhubApp.kt`
**Problem:** When user enters a category from CategoryHub, then navigates to Profile/Rewards tabs, pressing back goes to CategoryHub instead of the category listing. The `popUpTo(Routes.HOME)` in bottom nav onClick pops everything.
**Fix:**
- Change bottom nav `popUpTo` to preserve category routes
- Ensure `saveState = true` and `restoreState = true` work correctly
- Category routes (`cat/{key}`) should stay in back stack

#### P0-2: Sell Page — Add "Start Listing" Button
**File:** `CommerceScreens.kt` → `PostWelcomeScreen`
**Problem:** Sell tab shows info-only page. No visible "Start Listing" or "Create Post" button to actually begin selling.
**Fix:**
- Add prominent gradient CTA button at the bottom
- Wire `onStartPost` callback to navigate to `Routes.CREATE_POST`

#### P0-3: Search — Add Recent Searches & Trending
**File:** `SearchScreen.kt`
**Problem:** Empty search shows only "Try a broader query" with category chips. No recent search history, no trending/popular terms.
**Fix:**
- Add `RecentSearchesDao` to Room DB for storing search history
- Show recent searches section (with clear button)
- Show trending/popular section (static or from API)
- Show search suggestions as user types

#### P0-4: CategoryHub TopBar Icons
**File:** `MhubApp.kt` → CategoryHub composable route
**Problem:** CategoryHub sets `showTopBar=false, showBottomBar=false`. User has no quick access to notifications/cart.
**Fix:**
- Set `showBottomBar=true` so user can navigate between tabs
- Add inline header row with notification bell + cart icon in CategoryHub

#### P0-5: Fix Settings Stubs
**File:** `SettingsScreen.kt`
**Problem:** "Clear Cache" and "Logout All Devices" show hardcoded success messages without doing anything.
**Fix:**
- Clear Cache: call `cacheDir.deleteRecursively()` + Coil cache clear
- Logout All Devices: call API endpoint + clear TokenStore + navigate to login

#### P0-6: Checkout — Wire Order Submission
**File:** `checkout/CheckoutScreens.kt`
**Problem:** Beautiful 4-step UI (Address → Payment → Review → Confirm) but the "Place Order" button doesn't call any API.
**Fix:**
- Add `createOrder()` endpoint to `MhubApi`
- Add `OrderRepository` with `placeOrder()`, `getOrders()`, `getOrderDetail()`
- Wire the Confirm step to call the API
- Show order confirmation with order ID

#### P0-7: Admin Panel — Basic Scaffold
**File:** NEW `ui/admin/AdminPanelScreen.kt`
**Problem:** Route exists in `Routes.kt` but no screen implementation.
**Fix:**
- Create admin panel with tabs: Users, Posts, Reports, Analytics
- Wire to existing admin API endpoints
- Show user list, post moderation queue, reported content

---

### 🟠 P1 — Post-Launch Week 1

| # | Task | File | Effort |
|---|------|------|--------|
| P1-1 | Nearby: Map integration | `NearbyScreen.kt` | 2-3 days |
| P1-2 | Push notifications (FCM) | `MhubApplication.kt` | 2 days |
| P1-3 | Offline mode improvements | `ConnectivityObserver.kt` | 1 day |
| P1-4 | Deep linking (share URLs) | `AndroidManifest.xml` | 1-2 days |

### 🟡 P2 — Growth Phase (Week 2-4)

| # | Task | Effort |
|---|------|--------|
| P2-1 | Payment gateway (Razorpay/PhonePe) | 3-4 days |
| P2-2 | Order tracking (Placed→Shipped→Delivered) | 2-3 days |
| P2-3 | Seller analytics dashboard | 2 days |
| P2-4 | Image optimization (server-side) | 1 day |
| P2-5 | Price drop alerts for wishlist | 2 days |

### 🟢 P3 — Nice-to-Have (Month 2+)

| # | Task | Effort |
|---|------|--------|
| P3-1 | Voice search | 1-2 days |
| P3-2 | AR product preview | 5+ days |
| P3-3 | Video reviews | 3 days |
| P3-4 | Multi-language content (server) | 2-3 days |
| P3-5 | In-app review prompt | 0.5 day |

---

## 3. Production Score

| Category | Before | After P0 | Target |
|----------|--------|----------|--------|
| UI Completeness | 8.5/10 | 9.5/10 | 10/10 |
| API Integration | 7/10 | 9/10 | 10/10 |
| Navigation | 6/10 | 9/10 | 9.5/10 |
| Performance | 8/10 | 8.5/10 | 9/10 |
| Monetization | 4/10 | 7/10 | 9/10 |
| **Overall** | **6.5/10** | **8.5/10** | **9.5/10** |
