const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const logger = require("../utils/logger");

let messaging = null;
let auth = null;

function getAuthService() {
    if (auth) return auth;
    if (!getApps().length) return null;
    try {
        const { getAuth } = require("firebase-admin/auth");
        auth = getAuth();
        return auth;
    } catch (e) {
        logger.warn(`⚠️ Could not load getAuth: ${e.message}`);
        return null;
    }
}

if (!getApps().length) {
    try {
        let serviceAccount = null;
        
        // 1. Try environment variable path
        if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
            serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        } else {
            // 2. Try default location
            try {
                serviceAccount = require("../../firebase/firebase-admin.json");
            } catch (e) {
                // Default location failed
            }
        }

        if (serviceAccount) {
            initializeApp({
                credential: cert(serviceAccount),
            });
            messaging = getMessaging();
            logger.info("✅ Firebase Admin SDK initialized successfully");
        } else if (process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY) {
            // 3. Try inline credentials
            initializeApp({
                credential: cert({
                    projectId: process.env.FCM_PROJECT_ID,
                    clientEmail: process.env.FCM_CLIENT_EMAIL,
                    privateKey: process.env.FCM_PRIVATE_KEY.replace(/\\n/g, "\n")
                })
            });
            messaging = getMessaging();
            logger.info("✅ Firebase Admin SDK initialized from env credentials");
        } else {
            logger.warn("⚠️ Firebase Admin credentials not found. Push notifications & Google Auth will run in mock/local mode.");
        }
    } catch (err) {
        logger.warn(`⚠️ Firebase Admin initialization failed: ${err.message}. Running in mock mode.`);
    }
} else {
    messaging = getMessaging();
}

module.exports = {
    messaging,
    get auth() {
        return getAuthService();
    },
    getAuth: getAuthService,
    getMessaging: () => messaging || (getApps().length ? getMessaging() : null)
};