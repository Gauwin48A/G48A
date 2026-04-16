const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const searchesController = require("../controllers/savedSearchesController");

/** All saved-search routes require authentication */
router.use(protect);

/** @route POST / - Save a new search */
router.post("/", searchesController.saveSearch);

/** @route GET / - Retrieve all saved searches for the current user */
router.get("/", searchesController.getSavedSearches);

/** @route GET /:searchId/matches - Get posts matching a saved search */
router.get("/:searchId/matches", searchesController.getMatchingPosts);

/** @route DELETE /:searchId - Delete a saved search */
router.delete("/:searchId", searchesController.deleteSearch);

/** @route PATCH /:searchId/notifications - Toggle notification preferences for a saved search */
router.patch("/:searchId/notifications", searchesController.toggleNotifications);

module.exports = router;
