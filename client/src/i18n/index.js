import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';

// Get saved language or default to English
const savedLanguage = localStorage.getItem('mhub_language') || 'en';

i18n
  .use(HttpBackend)
  .use(initReactI18next)
  .init({
    lng: savedLanguage,
    fallbackLng: 'en',
    supportedLngs: ['en', 'hi', 'te', 'ta', 'kn', 'mr', 'bn'],

    backend: {
      // Load translations from public folder with cache-busting
      loadPath: '/locales/{{lng}}.json?v=' + Date.now(),
    },

    interpolation: {
      escapeValue: false,
    },

    debug: false,

    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },
  });

// Force reload translations when language changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('mhub_language', lng);
  // Reload all resources to ensure fresh translations
  i18n.reloadResources(lng).then(() => {
    console.log(`Language changed to: ${lng}`);
  });
});

export default i18n;
