import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiChevronDown, FiGlobe } from "react-icons/fi";
import { prefetchLanguage } from "@/i18n";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "te", label: "Telugu" },
  { code: "ta", label: "Tamil" },
  { code: "kn", label: "Kannada" },
  { code: "mr", label: "Marathi" },
  { code: "bn", label: "Bengali" },
];

function normalizeLangCode(code) {
  const normalized = String(code || "").toLowerCase().trim();
  if (!normalized) return "en";
  const base = normalized.split("-")[0];
  return LANGUAGES.some((lang) => lang.code === base) ? base : "en";
}

export default function LanguageSelector({ className = "", compact = false }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const rootRef = useRef(null);
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

  useEffect(() => {
    const onDocumentClick = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) {
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
    if (!open || hasWarmPrefetchedRef.current) {
      return;
    }

    const schedule = () => {
      hasWarmPrefetchedRef.current = true;
      LANGUAGES.forEach((lang) => {
        if (lang.code !== selectedCode) {
          void prefetchLanguage(lang.code);
        }
      });
    };

    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(schedule, { timeout: 500 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timer = setTimeout(schedule, 24);
    return () => clearTimeout(timer);
  }, [open, selectedCode]);

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
    try {
      if (!i18n?.hasResourceBundle?.(nextCode, "translation")) {
        void prefetchLanguage(nextCode);
      }
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("mhub_language", nextCode);
        localStorage.setItem("lang", nextCode);
      }
      if (typeof i18n?.changeLanguage === "function") {
        await i18n.changeLanguage(nextCode);
      }
    } catch {
      setActiveCode(selectedCode);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`} data-no-auto-translate="true">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        disabled={isSwitching}
        className={`rounded-full border border-white/30 bg-white/90 px-2 font-semibold text-slate-800 shadow-sm hover:bg-white ${
          compact
            ? "h-7 min-w-[48px] text-[10px] sm:h-8 sm:min-w-[72px] sm:text-xs"
            : "h-11 min-w-[132px] text-sm"
        }`}
      >
        <span className="inline-flex w-full items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 truncate">
            <FiGlobe className="h-4 w-4 text-blue-600" />
            <span className="truncate">
              {compact ? selectedLanguage.code.toUpperCase() : selectedLanguage.label}
            </span>
          </span>
          <FiChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          className={`absolute right-0 z-[70] mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ${
            compact ? "w-40" : "w-48"
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
                    ? "bg-blue-50 font-semibold text-blue-700"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{lang.label}</span>
                {active ? (
                  <span className="text-xs">{t("selected") || "Selected"}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
