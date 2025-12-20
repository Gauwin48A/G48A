const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// Create a new location
router.post('/', locationController.saveLocation);

// Get all locations
router.get('/', locationController.getLocations);

// Get a location by ID
router.get('/:id', locationController.getLocationById);

// Update a location by ID
router.put('/:id', locationController.updateLocation);

// Delete a location by ID
router.delete('/:id', locationController.deleteLocation);

module.exports = router;
