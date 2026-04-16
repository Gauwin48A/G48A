/**
 * Device Binding — Post-Authentication Middleware
 * ─────────────────────────────────────────────────
 * Uses proper Express middleware pattern instead of monkey-patching res.json.
 *
 * Architecture:
 * - deviceBindingPostLogin: runs AFTER auth controller sets req.authResult
 * - deviceBindingPostOtp: runs AFTER OTP verification sets req.authResult
 * - mandatoryOtpEnforcer: checks if OTP is required before login completes
 *
 * The auth controller must set `req.authResult = { user, success, ... }`
 * instead of calling res.json() directly. This middleware then sends the
 * final response after device binding checks.
 */

const logger = require("../utils/logger");
const { runQuery } = require("../utils/dbHelpers");
const JWT_CONFIG = require("../config/jwtConfig");
const {
  checkDeviceBinding,
  checkAccountSwitching,
  logAuthActivity,
  bindPhoneToDevice,
  verifyLoginOtp,
  extractDeviceFingerprint,
} = require("./deviceBinding");
const { evaluateLoginRisk, setUserRiskState } = require("../services/riskStateService");

/**
 * Middleware: enforce device binding after successful login.
 * Must be placed AFTER the auth controller in the middleware chain.
 * Auth controller should call next() instead of res.json() on success,
 * setting req.authResult with the response payload.
 */
const BINDING_TIMEOUT_MS = parseInt(process.env.DEVICE_BINDING_TIMEOUT_MS || "10000", 10);

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("BINDING_TIMEOUT")), ms)),
  ]);

const clearAuthCookies = (res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: JWT_CONFIG.ACCESS_COOKIE_OPTIONS.secure,
    sameSite: JWT_CONFIG.ACCESS_COOKIE_OPTIONS.sameSite,
    path: JWT_CONFIG.ACCESS_COOKIE_OPTIONS.path,
  });
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: JWT_CONFIG.COOKIE_OPTIONS.secure,
    sameSite: JWT_CONFIG.COOKIE_OPTIONS.sameSite,
    path: JWT_CONFIG.COOKIE_OPTIONS.path,
  });
};

const buildStepUpResponse = (message, extras = {}) => ({
  success: false,
  requireOtp: true,
  challengeType: "sms_otp",
  challengeOptions: ["sms_otp", "security_questions", "selfie_check"],
  code: "STEP_UP_REQUIRED",
  message:
    message ||
    "For security, please verify your phone number with an OTP sent to your registered mobile.",
  _triggerOtpSend: true,
  ...extras,
});

const deactivatePendingBinding = async (userId, req, reason = "otp_required") => {
  try {
    const fingerprint = extractDeviceFingerprint(req);
    if (!fingerprint || !userId) return;
    await runQuery(
      `UPDATE device_bindings
       SET is_active = false, revoked_at = NOW(), revoke_reason = $3
       WHERE user_id = $1 AND device_fingerprint = $2 AND is_active = true`,
      [userId, fingerprint, reason]
    );
  } catch (err) {
    logger.warn("[DEVICE_BINDING] Failed to deactivate pending binding:", err.message);
  }
};

const deviceBindingPostLogin = async (req, res, next) => {
  // If auth controller already sent an error response, skip
  if (res.headersSent) return;

  const authResult = req.authResult;
  if (!authResult || typeof authResult !== "object" || authResult.success === false) {
    // Auth failed — send the error response as-is
    if (authResult && typeof authResult === "object") {
      return res.status(authResult._statusCode || 401).json(authResult);
    }
    return next();
  }

  const userId = authResult?.user?.id ?? authResult?.user?.user_id ?? null;
  if (userId == null || userId === "") {
    // No user in result — pass through
    return res.status(200).json(authResult);
  }

  let bindingResult = null;
  try {
    // Check device binding (with timeout to prevent hangs)
    bindingResult = await withTimeout(checkDeviceBinding(userId, req), BINDING_TIMEOUT_MS);
    if (!bindingResult.allowed) {
      return res.status(403).json({
        error: bindingResult.error,
        code: bindingResult.code,
        success: false,
      });
    }
    if (bindingResult.requireOtp) {
      req._requireMandatoryOtp = true;
    }
    if (bindingResult.violation) {
      req._bindingViolation = bindingResult.violation;
    }

    // Check account switching
    const switchResult = await withTimeout(checkAccountSwitching(userId, req), BINDING_TIMEOUT_MS);
    if (!switchResult.allowed) {
      return res.status(403).json({
        error: switchResult.error,
        code: switchResult.code,
        success: false,
      });
    }
    if (switchResult.violation) {
      req._bindingViolation = req._bindingViolation || switchResult.violation;
      if (!bindingResult) bindingResult = {};
      bindingResult.violation = bindingResult.violation || switchResult.violation;
    }
    if (switchResult.requireOtp) {
      req._requireMandatoryOtp = true;
    }
  } catch (err) {
    if (err.message === "BINDING_TIMEOUT") {
      logger.error("[DEVICE_BINDING_POST] Binding check timed out for user:", userId);
    } else {
      logger.warn("[DEVICE_BINDING_POST] Check failed:", err.message);
    }
    // Don't block on internal errors or timeouts
  }

  // Step-up verification for new devices / risky logins
  let riskAssessment = null;
  try {
    riskAssessment = await evaluateLoginRisk({ userId, req, bindingResult });
  } catch (err) {
    logger.warn("[RISK_STATE] Login risk evaluation failed:", err.message);
  }

  const stepUpRequired = Boolean(req._requireMandatoryOtp || riskAssessment?.stepUpRequired);
  if (stepUpRequired) {
    const otpValue = String(req.body?.otp || "").trim();
    if (!otpValue || otpValue.length < 4) {
      if (bindingResult?.isNew) {
        await deactivatePendingBinding(userId, req, "otp_required");
      }
      clearAuthCookies(res);
      return res.status(200).json(
        buildStepUpResponse(null, {
          code: req._requireMandatoryOtp ? "SIM_VERIFICATION_REQUIRED" : "STEP_UP_REQUIRED",
          riskLevel: riskAssessment?.status || "normal",
        })
      );
    }

    const phone = req.body?.phone || req.body?.identifier || req.body?.mobile;
    const otpCheck = await verifyLoginOtp(phone, otpValue);
    if (!otpCheck.valid) {
      if (bindingResult?.isNew) {
        await deactivatePendingBinding(userId, req, "otp_invalid");
      }
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        requireOtp: true,
        challengeType: "sms_otp",
        code: "OTP_INVALID",
        message: "Invalid or expired OTP. Please request a new code.",
        attemptsRemaining: otpCheck.attemptsRemaining,
      });
    }

    // Bind phone to device after OTP verification (step-up)
    if (phone && (req._requireMandatoryOtp || riskAssessment?.signals?.new_device)) {
      try {
        await withTimeout(bindPhoneToDevice(phone, userId, req), BINDING_TIMEOUT_MS);
      } catch (err) {
        logger.error("[PHONE_DEVICE] Step-up bind failed:", err.message);
        return res.status(500).json({
          error: "Device verification failed. Please try again.",
          code: "PHONE_BIND_FAILED",
          success: false,
        });
      }
    }
  }

  if (riskAssessment) {
    if (riskAssessment.status === "frozen" && riskAssessment.existingRisk) {
      authResult.riskState = {
        status: riskAssessment.existingRisk.status,
        score: riskAssessment.existingRisk.score,
        reason: riskAssessment.existingRisk.reason,
      };
      // Skip overwriting existing frozen details.
    } else {
    const now = Date.now();
    const expiresAt =
      riskAssessment.status === "high"
        ? new Date(now + 12 * 60 * 60 * 1000)
        : riskAssessment.status === "limited"
          ? new Date(now + 6 * 60 * 60 * 1000)
          : null;

    try {
      const riskState = await setUserRiskState(userId, {
        status: riskAssessment.status,
        score: riskAssessment.score,
        reason: riskAssessment.reason,
        details: {
          signals: riskAssessment.signals,
          trust: riskAssessment.trust,
          bindingMode: bindingResult?.bindingMode || null,
          bindingViolation: bindingResult?.violation || req._bindingViolation || null,
        },
        last_device_fingerprint: riskAssessment.fingerprint || null,
        last_ip_address: riskAssessment.ipAddress || null,
        last_verified_at: stepUpRequired ? new Date().toISOString() : null,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
      });
      if (riskState && riskState.status && riskState.status !== "normal") {
        authResult.riskState = {
          status: riskState.status,
          score: riskState.score,
          reason: riskState.reason,
        };
      }
    } catch (err) {
      logger.warn("[RISK_STATE] Failed to persist login risk:", err.message);
    }
    }
  }

  authResult.newDevice = Boolean(bindingResult?.isNew || req._isNewDeviceBinding);
  if (bindingResult?.violation || req._bindingViolation) {
    authResult.bindingViolation = bindingResult?.violation || req._bindingViolation;
  }

  // Log the activity
  logAuthActivity(userId, "login", req).catch(() => {});

  // Send the successful auth response
  return res.status(200).json(authResult);
};

/**
 * Middleware: enforce device binding + phone binding after OTP verification.
 */
const deviceBindingPostOtp = async (req, res, next) => {
  if (res.headersSent) return;

  const authResult = req.authResult;
  if (!authResult || typeof authResult !== "object" || authResult.success === false) {
    if (authResult && typeof authResult === "object") {
      return res.status(authResult._statusCode || 401).json(authResult);
    }
    return next();
  }

  const userId = authResult?.user?.id ?? authResult?.user?.user_id ?? null;
  if (userId == null || userId === "") {
    return res.status(200).json(authResult);
  }

  try {
    const bindingResult = await withTimeout(checkDeviceBinding(userId, req), BINDING_TIMEOUT_MS);
    if (!bindingResult.allowed) {
      return res.status(403).json({
        error: bindingResult.error,
        code: bindingResult.code,
        success: false,
      });
    }

    const switchResult = await withTimeout(checkAccountSwitching(userId, req), BINDING_TIMEOUT_MS);
    if (!switchResult.allowed) {
      return res.status(403).json({
        error: switchResult.error,
        code: switchResult.code,
        success: false,
      });
    }
  } catch (err) {
    logger.warn("[DEVICE_BINDING_POST_OTP] Check failed:", err.message);
  }

  // Bind phone to device after successful OTP verification (with timeout)
  const phone = req.body?.phone || req.body?.identifier || req.body?.mobile;
  if (phone) {
    try {
      await withTimeout(bindPhoneToDevice(phone, userId, req), BINDING_TIMEOUT_MS);
    } catch (err) {
      logger.error("[PHONE_DEVICE] Post-OTP bind failed:", err.message);
      return res.status(500).json({
        error: "Device verification failed. Please try again.",
        code: "PHONE_BIND_FAILED",
        success: false,
      });
    }
  }

  logAuthActivity(userId, "login_otp", req).catch(() => {});

  return res.status(200).json(authResult);
};

/**
 * Wraps an auth controller handler so it sets req.authResult + calls next()
 * instead of calling res.json() directly.
 *
 * This is the ONLY monkey-patch, applied once at startup, and it's simple:
 * intercept res.json to capture the payload, then call next().
 */
function wrapControllerForMiddleware(handler) {
  return async function (req, res, next) {
    // Create a one-shot interceptor for res.json
    const originalJson = res.json.bind(res);
    let captured = false;

    res.json = function (body) {
      if (captured) return originalJson(body); // safety: if called again, pass through
      captured = true;

      const statusCode = res.statusCode || 200;

      // If it's an error response (4xx/5xx), send directly — no binding checks needed
      if (statusCode >= 400) {
        return originalJson(body);
      }

      // Capture successful result for post-auth middleware
      req.authResult = body;
      req.authResult._statusCode = statusCode;

      // Restore original res.json for post-auth middleware to use
      res.json = originalJson;
      res.statusCode = 200; // reset for post-middleware

      return next();
    };

    try {
      await handler(req, res, next);
    } catch (err) {
      // If handler throws, send error directly
      if (!res.headersSent) {
        res.json = originalJson;
        return res.status(500).json({
          error: "Authentication service error. Please try again.",
          success: false,
        });
      }
    }
  };
}

/**
 * Apply device binding to auth routes.
 * Returns wrapped handlers and post-middleware for use in routes.
 */
function createDeviceBindingHandlers(authController) {
  return {
    wrappedLogin: wrapControllerForMiddleware(authController.login),
    wrappedSignup: wrapControllerForMiddleware(authController.signup),
    wrappedVerifyOTP: wrapControllerForMiddleware(authController.verifyOTP),
    wrappedVerifyAadhaarOtp: authController.verifyAadhaarSignupOtp
      ? wrapControllerForMiddleware(authController.verifyAadhaarSignupOtp)
      : null,
    deviceBindingPostLogin,
    deviceBindingPostOtp,
  };
}

module.exports = {
  deviceBindingPostLogin,
  deviceBindingPostOtp,
  wrapControllerForMiddleware,
  createDeviceBindingHandlers,
};
