# Production-Ready Android-Web Parity Plan (Phased)

Date: 2026-05-01  
Scope: `http://localhost:8081/category-hub` parity to Android app (`com.mhub.app.debug`) with mobile-first alignment.

## 1) Current Baseline
- Android launch/routing smoke: passing (home/all-posts/login route switches stable).
- AllPosts mobile layout: shifted to 1-card-per-row on phone width.
- Latest visual parity run: overall strong, but production sign-off still requires page-by-page mobile UX hardening.

## 2) Page Inventory

### Primary (P0)
- `/login`, `/signup`, `/category-hub`, `/all-posts`, `/post/:id`, `/search`
- `/profile`, `/rewards`, `/notifications`
- `/wishlist`, `/cart`, `/add-post`

### Secondary (P1)
- Discovery: `/for-you`, `/my-home`, `/nearby`, `/subcategories`
- Commerce: `/tier-selection`, `/payment`, `/offers`, `/bought-posts`, `/sold-posts`, `/buyer-view`, `/compare`, `/recently-viewed`, `/saved-searches`, `/post-welcome`, `/edit-post/:postId`, `/saledone`, `/saleundone`
- Social: `/feed`, `/feed/:id`, `/my-feed`, `/post_add`, `/public-wall`, `/chat`, `/complaints`, `/feedback`, `/reviews/:userId`
- Account: `/dashboard`, `/activity`, `/security`, `/verification`, `/kyc`, `/account/delete`, `/analytics`

### Others (P2)
- Channels: `/channels`, `/channels/create`, `/channels/:id`, `/centre`, `/centre/create`, `/centre/:id`, `/centre/:id/listings`
- Legal/System: `/terms-and-conditions`, `/privacy-policy`, `/refund-policy`, `/support-ticket-policy`, `/invite/:code`, `/admin-panel`, `*`

## 3) Phase Execution Model
- Each phase = Analyze -> Capture -> Fix -> Re-capture -> Re-rate.
- Every phase must include:
  - Authenticated web and Android screenshots.
  - Layout scan: overlap, clipping, tiny text, small touch targets, tap flow.
  - Functionality checks: loaders, error states, empty states, CTA actions.
  - Ratings: Functionality, Features, UI/UX (0-10 each).
- Exit gate for each phase:
  - No blocking breakage.
  - No horizontal overflow.
  - No key interactive element under 40x40 px (target 44x44).
  - Phase average >= 9/10, no page < 8.5/10.

## 4) Detailed Phases

### Phase 0: Auth + Environment Gate
- Pages: `/login`, `/signup`, `/category-hub`.
- Tasks:
  - Enforce successful sign-in in web and Android before parity runs.
  - Ensure session persistence and token refresh paths are stable.
  - Verify route intents (`parity/page/...`) and deep links do not stall.
- Deliverables:
  - Signed-in screenshot proof on web + Android.
  - Stable capture pack and manifest.

### Phase 1: AllPosts Deep Mobile Rebuild (Critical)
- Page: `/all-posts` (+ listing card components).
- Current findings driving this phase:
  - Previously congested 2-column card layout on mobile (fixed to 1-column).
  - Chip/button tap targets are still close to minimum in audit (`+1 more` at `60x36`).
  - Filter/action rows are dense and require touch spacing validation.
- Tasks:
  - Keep single-column cards on mobile; 2-column only from tablet breakpoint.
  - Normalize card system:
    - Card width: full grid width.
    - Consistent media aspect ratio.
    - Title clamp, meta chip spacing, action row spacing.
  - Increase tap target sizes for chips/actions to >=44px height where actionable.
  - Ensure no overlap with bottom nav or floating location badge.
- Acceptance:
  - Mobile card metrics consistent across first 10 visible cards.
  - Filter/search/header rows do not collide on 360-412px widths.
  - AllPosts rating target: 10/10.

### Phase 2: Profile Mobile UX Hardening
- Page: `/profile` (all tabs/sections).
- Tasks:
  - Reduce top hero density; preserve web gradient and color richness.
  - Ensure segmented controls/chips have comfortable tap targets.
  - Improve section transitions and spacing for long content stack.
  - Prevent bottom-nav overlap with lower CTAs and sticky elements.
- Acceptance:
  - Top block, tabs, quick actions, and cards pass spacing/tap checks.
  - Profile rating target: >=9.5/10.

### Phase 3: Rewards Mobile UX Hardening
- Page: `/rewards` (progress, challenges, referrals, milestones).
- Tasks:
  - Preserve strong web visual identity (colors/gradients/cards).
  - Reduce crowding in header chips/tabs.
  - Improve readability of progress and card content in 360-412px.
  - Validate smooth scrolling and section switching.
- Acceptance:
  - No clipped text in tabs/chips/cards.
  - Rewards rating target: >=9.5/10.

### Phase 4: Discovery Consistency
- Pages: `/category-hub`, `/for-you`, `/search`, `/nearby`, `/subcategories`, `/my-home`.
- Tasks:
  - Unify search/header behavior and spacing.
  - Ensure category cards and feed cards share consistent vertical rhythm.
  - Remove any empty/blank capture states from route transitions.
- Acceptance:
  - Discovery group average >=9/10 with no page <8.5.

### Phase 5: Commerce Flows
- Pages: `/post/:id`, `/cart`, `/wishlist`, `/payment`, `/offers`, `/tier-selection`, `/add-post`, `/edit-post/:postId`, `/post-welcome`, `/compare`, `/recently-viewed`, `/saved-searches`, `/bought-posts`, `/sold-posts`, `/buyer-view`, `/saledone`, `/saleundone`.
- Tasks:
  - Form and CTA alignment for create/edit/post pages.
  - Sticky action bars and keyboard-safe zones.
  - Card/list density and touch targets in cart/wishlist/orders.
- Acceptance:
  - End-to-end add-to-cart/wishlist/payment flow visually and functionally consistent.

### Phase 6: Social + Notification + Chat
- Pages: `/feed`, `/feed/:id`, `/my-feed`, `/post_add`, `/public-wall`, `/chat`, `/notifications`, `/complaints`, `/feedback`, `/reviews/:userId`.
- Tasks:
  - Fix compact action rows and ensure icon/action touch comfort.
  - Verify unread, list interactions, and navigation states.
  - Normalize avatar/media sizing and spacing.
- Acceptance:
  - No overlap or truncation in feed cards/comments/actions.

### Phase 7: Account/Analytics/Verification
- Pages: `/dashboard`, `/activity`, `/security`, `/verification`, `/kyc`, `/account/delete`, `/analytics`.
- Tasks:
  - Address low-score pages from prior runs (`analytics`, `verification`).
  - Keep widgets/cards readable and responsive.
  - Ensure destructive/security actions remain accessible and clear.
- Acceptance:
  - Account group average >=9/10.

### Phase 8: Channels + Legal + Admin
- Pages: `/channels`, `/channels/create`, `/channels/:id`, `/centre`, `/centre/create`, `/centre/:id`, `/centre/:id/listings`, `/terms-and-conditions`, `/privacy-policy`, `/refund-policy`, `/support-ticket-policy`, `/invite/:code`, `/admin-panel`, `*`.
- Tasks:
  - Resolve remaining low-score routes from prior pass (`admin-panel`, legal policy pages, centre listings).
  - Ensure typography scale and content width readability for long legal text.
- Acceptance:
  - No page <8.5/10 in this phase.

### Phase 9: Performance + Stability + Final Sign-off
- Cross-cutting tasks:
  - Remove loading stalls and blank states during route transitions.
  - WebView recovery and retry behavior validated.
  - Performance budgets for first render and route switch.
  - Full authenticated regression + screenshot pack + score report.
- Final gate:
  - All pages >=9/10 target, no blocking bug, no overlap/clipping issues.
  - Client delivery report includes before/after deltas and proof screenshots.

## 5) Rating Rubric (Per Page, Every Phase)
- Functionality (0-10): routing, API state handling, CTA behavior, edge states.
- Features (0-10): element completeness vs web (cards, tabs, chips, controls, metadata).
- UI/UX (0-10): spacing, alignment, typography, color fidelity, touch ergonomics, scroll feel.
- Pass criteria:
  - P0 pages: >=9.5 each axis.
  - P1/P2 pages: >=9.0 each axis.
  - Zero blocking issues.

## 6) Known Priority Defect Themes (from current audits)
- Dense chip/button targets in key pages (`all-posts`, `profile`, `rewards`, `search`, `post-detail`).
- Some tab/segment controls under preferred touch height.
- Occasional authenticated-state mismatch in capture pipelines if stale storage state is used.
- Backend 500/401 responses can degrade perceived parity if not gracefully handled.

## 7) Execution Order for Immediate Next Iteration
1. Phase 1 (AllPosts) complete to 10/10 with full card-level spacing/touch pass.
2. Phase 2 (Profile) and Phase 3 (Rewards) complete to >=9.5/10.
3. Phase 4+5+6 with grouped regression after each phase.
4. Phase 7+8 long-tail cleanup.
5. Phase 9 final signed-off parity pack and delivery report.
