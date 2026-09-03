const path = require("path");
const fs = require("fs");
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");
const logger = require("../utils/logger");

let messaging = null;
let auth = null;
let isInitialized = false;

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

function loadServiceAccountFromFile() {
  const candidatePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    path.resolve(__dirname, "./serviceAccountKey.json"),
    path.resolve(__dirname, "../../firebase/firebase-admin.json"),
    path.resolve(process.cwd(), "serviceAccountKey.json"),
    path.resolve(process.cwd(), "firebase-admin.json"),
  ].filter(Boolean);

  for (const candidate of candidatePaths) {
    try {
      const resolved = path.isAbsolute(candidate)
        ? candidate
        : path.resolve(process.cwd(), candidate);
      if (fs.existsSync(resolved)) {
        const content = fs.readFileSync(resolved, "utf8");
        return JSON.parse(content);
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

if (!getApps().length) {
  try {
    let serviceAccount = loadServiceAccountFromFile();

    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
      });
      messaging = getMessaging();
      isInitialized = true;
      logger.info("✅ Firebase Admin SDK initialized successfully from service account file");
    } else {
      const projectId = process.env.FCM_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FCM_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
      const rawPrivateKey = process.env.FCM_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;

      if (projectId && clientEmail && rawPrivateKey) {
        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey: rawPrivateKey.replace(/\\n/g, "\n"),
          }),
        });
        messaging = getMessaging();
        isInitialized = true;
        logger.info("✅ Firebase Admin SDK initialized from environment credentials");
      } else {
        logger.warn(
          "⚠️ Firebase Admin credentials not found. Push notifications & Google Auth will run in mock/local mode."
        );
      }
    }
  } catch (err) {
    logger.warn(
      `⚠️ Firebase Admin initialization failed: ${err.message}. Running in mock mode.`
    );
  }
} else {
  messaging = getMessaging();
  isInitialized = true;
}

module.exports = {
  messaging,
  get auth() {
    return getAuthService();
  },
  getAuth: getAuthService,
  getMessaging: () =>
    messaging || (getApps().length ? getMessaging() : null),
  isFirebaseAvailable: () => isInitialized && getApps().length > 0,
};