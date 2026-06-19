# MHub Android App — Screen-by-Screen Feature & Improvement Analysis

> **Date:** 2026-06-12
> **Scope:** Every composable screen/page in the `android-native/app/src/main/java/com/mhub/app/ui/` directory.
> **Format:** Each section lists current features, then proposes additions, optimizations, and UX enhancements.

---

## 1. HomeScreen.kt

**Purpose:** Main landing feed showing trending/recommended posts.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Pull-to-refresh** — No refresh gesture exists; user must navigate away and back. Add `PullToRefreshBox` or `pullRefresh` modifier. | Feature Addition |
| 2 | **Skeleton shimmer on first load** — Already uses `ListShimmer`; consider staggered skeleton to match layout shape | Enhancement |
| 3 | **Hero carousel / curated banner** — A scrollable horizontal row of featured/trending posts at the top would improve content discovery | New Feature |
| 4 | **Category quick-pills row** — Horizontal scrollable chips for popular categories (like ExploreScreen has) would help users drill down faster | New Feature |
| 5 | **Empty state differentiation** — Currently shows shimmer only; distinguish "first time user" vs "no content available" vs "network error" states | Enhancement |
| 6 | **Animated post-card entrance** — Cards slide in with staggered fade+slide animation for a polished feel when data loads | UX Polish |
| 7 | **Network connectivity banner** — Show a subtle `Snackbar` or top banner when offline, with auto-dismiss on reconnect | Enhancement |
| 8 | **Haptic feedback on key interactions** — Light haptic on post-card taps, bookmark actions, etc. | UX Polish |
| 9 | **Localization audit** — Check all hardcoded strings are using `stringResource()` | Code Quality |
| 10 | **Theme color audit** — Replace any remaining `Color(0xFF...)` with `MaterialTheme.colorScheme.*` tokens | Code Quality |

---

## 2. PostDetailScreen.kt

**Purpose:** Full post/article detail view with tabs, comments, offers.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Image gallery with pinch-to-zoom** — Currently shows images; add `zoomable()` modifier and swipeable gallery for multi-image posts | New Feature |
| 2 | **Share-to-story / share-as-image** — Generate a styled share card image from post content | New Feature |
| 3 | **Read time + progress indicator** — Show estimated read time; floating reading progress bar at top | UX Polish |
| 4 | **Related posts carousel at bottom** — After content, show horizontal row of related/recommended posts | New Feature |
| 5 | **"Back to top" FAB** — Floating action button appears when scrolled past threshold, scrolls to top smoothly | Enhancement |
| 6 | **Comment reactions (like individual comments)** — Currently like count exists; add emoji reactions inline | New Feature |
| 7 | **Report / block user action sheet** — Currently may lack inline reporting; add a bottom-sheet with Report/Block/Unfollow | Enhancement |
| 8 | **Bookmark / save animation** — Bookmark icon should animate (fill/unfill) with spring physics | UX Polish |
| 9 | **Deep link handling** — Support `mhub://post/{id}` deep links to share and open posts directly | Enhancement |
| 10 | **Offline save for reading later** — Download post content to local DB for offline reading | New Feature |

---

## 3. ExploreScreen.kt

**Purpose:** Browse & discover listings with filters, map, compare.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Infinite scroll with pagination indicator** — Already has LazyColumn; add scroll-to-bottom pagination loading indicator | Enhancement |
| 2 | **Map view toggle** — Currently has a non-interactive map placeholder; integrate Google Maps composable for listing pins | New Feature |
| 3 | **Filter preset / saved searches** — Allow users to save filter combinations and quickly reapply | New Feature |
| 4 | **Price range slider** — Replace two separate Min/Max text fields with a dual-thumb `RangeSlider` | UX Polish |
| 5 | **Recently viewed highlight** — Ghost/transparent overlay on posts the user has already clicked | Enhancement |
| 6 | **Sort options panel** — Move sort into an expandable bottom sheet with more options (Price low-high, Most recent, Best match) | Enhancement |
| 7 | **Search-as-you-type suggestions** — Already has some; debounce and show live count of results | Enhancement |
| 8 | **Wishlist quick-add** — Long-press or secondary tap to add to wishlist without opening detail | UX Polish |
| 9 | **Grid/List view toggle persistence** — Remember user's preferred view mode across sessions | Enhancement |
| 10 | **Localization** — Search placeholder and some UI strings are still hardcoded to English | Localization |

---

## 4. FeedScreen.kt

**Purpose:** Community feed — posts from followed users.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Pull-to-refresh** — Already partially addressed; ensure full `PullToRefreshBox` integration | Enhancement |
| 2 | **Stories / ephemeral posts row** — Horizontal scrollable circle avatars at top for 24h story-like content | New Feature |
| 3 | **Create quick post FAB** — A floating button to quickly create a text-only or media post | New Feature |
| 4 | **Pin/unpin important posts** — Allow users to pin their own posts to top of their followers' feeds | New Feature |
| 5 | **Post reaction selection** — Long-press like button to show reaction picker (👍 ❤️ 😮 😢 😡) | New Feature |
| 6 | **Share with screenshot** — Share post as a styled image card (not just text URL) | New Feature |
| 7 | **Follow/unfollow animation** — Smooth transition when following/unfollowing a user from the feed | UX Polish |
| 8 | **Feed filters** — Toggle between "All", "Following", "Trending" (may already exist; enhance with persistence) | Enhancement |
| 9 | **Mute user from feed** — Long-press menu on post to mute/unfollow/report without leaving feed | Enhancement |
| 10 | **Offline indicator** — Show which posts were loaded from cache when offline | Enhancement |

---

## 5. ForYouScreen.kt

**Purpose:** Algorithmically curated content, personalized feed.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Interest onboarding** — First-time users should pick interests to seed recommendations | New Feature |
| 2 | **"Not interested" swipe** — Swipe left on a card to dismiss and improve recommendations | New Feature |
| 3 | **Trending topics section** — Show trending hashtags or topics with live count | New Feature |
| 4 | **Personalized recommendation explanation** — "Because you liked X" tag on recommended posts | Enhancement |
| 5 | **Refresh-on-focus** — Auto-refresh when user returns from background | Enhancement |
| 6 | **Content diversity meter** — Show a subtle indicator of content variety | Enhancement |
| 7 | **Time-based curation** — Morning/evening/weekend content variety | New Feature |
| 8 | **A/B test feedback mechanism** — Thumbs up/down on posts to train algorithm | Enhancement |

---

## 6. MoreScreen.kt

**Purpose:** Navigation hub / overflow menu.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Sealed route refactor** — Replace 40-lambda pattern with proper sealed class routing (architectural tech debt) | Code Quality |
| 2 | **Recently accessed shortcuts** — Dynamic row of recently visited pages at top | New Feature |
| 3 | **Search in menu** — Quick-search across all menu items and their sub-items | New Feature |
| 4 | **Customizable menu order** — Drag-to-reorder favorite menu items | New Feature |
| 5 | **Badge counts** — Show notification/update badges on relevant menu items (e.g., Wishlist count, Cart count) | Enhancement |
| 6 | **Quick actions row** — "Create listing", "Scan QR", "Contact support" as prominent shortcut chips | New Feature |
| 7 | **Collapsed sub-menus** — Group settings/legal into expandable categories to reduce scroll length | Enhancement |
| 8 | **Logged-out state** — Show login prompt instead of user-specific items when not authenticated | Enhancement |

---

## 7. ProfileScreen.kt

**Purpose:** User profile — stats, listings, reviews, settings.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Profile completion progress** — Already has partial; enhance with checklist of missing fields with direct links to fill them | Enhancement |
| 2 | **Highlight reels / featured posts** — User can pin 3-6 posts to top of profile as "featured" | New Feature |
| 3 | **Analytics dashboard** — For seller profiles: views, saves, shares count per period | New Feature |
| 4 | **QR code for profile sharing** — Generate and display a shareable QR code linking to user profile | New Feature |
| 5 | **Profile themes / customization** — Allow color/banner customization for seller profiles | New Feature |
| 6 | **Mutual connections** — "Followed by X and Y friends" social proof line | Enhancement |
| 7 | **Edit preview** — Show a live preview of profile changes before saving | UX Polish |
| 8 | **Linked social accounts display** — Show connected Instagram/Twitter/etc. with verification | New Feature |
| 9 | **Activity heatmap** — GitHub-style contribution heatmap showing posting activity | New Feature |
| 10 | **Blocked users management** — Quick-access list of blocked users to unblock | Enhancement |

---

## 8. AccountScreens.kt

**Purpose:** Account management — security, linked accounts, deletion.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Biometric/face unlock toggle** — Quick setting to enable fingerprint/face ID for app lock | New Feature |
| 2 | **Session management** — View and revoke active sessions (log out of other devices) | New Feature |
| 3 | **Download my data** — GDPR-style data export button (JSON/CSV) | New Feature |
| 4 | **Account activity log** — Recent login locations, devices, and times | New Feature |
| 5 | **Security checkup wizard** — Step-by-step: 2FA status → recent logins → connected apps → password strength | New Feature |
| 6 | **Two-step verification setup** — Enhance existing 2FA with backup codes display | Enhancement |
| 7 | **Delete account grace period** — Show countdown before permanent deletion with "cancel" option | Enhancement |
| 8 | **Email/phone change verification** — Current verification flow works; add visual step indicator | UX Polish |
| 9 | **Linked social accounts** — Connect/disconnect Google, Facebook, Apple Sign-In | New Feature |

---

## 9. LoginScreen.kt & SignUpScreen.kt

**Purpose:** Authentication flow.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Biometric login** — After initial login, offer fingerprint/face unlock for subsequent visits | New Feature |
| 2 | **Social sign-in buttons** — Add "Continue with Google/Apple/Facebook" for one-tap auth | New Feature |
| 3 | **Password strength indicator** — Visual bar for password complexity during sign-up | UX Polish |
| 4 | **Magic link / passwordless option** — Email magic link as alternative to password | New Feature |
| 5 | **OTP auto-read** — Use SMS Retriever API to auto-fill OTP codes | Enhancement |
| 6 | **Error message polish** — Distinguish "account not found", "wrong password", "too many attempts" with appropriate recovery actions | UX Polish |
| 7 | **Animated transitions between steps** — Smooth slide/fade between login → OTP → success | UX Polish |
| 8 | **"Remember this device" checkbox** — Trust this device for 30 days to reduce login frequency | Enhancement |
| 9 | **Country code selector** — Searchable dropdown for phone country codes | Enhancement |
| 10 | **Localization** — Several placeholder strings still hardcoded to English | Localization |

---

## 10. SettingsScreen.kt

**Purpose:** App preferences — notifications, theme, language, privacy.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Dark mode scheduling** — "Follow system" / "Scheduled" (sunset to sunrise) / "Always on" | New Feature |
| 2 | **Font size / display scaling** — Slider to adjust content text size independent of system setting | New Feature |
| 3 | **Read receipts toggle** — Control whether others see when you've read their messages | New Feature |
| 4 | **Auto-play video settings** — Never / Wi-Fi only / Always for feed videos | New Feature |
| 5 | **Notification quiet hours** — Schedule "do not disturb" time window with exception list | New Feature |
| 6 | **Cache management** — Show cache size with "Clear cache" button and last-cleared timestamp | Enhancement |
| 7 | **Backup & restore** — Backup app preferences to cloud | New Feature |
| 8 | **Accessibility settings** — Reduce motion, high contrast, screen reader optimizations | Enhancement |
| 9 | **Regional formatting** — Date format (DD/MM vs MM/DD), number formatting, currency | Enhancement |
| 10 | **Privacy dashboard** — Single page showing all privacy-related settings with quick toggles | Enhancement |

---

## 11. NotificationsScreen.kt

**Purpose:** Push/in-app notification history and management.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Bulk mark-as-read** — "Mark all as read" button at top | Enhancement |
| 2 | **Notification grouping** — Group by type (likes, comments, follows, system) with collapse/expand | New Feature |
| 3 | **In-app notification toasts** — Slide-down toast for real-time notifications while in app | New Feature |
| 4 | **Filter tabs** — "All" / "Unread" / "Mentions" quick filter chips | New Feature |
| 5 | **Swipe to dismiss single notification** — Already partly exists; ensure smooth animation | Enhancement |
| 6 | **Deep link into notification source** — Tap navigates to specific post/message/profile | Enhancement |
| 7 | **Push notification preferences** — Granular per-category toggles (already has NotificationPrefsScreen) | Enhancement |
| 8 | **Notification history retention** — Show "Older notifications" with clear labelling of time windows | Enhancement |
| 9 | **Scroll to top shortcut** — Tap status bar or FAB to jump to top of long notification list | UX Polish |

---

## 12. ScannerScreen.kt

**Purpose:** QR / barcode scanner for products, referrals, etc.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Flashlight toggle** — Button to enable/disable camera flash | Enhancement |
| 2 | **History of scanned codes** — Keep a recent scan history with timestamps | New Feature |
| 3 | **Scan from gallery** — Allow selecting an image with QR code from photo library | New Feature |
| 4 | **Multi-format support** — Scan product barcodes (UPC/EAN) in addition to QR codes | Enhancement |
| 5 | **Auto-copy result** — Option to auto-copy scan result to clipboard | Enhancement |
| 6 | **Vibration on scan** — Haptic feedback when code is successfully detected | UX Polish |
| 7 | **Scan area guide animation** — Animated corner brackets that pulse to guide user | UX Polish |
| 8 | **Result preview card** — Show a small preview card overlay before navigating (e.g., product name + price) | Enhancement |

---

## 13. NearbyScreen.kt

**Purpose:** Location-based listings nearby.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Interactive map view** — Replace non-interactive placeholder with Google Maps composable showing listing pins | New Feature |
| 2 | **Radius slider** — Customizable search radius (1 km / 5 km / 10 km / 25 km / 50 km) | Enhancement |
| 3 | **"List view" toggle** — Switch between map and list view | New Feature |
| 4 | **Current location accuracy indicator** — Show GPS accuracy circle around user dot | Enhancement |
| 5 | **Saved locations** — Allow saving frequently searched areas | New Feature |
| 6 | **Real-time distance updates** — Distance recalculates as user moves | Enhancement |
| 7 | **Cluster markers** — Cluster nearby listings on map zoom levels | New Feature |
| 8 | **Direction / "Navigate" button** — Open Google Maps with directions to listing | New Feature |
| 9 | **Location permission graceful handling** — Show rationale dialog and settings redirect if denied | Enhancement |

---

## 14. ActivityHubScreen.kt

**Purpose:** User activity feed — likes, comments, follows, purchases.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Activity filters** — "All" / "Likes" / "Comments" / "Follows" / "Purchases" filter tabs | New Feature |
| 2 | **Period selector** — "Today" / "This Week" / "This Month" date range picker | New Feature |
| 3 | **Export activity log** — Download activity history as CSV | New Feature |
| 4 | **Aggregated notifications** — "X people liked your post" instead of individual entries | Enhancement |
| 5 | **Activity insights** — Weekly summary: "Your posts got 50% more engagement this week" | New Feature |
| 6 | **Click-through rate tracking** — For sellers: show how many clicked on listing from activity | Enhancement |
| 7 | **Activity search** — Search within activity history by keyword | New Feature |
| 8 | **Timeline scroll** — Pinch-to-zoom on timeline to compress/expand dates | UX Polish |

---

## 15. CommerceScreens.kt

**Purpose:** Buy/sell marketplace — orders, listing management, offers, comparison.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Order tracking timeline** — Visual step indicator: Ordered → Shipped → In Transit → Delivered | New Feature |
| 2 | **Bulk listing management** — Select multiple listings to edit/delete/feature | New Feature |
| 3 | **Price drop alerts** — Notify users when a watched item's price drops | New Feature |
| 4 | **Seller response time badge** — Show average response time on seller profile | Enhancement |
| 5 | **Negotiation counter-offer** — Allow buyer/seller to counter-offer within a chat-like thread | New Feature |
| 6 | **Shipping label generation** — In-app shipping label creation for sellers | New Feature |
| 7 | **Dispute / return request flow** — Streamlined process with attachment upload and status tracking | Enhancement |
| 8 | **Sales analytics** — Charts for seller: revenue, impressions, conversion rate over time | New Feature |
| 9 | **Promotional tools** — "Boost listing" feature to promote items in search results | New Feature |
| 10 | **Multi-currency support** — Display prices in user's preferred currency with live conversion | Enhancement |

---

## 16. CheckoutScreens.kt

**Purpose:** Payment / checkout flow.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Saved cards UI** — Show last 4 digits with card brand icon for returning users | New Feature |
| 2 | **UPI / wallet payment option** — Add UPI, Google Pay, PhonePe as payment methods | New Feature |
| 3 | **Order summary expansion** — Expandable section showing item-by-item breakdown with prices | UX Polish |
| 4 | **Coupon / promo code field with validation** — Real-time coupon validation and discount preview | New Feature |
| 5 | **Address autocomplete** — Google Places autocomplete for shipping address | Enhancement |
| 6 | **Progress stepper** — Visual 3-step: Cart → Address → Payment with active step indicator | UX Polish |
| 7 | **Secure payment badge** — PCI-compliant badge + SSL lock icon for trust signals | Enhancement |
| 8 | **Guest checkout option** — Allow checkout without account (with email receipt) | New Feature |
| 9 | **Order confirmation animation** — Success checkmark animation with order number display | UX Polish |

---

## 17. SearchScreen.kt

**Purpose:** Global search across listings, users, posts.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Voice search** — Microphone icon that triggers Speech-to-Text for query input | New Feature |
| 2 | **Trending searches** — Show trending search terms in the community | New Feature |
| 3 | **Search within results** — "Refine" button on search results page to filter within current results | Enhancement |
| 4 | **Auto-complete with counts** — "iPhone (24 listings)" instead of just text suggestion | Enhancement |
| 5 | **History search** — Search within recent searches | Enhancement |
| 6 | **Image search** — Camera icon to search by photo (Google Lens integration) | New Feature |
| 7 | **Category-aware search** — Auto-detect category context from current browsing section | Enhancement |
| 8 | **Search results save** — Save a search query and get notified of new matching listings | New Feature |
| 9 | **Spelling correction** — "Did you mean: __?" suggestion for misspelled queries | Enhancement |
| 10 | **Filtered results count** — Show "X of Y results" after applying filters | UX Polish |

---

## 18. WishlistScreen.kt

**Purpose:** Saved items / bookmarks.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Collections / folders** — Organize saved items into custom collections ("My Favorites", "Gift Ideas") | New Feature |
| 2 | **Price change indicators** — Green/red arrow badges showing price increase/decrease since save | New Feature |
| 3 | **Share wishlist** — Generate shareable link to entire wishlist or collection | New Feature |
| 4 | **Move between collections** — Long-press → "Move to collection" action | Enhancement |
| 5 | **"Add to cart" from wishlist** — Quick-add button directly from wishlist card | Enhancement |
| 6 | **Sort by price / date added / popularity** — Sorting options for wishlist items | Enhancement |
| 7 | **Out-of-stock badge** — Visual indicator if item is no longer available | Enhancement |
| 8 | **Wishlist analytics** — Total value of saved items, count by collection | New Feature |
| 9 | **Expired listing cleanup** — Option to clear all unavailable items with one tap | Enhancement |
| 10 | **Localization** — Search placeholder still hardcoded to English | Localization |

---

## 19. CartScreen.kt (in CommerceScreens.kt)

**Purpose:** Shopping cart with item management.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Quantity stepper with animation** — Animated +/- buttons with spring bounce | UX Polish |
| 2 | **Save for later** — Move items from cart to a wishlist section | New Feature |
| 3 | **Cart timer / item reservation** — Show countdown for reserved items | New Feature |
| 4 | **Free shipping progress bar** — "Add ₹X more for free shipping" visual progress | UX Polish |
| 5 | **Multi-seller grouping** — Group cart items by seller with subtotal per seller | Enhancement |
| 6 | **Bulk select / delete** — Select multiple items to remove or move to wishlist | Enhancement |
| 7 | **Price change alert** — Highlight items whose price changed since added to cart | Enhancement |
| 8 | **Estimated delivery dates** — Show per-item delivery estimate | New Feature |

---

## 20. RewardsScreen.kt

**Purpose:** Referral rewards, daily coins, milestones.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Spin-the-wheel / scratch card mini-game** — Gamified reward redemption | New Feature |
| 2 | **Streak tracking** — Daily login streak with increasing rewards (1 day → 7 days → 30 days) | New Feature |
| 3 | **Leaderboard** — Top referrers this week/month with prizes | New Feature |
| 4 | **Reward history with timeline** — Scrollable history of earned/redeemed rewards | Enhancement |
| 5 | **Tier progress visualization** — Visual progress bar to next membership tier with clear benefits | UX Polish |
| 6 | **Redeemable items catalog** — Browse products/services that can be purchased with coins | New Feature |
| 7 | **Share referral with screenshot** — Generate a styled referral card for social sharing | Enhancement |
| 8 | **Push notification for milestone** — Notify user when close to next milestone reward | Enhancement |
| 9 | **Coin earning breakdown** — "Earned X from referral + Y from daily streak + Z from bonus" | Enhancement |

---

## 21. KycScreen.kt

**Purpose:** Know Your Customer — identity verification.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Step-by-step wizard** — Visual progress indicator: Aadhaar → PAN → Selfie → Verification | UX Polish |
| 2 | **Document auto-capture** — Auto-detect document edges and capture when stable | Enhancement |
| 3 | **Verification status badge** — "Pending" / "In Progress" / "Verified" / "Rejected" with reasons | Enhancement |
| 4 | **Re-upload option** — If document rejected, clear error message + easy re-upload | UX Polish |
| 5 | **Live selfie verification** — Liveness detection during selfie capture | New Feature |
| 6 | **Masked data preview** — Show partially masked document data before submission (XXXX-1234) | Privacy |
| 7 | **Estimated verification time** — "Usually takes 2-4 hours" with ETA | UX Polish |
| 8 | **Support contact** — Quick link to support if verification is stuck | Enhancement |
| 9 | **Secure data handling notice** — Privacy reassurance with encryption badges | Trust |

---

## 22. LegalScreens.kt

**Purpose:** Legal documents — terms, privacy, policies, complaints.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Version history & changelog** — Show when each policy was last updated with bullet changes | Enhancement |
| 2 | **Key points summary** — "TL;DR" section before full legal text for readability | UX Polish |
| 3 | **Search within document** — Search bar for finding specific terms | New Feature |
| 4 | **Print / download as PDF** — Export policy document | New Feature |
| 5 | **Language selector** — Switch between English/Hindi/regional languages inline | New Feature |
| 6 | **Accept/decline history** — For policies requiring consent, show when user accepted | Compliance |
| 7 | **Complaint filing status tracking** — Track filed complaints with updates | Enhancement |
| 8 | **Legal glossary** — Tap on legal terms to see plain-English explanation | UX Polish |

---

## 23. NotificationPrefsScreen.kt

**Purpose:** Granular notification category toggles.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Master toggle** — "Pause all" switch at top to temporarily silence | Enhancement |
| 2 | **In-app notification preview** — Show example notification card for each category | UX Polish |
| 3 | **Quiet hours schedule** — "Don't send notifications between 10 PM - 8 AM" | New Feature |
| 4 | **Delivery method per category** — Choose Push / Email / None for each type | New Feature |
| 5 | **Digest frequency** — "Instant" / "Hourly digest" / "Daily digest" per category | New Feature |
| 6 | **Critical alerts** — Mark certain categories as "override silent mode" | Enhancement |
| 7 | **Notification preview content** — Toggle to show/hide message content in lock screen | Privacy |
| 8 | **Reset to defaults** — One-tap to restore default notification settings | Enhancement |

---

## 24. LocationSelectionScreen.kt

**Purpose:** City/area/landmark search and selection.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Recent locations** — Automatically suggest recently used locations | Enhancement |
| 2 | **Map-based selection** — Interactive map where user drops a pin | New Feature |
| 3 | **Saved addresses** — Persistent "Home", "Work", "Other" labeled addresses | New Feature |
| 4 | **Geocoding reverse lookup** — "Use current location" → auto-fill city/area | Enhancement |
| 5 | **Landmark suggestions** — Popular landmarks near the area as quick chips | Enhancement |
| 6 | **Distance display** — Show "X km from your location" in results | Enhancement |
| 7 | **Localization** — Placeholder text still hardcoded to English | Localization |

---

## 25. SocialScreens.kt

**Purpose:** Social features — user search, messaging, community interaction.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Real-time messaging** — WebSocket-based chat UI with typing indicators, read receipts | New Feature |
| 2 | **User reputation score** — Display rating/reputation with recent review snippets | New Feature |
| 3 | **Mutual followers highlight** — "Followed by @user1, @user2 and 3 others" | Enhancement |
| 4 | **In-app video calls** — WebRTC-based video/audio calling between verified users | New Feature |
| 5 | **Block / report user flow** — Inline action sheet with reason selection | Enhancement |
| 6 | **Community groups** — Topic-based public groups with join/leave | New Feature |
| 7 | **User search filters** — Filter by location, rating, joined date | Enhancement |
| 8 | **Follow suggestion with reason** — "Because you follow X" context on suggested users | Enhancement |
| 9 | **Mention autocomplete** — @username autocomplete in posts/comments | Enhancement |
| 10 | **Content moderation queue** — For community managers: reported content review panel | New Feature |

---

## 26. CreatePostScreen.kt

**Purpose:** Create and publish new posts/listings.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Rich text editor** — Bold/italic/bullet-point formatting for post body | New Feature |
| 2 | **Draft auto-save** — Save draft to local storage every 30 seconds | Enhancement |
| 3 | **Image filters & editing** — Basic crop, filter, brightness before upload | New Feature |
| 4 | **Multi-image reorder** — Drag-to-reorder selected images before upload | Enhancement |
| 5 | **Post scheduling** — Schedule post for a future date/time | New Feature |
| 6 | **Tag products/people** — Tag other users or products within the post | New Feature |
| 7 | **Location tag** — Attach a location to the post | Enhancement |
| 8 | **Upload progress per file** — Show individual progress for each uploading file | UX Polish |
| 9 | **AI writing assistant** — "Polish text" / "Fix grammar" / "Make it shorter" suggestions | New Feature |
| 10 | **Visibility settings** — Public / Followers only / Private (draft) post options | Enhancement |

---

## 27. MyPostsScreen.kt

**Purpose:** List of user's own published posts.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Bulk actions** — Select multiple posts to delete, archive, or feature | New Feature |
| 2 | **Post performance stats** — Views, likes, shares, saves per post | New Feature |
| 3 | **Edit post inline** — Allow editing post content directly from list | Enhancement |
| 4 | **Sort & filter** — By date, engagement, status (active/archived) | Enhancement |
| 5 | **Draft management** — Separate tab for unpublished drafts with last-edited timestamp | New Feature |
| 6 | **Archive instead of delete** — Soft-delete with restore option | Enhancement |
| 7 | **Share post quick action** — One-tap copy link or share directly from list | Enhancement |
| 8 | **Expired listing re-list** — One-tap to re-list expired items with same details | New Feature |
| 9 | **Analytics export** — Export post performance data as CSV | New Feature |

---

## 28. ProfileSubScreens.kt

**Purpose:** Profile edit sub-screens (bio, links, photos).

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Inline link preview** — Enter URL and see a rich link preview card | New Feature |
| 2 | **Avatar frame/border selection** — Decorative frames for profile picture | New Feature |
| 3 | **Bio character counter** — Live count with "X characters remaining" | UX Polish |
| 4 | **Website link validation** — Auto-check that URL is valid and reachable | Enhancement |
| 5 | **Availability status** — "Available for work" / "Open to offers" toggle on profile | New Feature |
| 6 | **Social links validation** — Verify Instagram/Twitter/LinkedIn handles | Enhancement |
| 7 | **Edit history** — Undo recent profile changes | Enhancement |
| 8 | **Multiple profile photos** — Upload gallery of photos (not just single avatar) | New Feature |

---

## 29. CategoriesScreen.kt & CategoryHomeScreen.kt

**Purpose:** Browse categories and category-specific home pages.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Subcategory preview** — Show popular subcategories with item counts on category tile | Enhancement |
| 2 | **Category images** — Rich category cards with background images instead of flat icons | Enhancement |
| 3 | **Personalized category order** — Sort frequently used categories to top | New Feature |
| 4 | **Category search** — Already has search bar; add voice search | Enhancement |
| 5 | **Hide categories** — Allow users to hide irrelevant categories | New Feature |
| 6 | **Category recommendations** — "Based on your browsing" category suggestions | New Feature |
| 7 | **Seasonal/trending categories** — Special section for holidays or trending categories | New Feature |
| 8 | **Grid size toggle** — Switch between 3-column and 4-column grid | UX Polish |

---

## 30. ProductListingScreen.kt

**Purpose:** Listing creation/edit for products.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **AI product description generator** — Auto-generate description from keywords/title | New Feature |
| 2 | **Condition selector** — Visual condition picker (New / Like New / Good / Fair) with descriptions | Enhancement |
| 3 | **Price suggestion** — Show price range analytics: "Similar items priced between ₹X - ₹Y" | New Feature |
| 4 | **Draft auto-save** — Save listing draft every 30 seconds to prevent data loss | Enhancement |
| 5 | **Multiple variants** — Add size/color variants with per-variant pricing/stock | New Feature |
| 6 | **Shipping calculator** — Estimate shipping cost based on weight and destination | New Feature |
| 7 | **QR code generator** — Auto-generate a listing QR code for offline sharing | Enhancement |
| 8 | **Listing preview** — See exactly how listing will appear to buyers before publishing | UX Polish |
| 9 | **SEO title check** — Score title quality for search visibility | Enhancement |

---

## 31. RecentlyViewedFullScreen.kt

**Purpose:** Full-page recently viewed items.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Clear all with undo** — "Clear history" with Snackbar undo action | UX Polish |
| 2 | **Resume browsing** — "Continue where you left off" section | Enhancement |
| 3 | **Save from history** — Quick bookmark button on each item | Enhancement |
| 4 | **Time-based grouping** — "Today" / "Yesterday" / "Earlier this week" sections | Enhancement |
| 5 | **Price drop indicator** — Highlight items in recent history that dropped in price | New Feature |
| 6 | **Exclude from history** — Long-press → "Remove from history" per item | Enhancement |
| 7 | **History pause** — "Pause history" toggle for private browsing | Privacy |

---

## 32. DailyCodeAndReferralScreens.kt

**Purpose:** Daily check-in codes, referral code entry and tracking.

| # | Suggestion | Category |
|---|-----------|----------|
| 1 | **Daily streak calendar** — Visual calendar view showing check-in days with flame/streak indicator | New Feature |
| 2 | **Reminder notification** — Push notification at daily reset time to collect code | Enhancement |
| 3 | **Referral link with analytics** — See how many people clicked your referral link vs. signed up | New Feature |
| 4 | **Share referral via QR** — Generate QR that encodes referral link | Enhancement |
| 5 | **Referral bonus milestones** — "Invite 5 friends → Get ₹100" tiered rewards | New Feature |
| 6 | **Code countdown timer** — Show time remaining before daily code expires | UX Polish |
| 7 | **Multi-platform sharing** — One-tap share to WhatsApp, Telegram, Instagram, SMS | Enhancement |
| 8 | **Leaderboard snapshot** — Your rank among top referrers this month | New Feature |

---

## Summary — Cross-Cutting Themes

| Theme | Screens Affected | Priority |
|-------|-----------------|----------|
| **Pull-to-refresh integration** | Home, Feed, Profile, Wishlist, MyPosts | High |
| **Localization audit** | Explore, Login, Wishlist, Location, Scanner | Medium |
| **Theme token migration** | All screens with `Color(0xFF...)` | Medium |
| **Shimmer/skeleton loading** | MyPosts, Account screens (already done on most) | Low |
| **Offline connectivity handling** | Home, Feed, Explore, Commerce, Search | Medium |
| **Accessibility passes** | All screens | Ongoing |
| **Animation micro-interactions** | Buttons, cards, transitions across all screens | Medium |
| **Error state differentiation** | All screens with loading+error+empty states | Medium |
| **Haptic feedback** | Key interactions across all screens | Low |
| **MVVM architectural refactor** | Screens with business logic in composables | High |
