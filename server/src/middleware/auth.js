const JWT_CONFIG = require('../config/jwtConfig');
const { verifyToken } = require('../services/tokenVerificationCache');
const { getAccessTokenFromRequest } = require('../utils/requestAuth');
const authDebugEnabled = process.env.AUTH_DEBUG === 'true';

/**
 * Auth Middleware - Operation Polish
 * Reads JWT from HttpOnly cookie first (secure), then falls back to Authorization header
 */
const protect = (req, res, next) => {
  const token = getAccessTokenFromRequest(req, { preferCookie: true });

  if (!token) {
    if (authDebugEnabled) {
      console.log('[AUTH] No token provided for:', req.path);
    }
    return res.status(401).json({ error: "No token provided, authorization denied" });
  }

  try {
    const decoded = verifyToken(token, JWT_CONFIG.SECRET);
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
  const token = getAccessTokenFromRequest(req, { preferCookie: true });

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyToken(token, JWT_CONFIG.SECRET);
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
