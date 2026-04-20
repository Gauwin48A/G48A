# Web-to-Android Parity Map

Reference source: `http://localhost:8081` (React web app route tree from `client/src/App.jsx`).

## Captured web reference pack

- Folder: `android-native/test-screenshots/web-reference-2026-04-20T15-28-18-319Z`
- Includes: 76 route screenshots + manifest files.
- Script used: `client/scripts/capture-route-reference.mjs`

Run again:

```powershell
cd C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\client
node .\scripts\capture-route-reference.mjs
```

## Android parity implementation

- Route catalog: `android-native/app/src/main/java/com/mhub/app/ui/parity/WebRouteCatalog.kt`
- Parity hub/detail screens: `android-native/app/src/main/java/com/mhub/app/ui/parity/WebParityScreens.kt`
- Navigation routes:
  - `parity/hub`
  - `parity/page/{pageKey}`
- Entry points:
  - Home debug top action: `Pages`
  - Profile menu: `Web parity pages`

## Goal achieved

Every web route from `client/src/App.jsx` now has a mapped Android parity page descriptor and Android-friendly layout template, while preserving the same page purpose, hierarchy, and visual style direction.
