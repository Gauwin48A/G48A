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
  // Only honor the guest/demo identity when the request carried NO token at all.
  // If a token WAS presented but failed verification, return 401 so the client's
  // token-refresh flow runs — instead of silently downgrading a real (expired)
  // session to demo and breaking authenticated features like KYC.
  if (!verifiedAuth && customUserId && !hasCookieToken && !hasHeaderToken) {
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

  req.user = verifiedAuth.payload || {};
  if (req.user && typeof req.user === "object") {
    const fallbackId = customUserId || verifiedAuth.payload?.sub || verifiedAuth.payload?.userId || verifiedAuth.payload?.id || "demo_user";
    if (!req.user.id) req.user.id = fallbackId;
    if (!req.user.userId) req.user.userId = fallbackId;
    if (!req.user.user_id) req.user.user_id = fallbackId;
  }
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

/**
 * Enrich req.user with plan/KYC claims from the DB when the JWT didn't carry them.
 * Access tokens only sign { id, userId, role, name }; plan gates read tier / KYC
 * flags from req.user, so real (non-demo) sessions need a fallback lookup.
 */
const enrichPlanClaims = async (req) => {
  const userId = req.user?.user_id || req.user?.userId || req.user?.id;
  if (!userId || req.user?.is_demo) return;
  try {
    const pool = require("../config/db");
    const { rows } = await pool.query(
      `SELECT tier, current_plan, current_tier, kyc_status, kyc_verified, isaadhaarverified
       FROM users WHERE user_id::text = $1 LIMIT 1`,
      [String(userId)],
    );
    if (rows[0]) {
      // ALWAYS refresh plan + KYC claims from the DB. JWTs freeze kyc_status /
      // kyc_verified at login time (e.g. 'PENDING'/false), so a user who completes
      // KYC later would be stuck with the stale claim and false 403s. Fresh DB
      // state wins for every gate that calls this (requirePlanAndKyc etc).
      const tierValue = rows[0].tier || rows[0].current_plan || null;
      req.user.subscription_tier = tierValue;
      req.user.tier = tierValue;
      req.user.current_tier = rows[0].current_tier || tierValue || null;
      req.user.kyc_status = rows[0].kyc_status || null;
      req.user.kyc_verified =
        rows[0].kyc_verified === true ||
        String(rows[0].kyc_verified).toLowerCase() === "true";
      req.user.aadhaar_verified =
        rows[0].isaadhaarverified === true ||
        String(rows[0].isaadhaarverified).toLowerCase() === "true";
    }
  } catch (err) {
    // Non-blocking: let the gate evaluate with whatever claims exist.
  }
};

/**
 * True when the user has a REAL active subscription: an ACTIVE row in
 * user_subscriptions whose end_date is still in the future. The legacy
 * tier/current_plan string on users is a display mirror and defaults to
 * 'basic' for everyone, so it is never treated as proof of a plan.
 */
const hasActiveSubscription = async (userId) => {
  if (!userId) return false;
  try {
    const pool = require("../config/db");
    const { rows } = await pool.query(
      `SELECT 1 FROM user_subscriptions
       WHERE user_id::text = $1 AND status = 'ACTIVE' AND end_date > NOW()
       LIMIT 1`,
      [String(userId)]
    );
    return rows.length > 0;
  } catch (err) {
    return false;
  }
};

/**
 * True when the user's KYC is verified. Accepts every value the stack uses:
 * boolean columns (kyc_verified, aadhaar_verified) and the status strings
 * the providers write ('VERIFIED', 'APPROVED', 'PAN_VERIFIED').
 */
const isKycVerifiedUser = (user) => {
  if (!user) return false;
  if (user.is_demo) return true;
  if (user.kyc_verified === true || user.aadhaar_verified === true) return true;
  const status = String(user.kyc_status || "").toUpperCase();
  return status === "VERIFIED" || status === "APPROVED" || status === "PAN_VERIFIED";
};

const requireActivePlan = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  if (req.user.is_demo) return next();
  const userId = req.user.user_id || req.user.userId || req.user.id;
  const hasPlan = await hasActiveSubscription(userId);
  if (!hasPlan) {
    return res.status(403).json({
      error: "Subscription plan required before proceeding.",
      code: "PLAN_REQUIRED",
      plan_required: true,
    });
  }
  return next();
};

const requirePlanAndKyc = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required." });
  }
  if (req.user.is_demo) return next();
  await enrichPlanClaims(req);
  const userId = req.user.user_id || req.user.userId || req.user.id;
  const hasPlan = await hasActiveSubscription(userId);
  const isKycVerified = isKycVerifiedUser(req.user);

  if (!hasPlan || !isKycVerified) {
    return res.status(403).json({
      error: "Active subscription plan and verified KYC are required to access this feature.",
      code: "PLAN_AND_KYC_REQUIRED",
      plan_required: !hasPlan,
      kyc_required: !isKycVerified,
    });
  }
  return next();
};

const checkFrozenAccountDisputeRestriction = async (req, res, next) => {
  if (!req.user || req.user.is_demo) return next();

  const userId = req.user.user_id || req.user.id;
  if (!userId) return next();

  // Allow dispute responses, support messaging, profile view, and auth endpoints
  const allowedPaths = ["/dispute", "/disputes", "/logout", "/me", "/profile", "/notifications"];
  const isAllowedPath = allowedPaths.some((p) => req.path.toLowerCase().includes(p));
  if (isAllowedPath) return next();

  try {
    const { getAccountState } = require("../services/accountStateService");
    const accountInfo = await getAccountState(userId);
    if (accountInfo && accountInfo.state === "FROZEN_DISPUTE") {
      return res.status(403).json({
        error: "Your account is temporarily frozen due to an active transaction dispute. You only have access to view and respond to your active dispute.",
        code: "ACCOUNT_FROZEN_DISPUTE",
        state: "FROZEN_DISPUTE",
      });
    }
  } catch (err) {
    // Non-blocking on error
  }

  return next();
};

module.exports = {
  protect,
  optionalAuth,
  requireAadhaarVerified,
  requireActivePlan,
  requirePlanAndKyc,
  checkFrozenAccountDisputeRestriction,
};
