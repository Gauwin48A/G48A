const express = require('express');
const router = express.Router();
const publicWallController = require('../controllers/publicWallController');

router.get('/', publicWallController.getPublicWall);

module.exports = router;
