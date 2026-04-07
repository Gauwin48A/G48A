const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const saleundoneController = require('../controllers/saleundoneController');

router.use(protect);
router.get('/', saleundoneController.getSaleUndone);

module.exports = router;
