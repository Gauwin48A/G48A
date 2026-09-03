const express = require("express");
const router = express.Router();
const { body, param, query, validationResult } = require("express-validator");
const { protect } = require("../middleware/auth");
const ordersController = require("../controllers/ordersController");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Validation failed", details: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  }
  next();
};

// All order routes require authentication
router.use(protect);

// GET /api/orders/my — list authenticated buyer's orders
router.get("/my", ordersController.myOrders);

// GET /api/v1/orders — list user's orders (role=buyer or role=seller)
router.get("/",
  query("role").optional().isIn(["buyer", "seller"]).withMessage("Role must be 'buyer' or 'seller'"),
  validate,
  ordersController.list
);

// POST /api/orders/create and POST /api/v1/orders — create new order
const createOrderValidation = [
  body().custom((value) => {
    if (!value.product_id && !value.postId && !value.post_id) {
      throw new Error("Either postId or product_id is required");
    }
    return true;
  }),
  body("quantity").optional().isInt({ min: 1, max: 100 }).withMessage("Quantity must be 1-100"),
  body("variant_id").optional().trim().isLength({ max: 100 }),
  validate,
];

router.post("/create", createOrderValidation, ordersController.create);
router.post("/", createOrderValidation, ordersController.create);

// GET /api/v1/orders/:id — get order details
router.get("/:id",
  param("id").notEmpty().withMessage("Order ID is required"),
  validate,
  ordersController.getById
);

// POST /api/orders/:id/confirm-handover — confirm delivery with OTP
router.post("/:id/confirm-handover",
  param("id").notEmpty().withMessage("Order ID is required"),
  body("otp").notEmpty().withMessage("Handover OTP is required"),
  validate,
  ordersController.confirmHandover
);

// PATCH /api/v1/orders/:id/status — update order status
router.patch("/:id/status",
  param("id").notEmpty().withMessage("Order ID is required"),
  body("status").isIn(["CONFIRMED", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "DISPUTED", "COMPLETED"]).withMessage("Invalid status"),
  validate,
  ordersController.updateStatus
);

// POST /api/v1/orders/:id/cancel — cancel order
router.post("/:id/cancel",
  param("id").notEmpty().withMessage("Order ID is required"),
  validate,
  ordersController.cancel
);

module.exports = router;
