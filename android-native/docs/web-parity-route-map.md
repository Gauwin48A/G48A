# Web-to-Android Parity Map

Reference source: `http://localhost:8081` (React web app route tree from `client/src/App.jsx`).

## Captured web reference pack

- Folder: `android-native/test-screenshots/web-reference-2026-04-20T15-28-18-319Z`
- Includes: 76 route screenshots + manifest files.
- Script used: `client/scripts/capture-route-reference.mjs`
- Supports capture modes:
  - `--mode guest` (default)
  - `--mode auth --storageState <file>`

Run again:

```powershell
cd C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\client
node .\scripts\capture-route-reference.mjs
```

Authenticated:

```powershell
cd C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\client
node .\scripts\capture-route-reference.mjs --mode auth --storageState .\storageState.json
```

## Android parity implementation

- Route catalog: `android-native/app/src/main/java/com/zaruda/app/ui/parity/WebRouteCatalog.kt`
- Parity hub/detail screens: `android-native/app/src/main/java/com/zaruda/app/ui/parity/WebParityScreens.kt`
- Route UX/state specs: `android-native/app/src/main/java/com/zaruda/app/ui/parity/WebParitySpec.kt`
- Design tokens for parity surfaces: `android-native/app/src/main/java/com/zaruda/app/ui/parity/WebParityTokens.kt`
- Navigation routes:
  - `parity/hub`
  - `parity/page/{pageKey}`
- Entry points:
  - Home debug top action: `Pages`
  - Profile menu: `Web parity pages`

## Goal achieved

Every web route from `client/src/App.jsx` now has a mapped Android parity page descriptor and Android-friendly layout template, while preserving the same page purpose, hierarchy, and visual style direction.

## Validation + reporting commands

```powershell
cd C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\android-native
node .\scripts\verify-web-parity-coverage.mjs
node .\scripts\validate-parity-pack.mjs
node .\scripts\generate-parity-report.mjs
node .\scripts\generate-route-matrix.mjs
node .\scripts\check-parity-thresholds.mjs
```

## CI gates

GitHub Actions workflow: `.github/workflows/parity-gates.yml`

Release gate requirements:
- `Missing` routes must stay `0`.
- Matched ratio must stay above `docs/parity-thresholds.json:minMatchedRatio`.
- Matched ratio must improve over `previousReleaseMatchedRatio` when `requireImprovement=true`.
