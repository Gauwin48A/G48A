/**
 * Location Routes
 * Protocol: Reality Check - Fraud Detection Applied
 */

const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');
const { detectVpnOrSpoof, enrichWithIpLocation } = require('../middleware/fraudCheck');

// Create a new location - Apply fraud detection BEFORE saving
// This blocks VPN users and GPS spoofers
router.post('/', detectVpnOrSpoof, locationController.saveLocation);

// Get all locations
router.get('/', locationController.getLocations);

// Get a location by ID
router.get('/:id', locationController.getLocationById);

// Update a location by ID - Also apply fraud detection
router.put('/:id', detectVpnOrSpoof, locationController.updateLocation);

// Delete a location by ID
router.delete('/:id', locationController.deleteLocation);

module.exports = router;

