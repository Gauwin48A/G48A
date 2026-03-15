# Launch Readiness Checklist

Status key: [x] done  [~] in progress  [ ] pending

## UX & Visual Quality
- [x] Define global layout tokens (page width + spacing scale) (`page-shell`, `page-pad`, `page-section`).
- [x] Apply `page-shell` + consistent spacing to routed pages (mechanical pass).
- [x] Deep polish top-priority pages for alignment/visual hierarchy (MyHome, Rewards, Login, SaleDone, Legal pages).
- [ ] Unify button sizes, radius, and icon spacing across primary/secondary/ghost variants.
- [ ] Normalize card headers/padding across screens.
- [ ] Audit empty, loading, and error states for consistency.
- [ ] Validate responsive breakpoints for top 10 routes (mobile, tablet, desktop).

## Accessibility (A11y)
- [ ] Run contrast audit on text/buttons (WCAG AA).
- [ ] Verify keyboard navigation for tabs, modals, menus, and forms.
- [ ] Add/verify `aria-label` on icon-only buttons and inputs.
- [ ] Ensure focus-visible styles are prominent on all interactive elements.
- [ ] Respect reduced motion preferences for animations.

## Performance
- [~] Run Lighthouse (mobile + desktop) and capture baseline scores. (Ran on dev server; report generated but scores missing due to source map parse errors.)
- [x] Audit bundle size (client build) and identify largest chunks (bundle budget PASS).
- [x] Verify image optimization and lazy loading on feeds and detail pages (added lazy + async decoding on key cards/carousels).
- [ ] Confirm API caching strategy and network timeouts.

## QA & Testing
- [x] Run client lint and fix blockers.
- [x] Run server test smoke (critical paths).
- [x] Run E2E smoke for login ? browse ? post ? chat.
- [ ] Cross-browser check (Chrome, Edge, Safari) for top 10 routes.

## Ops & Release
- [ ] Validate env configs for production (API, auth, storage, notifications).
- [ ] Confirm error reporting + logging (Sentry or equivalent).
- [ ] Verify backup/restore + release gates (ops gate pass).
- [ ] Document rollback plan and incident response.

## Notes
- UI alignment updates are in `client/src/index.css`, `client/src/pages/MyHome.jsx`, `client/src/pages/Rewards.jsx`, `client/src/pages/Auth/Login.jsx`, `client/src/pages/Saledone.jsx`, and `client/src/components/legal/PolicyLayout.jsx`.
