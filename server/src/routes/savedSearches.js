/**
 * Saved Searches Routes
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const searchesController = require('../controllers/savedSearchesController');

router.use(protect);

// Save a search
router.post('/', searchesController.saveSearch);

// Get all saved searches
router.get('/', searchesController.getSavedSearches);

// Get matching posts for a search
router.get('/:searchId/matches', searchesController.getMatchingPosts);

// Delete a search
router.delete('/:searchId', searchesController.deleteSearch);

// Toggle notifications
router.patch('/:searchId/notifications', searchesController.toggleNotifications);

module.exports = router;
