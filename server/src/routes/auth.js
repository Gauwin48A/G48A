const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
// Import the firewall
const { validate, authValidation } = require('../middleware/validators');

// REGISTER: Apply rules -> Validate -> Controller
router.post("/register",
    authValidation.register,
    validate,
    authController.register
);

// LOGIN: Apply rules -> Validate -> Controller
router.post("/login",
    authValidation.login,
    validate,
    authController.login
);

// Stub routes for OTP (Future Expansion)
router.post("/send-otp", (req, res) => res.json({ message: "OTP Sent" }));
router.post("/verify-otp", (req, res) => res.json({ token: "mock-token" }));

module.exports = router;