# MHUB MOBILE — MASTER BUILD PLAN
## All User Roles × All Screens — End-to-End Implementation Blueprint

> **Date:** May 29, 2026  
> **Platform:** Android (Kotlin / Jetpack Compose) + iOS parity  
> **Standard:** 10/10 real-time, fully functional, production-grade  
> **Source of truth:** Web app at `http://localhost:8081/`

---

## PART 1 — USER ROLES & PERMISSIONS MATRIX

| Role ID | Role Name | Description | Auth Required |
|---------|-----------|-------------|--------------|
| R0 | **Guest** | Unauthenticated browsing — no account | ✗ |
| R1 | **Buyer** | Registered user, no active listing/selling | ✓ |
| R2 | **Seller (Free)** | Registered + posted listings, no KYC | ✓ |
| R3 | **Seller (Verified/KYC)** | KYC done, paid plan, full sale rights | ✓ |
| R4 | **Admin** | Platform admin — full management access | ✓ (admin token) |

---

## PART 2 — SCREEN INVENTORY WITH ROLE-BY-ROLE BEHAVIOR

---

### SCREEN 1 — SPLASH / LAUNCH SCREEN

**Purpose:** Brand entry point; determine auth state and route user.

| Role | Behavior |
|------|----------|
| R0 Guest | Check no token → route to Home (guest mode) |
| R1–R3 | Check valid token → skip Login → route to Home |
| R4 Admin | Token valid + admin flag → route to Home |

**Required Features:**
- Animated logo (Lottie or Canvas animation)
- Token validation against `/api/auth/verify`
- Auto-timeout (max 2.5 s) — no indefinite loading
- Deep link interception (if opened via share link → route after auth check)
- Dark/light mode logo variant

**Acceptance Criteria:**
- No infinite spinner
- Never shows login if valid token exists
- Correctly routes every role on cold start

---

### SCREEN 2 — HOME (CATEGORY HUB / ECOSYSTEM SELECTOR)

**Purpose:** The ONLY ecosystem selector. User picks a category world here. NOT a dashboard.

| Role | Behavior |
|------|----------|
| R0 Guest | Full access — browse ecosystems freely; no bottom nav |
| R1–R3 | Full access + personalization hint; "Post for Free" CTA visible |
| R4 Admin | Full access + admin badge |

**Required Features:**
- 4+ ecosystem cards (Fashion, Electronics, Vehicles, Furniture, etc.) — loaded from API
- Each card: category image, name, live listing count badge
- Hero banner carousel (API-driven, localized, swipeable)
- Recently active categories highlight
- Trending category badge (real-time)
- Search bar → navigates to SearchPage pre-scoped to that ecosystem
- **NO** bottom navbar on this screen
- **NO** internal app navigation — Home is only an entry point
- Localization: all category names, banner text reactive to locale
- Pull-to-refresh → reload banners + categories
- Shimmer loading state for cards and banners

**Interactions:**
- Tap ecosystem card → enters that ecosystem's AllPosts (scoped)
- Long press card → preview modal (listing count, recent activity)
- Search bar → SearchPage with ecosystem pre-filter

**Acceptance Criteria:**
- Category cards load from API (not hardcoded)
- Banner images from Cloudinary/server
- Switching locale instantly renames everything
- No stale category data after revisit

---

### SCREEN 3 — ALL POSTS (MARKETPLACE LISTINGS — ECOSYSTEM-SCOPED)

**Purpose:** Ecosystem-scoped product marketplace. The primary browsing screen.

| Role | Behavior |
|------|----------|
| R0 Guest | Browse, view details, wishlist CTA shows login prompt |
| R1 Buyer | Browse, wishlist, compare, contact seller |
| R2 Seller (Free) | All above + "My Listings" quick link |
| R3 Seller (KYC) | All above + mark-sold actions from cards |
| R4 Admin | All above + moderation quick-action overlay |

**Required Features:**
- **Top Bar:** ecosystem name, search icon, filter icon, compare toggle icon, sort icon
- **Sticky Filter Chips:** All, Price range, Condition (New/Used), Location, Subcategory — from API
- **Listing Grid (2-col):** image, title, price, location, time ago, views/likes count, condition badge, seller avatar
- **Sort Options:** Newest, Price Low→High, Price High→Low, Most Viewed, Nearest
- **Quick Filter Panel** (bottom sheet): multi-select attributes per ecosystem (dynamic per category)
- **Compare Mode:** long-press or compare icon on card → add to compare tray (max 3)
- **Pagination:** infinite scroll with page-end loader
- **Recently Viewed:** "Continue browsing" card at top if returning user
- **Saved Searches:** "Save this search" floating chip when filters active
- **Nearby Toggle:** switch between all listings / within radius
- **Empty State:** helpful CTA — "Be first to post in this category"
- **Image lazy-load** with blurhash placeholder
- **Pull-to-refresh**
- **Shimmer skeleton** on first load

**Acceptance Criteria:**
- Listings scoped to selected ecosystem only — no cross-category leakage
- Filters reload from API per ecosystem (no hardcoded filter lists)
- Compare tray persists across scroll
- No blank screen after navigating back from PostDetail

---

### SCREEN 4 — POST DETAIL

**Purpose:** Full product listing detail — primary conversion page.

| Role | Behavior |
|------|----------|
| R0 Guest | View only; Contact Seller → login prompt; Wishlist → login prompt |
| R1 Buyer | Contact Seller (Chat), Wishlist, Report, Make Offer |
| R2 Seller (own post) | Edit, Delete, Mark Sold, Promote, View Stats |
| R2 Seller (other's post) | Same as R1 Buyer |
| R3 KYC Seller (own post) | All R2 + Initiate Sale (SaleDone flow) |
| R4 Admin | All + Moderate (Hide, Flag, Delete with reason) |

**Required Features:**
- **Image Gallery:** swipeable full-screen images with dot indicators, pinch-to-zoom
- **Price** — formatted with currency symbol, negotiable badge if applicable
- **Seller Card** — avatar, name, member since, rating stars, "View Profile" link
- **Product Attributes** — ecosystem-specific attributes grid (dynamic, from API)
- **Description** — expandable long text
- **Location Map Preview** — embedded map pin (approximate area, not exact address)
- **Similar Listings** — horizontal scroll of same subcategory items
- **View Count / Wishlist Count** (live from API)
- **Share Button** — generates deep link
- **Report Post** — reason selection bottom sheet
- **Contact Seller** — navigates to Chat
- **Make Offer** — input dialog → sends to seller inbox
- **Wishlist Button** — heart toggle, animated
- **Breadcrumb** — Home > Category > Subcategory > Post Title
- **Sticky Bottom Bar:** primary action (Contact / Initiate Sale / Edit)

**Acceptance Criteria:**
- Gallery loads correctly on slow connections (progressive load)
- Seller card links to real profile
- Similar listings scoped to same subcategory
- Editing own post pre-fills all current values

---

### SCREEN 5 — SEARCH PAGE

**Purpose:** Global + ecosystem-scoped search across all listings and feed posts.

| Role | Behavior |
|------|----------|
| R0 Guest | Search allowed; results show; actions require login |
| R1–R3 | Full search + save search + recent searches history |
| R4 Admin | Full search + admin result tagging |

**Required Features:**
- **Search Bar** — autofocus on open, real-time suggestions (debounced 300ms)
- **Suggestions Panel** — recent searches (local), trending searches (API), category shortcuts
- **Results Tabs:** All / Listings / Feed Posts / Users / Channels
- **Filter Bar** below results — same as AllPosts filters, ecosystem-aware
- **Empty State** per tab type — with related suggestions
- **Voice Search** — microphone input via Android SpeechRecognizer
- **QR/Scanner shortcut** — scan product barcode / QR code → search by product ID
- **Save Search** — bell icon → saved to SavedSearches
- **Recent Searches** — list with delete per item + "Clear All"
- **Highlighted query terms** in result cards

**Acceptance Criteria:**
- Debounced API call — not on every keystroke
- Saved searches persist across sessions
- Filter state persists within search session

---

### SCREEN 6 — FOR YOU (PERSONALIZED RECOMMENDATIONS)

**Purpose:** AI/algorithm-driven personalized listing recommendations for the current user.

| Role | Behavior |
|------|----------|
| R0 Guest | Generic trending listings (no personalization); login CTA banner at top |
| R1–R3 | Personalized based on viewed posts, wishlist, location, browsing history |
| R4 Admin | Personalized + content health score overlay (optional admin feature) |

**Required Features:**
- **3-Tier Feed:**
  - Tier 1: Based on recently viewed items
  - Tier 2: Based on wishlist category overlap
  - Tier 3: Based on locale/location trending
- **Section Headers** with reasoning label: "Because you viewed X", "Trending in Fashion", "Near you"
- **Listing Cards** — same as AllPosts grid style
- **Refresh Logic:** Pull-to-refresh rebuilds personalization from API
- **Locale Reactivity:** locale change → re-fetch all 3 tiers
- **Empty State** — "Start browsing to personalize your feed"
- **Pagination:** infinite scroll per tier
- **"Why this?" Button** — small info icon on each card showing personalization reason

**Acceptance Criteria:**
- R0 Guest sees DIFFERENT content than R1–R3 (generic vs personalized)
- Locale change reloads all content
- No duplicate cards across 3 tiers

---

### SCREEN 7 — FEED (SOCIAL / NEWS / DISCUSSION)

**Purpose:** User-generated social content — news, discussions, knowledge sharing. NOT a product listing feed.

| Role | Behavior |
|------|----------|
| R0 Guest | Read-only; Like/Comment → login prompt |
| R1–R3 | Full — like, comment, share, save, report |
| R4 Admin | All + Moderate/Delete posts |

**Required Features:**
- **Feed Post Cards:** author avatar + name, timestamp, category tag, title, body text (truncated), image(s), like count, comment count, share count
- **Post Types:** Text, Image(s), Poll, Link preview
- **Like Button** — animated heart/thumbs reaction
- **Comment Thread** — expandable in-feed preview (show 2), tap to expand full thread
- **Share** — native share sheet + in-app share to Channel
- **Report Post** — reason selection
- **Save Post** (bookmarks — not wishlist)
- **Follow/Unfollow Author** from card header
- **Category/Topic Filter Chips** — All, Fashion, Electronics, General Discussion, etc.
- **Create Post FAB** — opens feed post composer (text, images, poll) — requires R1+
- **Trending Topics Sidebar** / Horizontal scroll
- **Pull-to-refresh**
- **Pagination** infinite scroll

**Acceptance Criteria:**
- Feed content is clearly SOCIAL, not marketplace listings
- Guest can read, all actions gated correctly
- Comment thread loads nested correctly

---

### SCREEN 8 — MY FEED (OWN SOCIAL POSTS)

**Purpose:** Current user's own published feed/social posts. Personal social content management.

| Role | Behavior |
|------|----------|
| R0 Guest | No access → redirect to Login |
| R1–R3 | View, edit, delete own posts; see engagement stats |
| R4 Admin | View own + can moderate others |

**Required Features:**
- **Post List** — user's own feed posts, newest first
- **Engagement Stats** per post — likes, comments, shares
- **Edit Post** — tap to edit text/images
- **Delete Post** — confirm dialog
- **Post Status** badges — Published / Under Review / Hidden
- **Create Post** button → Feed Post Composer
- **Empty State** — "You haven't shared anything yet. Start a discussion!"
- **Pull-to-refresh**

**Acceptance Criteria:**
- Only shows CURRENT user's own posts
- Edit + Delete work end-to-end
- Status badges reflect actual post state from API

---

### SCREEN 9 — MY HOME (MY LISTINGS / MY MARKETPLACE POSTS)

**Purpose:** Current user's own marketplace product listings management dashboard.

| Role | Behavior |
|------|----------|
| R0 Guest | No access → Login prompt |
| R1 Buyer | Read-only view of any purchases; no active listings |
| R2 Seller (Free) | Manage own listings (limited count per plan) |
| R3 KYC Seller | Full listing management + sale initiation |
| R4 Admin | Own listings + can view all users' listings via Admin Panel |

**Required Features:**
- **Hero Stats Row:** Total Posts / Active / Sold / Bought (tappable → filtered view)
- **Search Bar** — search own posts
- **Status Filter Chips:** All / Active / Sold / Bought
- **Sort:** Date, Price, Views, Likes, Title (asc/desc toggle)
- **Listing Cards:** thumbnail, title, price, status badge, view count, like count, date posted, quick-action icons
- **Quick Actions per card:** Edit, Mark as Sold, Delete, Promote, Share
- **Bulk Mode:** long-press to select multiple → bulk delete / bulk mark sold
- **Mark as Sold dialog** — enter buyer details if needed
- **Promote dialog** — view available promotion plans
- **Pull-to-refresh**
- **Empty State:** "You haven't posted anything yet. Post your first listing!"
- **Post Limit Warning** (for R2 Free plan) — "You've used 3/5 free posts. Upgrade to post more."

**Acceptance Criteria:**
- Stats update in real-time after actions (mark sold, delete)
- Bulk mode works cleanly without state corruption
- R2 sees plan limit warning; R3 sees no limit warning

---

### SCREEN 10 — CREATE POST / ADD POST (SELL FLOW)

**Purpose:** Multi-step listing creation flow with KYC and plan gating.

| Role | Behavior |
|------|----------|
| R0 Guest | FAB tap → Login prompt |
| R1 Buyer | FAB tap → PostWelcome → KYC gate → Plans → Create |
| R2 Seller (Free) | FAB → direct to Create (if under limit) or upgrade prompt |
| R3 KYC Seller | FAB → direct to Create (no gates) |
| R4 Admin | Direct to Create |

**Required Flow Steps:**

**Step 1 — PostWelcome** (first-time seller gate)
- Explains selling benefits
- KYC required notice
- CTA → Start KYC or Continue if KYC done

**Step 2 — KYC Screen**
- Aadhaar verification
- Phone + OTP
- ID document upload
- Review + Submit
- Status: Pending / Verified / Rejected (with rejection reason)

**Step 3 — Plans / Tier Selection**
- Plan cards: Free / Basic / Premium / Business
- Feature comparison table per plan
- Price, listing limit, promotion credits, sale commissions
- Upgrade CTA → Payment flow
- Current plan badge

**Step 4 — Post Creation Form**
- Category + Subcategory selection (cascading dropdowns)
- Title, Description (rich text)
- Images upload (multi-select, reorder, delete) — min 1, max 10
- Price (with negotiable toggle)
- Condition (New/Like New/Good/Fair)
- Location — map picker or GPS auto-fill
- Ecosystem-specific custom attributes (dynamic form fields per category from API)
- Post preview before submit
- Draft save (auto + manual)

**Acceptance Criteria:**
- Form fully validates before submit
- Images compressed client-side before upload
- Custom attributes differ per category (not hardcoded)
- Draft persists across app restart
- R3 never hits KYC gate again once verified

---

### SCREEN 11 — EDIT POST

**Purpose:** Edit an existing marketplace listing.

| Role | Behavior |
|------|----------|
| R0–R1 | No access |
| R2 / R3 (own post only) | Can edit all fields except category (requires relist) |
| R4 Admin | Can edit any post |

**Required Features:**
- Pre-fill ALL current values
- Same field structure as Create Post (Steps 4 above)
- Image management: delete existing, add new (reorder)
- "What changed?" reason field for sold/condition changes
- Submit → API PATCH, redirect to PostDetail
- Last-edited timestamp shown on listing after edit

---

### SCREEN 12 — PLANS / TIER SELECTION

**Purpose:** Marketplace subscription plans for sellers.

| Role | Behavior |
|------|----------|
| R0 Guest | View plans only — no upgrade action without login |
| R1–R2 | View + Upgrade (payment flow) |
| R3 | View current plan + Renew / Upgrade |
| R4 Admin | View all plans + Admin overrides |

**Required Features:**
- Plan Cards with full details: Free / Basic / Premium / Business
- Feature comparison matrix (posts/mo, images/post, analytics, promote credits, sale commission %, support tier)
- Current plan highlighted
- Upgrade button → Payment (UPI/Card/Wallet)
- Validity countdown for paid plans
- Plan change confirmation dialog

---

### SCREEN 13 — KYC VERIFICATION

**Purpose:** Identity verification required for full selling capabilities.

**Status States:** Not Started / In Progress / Pending Review / Verified / Rejected

| Role | Behavior |
|------|----------|
| R0 Guest | No access |
| R1–R2 | Start KYC flow |
| R3 | View verified status; re-submit if expired |
| R4 Admin | View any user's KYC status; approve/reject |

**Required Features:**
- Aadhaar number input + OTP via UIDAI (or mock)
- PAN / ID document type selector
- Camera capture / gallery picker for document images
- Selfie capture with liveness check hint
- Submit → "Under Review" status
- Push notification on approval/rejection
- Rejection shows reason + resubmit option
- Status badge visible on Profile

---

### SCREEN 14 — PROFILE (OWN & PUBLIC)

**Purpose:** User identity page. Own profile = management hub. Others' profile = public wall.

| Role (Own Profile) | Behavior |
|-----|---------|
| R0 Guest | Sees other users' public profiles only; own profile requires login |
| R1–R3 | View + Edit own profile; see own stats |
| R4 Admin | Own profile + admin badge; can view all users |

**Required Features (Own Profile):**
- **Header:** Avatar (change), Cover photo (change), Name, Bio, Location, Member since, KYC badge
- **Stats Row:** Posts, Followers, Following, Rating (tap each → drill-down)
- **Edit Profile:** inline editing or edit screen
- **Action Tabs:**
  - My Listings → My Home
  - Sold → SoldPosts
  - Bought → BoughtPosts
  - Feed Posts → My Feed
  - Reviews → Reviews screen
  - Activity → ActivityHub
- **Settings shortcut**
- **Referral Code** display
- **Share Profile** link

**Required Features (Other User's Profile):**
- Header (read-only)
- Stats (read-only)
- Follow / Unfollow button
- Message / Chat button (R1+)
- Report User
- Their active listings grid
- Their feed posts
- Their reviews/ratings

---

### SCREEN 15 — REWARDS

**Purpose:** Gamified rewards system — earn coins through platform activity.

| Role | Behavior |
|------|----------|
| R0 Guest | Preview rewards page (locked); login CTA |
| R1–R3 | Full access — daily codes, referrals, task completions, redeem |
| R4 Admin | Full access + manual credit/debit (admin override) |

**Required Features:**
- **Coin Balance** — large animated coin counter at top
- **Daily Code** — enter code to earn coins; countdown to next reset
- **Task List** — "Complete your profile", "Post your first listing", "Refer a friend" etc. — each with coin value
- **Task Progress** — progress bars, checkmarks on completion
- **Referral Tree** — visualize who you referred, their activity
- **Redeem Section** — convert coins to discount coupons, plan upgrades, cashback
- **Transaction History** — earned/spent timeline
- **Leaderboard** — top earners this week
- **Auth gate** — if not logged in, show locked overlay with login CTA (not a separate screen redirect)

**Acceptance Criteria:**
- Retry-on-401: auto-refresh token and reload, never show incorrect "session timeout"
- Daily code validates via API — no client-side bypass
- Coin balance updates instantly after task completion

---

### SCREEN 16 — SALE DONE (SALE INITIATION + CONFIRMATION)

**Purpose:** Seller initiates a sale and confirms via OTP. 3-step wizard.

| Role | Behavior |
|------|----------|
| R0 Guest | Auth gate — LoginPromptCard shown |
| R1 Buyer | No access (buyers don't initiate sales) |
| R2 Seller (Free/unverified) | Blocked — must complete KYC first |
| R3 KYC Seller | Full access |
| R4 Admin | Can initiate on behalf (with override reason) |

**3-Step Wizard:**

**Step 1 — Pending Sales Tab**
- List all pending/initiated sale transactions
- Each card: Post thumbnail, title, buyer name, agreed price, date initiated, status
- "New Sale" button

**Step 2 — Initiate Sale Form**
- Post ID field (search/autocomplete from own listings)
- Buyer ID field (search by username/phone)
- Agreed Price field
- Submit → `POST /api/sale/initiate` with `{ postId, buyerId, agreedPrice }`
- Success: shows Transaction ID

**Step 3 — Confirm Sale (OTP)**
- Transaction ID (auto-filled from Step 2 or manual entry)
- OTP field (6 digits)
- "Resend OTP" with 60s cooldown
- Submit → `POST /api/sale/confirm` with `{ transactionId, otp }`
- Success: navigates to Sale Receipt

**Sale Receipt:**
- Full receipt card: seller, buyer, item, amount, date, transaction ref
- Download PDF
- Share receipt
- "Mark another sale" CTA

**Acceptance Criteria:**
- R2 sees upgrade CTA, not a broken form
- OTP resend works with correct cooldown
- JSON fields use camelCase matching server (no @SerialName snake_case bugs)

---

### SCREEN 17 — SALE UNDONE (REACTIVATE / UNDO SALE)

**Purpose:** Allow a seller to undo/reverse a sale and reactivate the post.

| Role | Behavior |
|------|----------|
| R0 Guest | Auth gate |
| R1 Buyer | Can request undo (dispute flow) |
| R2/R3 Seller | Can undo own sale with reason |
| R4 Admin | Can undo any sale |

**Required Features:**
- **Undone History Tab:** list of all past undone/reversed sales
- **Undo Sale Form:**
  - Post selector (from sold listings)
  - Reason dropdown: Changed Mind / Buyer Backed Out / Payment Issue / Product Issue / Other
  - Description (optional, required if "Other")
  - Submit → `POST /api/posts/{postId}/reactivate` with `{ reason, description }`
- **Confirmation:** post status reverts from "sold" to "active"
- **Notification:** buyer notified of sale reversal

**Acceptance Criteria:**
- Calls correct endpoint (POST `/posts/{postId}/reactivate`)
- Reason is required
- Post reactivates in MyHome after undo

---

### SCREEN 18 — BOUGHT POSTS

**Purpose:** All items the current user has purchased.

| Role | Behavior |
|------|----------|
| R0 Guest | Auth gate |
| R1–R3 | View purchase history |
| R4 Admin | View any user's bought history |

**Required Features:**
- **List of purchased items:** thumbnail, title, price paid, seller, date
- **Filter:** All / Completed / Disputed / Refunded
- **Status badges:** Completed / In Dispute / Refunded
- **Contact Seller** per item
- **Leave Review** per completed item (if not yet reviewed)
- **Raise Complaint** per item
- **Download Receipt** per transaction
- **Empty State:** "You haven't bought anything yet"

---

### SCREEN 19 — SOLD POSTS

**Purpose:** All items the current user has sold.

| Role | Behavior |
|------|----------|
| R0 Guest | Auth gate |
| R1 Buyer | View (may be empty or show any items they sold incidentally) |
| R2/R3 Seller | Full view with analytics per sale |
| R4 Admin | Any user's sold history |

**Required Features:**
- List of sold items: thumbnail, title, price sold, buyer, date sold
- **Earnings summary** at top (total earned this month / all time)
- Filter: All / Completed / Undone / Pending
- Contact Buyer per sale
- View Sale Receipt per item
- Undo Sale shortcut
- Empty State: "No items sold yet"

---

### SCREEN 20 — BUYER VIEW

**Purpose:** Seller views who their potential/confirmed buyers are per listing.

| Role | Behavior |
|------|----------|
| R0–R1 | No access (buyer-side actions only) |
| R2/R3 Seller | View interested buyers per listing |
| R4 Admin | Any seller's buyer view |

**Required Features:**
- Post selector → shows interested/offer-making buyers
- Buyer cards: avatar, name, offer amount (if offer made), message snippet, date
- Accept Offer → initiates SaleDone flow pre-filled
- Reject Offer → sends rejection notification
- Message Buyer → navigates to Chat

---

### SCREEN 21 — WISHLIST

**Purpose:** Saved/favorited listings.

| Role | Behavior |
|------|----------|
| R0 Guest | Auth gate on wishlist actions |
| R1–R3 | Full wishlist management |
| R4 Admin | Own wishlist |

**Required Features:**
- Grid of wishlisted items (same card as AllPosts)
- Swipe-to-remove OR long-press delete
- Organize into Collections (create, rename, delete collection folders)
- Sort: Date Added, Price, Category
- Filter by Category/Subcategory
- "Item Sold" badge if wishlisted item now sold (with reactivated alternative suggestions)
- Price drop alert toggle per item
- Empty State: "Your wishlist is empty. Start saving items you love!"
- Share wishlist (generate link)

---

### SCREEN 22 — NOTIFICATIONS

**Purpose:** Real-time push + in-app notification center.

| Role | Behavior |
|------|----------|
| R0 Guest | Auth gate |
| R1–R3 | Full notification management |
| R4 Admin | Own notifications + system alert broadcasts |

**Required Features:**
- **Notification Types:**
  - New message (Chat)
  - Wishlist item: price drop / item re-listed / sold
  - Your post: new offer / new view milestone / expiring
  - Sale: initiated / confirmed / undone
  - Rewards: task completed / daily code available / leaderboard change
  - Follow: someone followed you
  - Feed: someone liked/commented your post
  - KYC: status changed
  - System: plan expiry warning, platform updates
- **Mark as Read** — per item + "Mark All Read"
- **Delete** per notification
- **Notification Settings shortcut** → `notification-prefs` screen
- **Filter Tabs:** All / Activity / Sales / Rewards / System
- **Real-time WebSocket** — new notifications appear without pull-to-refresh
- **Grouped by date** (Today / Yesterday / This Week / Older)
- **Push notification deep-link** → tapping opens correct screen

---

### SCREEN 23 — SAVED SEARCHES

**Purpose:** Saved search queries with alert subscriptions.

| Role | Behavior |
|------|----------|
| R0 Guest | Auth gate |
| R1–R3 | Manage saved searches |

**Required Features:**
- List of saved search queries with their filter configurations
- **Alert toggle** per search — get notified when new listings match
- **Alert frequency** — Instant / Daily Digest / Weekly Digest
- Run search again (loads AllPosts pre-filtered)
- Delete saved search
- Edit saved search (rename + adjust filters)
- Empty State: "Save a search from AllPosts to get notified of new matches"

---

### SCREEN 24 — RECENTLY VIEWED

**Purpose:** Browsing history of viewed product listings.

| Role | Behavior |
|------|----------|
| R0 Guest | Session-only history (cleared on close) |
| R1–R3 | Persistent history (API-backed) |

**Required Features:**
- Chronological list of viewed listings
- Grouped by date (Today / Yesterday / This Week)
- Remove per item
- Clear All history
- "Still Available" badge vs "Sold" badge per item
- Jump back to listing on tap
- Empty State: "Your browsing history will appear here"

---

### SCREEN 25 — COMPARE POSTS

**Purpose:** Side-by-side comparison of up to 3 product listings.

| Role | Behavior |
|------|----------|
| R0 Guest | Full access (read-only comparison) |
| R1–R3 | Full access + wishlist/contact from compare |

**Required Features:**
- Up to 3 items side-by-side (horizontal scroll on mobile)
- **Comparison rows:** Price, Condition, Location, Category-specific attributes (dynamic per ecosystem)
- **Highlight best value** — green highlight for "winner" per row
- **Add to Wishlist** per item from compare view
- **Contact Seller** per item from compare view
- **Remove item** from comparison → slot becomes empty + "Add" button
- **Share comparison** — generate shareable comparison link
- Launched from AllPosts "compare mode" or PostDetail compare button

---

### SCREEN 26 — NEARBY POSTS

**Purpose:** Location-based listing discovery.

| Role | Behavior |
|------|----------|
| R0 Guest | Location permission prompt; anonymous browsing |
| R1–R3 | Location-based personalized discovery |

**Required Features:**
- Map view (Google Maps / OSM) with listing pins
- List view toggle
- Radius slider (1 km → 100 km)
- Category filter on map
- Pin tap → mini listing card preview
- Mini card → full PostDetail
- GPS auto-location + manual location override
- Cluster pins at high zoom-out levels (performance)
- No exact seller address shown (approximate area only — privacy rule)

---

### SCREEN 27 — CART

**Purpose:** Pre-purchase cart for multi-item checkout flows (for ecosystems that support it).

| Role | Behavior |
|------|----------|
| R0 Guest | Auth gate |
| R1–R3 | Full cart management |

**Required Features:**
- Items list with quantity control (if applicable per ecosystem)
- Item price, subtotal, total
- Remove item
- Save for later → moves to Wishlist
- Proceed to Payment
- Coupon/discount code input
- Order summary breakdown

---

### SCREEN 28 — CHAT / MESSAGES

**Purpose:** Real-time direct messaging between buyers and sellers.

| Role | Behavior |
|------|----------|
| R0 Guest | Auth gate |
| R1–R3 | Full messaging |
| R4 Admin | Can monitor flagged conversations |

**Required Features:**
- **Chat List Screen:** all conversations, last message preview, unread count badge, online indicator
- **Conversation Screen:**
  - Message bubbles (sent/received)
  - Message types: text, image, listing share card, offer card
  - "Seen" read receipts
  - Typing indicator
  - Send image from gallery/camera
  - Share a listing card inline
  - Make/Accept offer within chat
- **WebSocket** real-time messaging (not polling)
- **Push notifications** for new messages
- Block/Report user from chat
- Message search within conversation

---

### SCREEN 29 — CHANNELS

**Purpose:** Community/group channels organized by topic or category.

| Role | Behavior |
|------|----------|
| R0 Guest | Browse channels, read-only |
| R1–R3 | Join, post, react |
| R4 Admin | Create official channels, moderate |

**Required Features:**
- **Channels List:** category icon, name, member count, last activity
- **Channel Detail:** feed of posts, member list, description
- **Create Channel:** name, description, category, public/private
- **Join/Leave** channel
- Post in channel (text, image, listing share)
- Roles in channel: Owner / Moderator / Member
- Pinned posts in channel
- Channel search

---

### SCREEN 30 — PUBLIC WALL

**Purpose:** Public social activity feed — platform-wide visible activities and announcements.

| Role | Behavior |
|------|----------|
| R0 Guest | Read-only |
| R1–R3 | Interact (like, comment) |
| R4 Admin | Post announcements |

**Required Features:**
- Platform activity stream (new posts, milestones, trending items)
- Admin announcements at top (pinned)
- Community highlights
- Like + comment
- Share

---

### SCREEN 31 — COMPLAINTS

**Purpose:** File and track complaints about other users, listings, or transactions.

| Role | Behavior |
|------|----------|
| R0 Guest | Auth gate |
| R1–R3 | File complaint, track status |
| R4 Admin | Manage all complaints — respond, resolve, escalate |

**Required Features:**
- **File Complaint Form:**
  - Type: User Complaint / Listing Complaint / Transaction Complaint / Other
  - Subject field
  - Description (500 chars min)
  - Evidence uploads (images/documents)
  - Against: user search / post ID / transaction ID
- **My Complaints List:** each complaint with status (Open / In Review / Resolved / Closed)
- **Complaint Detail:** full thread with admin responses
- **Reply** to admin message in complaint thread
- **Resolve / Close** by admin
- Status push notifications

---

### SCREEN 32 — FEEDBACK

**Purpose:** General product/platform feedback submission.

| Role | Behavior |
|------|----------|
| R0 Guest | Auth gate |
| R1–R3 | Submit feedback |
| R4 Admin | View all feedback, respond |

**Required Features:**
- Category dropdown: Bug Report / Feature Request / General Feedback / UX/Design / Performance
- Subject field
- Description (300 chars min)
- Rating (1–5 stars, optional)
- Submit → `POST /api/feedback` with `{ category, subject, description, rating }`
- Success confirmation with reference number
- View past submissions + admin response

---

### SCREEN 33 — REVIEWS

**Purpose:** User-to-user rating and review system after completed transactions.

| Role | Behavior |
|------|----------|
| R0 Guest | Read-only |
| R1–R3 | Write review after transaction |
| R4 Admin | Moderate reviews |

**Required Features:**
- **Review List** for a user: all reviews received + average rating
- **Write Review Form:** star rating (1–5), title, body, transaction reference
- One review per completed transaction (each direction: buyer reviews seller + seller reviews buyer)
- **Verified Purchase badge** on reviews from real transactions
- Helpful vote on review
- Report review
- Sort reviews: Newest / Most Helpful / Rating High/Low

---

### SCREEN 34 — ACTIVITY HUB

**Purpose:** Consolidated view of all user activity — views, likes, offers, messages, notifications.

| Role | Behavior |
|------|----------|
| R0 Guest | Auth gate |
| R1–R3 | Full activity timeline |

**Required Features:**
- Timeline of all activity grouped by type and date
- Types: "Your post was viewed X times", "Someone added your post to wishlist", "You received a new offer", "Your sale was confirmed"
- Each activity item is tappable → navigates to relevant context
- Filter by type
- Mark all as seen

---

### SCREEN 35 — ANALYTICS (SELLER ANALYTICS)

**Purpose:** Detailed analytics dashboard for seller performance.

| Role | Behavior |
|------|----------|
| R0–R1 | No access (or basic buyer stats) |
| R2/R3 Seller | Own listing analytics |
| R4 Admin | Platform-wide analytics |

**Required Features:**
- **Summary Cards:** Total Views, Total Likes, Total Offers, Conversion Rate, Earnings
- **Charts:** Views over time (line chart), Category breakdown (pie), Top performing listings (bar)
- **Per-listing breakdown:** individual post performance table
- **Date Range Picker:** Last 7 days / 30 days / 90 days / Custom
- **Export data** (CSV)
- Pro plan badge — advanced analytics require paid plan

---

### SCREEN 36 — SETTINGS

**Purpose:** App preferences and account management.

| Role | Behavior |
|------|----------|
| R0 Guest | Theme switch only (no account settings) |
| R1–R3 | Full settings |
| R4 Admin | Full settings + admin preferences |

**Settings Sections:**
- **Account:** Edit Profile, Change Password, Change Phone, Email preferences
- **Notifications:** per-type toggles (sales, messages, rewards, system, marketing)
- **Privacy:** profile visibility, location sharing, activity visibility
- **Security:** 2FA enable/disable, active sessions, login history
- **Appearance:** Theme (Light/Dark/System), Font size, Language/Locale
- **Selling:** Plan info, KYC status shortcut, Payment settings
- **Legal:** Terms, Privacy, Refund Policy, Support Policy
- **Support:** Contact Support, Report a Problem, FAQ
- **About:** App version, Changelog
- **Danger Zone:** Delete Account

---

### SCREEN 37 — SECURITY SETTINGS

**Purpose:** Advanced account security controls.

**Required Features:**
- 2FA setup (TOTP via authenticator app)
- Active sessions list (device name, last seen, revoke session)
- Login history (IP, device, timestamp)
- Password change (current + new + confirm)
- Recovery codes

---

### SCREEN 38 — GET VERIFIED / AADHAAR VERIFY

**Purpose:** Verified seller badge — additional trust layer beyond basic KYC.

**Required Features:**
- Verification tier levels (Email / Phone / ID / Aadhaar / Business)
- Per-tier instructions + requirements
- Current status per tier
- Badge preview (how it appears on profile/listings)

---

### SCREEN 39 — DAILY CODE

**Purpose:** Daily rewards code entry — gamified daily engagement.

**Required Features:**
- Large code entry input
- "Today's code" hint mechanism (from community/admin channels)
- Countdown timer to next day's code (resets midnight)
- Coin reward amount preview
- "Already claimed today" state with countdown
- History of claimed codes

---

### SCREEN 40 — REFERRAL TREE

**Purpose:** Visualize your referral network and earnings.

**Required Features:**
- Tree visualization: you → people you referred → who they referred (3 levels)
- Coin earnings breakdown per level
- Total referral coins earned
- Referral link + QR code to share
- Progress bar toward referral milestone reward
- Leaderboard: top referrers this month

---

### SCREEN 41 — SCANNER (QR / BARCODE)

**Purpose:** Scan product QR codes or user profiles.

**Required Features:**
- Camera viewfinder with scan overlay
- Torch/flashlight toggle
- Auto-detect QR vs barcode
- On success: navigate to PostDetail (product QR) or Profile (user QR)
- Manual entry fallback (type code)
- History of recent scans

---

### SCREEN 42 — ADMIN PANEL

**Purpose:** Platform administration.

| Role | Behavior |
|------|----------|
| R0–R3 | No access — redirect to Home |
| R4 Admin | Full access |

**Required Features:**
- **Dashboard:** DAU/MAU, new signups, new posts, active sales, complaints open, revenue today
- **User Management:** search users, view profile, ban/unban, KYC approve/reject, plan override
- **Content Moderation:** flagged posts queue, approve/remove with reason, bulk moderation
- **Complaints Management:** open complaints list, respond, resolve
- **Announcements:** create/edit/delete platform announcements
- **Rewards Management:** manage daily codes, manual coin adjustments
- **Analytics:** platform-wide charts
- **System Settings:** maintenance mode toggle, feature flags

---

### SCREEN 43 — AUTH SCREENS (Login / Signup / Forgot Password / Reset)

**Login:**
- Email/Phone + Password
- "Forgot Password?" link
- Social login (Google OAuth) — if configured
- Guest Continue option

**Signup:**
- Name, Email/Phone, Password, Confirm Password
- OTP verification (phone)
- Terms acceptance checkbox
- Referral code (optional)

**Forgot Password:**
- Email/Phone input → OTP
- OTP verification
- New Password + Confirm

**Reset Password:**
- Token-based (from email link) OR OTP-based
- New Password strength meter

**All Auth Screens:**
- Real-time validation (no submit-then-show-error)
- Secure password field with visibility toggle
- Loading state during API calls
- Error messages from API (not generic)

---

### SCREEN 44 — LEGAL SCREENS

**Screens:** Terms & Conditions, Privacy Policy, Refund Policy, Support Ticket Policy

**Requirements:**
- Rich formatted text (Markdown rendered)
- Last-updated date visible
- Scroll position remembered on return
- Share / Copy link option
- Accept CTA (where required during onboarding)

---

### SCREEN 45 — INVITE / REFERRAL REDIRECT

**Purpose:** Handle invite links opened from outside the app.

**Required Features:**
- Parse invite code from deep link
- Show inviter's name and benefit ("Join via Laksh's invite — earn 50 coins!")
- CTA: Sign Up (pre-fills referral code) / Continue to App (if already registered)

---

## PART 3 — CROSS-CUTTING REQUIREMENTS (ALL SCREENS)

### 3.1 — Real-Time Updates
- **WebSocket connection** maintained throughout app lifecycle
- Live counters (views, likes, new messages, notifications)
- Sale status updates pushed (not polled)
- New listing appears in AllPosts without pull-to-refresh

### 3.2 — Loading States (No Blank Screens)
Every screen must have:
- **Shimmer skeleton** on first load
- **Spinner overlay** during actions (submit, delete, etc.)
- **Error state** with retry button (not just "Something went wrong")
- **Empty state** with actionable CTA
- **Offline state** — show cached data + offline banner

### 3.3 — Pull-to-Refresh
Every list/feed screen must support pull-to-refresh that:
- Clears pagination state
- Refetches from API (not cache)
- Updates counters and badges

### 3.4 — Pagination
All list screens:
- Infinite scroll with end-of-list indicator
- Page-end loader (circular spinner at bottom)
- No duplicate items on page boundary

### 3.5 — Auth Gate Pattern (Consistent)
All protected actions must:
- Show `LoginPromptCard` overlay (NOT redirect to login screen mid-flow)
- Preserve intended destination after login
- Never show duplicate login prompts

### 3.6 — Dark Mode
All screens must have tested dark mode:
- No white flash on dark mode
- All colors from `MaterialTheme.colorScheme`
- Images with dark-safe placeholders

### 3.7 — Localization
All text via string resources:
- Language switch → full app rebuild
- API content re-fetched with new locale header
- No hardcoded English strings

### 3.8 — Error Handling (Non-Silent)
- API 400/422: show field-level validation errors
- API 401: auto-refresh token, retry once, then show login
- API 403: show "You don't have permission" (not blank)
- API 404: show "Not found" (not crash)
- API 500: show "Server error, please try again" + retry
- Network error: show "Check your connection" + retry

### 3.9 — Performance
- Image loading: Coil with memory/disk cache + blurhash placeholder
- List recycling: LazyColumn with `key` parameters to prevent recomposition bugs
- API debounce for search (300ms)
- No blocking main-thread operations

### 3.10 — Accessibility
- Content descriptions on all icons
- Minimum 44dp tap targets
- Text size respects system font scale
- Color contrast ratios meeting WCAG AA

---

## PART 4 — IMPLEMENTATION PRIORITY ORDER

| Priority | Screen | Why First |
|----------|--------|-----------|
| P0 | Splash + Auth + Routes | Foundation |
| P0 | Home (CategoryHub) | Entry point |
| P0 | AllPosts | Core value |
| P0 | PostDetail | Core value |
| P1 | ForYou | Retention |
| P1 | Feed | Social layer |
| P1 | Profile | Identity |
| P1 | MyHome | Seller management |
| P1 | Create/Edit Post | Revenue |
| P1 | Rewards | Engagement |
| P2 | SaleDone / SaleUndone | Transactions |
| P2 | Chat | Communication |
| P2 | Notifications | Engagement |
| P2 | Wishlist | Retention |
| P2 | Plans / KYC | Monetization |
| P3 | Bought/Sold Posts | Post-transaction |
| P3 | Compare | Discovery |
| P3 | Nearby | Discovery |
| P3 | Saved Searches | Retention |
| P3 | Reviews | Trust |
| P3 | Complaints / Feedback | Support |
| P3 | Channels | Community |
| P4 | Analytics | Seller premium |
| P4 | Admin Panel | Operations |
| P4 | Referral Tree | Growth |
| P4 | Scanner | Power user |
| P4 | Activity Hub | Engagement |
| P4 | Legal / Static | Compliance |

---

## PART 5 — DEFINITION OF "DONE" PER SCREEN

A screen is **NOT complete** unless:

- [ ] All roles render correctly (Guest / Buyer / Seller / KYC Seller / Admin)
- [ ] All API calls use correct camelCase JSON fields (no snake_case @SerialName mismatch)
- [ ] Loading state (shimmer) implemented
- [ ] Empty state implemented with actionable CTA
- [ ] Error state implemented with retry
- [ ] Auth gate correct (no unauthorised access, no false gates)
- [ ] Dark mode tested and passes
- [ ] Pull-to-refresh works
- [ ] Pagination (if list) works without duplicate items
- [ ] Locale switch updates ALL text (labels + API content)
- [ ] Back navigation restores correct state
- [ ] Compile: `BUILD SUCCESSFUL exit 0`
- [ ] No Kotlin/Compose errors in IDE
- [ ] Web app parity confirmed (side-by-side feature check)
