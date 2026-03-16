# UI/UX Visual Rating - Routed Pages

Notes:
- Ratings are based on automated visual screenshots (Playwright) captured on 2026-03-14.
- API responses were mocked to show empty/zero-data states; some pages still display error states. Ratings reflect those states.
- Issues list focuses on visible alignment, spacing, hierarchy, and UX polish gaps.

| Page file | Routes | Visual rating | Issues |
| --- | --- | --- | --- |
| client/src/pages/AadhaarVerify.jsx | /aadhaar-verify | 5.8 | Bottom nav overlays upload section; content extends under nav; spacing between guidance and upload card is loose. |
| client/src/pages/AddPost.jsx | /add-post | 5.4 | Bottom nav overlays form fields; long form lacks section rhythm; checklist/header widths feel mismatched. |
| client/src/pages/AdminPanel.jsx | /admin-panel | 5.6 | Overloaded category strip; hero/filters/cards misaligned; bottom nav overlays list. |
| client/src/pages/AllPosts.jsx | /all-posts | 5.6 | Overloaded category strip; quick filters and hero card use mismatched padding; bottom nav overlays list cards. |
| client/src/pages/Analytics.jsx | /analytics | 6.3 | Bottom nav overlaps KPI sections; card grid spacing inconsistent vs header; gradient hero dominates content. |
| client/src/pages/BoughtPosts.jsx | /bought-posts | 6.2 | Empty-state card floats with large unused space; header/actions slightly off-center; nav spacing inconsistent. |
| client/src/pages/BuyerView.jsx | /buyer-view | 6.5 | Filter row alignment with card grid is uneven; card meta rows misaligned; top bar density high. |
| client/src/pages/Cart.jsx | /cart | 6.2 | Left empty-state and right summary card have mismatched heights; header actions crowd right side; column alignment feels off. |
| client/src/pages/Categories.jsx | /categories | 6.4 | Hero card too tall for content; search + empty-state card widths don�t align perfectly; large blank area below. |
| client/src/pages/ChannelsListPage.jsx | /channels | 6.5 | Search bar and CTA alignment not tied to page grid; empty-state block feels small vs page width; excess whitespace. |
| client/src/pages/ChannelPage.jsx | /channels/:id | 6.3 | Top channel card width doesn�t align with empty-state block; large dead space; back button floats without container. |
| client/src/pages/CreateChannelPage.jsx | /channels/create | 6.0 | Form card extends under bottom nav; button row cramped; vertical spacing uneven between sections. |
| client/src/pages/ProtectedChat.jsx | /chat, /chats | 6.2 | Chat columns not aligned to global page grid; empty-state CTAs stacked inconsistently; bottom nav overlaps lower content. |
| client/src/pages/Complaints.jsx | /complaints | 5.0 | Bottom nav overlays form; too many stacked sections without clear grouping; mixed card widths and gradients feel noisy. |
| client/src/pages/Dashboard.jsx | /dashboard | 4.8 | Only error card shown with massive empty space; weak hierarchy; lacks dashboard structure. |
| client/src/pages/EditPost.jsx | /edit-post/:postId | 6.4 | Centered card leaves excessive empty space; action buttons small vs card width; header context is thin. |
| client/src/pages/FeedPage.jsx | /feed | 6.5 | Hero and content alignment ok, but CTA cluster is cramped; empty state card could be larger; top bar dense. |
| client/src/pages/FeedPostDetail.jsx | /feed/:id | 6.0 | Detail card narrow vs viewport; large unused space; back CTA detached from content. |
| client/src/pages/PostAdd.jsx | /feed/feedpostadd, /post_add | 6.4 | Form card ok but header spacing tight; bottom nav overlaps page; primary/secondary buttons inconsistent width. |
| client/src/pages/Feedback.jsx | /feedback | 5.0 | Bottom nav overlays content; long vertical stack lacks clear section rhythm; gradients and cards mix inconsistently. |
| client/src/pages/ForYou.jsx | /for-you | 6.3 | Filter chips and headers don�t align to a consistent grid; empty state sits low; excess whitespace. |
| client/src/pages/Auth/ForgotPassword.jsx | /forgot-password | 6.8 | Card feels small vs viewport; secondary copy contrast low; back link floats without container. |
| client/src/pages/Home.jsx | /home | 6.0 | Onboarding card and feed section left edges don�t line up; chip/button sizes inconsistent; empty state sits low. |
| client/src/pages/KYC/KycVerification.jsx | /kyc | 6.3 | Form card ok but narrow; action buttons inconsistent sizing; bottom nav competes with form. |
| client/src/pages/Auth/Login.jsx | /login | 6.8 | Card centered but small vs viewport; hierarchy between title and tabs is weak; CTA spacing could be tighter. |
| client/src/pages/MyFeedPage.jsx | /my-feed | 6.3 | Header and stats alignment ok but empty state sits low; nav overlaps lower content; CTA sizes inconsistent. |
| client/src/pages/MyHome.jsx | /my-home, /my-posts | 5.3 | Hero banner tall vs content; stat cards and tab bar widths don�t align; bottom nav overlaps CTAs. |
| client/src/pages/MyRecommendations.jsx | /my-recommendations | 5.8 | Hero/filters not aligned to same grid; bottom nav overlays mid-page card; section spacing inconsistent. |
| client/src/pages/NearbyPosts.jsx | /nearby | 6.1 | Radius chips row cramped; spinner sits high with large blank area; header + controls not aligned. |
| client/src/pages/Notifications.jsx | /notifications | 5.4 | Dense card stack with low-contrast meta text; tab chips crowded; bottom nav overlays list. |
| client/src/pages/Offers.jsx | /offers | 6.2 | Stepper and empty-state card centered but feel disconnected; header actions right-heavy; large blank area below. |
| client/src/pages/Payments/PaymentPage.jsx | /payment | 4.7 | Error state dominates; weak hierarchy and context; empty layout around CTA. |
| client/src/pages/PostDetail.jsx | /post/:id | 5.2 | Error state only; card narrow vs viewport; CTA grouping small; lacks page context. |
| client/src/pages/TierSelection.jsx | /pricing, /tier-selection, /tiers | 6.4 | Bottom nav overlaps pricing add-ons; hero cards heights uneven; section spacing inconsistent. |
| client/src/pages/PrivacyPolicy.jsx | /privacy-policy | 6.0 | Bottom nav overlays legal text; card widths feel narrow; long content lacks section rhythm. |
| client/src/pages/Profile.jsx | /profile | 5.6 | Hero content left-heavy; overview/quick actions/tab bar misaligned; bottom nav overlaps content. |
| client/src/pages/PublicWall.jsx | /public-wall | 6.3 | Empty-state block small relative to page; hero badge floats; large unused space below. |
| client/src/pages/RecentlyViewed.jsx | /recently-viewed | 6.2 | Tab bar and empty-state block widths don�t align; bottom nav overlays lower content; spacing uneven. |
| client/src/pages/RefundPolicy.jsx | /refund-policy | 6.0 | Bottom nav overlays legal text; card widths narrow; long content lacks section rhythm. |
| client/src/pages/Auth/ResetPassword.jsx | /reset-password, /reset-password/:token | 6.6 | Two states inconsistent (invalid link vs reset form); large empty margins; CTA sizing uneven. |
| client/src/pages/Reviews.jsx | /reviews/:userId | 5.8 | Left-heavy layout; rating summary and empty panel misaligned; bottom nav overlaps lower content. |
| client/src/pages/Rewards.jsx | /rewards | 4.8 | Hero balance off; top cards misaligned; tabs not aligned to grid; contrast/spacing issues; bottom nav overlaps content. |
| client/src/pages/Saledone.jsx | /saledone | 5.4 | Bottom nav overlays form; stepper and form widths mismatch; CTA cluster cramped. |
| client/src/pages/SaleUndone.jsx | /saleundone | 5.2 | Bottom nav overlays form; stacked sections feel noisy; inconsistent card widths and padding. |
| client/src/pages/SavedSearches.jsx | /saved-searches | 3.8 | Runtime error surfaced in UI; empty state lacks structure; low-trust impression. |
| client/src/pages/SearchPage.jsx | /search | 5.7 | Duplicate search bars (global + page); cards misaligned; bottom nav overlays category-suggestions section. |
| client/src/pages/SecuritySettings.jsx | /security | 5.6 | Bottom nav overlays content; error state dominates; card spacing inconsistent; CTA sizes vary. |
| client/src/pages/Auth/SignUp.jsx | /signup | 6.3 | Low contrast on purple background; form card narrow; secondary actions crowd lower area. |
| client/src/pages/SoldPosts.jsx | /sold-posts | 6.2 | Empty-state card floats with large whitespace; header/refresh alignment off; bottom nav spacing loose. |
| client/src/pages/SupportTicketPolicy.jsx | /support-ticket-policy | 6.0 | Bottom nav overlays legal text; card widths narrow; long content lacks section rhythm. |
| client/src/pages/TermsAndConditions.jsx | /t&c | 6.0 | Bottom nav overlays legal text; card widths narrow; long content lacks section rhythm. |
| client/src/pages/Verification.jsx | /verification | 5.6 | Bottom nav overlays form; header/nav compete with content; long form lacks section rhythm. |
| client/src/pages/Wishlist.jsx | /wishlist | 6.2 | Empty-state layout ok but minimal hierarchy; header bar thin; bottom nav spacing loose. |
/saved-searches — 3.8 (runtime error surfaced)
/payment — 4.7 (error state only)
/dashboard — 4.8 (empty/error layout)
/rewards — 4.8 (hero + cards misalignment, nav overlap)
/complaints and /feedback — 5.0 (layout noise + nav overlap)