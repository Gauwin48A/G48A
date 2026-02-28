import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

const LanguageSelector = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    // 1. Immediate Restore: Apply language before user interacts
    const savedLang = localStorage.getItem('mhub_language');
    if (savedLang && savedLang !== i18n.language) {
      i18n.changeLanguage(savedLang);
    }
  }, [i18n]);

  const handleLanguageChange = (value) => {
    // 2. Persist & Apply
    i18n.changeLanguage(value);
    localStorage.setItem('mhub_language', value);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xl" role="img" aria-label="language">🌐</span>
      <Select value={i18n.language} onValueChange={handleLanguageChange}>
        <SelectTrigger className="w-[110px] h-8 text-xs font-medium border-green-600/20 focus:ring-green-500 bg-white dark:bg-gray-800 text-black dark:text-white border-gray-200 dark:border-gray-700">
          <SelectValue placeholder="Lang" />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <SelectItem value="en" className="text-black dark:text-white focus:bg-gray-100 dark:focus:bg-gray-700">English</SelectItem>
          <SelectItem value="hi" className="text-black dark:text-white focus:bg-gray-100 dark:focus:bg-gray-700">हिंदी (Hindi)</SelectItem>
          <SelectItem value="te" className="text-black dark:text-white focus:bg-gray-100 dark:focus:bg-gray-700">తెలుగు (Telugu)</SelectItem>
          <SelectItem value="ta" className="text-black dark:text-white focus:bg-gray-100 dark:focus:bg-gray-700">தமிழ் (Tamil)</SelectItem>
          <SelectItem value="kn" className="text-black dark:text-white focus:bg-gray-100 dark:focus:bg-gray-700">ಕನ್ನಡ (Kannada)</SelectItem>
          <SelectItem value="mr" className="text-black dark:text-white focus:bg-gray-100 dark:focus:bg-gray-700">मराठी (Marathi)</SelectItem>
          <SelectItem value="bn" className="text-black dark:text-white focus:bg-gray-100 dark:focus:bg-gray-700">বাংলা (Bengali)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSelector;
