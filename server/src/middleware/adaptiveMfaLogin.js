const logger = require("../utils/logger");
const {
  getTwoFactorSettingsByIdentifier,
  verifyTwoFactorCodeOrBackup,
} = require("../services/twoFactorPolicyService");

const ADAPTIVE_MFA_ENABLED = String(process.env.AUTH_ADAPTIVE_MFA_ENABLED || "true")
  .trim()
  .toLowerCase() !== "false";

const MFA_CHALLENGE_HTTP_STATUS = Number.parseInt(
  process.env.AUTH_MFA_CHALLENGE_STATUS || "202",
  10,
);

function parseOptionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function resolveIdentifier(body = {}) {
  return parseOptionalString(body.identifier || body.email || body.phone);
}

function resolveSubmittedCode(body = {}) {
  return parseOptionalString(
    body.twoFactorCode ||
      body.two_factor_code ||
      body.otp ||
      body.code,
  );
}

async function enforceAdaptiveMfaLogin(req, res, next) {
  if (!ADAPTIVE_MFA_ENABLED) {
    return next();
  }

  try {
    const identifier = resolveIdentifier(req.body);
    if (!identifier) {
      return next();
    }

    const settings = await getTwoFactorSettingsByIdentifier(identifier);
    if (!settings?.enabled) {
      return next();
    }

    const submittedCode = resolveSubmittedCode(req.body);
    if (!submittedCode) {
      return res.status(MFA_CHALLENGE_HTTP_STATUS).json({
        error: "Additional verification required",
        code: "TWO_FACTOR_REQUIRED",
        requireOtp: true,
        challengeType: "otp",
        message: "Enter your authenticator code to continue.",
      });
    }

    const verificationResult = await verifyTwoFactorCodeOrBackup({
      userId: settings.userId,
      code: submittedCode,
      secret: settings.secret,
      backupCodes: settings.backupCodes,
      schemaMode: settings.schemaMode,
    });

    if (!verificationResult.valid) {
      return res.status(401).json({
        error: "Invalid verification code",
        code: "TWO_FACTOR_INVALID",
        challengeType: "otp",
        message: "Invalid authenticator code. Try again.",
      });
    }

    req.authStepUp = {
      twoFactorValidated: true,
      method: verificationResult.method,
      userId: settings.userId,
    };
    return next();
  } catch (error) {
    logger.warn("[AUTH] Adaptive MFA guard failed", { message: error?.message });
    return next();
  }
}

module.exports = {
  enforceAdaptiveMfaLogin,
};
