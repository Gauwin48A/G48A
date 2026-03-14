const express = require("express");
const rateLimit = require("express-rate-limit");
const { protect } = require("../middleware/auth");
const locationVerificationController = require("../controllers/locationVerificationController");

const router = express.Router();

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const RATE_LIMIT_PER_DEVICE = parsePositiveInt(
  process.env.RATE_LIMIT_PER_DEVICE,
  60,
);
const RATE_LIMIT_WINDOW_SECONDS = parsePositiveInt(
  process.env.RATE_LIMIT_WINDOW_SECONDS,
  60,
);

const locationLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_SECONDS * 1000,
  max: RATE_LIMIT_PER_DEVICE,
  keyGenerator: (req) => {
    const deviceId =
      req.body?.device_id ||
      req.body?.deviceId ||
      req.headers["x-device-id"];
    if (deviceId) {
      return `device:${String(deviceId)}`;
    }
    return rateLimit.ipKeyGenerator(req.ip || "");
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many location verification attempts. Please wait and retry.",
    code: "RATE_LIMITED",
  },
});

router.post("/verify", locationLimiter, protect, locationVerificationController.verifyLocation);

module.exports = router;
