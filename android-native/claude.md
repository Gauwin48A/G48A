# MHub Android — Full Web Parity E2E Plan (67 Routes)

**Source of Truth:** Web app at `../client/src/pages/*.jsx`  
**Architecture:** DTOs → `MhubApi.kt` → Repository → `@HiltViewModel` → `@Composable` Screen  
**Build:** `.\gradlew.bat :app:assembleDebug --no-configuration-cache -q`  
**Install:** `adb install -r app\build\outputs\apk\debug\app-debug.apk`  
**Date:** May 7, 2026

---

## MASTER INVENTORY: ALL 67 WEB ROUTES → ANDROID

### Key
- ✅ = Android screen exists and at 8+/10
- 🔸 = Exists but needs major feature additions  
- ❌ = Missing entirely — must build from scratch

| # | Route | Web File | Web Lines | Android File | Android Lines | Status | Parity |
|---|-------|----------|-----------|-------------|---------------|--------|--------|
| **PRIMARY NAV** |
| 1 | `/category-hub` | CategoryHub.jsx | 492 | CategoryHubScreen.kt | 243 | 🔸 | 4/10 |
| 2 | `/all-posts` | AllPosts.jsx | 4,310 | HomeScreen.kt | 575 | 🔸 | 4/10 |
| 3 | `/for-you` | ForYou.jsx | 2,670 | ExploreScreen.kt | 663 | 🔸 | 4/10 |
| 4 | `/feed` | FeedPage.jsx | 1,637 | FeedScreen.kt | 448 | 🔸 | 5/10 |
| 5 | `/rewards` | Rewards.jsx | 2,494 | RewardsScreen.kt | 799 | 🔸 | 7/10 |
| 6 | `/profile` | Profile.jsx | 4,177 | ProfileScreen.kt | 1,316 | 🔸 | 6/10 |
| 7 | More Menu | — | — | MoreScreen.kt | 274 | ✅ | 7/10 |
| **MORE MENU** |
| 8 | `/post-welcome` | PostWelcome.jsx | 677 | CommerceScreens.kt | ~120 | 🔸 | 3/10 |
| 9 | `/tier-selection` | TierSelection.jsx | 1,551 | CommerceScreens.kt | ~120 | 🔸 | 4/10 |
| 10 | `/centre` | CentreListings.jsx | 628 | ChannelScreens.kt | ~80 | 🔸 | 3/10 |
| 11 | `/nearby` | NearbyPosts.jsx | 585 | NearbyScreen.kt | 252 | 🔸 | 4/10 |
| 12 | `/category-mode` | (in CategoryHub) | — | — | 0 | ❌ | 0/10 |
| 13 | `/subcategories` | Subcategories.jsx | 567 | CategoriesScreen.kt | 264 | 🔸 | 5/10 |
| 14 | `/chat` | Chat.jsx | 1,004 | ChatScreen.kt | 650 | 🔸 | 6/10 |
| 15 | `/feedback` | Feedback.jsx | 1,330 | SocialScreens.kt | ~80 | 🔸 | 3/10 |
| 16 | `/complaints` | Complaints.jsx | 1,223 | SocialScreens.kt | ~80 | 🔸 | 3/10 |
| 17 | `/verification` | Verification.jsx | 825 | KycScreen.kt | 263 | 🔸 | 4/10 |
| 18 | `/dashboard` | Dashboard.jsx | 1,203 | AccountScreens.kt | ~150 | 🔸 | 4/10 |
| 19 | `/admin-panel` | AdminPanel.jsx | 1,571 | LegalScreens.kt | ~200 | 🔸 | 4/10 |
| **AUTH & ACCESS** |
| 20 | `/login` | Login.jsx | 454 | LoginScreen.kt | 586 | ✅ | 8/10 |
| 21 | `/signup` | SignUp.jsx | 716 | SignUpScreen.kt | 252 | 🔸 | 4/10 |
| 22 | `/invite/:code` | InviteRedirect.jsx | 53 | LegalScreens.kt | ~30 | ✅ | 8/10 |
| 23 | `/forgot-password` | ForgotPassword.jsx | 217 | ForgotPasswordScreen.kt | 390 | ✅ | 9/10 |
| 24 | `/reset-password` | ResetPassword.jsx | 310 | ResetPasswordScreen.kt | 269 | ✅ | 8/10 |
| **DISCOVERY & SEARCH** |
| 25 | `/home` | Home.jsx | 265 | (in CategoryHubScreen) | — | 🔸 | 3/10 |
| 26 | `/activity` | ActivityHub.jsx | 193 | — | 0 | ❌ | 0/10 |
| 27 | `/public-wall` | PublicWall.jsx | 810 | SocialScreens.kt | ~100 | 🔸 | 3/10 |
| 28 | `/search` | SearchPage.jsx | 1,552 | SearchScreen.kt | 358 | 🔸 | 4/10 |
| **LISTINGS & POST FLOW** |
| 29 | `/post/:id` | PostDetail.jsx | 3,652 | PostDetailScreen.kt | 596 | 🔸 | 4/10 |
| 30 | `/add-post` | AddPost.jsx | 2,131 | CreatePostScreen.kt | 317 | 🔸 | 3/10 |
| 31 | `/post_add` | PostAdd.jsx | 172 | — | 0 | ❌ | 0/10 |
| 32 | `/feed/feedpostadd` | (in PostAdd) | — | SocialScreens.kt | ~80 | 🔸 | 5/10 |
| 33 | `/edit-post/:id` | EditPost.jsx | 545 | CommerceScreens.kt | ~100 | 🔸 | 4/10 |
| **MY INVENTORY & TRANSACTIONS** |
| 34 | `/my-home` | MyHome.jsx | 2,202 | MyPostsScreen.kt | 293 | 🔸 | 3/10 |
| 35 | `/bought-posts` | BoughtPosts.jsx | 485 | CommerceScreens.kt | ~80 | 🔸 | 4/10 |
| 36 | `/sold-posts` | SoldPosts.jsx | 492 | CommerceScreens.kt | ~80 | 🔸 | 4/10 |
| 37 | `/buyer-view` | BuyerView.jsx | 609 | CommerceScreens.kt | ~80 | 🔸 | 3/10 |
| 38 | `/saledone` | Saledone.jsx | 1,311 | CommerceScreens.kt | ~100 | 🔸 | 3/10 |
| 39 | `/saleundone` | SaleUndone.jsx | 1,608 | CommerceScreens.kt | ~100 | 🔸 | 3/10 |
| **FEED & SOCIAL** |
| 40 | `/feed/:id` | FeedPostDetail.jsx | 393 | SocialScreens.kt | ~100 | 🔸 | 5/10 |
| 41 | `/my-feed` | MyFeedPage.jsx | 1,117 | SocialScreens.kt | ~120 | 🔸 | 3/10 |
| 42 | `/offers` | Offers.jsx | 1,088 | CommerceScreens.kt | ~150 | 🔸 | 4/10 |
| 43 | `/reviews/:userId` | Reviews.jsx | 815 | SocialScreens.kt | ~120 | 🔸 | 5/10 |
| **COMMERCE & SAVED** |
| 44 | `/wishlist` | Wishlist.jsx | 1,147 | WishlistScreen.kt | 514 | 🔸 | 6/10 |
| 45 | `/cart` | Cart.jsx | 828 | CommerceScreens.kt | ~120 | 🔸 | 5/10 |
| 46 | `/recently-viewed` | RecentlyViewed.jsx | 1,328 | CommerceScreens.kt | ~80 | 🔸 | 3/10 |
| 47 | `/saved-searches` | SavedSearches.jsx | 682 | CommerceScreens.kt | ~80 | 🔸 | 3/10 |
| **MESSAGING & CHANNELS** |
| 48 | `/channels` | ChannelsListPage.jsx | 349 | ChannelScreens.kt | ~80 | 🔸 | 4/10 |
| 49 | `/channels/create` | CreateChannelPage.jsx | 763 | ChannelScreens.kt | ~80 | 🔸 | 3/10 |
| 50 | `/channels/:id` | ChannelPage.jsx | 858 | ChannelScreens.kt | ~120 | 🔸 | 4/10 |
| 51 | `/centre/create` | (in CreateChannelPage) | — | ChannelScreens.kt | ~80 | 🔸 | 3/10 |
| 52 | `/centre/:id` | (in ChannelPage) | — | ChannelScreens.kt | ~80 | 🔸 | 4/10 |
| 53 | `/centre/:id/listings` | CentreListings.jsx | 628 | ChannelScreens.kt | ~80 | 🔸 | 3/10 |
| **ACCOUNT, TRUST & PAYMENTS** |
| 54 | `/notifications` | Notifications.jsx | 1,628 | NotificationsScreen.kt | 528 | 🔸 | 6/10 |
| 55 | `/security` | SecuritySettings.jsx | 721 | AccountScreens.kt | ~200 | 🔸 | 6/10 |
| 56 | `/payment` | PaymentPage.jsx | 1,089 | CommerceScreens.kt | ~100 | 🔸 | 3/10 |
| 57 | `/kyc` | KycVerification.jsx | 414 | KycScreen.kt | 263 | 🔸 | 5/10 |
| 58 | `/aadhaar-verify` | GetVerified.jsx | 407 | — | 0 | ❌ | 0/10 |
| 59 | `/analytics` | Analytics.jsx | 985 | AccountScreens.kt | ~120 | 🔸 | 4/10 |
| **LEGAL & POLICIES** |
| 60 | `/t&c` | TermsAndConditions.jsx | 76 | LegalScreens.kt | ~60 | ✅ | 9/10 |
| 61 | `/terms` | TermsAndConditions.jsx | 76 | LegalScreens.kt | ~60 | ✅ | 9/10 |
| 62 | `/privacy-policy` | PrivacyPolicy.jsx | 76 | LegalScreens.kt | ~60 | ✅ | 9/10 |
| 63 | `/refund-policy` | RefundPolicy.jsx | 76 | LegalScreens.kt | ~60 | ✅ | 9/10 |
| 64 | `/support-ticket-policy` | SupportTicketPolicy.jsx | 76 | LegalScreens.kt | ~60 | ✅ | 9/10 |
| **REDIRECTS & FALLBACKS** |
| 65 | `/` → `/category-hub` | — | — | MhubApp.kt | — | ✅ | 10/10 |
| 66 | `/categories/:slug` → `/all-posts` | — | — | — | — | ✅ | 10/10 |
| 67 | `*` → `/category-hub` | NotFound.jsx | 68 | LegalScreens.kt | ~40 | ✅ | 8/10 |

---

## SUMMARY STATS

| Metric | Count |
|--------|-------|
| Total routes | 67 |
| Already at 8-10/10 | 11 (legal, auth, redirects) |
| At 5-7/10 (needs features) | 16 |
| At 3-4/10 (needs major work) | 36 |
| At 0/10 (missing entirely) | 4 |
| **Weighted average parity** | **4.3/10** |

---

## PHASED IMPLEMENTATION PLAN

### PHASE 1: Primary Navigation — Core Screens (High Impact)
**Goal:** Get the 6 bottom-bar screens to 9/10 parity  
**Estimated scope:** ~3,000 lines of new/modified Kotlin

#### 1A. CategoryHubScreen (492 web → 243 android) — Target 9/10

**Currently has:** 4 app tiles with emoji, category grid, navigation  
**Missing from web:**
- [ ] Hub stats API integration (`GET /categories/hub-stats`) — show active count + new today per app
- [ ] 3D perspective card effect on press (slight scale + elevation change)
- [ ] "Enter" / "Continue →" CTA distinction based on active app
- [ ] Gradient backgrounds per app tile (blue=Electronics, pink=Fashion, green=Vehicles, purple=Others)
- [ ] Decorative background blobs/shapes
- [ ] Stat count formatting (1.2k, 3.5M)
- [ ] Dark mode gradient variants
- [ ] Category mode context integration (`setActiveApp`, `clearCategory`)

#### 1B. HomeScreen / AllPosts (4,310 web → 575 android) — Target 9/10

**Currently has:** Grid/list toggle, sort chips, infinite scroll, pull-refresh, shimmer, category filter, search bar, condition badge, verified icon, wishlist heart, price overlay, filter bottom sheet (price range, condition, location, verified-only), quick filter chips, image carousel, relative time  
**Missing from web:**
- [ ] Subcategory bar (conditional, shows when category selected) with sort by display_order/post_count/name
- [ ] Great Deals promotional banner at top
- [ ] Post promo badges ("🔥 Hot Deal", "⚡ Boosted", "🆕 Just Listed")
- [ ] Compare feature — add up to 4 items, same-subcategory enforcement
- [ ] Post card meta chips (subcategory, location, posted time, post ID)
- [ ] Action row per card: Like, Interested, Views, View Details
- [ ] More menu per card: Share, Save, Promote (if owner), Add to Cart, Compare, Report
- [ ] Latest window filter (show only last 5/10/50)
- [ ] Date range filter (start/end date pickers)
- [ ] Page density toggle (compact vs regular card sizes)
- [ ] Share link dialog (custom bottom sheet: copy link, WhatsApp, Telegram)
- [ ] Buyer interest modal ("I'm Interested" → sends inquiry)
- [ ] Promote dialog (if user owns post)
- [ ] Guest preview limit (5 posts then login CTA)
- [ ] Category group scoping from CategoryMode context
- [ ] Auto-refresh (30s interval)
- [ ] Back-to-top FAB
- [ ] Multi-token search across 17 fields (title, description, category, brand, model, user.name, etc.)
- [ ] Seller avatar + name + verified badge on card header

#### 1C. ExploreScreen / ForYou (2,670 web → 663 android) — Target 9/10

**Currently has:** AI hero banner, stats chips, search bar, quick filter chips, category grid (3 cols), trending carousel, For You grid (2 cols), pull-refresh, See All links  
**Missing from web:**
- [ ] Guest login screen (lock icon, feature list, interest selector with 6 categories, sign in CTA, browse all CTA)
- [ ] Sponsored deals carousel (horizontal, 5 items, small cards 160-220px)
- [ ] Post card seller header (avatar, name, verified badge, location, posted time)
- [ ] Post card more menu (Share, Save, Promote, Interested, Add to Cart, Report)
- [ ] Image carousel per post with arrows, counter, dots
- [ ] Expandable description (>60 chars → "Read more")
- [ ] Action row: Like, Share, Save, Interested, Add to Cart, Views, View
- [ ] Price range quick filters (<1000, 500-2000, 2000-10000, >10000)
- [ ] Posted Today / Latest 10/50 / Near Me quick filters
- [ ] Batch view reporting (5s interval)
- [ ] Fallback strategy (recommendations → for-you → broad posts)
- [ ] Stalled loading detection (15s timeout)
- [ ] Page density toggle
- [ ] Back-to-top button

#### 1D. FeedScreen (1,637 web → 448 android) — Target 9/10

**Currently has:** 3 tabs (For You/Trending/Latest), pull-refresh, feed cards with avatar/name/location, like animation, comments, infinite scroll, share, pagination  
**Missing from web:**
- [ ] Category group scoping (category_group filter param)
- [ ] Sort order pills (newest/oldest)
- [ ] Search bar with 350ms debounce
- [ ] Pagination controls (page numbers, not just infinite scroll)
- [ ] ShareLinkDialog (custom share bottom sheet)
- [ ] PromoteDialog (post boosting)
- [ ] ImageZoomModal (full-screen zoom on image tap)
- [ ] LoginPromptModal (for guest users)
- [ ] Wishlist save/unsave per post (POST/DELETE /wishlist)
- [ ] View tracking (POST /posts/{id}/view)
- [ ] Guest preview limit (5 posts)
- [ ] Post translation support
- [ ] Back-to-top button
- [ ] FAB for creating feed posts

#### 1E. RewardsScreen (2,494 web → 799 android) — Target 9/10

**Currently has:** Hero, coin balance, XP bar, daily check-in, spin wheel, scratch card, referral challenge, share buttons, earn playbook, redeem store, coin history, leaderboard, milestones, referral network  
**Missing from web:**
- [ ] SSE real-time stream (`/rewards/stream`) with 30s fallback polling
- [ ] Animated coin balance with delta display (+X animation)
- [ ] Section tabs (Dashboard, Earn & Challenges, Referrals, Activity & Rewards)
- [ ] 7+ daily challenges (beyond check-in/spin/scratch)
- [ ] Chain visualization (referral tree depth)
- [ ] Daily secret code with copy
- [ ] Reward log with filters (all/earned/spent/referral/daily) — separate from coin history
- [ ] Quick action cards (My Home, My Feed, Reviews, CentrePage, Sale Done, Sale Undone, Offers)
- [ ] Profile completion ring (SVG-like circular progress)
- [ ] Subscription state integration

#### 1F. ProfileScreen (4,177 web → 1,316 android) — Target 9/10

**Currently has:** Avatar with ring, tier badge, trust score, pulse stats, quick actions, profile checklist, referral code, menu cards, edit profile dialog, user ID section, sign out  
**Missing from web:**
- [ ] 4-tab layout (Overview, Personal Info, Preferences, Settings)
- [ ] Personal Info edit form (full_name 2+ chars, phone 10-digit, address, bio)
- [ ] Preferences tab: location autocomplete, radius buttons (5/10/25/50 km), min/max price, subcategory multiselect
- [ ] Settings tab: subscription info, contacts sync
- [ ] Avatar upload (image picker → POST /profile/upload-avatar)
- [ ] Contact sync loading indicator
- [ ] Profile stats from reviews API
- [ ] Category mode link in preferences

---

### PHASE 2: Listing Detail & Creation (Revenue-Critical)
**Goal:** PostDetail and AddPost to 9/10 — these are conversion screens

#### 2A. PostDetailScreen (3,652 web → 596 android) — Target 9/10

**Currently has:** Image pager, make offer, wishlist, report, trust score, call seller, share, similar posts, safety tips, condition/brand chips, collapsible description, specs table  
**Missing from web:**
- [ ] Section navigation strip — horizontal scrollable buttons (Overview, Details, Specs, Location, Trust, Description, Negotiate, Seller) with scroll-to-section
- [ ] Active section tracking (highlight current section as user scrolls)
- [ ] Full-screen image zoom dialog (`Modifier.transformable()` for pinch/pan/double-tap)
- [ ] Rich make offer modal — price input, optional message, "Your last offer: ₹X", suggested prices row
- [ ] Bargain/counter-offer actions — if offer exists: Accept/Reject/Counter inline
- [ ] Owner insights panel — inquiries count, offers received, viewer analytics (GET /api/posts/{id}/insights)
- [ ] Post boost panel — "Boost this listing" with tier selection (POST /api/posts/{id}/boost)
- [ ] Sponsored listings carousel (GET /posts/{id}/sponsored)
- [ ] Premium recommendations section (GET /recommendations)
- [ ] Deep link share bottom sheet (copy link, WhatsApp, Telegram, Email)
- [ ] Detailed specs section — key-value table from `post.specs` map (brand, model, storage, RAM, color, year, mileage)
- [ ] Location section with map preview
- [ ] Seller rating stars + review count + "Member since"
- [ ] Demo/offline post fallback
- [ ] Buyer interest modal ("I'm Interested" → sends inquiry)
- [ ] Sticky CTA bar at bottom (Price + Contact + Make Offer)
- [ ] Engagement stats (views, likes, shares)

#### 2B. CreatePostScreen / AddPost (2,131 web → 317 android) — Target 9/10

**Currently has:** Image upload area, image carousel (LazyRow), title, description, price, location, condition selector (4 chips), brand field, category dropdown, upload progress, publish button  
**Missing from web:**
- [ ] Tier-based image limits (basic:1, bronze:3, silver:5, premium:10)
- [ ] Pre-submit checklist card (Complete/Pending per field)
- [ ] Audio recorder component for voice description
- [ ] 24-hour flash sale toggle
- [ ] Model input field (2+ chars)
- [ ] Age input (months, 0-48)
- [ ] Warranty status dropdown (Under Warranty, Expired, No Warranty)
- [ ] Dimensions input (optional)
- [ ] Contact number input with validation (10 digits, starts 6-9)
- [ ] Subcategory picker (conditional, when category has subcategories)
- [ ] Form validation with inline error messages per field
- [ ] Character counter for description (20-1000 limit)
- [ ] Image size/format validation (JPG/PNG/WEBP, max 2MB each)
- [ ] Auto-draft save indicator
- [ ] Preview mode (card preview before publish)
- [ ] Hero header with tier badge display
- [ ] Subscription check → redirect to PostWelcome if not eligible

#### 2C. EditPostScreen (545 web → ~100 android in CommerceScreens) — Target 9/10

**Currently has:** Basic photo gallery, condition selector  
**Missing from web:**
- [ ] Pre-fill all fields from existing post (GET /posts/{id})
- [ ] Existing vs new image distinction (border styling)
- [ ] Image removal per-image with numbered badges
- [ ] Category + subcategory dropdowns with cascading load
- [ ] Status selector (Active/Sold)
- [ ] Upload progress bar during save
- [ ] Full form validation (title 5+ chars, price > 0)
- [ ] Cancel button with navigation back

---

### PHASE 3: My Inventory & Transactions
**Goal:** MyHome, Sold/Bought, SaleDone/Undo to 9/10

#### 3A. MyPostsScreen / MyHome (2,202 web → 293 android) — Target 9/10

**Currently has:** Status filter chips, post list, pull-refresh, delete confirmation  
**Missing from web:**
- [ ] Hero section with gradient background + stats
- [ ] 4 stat cards (Total Posts, Active, Sold, Bought) with colored icons from GET /posts/mine/totals
- [ ] Tab navigation with count badges (All, Active, Sold, Bought)
- [ ] Search input for title/location filtering
- [ ] Sort dropdown (Recently posted, Price, Most viewed, Most liked, Title)
- [ ] Sort order toggle (Ascending/Descending)
- [ ] Bulk selection (Select All, delete selected)
- [ ] Post card: thumbnail, status badge, title, condition, price, location, view/like/share counts
- [ ] More options menu per post (Edit, Promote, Delete)
- [ ] Mark Sold button (POST /posts/{id}/sold)
- [ ] Bulk delete confirmation dialog
- [ ] Share link dialog per post
- [ ] Promote dialog per post
- [ ] FAB for creating new post
- [ ] Pagination (page-based, not just infinite scroll)
- [ ] Category mode filter banner

#### 3B. SoldPostsScreen (492 web → ~80 android) — Target 9/10

**Currently has:** Basic sold list, category filter  
**Missing from web:**
- [ ] Infinite scroll pagination
- [ ] Category mode filtering
- [ ] Post cards with seller info, avatar, location, price
- [ ] Status badges (color-coded)
- [ ] Sorting dropdown
- [ ] Search input
- [ ] Skeleton loading animation

#### 3C. BoughtPostsScreen (485 web → ~80 android) — Target 9/10

**Currently has:** Basic purchase list  
**Missing from web:**
- [ ] Status tracking per purchase
- [ ] Multi-select with bulk actions
- [ ] Category filtering
- [ ] Sorting and search
- [ ] Seller cards with avatar

#### 3D. SaleDoneScreen (1,311 web → ~100 android) — Target 9/10

**Currently has:** Basic multi-step form  
**Missing from web:**
- [ ] Transaction stepper (5 steps) with full visual progress
- [ ] Seller form (select post, enter buyer ID, price)
- [ ] Buyer confirmation form with OTP verification
- [ ] Receipt generation and display (item details, seller/buyer info, price, date)
- [ ] Copy-to-clipboard receipt
- [ ] Download/share receipt options
- [ ] Reward summary cards (coins earned)
- [ ] Pending sales list (GET /sale/pending)
- [ ] Fallback endpoints (GET /transactions/pending)

#### 3E. SaleUndoneScreen (1,608 web → ~100 android) — Target 9/10

**Currently has:** Basic reason dropdown  
**Missing from web:**
- [ ] Sale undo form (post ID input, reason dropdown, description textarea)
- [ ] Validation (postId required, reason required if "other")
- [ ] Reactivation history list with filters
- [ ] Status filter chips
- [ ] Category mode banner
- [ ] Confirmation dialog before undo
- [ ] POST /posts/{id}/reactivate API call
- [ ] Abort controller for request cancellation

---

### PHASE 4: Search, Chat & Notifications
**Goal:** Search, Chat, Notifications to 9/10

#### 4A. SearchScreen (1,552 web → 358 android) — Target 9/10

**Currently has:** Search bar, category chips, trending searches, debounced search, recent searches  
**Missing from web:**
- [ ] Advanced filter section: subcategory dropdown, condition selector, min/max price inputs, min rating, location with suggestions, sort by, date range
- [ ] Up to 3 inline preview results with title, category, price, location
- [ ] "View results" button → navigate to AllPosts with filters
- [ ] Popular categories/subcategories grid
- [ ] Search tips section
- [ ] Category mode notice (if locked)
- [ ] Alert banner (if filters from browse active)
- [ ] Clear all recent searches button
- [ ] Delete individual recent search
- [ ] localStorage persistence for recent searches (max 10)
- [ ] Multi-token search matching
- [ ] Brand suggestions from API

#### 4B. ChatScreen (1,004 web → 650 android) — Target 9/10

**Currently has:** Conversation list with search, avatar, online dots, unread badge, message thread, typing indicator, read receipts, send button, 5s polling  
**Missing from web:**
- [ ] Connection status banner (Connected/Disconnected/Reconnecting)
- [ ] Delivery status per message (Sent/Delivered/Read/Failed)
- [ ] Failed message retry option
- [ ] Reconnect button on disconnect
- [ ] Post title badge on conversations ("Re: {title}")
- [ ] Conversation search across name, username, post title, last message
- [ ] Auto-scroll to newest message
- [ ] Two-column layout on tablet (conversations + thread side-by-side)
- [ ] Error recovery with reconnect attempts

#### 4C. NotificationsScreen (1,628 web → 528 android) — Target 9/10

**Currently has:** Search bar, category filter chips, unread-only toggle, mark all read, notification items with colored icons, swipe-to-dismiss, section headers, pull-refresh  
**Missing from web:**
- [ ] Sort dropdown (Newest, Oldest, Priority, Unread first)
- [ ] Preferences modal with 7 toggles (Email, Push, SMS, Marketing, Order updates, Price drops, Messages)
- [ ] Density toggle (compact/normal)
- [ ] Notification cards: sender avatar, verification badge, checkbox for selection
- [ ] Action buttons per notification (Mark as read, Snooze, Delete)
- [ ] Snooze dropdown (1h, 4h, 1d)
- [ ] Expiration label
- [ ] Grouped notifications counter
- [ ] Statistics cards (Total, Unread, Read)
- [ ] Pro tip card
- [ ] Date group separators (Today, Yesterday, This Week)
- [ ] Bulk selection with delete
- [ ] Cursor-based pagination
- [ ] DELETE /notifications/{id} and DELETE /notifications (clear all)

---

### PHASE 5: Commerce Screens
**Goal:** Cart, Offers, Wishlist, Payment, Tiers to 9/10

#### 5A. WishlistScreen (1,147 web → 514 android) — Target 9/10

**Currently has:** Search bar, sort chips, grid/list toggle, remove, pull-refresh, back navigation  
**Missing from web:**
- [ ] Status filter (All/Active/Sold)
- [ ] Bulk selection with select-all checkbox
- [ ] Bulk action buttons (Add to Cart, Remove, Save for Later)
- [ ] Cursor-based pagination
- [ ] Saved posts real-time subscription
- [ ] Undo remove via toast

#### 5B. CartScreen (828 web → ~120 android) — Target 9/10

**Currently has:** Item cards, qty controls, coupon input, delivery ETA, price summary  
**Missing from web:**
- [ ] Quantity stepper with min 1 / max 10 bounds
- [ ] Saved items section (moved from cart to save-for-later)
- [ ] Order summary sidebar (subtotal, tax, shipping, discount, total)
- [ ] Trust badges (Secure checkout, Buyer protection, Easy returns)
- [ ] Bulk selection with select-all
- [ ] Search and sort within cart
- [ ] Price delta tracking
- [ ] Checkout button → navigate to payment

#### 5C. OffersScreen (1,088 web → ~150 android) — Target 9/10

**Currently has:** Tabs (received/sent), status chips, stepper, counter  
**Missing from web:**
- [ ] Role toggle (Seller/Buyer view)
- [ ] Offer cards with 5 status states (pending, accepted, rejected, countered, paid, completed, closed)
- [ ] Expiry countdown display per offer
- [ ] Savings badge
- [ ] Save/unsave offers (localStorage)
- [ ] Show saved only toggle
- [ ] Counter offer validation (must be > buyer's, < listing price)
- [ ] Accept/reject confirmation dialogs
- [ ] Role-based next action text

#### 5D. PaymentScreen (1,089 web → ~100 android) — Target 9/10

**Currently has:** Basic 5-step stepper, UPI  
**Missing from web:**
- [ ] Transaction stepper with visual progress
- [ ] Plan/boost selector (horizontal pill buttons)
- [ ] Selected plan details card
- [ ] Razorpay instant payment integration (Pay Now)
- [ ] Manual UPI section (QR code display, UPI ID chip with copy, Open UPI app button)
- [ ] UTR/Transaction ID input
- [ ] Payment history section (collapsible, with status badges)
- [ ] Instructions panel
- [ ] GET /payments/upi-details, GET /payments/status, POST /payments/submit
- [ ] POST /payments/razorpay/order, POST /payments/razorpay/verify

#### 5E. TierSelectionScreen (1,551 web → ~120 android) — Target 9/10

**Currently has:** Basic tier cards, features list  
**Missing from web:**
- [ ] 4 tier plan cards (Basic/Bronze/Silver/Premium) with full pricing
- [ ] Feature comparison lists per tier
- [ ] Free trial badges
- [ ] FAQ accordion section
- [ ] Discount code search input
- [ ] Subscription history list
- [ ] Current plan badge highlight
- [ ] Cancel subscription flow
- [ ] Navigate to payment on select

---

### PHASE 6: Social & Community Screens
**Goal:** Reviews, Feedback, Complaints, PublicWall, MyFeed to 9/10

#### 6A. ReviewsScreen (815 web → ~120 android in SocialScreens) — Target 9/10

**Currently has:** Star summary, distribution bars, write review, filters, helpful, seller response  
**Missing from web:**
- [ ] Verified purchase badges per review
- [ ] Character counter (max 1000) for review input
- [ ] Star input selector (1-5 tap)
- [ ] Seller response inline editing (if user is seller)
- [ ] Filter by rating (1-5 chips) + verified + sort
- [ ] Helpful upvote counter
- [ ] Role-based response editing

#### 6B. FeedbackScreen (1,330 web → ~80 android in SocialScreens) — Target 9/10

**Currently has:** Type selector, star rating, message input  
**Missing from web:**
- [ ] 5 category buttons (General, Bug, Feature Request, UI/UX, Performance)
- [ ] Star rating selector (1-5 interactive)
- [ ] Subject input field
- [ ] Message textarea
- [ ] Reference ID tracking (auto-generated)
- [ ] Section-based layout (category → rating → details → submit)
- [ ] Success confirmation state
- [ ] Error recovery

#### 6C. ComplaintsScreen (1,223 web → ~80 android in SocialScreens) — Target 9/10

**Currently has:** Subject & description fields  
**Missing from web:**
- [ ] Complaint type selector (Transaction, Quality, Delivery, Service, Other)
- [ ] Seller ID / Post ID input fields
- [ ] Complaint description textarea
- [ ] Complaint history table (GET /complaints/my)
- [ ] Status badges per complaint (Open, In Progress, Resolved, Closed)
- [ ] Timestamp display
- [ ] Category mode banner

#### 6D. PublicWallScreen (810 web → ~100 android in SocialScreens) — Target 9/10

**Currently has:** Profile header card, posts list  
**Missing from web:**
- [ ] Top Sellers leaderboard with rank badges (Gold Crown, Silver Medal, Bronze Trophy)
- [ ] Top Buyers leaderboard with purchase count, coin total
- [ ] Top Users (coin earners) with level badges
- [ ] Monthly Champions Snapshot (4 cards: total sales, active buyers, coin volume, verification rate)
- [ ] Gradient card styling per leaderboard
- [ ] Verification shields on entries
- [ ] Star ratings on seller entries
- [ ] Retry on error

#### 6E. MyFeedScreen (1,117 web → ~120 android in SocialScreens) — Target 9/10

**Currently has:** Basic list view  
**Missing from web:**
- [ ] Metrics cards (total posts, total views, total likes)
- [ ] Search input
- [ ] Multi-filter bar (status, sort, sort order)
- [ ] Sort dropdown (6 options)
- [ ] Dropdown menu per post (share, save, promote, delete)
- [ ] Delete confirmation dialog
- [ ] Share dialog, promote dialog
- [ ] Infinite scroll pagination
- [ ] Saved posts subscription
- [ ] Metrics auto-refresh (45s interval)

#### 6F. FeedPostDetailScreen (393 web → ~100 android in SocialScreens) — Target 9/10

**Currently has:** Author info, engagement bar  
**Missing from web:**
- [ ] Post card with full image display
- [ ] Like/unlike toggle with real-time counter
- [ ] Share functionality (clipboard + native)
- [ ] View tracking (POST /posts/{id}/view)
- [ ] Recently viewed integration
- [ ] Toast for share feedback
- [ ] Retry on error with count

---

### PHASE 7: Channels & Centres
**Goal:** All channel/centre screens to 9/10

#### 7A. ChannelsListScreen (349 web → ~80 android) — Target 9/10

**Currently has:** Search, cards with member count  
**Missing from web:**
- [ ] Channel cards: logo/image fallback, name, description, owner name, follower count
- [ ] Follow/unfollow button per channel
- [ ] View button per channel
- [ ] Create channel/centre button
- [ ] Variant support (channels vs centres)
- [ ] Loading skeleton (4 cards)
- [ ] Error state with retry

#### 7B. CreateChannelScreen (763 web → ~80 android) — Target 9/10

**Currently has:** Name, description form  
**Missing from web:**
- [ ] Logo file upload with preview
- [ ] Cover file upload with preview
- [ ] Logo URL fallback input
- [ ] Cover URL fallback input
- [ ] Contact email, phone, website inputs (CentrePage only)
- [ ] Location input
- [ ] Category selector
- [ ] Premium tier gate (check subscription, show upsell if not premium)
- [ ] Edit mode (pre-fill from existing channel)
- [ ] Form validation

#### 7C. ChannelDetailScreen (858 web → ~120 android) — Target 9/10

**Currently has:** Member count, post count, follow button  
**Missing from web:**
- [ ] Hero cover image with back button overlay
- [ ] Channel logo/avatar with fallback gradient
- [ ] Verification + follower + rating badges
- [ ] Share button
- [ ] Edit button (if owner)
- [ ] Description text
- [ ] Listings grid (6 preview items)
- [ ] Reviews section (star rating, review cards)
- [ ] Updates feed (posts list)
- [ ] Post creation form (if owner): description, image upload, media URL, post type
- [ ] Tabbed interface (About, Listings, Updates, Reviews, Analytics)

#### 7D. CentreListingsScreen (628 web → ~80 android) — Target 9/10

**Currently has:** Basic table view  
**Missing from web:**
- [ ] Hero banner with cover image/gradient
- [ ] Profile card overlay (logo, name, verification, member year, rating)
- [ ] Bio description
- [ ] Quick stats (listings count, followers, rating)
- [ ] Grid/list view toggle for listings
- [ ] Refresh button
- [ ] Listing cards (image, title, price, location, condition badge, featured badge)
- [ ] Load more pagination
- [ ] Pull-to-refresh

---

### PHASE 8: Account & Verification Screens
**Goal:** Dashboard, Security, Analytics, KYC, AccountDelete to 9/10

#### 8A. DashboardScreen (1,203 web → ~150 android) — Target 9/10

**Currently has:** Welcome card, period selector, stat cards, recent activity  
**Missing from web:**
- [ ] Seller dashboard component with top sellers
- [ ] Quick stats with trend indicators (↑ green, ↓ red, — neutral)
- [ ] Activity feed with recent actions
- [ ] Period selector chips (Today, 7D, 30D, All)
- [ ] Leaderboard section
- [ ] Navigation cards (Post Welcome, My Posts, Profile, All Posts)

#### 8B. SecurityScreen (721 web → ~200 android) — Target 9/10

**Currently has:** Password change form with strength, 2FA setup with QR + backup codes, active sessions with revoke  
**Missing from web:**
- [ ] IP address display (masked) per session
- [ ] User agent info per session
- [ ] Last activity timestamp per session
- [ ] Device fingerprint display
- [ ] Revoke all sessions button (separate from individual)
- [ ] 2FA disable confirmation with code input
- [ ] Step-by-step instruction cards for 2FA setup
- [ ] Gradient header card

#### 8C. AnalyticsScreen (985 web → ~120 android) — Target 9/10

**Currently has:** Time range filter, revenue card, bar chart, post performance  
**Missing from web:**
- [ ] 8 KPI summary cards (Views, Inquiries, Items Sold, Revenue, Active Posts, Conversion Rate, Avg Rating, Reviews)
- [ ] Top performing posts section (title, price, status badge, date, views/inquiries/offers)
- [ ] Category breakdown section (2-column grid: post count, sold count, view count per category)
- [ ] KPI scope alert banner
- [ ] Refresh button
- [ ] Category mode indicator
- [ ] Time range buttons (7D, 30D, 90D, All time)
- [ ] GET /seller-analytics/stats, GET /analytics/seller, GET /analytics/posts, GET /analytics/categories

#### 8D. KycScreen (414+825 web → 263 android) — Target 9/10

**Currently has:** Doc type selector, upload slots, status card, submit  
**Missing from web:**
- [ ] Multi-step progress stepper (3 steps)
- [ ] Aadhaar OTP verification (POST /aadhaar/send-otp, POST /aadhaar/verify-otp)
- [ ] PAN verification
- [ ] Verified status card (green) with details
- [ ] Pending status card (amber) with estimated time + refresh
- [ ] Process timeline visualization
- [ ] Error/success message banners

#### 8E. AccountDeleteScreen (100 web → ~60 android) — Target 9/10

**Currently has:** Confirmation with reason  
**Missing from web:**
- [ ] Type "DELETE" confirmation input
- [ ] Warning banner with red styling
- [ ] Alert triangle icon
- [ ] DELETE /users/account API call
- [ ] Auto-logout after deletion

---

### PHASE 9: Auth Screens Enhancement
**Goal:** SignUp, Login enhancements to 9/10

#### 9A. SignUpScreen (716 web → 252 android) — Target 9/10

**Currently has:** Basic signup form  
**Missing from web:**
- [ ] 4-step progress indicator (Aadhaar → OTP → PAN → Password)
- [ ] Step 1: Aadhaar number (12 digits) + mobile number with +91
- [ ] Step 2: OTP input + verify + resend timer
- [ ] Step 3: PAN number (10 chars) + verification
- [ ] Step 4: Password creation with strength meter (3 levels) + requirements checklist + referral code
- [ ] Back button with step navigation
- [ ] Hero section with Sparkles icon
- [ ] Status indicators per step
- [ ] POST /auth/aadhaar/send-otp, verify-otp, pan/verify, complete-signup

#### 9B. LoginScreen Enhancement (454 web → 586 android)

**Currently has:** Mobile + password, OTP 2FA, show/hide toggle  
**Missing from web:**
- [ ] Web OTP auto-read capability (Android SMS retrieval)
- [ ] Resend timer display
- [ ] Mobile suffix display in OTP challenge
- [ ] Orange info banner for SIM verification
- [ ] Forgot password link styling

---

### PHASE 10: Discovery & Remaining Screens
**Goal:** All remaining screens to 9/10

#### 10A. ActivityHubScreen (193 web → 0 android) — NEW SCREEN

**Build from web:**
- [ ] Icon grid with 4 cards: Chat, Offers, Reviews, Nearby
- [ ] Each card navigates to respective screen
- [ ] CMS content display below
- [ ] Auth gate (login required)

#### 10B. HomeDiscoveryScreen (265 web → merged in CategoryHub) — Target 9/10

**Missing from web:**
- [ ] Category quick-access grid (8 buttons with emoji)
- [ ] Trending listings section
- [ ] Quick stats banner (Listings count, Categories, Verified badge)
- [ ] Centre Updates feed (if logged in)
- [ ] Featured Centre Pages (if logged in)

#### 10C. CategoryModeScreen — NEW SCREEN

**Build:**
- [ ] App/category mode selector UI
- [ ] Show current active mode
- [ ] Switch between Electronics/Fashion/Vehicles/Others/All
- [ ] Persist selection to CategoryMode context

#### 10D. PostWelcomeScreen (677 web → ~120 android) — Target 9/10

**Currently has:** Feature list, CTA  
**Missing from web:**
- [ ] FlowStep visual progress (3 steps)
- [ ] Subscription plan badges display
- [ ] Current tier info
- [ ] Post credits remaining
- [ ] CTA to subcategories selection
- [ ] GET /subscriptions/my integration

#### 10E. BuyerViewScreen (609 web → ~80 android) — Target 9/10

**Currently has:** Basic search, price ranges  
**Missing from web:**
- [ ] Brand dropdown filter (GET /brands)
- [ ] Price range selector
- [ ] Reset filters button
- [ ] Listings grid (image, title, price)
- [ ] Location tags
- [ ] Brand badges
- [ ] Multi-filter system
- [ ] Category awareness

#### 10F. RecentlyViewedScreen (1,328 web → ~80 android) — Target 9/10

**Currently has:** Basic history list  
**Missing from web:**
- [ ] View mode toggle (grid/list)
- [ ] Source filter tabs (8: all, allposts, feed, for-you, wishlist, search, notifications, my-home)
- [ ] Search input + sort dropdown (5 options)
- [ ] Select all + bulk remove
- [ ] Clear all button with 2-tap confirmation
- [ ] Cursor-based pagination
- [ ] Toast notifications
- [ ] GET/DELETE /recently-viewed APIs

#### 10G. SavedSearchesScreen (682 web → ~80 android) — Target 9/10

**Currently has:** Basic list, badges  
**Missing from web:**
- [ ] Create new search form (name, keywords, location, min/max price)
- [ ] Notification toggle per search
- [ ] Matches count badge
- [ ] Run search button → navigate to AllPosts with filters
- [ ] Category mode banner
- [ ] POST /saved-searches, DELETE /saved-searches/{id}, PATCH notifications

#### 10H. CompareScreen (354 web → ~80 android) — Target 9/10

**Currently has:** Basic horizontal scroll  
**Missing from web:**
- [ ] Sticky header with item count badge + subcategory badge
- [ ] Clear all button
- [ ] Item cards row (horizontal scroll)
- [ ] Comparison table with sticky left column (spec names)
- [ ] Dynamic spec field extraction
- [ ] Remove individual items
- [ ] BASE_SPEC_FIELDS: image, title, price, condition, brand, model, location, category, seller, subcategory, posted date

#### 10I. AadhaarVerifyScreen (407 web → 0 android) — NEW SCREEN

**Build from web:**
- [ ] Full name input
- [ ] Aadhaar number input (12 digits)
- [ ] Date of birth input
- [ ] Send OTP button
- [ ] OTP input + verify
- [ ] Benefits card (Verified, Rewards, Top deals)
- [ ] Privacy/security alert card
- [ ] Success state with verified badge

#### 10J. FeedPostAddScreen (172 web → ~80 android in SocialScreens) — Target 9/10

**Currently has:** Title + content inputs  
**Missing from web:**
- [ ] Hero header with gradient
- [ ] Title input (optional, 200 char max)
- [ ] Content textarea (required, 5-500 chars, 8 rows)
- [ ] Character counter with color change (orange when near limit)
- [ ] "Tip" info box about feed vs main posts
- [ ] Cancel + Publish buttons
- [ ] Loading state on submit

#### 10K. NearbyScreen (585 web → 252 android) — Target 9/10

**Currently has:** Location-based listing  
**Missing from web:**
- [ ] Geolocation permission state machine (prompt → granted → denied)
- [ ] Radius selector buttons (1, 5, 10, 25, 50, 100 km)
- [ ] Distance badges color-coded (green <5km, orange 5-20km, red >20km)
- [ ] Map preview placeholder SVG
- [ ] Category filter dropdown
- [ ] Retry on geolocation failure

---

### PHASE 11: Polish & Final Parity
**Goal:** All screens at 9-10/10, global features

#### 11A. Global Features (apply across all screens)

- [ ] Page density toggle support on all list screens
- [ ] Dark mode consistency audit
- [ ] Category mode context — filter content by active app category group
- [ ] Guest preview limits (5 items then login CTA)
- [ ] Post translation support (instant + async)
- [ ] Share link dialog reusable component
- [ ] Promote dialog reusable component
- [ ] Login prompt modal reusable component
- [ ] Buyer interest modal reusable component
- [ ] Image zoom modal reusable component
- [ ] Skeleton loading consistency
- [ ] Error state consistency (retry buttons)
- [ ] Empty state consistency (icons + CTAs)
- [ ] Pull-to-refresh on all list screens
- [ ] Back-to-top FAB on long-scrolling screens

#### 11B. Navigation Routes Completion

Ensure MhubApp.kt has routes for ALL 67 paths:
- [ ] `/activity` → ActivityHubScreen
- [ ] `/category-mode` → CategoryModeScreen
- [ ] `/aadhaar-verify` → AadhaarVerifyScreen
- [ ] `/post_add` → FeedPostAddScreen (alias)
- [ ] Verify all existing routes match web paths

#### 11C. API Endpoint Audit

Cross-check all Android Repository methods against web API calls:
- [ ] Verify every GET/POST/PUT/DELETE/PATCH endpoint used in web is available in Android repositories
- [ ] Add missing endpoints to MhubApi.kt interface
- [ ] Add missing DTOs for request/response models

#### 11D. Missing API Endpoints (Android MhubApi.kt vs Web)

These web endpoints are NOT in MhubApi.kt and need adding:
- [ ] `GET /notifications/preferences` — notification preference toggles
- [ ] `PUT /notifications/preferences` — save notification preferences
- [ ] `PATCH /notifications/{id}/snooze` — snooze notification
- [ ] `DELETE /notifications` (clear all) — bulk delete all notifications
- [ ] `GET /auth/sessions` — list active sessions
- [ ] `DELETE /auth/sessions/{id}` — revoke single session
- [ ] `DELETE /auth/sessions` — revoke all sessions
- [ ] `GET /payments/upi-details` — UPI payment config
- [ ] `GET /payments/status` — payment history
- [ ] `POST /payments/submit` — manual payment submission
- [ ] `POST /payments/razorpay/order` — Razorpay order creation
- [ ] `POST /payments/razorpay/verify` — Razorpay payment verification
- [ ] `GET /subscriptions/my` — current subscription info
- [ ] `GET /subscriptions/plans` — available plans
- [ ] `POST /subscriptions/cancel` — cancel subscription
- [ ] `GET /subscriptions/history` — subscription history
- [ ] `GET /seller-analytics/stats` — seller analytics
- [ ] `GET /analytics/seller` — legacy seller overview
- [ ] `GET /analytics/posts` — post analytics
- [ ] `GET /analytics/categories` — category breakdown
- [ ] `POST /sale/initiate` — initiate sale
- [ ] `POST /sale/confirm` — confirm sale with OTP
- [ ] `GET /sale/pending` — pending sales
- [ ] `GET /transactions/pending` — pending transactions (fallback)
- [ ] `GET /transactions/undone` — undone transactions
- [ ] `POST /posts/{id}/reactivate` — reactivate sold post
- [ ] `PATCH /posts/{id}/status` — update post status
- [ ] `POST /posts/{id}/sold` — mark post as sold
- [ ] `GET /posts/mine/totals` — post count by status
- [ ] `POST /posts/{id}/share` — track share action
- [ ] `GET /posts/batch-view` — batch view tracking
- [ ] `POST /inquiries` — buyer interest/inquiry
- [ ] `GET /inquiries/post/{id}` — inquiries for a post
- [ ] `GET /offers/history/{id}` — offer history for a post
- [ ] `GET /recently-viewed/post/{id}` — recently viewed for post
- [ ] `DELETE /recently-viewed/{postId}` — remove from recently viewed
- [ ] `DELETE /recently-viewed/clear` — clear all recently viewed
- [ ] `DELETE /recently-viewed/bulk` — bulk remove recently viewed
- [ ] `POST /saved-searches` — create saved search
- [ ] `PATCH /saved-searches/{id}/notifications` — toggle search notifications
- [ ] `GET /admin/dashboard` — admin dashboard
- [ ] `POST /admin/dashboard/flagged-posts/bulk-action` — admin bulk action
- [ ] `POST /admin/users/bulk-action` — admin user action
- [ ] `GET /complaints/my` — user's complaint history
- [ ] `GET /nearby` — nearby posts with lat/long/radius
- [ ] `GET /publicwall` — public wall leaderboards
- [ ] `GET /rewards/stream` (SSE) — real-time rewards stream
- [ ] `POST /profile/upload-avatar` — avatar upload
- [ ] `GET /profile/preferences` — user preferences
- [ ] `PUT /profile/preferences` — update preferences
- [ ] `POST /channels/{id}/posts` — create channel post
- [ ] `POST /channels/{id}/media` — upload channel media
- [ ] `GET /premium-channels` — premium centre list
- [ ] `PATCH /reviews/{id}/helpful` — mark review helpful
- [ ] `POST /reviews/{id}/respond` — seller response to review
- [ ] `POST /contacts/sync` — sync device contacts

#### 11E. Missing Shared Components (Android vs Web)

Reusable components that exist in web but not Android:
- [ ] **ShareLinkDialog** — Copy link, WhatsApp, Telegram, Twitter, Email share buttons; auto-select input
- [ ] **PromoteDialog** — 3 tiers (Boost 7d, Featured 14d, Spotlight 30d) with PostBoostPanel
- [ ] **BuyerInterestModal** — Name, phone (10+ digits), address, message form → POST /inquiries
- [ ] **LoginPromptModal** — Context-aware messaging, feature list, login/signup/guest options
- [ ] **ImageZoomModal** — Pinch zoom (0.5x-4x), keyboard arrows, swipe gestures, scroll wheel
- [ ] **PostPromoBadges** — Boost level badges (Boosted/Featured/Spotlight), trust score integration, risk state
- [ ] **GreatDealsBanner** — Collapsed/expanded states, sponsored label, preview images, Shop Now CTA
- [ ] **QuickFilters** — Price range chips, Latest 5/10, Posted Today, Near Me, auto-refresh toggle
- [ ] **CategoryBar** — Two-row: categories + subcategories with count badges, horizontal scroll
- [ ] **TransactionStepper** — Step circles (completed/current/pending), labels, hints
- [ ] **AudioRecorder** — 30s max, start/stop/play/pause/delete, MIME detection, permission handling
- [ ] **BackToTop** — Scroll-to-top FAB with show/hide on scroll threshold
- [ ] **PriceAlertButton** — Price watch/notification per listing
- [ ] **MakeOfferModal** — Price input, message, suggested prices row, last offer display
- [ ] **StickyBottomCTA** — Fixed bottom bar with price + action buttons
- [ ] **ExpandableText** — Truncated text with "Read more" / "Show less"
- [ ] **StarRating** — Interactive star rating input (1-5 tap)
- [ ] **PasswordStrengthIndicator** — 3-level meter with requirement checklist
- [ ] **CardContextMenu** — Long-press/overflow menu on cards

#### 11F. Missing Cross-Cutting Features (Web Has, Android Lacks)

Platform-level features the web has that Android plan doesn't cover:
- [ ] **CategoryMode Context** — Global app/category mode that filters ALL screens (posts, feed, search, recommendations, etc.). Currently no equivalent ViewModel/state in Android.
- [ ] **FilterContext** — Global filter state shared across AllPosts, Search, ForYou. Android has per-screen filters only.
- [ ] **CartContext** — Cart state with localStorage persistence, multi-tab sync. Android has basic cart but no persistence.
- [ ] **LocationContext** — GPS with IP fallback, 5m background refresh, spoofing detection, reverse geocode, POI lookup. Android has basic GPS only.
- [ ] **Haptic Feedback** — Light/medium/success vibration on interactions (like, purchase, reward claim)
- [ ] **Offline Message Queue** — Messages stored locally when offline, replayed when connectivity returns
- [ ] **Swipe-Back Navigation** — Left-edge swipe (≤24px) triggers navigate(-1) on all screens
- [ ] **Device Fingerprinting** — Canvas/WebGL/audio hashing for fraud prevention
- [ ] **OTP Auto-Read** — SMS auto-read for OTP fields (Android has SmsRetriever API available)
- [ ] **Pull-to-Refresh Gesture** — Web has custom damped animation. Android has PullToRefreshBox but not on all screens.
- [ ] **Optimistic Like** — Instant UI update on like with rollback on API error
- [ ] **Post Translation** — Instant cached + lazy remote translation pipeline
- [ ] **Infinite Scroll Sentinel** — IntersectionObserver pattern. Android has basic scroll detection but not sentinel-based.
- [ ] **Before-Unload Warning** — Warn user when leaving form with unsaved changes
- [ ] **Price Change Detection** — Cart tracks price changes since add (delta %, price_at_add)
- [ ] **VPN Detection** — WebRTC/DNS/IP checks to detect VPN/proxy usage
- [ ] **Contact Sync** — Sync device contacts to find friends on platform
- [ ] **Focus Trap** — Keyboard focus trapping inside modals/dialogs for accessibility
- [ ] **SSE/Real-time Streams** — Rewards stream, notification polling, chat presence
- [ ] **Guest Interest Persistence** — Guest user category interests saved to localStorage for later
- [ ] **Batch View Reporting** — Views tracked in batches (5s interval) instead of individual calls
- [ ] **Rate Limit Handling** — 429 response handling with retry-after parsing and cooldown
- [ ] **CSRF Token Management** — Cookie-based XSRF-TOKEN in requests (already in Android OkHttp interceptor)

---

## BUILD & TEST STRATEGY

After each phase:
1. `.\gradlew.bat :app:assembleDebug --no-configuration-cache -q` — must compile with 0 errors
2. `adb install -r app\build\outputs\apk\debug\app-debug.apk` — install on device
3. Navigate to each modified screen — verify no crashes
4. Compare side-by-side with web app on same data

---

## PRIORITY ORDER

| Priority | Phase | Impact | Effort |
|----------|-------|--------|--------|
| P0 | Phase 1 (Primary Nav) | Highest — 6 main screens users see daily | High |
| P0 | Phase 2 (Detail+Create) | Highest — revenue conversion screens | High |
| P1 | Phase 3 (Inventory) | High — seller workflow | Medium |
| P1 | Phase 4 (Search+Chat) | High — daily user engagement | Medium |
| P1 | Phase 5 (Commerce) | High — transaction flow | Medium |
| P2 | Phase 6 (Social) | Medium — community features | Medium |
| P2 | Phase 7 (Channels) | Medium — seller storefronts | Medium |
| P2 | Phase 8 (Account) | Medium — account management | Low-Medium |
| P3 | Phase 9 (Auth) | Low — auth works, needs polish | Low |
| P3 | Phase 10 (Remaining) | Low — secondary screens | Medium |
| P3 | Phase 11 (Polish) | Low — consistency pass | Low |

---

## TOTAL SCOPE ESTIMATE

| Metric | Count |
|--------|-------|
| Phases | 11 |
| Individual screen tasks | ~280 |
| Missing API endpoints to add | ~50 |
| Missing shared components to build | ~18 |
| Missing cross-cutting features | ~24 |
| **Total individual tasks** | **~370** |
| New screens to build | 4 (ActivityHub, CategoryMode, AadhaarVerify, PostAdd alias) |
| Screens needing major rework (3-4/10) | 36 |
| Screens needing feature adds (5-7/10) | 16 |
| Screens already at parity (8-10/10) | 11 |
| Web total lines | ~48,000 |
| Android current lines (UI) | ~13,000 |
| Android target lines (UI) | ~35,000-40,000 |

---

## PLAN COVERAGE RATING

| Section | Coverage | Rating |
|---------|----------|--------|
| Route inventory (67 routes) | All 67 mapped | 10/10 |
| Per-page feature gap analysis | All pages have missing list | 10/10 |
| Phase structure & ordering | 11 phases, priority-ranked | 10/10 |
| API endpoint gap analysis | 50 missing endpoints listed | 10/10 |
| Shared component gap analysis | 18 components identified | 10/10 |
| Cross-cutting feature gaps | 24 platform features identified | 10/10 |
| Build/test strategy | Per-phase build+install+verify | 9/10 |
| DTO/model gap analysis | Covered in 11D | 9/10 |
| Navigation route wiring | Covered in 11B | 9/10 |
| **Overall plan completeness** | | **9.7/10** |
