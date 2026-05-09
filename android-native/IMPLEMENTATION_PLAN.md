# Android E-Commerce App — Full Implementation Plan

## Date: May 9, 2026

---

## 1. PROJECT CONTEXT

**Repository**: `Chandu-y/Mhub` — Branch: `Dev_Kotlin`  
**Android Project**: `/android-native/`  
**Web App**: React 18 + Vite + TailwindCSS + shadcn/ui at `http://localhost:8081/`  
**Tech Stack**: Kotlin, Jetpack Compose, Hilt, Room, Retrofit, Coil, Material 3  

### Current State Summary

The Android app has ~35-40% feature parity with the web app. The infrastructure (Hilt DI, Room DB, Retrofit networking, Material 3 theme, authentication, navigation) is production-ready. However, **the app treats the Home Screen as a standard product feed** — not as a **launcher for 4 category mini-apps** as the user requires. Most commerce, social, and engagement screens are scaffolds or stubs with limited data integration.

---

## 2. ARCHITECTURE GAP — CRITICAL

### What the Web App Does
The web app has `category-hub` as the home route, showing a grid of category "apps" (Electronics, Fashion, Grocery, Furniture). Clicking a category enters a scoped experience with its own navigation, subcategories, product listings, and features.

### What the Android App Does Now
- `CategoryHubScreen` exists and shows categories as a grid — **but it navigates to a filtered `HomeScreen`**, not an independent category app shell.
- The bottom nav is always visible (5 tabs: Home, ForYou, Feed, Rewards, Profile/More).
- There is no per-category navigation graph, top bar customization, or subcategory browsing.

### What Needs to Change
| Aspect | Current | Target |
|--------|---------|--------|
| Home/Launcher | Product feed with bottom nav | 4 category cards, NO bottom nav |
| Category Entry | Filter on `HomeScreen` | Independent category app shell |
| Bottom Nav | Always visible (5 tabs) | Only inside category apps |
| Top Bar | Generic `MhubTopBar` | Per-category: title, search, cart badge, back button |
| Navigation | Single flat nav graph | Launcher graph + 4 category nav graphs |
| Subcategories | Not implemented | Full subcategory grid/chips per category |

---

## 3. WEB vs ANDROID — FULL GAP ANALYSIS

### Legend
- ✅ = Complete and functional
- ⚠️ = Partial/scaffold (UI exists, logic incomplete)
- ❌ = Missing entirely

### 3.1 Navigation & App Shell

| Feature | Web | Android | Gap |
|---------|-----|---------|-----|
| Category launcher (home = 4 app cards) | ✅ | ⚠️ Grid exists but acts as filter, not app launcher | **CRITICAL** |
| No bottom nav on launcher | ✅ | ❌ Bottom nav always present | **CRITICAL** |
| Per-category bottom nav (Home/Categories/Cart/Wishlist/Profile) | ✅ | ❌ | **CRITICAL** |
| Per-category top app bar (title, search, cart badge, back) | ✅ | ❌ Generic top bar | **HIGH** |
| Per-category independent nav graph | ✅ | ❌ | **CRITICAL** |
| Side drawer / hamburger menu | ✅ | ❌ | **MEDIUM** |
| Animated transition on card tap | ✅ | ❌ | **LOW** |

### 3.2 Category Home Page (per category — 4 pages needed)

| Feature | Web | Android | Gap |
|---------|-----|---------|-----|
| Hero banner carousel (auto-scroll + indicators) | ✅ | ❌ | **HIGH** |
| Subcategory horizontal scroll chips | ✅ | ❌ | **HIGH** |
| Featured products grid section | ✅ | ❌ (HomeScreen has a grid but not per-category featured) | **HIGH** |
| Deals of the day with countdown timer | ✅ | ❌ | **MEDIUM** |
| Trending products carousel | ✅ | ❌ | **MEDIUM** |
| Promotional mid-page banners | ✅ | ❌ | **MEDIUM** |
| New arrivals section | ✅ | ❌ | **MEDIUM** |
| Brand spotlight | ✅ | ❌ | **LOW** |
| Pull-to-refresh | ✅ | ✅ HomeScreen has it | Extend to category homes |
| Shimmer loading skeleton | ✅ | ✅ HomeScreen has it | Extend to category homes |

### 3.3 Subcategory Page

| Feature | Web | Android | Gap |
|---------|-----|---------|-----|
| Subcategory grid with images | ✅ | ❌ | **HIGH** |
| Subcategory banner at top | ✅ | ❌ | **HIGH** |
| Breadcrumb navigation | ✅ | ❌ | **MEDIUM** |
| Item count per subcategory | ✅ | ❌ | **MEDIUM** |

### 3.4 Product Listing Page (PLP)

| Feature | Web | Android | Gap |
|---------|-----|---------|-----|
| Product cards grid | ✅ | ✅ | — |
| Grid/list view toggle | ✅ | ✅ | — |
| Filter drawer (bottom sheet) | ✅ | ✅ (partial — missing brand, availability) | **MEDIUM** |
| Sort dropdown (6 options) | ✅ | ✅ (4 options) | **LOW** |
| Quick Add to Cart on card | ✅ | ❌ | **HIGH** |
| Wishlist heart icon on card | ✅ | ⚠️ In some screens | **MEDIUM** |
| Product count ("Showing X of Y") | ✅ | ❌ | **LOW** |
| Infinite scroll / pagination | ✅ | ✅ | — |
| Active filter chips (removable) | ✅ | ❌ | **MEDIUM** |
| No results state | ✅ | ✅ | — |
| Loading shimmer | ✅ | ✅ | — |

### 3.5 Product Detail Page (PDP)

| Feature | Web | Android | Gap |
|---------|-----|---------|-----|
| Image gallery carousel | ✅ | ✅ (HorizontalPager) | — |
| Pinch-to-zoom | ✅ | ❌ | **MEDIUM** |
| Price: original + sale + discount % | ✅ | ⚠️ Single price only | **MEDIUM** |
| Rating stars + review count | ✅ | ⚠️ Review section partial | **MEDIUM** |
| Color variant selector (swatches) | ✅ | ❌ | **HIGH** |
| Size variant selector | ✅ | ❌ | **HIGH** |
| Quantity selector (+/-) | ✅ | ❌ | **MEDIUM** |
| Add to Cart button | ✅ | ✅ | — |
| Add to Wishlist button | ✅ | ✅ | — |
| Buy Now button | ✅ | ❌ | **MEDIUM** |
| Expandable product description | ✅ | ⚠️ Full text shown, no expand/collapse | **LOW** |
| Specifications table (key-value) | ✅ | ❌ | **MEDIUM** |
| Customer reviews list | ✅ | ⚠️ Scaffold | **HIGH** |
| Write a Review form | ✅ | ❌ | **HIGH** |
| Related products carousel | ✅ | ⚠️ Similar products partial | **MEDIUM** |
| Share button (Android share sheet) | ✅ | ✅ | — |
| Delivery info, return policy | ✅ | ❌ | **MEDIUM** |
| Stock status | ✅ | ❌ | **LOW** |
| Save to recently viewed (Room DB) | ✅ | ⚠️ API call exists, Room not used for this | **MEDIUM** |

### 3.6 Cart Page

| Feature | Web | Android | Gap |
|---------|-----|---------|-----|
| Cart items list | ✅ | ✅ | — |
| Quantity selector per item | ✅ | ✅ | — |
| Swipe-to-remove with undo snackbar | ✅ | ❌ | **MEDIUM** |
| Price summary (subtotal/tax/shipping/discount/total) | ✅ | ✅ | — |
| Coupon/promo code input | ✅ | ✅ (partial integration) | **LOW** |
| Proceed to Checkout button | ✅ | ⚠️ Navigation stub | **HIGH** |
| Empty cart state | ✅ | ✅ | — |
| Save for Later section | ✅ | ✅ | — |
| Cart badge on bottom nav | ✅ | ❌ | **HIGH** |

### 3.7 Wishlist Page

| Feature | Web | Android | Gap |
|---------|-----|---------|-----|
| Wishlist product grid | ✅ | ✅ | — |
| Move to Cart button | ✅ | ❌ | **MEDIUM** |
| Remove from Wishlist | ✅ | ✅ | — |
| Empty wishlist state | ✅ | ✅ | — |
| Share wishlist | ✅ | ❌ | **LOW** |

### 3.8 Recently Viewed Page

| Feature | Web | Android | Gap |
|---------|-----|---------|-----|
| Recently viewed products list | ✅ | ⚠️ Scaffold | **HIGH** |
| Tap to open product detail | ✅ | ⚠️ | **MEDIUM** |
| Clear All button | ✅ | ❌ | **LOW** |
| Empty state | ✅ | ❌ | **LOW** |

### 3.9 Checkout Flow

| Feature | Web | Android | Gap |
|---------|-----|---------|-----|
| Step progress indicator (4 steps) | ✅ | ❌ | **CRITICAL** |
| Address selection (saved + add new) | ✅ | ❌ | **CRITICAL** |
| Payment method screen (Card/UPI/Net Banking/COD) | ✅ | ⚠️ PaymentScreen exists, gateway stub | **HIGH** |
| Order review screen | ✅ | ❌ | **HIGH** |
| Place Order with loading state | ✅ | ❌ | **HIGH** |
| Order confirmation screen | ✅ | ❌ | **HIGH** |
| Order failed state with retry | ✅ | ❌ | **MEDIUM** |

### 3.10 User Profile / Account

| Feature | Web | Android | Gap |
|---------|-----|---------|-----|
| Profile header (avatar, name, email) | ✅ | ⚠️ Scaffold | **MEDIUM** |
| Edit profile screen | ✅ | ❌ | **HIGH** |
| Order history with status badges | ✅ | ✅ BoughtPostsScreen | — |
| Order detail with tracking timeline | ✅ | ❌ | **HIGH** |
| Address book (list/add/edit/delete) | ✅ | ❌ | **HIGH** |
| Saved payment methods | ✅ | ❌ | **MEDIUM** |
| Notification preferences | ✅ | ⚠️ Scaffold | **MEDIUM** |
| App settings (theme/language) | ✅ | ⚠️ Scaffold | **MEDIUM** |
| Logout with confirmation | ✅ | ✅ | — |
| Delete account with confirmation | ✅ | ⚠️ Scaffold | **LOW** |

### 3.11 Authentication

| Feature | Web | Android | Gap |
|---------|-----|---------|-----|
| Login (email + password) | ✅ | ✅ | — |
| Register (full form + validation) | ✅ | ✅ | — |
| Forgot password | ✅ | ✅ | — |
| Google Sign-In | ✅ | ✅ (Credential Manager) | — |
| Form validation with accessible errors | ✅ | ✅ | — |

### 3.12 Search

| Feature | Web | Android | Gap |
|---------|-----|---------|-----|
| Search bar | ✅ | ✅ | — |
| Autocomplete suggestions | ✅ | ❌ | **MEDIUM** |
| Search results with filters | ✅ | ✅ | — |
| Recent searches (persisted) | ✅ | ✅ SavedSearchesRepository | — |
| Popular/trending searches | ✅ | ❌ | **LOW** |
| No results state | ✅ | ✅ | — |
| Voice search | ✅ | ❌ | **LOW** |

### 3.13 Notifications

| Feature | Web | Android | Gap |
|---------|-----|---------|-----|
| Notification list | ✅ | ⚠️ Scaffold | **MEDIUM** |
| Read/unread indicator | ✅ | ❌ | **MEDIUM** |
| Tap to navigate | ✅ | ❌ | **MEDIUM** |
| Clear all | ✅ | ❌ | **LOW** |
| Empty state | ✅ | ❌ | **LOW** |

### 3.14 Static / Info Pages

| Feature | Web | Android | Gap |
|---------|-----|---------|-----|
| About Us | ✅ | ❌ | **LOW** |
| Terms & Conditions | ✅ | ✅ (hardcoded) | — |
| Privacy Policy | ✅ | ✅ (hardcoded) | — |
| Contact Us | ✅ | ❌ | **LOW** |
| FAQ (searchable) | ✅ | ❌ | **MEDIUM** |
| Shipping Policy | ✅ | ❌ | **LOW** |
| Return Policy | ✅ | ✅ (hardcoded) | — |

---

## 4. COMPLETE FEATURE PARITY SCORE

| Category | Web Features | Android Has | Parity |
|----------|-------------|-------------|--------|
| Navigation & App Shell | 7 | 1 | **14%** |
| Category Home Pages | 10 | 2 | **20%** |
| Subcategory Pages | 4 | 0 | **0%** |
| Product Listing (PLP) | 11 | 6 | **55%** |
| Product Detail (PDP) | 17 | 7 | **41%** |
| Cart | 9 | 6 | **67%** |
| Wishlist | 5 | 3 | **60%** |
| Recently Viewed | 4 | 1 | **25%** |
| Checkout Flow | 7 | 1 | **14%** |
| Profile / Account | 10 | 3 | **30%** |
| Authentication | 5 | 5 | **100%** |
| Search | 7 | 4 | **57%** |
| Notifications | 5 | 1 | **20%** |
| Static Pages | 7 | 3 | **43%** |
| **TOTAL** | **108** | **43** | **~40%** |

**True feature parity: ~40%** — not 100/100.

---

## 5. SPRINT PLAN

### Sprint 0: Architecture Foundation (Estimated: 50+ files)

**Goal**: Restructure navigation to support launcher → category app shell pattern. Add missing Room entities, shared components, and data layer foundations.

#### 0.1 Navigation Restructure
- [ ] Create `LauncherNavGraph` — root graph with NO bottom nav
- [ ] Create `CategoryAppShell` composable — wraps each category with its own top bar + bottom nav
- [ ] Create 4 independent `CategoryNavGraph` (electronics, fashion, grocery, furniture)
- [ ] Modify `MhubApp.kt` to use launcher as start destination
- [ ] Remove bottom nav from launcher route
- [ ] Add bottom nav inside category shell only (Home, Categories, Cart, Wishlist, Profile)

#### 0.2 Room Database Expansion
- [ ] Add `CartItemEntity` (id, postId, title, price, imageUrl, quantity, category, variant, addedAt)
- [ ] Add `WishlistItemEntity` (id, postId, title, price, imageUrl, category, addedAt)
- [ ] Add `RecentlyViewedEntity` (id, postId, title, price, imageUrl, viewedAt)
- [ ] Add `SearchHistoryEntity` (id, query, category, timestamp)
- [ ] Add `AddressEntity` (id, name, phone, line1, line2, city, state, pincode, isDefault)
- [ ] Add `OrderEntity` (id, items, totalAmount, status, address, paymentMethod, createdAt)
- [ ] Add corresponding DAOs
- [ ] Update `MhubDatabase` to version 3

#### 0.3 Mock Data Layer
- [ ] Create `MockDataProvider.kt` — realistic products per category with images
  - Electronics: 50+ products (phones, laptops, headphones, cameras, TVs, tablets)
  - Fashion: 50+ products (shirts, dresses, shoes, watches, bags, accessories)
  - Grocery: 50+ products (fruits, vegetables, dairy, snacks, beverages, staples)
  - Furniture: 50+ products (sofas, beds, tables, chairs, storage, decor)
- [ ] Subcategories per category (8-12 each)
- [ ] Hero banner data per category
- [ ] Deals/promotions data
- [ ] Brand data per category

#### 0.4 Shared UI Components
- [ ] `HeroBannerCarousel` — auto-scroll HorizontalPager with page indicators
- [ ] `SubcategoryChipRow` — horizontal scroll chips with icons
- [ ] `CountdownTimer` — deals countdown composable
- [ ] `ProductCard` — enhanced card with Quick Add to Cart, wishlist heart, discount badge, rating stars
- [ ] `FilterBottomSheet` — reusable filter with price range slider, brand checkboxes, rating, availability
- [ ] `StepProgressIndicator` — for checkout flow (4 steps)
- [ ] `QuantitySelector` — reusable +/- quantity component
- [ ] `RatingStars` — interactive star rating
- [ ] `VariantSelector` — color swatches + size chips
- [ ] `BreadcrumbNav` — breadcrumb navigation component
- [ ] `CartBadge` — badge count on nav icon
- [ ] `EmptyState` — generic empty state with illustration + message + CTA
- [ ] `ErrorState` — generic error state with retry
- [ ] `ShimmerGrid` — configurable shimmer loading skeleton
- [ ] `PriceDisplay` — original + sale + discount % formatting

---

### Sprint 1: Home Launcher Screen

**Goal**: Replace current home with a launcher showing 4 category app cards. No bottom navigation.

#### Screens
- [ ] `LauncherScreen` — NO bottom nav
  - Welcome header with user greeting ("Hi, [name]! 👋")
  - 4 large category cards with gradient backgrounds and category images:
    - 🔌 Electronics — "Phones, Laptops, Gadgets & More"
    - 👗 Fashion — "Clothing, Shoes, Accessories & More"
    - 🛒 Grocery — "Fresh Food, Staples, Beverages & More"
    - 🪑 Furniture — "Home, Office, Decor & More"
  - Each card shows: category icon/image, title, subtitle, product count
  - Animated scale + fade transition when tapping a card
  - Pull-to-refresh to update category stats
  - Loading shimmer for cards
  - Quick search bar at top (navigates to global search)

#### Accessibility
- [ ] All cards: `contentDescription = "Open [Category] app, [X] products available"`
- [ ] Cards: minimum 48dp touch target
- [ ] Greeting: `semantics { heading() }`
- [ ] Search bar: proper label + hint text

---

### Sprint 2: Category App Shell

**Goal**: Create the wrapper that appears when user enters any category. Contains top bar + bottom nav + category-scoped navigation.

#### Components
- [ ] `CategoryAppShell` composable
  - Top App Bar: category title/logo, search icon, cart icon with live badge count, notifications bell, back-to-launcher button
  - Bottom Navigation Bar: Home, Categories, Cart, Wishlist, Profile
  - `NavHost` with category-scoped routes
  - Side drawer / hamburger menu with:
    - User profile preview
    - All subcategories list
    - Order History, Settings, Help
    - Switch Category links
  - Smooth slide-in transition from launcher

- [ ] `CategoryBottomNavBar` composable
  - 5 tabs with icons + labels
  - Cart tab shows badge count (live from Room DB)
  - Active tab highlighting
  - Proper `contentDescription` for each tab

- [ ] Per-category navigation graphs:
  - `ElectronicsNavGraph`
  - `FashionNavGraph`
  - `GroceryNavGraph`
  - `FurnitureNavGraph`

#### Accessibility
- [ ] Back button: `contentDescription = "Return to app launcher"`
- [ ] Cart badge: announces count to TalkBack
- [ ] Bottom nav: selected state announced
- [ ] Drawer: proper list semantics

---

### Sprint 3: Category Home Pages (4 pages)

**Goal**: Each category gets a rich home page with hero banners, subcategories, featured products, deals, and more.

#### Per-Category Home Screen (replicate for all 4)
- [ ] `CategoryHomeScreen(categoryId)`
  - **Hero Banner Carousel** — 3-5 banners per category, auto-scroll every 5s, page indicators
  - **Subcategory Chips** — horizontal scrollable row with icons (e.g., Electronics → Phones, Laptops, Audio, Cameras, TVs, Gaming, Wearables, Accessories)
  - **Featured Products** — 2-column grid of top products (first 6-8)
  - **Deals of the Day** — countdown timer + deal cards with original/sale price + discount %
  - **Trending Products Carousel** — horizontal scroll of trending items
  - **Promotional Banner** — mid-page promotional image
  - **New Arrivals** — horizontal scroll of newest products
  - **Brand Spotlight** — brand logos row (tappable to filter by brand)
  - Pull-to-refresh
  - Shimmer loading for each section

#### Data
- [ ] Electronics subcategories: Smartphones, Laptops, Headphones, Cameras, TVs, Tablets, Gaming, Wearables, Smart Home, Accessories
- [ ] Fashion subcategories: Men's Clothing, Women's Clothing, Shoes, Watches, Bags, Jewelry, Sunglasses, Ethnic Wear, Sports Wear, Kids' Fashion
- [ ] Grocery subcategories: Fruits & Vegetables, Dairy, Bakery, Snacks, Beverages, Staples, Frozen, Organic, Meat & Seafood, Baby Care
- [ ] Furniture subcategories: Living Room, Bedroom, Dining, Office, Storage, Outdoor, Kids, Decor, Lighting, Bathroom

#### Accessibility
- [ ] Banner carousel: TalkBack announces "Banner [X] of [Y]"
- [ ] Subcategory chips: role = button, announces name
- [ ] Product cards: announces title, price, rating
- [ ] Countdown timer: live region for TalkBack
- [ ] All sections: heading semantics

---

### Sprint 4: Subcategory + Product Listing

**Goal**: Full subcategory browsing and product listing with advanced filters, sort, and grid/list toggle.

#### Screens
- [ ] `SubcategoryScreen(categoryId)`
  - Category banner at top (hero image)
  - Subcategory grid with images (2 or 3 columns)
  - Item count per subcategory
  - Breadcrumb: Category > Subcategory
  - Loading shimmer, empty state

- [ ] Enhanced `ProductListingScreen(categoryId, subcategoryId)`
  - Product cards grid (image, title, price, rating stars, discount badge)
  - Grid/list view toggle (persist preference)
  - **Filter bottom sheet**:
    - Price range slider (₹0 - ₹100,000)
    - Brand checkboxes (dynamic per category)
    - Rating filter (4★ & above, 3★ & above, etc.)
    - Availability toggle (in stock only)
    - Condition (New, Like New, Used, Refurbished)
  - **Sort dropdown**: Price Low→High, High→Low, Popularity, Newest, Rating, Relevance
  - Quick Add to Cart button on each card
  - Wishlist heart icon on each card (toggle)
  - Product count: "Showing X of Y products"
  - Infinite scroll with loading indicator
  - Active filter chips (removable, clear all)
  - No results state with suggestions
  - Loading shimmer grid

#### Accessibility
- [ ] Filter sheet: proper form semantics, slider announces value
- [ ] Grid/list toggle: announces current mode
- [ ] Product count: live region
- [ ] Heart icon: "Add to wishlist" / "Remove from wishlist"
- [ ] Quick add: "Add [product name] to cart"

---

### Sprint 5: Product Detail Page

**Goal**: Complete product detail screen matching web app functionality.

#### Screen: `ProductDetailScreen(postId)`
- [ ] **Image Gallery**
  - HorizontalPager with thumbnail strip below
  - Pinch-to-zoom (transformable modifier)
  - Full-screen image viewer on tap
  - Image count indicator ("1/5")

- [ ] **Product Info**
  - Title (large, bold)
  - Price display: ~~₹original~~ ₹sale (XX% off) in green
  - Rating stars (filled/half/empty) + "(X reviews)" link
  - Stock status badge (In Stock / Low Stock / Out of Stock)

- [ ] **Variant Selection**
  - Color swatches (circular, filled with color, border on selected)
  - Size chips (S, M, L, XL, XXL — highlight selected)
  - Variant availability indicator

- [ ] **Actions**
  - Quantity selector (+/-) with min 1
  - "Add to Cart" primary CTA button (full width)
  - "Buy Now" secondary button
  - "♡ Add to Wishlist" icon button
  - Share button (Android share sheet)

- [ ] **Product Details**
  - Expandable description (3 lines + "Read more")
  - Specifications table (key-value pairs)
  - Delivery info section (estimated delivery, free shipping threshold)
  - Return policy section

- [ ] **Reviews Section**
  - Overall rating summary (avg stars + distribution bar chart)
  - Review list (avatar, name, date, stars, text, helpful count)
  - "Write a Review" button → review form (star rating + text + submit)
  - Sort reviews: Most Recent, Most Helpful, Highest, Lowest

- [ ] **Related Products**
  - "You May Also Like" horizontal carousel
  - Tappable product cards

- [ ] **Side Effects**
  - Save to RecentlyViewed (Room DB) on screen open
  - Track view via API

#### Accessibility
- [ ] Image gallery: "Product image [X] of [Y]"
- [ ] Color swatches: "Color: Red, selected" / "Color: Blue"
- [ ] Size chips: "Size: Large, selected" / "Size: Medium, available"
- [ ] Quantity: announces current value
- [ ] Stars: "Rated 4.5 out of 5 stars, 128 reviews"
- [ ] Expandable sections: announces expanded/collapsed state

---

### Sprint 6: Cart + Wishlist + Recently Viewed

**Goal**: Complete cart experience with wishlist integration and recently viewed history.

#### Enhanced Cart Screen
- [ ] Swipe-to-remove items with undo Snackbar (5s timeout)
- [ ] Per-item variant display (color, size)
- [ ] Price summary section:
  - Subtotal
  - Tax (calculated)
  - Shipping (free above threshold, else ₹X)
  - Discount (from coupon)
  - **Total** (bold, large)
- [ ] Coupon code input with "Apply" button + success/error feedback
- [ ] "Proceed to Checkout" button → navigates to checkout flow
- [ ] "Continue Shopping" link → back to category home
- [ ] Save for Later section (separate list below cart)
- [ ] Cart badge count updates on bottom nav in real-time
- [ ] Quantity selector per item with stock limit

#### Enhanced Wishlist Screen
- [ ] "Move to Cart" button per item
- [ ] Share wishlist via Android share sheet
- [ ] Move multiple to cart (bulk action)

#### Recently Viewed Screen (NEW)
- [ ] `RecentlyViewedScreen`
  - Products in reverse chronological order
  - Tap → Product Detail
  - "Clear All" button with confirmation dialog
  - Empty state: "You haven't viewed any products yet"
  - Persisted in Room DB (max 50 items, auto-prune oldest)
  - Product card with timestamp ("Viewed 2h ago")

#### Accessibility
- [ ] Swipe: alternative delete button for accessibility
- [ ] Coupon: error message linked to input field
- [ ] Price summary: all values announced by TalkBack
- [ ] Undo snackbar: announced as action

---

### Sprint 7: Checkout Flow (4 Steps)

**Goal**: Complete checkout with address → payment → review → confirmation.

#### Screen: `CheckoutFlowScreen` (4-step)

##### Step 1: Address Selection
- [ ] `AddressSelectionScreen`
  - Saved addresses list (from Room DB)
  - Radio selection for delivery address
  - "Add New Address" button → address form
  - Address form: name, phone, address line 1, line 2, city, state, PIN code
  - Form validation (all required, PIN = 6 digits, phone = 10 digits)
  - "Deliver Here" → next step
  - Edit/delete existing addresses

##### Step 2: Payment Method
- [ ] `PaymentMethodScreen`
  - Payment options: Credit/Debit Card, UPI, Net Banking, Cash on Delivery
  - Add card form: card number, expiry, CVV, cardholder name
  - UPI: UPI ID input
  - Net Banking: bank selection dropdown
  - COD: simple selection
  - "Continue" → next step

##### Step 3: Order Review
- [ ] `OrderReviewScreen`
  - Items list with images, title, qty, price
  - Selected delivery address (with "Change" link)
  - Selected payment method (with "Change" link)
  - Price breakdown (subtotal, tax, shipping, discount, total)
  - Estimated delivery date
  - "Place Order" button (primary CTA)

##### Step 4: Order Confirmation
- [ ] `OrderConfirmationScreen`
  - Success animation (checkmark)
  - Order ID
  - Estimated delivery date
  - Order summary
  - "Continue Shopping" button → launcher
  - "View Order" button → order detail

- [ ] `OrderFailedScreen`
  - Error message
  - "Retry Payment" button
  - "Go to Cart" fallback

#### Step Progress Indicator
- [ ] Visual stepper: Address → Payment → Review → Confirm
  - Completed steps: filled circle + green
  - Current step: highlighted circle + label
  - Future steps: gray circle

#### Accessibility
- [ ] Step indicator: announces "Step [X] of 4: [Name]"
- [ ] Address form: all fields labeled, errors announced
- [ ] Payment: card number field has input mask hint
- [ ] Place Order: loading state announced

---

### Sprint 8: Profile & Account

**Goal**: Complete user profile management with order history, addresses, and settings.

#### Screens
- [ ] Enhanced `ProfileScreen`
  - Profile header: large avatar (with edit camera icon), full name, email, phone
  - Trust score badge
  - Verification badges row (phone, email, KYC)
  - Stats row: total orders, wishlist count, reviews given
  - Quick links: Orders, Addresses, Settings, Help

- [ ] `EditProfileScreen` (NEW)
  - Avatar picker (camera/gallery)
  - Name, email, phone, bio fields
  - Save button with validation
  - Loading/success/error states

- [ ] `OrderHistoryScreen` (enhance BoughtPostsScreen)
  - Order list with status badges (Placed, Confirmed, Shipped, Delivered, Cancelled)
  - Filter by status
  - Tap to open order detail

- [ ] `OrderDetailScreen` (NEW)
  - Order items list
  - Tracking timeline (vertical stepper: Placed → Confirmed → Shipped → Out for Delivery → Delivered)
  - Delivery address
  - Payment method
  - Price breakdown
  - "Cancel Order" (if eligible)
  - "Return/Refund" (if delivered)

- [ ] `AddressBookScreen` (NEW)
  - List of saved addresses
  - Default address indicator
  - Add/Edit/Delete addresses
  - Set as default toggle

- [ ] `SavedPaymentMethodsScreen` (NEW)
  - List of saved cards (masked: •••• 4242)
  - Add new card
  - Delete card with confirmation

- [ ] Enhanced `NotificationPreferencesScreen`
  - Push notifications toggle
  - Order updates toggle
  - Promotional offers toggle
  - Price drop alerts toggle

- [ ] Enhanced `SettingsScreen`
  - Theme: Light / Dark / System
  - Language picker (7 languages)
  - Clear cache
  - App version info

- [ ] Logout with confirmation dialog
- [ ] Delete account with warning + confirmation ("This action cannot be undone")

#### Accessibility
- [ ] Avatar: "Profile picture, tap to change"
- [ ] Verification badges: "Phone verified" / "Email not verified"
- [ ] Order timeline: announces each step status
- [ ] All form fields: visible labels

---

### Sprint 9: Authentication Enhancements

**Goal**: Polish existing auth screens to match web app fully.

#### Enhancements
- [ ] `LoginScreen` — already complete, verify:
  - Email/phone + password inputs with visible labels
  - Validation error messages below each field
  - "Forgot Password?" link
  - Google Sign-In button
  - "Don't have an account? Sign Up" link
  - Loading state on submit
  - Error banner for failed login

- [ ] `SignUpScreen` — already complete, verify:
  - Name, email, phone, password, confirm password fields
  - Terms & Conditions checkbox with link
  - Validation: email format, phone 10 digits, password 8+ chars, passwords match
  - All fields labeled (not just placeholder)

- [ ] `ForgotPasswordScreen` — already complete, verify:
  - Email input
  - "Send Reset Link" button
  - Success message: "Check your email for reset instructions"

- [ ] Add biometric login option (already has BiometricHelper)
- [ ] Add "Remember Me" checkbox on login

#### Accessibility
- [ ] All form fields: visible labels above inputs (not just placeholders)
- [ ] Error messages: `semantics { error(message) }` for TalkBack
- [ ] Password: toggle visibility icon with contentDescription
- [ ] Google Sign-In: proper label

---

### Sprint 10: Search Enhancements

**Goal**: Add autocomplete, voice search, trending searches.

#### Enhancements
- [ ] `SearchScreen` — enhance existing:
  - **Autocomplete dropdown**: as user types, show matching product names + category + thumbnail
  - **Recent searches**: from Room DB, with "X" to remove individual, "Clear All"
  - **Popular/trending searches**: hardcoded or from API ("Popular: iPhone, Sofa, Rice, Sneakers")
  - **Voice search**: `SpeechRecognizer` intent to populate search field
  - **Search scoped to current category** when inside a category app

#### Accessibility
- [ ] Autocomplete: list announces items as user navigates
- [ ] Voice search: "Search by voice" button with contentDescription
- [ ] Recent searches: "Remove recent search: [query]"

---

### Sprint 11: Notifications + Static Pages

**Goal**: Complete notification center and static informational pages.

#### Enhanced Notifications Screen
- [ ] Notification list with type icons (order, promo, system, message)
- [ ] Read/unread visual indicator (bold for unread)
- [ ] Tap to navigate to relevant page (order detail, product, chat)
- [ ] "Mark All as Read" button
- [ ] "Clear All" button with confirmation
- [ ] Empty state: "You're all caught up! 🎉"
- [ ] Notification badge on bottom nav
- [ ] Filter tabs: All, Orders, Promotions, System

#### Static Pages (NEW screens)
- [ ] `AboutUsScreen` — app description, team, mission
- [ ] `ContactUsScreen` — email, phone, form
- [ ] `FAQScreen` — searchable FAQ with expandable sections
- [ ] `ShippingPolicyScreen` — shipping info text
- [ ] Enhance existing: Terms, Privacy, Return Policy

#### Accessibility
- [ ] Unread: announced as "Unread notification"
- [ ] FAQ: expandable sections announce state
- [ ] All static pages: proper heading hierarchy

---

### Sprint 12: Full Audit Pass — 100/100 on Every Page

**Goal**: Systematic review and fix of every single screen for accessibility, performance, and UX completeness.

#### 12.1 Accessibility Audit (ALL screens)
- [ ] Every image/icon has `contentDescription`
- [ ] Every touch target >= 48dp × 48dp
- [ ] Color contrast >= 4.5:1 (normal text), >= 3:1 (large text) — verify against Material 3 theme
- [ ] Logical focus/tab order on all forms
- [ ] TalkBack full walkthrough — every action and state announced
- [ ] Heading hierarchy: `semantics { heading() }` on section titles
- [ ] Form fields: visible labels (not placeholder-only)
- [ ] Error messages: associated with fields via `semantics { error() }`
- [ ] Disabled states properly announced

#### 12.2 Performance Audit (ALL screens)
- [ ] All lists use `LazyColumn` / `LazyGrid` with stable `key`s
- [ ] Coil image loading: disk cache + memory cache configured
- [ ] No unnecessary recompositions (verify with Layout Inspector)
- [ ] Large lists: item recycling efficient, no scroll jank
- [ ] State hoisting: ViewModels collect as state correctly
- [ ] Coroutine scope management: no leaks
- [ ] Room queries: run on IO dispatcher

#### 12.3 UX States Audit (ALL screens)
- [ ] Every data-dependent screen has shimmer/loading state
- [ ] Every network screen has error state + retry button
- [ ] Every list screen has empty state (illustration + message + CTA)
- [ ] Pull-to-refresh on all data screens
- [ ] Offline indicator (OfflineBanner) on all screens

#### 12.4 Visual Audit (ALL screens)
- [ ] Consistent Material 3 theme across all screens
- [ ] Dark mode works on every screen (no hardcoded colors)
- [ ] Typography scale used correctly (Display, Headline, Title, Body, Label)
- [ ] Spacing consistent (Material 3 spacing tokens)
- [ ] Phone + tablet layouts (adaptive width handling)

#### 12.5 Screen-by-Screen Checklist

| Screen | A11y | Perf | States | Dark | Status |
|--------|------|------|--------|------|--------|
| Launcher | ☐ | ☐ | ☐ | ☐ | |
| Electronics Home | ☐ | ☐ | ☐ | ☐ | |
| Fashion Home | ☐ | ☐ | ☐ | ☐ | |
| Grocery Home | ☐ | ☐ | ☐ | ☐ | |
| Furniture Home | ☐ | ☐ | ☐ | ☐ | |
| Subcategory Grid | ☐ | ☐ | ☐ | ☐ | |
| Product Listing | ☐ | ☐ | ☐ | ☐ | |
| Product Detail | ☐ | ☐ | ☐ | ☐ | |
| Cart | ☐ | ☐ | ☐ | ☐ | |
| Wishlist | ☐ | ☐ | ☐ | ☐ | |
| Recently Viewed | ☐ | ☐ | ☐ | ☐ | |
| Checkout - Address | ☐ | ☐ | ☐ | ☐ | |
| Checkout - Payment | ☐ | ☐ | ☐ | ☐ | |
| Checkout - Review | ☐ | ☐ | ☐ | ☐ | |
| Checkout - Confirm | ☐ | ☐ | ☐ | ☐ | |
| Profile | ☐ | ☐ | ☐ | ☐ | |
| Edit Profile | ☐ | ☐ | ☐ | ☐ | |
| Order History | ☐ | ☐ | ☐ | ☐ | |
| Order Detail | ☐ | ☐ | ☐ | ☐ | |
| Address Book | ☐ | ☐ | ☐ | ☐ | |
| Search | ☐ | ☐ | ☐ | ☐ | |
| Notifications | ☐ | ☐ | ☐ | ☐ | |
| Login | ☐ | ☐ | ☐ | ☐ | |
| Sign Up | ☐ | ☐ | ☐ | ☐ | |
| Settings | ☐ | ☐ | ☐ | ☐ | |
| FAQ | ☐ | ☐ | ☐ | ☐ | |
| About / Contact / Policies | ☐ | ☐ | ☐ | ☐ | |

---

## 6. FILE CREATION MANIFEST

### New Files to Create (~80+ files)

```
ui/
├── launcher/
│   ├── LauncherScreen.kt
│   └── LauncherViewModel.kt
├── categoryapp/
│   ├── CategoryAppShell.kt
│   ├── CategoryBottomNavBar.kt
│   ├── CategoryHomeScreen.kt
│   ├── CategoryHomeViewModel.kt
│   ├── SubcategoryScreen.kt
│   └── SubcategoryViewModel.kt
├── product/
│   ├── ProductListingScreen.kt
│   ├── ProductListingViewModel.kt
│   ├── EnhancedProductDetailScreen.kt
│   └── ProductDetailViewModel.kt (enhance existing)
├── cart/
│   ├── EnhancedCartScreen.kt
│   └── CartViewModel.kt
├── checkout/
│   ├── CheckoutFlowScreen.kt
│   ├── AddressSelectionScreen.kt
│   ├── PaymentMethodScreen.kt
│   ├── OrderReviewScreen.kt
│   ├── OrderConfirmationScreen.kt
│   ├── OrderFailedScreen.kt
│   └── CheckoutViewModel.kt
├── orders/
│   ├── OrderHistoryScreen.kt
│   ├── OrderDetailScreen.kt
│   └── OrderViewModel.kt
├── profile/
│   ├── EnhancedProfileScreen.kt
│   ├── EditProfileScreen.kt
│   └── ProfileViewModel.kt
├── address/
│   ├── AddressBookScreen.kt
│   ├── AddressFormScreen.kt
│   └── AddressViewModel.kt
├── recentlyviewed/
│   ├── RecentlyViewedScreen.kt
│   └── RecentlyViewedViewModel.kt
├── notifications/
│   └── EnhancedNotificationsScreen.kt
├── static/
│   ├── AboutUsScreen.kt
│   ├── ContactUsScreen.kt
│   ├── FAQScreen.kt
│   └── ShippingPolicyScreen.kt
├── components/
│   ├── HeroBannerCarousel.kt
│   ├── SubcategoryChipRow.kt
│   ├── CountdownTimer.kt
│   ├── EnhancedProductCard.kt
│   ├── FilterBottomSheet.kt
│   ├── StepProgressIndicator.kt
│   ├── QuantitySelector.kt
│   ├── RatingStars.kt
│   ├── VariantSelector.kt
│   ├── BreadcrumbNav.kt
│   ├── CartBadge.kt
│   ├── PriceDisplay.kt
│   └── SectionHeader.kt
├── navigation/
│   ├── LauncherNavGraph.kt
│   ├── ElectronicsNavGraph.kt
│   ├── FashionNavGraph.kt
│   ├── GroceryNavGraph.kt
│   └── FurnitureNavGraph.kt

data/
├── local/db/
│   ├── CartItemEntity.kt
│   ├── CartItemDao.kt
│   ├── WishlistItemEntity.kt
│   ├── WishlistItemDao.kt
│   ├── RecentlyViewedEntity.kt
│   ├── RecentlyViewedDao.kt
│   ├── SearchHistoryEntity.kt
│   ├── SearchHistoryDao.kt
│   ├── AddressEntity.kt
│   ├── AddressDao.kt
│   ├── OrderEntity.kt
│   └── OrderDao.kt
├── mock/
│   └── MockDataProvider.kt
├── repository/
│   ├── LocalCartRepository.kt
│   ├── LocalWishlistRepository.kt
│   ├── RecentlyViewedRepository.kt
│   ├── AddressRepository.kt
│   ├── OrderRepository.kt
│   └── CheckoutRepository.kt
```

### Files to Modify (~15+ files)
```
MhubApp.kt                    — Navigation restructure
Routes.kt                     — Add new routes
MhubDatabase.kt               — Add new entities/DAOs
AppModule.kt                  — Provide new DAOs/repos
NetworkModule.kt               — (if needed)
Theme.kt                      — Category-specific tints
HomeScreen.kt                  — Refactor to product listing
CategoryHubScreen.kt           — Refactor to launcher
PostDetailScreen.kt            — Enhance with variants/reviews
WishlistScreen.kt              — Add move-to-cart
CartScreen (CommerceScreens.kt) — Add swipe-to-delete, checkout nav
ProfileScreen.kt               — Enhance with stats/links
SearchScreen.kt                — Add autocomplete/voice
NotificationsScreen.kt         — Add read/unread, navigation
SettingsScreen.kt              — Add language/theme pickers
```

---

## 7. MOCK DATA SPECIFICATION

Since no backend API is guaranteed to be running, all new features will use mock data from `MockDataProvider.kt` with realistic content:

### Product Schema (Mock)
```kotlin
data class MockProduct(
    val id: String,
    val title: String,
    val description: String,
    val price: Double,
    val originalPrice: Double?,  // null if no discount
    val discountPercent: Int?,
    val images: List<String>,    // placeholder image URLs
    val category: String,
    val subcategory: String,
    val brand: String,
    val rating: Float,           // 0.0 - 5.0
    val reviewCount: Int,
    val colors: List<String>,    // hex codes
    val sizes: List<String>,     // S, M, L, XL, etc.
    val inStock: Boolean,
    val condition: String,       // New, Like New, Used, Refurbished
    val specs: Map<String, String>,
    val deliveryDays: Int,
    val freeShipping: Boolean
)
```

### Category Data
```
Electronics (10 subcategories, 50+ products)
Fashion (10 subcategories, 50+ products)
Grocery (10 subcategories, 50+ products)
Furniture (10 subcategories, 50+ products)
= 200+ mock products total
```

### Image Sources
- Use `https://picsum.photos/seed/{product-id}/400/400` for product images
- Use `https://picsum.photos/seed/{banner-id}/800/400` for banners

---

## 8. DEPENDENCY ADDITIONS NEEDED

```gradle
// build.gradle.kts additions:

// For pinch-to-zoom on product images
// (Use Compose's built-in transformable modifier — no additional dependency)

// For voice search
// (Use Android SpeechRecognizer — no additional dependency)

// For swipe-to-dismiss in cart
// (Use Compose Material3 SwipeToDismissBox — already available)

// No new dependencies required — existing stack covers all needs:
// - Compose Material3 (UI)
// - Room (local DB)
// - Coil (images)
// - Hilt (DI)
// - Navigation Compose (nav)
// - DataStore (preferences)
```

---

## 9. RISK ASSESSMENT

| Risk | Impact | Mitigation |
|------|--------|------------|
| API endpoints may not all be functional | HIGH | Use MockDataProvider for all new features; real API integration can happen later |
| Navigation restructure may break existing screens | HIGH | Create new nav graphs alongside existing; migrate incrementally |
| Room DB migration from v2 to v3 | MEDIUM | Use destructive migration (dev builds); proper migration for prod |
| Performance with 200+ mock products | LOW | LazyColumn/LazyGrid with keys; Coil caching handles images |
| Dark mode inconsistencies | MEDIUM | Audit pass in Sprint 12; use only Material 3 theme colors |

---

## 10. SUCCESS CRITERIA

When complete, the app will:

1. **Launch** to a 4-card category launcher with NO bottom nav
2. **Enter** any category to see a full app experience with top bar, bottom nav, hero banners, subcategories
3. **Browse** products with filters, sort, grid/list toggle, infinite scroll
4. **View** product details with image gallery, variants, reviews, related products
5. **Cart** with quantity management, coupons, price summary
6. **Checkout** through 4 clear steps (address → payment → review → confirm)
7. **Wishlist** with move-to-cart and sharing
8. **Search** with autocomplete, voice, history
9. **Profile** with edit, orders, addresses, settings
10. **Notifications** with read/unread, navigation, filters
11. **100/100** accessibility on every screen (TalkBack, contrast, touch targets)
12. **100/100** performance on every screen (60fps, lazy loading, efficient recomposition)
13. **Dark mode** works flawlessly on all screens
14. **Loading, error, and empty states** on every data-driven screen

---

*This plan covers the complete gap between the current Android app (~40% parity) and the target web app (100% parity). Implementation follows the sprint order above, building foundational architecture first, then screens incrementally.*
