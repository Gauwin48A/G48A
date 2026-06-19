const express = require("express");
const router = express.Router();
const translationController = require("../controllers/translationController");
const { protect } = require("../middleware/auth");

// On-demand translation endpoints are available without authentication so that ALL users
// (including guests) can translate content when they switch language. This is critical
// for the "every word including data must change" language feature requirement.
router.post("/translate", translationController.translateOnDemand);
router.post("/batch", translationController.translateBatchOnDemand);

// Admin/batch processing endpoints still require authentication
router.post("/process-translations", protect, translationController.processTranslations);
router.get("/status/:postId", protect, translationController.getTranslationStatus);
router.get("/stats", protect, translationController.getQueueStats);

module.exports = router;
