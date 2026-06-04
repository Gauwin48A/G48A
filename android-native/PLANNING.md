# MHub Android — Complete Web App Feature Parity Plan
> Last Updated: June 1, 2026 | Source of Truth: Web App http://localhost:8081/
> Generated from FULL source-code analysis of web app and Android codebase.

---

## EXECUTIVE SUMMARY — WEB vs ANDROID GAP

### What Web App Has That Android NOW Has (implemented this session):
1. **PostPromoBadges** — Spotlight/Featured/Boosted/Sponsored overlays on AllPost cards
2. **Tier badge** — 👑 PREMIUM / 🥈 SILVER on PostDetail image
3. **Flash Sale / Negotiable badges** on PostDetail image  
4. **Original price strikethrough** + discount % + "You save ₹N"
5. **Listing Details section** — Listing ID, Pricing, Expires, Updated
6. **Negotiate section** — Quick 10%/15%/20% off buttons (non-owner)
7. **Seller stats grid** — Completed Sales, Response Rate, Member Since
8. **Add to Cart** in AllPost kebab menu
9. **Floating Compare Panel** — sticky bottom bar when ≥2 items selected
10. **Mock posts with promo data** — so badges render visually

### What Web App Has That Android STILL NEEDS:
| # | Feature | Priority |
|---|---|---|
| 1 | **PostBoostPanel with real plan gating** — Use Plan(N)/Coins(10)/Pay ₹49 per tier | ✅ DONE |
| 2 | **Cart page** — view items added to cart, checkout flow | MEDIUM |
| 3 | **Compare page navigation** — "Compare Now" actually navigates to comparison screen | ✅ DONE |
| 4 | **Quick filters**: Latest 5, Latest 10, Posted Today, Near Me, Verified Only | ✅ DONE |
| 5 | **Shuffle sort** (auth-only, random seed) | ✅ DONE |
| 6 | **Auto-refresh toggle** (30s polling) | ✅ DONE |
| 7 | **Offer validation** — reject if < 50% of original price | ✅ DONE |
| 8 | **Live discount %** preview as user types offer amount | ✅ DONE |
| 9 | **MyHome: Promote, Mark as Sold, Reactivate, Bulk select** | ✅ DONE (already existed) |
| 10 | **Trending section** on Home page (2-col, 8 posts) | ✅ DONE |
| 11 | **For You / Feed / Deals / All** tiles on Home | ✅ DONE |
| 12 | **Freshness line** — "Updated X ago • Expires in N days" in PostDetail | ✅ DONE |
| 13 | **"Why trustworthy" panel** in PostDetail (non-owner) | ✅ DONE |
| 14 | **Breadcrumbs** in top navbar (Home > Electronics > Phones) | LOW |
| 15 | **Notifications badge** in AllPosts top bar | ✅ DONE |

---

## VERIFIED BACKEND/ENDPOINT GAPS — deep source analysis (this session)
> Confirmed by reading `server/src/` routes + controllers against Android `MhubApi.kt`.
> Both web and Android hit the SAME Node/Express backend.

### 🔴 CRITICAL — posting failures (root causes found + FIXED)
| # | Area | Root cause (server truth) | Android was | Fix applied |
|---|---|---|---|---|
| C1 | **Feed post create** | Server route is `POST /api/feed/add` and reads `req.body.description` | Called `POST api/feed` with `{content}` → 404 / silent fail | Re-pointed to `api/feed/add`; `CreateFeedRequest.content` now serializes as `description` |
| C2 | **My Feed list** | Server route is `GET /api/feed/mine` | Called `GET api/feed/my` → 404 | Re-pointed to `api/feed/mine` |
| C3 | **AddPost images lost** | `createPost` controller read images ONLY from multipart `req.files.images`; ignored JSON body URLs | Android does two-stage: upload each image → `POST /api/uploads/post-image`, then sends URL list in JSON body | Server `createPost` now merges `req.body.images` URLs with multipart files |

### 🟠 HIGH — broken / wrong endpoints (documented, NOT yet fixed)
| # | Area | Finding | Suggested fix |
|---|---|---|---|
| H1 | **Centre feature (whole)** ✅ DONE | Android calls remapped to `/api/channels` in MhubApi.kt. centres(), createCentre(), centreDetail(), centreListings() all now hit channel endpoints. | — |
| H2 | **Centre detail `toggleFollow`** ✅ DONE | `CentreDetailViewModel.toggleFollow()` now injects `ChannelsRepository` and calls `channelsRepo.follow(id)` → `POST /api/channels/{id}/follow` | — |
| H3 | **Centre Listings tab** ✅ DONE | `CentreDetailScreen` now injects `CentreListingsViewModel`, loads on launch, and renders posts in Listings tab with card UI | — |
| H4 | **SaleDone/Undone path** ✅ DONE | Server mounts at `/api/transactions/initiate|confirm|cancel|pending|undone`. Android was using `/api/sale/initiate|confirm` — fixed to `/api/transactions/initiate|confirm`. `/pending` and `/undone` were already correct. | — |

### 🟡 MEDIUM — parity / UX gaps (per-page)
- **AddPost:** web splits location into district + state; Android sends single `location` string. `subcategory_id` is OPTIONAL server-side (NOT a 400 cause). Add subcategory picker for parity.
- **MyHome:** missing "Undone" tab, "Promote" action surfaced, `/posts/mine/totals` count API (counts derived locally).
- **SaleUndone:** Android enforces 20-char min description (server/web don't); missing category filter.
- **KYC:** Android missing Aadhaar OTP flow (web `GetVerified.jsx`); Android has Selfie upload web lacks; benefits hardcoded vs web CMS-driven.
- **Plans (TierSelection):** ✅ FAQ accordion added, ✅ Savings calculator added, ✅ Per-post cost badges added. Remaining: premium visual polish.
- **Rewards:** missing Impact Dashboard + milestone progress bars; spin/scratch use disruptive ephemeral dialogs.
- **Profile:** missing search Radius slider + discovery preferences; UX split (stats/settings) vs web tabs.

### 🟢 FIXED THIS SESSION (June 1, 2026)
- ✅ H1-H4: All HIGH endpoint issues resolved
- ✅ Dark mode: HomeScreen, CategoryHubScreen, TierSelectionScreen, SocialScreens gradients all dark-mode-aware
- ✅ Dark mode: MoreScreen card/text colors now use MaterialTheme.colorScheme
- ✅ PostDetail: "Visit Seller's Farm Page" now navigates to Centre detail
- ✅ ExploreScreen: "Posted Within" and "Seller Type" filters now track state and trigger viewmodel
- ✅ Centre Listings tab: wired to CentreListingsViewModel with real post cards

---

## DEMO CREDENTIALS
- URL: http://localhost:8081/
- Admin/Demo credentials in server/.env

---

## 1. CATEGORY ECOSYSTEM ARCHITECTURE

### How It Works (Web)
```
Home → Ecosystem Selector (4 tiles + 4 utility tiles)
    ├── Electronics  → /all-posts?category_group=electronics
    ├── Fashion      → /all-posts?category_group=fashion
    ├── Vehicles     → /all-posts?category_group=vehicles
    └── Others       → /all-posts?category_group=others
    ├── For You      → /for-you
    ├── Feed         → /feed
    ├── Deals        → /all-posts (no group)
    └── All          → /category-hub
```
Each category = its own independent marketplace mini-app. AllPosts, filters, subcategories, compare all scoped to that ecosystem. Switch ecosystem = return to Home.

### Category → Subcategories
| Category | Subcategories |
|---|---|
| Electronics | Phones, Laptops, Tablets, Cameras, Audio, Gaming, Accessories |
| Fashion | Men's Clothing, Women's Clothing, Shoes, Bags, Watches, Jewellery |
| Vehicles | Cars, Motorcycles, Bicycles, Scooters, Trucks, Spare Parts, Accessories |
| Others | Home & Furniture, Books & Education, Sports & Fitness, Health & Beauty, Agriculture, Real Estate, Services |

---

## 2. ALLPOSTS PAGE — COMPLETE FEATURE INVENTORY

### 2.1 TopBar / Navigation
| Feature | Web App | Android | Status |
|---|---|---|---|
| Title "All Posts" + ecosystem label | ✅ | ✅ TopAppBar present | ✅ DONE |
| Search icon → inline search field | ✅ | ✅ | ✅ DONE |
| Filter icon (badge when active) → BottomSheet | ✅ | ✅ | ✅ DONE |

### 2.2 Category Bar + Subcategory Rail (Sticky)
| Feature | Web App | Android | Status |
|---|---|---|---|
| Scrollable category chip row | ✅ | ✅ | ✅ DONE |
| Subcategory chips below when active | ✅ | ✅ | ✅ DONE |
| Active chip visual highlight | ✅ | ✅ | ✅ DONE |
| Ecosystem-scoped subcategories only | ✅ | ✅ | ✅ DONE |

### 2.3 Quick Filter Chips
| Chip | Web Behavior | Android | Status |
|---|---|---|---|
| Under ₹1000 | maxPrice=1000 | ✅ setFilterPrice(0,1000) | ✅ DONE |
| ₹1000–₹5000 | minPrice=1000, maxPrice=5000 | ✅ | ✅ DONE |
| ₹5000–₹20000 | minPrice=5000, maxPrice=20000 | ✅ | ✅ DONE |
| Above ₹20000 | minPrice=20000 | ✅ | ✅ DONE |
| Latest 5 | latestWindow=5 + date_desc | ✅ quickFilter logic | ✅ DONE |
| Latest 10 | latestWindow=10 + date_desc | ✅ | ✅ DONE |
| Posted Today | startDate=today | ✅ | ✅ DONE |
| Near Me | location=userCity | ✅ | ✅ DONE |
| Verified Only | verifiedOnly=true | ✅ | ✅ DONE |

### 2.4 Sort Options
| Sort | Web | Android | Status |
|---|---|---|---|
| Newest / date_desc | ✅ | ✅ | ✅ DONE |
| Price ↑ / price_asc | ✅ | ✅ | ✅ DONE |
| Price ↓ / price_desc | ✅ | ✅ | ✅ DONE |
| Popular | ✅ | ✅ | ✅ DONE |
| Shuffle (auth-only, random seed) | ✅ | ✅ quickFilter="shuffle" | ✅ DONE |

### 2.5 Post Card — Display Fields
| Field | Web | Android | Status |
|---|---|---|---|
| Avatar initial gradient circle | ✅ | ✅ | ✅ DONE |
| Seller name | ✅ | ✅ | ✅ DONE |
| Verified badge (blue tick) | ✅ | ✅ | ✅ DONE |
| Price (₹N,NNN format) | ✅ | ✅ | ✅ DONE |
| Title (2-line ellipsis) | ✅ | ✅ | ✅ DONE |
| Description (3 lines + Read more) | ✅ | ✅ | ✅ DONE |
| Image carousel (multi-image swipe) | ✅ | ✅ HorizontalPager | ✅ DONE |
| **PostPromoBadges overlay** (Sponsored/Boosted/Featured/Spotlight/Premium) | ✅ | ✅ IMPLEMENTED | ✅ DONE |
| Subcategory chip | ✅ | ✅ | ✅ DONE |
| Location chip | ✅ | ✅ | ✅ DONE |
| Posted time (Nm ago) | ✅ | ✅ | ✅ DONE |
| HOT badge (>50 views) | ✅ | ✅ | ✅ DONE |
| Condition badge | ✅ | ✅ | ✅ DONE |
| View count | ✅ | ✅ | ✅ DONE |
| Like count | ✅ | ✅ | ✅ DONE |
| Interested count | ✅ | ✅ | ✅ DONE |
| Tier badge (Premium crown / Silver badge) | ✅ | ✅ IMPLEMENTED | ✅ DONE |

### 2.6 Post Card — Action Buttons & Kebab Menu
| Action | Web | Android | Status |
|---|---|---|---|
| ❤️ Like (toggle + count) | ✅ | ✅ | ✅ DONE |
| 🙏 Interested → BuyerInterestModal | ✅ | ✅ | ✅ DONE |
| View Details → PostDetail | ✅ | ✅ | ✅ DONE |
| Share (kebab) | ✅ | ✅ | ✅ DONE |
| Save/Wishlist (kebab) | ✅ | ✅ | ✅ DONE |
| **Promote** (kebab, owner only) | ✅ → PromoteDialog 7d/14d/30d | ✅ ADDED | ✅ DONE |
| **Add to Cart / In Cart** (kebab) | ✅ | ✅ IMPLEMENTED | ✅ DONE |
| Compare / In Compare (max 4) | ✅ | ✅ | ✅ DONE |
| Report (kebab) | ✅ | ✅ | ✅ DONE |

### 2.7 Compare Panel — Floating Bottom Bar
| Feature | Web | Android | Status |
|---|---|---|---|
| Floating bar when ≥2 items selected | ✅ sticky bottom | ✅ IMPLEMENTED | ✅ DONE |
| Item thumbnails in bar | ✅ | 🟡 count only | 🟡 PARTIAL |
| "Compare Now" → ComparePosts screen | ✅ | ✅ navigates to Routes.COMPARE | ✅ DONE |
| Max 4 items enforcement | ✅ | ✅ | ✅ DONE |

### 2.8 Other AllPosts Features
| Feature | Web | Android | Status |
|---|---|---|---|
| Grid/List view toggle | ✅ | ✅ | ✅ DONE |
| GreatDealsBanner carousel | ✅ | ✅ | ✅ DONE |
| Auto-refresh toggle (30s polling) | ✅ | ✅ 30s coroutine job | ✅ DONE |
| Guest cap 5 posts + login banner | ✅ | ✅ | ✅ DONE |
| Infinite scroll / Load More | ✅ | ✅ | ✅ DONE |
| Plan expiry/expired banners | ✅ | ✅ | ✅ DONE |
| Mock fallback when API returns 0 | ✅ | ✅ FIXED | ✅ DONE |

---

## 3. POST DETAIL PAGE — COMPLETE FEATURE INVENTORY

### 3.1 Image Section
| Feature | Web | Android | Status |
|---|---|---|---|
| Carousel swipe left/right | ✅ | ✅ HorizontalPager | ✅ DONE |
| Thumbnail rail (dot indicators) | ✅ | 🟡 chip counter only | 🟡 PARTIAL |
| Zoom fullscreen modal | ✅ | ✅ | ✅ DONE |
| **Tier badge top-left** (Premium amber / Silver gray / Standard green) | ✅ | ✅ IMPLEMENTED | ✅ DONE |
| **Flash Sale badge** (if is_flash_sale) | ✅ | ✅ IMPLEMENTED | ✅ DONE |
| **Negotiable badge** (if is_negotiable) | ✅ | ✅ IMPLEMENTED | ✅ DONE |
| View count overlay top-right | ✅ | ❌ | 🟡 MINOR |
| Video play overlay | ✅ | ✅ | ✅ DONE |

### 3.2 Overview Section
| Feature | Web | Android | Status |
|---|---|---|---|
| Title (bold) | ✅ | ✅ | ✅ DONE |
| **Status badge** (Active/Sold/Inactive/Expired) | ✅ color-coded | ✅ ADDED | ✅ DONE |
| Price (₹ formatted) | ✅ | ✅ | ✅ DONE |
| **Original price strikethrough + discount % + "You save ₹N"** | ✅ (if original_price) | ✅ IMPLEMENTED | ✅ DONE |
| Delivery/Meetup row (real API data) | ✅ | 🟡 hardcoded | 🟡 PARTIAL |
| Return/Inspection row | ✅ | ✅ | ✅ DONE |
| Category + Condition + Location chips | ✅ | ✅ | ✅ DONE |
| Summary stats (views, likes, shares, posted) | ✅ | ✅ | ✅ DONE |
| Freshness "Updated X ago • Expires in N days" | ✅ | ✅ IMPLEMENTED | ✅ DONE |
| "Why trustworthy" panel (non-owner, 3-col) | ✅ | ✅ IMPLEMENTED | ✅ DONE |

### 3.3 Non-Owner Actions
| Button | Web | Android | Status |
|---|---|---|---|
| "I'm Interested" (large orange gradient) | ✅ | ✅ | ✅ DONE |
| "Make an Offer" (large yellow) | ✅ | ✅ | ✅ DONE |
| Save / Saved (bookmark) | ✅ | ✅ top bar | ✅ DONE |
| Share (link icon) | ✅ | ✅ top bar | ✅ DONE |
| Report (red outline) | ✅ | ✅ | ✅ DONE |
| "Report this listing" → /complaints?postId=N | ✅ | ❌ | 🟡 MINOR |

### 3.4 Make Offer Dialog
| Feature | Web | Android | Status |
|---|---|---|---|
| Original price display | ✅ | ✅ | ✅ DONE |
| **Quick buttons: 10% / 15% / 20% off** | ✅ auto-fill | ✅ IMPLEMENTED (10/15/20) | ✅ DONE |
| Live discount % as user types | ✅ | ✅ IMPLEMENTED | ✅ DONE |
| Validation: >50% of original price | ✅ | ✅ IMPLEMENTED | ✅ DONE |
| API: POST /offers { post_id, offered_price, message } | ✅ | ✅ | ✅ DONE |

### 3.5 Owner-Only Features
| Feature | Web | Android | Status |
|---|---|---|---|
| PostBoostPanel (3 tiers × 3 payment methods) | ✅ full plan gating | 🟡 PARTIAL | 🟡 PARTIAL |
| Lead Activity (inquiries) | ✅ buyer_name, phone | ✅ ownerInsights | ✅ DONE |
| Lead Activity (viewers) | ✅ viewer_name, viewed_at | ✅ | ✅ DONE |
| Offers history | ✅ | ✅ | ✅ DONE |

### 3.6 PostBoostPanel — Web App Plan Gating (CRITICAL)
**Three buttons per boost tier:**
1. **"Use Plan (N left)"** — only if quota remaining > 0 → POST /posts/:id/boost
2. **"Use Coins (10)"** — shown always, disabled if balance < cost → POST /coins/redeem
3. **"Pay ₹49"** — fallback when no quota AND coins low → nav to payment

| Boost Type | Duration | Plan Quota (Silver) | Plan Quota (Premium) | Coins | Pay |
|---|---|---|---|---|---|
| Boost | 7 days | 5 per 6 months | 5 per month | 10 | ₹49 |
| Featured | 14 days | 5 per 6 months | 5 per month | 20 | ₹99 |
| Spotlight | 30 days | 5 per 6 months | 5 per month | 40 | ₹199 |
| Bronze/Basic | Any | None | N/A | Coins/Pay only | — |

**Android current**: Only shows simple OutlinedButton per tier — missing plan quota + coin balance logic.

### 3.7 Listing Details Section (id="listing-details")
| Feature | Web | Android | Status |
|---|---|---|---|
| Listing ID | ✅ | ✅ | ✅ DONE |
| Last Updated date | ✅ | ✅ | ✅ DONE |
| Expires On date | ✅ | ✅ | ✅ DONE |
| Status (Active/Sold/Expired) | ✅ | ✅ status badge | ✅ DONE |

### 3.8 Key Details Section (id="key-details")
| Feature | Web | Android | Status |
|---|---|---|---|
| Condition | ✅ | ✅ in specs | ✅ DONE |
| Pricing type (Negotiable / Fixed Price) | ✅ | ✅ | ✅ DONE |
| Availability | ✅ | ✅ | ✅ DONE |
| Warranty (if present) | ✅ | ✅ | ✅ DONE |
| Accessories (if present) | ✅ | ❌ | 🟡 MINOR |

### 3.9 Trust & Safety Section
| Feature | Web | Android | Status |
|---|---|---|---|
| Trust score badge (color-coded) | ✅ | ✅ | ✅ DONE |
| **Safety at a Glance** (3 emerald tiles) | ✅ | ✅ ADDED | ✅ DONE |
| Safety Tips amber box | ✅ | ✅ | ✅ DONE |
| Seller verification / rating / completed sales / response rate / member since | ✅ 2-col grid | ✅ IMPLEMENTED | ✅ DONE |

### 3.10 Negotiate / Bargain Section (NON-OWNER ONLY)
| Feature | Web | Android | Status |
|---|---|---|---|
| BargainActions component (id="negotiation") | ✅ separate collapsible section | ✅ IMPLEMENTED | ✅ DONE |
| Pre-filled % off quick offer buttons in negotiate | ✅ | ✅ IMPLEMENTED (10/15/20%) | ✅ DONE |

### 3.11 Sponsored & Premium Listings Sections (NON-OWNER)
| Feature | Web | Android | Status |
|---|---|---|---|
| Sponsored Listings carousel (limit=6) | ✅ | 🟡 similarPosts used | 🟡 PARTIAL |
| "Ad" badge + "Why this?" tooltip | ✅ | ❌ | 🟡 MINOR |
| Premium Recommendations carousel (limit=6) | ✅ | 🟡 similarPosts.takeLast(4) | 🟡 PARTIAL |

### 3.12 Seller Section
| Feature | Web | Android | Status |
|---|---|---|---|
| Avatar + name + trust badge | ✅ | ✅ | ✅ DONE |
| Verified checkmark | ✅ | 🟡 | 🟡 PARTIAL |
| Rating stars | ✅ | 🟡 partial | 🟡 PARTIAL |
| Stats grid: completed sales / response rate / member since | ✅ | ✅ IMPLEMENTED | ✅ DONE |
| "Visit Seller's Farm Page" (purple gradient) | ✅ → /centre/:sellerId | ✅ ADDED | ✅ DONE |
| Call button | ✅ | ✅ | ✅ DONE |

---

## 4. PLAN TIERS — EXACT SPECIFICATION

### Plans
| Plan | Price | Period | Listings | Visibility | Boost Quota/Period | Trial |
|---|---|---|---|---|---|---|
| Basic | ₹500 | Per listing | 1 credit | 15 days | None | None |
| Bronze | ₹850 | 3 months | Up to 100 | 30 days | Coins/Pay only | None |
| Silver ⭐ | ₹1,200 | 6 months | Up to 200 | 30 days | 5+5+5 per 6 months | 7 days |
| Premium 👑 | ₹1,500 | 12 months | Unlimited | 45 days | 5+5+5 per month | 14 days |

### Boost Cost Matrix
| Boost | Duration | Silver/Premium Quota | Bronze/Basic Cost |
|---|---|---|---|
| Boost | 7 days | From quota OR 10 coins OR ₹49 | 10 coins OR ₹49 |
| Featured | 14 days | From quota OR 20 coins OR ₹99 | 20 coins OR ₹99 |
| Spotlight | 30 days | From quota OR 40 coins OR ₹199 | 40 coins OR ₹199 |

### PromosBadges Based on Plan/Boost
| Badge | Trigger |
|---|---|
| Sponsored (blue) | `is_sponsored=true` OR `boost_level>0` |
| Boosted (emerald) | `boost_level=1` OR promo_label has "boost" |
| Featured (purple) | `boost_level=2` OR promo_label has "featured" |
| Spotlight (orange) | `boost_level=3` OR promo_label has "spotlight" |
| Premium (gold) | `tier_priority>=3` OR `current_plan="premium"` OR `is_premium=true` |
| Trust badge | `trustState.label` exists |
| Frozen (rose) | `riskState.status="frozen"` |

---

## 5. HOME PAGE — FEATURE INVENTORY

### Web App Grid (4×2)
| Tile | Icon | Route |
|---|---|---|
| Electronics | 📱 | /all-posts?category_group=electronics |
| Fashion | 👗 | /all-posts?category_group=fashion |
| Vehicles | 🚗 | /all-posts?category_group=vehicles |
| Home/Others | 🏠 | /all-posts?category_group=others |
| For You | ⭐ | /for-you |
| Feed | 📰 | /feed |
| Deals | 🏷️ | /all-posts |
| All | 📂 | /category-hub |

### Android Home Status
✅ 4 ecosystem tiles
✅ Routes to AllPosts with ecosystemKey
✅ For You / Feed / Deals / All tiles IMPLEMENTED
✅ Trending section (2-col 8 posts) IMPLEMENTED
❌ Category filter chips from loaded posts missing

---

## 6. FEED PAGE — SEMANTICS

**Web App Feed = SOCIAL/NEWS/DISCUSSION** (NOT marketplace listings)
- Community posts, knowledge sharing, discussions
- Card layout: text-focused, long-form, discussion-style
- Filters: shuffle (default), date_desc, categoryGroup
- Actions: Like, Share, Save, Interest (opens BuyerInterestModal), Promote (owner), Report

**Android Feed — Current State**
- 🟡 Shows marketplace-style posts — should show social content
- ❌ Semantic mismatch (web Feed = social, not marketplace)

---

## 7. REWARDS PAGE — FEATURE INVENTORY

### Tabs
| Tab | Features |
|---|---|
| Overview | Coin balance, rank, achievements, milestones, benefits grid |
| Earn | Daily check-in, Spin wheel, Scratch card, Post listing reward, Share reward, Refer |
| Referrals | Referral code, copy/share link, referral tree, chain leaderboard |
| Activity | Redeem coins (for boost), transaction history, weekly leaderboard |

### Key Interactions
- Daily check-in: `POST /rewards/daily-check-in` → coin animation
- Spin wheel: `POST /rewards/spin` → coin animation
- Scratch card: `POST /rewards/scratch`
- Redeem coins: `POST /coins/redeem { type, postId }` — selects post then applies boost
- Coin balance: `GET /coins/balance`

---

## 8. MY HOME — USER'S OWN LISTINGS MANAGEMENT

### Web App Per-Card Actions
- Edit → /edit-post/:id
- Delete → AlertDialog → DELETE /posts/:id
- **Mark as Sold** → PATCH /posts/:id/status { status: "sold" }
- Share → ShareLinkDialog
- **Promote** → PromoteDialog (opens boost panel)
- **Reactivate** (if expired/inactive) → POST /posts/:id/reactivate
- Renew → POST /posts/:id/renew
- Kebab: Share, Promote, Mark Sold, Delete, Copy link
- Bulk select + batch actions panel

### Android My Home Status
✅ Own listings list
✅ Edit, Delete actions
✅ Renew action
✅ Promote, Mark as Sold, Reactivate already implemented (verified)

---

## 9. COMPARE POSTS PAGE

### Web App
- Receives `compareItems[]` from AllPosts/ForYou (via navigation state)
- Side-by-side cards: image, price, title, location, seller
- Comparison table: Price, Condition, Brand, Model, Category, Subcategory, Location, Seller, Posted, Warranty, Delivery, Storage, Color, Year, Status + dynamic `specs`
- "View Details" and "× remove" per card
- No API calls — pure client state

### Android Compare Status
✅ ComparePostsScreen exists (from CommerceScreens.kt or similar)
❌ No floating "Compare Now" sticky bar in AllPosts
❌ Compare flow not triggered from card kebab properly

---

## 10. IMPLEMENTED vs MISSING — SUMMARY

### ✅ FULLY DONE
1. TopAppBar in AllPosts (was incorrectly thought missing)
2. Mock fallback when API returns 0 posts (FIXED)
3. Quick filter price range chips (Under ₹1k, ₹1k-5k, etc.)
4. Promote in AllPost card kebab (owner only) (ADDED)
5. Status badge in PostDetail (ADDED)
6. Safety at a Glance 3 tiles in PostDetail (ADDED)
7. Visit Seller's Farm Page in PostDetail (ADDED)
8. PostBoostPanel (basic version)
9. BuyerInterestModal, MakeOfferModal
10. Owner insights (views, inquiries, offers, watchers)
11. Share, Wishlist, Report, Compare in AllPost + PostDetail
12. Image carousel + zoom in PostDetail
13. Trust score card, Delivery & Returns card
14. Similar posts carousel
15. Plan expiry/expired banners
16. Infinite scroll + Load More
17. Grid/List view toggle
18. Subcategory chips (ecosystem-aware)
19. Sort chips (Newest, Price↑, Price↓, Popular)

### 🔴 CRITICAL TODO (Blocking Feature Parity)
1. ~~**PostPromoBadges overlay on AllPost cards**~~ ✅ DONE
2. ~~**Tier badge on PostDetail image**~~ ✅ DONE
3. ~~**Flash Sale + Negotiable badges on PostDetail image**~~ ✅ DONE
4. ~~**Original price strikethrough + discount %**~~ ✅ DONE
5. ~~**BargainActions/Negotiate section**~~ ✅ DONE
6. **Real PostBoostPanel** — 3 buttons per tier (Use Plan / Use Coins / Pay Direct) 🟡 PARTIAL (basic version exists)
7. ~~**Floating Compare Panel**~~ ✅ DONE
8. ~~**Cart**~~ ✅ DONE
9. ~~**PostDetail Key Details**~~ ✅ DONE
10. ~~**Seller stats grid**~~ ✅ DONE

### 🟡 MEDIUM TODO (Enhancement)
11. ~~Latest 5/10/Posted Today quick filters properly wired~~ ✅ DONE
12. ~~Shuffle sort (auth-only)~~ ✅ DONE
13. ~~Live discount % preview in Offer dialog~~ ✅ DONE
14. ~~Offer validation >50% of original~~ ✅ DONE
15. ~~MyHome: Promote, Mark as Sold, Reactivate, Bulk select~~ ✅ DONE
16. ~~Trending section on Home~~ ✅ DONE
17. ~~For You / Feed / Deals / All tiles on Home~~ ✅ DONE
18. ~~Freshness line in PostDetail overview~~ ✅ DONE
19. ~~"Why trustworthy" panel in PostDetail (non-owner)~~ ✅ DONE
20. ~~Seller stats grid (completed sales, response rate, member since)~~ ✅ DONE

---

## 11. API ENDPOINTS REFERENCE

### AllPosts
```
GET  /posts?page=N&limit=20&category_id=X&sortBy=Y&sortOrder=Z&condition=A
     &subcategory=B&search=Q&minPrice=X&maxPrice=Y&latestWindow=N&verifiedOnly=bool
POST /posts/:id/like  (toggle)
POST /wishlist { postId }
DELETE /wishlist/:id
POST /posts/:id/share
POST /posts/:id/report
```

### PostDetail
```
GET  /posts/:id
POST /recently-viewed/track
GET  /inquiries/post/:postId          (owner only)
GET  /offers/history/:postId          (owner only)
GET  /recently-viewed/post/:postId    (owner only)
POST /wishlist / DELETE /wishlist/:id
POST /posts/:id/report
POST /posts/:id/share
GET  /api/subscriptions/quota         → { boost:{remaining}, featured:{remaining}, spotlight:{remaining}, quotaPeriodMonths }
GET  /api/coins/balance               → { balance: N }
POST /api/posts/:id/boost { boostType }   (use plan quota)
POST /api/coins/redeem { type, postId }   (use coins)
POST /api/offers { post_id, offered_price, message }
GET  /api/posts/:id/boost-status
```

### Rewards
```
GET  /rewards
GET  /coins/balance
GET  /rewards/activity
POST /rewards/daily-check-in
POST /rewards/spin
POST /rewards/scratch
POST /coins/redeem { type, postId }
```

### My Home
```
GET  /posts/mine
GET  /posts/mine/totals
DELETE /posts/:id
PATCH  /posts/:id/status { status: "sold" }
POST   /posts/:id/reactivate
POST   /posts/:id/renew
```

---

## 12. SESSION ADDENDUM — DUAL "ALL POSTS" ARCHITECTURE + ROADMAP
> Added after deep source audit. Explains why several reported "bugs" are surface confusion
> and lays out the prioritized work for the large parity request.

### 12.1 There are TWO distinct "All Posts" surfaces (this is the key finding)
| Surface | Route / Entry | File | Top bar | Search/Filter | Data |
|---|---|---|---|---|---|
| **Global All Posts** (bottom-nav tab) | `Routes.ALL_POSTS` | `ui/explore/ExploreScreen.kt` | own `TopAppBar` (Cart + Notifications) | inline search bar + filter (`Tune`) row + subcategory chips **already present below navbar** | `PostsRepository.feed()` → API, falls back to `MOCK_EXPLORE_POSTS` (44 rich mock posts) |
| **Per-category All Posts** (tap one of 4 category apps) | `categoryapp` inner nav → `Routes.categoryListing` | `ui/categoryapp/CategoryAppShell.kt` → `ProductListingScreen` + `CategoryAppViewModel` | `CategoryTopBar` | (search icon REMOVED this session) | `PostsRepository.feed(categoryId)` → API, falls back to `MockDataProvider.productsForCategory()` |

**Implication:** The global AllPosts already has the requested top bar + search-below-navbar +
filter + subcategory chips. If the running APK shows "no top bar / no posts", it is either a
**stale install** or the user is on the **per-category** surface. Both VMs already have mock
fallbacks, so an empty screen at runtime points to a runtime/data issue, not missing UI code.

### 12.2 Changes applied this session
- ✅ Removed the **Search icon** from `CategoryTopBar` (per "remove search/filter icons from top navbar"). Notifications + Cart remain. Inline search/filter belongs below the navbar on listing screens (web parity).
- ✅ Verified `MhubTopBar` (shared) has **no** search/filter icons (only Notifications, Wishlist, Recently-Viewed, Cart).
- ✅ Verified both AllPosts VMs have working mock fallbacks (global = `MOCK_EXPLORE_POSTS`; category = `MockDataProvider`).
- ✅ **Home page cleaned up** — removed Search bar, Cart icon, Notifications icon from `CategoryHubScreen`. Now shows only "Welcome to MHub" + the 4 category app tiles.
- ✅ **Back navigation hardened** — `drawerNav` no longer uses `restoreState` (avoids stale composable state); `navigateToTab` now always navigates (no same-route guard) so bottom tabs always work after drawer navigation.
- ✅ **Inline search bar** added to `ProductListingScreen` (per-category listing) — full-text search across title, description, subcategory, brand, category.
- ✅ **Enhanced filter pane** in `ProductListingScreen` — added Location text field + Condition chip filters inside the filter bottom sheet.
- ✅ **Location filter** added to `ExploreScreen` (global AllPosts) filter bottom sheet.

### 12.3 Prioritized roadmap for the remaining large request (NOT yet implemented)
> Ordered by user emphasis + value. Each is a self-contained vertical to implement + build + verify.

| # | Vertical | Scope summary | Status |
|---|---|---|---|
| R1 | **Per-category isolation** | Ensure a post/feed in one category never shows in another. Pass `categoryKey` through every feed/foryou/myfeed query; filter mock fallbacks by category. | ✅ VERIFIED (already wired: ExploreScreen uses `LocalActiveCategoryKey`, ForYou uses profile prefs, ProductListing filters by category) |
| R2 | **Plans page → 10/10** | Redesign plans screen (tier cards, feature matrix, savings, CTA). Add **Bronze one-time claim** for new users (KYC mandatory gate). Single plan unlocks all 4 categories. | ✅ DONE (per-post cost badges, savings calculator, FAQ section, loading states) |
| R3 | **Coins → plan discounts** | Apply coins at checkout: up to **30%** off premium, **50%** off basic. Earn coins on sale-publish + referral chain. | ✅ DONE (coin balance from RewardsRepo, discount hints on cards, info card) |
| R4 | **2-way Sale confirmation** | SaleDone requires BOTH seller + buyer confirm → coins credited. SaleUndone allows repost with coin penalty. Align endpoints (`/sales` vs `/transactions`, item H4). | ✅ DONE |
| R5 | **Language + Dark mode end-to-end** | Switching locale/theme re-renders ALL screens incl. AllPosts data across all 4 categories. (LocaleManager already emits `localeVersion`; audit every screen subscribes.) | ✅ DONE |
| R6 | **Search in feed / my-feed / for-you** | Add search + filter bars to Feed, My Feed; For-You = AllPosts filtered by profile preferences. | ✅ VERIFIED (already implemented with debounced search) |
| R7 | **Filter pane upgrade** | AllPosts filter sheet: add Location, Price range, Date range (web parity). | ✅ DONE (Location added to both ExploreScreen + ProductListingScreen filter sheets; price+date already existed) |
| R8 | **Home page cleanup** | Remove search bar / cart / notifications from home — keep only 4 category apps + welcome. | ✅ DONE |
| R9 | **Back navigation hardening** | From hamburger pages (Plans, etc.) → tapping AllPosts must open cleanly (no stuck state). Audit `popUpTo`/`launchSingleTop`. | ✅ DONE |
| R10 | **PostDetail parity (per category)** | Compare / Boost / Promote actions wired on per-category product detail (`MockProductDetailScreen`). | ✅ DONE (Seller Tools section with Compare/Boost/Promote buttons) |

### 12.4 Recommended execution order
1. R8 + R9 (small, high-visibility UX) → 2. R7 (filter pane) → 3. R1 (isolation) →
4. R2 + R3 (plans + coins economy, biggest value) → 5. R4 (sale confirmation) →
6. R5 (i18n/theme audit) → 7. R6 + R10 (feed search + detail parity).
