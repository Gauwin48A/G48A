# MHub Web App — Definitive Navigation Structure
> Source of Truth extracted LIVE from http://localhost:8081/ on 2026-05-19
> Logged in with demo credentials: 9999999999 / Test@12345

---

## BOTTOM NAVBAR (8 Tabs — VERIFIED LIVE)
**Source:** Live extraction from `.mhub-bottom-nav`

| # | Tab | Style | Route |
|---|-----|-------|-------|
| 1 | Home | normal | `/category-hub` |
| 2 | All Posts | normal | `/all-posts` |
| 3 | For You | normal | `/for-you` |
| 4 | +Sell | FAB (centered, elevated) | `/post-welcome` |
| 5 | Feed | normal | `/feed` |
| 6 | Rewards | normal | `/rewards` |
| 7 | Profile | normal | `/profile` |
| 8 | More | normal | Opens drawer |

**CRITICAL:** 8 tabs, NOT 6. The "+Sell" is a FAB (Floating Action Button) style.
**Hidden on:** Login, signup, auth pages

---

## TOP NAVBAR / HEADER (VERIFIED LIVE on /all-posts)

**Elements (Left → Right):**
1. **"Home" link** (logo)
2. **Location badge** — "Hyderabad" with "Approximate (IP)" subtitle
3. **Search bar** — "Search for products, brands and more"
4. **Filter button**
5. **+Sell button**
6. **Notifications icon**
7. **Wishlist icon**
8. **Cart icon** (with item count badge)
9. **Recently Viewed icon**
10. **Language selector** — "English"
11. **Theme mode** — Light Mode / System / Dark Mode
12. **Desktop** toggle

---

## HAMBURGER / MORE MENU (VERIFIED LIVE)

### TRADE Group
1. Sell
2. Select Plan
3. Centre Page
4. All Categories
5. Category mode
6. Subcategories
7. Nearby
8. Saved Searches
9. Wishlist
10. Recently Viewed
11. Cart
12. Compare

### SOCIAL Group
1. Feed
2. Public Wall
3. Chat
4. My Reviews
5. My Offers
6. Feedback
7. Complaints

### ACCOUNT Group
1. Profile
2. Rewards
3. Notifications
4. Verification
5. Dashboard
6. Security
7. Delete Account
8. Admin Panel (Admin badge)

### Bottom Sections:
- Theme mode (Light Mode / System / Dark Mode)
- Logout button

---

## HOME PAGE (`/category-hub`)
**File:** `client/src/pages/CategoryHub.jsx`

2×2 grid of category app tiles:

| # | Category | Theme | Tagline |
|---|----------|-------|---------|
| 1 | Electronics 📱 | Blue | Phones, laptops & gadgets |
| 2 | Fashion 👗 | Pink | Clothing, shoes & accessories |
| 3 | Vehicles 🚗 | Green | Cars, bikes & spare parts |
| 4 | Others ✨ | Purple | Home, services, jobs & more |

Each tile shows: stats, description, "Enter" CTA, 3D hover effect.
Clicking enters "Category Mode" — filters all navigation.

---

## ALL ROUTES

### Public (No login required)
- `/` → redirects to `/category-hub`
- `/login`, `/signup`, `/forgot-password`, `/reset-password/:token`
- `/category-hub` — HOME
- `/all-posts` — Browse listings
- `/post/:id` — Post detail
- `/for-you` — Personalized feed
- `/feed`, `/feed/:id` — Social feed
- `/public-wall` — Public wall
- `/search` — Search
- `/channels`, `/channels/:id` — Channels
- `/t&c`, `/terms`, `/privacy-policy`, `/refund-policy`, `/support-ticket-policy`
- `/reviews/:userId` — User reviews

### Auth Required
- **Seller:** `/add-post`, `/edit-post/:postId`, `/sold-posts`, `/dashboard`, `/analytics`, `/tier-selection`
- **Buyer:** `/bought-posts`, `/cart`, `/wishlist`, `/nearby`, `/recently-viewed`, `/saved-searches`
- **Account:** `/profile`, `/notifications`, `/rewards`, `/verification`, `/security`, `/account/delete`
- **Chat:** `/chat`
- **Transactions:** `/offers`, `/saledone`, `/saleundone`, `/payment`, `/kyc`
- **Centres:** `/centre`, `/centre/create`, `/centre/:id`

### Admin Only
- `/admin-panel`

---

## AUTH BEHAVIOR

| Scenario | Behavior |
|----------|----------|
| Guest clicks auth-required bottom nav | Toast: "Login required" |
| Guest navigates to auth-required route | Redirect to `/login` with returnTo |
| Auth-required More menu items | Lock badge + "Login" text |
| For You page (guest) | Shows login prompt for preferences |

---

## CATEGORY FLOW
```
Home (/category-hub)
→ Select Category tile (e.g. Electronics)
→ Enters "Category Mode"
→ All Posts filtered to that category
→ Top navbar shows search + filters
→ Bottom navbar shows (6 tabs)
→ Cart badge filtered by active category
```

---

## SCREENSHOTS CAPTURED (49 images — all from LIVE web app, logged in)

All screenshots taken at mobile viewport (412×915, Pixel 7) on 2026-05-19:

| # | File | Page/Route |
|---|------|-----------|
| 01 | 01-login-page.png | /login |
| 02 | 02-home-category-hub.png | /category-hub (HOME) |
| 03 | 03-all-posts.png | /all-posts |
| 04 | 04-for-you.png | /for-you |
| 05 | 05-feed.png | /feed |
| 06 | 06-search.png | /search |
| 07 | 07-sell-post-welcome.png | /post-welcome |
| 08 | 08-add-post.png | /add-post |
| 09 | 09-sold-posts.png | /sold-posts |
| 10 | 10-saledone.png | /saledone |
| 11 | 11-saleundone.png | /saleundone |
| 12 | 12-dashboard.png | /dashboard |
| 13 | 13-analytics.png | /analytics |
| 14 | 14-bought-posts.png | /bought-posts |
| 15 | 15-wishlist.png | /wishlist |
| 16 | 16-cart.png | /cart |
| 17 | 17-compare.png | /compare |
| 18 | 18-recently-viewed.png | /recently-viewed |
| 19 | 19-saved-searches.png | /saved-searches |
| 20 | 20-nearby.png | /nearby |
| 21 | 21-profile.png | /profile |
| 22 | 22-notifications.png | /notifications |
| 23 | 23-rewards.png | /rewards |
| 24 | 24-verification.png | /verification |
| 25 | 25-security.png | /security |
| 26 | 26-public-wall.png | /public-wall |
| 27 | 27-chat.png | /chat |
| 28 | 28-channels.png | /channels |
| 29 | 29-offers.png | /offers |
| 30 | 30-reviews.png | /reviews |
| 31 | 31-feedback.png | /feedback |
| 32 | 32-complaints.png | /complaints |
| 33 | 33-tier-selection-plans.png | /tier-selection (Plans) |
| 34 | 34-pricing.png | /pricing |
| 35 | 35-centre.png | /centre |
| 36 | 36-subcategories.png | /subcategories |
| 37 | 37-category-mode.png | /category-mode |
| 38 | 38-terms.png | /terms |
| 39 | 39-privacy-policy.png | /privacy-policy |
| 40 | 40-refund-policy.png | /refund-policy |
| 41 | 41-invite.png | /invite |
| 42 | 42-signup.png | /signup |
| 43 | 43-forgot-password.png | /forgot-password |
| 44 | 44-hamburger-menu-open.png | More menu (open) |
| 45-49 | 45-49-nav-*.png | Bottom nav active states |
