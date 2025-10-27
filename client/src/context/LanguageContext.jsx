import React, { createContext, useState, useEffect } from 'react';
export const LanguageContext = createContext();
export const LanguageProvider = ({ children }) => {
  const [currentLang, setCurrentLang] = useState(localStorage.getItem('lang') || 'en');
  useEffect(() => {
    const handler = () => setCurrentLang(localStorage.getItem('lang') || 'en');
    window.addEventListener('languageChanged', handler);
    return () => window.removeEventListener('languageChanged', handler);
  }, []);
  return (
    <LanguageContext.Provider value={{ currentLang, setCurrentLang }}>
      {children}
    </LanguageContext.Provider>
  );
};
