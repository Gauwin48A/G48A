const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const complaintsController = require('../controllers/complaintsController');

// Public/admin: List all complaints (with filters)
router.get('/', protect, complaintsController.getComplaints);

// Protected: Submit a new complaint
router.post('/', protect, complaintsController.createComplaint);

// Protected: Get my complaints
router.get('/my', protect, complaintsController.getMyComplaints);

// Protected: Admin update complaint status
router.patch('/:id/status', protect, complaintsController.updateComplaintStatus);
router.patch('/:id/evidence', protect, complaintsController.addComplaintEvidence);

module.exports = router;
