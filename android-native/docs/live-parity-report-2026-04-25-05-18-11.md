# MHub Android ↔ Web Live Parity Report

**Generated:** 2026-04-25T05:18:11.780Z
**Web source:** `C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\android-native\test-screenshots\web-reference-auth-fresh-auth-final-2026-04-25T04-56-41-314Z`
**Android source:** `C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\android-native\test-screenshots\android-auth-2026-04-25-04-55-36`

> **Goal:** Every Android screen must be a pixel-faithful replica of the web app,
> with only alignment/size adjustments for Android screen dimensions.

## Overall Parity Score

| Axis | Score | Rating |
|---|---:|:---|
| Functionality | 7.3/10 | ⚠ Acceptable |
| Features      | 6.7/10 | ⚠ Needs Work |
| UI/UX Design  | 6.3/10 | ⚠ Needs Work |
| **Overall**   | **6.8/10** | **⚠ Needs Work** |

**Pages evaluated:** 48  
**Web screenshots:** 80  
**Android screenshots:** 51

---

## DISCOVERY

### Category Hub `/category-hub` <sub>[P0]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 9/10 | ✅ Excellent |
| Features      | 9/10 | ✅ Excellent |
| UI/UX Design  | 8/10 | ✅ Good |
| **Overall**   | **8.7/10** | **✅ Good** |

**Screenshots:**
- Web: 20_category-hub.png
- Android: 004_category-hub.png

**Assessment:**
- ✅ Both screenshots captured — visual comparison available

**Functionality checks:**
- [ ] All categories render with icons and labels
- [ ] Tap on category navigates to /all-posts with category filter applied
- [ ] Search bar at top is interactive
- [ ] Bottom navigation visible and functional

**Feature checklist:**
- [ ] Hero search bar
- [ ] Category grid (Electronics, Fashion, Vehicles, etc.)
- [ ] Bottom navigation bar (Home, Search, Sell, Chat, Profile)
- [ ] Active listing count badge per category

**UI/UX checks:**
- [ ] 2-column or 3-column category grid fills screen width
- [ ] Consistent card height and icon sizing
- [ ] No horizontal overflow / scroll
- [ ] Bottom nav icons align with Android spec (44dp touch targets)
- [ ] Dark mode respected

---

### All Posts / Marketplace `/all-posts` <sub>[P0]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 7/10 | ⚠ Acceptable |
| Features      | 6/10 | ⚠ Needs Work |
| UI/UX Design  | 6/10 | ⚠ Needs Work |
| **Overall**   | **6.3/10** | **⚠ Needs Work** |

**Screenshots:**
- Web: 08_all-posts.png
- Android: 005_all-posts.png

**Assessment:**
- ✅ Both captured — significant content difference (different page state?)

**Functionality checks:**
- [ ] Product listing grid loads from API
- [ ] Search + filter chips work together
- [ ] Sort by (newest, price asc/desc) works
- [ ] Infinite scroll / load more works
- [ ] Tap on card navigates to /post/:id

**Feature checklist:**
- [ ] Search bar with clear button
- [ ] Filter chips (category, condition, price range)
- [ ] Sort dropdown
- [ ] Product cards with price, title, image, location
- [ ] Wishlist icon on each card
- [ ] Pagination / Load more button

**UI/UX checks:**
- [ ] 2-column grid on mobile
- [ ] Card images 1:1 or 4:3 aspect ratio
- [ ] Price in bold, title truncated at 2 lines
- [ ] Filter chips scrollable horizontally
- [ ] Skeleton loader while fetching

---

### Home / Landing `/home` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 25_my-home.png
- Android: 007_my-home.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Hero banner / featured listings show
- [ ] Categories section navigates correctly
- [ ] CTA buttons work

**Feature checklist:**
- [ ] Hero section with banner
- [ ] Featured deals section
- [ ] Category shortcuts
- [ ] Top sellers section

**UI/UX checks:**
- [ ] Hero image full-width
- [ ] Section headings consistent
- [ ] Smooth scroll between sections

---

### For You / Personalized `/for-you` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 27_for-you.png
- Android: 006_for-you.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Personalized recommendations load
- [ ] Posts are relevant to user preferences

**Feature checklist:**
- [ ] Personalized post cards
- [ ] Reasoning labels (why this post)
- [ ] Load more

**UI/UX checks:**
- [ ] Same card layout as marketplace
- [ ] Subtle reasoning chip under each card

---

### Search `/search` <sub>[P0]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 5/10 | ⚠ Needs Work |
| Features      | 5/10 | ⚠ Needs Work |
| UI/UX Design  | 4/10 | ❌ Critical Gap |
| **Overall**   | **4.7/10** | **❌ Critical Gap** |

**Screenshots:**
- Web: 53_saved-searches.png
- Android: 009_search.png

**Assessment:**
- ⚠ Web screenshot missing — partial evaluation only

**Functionality checks:**
- [ ] Keyboard auto-focuses on open
- [ ] Results appear while typing (debounced)
- [ ] Filter chips narrow results
- [ ] Recent searches shown and clickable
- [ ] No-results state shown

**Feature checklist:**
- [ ] Search input bar (autofocus)
- [ ] Recent searches
- [ ] Trending searches
- [ ] Filter chips (category, price, condition)
- [ ] Results grid
- [ ] No results state with suggestions

**UI/UX checks:**
- [ ] Search bar full-width, prominent
- [ ] Clear button visible when text present
- [ ] Results update in <500ms
- [ ] Keyboard does not overlap results on Android

---

### Nearby `/nearby` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 2/10 | ❌ Critical Gap |
| Features      | 2/10 | ❌ Critical Gap |
| UI/UX Design  | 1/10 | ❌ Critical Gap |
| **Overall**   | **1.7/10** | **❌ Critical Gap** |

**Screenshots:**
- Web: 55_nearby.png
- Android: 008_nearby.png

**Assessment:**
- ⚠ Android screenshot missing or blank
- ✅ Web screenshot available — partial evaluation only
- ⚠ Android screenshot is 24KB — likely blank/loading state

**Functionality checks:**
- [ ] Location permission request triggers
- [ ] Posts within radius load after permission
- [ ] Radius slider updates results

**Feature checklist:**
- [ ] Location permission prompt
- [ ] Radius slider (5–50 km)
- [ ] Post cards with distance label
- [ ] Empty state for no nearby posts

**UI/UX checks:**
- [ ] Distance shown on each card
- [ ] Slider thumb easy to drag on touch

---

### Recently Viewed `/recently-viewed` <sub>[P2]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 52_recently-viewed.png
- Android: 016_recently-viewed.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Browse history loads
- [ ] Clear history works
- [ ] Navigate to post

**Feature checklist:**
- [ ] History grid
- [ ] Clear all button
- [ ] Empty state

**UI/UX checks:**
- [ ] Same card style as marketplace

---

### Saved Searches `/saved-searches` <sub>[P2]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 5/10 | ⚠ Needs Work |
| Features      | 5/10 | ⚠ Needs Work |
| UI/UX Design  | 4/10 | ❌ Critical Gap |
| **Overall**   | **4.7/10** | **❌ Critical Gap** |

**Screenshots:**
- Web: 53_saved-searches.png
- Android: 017_saved-searches.png

**Assessment:**
- ⚠ Web screenshot missing — partial evaluation only

**Functionality checks:**
- [ ] Saved searches list loads
- [ ] Tap re-runs search

**Feature checklist:**
- [ ] Search cards with keyword + filters
- [ ] Delete search
- [ ] Empty state

**UI/UX checks:**
- [ ] Swipe to delete gesture

---

### Categories / Subcategories `/categories` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 40_categories.png
- Android: 010_subcategories.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Category list renders
- [ ] Tap navigates to filtered marketplace

**Feature checklist:**
- [ ] Category + subcategory grid
- [ ] Back breadcrumb

**UI/UX checks:**
- [ ] Grid fills screen
- [ ] Icons consistent size

---

### Compare Posts `/compare` <sub>[P2]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 9/10 | ✅ Excellent |
| Features      | 9/10 | ✅ Excellent |
| UI/UX Design  | 8/10 | ✅ Good |
| **Overall**   | **8.7/10** | **✅ Good** |

**Screenshots:**
- Web: 42_compare.png
- Android: 018_compare.png

**Assessment:**
- ✅ Both screenshots captured — visual comparison available

**Functionality checks:**
- [ ] Compare two posts side-by-side works

**Feature checklist:**
- [ ] Post selectors
- [ ] Comparison table

**UI/UX checks:**
- [ ] Horizontally scrollable comparison on mobile

---

## AUTH

### Login `/login` <sub>[P0]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 2/10 | ❌ Critical Gap |
| Features      | 2/10 | ❌ Critical Gap |
| UI/UX Design  | 1/10 | ❌ Critical Gap |
| **Overall**   | **1.7/10** | **❌ Critical Gap** |

**Screenshots:**
- Web: 01_login.png
- Android: 001_login.png

**Assessment:**
- ⚠ Android screenshot missing or blank
- ✅ Web screenshot available — partial evaluation only
- ⚠ Android screenshot is 25KB — likely blank/loading state

**Functionality checks:**
- [ ] Email/phone input works
- [ ] Password field with show/hide toggle
- [ ] Sign In submits and redirects to /category-hub
- [ ] Error toast on wrong credentials
- [ ] Forgot password link navigates correctly

**Feature checklist:**
- [ ] MHub logo / brand header
- [ ] Email/identifier input
- [ ] Password input with eye toggle
- [ ] Sign In CTA button
- [ ] Forgot password link
- [ ] Sign up redirect link

**UI/UX checks:**
- [ ] Form centered, mobile-optimized
- [ ] Input fields full-width
- [ ] Sign In button 48dp+ tall
- [ ] Keyboard pushes form up on Android (no overlap)
- [ ] Dark mode respected

---

### Sign Up `/signup` <sub>[P0]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 7/10 | ⚠ Acceptable |
| Features      | 6/10 | ⚠ Needs Work |
| UI/UX Design  | 6/10 | ⚠ Needs Work |
| **Overall**   | **6.3/10** | **⚠ Needs Work** |

**Screenshots:**
- Web: 02_signup.png
- Android: 002_signup.png

**Assessment:**
- ✅ Both captured — significant content difference (different page state?)

**Functionality checks:**
- [ ] All fields accept input
- [ ] Password strength indicator updates in real time
- [ ] Referral code field (optional)
- [ ] Terms checkbox required before submit
- [ ] Account created → redirects correctly

**Feature checklist:**
- [ ] Full name field
- [ ] Email field
- [ ] Phone field
- [ ] Password + confirm password
- [ ] Password strength meter
- [ ] Referral code field (optional)
- [ ] Terms & conditions checkbox with link
- [ ] Sign Up CTA

**UI/UX checks:**
- [ ] Scrollable form on small screens
- [ ] Inline validation messages
- [ ] Strength bar color (red→orange→green)

---

### Forgot Password `/forgot-password` <sub>[P2]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 9/10 | ✅ Excellent |
| Features      | 9/10 | ✅ Excellent |
| UI/UX Design  | 8/10 | ✅ Good |
| **Overall**   | **8.7/10** | **✅ Good** |

**Screenshots:**
- Web: 04_forgot-password.png
- Android: 003_forgot-password.png

**Assessment:**
- ✅ Both screenshots captured — visual comparison available

**Functionality checks:**
- [ ] Email input and submit sends reset link

**Feature checklist:**
- [ ] Email input
- [ ] Submit button
- [ ] Back to login link

**UI/UX checks:**
- [ ] Simple centered form
- [ ] Success state after submit

---

## ACCOUNT

### Dashboard `/dashboard` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 7/10 | ⚠ Acceptable |
| Features      | 6/10 | ⚠ Needs Work |
| UI/UX Design  | 6/10 | ⚠ Needs Work |
| **Overall**   | **6.3/10** | **⚠ Needs Work** |

**Screenshots:**
- Web: 12_dashboard.png
- Android: 034_dashboard.png

**Assessment:**
- ✅ Both captured — significant content difference (different page state?)

**Functionality checks:**
- [ ] Analytics data loads from API
- [ ] Stats cards show correct numbers
- [ ] Charts render
- [ ] Date range filter works

**Feature checklist:**
- [ ] Active listings count
- [ ] Total views stat
- [ ] Messages stat
- [ ] Sales stat
- [ ] Earnings chart or summary
- [ ] Recent activity feed

**UI/UX checks:**
- [ ] Stat cards in responsive grid (2-col on mobile)
- [ ] Chart fits screen width (no overflow)
- [ ] Card spacing consistent with design system

---

### Activity Hub `/activity` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 13_activity.png
- Android: 035_activity.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Activity feed loads
- [ ] Tabs switch between different activity types

**Feature checklist:**
- [ ] Activity list
- [ ] Tab bar (All, Listings, Messages, Rewards)
- [ ] Timestamps

**UI/UX checks:**
- [ ] Tab bar anchored at top
- [ ] Activity items with avatar and description

---

### Profile `/profile` <sub>[P0]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 14_profile.png
- Android: 036_profile.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Profile data loads (name, email, avatar, stats)
- [ ] Edit profile navigates to edit view
- [ ] Logout works
- [ ] Verification badges shown correctly

**Feature checklist:**
- [ ] Profile picture (circular)
- [ ] Name + email + phone
- [ ] Aadhaar / KYC verification badge
- [ ] Active listings, sold, bought counts
- [ ] Referral code displayed
- [ ] Navigation links (Security, Preferences, etc.)
- [ ] Logout button

**UI/UX checks:**
- [ ] Profile picture centered at top
- [ ] Stats in horizontal row
- [ ] Settings sections clearly divided
- [ ] Logout button at bottom, destructive-colored

---

### Security Settings `/security` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 7/10 | ⚠ Acceptable |
| Features      | 6/10 | ⚠ Needs Work |
| UI/UX Design  | 6/10 | ⚠ Needs Work |
| **Overall**   | **6.3/10** | **⚠ Needs Work** |

**Screenshots:**
- Web: 15_security.png
- Android: 037_security.png

**Assessment:**
- ✅ Both captured — significant content difference (different page state?)

**Functionality checks:**
- [ ] Change password form works
- [ ] 2FA setup / disable works
- [ ] Active sessions list shows

**Feature checklist:**
- [ ] Change password form
- [ ] 2FA toggle + QR code setup
- [ ] Active sessions list with device info
- [ ] Revoke session button

**UI/UX checks:**
- [ ] Sections clearly labeled
- [ ] Destructive actions (revoke) red-colored

---

### My Home / My Listings `/my-home` <sub>[P0]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 25_my-home.png
- Android: 007_my-home.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Active listings load
- [ ] Sold / Bought / Reactivated tabs switch
- [ ] Bulk select works
- [ ] Delete selected works
- [ ] Mark as sold works per card

**Feature checklist:**
- [ ] Tabs: Active, Sold, Bought, Reactivated
- [ ] Listing cards with edit / delete / mark-sold actions
- [ ] Bulk select mode
- [ ] Empty state per tab
- [ ] Post count in tab label

**UI/UX checks:**
- [ ] Cards full-width on mobile
- [ ] Action buttons 44dp+ touch targets
- [ ] Bulk select checkbox visible on tap
- [ ] Swipe-to-delete gesture (Android)

---

### Bought Posts `/bought-posts` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 28_bought-posts.png
- Android: 019_bought-posts.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Bought listings load
- [ ] Navigate to post detail works

**Feature checklist:**
- [ ] Listing cards
- [ ] Purchase date
- [ ] Empty state

**UI/UX checks:**
- [ ] Cards consistent with My Home style

---

### Sold Posts `/sold-posts` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 29_sold-posts.png
- Android: 020_sold-posts.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Sold listings load
- [ ] Transaction ID visible per sale

**Feature checklist:**
- [ ] Listing cards with sold date
- [ ] Transaction ID
- [ ] Empty state

**UI/UX checks:**
- [ ] Sold badge on each card

---

### Analytics `/analytics` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 65_analytics.png
- Android: 042_analytics.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Analytics data loads
- [ ] Date range picker works

**Feature checklist:**
- [ ] Views chart
- [ ] Engagement chart
- [ ] Date picker
- [ ] Export option

**UI/UX checks:**
- [ ] Charts responsive on mobile
- [ ] Horizontal scroll for charts if needed

---

### Account Deletion `/account/delete` <sub>[P2]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 7/10 | ⚠ Acceptable |
| Features      | 6/10 | ⚠ Needs Work |
| UI/UX Design  | 6/10 | ⚠ Needs Work |
| **Overall**   | **6.3/10** | **⚠ Needs Work** |

**Screenshots:**
- Web: 16_account_delete.png
- Android: 038_account_delete.png

**Assessment:**
- ✅ Both captured — significant content difference (different page state?)

**Functionality checks:**
- [ ] Deletion confirmation form works
- [ ] Password confirmation required

**Feature checklist:**
- [ ] Warning text
- [ ] Confirm input
- [ ] Delete button

**UI/UX checks:**
- [ ] Destructive red styling on delete button
- [ ] Warning prominent

---

## COMMERCE

### Create Listing `/add-post` <sub>[P0]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 17_add-post.png
- Android: 011_add-post.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Multi-step form: Basic → Images → Price/Location → Review
- [ ] Category picker works
- [ ] Image picker opens gallery
- [ ] Images upload correctly
- [ ] Form submits and creates listing
- [ ] Draft save works

**Feature checklist:**
- [ ] Step progress bar
- [ ] Category + subcategory picker
- [ ] Image upload (up to 5/10 depending on tier)
- [ ] Title, description fields
- [ ] Price field
- [ ] Condition picker
- [ ] Warranty status
- [ ] Location field
- [ ] Tier selection
- [ ] Review step with preview

**UI/UX checks:**
- [ ] Step indicator clearly shows progress
- [ ] Image thumbnails with ×remove button
- [ ] Keyboard avoidance: form scrolls above keyboard
- [ ] Price field shows ₹ prefix

---

### Tier Selection `/tier-selection` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 22_tier-selection.png
- Android: 013_tier-selection.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Tier cards show (Free, Basic, Silver, Premium)
- [ ] Select tier updates and navigates

**Feature checklist:**
- [ ] Tier cards with price and features list
- [ ] Current plan highlighted
- [ ] Select button per tier

**UI/UX checks:**
- [ ] Cards stack vertically on mobile
- [ ] Current tier has visual distinction (border/badge)

---

### Wishlist `/wishlist` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 50_wishlist.png
- Android: 015_wishlist.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Saved posts load
- [ ] Remove from wishlist works
- [ ] Tap on post navigates to detail

**Feature checklist:**
- [ ] Post cards grid
- [ ] Remove button on each card
- [ ] Item count in header
- [ ] Empty state with CTA

**UI/UX checks:**
- [ ] Same card style as marketplace
- [ ] Remove button accessible

---

### Cart `/cart` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 51_cart.png
- Android: 014_cart.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Cart items list
- [ ] Remove item
- [ ] Proceed to checkout flow

**Feature checklist:**
- [ ] Cart item list
- [ ] Price summary
- [ ] Checkout button
- [ ] Empty state

**UI/UX checks:**
- [ ] Clear price breakdown
- [ ] Sticky checkout button at bottom

---

### Sale Done (Mark Sold) `/saledone` <sub>[P0]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 31_saledone.png
- Android: 022_saledone.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Post ID + buyer ID input works
- [ ] Submit initiates dual verification
- [ ] Success state shows transaction ID

**Feature checklist:**
- [ ] Post ID input
- [ ] Buyer user ID input
- [ ] Sale amount input
- [ ] Submit button
- [ ] Instructions for buyer code

**UI/UX checks:**
- [ ] Form inputs full-width
- [ ] Clear call-to-action

---

### Sale Undone `/saleundone` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 5/10 | ⚠ Needs Work |
| Features      | 5/10 | ⚠ Needs Work |
| UI/UX Design  | 4/10 | ❌ Critical Gap |
| **Overall**   | **4.7/10** | **❌ Critical Gap** |

**Screenshots:**
- Web: 32_saleundone.png
- Android: 023_saleundone.png

**Assessment:**
- ⚠ Web screenshot missing — partial evaluation only

**Functionality checks:**
- [ ] Post ID input + submit reactivates listing
- [ ] Reason selection optional

**Feature checklist:**
- [ ] Post ID input
- [ ] Reason selector
- [ ] Submit button

**UI/UX checks:**
- [ ] Simple form layout

---

### Buyer View `/buyer-view` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 30_buyer-view.png
- Android: 021_buyer-view.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Secret code entry for sale confirmation
- [ ] Submit confirms purchase on buyer side

**Feature checklist:**
- [ ] Secret code input
- [ ] Post details summary
- [ ] Confirm button

**UI/UX checks:**
- [ ] Large code input field
- [ ] Clear confirmation state

---

### Offers `/offers` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 9/10 | ✅ Excellent |
| Features      | 9/10 | ✅ Excellent |
| UI/UX Design  | 8/10 | ✅ Good |
| **Overall**   | **8.7/10** | **✅ Good** |

**Screenshots:**
- Web: 75_offers.png
- Android: 024_offers.png

**Assessment:**
- ✅ Both screenshots captured — visual comparison available

**Functionality checks:**
- [ ] Offers list loads
- [ ] Accept/reject offer works

**Feature checklist:**
- [ ] Offer cards with price + post summary
- [ ] Accept / Counter / Reject buttons

**UI/UX checks:**
- [ ] Action buttons clearly labeled and accessible

---

### Payment `/payment` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 74_payment.png
- Android: 025_payment.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Payment methods load
- [ ] Add payment method works

**Feature checklist:**
- [ ] Payment methods list
- [ ] Add method form
- [ ] Remove method

**UI/UX checks:**
- [ ] Payment method icons
- [ ] Secure badge visible

---

### Post Welcome `/post-welcome` <sub>[P2]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 18_post-welcome.png
- Android: 012_post-welcome.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Welcome screen loads after first post creation

**Feature checklist:**
- [ ] Success illustration
- [ ] Go to My Posts CTA

**UI/UX checks:**
- [ ] Celebratory, full-screen layout

---

## VERIFICATION

### Verification Hub `/verification` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 7/10 | ⚠ Acceptable |
| Features      | 6/10 | ⚠ Needs Work |
| UI/UX Design  | 6/10 | ⚠ Needs Work |
| **Overall**   | **6.3/10** | **⚠ Needs Work** |

**Screenshots:**
- Web: 54_verification.png
- Android: 039_verification.png

**Assessment:**
- ✅ Both captured — significant content difference (different page state?)

**Functionality checks:**
- [ ] Verification options shown (Email, Phone, Aadhaar, PAN)
- [ ] Each option links to respective flow

**Feature checklist:**
- [ ] Status badges per verification type
- [ ] Action buttons to start/re-verify

**UI/UX checks:**
- [ ] Status color coding (green verified, yellow pending, red unverified)

---

### Aadhaar Verification `/aadhaar-verify` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 5/10 | ⚠ Needs Work |
| Features      | 5/10 | ⚠ Needs Work |
| UI/UX Design  | 4/10 | ❌ Critical Gap |
| **Overall**   | **4.7/10** | **❌ Critical Gap** |

**Screenshots:**
- Web: 34_aadhaar-verify.png
- Android: ❌ Not found

**Assessment:**
- ⚠ Android screenshot missing or blank
- ✅ Web screenshot available — partial evaluation only

**Functionality checks:**
- [ ] XML file upload works
- [ ] Aadhaar verification submits successfully

**Feature checklist:**
- [ ] File picker for XML
- [ ] Last-4 digits input
- [ ] Submit button
- [ ] Privacy notes

**UI/UX checks:**
- [ ] Privacy notice clearly visible
- [ ] File upload area large enough to tap

---

### KYC `/kyc` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 2/10 | ❌ Critical Gap |
| Features      | 2/10 | ❌ Critical Gap |
| UI/UX Design  | 1/10 | ❌ Critical Gap |
| **Overall**   | **1.7/10** | **❌ Critical Gap** |

**Screenshots:**
- Web: 73_kyc.png
- Android: 040_kyc.png

**Assessment:**
- ⚠ Android screenshot missing or blank
- ✅ Web screenshot available — partial evaluation only
- ⚠ Android screenshot is 22KB — likely blank/loading state

**Functionality checks:**
- [ ] PAN + Aadhaar fields accept input
- [ ] Submit starts KYC flow

**Feature checklist:**
- [ ] Aadhaar number field
- [ ] PAN field
- [ ] Document upload
- [ ] Submit button

**UI/UX checks:**
- [ ] Fields clearly labeled with limits

---

## SOCIAL

### Notifications `/notifications` <sub>[P0]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 36_notifications.png
- Android: 031_notifications.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Notification list loads
- [ ] Mark as read updates UI
- [ ] Mark all read works
- [ ] Tap navigates to relevant content

**Feature checklist:**
- [ ] Notification list with timestamps
- [ ] Read/unread visual distinction (bold/dot)
- [ ] Mark all read button
- [ ] Empty state

**UI/UX checks:**
- [ ] Unread notifications have accent color dot
- [ ] Pull to refresh
- [ ] Timestamps relative (2m ago)

---

### Chat `/chat` <sub>[P0]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 56_chat.png
- Android: 030_chat.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Conversation list loads
- [ ] Open conversation shows message history
- [ ] Send message works
- [ ] Real-time receive works

**Feature checklist:**
- [ ] Conversation list with avatar + last message + time
- [ ] Unread badge count
- [ ] Message thread view with bubbles
- [ ] Message input + Send button
- [ ] Back navigation

**UI/UX checks:**
- [ ] Messages scroll to bottom on open
- [ ] Keyboard pushes input bar above (Android WindowSoftInput)
- [ ] Sent messages right-aligned, received left
- [ ] Timestamps per message or grouped

---

### Community Feed `/feed` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 7/10 | ⚠ Acceptable |
| Features      | 6/10 | ⚠ Needs Work |
| UI/UX Design  | 6/10 | ⚠ Needs Work |
| **Overall**   | **6.3/10** | **⚠ Needs Work** |

**Screenshots:**
- Web: 38_feedback.png
- Android: 026_feed.png

**Assessment:**
- ✅ Both captured — significant content difference (different page state?)

**Functionality checks:**
- [ ] Feed posts load
- [ ] Like works
- [ ] Comment works
- [ ] Create post button navigates to /feed/feedpostadd

**Feature checklist:**
- [ ] Feed post cards with author, text, media
- [ ] Like / comment / share buttons
- [ ] Create post FAB
- [ ] Filter tabs (All, Following)

**UI/UX checks:**
- [ ] Post cards full-width
- [ ] Like count updates optimistically
- [ ] Smooth infinite scroll

---

### Public Wall `/public-wall` <sub>[P2]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 9/10 | ✅ Excellent |
| Features      | 9/10 | ✅ Excellent |
| UI/UX Design  | 8/10 | ✅ Good |
| **Overall**   | **8.7/10** | **✅ Good** |

**Screenshots:**
- Web: 35_public-wall.png
- Android: 029_public-wall.png

**Assessment:**
- ✅ Both screenshots captured — visual comparison available

**Functionality checks:**
- [ ] Public posts load
- [ ] Share update works for logged-in users

**Feature checklist:**
- [ ] Post cards
- [ ] Share update input
- [ ] Like/comment actions

**UI/UX checks:**
- [ ] Consistent with Feed page

---

## CHANNELS

### Channels `/channels` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 9/10 | ✅ Excellent |
| Features      | 9/10 | ✅ Excellent |
| UI/UX Design  | 8/10 | ✅ Good |
| **Overall**   | **8.7/10** | **✅ Good** |

**Screenshots:**
- Web: 66_channels.png
- Android: 043_channels.png

**Assessment:**
- ✅ Both screenshots captured — visual comparison available

**Functionality checks:**
- [ ] Channel list loads
- [ ] Follow/unfollow works
- [ ] Navigate to channel

**Feature checklist:**
- [ ] Channel cards with cover + name + follower count
- [ ] Create channel button
- [ ] My channels tab

**UI/UX checks:**
- [ ] Channel cards consistent layout
- [ ] Follow button accessible without scrolling

---

### Create Channel `/channels/create` <sub>[P2]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 9/10 | ✅ Excellent |
| Features      | 9/10 | ✅ Excellent |
| UI/UX Design  | 8/10 | ✅ Good |
| **Overall**   | **8.7/10** | **✅ Good** |

**Screenshots:**
- Web: 67_channels_create.png
- Android: 044_channels_create.png

**Assessment:**
- ✅ Both screenshots captured — visual comparison available

**Functionality checks:**
- [ ] Name + description + category input works
- [ ] Submit creates channel

**Feature checklist:**
- [ ] Channel name field
- [ ] Category picker
- [ ] Description field
- [ ] Cover image picker

**UI/UX checks:**
- [ ] Form full-width
- [ ] Image picker large tap target

---

## REWARDS

### Rewards & Referrals `/rewards` <sub>[P0]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 2/10 | ❌ Critical Gap |
| Features      | 2/10 | ❌ Critical Gap |
| UI/UX Design  | 1/10 | ❌ Critical Gap |
| **Overall**   | **1.7/10** | **❌ Critical Gap** |

**Screenshots:**
- Web: 39_rewards.png
- Android: 041_rewards.png

**Assessment:**
- ⚠ Android screenshot missing or blank
- ✅ Web screenshot available — partial evaluation only
- ⚠ Android screenshot is 25KB — likely blank/loading state

**Functionality checks:**
- [ ] Coin balance loads
- [ ] Daily check-in works (claim button)
- [ ] Referral code visible and copyable
- [ ] Referral link shareable
- [ ] Milestones display correctly
- [ ] Leaderboard loads
- [ ] Redeem section shows available rewards
- [ ] Spin wheel works (if applicable)
- [ ] Scratch card works (if applicable)

**Feature checklist:**
- [ ] Coin balance card
- [ ] Daily check-in with streak calendar
- [ ] Referral code + share button
- [ ] Referral link
- [ ] Milestones / achievement badges
- [ ] Leaderboard tab
- [ ] Earn challenges list
- [ ] Redeem rewards list
- [ ] Reward activity log

**UI/UX checks:**
- [ ] Coin balance prominent at top
- [ ] Streak calendar fits mobile width
- [ ] Share button easy to tap
- [ ] Sections clearly separated (earn vs redeem)
- [ ] Badge icons consistent size

---

## SUPPORT

### Complaints `/complaints` <sub>[P1]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 37_complaints.png
- Android: 032_complaints.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] My complaints list loads
- [ ] New complaint form submits
- [ ] Complaint type selector works

**Feature checklist:**
- [ ] Complaint list with status badge
- [ ] File new complaint button
- [ ] Complaint form (type, description, post ID)
- [ ] Status tracking

**UI/UX checks:**
- [ ] Status badges color-coded
- [ ] Form inputs full-width

---

### Feedback `/feedback` <sub>[P2]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 8/10 | ✅ Good |
| Features      | 7/10 | ⚠ Acceptable |
| UI/UX Design  | 7/10 | ⚠ Acceptable |
| **Overall**   | **7.3/10** | **⚠ Acceptable** |

**Screenshots:**
- Web: 38_feedback.png
- Android: 033_feedback.png

**Assessment:**
- ✅ Both captured — minor content difference detected
- ⚠ File size delta suggests possible layout difference

**Functionality checks:**
- [ ] Feedback form submits successfully

**Feature checklist:**
- [ ] Category selector
- [ ] Rating
- [ ] Description textarea
- [ ] Submit button

**UI/UX checks:**
- [ ] Simple clean form

---

## LEGAL

### Terms & Conditions `/terms` <sub>[P2]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 9/10 | ✅ Excellent |
| Features      | 9/10 | ✅ Excellent |
| UI/UX Design  | 8/10 | ✅ Good |
| **Overall**   | **8.7/10** | **✅ Good** |

**Screenshots:**
- Web: 59_terms.png
- Android: 047_terms-and-conditions.png

**Assessment:**
- ✅ Both screenshots captured — visual comparison available

**Functionality checks:**
- [ ] Page loads and renders
- [ ] Back button works

**Feature checklist:**
- [ ] Full text content
- [ ] Scrollable

**UI/UX checks:**
- [ ] Readable typography
- [ ] Consistent header/footer

---

### Privacy Policy `/privacy-policy` <sub>[P2]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 9/10 | ✅ Excellent |
| Features      | 9/10 | ✅ Excellent |
| UI/UX Design  | 8/10 | ✅ Good |
| **Overall**   | **8.7/10** | **✅ Good** |

**Screenshots:**
- Web: 61_privacy-policy.png
- Android: 048_privacy-policy.png

**Assessment:**
- ✅ Both screenshots captured — visual comparison available

**Functionality checks:**
- [ ] Page loads
- [ ] Content visible

**Feature checklist:**
- [ ] Full policy text
- [ ] Section anchors

**UI/UX checks:**
- [ ] Readable, mobile-optimized text width

---

### Refund Policy `/refund-policy` <sub>[P2]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 9/10 | ✅ Excellent |
| Features      | 9/10 | ✅ Excellent |
| UI/UX Design  | 8/10 | ✅ Good |
| **Overall**   | **8.7/10** | **✅ Good** |

**Screenshots:**
- Web: 62_refund-policy.png
- Android: 049_refund-policy.png

**Assessment:**
- ✅ Both screenshots captured — visual comparison available

**Functionality checks:**
- [ ] Page loads

**Feature checklist:**
- [ ] Refund policy text

**UI/UX checks:**
- [ ] Readable typography

---

### Support Ticket Policy `/support-ticket-policy` <sub>[P2]</sub>

| Axis | Score | Status |
|---|---:|:---|
| Functionality | 9/10 | ✅ Excellent |
| Features      | 9/10 | ✅ Excellent |
| UI/UX Design  | 8/10 | ✅ Good |
| **Overall**   | **8.7/10** | **✅ Good** |

**Screenshots:**
- Web: 63_support-ticket-policy.png
- Android: 050_support-ticket-policy.png

**Assessment:**
- ✅ Both screenshots captured — visual comparison available

**Functionality checks:**
- [ ] Page loads

**Feature checklist:**
- [ ] Policy text

**UI/UX checks:**
- [ ] Readable typography

---
