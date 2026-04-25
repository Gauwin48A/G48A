# Batch 1 — Web⇄Android parity status

_Last updated this session._

| # | Route | Web source | Native file | Status |
|---|---|---|---|---|
| 1 | `/login` | `Mhub/client/src/pages/Auth/Login.jsx` | [LoginScreen.kt](../app/src/main/java/com/mhub/app/ui/auth/LoginScreen.kt) | ✅ Native, ~9.5/10 visual parity |
| 2 | `/forgot-password` | `Mhub/client/src/pages/Auth/ForgotPassword.jsx` | [ForgotPasswordScreen.kt](../app/src/main/java/com/mhub/app/ui/auth/ForgotPasswordScreen.kt) | ✅ Native, ~9.5/10 visual parity |
| 3 | `/signup` | `Mhub/client/src/pages/Auth/Signup.jsx` (34 KB, multi-step Aadhaar + OTP + PAN + Password wizard) | [SignUpScreen.kt](../app/src/main/java/com/mhub/app/ui/auth/SignUpScreen.kt) | ⚠️ Native single-page MVP shipped (Full Name / Email / Mobile / Password). Web's Aadhaar/OTP/PAN multi-step flow not yet ported. |
| 4 | `/category-hub` | `Mhub/client/src/pages/CategoryHub.jsx` | [CategoryHubScreen.kt](../app/src/main/java/com/mhub/app/ui/home/CategoryHubScreen.kt) | ⚠️ Existing native is a generic categories list. Web design is a bold "Choose Your **World**" app-picker with emoji tiles + per-app stats. **Parity gap — needs rebuild.** |
| 5 | `/all-posts` | `Mhub/client/src/pages/AllPosts.jsx` (2800+ lines) | [HomeScreen.kt](../app/src/main/java/com/mhub/app/ui/home/HomeScreen.kt) | ⚠️ Existing native covers basic post list. Web has rich filters, sort, grid/list toggles, infinite scroll, premium badges. **Parity gap — needs feature rebuild (multi-day).** |

## Screenshots
- [Mhub/android-native/test-screenshots/new-login-shot.png](../test-screenshots/new-login-shot.png) — Login
- [Mhub/android-native/test-screenshots/forgot-password-shot.png](../test-screenshots/forgot-password-shot.png) — Forgot Password
- [Mhub/android-native/test-screenshots/signup-shot.png](../test-screenshots/signup-shot.png) — Sign Up

## Architecture toggle
`BuildConfig.WEB_REPLICA_MODE` in `app/build.gradle.kts` (debug variant). Currently `false` so all routes use native Compose screens. Set `true` to fall back to WebView wrappers if needed.

## Pending native work (in priority order)
1. **CategoryHub native rebuild** to "Choose Your World" app-picker grid with emoji tiles, active-app pill, and per-app stats (parity with `Mhub/client/src/pages/CategoryHub.jsx`).
2. **AllPosts/HomeScreen rebuild** with web-parity filters, sort options, grid/list toggle, premium tier badges, infinite scroll.
3. **Signup multi-step wizard**: Aadhaar mobile → OTP → PAN → Password steps wired to `/auth/aadhaar/send-otp`, `/auth/aadhaar/verify`, `/auth/pan/verify`, `/auth/aadhaar/complete-signup`.

## Notes for next session
- Each native screen takes ~300–1500 LOC + ViewModel + sometimes new Repository/DTO/API endpoints. Build wall-clock ~3-5 min per `:app:installDebug`.
- Use `Icons.Filled.X` with explicit imports (not `Icons.Default.X`) — saves repeat compile errors.
- Use `pm clear com.mhub.app.debug` then `am start` for fresh launch.
- Login flow is fragile to automate via `adb input` — prefer static code audit for verifying existing screens; runtime captures ANR-prone.
- ANR recovery: `am crash com.android.systemui` or tap "Wait" in the dialog.

## Pending batches (~70 screens)
Batches 2-10 cover: reset-password, post-detail, profile, dashboard, search, wishlist, cart, my-home, notifications, nearby, for-you, feed, my-feed, public-wall, chat, channels (×4), centre (×4), add-post, post-welcome, sell, tier-selection, pricing, bought-posts, sold-posts, buyer-view, saledone, saleundone, complaints, feedback, rewards, security, account-delete, verification, aadhaar-verify, kyc, analytics, admin-panel, terms, privacy, refund, support-ticket, recently-viewed, saved-searches, compare, offers, payment, reviews, edit-post, post_add.
