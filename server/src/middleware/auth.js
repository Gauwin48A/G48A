const JWT_CONFIG = require("../config/jwtConfig");
const { verifyToken } = require("../services/tokenVerificationCache");
const {
  getAccessTokenFromRequest,
  getBearerTokenFromHeader,
} = require("../utils/requestAuth");

const authDebugEnabled = process.env.AUTH_DEBUG === "true";

function verifyCandidateToken(token) {
  if (!token) {
    return null;
  }
  try {
    return verifyToken(token, JWT_CONFIG.SECRET);
  } catch {
    return null;
  }
}

function resolveVerifiedUser(req) {
  const cookieToken = req?.cookies?.accessToken || null;
  const headerToken = getBearerTokenFromHeader(req?.headers?.authorization);

  // Preserve existing precedence behavior first.
  const preferredToken = getAccessTokenFromRequest(req, { preferCookie: true });
  const preferredDecoded = verifyCandidateToken(preferredToken);
  if (preferredDecoded) {
    return preferredDecoded;
  }

  // Fallback to the alternate token when one source is stale.
  const alternateToken =
    preferredToken === cookieToken ? headerToken : cookieToken;
  if (!alternateToken || alternateToken === preferredToken) {
    return null;
  }

  return verifyCandidateToken(alternateToken);
}

const protect = (req, res, next) => {
  const hasCookieToken = Boolean(req?.cookies?.accessToken);
  const hasHeaderToken = Boolean(
    getBearerTokenFromHeader(req?.headers?.authorization),
  );

  if (!hasCookieToken && !hasHeaderToken) {
    if (authDebugEnabled) {
      console.log("[AUTH] No token provided for:", req.path);
    }
    return res.status(401).json({ error: "No token provided, authorization denied" });
  }

  const decoded = resolveVerifiedUser(req);
  if (!decoded) {
    if (authDebugEnabled) {
      console.warn("[AUTH] Token verification failed | Path:", req.path);
    }
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = decoded;
  return next();
};

const optionalAuth = (req, res, next) => {
  const decoded = resolveVerifiedUser(req);
  req.user = decoded || null;
  return next();
};

const requireAadhaarVerified = (req, res, next) => {
  if (!req.user || !req.user.aadhaar_verified) {
    return res.status(403).json({
      error: "Aadhaar verification required to access this feature.",
    });
  }
  return next();
};

module.exports = {
  protect,
  optionalAuth,
  requireAadhaarVerified,
};
