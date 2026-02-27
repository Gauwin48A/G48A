# MHub Authentication Reference

Last updated: 2026-02-27
Status: OPERATIONAL

## Completed
- Email/password signup and login.
- OTP send/verify for login flows.
- Access + refresh token lifecycle with session handling.
- 2FA (TOTP) setup/verify/disable endpoints.
- Login lockout and rate limiting controls.
- OTP delivery callback ingestion and delivery metrics endpoint.

## Core Endpoints
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`
- `POST /api/auth/refresh-token`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/2fa/setup`
- `POST /api/auth/2fa/verify`
- `POST /api/auth/otp/callback/:provider`
- `GET /api/auth/otp/metrics`

## Validation Evidence
- Server integration and auth suites pass.
- Critical path tests pass for signup/login/me flow.
- WAF and auth rate-limit tests pass.

## Pending Enhancements
- Consolidate OTP provider abstraction for stricter production-only providers.
- Resolve non-blocking Jest open-handle warning in teardown.
