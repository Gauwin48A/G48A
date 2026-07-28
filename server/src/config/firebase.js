const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const serviceAccount = require("../../firebase/firebase-admin.json");

if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount),
    });

    console.log("✅ Firebase Admin initialized");
}

module.exports = {
    messaging: getMessaging(),
};