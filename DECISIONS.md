# 📌 Pending Product Decisions — DEFERRED

> **STATUS: DEFERRED — do not act until the owner decides.**
> Captured so the work can be executed quickly once the final call is made.

---

## 1. App Name — NOT FINAL

**Decision:** The app name has NOT been decided. "Zaruda" (legacy: "MHub") are placeholder
working names. **Do not hard-code any brand name in user-visible UI.**

**Current state (as of 2026-09-06):**
- `app_name` in `android-native/app/src/main/res/values/strings.xml` is intentionally **empty**
- Zero "Zaruda"/"MHub" strings in any Kotlin UI code
- Remaining "zaruda" mentions are **internal-only** (not user-visible; safe to keep until rename):
  - Theme style names (`Theme.Zaruda`, `Theme.Zaruda.Splash`) in `values/themes.xml` + `values-night/themes.xml`
  - Deep-link scheme `zaruda://` in `res/xml/shortcuts.xml` + navigation code
  - Backup file paths `zaruda_secure_prefs.xml` in `backup_rules.xml` / `data_extraction_rules.xml`
  - Package/applicationId `com.zaruda.app` (renaming = new Play Store listing identity — decide before first release, not after)

**When the name is decided, do:**
1. Set `app_name`
2. Rename theme styles + deep-link scheme (grep `zaruda://` across Kotlin + shortcuts.xml)
3. Decide whether to rename applicationId/package (breaks existing installs' upgrade path)
4. Sweep server-side user-visible strings (emails, notifications) for brand mentions
5. Update splash/launcher assets if branded

---

## 2. Escrow / Buy-with-Platform Policy — LOCKED

**Policy (confirmed by owner):**
- Escrow ("Buy with Platform" / `payment_mode = IN_APP`) applies to the **Electronics category ONLY**
- The option must appear **only inside the Cart** (add to cart first → buy from cart), never directly on post detail or elsewhere
- All other categories are forced `OUTSIDE` platform payment

**Implementation status (as of 2026-09-06): enforced.**
- Server (`server/src/controllers/salesController.js`): `payment_mode` is category-enforced server-side, never client-trusted — Electronics→`IN_APP`, everything else overridden to `OUTSIDE`
- Android: post detail shows **Add to Cart** (not a buy button); Cart's "Buy with Platform" renders only for electronics items (canonical category-key check) and `confirmBuy` re-guards
- Any future feature must respect this: no direct-buy surfaces outside the cart, no non-electronics escrow

---

*Keep this file updated whenever a deferred decision is made or a new one is added.*
