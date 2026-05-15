# Android App — Missing Pages & Navigation Plan

> Generated: May 2026  
> Comparison: Web app (`http://localhost:8081/`) vs Android native app  
> Method: GreenNavbar.jsx bottom nav + more menu links vs BottomTab enum + MoreScreen.kt

---

## 1. BOTTOM NAV — Current vs Required

### Web Bottom Nav (actual code in GreenNavbar.jsx)
| # | Tab | Route | Icon |
|---|-----|-------|------|
| 1 | Home | `/category-hub` | FiHome |
| 2 | All Posts | `/all-posts` | FiSearch |
| 3 | **Sell (+)** | `/post-welcome` | FiPlusCircle (center FAB) |
| 4 | **Chat** | `/chat` | FiMessageCircle |
| 5 | Profile | `/profile` | FiUser |
| 6 | More | `#` (drawer) | FiMenu |

### Android Bottom Nav (current BottomTab enum)
| # | Tab | Route | Status |
|---|-----|-------|--------|
| 1 | Home | `main/category-hub` | ✅ Correct |
| 2 | All Posts | `main/all-posts` | ✅ Correct |
| 3 | **Feed** | `main/feed` | ❌ Web has **Sell (+)** here |
| 4 | **Profile** | `main/profile` | ❌ Web has **Chat** here |
| 5 | More | `main/more` | ✅ Correct |

### Required Bottom Nav Changes
1. **Replace tab 3**: Change `FEED` → `SELL` (Add Post / `+` button → navigates to `post/welcome`)  
2. **Add tab 4**: Insert `CHAT` tab → navigates to `chat` route  
3. **Move Feed**: Feed moves to bottom nav position 5 or inside More menu  
4. **Move Profile**: Profile either stays in nav or is accessible via More menu  

> **Impact**: Users currently have NO quick way to create a listing — the most important action in a marketplace app. The "+" button is the most-tapped CTA in the web app.

---

## 2. MORE MENU — Missing Items

### Web More Menu (GreenNavbar.jsx `moreMenuLinks`)
27 items grouped into: Trade | Social | Account

### Android More Menu (MoreScreen.kt `entries`)
14 items — no grouping

### Missing Items from Android More Menu

#### 🛒 Trade Group
| # | Item | Route | Priority |
|---|------|-------|----------|
| 1 | Posting Plans | `/tier-selection` | HIGH — monetization CTA |
| 2 | Centre | `/centre` | HIGH — channel storefront |
| 3 | Category Mode | `/category-mode` | MEDIUM |
| 4 | Saved Searches | `/saved-searches` | MEDIUM |
| 5 | Recently Viewed | `/recently-viewed` | MEDIUM |
| 6 | Cart | `/cart` | HIGH — commerce critical |
| 7 | Compare | `/compare` | LOW |

#### 💬 Social Group
| # | Item | Route | Priority |
|---|------|-------|----------|
| 8 | Public Wall | `/public-wall` | MEDIUM |
| 9 | My Reviews | `/reviews/{userId}` | HIGH |
| 10 | Feedback | `/feedback` | MEDIUM |
| 11 | Complaints | `/complaints` | MEDIUM |
| 12 | Channels | `/channels` | HIGH |

#### 👤 Account Group
| # | Item | Route | Priority |
|---|------|-------|----------|
| 13 | My Posts (Seller Home) | `post/mine` | HIGH |
| 14 | Bought Posts | `bought-posts` | HIGH |
| 15 | Sold Posts | `sold-posts` | HIGH |
| 16 | Activity Hub | `activity` | HIGH |
| 17 | Verification | `verification` | HIGH |
| 18 | Analytics | `analytics` | MEDIUM |
| 19 | Delete Account | `account/delete` | MEDIUM |
| 20 | Admin Panel | `admin-panel` | LOW (admin-role only) |

---

## 3. PAGES THAT EXIST BUT ARE NOT REACHABLE (Dead Screens)

These screens are registered in `MhubApp.kt` with full composable() entries but have **no navigation entry point** — the user can never reach them from any button, tab, or menu item.

| Screen | Route | File | How to fix |
|--------|-------|------|------------|
| `BoughtPostsScreen` | `bought-posts` | BoughtPostsScreen.kt | Add to More menu → Account |
| `SoldPostsScreen` | `sold-posts` | SoldPostsScreen.kt | Add to More menu → Account |
| `BuyerViewScreen` | `buyer-view` | BuyerViewScreen.kt | Link from BoughtPostsScreen |
| `SaleDoneScreen` | `saledone` | commerce/ | Link from transaction flow |
| `SaleUndoneScreen` | `saleundone` | commerce/ | Link from transaction flow |
| `PostWelcomeScreen` | `post/welcome` | commerce/ | Wire to Sell (+) in bottom nav |
| `TierSelectionScreen` | `tier-selection` | commerce/ | Add to More menu → Trade |
| `FeedDetailScreen` | `feed/{feedId}` | feed/ | Link from FeedScreen cards |
| `MyFeedScreen` | `my-feed` | feed/ | Add to More menu |
| `FeedPostAddScreen` | `feed/post-add` | feed/ | Link from FeedScreen FAB |
| `PublicWallScreen` | `public-wall` | social/ | Add to More menu → Social |
| `ComplaintsScreen` | `complaints` | social/ | Add to More menu → Social |
| `FeedbackScreen` | `feedback` | social/ | Add to More menu → Social |
| `CompareScreen` | `compare` | commerce/ | Add to More menu → Trade |
| `ChannelsListScreen` | `channels` | channels/ | Add to More menu → Social |
| `CreateChannelScreen` | `channels/create` | channels/ | Link from ChannelsListScreen |
| `ChannelDetailScreen` | `channels/{id}` | channels/ | Link from ChannelsListScreen |
| `CentreListScreen` | `centre` | channels/ | Add to More menu → Trade |
| `CreateCentreScreen` | `centre/create` | channels/ | Link from CentreListScreen |
| `CentreDetailScreen` | `centre/{id}` | channels/ | Link from CentreListScreen |
| `CentreListingsScreen` | `centre/{id}/listings` | channels/ | Link from CentreDetailScreen |
| `VerificationScreen` | `verification` | account/ | Add to More menu → Account |
| `AccountDeleteScreen` | `account/delete` | account/ | Add to More menu → Account |
| `AnalyticsScreen` | `analytics` | account/ | Add to More menu → Account |
| `AdminPanelScreen` | `admin-panel` | legal/ | Add to More menu (admin role) |
| `ActivityHubScreen` | `activity` | discovery/ | Add to More menu or bottom nav |
| `ReviewsScreen` | `reviews/{userId}` | social/ | Add to More menu → Social |
| `AboutUsScreen` | `about` | staticpages/ | Add to Settings or More menu |
| `ContactUsScreen` | `contact` | staticpages/ | Add to Settings or More menu |
| `FAQScreen` | `faq` | staticpages/ | Add to Settings or More menu |

---

## 4. ROUTES DEFINED BUT NOT WIRED (Constants with No Screen)

These constants exist in `Routes.kt` but have **no composable() in MhubApp.kt** and **no screen file** — they will crash if navigated to.

| Constant | Path | Screen Needed |
|----------|------|---------------|
| `EDIT_PROFILE` | `profile/edit` | EditProfileScreen.kt |
| `ORDER_HISTORY` | `profile/orders` | OrderHistoryScreen.kt |
| `ORDER_DETAIL` | `profile/orders/{orderId}` | OrderDetailScreen.kt |
| `ADDRESS_BOOK` | `profile/addresses` | AddressBookScreen.kt |
| `ADDRESS_ADD` | `profile/addresses/add` | AddAddressScreen.kt |
| `ADDRESS_EDIT` | `profile/addresses/{id}/edit` | EditAddressScreen.kt |
| `CHAT_LIST` | `chat-list` | ChatListScreen.kt |
| `SHIPPING_POLICY` | `shipping-policy` | ShippingPolicyScreen.kt |

---

## 5. KEY FUNCTIONAL PAGE MISSING: My Home (Seller Dashboard)

The web has a dedicated **My Home** page (`/my-home`, also at `/my-posts`) that is a **seller dashboard** — different from a simple post list. It includes:
- Listing management (edit/delete/relist)
- Sales stats overview
- Quick actions (boost, share, view offers)
- Listing health indicators

**Android current state**: `MyPostsScreen` at `post/mine` — only shows a flat list of posts with no dashboard features.

**Action needed**: Enhance `MyPostsScreen` OR create a dedicated `MyHomeScreen` matching web's `MyHomePage`.

---

## 6. PROFILE PAGE — Missing Tabs

The web's `/profile` page has **4 tabs**:
| Tab | Content |
|-----|---------|
| Overview | Profile health score, completion %, quick actions |
| Personal | Name, bio, phone, email, avatar, location |
| Preferences | Category interests, notification preferences |
| Settings | Security, language, privacy, notification prefs |

**Android current state**: `ProfileScreen` — single scrollable page, no tabs.

---

## 7. COMPLETE PRIORITY-ORDERED ACTION PLAN

### 🔴 P0 — CRITICAL (Breaks core user journeys)

| # | Action | File(s) | Effort |
|---|--------|---------|--------|
| P0-1 | **Add Sell (+) button to bottom nav** (replace Feed with Sell as tab 3) | `BottomTab` enum in `MhubApp.kt`, `MhubTopBar` | 1 day |
| P0-2 | **Add Chat tab to bottom nav** (add as 4th item) | `BottomTab` enum in `MhubApp.kt` | 0.5 day |
| P0-3 | **Wire PostWelcomeScreen to bottom nav Sell tap** | `MhubApp.kt` | 0.5 day |
| P0-4 | **Add Cart to More menu** | `MoreScreen.kt`, `MhubApp.kt` | 0.5 day |

### 🟠 P1 — HIGH (Major feature gaps)

| # | Action | File(s) | Effort |
|---|--------|---------|--------|
| P1-1 | Add **Bought Posts** + **Sold Posts** to More menu (Account group) | `MoreScreen.kt` | 0.5 day |
| P1-2 | Add **My Posts (Seller Home)** to More menu | `MoreScreen.kt` | 0.5 day |
| P1-3 | Add **Channels** to More menu (Social group) | `MoreScreen.kt` | 0.5 day |
| P1-4 | Add **Tier Selection / Plans** to More menu (Trade group) | `MoreScreen.kt` | 0.5 day |
| P1-5 | Add **Centre** to More menu (Trade group) | `MoreScreen.kt` | 0.5 day |
| P1-6 | Add **My Reviews** to More menu (Social group) | `MoreScreen.kt` | 0.5 day |
| P1-7 | Add **Activity Hub** to More menu | `MoreScreen.kt` | 0.5 day |
| P1-8 | Add **Verification** to More menu (Account group) | `MoreScreen.kt` | 0.5 day |
| P1-9 | Group More menu items like web (Trade / Social / Account headers) | `MoreScreen.kt` | 1 day |
| P1-10 | Wire **FeedDetailScreen** from FeedScreen post cards | `FeedScreen.kt` | 0.5 day |
| P1-11 | Wire **FeedPostAddScreen** FAB from FeedScreen | `FeedScreen.kt` | 0.5 day |
| P1-12 | Wire **BuyerViewScreen** from BoughtPostsScreen | `BoughtPostsScreen.kt` | 0.5 day |

### 🟡 P2 — MEDIUM (Feature completeness)

| # | Action | File(s) | Effort |
|---|--------|---------|--------|
| P2-1 | Add **Feedback** + **Complaints** to More menu | `MoreScreen.kt` | 0.5 day |
| P2-2 | Add **Public Wall** to More menu | `MoreScreen.kt` | 0.5 day |
| P2-3 | Add **Saved Searches** to More menu | `MoreScreen.kt` | 0.5 day |
| P2-4 | Add **Recently Viewed** to More menu | `MoreScreen.kt` | 0.5 day |
| P2-5 | Add **Compare** to More menu | `MoreScreen.kt` | 0.5 day |
| P2-6 | Add **Category Mode** to More menu | `MoreScreen.kt` | 0.5 day |
| P2-7 | Add **Analytics** to More menu (Account group) | `MoreScreen.kt` | 0.5 day |
| P2-8 | Add **Delete Account** to More menu (Account group) | `MoreScreen.kt` | 0.5 day |
| P2-9 | Add **About / Contact / FAQ** to Settings or More menu | `MoreScreen.kt` / `SettingsScreen.kt` | 0.5 day |
| P2-10 | Add **My Feed** accessible from Feed screen or More menu | `MoreScreen.kt` | 0.5 day |
| P2-11 | Enhance **My Home** seller dashboard (stats, quick actions) | `MyPostsScreen.kt` | 3 days |
| P2-12 | Add **Admin Panel** (conditional on admin role) | `MoreScreen.kt` | 0.5 day |

### 🟢 P3 — LOW (Nice to have / Polish)

| # | Action | File(s) | Effort |
|---|--------|---------|--------|
| P3-1 | Add Profile tabs (Overview / Personal / Preferences / Settings) | `ProfileScreen.kt` | 3 days |
| P3-2 | Create **EditProfileScreen.kt** + wire to `profile/edit` | New file | 2 days |
| P3-3 | Create **OrderHistoryScreen.kt** + wire | New file | 2 days |
| P3-4 | Create **AddressBookScreen.kt** + wire | New file | 2 days |
| P3-5 | Create **ShippingPolicyScreen.kt** + wire | New file | 0.5 day |
| P3-6 | Create **ChatListScreen.kt** + wire to `chat-list` | New file | 1 day |
| P3-7 | Wire SaleDone / SaleUndone from transaction flows | commerce/ screens | 0.5 day |

---

## 8. QUICK WINS SUMMARY (Can be done in < 1 hour each)

These only require adding entries to `MoreScreen.kt`'s `entries` list and callbacks to `MhubApp.kt`:

1. Add Cart link in More menu
2. Add Tier Selection / Plans in More menu
3. Add Centre in More menu
4. Add Bought Posts in More menu
5. Add Sold Posts in More menu
6. Add My Posts in More menu
7. Add Channels in More menu
8. Add Activity Hub in More menu
9. Add Verification (`/verification`) in More menu
10. Add Feedback in More menu
11. Add Complaints in More menu
12. Add Public Wall in More menu
13. Add Saved Searches in More menu
14. Add Recently Viewed in More menu
15. Add Compare in More menu
16. Add My Reviews in More menu
17. Add Analytics in More menu
18. Add Delete Account in More menu
19. Add About Us / Contact / FAQ in More menu

**Total quick wins**: 19 items, ~4 hours total

---

## 9. BOTTOM NAV RESTRUCTURE PLAN

### Target structure (matching web):

```
┌──────────────────────────────────────────────┐
│  Home  │  Explore  │  [+Sell]  │  Chat  │ More │
└──────────────────────────────────────────────┘
```

### Changes needed in MhubApp.kt — BottomTab enum:

```kotlin
// CURRENT
enum class BottomTab { HOME, ALL_POSTS, FEED, PROFILE, MORE }

// TARGET
enum class BottomTab { HOME, ALL_POSTS, SELL, CHAT, MORE }
// NOTE: Profile is accessible via More → Profile
// NOTE: Feed is accessible via bottom nav left side (reposition) OR via More menu
```

### Option A — 5-tab (recommended, cleaner)
```
Home | All Posts | [+Sell] | Chat | More
```
- Profile accessible via More menu (same as web)
- Feed accessible via More menu
- Matches web 1:1

### Option B — 6-tab (show all, Android supports up to 5-6)
```
Home | All Posts | [+Sell] | Chat | Profile | More
```
- Keeps Profile in nav for quick access
- Feed moves to More menu

---

## 10. FILE CHANGE SUMMARY

| File | Changes Needed |
|------|---------------|
| `ui/MhubApp.kt` | Restructure BottomTab enum; add 19 More menu callbacks |
| `ui/more/MoreScreen.kt` | Add 19 missing entries; add group headers (Trade/Social/Account) |
| `ui/navigation/Routes.kt` | No changes needed (all routes already defined) |
| `ui/post/MyPostsScreen.kt` | Enhance to seller dashboard (P2) |
| `ui/profile/ProfileScreen.kt` | Add tabs (P3) |
| New: `ui/profile/EditProfileScreen.kt` | Create from scratch (P3) |
| New: `ui/profile/OrderHistoryScreen.kt` | Create from scratch (P3) |
| New: `ui/profile/AddressBookScreen.kt` | Create from scratch (P3) |
| New: `ui/chat/ChatListScreen.kt` | Create from scratch (P3) |
| New: `ui/legal/ShippingPolicyScreen.kt` | Create from scratch (P3) |
