// New routes for likes, views, shares (2025-09-02)
const express = require('express');
const router = express.Router();
const { likePost, viewPost, sharePost } = require('../controllers/postActionsController');

router.post('/:id/like', likePost);
router.post('/:id/view', viewPost);
router.post('/:id/share', sharePost);

module.exports = router;
