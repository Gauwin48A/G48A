# Launch-Ready Manual QA Checklist (End-to-End)

This checklist is designed to be executed end-to-end before launch. It includes preflight setup, full route coverage, high-risk flows, regression areas, and an issue-capture template.

**Preflight Setup**
1. Confirm environment variables are set for client and server (API base URL, auth keys, payment keys, storage, email).
2. Confirm staging data is seeded for listings, categories, users, and transactions.
3. Prepare test accounts for roles: buyer, seller, premium seller, admin, unverified user, verified user.
4. Prepare devices: desktop Chrome, mobile Chrome, iOS Safari, Android Chrome.
5. Clear browser storage and service worker for a clean run.
6. Open DevTools Console and Network tabs; keep them visible during the run.
7. Ensure time and timezone are correct (location and availability depend on this).

**Global Smoke**
1. Load `/` and confirm it routes to `/category-hub` without console errors.
2. Refresh the page on `/category-hub` and confirm SPA loads correctly.
3. Toggle light/dark theme and confirm global styles update.
4. Switch language and confirm UI text updates without errors.
5. Verify soft reload banner appears instead of hard refresh on error prompts.

**Navigation & Routing**
1. Use top navbar items to navigate between main sections; confirm no full-page reloads.
2. Use browser Back and Forward on 3 different routes; confirm scroll position behavior is correct.
3. Hit a non-existent route; confirm Not Found page appears and navigation still works.

**Authentication & Session**
1. Visit `/login`, submit invalid credentials; expect error state and no crash.
2. Submit valid credentials; expect redirect to intended route and session persists on refresh.
3. Log out; confirm protected pages show auth gate and do not expose data.
4. Open a protected page in a new tab while logged out; confirm auth gate message is clear.
5. Confirm session expiry prompts and re-auth flows are clean.

**Location & Permissions**
1. On first load, deny location permission; confirm banner and skip behavior.
2. Accept location permission; confirm location banner disappears and location-dependent pages work.
3. Use manual location selector; confirm it updates display without page reload.
4. Verify clicking location display does not navigate or refresh.

**Browse & Search**
1. Open `/all-posts` and confirm listings render and infinite scroll works.
2. Apply filters and sorting; confirm results update and reset works.
3. Open `/search`, enter a query, and select trending chips; confirm results update.
4. Open `/compare` and compare two items; confirm UI and calculations.
5. Use `/saved-searches`; confirm save and delete actions.

**Listings & Details**
1. Open a listing from `/all-posts`; confirm images, price, seller info, and actions.
2. Trigger Share; confirm link is copied and toast appears.
3. Trigger Save/Unsave; confirm UI state changes and persists on refresh.
4. Open `/recently-viewed`; confirm recently viewed entries appear and open correctly.

**Create Listing (Seller)**
1. Open `/add-post`; confirm required fields validation.
2. Upload images; confirm previews, delete, and max limits.
3. Save listing; confirm success toast and new listing visible.
4. Refresh `/add-post` with unsaved changes; confirm unload warning appears.

**Edit Listing**
1. Open `/edit-post/:id` for owned listing; confirm data loads.
2. Modify images and text; save; confirm changes persist.
3. Open `/edit-post/:id` for unowned listing; confirm access error message.

**Cart & Checkout**
1. Add item to cart; verify `/cart` shows item, totals, and counts.
2. Update quantity; confirm totals update.
3. Save for later; confirm item moves sections.
4. Remove item; confirm empty state.

**Offers**
1. Open `/offers` as buyer; create an offer; confirm success.
2. Open `/offers` as seller; accept, reject, and counter with validations.
3. Confirm error toasts and blocked actions for invalid counters.

**Payments**
1. Open `/payment`; confirm plans/boosts load.
2. Switch between plans and boosts; confirm pricing updates.
3. Submit payment without transaction ID; confirm validation message.
4. Submit payment with valid data; confirm success flow.
5. Open payment history; confirm entries render and refresh works.

**Sales (Done / Undone)**
1. Open `/saledone`; initiate seller flow and confirm payload validation.
2. Open `/saledone` buyer flow; confirm OTP or transaction validation.
3. Open `/saleundone`; complete an undo request; verify success and errors.

**Chat**
1. Open `/chat` logged in; verify conversation list loads.
2. Open a conversation; send a message; verify UI update and delivery status.
3. Confirm typing indicator and unread badges.
4. Disconnect network temporarily; confirm error UI and recover on reconnect.

**Notifications**
1. Open `/notifications`; confirm list renders.
2. Mark as read; verify visual state and persistence.
3. Trigger in-app toast notifications; verify appearance and dismissal.

**Profile & Settings**
1. Open `/profile`; verify tabs load and data appears.
2. Edit profile fields; save; refresh; confirm persistence.
3. Open `/security`; confirm MFA/OTP-related settings UI.

**KYC & Verification**
1. Open `/kyc`; verify form fields and upload areas.
2. Submit invalid KYC data; confirm validation errors.
3. Submit valid data; confirm success toast and status update.
4. Open `/verification`; verify stepper updates based on status.

**Rewards & Referrals**
1. Open `/rewards`; verify all sections load.
2. Check daily check-in and spin/scratch flows; confirm success/error states.
3. Open referral tree; verify hierarchy rendering and copy/share buttons.

**Channels & Centres**
1. Open `/channels`; verify list and create flow.
2. Open `/channels/:id`; verify tabs (updates, listings, reviews).
3. Open `/centre` and `/centre/:id`; verify center-specific variants.
4. Post an update with image; confirm upload and display.

**Admin Panel**
1. Open `/admin-panel` as admin; verify dashboards load.
2. Open `/admin-panel` as non-admin; confirm access denied.

**PWA & Offline**
1. Simulate offline; confirm offline banner appears.
2. Reconnect; banner disappears.
3. Trigger service worker update; confirm update prompt shows and refresh is soft.

**Performance & Console**
1. Watch console for errors/warnings across route transitions.
2. Monitor network failures; verify user-facing error states are friendly.
3. Confirm no blocking hard reloads occur in normal navigation.

**Accessibility Quick Pass**
1. Verify visible focus states on buttons, inputs, and nav links.
2. Confirm modals trap focus and close on Escape.
3. Verify form labels are properly associated with inputs.

**Issue Capture Template**
1. ID:
2. Title:
3. Severity:
4. Environment:
5. Route:
6. Steps to Reproduce:
7. Expected Result:
8. Actual Result:
9. Console/Network Evidence:
10. Screenshot/Recording Path:

**Go/No-Go Criteria**
1. No P0 or P1 issues open.
2. No critical flow is blocked (auth, browse, create listing, payment, chat).
3. No consistent console errors on core routes.
4. Client build succeeds, server preflight passes.
