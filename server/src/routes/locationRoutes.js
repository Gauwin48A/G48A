const express = require("express");

const router = express.Router();

const locationController = require("../controllers/locationController");
const { detectVpnOrSpoof } = require("../middleware/fraudCheck");
const { protect, optionalAuth } = require("../middleware/auth");

router.post("/", optionalAuth, detectVpnOrSpoof, locationController.saveLocation);
router.get("/", optionalAuth, locationController.getLocations);
router.get("/:id", optionalAuth, locationController.getLocationById);
router.put("/:id", protect, detectVpnOrSpoof, locationController.updateLocation);
router.delete("/:id", protect, locationController.deleteLocation);

module.exports = router;
