const { getUserRiskState } = require("../services/riskStateService");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const ALLOWED_MUTATION_PREFIXES = [
  "/api/auth",
  "/api/complaints",
  "/api/notifications",
  "/api/telemetry",
  "/api/analytics",
];

const buildFullPath = (req) => `${req.baseUrl || ""}${req.path || ""}`;

const isAllowedMutation = (fullPath) =>
  ALLOWED_MUTATION_PREFIXES.some((prefix) => fullPath.startsWith(prefix));

const buildRestrictionPayload = (riskLevel) => {
  if (riskLevel === "frozen") {
    return {
      error: "Account frozen",
      code: "ACCOUNT_FROZEN",
      message:
        "Your account is temporarily frozen due to a complaint. Please contact support.",
    };
  }
  if (riskLevel === "high") {
    return {
      error: "Account restricted",
      code: "HIGH_RISK_RESTRICTION",
      message:
        "High-risk login detected. Some actions are restricted until verification completes.",
    };
  }
  if (riskLevel === "limited") {
    return {
      error: "Account limited",
      code: "RISK_RESTRICTION",
      message:
        "New device or location detected. Some actions are temporarily limited.",
    };
  }
  return {
    error: "Account restricted",
    code: "RISK_RESTRICTION",
    message: "Action restricted due to account risk status.",
  };
};

const riskRestrictionMiddleware = async (req, res, next) => {
  const user = req.user;
  if (!user) return next();

  const role = String(user.role || "").toLowerCase();
  if (["admin", "superadmin", "moderator"].includes(role)) return next();

  const userId = user.userId || user.id;
  if (!userId) return next();

  let riskState = null;
  try {
    riskState = await getUserRiskState(userId);
  } catch {
    return next();
  }
  if (!riskState || !riskState.status || riskState.status === "normal") {
    return next();
  }

  const fullPath = buildFullPath(req);
  if (SAFE_METHODS.has(req.method)) return next();
  if (isAllowedMutation(fullPath)) return next();

  const payload = buildRestrictionPayload(riskState.status);
  return res.status(403).json({
    ...payload,
    riskLevel: riskState.status,
  });
};

module.exports = { riskRestrictionMiddleware };
