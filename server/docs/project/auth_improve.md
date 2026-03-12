# Authentication Improvement Report (Implemented)

## Scope
- Project: `Mhub`
- Date: `2026-03-11`
- Goal: Implement every pending item from previous auth hardening backlog.

## Completed Improvements

### 1) Token validation reliability
- Files:
  - `server/src/middleware/security.js`
  - `server/src/middleware/auth.js`
- Completed:
  - Cookie/header token fallback resolution.
  - Unified auth payload assignment on request (`req.user`, `req.authToken`).

### 2) Cookie-first refresh model and client stability
- Files:
  - `client/src/context/AuthContext.jsx`
  - `client/src/services/api.js`
  - `server/src/config/jwtConfig.js`
- Completed:
  - Refresh token no longer relied upon in local storage.
  - Single-flight refresh and proactive refresh retained.
  - Refresh token body exposure disabled in production.

### 3) CSRF protection for cookie-auth routes
- Files:
  - `server/src/routes/auth.js`
  - `server/src/middleware/csrf.js`
  - `client/src/context/AuthContext.jsx`
  - `client/src/services/api.js`
- Completed:
  - `GET /api/auth/csrf-token` bootstrap endpoint used by client.
  - CSRF enforcement on auth mutation routes:
    - `/auth/refresh-token`
    - `/auth/logout`
    - `/auth/set-password`
    - `/auth/sessions` revoke endpoints.
  - Client sends `X-XSRF-TOKEN` on state-changing requests.

### 4) Immediate access-token revocation + password-change invalidation
- Files:
  - `server/src/services/accessTokenPolicyService.js`
  - `server/src/middleware/revokeCurrentAccessToken.js`
  - `server/src/middleware/security.js`
  - `server/src/middleware/auth.js`
  - `server/src/routes/auth.js`
- Completed:
  - Logout revokes current access token immediately (denylist by token hash + TTL).
  - Middleware rejects revoked tokens.
  - Middleware invalidates tokens issued before `password_changed_at`.

### 5) Adaptive MFA enforcement for password login
- Files:
  - `server/src/services/twoFactorPolicyService.js`
  - `server/src/middleware/adaptiveMfaLogin.js`
  - `server/src/routes/auth.js`
- Completed:
  - Login now enforces authenticator step-up for accounts with 2FA enabled.
  - Challenge contract supports existing login flow:
    - `202` + `requireOtp` + `challengeType`.
  - Supports TOTP validation and backup-code consumption.

### 6) Auth failure normalization and timing hardening
- Files:
  - `server/src/middleware/authResponseHardening.js`
  - `server/src/routes/auth.js`
- Completed:
  - Normalized auth failure envelope for 401/403/429 login responses.
  - Added minimum response timing to reduce credential/lockout enumeration signals.
  - Preserved explicit challenge responses (`requireOtp`, risk challenge, MFA challenge).

### 7) Session retention policy (cap + cleanup)
- Files:
  - `server/src/services/authSessionRetentionService.js`
  - `server/src/middleware/authSessionRetentionMiddleware.js`
  - `server/src/routes/auth.js`
- Completed:
  - Deactivates expired sessions.
  - Enforces per-user active session cap using ranked retention query.
  - Runs lightweight periodic sweeps during auth traffic.

### 8) Stronger OTP/reset anomaly throttles
- Files:
  - `server/src/middleware/authAnomalyThrottle.js`
  - `server/src/routes/auth.js`
- Completed:
  - Added IP + subject-based anomaly limits on:
    - `/auth/login`
    - `/auth/send-otp`
    - `/auth/verify-otp`
    - `/auth/forgot-password`
    - `/auth/reset-password`

### 9) Buffered audit fallback + alerting
- Files:
  - `server/src/services/authAuditService.js`
  - `server/src/middleware/authAuditMiddleware.js`
  - `server/src/routes/auth.js`
- Completed:
  - Added auth audit middleware for auth routes.
  - Primary write to `audit_logs`.
  - Fallback sink to NDJSON file with throttled alerts when DB write fails.

### 10) Session/device management UI
- Files:
  - `client/src/pages/SecuritySettings.jsx`
- Completed:
  - Added Active Sessions UX:
    - List active sessions.
    - Revoke single session.
    - Revoke all sessions.
  - Kept 2FA setup/verify/disable controls in same page.

### 11) Route-aware auth event handling (no hard redirect coupling)
- Files:
  - `client/src/services/api.js`
  - `client/src/components/AuthEventRouter.jsx`
  - `client/src/main.jsx`
- Completed:
  - API layer emits global auth/security events instead of hard redirect coupling.
  - Router-level listener performs route-aware navigation with `returnTo`.

## Final Status
- All previously listed pending items are now implemented in code.

## 2026-03-12 Client Hardening Update
Additional auth reliability updates were applied on the client to remove session flicker and enforce guard consistency:

### 12) Route-level auth enforcement
- Files:
  - `client/src/App.jsx`
  - `client/src/components/RequireAuth.jsx`
- Completed:
  - Added a centralized `RequireAuth` wrapper for protected routes.
  - Admin-only route guard now enforces role checks on `/admin-panel`.
  - Security settings route now requires authentication.
  - Guard waits for auth bootstrap to finish before redirecting to prevent false logouts.

### 13) Session-aware UI state
- Files:
  - `client/src/components/GreenNavbar.jsx`
  - `client/src/utils/authStorage.js`
  - `client/src/context/LocationContext.jsx`
- Completed:
  - Navbar uses `AuthContext.isAuthenticated` (session-aware) to avoid guest flicker.
  - `isAuthenticated()` treats `authSession` as valid (cookie session compatible).
  - Location capture respects authenticated sessions even before user hydration.

## Verification Checklist
- [x] Cookie/header token fallback works.
- [x] CSRF protection works for cookie-auth mutation routes.
- [x] Access token revokes immediately on logout.
- [x] Password change invalidates earlier access tokens.
- [x] Adaptive MFA challenge is enforced for 2FA-enabled accounts.
- [x] Login auth failures are normalized and timing-hardened.
- [x] OTP/reset anomaly throttles are active.
- [x] Session retention cap + cleanup is active.
- [x] Audit fallback sink + alerting exists.
- [x] Active Sessions UI exists and calls revoke APIs.
- [x] API interceptor auth handling is route-aware via event router.
- [x] Route-level auth guard ensures protected pages always enforce session.
