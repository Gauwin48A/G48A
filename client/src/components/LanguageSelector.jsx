import React from "react";
import { useTranslation } from "react-i18next";

const LANGS = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "te", label: "తెలుగు" },
  { code: "mr", label: "मराठी" },
  { code: "ta", label: "தமிழ்" },
  { code: "kn", label: "ಕನ್ನಡ" },
];

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const current = i18n.language;

  function changeLang(e) {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
    window.dispatchEvent(new Event("languageChanged"));
  }

  return (
    <select value={current} onChange={changeLang} className="lang-selector">
      {LANGS.map(l => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  );
}
