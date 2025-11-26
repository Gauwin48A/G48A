import { Router } from 'express';
import { saveLocation, getLocations, getLocationById, updateLocation, deleteLocation } from '../controllers/locationController.js';

const router = Router();

// Create a new location
router.post('/', saveLocation);

// Get all locations
router.get('/', getLocations);

// Get a location by ID
router.get('/:id', getLocationById);

// Update a location by ID
router.put('/:id', updateLocation);

// Delete a location by ID
router.delete('/:id', deleteLocation);

export default router;
