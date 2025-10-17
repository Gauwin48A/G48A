const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// GET /api/categories
router.get('/', categoryController.getAllCategories);

// GET /api/categories/brands
router.get('/brands', (req, res) => res.status(501).json({ code: 501, message: 'Not implemented' }));

module.exports = router;
