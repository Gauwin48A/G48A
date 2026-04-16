# MHub Android — Phase 0: Feature Parity Map & Launch Plan

## 1. Feature Parity Matrix

### P0 — Must-Have for Launch

| # | Feature | Web Route | API Endpoints | Android Screen | Status |
|---|---------|-----------|---------------|----------------|--------|
| 1 | Login (email/phone + password) | `/login` | `POST /api/auth/login` | `LoginScreen` | TODO |
| 2 | Signup | `/signup` | `POST /api/auth/signup`, `POST /api/auth/send-otp`, `POST /api/auth/verify-otp` | `SignupScreen` | TODO |
| 3 | Forgot/Reset Password | `/forgot-password`, `/reset-password/:token` | `POST /api/auth/forgot-password`, `POST /api/auth/reset-password` | `ForgotPasswordScreen`, `ResetPasswordScreen` | TODO |
| 4 | Session Management | — | `GET /api/auth/session`, `POST /api/auth/refresh-token`, `GET /api/auth/csrf-token` | Auth interceptor | TODO |
| 5 | Logout | — | `POST /api/auth/logout` | Profile menu action | TODO |
| 6 | Category Hub (Landing) | `/category-hub` | `GET /api/categories`, `GET /api/subcategories` | `CategoryHubScreen` | TODO |
| 7 | Home / Feed | `/home`, `/for-you` | `GET /api/posts`, `GET /api/recommendations` | `HomeScreen` | TODO |
| 8 | All Posts / Listings | `/all-posts` | `GET /api/posts` | `ListingsScreen` | TODO |
| 9 | Post Detail | `/post/:id` | `GET /api/posts/:id` | `PostDetailScreen` | TODO |
| 10 | Create Post | `/add-post` | `POST /api/posts` | `AddPostScreen` | TODO |
| 11 | Edit Post | `/edit-post/:id` | `PUT /api/posts/:id` | `EditPostScreen` | TODO |
| 12 | My Posts | `/my-home` | `GET /api/posts/user/:userId` | `MyPostsScreen` | TODO |
| 13 | Profile | `/profile` | `GET /api/profile`, `PUT /api/profile` | `ProfileScreen` | TODO |
| 14 | Notifications | `/notifications` | `GET /api/notifications` | `NotificationsScreen` | TODO |
| 15 | Search | `/search` | `GET /api/posts?search=` | `SearchScreen` | TODO |
| 16 | Push Notifications | — | `POST /api/push/register` | FCM Service | TODO |
| 17 | Deep Links | — | — | Intent filters | TODO |

### P1 — Next Release

| # | Feature | Web Route | API Endpoints | Android Screen |
|---|---------|-----------|---------------|----------------|
| 18 | Wishlist | `/wishlist` | `GET/POST/DELETE /api/wishlist` | `WishlistScreen` |
| 19 | Cart | `/cart` | `GET/POST/DELETE /api/cart` | `CartScreen` |
| 20 | Chat (Real-time) | `/chat` | Socket.IO + `/api/chat` | `ChatScreen` |
| 21 | Social Feed | `/feed` | `GET/POST /api/feed` | `FeedScreen` |
| 22 | Feed Post Detail | `/feed/:id` | `GET /api/feed/:id` | `FeedPostDetailScreen` |
| 23 | Channels | `/channels` | `GET/POST /api/channels` | `ChannelsScreen` |
| 24 | Offers | `/offers` | `GET/POST /api/offers` | `OffersScreen` |
| 25 | Bought/Sold Posts | `/bought-posts`, `/sold-posts` | `GET /api/posts/bought`, `GET /api/posts/sold` | `TransactionHistoryScreen` |
| 26 | Reviews | `/reviews/:userId` | `GET/POST /api/reviews` | `ReviewsScreen` |
| 27 | Recently Viewed | `/recently-viewed` | `GET /api/recently-viewed` | `RecentlyViewedScreen` |
| 28 | Saved Searches | `/saved-searches` | `GET/POST /api/saved-searches` | `SavedSearchesScreen` |
| 29 | Nearby Posts | `/nearby` | `GET /api/nearby` | `NearbyScreen` |
| 30 | Settings / Security | `/security` | `GET /api/auth/sessions`, `POST /api/auth/change-password` | `SettingsScreen` |
| 31 | Tier Selection | `/tier-selection` | `GET /api/tiers` | `TierSelectionScreen` |
| 32 | Compare Posts | `/compare` | — (client-side) | `CompareScreen` |

### P2 — Later

| # | Feature | Web Route | Notes |
|---|---------|-----------|-------|
| 33 | Admin Panel | `/admin-panel` | Admin-only, low priority for mobile |
| 34 | Aadhaar / KYC Verification | `/aadhaar-verify`, `/kyc` | Requires SDK integration |
| 35 | Seller Analytics | `/analytics` | Dashboard charts |
| 36 | Rewards / Coins | `/rewards` | Gamification layer |
| 37 | Payment Gateway | `/payment` | Razorpay/etc integration |
| 38 | Complaints | `/complaints` | Support ticket system |
| 39 | Feedback | `/feedback` | User feedback |
| 40 | Activity Hub | `/activity` | Activity aggregation |
| 41 | Dashboard | `/dashboard` | Seller dashboard |
| 42 | Public Wall | `/public-wall` | Community wall |
| 43 | Biometric Auth | — | AndroidX Biometric |
| 44 | Contacts Sync | — | ContactsContract |
| 45 | 2FA (TOTP/WebAuthn) | — | 2FA setup |

## 2. Risk Register

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|------------|------------|
| R1 | Server uses web-push (VAPID), not FCM Admin SDK | HIGH | CERTAIN | Add Firebase Admin SDK to server, dual-path send for web-push + FCM |
| R2 | Auth uses httpOnly cookies — Android needs different token storage | HIGH | CERTAIN | Implement cookie-jar in OkHttp + EncryptedSharedPreferences fallback |
| R3 | CSRF double-submit cookie requires interceptor parity | MEDIUM | CERTAIN | Custom OkHttp interceptor to read XSRF-TOKEN cookie and set header |
| R4 | Socket.IO chat — native client library needed | MEDIUM | HIGH | Use `io.socket:socket.io-client` Android library |
| R5 | Image upload — web uses browser FormData + compression | MEDIUM | HIGH | Use OkHttp MultipartBody + Android Bitmap compression |
| R6 | 65 screens — scope too large for MVP | HIGH | HIGH | P0 scope limits to 17 screens; ship incrementally |
| R7 | Device binding fingerprint — Android generates different fingerprint format | MEDIUM | MEDIUM | Ensure server accepts Android device fingerprint format |
| R8 | Rate limiting may be too aggressive for mobile retry patterns | LOW | MEDIUM | Implement exponential backoff with jitter |
| R9 | Play Store data safety declaration — 43+ API categories to document | MEDIUM | CERTAIN | Pre-map data types before submission |
| R10 | Deep link domain verification — `mhub.app` assetlinks.json must be deployed | HIGH | HIGH | Deploy `/.well-known/assetlinks.json` to `mhub.app` |

## 3. Timeline (Estimated Phases)

| Phase | Deliverable | Entry Criteria |
|-------|-------------|----------------|
| Phase 0 | This document | Repository analysis complete |
| Phase 1 | Project foundation + CI | Phase 0 approved |
| Phase 2 | Network layer + auth | Phase 1 CI green |
| Phase 3 | P0 screens implemented | Phase 2 auth flow verified |
| Phase 4 | Native capabilities | Phase 3 smoke tests passing |
| Phase 5 | Performance + quality | Phase 4 feature-complete |
| Phase 6 | Play Store submission | Phase 5 quality gates met |

## 4. Architecture Decision Records

### ADR-001: Cookie-based auth vs Bearer token
- **Decision**: Keep cookie-based auth to preserve server contract compatibility
- **Rationale**: Server enforces httpOnly cookies with CSRF. Changing to Bearer tokens requires server-side changes across all middleware.
- **Implementation**: OkHttp `CookieJar` + `WebkitCookieManager` to persist cookies across sessions

### ADR-002: Push notification dual-path
- **Decision**: Add Firebase Admin SDK server-side for native FCM while keeping web-push for PWA
- **Rationale**: Web-push VAPID cannot push to native Android apps via FCM
- **Blocker**: Requires server-side changes (see BLOCKERS.md)

### ADR-003: Package ID
- **Decision**: Keep `com.mhub.app` as package ID
- **Rationale**: Matches existing Capacitor config, preserves deep link verification

### ADR-004: Min SDK
- **Decision**: API 26 (Android 8.0) — raised from Capacitor's API 24
- **Rationale**: API 26 adds notification channels (required), autofill, adaptive icons. Coverage: 97%+ of active devices as of 2026.
