import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check, ChevronDown, Loader2 } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', tier: 'global' },
  { code: 'hi', name: 'Hindi', nativeName: '\u0939\u093f\u0902\u0926\u0940', tier: 'global' },
  { code: 'es', name: 'Spanish', nativeName: 'Espa\u00f1ol', tier: 'global' },
  { code: 'fr', name: 'French', nativeName: 'Fran\u00e7ais', tier: 'global' },
  { code: 'ar', name: 'Arabic', nativeName: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629', tier: 'global', rtl: true },
  { code: 'ur', name: 'Urdu', nativeName: '\u0627\u0631\u062f\u0648', tier: 'global', rtl: true },
  { code: 'te', name: 'Telugu', nativeName: '\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41', tier: 'indian' },
  { code: 'ta', name: 'Tamil', nativeName: '\u0ba4\u0bae\u0bbf\u0bb4\u0bcd', tier: 'indian' },
  { code: 'kn', name: 'Kannada', nativeName: '\u0c95\u0ca8\u0ccd\u0ca8\u0ca1', tier: 'indian' },
  { code: 'mr', name: 'Marathi', nativeName: '\u092e\u0930\u093e\u0920\u0940', tier: 'indian' },
  { code: 'bn', name: 'Bengali', nativeName: '\u09ac\u09be\u0982\u09b2\u09be', tier: 'indian' },
  { code: 'gu', name: 'Gujarati', nativeName: '\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0', tier: 'indian' },
  { code: 'ml', name: 'Malayalam', nativeName: '\u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02', tier: 'indian' },
  { code: 'pa', name: 'Punjabi', nativeName: '\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40', tier: 'indian' },
];

const RTL_CODES = new Set(['ar', 'ur', 'he', 'fa']);

const globalLanguages = LANGUAGES.filter((l) => l.tier === 'global');
const indianLanguages = LANGUAGES.filter((l) => l.tier === 'indian');

function normalizeLangCode(code) {
  const base = String(code || '').toLowerCase().trim().split('-')[0];
  return LANGUAGES.some((l) => l.code === base) ? base : 'en';
}

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const rootRef = useRef(null);

  const currentCode = normalizeLangCode(i18n.language);
  const currentLanguage = LANGUAGES.find((l) => l.code === currentCode) || LANGUAGES[0];

  // Outside click detection
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const changeLanguage = useCallback(
    async (langCode) => {
      const nextCode = normalizeLangCode(langCode);
      if (nextCode === currentCode) {
        setIsOpen(false);
        return;
      }
      if (isSwitching) return;

      setIsSwitching(true);
      setIsOpen(false);

      try {
        await i18n.changeLanguage(nextCode);
        localStorage.setItem('mhub_language', nextCode);
        localStorage.setItem('lang', nextCode);

        // RTL support
        document.documentElement.dir = RTL_CODES.has(nextCode) ? 'rtl' : 'ltr';
        document.documentElement.lang = nextCode;
      } catch {
        // silently fail, keep current language
      } finally {
        setIsSwitching(false);
      }
    },
    [i18n, currentCode, isSwitching]
  );

  const renderSection = (title, langs) => (
    <>
      <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 select-none">
        {title}
      </div>
      {langs.map((language) => {
        const isActive = currentCode === language.code;
        return (
          <button
            key={language.code}
            type="button"
            role="option"
            aria-selected={isActive}
            disabled={isSwitching}
            onClick={() => changeLanguage(language.code)}
            className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors ${
              isActive
                ? 'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-900/30 dark:text-blue-300'
                : 'text-gray-700 hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-800'
            } ${isSwitching ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{language.nativeName}</span>
              <span className="text-xs text-gray-500 dark:text-slate-400">
                {language.name}
              </span>
            </div>
            {isActive && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />}
          </button>
        );
      })}
    </>
  );

  return (
    <div ref={rootRef} className="relative inline-block text-left" data-no-auto-translate="true">
      {/* Trigger button */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={isSwitching}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
          bg-white dark:bg-slate-800
          border-gray-300 dark:border-slate-600
          hover:bg-gray-50 dark:hover:bg-slate-700
          focus:outline-none focus:ring-2 focus:ring-blue-500/40
          disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSwitching ? (
          <Loader2 className="w-5 h-5 text-gray-600 dark:text-slate-300 animate-spin" />
        ) : (
          <Globe className="w-5 h-5 text-gray-600 dark:text-slate-300" />
        )}
        <span className="text-sm font-medium text-gray-700 dark:text-slate-200 hidden sm:inline">
          {currentLanguage.nativeName}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 dark:text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown */}
      <div
        role="listbox"
        className={`absolute right-0 mt-2 w-56 rounded-xl border shadow-xl z-50
          bg-white dark:bg-slate-900
          border-gray-200 dark:border-slate-700
          overflow-hidden
          transition-all duration-200 origin-top-right
          ${isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
          }`}
      >
        <div className="max-h-80 overflow-y-auto py-1">
          {renderSection('Global Languages', globalLanguages)}
          <div className="my-1 border-t border-gray-200 dark:border-slate-700" />
          {renderSection('Indian Languages', indianLanguages)}
        </div>
      </div>
    </div>
  );
};

export default LanguageSwitcher;
