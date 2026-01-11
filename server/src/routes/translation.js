/**
 * Translation Routes
 * Defender Prompt 5: Async Processing
 */

const express = require('express');
const router = express.Router();
const translationController = require('../controllers/translationController');

// Process pending translations (called by CRON)
// Endpoint: /api/process-translations
router.post('/process-translations', translationController.processTranslations);

// Get translation status for a post
router.get('/status/:postId', translationController.getTranslationStatus);

// Get queue statistics (admin)
router.get('/stats', translationController.getQueueStats);

module.exports = router;
