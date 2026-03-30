const express = require("express");

const router = express.Router();

const locationController = require("../controllers/locationController");
const { detectVpnOrSpoof } = require("../middleware/fraudCheck");
const { protect, optionalAuth } = require("../middleware/auth");
const { resolveIpInfo } = require("../services/ipInfoService");

router.post("/", optionalAuth, detectVpnOrSpoof, locationController.saveLocation);
router.get("/", optionalAuth, locationController.getLocations);
router.get("/places/nearby", optionalAuth, locationController.getNearbyPlaces);
router.get("/ip-info", optionalAuth, async (req, res) => {
  const result = await resolveIpInfo(req);
  if (result.ok) {
    res.setHeader("Cache-Control", "private, max-age=60");
    return res.status(200).json(result.payload);
  }
  return res.status(502).json({ error: "ip_info_unavailable" });
});
router.get("/:id", optionalAuth, locationController.getLocationById);
router.put("/:id", protect, detectVpnOrSpoof, locationController.updateLocation);
router.delete("/:id", protect, locationController.deleteLocation);

module.exports = router;
