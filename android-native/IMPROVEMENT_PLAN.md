# MHub Android — Comprehensive Improvement Plan

## Problem Analysis & Solutions

### 1. CATEGORY NAVIGATION FLOW (Critical)

**Current Issues:**
- Opening a category navigates to CategoryHomeScreen but bottom nav shows ALL_POSTS (from previous fix) — should show HOME since user is in the category HOME page
- CategoryAppShell has its own CategoryTopBar BUT outer MainShell has showTopBar=false, so we get CategoryTopBar but no MhubTopBar — need to decide which is correct
- Going to profile inside category, backing out, re-entering category was staying on profile — **FIXED** in previous round (always reset to HOME tab)
- The CategoryAppShell inner NavHost starts at `categoryHome` which is the category browse page, NOT the all-posts/product listing page
- **Web behavior**: Entering a category → shows all posts (product listings) with filters, subcategory chips, banners. The "home" of a category IS the all-posts/listing page

**Root Cause:** The Android app has CategoryHomeScreen (banners, subcategory cards, deals) as the starting point, but the web app shows AllPosts (product grid with filters) as the starting point.

**Solution:**
- Change CategoryAppShell startDestination from `categoryHome` to `categoryListing` (ProductListingScreen)
- This makes entering a category immediately show the product listing with filters (matching web)
- CategoryHomeScreen stays accessible via the drawer or navigation
- Keep the CategoryTopBar (category-specific context bar)
- The outer MainShell bottom nav should NOT show when inside a category — the category has its own nav context
- Actually based on web: the bottom nav SHOULD show (Home, All Posts, Sell, Chat, Profile, More) — the category app doesn't have separate bottom tabs in the web. Instead, clicking a category from Home takes you to the category-specific all-posts page which still has the main bottom nav

**Revised Architecture (matching web):**
- CategoryAppShell should NOT have its own 5-tab bottom nav at all when useExternalBottomNav=true
- The outer MainShell provides the 6-tab bottom nav (Home, All Posts, Sell, Chat, Profile, More) 
- ALL_POSTS tab in bottom nav should highlight when inside a category
- CategoryTopBar shows category name + search + cart + back-to-launcher
- startDestination should be ProductListingScreen (all products for that category)

### 2. LANGUAGE SWITCHING (Medium)

**Current Issue:** `AppCompatDelegate.setApplicationLocales()` is called but most UI strings are hardcoded in Composables, not using `stringResource()`.

**Web Behavior:** Uses i18next — ALL strings go through `t('key')` translation function. Changing language instantly updates everything.

**Solution:**
- The proper fix requires refactoring all hardcoded strings to use `stringResource(R.string.xxx)` and adding translations for all 25 languages
- For now: Add string resources for the most visible UI strings (nav labels, screen titles, common buttons) in ALL supported languages
- Add Hindi, Telugu, Tamil translations for key navigation and screen title strings
- Ensure AppCompatDelegate.setApplicationLocales works by verifying the Activity recreates properly

### 3. ALL-POSTS PAGE — QUICK FILTERS & BANNERS (High)

**Current Issue:** ProductListingScreen has filter drawer (price, brand, rating, stock) and sort — but missing:
- Quick filter chips at top (horizontal scrollable)
- Hero/promotional banners at top
- Shop by subcategory row (horizontal chips)
- The page title says "All Products" but needs category context

**Web Behavior:** AllPosts.jsx has:
- Horizontal category bar (quick filter chips)
- Quick filters dropdown (category, subcategory, price, date range, condition, verified, sort)
- Great deals promotional banner
- Infinite scroll post grid

**Solution:**
- Add subcategory filter chips row at top of ProductListingScreen
- Add a hero banner section (collapsible) 
- Add quick filter row (condition: New/Used, Verified, Sort)
- These should be above the product grid in the LazyVerticalGrid

### 4. PROFILE PAGE HERO BANNER (Medium)

**Current State (after previous fix):**
- Cover image: 80dp height
- Hero section: 8dp top, 16dp bottom padding
- Avatar: 64dp
- Name: titleMedium
- Glassmorphism card: 14dp padding

**Still Issues:**
- The combined cover + hero + glassmorphism card with avatar, name, handle, social links, followers/following is still too tall
- Need more compact mobile layout

**Solution:**
- Reduce cover to 60dp
- Make hero section horizontal layout: avatar LEFT, info RIGHT (instead of centered vertical stack)
- Remove the glassmorphism card entirely — just lay out content directly in the gradient
- Followers/Following as a compact row under the name
- Social links as small icons inline

### 5. REWARDS PAGE (Medium)

**Current State:** 4-tab ScrollableTabRow (Dashboard, Earn, Referrals, Activity) with:
- Compact hero banner on Dashboard tab
- Tier progression carousel
- Impact dashboard 2x2 grid
- Coin balance card

**Issues:**
- Still takes up too much vertical space for mobile
- Daily code input was removed from hero but should still be accessible somewhere
- Need better spacing and card sizing for mobile

**Solution:**
- Move daily code claim to the Earn tab (alongside check-in, spin, scratch)
- Make tier carousel cards smaller (fixed width ~140dp instead of wrapping)
- Reduce spacing between sections (8dp instead of 10dp)
- Impact dashboard: Use smaller ImpactCard with labelSmall text

### 6. SELL/PLANS PAGES (Medium)

**Current Issue:** PostWelcomeScreen and TierSelectionScreen exist but UI doesn't match web quality.

**Web Behavior:**
- PostWelcome: Shows current plan, post credits, popular categories, CMS content
- TierSelection: 4 gradient cards (Basic ₹500, Bronze ₹850, Silver ₹1200, Premium ₹1500) with feature checklist, free trial badges, FAQ

**Solution:** Read current PostWelcomeScreen and TierSelectionScreen, compare with web, and improve layout/content.

### 7. HAMBURGER MENU PAGES (Low-Medium)

**Current State:** MoreScreen has 3 color-coded groups with many entries. Each entry navigates to the correct route. Most pages exist as composables.

**Issue:** Many pages may have minimal/placeholder content.

**Solution:** Audit each page for functionality. Priority pages: Feed, ForYou, Dashboard, Analytics, Orders, Reviews.

### 8. FEED & FOR-YOU PAGES (Already Exist)

**Current State:** Both ForYouScreen.kt and FeedScreen.kt exist with proper ViewModels, API integration, and UI.

**Issue:** They may not be easily accessible from the category flow.

**Solution:** Ensure Feed and ForYou are accessible from:
- The hamburger menu (already connected)
- Quick links within the category app
- The category home page

## Implementation Priority

1. **Category Navigation Flow** — Most impactful UX fix
2. **ProductListingScreen enhancements** — Quick filters, subcategory chips, banners  
3. **Profile hero compaction** — Mobile UX
4. **Rewards restructuring** — Mobile UX
5. **Language switching** — Add more string resources
6. **Sell/Plans UI** — Match web quality
7. **Feed/ForYou accessibility** — Already exist, just need better navigation
