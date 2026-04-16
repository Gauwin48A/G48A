const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const offersController = require("../controllers/offersController");
const { offerLimiter } = require("../middleware/rateLimiter");

/**
 * @route Offer routes
 * @description Handles buyer/seller offer negotiations on posts
 */

/* All offer routes require authentication */
router.use(protect);

/** @route POST / - Create a new offer on a post */
router.post("/", offerLimiter, offersController.createOffer);

/** @route GET / - Get all offers for the authenticated user */
router.get("/", offersController.getOffers);

/** @route GET /history/:postId - Get offer history for a specific post */
router.get("/history/:postId", offersController.getOfferHistory);

/** @route PUT /auto-accept - Set an auto-accept price threshold */
router.put("/auto-accept", offerLimiter, offersController.setAutoAcceptThreshold);

/** @route PATCH /:offerId - Respond to (accept/reject/counter) an offer */
router.patch("/:offerId", offerLimiter, offersController.respondToOffer);

module.exports = router;
