/**
 * Tier 1 — highest-reach global languages.
 * @type {Array<{code: string, label: string, native: string, dir: string}>}
 */
export const TIER1_LANGUAGES = [
  { code: "en", label: "English", native: "English", dir: "ltr" },
  { code: "es", label: "Spanish", native: "Español", dir: "ltr" },
  { code: "hi", label: "Hindi", native: "हिन्दी", dir: "ltr" },
  { code: "pt", label: "Portuguese", native: "Português", dir: "ltr" },
  { code: "ru", label: "Russian", native: "Pусский", dir: "ltr" },
  { code: "ar", label: "Arabic", native: "العربية", dir: "rtl" },
];

/**
 * Tier 2 — major European and Asian languages.
 * @type {Array<{code: string, label: string, native: string, dir: string}>}
 */
export const TIER2_LANGUAGES = [
  { code: "de", label: "German", native: "Deutsch", dir: "ltr" },
  { code: "fr", label: "French", native: "Français", dir: "ltr" },
  { code: "it", label: "Italian", native: "Italiano", dir: "ltr" },
  { code: "ja", label: "Japanese", native: "日本語", dir: "ltr" },
  { code: "ko", label: "Korean", native: "한국어", dir: "ltr" },
  { code: "zh", label: "Chinese", native: "简体中文", dir: "ltr" },
];

/**
 * Tier 3 — regional and emerging languages.
 * @type {Array<{code: string, label: string, native: string, dir: string}>}
 */
export const TIER3_LANGUAGES = [
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia", dir: "ltr" },
  { code: "tr", label: "Turkish", native: "Türkçe", dir: "ltr" },
  { code: "sw", label: "Swahili", native: "Kiswahili", dir: "ltr" },
  { code: "vi", label: "Vietnamese", native: "Tiếng Việt", dir: "ltr" },
  { code: "th", label: "Thai", native: "ไทย", dir: "ltr" },
  { code: "ur", label: "Urdu", native: "اردو", dir: "rtl" },
];

/**
 * Indian regional languages.
 * @type {Array<{code: string, label: string, native: string, dir: string}>}
 */
export const INDIAN_LANGUAGES = [
  { code: "te", label: "Telugu", native: "తెలుగు", dir: "ltr" },
  { code: "ta", label: "Tamil", native: "தமிழ்", dir: "ltr" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", dir: "ltr" },
  { code: "mr", label: "Marathi", native: "मराठी", dir: "ltr" },
  { code: "bn", label: "Bengali", native: "বাংলা", dir: "ltr" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", dir: "ltr" },
  { code: "ml", label: "Malayalam", native: "മലയാളം", dir: "ltr" },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", dir: "ltr" },
];

/**
 * All supported languages (tier 1 + tier 2 + tier 3 + Indian).
 * @type {Array<{code: string, label: string, native: string, dir: string}>}
 */
export const LANGUAGES = [
  ...TIER1_LANGUAGES,
  ...TIER2_LANGUAGES,
  ...TIER3_LANGUAGES,
  ...INDIAN_LANGUAGES,
];

/**
 * Grouped tiers for UI display (e.g. grouped dropdowns).
 * @type {Array<{tier: string, id: string, languages: Array}>}
 */
export const LANGUAGE_TIERS = [
  { tier: "Global", id: "tier1", languages: TIER1_LANGUAGES },
  { tier: "European & Asian", id: "tier2", languages: TIER2_LANGUAGES },
  { tier: "Regional & Emerging", id: "tier3", languages: TIER3_LANGUAGES },
  { tier: "Indian Languages", id: "indian", languages: INDIAN_LANGUAGES },
];

/**
 * Language codes that use right-to-left text direction.
 * @type {string[]}
 */
export const RTL_LANGUAGES = ["ar", "ur", "he", "fa"];

/**
 * Look up a language object by its ISO code. Falls back to English if not found.
 * @param {string} code - ISO 639-1 language code.
 * @returns {{code: string, label: string, native: string, dir: string}}
 */
export const getLanguageByCode = (code) =>
  LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];

/**
 * Check whether a language code uses right-to-left script.
 * @param {string} code - ISO 639-1 language code.
 * @returns {boolean}
 */
export const isRTL = (code) => RTL_LANGUAGES.includes(code);
