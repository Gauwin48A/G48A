const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { protect } = require("../middleware/auth");
const refundsController = require("../controllers/refundsController");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Validation failed", details: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  }
  next();
};

// All refund routes require authentication
router.use(protect);

router.get("/", refundsController.list);

router.post("/",
  body("transaction_id").notEmpty().withMessage("transaction_id is required"),
  body("amount").isFloat({ gt: 0, max: 1000000 }).withMessage("Amount must be a positive number (max 10,00,000)"),
  body("reason").optional().trim().isLength({ max: 2000 }).withMessage("Reason too long"),
  validate,
  refundsController.create
);

router.get("/:id",
  param("id").notEmpty().withMessage("Refund ID is required"),
  validate,
  refundsController.getById
);

module.exports = router;
