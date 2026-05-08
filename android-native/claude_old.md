# MHub Android — Deep Analysis & 10/10 Parity Plan

**Source of Truth:** Web app at `../client/src/pages/*.jsx`  
**Architecture:** DTOs → `MhubApi.kt` → Repository → `@HiltViewModel` → `@Composable` Screen  
**Build:** `.\gradlew.bat :app:assembleDebug --no-configuration-cache -q`  
**Install:** `adb install -r app\build\outputs\apk\debug\app-debug.apk`

---

## CURRENT STATE SUMMARY

### Core Pages (Primary Navigation)

| # | Screen | Android File | Android Lines | Web File | Web Lines | Parity | Target |
|---|--------|-------------|---------------|----------|-----------|--------|--------|
| 1 | HomeScreen (AllPosts) | HomeScreen.kt | 425 | AllPosts.jsx | 4,310 | 30% | 10/10 |
| 2 | PostDetailScreen | PostDetailScreen.kt | 535 | PostDetail.jsx | 3,652 | 35% | 10/10 |
| 3 | FeedScreen | FeedScreen.kt | 403 | FeedPage.jsx | 1,637 | 40% | 10/10 |
| 4 | ChatScreen | ChatScreen.kt | 607 | Chat.jsx | 1,004 | 45% | 10/10 |
| 5 | SearchScreen | SearchScreen.kt | 325 | SearchPage.jsx | 1,552 | 30% | 10/10 |
| 6 | ExploreScreen (ForYou) | ExploreScreen.kt | 659 | ForYou.jsx | 2,670 | 25% | 10/10 |
| 7 | DashboardScreen | AccountScreens.kt | ~200 | Dashboard.jsx | 1,203 | 30% | 10/10 |
| 8 | AnalyticsScreen | AccountScreens.kt | ~150 | Analytics.jsx | 985 | 20% | 10/10 |
| 9 | OffersScreen | CommerceScreens.kt | ~350 | Offers.jsx | 1,088 | 30% | 10/10 |
| 10 | CartScreen | CommerceScreens.kt | ~400 | Cart.jsx | 828 | 35% | 10/10 |
| 11 | NotificationsScreen | NotificationsScreen.kt | 528 | Notifications.jsx | 1,628 | 40% | 10/10 |
| 12 | ProfileScreen | ProfileScreen.kt | 1,305 | Profile.jsx | 4,177 | 35% | 10/10 |
| 13 | RewardsScreen | RewardsScreen.kt | 799 | Rewards.jsx | 2,494 | 40% | 10/10 |
| 14 | SettingsScreen | SettingsScreen.kt | 404 | SecuritySettings.jsx | 721 | 50% | 10/10 |
| 15 | CreatePostScreen | CreatePostScreen.kt | 298 | AddPost.jsx | 2,131 | 25% | 10/10 |
| 16 | MyPostsScreen | MyPostsScreen.kt | 256 | MyHome.jsx | 2,202 | 20% | 10/10 |

### Secondary Pages (Feature-Complete Targets)

| # | Screen | Android File | Android Lines | Web File | Web Lines | Parity | Target |
|---|--------|-------------|---------------|----------|-----------|--------|--------|
| 17 | WishlistScreen | WishlistScreen.kt | 507 | Wishlist.jsx | 1,147 | 35% | 10/10 |
| 18 | EditPostScreen | (none) | 0 | EditPost.jsx | 545 | 0% | 10/10 |
| 19 | SoldPostsScreen | (none) | 0 | SoldPosts.jsx | 492 | 0% | 10/10 |
| 20 | BoughtPostsScreen | (none) | 0 | BoughtPosts.jsx | 485 | 0% | 10/10 |
| 21 | SaleDoneScreen | (none) | 0 | Saledone.jsx | 1,311 | 0% | 10/10 |
| 22 | SaleUndoneScreen | (none) | 0 | SaleUndone.jsx | 1,608 | 0% | 10/10 |
| 23 | NearbyScreen | NearbyScreen.kt | 252 | NearbyPosts.jsx | 585 | 30% | 10/10 |
| 24 | CategoryHubScreen | CategoryHubScreen.kt | 243 | CategoryHub.jsx | 492 | 40% | 10/10 |
| 25 | CategoriesScreen | CategoriesScreen.kt | 244 | Subcategories.jsx | 567 | 35% | 10/10 |
| 26 | CategoryDetailScreen | CategoryDetailScreen.kt | 515 | (custom) | — | 60% | 10/10 |
| 27 | RecentlyViewedScreen | (none) | 0 | RecentlyViewed.jsx | 1,328 | 0% | 10/10 |
| 28 | SavedSearchesScreen | (none) | 0 | SavedSearches.jsx | 682 | 0% | 10/10 |
| 29 | ComparePostsScreen | (none) | 0 | ComparePosts.jsx | 354 | 0% | 10/10 |

### Commerce & Transaction Pages

| # | Screen | Android File | Android Lines | Web File | Web Lines | Parity | Target |
|---|--------|-------------|---------------|----------|-----------|--------|--------|
| 30 | PaymentScreen | (none) | 0 | (payment flow) | ~1,000 | 0% | 10/10 |
| 31 | PostWelcomeScreen | CommerceScreens.kt | ~150 | PostWelcome.jsx | 677 | 20% | 10/10 |
| 32 | BuyerViewScreen | (none) | 0 | BuyerView.jsx | 609 | 0% | 10/10 |

### Community & Social Pages

| # | Screen | Android File | Android Lines | Web File | Web Lines | Parity | Target |
|---|--------|-------------|---------------|----------|-----------|--------|--------|
| 33 | MyFeedScreen | SocialScreens.kt | ~200 | MyFeedPage.jsx | 1,117 | 20% | 10/10 |
| 34 | FeedPostDetailScreen | SocialScreens.kt | ~200 | FeedPostDetail.jsx | 393 | 30% | 10/10 |
| 35 | PublicWallScreen | (none) | 0 | PublicWall.jsx | 810 | 0% | 10/10 |
| 36 | ReviewsScreen | (none) | 0 | Reviews.jsx | 815 | 0% | 10/10 |
| 37 | ActivityHubScreen | (none) | 0 | ActivityHub.jsx | 193 | 0% | 10/10 |

### Account & Verification Pages

| # | Screen | Android File | Android Lines | Web File | Web Lines | Parity | Target |
|---|--------|-------------|---------------|----------|-----------|--------|--------|
| 38 | KycScreen | KycScreen.kt | 263 | Verification.jsx | 825 | 25% | 10/10 |
| 39 | GetVerifiedScreen | (none) | 0 | GetVerified.jsx | 407 | 0% | 10/10 |
| 40 | FeedbackScreen | (none) | 0 | Feedback.jsx | 1,330 | 0% | 10/10 |
| 41 | ComplaintsScreen | (none) | 0 | Complaints.jsx | 1,223 | 0% | 10/10 |
| 42 | AccountDeletionScreen | (none) | 0 | AccountDeletion.jsx | 100 | 0% | 10/10 |

### Channel/Shop Pages

| # | Screen | Android File | Android Lines | Web File | Web Lines | Parity | Target |
|---|--------|-------------|---------------|----------|-----------|--------|--------|
| 43 | ChannelScreen | ChannelScreens.kt | 406 | ChannelPage.jsx | 858 | 30% | 10/10 |
| 44 | CreateChannelScreen | (none) | 0 | CreateChannelPage.jsx | 763 | 0% | 10/10 |
| 45 | ChannelsListScreen | (none) | 0 | ChannelsListPage.jsx | 349 | 0% | 10/10 |
| 46 | CentreListingsScreen | (none) | 0 | CentreListings.jsx | 628 | 0% | 10/10 |

### New Screens (Not Yet Built)

| # | Screen | Android File | Android Lines | Web File | Web Lines | Parity | Target |
|---|--------|-------------|---------------|----------|-----------|--------|--------|
| 47 | TierSelectionScreen | (none) | 0 | TierSelection.jsx | 1,551 | 0% | 10/10 |
| 48 | AdminPanelScreen | (none) | 0 | AdminPanel.jsx | 1,571 | 0% | 10/10 |

### Legal/Static Pages (exist in Android as LegalScreens.kt — 348 lines)

| # | Screen | Status |
|---|--------|--------|
| 49 | TermsAndConditions | ✅ exists |
| 50 | PrivacyPolicy | ✅ exists |
| 51 | RefundPolicy | ✅ exists |
| 52 | SupportTicketPolicy | ✅ exists |

**Total: 48 functional pages to reach parity (+ 4 legal pages already done)**  
**Pages at 0% (must build from scratch): 20**  
**Pages partially built: 28**

---

## PAGE 1: HomeScreen / AllPosts — Target 10/10

**Web file:** `AllPosts.jsx` (4,315 lines)  
**Android file:** `HomeScreen.kt` (438 lines)

### Web Features Present (from source code analysis):
1. **Advanced Filter System** — search, category, subcategory, categoryGroup, sortBy, latestWindow, location, minPrice, maxPrice, priceRange, startDate, endDate, condition, verifiedOnly
2. **CategoryMode Context** — activeCategory, activeSubcategory, activeApp with full filtering
3. **Page Density Toggle** — compact/regular view modes
4. **Post Translation** — automatic content translation via `translatePosts()`
5. **Wishlist Integration** — `buildSavedPostsMap()`, `fetchWishlistIds()`, `setSavedPostStatus()` with real-time subscription
6. **ShareLinkDialog** — custom share dialog (not just native intent)
7. **PromoteDialog** — post boosting/promotion UI
8. **BuyerInterestModal** — interaction form for interested buyers
9. **AllPostsQuickFilters** — predefined quick filter chips component
10. **AllPostsGreatDealsBanner** — promotional banner for great deals
11. **PostPromoBadges** — special offer/promo indicators on cards
12. **AllPostsCategoryBar** — dedicated category navigation bar
13. **Image Carousel per Card** — multiple images with left/right navigation
14. **Relative Time Formatting** — "2h ago", "3d ago" with `Intl.RelativeTimeFormat`
15. **Compare Feature** — add to comparison via `FaExchangeAlt` icon
16. **Price Range Normalization** — handles multiple price fields (price, price_value, listing_price, selling_price, etc.)
17. **Condition Normalization** — "new"/"used"/"like new" with smart matching
18. **Date Range Filtering** — start/end date with inclusive handling
19. **Latest Window Filter** — show only last 5/10/50 posts
20. **Verified-Only Filter** — filter for verified sellers only

### Android Currently Has:
- [x] Grid/List toggle
- [x] Sort chips (Popular/Newest/Price)
- [x] Infinite scroll + pull-to-refresh
- [x] Shimmer loading
- [x] Category filter strip
- [x] Search bar (basic text)
- [x] Condition badge on cards
- [x] Verified seller icon
- [x] Wishlist heart (local only, not synced)
- [x] Price overlay with gradient

### Android MISSING (must implement for 10/10):
- [ ] **Advanced Filter Bottom Sheet** — price range slider (min/max), condition picker (New/Used/Like New/Fair), location filter, date range picker, verified-only toggle
- [ ] **Quick Filters Component** — predefined one-tap filters ("Under ₹500", "Near Me", "New Arrivals", "Great Deals")
- [ ] **Great Deals Banner** — promotional section for discounted posts at top
- [ ] **Image Carousel in Cards** — `HorizontalPager` with dot indicators + left/right arrows per grid card
- [ ] **Post Promo Badges** — "🔥 Hot Deal", "⚡ Boosted", "🆕 Just Listed" badges on cards
- [ ] **Relative Time Display** — "2h ago", "3d ago" instead of raw dates
- [ ] **Real Wishlist Sync** — persist wishlist state via `POST /api/wishlist` + subscribe to changes
- [ ] **Share Link Dialog** — custom bottom sheet with copy-link, WhatsApp, Telegram, etc. (not just native share)
- [ ] **Page Density Mode** — compact vs regular card size toggle
- [ ] **Compare Feature** — "Add to Compare" action per post
- [ ] **Latest Window Filter** — "Show only last 5/10/50" option in filters
- [ ] **Price Range Slider** — `RangeSlider` composable for min/max price
- [ ] **Buyer Interest Modal** — "I'm Interested" button on posts → sends inquiry to seller

### Implementation Details:
```kotlin
// Advanced Filter Bottom Sheet
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PostFilterSheet(
    state: SheetState,
    filters: PostFilters,
    onApply: (PostFilters) -> Unit,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = state) {
        // Price Range
        Text("Price Range"); RangeSlider(value = filters.priceRange, onValueChange = ...)
        // Condition
        Text("Condition"); FilterChipRow(options = listOf("New","Used","Like New","Any"))
        // Location
        OutlinedTextField(value = filters.location, label = "Location")
        // Verified Only
        Row { Text("Verified sellers only"); Switch(checked = filters.verifiedOnly) }
        // Apply
        Button("Apply Filters") { onApply(filters); onDismiss() }
    }
}
```

---

## PAGE 2: PostDetailScreen — Target 10/10

**Web file:** `PostDetail.jsx` (3,659 lines)  
**Android file:** `PostDetailScreen.kt` (502 lines)

### Web Features Present:
1. **Section Navigation** — 11 collapsible sections: overview, listing-details, key-details, specs, location, trust-safety, description, negotiation, seller, sponsored, premium
2. **Active Section Tracking** — IntersectionObserver highlights current section in nav
3. **ImageZoomModal** — full-screen lightbox with pinch-zoom
4. **MakeOfferModal** — rich negotiation dialog with price input + message
5. **BargainActions** — counter-offer, accept, reject within detail page
6. **ShareLinkDialog** — custom share with link copying
7. **PostBoostPanel** — promotion/boost options for post owners
8. **SponsoredListings** — "Sponsored" section showing related ads
9. **PremiumRecommendations** — AI recommendations section at bottom
10. **Owner Insights** — if user owns post: inquiries, offers, viewer analytics
11. **Collapsible Sections** — expand/collapse each section independently
12. **Trust Score Detailed** — `useTrustScore` hook with badge classes, risk states
13. **Demo/Offline Fallback** — shows demo post when API unavailable
14. **Saved Post State** — bookmark with real-time subscription

### Android Currently Has:
- [x] Image pager (HorizontalPager + dot indicators)
- [x] Make Offer (basic input → POST)
- [x] Wishlist toggle
- [x] Report post
- [x] Trust score badge
- [x] Call seller
- [x] Share (native intent)
- [x] Similar posts carousel (new)
- [x] Safety tips card (new)
- [x] Condition & brand chips

### Android MISSING:
- [ ] **Section-Based Layout** — collapsible sections with headers: "Overview", "Details", "Specs", "Location", "Trust & Safety", "Description", "Negotiation", "Seller"
- [ ] **Section Navigation Strip** — horizontal scrollable section buttons at top that scroll-to-section via `LazyListState.animateScrollToItem()`
- [ ] **Full-Screen Image Zoom** — `Dialog` overlay with `Modifier.transformable()` for pinch/pan/double-tap zoom
- [ ] **Rich Make Offer Modal** — bottom sheet with: price input, optional message, "Your last offer: ₹X", suggested prices row
- [ ] **Bargain/Counter-Offer Actions** — if offer exists: Accept/Reject/Counter buttons inline
- [ ] **Owner Insights Panel** — if user owns this post: show inquiries count, offers received, recent viewers via `GET /api/posts/{id}/insights`
- [ ] **Post Boost Panel** — if user owns: "Boost this listing" with tier selection via `POST /api/posts/{id}/boost`
- [ ] **Sponsored Listings** — "You might also like (Sponsored)" carousel from `GET /api/posts/{id}/sponsored`
- [ ] **Premium Recommendations** — AI-curated similar items from `GET /api/posts/{id}/recommendations`
- [ ] **Deep Link Share** — custom share bottom sheet with: copy link, WhatsApp, Telegram, Email options
- [ ] **Detailed Specs Section** — key-value table: Brand, Model, Storage, RAM, Color, etc. from `post.specs` map
- [ ] **Location Map Preview** — static map image or mini Google Maps embed for post location
- [ ] **Seller Rating Stars** — show `seller.rating` as star rating + review count + "Member since" text

### Implementation Details:
```kotlin
// Image Zoom Dialog
@Composable
fun ImageZoomDialog(imageUrl: String, onDismiss: () -> Unit) {
    var scale by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }
    Dialog(onDismissRequest = onDismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Box(Modifier.fillMaxSize().background(Color.Black)) {
            AsyncImage(
                model = imageUrl,
                modifier = Modifier.fillMaxSize()
                    .graphicsLayer(scaleX = scale, scaleY = scale, translationX = offset.x, translationY = offset.y)
                    .pointerInput(Unit) {
                        detectTransformGestures { _, pan, zoom, _ ->
                            scale = (scale * zoom).coerceIn(1f, 5f)
                            offset += pan
                        }
                    }
            )
            IconButton(onClick = onDismiss, Modifier.align(Alignment.TopEnd).padding(16.dp)) {
                Icon(Icons.Default.Close, "Close", tint = Color.White)
            }
        }
    }
}
```

---

## PAGE 3: FeedScreen — Target 10/10

**Web file:** `FeedPage.jsx` (1,642 lines)  
**Android file:** `FeedScreen.kt` (370 lines)

### Web Features (from deep source analysis):
1. Social/community feed with post cards
2. Search with debounced query → filter feed
3. Sort options (shuffle, newest, popular, oldest)
4. Sort order toggle (asc/desc)
5. Category group filter tabs
6. Post cards: seller avatar, name, price, location, time, image
7. Like/unlike with optimistic count update
8. View count display per post
9. Share dialog (custom, not native only)
10. Promote dialog for boosting
11. Save/bookmark posts (wishlist integration)
12. Infinite scroll pagination (page, limit params)
13. Back-to-top button (appears on scroll)
14. Post image with placeholder fallback
15. Page density toggle (compact/comfortable)
16. Multi-language post translation
17. Category mode filtering
18. Login prompt modal for guests
19. Post context menu (3-dot: report, edit, delete, promote)
20. Loading/error/empty states
21. Pull-to-refresh
22. Scroll position preservation (sessionStorage)

**API Calls:** `GET /feed` (page, limit, category_group, search, sortBy, sortOrder, shuffleSeed), `POST /posts/:id/like`, `GET /wishlist`, `POST /wishlist/add`, `POST /wishlist/remove`

### Android Currently Has:
- [x] Tabs (For You / Trending / Latest)
- [x] Like animation with spring
- [x] Inline comment section
- [x] Share via Intent
- [x] Author avatar + timestamp
- [x] Image + price chip
- [x] Shimmer loading
- [x] View count display
- [x] Post detail navigation
- [x] Error state with retry

### Android MISSING:
- [ ] **Feed Search** — search `TextField` at top → debounce 300ms → filter feed in real-time
- [ ] **Sort Options** — bottom sheet or dropdown: Newest / Popular / Shuffle + asc/desc toggle
- [ ] **Category Group Filter** — horizontal chip row: "All" / "Electronics" / "Fashion" / etc. → API param
- [ ] **Infinite Scroll Pagination** — page counter + automatic load when reaching bottom
- [ ] **Back-to-Top Button** — `FloatingActionButton` that appears when scrolled past threshold
- [ ] **Wishlist/Save** — bookmark icon per post → `POST /wishlist/add` with optimistic update
- [ ] **Real Like Count** — display actual count from API (not just toggle state)
- [ ] **Share Dialog** — custom bottom sheet: copy link, WhatsApp, Telegram (not just native intent)
- [ ] **Post Context Menu** — 3-dot icon: Report, Edit (if own), Delete (if own), Promote
- [ ] **Login Prompt** — if guest taps like/save/comment, show login bottom sheet
- [ ] **Feed Compose FAB** — FloatingActionButton → navigate to CreatePost
- [ ] **Scroll Position Restore** — remember scroll offset → restore when returning to screen

---

## PAGE 4: ChatScreen — Target 10/10

**Web file:** `Chat.jsx` (1,007 lines)  
**Android file:** `ChatScreen.kt` (626 lines)

### Web Features Present:
1. **Socket.IO Real-time** — `socket.emit("join_room")`, handles `new_message`, `user_typing`, `user_stopped_typing`, `user_online`, `user_offline`, `messages_read`
2. **Connection Status Banner** — "Connected" (green), "Offline" (red), "Reconnecting..." (yellow)
3. **Online/Offline Users** — green dot on avatar if user is in `onlineUsers` Set
4. **Typing Indicator** — shows "User is typing..." with 3-second auto-clear
5. **Message Read Receipts** — all messages marked read when conversation opened, visual double-tick
6. **Conversation Search** — filter conversations by query
7. **Unread Count Badges** — per-conversation unread message count
8. **Optimistic Message Send** — message appears immediately before API confirms
9. **Mark Conversations Read** — mark single/all as read
10. **Error Recovery** — reconnection attempts, error messages

### Android Currently Has:
- [x] Conversation list + select
- [x] Message send/receive
- [x] Polling every 5s for new messages
- [x] Read receipts (✓/✓✓ display)
- [x] Unread count badge per conversation
- [x] Optimistic message sending
- [x] Post title context in conversation

### Android MISSING:
- [ ] **Connection Status Banner** — colored bar at top: green "Connected ✓" / red "Offline - messages will send when back online" / yellow "Reconnecting..."
- [ ] **Online Status Dots** — green dot overlay on avatar in conversation list for online users (poll `GET /api/chat/online-status` or track locally)
- [ ] **Typing Indicator** — "User is typing..." animated bubble in message thread (emit typing event on input change, 3s auto-clear)
- [ ] **Conversation Search** — search `OutlinedTextField` in conversation list header → filter by name/message content
- [ ] **Mark All Read Action** — "Mark all as read" text button in conversation list app bar → `POST /api/chat/mark-all-read`
- [ ] **Image Message Send** — attach button: gallery picker → compress with `BitmapFactory` → upload to `/api/upload` → send image URL as message
- [ ] **Message Types** — handle: text (normal), image URL (show as `AsyncImage`), offer-card (render as rich compact card), system message (gray italic centered)

### Implementation Details:
```kotlin
// Connection status banner
@Composable
fun ConnectionBanner(status: ConnectionStatus) {
    val (bg, text) = when (status) {
        ConnectionStatus.CONNECTED -> MaterialTheme.colorScheme.primaryContainer to "Connected"
        ConnectionStatus.OFFLINE -> MaterialTheme.colorScheme.errorContainer to "Offline"
        ConnectionStatus.RECONNECTING -> Color(0xFFFFF3CD) to "Reconnecting..."
    }
    AnimatedVisibility(visible = status != ConnectionStatus.CONNECTED) {
        Surface(color = bg, modifier = Modifier.fillMaxWidth()) {
            Text(text, Modifier.padding(8.dp), style = MaterialTheme.typography.labelSmall)
        }
    }
}
```

---

## PAGE 5: SearchScreen — Target 10/10

**Web file:** `SearchPage.jsx` (1,556 lines)  
**Android file:** `SearchScreen.kt` (343 lines)

### Web Features Present:
1. **Advanced Filters** — search, category, subcategory, sortBy, location, condition, minRating, minPrice, maxPrice, priceRange, startDate, endDate
2. **Recent Searches** — stored in localStorage (up to 10), displayed as chips, deletable
3. **Trending/Popular Searches** — `GET /api/search/trending`
4. **Subcategory Dynamic Filtering** — when category selected, show subcategories
5. **Price Range Slider** — min/max price inputs
6. **Condition Filter** — New/Used/Like New normalization
7. **Location Filter** — free-text location search
8. **Date Range** — start/end date pickers
9. **Sort Options** — relevance, newest, price-asc, price-desc, popular
10. **Result Count** — "Showing X results for 'query'"
11. **Category Mode Integration** — `buildActiveAppMatcher` filters by active category context

### Android Currently Has:
- [x] Basic text search with debounce
- [x] Category scope chips (All/Electronics/Fashion/Vehicles/Others)
- [x] Saved/recent searches list (local)
- [x] Search results grid

### Android MISSING:
- [ ] **Advanced Filter Bottom Sheet** — modal with: category dropdown, subcategory dropdown, price range (min/max), condition radio (New/Used/Any), location field, sort
- [ ] **Trending Searches Section** — `GET /api/search/trending` → show as `AssistChip` row above recent searches
- [ ] **Delete Individual Search** — trailing X icon on each saved search chip → remove from DataStore
- [ ] **Result Count Header** — "24 results for 'iPhone'" text above grid
- [ ] **Sort Dropdown** — `ExposedDropdownMenuBox`: Relevance / Newest / Price↑ / Price↓ / Popular
- [ ] **Subcategory Filter** — when category selected, fetch subcategories → show as second chip row
- [ ] **Location Suggestions** — autocomplete for location (use local city list or `GET /api/locations/suggest?q=`)
- [ ] **Voice Search** — `SpeechRecognizer` intent → fill query → auto-search
- [ ] **No Results State** — empty state with suggestions: "Try different keywords" + trending chips

---

## PAGE 6: ExploreScreen (ForYou) — Target 10/10

**Web file:** `ForYou.jsx` (2,670 lines)  
**Android file:** `ExploreScreen.kt` (688 lines)

### Web Features (from deep source analysis):
1. Personalized "For You" recommendations feed
2. Search bar with query parameter sync to URL
3. Category filter chips (from URL params)
4. Price range filters (minPrice, maxPrice)
5. Location filter
6. Date range filter (startDate, endDate)
7. Latest window filter (5/10/50)
8. "Near Me" location-based filtering
9. Post cards with image carousels (left/right arrows per card)
10. Like/unlike posts with optimistic count update
11. View count tracking (IntersectionObserver — auto-increment on scroll into view)
12. Save/bookmark posts (wishlist integration)
13. Share dialog for posts
14. Promote dialog for posts
15. Buyer interest modal
16. Login prompt modal for guests
17. Guest interests selector (category bubbles for non-logged-in users)
18. Sponsored posts section ("Great Deals" banner)
19. Page density toggle
20. Infinite scroll pagination
21. Price formatting (INR currency)
22. Relative time display
23. Cart integration (add to cart directly)
24. Category mode filtering
25. Pull-to-refresh
26. Post expanded view (inline expand without navigation)
27. Menu per post (3-dot: report, share, promote, hide)
28. Rate limiting awareness (retry-after handling)
29. Error states with auth-aware messaging
30. Translated posts (multi-language auto)

**API Calls:** `GET /posts/recommendations` (with search, category_id, minPrice, maxPrice, location, startDate, endDate, latestWindow), `POST /posts/:id/like`, `POST /posts/:id/view`, `GET /wishlist`, `POST /wishlist/add`, `POST /wishlist/remove`

### Android Currently Has:
- [x] Search bar with debounce
- [x] Categories display (emoji + name chips)
- [x] Trending posts section
- [x] Recommendations section ("For You")
- [x] Post cards with image, title, price, location
- [x] Pull-to-refresh
- [x] Category filter chips
- [x] AI hero gradient banner
- [x] Loading/error/empty states

### Android MISSING:
- [ ] **Price Range Filter** — min/max price inputs in filter sheet → API param
- [ ] **Location Filter** — "Near Me" button using `FusedLocationProviderClient` → pass lat/lng to API
- [ ] **Date Range Filter** — date picker for start/end date
- [ ] **Latest Window** — "Show last 5/10/50" option
- [ ] **Image Carousels per Card** — `HorizontalPager` with dots inside each recommendation card
- [ ] **Like/Unlike** — heart icon with count + `POST /posts/:id/like` + optimistic update
- [ ] **View Count Tracking** — auto-increment views when post scrolls into viewport via `LaunchedEffect`
- [ ] **Wishlist/Save** — bookmark icon per card → `POST /wishlist/add`
- [ ] **Share Dialog** — bottom sheet with copy-link, WhatsApp, etc.
- [ ] **Buyer Interest Modal** — "I'm Interested" → sends inquiry to seller
- [ ] **Guest Interests Selector** — if not logged in, show category bubble picker to personalize feed
- [ ] **Sponsored/Great Deals Banner** — promotional card section at top
- [ ] **Infinite Scroll Pagination** — load next page on scroll-to-bottom
- [ ] **Post Context Menu** — 3-dot icon per card: Report, Share, Promote, Hide
- [ ] **Cart Integration** — "Add to Cart" button on cards for buyable items
- [ ] **Inline Post Expand** — tap card to expand details without full navigation

---

## PAGE 7: DashboardScreen — Target 10/10

**Web file:** `Dashboard.jsx` (1,203 lines)  
**Android file:** `AccountScreens.kt` (DashboardScreen section ~200 lines)

### Web Features Present:
1. **User Greeting Card** — avatar + "Welcome back, [Name]"
2. **Quick Stats with CTA** — each stat links to: listings→/my-posts, sales→/sold-posts, views→/my-feed, coins→/rewards
3. **Trend Indicators** — "+Active", "+Sold", "+Views", "+Coins" labels
4. **Top Sellers Section** — ranked list of top performers
5. **Recent Activity** — activity feed with translation
6. **Seller Dashboard** — embedded `SellerDashboard` component
7. **View Mode Toggle** — "seller" vs "buyer" views
8. **Error Recovery** — session-expired detection, retry

### Android Currently Has:
- [x] Welcome card with avatar
- [x] Stats grid (4 cards with icons)
- [x] Period selector chips
- [x] Animated count-up
- [x] Recent activity list

### Android MISSING:
- [ ] **Clickable Stats** — each stat card navigates: listings→MyPosts, sales→SoldPosts, views→Feed, coins→Rewards
- [ ] **Trend Badges** — "+12% this week" or "+3 Active" green/red badge on each stat card
- [ ] **Top Sellers Section** — "Top Sellers" ranked list from `dashboard.topSellers[]` with avatar + name + sales count
- [ ] **Seller/Buyer View Toggle** — `SegmentedButton`: "Seller" / "Buyer" showing different stat cards
- [ ] **Quick Action Cards** — "Create Post", "View Offers", "Analytics" horizontal cards that navigate on tap
- [ ] **Activity Translation** — translate activity titles to user's language preference
- [ ] **Revenue Card** — dedicated card showing total revenue + sparkline/trend arrow

---

## PAGE 8: AnalyticsScreen — Target 10/10

**Web file:** `Analytics.jsx` (991 lines)  
**Android file:** `AccountScreens.kt` (AnalyticsScreen section ~150 lines)

### Web Features Present:
1. **Time Range Selector** — 7D / 30D / 90D / All time chips
2. **Multiple API Calls** — `/seller-analytics/stats`, `/analytics/seller`, `/analytics/posts`, `/analytics/categories`
3. **Overview Cards** — Views, Inquiries, Sold Posts, Revenue (INR formatted)
4. **Post-Level Analytics** — individual posts with views/inquiries
5. **Category Breakdown** — analytics grouped by category
6. **Conversion Rate** — views→inquiries→sales pipeline
7. **Average Rating + Total Reviews**
8. **Active Listings Count**
9. **Date Filtering** — filter by date range window

### Android Currently Has:
- [x] Basic stats display from `GET /api/seller-analytics`

### Android MISSING:
- [ ] **Time Range Chips** — "7D" / "30D" / "90D" / "All" `FilterChip` row → re-fetch with date params
- [ ] **Overview Stat Cards** — 4 Material3 cards: Total Views, Inquiries, Posts Sold, Revenue (₹)
- [ ] **Bar Chart** — views per day using Compose `Canvas` + `drawRect` (7 bars for 7D, etc.)
- [ ] **Post Performance List** — top posts sorted by views: thumbnail + title + view count + inquiry count
- [ ] **Category Breakdown** — horizontal stacked bar showing % per category with legends
- [ ] **Conversion Funnel** — Views → Inquiries → Offers → Sales (horizontal bars with decreasing widths + % labels)
- [ ] **Period Comparison** — "This week vs last week: +23%" comparison indicator
- [ ] **Refresh Button** — explicit refresh icon in top bar → re-fetch all endpoints
- [ ] **Export Data** — "Export" button → generate CSV text → share via `ACTION_SEND` Intent

### Implementation Details:
```kotlin
// Simple bar chart with Canvas
@Composable
fun ViewsBarChart(data: List<Int>, modifier: Modifier = Modifier) {
    val maxVal = data.maxOrNull()?.toFloat() ?: 1f
    Canvas(modifier.height(120.dp).fillMaxWidth()) {
        val barWidth = size.width / data.size
        data.forEachIndexed { i, value ->
            val barHeight = (value / maxVal) * size.height
            drawRect(
                color = Color(0xFF2563EB),
                topLeft = Offset(i * barWidth + 4f, size.height - barHeight),
                size = Size(barWidth - 8f, barHeight)
            )
        }
    }
}
```

---

## PAGE 9: OffersScreen — Target 10/10

**Web file:** `Offers.jsx` (1,142 lines)  
**Android file:** `CommerceScreens.kt` (OffersScreen section ~350 lines)

### Web Features Present:
1. **TransactionStepper** — 5-step: Offer Submitted → Seller Review → Payment → Verification → Closed
2. **Step Index Mapping** — pending=0, countered=1, accepted=2, paid=3, completed=4
3. **Status Color Badges** — pending(yellow), accepted(green), rejected(red), countered(blue)
4. **Role-Based Messaging** — different text for buyer vs seller per status
5. **Next Action Guidance** — contextual text per status+role
6. **Counter-Offer Dialog** — AlertDialog with price input
7. **Saved Offers** — localStorage persistence
8. **Category Mode Filtering**
9. **Error Normalization** — auth vs generic errors

### Android Currently Has:
- [x] Received/Sent tabs
- [x] Accept/Decline actions
- [x] Basic offer card with status badge

### Android MISSING:
- [ ] **Transaction Stepper** — 5 circles connected by lines, filled up to current step, labels below each
- [ ] **Status Color Badges** — `Surface(color = statusColor)` chip: pending=amber, accepted=green, rejected=red, countered=blue
- [ ] **Role-Based Next Action Text** — "Waiting for seller to respond" / "Review and respond" based on user role
- [ ] **Counter-Offer Bottom Sheet** — `ModalBottomSheet` with: price input + optional message + "Send Counter" button
- [ ] **Offer Detail View** — tap offer → expanded view with full stepper + negotiation history + action buttons
- [ ] **Expiry Countdown** — `LaunchedEffect` with `delay(1000)` loop: "Expires in 2h 15m" live countdown
- [ ] **Chat Integration** — "Chat with buyer/seller" button → navigate to ChatScreen with conversation pre-selected
- [ ] **Offer History Timeline** — list of all counter-offers: "You offered ₹X" → "Seller countered ₹Y" → ...
- [ ] **Payment Step** — when offer accepted, show "Proceed to Payment" button for buyer role

### Implementation Details:
```kotlin
// Transaction Stepper
@Composable
fun OfferStepper(currentStep: Int, steps: List<String>) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        steps.forEachIndexed { index, label ->
            Column(horizontalAlignment = CenterHorizontally) {
                Box(
                    Modifier.size(32.dp).clip(CircleShape)
                        .background(if (index <= currentStep) MaterialTheme.colorScheme.primary
                                    else MaterialTheme.colorScheme.surfaceVariant),
                    contentAlignment = Alignment.Center
                ) {
                    if (index < currentStep) Icon(Icons.Default.Check, null, tint = Color.White)
                    else Text("${index + 1}", color = if (index <= currentStep) Color.White else Color.Gray)
                }
                Text(label, style = MaterialTheme.typography.labelSmall, maxLines = 1)
            }
            if (index < steps.lastIndex) {
                Divider(Modifier.weight(1f).align(CenterVertically), color = if (index < currentStep) MaterialTheme.colorScheme.primary else Color.LightGray)
            }
        }
    }
}
```

---

## PAGE 10: CartScreen — Target 10/10

**Web file:** `Cart.jsx` (861 lines)  
**Android file:** `CommerceScreens.kt` (CartScreen section ~400 lines)

### Web Features Present:
1. **Quantity Controls** — Minus/Plus per item with max limit
2. **Bulk Select** — checkbox per item + "Select All"
3. **Save for Later** — move item to "Saved for Later" section
4. **Move to Cart** — move saved item back to active cart
5. **Coupon Code** — input + "Apply" → validates → shows success/error
6. **Mixed Currency Warning** — alert for items in different currencies
7. **Price Breakdown** — subtotal, discount, shipping, tax, total
8. **Delivery ETA** — estimated delivery date
9. **Coins Conversion** — shows equivalent reward coins

### Android Currently Has:
- [x] Cart items list with image + price
- [x] Checkout summary
- [x] Proceed to payment button
- [x] Empty cart state

### Android MISSING:
- [ ] **Quantity +/- Stepper** — `Row` with `-` IconButton + count Text + `+` IconButton → `PUT /api/cart/{id}` with new qty
- [ ] **Swipe to Delete** — `SwipeToDismissBox` per item → remove with Snackbar undo
- [ ] **Save for Later Section** — "Saved for Later (X)" header + items list + "Move to Cart" button per item
- [ ] **Coupon Code Input** — `OutlinedTextField` + "Apply" `Button` → `POST /api/payments/promo/validate` → green success chip or red error
- [ ] **Price Breakdown Card** — `Card` showing: Subtotal, Discount (-₹X green), Shipping (+₹Y), Tax, **Total** (bold large)
- [ ] **Mixed Currency Warning** — yellow `Card` with AlertTriangle icon if items have different currencies
- [ ] **Coins Display** — "You'll earn X coins" chip below total (use `rupeesToCoins()` logic)
- [ ] **Max Quantity Limit** — disable Plus button when qty == maxQuantity from API
- [ ] **Empty Cart CTA** — "Start Shopping" button → navigate to HomeScreen

---

## PAGE 11: NotificationsScreen — Target 10/10

**Web file:** `Notifications.jsx` (1,690 lines)  
**Android file:** `NotificationsScreen.kt` (473 lines)

### Web Features Present:
1. Real-time polling (every 30s)
2. Socket.IO live push
3. Search/query filter
4. Multiple filter categories
5. Sort options (newest/oldest)
6. Pagination (30 per page)
7. Bulk select + delete
8. Notification preferences panel
9. Priority indicators
10. Route resolution from notification path
11. CSS animations for list changes

### Android Currently Has:
- [x] Notification list with type-based icons
- [x] Search bar
- [x] Unread/read grouping
- [x] Mark all read
- [x] Filter chips (All/Offers/Chat/System)
- [x] Swipe-to-dismiss
- [x] Pull-to-refresh

### Android MISSING:
- [ ] **Pagination / Load More** — "Load more" button at bottom or automatic trigger at end of list → page param in API
- [ ] **Sort Toggle** — "Newest" / "Oldest" selector in toolbar
- [ ] **Bulk Select Mode** — long-press → enter selection mode with checkboxes → "Delete Selected (X)" FAB
- [ ] **Notification Preferences** — settings gear icon → bottom sheet with category toggles: Offers, Chat, System, Marketing
- [ ] **FCM Push Registration** — `POST /api/push/register` with FCM token on login/app start
- [ ] **Priority Indicators** — high-priority items get accent-colored left border
- [ ] **Deep Navigation** — tap notification → navigate based on `notification.path` (post detail, chat, offers, etc.)
- [ ] **Animation** — `AnimatedVisibility(exit = shrinkVertically())` for smooth item removal

---

## PAGE 12: PaymentScreen — Target 10/10

**Web file:** `PaymentPage.jsx` (1,163 lines)

### Web Features:
1. Multiple payment methods (UPI, Razorpay, COD, Wallet)
2. Razorpay SDK integration with order creation + verification
3. UPI intent/QR generation
4. Payment status polling
5. Success/failure confirmation screens
6. Order summary with breakdown
7. Retry on failure

### Android MISSING:
- [ ] **Payment Method Selector** — `SegmentedButton`: UPI / Card / COD with icon per method
- [ ] **Razorpay Integration** — `POST /api/payments/razorpay/order` → launch `Checkout.open()` from Razorpay Android SDK → on success → `POST /api/payments/razorpay/verify`
- [ ] **UPI App Chooser** — query installed UPI apps via Intent → show as icon grid → launch `upi://pay?pa=...&am=...`
- [ ] **Payment Status Polling** — `LaunchedEffect` polling `GET /api/payments/{id}/status` every 3s until terminal state
- [ ] **Success Screen** — green checkmark Lottie/animated icon + order ID + "View Order" + "Continue Shopping" buttons
- [ ] **Failure Screen** — red X icon + error text + "Try Again" + "Use Different Method" buttons
- [ ] **COD Confirmation** — address display card + "Confirm Cash on Delivery" button
- [ ] **Order Summary** — compact card: item thumbnail, title, price, quantity before payment

---

## PAGE 13: ProfileScreen — Target 10/10

**Web file:** `Profile.jsx` (4,179 lines)  
**Android file:** `ProfileScreen.kt` (1,359 lines)

### Web Features (from deep source analysis):
1. Profile hero section with avatar, name, phone/email, verified badge
2. Profile completion ring/indicator
3. Tab navigation: Overview, Personal, Preferences, Settings
4. Profile edit form (full_name, phone, address, avatar_url, bio)
5. Trust score display (score, level, label, risk state, under review)
6. Stats dashboard (post count, rank, member days, sales, avg rating, review count, response rate)
7. Tier badge display (Basic/Bronze/Silver/Premium)
8. Referral code display + copy to clipboard
9. User preferences management (location, minPrice, maxPrice, subcategories)
10. Preference location detection (GPS)
11. Preference radius slider (km)
12. Category mode scoping of preferences
13. Quick actions section (collapsible)
14. "Finish your profile" section (collapsible)
15. Contact sync (native mobile contacts)
16. Channel/Centre integration (channel ID lookup)
17. Language selector
18. Account data actions (export/delete)
19. Page density toggle (compact/comfortable)
20. Login redirect for unauthenticated users
21. Parity offline mode fallback
22. Pull-to-refresh
23. Subscription status awareness
24. Recent posts display (last 4)
25. i18n (full multi-language support)

**API Calls:** `GET /profile`, `POST /profile/update`, `POST /profile/preferences/update`, `GET /posts/mine`, `GET /rewards/user/:id`, `GET /reviews/user/:id`, `GET /posts/trust/:id`, `GET /subscriptions/my`

### Android Currently Has:
- [x] Profile hero with avatar ring, name, phone/email
- [x] Tier badge (Basic/Bronze/Silver/Premium/Gold)
- [x] Verified/KYC badge display
- [x] Stats row (listings, sales, rating)
- [x] Referral code + copy
- [x] Edit profile dialog (name, phone, bio)
- [x] Pull-to-refresh
- [x] My Posts + Wishlist navigation
- [x] Profile completion calculation
- [x] Logout

### Android MISSING:
- [ ] **Tab Navigation** — Overview / Personal / Preferences / Settings tabs within profile
- [ ] **Trust Score Display** — score circle + level label + risk state indicator from `GET /posts/trust/:userId`
- [ ] **Preferences Management** — location preference, minPrice/maxPrice, preferred subcategories with `POST /profile/preferences/update`
- [ ] **GPS Location Detection** — "Use my location" button → `FusedLocationProviderClient` → reverse geocode → save
- [ ] **Preference Radius Slider** — `Slider` composable for "Search radius: X km"
- [ ] **Profile Completion Ring** — circular progress indicator showing % complete with missing fields list
- [ ] **Contact Sync** — read device contacts permission → `POST /api/contacts/sync`
- [ ] **Channel/Centre Integration** — display linked channel ID from `GET /api/channels/mine`
- [ ] **Language Selector** — dropdown to change app language → DataStore → recreate Activity
- [ ] **Account Data Export** — "Export my data" → `GET /api/profile/export` → share JSON/CSV
- [ ] **Account Delete** — "Delete account" with confirmation dialog → `DELETE /api/profile`
- [ ] **Recent Posts Preview** — last 4 posts mini-grid on profile Overview tab
- [ ] **Avatar Upload** — image picker + crop → `POST /api/upload` → update profile
- [ ] **Subscription Status Card** — current plan + expiry + "Upgrade" button
- [ ] **Sold Posts Tab** — third tab: "Sold (X)" → `GET /api/posts?sold=true&userId=me`
- [ ] **Followers/Following** — tap count → list screen with follow/unfollow buttons
- [ ] **Block/Report** — when viewing other profiles: overflow menu options

---

## PAGE 14: RewardsScreen — Target 10/10

**Web file:** `Rewards.jsx` (2,530 lines)  
**Android file:** `RewardsScreen.kt` (841 lines)

### Web Features (from deep source analysis):
1. Rewards hero banner with user info (name, rank, level, plan, avatar)
2. Referral code display + share
3. Daily secret code countdown timer
4. Coin balance display with animated delta
5. XP progress bar (current/required for next level)
6. Level display
7. Tab navigation: Overview, Earn, Referrals, Activity
8. Section navigation (dashboard, achievements, earn, challenges, referrals, redeem, activity, leaderboard)
9. Daily check-in action
10. Spin wheel action
11. Scratch card action
12. Redeem dialog (choose post to boost/feature)
13. Referral chain visualization
14. Referral tree visualization
15. Chain rules display
16. Referral leaderboard
17. Current referral rank
18. Public wall (top sellers, top buyers, top users)
19. Reward activity log with history filter (Earned/Spent/All)
20. Coin history with pagination
21. Engagement status display
22. Milestones section with claim action
23. SSE (Server-Sent Events) for real-time coin updates
24. SSE fallback polling
25. Countdown timers (secret code, leaderboard reset)
26. Toast notifications for actions
27. Diagnostics panel (debug mode)
28. Show all challenges toggle
29. i18n support
30. Pull-to-refresh

**API Calls:** `GET /rewards`, `GET /subscriptions/my`, `GET /coins/engagement`, `GET /coins/history`, `GET /rewards/stream` (SSE), `GET /rewards/leaderboard`, `GET /rewards/public-wall`, `POST /rewards/daily-checkin`, `POST /rewards/spin`, `POST /rewards/scratch`, `POST /rewards/redeem`, `POST /rewards/milestone/claim`

### Android Currently Has:
- [x] Rewards hero banner (name, rank, level, plan, referral code)
- [x] Coin balance display
- [x] XP progress bar
- [x] Daily check-in action
- [x] Spin wheel action
- [x] Scratch card action
- [x] Redeem store (boost, badge, top placement)
- [x] Milestone claiming
- [x] Engagement status display
- [x] Coin history list
- [x] Referral leaderboard
- [x] My leaderboard position
- [x] Copy referral code + share invite
- [x] Pull-to-refresh

### Android MISSING:
- [ ] **Tab Navigation** — Overview / Earn / Referrals / Activity tabs with smooth section scroll
- [ ] **Animated Coin Delta** — when coins change, show "+50" animated text rising from balance
- [ ] **Referral Chain Visualization** — tree diagram showing who referred whom (multi-level)
- [ ] **Referral Tree Graph** — visual tree with lines connecting referrer → referred users
- [ ] **Chain Rules Display** — explanation card: "Level 1: 50 coins, Level 2: 25 coins, Level 3: 10 coins"
- [ ] **Public Wall** — "Hall of Fame" section: top sellers / top buyers / top users with avatars + metrics
- [ ] **History Filter** — "Earned" / "Spent" / "All" filter chips on coin history section
- [ ] **Secret Code Countdown** — daily countdown timer: "Next secret code in: 2h 15m 30s"
- [ ] **Leaderboard Countdown** — "Leaderboard resets in: 3d 5h"
- [ ] **SSE Real-time Updates** — `EventSource` equivalent: `OkHttp` SSE client for live coin balance updates
- [ ] **Redeem Dialog with Post Selection** — when redeeming "Boost", show user's posts to choose which one to boost
- [ ] **Show All Challenges Toggle** — expand/collapse to show all vs top 3 challenges
- [ ] **Engagement Status Card** — "Your engagement: Active/Moderate/Low" with tips to improve

---

## PAGE 15: TierSelection — Target 10/10 (NEW SCREEN)

**Web file:** `TierSelection.jsx` (1,636 lines) — NOT BUILT IN ANDROID

### Web Features (from deep source analysis):
1. Four tier plans: Basic ₹500, Bronze ₹850, Silver ₹1200, Premium ₹1500
2. Feature comparison for each tier (post limits, image limits, boost credits, analytics access)
3. Animated tier cards with gradient backgrounds
4. "Popular" and "Featured" badges on cards
5. Dynamic pricing from API (overrides static prices)
6. Flash sale detection + banner display
7. CMS-driven content overrides
8. FAQ accordion section (expandable Q&A)
9. Full comparison table (all features × all tiers)
10. Cost calculator (per-listing cost based on volume)
11. Current subscription display + "Active" state
12. Subscription history (past plans + dates)
13. Free trial activation (7-day Silver, 14-day Premium)
14. Cancel subscription dialog with confirmation
15. Subscribe/upgrade action → payment
16. Plan activated success state with confetti
17. "Per-post cost" breakdown calculation
18. i18n support

**API Calls:** `GET /subscriptions/plans`, `GET /subscriptions/plans/silver/price` (flash), `GET /subscriptions/my`, `GET /subscriptions/history`, `POST /subscriptions/subscribe`, `POST /subscriptions/start-trial`, `POST /subscriptions/cancel`

### Must Build From Scratch:
- [ ] **Route** — add `TIER_SELECTION` to `Routes.kt` + NavHost entry + navigation from Profile/Settings
- [ ] **TierSelectionScreen Composable** — shows 4 plan cards in vertical scroll
- [ ] **Plan Cards** — each card: gradient background, name, price/mo, feature list with ✓/✗, "Current"/"Upgrade"/"Start Trial" button
- [ ] **Feature Comparison Table** — `LazyColumn` with sticky header: Feature | Basic | Bronze | Silver | Premium
- [ ] **Current Plan Highlight** — "Active" badge + accent border on user's current tier
- [ ] **Flash Sale Banner** — if `GET /subscriptions/plans/silver/price` returns discount, show animated sale banner
- [ ] **Cost Calculator** — "If you post X items/month, each post costs ₹Y" with Slider for volume
- [ ] **Subscription History** — expandable section showing past plans with start/end dates
- [ ] **Free Trial** — "Start 7-day free trial" button → `POST /subscriptions/start-trial` → success toast
- [ ] **Cancel Subscription** — "Cancel plan" → confirm AlertDialog → `POST /subscriptions/cancel`
- [ ] **Upgrade Flow** — tap "Upgrade" → `POST /subscriptions/subscribe` → navigate to Payment
- [ ] **FAQ Accordion** — expandable Q&A items using `AnimatedVisibility`
- [ ] **Success State** — after activation: green card with plan name + benefits summary

---

## PAGE 16: AdminPanel — Target 10/10 (NEW SCREEN — Admin Only)

**Web file:** `AdminPanel.jsx` (1,576 lines) — NOT BUILT IN ANDROID

### Must Build (only visible if `user.role == "admin"`):
- [ ] **Route** — admin-only navigation item (hide from non-admins)
- [ ] **Platform Stats Cards** — total users, total posts, transactions today, revenue
- [ ] **User Management** — list users with search + ban/unban toggle + view profile
- [ ] **Post Moderation Queue** — flagged/reported posts → approve/remove buttons
- [ ] **Announcements CRUD** — create/edit/delete system announcements
- [ ] **Analytics Overview** — platform-wide stats (not per-seller)

---

## PAGE 17: AddPost / CreatePostScreen — Target 10/10

**Web file:** `AddPost.jsx` (2,133 lines)  
**Android file:** `CreatePostScreen.kt` (~311 lines)

### Web Features (from deep source analysis):
1. Multi-step post creation form
2. Image upload with drag/preview (up to tier-based max: 1-10 images)
3. Audio recorder for voice description
4. Title input (5-100 chars validation)
5. Category dropdown (dynamically loaded)
6. Subcategory dropdown (loaded on category change)
7. Brand input
8. Model input
9. Condition selector (New/Used/Like New/Fair)
10. Age input (how old is the item)
11. Warranty input (remaining warranty)
12. Price input (positive number validation)
13. District input
14. State input
15. Contact number (10-digit Indian mobile validation)
16. Description textarea (20-1000 chars)
17. Dimensions input (L×W×H)
18. Progress checklist (9 items showing form completion %)
19. Preview mode before publish
20. Upload progress bar (XHR with progress events)
21. Tier-based image limits (Basic=1, Bronze=3, Silver=5, Premium=10)
22. Draft auto-save (every 30s to localStorage)
23. Draft restore on mount
24. Flash sale toggle (mark as flash sale)
25. Form validation with field-level errors
26. Unsaved changes warning (beforeunload)
27. Category mode pre-fill from context
28. Subscription/plan check (redirect if no post credits)
29. Dynamic tier info from API

**API Calls:** `POST /posts` (multipart FormData), `GET /subscriptions/my`, `GET /subscriptions/plans`, `GET /brands`, `fetchCategoriesCached()`, `fetchSubcategories(categoryId)`

### Android Currently Has:
- [x] Image picker (up to 8 photos)
- [x] Title input with validation
- [x] Description input
- [x] Price input (decimal keyboard)
- [x] Location input
- [x] Category dropdown
- [x] Upload with loading indicator
- [x] Image preview in LazyRow
- [x] Form validation (title, price, category, images)
- [x] Back navigation

### Android MISSING:
- [ ] **Subcategory Dropdown** — when category selected, fetch + show subcategory `ExposedDropdownMenu`
- [ ] **Brand Input** — autocomplete from `GET /brands` endpoint
- [ ] **Model Input** — free-text model field
- [ ] **Condition Selector** — radio/chips: New / Used / Like New / Fair
- [ ] **Age Input** — "How old is this item?" number field (months/years)
- [ ] **Warranty Input** — "Remaining warranty" text field
- [ ] **Contact Number** — phone field with 10-digit Indian mobile validation
- [ ] **Dimensions** — L × W × H number inputs
- [ ] **District/State Split** — separate district + state fields (not single "location")
- [ ] **Audio Recorder** — microphone button → `MediaRecorder` → attach audio file to post
- [ ] **Progress Checklist** — vertical checklist showing 9 fields completion status + overall %
- [ ] **Preview Mode** — "Preview" button → shows post card as it will appear before publishing
- [ ] **Upload Progress %** — real `RequestBody` with `ProgressRequestBody` showing actual % not just spinner
- [ ] **Tier-Based Image Limit** — check `user.tier` → limit images (Basic=1, Bronze=3, Silver=5, Premium=10)
- [ ] **Draft Auto-Save** — save form to DataStore every 30s → restore on next open
- [ ] **Draft Restore Banner** — "Restore unsaved draft?" banner on entry if draft exists
- [ ] **Flash Sale Toggle** — `Switch` to mark post as flash sale item
- [ ] **Subscription Check** — if no post credits left, show "Upgrade plan" dialog instead of form
- [ ] **Field-Level Errors** — red text below each invalid field (not just top banner)

---

## PAGE 18: MyHome / MyPostsScreen — Target 10/10

**Web file:** `MyHome.jsx` (2,209 lines)  
**Android file:** `SocialScreens.kt` (MyPostsScreen section)

### Web Features (from deep source analysis):
1. User's own posts listing
2. Tab filters: All, Active, Sold, Bought
3. Totals display per tab (count badges)
4. Search within own posts
5. Sort options (postedDate, price, views, likes, title)
6. Sort order (asc/desc)
7. Pagination with page numbers
8. Post cards (image, title, price, status badge, views count)
9. Edit post (within 5-minute window of posting)
10. Delete post (single + bulk)
11. Mark as sold action
12. Bulk selection mode (select all/deselect)
13. Move to "Sale Undone" (revert sold status)
14. Share dialog per post
15. Promote dialog per post
16. Post context menu (edit, delete, mark sold, share, promote)
17. Pull-to-refresh
18. Multi-language translation of post content
19. Category mode filtering
20. Sale completion toast (from navigation state)
21. Loading timeout (12s with special handling)
22. Empty state per tab

**API Calls:** `GET /posts/mine` (userId, category), `GET /posts/mine/totals`, `DELETE /posts/:id`, `POST /posts/:id/sold`, `GET /wishlist`

### Android Currently Has:
- [x] Posts list with image, title, price, status badge, view count
- [x] Edit button per post
- [x] Delete button with confirmation dialog
- [x] Loading/error/empty states
- [x] Post detail navigation

### Android MISSING:
- [ ] **Tab Filters** — "All" / "Active" / "Sold" / "Bought" `TabRow` with counts: "Active (12)"
- [ ] **Totals Per Tab** — badge count on each tab from `GET /posts/mine/totals`
- [ ] **Search Own Posts** — search `TextField` at top → filter displayed posts
- [ ] **Sort Options** — dropdown: "Sort by: Date / Price / Views / Likes" + asc/desc toggle
- [ ] **Pagination** — page indicator + load more or numbered pages
- [ ] **Mark as Sold** — long-press or context menu action → `POST /posts/:id/sold` → moves to "Sold" tab
- [ ] **Bulk Selection Mode** — long-press to enter → checkboxes appear → "Delete Selected (X)" FAB
- [ ] **Sale Undone** — on "Sold" tab: "Undo Sale" action → reverts to Active
- [ ] **Share Dialog** — custom share bottom sheet per post
- [ ] **Promote Dialog** — "Boost this post" bottom sheet with tier options
- [ ] **Post Context Menu** — 3-dot dropdown: Edit, Delete, Mark Sold, Share, Promote
- [ ] **Edit Time Window** — only show Edit if post age < 5 minutes (from `created_at`)
- [ ] **Pull-to-Refresh** — swipe down to reload from API

---

## PAGE 19: SettingsScreen — Target 10/10

**Web file:** `SecuritySettings.jsx` (721 lines)  
**Android file:** `SettingsScreen.kt` (404 lines)

### Web Features:
1. Password change (current + new + confirm)
2. Two-factor authentication toggle
3. Login activity log (device, IP, timestamp)
4. Active sessions management (revoke sessions)
5. Email notification preferences
6. Push notification preferences
7. Account privacy settings
8. Blocked users management
9. Data export
10. Account deactivation

### Android Currently Has:
- [x] Dark mode toggle (System/Light/Dark)
- [x] Cache clear
- [x] Logout all devices
- [x] App version display
- [x] Theme section

### Android MISSING:
- [ ] **Password Change** — current password + new password + confirm fields → `POST /api/auth/change-password`
- [ ] **Two-Factor Auth** — toggle switch → `POST /api/auth/2fa/enable` → show QR code / OTP setup
- [ ] **Login Activity** — `GET /api/auth/sessions` → list: device name, IP, last active, "Revoke" button
- [ ] **Active Sessions** — show all logged-in devices with "Sign out" per device
- [ ] **Notification Preferences** — toggles: Offers, Chat, System, Marketing → `PUT /api/notifications/preferences`
- [ ] **Blocked Users** — `GET /api/users/blocked` → list with "Unblock" button per user
- [ ] **Privacy Settings** — "Show my phone number" / "Show my email" toggles
- [ ] **Data Export** — "Download my data" → `GET /api/profile/export`
- [ ] **Account Deactivation** — "Deactivate account" → confirmation → navigate to AccountDeletion

---

## PAGE 20: WishlistScreen — Target 10/10

**Web file:** `Wishlist.jsx` (1,147 lines)  
**Android file:** `WishlistScreen.kt` (507 lines)

### Web Features:
1. Grid/list view toggle
2. Sort options (date added, price, title)
3. Remove from wishlist
4. Move to cart
5. Share wishlist
6. Price drop notifications toggle
7. Search within wishlist
8. Empty state with CTA
9. Category filter
10. Bulk select + remove

### Android Currently Has:
- [x] Wishlist grid with post cards
- [x] Remove from wishlist
- [x] Navigate to post detail
- [x] Empty state

### Android MISSING:
- [ ] **Sort Options** — dropdown: "Date Added" / "Price ↑" / "Price ↓" / "Title"
- [ ] **Grid/List Toggle** — icon button to switch layout
- [ ] **Move to Cart** — "Add to Cart" button per item → `POST /api/cart/add`
- [ ] **Search Wishlist** — search bar to filter saved items
- [ ] **Price Drop Alert** — toggle per item: "Notify me on price drop" → `POST /api/wishlist/{id}/alert`
- [ ] **Bulk Select** — long-press → checkboxes → "Remove Selected" button
- [ ] **Share Wishlist** — share all items as link or text

---

## PAGE 21: EditPostScreen — Target 10/10 (NEW)

**Web file:** `EditPost.jsx` (545 lines) — NOT BUILT IN ANDROID

### Must Build:
- [ ] **Route** — `EDIT_POST/{postId}` in Routes.kt
- [ ] **Pre-fill Form** — `GET /api/posts/{id}` → populate all fields with existing data
- [ ] **Same Form as CreatePost** — reuse fields: title, description, price, category, subcategory, brand, model, condition, images
- [ ] **Image Management** — show existing images + add new + remove existing
- [ ] **Save Changes** — `PUT /api/posts/{id}` with updated multipart data
- [ ] **Validation** — same rules as CreatePost
- [ ] **Time Window Check** — only allow edit within 5 minutes of creation (show error otherwise)

---

## PAGE 22: SoldPostsScreen — Target 10/10 (NEW)

**Web file:** `SoldPosts.jsx` (492 lines) — NOT BUILT IN ANDROID

### Must Build:
- [ ] **Route** — `SOLD_POSTS` in Routes.kt
- [ ] **Posts List** — `GET /api/posts/mine?status=sold` → list with "Sold" badge
- [ ] **Sale Details** — buyer name, sale date, sale price per item
- [ ] **Sale Undo** — "Undo Sale" button → `POST /api/posts/{id}/undo-sold`
- [ ] **Revenue Summary** — total sales amount + count at top
- [ ] **Search/Filter** — search within sold posts

---

## PAGE 23: BoughtPostsScreen — Target 10/10 (NEW)

**Web file:** `BoughtPosts.jsx` (485 lines) — NOT BUILT IN ANDROID

### Must Build:
- [ ] **Route** — `BOUGHT_POSTS` in Routes.kt
- [ ] **Purchases List** — `GET /api/posts/bought` → list with purchase date, price paid
- [ ] **Seller Info** — seller name + avatar per item
- [ ] **Review Seller** — "Leave Review" button → review dialog → `POST /api/reviews`
- [ ] **Track Order** — status per purchase (paid, shipped, delivered)
- [ ] **Return/Dispute** — "Report Issue" button → navigates to Complaints

---

## PAGE 24: SaleDoneScreen — Target 10/10 (NEW)

**Web file:** `Saledone.jsx` (1,311 lines) — NOT BUILT IN ANDROID

### Must Build:
- [ ] **Route** — `SALE_DONE/{postId}` in Routes.kt
- [ ] **Confirmation Card** — green success card: "Sale completed!" + item details
- [ ] **Buyer Details** — show buyer name, contact
- [ ] **Earnings Summary** — sale price - platform fee = your earnings
- [ ] **Rate Buyer** — star rating + optional review → `POST /api/reviews`
- [ ] **Next Actions** — "View Sold Posts", "Create New Listing", "Back to Dashboard" buttons
- [ ] **Share Achievement** — "Share your sale" → social share intent

---

## PAGE 25: SaleUndoneScreen — Target 10/10 (NEW)

**Web file:** `SaleUndone.jsx` (1,608 lines) — NOT BUILT IN ANDROID

### Must Build:
- [ ] **Route** — `SALE_UNDONE/{postId}` in Routes.kt
- [ ] **Revert Confirmation** — "Sale reverted" card with post details
- [ ] **Reason Input** — why was the sale undone (dropdown: buyer didn't pay, item damaged, etc.)
- [ ] **Revert API** — `POST /api/posts/{id}/undo-sold` with reason
- [ ] **Post Status Update** — show post is back to "Active" status
- [ ] **Navigation** — "Back to My Posts" button

---

## PAGE 26: RecentlyViewedScreen — Target 10/10 (NEW)

**Web file:** `RecentlyViewed.jsx` (1,328 lines) — NOT BUILT IN ANDROID

### Must Build:
- [ ] **Route** — `RECENTLY_VIEWED` in Routes.kt
- [ ] **View History** — Room database tracking: `INSERT` on every PostDetail visit
- [ ] **Grid Display** — post cards in grid with "Viewed 2h ago" timestamp
- [ ] **Clear History** — "Clear All" button → delete Room records
- [ ] **Remove Single** — swipe to remove individual items
- [ ] **Search History** — search within viewed posts
- [ ] **Navigate to Detail** — tap → PostDetailScreen

---

## PAGE 27: SavedSearchesScreen — Target 10/10 (NEW)

**Web file:** `SavedSearches.jsx` (682 lines) — NOT BUILT IN ANDROID

### Must Build:
- [ ] **Route** — `SAVED_SEARCHES` in Routes.kt
- [ ] **List Saved Searches** — `GET /api/saved-searches` → list with query + filters + result count
- [ ] **Run Search** — tap saved search → navigate to SearchScreen with pre-filled query/filters
- [ ] **Delete Search** — swipe or X button → `DELETE /api/saved-searches/{id}`
- [ ] **Alert Toggle** — "Notify me for new results" switch per search → `PUT /api/saved-searches/{id}/alert`
- [ ] **Save from Search** — bookmark icon on SearchScreen → `POST /api/saved-searches`

---

## PAGE 28: ComparePostsScreen — Target 10/10 (NEW)

**Web file:** `ComparePosts.jsx` (354 lines) — NOT BUILT IN ANDROID

### Must Build:
- [ ] **Route** — `COMPARE_POSTS` in Routes.kt (receives post IDs)
- [ ] **Side-by-Side Layout** — 2-3 post cards in horizontal columns
- [ ] **Feature Comparison** — rows: Price, Condition, Brand, Location, Rating, Views per post
- [ ] **Remove Post** — "X" to remove a post from comparison
- [ ] **Add Post** — "+" button → search to add another post
- [ ] **Winner Highlight** — highlight best value per row (green for lowest price, etc.)

---

## PAGE 29: NearbyScreen — Target 10/10

**Web file:** `NearbyPosts.jsx` (585 lines)  
**Android file:** `NearbyScreen.kt` (252 lines)

### Android Currently Has:
- [x] Location permission request
- [x] Nearby posts grid

### Android MISSING:
- [ ] **Distance Display** — "2.5 km away" badge on each post card
- [ ] **Radius Slider** — adjust search radius: 1km / 5km / 10km / 25km / 50km
- [ ] **Map View Toggle** — switch between list view and map pins view
- [ ] **Location Refresh** — button to re-detect current location
- [ ] **Sort by Distance** — closest first (default) or newest first

---

## PAGE 30: FeedbackScreen — Target 10/10 (NEW)

**Web file:** `Feedback.jsx` (1,330 lines) — NOT BUILT IN ANDROID

### Must Build:
- [ ] **Route** — `FEEDBACK` in Routes.kt
- [ ] **Rating Input** — 5-star rating selector for app experience
- [ ] **Category Selector** — Bug Report / Feature Request / General Feedback / Complaint
- [ ] **Description Input** — multi-line text area (min 20 chars)
- [ ] **Screenshot Attach** — image picker for screenshots
- [ ] **Submit** — `POST /api/feedback` → success confirmation
- [ ] **Past Feedback** — `GET /api/feedback/mine` → list of submitted feedback with status

---

## PAGE 31: ComplaintsScreen — Target 10/10 (NEW)

**Web file:** `Complaints.jsx` (1,223 lines) — NOT BUILT IN ANDROID

### Must Build:
- [ ] **Route** — `COMPLAINTS` in Routes.kt
- [ ] **File Complaint** — select post/transaction + reason dropdown + description → `POST /api/complaints`
- [ ] **My Complaints** — `GET /api/complaints/mine` → list with status (Open/Under Review/Resolved/Closed)
- [ ] **Complaint Detail** — tap → full details + response from admin + reply option
- [ ] **Evidence Upload** — attach images/screenshots to complaint
- [ ] **Resolution Timeline** — stepper: Submitted → Under Review → Resolved

---

## PAGE 32: ReviewsScreen — Target 10/10 (NEW)

**Web file:** `Reviews.jsx` (815 lines) — NOT BUILT IN ANDROID

### Must Build:
- [ ] **Route** — `REVIEWS` in Routes.kt
- [ ] **My Reviews** — `GET /api/reviews/mine` → reviews I've written
- [ ] **Reviews About Me** — `GET /api/reviews/user/{id}` → reviews others wrote about me
- [ ] **Write Review** — star rating + text + submit → `POST /api/reviews`
- [ ] **Reply to Review** — seller can reply to buyer reviews → `POST /api/reviews/{id}/reply`
- [ ] **Average Rating Card** — overall rating + star distribution chart (5★: 12, 4★: 8, etc.)

---

## PAGE 33: PublicWallScreen — Target 10/10 (NEW)

**Web file:** `PublicWall.jsx` (810 lines) — NOT BUILT IN ANDROID

### Must Build:
- [ ] **Route** — `PUBLIC_WALL` in Routes.kt
- [ ] **Top Sellers** — `GET /api/rewards/public-wall` → ranked list with avatar + stats
- [ ] **Top Buyers** — separate section for top buyers
- [ ] **Top Rated** — highest rated users
- [ ] **Period Filter** — "This Week" / "This Month" / "All Time" chips
- [ ] **User Card** — avatar + name + rating + sales count + tier badge
- [ ] **Navigate to Profile** — tap user → view their profile

---

## PAGE 34: ChannelScreen — Target 10/10

**Web file:** `ChannelPage.jsx` (858 lines)  
**Android file:** `ChannelScreens.kt` (406 lines)

### Android Currently Has:
- [x] Channel display with info
- [x] Channel posts listing

### Android MISSING:
- [ ] **Channel Hero** — banner image + avatar + name + follower count + description
- [ ] **Follow/Unfollow** — toggle button → `POST /api/channels/{id}/follow`
- [ ] **Channel Stats** — posts count, followers, rating, total views
- [ ] **Channel Posts Grid** — post cards in grid with sort/filter
- [ ] **Channel Contact** — "Message" button → creates chat conversation
- [ ] **Share Channel** — share channel link

---

## PAGE 35: CreateChannelScreen — Target 10/10 (NEW)

**Web file:** `CreateChannelPage.jsx` (763 lines) — NOT BUILT IN ANDROID

### Must Build:
- [ ] **Route** — `CREATE_CHANNEL` in Routes.kt
- [ ] **Channel Form** — name, description, category, banner image, avatar upload
- [ ] **Validation** — name unique check, description min length
- [ ] **Submit** — `POST /api/channels` → success → navigate to channel page
- [ ] **Tier Requirement** — show "Upgrade to create a channel" if user tier insufficient

---

## PAGE 36: ChannelsListScreen — Target 10/10 (NEW)

**Web file:** `ChannelsListPage.jsx` (349 lines) — NOT BUILT IN ANDROID

### Must Build:
- [ ] **Route** — `CHANNELS_LIST` in Routes.kt
- [ ] **Browse Channels** — `GET /api/channels` → card grid with name + avatar + follower count
- [ ] **Search Channels** — search by name
- [ ] **Category Filter** — filter channels by category
- [ ] **Follow Quick Action** — follow button on each channel card

---

## PAGE 37: KycScreen / VerificationScreen — Target 10/10

**Web file:** `Verification.jsx` (825 lines) + `GetVerified.jsx` (407 lines)  
**Android file:** `KycScreen.kt` (263 lines)

### Android Currently Has:
- [x] Basic KYC form (document type, upload)

### Android MISSING:
- [ ] **Multi-Step Verification** — step 1: phone OTP, step 2: email verify, step 3: ID upload, step 4: selfie
- [ ] **Document Types** — Aadhaar / PAN / Passport / Voter ID selector
- [ ] **Front/Back Upload** — separate image uploads for document front and back
- [ ] **Selfie Capture** — camera intent for live selfie
- [ ] **Status Tracking** — "Submitted" / "Under Review" / "Verified" / "Rejected" with reason
- [ ] **Re-submit** — if rejected, allow re-upload with updated documents

---

## PAGE 38: AccountDeletionScreen — Target 10/10 (NEW)

**Web file:** `AccountDeletion.jsx` (100 lines) — NOT BUILT IN ANDROID

### Must Build:
- [ ] **Route** — `ACCOUNT_DELETION` in Routes.kt
- [ ] **Warning Card** — "This action is irreversible" with consequences listed
- [ ] **Reason Selector** — why leaving dropdown
- [ ] **Confirmation Input** — type "DELETE" to confirm
- [ ] **Submit** — `DELETE /api/profile` → logout → navigate to login

---

## PAGE 39: MyFeedScreen — Target 10/10

**Web file:** `MyFeedPage.jsx` (1,117 lines)  
**Android file:** `SocialScreens.kt` (MyFeedScreen section ~200 lines)

### Android Currently Has:
- [x] Basic feed with own posts

### Android MISSING:
- [ ] **Activity Feed** — combined: my posts + interactions (likes, comments, offers received)
- [ ] **Filter Tabs** — "My Posts" / "Interactions" / "Mentions"
- [ ] **Engagement Stats** — total likes/comments/views on my content
- [ ] **Post Performance** — individual post view counts + trend

---

## PAGE 40: ActivityHubScreen — Target 10/10 (NEW)

**Web file:** `ActivityHub.jsx` (193 lines) — NOT BUILT IN ANDROID

### Must Build:
- [ ] **Route** — `ACTIVITY_HUB` in Routes.kt
- [ ] **Activity Cards** — quick links: "My Posts", "Sold", "Bought", "Offers", "Reviews", "Rewards"
- [ ] **Stats Overview** — counts per section
- [ ] **Navigate to Sections** — each card navigates to its screen

---

## PAGE 41: CentreListingsScreen — Target 10/10 (NEW)

**Web file:** `CentreListings.jsx` (628 lines) — NOT BUILT IN ANDROID

### Must Build:
- [ ] **Route** — `CENTRE_LISTINGS/{centreId}` in Routes.kt
- [ ] **Centre Info** — name, address, contact
- [ ] **Listings Grid** — posts belonging to this centre
- [ ] **Filter/Sort** — category filter + sort options

### 1. Translation System
- [ ] Store language preference in DataStore (`AppPreferences.language`)
- [ ] `GET /api/translations/{lang}` → cache in Room
- [ ] All hardcoded UI strings → string resources or translated from cache
- [ ] Content translation for post titles/descriptions via `POST /api/translate`

### 2. Page Density
- [ ] Global toggle in Settings: "Display Density" → Compact / Regular
- [ ] Store in DataStore, expose via `AppPreferences.density`
- [ ] Compact mode: reduced padding (8dp vs 16dp), smaller text (-2sp), tighter card spacing

### 3. Category Mode Context
- [ ] When user enters from CategoryHub, ALL subsequent pages filter to that category
- [ ] Implement `CategoryModeState` in shared ViewModel/DI
- [ ] Show "Browsing: Electronics ✕" persistent chip when category mode active
- [ ] Clear button dismisses filter and shows all content

### 4. Offline Support
- [ ] Room database for: posts cache, conversations, notifications, cart
- [ ] Show "Offline - showing cached data" banner when no network
- [ ] Queue mutations (likes, offers, messages) → sync when back online
- [ ] `ConnectivityManager.NetworkCallback` for real-time status

### 5. Deep Linking
- [ ] Handle `mhub.app/post/{id}` → PostDetailScreen
- [ ] Handle `mhub.app/profile/{id}` → ProfileScreen
- [ ] Handle `mhub.app/chat/{conversationId}` → ChatScreen
- [ ] Register intent-filter in AndroidManifest.xml

---

## IMPLEMENTATION BATCHES (Priority Order — All 48 Pages)

```
BATCH 1 — Core Screens Enhancement (Highest User Impact):
  1. HomeScreen: Advanced Filters + Image Carousel + Quick Filters + Promo Badges
  2. PostDetail: Sections + Image Zoom + Rich Offer + Specs Table + Seller Stars
  3. Cart: Quantity +/- + Coupon + Price Breakdown + Save for Later
  4. Offers: Transaction Stepper + Counter-Offer Sheet + History Timeline
  5. Chat: Connection Banner + Typing Indicator + Online Dots + Image Messages

BATCH 2 — Discovery & Analytics:
  6. Search: Advanced Filters + Voice + Trending + Sort + Subcategory
  7. Analytics: Time Range Chips + Bar Chart + Conversion Funnel + Export
  8. Dashboard: Clickable Stats + Trends + Top Sellers + Seller/Buyer Toggle
  9. Feed: Search + Sort + Pagination + Wishlist + Context Menu + Compose FAB
  10. ExploreScreen: Price/Location/Date Filters + Like + Wishlist + Infinite Scroll

BATCH 3 — Post Management:
  11. CreatePost: Subcategory + Brand + Condition + Audio + Draft + Progress + Tier Limits
  12. EditPost: NEW — pre-fill form + image management + PUT update
  13. MyPosts: Tabs (All/Active/Sold/Bought) + Sort + Mark Sold + Bulk + Promote
  14. SoldPosts: NEW — sold posts list + revenue summary + sale undo
  15. BoughtPosts: NEW — purchase history + review seller + track order

BATCH 4 — Profile & Account:
  16. Profile: Trust Score + Preferences + GPS + Avatar Upload + Tabs + Followers
  17. Settings: Password Change + 2FA + Sessions + Notification Prefs + Blocked Users
  18. KYC/Verification: Multi-step + Document Upload + Selfie + Status Tracking
  19. AccountDeletion: NEW — warning + confirm + delete
  20. Wishlist: Sort + Search + Move to Cart + Price Drop Alerts + Bulk

BATCH 5 — Rewards & Community:
  21. Rewards: Tabs + Referral Chain/Tree + Public Wall + SSE + History Filter
  22. PublicWall: NEW — top sellers/buyers/rated + period filter
  23. Reviews: NEW — my reviews + reviews about me + reply + rating distribution
  24. Feedback: NEW — rate app + category + screenshot + submit
  25. Complaints: NEW — file + track + evidence + resolution timeline

BATCH 6 — Commerce Flow:
  26. Payment: NEW — method selector + Razorpay + UPI + polling + success/fail
  27. SaleDone: NEW — confirmation + earnings + rate buyer + share
  28. SaleUndone: NEW — revert + reason + status update
  29. BuyerView: NEW — buyer perspective view of purchases
  30. PostWelcome: Enhance existing — tier info + CTA to create post

BATCH 7 — Browsing & Discovery Extras:
  31. RecentlyViewed: NEW — Room history + grid + clear + remove
  32. SavedSearches: NEW — list + run + delete + alerts
  33. ComparePosts: NEW — side-by-side + feature rows + winner highlight
  34. Nearby: Radius slider + distance badge + map toggle
  35. CategoryHub: Animated background + trending badges
  36. Categories/Subcategories: Enhance with post counts + featured items

BATCH 8 — Channels/Shops:
  37. Channel: Hero banner + follow + stats + posts grid + share
  38. CreateChannel: NEW — form + validation + tier requirement
  39. ChannelsList: NEW — browse + search + category filter + follow
  40. CentreListings: NEW — centre info + listings grid

BATCH 9 — Social & Activity:
  41. MyFeed: Activity feed + filter tabs + engagement stats
  42. FeedPostDetail: Enhance with full interaction
  43. ActivityHub: NEW — quick links + stats overview
  44. Notifications: Pagination + Bulk Ops + Preferences + Deep Nav + FCM

BATCH 10 — Platform Features:
  45. TierSelection: NEW — plan cards + compare + trial + flash sale + history
  46. AdminPanel: NEW — stats + user management + moderation + announcements

BATCH 11 — Cross-Cutting (Global):
  47. Page Density Toggle (global compact/regular)
  48. Translation System (i18n + content translation)
  49. Category Mode Global Filter (persistent across screens)
  50. Offline Support (Room cache + offline banner + queue mutations)
  51. Deep Linking (post, profile, chat URIs)
  52. Final QA: every screen tested on device + clean build + install
```

---

## TECHNICAL PATTERNS

| Layer | Pattern |
|-------|---------|
| DTO | `@Serializable data class` in `Dtos.kt` |
| API | `@GET`/`@POST`/`@PUT`/`@DELETE` in `MhubApi.kt` |
| Repository | `suspend fun X(): ApiResult<T>` wrapping `safeApiCall` |
| ViewModel | `@HiltViewModel`, `StateFlow<UiState>`, load in `init {}` |
| Screen | `@Composable`, `collectAsStateWithLifecycle()`, events go up |
| Navigation | Route in `Routes.kt`, composable in `MhubApp.kt` NavHost |
| Error | `safeApiCall` → `ApiResult.Success` / `ApiResult.Failure` |
| Loading | Shimmer placeholders from `ShimmerComponents.kt` |
| Dark Mode | `MaterialTheme.colorScheme` only, never hardcode colors |
| Offline | Room cache → show cached on `ApiResult.Failure` |
| Bottom Sheets | `ModalBottomSheet` for filters, offers, share |
| Animation | `animateFloatAsState`, `spring()`, `AnimatedVisibility` |
| State | `data class XUiState(val loading, val error, val data)` |
| Events | `sealed interface XEvent` → ViewModel processes |

---

## DESIGN SPECS (Mobile-Adapted)

| Element | Spec |
|---------|------|
| Card corner radius | 16.dp |
| Card elevation | 2-4.dp |
| Section spacing | 16.dp vertical |
| Touch targets | Min 48.dp × 48.dp |
| Font: Heading | 20-24.sp Bold (titleLarge) |
| Font: Body | 14-16.sp Regular (bodyMedium/bodyLarge) |
| Font: Caption | 11-12.sp (labelSmall) |
| Primary | MaterialTheme.colorScheme.primary |
| On Primary | MaterialTheme.colorScheme.onPrimary |
| Surface | MaterialTheme.colorScheme.surface |
| Error | MaterialTheme.colorScheme.error |
| Divider | MaterialTheme.colorScheme.outlineVariant |
| Icon size | 24.dp default, 20.dp in chips, 32.dp in cards |
| Bottom nav | 80.dp height with labels |
| Padding: Screen | 16.dp horizontal |
| Padding: Card internal | 12-16.dp |
| Image aspect ratio | 4:3 for listings, 1:1 for avatars |
