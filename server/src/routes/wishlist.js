const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const wishlistController = require("../controllers/wishlistController");

/** All wishlist routes require authentication */
router.use(protect);

/** @route GET / - Get the current user's wishlist */
router.get("/", wishlistController.getWishlist);

/** @route POST / - Add a post to the wishlist */
router.post("/", wishlistController.addToWishlist);

/** @route POST /:id - Add a post to the wishlist by ID */
router.post("/:id", wishlistController.addToWishlist);

/** @route POST /:id/toggle - Toggle a post in/out of wishlist */
router.post("/:id/toggle", wishlistController.toggleWishlist);

/** @route GET /check/:postId - Check if a post is in the user's wishlist */
router.get("/check/:postId", wishlistController.checkWishlist);
router.get("/:postId/check", wishlistController.checkWishlist);

/** @route DELETE /:postId - Remove a post from the wishlist */
router.delete("/:postId", wishlistController.removeFromWishlist);

module.exports = router;
