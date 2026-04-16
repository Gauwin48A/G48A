# Phase 0 — Route/API Feature Parity Matrix

| Web Route | Server API | Android Screen | Android Status | Priority |
|---|---|---|---|---|
| `/login` | POST `/api/auth/login` | `LoginScreen` | ✅ Implemented | P0 |
| `/signup` | POST `/api/auth/signup` | `SignupScreen` | ✅ Implemented | P0 |
| `/forgot-password` | POST `/api/auth/forgot-password` | `ForgotPasswordScreen` | ✅ Implemented | P0 |
| `/reset-password/:token` | POST `/api/auth/reset-password` | `ResetPasswordScreen` | ✅ Implemented | P0 |
| `/category-hub` (default) | GET `/api/categories` | `CategoryHubScreen` | ✅ Implemented | P0 |
| `/home` | GET `/api/feed`, `/api/posts` | `HomeScreen` | ✅ Implemented | P0 |
| `/all-posts`, `/listings` | GET `/api/posts` | `ListingsScreen` | ✅ Implemented | P0 |
| `/post/:id` | GET `/api/posts/:id` | `PostDetailScreen` | ✅ Implemented | P0 |
| `/add-post`, `/sell` | POST `/api/posts` | `AddPostScreen` | ✅ Implemented | P0 |
| `/edit-post/:postId` | PUT `/api/posts/:id` | `EditPostScreen` | ✅ Implemented | P0 |
| `/profile` | GET `/api/profile` | `ProfileScreen` | ✅ Implemented | P0 |
| `/notifications` | GET `/api/notifications` | `NotificationsScreen` | ✅ Implemented | P0 |
| `/search` | GET `/api/posts?search=` | `SearchScreen` | ✅ Implemented | P0 |
| `/wishlist` | GET `/api/wishlist` | `WishlistScreen` | ✅ Implemented | P0 |
| `/chat` | GET `/api/chat/conversations` | `ConversationListScreen` | ✅ Implemented | P0 |
| `/chat/:id` | Socket.IO + GET `/api/chat/conversations/:id` | `ChatScreen` | ✅ Implemented | P0 |
| `/settings` | N/A (local) | `SettingsScreen` | ✅ Implemented | P0 |
| `/my-posts` (My Listings) | GET `/api/posts/mine` | `MyPostsScreen` | ✅ Implemented | P0 |
| `/dashboard` | Multiple analytics APIs | — | ❌ Not started | P1 |
| `/activity` | Multiple APIs | — | ❌ Not started | P1 |
| `/for-you` | GET `/api/posts/for-you` | — | ❌ Not started | P1 |
| `/bought-posts` | Transaction APIs | — | ❌ Not started | P1 |
| `/sold-posts` | Transaction APIs | — | ❌ Not started | P1 |
| `/buyer-view` | Transaction APIs | — | ❌ Not started | P2 |
| `/saledone` | Sale APIs | — | ❌ Not started | P2 |
| `/saleundone` | Sale undo APIs | — | ❌ Not started | P2 |
| `/rewards` | Rewards APIs | — | ❌ Not started | P2 |
| `/feedback` | Feedback APIs | — | ❌ Not started | P2 |
| `/complaints` | Complaints APIs | — | ❌ Not started | P2 |
| `/admin-panel` | Admin APIs | — | ❌ Not in scope | — |
| `/aadhaar-verify` | Aadhaar APIs | — | ❌ Not started | P2 |
| `/security` | Auth session APIs | — | ❌ Not started | P1 |
| `/nearby-posts` | GET `/api/nearby` | — | ❌ Not started | P1 |
| `/compare` | Local feature | — | ❌ Not started | P2 |
| `/cart` | Cart APIs | — | ❌ Not started | P2 |
| `/channels` | Channel APIs | — | ❌ Not started | P2 |
| `/offers` | Offer APIs | — | ❌ Not started | P2 |
| `/reviews` | Review APIs | — | ❌ Not started | P2 |
| `/analytics` | Seller Analytics APIs | — | ❌ Not started | P2 |
| `/tier-selection` | Subscription APIs | — | ❌ Not started | P2 |
| `/feed` | Feed APIs | — | ❌ Not started | P1 |

## CSRF / Auth Contract Mapping

| Server Mechanism | Android Implementation |
|---|---|
| Double-submit CSRF cookie (`XSRF-TOKEN`) | `CsrfInterceptor` reads cookie, sets `X-XSRF-TOKEN` header |
| GET `/api/auth/csrf-token` bootstrap | `AuthRepository.bootstrapCsrf()` called on launch |
| Cookie-based session (httpOnly `connect.sid`) | `PersistentCookieJar` using WebKit `CookieManager` |
| 401 → refresh token → replay | `TokenRefreshInterceptor` with `AtomicBoolean` guard |
| Device fingerprint (`X-Device-Fingerprint`) | `DeviceFingerprintInterceptor` SHA-256 hash |
| Skip CSRF on `/api/webhooks`, `/api/auth/refresh` | Server-side; client attaches CSRF to all state-changing reqs |

## Socket.IO Events (Chat)

| Event | Direction | Payload |
|---|---|---|
| `join` | Client→Server | `{ userId }` |
| `send_message` | Client→Server | `{ conversationId, content, type }` |
| `new_message` | Server→Client | Message object |
| `typing` | Bidirectional | `{ conversationId, userId }` |
| `notification` | Server→Client | `{ title, message, type }` |
