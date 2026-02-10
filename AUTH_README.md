# 🔐 MHub Authentication System

> Production-ready authentication for 100k+ users

---

## 📋 Problem Analysis

### Root Cause: Token & UserId Mismatch

| Component | Token Key | UserId Key | Status |
|-----------|-----------|------------|--------|
| `Login.jsx` | `authToken` ✅ | Missing ❌ | Fixed |
| `AuthContext.jsx` | `authToken` ✅ | N/A | OK |
| `api.js` | `authToken` ✅ | N/A | OK |
| `Profile.jsx` | `authToken` ✅ | `userId` ✅ | Requires both |
| `Rewards.jsx` | `authToken` ✅ | `userId` ✅ | Requires both |

**Result**: Login saved `authToken` but NOT `userId`. Protected pages check **both**, causing "not logged in" state.

---

## ✅ Fixes Applied

### 1. Client-Side Token Consistency

**File**: `client/src/pages/Auth/Login.jsx`

```diff
  if (data && data.token) {
    localStorage.setItem("authToken", data.token);
+   localStorage.setItem("userId", data.user.id);  // NEW - Required by protected pages
    localStorage.setItem("user", JSON.stringify(data.user));
+   setUser(data.user);  // NEW - Sync with AuthContext
  }
```

### 2. API Path Fix

**File**: `client/src/lib/auth.js`

```diff
- const res = await api.post('/api/auth/login', loginData);  // WRONG: /api/api/auth/login
+ const res = await api.post('/auth/login', loginData);      // CORRECT: /api/auth/login
```

### 3. AuthContext Enhancement

**File**: `client/src/context/AuthContext.jsx`

```diff
+ export setUser     // Exposes setUser for Login.jsx
+ export refreshAuth // Re-checks auth without page reload

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
+   localStorage.removeItem('userId');  // NEW - Clear userId on logout
  };
```

### 4. Secure JWT Secrets

**File**: `server/.env`

```diff
- JWT_SECRET=supersecretkey123
+ JWT_SECRET=db1870604322d827fe11bf5a03cbbd3a4c0585638e601d4085b9cf785762b8f5
+ REFRESH_SECRET=135ad112c860672c6759bf203f1719f5f737c23473046ff8951145d32ab2852b
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                           │
├─────────────────────────────────────────────────────────────────┤
│  Login.jsx                                                      │
│    ├─ Calls api.post('/auth/login')                            │
│    ├─ Stores: authToken, userId, user, refreshToken            │
│    └─ Calls setUser() to sync AuthContext                      │
│                                                                 │
│  AuthContext.jsx                                                │
│    ├─ Manages: user state                                       │
│    ├─ On mount: Calls /auth/me to verify token                 │
│    └─ Exposes: login, logout, setUser, refreshAuth             │
│                                                                 │
│  api.js (Axios)                                                 │
│    ├─ Reads authToken from localStorage                        │
│    ├─ Attaches Bearer token to all requests                    │
│    └─ Auto-refreshes token on 401                              │
│                                                                 │
│  Protected Pages (Profile, Rewards, etc.)                       │
│    └─ Check: localStorage.userId && localStorage.authToken     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER (Express)                         │
├─────────────────────────────────────────────────────────────────┤
│  jwtConfig.js                                                   │
│    └─ Centralized JWT secrets (256-bit secure)                 │
│                                                                 │
│  authController.js                                              │
│    ├─ signup: Creates user, returns tokens                     │
│    ├─ login: Verifies credentials, returns tokens              │
│    ├─ refresh-token: Issues new access token                   │
│    └─ logout: Invalidates session                              │
│                                                                 │
│  middleware/security.js                                         │
│    ├─ authenticateToken: Verifies JWT                          │
│    ├─ loginLimiter: 5 attempts/15min                           │
│    └─ checkAccountLockout: Blocks locked accounts              │
│                                                                 │
│  redisSession.js                                                │
│    └─ Distributed session store (fallback to memory)           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE                                 │
├─────────────────────────────────────────────────────────────────┤
│  users                                                          │
│    ├─ user_id (UUID)                                           │
│    ├─ email, phone_number, password_hash                       │
│    ├─ login_attempts, lock_until (lockout)                     │
│    └─ tier, role                                               │
│                                                                 │
│  user_sessions                                                  │
│    └─ Tracks active sessions per device                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuration

### Required Environment Variables

```env
# server/.env
PORT=5000
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mhub_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT (REQUIRED - 256-bit secrets)
JWT_SECRET=<64-char-hex>
REFRESH_SECRET=<64-char-hex>

# Redis (RECOMMENDED for 100k+ users)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Generate Secure Secrets

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🧪 Testing Checklist

| Test | Steps | Expected |
|------|-------|----------|
| Email Login | Login → Navigate to /profile | Stay logged in |
| Page Refresh | Login → Refresh page | Stay logged in |
| OTP Login | Phone + OTP → Navigate | Stay logged in |
| Logout | Logout → Try protected page | Redirect to login |
| Rate Limit | 6 failed logins | "Too many attempts" |

---

## 💰 Cost Analysis (100k Users)

| Solution | Monthly Cost |
|----------|--------------|
| **MHub (Self-hosted)** | **$50-110** |
| Auth0 | $240+ |
| Firebase Auth | $50+ |
| Clerk | $350+ |

---

## 📁 Files Changed

| File | Change |
|------|--------|
| `client/src/lib/auth.js` | Fixed `/api` path duplication |
| `client/src/pages/Auth/Login.jsx` | Store `userId`, call `setUser` |
| `client/src/context/AuthContext.jsx` | Add `setUser`, `refreshAuth`, clear `userId` |
| `server/.env` | Secure 256-bit JWT secrets |
| `server/database/migrations/add_lockout_columns.sql` | Account lockout migration |
| `server/tests/auth.test.js` | 9 new auth tests |

---

## 🚀 Quick Start

```bash
# 1. Restart server (to load new JWT secrets)
cd server && npm run dev

# 2. Clear browser storage
# DevTools → Application → Clear Site Data

# 3. Test login
# http://localhost:8081/login
```
