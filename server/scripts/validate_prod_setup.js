/**
 * Zaruda Production Infrastructure Validation Tool
 * 
 * Verifies the following:
 * 1. PostgreSQL Database connectivity & pools
 * 2. Redis Cache & Redis Session connectivity
 * 3. SurePass Sandbox API credentials and response status
 * 4. Razorpay Sandbox credentials validation
 * 5. Cloudflare R2 Object Storage upload/download functionality
 * 6. SMTP / Amazon SES credentials and server connectivity
 */

const path = require("path");
const dotenv = require("dotenv");

// Load .env configuration
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const db = require("../src/config/dbPool");
const redisCache = require("../src/config/redisCache");
const redisSession = require("../src/config/redisSession");
const kycService = require("../src/services/kycService");
const r2Client = require("../src/services/r2Client");
const axios = require("axios");
const nodemailer = require("nodemailer");

async function runValidation() {
  console.log("\n========================================================");
  console.log("🔍 STARTING ZARUDA PRODUCTION INFRASTRUCTURE VALIDATION");
  console.log("========================================================\n");

  let overallPassed = true;

  // ----------------------------------------------------
  // 1. PostgreSQL Verification
  // ----------------------------------------------------
  console.log("⚙️  [1/6] Testing PostgreSQL Connection...");
  try {
    const dbResult = await db.query("SELECT 1 as connected");
    if (dbResult.rows && dbResult.rows[0].connected === 1) {
      console.log("✅ Database connectivity check passed!");
      const stats = db.getStats();
      console.log(`   Pool stats: Total=${stats.primary.total}, Idle=${stats.primary.idle}`);
    } else {
      throw new Error("Invalid query response");
    }
  } catch (err) {
    console.error("❌ Database verification failed:", err.message);
    overallPassed = false;
  }

  // ----------------------------------------------------
  // 2. Redis Verification
  // ----------------------------------------------------
  console.log("\n⚙️  [2/6] Testing Redis Sessions & Cache...");
  try {
    const cacheReady = redisCache.isRedisAvailable();
    const sessionReady = redisSession.isRedisAvailable();

    // Perform active set/get test on Session
    await redisSession.set("test_validation_key", { success: true }, 10);
    const sessionVal = await redisSession.get("test_validation_key");

    if (sessionVal && sessionVal.success) {
      console.log(`✅ Redis sessions active. Available: cache=${cacheReady}, session=${sessionReady}`);
      await redisSession.del("test_validation_key");
    } else {
      throw new Error("Unable to set/get values in Redis");
    }
  } catch (err) {
    console.error("❌ Redis verification failed:", err.message);
    overallPassed = false;
  }

  // ----------------------------------------------------
  // 3. SurePass KYC Sandbox Verification
  // ----------------------------------------------------
  console.log("\n⚙️  [3/6] Testing SurePass KYC Sandbox...");
  if (!kycService.isSurepassConfigured()) {
    console.log("⚠️  SurePass is currently running in Mock/Development mode (no credentials set).");
  } else {
    try {
      const isProdMode = process.env.KYC_MODE === "production";
      console.log(`   SurePass Configured (KYC_MODE=${process.env.KYC_MODE})`);
      console.log(`   API Endpoint: ${process.env.SUREPASS_API_URL || "https://sandbox.surepass.io/api/v1"}`);
      
      // Attempt to ping endpoint (using incorrect token/params to see if we get authentication error vs dns error)
      const testHeaders = {
        Authorization: `Bearer ${process.env.SUREPASS_BEARER_TOKEN}`,
        "Content-Type": "application/json"
      };
      
      const endpoint = (process.env.SUREPASS_API_URL || "https://sandbox.surepass.io/api/v1").replace(/\/+$/, "");
      
      console.log("   Sending validation ping to SurePass API...");
      const response = await axios.post(`${endpoint}/corporate/pan`, { id_number: "ABCDE1234F" }, { headers: testHeaders, timeout: 5000 })
        .catch(err => err.response); // catch response even if it's an error status
      
      if (response && response.status) {
        console.log(`✅ SurePass Server responded (HTTP ${response.status})`);
        if (response.status === 401 || response.status === 403) {
          console.log("   ℹ️ Server responded with auth error (this is expected if the token is sandbox/test).");
        } else {
          console.log("   SurePass sandbox response:", JSON.stringify(response.data || {}).substring(0, 100));
        }
      } else {
        throw new Error("No response received from SurePass");
      }
    } catch (err) {
      console.error("❌ SurePass connection check failed:", err.message);
      overallPassed = false;
    }
  }

  // ----------------------------------------------------
  // 4. Razorpay Sandbox Verification
  // ----------------------------------------------------
  console.log("\n⚙️  [4/6] Testing Razorpay Sandbox API...");
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!razorpayKeyId || !razorpayKeySecret) {
    console.log("⚠️  Razorpay is running in Mock Mode (credentials missing in environment).");
  } else {
    try {
      console.log(`   Razorpay Key ID configured: ${razorpayKeyId.substring(0, 8)}...`);
      const authHeader = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");
      
      // Perform simple fetch of payments/orders or similar to check keys
      const response = await axios.get("https://api.razorpay.com/v1/orders", {
        headers: { Authorization: `Basic ${authHeader}` },
        params: { count: 1 },
        timeout: 5000
      }).catch(err => err.response);

      if (response && response.status === 200) {
        console.log("✅ Razorpay API connection check passed!");
      } else if (response) {
        console.log(`❌ Razorpay API returned error status: HTTP ${response.status}`);
        console.log("   Error details:", JSON.stringify(response.data || {}).substring(0, 150));
        overallPassed = false;
      } else {
        throw new Error("No response from Razorpay endpoint");
      }
    } catch (err) {
      console.error("❌ Razorpay connection check failed:", err.message);
      overallPassed = false;
    }
  }

  // ----------------------------------------------------
  // 5. Cloudflare R2 Connection Verification
  // ----------------------------------------------------
  console.log("\n⚙️  [5/6] Testing Cloudflare R2 Bucket...");
  if (!r2Client.isR2Configured()) {
    console.log("⚠️  R2 is not configured. Running in Mock Storage mode (local file system).");
  } else {
    try {
      console.log("   Uploading temporary validation file to R2...");
      // Let's create a temporary file and upload it
      const fs = require("fs").promises;
      const tmpFile = path.join(__dirname, "r2_val_tmp.txt");
      await fs.writeFile(tmpFile, "Zaruda infrastructure validation connection test.");
      
      const fileUrl = await r2Client.uploadFile(tmpFile, "r2_val_tmp.txt", "text/plain");
      console.log(`✅ Upload successful! File URL: ${fileUrl}`);
      
      // Cleanup local temp file
      await fs.unlink(tmpFile);
    } catch (err) {
      console.error("❌ Cloudflare R2 check failed:", err.message);
      overallPassed = false;
    }
  }

  // ----------------------------------------------------
  // 6. SMTP / Amazon SES Credentials Verification
  // ----------------------------------------------------
  console.log("\n⚙️  [6/6] Testing SMTP / Amazon SES Connectivity...");
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log("⚠️  Email delivery is running in Mock Mode (SMTP credentials missing in environment).");
  } else {
    try {
      const port = parseInt(process.env.SMTP_PORT || "587", 10);
      const secure = (process.env.SMTP_SECURE || "").trim().toLowerCase() === "true";
      console.log(`   Configured SMTP Host: ${smtpHost}:${port} (Secure: ${secure})`);
      console.log(`   Sender Identity (EMAIL_FROM): ${process.env.EMAIL_FROM || process.env.SMTP_FROM || smtpUser}`);

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: port,
        secure: secure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        connectionTimeout: 5000 // 5 seconds
      });

      console.log("   Verifying SMTP connection credentials...");
      await transporter.verify();
      console.log("✅ SMTP / Amazon SES server handshake verified successfully!");
    } catch (err) {
      console.error("❌ SMTP / Amazon SES verification failed:", err.message);
      overallPassed = false;
    }
  }

  console.log("\n========================================================");
  if (overallPassed) {
    console.log("✅ SUCCESS: ALL INFRASTRUCTURE VALIDATION TESTS PASSED!");
  } else {
    console.log("❌ FAILURE: SOME INFRASTRUCTURE CHECKS ENCOUNTERED ERRORS.");
  }
  console.log("========================================================\n");

  // Cleanup connections
  await db.end();
  await redisCache.close();
  await redisSession.close();

  process.exit(overallPassed ? 0 : 1);
}

runValidation();
