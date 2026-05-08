# MHUB Android ↔ Web FULL PARITY PLAN (Target: 100/100)

## Current State
| Metric | Web (React) | Android (Kotlin/Compose) |
|--------|-------------|--------------------------|
| Pages/Screens | 67 JSX pages | 65 composable routes |
| Components | 100+ reusable | ~30 shared helpers |
| Lines of Code | 60,508 | 22,527 |
| API Endpoints Used | ~150 | 130 |
| Languages | 14 (i18n) | English only |
| Real-time | Socket.IO | 5s polling |
| Build Status | ✅ | ✅ (BUILD SUCCESSFUL) |

---

## GAP ANALYSIS: Feature-by-Feature

### ═══ PHASE 1: CRITICAL UX GAPS (User-facing, immediately noticeable) ═══

| # | Feature | Web Has | Android Has | Priority |
|---|---------|---------|-------------|----------|
| 1 | **Share Dialog** | WhatsApp, Twitter/X, Email, Copy Link, Native Share API | ❌ None | P0 |
| 2 | **Image Zoom/Gallery** | Pinch-to-zoom modal, swipe navigation, thumbnails | ❌ Basic pager only | P0 |
| 3 | **Advanced Search Filters** | Category, subcategory, price range, condition, date range, location, min rating, sort | ❌ Basic text search only | P0 |
| 4 | **Price Alerts** | Subscribe per post, get notified on price drops | ❌ Missing entirely | P0 |
| 5 | **Post Boost/Promote** | Pay coins to boost/feature/spotlight listing | ❌ Missing entirely | P0 |
| 6 | **Bargain Quick Actions** | 10%/20%/30% quick offer buttons on PostDetail | ❌ Missing | P0 |
| 7 | **Transaction Stepper** | 5-step visual progress in SaleDone/Undone/Payment | Partial (SaleDone has steps) | P0 |
| 8 | **Notification Preferences** | Per-type toggles (chat, offers, price drops, etc.) | ❌ Missing | P0 |
| 9 | **Real-time Chat** | Socket.IO: typing indicators, online status, instant delivery | 5s polling only | P1 |
| 10 | **Multi-language (i18n)** | 14 languages with runtime translation | English hardcoded | P1 |

### ═══ PHASE 2: FEATURE COMPLETENESS GAPS ═══

| # | Feature | Web Has | Android Has | Priority |
|---|---------|---------|-------------|----------|
| 11 | **For You / Personalized Feed** | Dedicated page with AI recommendations + great deals | ❌ Missing page | P1 |
| 12 | **Seller Storefront (CentrePage)** | Cover image, follow, posts, analytics tabs, verification badge | Partial (CentreDetail exists) | P1 |
| 13 | **MyHome Seller Management** | Bulk select, delete, toggle sold, share, duplicate, search, edit | MyPostsScreen basic list | P1 |
| 14 | **Audio Recording in Post** | Record voice description when creating post | ❌ Missing | P1 |
| 15 | **Wishlist Enhanced** | Notes per item, bulk operations, share, add-to-cart | Basic add/remove only | P1 |
| 16 | **Cart Save-for-Later** | Move items between cart ↔ saved, price change alerts | ❌ Missing | P1 |
| 17 | **Daily Engagement Code** | Daily code feature for engagement | ❌ Missing | P2 |
| 18 | **Referral Chain Tree** | Multi-level referral visualization | ❌ Missing | P2 |
| 19 | **Contact Sync** | Sync device contacts, find friends on platform | ❌ Missing | P2 |
| 20 | **Star Rating Widget** | Interactive star rating on reviews page | ❌ Text-based only | P1 |

### ═══ PHASE 3: POLISH & UX EXCELLENCE ═══

| # | Feature | Web Has | Android Has | Priority |
|---|---------|---------|-------------|----------|
| 21 | **Pull-to-Refresh everywhere** | PullToRefreshWrapper on all list screens | Some screens only | P1 |
| 22 | **Promoted/Sponsored Carousel** | SponsoredListings component on feed/explore | ❌ Missing | P1 |
| 23 | **Premium Recommendations** | AI-based post recommendations on detail page | ❌ Missing | P2 |
| 24 | **Buyer Interest Modal** | Express interest with message to seller | ❌ Missing | P2 |
| 25 | **Great Deals Banner** | Special banner for hot deals on feed | ❌ Missing | P2 |
| 26 | **Page Density Toggle** | Grid/List/Compact view modes | Some screens have it | P2 |
| 27 | **Search History (Local)** | Recent searches persist and show as suggestions | ❌ Missing | P1 |
| 28 | **Trending Searches** | Show popular search terms | ❌ Missing | P2 |
| 29 | **Post Draft Auto-save** | Save/load/clear draft while creating | ❌ Missing | P2 |
| 30 | **Subcategory Browsing** | Dedicated subcategory grid with icons | ❌ Missing page | P2 |

### ═══ PHASE 4: PLATFORM-NATIVE ENHANCEMENTS (Android > Web) ═══

| # | Feature | Status | Priority |
|---|---------|--------|----------|
| 31 | **Biometric Auth** | ❌ No fingerprint/face unlock | P1 |
| 32 | **Deep Link Routing** | ❌ Notifications don't route to specific screens | P1 |
| 33 | **Image Crop/Edit** | ❌ No crop before upload | P2 |
| 34 | **Map View (Nearby)** | ❌ No Google Maps integration | P2 |
| 35 | **Offline Write Queue** | ❌ No offline post creation queue | P2 |
| 36 | **App Shortcuts** | ❌ No launcher shortcuts (Post, Search, Chat) | P2 |
| 37 | **Widget** | ❌ No home screen widget (notifications count) | P3 |
| 38 | **Picture-in-Picture** | ❌ No PiP for video content | P3 |

### ═══ PHASE 5: BUG FIXES & STABILITY ═══

| # | Issue | Details | Priority |
|---|-------|---------|----------|
| 39 | **Deprecated Icons** | `Icons.Filled.Sort`, `TrendingUp`, `Chat`, `ViewList` → use AutoMirrored | P1 |
| 40 | **Deprecated outlinedButtonBorder** | Use version with `enabled` param | P2 |
| 41 | **Chat polling inefficiency** | 5s polling drains battery; needs WebSocket | P1 |
| 42 | **No error retry UI** | Network errors show toast but no retry button | P2 |
| 43 | **No skeleton loading** | Screens jump when data loads (no shimmer) | P2 |
| 44 | **No haptic feedback** | Actions like like/add-to-cart need haptics | P2 |
| 45 | **Accessibility (a11y)** | Minimal contentDescription, no TalkBack optimization | P2 |

---

## IMPLEMENTATION ROADMAP

### Sprint 1: Critical UX (Estimated: Core screens enhancement)
**Goal: Every user-facing interaction matches web**

1. **ShareDialog composable** — reusable share bottom sheet
   - Android native share intent + WhatsApp/Twitter/Email deep links
   - Copy link button
   - Wire into: PostDetail, FeedCard, WishlistItem, ChannelDetail

2. **ImageZoomScreen** — full-screen image viewer
   - Pinch-to-zoom (Modifier.transformable)
   - Swipe left/right between images
   - Dot indicator + thumbnail strip
   - Wire into: PostDetail image carousel

3. **SearchScreen Advanced Filters**
   - Price range slider (min/max)
   - Condition chips (New/Like New/Good/Fair)
   - Category + Subcategory dropdowns
   - Location radius selector
   - Date range (Last 24h/Week/Month)
   - Sort by (Relevance/Newest/Price↑/Price↓/Distance)
   - Recent searches (Room DB)
   - Trending searches from API

4. **PriceAlertButton composable**
   - Subscribe/unsubscribe toggle on PostDetail
   - API: `POST /api/price-alerts/subscribe`, `DELETE /api/price-alerts/unsubscribe`
   - Bell icon animation on subscribe

5. **PostBoostPanel composable**
   - 3 boost tiers: Basic (10 coins), Featured (25), Spotlight (50)
   - Duration selector (24h/48h/7d)
   - Coin balance check
   - Wire into PostDetail for own posts

6. **BargainActions row** on PostDetail
   - Quick offer buttons: -10%, -20%, -30%, Custom
   - Each creates an offer via existing OffersViewModel

7. **NotificationPreferences screen**
   - Per-type toggles: Chat, Offers, Price Drops, Sales, System
   - API: `GET/PUT /api/notifications/preferences`

### Sprint 2: Feature Completeness
**Goal: Every web page has an Android equivalent**

8. **ForYouScreen** — Personalized recommendations feed
   - API: `GET /api/posts/for-you`
   - Great Deals banner
   - Category tabs
   - Infinite scroll

9. **SellerStorefront enhancement** (CentreDetail)
   - Cover image hero with gradient
   - Follow/Unfollow button
   - Analytics tab (if owner)
   - Verification badge
   - Post grid within storefront

10. **MyPostsScreen enhancement** (MyHome equivalent)
    - Bulk select mode (long press)
    - Batch actions: Delete, Mark Sold, Share, Duplicate
    - Search within my posts
    - Category filter chips
    - Quick stats row (Active/Sold/Expired/Drafts)

11. **WishlistScreen enhancement**
    - Add notes per item (local Room storage)
    - Bulk operations (remove selected, move to cart)
    - Share wishlist
    - Sort by date added/price

12. **Cart enhancement**
    - Save for later section
    - Price change indicator (red/green badge)
    - Mixed currency alert

13. **StarRatingWidget composable**
    - Interactive 1-5 star rating
    - Half-star support
    - Wire into ReviewsScreen submit form

14. **AudioRecorder** in CreatePostScreen
    - Record button with waveform visualization
    - Playback before submit
    - Upload as attachment

### Sprint 3: Polish & Platform-Native
**Goal: Android feels BETTER than web**

15. **Biometric Auth**
    - AndroidX Biometric prompt
    - Optional on app open
    - Fallback to PIN/pattern

16. **Deep Link Routing**
    - Intent filters for `mhub.app/posts/{id}`, `/chat/{id}`, etc.
    - FCM notification `data` payload → navigate to specific screen
    - Universal Links support

17. **Skeleton/Shimmer Loading**
    - Reusable ShimmerCard composable
    - Apply to: Home, Feed, Search, PostDetail, Chat

18. **Pull-to-Refresh on ALL list screens**
    - Add `pullRefresh` modifier to: Home, Feed, Explore, Chat, Notifications, Wishlist, MyPosts, Offers, Reviews

19. **Sponsored Listings Carousel**
    - Horizontal LazyRow on Home/Explore
    - API: `GET /api/posts/sponsored`
    - "Sponsored" badge overlay

20. **Search History (Room)**
    - `SearchHistoryEntity` + DAO
    - Show recent searches as chips
    - Clear history button
    - Trending searches API

21. **Post Draft Auto-save**
    - Save to Room every 10s while editing
    - Restore draft on next CreatePost open
    - API: `GET/PUT/DELETE /api/posts/draft`

22. **Subcategories Browser Screen**
    - Grid with icons per subcategory
    - Navigate from CategoryDetail
    - Breadcrumbs

### Sprint 4: Real-time & i18n
**Goal: Real-time UX + Global reach**

23. **WebSocket Chat**
    - OkHttp WebSocket or Socket.IO Android client
    - Typing indicators
    - Online/offline status dots
    - Message delivery/read receipts
    - Connection status indicator

24. **Multi-language Framework**
    - String resources per locale (res/values-hi/, res/values-es/, etc.)
    - Language picker in Profile > Settings
    - Runtime locale change
    - Start with: English, Hindi, Tamil, Telugu, Kannada, Marathi

25. **Referral Chain Tree**
    - Tree visualization (Canvas/custom drawing)
    - Level badges (L1/L2/L3)
    - Earnings per level

26. **Contact Sync**
    - Read contacts permission
    - Upload hashed phones to match
    - Show "Friends on Mhub" section

27. **Daily Engagement Code**
    - API: `GET /api/dailycode`
    - Show in RewardsScreen
    - Countdown timer

### Sprint 5: Excellence & Beyond Web
**Goal: Android SURPASSES web (100+ features)**

28. **Haptic Feedback** — like, add-to-cart, successful purchase
29. **Image Crop/Edit** — UCrop integration before upload
30. **Map View** — Google Maps in NearbyScreen with pin clusters
31. **App Shortcuts** — Long-press launcher icon → Post, Search, Chat
32. **Offline Queue** — Queue post creation when offline, sync on reconnect
33. **Accessibility Audit** — contentDescription on all interactive elements
34. **Performance** — Baseline profiles, R8 optimization, startup tracing
35. **Edge-to-edge** — Transparent status/nav bars with proper insets

---

## PRIORITY EXECUTION ORDER

```
Week 1: Items 1-7 (Critical UX — Share, Zoom, Filters, Alerts, Boost, Bargain, NotifPrefs)
Week 2: Items 8-14 (Feature completeness — ForYou, Storefront, MyPosts, Wishlist, Cart, Rating, Audio)
Week 3: Items 15-22 (Polish — Biometric, DeepLinks, Shimmer, PullRefresh, Sponsored, History, Draft, Subcats)
Week 4: Items 23-27 (Real-time & i18n — WebSocket, Languages, Referral, Contacts, DailyCode)
Week 5: Items 28-35 (Excellence — Haptics, Crop, Map, Shortcuts, Offline, A11y, Perf, Edge2Edge)
```

---

## FILES TO CREATE/MODIFY

### New Files Needed:
| File | Purpose |
|------|---------|
| `ui/components/ShareDialog.kt` | Reusable share bottom sheet |
| `ui/components/ImageZoomScreen.kt` | Full-screen pinch-zoom image viewer |
| `ui/components/PriceAlertButton.kt` | Price drop subscription toggle |
| `ui/components/PostBoostPanel.kt` | Boost/Feature/Spotlight panel |
| `ui/components/BargainActions.kt` | Quick offer percentage buttons |
| `ui/components/StarRatingBar.kt` | Interactive star rating widget |
| `ui/components/ShimmerLoading.kt` | Skeleton loading composables |
| `ui/components/TransactionStepper.kt` | Multi-step progress indicator |
| `ui/foryou/ForYouScreen.kt` | Personalized recommendations page |
| `ui/search/SearchFilters.kt` | Advanced filter bottom sheet |
| `ui/notifications/NotificationPrefsScreen.kt` | Per-type notification toggles |
| `ui/subcategories/SubcategoriesScreen.kt` | Subcategory browser |
| `data/local/db/SearchHistoryEntity.kt` | Recent searches cache |
| `data/local/db/SearchHistoryDao.kt` | Search history DAO |
| `data/local/db/DraftEntity.kt` | Post draft storage |

### Files to Enhance:
| File | Changes |
|------|---------|
| `PostDetailScreen.kt` | + ShareDialog, ImageZoom, PriceAlert, Boost, Bargain, Premium Recs |
| `SearchScreen.kt` | + Advanced filters, recent history, trending, sort |
| `HomeScreen.kt` | + Sponsored carousel, pull-refresh |
| `FeedScreen.kt` | + Share per post, sponsored |
| `ExploreScreen.kt` | + Sponsored, ForYou section |
| `ChatScreen.kt` | + WebSocket, typing, online status |
| `WishlistScreen.kt` | + Notes, bulk ops, share, add-to-cart |
| `CreatePostScreen.kt` | + Audio recorder, draft auto-save |
| `MyPostsScreen.kt` | + Bulk actions, duplicate, search |
| `NearbyScreen.kt` | + Map view toggle |
| `RewardsScreen.kt` | + Referral tree, daily code |
| `ProfileScreen.kt` | + Language selector, biometric toggle |
| `NotificationsScreen.kt` | + Preferences link |
| `MhubApi.kt` | + price-alerts, sponsored, for-you, draft, daily-code, notifications/preferences endpoints |
| `Dtos.kt` | + PriceAlert, Sponsored, Draft, NotificationPreference DTOs |
| `ContentRepositories.kt` | + PriceAlertsRepository, DraftRepository, NotifPrefsRepository |
| `MhubApp.kt` | + New routes for ForYou, SubCategories, NotifPrefs, ImageZoom |

---

## SUCCESS CRITERIA (100/100)

Every web feature has Android equivalent OR better native implementation:
- [ ] All 67 web pages have corresponding Android screens
- [ ] All interactive components (share, zoom, rate, boost, bargain) present
- [ ] Real-time chat (no polling delay)
- [ ] 6+ language support
- [ ] Biometric auth (Android advantage)
- [ ] Deep linking from notifications
- [ ] Offline capability (Android advantage)
- [ ] Haptic feedback (Android advantage)
- [ ] < 2s cold start time
- [ ] Zero crashes on happy path
- [ ] All deprecated API warnings resolved

**Target: Android score 100/100, with 5 features BETTER than web (biometric, haptics, offline, deep links, native share)**
