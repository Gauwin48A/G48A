import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = ({ currentLang, setCurrentLang }) => {
  const { i18n } = useTranslation();
  const handleChange = (e) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
    setCurrentLang(lang);
    window.dispatchEvent(new Event('languageChanged'));
  };
  return (
    <select value={currentLang} onChange={handleChange}>
      <option value="en">English</option>
      <option value="hi">हिन्दी</option>
      <option value="te">తెలుగు</option>
      <option value="mr">मराठी</option>
      <option value="ta">தமிழ்</option>
      <option value="kn">ಕನ್ನಡ</option>
    </select>
  );
};
export default LanguageSwitcher;
