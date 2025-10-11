import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSelector = () => {
  const { i18n, t } = useTranslation();
  const languages = [
    { code: 'en', label: 'English' },
    { code: 'te', label: 'తెలుగు' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'ta', label: 'தமிழ்' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
    { code: 'mr', label: 'मराठी' }
  ];

  const handleChange = (e) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
    // Optionally, update user profile via API if logged in
  };

  return (
    <div className="mb-4">
      <label className="mr-2 font-semibold">{t('select_language')}:</label>
      <select value={i18n.language} onChange={handleChange} className="border rounded p-1">
        {languages.map(l => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
