const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");

const authController = require("../controllers/authController");
const { createDeviceBindingHandlers } = require("../middleware/deviceBindingPostAuth");
const deviceBindingHandlers = createDeviceBindingHandlers(authController);
const authSessionController = require("../controllers/authSessionController");
const { authenticateToken, optionalAuthenticateToken } = require("../middleware/security");
const { strictLoginLimiter } = require("../middleware/wafEnforcement");
const { loginSlowDown } = require("../middleware/rateLimiter");
const { enforceNoVpnForAuth } = require("../middleware/fraudCheck");
const { enforceAdaptiveMfaLogin } = require("../middleware/adaptiveMfaLogin");
const { deviceBindingPreLogin, logoutAbuseCheck } = require("../middleware/deviceBinding");

// Prevent browser/CDN from caching auth responses
router.use((req, res, next) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, private",
    "Pragma": "no-cache",
    "Expires": "0",
  });
  next();
});
const { hardenAuthResponse } = require("../middleware/authResponseHardening");
const { authAnomalyThrottle } = require("../middleware/authAnomalyThrottle");
const { authSessionRetentionMiddleware } = require("../middleware/authSessionRetentionMiddleware");
const { authAuditMiddleware } = require("../middleware/authAuditMiddleware");
const { revokeCurrentAccessToken } = require("../middleware/revokeCurrentAccessToken");
const { csrfProtection, csrfTokenEndpoint } = require("../middleware/csrf");

const validationGuard = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const ALLOW_LOCALHOST_AUTH_BYPASS =
  process.env.NODE_ENV !== "production" &&
  String(process.env.AUTH_RATE_LIMIT_BYPASS_LOCALHOST || "false").toLowerCase() ===
  "true";

const resolveHostname = (req) => {
  const rawHost =
    req.headers["x-forwarded-host"] || req.headers.host || req.hostname || "";
  const host = String(rawHost || "").split(",")[0].trim().toLowerCase();
  if (!host) return "";
  return host.includes(":") ? host.split(":")[0] : host;
};

const isLocalhostRequest = (req) => {
  const hostname = resolveHostname(req);
  if (hostname && LOCALHOST_HOSTS.has(hostname)) return true;
  const ip = String(req.ip || "").trim().toLowerCase();
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
};

const shouldBypassAuthRateLimits = (req) => {
  const devBypass =
    process.env.NODE_ENV !== "production" &&
    String(process.env.AUTH_RATE_LIMIT_BYPASS_DEV || "").toLowerCase() === "true";
  if (devBypass) return true;
  return ALLOW_LOCALHOST_AUTH_BYPASS && isLocalhostRequest(req);
};

const maybeBypassAuthRateLimit = (middleware) => (req, res, next) =>
  shouldBypassAuthRateLimits(req) ? next() : middleware(req, res, next);

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many signup attempts. Please try again in 15 minutes." },
});

const LOGIN_LIMIT_WINDOW_MS =
  Number.parseInt(process.env.AUTH_LOGIN_LIMIT_WINDOW_MS, 10) ||
  24 * 60 * 60 * 1000; // 24 hours
const LOGIN_LIMIT_MAX =
  Number.parseInt(process.env.AUTH_LOGIN_LIMIT_MAX, 10) || 10;

const resolveDeviceKey = (req) =>
  req.headers["x-device-fingerprint"] ||
  req.headers["x-device-id"] ||
  req.body?.deviceFingerprint ||
  null;

const loginLimiter = rateLimit({
  windowMs: LOGIN_LIMIT_WINDOW_MS,
  max: LOGIN_LIMIT_MAX,
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const deviceKey = resolveDeviceKey(req);
    if (deviceKey) return `device:${deviceKey}`;
    return rateLimit.ipKeyGenerator(resolveClientIp(req));
  },
  message: {
    error: "Too many login attempts",
    message: `Too many login attempts. Please try again later.`,
    retryAfter: Math.round(LOGIN_LIMIT_WINDOW_MS / (60 * 1000)),
  },
});

const otpSendLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP requests. Please wait 10 minutes." },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP attempts. Please wait 10 minutes." },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many token refresh attempts. Please try again shortly." },
});

const recoveryLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password recovery attempts. Please wait 30 minutes." },
});

const normalizePhone = (value) => String(value || "").trim().replace(/\D/g, "");
const resolveClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || "127.0.0.1";
};

const signupValidation = [
  body("phone")
    .trim()
    .custom((value) => {
      const digits = normalizePhone(value);
      if (/^[6-9]\d{9}$/.test(digits) || /^91[6-9]\d{9}$/.test(digits)) {
        return true;
      }
      throw new Error("Invalid phone number");
    })
    .withMessage("Invalid phone number"),
  body("email").trim().isEmail().withMessage("Invalid email address").normalizeEmail(),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 chars"),
  body("fullName").trim().isLength({ min: 2, max: 100 }).withMessage("Name is required"),
  body("referral_code")
    .optional({ values: "falsy" })
    .trim()
    .isLength({ min: 4, max: 20 })
    .withMessage("Referral code must be between 4 and 20 characters")
    .matches(/^[A-Za-z0-9-]+$/)
    .withMessage("Referral code format is invalid"),
];

const loginValidation = [
  body().custom((value) => {
    const hasIdentifier = Boolean(value?.identifier || value?.email || value?.phone);
    if (!hasIdentifier) {
      throw new Error("Email, phone, username, or identifier is required");
    }
    if (!value?.password) {
      throw new Error("Password is required");
    }
    return true;
  }),
];
const authCsrfProtection = csrfProtection({ skipPaths: [] });
const loginResponseHardening = hardenAuthResponse();

router.use(authAuditMiddleware());

router.post(
  "/signup",
  maybeBypassAuthRateLimit(signupLimiter),
  deviceBindingPreLogin,
  authSessionRetentionMiddleware,
  signupValidation,
  validationGuard,
  deviceBindingHandlers.wrappedSignup,
  deviceBindingHandlers.deviceBindingPostLogin,
);
router.post(
  "/login",
  loginResponseHardening,
  maybeBypassAuthRateLimit(strictLoginLimiter),
  maybeBypassAuthRateLimit(loginSlowDown),
  maybeBypassAuthRateLimit(loginLimiter),
  deviceBindingPreLogin,
  maybeBypassAuthRateLimit(authAnomalyThrottle("login")),
  authSessionRetentionMiddleware,
  loginValidation,
  validationGuard,
  enforceAdaptiveMfaLogin,
  enforceNoVpnForAuth,
  deviceBindingHandlers.wrappedLogin,
  deviceBindingHandlers.deviceBindingPostLogin,
);
router.post(
  "/send-otp",
  maybeBypassAuthRateLimit(otpSendLimiter),
  deviceBindingPreLogin,
  maybeBypassAuthRateLimit(authAnomalyThrottle("send_otp")),
  authController.sendOTP,
);
router.post(
  "/verify-otp",
  maybeBypassAuthRateLimit(otpVerifyLimiter),
  deviceBindingPreLogin,
  maybeBypassAuthRateLimit(authAnomalyThrottle("verify_otp")),
  authSessionRetentionMiddleware,
  deviceBindingHandlers.wrappedVerifyOTP,
  deviceBindingHandlers.deviceBindingPostOtp,
);
router.post(
  "/aadhaar/send-otp",
  maybeBypassAuthRateLimit(otpSendLimiter),
  maybeBypassAuthRateLimit(authAnomalyThrottle("aadhaar_send_otp")),
  authController.sendAadhaarSignupOtp,
);
router.post(
  "/aadhaar/verify-otp",
  maybeBypassAuthRateLimit(otpVerifyLimiter),
  deviceBindingPreLogin,
  maybeBypassAuthRateLimit(authAnomalyThrottle("aadhaar_verify_otp")),
  ...(deviceBindingHandlers.wrappedVerifyAadhaarOtp
    ? [deviceBindingHandlers.wrappedVerifyAadhaarOtp, deviceBindingHandlers.deviceBindingPostOtp]
    : [authController.verifyAadhaarSignupOtp]),
);
router.post(
  "/pan/verify",
  maybeBypassAuthRateLimit(otpVerifyLimiter),
  deviceBindingPreLogin,
  maybeBypassAuthRateLimit(authAnomalyThrottle("pan_verify")),
  authController.verifyPanSignup,
);
router.post(
  "/aadhaar/complete-signup",
  maybeBypassAuthRateLimit(signupLimiter),
  authSessionRetentionMiddleware,
  authController.completeAadhaarSignup,
);
router.post("/otp/callback/:provider", authController.handleOtpDeliveryCallback);
router.get("/csrf-token", csrfTokenEndpoint);
router.get("/session", optionalAuthenticateToken, authSessionController.getSessionStatus);
router.post(
  "/refresh-token",
  maybeBypassAuthRateLimit(refreshLimiter),
  authCsrfProtection,
  authController.refreshToken,
);
router.post("/logout", logoutAbuseCheck, authCsrfProtection, revokeCurrentAccessToken, authController.logout);
router.post(
  "/forgot-password",
  maybeBypassAuthRateLimit(recoveryLimiter),
  maybeBypassAuthRateLimit(authAnomalyThrottle("forgot_password")),
  [
    body("identifier").optional().trim().isLength({ min: 3, max: 200 }),
    body("phone").optional().trim().isLength({ min: 6, max: 15 }),
    body().custom((value) => {
      if (!value?.identifier && !value?.phone) {
        throw new Error("Email or phone number is required");
      }
      return true;
    }),
  ],
  validationGuard,
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  maybeBypassAuthRateLimit(recoveryLimiter),
  maybeBypassAuthRateLimit(authAnomalyThrottle("reset_password")),
  [
    body("newPassword")
      .isLength({ min: 12 })
      .withMessage("Password must be at least 12 characters"),
    body("token")
      .optional()
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage("Invalid token format"),
    body("phone")
      .optional()
      .trim()
      .isLength({ min: 6, max: 15 }),
    body("otp")
      .optional()
      .isLength({ min: 4, max: 8 })
      .withMessage("Invalid OTP format"),
  ],
  validationGuard,
  authController.resetPassword,
);
router.get("/me", authenticateToken, authController.getMe);
router.get("/validate", authenticateToken, (req, res) => res.json({ valid: true, user: req.user }));
router.get("/otp/metrics", authenticateToken, authController.getOtpDeliveryMetrics);
router.get("/risk-metrics", authenticateToken, authController.getRiskDecisionMetrics);
router.post("/set-password", authenticateToken, authCsrfProtection, [
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
], validationGuard, authController.setPassword);
router.post("/change-password", authenticateToken, authCsrfProtection, [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  body("newPassword").isLength({ min: 12 }).withMessage("New password must be at least 12 characters"),
], validationGuard, authController.changePassword);
router.get("/sessions", authenticateToken, authSessionController.listSessions);
router.delete(
  "/sessions/:sessionId",
  authenticateToken,
  authCsrfProtection,
  authSessionController.revokeSession,
);
router.delete("/sessions", authenticateToken, authCsrfProtection, authSessionController.revokeAllSessions);

// A26: Phone number change (requires Aadhaar re-verification)
router.post(
  "/phone-change/initiate",
  authenticateToken,
  maybeBypassAuthRateLimit(otpSendLimiter),
  authController.initiatePhoneChange,
);
router.post(
  "/phone-change/complete",
  authenticateToken,
  maybeBypassAuthRateLimit(otpVerifyLimiter),
  authController.completePhoneChange,
);

module.exports = router;
