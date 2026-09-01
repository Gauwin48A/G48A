const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { protect } = require("../middleware/auth");
const shipmentsController = require("../controllers/shipmentsController");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Validation failed", details: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  }
  next();
};

// All shipment routes require authentication
router.use(protect);

router.get("/", shipmentsController.list);

router.post("/",
  body("order_id").notEmpty().withMessage("order_id is required"),
  body("carrier").optional().trim().isLength({ max: 100 }).withMessage("Carrier name too long"),
  body("tracking_number").optional().trim().isLength({ max: 100 }).withMessage("Tracking number too long"),
  body("lr_number").optional().trim().isLength({ max: 50 }).withMessage("LR number too long"),
  validate,
  shipmentsController.create
);

router.get("/:id",
  param("id").notEmpty().withMessage("Shipment ID is required"),
  validate,
  shipmentsController.getById
);

router.patch("/:id/status",
  param("id").notEmpty().withMessage("Shipment ID is required"),
  body("status").isIn(["SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED"]).withMessage("Invalid status"),
  body("location").optional().trim().isLength({ max: 200 }),
  body("description").optional().trim().isLength({ max: 1000 }),
  validate,
  shipmentsController.updateStatus
);

router.post("/:id/confirm-delivery",
  param("id").notEmpty().withMessage("Shipment ID is required"),
  body("notes").optional().trim().isLength({ max: 1000 }),
  validate,
  shipmentsController.confirmDelivery
);

module.exports = router;
