/**
 * Offers Routes
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const offersController = require('../controllers/offersController');

router.use(protect);

// Create an offer
router.post('/', offersController.createOffer);

// Get offers (as seller or buyer)
router.get('/', offersController.getOffers);

// Respond to an offer
router.patch('/:offerId', offersController.respondToOffer);

module.exports = router;
