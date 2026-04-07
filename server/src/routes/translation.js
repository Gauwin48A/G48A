const express = require("express");
const router = express.Router();
const translationController = require("../controllers/translationController");
const { protect } = require("../middleware/auth");

// All translation routes require authentication
router.use(protect);

/** @route POST /process-translations - Trigger translation processing for posts */
router.post("/process-translations", translationController.processTranslations);

/** @route GET /status/:postId - Get translation status for a specific post */
router.get("/status/:postId", translationController.getTranslationStatus);

/** @route GET /stats - Get overall translation queue statistics */
router.get("/stats", translationController.getQueueStats);

/** @route POST /translate - On-demand translation proxy */
router.post("/translate", translationController.translateOnDemand);

/** @route POST /batch - Batch on-demand translation */
router.post("/batch", translationController.translateBatchOnDemand);

module.exports = router;
