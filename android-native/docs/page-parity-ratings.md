# Signed-In Web vs Android Page Ratings

Generated: 2026-05-01T06:24:31.291Z

Web pack: `C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\android-native\test-screenshots\web-reference-auth-2026-05-01-livepass-2026-05-01T05-30-17-771Z`
Android pack: `C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\android-native\test-screenshots\route-walkthrough-web-parity-20260501-005154`

## Summary
- Total routes compared: **76**
- Missing Android captures: **24**
- Blank/loading Android captures: **0**
- Low-content Android captures: **0**
- Captured with content: **52**
- Functionality avg: **4.8/10**
- Features avg: **4.8/10**
- UI/UX avg: **4.1/10**
- Overall avg: **4.6/10**

## Route Matrix
| Route | Key | Group | Priority | Phase | Status | Func | Feat | UI/UX | Web | Android |
|---|---|---|---|---|---|---:|---:|---:|---|---|
| `/login` | `login` | AUTH | P0 | Phase 1 | Captured (medium parity confidence) | 7/10 | 7/10 | 6/10 | 01_login.png | 001_login.png |
| `/signup` | `signup` | AUTH | P0 | Phase 1 | Captured (medium parity confidence) | 7/10 | 7/10 | 6/10 | 02_signup.png | 002_signup.png |
| `/invite/:code` | `invite` | LEGAL | P2 | Phase 3 | Captured (medium parity confidence) | 7/10 | 7/10 | 6/10 | 03_invite_code.png | 055_invite.png |
| `/forgot-password` | `forgot_password` | AUTH | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 04_forgot-password.png | - |
| `/reset-password` | `reset_password` | AUTH | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 05_reset-password.png | - |
| `/reset-password/:token` | `reset_password` | AUTH | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 06_reset-password_token.png | - |
| `/` | `category_hub` | DISCOVERY | P0 | Phase 1 | Captured (medium parity confidence) | 7/10 | 7/10 | 6/10 | 07_root.png | 008_my_home.png |
| `/all-posts` | `all_posts` | DISCOVERY | P0 | Phase 1 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 08_all-posts.png | 011_subcategories.png |
| `/listings` | `all_posts` | DISCOVERY | P0 | Phase 1 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 09_listings.png | 011_subcategories.png |
| `/post/:id` | `post_detail` | COMMERCE | P0 | Phase 1 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 10_post_id.png | 006_all_posts.png |
| `/listing/:id` | `post_detail` | COMMERCE | P0 | Phase 1 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 11_listing_id.png | 006_all_posts.png |
| `/dashboard` | `dashboard` | ACCOUNT | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 12_dashboard.png | 039_dashboard.png |
| `/activity` | `activity` | ACCOUNT | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 13_activity.png | 040_activity.png |
| `/profile` | `profile` | ACCOUNT | P0 | Phase 1 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 14_profile.png | 041_profile.png |
| `/security` | `security` | ACCOUNT | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 15_security.png | 042_security.png |
| `/account/delete` | `account_delete` | ACCOUNT | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 16_account_delete.png | 043_account_delete.png |
| `/add-post` | `add_post` | COMMERCE | P0 | Phase 0 -> Phase 1 | Missing Android capture | 1/10 | 1/10 | 1/10 | 17_add-post.png | - |
| `/post-welcome` | `post_welcome` | COMMERCE | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 18_post-welcome.png | - |
| `/sell` | `add_post` | COMMERCE | P0 | Phase 0 -> Phase 1 | Missing Android capture | 1/10 | 1/10 | 1/10 | 19_sell.png | - |
| `/category-hub` | `category_hub` | DISCOVERY | P0 | Phase 1 | Captured (medium parity confidence) | 7/10 | 7/10 | 6/10 | 20_category-hub.png | 008_my_home.png |
| `/edit-post/:postId` | `edit_post` | COMMERCE | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 21_edit-post_postId.png | - |
| `/tier-selection` | `tiers` | COMMERCE | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 22_tier-selection.png | 016_tiers.png |
| `/tiers` | `tiers` | COMMERCE | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 23_tiers.png | 016_tiers.png |
| `/pricing` | `tiers` | COMMERCE | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 24_pricing.png | 016_tiers.png |
| `/my-home` | `my_home` | DISCOVERY | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 25_my-home.png | - |
| `/home` | `category_hub` | DISCOVERY | P0 | Phase 1 | Captured (medium parity confidence) | 7/10 | 7/10 | 6/10 | 26_home.png | 008_my_home.png |
| `/for-you` | `for_you` | DISCOVERY | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 27_for-you.png | - |
| `/bought-posts` | `bought_posts` | COMMERCE | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 28_bought-posts.png | - |
| `/sold-posts` | `sold_posts` | COMMERCE | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 29_sold-posts.png | - |
| `/buyer-view` | `buyer_view` | COMMERCE | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 30_buyer-view.png | - |
| `/saledone` | `sale_done` | COMMERCE | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 31_saledone.png | - |
| `/saleundone` | `sale_undone` | COMMERCE | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 32_saleundone.png | - |
| `/admin-panel` | `admin_panel` | LEGAL | P2 | Phase 0 -> Phase 3 | Missing Android capture | 1/10 | 1/10 | 1/10 | 33_admin-panel.png | - |
| `/aadhaar-verify` | `kyc` | ACCOUNT | P1 | Phase 2 | Captured (higher parity confidence) | 8/10 | 8/10 | 7/10 | 34_aadhaar-verify.png | 045_kyc.png |
| `/public-wall` | `public_wall` | SOCIAL | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 35_public-wall.png | - |
| `/notifications` | `notifications` | SOCIAL | P0 | Phase 1 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 36_notifications.png | 035_notifications.png |
| `/complaints` | `complaints` | SOCIAL | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 37_complaints.png | 036_complaints.png |
| `/feedback` | `feedback` | SOCIAL | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 38_feedback.png | 037_feedback.png |
| `/rewards` | `rewards` | ACCOUNT | P0 | Phase 1 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 39_rewards.png | 046_rewards.png |
| `/categories` | `subcategories` | DISCOVERY | P1 | Phase 2 | Captured (medium parity confidence) | 7/10 | 7/10 | 6/10 | 40_categories.png | 011_subcategories.png |
| `/subcategories` | `subcategories` | DISCOVERY | P1 | Phase 2 | Captured (medium parity confidence) | 7/10 | 7/10 | 6/10 | 41_subcategories.png | 011_subcategories.png |
| `/compare` | `compare` | COMMERCE | P1 | Phase 2 | Captured (medium parity confidence) | 7/10 | 7/10 | 6/10 | 42_compare.png | 022_compare.png |
| `/categories/:slug` | `all_posts` | DISCOVERY | P0 | Phase 1 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 43_categories_slug.png | 011_subcategories.png |
| `/feed` | `feed` | SOCIAL | P1 | Phase 2 | Captured (higher parity confidence) | 8/10 | 8/10 | 7/10 | 44_feed.png | 029_feed.png |
| `/feed/:id` | `feed_detail` | SOCIAL | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 45_feed_id.png | 029_feed.png |
| `/my-feed` | `my_feed` | SOCIAL | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 46_my-feed.png | - |
| `/my-posts` | `my_home` | DISCOVERY | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 47_my-posts.png | - |
| `/post_add` | `post_add` | SOCIAL | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 48_post_add.png | 032_post_add.png |
| `/feed/feedpostadd` | `post_add` | SOCIAL | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 49_feed_feedpostadd.png | 032_post_add.png |
| `/wishlist` | `wishlist` | COMMERCE | P0 | Phase 1 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 50_wishlist.png | 019_wishlist.png |
| `/cart` | `cart` | COMMERCE | P0 | Phase 1 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 51_cart.png | 018_cart.png |
| `/recently-viewed` | `recently_viewed` | COMMERCE | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 52_recently-viewed.png | - |
| `/saved-searches` | `saved_searches` | COMMERCE | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 53_saved-searches.png | - |
| `/verification` | `verification` | ACCOUNT | P1 | Phase 2 | Captured (medium parity confidence) | 7/10 | 7/10 | 6/10 | 54_verification.png | 044_verification.png |
| `/nearby` | `nearby` | DISCOVERY | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 55_nearby.png | 009_nearby.png |
| `/chat` | `chat` | SOCIAL | P1 | Phase 2 | Captured (higher parity confidence) | 8/10 | 8/10 | 7/10 | 56_chat.png | 034_chat.png |
| `/chats` | `chat` | SOCIAL | P1 | Phase 2 | Captured (higher parity confidence) | 8/10 | 8/10 | 7/10 | 57_chats.png | 034_chat.png |
| `/t&c` | `terms` | LEGAL | P2 | Phase 3 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 58_t_c.png | 056_terms.png |
| `/terms` | `terms` | LEGAL | P2 | Phase 3 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 59_terms.png | 056_terms.png |
| `/terms-and-conditions` | `terms` | LEGAL | P2 | Phase 3 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 60_terms-and-conditions.png | 056_terms.png |
| `/privacy-policy` | `privacy` | LEGAL | P2 | Phase 0 -> Phase 3 | Missing Android capture | 1/10 | 1/10 | 1/10 | 61_privacy-policy.png | - |
| `/refund-policy` | `refund` | LEGAL | P2 | Phase 0 -> Phase 3 | Missing Android capture | 1/10 | 1/10 | 1/10 | 62_refund-policy.png | - |
| `/support-ticket-policy` | `support_policy` | LEGAL | P2 | Phase 0 -> Phase 3 | Missing Android capture | 1/10 | 1/10 | 1/10 | 63_support-ticket-policy.png | - |
| `/search` | `search` | DISCOVERY | P0 | Phase 1 | Captured (higher parity confidence) | 8/10 | 8/10 | 7/10 | 64_search.png | 010_search.png |
| `/analytics` | `analytics` | ACCOUNT | P1 | Phase 2 | Captured (medium parity confidence) | 7/10 | 7/10 | 6/10 | 65_analytics.png | 047_analytics.png |
| `/channels` | `channels` | CHANNELS | P2 | Phase 3 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 66_channels.png | 048_channels.png |
| `/channels/create` | `channel_create` | CHANNELS | P2 | Phase 0 -> Phase 3 | Missing Android capture | 1/10 | 1/10 | 1/10 | 67_channels_create.png | - |
| `/channels/:id` | `channel_detail` | CHANNELS | P2 | Phase 3 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 68_channels_id.png | 048_channels.png |
| `/centre` | `centre_list` | CHANNELS | P2 | Phase 3 | Captured (medium parity confidence) | 7/10 | 7/10 | 6/10 | 69_centre.png | 051_centre_list.png |
| `/centre/create` | `centre_create` | CHANNELS | P2 | Phase 3 | Captured (higher parity confidence) | 8/10 | 8/10 | 7/10 | 70_centre_create.png | 052_centre_create.png |
| `/centre/:id/listings` | `centre_listings` | CHANNELS | P2 | Phase 3 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 71_centre_id_listings.png | 053_centre_listings.png |
| `/centre/:id` | `centre_detail` | CHANNELS | P2 | Phase 3 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 72_centre_id.png | 051_centre_list.png |
| `/kyc` | `kyc` | ACCOUNT | P1 | Phase 2 | Captured (higher parity confidence) | 8/10 | 8/10 | 7/10 | 73_kyc.png | 045_kyc.png |
| `/payment` | `payment` | COMMERCE | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 74_payment.png | 017_payment.png |
| `/offers` | `offers` | COMMERCE | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 75_offers.png | 028_offers.png |
| `/reviews/:userId` | `reviews` | SOCIAL | P1 | Phase 2 | Captured (higher parity confidence) | 8/10 | 8/10 | 7/10 | 76_reviews_userId.png | 038_reviews.png |