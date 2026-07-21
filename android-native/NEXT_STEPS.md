# MHub Android — Master Plan & Next Steps

**Last Updated:** May 17, 2026  
**Build Status:** ✅ BUILD SUCCESSFUL (installed on emulator)  
**Web Reference:** http://localhost:8081/

---

## ✅ COMPLETED (This Session)

| # | Task | Files Changed |
|---|------|---------------|
| 1 | Category nav defaults to ProductListingScreen | `CategoryAppShell.kt` |
| 2 | CategoryTopBar always visible in category flow | `CategoryAppShell.kt` |
| 3 | AllPosts subcategory filter chips | `ProductListingScreen.kt` |
| 4 | AllPosts quick condition filters (New/Used/Verified) | `ProductListingScreen.kt` |
| 5 | Profile hero — compact horizontal layout (cover 56dp, avatar left, info right) | `ProfileScreen.kt` |
| 6 | Profile hero cleanup — removed orphaned glassmorphism code | `ProfileScreen.kt` |
| 7 | Rewards daily code claim moved to Earn tab | `RewardsScreen.kt` |
| 8 | Language strings — 13 locale files created/updated | `values-*/strings.xml` |
| 9 | Feed & ForYou accessible from category drawer | `CategoryAppShell.kt`, `MhubApp.kt` |
| 10 | CategoryAppShell double-padding fix (useExternalBottomNav) | `CategoryAppShell.kt` |
| 11 | MoreScreen uses stringResource() for key labels | `MoreScreen.kt` |
| 12 | HomeScreen "Trust-First Marketplace" localized | `HomeScreen.kt` |

---

## 🔴 CRITICAL — Fix Before Next Release

### 1. Profile Action Buttons Missing
**Problem:** When the glassmorphism hero was removed, the Share / KYC Verify / Edit / Follow buttons were also removed. The profile page has NO action buttons now.  
**Location:** `ProfileScreen.kt` — between line ~632 (end of hero) and the Profile Tabs  
**Fix Needed:** Add a horizontal row of action buttons below the hero section:
```
[ Share ]  [ Verify KYC / Follow ]  [ Edit ]  [ ⋮ More ]
```
- `Share` → `viewModel.shareProfile(context)`
- `Verify KYC` (if not verified) → `onOpenKyc`
- `Follow / Unfollow` (if not own profile) → `viewModel.toggleFollow()`
- `Edit` (if own profile) → `showEditDialog = true`
- `⋮ More` → DropdownMenu with Block User / Report User

### 2. Profile Badges Row Missing
**Problem:** Verified badge, tier badge, role badge, trust score badge were also removed.  
**Fix Needed:** Add a compact badge row between hero and action buttons showing:
- ✅ Verified / ⏳ Pending / ❌ Unverified
- Tier gradient badge (Bronze/Silver/Gold/Premium)
- Role badge (if not "user")
- Trust rank badge

---

## 🟠 HIGH PRIORITY

### 3. Language Switching — More `stringResource()` Coverage
**Problem:** Only ~8 strings currently use `stringResource()`. Most UI is still hardcoded English even though locale files exist.  
**Screens to Update:**
- `ProfileScreen.kt` — "Overview", "Personal Info", "Preferences", "Settings", "Reviews" tabs; "MARKETPLACE PULSE", "Trust Score"
- `RewardsScreen.kt` — "Dashboard", "Earn", "Referrals", "Activity" tab labels
- `ProductListingScreen.kt` — "All Products", "Sort", "Filters", "New", "Used", "Verified"
- `CategoryAppShell.kt` — "For You", "Community Feed", "Back to Launcher", "Browse Subcategories"
- `HomeScreen.kt` — "No listings yet", "Pull to refresh", filter chip labels

**String Keys to Add to `values/strings.xml`:**
- Profile tab names, section headers
- Rewards tab names
- Common filter/sort labels (already partially done)
- Screen titles

### 4. RTL Layout for Arabic & Urdu
**Problem:** `values-ar/strings.xml` and `values-ur/strings.xml` exist but RTL layout isn't tested.  
**Fix Needed:**
- Verify `android:supportsRtl="true"` in `AndroidManifest.xml`
- Test UI with `ar` locale selected
- Check Row/Column layouts for proper mirroring
- Icons that are directional (back arrow, chevron) should auto-mirror with `AutoMirrored`

### 5. Post Creation Flow Polish
**Problem:** CreatePost screen is the core seller journey — needs UX review.  
**Current State:** Multi-step form with image upload, title, price, location, condition  
**Web Parity Gaps:**
- Web has a progress bar showing step completion
- Web has image preview grid with drag-to-reorder
- Web shows estimated reach / views estimate
- Category & subcategory selector (currently just a text field)

---

## 🟡 MEDIUM PRIORITY

### 6. Chat Screen — Real-Time Verification
**Problem:** Chat tab exists but WebSocket/polling for real-time messages needs verification.  
**Check:** Does `ChatScreen.kt` connect to the server? Are messages persisted locally with Room?

### 7. HomeScreen Category Bar Improvements
**Current:** `CategoriesStrip` shows category chips from API  
**Gap:** No visual distinction between category chips (just text) vs web's icon+name tiles  
**Fix:** Add category emoji/icon to each chip for better visual recognition

### 8. Notification System
**Problem:** Bell icon shows hardcoded "3" badge in MoreScreen. Real notification count should come from API.  
**Fix Needed:**
- Wire notification count to `NotificationsViewModel`
- Show real unread count in MoreScreen badge
- Push notification deep-link handling

### 9. Sell/Plans Page — Current Plan Display
**Problem:** PostWelcomeScreen shows "Free Plan — Up to 1 photo" hardcoded.  
**Fix:** Show the user's actual current plan from their profile data.

### 10. ForYouScreen & FeedScreen Polish
**Current State:** Both screens exist and are functional  
**Gap:**
- ForYou lacks the "time window" filter (Today / This Week / This Month) visible in web
- Feed lacks the tab for "Following" vs "For You" distinction
- Neither shows a proper empty state when user has no feed data

---

## 🟢 LOWER PRIORITY / NICE TO HAVE

### 11. Global Search Improvements
- Debounced search with suggestions
- Recent search history (Room DB)
- Search within category context

### 12. Image Zoom & Gallery
- Product listing images should support pinch-to-zoom
- Swipe between multiple images
- Already have `ImageZoomDialog` — just needs better trigger UX

### 13. Compare Feature UX
- `CompareDialog` exists but compare entry points are buried in HomeScreen
- Add "Compare" long-press or checkbox action on product cards

### 14. Offline Support
- Room DB caching for recently viewed posts
- Show cached data when offline with a banner
- Retry on reconnect

### 15. Performance
- LazyColumn key functions are set — good
- Consider `Pager` for infinite scroll (currently loads all at once)
- AsyncImage coil placeholders could use better blur-hash or dominant color

---

## 🔧 TECHNICAL DEBT

| Issue | Location | Severity |
|-------|----------|----------|
| `Icons.Filled.HelpOutline` deprecated | `CategoryAppShell.kt:509` | Low |
| `Icons.Filled.Sort` deprecated | `ProductListingScreen.kt:269` | Low |
| `Icons.Filled.List` deprecated | `ProductListingScreen.kt:334` | Low |
| `buildconfig=true` Gradle deprecated | `gradle.properties` | Low |
| `tab_*` string keys in translated files don't match `nav_*` keys in default | All `values-*/strings.xml` | Medium |
| Many screens use `@OptIn(ExperimentalMaterial3Api::class)` at file level | Various | Low |

---

## 📁 KEY FILE MAP

```
android-native/app/src/main/java/com/zaruda/app/
├── ui/
│   ├── MhubApp.kt                    — Main nav graph, all routes, BottomTab enum
│   ├── profile/ProfileScreen.kt      — ⚠️ Missing action buttons & badges
│   ├── home/HomeScreen.kt            — AllPosts, filters, banners
│   ├── categoryapp/
│   │   ├── CategoryAppShell.kt       — Category mini-app shell
│   │   └── ProductListingScreen.kt   — Category product grid
│   ├── rewards/RewardsScreen.kt      — 4-tab rewards page
│   ├── more/MoreScreen.kt            — Hamburger menu
│   ├── commerce/CommerceScreens.kt   — TierSelection, PostWelcome, Cart, etc.
│   ├── foryou/ForYouScreen.kt        — For You feed
│   └── feed/FeedScreen.kt            — Community feed
├── data/mock/MockDataProvider.kt     — All mock data
└── ui/navigation/Routes.kt           — All route constants

android-native/app/src/main/res/
├── values/strings.xml                — Default English (most complete)
├── values-hi/strings.xml             — Hindi ✅ Full
├── values-te/strings.xml             — Telugu ✅ Full
├── values-ta/strings.xml             — Tamil ✅ Full
├── values-kn/strings.xml             — Kannada ✅ Full
├── values-mr/strings.xml             — Marathi ✅ Full
├── values-bn/strings.xml             — Bengali ✅ Full
├── values-gu/strings.xml             — Gujarati ✅ NEW
├── values-ml/strings.xml             — Malayalam ✅ NEW
├── values-pa/strings.xml             — Punjabi ✅ NEW
├── values-ur/strings.xml             — Urdu ✅ NEW (RTL)
├── values-es/strings.xml             — Spanish ✅ NEW
├── values-fr/strings.xml             — French ✅ NEW
└── values-ar/strings.xml             — Arabic ✅ NEW (RTL)
```

---

## 🏗️ BUILD & INSTALL COMMANDS

```powershell
# Build
cd c:\Users\laksh\GITHUB\1hub\repo1\android-native
./gradlew --no-configuration-cache assembleDebug

# Install
C:\Android\Sdk\platform-tools\adb.exe install -r "app\build\outputs\apk\debug\app-debug.apk"

# Launch app
C:\Android\Sdk\platform-tools\adb.exe shell am start -n com.zaruda.app.debug/com.zaruda.app.MainActivity
```

---

## 🎯 RECOMMENDED IMMEDIATE NEXT 3 TASKS

1. **Fix Profile action buttons** — Critical regression, buttons completely missing
2. **Fix Profile badges row** — Verified/tier/role badges also missing  
3. **Expand `stringResource()` coverage** — Profile tabs, Rewards tabs, filter labels

> **Estimated build impact:** Each task is isolated, 15-30 min each, builds clean.
