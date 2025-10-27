import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";
import hi from "../locales/hi.json";
import te from "../locales/te.json";
import mr from "../locales/mr.json";
import ta from "../locales/ta.json";
import kn from "../locales/kn.json";

const resources = {
  en: { translation: en },
  hi: { translation: hi },
  te: { translation: te },
  mr: { translation: mr },
  ta: { translation: ta },
  kn: { translation: kn },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem("lang") || "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });

export default i18n;
