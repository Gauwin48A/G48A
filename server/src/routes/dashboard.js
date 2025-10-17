const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Dummy dashboard endpoint
router.get('/', (req, res) => {
    dashboardController.getDashboard(req, res)
        .catch(err => {
            console.error(err); // Log the error for internal tracking
            res.status(500).json({ error: 'An unexpected error occurred.' });
        });
});

module.exports = router;
