const express = require('express');
const router = express.Router();
const AadhaarService = require('../services/AadhaarService');
const { logAadhaarVerification } = require('../utils/logger');
const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const { protect } = require("../middleware/auth");

router.use(protect);

const resolveUserUpdateColumns = async () => {
  const result = await runQuery(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
    `
  );
  return new Set(
    (result.rows || []).map((row) => String(row.column_name || "").toLowerCase())
  );
};

const updateVerifiedStatus = async (userId) => {
  if (!userId) return;
  try {
    const columns = await resolveUserUpdateColumns();
    const updates = [];
    const addUpdate = (column, clause) => {
      if (columns.has(column)) {
        updates.push(clause);
      }
    };

    addUpdate("aadhaar_verified", "aadhaar_verified = TRUE");
    addUpdate("isaadhaarverified", "isaadhaarverified = TRUE");
    addUpdate("kyc_verified", "kyc_verified = TRUE");
    addUpdate("aadhaar_status", "aadhaar_status = 'VERIFIED'");
    addUpdate("updated_at", "updated_at = NOW()");

    if (!updates.length) return;

    const updateSql = `UPDATE users SET ${updates.join(", ")} WHERE user_id = $1`;
    const primary = await runQuery(updateSql, [String(userId)]);
    if (!primary.rowCount && columns.has("id")) {
      await runQuery(
        `UPDATE users SET ${updates.join(", ")} WHERE id = $1`,
        [String(userId)]
      );
    }
  } catch (err) {
    logAadhaarVerification(userId, null, "Verification", "profile_update_failed");
  }
};

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
    if (result.verified) {
      const userId = getAuthUserId(req);
      if (userId) {
        await updateVerifiedStatus(userId);
      }
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: 'OTP verification failed' });
  }
});

module.exports = router;
