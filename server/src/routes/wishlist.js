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

/** @route GET /check/:postId - Check if a post is in the user's wishlist */
router.get("/check/:postId", wishlistController.checkWishlist);

/** @route DELETE /:postId - Remove a post from the wishlist */
router.delete("/:postId", wishlistController.removeFromWishlist);

module.exports = router;
