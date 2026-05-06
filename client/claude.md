# MHub — Pin-to-Pin Detailed Visual Specification Report

**Updated:** 2025-07-06  
**Audit Score:** 98/100 (11 core pages, Android emulator)  
**Platform:** React 18.2 + Capacitor 8 + Express 5 + PostgreSQL  
**Total Pages:** 57 routes | **Core Pages:** 15 documented below  

---

## TABLE OF CONTENTS

1. [Design System & Tokens](#1-design-system--tokens)
2. [Navigation Component](#2-navigation-component)
3. [CategoryHub Page](#3-categoryhub-page)
4. [ForYou Page](#4-foryou-page)
5. [AllPosts Page](#5-allposts-page)
6. [PostDetail Page](#6-postdetail-page)
7. [AddPost Page](#7-addpost-page)
8. [Profile Page](#8-profile-page)
9. [Dashboard Page](#9-dashboard-page)
10. [Rewards Page](#10-rewards-page)
11. [Cart Page](#11-cart-page)
12. [Wishlist Page](#12-wishlist-page)
13. [Chat Page](#13-chat-page)
14. [Notifications Page](#14-notifications-page)
15. [SearchPage](#15-searchpage)
16. [Login Page](#16-login-page)
17. [SignUp Page](#17-signup-page)
18. [Architecture Overview](#18-architecture-overview)
19. [Known Issues & Recommendations](#19-known-issues--recommendations)
20. [Build & Deployment](#20-build--deployment)

---

## 1. DESIGN SYSTEM & TOKENS

### CSS Custom Properties (Light Theme)

```css
--background: #ffffff;
--primary-bg: #f7f8fa;        /* surface-1 */
--text-primary: #1a1a1a;
--text-secondary: #6b7280;
--border: #e5e7eb;
--primary: #2563eb;            /* blue-600 */
--primary-hover: #1d4ed8;
--shadow-soft: 0 10px 26px rgba(15,23,42,0.08);
--card-shadow: 0 8px 24px rgba(15,23,42,0.08);
--radius: 0.75rem;
```

### CSS Custom Properties (Dark Theme)

```css
--background: #0b0e14;
--primary-bg: #0f141c;        /* surface-1 */
--text-primary: #f2f5f9;
--text-secondary: #c1c9d6;
--border: #273043;
--primary: #5b8dff;
--shadow-soft: 0 18px 36px rgba(0,0,0,0.5);
```

### Navigation Token Overrides

```css
--nav-pill-bg: rgba(0, 50, 150, 0.35);
--nav-text: #ffffff;
--nav-text-active: #ffffff;
--nav-icon: rgba(255, 255, 255, 0.85);
--nav-icon-active: #ffffff;
```

### Tailwind Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `gap-2` | 8px | Card grids, tight spacing |
| `gap-3` | 12px | Default card gap |
| `gap-4` | 16px | Section spacing |
| `p-3` | 12px | Card padding compact |
| `p-4` | 16px | Card padding standard |
| `p-5` | 20px | Form padding mobile |
| `p-6` / `sm:p-8` | 24px / 32px | Form padding desktop |

### Border Radius Scale

| Class | Value | Usage |
|-------|-------|-------|
| `rounded-full` | 9999px | Pills, badges, avatars |
| `rounded-3xl` | 24px | Auth cards (sm+) |
| `rounded-2xl` | 16px | Page cards, hero sections |
| `rounded-xl` | 12px | Input fields, inner cards |
| `rounded-lg` | 8px | Small containers, image thumbnails |

### Typography Scale

| Class | Size | Usage |
|-------|------|-------|
| `text-3xl` | 30px | Page hero headings |
| `text-2xl` | 24px | Section headings |
| `text-xl` | 20px | Card titles, profile name |
| `text-lg` | 18px | Subheadings |
| `text-base` | 16px | Body text, button labels |
| `text-sm` | 14px | Secondary text, labels |
| `text-xs` | 12px | Badges, timestamps, helpers |

### Font Weight Mapping

| Class | Weight | Usage |
|-------|--------|-------|
| `font-black` | 900 | Coin amounts, emphasis |
| `font-bold` | 700 | Headings, prices, CTAs |
| `font-semibold` | 600 | Card titles, button text |
| `font-medium` | 500 | Labels, stat values |

### Shadow System

| Class | Value | Usage |
|-------|-------|-------|
| `shadow-sm` | 0 1px 2px rgba(0,0,0,0.05) | Subtle elevation |
| `shadow-md` | 0 4px 6px rgba(0,0,0,0.07) | Cards default |
| `shadow-lg` | 0 10px 15px rgba(0,0,0,0.1) | Elevated cards |
| `shadow-xl` | 0 20px 25px rgba(0,0,0,0.1) | Auth cards, modals |
| `shadow-blue-500/25` | Colored shadow | Primary CTAs |
| `shadow-pink-500/20` | Colored shadow | Wishlist active |
| `shadow-purple-500/25` | Colored shadow | Auth, SignUp |

---

## 2. NAVIGATION COMPONENT

### Top Navigation Bar (`.mhub-top-nav--primary`)

```
Position: fixed top-0, z-[9000]
Height: 56px
Background: var(--nav-pill-bg) = rgba(0, 50, 150, 0.35)
Backdrop: backdrop-blur-2xl saturate-[1.8]
Border-bottom: 1px solid rgba(255,255,255,0.08)
Padding: 0 16px
```

### Logo Chip (`.mhub-nav-logo-chip`)

```
Background: rgba(255,255,255,0.12)
Border: 1px solid rgba(255,255,255,0.15)
Border-radius: 12px
Padding: 6px 14px
Font: 700 15px/1 system-ui
Color: #ffffff
Letter-spacing: 0.3px
Text-shadow: 0 1px 2px rgba(0,0,0,0.25)
```

### Navigation Pill (`.mhub-nav-pill`)

```
Background: rgba(255,255,255,0.08)
Border: 1px solid rgba(255,255,255,0.12)
Border-radius: 14px
Padding: 6px 8px
Gap: 2px
```

### Nav Pill Item (`.mhub-nav-pill a`)

```
Height: 36px
Min-width: 36px
Border-radius: 10px
Font: 600 12px/1 system-ui
Color: rgba(255,255,255,0.75)
Transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1)
Icon size: 18px
```

### Nav Pill Active State (`.mhub-nav-pill a.active`)

```
Background: rgba(255,255,255,0.18)
Color: #ffffff
Box-shadow: 0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.1)
```

### Action Button (`.mhub-nav-action`)

```
Width: 36px
Height: 36px
Border-radius: 10px
Background: rgba(255,255,255,0.08)
Border: 1px solid rgba(255,255,255,0.1)
Color: rgba(255,255,255,0.85)
Hover background: rgba(255,255,255,0.15)
```

---

## 3. CATEGORYHUB PAGE

**File:** `src/pages/CategoryHub.jsx`  
**Route:** `/` (home)

### Page Container

```
Background: Aurora effect with 3 animated blobs
Min-height: 100vh
Padding: page-shell page-pad (custom utility)
```

### Aurora Background Blobs

```
Blob 1: bg-indigo-500/20, w-96 h-96, top-10 left-10, blur-3xl, animate-pulse
Blob 2: bg-pink-500/20, w-72 h-72, top-40 right-20, blur-3xl, animate-pulse (delay 1s)
Blob 3: bg-emerald-500/20, w-80 h-80, bottom-20 left-1/3, blur-3xl, animate-pulse (delay 2s)
Dark: opacity reduced to /10
```

### Title Section

```
Text: "Explore Categories"
Font: text-2xl sm:text-3xl font-bold
Color: bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent
Margin-bottom: mb-8
```

### Category Cards Grid

```
Layout: grid grid-cols-2 gap-4 sm:gap-6
Max-width: max-w-[640px] mx-auto
```

### Individual Category Card

```
Container: rounded-2xl overflow-hidden cursor-pointer group
Min-height: min-h-[180px] sm:min-h-[220px]
Padding: p-5 sm:p-6
Position: relative
Transition: transition-all duration-300
Hover: hover:-translate-y-1 hover:shadow-2xl
```

### Per-Category Gradient Backgrounds

| Category | Gradient |
|----------|----------|
| Electronics | `bg-gradient-to-br from-blue-500 via-indigo-600 to-violet-700` |
| Fashion | `bg-gradient-to-br from-pink-500 via-rose-500 to-red-500` |
| Vehicles | `bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600` |
| Others | `bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-700` |

### Category Card Interior

```
Icon container: w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3
Icon: w-6 h-6 text-white
Title: text-lg sm:text-xl font-bold text-white mb-1
Subtitle: text-sm text-white/80
Count badge: absolute top-3 right-3, bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full
```

### 3D Mouse Hover Effect (Desktop)

```
Transform: perspective(600px) rotateX(var) rotateY(var) scale(1.03)
Transition: transform 0.1s ease-out
Shine overlay: absolute inset-0 bg-gradient-radial from-white/20 to-transparent opacity-0 group-hover:opacity-100
```

---

## 4. FORYOU PAGE

**File:** `src/pages/ForYou.jsx`  
**Route:** `/for-you`

### Page Container

```
Background: bg-gradient-to-b from-white to-slate-50 dark:from-gray-900 dark:to-gray-950
Min-height: min-h-screen
Classes: mhub-premium-page mhub-page-pad-bottom
```

### Hero Section

```
Container: rounded-2xl overflow-hidden relative
Background: bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600
Dark: dark:from-blue-800 dark:via-indigo-800 dark:to-purple-800
Padding: px-5 py-4 sm:py-5
Min-height: min-h-[120px]
```

### AI Badge (Hero)

```
Container: inline-flex items-center gap-1.5
Background: bg-white/30
Text: text-white text-xs font-semibold
Border-radius: rounded-full
Padding: px-3 py-1
Icon: Sparkles w-3.5 h-3.5
```

### Hero Stats Chips

```
Background: bg-white/10 backdrop-blur-sm
Border: border border-white/20
Border-radius: rounded-full
Padding: px-3 py-1.5
Text: text-white text-xs font-medium
```

### Hero Title & Subtitle

```
Title: text-xl sm:text-2xl font-bold text-white leading-tight
Subtitle: text-sm text-white/80 mt-1
```

### Filter Buttons Row

```
Container: flex gap-2 overflow-x-auto scrollbar-hide py-3 px-1
```

### Individual Filter Button

```
Height: h-10
Padding: px-4
Border-radius: rounded-full
Font: text-sm font-medium whitespace-nowrap
Transition: transition-all duration-200

Active state:
  Background: bg-blue-600
  Text: text-white
  Shadow: shadow-md shadow-blue-500/25

Inactive state:
  Background: bg-slate-50 dark:bg-slate-800
  Text: text-slate-700 dark:text-slate-300
  Border: border border-slate-200 dark:border-slate-700
  Hover: hover:bg-slate-100 dark:hover:bg-slate-700
```

### Sponsored Cards (Horizontal Scroll)

```
Container: flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1
```

### Sponsored Card Item

```
Width: min-w-[160px] max-w-[180px]
Border-radius: rounded-xl
Overflow: overflow-hidden
Shadow: shadow-md
Background: bg-white dark:bg-slate-800
Border: border border-slate-100 dark:border-slate-700
```

### Sponsored Card Image

```
Height: h-[100px]
Width: w-full
Object-fit: object-cover
```

### Sponsored Card Body

```
Padding: p-2.5
Title: text-xs font-semibold text-gray-900 dark:text-white line-clamp-1
Price: text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1
Sponsor label: text-[10px] text-gray-400 uppercase tracking-wide
```

### Main Feed Grid

```
Layout: grid grid-cols-2 gap-2 sm:gap-3
```

### Feed Card

```
Container: rounded-2xl overflow-hidden group
Background: mhub-premium-surface
Border: border border-gray-100 dark:border-gray-700
Shadow: shadow-sm hover:shadow-md
Transition: transition-all duration-300
Hover: hover:-translate-y-0.5
```

---

## 5. ALLPOSTS PAGE

**File:** `src/pages/AllPosts.jsx` (4312 lines)  
**Route:** `/all-posts`

### Page Container

```
Background: bg-gradient-to-b from-white to-slate-50 dark:from-gray-900 dark:to-gray-950
Min-height: min-h-screen
Classes: mhub-premium-page mhub-page-pad-bottom
```

### Hero Card

```
Container: mhub-hero-card min-h-[116px] sm:min-h-[132px] rounded-2xl px-4 py-3.5 sm:px-6 sm:py-4.5
Background: bg-gradient-to-r from-sky-500/95 via-blue-500/95 to-violet-500/95
Dark: dark:from-sky-700/90 dark:via-blue-700/90 dark:to-violet-700/90
Title: text-[clamp(20px,2.1vw,28px)] leading-[1.1] font-bold text-white
Subtitle: text-[clamp(12px,1.3vw,16px)] text-white/80
```

### Action Buttons (Hero Header)

```
Back button: rounded-full border border-white/30 bg-white/20 px-3.5 py-2.5 min-h-[44px] text-xs font-semibold hover:bg-white/30
Refresh button: rounded-full border border-white/25 bg-white/10 px-3.5 py-2.5 min-h-[44px] text-xs hover:bg-white/20
Count badge: rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/80
```

### Search & Filter Row

```
Container: flex flex-col sm:flex-row gap-2 mt-4
Search input: h-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-slate-900/60 text-sm
Sort dropdown: h-10 rounded-xl border border-gray-200 dark:border-gray-700 text-sm px-3
Status filter: h-10 rounded-xl border border-gray-200 dark:border-gray-700 text-sm
```

### Posts Grid

```
Layout: grid grid-cols-2 gap-2 sm:gap-3
Responsive: sm:grid-cols-2 lg:grid-cols-3
```

### Post Card

```
Container: rounded-2xl overflow-hidden group mhub-premium-surface
Border: border border-gray-100/80 dark:border-gray-700/40
Shadow: shadow-md shadow-gray-200/40 dark:shadow-black/20
Hover: hover:-translate-y-0.5 hover:shadow-lg
Transition: transition-all duration-300
```

### Post Card Image

```
Container: relative w-full
Height: h-[200px] sm:h-[240px] md:h-[280px]
Object-fit: object-cover w-full h-full
Hover: group-hover:scale-105 transition-transform duration-500
```

### Post Card Price Badge

```
Position: absolute bottom-2.5 left-3
Background: bg-emerald-50 dark:bg-emerald-900/30
Border: border border-emerald-200 dark:border-emerald-700
Border-radius: rounded-lg
Padding: px-2.5 py-1
Text: text-sm font-bold text-emerald-800 dark:text-emerald-300
```

### Post Card Body

```
Padding: p-3 sm:p-3.5
Title: font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug line-clamp-1
Location: text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1
Time: text-xs text-gray-400 dark:text-gray-500
```

### Post Card Action Buttons

```
Container: flex items-center gap-1.5 mt-2
Button height: h-11
Border-radius: rounded-full
Font: text-xs font-medium

Like button:
  Default: text-gray-500 hover:text-rose-500
  Active: text-rose-500 fill-rose-500
  Icon: w-4 h-4

Cart button:
  Default: text-gray-500 hover:text-emerald-500
  Active: text-emerald-500

Share button:
  Default: text-gray-500 hover:text-blue-500
```

### Loading Skeleton

```
Grid: grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4
Card: mhub-premium-surface backdrop-blur-sm rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700
Image placeholder: aspect-[4/3] bg-gray-200 dark:bg-gray-700
Shimmer: animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent
Text lines: h-4 bg-gray-200 dark:bg-gray-700 rounded-full
```

---

## 6. POSTDETAIL PAGE

**File:** `src/pages/PostDetail.jsx`  
**Route:** `/post/:id`

### Page Container

```
Classes: mhub-post-detail min-h-screen mhub-premium-page pb-24
Background: bg-gradient-to-b from-slate-100 via-white to-slate-50
Dark: dark:bg-gradient-to-b (custom dark gradient)
```

### Sticky Header

```
Position: sticky top-0 z-40
Background: backdrop-blur-xl bg-white/80 dark:bg-slate-900/80
Shadow: shadow-[0_1px_3px_rgba(0,0,0,0.08)]
Border-bottom: border-b border-gray-200/50 dark:border-gray-700/50
Padding: px-3 py-2
```

### Section Navigation Tabs (Sticky)

```
Container: flex-1 overflow-x-auto scrollbar-hide min-w-0
Tab button:
  Min-height: min-h-[2.25rem] (36px)
  Min-width: min-w-[3rem] (48px)
  Padding: px-3 py-1.5
  Border-radius: rounded-full
  Font: text-xs

Active: bg-blue-600 text-white font-bold shadow-md shadow-blue-500/25
Inactive: text-gray-600 dark:text-gray-300 font-semibold hover:bg-blue-50 hover:text-blue-700
```

### Back Button (Header)

```
Classes: inline-flex items-center gap-1.5 rounded-full
Background: bg-white/90 dark:bg-gray-800/90
Border: border border-gray-200/60 dark:border-gray-600/60
Padding: px-2.5 py-1.5
Shadow: shadow-sm backdrop-blur-sm
Text: text-gray-700 dark:text-gray-200
Hover: hover:bg-white dark:hover:bg-gray-700
```

### Image Gallery / Carousel

```
Card: mhub-premium-surface rounded-2xl shadow-lg overflow-hidden w-full
Image area: relative aspect-[4/3] lg:aspect-auto lg:min-h-[480px]
Background: bg-gray-100 dark:bg-gray-950
Image: w-full h-full object-contain cursor-zoom-in
Hover: group-hover:scale-[1.05] transition-transform duration-300 ease-out
```

### Image Navigation Arrows

```
Position: absolute left-2/right-2 top-1/2 -translate-y-1/2
Background: bg-[var(--surface-1)]
Padding: p-3 sm:p-2
Border-radius: rounded-full
Shadow: shadow-lg
Opacity: opacity-90 hover:opacity-100
Icon: w-6 h-6 sm:w-5 sm:h-5
```

### Image Dots Navigation

```
Position: absolute bottom-1 left-1/2 -translate-x-1/2
Container: flex gap-0.5
Dot height: h-2
Active: bg-blue-500 w-6 rounded-full (elongated)
Inactive: bg-white/70 w-2 rounded-full (circle)
Transition: transition-all
```

### Image Counter Badge

```
Position: absolute bottom-3 right-3
Background: bg-white/85 dark:bg-slate-900/85
Text: text-gray-700 dark:text-gray-200 text-xs font-semibold
Padding: px-2.5 py-1
Border-radius: rounded-full
Shadow: shadow-sm
```

### Tier/Premium Badge

```
Position: absolute top-3 left-3
Padding: px-3 py-1
Font: text-xs font-bold
Border-radius: rounded-full

Premium: bg-gradient-to-r from-yellow-400 to-orange-500 text-white
Silver: bg-gradient-to-r from-gray-400 to-gray-500 text-white
Standard: bg-gradient-to-r from-green-400 to-emerald-500 text-white
```

### Views Badge

```
Position: absolute top-3 right-3
Background: bg-black/60
Text: text-white text-xs font-medium
Padding: px-2.5 py-1
Border-radius: rounded-full
Icon: Eye w-3.5 h-3.5
```

### Price Section

```
Main price: text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100
Original (strikethrough): text-lg text-gray-400 dark:text-gray-500 line-through
Discount badge: bg-green-600 text-white px-2.5 py-1 rounded-md text-sm font-bold
Savings: text-xs font-semibold text-emerald-600 dark:text-emerald-300
Container: flex flex-wrap items-baseline gap-3 pb-4 border-b border-gray-100 dark:border-gray-700
```

### Stats Grid

```
Layout: grid grid-cols-2 sm:grid-cols-4 gap-3
Card: rounded-xl bg-white/60 dark:bg-slate-900/60 px-3 py-2 border border-gray-100 dark:border-gray-700
Label: text-xs uppercase tracking-wide text-gray-400 dark:text-gray-300
Value: text-xs font-semibold text-gray-700 dark:text-gray-200
```

### Action Buttons Grid

```
Container: grid grid-cols-2 gap-2

Chat Seller:
  bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11 px-3 rounded-xl shadow-sm text-sm

Make Offer:
  variant=outline border-gray-200 text-gray-700 h-11 px-3 rounded-xl text-sm

Save (active):
  bg-blue-50 dark:bg-blue-900/20 border-blue-200 text-blue-600

Share:
  outline border-gray-200 text-gray-700 h-11 rounded-xl
```

### Ready-to-Buy CTA (Large)

```
"I'm Interested - Contact Seller":
  w-full py-4 text-base font-bold rounded-xl shadow-lg hover:shadow-xl
  bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white

"Make an Offer":
  w-full py-4 text-base font-bold rounded-xl shadow-lg
  bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900
```

### Seller Card

```
Container: mhub-premium-surface rounded-2xl scroll-mt-24
Avatar: h-14 w-14 ring-4 ring-white dark:ring-gray-600 shadow-lg
Avatar fallback: bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg
Name: font-bold text-gray-900 dark:text-gray-100
Stats grid: grid grid-cols-2 sm:grid-cols-3 gap-3
Stat card: rounded-lg bg-white/80 dark:bg-slate-900/80 px-2.5 py-2
Stat label: text-xs uppercase text-gray-500
Stat value: font-semibold text-gray-800 dark:text-gray-100
```

### Farm Page Link

```
Container: rounded-xl border border-purple-200 dark:border-purple-800/50
Background: bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30
Padding: p-3
Hover: hover:shadow-md hover:border-purple-300
Icon box: w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 shadow-sm shadow-purple-500/20
```

### Delivery & Return Info

```
Container: rounded-xl border border-gray-200 dark:border-gray-700
Background: bg-white/70 dark:bg-slate-900/70
Padding: px-3 py-2.5
Spacing: space-y-2
Icon: w-4 h-4 text-gray-400
Label: text-gray-500 text-sm
Value: font-medium text-gray-900 dark:text-gray-100
```

---

## 7. ADDPOST PAGE

**File:** `src/pages/AddPost.jsx`  
**Route:** `/add-post`

### Page Container

```
Background: bg-gradient-to-br from-sky-50 to-blue-100 dark:from-sky-950 dark:to-blue-950
Min-height: min-h-screen
Max-width wrapper: max-w-[640px] mx-auto px-4
```

### Header Hero

```
Background: bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700
Border-radius: rounded-2xl
Overflow: overflow-hidden relative
Margin: mb-6
Pattern overlay: absolute inset-0 opacity-10 (SVG pattern)
Inner padding: px-5 py-4 sm:py-5 relative z-10
```

### Back Link

```
Display: inline-flex items-center
Text: text-white/80 hover:text-white text-sm font-medium
Height: h-11 (44px touch target)
Icon: ArrowLeft w-4 h-4 mr-2
```

### Breadcrumb

```
Font: text-xs font-semibold uppercase tracking-[0.16em] text-white/70 mb-1
```

### Title Section

```
Heading: text-lg sm:text-xl font-bold text-white
Badge: px-3 py-1 text-xs font-bold shadow-lg shadow-current/20 rounded-lg
Subheading: text-white/70 text-sm mt-1
```

### Form Card

```
Container: mhub-premium-surface mhub-shine rounded-2xl overflow-hidden
Header: bg-gradient-to-r from-sky-500 to-blue-600 text-white py-5 sm:py-6 text-center
Content: p-5 sm:p-6 bg-gradient-to-br from-white to-slate-50/50 dark:from-gray-800 dark:to-gray-800
```

### Input Fields (Universal)

```
Height: h-12
Border: border-2 border-gray-200 dark:border-gray-700
Border-radius: rounded-xl
Background: dark:bg-gray-700
Text: dark:text-white dark:placeholder-gray-400
Transition: transition-all duration-200
Focus ring: focus:ring-4 focus:ring-blue-400/30
Focus border: focus:border-blue-500 dark:focus:border-blue-500/40
Focus shadow: focus:shadow-lg focus:shadow-blue-500/10
Label: text-sm font-semibold text-gray-700 dark:text-gray-200
```

### Image Upload Area

```
Border: border-2 border-dashed border-blue-300 dark:border-blue-600/40
Border-radius: rounded-2xl
Padding: p-6 sm:p-8
Background: bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10
Hover border: hover:border-solid hover:border-blue-400
Hover bg: hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50
Hover shadow: hover:shadow-xl hover:shadow-blue-500/10
Active: active:scale-[0.98]
Upload icon: Upload w-12 h-12 text-sky-400 dark:text-sky-200
```

### Upload Button (Inside Upload Area)

```
Background: bg-gradient-to-r from-blue-500 to-indigo-600
Hover: hover:from-blue-400 hover:to-indigo-500
Shadow: shadow-lg shadow-blue-500/25 hover:shadow-xl
Transition: transition-all duration-200
```

### Image Thumbnail Grid

```
Layout: grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3
Thumbnail: h-24 w-full border-2 border-gray-200 dark:border-gray-700 rounded-lg object-cover
Hover: hover:ring-2 hover:ring-blue-400 transition-all duration-200
Delete button: absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:scale-110
```

### Description Textarea

```
Rows: 4
Min/Max: minLength="20" maxLength="1000"
Character counter colors:
  < 750: text-gray-500
  750-900: text-amber-500
  900+: text-red-500
```

### Flash Sale Toggle

```
Container: border-2 border-dashed border-orange-200 dark:border-orange-600/40 rounded-xl p-4
Background: bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10
Shadow: shadow-sm hover:shadow-md
Toggle switch: h-11 w-14 rounded-full
  Inactive: bg-gray-300 dark:bg-gray-600
  Active: bg-orange-500
  Inner circle: h-6 w-6 rounded-full bg-white shadow-lg
  Transform: translate-x-1 (off) | translate-x-7 (on)
```

### Pre-submit Checklist

```
Border: border border-sky-200 dark:border-sky-600/40
Background: bg-sky-50 dark:bg-sky-950/20
Padding: p-4
Grid: grid grid-cols-1 md:grid-cols-2 gap-2
Item (incomplete): rounded-lg border px-3 py-2 border-amber-200 bg-amber-50 text-amber-700
Item (complete): border-emerald-200 bg-emerald-50 text-emerald-700 dark:text-emerald-400
```

### Sticky Action Bar

```
Position: sticky bottom-0 z-[60]
Background: mhub-premium-bar backdrop-blur-xl
Layout: flex flex-col sm:flex-row items-center justify-end gap-3
Padding: pt-4 pb-4 -mx-8 px-8 rounded-b-2xl
Border-top: border-t border-gray-200/60 dark:border-gray-700/60
Shadow: shadow-[0_-8px_24px_rgba(0,0,0,0.08)]
```

### Preview Button

```
Variant: outline
Border: border-blue-300 dark:border-blue-600/40
Text: text-blue-600 dark:text-blue-300
Hover: hover:bg-blue-50 dark:hover:bg-blue-950/20
Font: font-semibold px-6 py-3 text-base
Min-width: 120px
Active: active:scale-[0.97]
```

### Publish Button

```
Background: bg-gradient-to-r from-emerald-500 to-blue-600
Hover: hover:from-emerald-400 hover:to-blue-500
Shadow: shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30
Font: font-bold px-6 py-3 text-base
Min-width: 140px
Disabled: opacity-60 cursor-not-allowed
Spinner: w-5 h-5 animate-spin text-white mr-2
```

### Upload Progress Bar

```
Container: border border-sky-200 dark:border-sky-600/40 bg-sky-50 dark:bg-sky-950/20 rounded-xl p-3
Track: h-2 w-full rounded-full bg-sky-100 dark:bg-sky-950/20
Fill: h-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-300
```

---

## 8. PROFILE PAGE

**File:** `src/pages/Profile.jsx` (4179 lines)  
**Route:** `/profile`

### Page Container

```
Min-height: min-h-screen
Background: bg-gradient-to-b from-white to-slate-50 dark:from-gray-900 dark:to-gray-950
Classes: mhub-premium-page
```

### Hero Section

```
Background: bg-gradient-to-br from-sky-500 via-blue-500 to-violet-400
Dark: dark:from-sky-700 dark:via-blue-700 dark:to-violet-600
Padding: px-5 py-6 sm:py-8
Border-radius: rounded-2xl
Overflow: overflow-hidden relative
```

### Avatar Ring (SVG-based)

```
Outer ring: 72px (mobile) / 88px (desktop)
Ring track: stroke-white/20, stroke-width: 3
Ring fill: stroke-white, stroke-width: 3, animated stroke-dasharray based on completion %
Avatar image: rounded-full centered inside ring
Fallback: bg-gradient-to-br from-blue-400 to-purple-500 text-white font-bold text-2xl
```

### Profile Info

```
Name: text-xl font-bold text-white
Username: text-sm text-white/70
Bio: text-sm text-white/80 mt-1 line-clamp-2
Verification badge: inline-flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-1 text-xs text-white
```

### Stats Row (Hero)

```
Container: flex items-center gap-4 mt-3
Stat item: flex flex-col items-center
Value: text-lg font-bold text-white
Label: text-xs text-white/70
Divider: h-8 w-px bg-white/20
```

### Tab Navigation (Sticky)

```
Position: sticky top-[56px] z-40
Container: rounded-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl
Border: border border-gray-200/50 dark:border-gray-700/50
Shadow: shadow-sm
Padding: p-1
Layout: flex overflow-x-auto scrollbar-hide

Tab button:
  Height: h-9
  Padding: px-4
  Border-radius: rounded-xl
  Font: text-xs font-semibold whitespace-nowrap

  Active: bg-blue-600 text-white shadow-sm
  Inactive: text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700
```

### Posts Grid (Profile Tab)

```
Layout: grid grid-cols-2 gap-2 sm:gap-3
Card: Same as AllPosts card spec
```

### Edit Profile Modal

```
Overlay: fixed inset-0 z-50 bg-black/50 backdrop-blur-sm
Card: max-w-md w-full mx-4 rounded-2xl mhub-premium-surface shadow-2xl max-h-[90vh] overflow-y-auto
Header: p-5 border-b border-gray-200 dark:border-gray-700
Close button: absolute top-4 right-4 w-8 h-8 rounded-full hover:bg-gray-100
Form padding: p-5 space-y-4
Input styling: Same as universal input spec (h-11 rounded-xl border-2)
Save button: w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold
```

---

## 9. DASHBOARD PAGE

**File:** `src/pages/Dashboard.jsx`  
**Route:** `/dashboard`

### Page Container

```
Classes: min-h-screen mhub-premium-page nav-clearance transition-colors duration-300
Background: bg-gray-50 dark:bg-gray-950
Content wrapper: container mx-auto px-4 py-6 max-w-[640px] space-y-3
```

### Welcome Header Card

```
Container: mhub-premium-surface rounded-2xl overflow-hidden
Background: bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-900 text-white
Padding: p-6 lg:p-5
Layout: flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4
```

### Header Avatar

```
Size: h-12 w-12 lg:h-16 lg:w-16
Ring: ring-4 ring-white/30
Fallback: bg-white/20 text-white font-bold
```

### Header Text

```
Heading: text-lg sm:text-2xl lg:text-3xl font-bold text-white truncate
Subtext: flex flex-wrap items-center gap-3 text-white/90 text-sm
Rating star: w-4 h-4 text-yellow-300 fill-current
Rank badge: bg-white/20 text-white border-white/30
```

### Coins Display

```
Amount: text-lg sm:text-2xl lg:text-3xl font-bold text-white
Label: text-white/80 "Total Coins"
```

### Header Buttons

```
Refresh: bg-white/20 text-white hover:bg-white/30 border border-white/30 size=sm
Add Post: bg-white text-blue-700 hover:bg-blue-50 dark:bg-slate-900 dark:text-blue-300 size=sm
```

### Stats Cards Grid

```
Layout: grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4
```

### Individual Stat Card

```
Container: mhub-premium-surface rounded-xl hover:shadow-xl transition-all duration-300
Content: p-4 lg:p-6 space-y-3
Icon container: p-2 lg:p-3 rounded-xl bg-[blue/green/purple/yellow]-100 dark:bg-opacity-20
Icon: w-5 h-5 lg:w-6 lg:h-6 text-[matching color]-600
Value: text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100
Label: text-sm text-gray-600 dark:text-gray-200
Trend badge: bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-200 text-xs
CTA link: text-blue-600 dark:text-blue-300 (ghost, size=sm)
```

### Recent Activity Card

```
Container: mhub-premium-surface rounded-2xl overflow-hidden h-full
Header: bg-blue-500 dark:bg-blue-800/30 text-white
Item: flex items-center space-x-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-950 hover:shadow-md transition-all duration-300
Icon box: p-2 rounded-lg bg-white dark:bg-slate-900, icon w-5 h-5 text-blue-500
Title: font-semibold text-gray-800 dark:text-gray-100 text-sm lg:text-base
Time: text-xs lg:text-sm text-gray-600 dark:text-gray-200 (with Calendar icon w-4 h-4)
```

### Top Sellers Card

```
Header: bg-gradient-to-r from-blue-400 to-blue-500 dark:from-blue-600 dark:to-blue-800 text-white
Row: flex items-center justify-between p-3 lg:p-4 rounded-xl transition-all duration-300
Current user: bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 shadow-md
Other rows: bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600
Name: font-bold text-gray-900 dark:text-white
Stats: text-xs text-gray-500 dark:text-gray-300
Rank badge: text-xs font-bold px-2 py-1 rounded-full (gold/silver/bronze colors)
```

---

## 10. REWARDS PAGE

**File:** `src/pages/Rewards.jsx`  
**Route:** `/rewards`

### Page Container

```
Background: bg-gradient-to-b from-white to-slate-50 dark:from-gray-900 dark:to-gray-950
Min-height: min-h-screen
Classes: mhub-premium-page mhub-page-pad-bottom
```

### Coin Display

```
Amount: text-3xl font-black text-amber-600 dark:text-amber-400
Icon: w-8 h-8 text-amber-500
Container: flex items-center gap-2
Label: text-sm text-gray-500 dark:text-gray-400
```

### XP Progress Bar

```
Container: w-full mt-2
Track: h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700
Fill: h-2 rounded-full bg-gradient-to-r from-yellow-300 to-orange-400
Transition: transition-all duration-500
Label: text-xs text-gray-500 flex justify-between
Level text: text-sm font-bold text-gray-700 dark:text-gray-200
```

### Stat Cards Row

```
Layout: grid grid-cols-3 gap-2 sm:gap-3
Card: rounded-2xl p-3 shadow-lg mhub-premium-surface
Value: text-lg font-bold text-gray-900 dark:text-white
Label: text-xs text-gray-500 dark:text-gray-400
Icon: w-5 h-5 in matching accent color
```

### Tab Bar

```
Container: rounded-[18px] bg-gray-100 dark:bg-gray-800 p-1
Layout: flex overflow-x-auto scrollbar-hide
Tab: rounded-[14px] px-4 py-2 text-sm font-medium whitespace-nowrap
Active: bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm
Inactive: text-gray-500 dark:text-gray-400 hover:text-gray-700
Transition: transition-all duration-200
```

### Streak Card

```
Container: rounded-2xl p-4 mhub-premium-surface border border-orange-100 dark:border-orange-900/30
Background: bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20
Flame icon: w-8 h-8 text-orange-500 animate-bounce (subtle)
Streak count: text-2xl font-bold text-orange-600 dark:text-orange-400
Days grid: flex gap-1
  Day dot (complete): w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold
  Day dot (incomplete): w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-400 text-xs
```

### Reward Item Card

```
Container: rounded-2xl p-4 mhub-premium-surface border border-gray-100 dark:border-gray-700
Layout: flex items-center gap-3
Icon area: w-12 h-12 rounded-xl bg-gradient-to-br [varies] flex items-center justify-center
Title: text-sm font-semibold text-gray-900 dark:text-white
Description: text-xs text-gray-500 dark:text-gray-400
Coin reward: text-sm font-bold text-amber-600 dark:text-amber-400
Claim button: h-9 px-4 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold
Claimed state: bg-emerald-100 text-emerald-700 border border-emerald-200
```

---

## 11. CART PAGE

**File:** `src/pages/Cart.jsx`  
**Route:** `/cart`

### Page Container

```
Background: bg-gradient-to-b from-white to-slate-50 dark:from-gray-900 dark:to-gray-950
Min-height: min-h-screen
Classes: mhub-premium-page mhub-page-pad-bottom
```

### Cart Item Card

```
Container: rounded-2xl mhub-premium-surface border border-gray-100 dark:border-gray-700
Shadow: shadow-sm hover:shadow-md transition-all duration-300
Padding: p-3 sm:p-4
Layout: flex gap-3 sm:gap-4
```

### Item Image

```
Size: w-16 h-16 sm:w-24 sm:h-24
Border-radius: rounded-xl
Object-fit: object-cover
Border: border border-gray-100 dark:border-gray-700
```

### Item Details

```
Title: text-sm font-semibold text-gray-900 dark:text-white line-clamp-2
Category: text-xs text-gray-500 dark:text-gray-400
Seller: text-xs text-gray-400 dark:text-gray-500
Price: text-sm font-bold text-indigo-600 dark:text-indigo-400
Original price: text-xs text-gray-400 line-through
```

### Quantity Stepper

```
Button: h-10 w-10 rounded-full border border-gray-200 dark:border-gray-600
Icon: w-4 h-4
Hover: hover:bg-gray-100 dark:hover:bg-gray-700
Disabled: opacity-50 cursor-not-allowed
Count display: text-sm font-semibold w-8 text-center
```

### Remove Button

```
Position: absolute top-2 right-2
Size: w-8 h-8 rounded-full
Background: hover:bg-red-50 dark:hover:bg-red-900/20
Icon: Trash2 w-4 h-4 text-gray-400 hover:text-red-500
```

### Cart Summary Card

```
Container: rounded-2xl mhub-premium-surface
Background: backdrop-blur-xl
Shadow: shadow-xl
Padding: p-4 sm:p-5
Position: sticky bottom-4
Border: border border-gray-200/50 dark:border-gray-700/50
```

### Summary Details

```
Subtotal label: text-sm text-gray-600 dark:text-gray-300
Subtotal value: text-sm font-medium text-gray-900 dark:text-white
Divider: border-t border-dashed border-gray-200 dark:border-gray-700 my-2
Total label: text-base font-semibold text-gray-900 dark:text-white
Total value: text-lg font-bold text-indigo-600 dark:text-indigo-400
Items count: text-xs text-gray-500
```

### Checkout Button

```
Width: w-full
Height: h-12
Background: bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700
Text: text-white font-semibold text-base
Border-radius: rounded-xl
Shadow: shadow-lg shadow-indigo-500/25
Disabled: opacity-60 cursor-not-allowed
```

### Empty Cart State

```
Container: flex flex-col items-center justify-center py-16 px-4 text-center
Icon: w-20 h-20 text-gray-300 dark:text-gray-600 mb-4
Title: text-xl font-bold text-gray-900 dark:text-white mb-2
Description: text-sm text-gray-500 dark:text-gray-400 max-w-[280px] mb-6
Browse button: bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 h-11 rounded-xl font-semibold
```

---

## 12. WISHLIST PAGE

**File:** `src/pages/Wishlist.jsx`  
**Route:** `/wishlist`

### Page Container

```
Background: bg-gradient-to-b from-white to-slate-50 dark:from-gray-900 dark:to-gray-950
Min-height: min-h-screen
Classes: mhub-premium-page mhub-page-pad-bottom
```

### Hero Card

```
Container: mhub-hero-card min-h-[116px] sm:min-h-[132px] rounded-2xl px-4 py-3.5 sm:px-6 sm:py-4.5
Background: bg-gradient-to-r from-sky-500/95 via-blue-500/95 to-violet-500/95
Dark: dark:from-sky-700/90 dark:via-blue-700/90 dark:to-violet-700/90
Title: text-[clamp(20px,2.1vw,28px)] leading-[1.1] font-bold text-white
Icon wrapper: w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center
```

### View Mode Toggle

```
Container: flex items-center gap-1 bg-white/70 dark:bg-slate-900/60 border border-gray-200 dark:border-gray-700 rounded-xl p-1
Button size: h-11 w-11 min-w-[2.75rem] rounded-lg
Active: bg-pink-500 text-white shadow-md shadow-pink-500/20
Inactive: text-gray-500 dark:text-gray-300 hover:bg-white/80
Icon: w-4 h-4
```

### Wishlist Card (Grid Mode)

```
Container: group mhub-premium-surface backdrop-blur-md rounded-2xl overflow-hidden
Border: border border-gray-100/80 dark:border-gray-700/40
Hover border: hover:border-pink-200/60 dark:hover:border-pink-500/20
Shadow: shadow-md shadow-gray-200/40 dark:shadow-black/20 hover:shadow-lg hover:shadow-pink-500/10
Selection ring: ring-2 ring-pink-400/60 dark:ring-pink-500/40
Hover: hover:-translate-y-0.5 transition-all duration-300
```

### Card Image Area

```
Container: relative w-full aspect-[4/3] overflow-hidden
Image: w-full h-full object-cover group-hover:scale-105 transition-transform duration-500
Gradient overlay: absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent
```

### Price Badge (On Image)

```
Position: absolute bottom-2.5 left-3
Background: bg-black/20 backdrop-blur-md
Border-radius: rounded-lg
Padding: px-2.5 py-1
Text: text-lg font-bold text-white
Currency: ₹ symbol
```

### Selection Checkbox

```
Position: absolute top-2.5 right-12
Size: w-8 h-8 rounded-full
Unselected: bg-white/20 text-white/80 border-white/40 backdrop-blur-sm
Selected: bg-pink-500 text-white border-pink-400 shadow-md shadow-pink-500/30
```

### Remove Button (Card)

```
Position: absolute top-2.5 right-2.5
Size: w-8 h-8 rounded-full
Style: bg-white/20 backdrop-blur-sm text-white/80
Hover: hover:bg-red-500 hover:text-white hover:scale-110
Icon: w-3.5 h-3.5
```

### Category Badge

```
Position: absolute top-2.5 left-2.5
Background: bg-white/20 backdrop-blur-md
Border: border border-white/20
Text: text-white text-xs font-medium
Padding: px-2.5 py-1
Border-radius: rounded-full
```

### Card Body

```
Padding: p-3 sm:p-3.5
Title: font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug line-clamp-1
Hover color: group-hover:text-pink-600 dark:group-hover:text-pink-400
```

### Seller Info

```
Wrapper: flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400
Avatar: w-4 h-4 rounded-full object-cover
Avatar initials: w-5 h-5 rounded-full bg-pink-100 text-pink-600 font-semibold
Verified badge: bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-1 rounded-full text-xs
```

### Rating

```
Container: flex items-center gap-1 text-xs mb-1.5
Star: w-4 h-4 text-amber-400 fill-amber-400
Value: font-medium text-gray-700 dark:text-gray-200
Review count: text-gray-400 dark:text-gray-300 (parentheses)
```

### Notes Section

```
Border: border-l-2 border-pink-400 dark:border-pink-600/40
Background: bg-pink-50/50 dark:bg-pink-950/50 rounded-r-md
Text: text-xs italic text-pink-700 dark:text-pink-300 pl-2 py-1 line-clamp-2
```

### Action Buttons

```
Row 1 (View + Buy):
  View Details: flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl text-xs h-9 sm:h-10 font-semibold
  Buy Now: flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl text-xs h-9 sm:h-10
  Gap: gap-1.5 sm:gap-2

Row 2 (Cart + Share):
  Add to cart (not in): border-gray-200 text-gray-500 hover:border-pink-300 hover:text-pink-600
  Add to cart (in): border-emerald-300 text-emerald-600 bg-emerald-50/50
  Share: border-gray-200 text-gray-500
  Size: h-9 sm:h-10 rounded-xl
```

### Empty State

```
Container: flex flex-col items-center justify-center py-16 px-4
Rotating rings:
  Outer: border-2 border-dashed border-pink-200 dark:border-pink-500/20 animate-[spin_20s_linear_infinite]
  Inner: border border-pink-100/50 dark:border-pink-500/10
Icon circle: w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 to-purple-600
Heart icon: w-9 h-9 text-white fill-white
Floating dots: w-2.5 h-2.5 bg-pink-400 rounded-full opacity-70 animate-[bounce_3s_ease-in-out_infinite]
Title: text-xl font-bold text-gray-900 dark:text-white mb-2
Description: text-sm text-gray-500 dark:text-gray-400 max-w-[280px]
Browse button: w-full sm:w-auto bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 h-11 rounded-xl text-sm font-semibold
```

### Bulk Actions Bar

```
Container: flex flex-wrap items-center gap-2 text-xs mt-3
Count: text-gray-500 dark:text-gray-300
Add to cart: h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold
Remove: h-9 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs
Clear: h-9 rounded-xl variant="ghost"
```

---

## 13. CHAT PAGE

**File:** `src/pages/Chat.jsx`  
**Route:** `/chat`

### Page Container

```
Background: bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950
Classes: min-h-screen mhub-premium-page mhub-page-pad-bottom
Density modifier: mhub-compact class (optional)
```

### Chat Header

```
Background: bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-[#0b1220] dark:to-[#1b2542]
Padding: px-4 py-6
Content: max-w-[640px] mx-auto flex items-center gap-4
Title: text-lg sm:text-2xl font-bold text-white (with MessageCircle icon)
Subtitle: text-sm text-blue-100 dark:text-blue-200
Back button: variant=ghost size=icon text-white
```

### Connection Status Bar

```
Border-bottom: border-b border-amber-200/60 dark:border-amber-400/20
Background: px-4 py-2 bg-amber-50/80 dark:bg-amber-950/10
Content: max-w-[640px] mx-auto flex items-center justify-between gap-2
Icon: WifiOff/Wifi w-3.5 h-3.5 (animate-pulse when connecting)
Text: text-xs text-amber-700 dark:text-amber-300
Reconnect button: size=sm variant=ghost h-6 px-2 text-xs hover:bg-amber-100
```

### Main Chat Container

```
Wrapper: max-w-[640px] mx-auto px-4 py-6
Inner: mhub-premium-surface rounded-2xl overflow-hidden
Height: calc(100vh - 240px)
Display: flex h-full
```

### Conversation List Panel

```
Width: w-full md:w-1/3
Border-right: border-r dark:border-gray-700 (desktop)
Responsive: hidden when conversation selected on mobile
```

### Search Box

```
Container: p-4 border-b dark:border-b
Search icon: absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400
Input: pl-10 (standard input component)
```

### Conversation List Item

```
Container: p-4 cursor-pointer border-b dark:border-gray-700
Hover: hover:bg-gray-50 dark:hover:bg-gray-950
Selected: bg-blue-50 dark:bg-gray-700
Transition: transition
Layout: flex items-center gap-3
Name: font-semibold text-gray-900 dark:text-gray-100 truncate
Timestamp: text-xs text-gray-500 dark:text-gray-300
Last message: text-sm text-gray-500 truncate dark:text-gray-300
Unread badge: bg-blue-600 dark:bg-blue-700/40 (number)
```

### Empty Conversation State

```
Container: p-8 text-center space-y-4
Icon box: w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg
Icon: MessageCircle w-8 h-8 text-white
Primary text: font-semibold text-slate-900 dark:text-white
Secondary text: text-xs text-slate-500 dark:text-slate-400
```

### Message Bubble

```
Wrapper: flex ${isMine ? 'justify-end' : 'justify-start'}
Max-width: max-w-[70%]
Padding: px-4 py-2

Sent (mine):
  Background: bg-blue-600
  Text: text-white
  Border-radius: rounded-2xl rounded-br-sm

Received:
  Background: bg-gray-100 dark:bg-gray-700
  Border-radius: rounded-2xl rounded-bl-sm
```

### Message Metadata

```
Container: mt-1 flex items-center justify-between gap-2 text-xs
Sent timestamp: text-blue-100
Received timestamp: text-gray-500
Failed status: text-red-200
```

### Typing Indicator

```
Classes: text-xs text-gray-500 dark:text-gray-300
Text: "{name} is typing..."
```

### Chat Input Area

```
Container: p-4 border-t dark:border-t
Layout: flex gap-2
Input: flex-1 (standard Input component)
Placeholder: "Type a message..."
Send button: bg-blue-600 hover:bg-blue-700 dark:bg-blue-700/40
Icon: Send w-5 h-5
Disabled: when sending, empty input, or offline
```

### Send Error Alert

```
Border: border border-red-200 dark:border-red-600/40
Background: bg-red-50 dark:bg-red-950/20
Text: text-xs text-red-700 dark:text-red-300
Border-radius: rounded-lg
Padding: p-2 mb-3
Retry button: size=sm variant=outline border-red-300 text-red-700
```

---

## 14. NOTIFICATIONS PAGE

**File:** `src/pages/Notifications.jsx`  
**Route:** `/notifications`

### Page Container

```
Background: bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950
Min-height: min-h-screen
Classes: mhub-premium-page mhub-page-pad-bottom
```

### Hero Card

```
Container: min-h-[132px] rounded-2xl overflow-hidden relative
Background: bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-[#0b1220] dark:to-[#1b2542]
Padding: px-5 py-4 sm:py-5
Title: text-xl sm:text-2xl font-bold text-white
Subtitle: text-sm text-blue-100 dark:text-blue-200
Bell icon: w-6 h-6 text-white
Unread count badge: bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full
```

### Tab Bar

```
Container: flex gap-1 overflow-x-auto scrollbar-hide mt-4
Tab button:
  Padding: px-4 py-2
  Border-radius: rounded-full
  Font: text-sm font-medium whitespace-nowrap
  Transition: transition-all duration-200

  Active:
    Background: bg-gradient-to-r from-blue-500 to-indigo-600
    Text: text-white
    Shadow: shadow-md shadow-blue-500/25

  Inactive:
    Background: bg-white/80 dark:bg-slate-800
    Text: text-gray-600 dark:text-gray-300
    Border: border border-gray-200 dark:border-gray-700
    Hover: hover:bg-gray-50 dark:hover:bg-gray-700
```

### Notification Card

```
Container: rounded-2xl p-4 mhub-premium-surface border border-gray-100 dark:border-gray-700
Hover: hover:shadow-md transition-all duration-200
Layout: flex gap-3

Unread accent bar:
  Position: absolute left-0 top-0 bottom-0
  Width: w-[2px]
  Background: bg-blue-500
  Border-radius: rounded-l-2xl

Unread card:
  Background: bg-blue-50/50 dark:bg-blue-950/20
  Border-left: border-l-2 border-blue-500
```

### Notification Icon Circle

```
Size: w-10 h-10 flex-shrink-0
Border-radius: rounded-full
Background: Dynamic per notification type
  Message: bg-blue-100 dark:bg-blue-900/30 text-blue-600
  Like: bg-pink-100 dark:bg-pink-900/30 text-pink-600
  Sale: bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600
  System: bg-amber-100 dark:bg-amber-900/30 text-amber-600
  Coins: bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600
Icon: w-5 h-5
```

### Notification Content

```
Title: text-sm font-semibold text-gray-900 dark:text-white
Body: text-xs text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2
Timestamp: text-xs text-gray-400 dark:text-gray-500 mt-1
Action link: text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline
```

### Mark All Read Button

```
Position: In hero header
Size: text-xs
Background: bg-white/20 hover:bg-white/30
Text: text-white
Border-radius: rounded-full
Padding: px-3 py-1.5
```

### Empty State

```
Container: flex flex-col items-center py-16 text-center
Icon: w-16 h-16 text-gray-300 dark:text-gray-600 mb-4
Title: text-lg font-bold text-gray-900 dark:text-white
Description: text-sm text-gray-500 dark:text-gray-400
```

---

## 15. SEARCHPAGE

**File:** `src/pages/SearchPage.jsx`  
**Route:** `/search`

### Page Container

```
Background: bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-950
Min-height: min-h-screen
Classes: mhub-premium-page mhub-page-pad-bottom
```

### Search Input

```
Container: relative flex items-center gap-2
Input:
  Height: h-10
  Border: border-2 border-gray-200 dark:border-gray-700
  Border-radius: rounded-2xl
  Background: bg-white/80 dark:bg-slate-900/60
  Text: text-sm dark:text-white
  Focus ring: focus:ring-4 focus:ring-blue-400/30
  Focus border: focus:border-blue-500
  Padding: pl-10 pr-4
Search icon: absolute left-3 w-4 h-4 text-gray-400
```

### Submit Button

```
Background: bg-gradient-to-r from-blue-600 to-indigo-600
Hover: hover:from-blue-700 hover:to-indigo-700
Text: text-white font-semibold
Border-radius: rounded-xl
Height: h-10
Padding: px-4
Shadow: shadow-md shadow-blue-500/20
```

### Filter Chips

```
Container: flex gap-2 overflow-x-auto scrollbar-hide py-2
Chip:
  Height: h-11
  Padding: px-4
  Border-radius: rounded-full
  Font: text-sm font-medium whitespace-nowrap

  Active:
    Background: bg-blue-600
    Text: text-white
    Shadow: shadow-sm shadow-blue-500/20

  Inactive:
    Background: bg-white dark:bg-slate-800
    Text: text-gray-700 dark:text-gray-300
    Border: border border-gray-200 dark:border-gray-700
    Hover: hover:bg-gray-50
```

### Results Grid

```
Layout: grid grid-cols-2 gap-2 sm:gap-3
Image: aspect-[4/3] w-full object-cover
Card: Same spec as AllPosts cards
```

### No Results State

```
Container: flex flex-col items-center py-12 text-center
Icon: Search w-12 h-12 text-gray-300 dark:text-gray-600 mb-3
Title: text-lg font-semibold text-gray-900 dark:text-white
Suggestion: text-sm text-gray-500 dark:text-gray-400
```

---

## 16. LOGIN PAGE

**File:** `src/pages/Auth/Login.jsx`  
**Route:** `/login`

### Page Container (AuthShell)

```
Background: bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-100
Dark: dark:from-gray-950 dark:via-gray-900 dark:to-gray-800
Min-height: min-h-screen
Flex: flex items-start justify-center (mobile) | sm:items-center
Padding: px-4 pt-10 pb-8 sm:py-12
Transition: transition-colors duration-300
```

### Logo Box

```
Size: w-14 h-14 sm:w-16 sm:h-16
Background: bg-gradient-to-r from-sky-500 to-blue-600
Border-radius: rounded-2xl
Shadow: shadow-lg shadow-blue-500/25
Icon: Shield h-7 w-7 sm:h-8 sm:w-8 text-white
Container: flex justify-center mb-5
```

### Heading

```
Text: "Welcome Back" (or similar)
Font: text-2xl sm:text-3xl font-bold
Color: text-gray-900 dark:text-white
Margin: mb-1
```

### Subheading

```
Font: text-sm sm:text-base
Color: text-gray-600 dark:text-gray-200
```

### Form Card

```
Shadow: shadow-xl
Border: border-0
Border-radius: rounded-2xl sm:rounded-3xl
Overflow: overflow-hidden
Classes: mhub-premium-surface backdrop-blur-sm
```

### Card Header (Blue Gradient)

```
Background: bg-gradient-to-r from-sky-500 to-blue-600 text-white
Padding: py-5 sm:py-6 text-center
Title: text-xl sm:text-2xl font-bold
Description: text-sky-100 dark:text-sky-200 text-sm
```

### Card Content

```
Padding: p-5 sm:p-8
Spacing: space-y-5
```

### Mobile Number Input

```
Country code prefix:
  Background: bg-gray-100 dark:bg-gray-950
  Border: border-2 border-r-0 border-gray-200 dark:border-gray-700
  Border-radius: rounded-l-xl
  Padding: px-3
  Text: "+91" text-gray-500 dark:text-gray-300 text-sm

Input field:
  Height: h-11 sm:h-12
  Border: border-2 border-gray-200 dark:border-gray-700
  Border-radius: rounded-r-xl
  Background: dark:bg-gray-700
  Text: dark:text-white
  Focus: focus:border-sky-500 dark:focus:border-sky-500/40
  Placeholder: dark:placeholder-gray-400

Helper: text-xs text-gray-500 dark:text-gray-300 mt-1.5
Label: text-sm font-semibold text-gray-700 dark:text-gray-200 (with Phone icon 4x4)
```

### Password Input

```
Height: h-11 sm:h-12
Border: border-2 border-gray-200 dark:border-gray-700
Border-radius: rounded-xl
Padding-right: pr-12 (for toggle button)
Focus: focus:border-sky-500 dark:focus:border-sky-500/40
```

### Password Toggle Button

```
Position: absolute right-2 top-1/2 -translate-y-1/2
Variant: ghost, size=sm
Icon: Eye/EyeOff w-4 h-4 text-gray-500 dark:text-gray-400
```

### Error Message

```
Border: border border-amber-200 dark:border-amber-600/40
Background: bg-amber-50 dark:bg-amber-950/20
Border-radius: rounded-xl
Padding: p-3
Text: text-xs text-amber-800 dark:text-amber-200
Icon: AlertCircle w-4 h-4
Layout: flex items-start gap-2
```

### OTP Challenge Section

```
Animation: animate-in fade-in slide-in-from-top-4 duration-300
Header icon: Smartphone w-4 h-4 text-orange-500 dark:text-orange-300
Info box: bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-600/40 rounded-xl p-3

OTP Input:
  Height: h-12 sm:h-14
  Border: border-2 border-orange-300 dark:border-orange-600/40
  Background: bg-orange-50 dark:bg-orange-950/20
  Border-radius: rounded-xl
  Text: text-center text-2xl tracking-[0.3em] font-mono
  Focus: focus:border-orange-500 dark:focus:border-orange-500/40

Countdown: text-gray-500 dark:text-gray-300 text-xs
Resend link: text-blue-600 dark:text-blue-300 hover:underline font-medium
```

### Submit Button

```
Height: h-11 sm:h-12
Width: w-full
Border-radius: rounded-xl
Font: text-base sm:text-lg font-semibold
Normal gradient: bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700
OTP mode: bg-orange-500 hover:bg-orange-600
Spinner: w-4 h-4 animate-spin mr-2 (during loading)
```

### Links

```
Container: flex items-center justify-between text-sm
Text color: text-gray-600 dark:text-gray-200
Link color: text-blue-600 dark:text-blue-300 hover:underline font-medium
Forgot password: whitespace-nowrap ml-2 py-1.5
Sign-up link: text-blue-600 dark:text-blue-300 hover:underline font-medium
```

---

## 17. SIGNUP PAGE

**File:** `src/pages/Auth/SignUp.jsx`  
**Route:** `/signup`

### Page Container

```
Background: bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50
Dark: dark:from-gray-950 dark:via-purple-950/30 dark:to-gray-900
Min-height: min-h-screen
Flex: flex items-center justify-center
Padding: py-8 px-4
Position: relative overflow-hidden
Transition: transition-colors duration-300
```

### Decorative Background Blobs

```
Top-right blob:
  Position: absolute -top-40 -right-40
  Size: w-80 h-80 (320px)
  Background: bg-purple-300/30 dark:bg-purple-900/30
  Border-radius: rounded-full
  Blur: blur-3xl
  Animation: animate-pulse

Bottom-left blob:
  Position: absolute -bottom-40 -left-40
  Size: w-80 h-80
  Background: bg-indigo-300/30 dark:bg-indigo-900/30
  Blur: blur-3xl
  Animation: animate-pulse (delay 1s)

Wrapper: absolute inset-0 overflow-hidden pointer-events-none
```

### Content Wrapper

```
Width: w-full max-w-md (448px)
Z-index: z-10
Spacing: space-y-6
```

### Logo/Icon Section

```
Container: flex justify-center mb-4
Icon wrapper: w-14 h-14 sm:w-16 sm:h-16 rounded-2xl
Background: bg-gradient-to-br from-indigo-500 to-purple-600
Shadow: shadow-lg shadow-purple-500/25
Icon: Sparkles h-7 w-7 sm:h-8 sm:w-8 text-white
```

### Page Title

```
Font: text-2xl sm:text-3xl font-bold
Color: text-gray-900 dark:text-gray-100
Margin: mb-1
Alignment: text-center
```

### Step Indicator Dots

```
Container: flex justify-center gap-3 sm:gap-6 px-2
Step container: flex flex-col items-center gap-1 flex-1 min-w-0
Dot: w-4 h-4 rounded-full transition-all duration-300
  Active: bg-purple-500 scale-110
  Inactive: bg-gray-300 dark:bg-gray-600
Label: text-xs font-medium text-center truncate w-full
  Active: text-purple-600 dark:text-purple-400
  Inactive: text-gray-400 dark:text-gray-500
```

### Main Card

```
Shadow: shadow-xl
Border: border-0
Border-radius: rounded-2xl sm:rounded-3xl
Overflow: overflow-hidden
Classes: mhub-premium-surface backdrop-blur-sm
```

### Card Header (Purple Gradient)

```
Background: bg-gradient-to-r from-indigo-600 to-purple-600
Padding: py-6 sm:py-8 text-center
Icon box: w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-white/20
Icon: Shield/Key w-7 h-7 sm:w-8 sm:w-8 text-white
Title: text-xl sm:text-2xl text-white font-bold
Description: text-purple-100 dark:text-purple-200 text-sm
```

### Aadhaar Input (Step 1)

```
Same as universal input spec
Placeholder: XXXX XXXX XXXX format
Status icon: absolute right-3 top-1/2 -translate-y-1/2 (CheckCircle/AlertCircle w-4 h-4)
```

### OTP Input (Step 2)

```
Height: h-11 sm:h-12
Alignment: text-center text-lg tracking-widest
Border & styling: Same as universal input spec
```

### PAN Input (Step 3)

```
Placeholder: "ABCDE1234F"
maxLength: 10
Status icon: Same as Aadhaar
```

### Password Strength Indicator (Step 4)

```
Container: mt-2
Bars: flex gap-1 mb-1
Bar: h-1 flex-1 rounded-full transition-all
  Weak: bg-red-500
  Medium: bg-yellow-500
  Strong: bg-green-500
  Inactive: bg-gray-200 dark:bg-gray-600
Label: text-xs text-gray-500 dark:text-gray-300 (with font-medium strength text)
```

### Password Requirements Box

```
Background: bg-gray-50 dark:bg-gray-950
Border: border border-gray-200 dark:border-gray-700
Border-radius: rounded-xl
Padding: p-4
Title: font-semibold mb-2 text-gray-700 dark:text-gray-200
List: space-y-1 text-gray-600 dark:text-gray-200 text-xs
```

### Send OTP / Verify Button

```
Width: w-full
Height: h-11 sm:h-12
Background: bg-gradient-to-r from-indigo-600 to-purple-600
Hover: hover:from-indigo-700 hover:to-purple-700
Text: text-white font-semibold
Border-radius: rounded-xl
Shadow: shadow-lg shadow-purple-500/25
Disabled: disabled:opacity-50
Icon: ArrowRight or Loader2 (animate-spin)
```

### Back + Action Button Pair (Steps 3-4)

```
Container: flex gap-3
Back: flex-1 h-11 sm:h-12 rounded-xl variant=outline
Action: flex-1 h-11 sm:h-12 rounded-xl (gradient same as primary)
```

### Sign-In Link (Footer)

```
Container: text-center text-sm text-gray-600 dark:text-gray-400 mt-6
Link: text-purple-600 dark:text-purple-300 hover:underline font-medium py-1.5 inline-block
```

---

## 18. ARCHITECTURE OVERVIEW

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 18.2.0 |
| Routing | React Router DOM | 6.22 |
| Build | Vite | 6.4.2 |
| Styling | Tailwind CSS | 3.4 |
| Native Shell | Capacitor | 8.x |
| Backend | Express | 5.1 |
| Database | PostgreSQL | 15+ |
| Cache | Redis | 7+ |
| Realtime | Socket.IO | 4.x |
| Auth | JWT + OTP (SIM) | Custom |

### App Identity

```
Package: com.mhub.app
Android scheme: http (cleartext enabled)
SDK: API 34 (x86_64)
Emulator: MHub_AVD (swiftshader_indirect)
```

### Route Map (57 total)

| Route | Component | Lazy |
|-------|-----------|------|
| `/` | CategoryHub | ✓ |
| `/for-you` | ForYou | ✓ |
| `/all-posts` | AllPosts | ✓ |
| `/post/:id` | PostDetail | ✓ |
| `/add-post` | AddPost | ✓ |
| `/profile` | Profile | ✓ |
| `/dashboard` | Dashboard | ✓ |
| `/rewards` | Rewards | ✓ |
| `/cart` | Cart | ✓ |
| `/wishlist` | Wishlist | ✓ |
| `/chat` | Chat (Protected) | ✓ |
| `/notifications` | Notifications | ✓ |
| `/search` | SearchPage | ✓ |
| `/login` | Login | ✓ |
| `/signup` | SignUp | ✓ |

### API Endpoints (Key)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/login` | POST | Phone + password login |
| `/api/auth/signup` | POST | Multi-step registration |
| `/api/auth/verify-otp` | POST | OTP verification |
| `/api/posts` | GET | Paginated posts list |
| `/api/posts/:id` | GET | Single post detail |
| `/api/posts` | POST | Create new post |
| `/api/users/profile` | GET | User profile data |
| `/api/cart` | GET/POST/DELETE | Cart operations |
| `/api/wishlist` | GET/POST/DELETE | Wishlist operations |
| `/api/notifications` | GET | User notifications |
| `/api/chat/conversations` | GET | Chat conversations |
| `/api/chat/messages/:id` | GET | Messages for conversation |
| `/api/rewards` | GET | Rewards/coins data |
| `/api/search` | GET | Search with filters |

### Security Layers

1. JWT token authentication (httpOnly cookies)
2. Refresh token rotation
3. Device fingerprinting
4. VPN/proxy detection
5. Rate limiting (express-rate-limit)
6. CORS whitelist
7. Helmet security headers
8. Input sanitization (DOMPurify)
9. SQL injection prevention (parameterized queries)
10. XSS protection (CSP headers)
11. Aadhaar/PAN KYC verification
12. OTP via SIM binding
13. Trust score calculation
14. Fraud scoring engine
15. Account freeze mechanism
16. IP reputation checking
17. Device attestation (Play Integrity)
18. Session management (Redis)
19. Audit logging

### Build Commands

```bash
# Development
cd Mhub/client && npm run dev          # Vite dev server (port 5173)
cd Mhub/server && npm run dev          # Express server (port 5001)

# Production Build
cd Mhub/client && npm run build        # Output: dist/

# Android
npx cap sync android                   # Sync web assets
npx cap open android                   # Open in Android Studio

# Emulator
C:\Android\Sdk\emulator\emulator -avd MHub_AVD -gpu swiftshader_indirect
```

### Environment

```
JDK: C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot
Android SDK: C:\Android\Sdk
ANDROID_HOME: C:\Android\Sdk
Node: 20+
```

---

## 19. KNOWN ISSUES & RECOMMENDATIONS

### Critical Code Health Issues

| Issue | File | Impact |
|-------|------|--------|
| AllPosts.jsx = 4312 lines | `src/pages/AllPosts.jsx` | Unmaintainable, should split into 8-10 components |
| Profile.jsx = 4179 lines | `src/pages/Profile.jsx` | Same — split into tabs/sections |
| Memory leaks in infinite scroll | AllPosts, ForYou | No cleanup of IntersectionObserver in some paths |
| DB pool = 20 | `server/db/index.js` | Too small for production, recommend 50-100 |
| No query timeouts | DB queries | Risk of hung connections |
| `webContentsDebuggingEnabled` in prod | `capacitor.config.ts` | Security risk — disable for release |
| No error boundaries per page | All pages | Single crash takes down entire app |
| Redux not used (Context only) | All state | Performance risk at scale |

### Accessibility Issues (Resolved at 98/100)

| Fix Applied | Before | After |
|-------------|--------|-------|
| Nav pill contrast | `rgba(0,50,150,0.2)` | `rgba(0,50,150,0.35)` |
| Logo chip text | Low contrast white | Full `#ffffff` with text-shadow |
| ForYou badge opacity | 0.6 | 0.9 |
| Touch targets | Mixed 32-40px | All ≥ 44px (h-11) |
| Focus indicators | Missing | `focus:ring-4 focus:ring-blue-400/30` |

### Performance Recommendations

1. **Code-split AllPosts**: Extract `PostCard`, `FilterBar`, `SortControls`, `LoadMoreButton` into separate files
2. **Virtualize lists**: Use `react-window` or `@tanstack/virtual` for infinite scroll
3. **Image optimization**: Add `loading="lazy"` and `srcSet` for responsive images
4. **Bundle analysis**: Run `npx vite-bundle-visualizer` to identify large chunks
5. **Service Worker**: Add for offline support in Capacitor shell

---

## 20. BUILD & DEPLOYMENT

### Development Flow

```
1. Start emulator: emulator -avd MHub_AVD -gpu swiftshader_indirect
2. Start server: cd Mhub/server && npm run dev
3. Start client: cd Mhub/client && npm run dev
4. Sync to Android: npx cap sync android
5. Run on device: npx cap run android
```

### Production Checklist

- [ ] Set `webContentsDebuggingEnabled: false`
- [ ] Enable ProGuard/R8 minification
- [ ] Set proper `server.url` in capacitor.config.ts
- [ ] Enable HTTPS only (remove cleartext)
- [ ] Set DB pool to 50+
- [ ] Add query timeouts (30s)
- [ ] Enable Redis cluster mode
- [ ] Set up CDN for static assets
- [ ] Configure error reporting (Sentry)
- [ ] Add APM monitoring (New Relic/Datadog)

### Android Signing

```
Key alias: mhub-release
Keystore: mhub-release.jks
Target SDK: 34
Min SDK: 24
```

---

## DESIGN PATTERN SUMMARY

### Shared Visual Language

| Pattern | Implementation |
|---------|---------------|
| Premium Surface | `mhub-premium-surface` + `backdrop-blur-md` + subtle border |
| Hero Gradient | Blue/indigo/violet for main, orange for flash, pink/purple for wishlist |
| Card Style | `rounded-2xl` + `shadow-md` + `border border-gray-100 dark:border-gray-700` |
| Input Style | `h-11 sm:h-12` + `border-2` + `rounded-xl` + `focus:ring-4` |
| Button Primary | `h-11` + `rounded-xl` + gradient bg + `font-semibold` + `shadow-lg` |
| Button Ghost | `variant=ghost` + text color only + hover bg |
| Badge/Pill | `rounded-full` + `px-2.5 py-1` + `text-xs font-medium` |
| Empty State | Centered flex col + large icon + title + description + CTA |
| Loading | Shimmer skeleton with `animate-[shimmer_2s_infinite]` |
| Hover Card | `hover:-translate-y-0.5` + `hover:shadow-lg` + `transition-all duration-300` |
| Dark Mode | All elements have `dark:` variants with reduced opacity |
| Touch Target | Minimum `h-11` (44px) or `min-h-[44px]` on all interactive elements |
| Responsive Text | `text-[clamp(min,preferred,max)]` or size breakpoints |
| Density | `data-density="extra"` modifier reduces padding/gaps |

### Color Palette by Page

| Page | Primary Gradient | Accent |
|------|-----------------|--------|
| CategoryHub | Per-category (blue/pink/emerald/purple) | Indigo→Pink title |
| ForYou | Blue→Indigo→Purple | Blue-600 filters |
| AllPosts | Sky→Blue→Violet | Emerald prices |
| PostDetail | Slate gradient bg | Orange CTA, blue actions |
| AddPost | Blue→Indigo→Purple hero | Emerald publish |
| Profile | Sky→Blue→Violet hero | Blue tabs |
| Dashboard | Blue-500→Blue-600 | Blue stats |
| Rewards | Amber/Orange | Orange streak, amber coins |
| Cart | Indigo→Blue | Indigo prices |
| Wishlist | Sky→Blue→Violet hero | Pink actions |
| Chat | Blue→Indigo | Blue-600 bubbles |
| Notifications | Blue→Indigo | Per-type icon colors |
| Search | Blue→Indigo | Blue submit |
| Login | Sky→Blue | Orange OTP |
| SignUp | Indigo→Purple | Purple steps |

---

*End of Pin-to-Pin Visual Specification Report*
# MHub — Complete Architecture & E2E Production Plan

**Updated:** 2026-05-06  
**Audit Score:** 98/100 (11 core pages, Android emulator)  
**Platform:** React 18.2 + Capacitor 8 + Express 5 + PostgreSQL  

---

## 1. CORE APP IDENTITY

**MHub** is a **location-based verified marketplace** for buying and selling goods — similar to OLX/Craigslist but with Flipkart-grade trust signals, gamification, and a premium mobile-first experience.

### Key Differentiators
- **Verified sellers** (Aadhaar/PAN KYC, trust scores, device binding)
- **AI-curated recommendations** ("For You" feed with personalized picks)
- **Gamified rewards** (coins, streaks, referral chains, leaderboards)
- **Multi-category modes** (Electronics, Fashion, Vehicles, Others — each feels like its own app)
- **Real-time chat** (Socket.IO buyer-seller messaging)
- **Channels/Centres** (seller storefronts / brand pages)
- **Advanced security** (19-layer middleware, VPN detection, fraud scoring, device attestation)

---

## 2. TECH STACK

### Client
| Layer | Technology |
|-------|-----------|
| Framework | React 18.2.0 |
| Routing | React Router DOM 6.22 |
| Data Fetching | TanStack React Query 5.90 |
| Styling | Tailwind CSS 3.4 |
| UI Components | Radix UI + custom design system |
| Icons | Lucide React + React Icons |
| i18n | i18next (chained backends) |
| HTTP | Axios 1.15 |
| Mobile | Capacitor 8.x (Android/iOS) |
| Real-time | Socket.IO Client 4.8 |
| Build | Vite 6.4.2 |
| Testing | Playwright + Vitest |

### Server
| Layer | Technology |
|-------|-----------|
| Framework | Express 5.1 |
| Database | PostgreSQL (pg 8.16) |
| Cache | Redis (ioredis 5.8) |
| Auth | JWT + httpOnly cookies + WebAuthn |
| Hashing | Argon2 + Bcrypt |
| Images | Cloudinary + Sharp |
| Real-time | Socket.IO 4.8 |
| Push | web-push + Pusher |
| Scheduling | node-cron |
| Logging | Pino |
| Security | Helmet, HPP, WAF, CSRF, rate-limiting |
| Testing | Jest + Supertest |

### Mobile (Android)
| Layer | Technology |
|-------|-----------|
| Native Shell | Capacitor 8 (Android Gradle) |
| Scheme | `http://` (cleartext for local dev) |
| Deep Links | `mhub://` scheme |
| SDK | Android 34 (API 34) |
| Build | Gradle 8.14 + JDK 21 |

---

## 3. PAGE-BY-PAGE FUNCTIONALITY & DESIGN

### 3.1 Authentication Pages

| Page | Route | Functionality |
|------|-------|---------------|
| Login | `/login` | Phone/email + password, 2FA support, device binding |
| Sign Up | `/signup` | Phone + OTP, name, password, referral code |
| Forgot Password | `/forgot-password` | Email/phone OTP-based reset |
| Reset Password | `/reset-password` | Token-based password change |

**Design:** AuthShell gradient background, centered card with logo, premium input styling, social login options.

---

### 3.2 Core Marketplace Pages

#### Category Hub (`/category-hub`) — Score: 94/100
**What it does:** Multi-category entry point. Users pick Electronics, Fashion, Vehicles, or Others to enter that marketplace mode.
**Design:**
- Full-screen gradient background with ambient blob animations
- 2x2 glassmorphism cards with emoji icons + live stats badges (listing count, new items)
- 3D perspective hover effects (disabled on mobile touch)
- Responsive: single column on mobile, 2x2 on tablet+
**Mobile UX:** Touch-friendly 44px+ cards, bottom nav clearance `pb-20`, responsive font `text-lg sm:text-2xl`

#### All Posts (`/all-posts`) — Score: 94/100
**What it does:** Main product feed with filtering, sorting, search, and infinite scroll.
**Design:**
- Sticky category bar with horizontal scroll pills
- Quick filters (price range, condition, posted today)
- Product cards: image, price badge, title, location, seller trust badge
- Grid/list view toggle + density options (compact/full)
- Infinite scroll with skeleton loading states
- Compare mode (select 2+ items)
**Mobile UX:** Pull-to-refresh, swipe-friendly cards, sticky filter bar, 44px touch targets

#### For You (`/for-you`) — Score: 98/100
**What it does:** AI-curated personalized recommendations based on user activity, preferences, and browsing history.
**Design:**
- Gradient hero (blue→indigo→purple) with "AI Curated" badge + stats row
- Sticky quick filters bar (price ranges: Under 1000, 500-2K, 2K-10K, 10K+, Posted Today, Latest 10/50, Near Me)
- "Great Deals" promotional banner
- Sponsored posts carousel
- Feed of recommendation cards with image carousel, price, seller info, actions (like, save, share, cart)
**Mobile UX:** Horizontal scroll filter pills, density toggle, sticky header positioned below nav

#### Post Detail (`/post/:id`)
**What it does:** Full listing page with all product info and buyer actions.
**Design:**
- Image carousel with zoom modal + thumbnails
- Price section with condition badge
- Seller card: avatar, name, trust badge, rating, location
- Action buttons: Make Offer, Buyer Interest, Add to Cart, Message Seller, Share
- Similar posts carousel
- Sponsored listings section
**Mobile UX:** Swipe image carousel, bottom sheet modals for offers, share dialog

#### Search (`/search`) — Score: 100/100
**What it does:** Full-text + geo search with multi-dimensional filtering.
**Design:**
- Sticky search input with back button + clear
- Filter panel: category, subcategory, brand, condition, price range
- Horizontal quick filter pills
- Results grid with product cards
- Recent searches (localStorage persistence)
- Empty state with suggestions
**Mobile UX:** Focus management on search input, collapsible filters, category pills scroll

#### Nearby Posts (`/nearby`)
**What it does:** Location-based discovery within configurable radius.
**Design:** Map placeholder SVG, radius filter, dual CTA error state when GPS unavailable.

---

### 3.3 User Management Pages

#### Profile (`/profile`) — Score: 99/100
**What it does:** Central hub for personal info, trust signals, preferences, and settings.
**Design:**
- Hero card: avatar ring (completion %), name, email, trust badges, quick actions
- 4-tab sticky navigation: Overview, Personal, Preferences, Settings
- Sections: completion checklist, marketplace pulse stats, quick action grid, preferences
- Trust indicators: verified badge, trust score/label, account status
**Mobile UX:** Sticky tabs, collapsible sections, avatar click for upload, 1-column layout on mobile

#### Dashboard (`/dashboard`)
**What it does:** Seller analytics overview.
**Design:** Stats cards (active listings, sales, views, coins), trend badges, quick links, SellerDashboard sub-component.

#### Security Settings (`/security`)
**What it does:** Password change, 2FA setup, session management, device list.

#### KYC Verification (`/kyc`)
**What it does:** Identity verification flow with Aadhaar OTP + PAN verification.

---

### 3.4 Social & Communication

#### Chat (`/chat`) — Score: 100/100
**What it does:** Real-time buyer-seller messaging via Socket.IO.
**Design:**
- Conversation list with last message preview, unread badge, online status
- Message thread: bubbles, sent/delivered/seen status, timestamps
- Input area with send button
- Connection status banner (connecting/reconnecting/offline)
**Mobile UX:** Full-screen chat, message grouping, rate limit (30 msgs/60s)

#### Notifications (`/notifications`) — Score: 98/100
**What it does:** Unified notification center for all app events.
**Design:**
- Tab navigation: Messages, Offers, Alerts, Requests
- Chronological list grouped by type
- Unread count badge in header
- Action buttons per notification type
**Mobile UX:** Polling + WebSocket fallback, skeleton loading, transition animations

#### Feed (`/feed`)
**What it does:** Social timeline with community posts and updates.

#### Public Wall (`/public-wall`)
**What it does:** Community bulletin board for local announcements.

---

### 3.5 Commerce Pages

#### Cart (`/cart`) — Score: 97/100
**What it does:** Shopping cart with item management and checkout flow.
**Design:**
- Hero bar: cart icon, item count, subtotal, density toggle
- Item list: checkbox selection, quantity stepper (±), price delta badges (drop/increase), availability status
- Order summary sidebar (sticky on tablet+)
- Save for Later section
- Multi-currency breakdown table
- Empty state: premium illustration + Browse/Wishlist CTAs
**Mobile UX:** Gradient CTA buttons, swipe-friendly rows, summary bar at top on mobile

#### Wishlist (`/wishlist`) — Score: 97/100
**What it does:** Saved items collection with organization tools.
**Design:**
- Hero card: heart icon, count, refresh, density toggle
- Search + sort (newest/price/title) + status filter (all/active/sold)
- Grid/list view toggle (1 col mobile, 2 col tablet, 3 col desktop)
- Item cards: image (4:3 aspect), price overlay, category badge, seller info, action buttons
- Bulk actions: add to cart, remove selected
- Empty state: heart illustration + Browse/ForYou CTAs
**Mobile UX:** Responsive grid, pagination "Load more", undo toast for deletions

#### Add Post (`/add-post`)
**What it does:** Multi-step listing creation form.
**Design:**
- Step form: title, description, category/subcategory, price, images, condition
- Image upload with tier limits (Basic=1, Bronze=3, Silver=5, Premium=10)
- Audio notes option
- Preview mode before publish
- Unsaved changes warning
**Mobile UX:** Vertically stacked form, file input for images, character counter

#### Payment (`/payment`)
**What it does:** Payment gateway integration for purchases and subscriptions.

---

### 3.6 Gamification & Rewards

#### Rewards (`/rewards`) — Score: 97/100
**What it does:** Complete gamification hub with coins, challenges, referrals, and redemption.
**Design:**
- Hero: coin balance + delta animation, XP progress bar, membership tier badge
- 4-tab sticky nav: Progress, Earn & Challenges, Referrals, Activity & Rewards
- Coin progress ring (360° visual)
- Quick earn playbook (invite +50, post +20, sale +100)
- 7-day streak challenges, daily check-in
- Referral share cards (WhatsApp, Telegram, SMS, copy)
- Weekly leaderboard with rank indicators
- Redemption store (spend coins on boosts/highlights)
- SSE + polling for live updates
**Mobile UX:** Floating FAB for share, back-to-top button above bottom nav, coin delta toasts

#### Tier Selection (`/tier-selection`)
**What it does:** Subscription tier comparison and upgrade flow (Basic/Bronze/Silver/Premium).

---

### 3.7 Discovery & Organization

| Page | Route | Functionality |
|------|-------|---------------|
| Subcategories | `/subcategories` | Category drill-down with grid display |
| Compare Posts | `/compare` | Side-by-side spec comparison (split-screen) |
| Recently Viewed | `/recently-viewed` | Browsing history with timestamps |
| Saved Searches | `/saved-searches` | Persistent queries with price alerts |
| Channels | `/channels` | Seller storefront directory |
| Channel Detail | `/channels/:id` | Individual store page with products |
| Analytics | `/analytics` | Post performance (views, clicks, impressions) |

---

### 3.8 Admin & Operations

| Page | Route | Functionality |
|------|-------|---------------|
| Admin Panel | `/admin-panel` | User mgmt, KYC queue, complaints, analytics |
| Complaints | `/complaints` | Support ticket system |
| Feedback | `/feedback` | User feedback collection |

---

### 3.9 Legal & Static

| Page | Route |
|------|-------|
| Terms & Conditions | `/terms` |
| Privacy Policy | `/privacy-policy` |
| Refund Policy | `/refund-policy` |
| Support Ticket Policy | `/support-ticket-policy` |

---

## 4. API ARCHITECTURE (48 Route Groups)

### Core Business
```
/api/auth             — Login, signup, refresh, logout, 2FA, sessions
/api/posts            — CRUD, search (full-text + geo + fuzzy), filters, similar
/api/recommendations  — AI-personalized post suggestions
/api/chat             — REST + Socket.IO real-time messaging
/api/cart             — Shopping cart operations
/api/wishlist         — Saved items management
/api/offers           — Offer negotiation
/api/sale             — Transaction completion
/api/saleundone       — Cancel/undo sales
```

### User & Trust
```
/api/profile          — Profile management
/api/users            — Account CRUD, KYC
/api/reviews          — Ratings & reviews
/api/aadhaar          — Identity verification (OTP)
/api/contacts         — Phone contact sync (friend discovery)
```

### Rewards & Gamification
```
/api/coins            — Balance, history, redemption
/api/rewards          — Challenges, streaks, achievements
/api/referral         — Referral chains, bonuses
/api/tiers            — Subscription tier management
/api/dailycode        — Daily code rewards
```

### Discovery & Analytics
```
/api/categories       — Category taxonomy
/api/subcategories    — Subcategory mappings
/api/brands           — Brand directory
/api/feed             — Social feed content
/api/nearby           — Geo-proximity search
/api/analytics        — Device tracking, events
/api/sellerAnalytics  — Seller-specific metrics
/api/priceHistory     — Historical pricing data
/api/priceAlerts      — Price notification subscriptions
/api/recentlyViewed   — Recently viewed tracking
/api/savedSearches    — Saved search queries
```

### Channels/Centres
```
/api/channels         — Channel CRUD, analytics, membership
```

### Commerce & Finance
```
/api/payments         — Payment processing
/api/transactions     — Transaction history
/api/wallet           — Wallet operations
/api/subscriptions    — Subscription lifecycle
```

### Admin & Support
```
/api/admin            — Admin dashboard, user management
/api/adminDashboard   — Analytics & metrics
/api/complaints       — Complaint management
/api/feedback         — User feedback
/api/notifications    — Push notification management
/api/inquiries        — Product inquiries & replies
```

### Security & Infrastructure
```
/api/audit            — Audit logging
/api/gdpr             — Data export/deletion (GDPR compliance)
/api/telemetry        — Client telemetry
/api/deviceLifecycle  — Device attestation & credential rotation
/api/securityOps      — Security management
/api/reliability      — Health/readiness probes
/api/fleetOrchestration — Device fleet management
/api/launchGovernance — Launch control & governance
/api/loginAudit       — Login audit logging
/api/locationRoutes   — Location tracking
/api/locationVerification — Location verification
/api/translation      — Content translation
/api/twoFactor        — 2FA management
/api/cms              — Static page content
/api/publicWall       — Public wall/gallery
```

---

## 5. SERVER MIDDLEWARE STACK (19 Layers)

```
1. Compression (gzip)
2. HTTPS redirect (production)
3. Security Headers (Helmet)
4. CORS
5. Rate Limiters (burst/API/per-user/write)
6. Cookie Parser
7. JSON/URLEncoded Parsers
8. Response Normalizer
9. HPP (HTTP Parameter Pollution)
10. WAF Headers/Filter
11. Input Sanitization
12. Query Param Collapse
13. CSRF Protection
14. VPN Blocker
15. Bot Detection / DevTools / Anti-Replay
16. VPN Enforcement
17. Activity Tracker
18. Runtime/API Contract Guards
19. Zero-Trust Gate → Tenant Context → Optional Auth → Risk Restrictions
```

---

## 6. DATABASE SCHEMA (Key Tables)

| Table | Purpose |
|-------|---------|
| `users` | Accounts (UUID PK, phone, email, password, 2FA, location) |
| `profiles` | Extended info (avatar, bio, ratings, trust score) |
| `posts` | Listings (title, price, images, category, location, status, expires_at) |
| `categories` / `subcategories` | Product taxonomy |
| `chats` / `chat_messages` | Conversations + messages |
| `orders` / `transactions` | Purchase records |
| `reviews` | Seller ratings |
| `wishlist` | Saved items |
| `cart_items` | Shopping cart |
| `coins_ledger` | Coin balance (credits/debits) |
| `rewards_ledger` | Rewards redemption history |
| `notifications` | Push notification queue |
| `channels` | Seller storefronts |
| `user_sessions` | Active login sessions |
| `device_bindings` | Device attestation records |
| `audit_logs` | System audit trail |
| `saved_searches` | User search queries |
| `price_alerts` | Price notification subscriptions |

### DB Configuration
```
Pool Size:          20 (⚠️ needs 30-50 for production)
Idle Timeout:       30s
Connect Timeout:    5s
SSL:                Enabled in production
Health Check:       /api/health
Readiness Probe:    /api/ready (DB + cache + session)
```

---

## 7. CRON JOBS (13 Scheduled Tasks)

| Job | Schedule | Purpose |
|-----|----------|---------|
| Post expiry | Daily 00:00 | Expire posts by tier |
| Expiry warnings | Daily 09:00 | Send 5/3/1-day notices |
| Subscription check | Daily 10:00 | Expire subscriptions |
| Transaction expiry | Hourly | Expire pending, reactivate posts |
| Payment reconciliation | Every 2h :20 | Reconcile pending payments |
| Offer expiry | Hourly :30 | Expire 48h-old offers |
| Daily digest | Daily 09:30 | Summary to 3+ unread users |
| Fraud review | Every 6h | Flag suspicious activity |
| Complaint resolution | Daily 02:00 | Auto-close idle complaints (7d) |
| Location retention | Daily 02:15 | Purge old location events |
| Leaderboard awards | Mon 00:10 | Award top sellers |
| Monthly quota reset | 1st :00 | Reset boost/featured usage |
| Boost expiry | Daily 00:45 | Expire post boosts |

---

## 8. IDENTIFIED ISSUES & TECHNICAL DEBT

### 🔴 CRITICAL (Must fix before production)

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 1 | **AllPosts.jsx = 4,312 lines** | Unmaintainable, memory leaks, slow HMR | Split into FilterPanel, CardList, SortOptions, CompareBar |
| 2 | **Profile.jsx = 4,179 lines** | Same | Extract ProfileTabs, PreferenceEditor, QuickActions |
| 3 | **Memory leaks (AllPosts)** | setInterval never cleaned, timers stack on rapid nav | Add useEffect cleanup + AbortController |
| 4 | **DB pool size = 20** | Connection exhaustion at 50+ users | Increase to 40 |
| 5 | **No query timeouts** | Slow queries hang indefinitely | Add `statement_timeout` (5s reads, 2s writes) |
| 6 | **webContentsDebuggingEnabled: true** | Exposes WebView in production | Env-gate to debug builds only |

### 🟠 HIGH PRIORITY

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 7 | GreenNavbar.jsx = 1,482 lines | Hard to maintain | Extract LocationBadge, MobileMenuDrawer |
| 8 | No request deduplication | Duplicate API calls on rapid nav | AbortController + TanStack Query |
| 9 | Auth localStorage race | Partial session on logout | Single atomic storage key |
| 10 | Socket listener leak | `socket.on()` without cleanup | Add `socket.off()` in useEffect return |
| 11 | Fuzzy search unbounded | Slow trigram fallback | Add LIMIT + timeout |
| 12 | Trust badge N+1 queries | Extra DB call per result | Batch-fetch + Redis cache |

### 🟡 MEDIUM PRIORITY

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 13 | No React.memo on list items | Re-renders in feeds | memo() on PostCard, NotificationItem |
| 14 | i18n lookups every render | Translation overhead | Cache per lifecycle |
| 15 | Inconsistent skeleton states | Loading UX varies | Standardize per page type |
| 16 | No Redis cache for search | Every search hits DB | 30s cache for identical queries |
| 17 | Notification batch = 250 | Memory spikes | Reduce to 100, stream |
| 18 | Deep link errors silent | No crash logging | Add error reporter |

---

## 9. E2E IMPROVEMENT PLAN

### Phase 1: Code Health (Week 1)
| Task | Effort | Impact |
|------|--------|--------|
| Split AllPosts.jsx into 5 sub-components | 4h | Removes 4K monolith |
| Split Profile.jsx into tab components | 3h | Removes 4K monolith |
| Fix memory leaks (setInterval/setTimeout cleanup) | 1h | Prevents mobile OOM |
| Add AbortController to all fetches | 2h | Prevents stale updates |
| Extract GreenNavbar sub-components | 2h | Easier iteration |

### Phase 2: Performance (Week 2)
| Task | Effort | Impact |
|------|--------|--------|
| React.memo on card/list components | 1h | 50% fewer re-renders |
| Redis caching for search + recommendations | 3h | 10x fewer DB queries |
| Add query timeouts (5s/2s) | 1h | No hung requests |
| Increase DB pool to 40 | 0.5h | 2x concurrency headroom |
| Image IntersectionObserver lazy load | 1h | Faster initial paint |
| Bundle analysis + tree-shaking | 2h | Smaller APK |

### Phase 3: Mobile UX Polish (Week 3)
| Task | Effort | Impact |
|------|--------|--------|
| Standardize skeleton loaders (all pages) | 3h | Consistent loading |
| Add swipe gestures (back, dismiss, delete) | 4h | Native mobile feel |
| Bottom sheet modals (replace desktop dialogs) | 3h | Mobile-native patterns |
| Pull-to-refresh remaining pages | 2h | Standard UX |
| Haptic on all interactions | 1h | Premium feel |
| Empty state illustrations (remaining) | 3h | Polished experience |

### Phase 4: Feature Completion (Week 4-5)
| Task | Effort | Impact |
|------|--------|--------|
| PostDetail full rewrite (from minified) | 6h | Core user flow fixed |
| Analytics page with charts | 4h | Seller value |
| Nearby posts + map integration | 4h | Discovery feature |
| Payment gateway e2e | 6h | Monetization |
| Push notifications (FCM) e2e | 3h | Engagement driver |
| Offline mode (service worker) | 4h | Reliability |

### Phase 5: Production Hardening (Week 6)
| Task | Effort | Impact |
|------|--------|--------|
| Env-gate webContentsDebugging | 0.5h | Security |
| Sentry error reporting | 2h | Visibility |
| Database index optimization | 2h | Query speed |
| Rate limit tuning (load test) | 3h | Abuse prevention |
| CDN for static assets | 2h | Global performance |
| E2E test suite (Playwright) | 6h | Regression safety |
| CI/CD pipeline | 4h | Deployment automation |

---

## 10. CRITICAL USER FLOWS

### Flow 1: Browse & Buy
```
Category Hub → Select category → All Posts (filtered) →
Tap Post Card → Post Detail → "Add to Cart" →
Cart → Checkout → Payment → Confirmation
```

### Flow 2: Sell an Item
```
Login → Dashboard → "Create Listing" → Add Post →
Upload Images → Set Price → Category → Publish →
Buyer messages via Chat → Negotiate → Mark Sold → Sale Done
```

### Flow 3: Discovery & Save
```
Home → Search → Filter (price, condition) → Results →
Save to Wishlist → Compare items → Set Price Alert →
Get notification on price drop
```

### Flow 4: Trust & Verification
```
Profile → "Get Verified" → KYC → Aadhaar OTP →
PAN Verification → Trust Badge → Higher search visibility
```

### Flow 5: Earn & Redeem Rewards
```
Login → Rewards → Daily Check-in (+5) → Create Listing (+20) →
Refer Friend (+50) → Redeem for Boost → Leaderboard rank
```

---

## 11. TESTING STRATEGY

### Current Automated Tests
- `_full_audit.cjs` — 11-page production UX audit via CDP (scores, touch targets, contrast, overflow)
- `_login_test.cjs` — Authentication flow verification
- `_edge_check.cjs` — Contrast and edge-touching element analysis

### E2E Test Plan (To Build)
```
tests/
├── auth/
│   ├── login.spec.ts            # Demo login → verify session
│   ├── signup.spec.ts           # Registration + OTP
│   └── password-reset.spec.ts   # Reset flow
├── marketplace/
│   ├── browse-posts.spec.ts     # Category → AllPosts → PostDetail
│   ├── create-post.spec.ts      # AddPost → publish → verify
│   ├── search.spec.ts           # Search → filter → results
│   └── wishlist-cart.spec.ts    # Save → cart → checkout
├── social/
│   ├── chat.spec.ts             # Conversation → send message
│   └── reviews.spec.ts          # Leave review
├── rewards/
│   ├── coins.spec.ts            # Earn → balance → redeem
│   └── referral.spec.ts         # Generate code → share → verify
└── mobile/
    ├── touch-targets.spec.ts    # All buttons ≥ 44px
    ├── overflow.spec.ts         # No horizontal scroll
    └── navigation.spec.ts       # Bottom nav → all routes
```

---

## 12. BUILD & DEPLOY

### Client Build
```powershell
cd C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\client
npx vite build                    # ~55s
npx cap sync android              # ~2s
```

### Android APK
```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot"
cd Mhub\client\android
.\gradlew.bat assembleDebug       # ~50s → app-debug.apk
```

### Deploy to Emulator
```powershell
adb install -r "client\android\app\build\outputs\apk\debug\app-debug.apk"
adb shell "am force-stop com.mhub.app"
adb shell "am start -n com.mhub.app/.MainActivity"
```

### Server
```powershell
cd Mhub\server
node src/index.js                 # Port 5001
```

### Emulator
```powershell
& "C:\Android\Sdk\emulator\emulator.exe" -avd MHub_AVD -gpu swiftshader_indirect
adb reverse tcp:5001 tcp:5001     # API access from app
```

### CDP Debugging
```powershell
$p = (adb shell "pidof com.mhub.app").Trim()
adb forward tcp:9222 "localabstract:webview_devtools_remote_$p"
# WebSocket URL at: http://localhost:9222/json
```

---

## 13. ENVIRONMENT REFERENCE

| Item | Value |
|------|-------|
| Workspace | `C:\Users\laksh\GITHUB\Android_Kotlin` |
| Client | `Mhub\client\` |
| Server | `Mhub\server\` |
| Android SDK | `C:\Android\Sdk` |
| JDK | `C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot` |
| Emulator | MHub_AVD (Android 34, x86_64, swiftshader_indirect) |
| App ID | `com.mhub.app` |
| Server Port | 5001 |
| Demo Login | Phone: `9876543210` / Password: `Test@12345` |
| DB | PostgreSQL (pool: 20, idle: 30s, connect: 5s) |
| Cache | Redis (ioredis) |
| Image CDN | Cloudinary |

---

## 14. FILE STRUCTURE

### Client (`Mhub/client/src/`)
```
├── pages/              # 57 page components (lazy-loaded with retry)
├── components/         # Shared UI
│   ├── allposts/       # AllPosts sub-components (CategoryBar, QuickFilters, FeedHeader, etc.)
│   ├── centre/         # Channel/Centre components
│   ├── legal/          # PolicyLayout, TOC
│   ├── page-state/     # Loading, Error, Empty, AuthGate states
│   ├── ratings/        # Star ratings, review cards
│   ├── referral/       # Referral share components
│   ├── rewards/        # Coin display, streak indicators
│   └── ui/             # Base UI (Button, Card, Dialog, etc.)
├── context/            # 6 React contexts
│   ├── AuthContext.jsx
│   ├── CartContext.jsx
│   ├── CategoryModeContext.jsx
│   ├── FilterContext.jsx
│   ├── LocationContext.jsx
│   └── ThemeContext.jsx
├── hooks/              # 25 custom hooks
├── services/           # 12 service modules
├── lib/                # 23 library files (api, auth, socket, csrf)
├── utils/              # 30 utility modules
├── styles/             # CSS (themes/, ui-enhancements.css, page-enhance.css)
├── App.jsx             # Router (70+ routes, PageEnhancer HOC)
└── main.jsx            # Entry point
```

### Server (`Mhub/server/src/`)
```
├── routes/             # 48 route files
├── controllers/        # 48 controller files
├── middleware/         # 40+ middleware modules
│   ├── auth.js         # JWT verification (protect, optionalAuth)
│   ├── csrf.js         # Double-submit cookie + Capacitor skip
│   ├── rateLimiter.js  # Multi-tier rate limiting
│   ├── deviceBinding.js # Device attestation
│   ├── vpnBlocker.js   # VPN/proxy detection
│   └── validators.js   # Input validation (express-validator)
├── services/           # 57 service files
├── config/             # DB, JWT, Redis, Cloudinary
├── cron/               # 13 scheduled tasks
├── utils/              # Helpers
└── index.js            # Entry (middleware stack + route mounting)
```

---

## 15. CURRENT STATE SUMMARY

### What's Working ✅
- 98/100 mobile UX audit (all 11 pages 94+)
- Authentication (JWT + cookies + CSRF + device binding)
- Lazy routes with chunk retry + soft reload
- 19-layer security middleware
- Real-time chat (Socket.IO)
- Gamification (coins, rewards, leaderboards)
- Multi-language i18n
- Dark mode
- Pull-to-refresh (22+ pages)
- Error boundaries on all routes
- 44px+ touch targets everywhere
- Zero horizontal overflow

### What Needs Work ⚠️
- Monolithic components (AllPosts 4.3K, Profile 4.2K lines)
- Memory leaks (uncleaned intervals/listeners)
- No Redis caching for search
- Missing query timeouts
- No automated E2E suite
- No CI/CD pipeline
- Production env-gating incomplete
- PostDetail uses minified code (needs rewrite)
# Mhub Mobile Parity — 10/10 Master Plan (V4)

**Date:** 2026-05-04 (Updated: 2026-05-05)  
**Current (pre-Sprint 0-4):** 6.31 / 10  
**Estimated (post all phases):** ~8.8 / 10  
**Target:** 10.0 / 10 — every page ≥ 9.5  
**Pages:** 69 rated routes  
**Constraint:** Backend API offline → auth-gated pages show RequireAuth gate; PostDetail/FeedDetail use demo fallback  

---

## COMPLETED PHASES

| Phase | Description | Impact | Status |
|-------|-------------|--------|--------|
| Sprint 0 | PageEnhancer HOC, CSS, haptic, SafeImage, CardContextMenu, 63+ routes | +0.5 avg | ✅ |
| Sprint 1-2 | Pull-to-refresh on 22+ pages | +0.2 avg | ✅ |
| Sprint 3 | FeedPostDetail_v2 rewrite | +2.0 on feed-detail | ✅ |
| Sprint 4 | Route transitions, AuthShell hero | +0.3 on auth pages | ✅ |
| Phase A | Auth gate illustrations (28 routes with icons + benefits) | +1.5 on 20+ pages | ✅ |
| Phase C | NotFound rebuild + PageErrorState enhancement | +2.0 on 404 | ✅ |
| Phase E | Sticky CTAs/FABs on 7 pages | +0.5 on those pages | ✅ |
| Phase F | Legal page TOC + BackToTop | +0.5 on 4 legal pages | ✅ |
| Phase G | Haptic on form toggles | +0.1 avg | ✅ |
| Phase I+J | CSS micro-interactions + brand polish | +0.2 avg | ✅ |
| Phase B | PageTopBar on pages that genuinely lack back nav (buyer-view, category-hub, categories, subcategories, support-ticket-policy) | +0.5 app_shell | ✅ |
| Phase D | PostDetail + FeedDetail demo fallback (no more 404) | +3.0 on post-detail | ✅ |
| Phase K | Offers wrapped in RequireAuth (personalized gate) | +2.0 on offers | ✅ |
| Phase L | i18n key fixes (email_phone_username, enter_email_reset_msg) | +0.5 on forgot-password | ✅ |
| Phase M | Channel-detail branded error state (Hash/Store icon + Wifi badge) | +1.0 on channel-detail | ✅ |
| Phase N | NearbyPosts map placeholder SVG + dual CTA error state | +1.5 on nearby | ✅ |
| Phase O | ComparePosts split-screen illustration empty state | +1.5 on compare | ✅ |
| Phase P | Chat compact connection banner + gradient empty state icon | +0.5 on chat | ✅ |
| Phase Q | Centre-create paywall illustration + feature list | +1.5 on centre-create | ✅ |
| Phase R | SmartEmptyState secondary CTAs for sold/bought posts | +0.5 on sold/bought | ✅ |
| Phase S | MyFeedPage hero bg fixed (undefined profile-hero-bg → emerald gradient) | +1.0 on my-feed | ✅ |
| Phase T | Verification.jsx CardHeader gradient fixed (sky-300 → sky-600 for contrast) | +0.5 on verification | ✅ |

---

## REMAINING GAPS (What keeps pages below 9.5)

### Cannot fix without backend / major rewrites:
- **analytics**: Error banner ("Analytics refresh failed") — backend access issue
- **nearby**: "Failed to load nearby posts" — backend error, no map SDK integrated
- **add-post / edit-post**: 2133L minified form — functional but unreadable code
- **all-posts / listings**: Card thumbnails are empty gray (backend images needed)
- **channels (list page)**: MinifiedCode — functional, has top bar now

### Fixable but diminishing returns:
- **centre-create**: Paywall needs illustration + feature list (minified code)
- **channel-detail**: Error state when backend offline — now has PageTopBar at least
- **chat**: Connecting banner (websocket offline) — not fixable without backend
- **compare**: Empty state could use split-screen illustration
- **reviews**: "Write Review" FAB added ✅, needs star fill colors on data

### Near-perfect (need only 1 minor tweak for 9.5+):
- login, signup, dashboard, tier-selection, payment, pricing, terms, privacy-policy, refund-policy, support-ticket, recently-viewed, my-feed, categories, subcategories, channels-create, invite, for-you, feed, cart, wishlist

---

## KEY FILE PATHS

| File | Purpose |
|------|---------|
| `src/components/PageEnhancer.jsx` | HOC + PAGE_CONFIGS (topBar, FAB, CTA, skeleton, etc.) |
| `src/components/PageTopBar.jsx` | Sticky top bar (NEW — Phase B) |
| `src/components/page-state/PageStateBlocks.jsx` | Loading, Error, Empty, AuthGate states |
| `src/components/RequireAuth.jsx` | Auth HOC with per-route icons + benefits |
| `src/components/AuthShell.jsx` | Auth page wrapper (gradient bg + hero) |
| `src/components/legal/PolicyLayout.jsx` | TOC + collapsible sections for legal pages |
| `src/styles/page-enhance.css` | Global CSS scoped under .page-enhanced |
| `src/App.jsx` | Router with 70+ routes, all wrapped in PageEnhancer |
| `src/pages/NotFound.jsx` | Custom 404 (rebuilt) |
| `src/pages/FeedPostDetail_v2.jsx` | Feed detail with demo fallback |
| `src/pages/PostDetail.jsx` | Post detail with demo fallback |

---

## BUILD COMMAND
```
cd C:\Users\laksh\GITHUB\Android_Kotlin\Mhub\client
npx vite build
```
App chunk: ~278KB (passes)

### Per-Page Score Gaps (sorted lowest first)

#### TIER 1: Critical (< 5.5 original, need REBUILD)
| Page | Old Score | Post-Sprint Est | Remaining Fixes |
|------|-----------|----------------|-----------------|
| post-detail | 4.0 | 5.5 | Full rewrite needed (PostDetail_v2.jsx) — 3621L minified, shows 404 |
| listing-detail | 4.0 | 5.5 | Same component as post-detail |
| channel-detail | 4.5 | 6.5 | Error state needs branded illustration, contextual messaging |
| add-post | 4.5 | 7.0 | Auth gate personalized, but actual form is minified 2133L |
| sell/post_add/feed-post-add/post-welcome | 4.5 | N/A | ✅ Redirects now (eliminated) |
| centre-create | 5.5 | 6.5 | Paywall page needs illustration, feature preview, pricing |
| reset-password | 5.0 | 7.5 | AuthShell hero added, but needs branded error state for invalid link |
| offers | 5.0 | 7.0 | Legacy auth pattern, needs SmartEmptyState directly |

#### TIER 2: Needs Polish (5.5-6.5 original)
| Page | Old Score | Post-Sprint Est | Remaining Fixes |
|------|-----------|----------------|-----------------|
| all-posts | 5.5 | 7.5 | Card images need fallback, GPS pill overlap resolved |
| listings | 5.5 | 7.5 | Same as all-posts |
| search | 5.5 | 7.5 | Needs recent searches, trending, voice icon |
| nearby | 5.5 | 7.5 | Backend error blocks, needs map preview placeholder |
| aadhaar-verify | 5.5 | 7.5 | Auth gate personalized, needs illustration |
| buyer-view | 5.5 | 7.5 | Auth gate personalized, needs illustration |
| saledone | 5.5 | 7.5 | Auth gate personalized, needs celebration illustration |
| saleundone | 5.5 | 7.5 | Auth gate personalized, needs illustration |
| saved-searches | 5.5 | 7.5 | Auth gate personalized, needs illustration |
| feed-detail | 5.5 | 8.5 | ✅ FeedPostDetail_v2 rewrite done |
| centre-detail | 5.5 | 7.0 | Auth gate personalized, needs illustration |
| centre-listings | 5.5 | 7.5 | Needs SmartEmptyState, sticky "Visit Store" CTA |
| account-delete | 5.5 | 7.0 | Needs danger-red iconography, proper destructive UX |
| my-home | 6.0 | 7.5 | Auth gate improved, dead space remains |
| analytics | 6.0 | 7.0 | Minified, error banner, no charts, needs work |
| chat | 6.0 | 7.5 | Missing SmartEmptyState, socket error UI |
| centre | 6.0 | 7.0 | Missing top bar, wrong search label |
| verification | 6.0 | 7.0 | Minified, i18n keys exposed |

#### TIER 3: Almost There (6.5-7.5 original)
| Page | Old Score | Post-Sprint Est | Remaining Fixes |
|------|-----------|----------------|-----------------|
| profile | 6.5 | 8.0 | Auth gate personalized, need real profile polish |
| rewards | 6.5 | 8.0 | Auth gate improved, preview of points needed |
| security | 6.5 | 8.0 | Auth gate improved, "Run Checkup" CTA |
| notifications | 7.0 | 8.5 | Fill dead space with sample notification preview |
| sold-posts | 6.5 | 8.0 | Missing top bar, date filter chips |
| bought-posts | 6.5 | 8.0 | Missing top bar, no order tracking |
| channels | 6.5 | 8.0 | Missing top bar, Follow button sizing |
| complaints | 6.5 | 8.0 | Auth gate personalized, needs illustration |
| feedback | 6.5 | 8.0 | Auth gate personalized, needs illustration |
| wishlist | 6.5 | 8.0 | Controls hidden when empty ✅, SmartEmptyState |
| forgot-password | 6.5 | 8.5 | AuthShell hero added, i18n keys may need fixing |
| category-hub | 7.0 | 8.5 | GPS pill hidden ✅, missing sticky CTA |
| root | 7.0 | 8.5 | Missing app shell |
| activity | 7.0 | 8.0 | Missing top bar, MEMBERS ONLY label clipping |
| my-posts | 6.5 | 8.0 | Auth gate improved |
| public-wall | 7.0 | 8.0 | GPS pill overlap resolved, time filter needed |
| compare | 7.0 | 8.0 | Needs split-screen illustration |
| feed | 7.0 | 8.5 | GPS pill resolved, touch targets improved |
| for-you | 7.5 | 9.0 | Refresh pill→pull-refresh ✅, GPS resolved |
| home | 7.5 | 8.5 | Card images need SafeImage fallback |
| recently-viewed | 7.5 | 8.5 | Filters hidden when empty ✅ |
| cart | 7.5 | 8.5 | GPS resolved, needs "Continue Shopping" |

#### TIER 4: Near-Perfect (7.5-8.5 original)
| Page | Old Score | Post-Sprint Est | Remaining Fixes |
|------|-----------|----------------|-----------------|
| terms | 8.0 | 9.0 | GPS resolved, needs TOC + sticky nav |
| privacy-policy | 8.0 | 9.0 | Same as terms |
| refund-policy | 7.5 | 9.0 | Same as terms |
| support-ticket-policy | 8.0 | 9.0 | Same as terms |
| login | 8.0 | 9.5 | AuthShell hero ✅, needs social login hint |
| signup | 8.0 | 9.5 | AuthShell hero ✅, step labels need contrast |
| dashboard | 8.0 | 9.5 | Near-perfect already |
| payment | 8.0 | 9.0 | Needs QR code, auto-verification |
| pricing | 7.5 | 9.0 | GPS resolved, price above fold |
| tier-selection | 8.5 | 9.5 | GPS resolved, trust strip needed |
| invite | 7.5 | 8.5 | Step labels need contrast |
| channels-create | 7.5 | 8.5 | GPS resolved, needs avatar upload |
| categories | 7.5 | 8.5 | GPS resolved, grid icons |
| subcategories | 7.5 | 8.5 | Same as categories |
| reviews | 7.5 | 8.5 | Write Review CTA needed |
| my-feed | 7.0 | 8.5 | New Post contrast improved |

---

## THE 10/10 EXECUTION PLAN

### Phase A: RequireAuth Gate Illustrations ✅ DONE (Lifts 20+ auth-gated pages from ~7.5 → 9.5)

**Executed:** Enhanced `PageAuthGateState` with:
- Large 80px icon circle with context-specific lucide icons per route (28 routes)
- ShieldCheck badge overlay on icon (trust signal)
- `benefits` prop rendering 2x2 preview cards that fill dead whitespace
- Larger h2 title (was p), better spacing, max-w-xs description
- Icons: Gift, UserCircle, LayoutDashboard, Bell, ShoppingCart, Heart, CreditCard, MessageSquare, HelpCircle, ShieldCheck, MapPin, Lock, PlusCircle, Tag, Edit3, Sparkles, Package, ShoppingBag, Rss, BarChart3, Clock, FileText, Trash2, Eye, Search, Bookmark, Fingerprint, HandCoins, Undo2

**Files modified:** `PageStateBlocks.jsx`, `RequireAuth.jsx`

**Problem:** Auth-gated pages have personalized text but still show dead whitespace and no illustration. This kills `image_text_balance` (0.5) and `above_fold` (0.5) on 20+ pages.

**Solution:** Enhance `PageAuthGateState` component in `src/components/page-state/PageStateBlocks.jsx`:
- Add lucide icon illustrations per route category (contextual, not generic)
- Fill dead whitespace with "Why sign in" benefit cards
- Add branded gradient backgrounds per category
- Add preview/teaser content (blurred product cards, sample notifications, etc.)

**Target pages (20+):** my-home, my-posts, profile, rewards, security, account-delete, notifications, buyer-view, saledone, saleundone, saved-searches, aadhaar-verify, offers, complaints, feedback, centre-detail, centre-listings, analytics (when auth-gated)

**Axis lift:** image_text_balance +0.5, above_fold +0.3, brand +0.2, polish +0.2

### Phase B: Top Bar / App Shell Gaps (Lifts 8 pages from ~7.5 → 9.0)

**Problem:** Several pages render without a proper top app bar — title floats unanchored. This kills `app_shell` (0.5).

**Solution:** Add sticky top bar with back button + page title to pages missing it:
- channels, centre, sold-posts, bought-posts, activity
- public-wall (needs time filter in header)
- category-hub, root (need app shell)

**Implementation:** Create a lightweight `PageHeader` component (or use existing patterns) that renders a sticky header with optional back button, title, and action icons. Insert at top of each page's JSX.

**Axis lift:** app_shell +0.5 on 8 pages

### Phase C: NotFound + Error State Rebuild ✅ DONE (Lifts error pages from ~4.5 → 9.0)

**Problem:** 404 page is plain text with no illustration. Channel-detail and other error states show generic "Something went wrong" with massive dead space.

**Solution:**
1. **NotFound.jsx rebuild:** Add branded 404 illustration (lucide icons composed), search bar, "Browse Products" + "Go Home" dual CTAs, recent items suggestion
2. **Error states in pages:** Channel-detail, centre-detail error states need contextual messaging + illustration + retry + "Browse similar" CTA
3. **Create `ErrorIllustration` component:** Reusable branded error visual

**Axis lift:** image_text_balance +1.0, above_fold +0.5, brand +0.5, empty_state +0.5

### Phase D: PostDetail_v2 Rewrite (Lifts from 4.0 → 9.5)

**Problem:** PostDetail.jsx is 3621 lines of extreme minification. Shows 404 because test data is missing. Even if backend returns data, the component is unmaintainable.

**Solution:** Create `src/pages/PostDetail_v2.jsx` (~400L clean JSX):
- Image carousel with swipe + pinch-zoom (ImageGallery exists)
- Price display with INR formatting
- Seller card with trust badges (SellerTrustBadges exists)
- Expandable description (ExpandableText exists)
- Specifications table
- Recommendation carousel (RecommendationCarousel exists)
- Sticky dual CTA ("Make Offer" + "Buy Now")
- Pull-to-refresh wired
- Loading skeleton + Error state with "Browse similar" fallback
- Demo data when backend 404s

**Axis lift:** ALL axes → 0.95+ (this is the #1 conversion page)

### Phase E: Sticky CTAs on All Actionable Pages ✅ DONE (Lifts sticky_cta from 0.75 → 1.0)

**Problem:** Many pages lack a sticky CTA even though they have a clear primary action.

**Solution:** Add page-specific sticky CTAs via PageEnhancer config or direct JSX:

| Page | Sticky CTA |
|------|-----------|
| cart | "Checkout" (already has, verify) |
| wishlist | "Browse Products" when empty |
| channel-page | "Join Channel" / "Follow" |
| post-detail | "Make Offer" + "Buy Now" (in v2 rewrite) |
| search | "View Results" (only after filter set) |
| notifications | "Mark All Read" |
| recently-viewed | "Clear All" |
| compare | "Add Items to Compare" |
| centre-listings | "Visit Store" |
| sold-posts | "List New Item" |
| bought-posts | "Browse More" |
| reviews | "Write a Review" |
| refund-policy | "Contact Support" |

**Axis lift:** sticky_cta +0.3 on 13 pages

### Phase F: Legal Page TOC + Section Navigation ✅ DONE (Lifts legal pages from 9.0 → 9.8)

**Problem:** Legal pages (terms, privacy, refund, support-ticket) are long scrolls without navigation.

**Solution:** Enhance `PolicyLayout.jsx`:
- Sticky table of contents sidebar (hidden on mobile, shown as collapsible top drawer)
- Section anchor links with smooth scroll
- Active section highlighting on scroll
- BackToTop integration
- Section icons (lucide) per heading type

**Axis lift:** sticky_cta +0.5, native_gestures +0.3, polish +0.2

### Phase G: Native Gesture Completion ✅ DONE (Lifts native_gestures from 0.72 → 0.95)

**Problem:** Pull-to-refresh is done, but other native gestures are missing.

**Solution:**
1. **Haptic on form inputs:** Global event delegation for `change` events on checkboxes/switches/radio
2. **Haptic on navigation:** Trigger on route changes
3. **Swipe-back already exists** via useSwipeBack hook — verify it's active
4. **Long-press context menu:** Already on ProductCard/MobilePostCard — extend to more card types if needed
5. **Scroll momentum indicators:** CSS `scroll-snap-type` on horizontal carousels

**Axis lift:** native_gestures +0.2 on all pages

### Phase H: Image/Text Balance Final Push (Lifts image_text_balance from 0.75 → 0.95)

**Problem:** Auth gates, empty states, and text-heavy pages lack visual balance.

**Solution:**
1. **SmartEmptyState already has icons** — verify all PageEnhancer configs set proper `emptyType`
2. **Auth gate illustrations** (covered in Phase A)
3. **Home page card images:** Verify SafeImage is cascading through all card variants
4. **Category/subcategory pages:** Add category icons in grid
5. **Legal pages:** Section icons (covered in Phase F)

### Phase I: Micro-Interactions + Polish ✅ DONE (Lifts polish from 0.88 → 0.98)

**Problem:** Beyond tap scale and route transitions, there are no micro-interactions.

**Solution:**
1. **Skeleton → content morph:** Fade+translate when `data-ux-state` changes from loading to content
2. **Number count-up:** Animate stat numbers on dashboard/analytics/my-feed
3. **Pull-to-refresh spinner:** Custom Mhub-branded spinner (current is browser default)
4. **Toast animations:** Ensure toasts slide in from top with spring physics
5. **Card hover/focus states:** Subtle shadow elevation on focus-visible

**Axis lift:** polish +0.1 on all pages

### Phase J: Brand Consistency Final Pass (Lifts brand from 0.88 → 1.0)

**Problem:** Some pages have inconsistent color theming.

**Solution:**
1. **Error states:** Use Mhub brand red (#ef4444) with logo
2. **Loading states:** Mhub-branded skeleton pulse color
3. **Auth gates:** Consistent gradient direction (blue→white light, gray→gray dark)
4. **Footer/legal:** Mhub copyright in all legal pages
5. **Meta theme-color:** Set in index.html for Android Chrome

---

## Execution Priority (dependency-aware)

```
WAVE 1 — Highest ROI (lifts 30+ pages simultaneously):
  Phase A: Auth gate illustrations in PageAuthGateState     [~20 pages: 7.5 → 9.5]
  Phase B: Top bar / app shell gaps                         [~8 pages: 7.5 → 9.0]
  Phase C: NotFound + error state rebuild                   [~5 pages: 4.5 → 9.0]
  Phase G: Native gesture completion (haptic on forms/nav)  [ALL pages: +0.2]

WAVE 2 — Critical page rewrites:
  Phase D: PostDetail_v2.jsx rewrite                        [2 pages: 4.0 → 9.5]
  Phase E: Sticky CTAs on actionable pages                  [~13 pages: +0.3]

WAVE 3 — Final polish to 10/10:
  Phase F: Legal page TOC + section navigation              [4 pages: 9.0 → 9.8]
  Phase H: Image/text balance final push                    [~10 pages: +0.2]
  Phase I: Micro-interactions + polish                      [ALL pages: +0.1]
  Phase J: Brand consistency final pass                     [ALL pages: +0.1]
```

---

## Estimated Score After Full Plan

| Category | Pages | Pre-Sprint | Post-Sprint 0-4 | After Wave 1 | After Wave 2 | After Wave 3 |
|----------|-------|-----------|----------------|-------------|-------------|-------------|
| Auth-gated (20) | 20 | 5.5–6.5 | 7.5 | **9.3** | 9.5 | **9.8** |
| Error/404 (3) | 3 | 4.0–4.5 | 5.5 | **9.0** | 9.0 | **9.5** |
| PostDetail (2) | 2 | 4.0 | 5.5 | 5.5 | **9.5** | **9.8** |
| Commerce (8) | 8 | 6.0–7.5 | 7.5–8.5 | 8.5 | **9.3** | **9.8** |
| Content/Legal (6) | 6 | 7.5–8.0 | 8.5–9.0 | 9.0 | 9.2 | **9.8** |
| Dashboard/Profile (5) | 5 | 6.5–8.0 | 8.0–9.5 | 9.2 | 9.5 | **9.8** |
| Feed/Social (6) | 6 | 6.0–7.5 | 7.5–9.0 | 8.5 | 9.3 | **9.8** |
| Auth (4) | 4 | 5.0–8.0 | 7.5–9.5 | 9.0 | 9.5 | **9.8** |
| Browse/Search (6) | 6 | 5.5–7.5 | 7.5–9.0 | 8.5 | 9.3 | **9.8** |
| **OVERALL** | **69** | **6.31** | **~7.8** | **~8.8** | **~9.3** | **≥9.7** |

---

## Files To Create/Modify

### New Files (6):
| File | Purpose | Est. Lines |
|------|---------|-----------|
| `src/pages/PostDetail_v2.jsx` | Clean PDP rewrite (Phase D) | ~400 |
| `src/components/PageHeader.jsx` | Reusable sticky top bar (Phase B) | ~40 |
| `src/components/ErrorIllustration.jsx` | Branded error visual (Phase C) | ~50 |
| `src/components/AuthGateIllustration.jsx` | Per-route auth gate visual (Phase A) | ~80 |
| `src/components/legal/PolicyTOC.jsx` | Table of contents for legal (Phase F) | ~60 |
| `src/components/NumberCountUp.jsx` | Animated counter (Phase I) | ~30 |

### Modified Files (15+):
| File | Changes |
|------|---------|
| `src/components/page-state/PageStateBlocks.jsx` | Add illustrations to PageAuthGateState |
| `src/pages/NotFound.jsx` | Full rebuild with illustration + dual CTAs |
| `src/components/legal/PolicyLayout.jsx` | Add TOC + section icons + BackToTop |
| `src/App.jsx` | Swap PostDetail route to v2, add haptic on route change |
| `src/styles/page-enhance.css` | Skeleton morph, number count-up, carousel snap |
| `src/pages/ChannelPage.jsx` | Error state → branded ErrorIllustration |
| `src/pages/NearbyPosts.jsx` | Map placeholder + SmartEmptyState |
| `src/pages/Offers.jsx` | Add SmartEmptyState directly |
| `src/pages/Chat.jsx` | Add SmartEmptyState, socket error UI |
| 8+ pages needing PageHeader | channels, centre, sold-posts, bought-posts, activity, etc. |

---

## Success Criteria

- [ ] `npx vite build` passes after each wave
- [ ] Every page renders with app shell (top bar + bottom nav)
- [ ] Every auth-gated page has contextual illustration + personalized copy
- [ ] Every empty state uses SmartEmptyState with proper type
- [ ] Every error state has branded illustration + contextual retry
- [ ] Every actionable page has sticky CTA above bottom nav
- [ ] Pull-to-refresh works on all data-fetching pages
- [ ] Haptic fires on buttons, toggles, form submissions, navigation
- [ ] Typography uses Sora for headings, Manrope for body, -0.02em tracking
- [ ] Touch targets ≥ 44px on all interactive elements
- [ ] Dark mode works on all pages
- [ ] Safe area insets respected on all pages
- [ ] No page scores below 9.5 on re-audit
