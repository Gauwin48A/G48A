# MHub Platform — Issues & Gaps Audit Report

## Critical Issues Found

### 1. Translation Routes Locked to Authenticated Users
**File:** `server/src/routes/translation.js`
**Impact:** HIGH — Blocked ALL translation API calls for guests. Non-logged-in users could not translate any content, completely breaking the language feature for them.
**Fix Applied:** ✅ `/translate` and `/batch` endpoints are now public. Admin routes (process-translations, status, stats) remain protected.

### 2. No Demo/Test Login
**Impact:** HIGH — No mechanism existed for quick testing without real credentials.
**Fix Applied:** ✅ Added "Demo Login" section to the Login page with configurable demo credentials. Users can test the full UI without entering real credentials.

### 3. Translation Path Mismatch
**File:** `client/src/services/api.js` / `server/src/routes/translation.js`
**Impact:** MEDIUM — Client calls `/translation/translate` but server route is just `/translate` (mounted under `/api/translation`). Path resolution appears to work via the base URL but is fragile.
**Status:** ⚠️ Needs server-side route alignment verification.

### 4. Language Switching Doesn't Force Data Re-Translation
**File:** `client/src/i18n/index.js`
**Impact:** HIGH — When language changed, already-loaded post data showed stale text. The `useTranslatedPosts` hook checked cache and skipped translation if it thought nothing changed.
**Fix Applied:** ✅ `clearTranslationCache()` is now called on every language switch, ensuring ALL content including post data gets freshly re-translated.

### 5. GlobalContentTranslator Limited Scope
**File:** `client/src/components/GlobalContentTranslator.jsx`
**Impact:** MEDIUM — Only watched `[data-translation-root="true"]` or `main.app-main` or `#root`, missing content in modals, drawers, and dynamically inserted elements.
**Fix Applied:** ✅ Now falls back to `document.body` to cover all dynamically rendered content, with aggressive debouncing (120ms) and idle-callback scheduling to maintain performance.

### 6. Three Redundant Language Switchers
**Files:** `LanguageSelector.jsx`, `LanguageSheet.jsx`, `LanguageSwitcher.jsx`
**Impact:** LOW-MEDIUM — All three do similar things inconsistently. The More Menu uses `LanguageSelector`, while other parts may use different ones.
**Status:** ⚠️ Recommended to consolidate into a single `LanguageSwitcher` component for consistency.

## Other Gaps Identified

### 7. Inconsistent Translation Usage Across Components
Many components use static English text that doesn't get translated. Only components using `t()` from `react-i18next` get UI translations.

### 8. Translation Server Uses Google Translate Unofficial API
**File:** `server/src/controllers/translationController.js`
**Impact:** MEDIUM — Uses `translate.googleapis.com/translate_a/single` which is an unofficial endpoint that could break without notice.
**Status:** ⚠️ Consider migrating to a paid translation service for production stability.

### 9. Android/Web Translation Sync
**Impact:** LOW — Android native app has its own `LocaleManager` and `TranslationHelper` but there's no mechanism to sync locale preference between the web app and the native Android app.

## Summary of Applied Fixes
1. ✅ Translation route auth fixed — guests can translate
2. ✅ Demo login added to Login page
3. ✅ Translation caches cleared on language switch
4. ✅ GlobalContentTranslator scope expanded to body
