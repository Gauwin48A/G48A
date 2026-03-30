const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// GET /api/products/deals
router.get('/deals', productController.getDeals);
// GET /api/products/search
router.get('/search', productController.searchProducts);

module.exports = router;
