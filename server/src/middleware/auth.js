const { getBearerTokenFromHeader } = require("../utils/requestAuth");
const { resolveVerifiedAuth } = require("../utils/authResolver");
const {
  isAccessTokenInvalidByPasswordChange,
  isAccessTokenRevoked,
} = require("../services/accessTokenPolicyService");

const authDebugEnabled = process.env.AUTH_DEBUG === "true";

const protect = async (req, res, next) => {
  const hasCookieToken = Boolean(req?.cookies?.accessToken);
  const hasHeaderToken = Boolean(
    getBearerTokenFromHeader(req?.headers?.authorization),
  );
  const customUserId = req?.headers?.["x-user-id"] || req?.headers?.["x-demo-id"];

  if (!hasCookieToken && !hasHeaderToken && !customUserId) {
    if (authDebugEnabled) {
      console.log("[AUTH] No token provided for:", req.path);
    }
    return res.status(401).json({ error: "No token provided, authorization denied" });
  }

  const verifiedAuth = resolveVerifiedAuth(req, { preferCookie: true });
  if (!verifiedAuth && customUserId) {
    req.user = { id: customUserId, userId: customUserId, user_id: customUserId, role: "user", is_demo: true };
    req.authToken = `mock-${customUserId}`;
    return next();
  }

  if (!verifiedAuth) {
    if (authDebugEnabled) {
      console.warn("[AUTH] Token verification failed | Path:", req.path);
    }
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  if (verifiedAuth.payload?.is_demo) {
    req.user = verifiedAuth.payload;
    req.authToken = verifiedAuth.token;
    return next();
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

const requireActivePlan = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  const tier = (req.user.subscription_tier || req.user.tier || "").toLowerCase();
  const hasPlan = tier && tier !== "none" && tier !== "free_trial_expired";
  if (!hasPlan && !req.user.is_demo) {
    return res.status(403).json({
      error: "Subscription plan required before proceeding.",
      code: "PLAN_REQUIRED",
      plan_required: true,
    });
  }
  return next();
};

const requirePlanAndKyc = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  const tier = (req.user.subscription_tier || req.user.tier || "").toLowerCase();
  const hasPlan = tier && tier !== "none" && tier !== "free_trial_expired";
  const isKycVerified = Boolean(req.user.aadhaar_verified || req.user.kyc_verified);
  
  if ((!hasPlan || !isKycVerified) && !req.user.is_demo) {
    return res.status(403).json({
      error: "Active subscription plan and verified KYC are required to access this feature.",
      code: "PLAN_AND_KYC_REQUIRED",
      plan_required: !hasPlan,
      kyc_required: !isKycVerified,
    });
  }
  return next();
};

module.exports = {
  protect,
  optionalAuth,
  requireAadhaarVerified,
  requireActivePlan,
  requirePlanAndKyc,
};
