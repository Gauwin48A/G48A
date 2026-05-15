# Android E-Commerce App — Full Implementation Plan from Scratch

> **Generated**: 2026-05-15
> **Repository**: Chandu-y/Mhub
> **Status**: PLANNING PHASE

---

## TABLE OF CONTENTS

1. [Project Context](#1-project-context)
2. [Current State Analysis](#2-current-state-analysis)
3. [Gap Analysis: Web App vs Android App](#3-gap-analysis-web-app-vs-android-app)
4. [Target Architecture](#4-target-architecture)
5. [Feature Specification](#5-feature-specification)
6. [Data Models](#6-data-models)
7. [API Integration](#7-api-integration)
8. [Sprint Plan](#8-sprint-plan)
9. [100/100 Audit Requirements](#9-100100-audit-requirements)
10. [File Structure](#10-file-structure)
11. [Testing Strategy](#11-testing-strategy)

---

## 1. PROJECT CONTEXT

### What MHub Is
MHub is a **multi-category e-commerce marketplace** — NOT a single-category store. The app serves as a **launcher for 4 independent mini-apps**, each representing a major product category group:

| App | Key | Categories | Theme Color |
|-----|-----|-----------|-------------|
| 📱 **Electronics** | `electronics` | Phones, Laptops, Cameras, Gadgets | Blue/Indigo |
| 👗 **Fashion** | `fashion` | Clothing, Shoes, Accessories, Bags | Pink/Rose |
| 🚗 **Vehicles** | `vehicles` | Cars, Bikes, Auto Parts, Accessories | Emerald/Teal |
| ✨ **Others** | `others` | Home, Services, Jobs, Real Estate | Purple/Violet |

### Critical Architecture Rule
> **The Home/Launcher page has NO bottom navigation bar.**
> Bottom navigation ONLY appears AFTER a user enters a specific category app.
> Each category app has its own independent navigation, theme, and content.

### Web App Scale (What We're Replicating)
- **60+ pages/screens**
- **100+ routes**
- **Real-time chat** via Socket.io
- **Gamified selling** with tier system (Basic/Bronze/Silver/Premium)
- **Rewards/coins** system
- **KYC/Verification** flow (Aadhaar + PAN)
- **Multi-language** support (English, Hindi, etc.)
- **Dark mode** + accessibility features
- **Biometric authentication**
- **Native integrations** (Camera, GPS, Share, Haptics, Push)

---

## 2. CURRENT STATE ANALYSIS

### What Exists Today

#### Android Project (`client/android/`)
The current Android project is a **Capacitor WebView shell** — it is NOT a native Kotlin app:

```
client/android/
├── app/
│   ├── src/main/java/com/mhub/app/
│   │   └── MainActivity.java          ← Single file: extends BridgeActivity (WebView)
│   ├── src/main/AndroidManifest.xml   ← Permissions + deep links configured
│   ├── build.gradle                   ← Capacitor dependencies only
│   └── capacitor.build.gradle         ← Auto-generated plugin bindings
├── build.gradle                       ← Root gradle (capacitor settings)
├── settings.gradle
├── variables.gradle                   ← SDK versions
└── gradle/
```

**What the current Android app actually does:**
- ✅ Opens a WebView pointing to the Vite-built web app (`dist/`)
- ✅ Has deep link handlers (`mhub://` scheme + `https://mhub.app`)
- ✅ Receives shared content from other apps (text + images)
- ✅ Has permissions declared (Camera, Location, Contacts, Biometric, Vibrate, Push)
- ✅ Has FileProvider for camera image sharing
- ✅ Has Google Services integration (for push notifications)

**What the current Android app does NOT have:**
- ❌ No native Kotlin UI screens
- ❌ No Jetpack Compose code
- ❌ No Room database
- ❌ No Hilt dependency injection
- ❌ No native navigation graphs
- ❌ No offline-first architecture
- ❌ No native animations or transitions
- ❌ Everything runs through WebView (the React web app)

#### Web App (`client/src/`)
The web app is **comprehensive and production-grade** with:

| Component | Count | Examples |
|-----------|-------|---------|
| Pages | 60+ | AllPosts, PostDetail, Cart, Wishlist, Chat, Dashboard, etc. |
| Components | 100+ | GreenNavbar, GreenProductCard, HeroBanner, ImageGallery, etc. |
| Services | 23 | API, categories, camera, GPS, haptics, push, share, etc. |
| Contexts | 6 | Auth, Cart, CategoryMode, Filter, Location, Theme |
| Hooks | 22 | useInfiniteScroll, usePullToRefresh, useRealtimeChat, etc. |
| Utils | 20+ | authStorage, savedPosts, softReload, deepLinkHandler, etc. |

---

## 3. GAP ANALYSIS: Web App vs Android App

### Feature-by-Feature Comparison

| Feature | Web App | Current Android | Gap |
|---------|---------|----------------|-----|
| **Home Launcher** (4 category cards, no bottom nav) | ✅ CategoryHub.jsx | ❌ WebView only | 🔴 MISSING |
| **Category App Shell** (per-category top bar + bottom nav) | ✅ GreenNavbar.jsx + CategoryModeContext | ❌ WebView only | 🔴 MISSING |
| **Hero Banner Carousel** | ✅ GreenHeroBanner.jsx (auto-scroll, CMS-driven) | ❌ WebView only | 🔴 MISSING |
| **Subcategory Chips/Grid** | ✅ Subcategories.jsx + subcategoriesService | ❌ WebView only | 🔴 MISSING |
| **Product Listing (PLP)** | ✅ AllPosts.jsx (grid/list, filters, sort, infinite scroll) | ❌ WebView only | 🔴 MISSING |
| **Product Detail (PDP)** | ✅ PostDetail.jsx (gallery, zoom, variants, reviews, offer) | ❌ WebView only | 🔴 MISSING |
| **Cart** | ✅ Cart.jsx + CartContext (add/remove, coupon, summary) | ❌ WebView only | 🔴 MISSING |
| **Wishlist** | ✅ Wishlist.jsx (save, notes, share, bulk actions) | ❌ WebView only | 🔴 MISSING |
| **Recently Viewed** | ✅ RecentlyViewed.jsx (chronological, clear all) | ❌ WebView only | 🔴 MISSING |
| **Checkout/Payment** | ✅ Payments/ (tier selection, payment processing) | ❌ WebView only | 🔴 MISSING |
| **Authentication** | ✅ Auth/ (login, signup, OTP, forgot password, biometric) | ❌ WebView only | 🔴 MISSING |
| **User Profile** | ✅ Profile.jsx (avatar, bio, verification, trust score) | ❌ WebView only | 🔴 MISSING |
| **Seller Dashboard** | ✅ Dashboard.jsx + SellerDashboard.jsx (analytics, listings) | ❌ WebView only | 🔴 MISSING |
| **Chat** | ✅ Chat.jsx (real-time, typing indicators, online status) | ❌ WebView only | 🔴 MISSING |
| **Notifications** | ✅ Notifications.jsx (push, in-app, read/unread) | ❌ WebView only | 🔴 MISSING |
| **Search** | ✅ SearchPage.jsx (autocomplete, recent, saved, filters) | ❌ WebView only | 🔴 MISSING |
| **Offers/Negotiation** | ✅ Offers.jsx (make/counter/accept/reject, history) | ❌ WebView only | 🔴 MISSING |
| **Create/Edit Post** | ✅ AddPost.jsx + EditPost.jsx (images, tiers, categories) | ❌ WebView only | 🔴 MISSING |
| **Channels/CentrePages** | ✅ ChannelsListPage, ChannelPage, CentreListings | ❌ WebView only | 🔴 MISSING |
| **Social Feed** | ✅ FeedPage.jsx, ForYou.jsx, MyFeedPage.jsx | ❌ WebView only | 🔴 MISSING |
| **Reviews & Ratings** | ✅ Reviews.jsx, StarRating, SellerTrustBadges | ❌ WebView only | 🔴 MISSING |
| **Rewards/Coins** | ✅ Rewards.jsx (earn, redeem, history) | ❌ WebView only | 🔴 MISSING |
| **KYC/Verification** | ✅ KYC/, GetVerified.jsx, Verification.jsx | ❌ WebView only | 🔴 MISSING |
| **Settings** | ✅ SecuritySettings.jsx, AccountDeletion.jsx | ❌ WebView only | 🔴 MISSING |
| **Static Pages** | ✅ PrivacyPolicy, Terms, RefundPolicy, SupportTicket | ❌ WebView only | 🔴 MISSING |
| **Dark Mode** | ✅ ThemeContext + DarkModeToggle | ❌ WebView only | 🔴 MISSING |
| **Multi-Language** | ✅ i18n (en, hi, etc.) | ❌ WebView only | 🔴 MISSING |
| **Pull-to-Refresh** | ✅ PullToRefreshWrapper (22 routes) | ❌ WebView only | 🔴 MISSING |
| **Offline Support** | ⚠️ Partial (localStorage cache) | ❌ None | 🔴 MISSING |
| **Native Animations** | ❌ CSS only | ❌ None | 🔴 MISSING |
| **Skeleton Loaders** | ✅ GreenSkeletonLoader, PostCardSkeleton | ❌ WebView only | 🔴 MISSING |

### Summary
> **94% of features exist only in the web app running inside a WebView wrapper.**
> The Android project has ZERO native Kotlin UI, ZERO native navigation, ZERO local database.
> It is essentially a browser with app permissions.

---

## 4. TARGET ARCHITECTURE

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **UI** | Jetpack Compose + Material 3 | All screens, theming, animations |
| **Navigation** | Navigation Compose | Per-category nav graphs, deep links |
| **DI** | Hilt | Dependency injection |
| **Local DB** | Room | Cart, Wishlist, Recently Viewed, Search History, Drafts |
| **Networking** | Retrofit + OkHttp | API calls with interceptors |
| **Images** | Coil | Image loading with caching |
| **State** | ViewModel + StateFlow | Reactive UI state |
| **Async** | Coroutines + Flow | Background operations |
| **Real-time** | Socket.io client for Kotlin | Chat, notifications |
| **Auth** | DataStore + BiometricPrompt | Token storage, fingerprint login |
| **Analytics** | Firebase Analytics | Event tracking |
| **Push** | Firebase Cloud Messaging | Push notifications |

### Architecture Pattern
```
┌─────────────────────────────────────────────────────────┐
│                     UI Layer (Compose)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │ Launcher │  │ Category │  │  Detail  │  │ Account │ │
│  │  Screen  │  │App Shell │  │  Screens │  │ Screens │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │              │              │              │      │
│  ┌────┴──────────────┴──────────────┴──────────────┴───┐ │
│  │                ViewModels (StateFlow)                │ │
│  └────┬──────────────┬──────────────┬──────────────┬───┘ │
├───────┼──────────────┼──────────────┼──────────────┼─────┤
│       │         Domain Layer        │              │      │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐  ┌────┴───┐ │
│  │ Use Cases│  │ Use Cases│  │ Use Cases│  │UseCases│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬───┘ │
├───────┼──────────────┼──────────────┼──────────────┼─────┤
│       │          Data Layer         │              │      │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐  ┌────┴───┐ │
│  │  Remote  │  │  Local   │  │Repository│  │DataStre│ │
│  │(Retrofit)│  │  (Room)  │  │(combines)│  │  (Auth)│ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Navigation Architecture
```
NavHost (root)
├── LauncherScreen (NO bottom nav)
│   ├── Electronics card → electronicsNavGraph
│   ├── Fashion card → fashionNavGraph
│   ├── Vehicles card → vehiclesNavGraph
│   └── Others card → othersNavGraph
│
├── electronicsNavGraph (WITH bottom nav)
│   ├── CategoryHome (hero banners, deals, featured)
│   ├── Subcategories
│   ├── ProductListing (AllPosts equivalent)
│   ├── ProductDetail
│   ├── Cart
│   ├── Wishlist
│   ├── Search
│   └── Profile/Account
│
├── fashionNavGraph (WITH bottom nav)     ← Same structure
├── vehiclesNavGraph (WITH bottom nav)    ← Same structure
├── othersNavGraph (WITH bottom nav)      ← Same structure
│
├── authNavGraph (NO bottom nav)
│   ├── Login
│   ├── Signup
│   ├── ForgotPassword
│   └── OtpVerification
│
├── checkoutNavGraph (NO bottom nav)
│   ├── AddressSelection
│   ├── PaymentMethod
│   ├── OrderReview
│   └── OrderConfirmation
│
├── chatNavGraph
│   ├── ConversationList
│   └── ChatDetail
│
└── settingsNavGraph
    ├── AccountSettings
    ├── NotificationPreferences
    └── SecuritySettings
```

---

## 5. FEATURE SPECIFICATION

### 5.1 Home Launcher Screen

**Web equivalent**: `CategoryHub.jsx`

**Requirements:**
- 4 large animated category cards (Electronics, Fashion, Vehicles, Others)
- Each card shows: emoji icon, title, tagline, description, gradient background
- Live stats per category (active listings count, new today)
- Welcome header with user greeting (if logged in)
- Theme/layout toggle (Dark mode, layout preview)
- **NO bottom navigation bar**
- Animated card tap → navigate to category app
- Pull-to-refresh to reload stats
- Search bar at top (global search)

**Data needed:**
```kotlin
data class CategoryApp(
    val key: String,           // "electronics", "fashion", "vehicles", "others"
    val label: String,
    val tagline: String,
    val description: String,
    val emoji: String,
    val gradientColors: List<Color>,
    val activeCount: Int,
    val newToday: Int,
    val newThisWeek: Int
)
```

### 5.2 Category App Shell

**Web equivalent**: `GreenNavbar.jsx` + `CategoryModeContext.jsx`

**Requirements:**
- **Top App Bar**: Category logo/title, search icon, cart icon (with badge count), notification bell, back-to-launcher button
- **Bottom Navigation** (5 tabs):
  - 🏠 Home (Category home with banners + featured)
  - 📂 Categories (Subcategory grid)
  - 🛒 Cart (with badge count)
  - ❤️ Wishlist
  - 👤 Profile / More
- Side drawer / hamburger menu with:
  - Dashboard, My Posts, Bought Posts, Sold Posts, Offers
  - Rewards, Chat, Channels
  - Settings, Logout
- Each category maintains independent navigation state
- Category-specific theming (colors change per app)

### 5.3 Category Home Page (per category — 4 variations)

**Web equivalent**: `AllPosts.jsx` + `GreenHeroBanner.jsx` + `DealsSection.jsx` + `FeaturedCentrePages.jsx`

**Sections (scrollable vertical list):**
1. **Hero Banner Carousel** — Auto-scrolling, CMS-driven images with page indicators
2. **Subcategory Chips** — Horizontal scroll, filterable
3. **Featured Products** — 2-column grid, first 8 items
4. **Deals of the Day** — Countdown timer, special pricing
5. **Trending Products** — Horizontal carousel
6. **Promotional Banner** — Mid-page ad/promo
7. **New Arrivals** — Recent listings section
8. **Brand Spotlight** — Featured sellers/brands
9. **Pull-to-Refresh** on entire page
10. **Shimmer skeleton** while loading

### 5.4 Subcategory Page

**Web equivalent**: `Subcategories.jsx`

**Requirements:**
- Grid of subcategories with images
- Subcategory banner at top
- Breadcrumb: Electronics > Phones > Smartphones
- Item count per subcategory
- Tap → navigate to filtered product listing

### 5.5 Product Listing Page (PLP)

**Web equivalent**: `AllPosts.jsx` (4,166 lines in web app — it's massive)

**Requirements:**
- Product cards in grid (2-column) or list (1-column) — toggle button
- Each card shows: image, title, price, original price, discount %, rating stars, seller trust badge
- **Filter drawer** (bottom sheet):
  - Price range slider (min/max)
  - Brand/seller checkboxes
  - Rating filter (min stars)
  - Condition (New/Used/Refurbished)
  - Availability toggle
  - Location radius
- **Sort dropdown**: Price Low→High, Price High→Low, Popularity, Newest, Rating
- Quick "Add to Cart" button on card
- Wishlist heart icon on card (toggle)
- Product count: "Showing X of Y results"
- Infinite scroll with lazy pagination
- Active filter chips (removable)
- No-results state with illustration
- Loading shimmer skeleton
- Promoted/Sponsored listing badges

### 5.6 Product Detail Page (PDP)

**Web equivalent**: `PostDetail.jsx` (one of the largest pages)

**Requirements:**
- Image gallery carousel with:
  - Pinch-to-zoom
  - Thumbnails strip
  - Full-screen view
  - Image count indicator
- Product title + price block:
  - Sale price (large)
  - Original price (strikethrough)
  - Discount percentage badge
  - Tier badge (Bronze/Silver/Premium)
- Rating stars + review count
- Seller info card: name, avatar, trust score, verified badge, location
- Color/variant selector (swatches)
- Size variant selector
- Quantity selector (+/-)
- **Primary CTAs:**
  - "Add to Cart" button
  - "Buy Now" button
  - "Make Offer" button → opens negotiation modal
  - "Add to Wishlist" heart icon
- Expandable product description (with "Read more" toggle)
- Specifications table (key-value pairs)
- Customer reviews list with:
  - Star rating per review
  - Review text
  - Reviewer name + avatar
  - Review date
  - "Write a Review" button → form
- Related products carousel ("You may also like")
- Share button (Android share sheet)
- Delivery/shipping info section
- Return policy section
- Stock status indicator
- Report button
- Auto-save to "Recently Viewed" (Room DB)

### 5.7 Cart Page

**Web equivalent**: `Cart.jsx` + `CartContext.jsx`

**Requirements:**
- Cart items list with:
  - Product image thumbnail
  - Title + variant info
  - Price per unit
  - Quantity selector (+/-)
  - Remove button
  - Swipe-to-remove with undo Snackbar
- Price summary card:
  - Subtotal
  - Tax (GST)
  - Shipping fee
  - Discount
  - **Total** (bold)
- Coupon/promo code input with "Apply" button
- "Proceed to Checkout" button (primary CTA)
- "Continue Shopping" link
- Empty cart state: illustration + "Your cart is empty" + "Browse Products" CTA
- "Save for Later" section
- Cart badge updates on bottom nav in real-time
- Multi-seller grouping (items grouped by seller)

### 5.8 Wishlist Page

**Web equivalent**: `Wishlist.jsx`

**Requirements:**
- Wishlist items in grid view
- Each item: image, title, price, "Move to Cart" button, "Remove" button
- Notes per item (user can add personal notes)
- Share wishlist functionality (native share)
- Empty wishlist state: illustration + "No saved items" + "Start Shopping" CTA
- Bulk actions: Select all, Remove selected
- Price change alert indicator

### 5.9 Recently Viewed

**Web equivalent**: `RecentlyViewed.jsx`

**Requirements:**
- Items in reverse chronological order
- Tap to open product detail
- "Clear All" button with confirmation
- Empty state
- Persisted in Room DB (survives app restart)
- Maximum 50 items (auto-prune oldest)

### 5.10 Checkout Flow (4-step)

**Web equivalent**: `Payments/` folder

**Steps:**
1. **Address Selection**
   - List of saved addresses (Room DB)
   - "Add New Address" form with validation
   - Address fields: Name, Phone, Line 1, Line 2, City, State, PIN, Landmark
   - GPS auto-fill option
   - Default address selection

2. **Payment Method**
   - Options: Credit/Debit Card, UPI, Net Banking, COD
   - Saved cards list
   - "Add New Card" form with validation
   - Card number formatting (XXXX XXXX XXXX XXXX)
   - CVV masked input
   - Expiry date picker

3. **Order Review**
   - Items summary (scrollable)
   - Selected address card
   - Selected payment method
   - Price breakdown (subtotal, tax, shipping, discount, total)
   - "Place Order" button with loading state

4. **Order Confirmation**
   - Success animation (Lottie)
   - Order ID
   - Estimated delivery date
   - "Continue Shopping" button
   - "View Order" button

   **Order Failed** state: Error message + "Retry" button + "Contact Support" link

### 5.11 User Profile / Account

**Web equivalent**: `Profile.jsx` + `Dashboard.jsx` + `SellerDashboard.jsx`

**Screens:**
- **Profile Header**: Avatar (camera/gallery change), name, email, phone, bio
- **Edit Profile**: Form with all fields + validation
- **Seller Dashboard**: Active listings, total views, total sales, coins earned, charts
- **Order History**: List with status badges (Pending, Shipped, Delivered, Cancelled)
- **Order Detail**: Items, tracking timeline, delivery status
- **Address Book**: List, add, edit, delete addresses
- **Saved Payment Methods**: List, add, delete cards
- **Notification Preferences**: Toggle switches per notification type
- **App Settings**: Theme (Light/Dark/System), Language, Page density, Large font
- **Security Settings**: Change password, Biometric toggle, 2FA
- **Logout** with confirmation dialog
- **Delete Account** with confirmation dialog and data warning

### 5.12 Authentication

**Web equivalent**: `Auth/` folder (Login.jsx, SignUp.jsx, ForgotPassword.jsx)

**Screens:**
- **Login**: Email/phone + password, form validation, "Forgot Password" link, "Sign Up" link, Google Sign-In, Biometric login (if enabled)
- **Sign Up**: Name, email, phone, password, confirm password, Aadhaar (optional), PAN (optional), terms checkbox, referral code
- **Forgot Password**: Email input → sends reset link → confirmation message
- **OTP Verification**: 6-digit OTP input with auto-read + resend timer
- **Form validation**: Real-time field validation with accessible error messages

### 5.13 Search

**Web equivalent**: `SearchPage.jsx`

**Requirements:**
- Search bar with text input + clear button + voice search mic icon
- Autocomplete suggestions dropdown (debounced API calls)
- Search results using PLP layout (grid + filters + sort)
- Recent searches list (Room DB, up to 20)
- Popular/trending searches section
- Saved searches (persist filter combinations)
- No results state: "No results for '{query}'" + suggestions
- Voice search (Android SpeechRecognizer)
- Keyboard auto-hide on search submit

### 5.14 Chat

**Web equivalent**: `Chat.jsx` + `useRealtimeChat.js`

**Requirements:**
- Conversation list: avatar, name, last message, timestamp, unread badge
- Chat detail: message bubbles, timestamp, read receipts
- Text input with send button
- Typing indicator ("User is typing...")
- Online/offline status indicator
- Linked to product (show product card at top of chat)
- Image sharing in chat
- Real-time via Socket.io
- Push notification for new messages
- Haptic feedback on send

### 5.15 Notifications

**Web equivalent**: `Notifications.jsx`

**Requirements:**
- Notification list grouped by date
- Each notification: icon, title, message, timestamp, read/unread dot
- Notification types: Order updates, Offers, Promos, System
- Tap to navigate to relevant screen
- "Mark All as Read" button
- "Clear All" button
- Empty state
- Pull-to-refresh
- Clear native notification tray when viewing

### 5.16 Offers / Negotiation

**Web equivalent**: `Offers.jsx`

**Requirements:**
- Tabs: Received (as seller), Sent (as buyer), All
- Offer card: product image, buyer/seller name, amount, status badge, timestamp
- Status flow: Pending → Accepted/Rejected/Countered → Paid → Completed
- Counter-offer: Amount input + message
- Accept/Reject buttons with haptic feedback
- Transaction flow after acceptance

### 5.17 Post Creation & Editing

**Web equivalent**: `AddPost.jsx` + `EditPost.jsx`

**Requirements:**
- Multi-step form or scrollable form
- Image upload (camera + gallery, tier-limited: Basic=1, Bronze=3, Silver=5, Premium=10)
- Title, description (rich text), price, condition, category/subcategory selectors
- Location auto-detect or manual selection
- Tags input
- Audio description recording (optional)
- Preview before publish
- Draft saving (Room DB)
- Edit post (pre-fill all fields)

### 5.18 Social Feed

**Web equivalent**: `FeedPage.jsx`, `ForYou.jsx`, `MyFeedPage.jsx`

**Requirements:**
- Post feed (image + text + engagement)
- Like, Share, Comment actions
- For You algorithm-based feed
- My Feed (followed sellers/channels)
- Pull-to-refresh
- Infinite scroll

### 5.19 Channels / CentrePages

**Web equivalent**: `ChannelsListPage.jsx`, `ChannelPage.jsx`, `CentreListings.jsx`, `CreateChannelPage.jsx`

**Requirements:**
- Channel listing page
- Channel detail page (banner, info, listings)
- Centre/Storefront pages
- Create channel form (premium feature)
- Follow/Unfollow channel

### 5.20 Rewards / Coins

**Web equivalent**: `Rewards.jsx`

**Requirements:**
- Coin balance display
- Earn history (sales, referrals, achievements)
- Redeem options (post boosts, premium features)
- Referral sharing
- Gamification badges

### 5.21 Static / Info Pages

**Web equivalent**: Various legal pages

**Pages:**
- About Us
- Terms & Conditions
- Privacy Policy
- Refund Policy
- Contact Us
- FAQ (searchable)
- Shipping Policy
- Return Policy
- Support Ticket Policy

---

## 6. DATA MODELS

### Room Database Entities

```kotlin
// Cart Item (persisted locally, synced with server)
@Entity(tableName = "cart_items")
data class CartItemEntity(
    @PrimaryKey val id: String,
    val postId: String,
    val title: String,
    val price: Double,
    val currency: String = "INR",
    val quantity: Int,
    val imageUrl: String,
    val category: String,
    val categoryGroup: String,
    val sellerId: String,
    val sellerName: String,
    val variant: String? = null,
    val addedAt: Long = System.currentTimeMillis()
)

// Wishlist Item
@Entity(tableName = "wishlist_items")
data class WishlistItemEntity(
    @PrimaryKey val postId: String,
    val title: String,
    val price: Double,
    val imageUrl: String,
    val category: String,
    val note: String? = null,
    val savedAt: Long = System.currentTimeMillis()
)

// Recently Viewed
@Entity(tableName = "recently_viewed")
data class RecentlyViewedEntity(
    @PrimaryKey val postId: String,
    val title: String,
    val price: Double,
    val imageUrl: String,
    val category: String,
    val viewedAt: Long = System.currentTimeMillis()
)

// Search History
@Entity(tableName = "search_history")
data class SearchHistoryEntity(
    @PrimaryKey val query: String,
    val searchedAt: Long = System.currentTimeMillis()
)

// Saved Address
@Entity(tableName = "addresses")
data class AddressEntity(
    @PrimaryKey val id: String,
    val name: String,
    val phone: String,
    val line1: String,
    val line2: String?,
    val city: String,
    val state: String,
    val pinCode: String,
    val landmark: String?,
    val isDefault: Boolean = false,
    val latitude: Double?,
    val longitude: Double?
)

// Draft Post (for offline saving)
@Entity(tableName = "post_drafts")
data class PostDraftEntity(
    @PrimaryKey val id: String,
    val title: String?,
    val description: String?,
    val price: Double?,
    val category: String?,
    val subcategory: String?,
    val condition: String?,
    val imageUris: String?, // JSON array of local URIs
    val savedAt: Long = System.currentTimeMillis()
)

// Notification (local cache)
@Entity(tableName = "notifications")
data class NotificationEntity(
    @PrimaryKey val id: String,
    val title: String,
    val message: String,
    val type: String, // order, offer, promo, system
    val actionRoute: String?,
    val isRead: Boolean = false,
    val createdAt: Long
)
```

### API Response Models

```kotlin
// Product/Post
data class Post(
    val id: String,
    val title: String,
    val description: String,
    val price: Double,
    val originalPrice: Double?,
    val currency: String,
    val category: String,
    val categoryId: String?,
    val categoryGroup: String, // electronics/fashion/vehicles/others
    val subcategory: String?,
    val condition: String?, // new/used/refurbished
    val images: List<MediaItem>,
    val sellerId: String,
    val sellerName: String,
    val sellerAvatar: String?,
    val sellerTrustScore: Int?,
    val location: String?,
    val city: String?,
    val latitude: Double?,
    val longitude: Double?,
    val rating: Double?,
    val viewCount: Int,
    val likedCount: Int,
    val savedCount: Int,
    val promoted: Boolean,
    val tier: String, // basic/bronze/silver/premium
    val status: String, // active/sold/draft
    val createdAt: String,
    val publishedAt: String?,
    val expiresAt: String?
)

data class MediaItem(
    val url: String,
    val type: String, // image/video
    val thumbnailUrl: String?
)

// Category
data class Category(
    val id: String,
    val name: String,
    val group: String, // electronics/fashion/vehicles/others
    val imageUrl: String?,
    val postCount: Int,
    val subcategories: List<Subcategory>?
)

data class Subcategory(
    val id: String,
    val name: String,
    val categoryId: String,
    val imageUrl: String?,
    val postCount: Int
)

// User
data class User(
    val id: String,
    val name: String,
    val email: String?,
    val phone: String?,
    val avatar: String?,
    val bio: String?,
    val location: String?,
    val verified: Boolean,
    val trustScore: Int,
    val activeListings: Int,
    val totalSales: Int,
    val coinsEarned: Int,
    val tier: String,
    val roles: List<String>
)

// Offer
data class Offer(
    val id: String,
    val postId: String,
    val buyerId: String,
    val sellerId: String,
    val amount: Double,
    val currency: String,
    val status: String, // pending/accepted/rejected/countered/paid/completed
    val message: String?,
    val createdAt: String,
    val expiresAt: String?,
    val post: Post? // embedded post info
)

// Notification
data class Notification(
    val id: String,
    val title: String,
    val message: String,
    val type: String,
    val actionRoute: String?,
    val isRead: Boolean,
    val createdAt: String
)

// Paginated Response
data class PaginatedResponse<T>(
    val items: List<T>,
    val total: Int,
    val page: Int,
    val pageSize: Int,
    val hasMore: Boolean
)

// Auth
data class LoginRequest(val email: String, val password: String)
data class SignupRequest(val name: String, val email: String, val phone: String, val password: String)
data class AuthResponse(val token: String, val refreshToken: String, val user: User)
```

---

## 7. API INTEGRATION

### Base Configuration

```
Base URL: configured via BuildConfig / environment
Auth: Bearer token in Authorization header
Refresh: Auto-refresh on 401 via Authenticator
Content-Type: application/json (except file uploads: multipart/form-data)
```

### Endpoints to Implement

| Method | Endpoint | Description | Priority |
|--------|----------|-------------|----------|
| `POST` | `/auth/login` | Login | Sprint 9 |
| `POST` | `/auth/signup` | Register | Sprint 9 |
| `POST` | `/auth/forgot-password` | Password reset | Sprint 9 |
| `POST` | `/auth/verify-otp` | OTP verification | Sprint 9 |
| `POST` | `/auth/refresh` | Token refresh | Sprint 0 |
| `GET` | `/categories` | All categories | Sprint 1 |
| `GET` | `/subcategories/:catId` | Subcategories | Sprint 3 |
| `GET` | `/posts` | List posts (paginated, filtered) | Sprint 4 |
| `GET` | `/posts/:id` | Post detail | Sprint 5 |
| `POST` | `/posts` | Create post | Sprint 8 |
| `PUT` | `/posts/:id` | Update post | Sprint 8 |
| `DELETE` | `/posts/:id` | Delete post | Sprint 8 |
| `GET` | `/cart` | Get cart | Sprint 6 |
| `POST` | `/cart` | Add to cart | Sprint 6 |
| `PUT` | `/cart/:itemId` | Update quantity | Sprint 6 |
| `DELETE` | `/cart/:itemId` | Remove from cart | Sprint 6 |
| `GET` | `/wishlist` | Get wishlist | Sprint 6 |
| `POST` | `/wishlist` | Save to wishlist | Sprint 6 |
| `DELETE` | `/wishlist/:postId` | Remove from wishlist | Sprint 6 |
| `GET` | `/offers` | List offers | Sprint 8 |
| `POST` | `/offers` | Create offer | Sprint 8 |
| `PUT` | `/offers/:id` | Update offer | Sprint 8 |
| `GET` | `/users/:id` | User profile | Sprint 8 |
| `PUT` | `/users/:id` | Update profile | Sprint 8 |
| `GET` | `/notifications` | Notifications | Sprint 11 |
| `PUT` | `/notifications/:id` | Mark read | Sprint 11 |
| `GET` | `/chat/conversations` | Chat list | Sprint 8 |
| `GET` | `/chat/:id` | Chat messages | Sprint 8 |
| `POST` | `/chat/send` | Send message | Sprint 8 |
| `GET` | `/search` | Search posts | Sprint 10 |
| `GET` | `/banner` | Hero banners | Sprint 3 |
| `GET` | `/reviews` | Reviews | Sprint 5 |
| `POST` | `/reviews` | Write review | Sprint 5 |
| `GET` | `/rewards` | Rewards | Sprint 8 |
| `POST` | `/payment/checkout` | Payment | Sprint 7 |
| `GET` | `/bought-posts` | Purchases | Sprint 8 |
| `GET` | `/sold-posts` | Sales | Sprint 8 |
| `GET` | `/channels` | Channels | Sprint 8 |
| `GET` | `/recently-viewed` | History | Sprint 6 |

### Mock Data Strategy
For features where the backend API is not yet available, create **realistic mock data** in the repository layer:
- 50+ sample products per category with real-looking titles, descriptions, prices
- 10+ subcategories per category
- 5+ sample reviews per product
- Sample hero banners with placeholder images from `picsum.photos`
- Sample user profiles, chat messages, notifications

---

## 8. SPRINT PLAN

### Sprint 0: Architecture Foundation (Week 1)
**Goal**: Set up the entire project skeleton so all future work builds on solid foundations.

**Tasks:**
- [ ] Create new Kotlin + Jetpack Compose project (or convert existing Capacitor shell)
- [ ] Configure `build.gradle` with all dependencies (Compose, Hilt, Room, Retrofit, Coil, Navigation)
- [ ] Set up Hilt DI module structure (`NetworkModule`, `DatabaseModule`, `RepositoryModule`)
- [ ] Create Room database with all entity tables (Cart, Wishlist, RecentlyViewed, SearchHistory, Addresses, Drafts, Notifications)
- [ ] Create Retrofit API service interface with all endpoints
- [ ] Create OkHttp client with auth interceptor + token refresh
- [ ] Create repository pattern (each domain gets a Repository class)
- [ ] Set up Material 3 theme with:
  - Color scheme per category app (4 themes)
  - Typography scale
  - Shape system
  - Dark mode support
- [ ] Create shared UI components:
  - `MHubTopBar` (configurable per screen)
  - `MHubBottomNav` (5 tabs with badge support)
  - `ShimmerLoader` (reusable shimmer effect)
  - `EmptyStateView` (illustration + message + CTA)
  - `ErrorStateView` (error message + retry button)
  - `LoadingStateView` (full-screen shimmer)
  - `ProductCard` (grid + list variants)
  - `PriceDisplay` (sale price + original + discount)
  - `RatingStars` (1-5 stars display)
  - `CategoryChip` (filterable chip)
  - `ImageCarousel` (with page indicators)
  - `PullToRefreshContainer`
- [ ] Set up Navigation Compose with root NavHost
- [ ] Create `DataStore` for auth tokens + user preferences
- [ ] Create mock data generators for all content types
- [ ] Verify project builds and runs

**Deliverable**: Empty app that compiles, has DI wired, DB tables created, API configured, theme applied, and shared components ready.

---

### Sprint 1: Home Launcher (Week 2)
**Goal**: Build the gorgeous 4-card launcher screen.

**Tasks:**
- [ ] Create `LauncherScreen` composable
- [ ] Create `LauncherViewModel` with:
  - Category stats loading (from API or mock)
  - User greeting (if logged in)
  - Pull-to-refresh state
- [ ] Build 4 category app cards with:
  - Gradient backgrounds per category
  - Emoji + title + tagline + description
  - Live stats (active count, new today)
  - Animated tap effect (scale + ripple)
- [ ] Welcome header with:
  - User avatar + "Hello, {name}!" (or "Welcome to MHub!")
  - Search bar (navigates to search screen on tap)
  - Dark mode toggle
- [ ] Animated transition when entering category app (shared element or fade)
- [ ] **NO bottom nav** on this screen
- [ ] Loading state: 4 shimmer cards
- [ ] Error state: retry button
- [ ] Pull-to-refresh support
- [ ] Accessibility: contentDescription on all cards, 48dp touch targets, proper heading hierarchy

**Deliverable**: User can see 4 beautiful category cards and tap to navigate (to placeholder screens).

---

### Sprint 2: Category App Shell (Week 3)
**Goal**: Build the per-category shell with top bar, bottom nav, and navigation graph.

**Tasks:**
- [ ] Create `CategoryAppShell` composable wrapper:
  - Top App Bar: back-to-launcher, category title, search icon, cart badge, notification bell
  - Bottom Navigation: Home, Categories, Cart, Wishlist, Profile
  - Scaffold with navController per category
- [ ] Create 4 independent `NavGraph`s (electronics, fashion, vehicles, others) with shared route definitions
- [ ] Create `CategoryAppViewModel` with:
  - Active category state
  - Cart count (for badge)
  - Notification count (for badge)
- [ ] Build side drawer / hamburger menu with navigation items:
  - Dashboard, My Posts, Bought Posts, Sold Posts
  - Offers, Rewards, Chat, Channels
  - Settings, Help, Logout
- [ ] Implement category-specific theming (colors change based on active category)
- [ ] Handle back navigation: back button in category goes back in category stack, at root goes to launcher
- [ ] Accessibility: labeled navigation, focus management

**Deliverable**: User can enter any category, see the app shell with top bar + bottom nav + drawer, navigate between tabs.

---

### Sprint 3: Category Home Pages (Week 4-5)
**Goal**: Build the rich, content-filled home page for each category.

**Tasks:**
- [ ] Create `CategoryHomeScreen` composable with LazyColumn:
  - Hero banner carousel (3-5 banners, auto-scroll every 4s, page indicator dots)
  - Subcategory horizontal chip scroll
  - Featured products section (2-column grid, 8 items)
  - Deals of the day section (countdown timer + special cards)
  - Trending products horizontal carousel
  - Promotional mid-page banner
  - New arrivals section
  - Brand spotlight section
- [ ] Create `CategoryHomeViewModel` with:
  - Banner data (from CMS API or mock)
  - Subcategories list
  - Featured products
  - Deals with expiry time
  - Trending products
  - New arrivals
  - Combined loading/error/empty states
- [ ] Create subcategory detail screen: grid of subcategories with images, breadcrumb, item count
- [ ] Build `HeroBannerCarousel` component with auto-scroll + manual swipe + indicators
- [ ] Build `DealsCountdownTimer` component (days:hours:minutes:seconds)
- [ ] Build `ProductCarousel` horizontal scrollable row
- [ ] Build `SectionHeader` with title + "See All" link
- [ ] Loading state: shimmer for each section
- [ ] Error state per section (partial loading OK)
- [ ] Pull-to-refresh reloads all sections
- [ ] Accessibility: image descriptions, carousel announcements

**Deliverable**: Rich category home pages with banners, deals, featured products, subcategories.

---

### Sprint 4: Subcategory + Product Listing (Week 6-7)
**Goal**: Build the full product browsing experience with filters, sorting, and pagination.

**Tasks:**
- [ ] Create `SubcategoryScreen`:
  - Grid of subcategory cards with images
  - Banner at top
  - Breadcrumb navigation
  - Item count per subcategory
- [ ] Create `ProductListingScreen` (the big one):
  - Product grid (2-column) / list (1-column) toggle
  - Product count header
  - Active filter chips (removable)
  - Sort dropdown button
  - Filter button (opens bottom sheet)
- [ ] Create `ProductListingViewModel`:
  - Paginated data loading (page-based or cursor-based)
  - Filter state (price range, category, condition, rating, location)
  - Sort state
  - Grid/list toggle state
  - Infinite scroll support
  - No-results detection
- [ ] Create `FilterBottomSheet`:
  - Price range slider (min/max)
  - Condition checkboxes
  - Rating filter (star selector)
  - Availability toggle
  - Brand/seller filter
  - "Apply" + "Clear All" buttons
- [ ] Create `SortBottomSheet`:
  - Price Low→High
  - Price High→Low
  - Most Popular
  - Newest First
  - Highest Rated
- [ ] Create `ProductGridCard` + `ProductListCard` components
- [ ] Implement infinite scroll with `LazyVerticalGrid` + pagination trigger
- [ ] Quick "Add to Cart" button on product card
- [ ] Wishlist heart toggle on product card
- [ ] Promoted/Sponsored badge on cards
- [ ] Loading shimmer for initial load + pagination
- [ ] Empty state: "No products found"
- [ ] Error state: "Failed to load" + retry
- [ ] Accessibility: filter descriptions, result count announced

**Deliverable**: Full product browsing with filters, sort, grid/list, infinite scroll, add-to-cart, wishlist.

---

### Sprint 5: Product Detail Page (Week 8-9)
**Goal**: Build the complete product detail experience.

**Tasks:**
- [ ] Create `ProductDetailScreen` with scrollable content:
  - Image gallery carousel (HorizontalPager + thumbnails)
  - Pinch-to-zoom support (ZoomableImage)
  - Full-screen image viewer
  - Product title + price block
  - Seller info card
  - Variant selectors (color swatches, size pills)
  - Quantity selector
  - CTA buttons (Add to Cart, Buy Now, Make Offer)
  - Expandable description
  - Specifications table
  - Reviews section
  - Related products carousel
  - Share button
  - Report button
- [ ] Create `ProductDetailViewModel`:
  - Product data loading
  - Cart operations
  - Wishlist operations
  - Review loading + submission
  - Related products loading
  - Recently Viewed auto-save
- [ ] Create `MakeOfferModal` (bottom sheet):
  - Amount input
  - Message input
  - Submit button
- [ ] Create `WriteReviewSheet`:
  - Star rating selector
  - Review text input
  - Submit button
- [ ] Create `ImageZoomViewer` (full-screen pinch-to-zoom)
- [ ] Create `SellerInfoCard` (avatar, name, trust score, verified badge)
- [ ] Create `SpecificationsTable` (key-value rows)
- [ ] Create `ReviewCard` (stars, text, user, date)
- [ ] Share via Android share sheet (Intent.ACTION_SEND)
- [ ] Auto-save to Recently Viewed on view
- [ ] Loading shimmer for entire page
- [ ] Error state with retry
- [ ] Accessibility: image descriptions, price announced, variant labels

**Deliverable**: Complete product detail with gallery, variants, cart/wishlist, offers, reviews, share.

---

### Sprint 6: Cart + Wishlist + Recently Viewed (Week 10)
**Goal**: Build the shopping list management features.

**Tasks:**
- [ ] Create `CartScreen`:
  - Cart items list (LazyColumn)
  - Per-item: image, title, variant, price, quantity (+/-), remove
  - Swipe-to-remove with Undo snackbar
  - Price summary card
  - Coupon input + apply
  - "Proceed to Checkout" button
  - Empty cart state
  - "Save for Later" section
- [ ] Create `CartViewModel`:
  - Items from Room DB + API sync
  - Quantity update
  - Remove item
  - Price calculation
  - Coupon validation
- [ ] Create `WishlistScreen`:
  - Grid of wishlist items
  - "Move to Cart" per item
  - "Remove" per item
  - Notes per item
  - Share wishlist
  - Empty state
- [ ] Create `WishlistViewModel`:
  - Items from Room DB + API sync
  - Move to cart operation
  - Remove operation
- [ ] Create `RecentlyViewedScreen`:
  - Chronological list
  - Tap to open detail
  - Clear all
  - Empty state
- [ ] Update bottom nav cart badge to show real count
- [ ] Persist all data in Room DB
- [ ] Sync with server on network availability

**Deliverable**: Full cart management, wishlist, recently viewed — all persisted locally.

---

### Sprint 7: Checkout Flow (Week 11-12)
**Goal**: Build the complete 4-step checkout.

**Tasks:**
- [ ] Create step progress indicator component
- [ ] Create `AddressSelectionScreen`:
  - Saved addresses list
  - "Add New Address" form
  - GPS auto-fill button
  - Validation (all required fields)
  - Default address radio selection
- [ ] Create `PaymentMethodScreen`:
  - Payment options: Card, UPI, Net Banking, COD
  - Saved cards list
  - "Add New Card" form
  - Card number formatting + validation
- [ ] Create `OrderReviewScreen`:
  - Items summary
  - Address card
  - Payment method card
  - Price breakdown
  - "Place Order" button with loading state
- [ ] Create `OrderConfirmationScreen`:
  - Success state: animation, order ID, estimated delivery
  - Failed state: error message, retry, contact support
- [ ] Create `CheckoutViewModel`:
  - Step management
  - Address CRUD
  - Payment method selection
  - Order placement API call
- [ ] Persist addresses in Room DB
- [ ] Handle payment errors gracefully

**Deliverable**: Complete checkout from address → payment → review → confirmation.

---

### Sprint 8: Profile, Account & Seller Features (Week 13-14)
**Goal**: Build all user account and seller management screens.

**Tasks:**
- [ ] Create `ProfileScreen` (header + menu items)
- [ ] Create `EditProfileScreen` (form with validation)
- [ ] Create `SellerDashboardScreen` (analytics, listings, charts)
- [ ] Create `OrderHistoryScreen` (list with status badges)
- [ ] Create `OrderDetailScreen` (items + tracking timeline)
- [ ] Create `AddressBookScreen` (CRUD)
- [ ] Create `SettingsScreen` (theme, language, density, font size)
- [ ] Create `SecuritySettingsScreen` (password, biometric, 2FA)
- [ ] Create `OffersScreen` (tabs: received/sent/all, counter, accept/reject)
- [ ] Create `CreatePostScreen` (multi-step form, camera, tiers)
- [ ] Create `EditPostScreen` (pre-filled form)
- [ ] Create `MyPostsScreen` (user's listings)
- [ ] Create `BoughtPostsScreen` (purchases)
- [ ] Create `SoldPostsScreen` (sales)
- [ ] Create `RewardsScreen` (balance, earn/redeem, referral)
- [ ] Create `ChatListScreen` + `ChatDetailScreen` (real-time)
- [ ] Create `ChannelsScreen` + `ChannelDetailScreen`
- [ ] Logout + Delete Account with confirmation
- [ ] Haptic feedback on all interactive elements

**Deliverable**: Complete user account management and seller tools.

---

### Sprint 9: Authentication (Week 15)
**Goal**: Build the full auth flow.

**Tasks:**
- [ ] Create `LoginScreen`:
  - Email/phone + password fields
  - "Remember me" toggle
  - "Forgot Password" link
  - Google Sign-In button
  - Biometric login button (if enabled)
  - Form validation with error messages
- [ ] Create `SignupScreen`:
  - Full registration form
  - Aadhaar + PAN validation (Indian formats)
  - Terms checkbox
  - Referral code input
- [ ] Create `ForgotPasswordScreen`:
  - Email input
  - Send reset link
  - Confirmation message
- [ ] Create `OtpVerificationScreen`:
  - 6-digit OTP input boxes
  - Auto-read from SMS
  - Resend timer (60s countdown)
- [ ] Create `AuthViewModel`:
  - Login/signup/forgot API calls
  - Token storage in DataStore
  - Biometric setup
  - Google Sign-In integration
- [ ] Implement auth interceptor (add token to requests)
- [ ] Implement token refresh on 401
- [ ] Protected routes: redirect to login if not authenticated

**Deliverable**: Full authentication with login, signup, OTP, biometric, Google sign-in.

---

### Sprint 10: Search (Week 16)
**Goal**: Build the full search experience.

**Tasks:**
- [ ] Create `SearchScreen`:
  - Search bar with input + clear + mic icon
  - Autocomplete suggestions list
  - Recent searches (from Room DB)
  - Popular/trending searches
  - Search results (reuse PLP components)
  - No results state
- [ ] Create `SearchViewModel`:
  - Debounced search (300ms)
  - Autocomplete API call
  - Results with pagination
  - Recent searches CRUD (Room DB)
  - Saved searches
- [ ] Voice search integration (Android SpeechRecognizer)
- [ ] Keyboard auto-hide on submit
- [ ] Search history persistence (Room DB, 20 items max)

**Deliverable**: Full search with autocomplete, voice, history, results with filters.

---

### Sprint 11: Notifications + Static Pages (Week 17)
**Goal**: Build notifications and all informational pages.

**Tasks:**
- [ ] Create `NotificationScreen`:
  - Grouped by date
  - Icon + title + message + timestamp + read indicator
  - Tap to navigate
  - Mark all read
  - Clear all
  - Pull-to-refresh
  - Empty state
- [ ] Create `NotificationViewModel` with Room DB cache
- [ ] Push notification integration (FCM):
  - Background notifications
  - Notification tap handling
  - Badge clearing
- [ ] Create static pages (WebView or native text):
  - About Us
  - Terms & Conditions
  - Privacy Policy
  - Refund Policy
  - Contact Us
  - FAQ (with search)
  - Shipping Policy
  - Return Policy
- [ ] Integrate with notification bell badge on top bar

**Deliverable**: Complete notification system + all legal/info pages.

---

### Sprint 12: Full Audit Pass (Week 18)
**Goal**: Achieve 100/100 on every single screen.

**Tasks:**
- [ ] **Accessibility audit** (every screen):
  - All images have `contentDescription`
  - All touch targets ≥ 48dp × 48dp
  - Color contrast ≥ 4.5:1 (normal text), ≥ 3:1 (large text)
  - Logical focus/tab order
  - TalkBack compatible (all actions/states announced)
  - Heading hierarchy (`semantics { heading() }`)
  - Form fields have visible labels
  - Error messages associated with fields
- [ ] **Performance audit** (every screen):
  - LazyColumn/LazyGrid with stable keys on all lists
  - Efficient Coil image loading with disk cache
  - No scroll jank (60fps verified)
  - Minimal recompositions (verify with Layout Inspector)
  - No memory leaks (verify with Profiler)
- [ ] **UX states audit** (every screen):
  - Loading state: shimmer/skeleton
  - Error state: message + retry button
  - Empty state: illustration + message + CTA
  - Pull-to-refresh where applicable
- [ ] **Visual audit** (every screen):
  - Consistent Material 3 theme
  - Dark mode renders correctly
  - Works on phone + tablet
  - No clipping, overflow, or broken layouts
- [ ] **Test on real devices**:
  - Small phone (360dp width)
  - Large phone (412dp width)
  - Tablet (600dp+ width)
  - Android 8+ (API 26+)
- [ ] Fix all issues found
- [ ] Create audit report

**Deliverable**: Every screen passes 100/100 accessibility + performance audit.

---

## 9. 100/100 AUDIT REQUIREMENTS

### Accessibility Checklist (Per Screen)

| # | Requirement | How to Verify |
|---|-------------|---------------|
| 1 | All images/icons have `contentDescription` | Compose lint + TalkBack |
| 2 | All touch targets ≥ 48dp × 48dp | Layout Inspector |
| 3 | Color contrast ≥ 4.5:1 (body text) | Accessibility Scanner |
| 4 | Color contrast ≥ 3:1 (large text / UI elements) | Accessibility Scanner |
| 5 | Logical focus/tab order | External keyboard testing |
| 6 | TalkBack reads all interactive elements | TalkBack on device |
| 7 | TalkBack announces state changes | TalkBack on device |
| 8 | Headings use `semantics { heading() }` | Code review |
| 9 | Form fields have visible labels (not just placeholder) | Visual check |
| 10 | Error messages associated with input fields | TalkBack on error |
| 11 | Loading states announced to screen readers | `LiveRegion` check |
| 12 | Dialogs trap focus correctly | Keyboard + TalkBack |

### Performance Checklist (Per Screen)

| # | Requirement | How to Verify |
|---|-------------|---------------|
| 1 | Lists use `LazyColumn`/`LazyGrid` with `key` | Code review |
| 2 | Images loaded via Coil with `diskCachePolicy(ENABLED)` | Network tab |
| 3 | No scroll jank (consistent 60fps) | GPU profiler |
| 4 | Minimal recompositions | Compose debugger |
| 5 | No memory leaks | Android Profiler |
| 6 | Screen loads in < 2 seconds | Stopwatch |
| 7 | Animations use `animateAsState` (not blocking main thread) | Code review |

### UX States Checklist (Per Screen)

| # | Requirement | How to Verify |
|---|-------------|---------------|
| 1 | Loading state shown while data loads | Toggle airplane mode |
| 2 | Error state shown on failure (message + retry) | Force error |
| 3 | Empty state shown when no data (illustration + CTA) | Empty response |
| 4 | Pull-to-refresh on data screens | Swipe down |
| 5 | Smooth transitions between states | Visual check |

---

## 10. FILE STRUCTURE

```
app/src/main/java/com/mhub/app/
├── di/                              # Hilt modules
│   ├── NetworkModule.kt
│   ├── DatabaseModule.kt
│   └── RepositoryModule.kt
│
├── data/                            # Data layer
│   ├── local/                       # Room database
│   │   ├── MHubDatabase.kt
│   │   ├── dao/
│   │   │   ├── CartDao.kt
│   │   │   ├── WishlistDao.kt
│   │   │   ├── RecentlyViewedDao.kt
│   │   │   ├── SearchHistoryDao.kt
│   │   │   ├── AddressDao.kt
│   │   │   ├── PostDraftDao.kt
│   │   │   └── NotificationDao.kt
│   │   └── entity/
│   │       ├── CartItemEntity.kt
│   │       ├── WishlistItemEntity.kt
│   │       ├── RecentlyViewedEntity.kt
│   │       ├── SearchHistoryEntity.kt
│   │       ├── AddressEntity.kt
│   │       ├── PostDraftEntity.kt
│   │       └── NotificationEntity.kt
│   │
│   ├── remote/                      # API layer
│   │   ├── api/
│   │   │   ├── MHubApiService.kt
│   │   │   ├── AuthApiService.kt
│   │   │   └── ChatApiService.kt
│   │   ├── interceptor/
│   │   │   ├── AuthInterceptor.kt
│   │   │   └── TokenRefreshAuthenticator.kt
│   │   └── dto/                     # Data Transfer Objects
│   │       ├── PostDto.kt
│   │       ├── CategoryDto.kt
│   │       ├── UserDto.kt
│   │       ├── OfferDto.kt
│   │       ├── AuthDto.kt
│   │       └── PaginatedResponseDto.kt
│   │
│   ├── repository/
│   │   ├── PostRepository.kt
│   │   ├── CategoryRepository.kt
│   │   ├── CartRepository.kt
│   │   ├── WishlistRepository.kt
│   │   ├── AuthRepository.kt
│   │   ├── UserRepository.kt
│   │   ├── OfferRepository.kt
│   │   ├── ChatRepository.kt
│   │   ├── NotificationRepository.kt
│   │   ├── SearchRepository.kt
│   │   └── RewardRepository.kt
│   │
│   └── mock/                        # Mock data generators
│       ├── MockPostGenerator.kt
│       ├── MockCategoryGenerator.kt
│       ├── MockUserGenerator.kt
│       └── MockBannerGenerator.kt
│
├── domain/                          # Domain layer (use cases)
│   ├── model/                       # Domain models
│   │   ├── Post.kt
│   │   ├── Category.kt
│   │   ├── User.kt
│   │   ├── CartItem.kt
│   │   ├── Offer.kt
│   │   └── Notification.kt
│   └── usecase/
│       ├── GetPostsUseCase.kt
│       ├── GetPostDetailUseCase.kt
│       ├── AddToCartUseCase.kt
│       ├── ToggleWishlistUseCase.kt
│       ├── LoginUseCase.kt
│       ├── SearchPostsUseCase.kt
│       └── ... (one per business operation)
│
├── ui/                              # UI layer
│   ├── theme/
│   │   ├── Theme.kt                 # Material 3 theme
│   │   ├── Color.kt                 # Color definitions (per category)
│   │   ├── Type.kt                  # Typography
│   │   └── Shape.kt                 # Shape definitions
│   │
│   ├── components/                  # Shared composables
│   │   ├── MHubTopBar.kt
│   │   ├── MHubBottomNav.kt
│   │   ├── ProductCard.kt           # Grid + List variants
│   │   ├── PriceDisplay.kt
│   │   ├── RatingStars.kt
│   │   ├── CategoryChip.kt
│   │   ├── ImageCarousel.kt
│   │   ├── HeroBanner.kt
│   │   ├── ShimmerLoader.kt
│   │   ├── EmptyState.kt
│   │   ├── ErrorState.kt
│   │   ├── LoadingState.kt
│   │   ├── PullToRefresh.kt
│   │   ├── SellerInfoCard.kt
│   │   ├── ReviewCard.kt
│   │   ├── QuantitySelector.kt
│   │   ├── FilterChips.kt
│   │   ├── SortSheet.kt
│   │   ├── FilterSheet.kt
│   │   ├── SearchBar.kt
│   │   ├── StepIndicator.kt
│   │   └── ConfirmDialog.kt
│   │
│   ├── launcher/                    # Home launcher screen
│   │   ├── LauncherScreen.kt
│   │   └── LauncherViewModel.kt
│   │
│   ├── category/                    # Category app shell
│   │   ├── CategoryAppShell.kt
│   │   ├── CategoryAppViewModel.kt
│   │   ├── CategoryHomeScreen.kt
│   │   ├── CategoryHomeViewModel.kt
│   │   ├── SubcategoryScreen.kt
│   │   └── SubcategoryViewModel.kt
│   │
│   ├── product/                     # Product screens
│   │   ├── ProductListingScreen.kt
│   │   ├── ProductListingViewModel.kt
│   │   ├── ProductDetailScreen.kt
│   │   ├── ProductDetailViewModel.kt
│   │   └── ImageZoomScreen.kt
│   │
│   ├── cart/                        # Cart screens
│   │   ├── CartScreen.kt
│   │   └── CartViewModel.kt
│   │
│   ├── wishlist/                    # Wishlist screens
│   │   ├── WishlistScreen.kt
│   │   └── WishlistViewModel.kt
│   │
│   ├── checkout/                    # Checkout flow
│   │   ├── AddressScreen.kt
│   │   ├── PaymentScreen.kt
│   │   ├── ReviewScreen.kt
│   │   ├── ConfirmationScreen.kt
│   │   └── CheckoutViewModel.kt
│   │
│   ├── auth/                        # Authentication
│   │   ├── LoginScreen.kt
│   │   ├── SignupScreen.kt
│   │   ├── ForgotPasswordScreen.kt
│   │   ├── OtpScreen.kt
│   │   └── AuthViewModel.kt
│   │
│   ├── profile/                     # User profile & account
│   │   ├── ProfileScreen.kt
│   │   ├── EditProfileScreen.kt
│   │   ├── ProfileViewModel.kt
│   │   ├── SettingsScreen.kt
│   │   └── SecurityScreen.kt
│   │
│   ├── seller/                      # Seller features
│   │   ├── DashboardScreen.kt
│   │   ├── DashboardViewModel.kt
│   │   ├── CreatePostScreen.kt
│   │   ├── EditPostScreen.kt
│   │   ├── MyPostsScreen.kt
│   │   └── SellerViewModel.kt
│   │
│   ├── offers/                      # Offers/negotiation
│   │   ├── OffersScreen.kt
│   │   └── OffersViewModel.kt
│   │
│   ├── chat/                        # Chat
│   │   ├── ChatListScreen.kt
│   │   ├── ChatDetailScreen.kt
│   │   └── ChatViewModel.kt
│   │
│   ├── search/                      # Search
│   │   ├── SearchScreen.kt
│   │   └── SearchViewModel.kt
│   │
│   ├── notifications/               # Notifications
│   │   ├── NotificationScreen.kt
│   │   └── NotificationViewModel.kt
│   │
│   ├── orders/                      # Order history
│   │   ├── OrderHistoryScreen.kt
│   │   ├── OrderDetailScreen.kt
│   │   └── OrderViewModel.kt
│   │
│   ├── rewards/                     # Rewards/coins
│   │   ├── RewardsScreen.kt
│   │   └── RewardsViewModel.kt
│   │
│   ├── feed/                        # Social feed
│   │   ├── FeedScreen.kt
│   │   └── FeedViewModel.kt
│   │
│   ├── channels/                    # Channels/CentrePages
│   │   ├── ChannelsScreen.kt
│   │   ├── ChannelDetailScreen.kt
│   │   └── ChannelsViewModel.kt
│   │
│   ├── history/                     # Recently viewed
│   │   ├── RecentlyViewedScreen.kt
│   │   └── RecentlyViewedViewModel.kt
│   │
│   └── static/                      # Static/info pages
│       ├── AboutScreen.kt
│       ├── TermsScreen.kt
│       ├── PrivacyScreen.kt
│       └── FaqScreen.kt
│
├── navigation/
│   ├── NavRoutes.kt                 # All route definitions
│   ├── RootNavGraph.kt              # Root navigation
│   ├── CategoryNavGraph.kt          # Per-category nav graph
│   ├── AuthNavGraph.kt
│   └── CheckoutNavGraph.kt
│
├── util/
│   ├── Extensions.kt
│   ├── DateFormatter.kt
│   ├── CurrencyFormatter.kt
│   ├── Validators.kt                # Email, phone, Aadhaar, PAN
│   └── Constants.kt
│
├── MHubApplication.kt              # Hilt application class
└── MainActivity.kt                  # Single activity (Compose)
```

---

## 11. TESTING STRATEGY

### Unit Tests
- All ViewModels (state transitions, business logic)
- All Repositories (data mapping, error handling)
- All Use Cases (business rules)
- Validators (email, phone, Aadhaar, PAN)
- Currency/date formatters

### Integration Tests
- Room DAO operations (insert, query, delete, update)
- Retrofit API calls with MockWebServer
- Repository integration (local + remote data combining)

### UI Tests
- Critical user journeys:
  - Browse → Product Detail → Add to Cart → Checkout
  - Search → Filter → Select Product
  - Login → Profile → Edit
  - Create Post → Preview → Publish
- Accessibility checks (Espresso accessibility checks)
- Dark mode rendering

### Manual Testing Matrix
- Small phone (360dp)
- Large phone (412dp)
- Tablet (600dp+)
- Android 8 (API 26)
- Android 14 (API 34)
- TalkBack on/off
- Dark mode on/off
- Large font on/off

---

## TIMELINE SUMMARY

| Sprint | Duration | Deliverable |
|--------|----------|-------------|
| **Sprint 0** | Week 1 | Architecture foundation |
| **Sprint 1** | Week 2 | Home Launcher (4 cards) |
| **Sprint 2** | Week 3 | Category App Shell (nav, drawer) |
| **Sprint 3** | Week 4-5 | Category Home Pages (banners, deals) |
| **Sprint 4** | Week 6-7 | Product Listing (filters, sort, scroll) |
| **Sprint 5** | Week 8-9 | Product Detail (gallery, reviews, offers) |
| **Sprint 6** | Week 10 | Cart + Wishlist + Recently Viewed |
| **Sprint 7** | Week 11-12 | Checkout Flow (4-step) |
| **Sprint 8** | Week 13-14 | Profile, Account, Seller Features |
| **Sprint 9** | Week 15 | Authentication |
| **Sprint 10** | Week 16 | Search |
| **Sprint 11** | Week 17 | Notifications + Static Pages |
| **Sprint 12** | Week 18 | Full Audit Pass (100/100) |

**Total estimated: 18 weeks (4.5 months)**

---

## NEXT STEPS

1. **Review this plan** — confirm the architecture and sprint order
2. **Set up the Kotlin project** — Sprint 0 begins
3. **Backend API readiness** — confirm which endpoints exist vs need mock data
4. **Design assets** — gather category images, icons, illustrations for empty states
5. **Start Sprint 0** — project setup, DI, DB, theme, shared components

---

> **Note**: This plan is based on a thorough analysis of the existing MHub web application at `client/src/` which has 60+ pages, 100+ routes, 23 services, 6 contexts, and 22 custom hooks. The current Android app is a Capacitor WebView shell with zero native Kotlin UI. This plan covers building everything from scratch as a native Kotlin + Jetpack Compose application.
