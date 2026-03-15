const JWT_CONFIG = require("../config/jwtConfig");
const { verifyToken } = require("../services/tokenVerificationCache");
const {
  getAccessTokenFromRequest,
  getBearerTokenFromHeader,
} = require("../utils/requestAuth");
const {
  isAccessTokenInvalidByPasswordChange,
  isAccessTokenRevoked,
} = require("../services/accessTokenPolicyService");

const authDebugEnabled = process.env.AUTH_DEBUG === "true";

function verifyCandidateToken(token) {
  if (!token) {
    return null;
  }
  try {
    return verifyToken(token, JWT_CONFIG.SECRET, {
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE,
    });
  } catch {
    return null;
  }
}

function resolveVerifiedAuth(req) {
  const cookieToken = req?.cookies?.accessToken || null;
  const headerToken = getBearerTokenFromHeader(req?.headers?.authorization);

  // Preserve existing precedence behavior first.
  const preferredToken = getAccessTokenFromRequest(req, { preferCookie: true });
  const preferredDecoded = verifyCandidateToken(preferredToken);
  if (preferredDecoded) {
    return {
      token: preferredToken,
      payload: preferredDecoded,
    };
  }

  // Fallback to the alternate token when one source is stale.
  const alternateToken =
    preferredToken === cookieToken ? headerToken : cookieToken;
  if (!alternateToken || alternateToken === preferredToken) {
    return null;
  }

  const alternateDecoded = verifyCandidateToken(alternateToken);
  if (!alternateDecoded) {
    return null;
  }

  return {
    token: alternateToken,
    payload: alternateDecoded,
  };
}

const protect = async (req, res, next) => {
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

  const verifiedAuth = resolveVerifiedAuth(req);
  if (!verifiedAuth) {
    if (authDebugEnabled) {
      console.warn("[AUTH] Token verification failed | Path:", req.path);
    }
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  try {
    const revoked = await isAccessTokenRevoked(verifiedAuth.token);
    if (revoked) {
      return res.status(401).json({ error: "Session revoked. Please login again." });
    }

    const invalidByPasswordChange = await isAccessTokenInvalidByPasswordChange(
      verifiedAuth.payload,
    );
    if (invalidByPasswordChange) {
      return res
        .status(401)
        .json({ error: "Session expired due to password change. Please login again." });
    }
  } catch (policyError) {
    if (authDebugEnabled) {
      console.warn("[AUTH] Token policy check failed (denying):", policyError?.message);
    }
    return res.status(500).json({ error: "Authentication service temporarily unavailable." });
  }

  req.user = verifiedAuth.payload;
  req.authToken = verifiedAuth.token;
  return next();
};

const optionalAuth = (req, res, next) => {
  const verifiedAuth = resolveVerifiedAuth(req);
  req.user = verifiedAuth?.payload || null;
  req.authToken = verifiedAuth?.token || null;
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
