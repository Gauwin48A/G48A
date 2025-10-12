const express = require('express');
const router = express.Router();
const AadhaarService = require('../services/AadhaarService');
const { logAadhaarVerification } = require('../utils/logger');

// POST /api/aadhaar/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { aadhaar } = req.body;
    if (!aadhaar || !/^\d{12}$/.test(aadhaar)) {
      return res.status(400).json({ success: false, message: 'Invalid Aadhaar number' });
    }
    const { txnId, masked, encrypted } = await AadhaarService.sendOtp(aadhaar);
    // Log attempt (do not log aadhaar/otp)
    logAadhaarVerification(null, txnId, 'OTP', 'sent');
    res.json({ success: true, txnId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// POST /api/aadhaar/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { aadhaar, otp, txnId } = req.body;
    if (!aadhaar || !otp || !txnId) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }
    const result = await AadhaarService.verifyOtp(aadhaar, otp, txnId);
    // Log attempt
    logAadhaarVerification(null, txnId, 'Verification', result.verified ? 'success' : 'failure');
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: 'OTP verification failed' });
  }
});

module.exports = router;
