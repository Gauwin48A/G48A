// postRoutes.js
const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

// Get all posts
router.get('/', postController.getAllPosts);

// AddPost flow
router.post('/add', postController.createPost);

// SaleDone/SaleUndone
router.post('/sale-status', postController.updateSaleStatus);

// Recommendations
router.get('/recommendations', postController.getRecommendations);

// Get single post details
router.get('/:id', postController.getPostById);

// ...other routes for categories, notifications, rewards, etc.

module.exports = router;
