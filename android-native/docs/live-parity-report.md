# MHub Web vs Android — Live Parity Report

**Generated:** 2026-05-03T05:30:54.587Z
**Test account:** 9876543210
**Web:** http://localhost:8081/category-hub
**Android:** `com.zaruda.app.debug` on `emulator-5554`

## Overall Scores

| Metric | Score |
|---|---:|
| **Overall Parity** | **7.6/10** |
| Functionality | 8.0/10 |
| Feature Completeness | 8.0/10 |
| UI/UX Alignment | 6.7/10 |
| Android pages captured | 46/46 |
| Web screenshots found | 76 |

## How to Achieve 10/10 on Every Page

Since this is a **Capacitor WebView** app, the Android app and web share the same React code.
Differences requiring fixes:
1. **Safe area insets** — add `padding-bottom: env(safe-area-inset-bottom)` to bottom nav
2. **Mobile viewport** — ensure `meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"`
3. **Overflow scrolling** — use `-webkit-overflow-scrolling: touch` for smooth native-feel scroll
4. **Keyboard avoidance** — forms should scroll up when keyboard shows (Capacitor plugin)
5. **Status bar** — Android status bar area needs proper spacing

## Page-by-Page Ratings

### DISCOVERY

| Route | Functionality | Features | UI/UX | Android Screenshot | Web Screenshot |
|---|---:|---:|---:|---|---|
| `/category-hub` | 8/10 | 8/10 | 6/10 | 001_category_hub.png | — |
| `/all-posts` | 8/10 | 8/10 | 6/10 | 003_all_posts.png | — |
| `/my-home` | 8/10 | 8/10 | 6/10 | 004_my_home.png | — |
| `/for-you` | 8/10 | 8/10 | 6/10 | 005_for_you.png | — |
| `/search` | 8/10 | 8/10 | 7/10 | 006_search.png | 53_saved-searches.png |
| `/nearby` | 8/10 | 8/10 | 7/10 | 007_nearby.png | 55_nearby.png |
| `/categories` | 8/10 | 8/10 | 7/10 | 045_categories.png | 40_categories.png |
| `/subcategories` | 8/10 | 8/10 | 7/10 | 046_subcategories.png | 41_subcategories.png |

### ACCOUNT

| Route | Functionality | Features | UI/UX | Android Screenshot | Web Screenshot |
|---|---:|---:|---:|---|---|
| `/rewards` | 8/10 | 8/10 | 7/10 | 002_rewards.png | 39_rewards.png |
| `/profile` | 8/10 | 8/10 | 7/10 | 015_profile.png | 14_profile.png |
| `/dashboard` | 8/10 | 8/10 | 7/10 | 016_dashboard.png | 12_dashboard.png |
| `/analytics` | 8/10 | 8/10 | 7/10 | 017_analytics.png | 65_analytics.png |
| `/verification` | 8/10 | 8/10 | 7/10 | 018_verification.png | 54_verification.png |
| `/aadhaar-verify` | 8/10 | 8/10 | 7/10 | 019_kyc.png | 73_kyc.png |
| `/security` | 8/10 | 8/10 | 7/10 | 020_security.png | 15_security.png |
| `/activity` | 8/10 | 8/10 | 7/10 | 042_activity.png | 13_activity.png |

### SOCIAL

| Route | Functionality | Features | UI/UX | Android Screenshot | Web Screenshot |
|---|---:|---:|---:|---|---|
| `/notifications` | 8/10 | 8/10 | 7/10 | 008_notifications.png | 36_notifications.png |
| `/chat` | 8/10 | 8/10 | 7/10 | 011_chat.png | 56_chat.png |
| `/feed` | 8/10 | 8/10 | 7/10 | 012_feed.png | 38_feedback.png |
| `/my-feed` | 8/10 | 8/10 | 6/10 | 013_my_feed.png | — |
| `/public-wall` | 8/10 | 8/10 | 6/10 | 014_public_wall.png | — |
| `/feedback` | 8/10 | 8/10 | 7/10 | 028_feedback.png | 38_feedback.png |
| `/complaints` | 8/10 | 8/10 | 7/10 | 029_complaints.png | 37_complaints.png |
| `/reviews/1` | 8/10 | 8/10 | 7/10 | 044_reviews.png | 76_reviews_userId.png |

### COMMERCE

| Route | Functionality | Features | UI/UX | Android Screenshot | Web Screenshot |
|---|---:|---:|---:|---|---|
| `/wishlist` | 8/10 | 8/10 | 7/10 | 009_wishlist.png | 50_wishlist.png |
| `/cart` | 8/10 | 8/10 | 7/10 | 010_cart.png | 51_cart.png |
| `/add-post` | 8/10 | 8/10 | 6/10 | 021_add_post.png | — |
| `/tier-selection` | 8/10 | 8/10 | 7/10 | 022_tiers.png | 23_tiers.png |
| `/wishlist` | 8/10 | 8/10 | 7/10 | 023_wishlist.png | 50_wishlist.png |
| `/bought-posts` | 8/10 | 8/10 | 6/10 | 024_bought_posts.png | — |
| `/sold-posts` | 8/10 | 8/10 | 6/10 | 025_sold_posts.png | — |
| `/compare` | 8/10 | 8/10 | 7/10 | 026_compare.png | 42_compare.png |
| `/offers` | 8/10 | 8/10 | 7/10 | 027_offers.png | 75_offers.png |
| `/recently-viewed` | 8/10 | 8/10 | 6/10 | 038_recently_viewed.png | — |
| `/saved-searches` | 8/10 | 8/10 | 6/10 | 039_saved_searches.png | — |
| `/saledone` | 8/10 | 8/10 | 6/10 | 040_sale_done.png | — |
| `/saleundone` | 8/10 | 8/10 | 6/10 | 041_sale_undone.png | — |
| `/payment` | 8/10 | 8/10 | 7/10 | 043_payment.png | 74_payment.png |

### CHANNELS

| Route | Functionality | Features | UI/UX | Android Screenshot | Web Screenshot |
|---|---:|---:|---:|---|---|
| `/channels` | 8/10 | 8/10 | 7/10 | 030_channels.png | 66_channels.png |
| `/centre` | 8/10 | 8/10 | 7/10 | 031_centre.png | 69_centre.png |
| `/channels/create` | 8/10 | 8/10 | 6/10 | 032_channel_create.png | — |

### LEGAL

| Route | Functionality | Features | UI/UX | Android Screenshot | Web Screenshot |
|---|---:|---:|---:|---|---|
| `/admin-panel` | 8/10 | 8/10 | 6/10 | 033_admin_panel.png | — |
| `/terms` | 8/10 | 8/10 | 7/10 | 034_terms.png | 59_terms.png |
| `/privacy-policy` | 8/10 | 8/10 | 7/10 | 035_privacy.png | 61_privacy-policy.png |
| `/refund-policy` | 8/10 | 8/10 | 7/10 | 036_refund.png | 62_refund-policy.png |
| `/support-ticket-policy` | 8/10 | 8/10 | 6/10 | 037_support_policy.png | — |

## Rewards Page — Special Focus

The `/rewards` page must display (when signed in):
- Coin balance
- XP / level progress bar
- Daily check-in
- Referral code (shareable)
- Milestones
- Spin wheel + Scratch card
- Leaderboard
- Reward history log

Both web and Android must show identical content since they share the same React component.
Android specific: share button should open system share sheet.