const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { publicReadSlowDown, searchSlowDown } = require("../middleware/rateLimiter");

// GET /api/products/deals
router.get('/deals', publicReadSlowDown, productController.getDeals);
// GET /api/products/search
router.get('/search', searchSlowDown, productController.searchProducts);

module.exports = router;
