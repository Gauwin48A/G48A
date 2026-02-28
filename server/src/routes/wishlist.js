// Wishlist Routes
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const wishlistController = require('../controllers/wishlistController');

router.use(protect);

// Get user's wishlist
router.get('/', wishlistController.getWishlist);

// Add to wishlist
router.post('/', wishlistController.addToWishlist);

// Check if post is in wishlist
router.get('/check/:postId', wishlistController.checkWishlist);

// Remove from wishlist
router.delete('/:postId', wishlistController.removeFromWishlist);

module.exports = router;
