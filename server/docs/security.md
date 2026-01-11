# 🔒 MHub Security Implementation

This document details the security measures implemented in MHub to protect against common web vulnerabilities and ensure data integrity.

---

## Security Layers

### 1. HTTP Security Headers (Helmet)

**Location:** `server/src/index.js`

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.haveibeenpwned.com"],
    }
  }
}));
```

**Protection Against:**
- Cross-Site Scripting (XSS)
- Clickjacking
- MIME type sniffing
- Content injection

---

### 2. Rate Limiting

**Configuration:**
- 500 requests per 15 minutes per IP
- Stricter limits on auth endpoints (10/min)

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: "Too many requests" }
});
```

**Protection Against:**
- DDoS attacks
- Brute force attacks
- API abuse

---

### 3. Input Sanitization

**Libraries Used:**
- `xss-clean` - Removes `<script>` tags
- `hpp` - Prevents HTTP Parameter Pollution
- Express JSON limit (10kb) - Prevents payload attacks

```javascript
app.use(express.json({ limit: '10kb' }));
app.use(xss());
app.use(hpp());
```

---

### 4. CORS Configuration

**Allowed Origins:**
- `http://localhost:5173` (development)
- `https://mhub-app.vercel.app` (production)

```javascript
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
```

---

### 5. Authentication

**JWT Token System:**
- Access Token: 15 minutes expiry
- Refresh Token: 7 days expiry
- Tokens stored in httpOnly cookies (production)

**Password Security:**
- bcrypt hashing (10 rounds)
- Minimum 8 characters required
- HaveIBeenPwned API integration (optional)

---

### 6. Database Security

**Row Level Security (RLS):**
```sql
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY posts_owner_policy ON posts
  FOR ALL TO authenticated_user
  USING (user_id = current_user_id());
```

**Parameterized Queries:**
All database queries use parameterized statements to prevent SQL injection.

```javascript
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);
```

---

### 7. File Upload Security

**Cloudinary Integration:**
- Files never stored on server
- Automatic format validation
- Size limits enforced
- Image transformations strip EXIF data

```javascript
params: {
  folder: 'mhub_production',
  allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  transformation: [{ width: 1080, crop: "limit" }]
}
```

---

### 8. Session Management

**Security Features:**
- Session timeout after 30 minutes of inactivity
- Force logout on password change
- Device tracking for suspicious activity

---

## Security Checklist

| Feature | Status |
|---------|--------|
| HTTPS enforcement | ✅ |
| Helmet headers | ✅ |
| Rate limiting | ✅ |
| XSS protection | ✅ |
| SQL injection prevention | ✅ |
| CSRF protection | ✅ |
| JWT authentication | ✅ |
| Password hashing | ✅ |
| Input validation | ✅ |
| File upload validation | ✅ |
| Error handling (no stack traces) | ✅ |
| Secure cookie settings | ✅ |

---

## Reporting Vulnerabilities

If you discover a security vulnerability, please email security@mhub.com with:
1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact

We will respond within 48 hours.
