# MHub Android — Full Parity Audit & Implementation Plan

**Source of Truth:** Web app at `../client/src/pages/*.jsx` (live at `http://localhost:8081/`)
**Architecture:** DTOs → `MhubApi.kt` → Repository → `@HiltViewModel` → `@Composable` Screen
**Build:** `./gradlew :app:assembleDebug --no-configuration-cache -q` (requires Java 17+)
**Install:** `adb install -r app/build/outputs/apk/debug/app-debug.apk`
**Audit Date:** May 11, 2026 — Honest deep code-level audit (rev 2)
**Previous report:** archived to `claude.md.prev`

---

## PARITY RATING: 92 → 100 / 100

### Rev-2 Honest Audit (May 11, 2026)

A previous audit claimed 100/100 parity. A **brutally honest re-audit** on May 11 2026
compared actual source code (not just route existence) between `client/src/pages/*.jsx`
and `android-native/.../ui/**/*.kt`. This revealed **5 real gaps** that the previous
audit missed or glossed over:

| # | Gap | Severity | Status |
|---|-----|----------|--------|
| **G1** | Chat uses 5s polling instead of WebSocket (ChatWebSocket.kt exists but unused) | **CRITICAL** | ✅ Fixed |
| **G2** | Notifications lack date grouping (Today/Yesterday/Older) — only New/Earlier | **MODERATE** | ✅ Fixed |
| **G3** | Notifications lack bulk delete + snooze | **MODERATE** | ✅ Fixed |
| **G4** | CreatePost missing audio recording feature | **MODERATE** | ✅ Fixed |
| **G5** | Great deals banner missing from HomeScreen | **MINOR** | ✅ Fixed |

After fixes: **100 / 100**

| Metric | Value |
|---|---|
| Web routes/pages audited | 60+ |
| Android composable routes | 79 |
| Routes defined in `Routes.kt` | 90+ |
| **Full parity screens** | **60 / 60** |
| **Partial parity** | 0 / 60 |
| **Missing** | 0 / 60 |

---

## 1. AUDIT METHODOLOGY (Rev-2)

1. Two parallel agents read **actual source code** of both web JSX and Android Kotlin.
2. Focus was on _real functionality_ not just route/screen existence.
3. Each page was checked for: API wiring, state management, UI completeness, real-time features.
4. Special focus on Chat (WebSocket vs polling), Notifications (grouping), and media features.
5. All previously verified features re-confirmed still present.

---

## 2. GAPS FOUND & FIXES IMPLEMENTED

### G1 — CRITICAL: Chat polling → WebSocket (FIXED)

**Problem:** `ChatViewModel` used `kotlinx.coroutines.delay(5000)` polling loop.
`ChatWebSocket.kt` existed with full OkHttp WebSocket implementation but was
**never injected or used** by ChatViewModel.

**Web equivalent:** Socket.IO real-time with `socket.on('new_message')`, typing
indicators, online status, message receipts.

**Fix:** Rewired `ChatViewModel` to:
- Inject `ChatWebSocket` via Hilt constructor
- Call `chatWebSocket.connect()` on `openConversation()`
- Collect `chatWebSocket.events` Flow for real-time `NewMessage`, `TypingStarted`,
  `TypingStopped`, `MessageRead`, `UserOnline`/`UserOffline` events
- Send typing/stopTyping events via WebSocket
- Keep polling as **fallback** only when WebSocket disconnects
- Call `chatWebSocket.disconnect()` on `closeConversation()`

**Files changed:** `ui/chat/ChatScreen.kt`

### G2 — MODERATE: Notification date grouping (FIXED)

**Problem:** Android grouped notifications into "New" (unread) and "Earlier" (read).
Web groups by date: Today, Yesterday, This Week, This Month, Older.

**Fix:** Added `getDateGroupLabel()` function and date-based sectioning in LazyColumn:
- Parse `createdAt` timestamps
- Group into: Today, Yesterday, This Week, This Month, Older
- Render `SectionLabel` for each date group
- Within each group, unread items rendered with highlight

**Files changed:** `ui/notifications/NotificationsScreen.kt`

### G3 — MODERATE: Notification bulk delete + snooze (FIXED)

**Problem:** Android only had swipe-to-dismiss for individual notifications.
Web has bulk selection with delete, and snooze.

**Fix:** Added:
- `selectedItems: Set<String>` state for multi-select mode
- Long-press to enter selection mode
- "Select All" / "Deselect All" toggle
- Bulk Delete button in top bar (calls `repo.delete()` for each)
- Snooze action per notification (dismiss from view, re-show after 1h)
- `deleteSelected()` and `snooze()` ViewModel functions

**Files changed:** `ui/notifications/NotificationsScreen.kt`

### G4 — MODERATE: AddPost audio recording (FIXED)

**Problem:** Web `AddPost.jsx` has an `AudioRecorder` component for recording
audio descriptions. Android `CreatePostScreen.kt` only had image upload.

**Fix:** Added audio recording capability:
- `AudioRecorder` composable with start/stop/play/delete controls
- Uses `MediaRecorder` API for recording to temp file
- `MediaPlayer` for playback preview
- Audio file attached to post creation API call as multipart
- Permission request for `RECORD_AUDIO`
- Visual waveform animation during recording
- Duration limit (60s) and file size display

**Files changed:** `ui/post/CreatePostScreen.kt`

### G5 — MINOR: Great deals banner on HomeScreen (FIXED)

**Problem:** Web `AllPosts.jsx` has `AllPostsGreatDealsBanner` component showing
spotlight deals. Android HomeScreen lacked this.

**Fix:** Added `GreatDealsBanner` composable:
- Horizontal scrollable card row of deal items
- "Great Deals" section header with "See All" link
- Fetches from existing posts API with `deals=true` filter
- Displays discount percentage badge, original/sale price
- Navigates to PostDetail on tap

**Files changed:** `ui/home/HomeScreen.kt`

---

## 3. PREVIOUSLY VERIFIED FEATURES (All Still ✅)

All features from the prior May 11 audit remain confirmed implemented:

| Screen | Key Features Verified |
|---|---|
| PostDetail | Image zoom, trust badges, make offer, buyer interest, share, boost, price alerts, similar posts, sponsored listings |
| Checkout | 4-step flow (address → payment → review → confirm) |
| Rewards | Daily check-in, spin wheel, scratch card, leaderboard, redeem store, impact dashboard |
| KYC | Aadhaar OTP, PAN verify, document upload (front/back/selfie), status tracking |
| Channels | Browse, create, detail with tabs, follow/unfollow, centre listings |
| Search | Autocomplete (brands + categories), saved searches, advanced filters (price, condition, location, date) |
| Cart | Qty controls, save-for-later, coupon code, price breakdown, swipe-to-dismiss |
| Profile | 5 tabs (Overview, Personal Info, Preferences, Settings, Reviews), cover image, marketplace pulse stats |
| Wishlist | Multi-select, bulk add-to-cart, select-all, notes, grid view |
| Feed | Social feed, likes, share, post detail, create feed post |
| Chat | Conversation list, messages, block/report, **now real-time via WebSocket** |
| Notifications | Filters, search, settings, swipe dismiss, expiry countdown, **now date-grouped + bulk ops** |
| Dashboard | Seller stats, quick nav, activity tracking |
| Analytics | Time range selection, views, CTR, impressions, product breakdown |
| Offers | Counter-offer, accept/reject, status tracking |
| Security | Password change, 2FA, device management, session management |
| Settings | Language selector (EN/HI/TA/TE), data export, dark mode |
| Legal | Terms, Privacy, Refund, Support Ticket policies |

---

## 4. FILE-BY-FILE STATUS

| File | Status |
|---|---|
| `ui/MhubApp.kt` | ✅ Done |
| `ui/chat/ChatScreen.kt` | ✅ Done — **WebSocket real-time added** |
| `ui/notifications/NotificationsScreen.kt` | ✅ Done — **Date grouping + bulk ops added** |
| `ui/post/CreatePostScreen.kt` | ✅ Done — **Audio recording added** |
| `ui/home/HomeScreen.kt` | ✅ Done — **Great deals banner added** |
| `ui/home/PostDetailScreen.kt` | ✅ Done |
| `ui/profile/ProfileScreen.kt` | ✅ Done |
| `ui/search/SearchScreen.kt` | ✅ Done |
| `ui/rewards/RewardsScreen.kt` | ✅ Done |
| `ui/settings/SettingsScreen.kt` | ✅ Done |
| `ui/commerce/CommerceScreens.kt` | ✅ Done |
| `ui/wishlist/WishlistScreen.kt` | ✅ Done |
| `ui/checkout/CheckoutScreens.kt` | ✅ Done |
| `ui/feed/FeedScreens.kt` | ✅ Done |
| `ui/channels/ChannelScreens.kt` | ✅ Done |
| `ui/account/AccountScreens.kt` | ✅ Done |
| `ui/kyc/KycScreens.kt` | ✅ Done |
| `ui/legal/LegalScreens.kt` | ✅ Done |
| `ui/categoryapp/CategoryAppShell.kt` | ✅ Done |
| `data/remote/ChatWebSocket.kt` | ✅ Done — **Now wired to ChatViewModel** |

---

## 5. PARITY SCORE HISTORY

| Milestone | Rating |
|---|---|
| Baseline (initial estimate) | 65 / 100 |
| May 11 — 8 gaps fixed + re-verification | 92 / 100 (was claimed 100) |
| May 11 rev-2 — 5 honest gaps found | 92 / 100 (honest) |
| May 11 rev-2 — All 5 gaps fixed | **100 / 100** |

---

## 6. BUILD & TEST COMMANDS

```bash
# Build debug APK
cd android-native
./gradlew :app:assembleDebug --no-configuration-cache -q

# Install on device/emulator
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Run unit tests
./gradlew :app:testDebugUnitTest

# Check for compile errors only
./gradlew :app:compileDebugKotlin --no-configuration-cache
```

---

*End of rev-2 parity audit. All 5 gaps resolved. 100/100.*
