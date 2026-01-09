# 🛡️ MHub Security Documentation

## Current Security Implementation

### ✅ Implemented Measures (25 Total)

| Layer | Feature | File | Status |
|-------|---------|------|--------|
| **HTTP** | Helmet + CSP | `index.js` | ✅ |
| **HTTP** | X-Powered-By disabled | `index.js` | ✅ |
| **CORS** | Dynamic whitelist | `index.js` | ✅ |
| **Auth** | HttpOnly JWT cookies | `authController.js` | ✅ |
| **Auth** | Generic error messages | `authController.js` | ✅ |
| **Auth** | 5-strike lockout | `security.js` | ✅ |
| **Auth** | Password breach check | `breachCheck.js` | ✅ |
| **Auth** | 2FA (TOTP) | `twoFactor.js` | ✅ |
| **Auth** | CAPTCHA (reCAPTCHA v3) | `captcha.js` | ✅ |
| **Rate Limit** | 300/15min general | `index.js` | ✅ |
| **Rate Limit** | 10/hour auth | `index.js` | ✅ |
| **Input** | XSS sanitization | `security.js` | ✅ |
| **Input** | SQL parameterization | All controllers | ✅ |
| **Input** | Body limit 10KB | `index.js` | ✅ |
| **CSRF** | Token-based | `csrf.js` | ✅ |
| **DB** | SSL in production | `db.js` | ✅ |
| **Session** | Redis (with fallback) | `redisSession.js` | ✅ |
| **Logging** | Audit logger | `auditLogger.js` | ✅ |
| **Tracking** | Geo-location alerts | `geoAlert.js` | ✅ |
| **Tracking** | Device fingerprinting | `deviceTracker.js` | ✅ |
| **GDPR** | Data export | `gdprController.js` | ✅ |
| **GDPR** | Account deletion | `gdprController.js` | ✅ |
| **Docs** | WAF rules | `waf-rules.md` | ✅ |
| **Docs** | Bug bounty policy | `security-policy.md` | ✅ |
| **HPP** | Parameter pollution | `index.js` | ✅ |

---

## Environment Variables

```env
# Security
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
NODE_ENV=production

# CORS
CLIENT_URL=https://your-frontend.com

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional

# CAPTCHA (optional)
RECAPTCHA_SECRET_KEY=your_recaptcha_secret

# Database
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
DB_PORT=5432
```

---

## API Endpoints

### GDPR
- `GET /api/gdpr/export` - Download all user data
- `DELETE /api/gdpr/delete` - Delete account permanently

---

## Weekly Maintenance

- [ ] Run `npm audit fix`
- [ ] Review `logs/audit.log`
- [ ] Check rate limit violations
- [ ] Rotate API keys if needed

---

*Last Updated: 2026-01-04*
