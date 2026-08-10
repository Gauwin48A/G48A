const express = require("express");
const router = express.Router();
const ordersController = require("../controllers/ordersController");

// GET /api/v1/orders — list user's orders
router.get("/", ordersController.list);

// POST /api/v1/orders — create new order
router.post("/", ordersController.create);

// GET /api/v1/orders/:id — get order details
router.get("/:id", ordersController.getById);

// PATCH /api/v1/orders/:id/status — update order status
router.patch("/:id/status", ordersController.updateStatus);

// POST /api/v1/orders/:id/cancel — cancel order
router.post("/:id/cancel", ordersController.cancel);

module.exports = router;
