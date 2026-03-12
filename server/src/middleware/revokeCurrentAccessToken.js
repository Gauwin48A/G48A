const JWT_CONFIG = require("../config/jwtConfig");
const logger = require("../utils/logger");
const { verifyToken } = require("../services/tokenVerificationCache");
const { revokeAccessToken } = require("../services/accessTokenPolicyService");
const { getAccessTokenFromRequest } = require("../utils/requestAuth");

async function revokeCurrentAccessToken(req, _res, next) {
  const accessToken = getAccessTokenFromRequest(req, { preferCookie: true });
  if (!accessToken) {
    return next();
  }

  try {
    const payload = verifyToken(accessToken, JWT_CONFIG.SECRET);
    await revokeAccessToken(accessToken, payload);
  } catch (error) {
    logger.warn("[AUTH] Could not revoke current access token during logout", {
      message: error?.message,
    });
  }

  return next();
}

module.exports = {
  revokeCurrentAccessToken,
};
