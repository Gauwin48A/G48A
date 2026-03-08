import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ChainedBackend from 'i18next-chained-backend';
import LocalStorageBackend from 'i18next-localstorage-backend';
import HttpBackend from 'i18next-http-backend';
import { LANGUAGES, getLanguageByCode } from '../constants/languages';

// Bump when locale files change to invalidate i18next localStorage cache.
const TRANSLATION_VERSION = 'v1.0.1';
const isTestEnv =
  import.meta.env.MODE === 'test' ||
  import.meta.env.VITEST === true ||
  import.meta.env.VITEST === 'true';

const supportedLngs = LANGUAGES.map((language) => language.code);
const languageVersions = Object.fromEntries(
  supportedLngs.map((code) => [code, TRANSLATION_VERSION])
);

if (!isTestEnv) {
  i18n.use(ChainedBackend).use(LanguageDetector);
}

i18n.use(initReactI18next).init({
  fallbackLng: 'en',
  supportedLngs,
  debug: import.meta.env.DEV && !isTestEnv,
  react: {
    useSuspense: true,
    bindI18n: 'languageChanged loaded',
    bindI18nStore: 'added removed'
  },
  interpolation: {
    escapeValue: false
  },
  ...(isTestEnv
    ? {
        lng: 'en',
        resources: {
          en: { translation: {} }
        }
      }
    : {
        backend: {
          backends: [LocalStorageBackend, HttpBackend],
          backendOptions: [
            {
              expirationTime: 7 * 24 * 60 * 60 * 1000,
              defaultVersion: TRANSLATION_VERSION,
              versions: languageVersions
            },
            {
              loadPath: '/locales/{{lng}}/translation.json'
            }
          ]
        },
        detection: {
          order: ['localStorage', 'querystring', 'navigator'],
          caches: ['localStorage'],
          lookupLocalStorage: 'mhub_language',
          lookupQuerystring: 'lng'
        }
      })
});

i18n.on('languageChanged', (lng) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('mhub_language', lng);
    localStorage.setItem('lang', lng);
  }

  const lang = getLanguageByCode(lng) || { dir: 'ltr' };
  if (typeof document !== 'undefined') {
    document.documentElement.dir = lang.dir;
    document.documentElement.lang = lng;
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('languageChanged'));
  }

  if (import.meta.env.DEV && !isTestEnv) {
    console.log(`[i18n] Language: ${lng}, Direction: ${lang.dir}, Cached: true`);
  }
});

export const prefetchLanguage = (langCode) => {
  if (isTestEnv) return;
  if (!i18n.hasResourceBundle(langCode, 'translation')) {
    i18n.loadLanguages(langCode);
  }
};

export default i18n;
