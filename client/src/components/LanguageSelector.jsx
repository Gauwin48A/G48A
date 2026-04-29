import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { FiChevronDown, FiGlobe } from "react-icons/fi";
import { prefetchLanguage } from "@/i18n";

const LANGUAGES = [
  // Indian languages (primary market)
  { code: "en", label: "English", native: "English" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "ur", label: "Urdu", native: "اردو" },
  // International languages
  { code: "es", label: "Spanish", native: "Español" },
  { code: "fr", label: "French", native: "Français" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "it", label: "Italian", native: "Italiano" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "zh", label: "Chinese", native: "中文" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia" },
  { code: "tr", label: "Turkish", native: "Türkçe" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt" },
  { code: "th", label: "Thai", native: "ไทย" },
  { code: "sw", label: "Swahili", native: "Kiswahili" },
];
const WARM_PREFETCH_LIMIT = 4;

function normalizeLangCode(code) {
  const normalized = String(code || "").toLowerCase().trim();
  if (!normalized) return "en";
  const base = normalized.split("-")[0];
  return LANGUAGES.some((lang) => lang.code === base) ? base : "en";
}

export default function LanguageSelector({ className = "", compact = false, variant = "nav" }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownStyle, setDropdownStyle] = useState(null);
  const hasWarmPrefetchedRef = useRef(false);

  const currentLanguageCode = i18n?.language || "en";
  const selectedCode = useMemo(
    () => normalizeLangCode(currentLanguageCode),
    [currentLanguageCode],
  );
  const [activeCode, setActiveCode] = useState(selectedCode);

  useEffect(() => {
    setActiveCode(selectedCode);
  }, [selectedCode]);

  const selectedLanguage =
    LANGUAGES.find((lang) => lang.code === activeCode) || LANGUAGES[0];
  const selectedLabel = `${selectedLanguage.label} (${selectedLanguage.native})`;
  const buttonLabel = compact ? selectedLanguage.label : selectedLabel;
  const panelVariant = variant === "panel";
  const toneClasses = panelVariant
    ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 focus:ring-blue-500/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 dark:focus:ring-blue-300/40"
    : "border-white/20 bg-white/10 text-white hover:bg-white/20 focus:ring-white/40";
  const shapeClasses = panelVariant
    ? "w-full justify-between rounded-xl px-3.5"
    : "rounded-full px-3";

  useEffect(() => {
    const onDocumentClick = (event) => {
      if (!rootRef.current) return;
      const target = event.target;
      if (
        !rootRef.current.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };

    const onEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const nextTop = Math.round(rect.bottom + 8);
      const nextRight = Math.max(12, Math.round(window.innerWidth - rect.right));
      setDropdownStyle({
        top: `${nextTop}px`,
        right: `${nextRight}px`,
        minWidth: Math.round(rect.width),
      });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || hasWarmPrefetchedRef.current) {
      return;
    }

    const schedule = () => {
      hasWarmPrefetchedRef.current = true;
      const warmTargets = LANGUAGES.slice(0, WARM_PREFETCH_LIMIT)
        .map((lang) => lang.code)
        .filter((code) => code !== selectedCode);
      warmTargets.forEach((code) => {
        void prefetchLanguage(code);
      });
    };

    if (
      typeof window !== "undefined" &&
      typeof window.requestIdleCallback === "function"
    ) {
      const idleId = window.requestIdleCallback(schedule, { timeout: 500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timer = setTimeout(schedule, 24);
    return () => clearTimeout(timer);
  }, [open, selectedCode]);

  const RTL_CODES = new Set(["ar", "ur", "he", "fa"]);

  const handleChange = async (langCode) => {
    const nextCode = normalizeLangCode(langCode);
    if (nextCode === activeCode) {
      setOpen(false);
      return;
    }

    if (isSwitching) {
      return;
    }

    setIsSwitching(true);
    setOpen(false);
    setActiveCode(nextCode);
    if (typeof window !== 'undefined') window.__MHUB_LANG_SWITCHING = true;
    try {
      if (!i18n?.hasResourceBundle?.(nextCode, "translation")) {
        void prefetchLanguage(nextCode);
      }
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("mhub_language", nextCode);
        localStorage.setItem("lang", nextCode);
      }
      // Set text direction for RTL languages
      document.documentElement.dir = RTL_CODES.has(nextCode) ? "rtl" : "ltr";
      document.documentElement.lang = nextCode;
      if (typeof i18n?.changeLanguage === "function") {
        await i18n.changeLanguage(nextCode);
      }
      // i18n.changeLanguage already dispatches languageChanged via applyLanguageSideEffects
    } catch {
      setActiveCode(selectedCode);
    } finally {
      if (typeof window !== 'undefined') {
        setTimeout(() => { window.__MHUB_LANG_SWITCHING = false; }, 2000);
      }
      setIsSwitching(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={`relative ${className}`}
      data-no-auto-translate="true"
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        disabled={isSwitching}
        ref={buttonRef}
        className={`inline-flex items-center gap-2 border font-semibold shadow-sm transition-colors focus:outline-none focus:ring-2 ${toneClasses} ${shapeClasses} ${
          compact ? "h-8 text-xs" : "h-9 text-sm"
        }`}
      >
        <FiGlobe className="h-4 w-4" />
        <span className="whitespace-nowrap">{buttonLabel}</span>
        <FiChevronDown
          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && typeof document !== "undefined" && dropdownStyle
        ? createPortal(
            <div
              ref={dropdownRef}
              role="listbox"
              style={{
                top: dropdownStyle.top,
                right: dropdownStyle.right,
                minWidth: dropdownStyle.minWidth,
              }}
              className={`fixed z-[1000] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 max-h-[60vh] overflow-y-auto ${
                compact ? "w-44" : "w-60"
              }`}
            >
              {LANGUAGES.map((lang) => {
                const active = lang.code === activeCode;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    role="option"
                    aria-selected={active}
                    disabled={isSwitching}
                    onMouseEnter={() => prefetchLanguage(lang.code)}
                    onClick={() => handleChange(lang.code)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                      active
                        ? "bg-blue-50 font-semibold text-blue-700 dark:bg-slate-800 dark:text-white"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/70"
                    }`}
                  >
                    <span className="whitespace-nowrap">{`${lang.label} (${lang.native})`}</span>
                    {active ? (
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-200">
                        {t("selected", { defaultValue: "selected" })}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
