/**
 * Location Routes
 * Protocol: Reality Check - Fraud Detection Applied
 */

const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { detectVpnOrSpoof, logLocationRisk } = require('../middleware/fraudCheck');

// Create a new location - apply risk checks in log-only mode.
// Location capture should remain non-blocking for legitimate users on carrier NAT/proxy IPs.
router.post('/', logLocationRisk, locationController.saveLocation);

// Get all locations
router.get('/', locationController.getLocations);

// Get a location by ID
router.get('/:id', locationController.getLocationById);

// Update a location by ID - Also apply fraud detection
router.put('/:id', detectVpnOrSpoof, locationController.updateLocation);

// Delete a location by ID
router.delete('/:id', locationController.deleteLocation);

module.exports = router;

