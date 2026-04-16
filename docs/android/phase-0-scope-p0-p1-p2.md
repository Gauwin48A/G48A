# Phase 0 — Scope Classification (P0 / P1 / P2)

## P0 — Launch-Critical (Must Ship)

All of these are implemented in the Android codebase.

| Feature | Screen | API Dependency | Status |
|---|---|---|---|
| Login (email/phone + password) | `LoginScreen` | POST `/api/auth/login` | ✅ |
| Signup (name/email/phone/password) | `SignupScreen` | POST `/api/auth/signup` | ✅ |
| Forgot / Reset password | `ForgotPasswordScreen`, `ResetPasswordScreen` | POST `/api/auth/forgot-password`, `/reset-password` | ✅ |
| CSRF bootstrap + cookie session | `MainViewModel.bootstrap()` | GET `/api/auth/csrf-token`, `/api/auth/session` | ✅ |
| Token refresh on 401 | `TokenRefreshInterceptor` | POST `/api/auth/refresh-token` | ✅ |
| Logout | `ProfileScreen` | POST `/api/auth/logout` | ✅ |
| Browse categories | `CategoryHubScreen` | GET `/api/categories` | ✅ |
| Home feed | `HomeScreen` | GET `/api/posts` | ✅ |
| Listings by category | `ListingsScreen` | GET `/api/posts?category=` | ✅ |
| Post detail | `PostDetailScreen` | GET `/api/posts/:id` | ✅ |
| Create post (with image upload) | `AddPostScreen` | POST `/api/posts` | ✅ |
| Edit post | `EditPostScreen` | PUT `/api/posts/:id` | ✅ |
| Delete post | `EditPostScreen` | DELETE `/api/posts/:id` | ✅ |
| My posts | `MyPostsScreen` | GET `/api/posts/mine` | ✅ |
| Search with pagination | `SearchScreen` (Paging 3) | GET `/api/posts?search=` | ✅ |
| Wishlist (add/remove/list) | `WishlistScreen`, `PostDetailScreen` | GET/POST/DELETE `/api/wishlist` | ✅ |
| Notifications (list/read/read-all) | `NotificationsScreen` | GET/PUT `/api/notifications` | ✅ |
| User profile | `ProfileScreen` | GET `/api/profile` | ✅ |
| Chat conversations + messages | `ConversationListScreen`, `ChatScreen` | REST + Socket.IO | ✅ |
| Settings (theme/biometric/notifications) | `SettingsScreen` | Local preferences | ✅ |
| Offline caching (Room) | PostDao, CategoryDao, NotificationDao | — | ✅ |
| Offline banner | `MhubApp` connectivity observer | — | ✅ |
| Deep links (mhub://, https://mhub.app) | `MhubNavHost` deepLinks | — | ✅ |
| Push notification registration | `MhubFirebaseMessagingService` | POST `/api/push/register` | ✅ (needs google-services.json) |
| Background sync | `SyncWorker` (6h periodic) | GET `/api/posts` | ✅ |

## P1 — Fast-Follow (Next Sprint)

| Feature | Screen | API Dependency | Notes |
|---|---|---|---|
| OTP login | — | POST `/api/auth/send-otp`, `/verify-otp` | API exists, screen needed |
| Google Sign-In | — | POST `/api/auth/social/google` | Credential Manager deps added |
| 2FA setup/validation | — | POST `/api/auth/2fa/*` | API exists |
| Security settings (sessions) | — | GET/DELETE `/api/auth/sessions` | API exists |
| Nearby posts | — | GET `/api/nearby` | Location permission done |
| For You feed | — | GET `/api/posts/for-you` | |
| Feed page | — | GET `/api/feed` | |
| Bought/Sold posts | — | Transaction APIs | |
| Seller analytics | — | Seller Analytics APIs | |
| Contact sync | — | POST `/api/contacts/sync` | Permission declared |
| Profile edit (avatar upload) | — | POST `/api/profile/upload-avatar` | |
| Recently viewed | — | POST `/api/recently-viewed/track` | |
| Saved searches | — | POST/GET `/api/saved-searches` | |
| Price alerts | — | POST `/api/price-alerts/subscribe` | |

## P2 — Deferred (Post-Launch)

| Feature | Notes |
|---|---|
| Admin panel | Web-only |
| Aadhaar/KYC verification | Complex ID verification flow |
| Cart + payments (Razorpay) | Payment SDK integration |
| Channels (create/follow/analytics) | Community feature |
| Offers (make/accept/counter) | Negotiation flow |
| Reviews (create/respond/flag) | Trust system |
| Rewards/Coins (spin wheel, scratch, daily) | Gamification |
| Subscriptions/Tiers | Monetization |
| Complaints/Feedback | Support system |
| Compare posts | Local feature |
| Public wall | Community feature |
| Invite/Referral tracking | Growth feature |
| Sale done/undone flows | Transaction lifecycle |
