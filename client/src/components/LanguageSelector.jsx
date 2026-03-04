import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi (\u0939\u093f\u0902\u0926\u0940)' },
  { code: 'te', label: 'Telugu (\u0C24\u0C46\u0C32\u0C41\u0C17\u0C41)' },
  { code: 'ta', label: 'Tamil (\u0BA4\u0BAE\u0BBF\u0BB4\u0BCD)' },
  { code: 'kn', label: 'Kannada (\u0C95\u0CA8\u0CCD\u0CA8\u0CA1)' },
  { code: 'mr', label: 'Marathi (\u092E\u0930\u093E\u0920\u0940)' },
  { code: 'bn', label: 'Bengali (\u09AC\u09BE\u0982\u09B2\u09BE)' }
];

function normalizeLanguageCode(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return 'en';
  }
  return normalized.split('-')[0];
}

export default function LanguageSelector() {
  const { i18n } = useTranslation();

  const currentLanguage = useMemo(
    () => normalizeLanguageCode(i18n.resolvedLanguage || i18n.language),
    [i18n.language, i18n.resolvedLanguage]
  );

  useEffect(() => {
    const storedLanguage = normalizeLanguageCode(
      localStorage.getItem('mhub_language') || localStorage.getItem('lang')
    );
    const nextLanguage = storedLanguage || currentLanguage || 'en';

    if (nextLanguage !== currentLanguage) {
      void i18n.changeLanguage(nextLanguage);
    }

    document.documentElement.lang = nextLanguage;
  }, [currentLanguage, i18n]);

  const handleLanguageChange = async (event) => {
    const nextLanguage = normalizeLanguageCode(event.target.value);
    if (!nextLanguage || nextLanguage === currentLanguage) {
      return;
    }

    localStorage.setItem('mhub_language', nextLanguage);
    localStorage.setItem('lang', nextLanguage);
    await i18n.changeLanguage(nextLanguage);
    document.documentElement.lang = nextLanguage;
  };

  return (
    <label className="flex items-center gap-2" aria-label="Language selector" data-no-auto-translate="true">
      <span role="img" aria-label="language icon" className="text-lg">
        {'\uD83C\uDF10'}
      </span>
      <select
        value={currentLanguage}
        onChange={handleLanguageChange}
        className="h-8 min-w-[132px] rounded-md border border-white/40 bg-white px-2 text-xs font-medium text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-white/70 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
      >
        {LANGUAGE_OPTIONS.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
    </label>
  );
}
