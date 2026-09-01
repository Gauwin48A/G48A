const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { protect } = require("../middleware/auth");
const disputesController = require("../controllers/disputesController");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Validation failed", details: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  }
  next();
};

// All dispute routes require authentication
router.use(protect);

// Admin endpoints (must come BEFORE parameterized routes to avoid /:id catching "admin")
router.get("/admin/pending", disputesController.adminListPending);

// User endpoints
router.get("/", disputesController.list);

router.post("/",
  body("order_id").notEmpty().withMessage("order_id is required"),
  body("dispute_type").isIn(["ITEM_NOT_RECEIVED", "ITEM_DAMAGED", "WRONG_ITEM", "QUALITY_ISSUE", "FRAUD", "PAYMENT_ISSUE", "OTHER"]).withMessage("Invalid dispute_type"),
  body("description").trim().notEmpty().isLength({ max: 5000 }).withMessage("Description required (max 5000 chars)"),
  body("raised_against").notEmpty().withMessage("raised_against is required"),
  validate,
  disputesController.create
);

router.get("/:id",
  param("id").notEmpty().withMessage("Dispute ID is required"),
  validate,
  disputesController.getById
);

router.post("/:id/messages",
  param("id").notEmpty().withMessage("Dispute ID is required"),
  body("message").trim().notEmpty().isLength({ max: 5000 }).withMessage("Message required (max 5000 chars)"),
  validate,
  disputesController.addMessage
);

router.post("/:id/evidence",
  param("id").notEmpty().withMessage("Dispute ID is required"),
  body("evidence_type").trim().notEmpty().withMessage("evidence_type is required"),
  validate,
  disputesController.addEvidence
);

router.patch("/:id/resolve",
  param("id").notEmpty().withMessage("Dispute ID is required"),
  validate,
  disputesController.adminResolve
);

module.exports = router;
