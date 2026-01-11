/**
 * i18n Configuration
 * Protocol: Zero-Latency Linguistics
 * 
 * Cache-First / Stale-While-Revalidate Strategy:
 * 1. Check LocalStorage (2ms)
 * 2. Check Network (500ms) - only if cache miss or stale
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ChainedBackend from 'i18next-chained-backend';
import LocalStorageBackend from 'i18next-localstorage-backend';
import HttpBackend from 'i18next-http-backend';
import { LANGUAGES, getLanguageByCode } from '../constants/languages';

// PERFORMANCE: Bump this when you update translation files
// Forces browser to flush cache and get new text
const TRANSLATION_VERSION = 'v1.0.0';

const supportedLngs = LANGUAGES.map(l => l.code);

// Create version map for all languages
const languageVersions = Object.fromEntries(
  supportedLngs.map(code => [code, TRANSLATION_VERSION])
);

i18n
  .use(ChainedBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs,
    debug: import.meta.env.DEV,

    // The Chained Backend Magic
    backend: {
      backends: [
        LocalStorageBackend, // Level 2: Check Browser Storage first (2ms)
        HttpBackend          // Level 3: Check Network second (500ms)
      ],
      backendOptions: [
        {
          // LocalStorage options
          expirationTime: 7 * 24 * 60 * 60 * 1000, // Cache for 7 days
          defaultVersion: TRANSLATION_VERSION,
          versions: languageVersions,
        },
        {
          // HTTP Backend options
          loadPath: '/locales/{{lng}}/translation.json',
        }
      ]
    },

    // React Suspense Support
    react: {
      useSuspense: true,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },

    interpolation: {
      escapeValue: false,
    },

    // Detection: Prioritize user choice
    detection: {
      order: ['localStorage', 'querystring', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'mhub_language',
      lookupQuerystring: 'lng',
    }
  });

// Handle language change - RTL support
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('mhub_language', lng);

  const lang = getLanguageByCode(lng);
  document.documentElement.dir = lang.dir;
  document.documentElement.lang = lng;

  console.log(`[i18n] Language: ${lng}, Direction: ${lang.dir}, Cached: true`);
});

// Export for prefetching
export const prefetchLanguage = (langCode) => {
  if (!i18n.hasResourceBundle(langCode, 'translation')) {
    i18n.loadLanguages(langCode);
  }
};

export default i18n;
