const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const complaintsController = require("../controllers/complaintsController");
const { isAdmin } = require("../utils/dbHelpers");

/**
 * @route GET / - List all complaints
 * @route POST / - Create a new complaint
 * @route GET /my - List complaints filed by the current user
 * @route PATCH /:id/status - Update complaint status
 * @route PATCH /:id/evidence - Add evidence to a complaint
 */
router.get("/", protect, complaintsController.getComplaints);
router.post("/", protect, complaintsController.createComplaint);
router.get("/my", protect, complaintsController.getMyComplaints);
router.patch("/:id/status", protect, (req, res, next) => { if (!isAdmin(req)) return res.status(403).json({ error: 'Admin access required' }); next(); }, complaintsController.updateComplaintStatus);
router.patch("/:id/evidence", protect, complaintsController.addComplaintEvidence);

module.exports = router;
