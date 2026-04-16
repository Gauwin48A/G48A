import { loadEnv } from 'vite';

const PLACEHOLDER_MARKERS = [
  'YOUR_API_KEY',
  'YOUR_PROJECT_ID',
  'YOUR_SENDER_ID',
  'YOUR_APP_ID',
  'YOUR_VAPID_KEY'
];

const REQUIRED_ENV_FIELDS = [
  { envKey: 'VITE_FIREBASE_API_KEY', configKey: 'apiKey', fallback: 'YOUR_API_KEY' },
  { envKey: 'VITE_FIREBASE_AUTH_DOMAIN', configKey: 'authDomain', fallback: 'YOUR_PROJECT_ID.firebaseapp.com' },
  { envKey: 'VITE_FIREBASE_PROJECT_ID', configKey: 'projectId', fallback: 'YOUR_PROJECT_ID' },
  { envKey: 'VITE_FIREBASE_STORAGE_BUCKET', configKey: 'storageBucket', fallback: 'YOUR_PROJECT_ID.appspot.com' },
  { envKey: 'VITE_FIREBASE_MESSAGING_SENDER_ID', configKey: 'messagingSenderId', fallback: 'YOUR_SENDER_ID' },
  { envKey: 'VITE_FIREBASE_APP_ID', configKey: 'appId', fallback: 'YOUR_APP_ID' }
];

const VAPID_ENV_KEY = 'VITE_VAPID_PUBLIC_KEY';

const isPlaceholder = (value) => {
  if (!value) return true;
  return PLACEHOLDER_MARKERS.some((marker) => String(value).includes(marker));
};

export function buildFirebaseConfig(rawEnv = {}) {
  const env = rawEnv || {};
  const firebaseConfig = {};
  const missingKeys = [];

  REQUIRED_ENV_FIELDS.forEach(({ envKey, configKey, fallback }) => {
    const value = env[envKey] || fallback;
    firebaseConfig[configKey] = value;
    if (isPlaceholder(value)) {
      missingKeys.push(envKey);
    }
  });

  const vapidKey = env[VAPID_ENV_KEY] || 'YOUR_VAPID_KEY';
  if (isPlaceholder(vapidKey)) {
    missingKeys.push(VAPID_ENV_KEY);
  }

  return {
    config: firebaseConfig,
    vapidKey,
    missingKeys,
    configured: missingKeys.length === 0
  };
}

export function loadFirebaseEnv({ mode = 'development', root = process.cwd() } = {}) {
  const loaded = loadEnv(mode, root, '');
  const env = { ...process.env, ...loaded };
  return buildFirebaseConfig(env);
}
