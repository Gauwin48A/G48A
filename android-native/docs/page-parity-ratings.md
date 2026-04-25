# Signed-In Web vs Android Page Ratings

Generated: 2026-04-25T06:45:06.538Z

Web pack: `C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\android-native\test-screenshots\web-reference-auth-signedin-2026-04-25-final-2026-04-25T05-59-12-263Z`
Android pack: `C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\android-native\test-screenshots\android-auth-2026-04-25-05-37-01`

## Summary
- Total routes compared: **76**
- Missing Android captures: **7**
- Blank/loading Android captures: **36**
- Low-content Android captures: **7**
- Captured with content: **26**
- Functionality avg: **3.5/10**
- Features avg: **3.5/10**
- UI/UX avg: **3.1/10**
- Overall avg: **3.4/10**

## Route Matrix
| Route | Key | Group | Priority | Phase | Status | Func | Feat | UI/UX | Web | Android |
|---|---|---|---|---|---|---:|---:|---:|---|---|
| `/login` | `login` | AUTH | P0 | Phase 1 | Android low-content capture | 4/10 | 4/10 | 3/10 | 01_login.png | 011_login.png |
| `/signup` | `signup` | AUTH | P0 | Phase 0 -> Phase 1 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 02_signup.png | 012_signup.png |
| `/invite/:code` | `invite` | LEGAL | P2 | Phase 0 -> Phase 3 | Missing Android capture | 1/10 | 1/10 | 1/10 | 03_invite_code.png | - |
| `/forgot-password` | `forgot_password` | AUTH | P1 | Phase 2 | Android low-content capture | 4/10 | 4/10 | 3/10 | 04_forgot-password.png | 013_forgot-password.png |
| `/reset-password` | `reset_password` | AUTH | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 05_reset-password.png | - |
| `/reset-password/:token` | `reset_password` | AUTH | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 06_reset-password_token.png | - |
| `/` | `category_hub` | DISCOVERY | P0 | Phase 0 -> Phase 1 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 07_root.png | 002_category-hub.png |
| `/all-posts` | `all_posts` | DISCOVERY | P0 | Phase 0 -> Phase 1 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 08_all-posts.png | 003_all-posts.png |
| `/listings` | `all_posts` | DISCOVERY | P0 | Phase 1 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 09_listings.png | 004_listings.png |
| `/post/:id` | `post_detail` | COMMERCE | P0 | Phase 0 -> Phase 1 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 10_post_id.png | 003_all-posts.png |
| `/listing/:id` | `post_detail` | COMMERCE | P0 | Phase 0 -> Phase 1 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 11_listing_id.png | 003_all-posts.png |
| `/dashboard` | `dashboard` | ACCOUNT | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 12_dashboard.png | 014_dashboard.png |
| `/activity` | `activity` | ACCOUNT | P1 | Phase 0 -> Phase 2 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 13_activity.png | 015_activity.png |
| `/profile` | `profile` | ACCOUNT | P0 | Phase 0 -> Phase 1 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 14_profile.png | 016_profile.png |
| `/security` | `security` | ACCOUNT | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 15_security.png | 017_security.png |
| `/account/delete` | `account_delete` | ACCOUNT | P1 | Phase 0 -> Phase 2 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 16_account_delete.png | 060_account_delete.png |
| `/add-post` | `add_post` | COMMERCE | P0 | Phase 0 -> Phase 1 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 17_add-post.png | 023_add-post.png |
| `/post-welcome` | `post_welcome` | COMMERCE | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 18_post-welcome.png | 024_post-welcome.png |
| `/sell` | `add_post` | COMMERCE | P0 | Phase 0 -> Phase 1 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 19_sell.png | 025_sell.png |
| `/category-hub` | `category_hub` | DISCOVERY | P0 | Phase 0 -> Phase 1 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 20_category-hub.png | 002_category-hub.png |
| `/edit-post/:postId` | `edit_post` | COMMERCE | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 21_edit-post_postId.png | - |
| `/tier-selection` | `tiers` | COMMERCE | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 22_tier-selection.png | 026_tier-selection.png |
| `/tiers` | `tiers` | COMMERCE | P1 | Phase 0 -> Phase 2 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 23_tiers.png | 027_tiers.png |
| `/pricing` | `tiers` | COMMERCE | P1 | Phase 2 | Captured (medium parity confidence) | 7/10 | 7/10 | 6/10 | 24_pricing.png | 028_pricing.png |
| `/my-home` | `my_home` | DISCOVERY | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 25_my-home.png | 018_my-home.png |
| `/home` | `category_hub` | DISCOVERY | P0 | Phase 1 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 26_home.png | 005_home.png |
| `/for-you` | `for_you` | DISCOVERY | P1 | Phase 0 -> Phase 2 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 27_for-you.png | 006_for-you.png |
| `/bought-posts` | `bought_posts` | COMMERCE | P1 | Phase 0 -> Phase 2 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 28_bought-posts.png | 021_bought-posts.png |
| `/sold-posts` | `sold_posts` | COMMERCE | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 29_sold-posts.png | 022_sold-posts.png |
| `/buyer-view` | `buyer_view` | COMMERCE | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 30_buyer-view.png | 035_buyer-view.png |
| `/saledone` | `sale_done` | COMMERCE | P1 | Phase 0 -> Phase 2 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 31_saledone.png | 033_saledone.png |
| `/saleundone` | `sale_undone` | COMMERCE | P1 | Phase 0 -> Phase 2 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 32_saleundone.png | 034_saleundone.png |
| `/admin-panel` | `admin_panel` | LEGAL | P2 | Phase 0 -> Phase 3 | Missing Android capture | 1/10 | 1/10 | 1/10 | 33_admin-panel.png | - |
| `/aadhaar-verify` | `kyc` | ACCOUNT | P1 | Phase 0 -> Phase 2 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 34_aadhaar-verify.png | 037_aadhaar-verify.png |
| `/public-wall` | `public_wall` | SOCIAL | P1 | Phase 0 -> Phase 2 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 35_public-wall.png | 008_public-wall.png |
| `/notifications` | `notifications` | SOCIAL | P0 | Phase 1 | Android low-content capture | 4/10 | 4/10 | 3/10 | 36_notifications.png | 039_notifications.png |
| `/complaints` | `complaints` | SOCIAL | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 37_complaints.png | 040_complaints.png |
| `/feedback` | `feedback` | SOCIAL | P1 | Phase 0 -> Phase 2 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 38_feedback.png | 041_feedback.png |
| `/rewards` | `rewards` | ACCOUNT | P0 | Phase 0 -> Phase 1 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 39_rewards.png | 042_rewards.png |
| `/categories` | `subcategories` | DISCOVERY | P1 | Phase 0 -> Phase 2 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 40_categories.png | 043_categories.png |
| `/subcategories` | `subcategories` | DISCOVERY | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 41_subcategories.png | 044_subcategories.png |
| `/compare` | `compare` | COMMERCE | P1 | Phase 0 -> Phase 2 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 42_compare.png | 045_compare.png |
| `/categories/:slug` | `all_posts` | DISCOVERY | P0 | Phase 0 -> Phase 1 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 43_categories_slug.png | 043_categories.png |
| `/feed` | `feed` | SOCIAL | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 44_feed.png | 007_feed.png |
| `/feed/:id` | `feed_detail` | SOCIAL | P1 | Phase 2 | Captured (higher parity confidence) | 8/10 | 8/10 | 7/10 | 45_feed_id.png | 007_feed.png |
| `/my-feed` | `my_feed` | SOCIAL | P1 | Phase 2 | Captured (higher parity confidence) | 8/10 | 8/10 | 7/10 | 46_my-feed.png | 020_my-feed.png |
| `/my-posts` | `my_home` | DISCOVERY | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 47_my-posts.png | 019_my-posts.png |
| `/post_add` | `post_add` | SOCIAL | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 48_post_add.png | 061_post_add.png |
| `/feed/feedpostadd` | `post_add` | SOCIAL | P1 | Phase 2 | Android low-content capture | 4/10 | 4/10 | 3/10 | 49_feed_feedpostadd.png | 062_feed_feedpostadd.png |
| `/wishlist` | `wishlist` | COMMERCE | P0 | Phase 1 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 50_wishlist.png | 029_wishlist.png |
| `/cart` | `cart` | COMMERCE | P0 | Phase 0 -> Phase 1 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 51_cart.png | 030_cart.png |
| `/recently-viewed` | `recently_viewed` | COMMERCE | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 52_recently-viewed.png | 031_recently-viewed.png |
| `/saved-searches` | `saved_searches` | COMMERCE | P1 | Phase 0 -> Phase 2 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 53_saved-searches.png | 032_saved-searches.png |
| `/verification` | `verification` | ACCOUNT | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 54_verification.png | 036_verification.png |
| `/nearby` | `nearby` | DISCOVERY | P1 | Phase 0 -> Phase 2 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 55_nearby.png | 010_nearby.png |
| `/chat` | `chat` | SOCIAL | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 56_chat.png | 046_chat.png |
| `/chats` | `chat` | SOCIAL | P1 | Phase 0 -> Phase 2 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 57_chats.png | 047_chats.png |
| `/t&c` | `terms` | LEGAL | P2 | Phase 0 -> Phase 3 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 58_t_c.png | 056_terms-and-conditions.png |
| `/terms` | `terms` | LEGAL | P2 | Phase 3 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 59_terms.png | 055_terms.png |
| `/terms-and-conditions` | `terms` | LEGAL | P2 | Phase 0 -> Phase 3 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 60_terms-and-conditions.png | 056_terms-and-conditions.png |
| `/privacy-policy` | `privacy` | LEGAL | P2 | Phase 3 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 61_privacy-policy.png | 057_privacy-policy.png |
| `/refund-policy` | `refund` | LEGAL | P2 | Phase 0 -> Phase 3 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 62_refund-policy.png | 058_refund-policy.png |
| `/support-ticket-policy` | `support_policy` | LEGAL | P2 | Phase 3 | Captured (medium parity confidence) | 7/10 | 7/10 | 6/10 | 63_support-ticket-policy.png | 059_support-ticket-policy.png |
| `/search` | `search` | DISCOVERY | P0 | Phase 1 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 64_search.png | 009_search.png |
| `/analytics` | `analytics` | ACCOUNT | P1 | Phase 2 | Android low-content capture | 4/10 | 4/10 | 3/10 | 65_analytics.png | 054_analytics.png |
| `/channels` | `channels` | CHANNELS | P2 | Phase 0 -> Phase 3 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 66_channels.png | 048_channels.png |
| `/channels/create` | `channel_create` | CHANNELS | P2 | Phase 0 -> Phase 3 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 67_channels_create.png | 049_channels_create.png |
| `/channels/:id` | `channel_detail` | CHANNELS | P2 | Phase 0 -> Phase 3 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 68_channels_id.png | 048_channels.png |
| `/centre` | `centre_list` | CHANNELS | P2 | Phase 3 | Android low-content capture | 4/10 | 4/10 | 3/10 | 69_centre.png | 050_centre.png |
| `/centre/create` | `centre_create` | CHANNELS | P2 | Phase 0 -> Phase 3 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 70_centre_create.png | 051_centre_create.png |
| `/centre/:id/listings` | `centre_listings` | CHANNELS | P2 | Phase 0 -> Phase 3 | Missing Android capture | 1/10 | 1/10 | 1/10 | 71_centre_id_listings.png | - |
| `/centre/:id` | `centre_detail` | CHANNELS | P2 | Phase 3 | Android low-content capture | 4/10 | 4/10 | 3/10 | 72_centre_id.png | 050_centre.png |
| `/kyc` | `kyc` | ACCOUNT | P1 | Phase 2 | Captured (layout/state divergence) | 6/10 | 6/10 | 5/10 | 73_kyc.png | 038_kyc.png |
| `/payment` | `payment` | COMMERCE | P1 | Phase 0 -> Phase 2 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 74_payment.png | 052_payment.png |
| `/offers` | `offers` | COMMERCE | P1 | Phase 0 -> Phase 2 | Android blank/loading capture | 2/10 | 2/10 | 2/10 | 75_offers.png | 053_offers.png |
| `/reviews/:userId` | `reviews` | SOCIAL | P1 | Phase 0 -> Phase 2 | Missing Android capture | 1/10 | 1/10 | 1/10 | 76_reviews_userId.png | - |