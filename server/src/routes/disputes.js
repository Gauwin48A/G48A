const express = require("express");
const router = express.Router();
const disputesController = require("../controllers/disputesController");

// Admin endpoints (must come BEFORE parameterized routes to avoid /:id catching "admin")
router.get("/admin/pending", disputesController.adminListPending);

// User endpoints
router.get("/", disputesController.list);
router.post("/", disputesController.create);
router.get("/:id", disputesController.getById);
router.post("/:id/messages", disputesController.addMessage);
router.post("/:id/evidence", disputesController.addEvidence);
router.patch("/:id/resolve", disputesController.adminResolve);

module.exports = router;
