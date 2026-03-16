const express = require("express");
const router = express.Router();
const translationController = require("../controllers/translationController");

/** @route POST /process-translations - Trigger translation processing for posts */
router.post("/process-translations", translationController.processTranslations);

/** @route GET /status/:postId - Get translation status for a specific post */
router.get("/status/:postId", translationController.getTranslationStatus);

/** @route GET /stats - Get overall translation queue statistics */
router.get("/stats", translationController.getQueueStats);

module.exports = router;
