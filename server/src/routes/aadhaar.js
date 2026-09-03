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

// POST /api/aadhaar/verify-otp or /api/auth/aadhaar/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { aadhaar, otp, txnId, clientId } = req.body;
    const effectiveTxnId = txnId || clientId;
    if (!otp || !effectiveTxnId) {
      return res.status(400).json({ success: false, message: 'Missing required fields (otp or txnId/clientId)' });
    }

    const userId = getAuthUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Authentication required" });

    let aadhaarHash = null;
    let lastFour = "5678";
    if (aadhaar) {
      const crypto = require("crypto");
      const parsedAadhaar = String(aadhaar).replace(/\D/g, "");
      if (parsedAadhaar.length === 12) {
        aadhaarHash = crypto.createHash("sha256").update(parsedAadhaar).digest("hex");
        lastFour = parsedAadhaar.slice(-4);

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
      }
    }

    const result = await AadhaarService.verifyOtp(aadhaar, otp, effectiveTxnId);
    // Log attempt
    logAadhaarVerification(userId, effectiveTxnId, 'Verification', result.verified ? 'success' : 'failure');

    if (result.verified) {
      const kycData = result.raw?.data || {};
      const addr = kycData.address || {};
      
      const houseNumber = addr.house || req.body.houseNo || null;
      const street = addr.street || req.body.street || null;
      const locality = addr.locality || req.body.area || null;
      const district = addr.district || req.body.city || null;
      const state = addr.state || req.body.state || null;
      const pincode = addr.pincode || req.body.pincode || null;

      const formattedParts = [houseNumber, street, locality, district, state].filter(Boolean);
      const fullAddress = formattedParts.length > 0
        ? `${formattedParts.join(', ')} - ${pincode || ''}`.trim()
        : (req.body.fullAddress || "Address provided during Aadhaar verification");

      const maskedAadhaar = kycData.aadhaar_number || `XXXX-XXXX-${lastFour}`;
      const fullName = kycData.full_name || result.name || req.body.fullName || "Verified User";
      const dob = kycData.dob || null;
      const gender = kycData.gender || null;

      // 1. Save to user_kyc table (Full Address + Masked Aadhaar compliance)
      await runQuery(
        `INSERT INTO user_kyc 
          (user_id, kyc_status, masked_aadhaar, kyc_ref_token, full_name, dob, gender, full_address, house_number, street, locality, district, state, pincode, verified_at)
         VALUES ($1, 'VERIFIED', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
         ON CONFLICT (user_id) DO UPDATE SET 
          kyc_status = 'VERIFIED',
          masked_aadhaar = EXCLUDED.masked_aadhaar,
          kyc_ref_token = EXCLUDED.kyc_ref_token,
          full_name = EXCLUDED.full_name,
          full_address = EXCLUDED.full_address,
          house_number = EXCLUDED.house_number,
          street = EXCLUDED.street,
          locality = EXCLUDED.locality,
          district = EXCLUDED.district,
          state = EXCLUDED.state,
          pincode = EXCLUDED.pincode,
          verified_at = NOW()`,
        [
          userId,
          maskedAadhaar,
          effectiveTxnId,
          fullName,
          dob,
          gender,
          fullAddress,
          houseNumber,
          street,
          locality,
          district,
          state,
          pincode
        ]
      );

      // 2. Persist in kyc_verifications table for audit backward compatibility
      if (aadhaarHash) {
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
          [userId, aadhaarHash, lastFour, effectiveTxnId]
        );
      }

      // 3. Update user verified status in users table
      await updateVerifiedStatus(userId);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'OTP verification failed' });
  }
});

module.exports = router;
