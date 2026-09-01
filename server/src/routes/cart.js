const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { protect } = require("../middleware/auth");
const cartController = require("../controllers/cartController");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Validation failed", details: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  }
  next();
};

/**
 * Cart routes (server-backed cart)
 */

router.use(protect);

/** @route GET / - Fetch cart items + summary */
router.get("/", cartController.getCart);

/** @route POST /items - Add item to cart */
router.post("/items",
  body("postId").notEmpty().withMessage("postId is required"),
  body("quantity").optional().isInt({ min: 1, max: 100 }).withMessage("Quantity must be 1-100"),
  validate,
  cartController.addCartItem
);

/**
 * Android compatibility: the app calls path-based ops (POST/DELETE/PATCH
 * /api/cart/:postId) — mirror them onto the body-based handlers.
 */
router.post("/:postId",
  param("postId").notEmpty().withMessage("Invalid postId"),
  validate,
  (req, res, next) => {
    req.body = { ...req.body, postId: req.params.postId, quantity: req.body?.quantity || 1 };
    cartController.addCartItem(req, res).catch(next);
  }
);
router.delete("/:postId",
  param("postId").notEmpty().withMessage("Invalid postId"),
  validate,
  (req, res, next) => {
    req.body = { postId: req.params.postId };
    cartController.removeCartItem(req, res).catch(next);
  }
);
router.patch("/:postId",
  param("postId").notEmpty().withMessage("Invalid postId"),
  validate,
  (req, res, next) => {
    req.body = { ...req.body, postId: req.params.postId };
    cartController.updateCartItem(req, res).catch(next);
  }
);

/** @route PATCH /items/:cartItemId - Update quantity or status */
router.patch("/items/:cartItemId",
  param("cartItemId").notEmpty().withMessage("Invalid cartItemId"),
  validate,
  cartController.updateCartItem
);

/** @route DELETE /items/:cartItemId - Remove cart item */
router.delete("/items/:cartItemId",
  param("cartItemId").notEmpty().withMessage("Invalid cartItemId"),
  validate,
  cartController.removeCartItem
);

/** @route POST /clear - Clear cart items by scope */
router.post("/clear", cartController.clearCart);

/** @route POST /summary - Validated checkout summary */
router.post("/summary", cartController.getCartSummary);

module.exports = router;
