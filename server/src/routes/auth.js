const router = require("express").Router();
const { body, validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");

const authController = require("../controllers/authController");
const authSessionController = require("../controllers/authSessionController");
const { authenticateToken, optionalAuthenticateToken } = require("../middleware/security");
const { strictLoginLimiter } = require("../middleware/wafEnforcement");
const { enforceNoVpnForAuth } = require("../middleware/fraudCheck");
const { enforceAdaptiveMfaLogin } = require("../middleware/adaptiveMfaLogin");

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

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many signup attempts. Please try again in 15 minutes." },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
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
  signupLimiter,
  authSessionRetentionMiddleware,
  signupValidation,
  validationGuard,
  authController.signup,
);
router.post(
  "/login",
  loginResponseHardening,
  strictLoginLimiter,
  loginLimiter,
  authAnomalyThrottle("login"),
  authSessionRetentionMiddleware,
  loginValidation,
  validationGuard,
  enforceAdaptiveMfaLogin,
  enforceNoVpnForAuth,
  authController.login,
);
router.post(
  "/send-otp",
  otpSendLimiter,
  authAnomalyThrottle("send_otp"),
  authController.sendOTP,
);
router.post(
  "/verify-otp",
  otpVerifyLimiter,
  authAnomalyThrottle("verify_otp"),
  authSessionRetentionMiddleware,
  authController.verifyOTP,
);
router.post(
  "/aadhaar/send-otp",
  otpSendLimiter,
  authAnomalyThrottle("aadhaar_send_otp"),
  authController.sendAadhaarSignupOtp,
);
router.post(
  "/aadhaar/verify-otp",
  otpVerifyLimiter,
  authAnomalyThrottle("aadhaar_verify_otp"),
  authController.verifyAadhaarSignupOtp,
);
router.post(
  "/aadhaar/complete-signup",
  signupLimiter,
  authSessionRetentionMiddleware,
  authController.completeAadhaarSignup,
);
router.post("/otp/callback/:provider", authController.handleOtpDeliveryCallback);
router.get("/csrf-token", csrfTokenEndpoint);
router.get("/session", optionalAuthenticateToken, authSessionController.getSessionStatus);
router.post("/refresh-token", refreshLimiter, authCsrfProtection, authController.refreshToken);
router.post("/logout", authCsrfProtection, revokeCurrentAccessToken, authController.logout);
router.post(
  "/forgot-password",
  recoveryLimiter,
  authAnomalyThrottle("forgot_password"),
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  recoveryLimiter,
  authAnomalyThrottle("reset_password"),
  authController.resetPassword,
);
router.get("/me", authenticateToken, authController.getMe);
router.get("/validate", authenticateToken, (req, res) => res.json({ valid: true, user: req.user }));
router.get("/otp/metrics", authenticateToken, authController.getOtpDeliveryMetrics);
router.get("/risk-metrics", authenticateToken, authController.getRiskDecisionMetrics);
router.post("/set-password", authenticateToken, authCsrfProtection, authController.setPassword);
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
  otpSendLimiter,
  authController.initiatePhoneChange,
);
router.post(
  "/phone-change/complete",
  authenticateToken,
  otpVerifyLimiter,
  authController.completePhoneChange,
);

module.exports = router;
