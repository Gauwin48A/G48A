const jwt = require("jsonwebtoken");
const JWT_CONFIG = require('../config/jwtConfig');

/**
 * Auth Middleware - Operation Polish
 * Reads JWT from HttpOnly cookie first (secure), then falls back to Authorization header
 */
const protect = (req, res, next) => {
  // Priority 1: HttpOnly cookie (most secure - XSS-proof)
  let token = req.cookies?.accessToken;

  // Priority 2: Authorization header (backward compatibility)
  if (!token) {
    const authHeader = req.headers["authorization"];
    token = authHeader?.split(" ")[1];
  }

  if (!token) {
    console.log('[AUTH] No token provided for:', req.path);
    return res.status(401).json({ error: "No token provided, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, JWT_CONFIG.SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("[AUTH] Token verification failed:", err.message, "| Path:", req.path);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

/**
 * Optional Auth - allows unauthenticated requests but parses token if present
 * Also checks HttpOnly cookie first
 */
const optionalAuth = (req, res, next) => {
  // Priority 1: HttpOnly cookie
  let token = req.cookies?.accessToken;

  // Priority 2: Authorization header
  if (!token) {
    const authHeader = req.headers["authorization"];
    token = authHeader?.split(" ")[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_CONFIG.SECRET);
    req.user = decoded;
  } catch (err) {
    req.user = null;
  }
  next();
};

const requireAadhaarVerified = (req, res, next) => {
  if (!req.user || !req.user.aadhaar_verified) {
    return res.status(403).json({ error: 'Aadhaar verification required to access this feature.' });
  }
  next();
};

module.exports = { protect, optionalAuth, requireAadhaarVerified };
