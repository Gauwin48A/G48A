# MHub Android — Full Web Parity Audit & Implementation Plan

**Source of Truth:** Web app at `../client/src/pages/*.jsx` (live at `http://localhost:8081/`)
**Public URL:** `https://ideal-xylophone-77v6x7w9g6whpr6v.github.app.dev/`
**Architecture:** DTOs → `MhubApi.kt` → Repository → `@HiltViewModel` → `@Composable` Screen
**Build:** `./gradlew :app:assembleDebug --no-configuration-cache -q` (requires Java 17+)
**Install:** `adb install -r app/build/outputs/apk/debug/app-debug.apk`
**Audit Date:** May 13, 2026 — **Rev-8 deep web↔Android page-by-page comparison**
**Previous reports:** archived to `claude.md.prev`, `claude.md.prev2`, `claude_prev.md`, `claude_old.md`

---

## ⛔ PARITY RATING: 72 / 100 — SIGNIFICANT GAPS REMAIN

### Rev-8 — Deep Web↔Android Page-by-Page Audit (May 13, 2026)

**Rev-7** claimed 91/100 but did NOT account for many web features that are completely absent in Android. This Rev-8 audit compares EVERY feature on EVERY web page against the Android app. The true parity is **72/100** with **66 missing features** across **28 pages**.

**What changed since Rev-7:**
- Rev-7 only counted Phase 1 fakes fixed + Phase 2 features added
- Rev-8 reads EVERY web JSX page (63 files) and checks Android has EVERY feature
- Found 66 features present in web but absent/broken in Android
- Particularly weak: Offers (55%), SaleDone (35%), Complaints (40%), RecentlyViewed (45%)

---

## SECTION A: PAGE-BY-PAGE PARITY MATRIX

### Legend
- ✅ = Feature exists and works with real API
- ⚠️ = Partially implemented or degraded
- ❌ = Missing entirely
- 🔵 = Android-only (not in web)

---

### A1 — ALL POSTS PAGE (Web: `AllPosts.jsx` → Android: `HomeScreen.kt` reused)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | Browse listings with infinite scroll | ✅ | ✅ | — |
| 2 | Category filtering (CategoryModeContext) | ✅ | ✅ | — |
| 3 | Subcategory filtering | ✅ | ⚠️ Partial | Missing granular subcategory UI |
| 4 | Advanced keyword search (title, desc, brand, model) | ✅ | ✅ | — |
| 5 | Price range filtering | ✅ | ✅ | — |
| 6 | Condition filtering | ✅ | ✅ | — |
| 7 | Sorting (latest, price, popular) | ✅ | ✅ | — |
| 8 | **Post density toggle** (compact/normal) | ✅ `usePageDensity()` | ❌ | **Missing** |
| 9 | **Great Deals banner** | ✅ `AllPostsGreatDealsBanner` | ❌ | **Missing** |
| 10 | **Compare button per post card** | ✅ `CompareIcon` component | ❌ | **Missing** — must add to each product card |
| 11 | Wishlist toggle per card | ✅ | ✅ | — |
| 12 | Buyer interest modal | ✅ `BuyerInterestModal` | ✅ | — |
| 13 | Share link dialog | ✅ `ShareLinkDialog` | ⚠️ Native share only | Missing multi-channel share (Twitter/WhatsApp/Telegram/Email/SMS) |
| 14 | Rate limiting for API calls | ✅ `LOAD_MORE_COOLDOWN_MS` | ❌ | **Missing** — no rate limiting on pagination |
| 15 | **Dedicated AllPosts screen** | ✅ Separate route/page | ❌ | Reuses HomeScreen — needs own screen |
| 16 | Promoted post badges | ✅ | ✅ | — |

**Parity: 65%** — 5 features missing

---

### A2 — CHAT PAGE (Web: `Chat.jsx` → Android: `ChatScreen.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | Real-time messaging | ✅ Socket.io | ✅ WebSocket | — |
| 2 | Conversation list | ✅ | ✅ | — |
| 3 | Message send/receive | ✅ | ✅ | — |
| 4 | Typing indicators | ✅ | ✅ | — |
| 5 | Online/offline status | ✅ | ✅ | — |
| 6 | Unread message counts | ✅ | ✅ | — |
| 7 | **Message read receipts UI** | ✅ `handleMessagesRead` + visual indicator | ❌ | Logic exists but **no visual indicator** for read status |
| 8 | Search conversations | ✅ `searchQuery` state | ⚠️ | Partial |
| 9 | **Connection status display** | ✅ Connected/Connecting/Offline/Reconnecting icons | ❌ | **Missing** — no visual connection state |
| 10 | Delete message | ✅ | ✅ | — |
| 11 | Block user | ✅ | ✅ | — |
| 12 | Report conversation | ✅ | ✅ | — |
| 13 | Emoji reactions | ✅ | ✅ | — |
| 14 | File attachments upload | ✅ | ✅ | — |
| 15 | Mark messages as read on view | ✅ Auto `markRead()` | ✅ | — |

**Parity: 85%** — 2 features missing

---

### A3 — PROFILE PAGE (Web: `Profile.jsx` → Android: `ProfileScreen.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | Profile overview (name, avatar, rating) | ✅ | ✅ | — |
| 2 | Profile tabs | ✅ 4 tabs: Overview/Personal/Preferences/Settings | ✅ 6 tabs | Different structure |
| 3 | Personal info editing | ✅ | ✅ | — |
| 4 | Trust score display | ✅ `useTrustScore` with colors | ✅ | — |
| 5 | Avatar upload | ✅ | ✅ | — |
| 6 | Follow/Unfollow | ✅ | ✅ | — |
| 7 | Block user | ✅ | ✅ | — |
| 8 | **GDPR Data Export** | ✅ `AccountDataActions` component | ❌ | **Missing** — no "Download My Data" button |
| 9 | **Preferences tab: Location radius** | ✅ `preferenceRadiusKm` slider | ❌ | **Missing** |
| 10 | **Preferences tab: Subcategory filter** | ✅ `preferenceSubcategories` checkboxes | ❌ | **Missing** |
| 11 | **Preferences tab: Price range** | ✅ `minPrice`/`maxPrice` sliders | ❌ | **Missing** |
| 12 | **Profile completion progress** | ✅ `finishProfile` section with % | ❌ | **Missing** |
| 13 | Member rank display | ✅ Bronze/Silver/Premium | ✅ | — |
| 14 | Response rate metrics | ✅ | ✅ | — |
| 15 | Social links management | ✅ | ⚠️ Display only | Cannot edit social links |
| 16 | **Category mode deep filtering** | ✅ `useCategoryMode` | ❌ | **Missing** in profile context |
| 17 | KYC status badge | ✅ | ✅ | — |
| 18 | Referral code card | ✅ | ✅ | — |
| 19 | Language selector | ✅ | ✅ | — |

**Parity: 68%** — 6 features missing

---

### A4 — REWARDS PAGE (Web: `Rewards.jsx` → Android: `RewardsScreen.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | Coin balance display | ✅ | ✅ | — |
| 2 | Daily check-in | ✅ | ✅ | — |
| 3 | Spin wheel | ✅ | ✅ | — |
| 4 | Scratch card | ✅ | ✅ | — |
| 5 | Leaderboard | ✅ | ✅ | — |
| 6 | Referral program + code | ✅ | ✅ | — |
| 7 | Referral tree visualization | ✅ | ✅ | — |
| 8 | Engagement tracking | ✅ | ✅ | — |
| 9 | **SSE real-time coin/XP updates** | ✅ `EventSource` + `sseStatus` + fallback | ❌ | **Missing** — uses polling only |
| 10 | **Impact Dashboard** (trees, CO2, plastic, hours) | ✅ `RewardsImpactDashboard` | ❌ | **Missing** — no environmental metrics |
| 11 | **Subscription state display** | ✅ `loadSubscription()` + plan/expiry | ❌ | **Missing** — no subscription info card |
| 12 | **Coin history filter chips** | ✅ `historyFilter`: all/earned/redeemed/bonus | ❌ | **Missing** — no filter UI on history |
| 13 | **Store post selection for redemption** | ✅ `RewardsRedeem` with post picker | ❌ | **Missing** — no post picker in store |
| 14 | Activity log with filtering | ✅ | ⚠️ | Basic only |
| 15 | Milestone tracking | ✅ | ⚠️ | Basic only |

**Parity: 62%** — 5 features missing

---

### A5 — DASHBOARD PAGE (Web: `Dashboard.jsx` → Android: `AccountScreens.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | Quick stats (listings, sales, views, coins) | ✅ | ✅ | — |
| 2 | Seller/Buyer view toggle | ✅ | ✅ | — |
| 3 | Welcome message with name | ✅ | ✅ | — |
| 4 | Rank badge with color | ✅ | ✅ | — |
| 5 | Recent activity feed | ✅ | ✅ | — |
| 6 | Top sellers | ✅ | ✅ | — |
| 7 | Trend indicators | ✅ | ✅ | — |
| 8 | **Buyer stats** | ✅ Items Bought/Offers Made/Saved/Chats | ❌ | `buyerStats` is always `null` in Android |
| 9 | Quick action CTAs | ✅ | ✅ | — |
| 10 | Error handling + retry | ✅ | ✅ | — |

**Parity: 90%** — 1 feature incomplete

---

### A6 — OFFERS PAGE (Web: `Offers.jsx` → Android: `CommerceScreens.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | View offers (sent/received) | ✅ | ✅ | — |
| 2 | Accept/Reject/Counter | ✅ | ✅ | — |
| 3 | Status tracking | ✅ | ✅ | — |
| 4 | Role-based view (buyer/seller) | ✅ | ✅ | — |
| 5 | **Saved offers** (localStorage persistence) | ✅ `SAVED_OFFERS_KEY` | ❌ | **Missing** — no persistent saved offers |
| 6 | **Next action guidance** per status+role | ✅ `getNextAction(status, role)` | ❌ | **Missing** — no "what to do next" text |
| 7 | **Dynamic transaction stepper** | ✅ `getOfferStepIndex(status)` mapped to 5 steps | ❌ | **Missing** — no visual stepper tracking |
| 8 | **Offer expiry countdown UI** | ✅ `getExpiryMeta()` with color coding | ❌ | **Missing** — no countdown timer |
| 9 | **Savings calculation display** | ✅ `toSavings()` shows % off | ❌ | **Missing** |
| 10 | Category mode filtering | ✅ | ⚠️ | Partial |
| 11 | Search/sort offers | ✅ | ✅ | — |

**Parity: 55%** — 5 features missing

---

### A7 — EDIT POST PAGE (Web: `EditPost.jsx` → Android: `EditPostScreen.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | Edit title/description/price/location | ✅ | ✅ | — |
| 2 | Category/subcategory selection | ✅ | ✅ | — |
| 3 | Image add (max 10) | ✅ | ✅ | — |
| 4 | Image remove with X button | ✅ | ✅ | — |
| 5 | Upload progress bar | ✅ XHR onprogress | ✅ | — |
| 6 | File type validation (JPEG/PNG/WebP) | ✅ | ✅ | — |
| 7 | File size validation (2MB) | ✅ | ✅ | — |
| 8 | Status selection | ✅ | ✅ | — |
| 9 | Form validation | ✅ | ✅ | — |

**Parity: 95%** — Essentially complete

---

### A8 — COMPARE POSTS (Web: `ComparePosts.jsx` → Android: `CommerceScreens.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | Side-by-side comparison | ✅ | ✅ | — |
| 2 | Dynamic spec detection | ✅ `buildDynamicSpecs()` | ✅ | — |
| 3 | Remove individual items (X button) | ✅ | ✅ | — |
| 4 | Clear all items | ✅ | ✅ | — |
| 5 | Spec visibility (only non-empty) | ✅ | ✅ | — |
| 6 | Price formatting | ✅ ₹ INR | ✅ | — |
| 7 | Image display | ✅ | ✅ | — |
| 8 | Location display | ✅ | ✅ | — |
| 9 | Empty state | ✅ | ✅ | — |

**Parity: 95%** — Essentially complete

---

### A9 — NEARBY POSTS (Web: `NearbyPosts.jsx` → Android: `NearbyScreen.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | Geolocation-based discovery | ✅ | ✅ | — |
| 2 | Radius selection (1-100km) | ✅ | ✅ | — |
| 3 | Distance calculation | ✅ | ✅ Haversine | — |
| 4 | Location permission handling | ✅ | ✅ | — |
| 5 | Distance color coding (green/blue/yellow/orange) | ✅ | ❌ | **Missing** — no color-coded distance badges |
| 6 | Map display toggle | ✅ | ⚠️ | WebView-based map |
| 7 | Category mode filtering | ✅ | ⚠️ | Partial |

**Parity: 85%** — 1 feature missing

---

### A10 — SALE DONE / SALE UNDONE (Web: `Saledone.jsx`, `SaleUndone.jsx` → Android: `CommerceScreens.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | Seller form (Post ID, Buyer ID, Amount) | ✅ | ✅ | — |
| 2 | Buyer form (TX ID, OTP) | ✅ | ⚠️ | Partial — no OTP |
| 3 | Transaction stepper (5 steps) | ✅ | ✅ | — |
| 4 | **Receipt generation** | ✅ `buildReceiptText()` | ❌ | **Missing** |
| 5 | **Receipt download** | ✅ `handleDownloadReceipt()` .txt export | ❌ | **Missing** |
| 6 | **Receipt sharing** | ✅ `navigator.share()` + clipboard fallback | ❌ | **Missing** |
| 7 | **TX ID clipboard copy** | ✅ `copyTransactionId()` | ❌ | **Missing** |
| 8 | **Pending sales list** | ✅ Fetches `/sale/pending` | ❌ | **Missing** |
| 9 | **Buyer OTP confirmation** | ✅ `buyerForm.otp` | ❌ | **Missing** |
| 10 | **Sale Undo/Reactivate** | ✅ Full form with reason | ❌ | **Missing** — no reactivation flow |
| 11 | **Smart error messages** per HTTP status | ✅ 403/404/401 mapping | ❌ | **Missing** |

**Parity: 35%** — 8 features missing

---

### A11 — PAYMENT PAGE (Web: `PaymentPage.jsx` → Android: `CheckoutScreens.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | UPI payment | ✅ | ✅ | — |
| 2 | Transaction ID submission | ✅ | ✅ | — |
| 3 | **Razorpay gateway** | ✅ `razorpay_key_id`, `gateway_enabled` | ❌ | **Missing** — no Razorpay SDK |
| 4 | **Payment history** | ✅ `/payments/status` endpoint | ❌ | **Missing** |
| 5 | **Payment status tracking** (verified/rejected/pending) | ✅ | ❌ | **Missing** |
| 6 | Plan details display | ✅ | ✅ | — |
| 7 | Boost flow integration | ✅ | ⚠️ | Partial |

**Parity: 50%** — 3 features missing

---

### A12 — TIER SELECTION (Web: `TierSelection.jsx` → Android: `CommerceScreens.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | Display tiers | ✅ 4 tiers: Basic/Bronze/Silver/Premium | ⚠️ 3 tiers: Free/Premium/Business | **Tier mismatch** |
| 2 | Plan pricing | ✅ | ✅ | — |
| 3 | Feature comparison | ✅ | ✅ | — |
| 4 | **Trial period activation** | ✅ `POST /subscriptions/trial` | ❌ | **Missing** |
| 5 | **Trial cancellation** | ✅ `POST /subscriptions/{id}/cancel` | ❌ | **Missing** |
| 6 | **Subscription history** | ✅ `GET /subscriptions/history` | ❌ | **Missing** |
| 7 | Current plan indicator | ✅ | ✅ | — |

**Parity: 55%** — 4 features missing

---

### A13 — RECENTLY VIEWED (Web: `RecentlyViewed.jsx` → Android: `RecentlyViewedFullScreen.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | Display recently viewed items | ✅ | ✅ Real API | — |
| 2 | **Search within items** | ✅ `searchQuery` state | ❌ | **Missing** |
| 3 | **Sort options** (recent/views/date) | ✅ `sortBy` state | ❌ | **Missing** |
| 4 | **Source filter** (all/app/web) | ✅ `sourceFilter` | ❌ | **Missing** |
| 5 | **Cursor-based pagination** | ✅ `cursor` + `hasMore` | ❌ | **Missing** — loads all at once |
| 6 | **Bulk delete** | ✅ `DELETE /recently-viewed/bulk` | ❌ | **Missing** |
| 7 | Individual remove | ✅ | ✅ | — |
| 8 | Clear all | ✅ `DELETE /recently-viewed/clear` | ✅ | — |
| 9 | **Grid/list view toggle** | ✅ `viewMode` | ❌ | **Missing** |
| 10 | Deduplication | ✅ | ✅ | — |

**Parity: 45%** — 5 features missing

---

### A14 — SAVED SEARCHES (Web: `SavedSearches.jsx` → Android: `CommerceScreens.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | View saved searches | ✅ | ✅ | — |
| 2 | Create new saved search | ✅ `POST /saved-searches` | ✅ | — |
| 3 | Delete saved search | ✅ | ✅ | — |
| 4 | **Notification toggle per search** | ✅ `PATCH /saved-searches/{id}/notifications` | ❌ | **Missing** |
| 5 | **Apply search** (navigate to results) | ✅ Click → filtered results | ❌ | **Missing** — no "run search" action |
| 6 | **Edit saved search** | ✅ Inline edit | ❌ | **Missing** |

**Parity: 55%** — 3 features missing

---

### A15 — COMPLAINTS (Web: `Complaints.jsx` → Android: `ComplaintsScreen.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | File new complaint | ✅ | ✅ | — |
| 2 | Complaint type selection | ✅ | ✅ | — |
| 3 | Description input | ✅ | ✅ | — |
| 4 | **Complaint history** | ✅ `GET /complaints/my` | ❌ | **Missing** |
| 5 | **Status tracking** | ✅ Status badges | ❌ | **Missing** |
| 6 | **Reference ID copy** | ✅ Copy button | ❌ | **Missing** |
| 7 | **File attachments** | ✅ Upload evidence | ❌ | **Missing** |
| 8 | **Secret code verification** | ✅ `secretCode` field | ❌ | **Missing** |
| 9 | Validation errors | ✅ | ✅ | — |

**Parity: 40%** — 5 features missing

---

### A16 — NOTIFICATIONS (Web: `Notifications.jsx` → Android: `NotificationsScreen.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | Notification list | ✅ | ✅ | — |
| 2 | Mark individual as read | ✅ | ✅ | — |
| 3 | Delete individual | ✅ | ✅ | — |
| 4 | Filters | ✅ | ✅ | — |
| 5 | **Snooze** (1 hr / 1 day) | ✅ | ❌ | **Missing** |
| 6 | **Mark ALL as read** | ✅ | ❌ | **Missing** |
| 7 | **Delete all** | ✅ | ❌ | **Missing** |
| 8 | **Batch operations** (multi-select) | ✅ | ❌ | **Missing** |
| 9 | Sort options | ✅ | ✅ | — |
| 10 | Preferences menu link | ✅ | ✅ | — |

**Parity: 70%** — 4 features missing

---

### A17 — POST DETAIL (Web: `PostDetail.jsx` → Android: `PostDetailScreen.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | Image gallery with zoom | ✅ | ✅ | — |
| 2 | Post info (title, price, desc) | ✅ | ✅ | — |
| 3 | Seller info card | ✅ | ✅ | — |
| 4 | Trust score badge | ✅ | ✅ | — |
| 5 | Like/Wishlist toggle | ✅ | ✅ | — |
| 6 | Share button | ✅ | ✅ | — |
| 7 | Make offer | ✅ | ✅ | — |
| 8 | Buy now | ✅ | ✅ | — |
| 9 | Add to cart | ✅ | ✅ | — |
| 10 | Compare | ✅ | ✅ | — |
| 11 | Report post | ✅ | ✅ | — |
| 12 | **Owner Insights** (inquiries, offers, viewers count) | ✅ | ❌ | **Missing** — no analytics on own posts |
| 13 | **Premium Recommendations** section | ✅ tier badges | ❌ | **Missing** |
| 14 | **Price Alert button** | ✅ `PriceAlertButton` | ❌ | **Missing** — subscribe to price drops |
| 15 | **Section navigation** (Overview/Details/Specs/Location/Trust) | ✅ `activeSection` | ❌ | **Missing** — no tabbed sections |
| 16 | Sponsored listings carousel | ✅ | ✅ | — |
| 17 | Similar products | ✅ | ✅ | — |
| 18 | View tracking | ✅ | ✅ | — |

**Parity: 78%** — 4 features missing

---

### A18 — CART (Web: `Cart.jsx` → Android: `CommerceScreens.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | Cart items display | ✅ | ✅ | — |
| 2 | Quantity +/- | ✅ | ✅ | — |
| 3 | Remove item | ✅ | ✅ | — |
| 4 | Cart summary (subtotal, tax, total) | ✅ | ✅ | — |
| 5 | **Save for later** | ✅ Move to saved | ❌ | **Missing** |
| 6 | **Coupon code input & apply** | ✅ `couponCode` + apply | ❌ | **Missing** |
| 7 | **Multi-currency breakdown** | ✅ | ❌ | **Missing** |
| 8 | **Delivery ETA** | ✅ | ❌ | **Missing** |
| 9 | **Bulk selection** (select all, delete selected) | ✅ | ❌ | **Missing** |
| 10 | Max quantity per item | ✅ | ✅ | — |
| 11 | Checkout button | ✅ | ✅ | — |

**Parity: 60%** — 5 features missing

---

### A19 — WISHLIST (Web: `Wishlist.jsx` → Android: `WishlistScreen.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | Display saved items | ✅ | ✅ | — |
| 2 | Remove from wishlist | ✅ | ✅ | — |
| 3 | Add to cart | ✅ | ✅ | — |
| 4 | **Search within wishlist** | ✅ `searchQuery` | ❌ | **Missing** |
| 5 | **Sort** (recent, price) | ✅ `sortBy` | ❌ | **Missing** |
| 6 | **Filter by status** (active/sold/inactive) | ✅ `statusFilter` | ❌ | **Missing** |
| 7 | **Grid/list view toggle** | ✅ `viewMode` | ❌ | **Missing** |
| 8 | **Bulk selection + delete** | ✅ `selectedIds` | ❌ | **Missing** |
| 9 | Infinite scroll | ✅ | ✅ | — |

**Parity: 55%** — 5 features missing

---

### A20 — FEED PAGES (Web: `FeedPage.jsx`, `MyFeedPage.jsx` → Android: `FeedScreens.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | Social feed timeline | ✅ | ✅ | — |
| 2 | Like/comment/share | ✅ | ✅ | — |
| 3 | Save/bookmark | ✅ | ✅ | — |
| 4 | Pull-to-refresh | ✅ | ✅ | — |
| 5 | Infinite scroll | ✅ | ✅ | — |
| 6 | **Content translation** | ✅ `GlobalContentTranslator` | ❌ | **Missing** — no runtime translation |
| 7 | **Page density toggle** | ✅ | ❌ | **Missing** |
| 8 | View count tracking | ✅ | ✅ | — |
| 9 | MyFeed: edit/delete own posts | ✅ | ✅ | — |
| 10 | MyFeed: status filter + sort | ✅ | ✅ | — |
| 11 | MyFeed: meta stats (total, views, likes) | ✅ | ✅ | — |

**Parity: 82%** — 2 features missing

---

### A21 — SEARCH (Web: `SearchPage.jsx` → Android: `SearchScreen.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | Full-text search | ✅ | ✅ | — |
| 2 | Category filtering | ✅ | ✅ | — |
| 3 | Price range | ✅ | ✅ | — |
| 4 | Condition filter | ✅ | ✅ | — |
| 5 | Sort options | ✅ | ✅ | — |
| 6 | Recent searches | ✅ | ✅ | — |
| 7 | Brand suggestions | ✅ | ✅ | — |
| 8 | **Date range filtering** | ✅ | ❌ | **Missing** |
| 9 | **Location filtering** | ✅ | ⚠️ | Partial |
| 10 | Filter chips display | ✅ | ✅ | — |
| 11 | Saved search integration | ✅ | ✅ | — |

**Parity: 88%** — 1 feature missing

---

### A22 — PUBLIC WALL (Web: `PublicWall.jsx` → Android: `SocialScreens.kt`)

| # | Feature | Web | Android | Gap |
|---|---------|-----|---------|-----|
| 1 | Top sellers leaderboard | ✅ | ✅ | — |
| 2 | Top buyers leaderboard | ✅ | ✅ | — |
| 3 | User rankings with medals | ✅ | ✅ | — |
| 4 | **Aggregate stats** (total sales, active buyers, volume, verification rate) | ✅ | ❌ | **Missing** |
| 5 | Verification badges | ✅ | ✅ | — |
| 6 | Retry/refresh | ✅ | ✅ | — |

**Parity: 85%** — 1 feature missing

---

### A23 — SETTINGS / SECURITY / KYC / CREATE POST / CHANNELS / LEGAL

| Page | Parity | Notes |
|------|--------|-------|
| Settings | 95% | ✅ Complete |
| Security (2FA, sessions) | 95% | ✅ Complete |
| KYC | 100%+ | ✅ Android has selfie 🔵 |
| CreatePost | 95%+ | ✅ Android has audio recording 🔵 |
| Channels/Centres | 90% | ✅ Good |
| Legal pages | 95% | ✅ Complete |

---

## SECTION B: CROSS-CUTTING FEATURES (Web-wide patterns missing in Android)

| # | Feature | Web Implementation | Android Status | Impact |
|---|---------|-------------------|---------------|--------|
| **X1** | Global Content Translation | `GlobalContentTranslator` — runtime translation for all text | ❌ Missing | HIGH — affects all pages |
| **X2** | Page Density Toggle | `usePageDensity()` hook — compact/normal/spacious | ❌ Missing | MEDIUM — used on 8+ pages |
| **X3** | Multi-channel Share Dialog | `ShareLinkDialog` — Twitter/WhatsApp/Telegram/Email/SMS | ⚠️ Native share only | LOW — native share is fine |
| **X4** | Trust Badge Color System | `useTrustScore` — green=verified, amber=new, red=risky | ⚠️ Partial | MEDIUM |
| **X5** | Price Alert System | `PriceAlertButton` — subscribe to price drops, push on change | ❌ Missing | HIGH — monetization |
| **X6** | Page Refresh Hook | `usePageRefresh()` — pull-to-refresh event system | ⚠️ Partial | LOW |
| **X7** | Category Mode Context | `useCategoryMode` — global category scoping for all screens | ⚠️ Partial | MEDIUM |

---

## SECTION C: IMPLEMENTATION PLAN — 9 PHASES (66 features, ~154h total)

### Phase 1 — CRITICAL: Launch Blockers (4 items, ~17h)
**Must complete before any production release.**

| # | Task | Page | Effort | Details |
|---|------|------|--------|---------|
| P1.1 | GDPR Data Export | Profile | 3h | "Download My Data" → `GET /users/data-export` → save file or share via intent |
| P1.2 | Receipt generation + download + share | SaleDone | 6h | `buildReceiptText()` → .txt file → Downloads folder → share intent |
| P1.3 | TX ID clipboard copy | SaleDone | 0.5h | `ClipboardManager.setPrimaryClip()` + toast |
| P1.4 | Razorpay SDK integration | Payment | 8h | `com.razorpay:checkout:1.6.x` → createOrder → startPayment → verifyPayment |

### Phase 2 — HIGH: Offers & Commerce (10 items, ~25h)
**Core commerce features users expect.**

| # | Task | Page | Effort | Details |
|---|------|------|--------|---------|
| P2.1 | Saved offers persistence | Offers | 2h | DataStore `savedOfferIds` set, sync on launch |
| P2.2 | Next action guidance | Offers | 3h | `getNextAction(status, role)` → contextual guidance text |
| P2.3 | Dynamic transaction stepper | Offers | 3h | 5-step stepper (offer→review→payment→verify→closed) with status mapping |
| P2.4 | Expiry countdown UI | Offers | 2h | Countdown timer with color coding (green>24h, amber>1h, red<1h) |
| P2.5 | Save for later | Cart | 3h | Move items between cart and saved lists |
| P2.6 | Coupon code input + apply | Cart | 2h | Input field + apply button → discount calculation |
| P2.7 | Match web 4-tier structure | TierSelection | 3h | Basic(₹500)/Bronze(₹850)/Silver(₹1200)/Premium(₹1500) from API |
| P2.8 | Trial activation + cancellation | TierSelection | 3h | `POST /subscriptions/trial`, `POST /subscriptions/{id}/cancel` |
| P2.9 | Payment history display | Payment | 3h | `GET /payments/status` → list with verified/rejected/pending badges |
| P2.10 | Pending sales list | SaleDone | 3h | `GET /sale/pending` → display list with status |

### Phase 3 — HIGH: Profile & Dashboard (6 items, ~16h)
**User profile must match web.**

| # | Task | Page | Effort | Details |
|---|------|------|--------|---------|
| P3.1 | Preferences: location radius | Profile | 3h | Slider 1-100km → `PUT /preferences` |
| P3.2 | Preferences: subcategory filter | Profile | 3h | Multi-select checkboxes → persist |
| P3.3 | Preferences: price range | Profile | 2h | Min/max sliders → persist |
| P3.4 | Profile completion progress | Profile | 2h | "Finish Profile" section with progress bar |
| P3.5 | Buyer stats | Dashboard | 2h | Populate from API: Items Bought/Offers Made/Saved/Active Chats |
| P3.6 | Owner Insights | PostDetail | 3h | Views/inquiries/offers count on own posts |

### Phase 4 — HIGH: Notifications & Wishlist (8 items, ~14h)
**Common user interactions.**

| # | Task | Page | Effort | Details |
|---|------|------|--------|---------|
| P4.1 | Mark all as read | Notifications | 1h | Bulk action button in header |
| P4.2 | Delete all | Notifications | 1h | Bulk action button |
| P4.3 | Batch operations | Notifications | 3h | Multi-select checkboxes + bulk actions bar |
| P4.4 | Search within wishlist | Wishlist | 2h | Search bar filtering items |
| P4.5 | Sort + filter | Wishlist | 2h | Sort (recent/price), filter (active/sold/inactive) |
| P4.6 | Grid/list view toggle | Wishlist | 1h | ViewMode toggle button |
| P4.7 | Bulk select + delete | Wishlist | 2h | Multi-select checkboxes + bulk delete |
| P4.8 | Price Alert button | PostDetail | 3h | `POST /api/price-alerts` + bell icon toggle |

### Phase 5 — HIGH: Rewards & Chat (7 items, ~19h)
**Engagement features.**

| # | Task | Page | Effort | Details |
|---|------|------|--------|---------|
| P5.1 | Impact Dashboard | Rewards | 3h | Trees/CO2/plastic/hours metric cards from API |
| P5.2 | Subscription state display | Rewards | 2h | Card showing plan name/expiry/features |
| P5.3 | Coin history filter chips | Rewards | 2h | All/earned/redeemed/bonus chips above history |
| P5.4 | SSE real-time updates | Rewards | 4h | `OkHttp EventSource` + polling fallback |
| P5.5 | Store post selection | Rewards | 3h | Post picker dialog for boost redemption |
| P5.6 | Read receipts UI | Chat | 2h | ✓✓ checkmarks for sent/delivered/read |
| P5.7 | Connection status display | Chat | 1h | Connected/Offline/Reconnecting icon in top bar |

### Phase 6 — HIGH: Complaints & Sale Undo (7 items, ~15h)
**Transaction support features.**

| # | Task | Page | Effort | Details |
|---|------|------|--------|---------|
| P6.1 | Complaint history list | Complaints | 3h | `GET /complaints/my` → list with status badges |
| P6.2 | File attachments | Complaints | 3h | Upload evidence images/docs |
| P6.3 | Reference ID copy | Complaints | 0.5h | Clipboard + toast |
| P6.4 | Secret code field | Complaints | 1h | Secret code input for verification |
| P6.5 | Reactivation flow | SaleUndone | 4h | Form: post ID + reason → `POST /posts/{id}/reactivate` |
| P6.6 | Smart error messages | SaleUndone | 1h | HTTP 403→"Access denied", 404→"Not found", 401→"Login required" |
| P6.7 | Buyer OTP confirmation | SaleDone | 2h | OTP field in buyer form |

### Phase 7 — MEDIUM: Browse & Discovery (10 items, ~20h)
**Browse experience enhancements.**

| # | Task | Page | Effort | Details |
|---|------|------|--------|---------|
| P7.1 | Great Deals banner | AllPosts | 2h | Promotional banner component at top |
| P7.2 | Compare button per card | AllPosts | 2h | CompareIcon on each product card |
| P7.3 | Search + sort + filter | RecentlyViewed | 3h | Search bar, sort dropdown, source filter |
| P7.4 | Cursor pagination | RecentlyViewed | 2h | Cursor-based infinite scroll |
| P7.5 | Bulk delete | RecentlyViewed | 1h | `DELETE /recently-viewed/bulk` |
| P7.6 | Notification toggle | SavedSearches | 1h | `PATCH /saved-searches/{id}/notifications` |
| P7.7 | Apply/run search | SavedSearches | 2h | Navigate to filtered results with saved criteria |
| P7.8 | Edit saved search | SavedSearches | 2h | Inline edit form |
| P7.9 | Date range filter | Search | 2h | Date picker in advanced filters |
| P7.10 | Distance color coding | Nearby | 1h | Green (<1km), Blue (<5km), Yellow (<10km), Orange (≥10km) |

### Phase 8 — MEDIUM: Polish & Cross-Cutting (10 items, ~22h)
**UX enhancements across pages.**

| # | Task | Page | Effort | Details |
|---|------|------|--------|---------|
| P8.1 | Section navigation | PostDetail | 3h | Tab strip with scroll-to-section |
| P8.2 | Premium Recommendations | PostDetail | 2h | Tier badges on recommended posts |
| P8.3 | Delivery ETA | Cart | 2h | Per-item delivery estimate |
| P8.4 | Bulk selection | Cart | 2h | Select-all + bulk actions |
| P8.5 | Savings % display | Offers | 1h | Badge showing discount percentage |
| P8.6 | Aggregate stats | PublicWall | 2h | Total sales/buyers/volume/verification rate |
| P8.7 | Subscription history + cancel | TierSelection | 3h | `GET /subscriptions/history` + cancel button |
| P8.8 | Snooze | Notifications | 2h | 1hr/1day snooze per notification |
| P8.9 | Grid/list view toggle | RecentlyViewed | 1h | ViewMode toggle |
| P8.10 | Rate limiting on pagination | AllPosts | 1h | Cooldown timer between page loads |

### Phase 9 — LOW: Nice-to-Have (3 items, ~10h)
**Will bring parity from 99% to 100%.**

| # | Task | Effort | Details |
|---|------|--------|---------|
| P9.1 | Runtime content translation | 4h | Translate all text via API based on language |
| P9.2 | Page density toggle (all screens) | 4h | Compact/normal/spacious preference |
| P9.3 | Feed content translation | 2h | Translate feed post text on-demand |

---

## SECTION D: PARITY SCORE PER PAGE

| Page | Features Total | Implemented | Parity % | Phase to Fix |
|------|---------------|-------------|----------|-------------|
| AllPosts | 16 | 11 | 65% | P7, P8 |
| Chat | 15 | 13 | 85% | P5 |
| Profile | 19 | 13 | 68% | P1, P3 |
| Rewards | 15 | 10 | 62% | P5 |
| Dashboard | 10 | 9 | 90% | P3 |
| Offers | 11 | 5 | 55% | P2 |
| EditPost | 9 | 9 | 95% | — |
| Compare | 9 | 9 | 95% | — |
| Nearby | 8 | 7 | 85% | P7 |
| SaleDone/Undone | 11 | 3 | 35% | P1, P6 |
| Payment | 7 | 3 | 50% | P1, P2 |
| TierSelection | 7 | 3 | 55% | P2, P8 |
| RecentlyViewed | 10 | 4 | 45% | P7, P8 |
| SavedSearches | 6 | 3 | 55% | P7 |
| Complaints | 11 | 4 | 40% | P6 |
| Notifications | 10 | 6 | 70% | P4, P8 |
| PostDetail | 18 | 14 | 78% | P4, P8 |
| Cart | 11 | 6 | 60% | P2, P8 |
| Wishlist | 9 | 4 | 55% | P4 |
| Feed | 11 | 9 | 82% | P9 |
| Search | 11 | 10 | 88% | P7 |
| PublicWall | 6 | 5 | 85% | P8 |
| Settings | 9 | 9 | 95% | — |
| Security | 7 | 7 | 95% | — |
| KYC | 5 | 5+ | 100%+ | — |
| CreatePost | 7 | 7+ | 95%+ | — |
| Channels/Centres | 7 | 7 | 90% | — |
| Legal | 7 | 7 | 95% | — |
| **TOTAL** | **281** | **202** | **72%** | |

---

## SECTION E: PARITY SCORE HISTORY

| Milestone | Rating | Notes |
|---|---|---|
| Baseline | 65 / 100 | Initial estimate |
| May 11 — rev-1 | 92 (claimed) | Surface-level check |
| May 11 — rev-2 | 95 (claimed) | 5 gaps "fixed" |
| May 12 — rev-3 | 100 (claimed) | Documentation-only fixes |
| May 12 — rev-4 | 58 (honest) | 26 fake stubs + 35 missing features found |
| May 12 — rev-5 | 58 (re-confirmed) | Independent verification |
| May 12 — rev-6 | 82 | Phase 1 fakes fixed |
| May 12 — rev-7 | 91 (claimed) | Phase 2 features added |
| **May 13 — rev-8** | **72 (honest)** | **Deep web↔Android page-by-page audit: 66 features missing across 28 pages. Rev-7's 91 was inflated.** |

---

## SECTION F: ESTIMATED EFFORT TO 100%

| Phase | Items | Hours | Cumulative Parity |
|-------|-------|-------|-------------------|
| Phase 1 (Critical) | 4 | 17h | 78% |
| Phase 2 (Commerce) | 10 | 25h | 84% |
| Phase 3 (Profile/Dashboard) | 6 | 16h | 87% |
| Phase 4 (Notif/Wishlist) | 8 | 14h | 90% |
| Phase 5 (Rewards/Chat) | 7 | 19h | 93% |
| Phase 6 (Complaints/Sale) | 7 | 15h | 95% |
| Phase 7 (Browse) | 10 | 20h | 97% |
| Phase 8 (Polish) | 10 | 22h | 99% |
| Phase 9 (Nice-to-have) | 3 | 10h | 100% |
| **TOTAL** | **65** | **~158h** | **100%** |

---

## SECTION G: ANDROID-ONLY FEATURES (Not in Web) 🔵

These features exist in Android but NOT in web:

| Feature | Android Implementation | Notes |
|---------|----------------------|-------|
| Selfie capture for KYC | Camera intent in KycScreen | Stronger identity verification |
| Audio recording in posts | MediaRecorder in CreatePostScreen | Rich media |
| QR/barcode scanning | ScannerScreen | Quick product lookup |
| Drag-to-reorder images | DraggablePostImages | Better UX for image ordering |
| Native share integration | Android share intents | OS-level sharing |
| Native camera/gallery picker | ActivityResultContracts | Direct hardware access |
| WebSocket chat (lower latency) | ChatWebSocket.kt | vs. web's Socket.io polling |
| Cover image upload | ProfileScreen | uploadCoverImage() |

---

## SECTION H: BUILD & TEST COMMANDS

```bash
# Build debug APK
cd android-native
./gradlew :app:assembleDebug --no-configuration-cache -q

# Install on device/emulator
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Run unit tests
./gradlew :app:testDebugUnitTest

# Check for compile errors only
./gradlew :app:compileDebugKotlin --no-configuration-cache

# Web app (source of truth)
cd client && npm run dev   # → http://localhost:8081/
# Public: https://ideal-xylophone-77v6x7w9g6whpr6v.github.app.dev/
```

---

*Rev-8 deep audit. True parity: 72/100. 66 features across 28 pages compared. 158h estimated to reach 100%. Priority: Phase 1 (Critical) → Phase 2 (Commerce) → Phase 3 (Profile).*
