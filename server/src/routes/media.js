const express = require("express");
const router = express.Router();
const mediaController = require("../controllers/mediaController");

router.post("/upload", mediaController.upload);
router.get("/:id", mediaController.getById);
router.delete("/:id", mediaController.delete);

module.exports = router;
