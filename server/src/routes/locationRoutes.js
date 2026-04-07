const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const locationController = require("../controllers/locationController");
const { detectVpnOrSpoof } = require("../middleware/fraudCheck");
const { protect, optionalAuth } = require("../middleware/auth");
const { resolveIpInfo } = require("../services/ipInfoService");

/** Server-side HMAC signing — keeps secret off the client bundle */
router.post("/sign", protect, (req, res) => {
  const secret = (process.env.LOCATION_HMAC_SECRET || "").trim();
  if (!secret) return res.status(503).json({ error: "Signing unavailable" });
  try {
    const payload = req.body;
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Invalid payload" });
    }
    const nonce = crypto.randomBytes(16).toString("hex");
    const signedAt = Date.now();
    payload._nonce = nonce;
    payload._signed_at = signedAt;
    const canonical = JSON.stringify(payload, Object.keys(payload).sort());
    const signature = crypto
      .createHmac("sha256", secret)
      .update(canonical)
      .digest("hex");
    return res.json({ signature, _nonce: nonce, _signed_at: signedAt });
  } catch {
    return res.status(500).json({ error: "Internal server error" });
  }
});

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
