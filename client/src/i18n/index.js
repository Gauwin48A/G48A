import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ChainedBackend from "i18next-chained-backend";
import LocalStorageBackend from "i18next-localstorage-backend";
import HttpBackend from "i18next-http-backend";
import en from "../locales/en.json";
import { LANGUAGES, getLanguageByCode } from "../constants/languages";
import { translateText } from "../utils/translateContent";

// Bump when locale files change to invalidate i18next localStorage cache.
const TRANSLATION_VERSION = "v1.0.17";
const PRIORITY_PRELOAD_LANGUAGES = ["en", "hi", "te", "ta", "kn", "mr", "bn"];
const I18N_INIT_STARTED_FLAG = "__MHUB_I18N_INIT_STARTED__";
const I18N_LISTENER_FLAG = "__MHUB_I18N_LISTENER_BOUND__";
const I18N_WARM_FLAG = "__MHUB_I18N_WARM_SCHEDULED__";
const isTestEnv =
  import.meta.env.MODE === "test" ||
  import.meta.env.VITEST === true ||
  import.meta.env.VITEST === "true";

const supportedLngs = LANGUAGES.map((language) => language.code);
const languageVersions = Object.fromEntries(
  supportedLngs.map((code) => [code, TRANSLATION_VERSION]),
);
const preloadTasks = new Map();
const missingKeyTasks = new Map();
const missingKeyQueue = [];
let missingKeyWorkerActive = false;
const bundledResources = {
  en: { translation: en },
};

const globalScope = typeof globalThis !== "undefined" ? globalThis : {};
const hasResourceCompat = (lng, ns, key) => {
  if (typeof i18n.getResource === "function") {
    return i18n.getResource(lng, ns, key) !== undefined;
  }
  return false;
};

if (typeof i18n.hasResource !== "function") {
  // Backwards-compatible shim for any older code that expects hasResource.
  i18n.hasResource = hasResourceCompat;
}

function normalizeLanguageCode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) {
    return "en";
  }
  return normalized.split("-")[0];
}

function canUseWindow() {
  return typeof window !== "undefined";
}

function scheduleIdle(task) {
  if (!canUseWindow()) {
    return;
  }
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(task, { timeout: 1200 });
    return;
  }
  window.setTimeout(task, 16);
}

function isProbablyHumanText(value) {
  if (!value) return false;
  const text = String(value).trim();
  if (!text) return false;
  if (text.length < 2) return false;
  if (!/\p{L}/u.test(text)) return false;
  return true;
}

function normalizeMissingFallback(key, fallback) {
  if (typeof fallback === "string" && isProbablyHumanText(fallback)) {
    return fallback;
  }
  if (!key) return "";
  const cleaned = String(key).replace(/[._-]+/g, " ").trim();
  return isProbablyHumanText(cleaned) ? cleaned : "";
}

function enqueueMissingTranslation(task) {
  missingKeyQueue.push(task);
  if (!missingKeyWorkerActive) {
    missingKeyWorkerActive = true;
    scheduleIdle(async () => {
      while (missingKeyQueue.length > 0) {
        const nextTask = missingKeyQueue.shift();
        if (typeof nextTask === "function") {
          try {
            await nextTask();
          } catch {
            // ignore missing translation errors
          }
        }
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
      missingKeyWorkerActive = false;
    });
  }
}

function scheduleMissingKeyAddition(lng, ns, key, value) {
  const taskKey = `add:${lng}:${ns}:${key}`;
  if (missingKeyTasks.has(taskKey)) return;
  missingKeyTasks.set(taskKey, true);
  enqueueMissingTranslation(async () => {
    try {
      i18n.addResource(lng, ns, key, value);
    } finally {
      missingKeyTasks.delete(taskKey);
    }
  });
}

function scheduleMissingKeyTranslation(lng, ns, key, fallback) {
  if (isTestEnv) return;
  const normalizedLang = normalizeLanguageCode(lng);
  if (!normalizedLang || normalizedLang === "en") return;
  if (!supportedLngs.includes(normalizedLang)) return;

  const defaultText = normalizeMissingFallback(key, fallback);
  if (!defaultText) return;

  const taskKey = `${normalizedLang}:${ns}:${key}`;
  if (missingKeyTasks.has(taskKey)) return;

  missingKeyTasks.set(taskKey, true);
  enqueueMissingTranslation(async () => {
    try {
      const translated = await translateText(defaultText, normalizedLang);
      if (translated && translated !== defaultText) {
        i18n.addResource(normalizedLang, ns, key, translated);
      }
    } finally {
      missingKeyTasks.delete(taskKey);
    }
  });
}

function applyLanguageSideEffects(language) {
  const normalized = normalizeLanguageCode(language);

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("mhub_language", normalized);
    localStorage.setItem("lang", normalized);
  }

  const lang = getLanguageByCode(normalized) || { dir: "ltr" };
  if (typeof document !== "undefined") {
    document.documentElement.dir = lang.dir;
    document.documentElement.lang = normalized;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("languageChanged"));
  }

  if (import.meta.env.DEV && !isTestEnv) {
    console.log(`[i18n] Language: ${normalized}, Direction: ${lang.dir}, Cached: true`);
  }
}

function getStoredLanguage() {
  if (!canUseWindow()) return "";
  return normalizeLanguageCode(
    window.localStorage?.getItem("mhub_language") ||
      window.localStorage?.getItem("lang"),
  );
}

if (!i18n.isInitialized && !globalScope[I18N_INIT_STARTED_FLAG]) {
  globalScope[I18N_INIT_STARTED_FLAG] = true;

  if (!isTestEnv) {
    i18n.use(ChainedBackend).use(LanguageDetector);
  }

  i18n.use(initReactI18next);

  void i18n
    .init({
      fallbackLng: "en",
      supportedLngs,
      load: "languageOnly",
      nonExplicitSupportedLngs: true,
      partialBundledLanguages: true,
      saveMissing: true,
      saveMissingTo: "all",
      missingKeyHandler: (lngs, ns, key, fallbackValue) => {
        if (typeof window !== 'undefined' && window.__MHUB_LANG_SWITCHING) return;
        const langs = Array.isArray(lngs) ? lngs : [lngs];
        const defaultText = normalizeMissingFallback(key, fallbackValue);
        const hasEnResource = hasResourceCompat("en", ns, key);
        if (defaultText && !hasEnResource) {
          scheduleMissingKeyAddition("en", ns, key, defaultText);
        }
        const activeLang = normalizeLanguageCode(
          i18n.resolvedLanguage || i18n.language,
        );
        scheduleMissingKeyTranslation(activeLang, ns, key, fallbackValue);
        langs.forEach((lng) => {
          scheduleMissingKeyTranslation(lng, ns, key, fallbackValue);
        });
      },
      debug: import.meta.env.DEV && !isTestEnv,
      react: {
        useSuspense: false,
        bindI18n: "languageChanged loaded",
        bindI18nStore: "added removed",
      },
      interpolation: {
        escapeValue: false,
      },
      resources: isTestEnv
        ? {
            en: { translation: {} },
          }
        : bundledResources,
      ...(isTestEnv
        ? {
            lng: "en",
          }
        : {
            backend: {
              backends: [LocalStorageBackend, HttpBackend],
              backendOptions: [
                {
                  expirationTime: 7 * 24 * 60 * 60 * 1000,
                  defaultVersion: TRANSLATION_VERSION,
                  versions: languageVersions,
                },
                {
                  loadPath: "/locales/{{lng}}/translation.json",
                  queryStringParams: { v: TRANSLATION_VERSION },
                  requestOptions: {
                    cache: "force-cache",
                  },
                },
              ],
            },
            detection: {
              order: ["localStorage", "querystring", "navigator"],
              caches: ["localStorage"],
              lookupLocalStorage: "mhub_language",
              lookupQuerystring: "lng",
            },
          }),
    })
    .then(() => {
      if (!isTestEnv) {
        const storedLang = getStoredLanguage();
        const normalizedCurrent = normalizeLanguageCode(i18n.language || "en");
        if (storedLang && storedLang !== normalizedCurrent) {
          return i18n.changeLanguage(storedLang);
        }
      }
      return undefined;
    })
    .finally(() => {
      globalScope[I18N_INIT_STARTED_FLAG] = false;
    });
}

export const prefetchLanguage = (langCode) => {
  if (isTestEnv) return Promise.resolve();

  const normalizedCode = normalizeLanguageCode(langCode);
  if (!supportedLngs.includes(normalizedCode)) {
    return Promise.resolve();
  }
  if (
    typeof i18n.hasResourceBundle === "function" &&
    i18n.hasResourceBundle(normalizedCode, "translation")
  ) {
    return Promise.resolve();
  }

  const pending = preloadTasks.get(normalizedCode);
  if (pending) {
    return pending;
  }

  const task = i18n
    .loadLanguages(normalizedCode)
    .catch(() => {})
    .finally(() => {
      preloadTasks.delete(normalizedCode);
    });

  preloadTasks.set(normalizedCode, task);
  return task;
};

export const warmLanguageCache = (langCodes = []) => {
  if (isTestEnv || !Array.isArray(langCodes) || langCodes.length === 0) {
    return Promise.resolve();
  }
  const uniqueCodes = Array.from(
    new Set(
      langCodes
        .map(normalizeLanguageCode)
        .filter((code) => supportedLngs.includes(code)),
    ),
  );
  if (uniqueCodes.length === 0) {
    return Promise.resolve();
  }
  return Promise.allSettled(uniqueCodes.map((code) => prefetchLanguage(code))).then(
    () => undefined,
  );
};

if (!globalScope[I18N_LISTENER_FLAG]) {
  i18n.on("languageChanged", applyLanguageSideEffects);
  globalScope[I18N_LISTENER_FLAG] = true;
}

if (i18n.isInitialized) {
  applyLanguageSideEffects(i18n.language || "en");
}

if (!isTestEnv && canUseWindow() && !globalScope[I18N_WARM_FLAG]) {
  globalScope[I18N_WARM_FLAG] = true;

  const storedLang = normalizeLanguageCode(
    window.localStorage?.getItem("mhub_language") ||
      window.localStorage?.getItem("lang"),
  );
  const browserLang = normalizeLanguageCode(window.navigator?.language);
  const priorityCodes = Array.from(
    new Set([storedLang, browserLang, ...PRIORITY_PRELOAD_LANGUAGES].filter(Boolean)),
  ).filter((code) => supportedLngs.includes(code));

  scheduleIdle(() => {
    void warmLanguageCache(priorityCodes);
  });

  scheduleIdle(() => {
    const remaining = supportedLngs.filter((code) => !priorityCodes.includes(code));
    if (remaining.length > 0) {
      void warmLanguageCache(remaining);
    }
  });
}

export default i18n;
