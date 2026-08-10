const express = require("express");
const router = express.Router();
const webhooksController = require("../controllers/webhooksController");

// POST /api/v1/webhooks/razorpay — Razorpay payment/recurring webhooks
router.post("/razorpay", webhooksController.razorpay);

// POST /api/v1/webhooks/surepass — Surepass KYC webhooks
router.post("/surepass", webhooksController.surepass);

// GET /api/v1/webhooks/log — view recent webhook events (admin)
router.get("/log", webhooksController.log);

module.exports = router;
