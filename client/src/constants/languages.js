/**
 * Languages Configuration
 * Protocol: Tower of Babel - Global Edition
 * 
 * WhatsApp-style tier system with RTL support
 */

// Tier 1: Global Giants (Must Have)
export const TIER1_LANGUAGES = [
    { code: 'en', label: 'English', native: 'English', dir: 'ltr' },
    { code: 'es', label: 'Spanish', native: 'Español', dir: 'ltr' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी', dir: 'ltr' },
    { code: 'pt', label: 'Portuguese', native: 'Português', dir: 'ltr' },
    { code: 'ru', label: 'Russian', native: 'Pусский', dir: 'ltr' },
    { code: 'ar', label: 'Arabic', native: 'العربية', dir: 'rtl' },
];

// Tier 2: European & Asian High-Tech
export const TIER2_LANGUAGES = [
    { code: 'de', label: 'German', native: 'Deutsch', dir: 'ltr' },
    { code: 'fr', label: 'French', native: 'Français', dir: 'ltr' },
    { code: 'it', label: 'Italian', native: 'Italiano', dir: 'ltr' },
    { code: 'ja', label: 'Japanese', native: '日本語', dir: 'ltr' },
    { code: 'ko', label: 'Korean', native: '한국어', dir: 'ltr' },
    { code: 'zh', label: 'Chinese', native: '简体中文', dir: 'ltr' },
];

// Tier 3: Regional & Emerging Markets
export const TIER3_LANGUAGES = [
    { code: 'id', label: 'Indonesian', native: 'Bahasa Indonesia', dir: 'ltr' },
    { code: 'tr', label: 'Turkish', native: 'Türkçe', dir: 'ltr' },
    { code: 'sw', label: 'Swahili', native: 'Kiswahili', dir: 'ltr' },
    { code: 'vi', label: 'Vietnamese', native: 'Tiếng Việt', dir: 'ltr' },
    { code: 'th', label: 'Thai', native: 'ไทย', dir: 'ltr' },
    { code: 'ur', label: 'Urdu', native: 'اردو', dir: 'rtl' },
];

// Indian Regional Languages
export const INDIAN_LANGUAGES = [
    { code: 'te', label: 'Telugu', native: 'తెలుగు', dir: 'ltr' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்', dir: 'ltr' },
    { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', dir: 'ltr' },
    { code: 'mr', label: 'Marathi', native: 'मराठी', dir: 'ltr' },
    { code: 'bn', label: 'Bengali', native: 'বাংলা', dir: 'ltr' },
    { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી', dir: 'ltr' },
    { code: 'ml', label: 'Malayalam', native: 'മലയാളം', dir: 'ltr' },
    { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', dir: 'ltr' },
];

// All languages combined
export const LANGUAGES = [
    ...TIER1_LANGUAGES,
    ...TIER2_LANGUAGES,
    ...TIER3_LANGUAGES,
    ...INDIAN_LANGUAGES,
];

// Grouped by tier for UI display
export const LANGUAGE_TIERS = [
    { tier: 'Global', id: 'tier1', languages: TIER1_LANGUAGES },
    { tier: 'European & Asian', id: 'tier2', languages: TIER2_LANGUAGES },
    { tier: 'Regional & Emerging', id: 'tier3', languages: TIER3_LANGUAGES },
    { tier: 'Indian Languages', id: 'indian', languages: INDIAN_LANGUAGES },
];

// RTL language codes for quick lookup
export const RTL_LANGUAGES = ['ar', 'ur', 'he', 'fa'];

// Get language config by code
export const getLanguageByCode = (code) =>
    LANGUAGES.find(l => l.code === code) || LANGUAGES[0];

// Check if language is RTL
export const isRTL = (code) => RTL_LANGUAGES.includes(code);
