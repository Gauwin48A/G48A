import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ChainedBackend from 'i18next-chained-backend';
import LocalStorageBackend from 'i18next-localstorage-backend';
import HttpBackend from 'i18next-http-backend';
import { LANGUAGES, getLanguageByCode } from '../constants/languages';

// Bump when locale files change to invalidate i18next localStorage cache.
const TRANSLATION_VERSION = 'v1.0.1';

const supportedLngs = LANGUAGES.map((language) => language.code);
const languageVersions = Object.fromEntries(
  supportedLngs.map((code) => [code, TRANSLATION_VERSION])
);

i18n
  .use(ChainedBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs,
    debug: import.meta.env.DEV,
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
    react: {
      useSuspense: true,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed'
    },
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'querystring', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'mhub_language',
      lookupQuerystring: 'lng'
    }
  });

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('mhub_language', lng);
  localStorage.setItem('lang', lng);

  const lang = getLanguageByCode(lng);
  document.documentElement.dir = lang.dir;
  document.documentElement.lang = lng;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('languageChanged'));
  }

  if (import.meta.env.DEV) {
    console.log(`[i18n] Language: ${lng}, Direction: ${lang.dir}, Cached: true`);
  }
});

export const prefetchLanguage = (langCode) => {
  if (!i18n.hasResourceBundle(langCode, 'translation')) {
    i18n.loadLanguages(langCode);
  }
};

export default i18n;
