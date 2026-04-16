const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const cartController = require("../controllers/cartController");

/**
 * Cart routes (server-backed cart)
 */

router.use(protect);

/** @route GET / - Fetch cart items + summary */
router.get("/", cartController.getCart);

/** @route POST /items - Add item to cart */
router.post("/items", cartController.addCartItem);

/** @route PATCH /items/:cartItemId - Update quantity or status */
router.patch("/items/:cartItemId", cartController.updateCartItem);

/** @route DELETE /items/:cartItemId - Remove cart item */
router.delete("/items/:cartItemId", cartController.removeCartItem);

/** @route POST /clear - Clear cart items by scope */
router.post("/clear", cartController.clearCart);

/** @route POST /summary - Validated checkout summary */
router.post("/summary", cartController.getCartSummary);

module.exports = router;
