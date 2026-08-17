const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const uploadsController = require("../controllers/uploadsController");

// Raw-body upload endpoints used by the Android two-stage listing flow.
// The client POSTs the raw image/audio bytes with Content-Type image/* or
// audio/* and receives { url, key, size } back; the URL is then sent to
// createPost in the JSON body.
const rawBodyParser = express.raw({
  type: ["image/*", "audio/*"],
  limit: "12mb",
});

router.post("/post-image", protect, rawBodyParser, uploadsController.upload);
router.post("/audio", protect, rawBodyParser, uploadsController.upload);

module.exports = router;
