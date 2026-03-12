const express = require("express");

const router = express.Router();

const locationController = require("../controllers/locationController");
const { detectVpnOrSpoof } = require("../middleware/fraudCheck");

router.post("/", detectVpnOrSpoof, locationController.saveLocation);
router.get("/", locationController.getLocations);
router.get("/:id", locationController.getLocationById);
router.put("/:id", detectVpnOrSpoof, locationController.updateLocation);
router.delete("/:id", locationController.deleteLocation);

module.exports = router;
