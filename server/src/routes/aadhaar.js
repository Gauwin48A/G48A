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

    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

    const crypto = require("crypto");
    const parsedAadhaar = String(aadhaar).replace(/\D/g, "");
    const aadhaarHash = crypto.createHash("sha256").update(parsedAadhaar).digest("hex");

    // Check blacklist first
    const blacklistCheck = await runQuery(
      "SELECT reason FROM kyc_blacklist WHERE aadhaar_hash = $1 LIMIT 1",
      [aadhaarHash]
    );
    if (blacklistCheck.rows.length > 0) {
      return res.status(403).json({
        success: false,
        message: "This document is blacklisted due to verification violations: " + blacklistCheck.rows[0].reason
      });
    }

    // Check duplicates
    const duplicateCheck = await runQuery(
      "SELECT user_id FROM kyc_verifications WHERE aadhaar_hash = $1 AND status = 'VERIFIED' AND user_id::text != $2",
      [aadhaarHash, userId]
    );
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: "This Aadhaar card is already verified with another account" });
    }

    const { txnId, masked, encrypted } = await AadhaarService.sendOtp(aadhaar);
    // Log attempt (do not log aadhaar/otp)
    logAadhaarVerification(null, txnId, 'OTP', 'sent');
    res.json({ success: true, txnId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Failed to send OTP' });
  }
});

// POST /api/aadhaar/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { aadhaar, otp, txnId } = req.body;
    if (!aadhaar || !otp || !txnId) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

    const crypto = require("crypto");
    const parsedAadhaar = String(aadhaar).replace(/\D/g, "");
    const aadhaarHash = crypto.createHash("sha256").update(parsedAadhaar).digest("hex");
    const lastFour = parsedAadhaar.slice(-4);

    // Check blacklist first
    const blacklistCheck = await runQuery(
      "SELECT reason FROM kyc_blacklist WHERE aadhaar_hash = $1 LIMIT 1",
      [aadhaarHash]
    );
    if (blacklistCheck.rows.length > 0) {
      return res.status(403).json({
        success: false,
        message: "This document is blacklisted due to verification violations: " + blacklistCheck.rows[0].reason
      });
    }

    // Check duplicates
    const duplicateCheck = await runQuery(
      "SELECT user_id FROM kyc_verifications WHERE aadhaar_hash = $1 AND status = 'VERIFIED' AND user_id::text != $2",
      [aadhaarHash, userId]
    );
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: "This Aadhaar card is already verified with another account" });
    }

    const result = await AadhaarService.verifyOtp(aadhaar, otp, txnId);
    // Log attempt
    logAadhaarVerification(null, txnId, 'Verification', result.verified ? 'success' : 'failure');
    
    if (result.verified) {
      // 1. Persist in kyc_verifications
      await runQuery(
        `INSERT INTO kyc_verifications (user_id, status, aadhaar_hash, aadhaar_last_four, surepass_aadhaar_client_id, verified_at, updated_at)
         VALUES ($1, 'VERIFIED', $2, $3, $4, NOW(), NOW())
         ON CONFLICT (user_id)
         DO UPDATE SET status = 'VERIFIED',
                       aadhaar_hash = COALESCE(EXCLUDED.aadhaar_hash, kyc_verifications.aadhaar_hash),
                       aadhaar_last_four = COALESCE(EXCLUDED.aadhaar_last_four, kyc_verifications.aadhaar_last_four),
                       surepass_aadhaar_client_id = EXCLUDED.surepass_aadhaar_client_id,
                       verified_at = NOW(),
                       updated_at = NOW()`,
        [userId, aadhaarHash, lastFour, txnId]
      );

      // 2. Update user verified status
      await updateVerifiedStatus(userId);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'OTP verification failed' });
  }
});

module.exports = router;
