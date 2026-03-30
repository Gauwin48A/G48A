const express = require('express');
const router = express.Router();
const saleundoneController = require('../controllers/saleundoneController');

router.get('/', saleundoneController.getSaleUndone);

module.exports = router;
