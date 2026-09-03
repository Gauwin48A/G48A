/**
 * test-firebase-fcm.js
 * Comprehensive Firebase Admin SDK & FCM Push Diagnostics
 */

require("dotenv").config();
const { getApps } = require("firebase-admin/app");
const firebase = require("../src/config/firebase");
const { sendFcmMessage, sendFcmMulticast } = require("../src/services/fcmAdminService");
const { enqueueNotification } = require("../src/services/notificationQueue");

async function runFirebaseFCMDiagnostics() {
  console.log("==================================================");
  console.log("    FIREBASE ADMIN & FCM VERIFICATION AUDIT       ");
  console.log("==================================================");

  const apps = getApps();
  const isAvailable = firebase.isFirebaseAvailable();

  console.log(`[Firebase Status] Active Apps Count: ${apps.length}`);
  console.log(`[Firebase Status] isFirebaseAvailable: ${isAvailable ? "✅ TRUE" : "⚠️ FALSE (Mock / Fallback Mode)"}`);

  if (apps.length > 0) {
    const app = apps[0];
    console.log(`[Firebase App] Name: ${app.name}`);
    console.log(`[Firebase App] Project ID: ${app.options.credential?.projectId || process.env.FCM_PROJECT_ID || "configured"}`);

    // Test Google Auth Service Account connection by listing users (or creating custom token)
    try {
      const auth = firebase.auth;
      if (auth) {
        console.log("\n--- Testing Firebase Auth Connectivity ---");
        const listResult = await auth.listUsers(1);
        console.log(`[Firebase Auth] Successfully connected to Firebase Auth! (Total users probed: ${listResult.users.length}) ✅`);
      }
    } catch (authErr) {
      console.log(`[Firebase Auth] Auth check status: ${authErr.message}`);
    }
  } else {
    console.log("\nℹ️ To enable live Firebase Push & Google Auth:");
    console.log("   1. Place your 'serviceAccountKey.json' in 'server/src/config/' or 'server/firebase/firebase-admin.json'");
    console.log("   2. OR configure FCM_PROJECT_ID, FCM_CLIENT_EMAIL, FCM_PRIVATE_KEY in 'server/.env'\n");
  }

  // Test FCM Message Payload Builder
  console.log("\n--- Testing FCM Push Service Interface ---");
  const dummyToken = "fcm_dummy_test_token_zaruda_1234567890abcdef";
  try {
    const singleResult = await sendFcmMessage(dummyToken, {
      type: "system",
      title: "Diagnostic Single",
      message: "Direct message verification"
    });
    console.log(`[Single Push Test] Success: ${singleResult.success ? "✅" : "⚠️ (Skipped/Mocked/Expected for dummy token)"}, Reason: ${singleResult.reason || singleResult.error || "ok"}`);
  } catch (err) {
    console.log(`[Single Push Test] Expected/Caught: ${err.message}`);
  }

  console.log("\n==================================================");
  console.log("               FCM AUDIT COMPLETE                 ");
  console.log("==================================================\n");
  process.exit(0);
}

runFirebaseFCMDiagnostics();
