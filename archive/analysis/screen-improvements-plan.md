# MHub Application: Comprehensive Screen Analysis & Improvement Plan

**Status**: Planning & Analysis  
**Goal**: To evaluate the current state of each application screen and define actionable features to add, refine, and improve. Each screen includes 5-10 targeted improvements.

---

## 1. Home Screen (Category Hub)
**Current State**: Serves as the primary navigation landing page with a hero banner and category grid.

**Features to Add:**
1. **Dynamic Greeting:** Add a personalized greeting (e.g., "Good Morning, [Name]!") based on the user's local time zone.
2. **"Jump Back In" Section:** Add a horizontal scrolling list of the user's 5 most recently viewed items right below the categories.
3. **Trending Tags:** Add pill-shaped chips below the search bar highlighting current trending search terms in the marketplace.

**Features to Make Better:**
4. **Shimmer Loading:** Replace the generic circular progress indicator with skeletal shimmer UI blocks that match the shape of the category grid before data loads.
5. **Hero Banner Interactivity:** Improve the hero banner by turning it into a swipeable carousel to accommodate seasonal promotions or announcements.
6. **Category Icons:** Upgrade static emojis/icons to subtle Lottie animations that play once upon screen load or when tapped.

**General Improvements:**
7. **Pull-to-Refresh:** Implement swipe-to-refresh functionality allowing users to reload the banner and trending elements.
8. **Scroll Behavior:** Hide the top app bar dynamically when scrolling down to maximize screen real estate, revealing it upon scrolling up.

---

## 2. Explore / All Posts Screen (Marketplace)
**Current State**: A comprehensive list of all active listings with basic sorting and filtering.

**Features to Add:**
1. **Map View Toggle:** Add an interactive map view allowing users to see listings geographically based on their proximity.
2. **Advanced Filtering Drawer:** Introduce a side or bottom drawer for deep filtering (Price Range slider, Condition checkboxes, Distance radius).
3. **Verified Seller Badge:** Add a distinct, trust-building badge directly onto the cards of items posted by KYC-verified sellers.
4. **"Quick Save" Gesture:** Allow users to double-tap a card or swipe right to instantly add the item to their Wishlist.

**Features to Make Better:**
5. **Image Loading Performance:** Optimize the `AsyncImage` caching and loading strategy to eliminate the minor 40-60 frame drops currently seen during fast scrolling.
6. **Empty States:** Enhance the "No Results" view with an actionable button like "Save this Search" to notify the user when matching items are posted.
7. **Grid vs. List Toggle:** Improve the current density toggle by fully supporting a 2-column masonry grid for users who prefer scanning images over reading titles.

**General Improvements:**
8. **Sticky Search Header:** Ensure the search and filter bar remains pinned to the top of the screen so users don't have to scroll all the way up to adjust filters.

---

## 3. For You Screen (Recommendations)
**Current State**: A feed of items intelligently suggested based on user behavior.

**Features to Add:**
1. **Contextual Tooltips:** Add micro-copy above recommendations (e.g., "Because you viewed Smartphones") to explain why the item is being shown.
2. **"Not Interested" Feedback:** Add a thumbs-down or "Hide" button on items to allow users to actively tune the recommendation algorithm.
3. **Topic Clustering:** Group similar recommended items together in horizontal carousels (e.g., "Laptops you might like") instead of a purely vertical list.

**Features to Make Better:**
4. **Distinguishing Sponsored Content:** Make sponsored/promoted posts visually distinct from organic AI recommendations using a subtle background tint or "Ad" label.
5. **Pagination Pre-fetching:** Improve the continuous scrolling by triggering the `loadMore()` API call when the user is 5 items away from the bottom, rather than at the very end, preventing loading pauses.

**General Improvements:**
6. **Cross-Fade Transitions:** Add smooth UI cross-fade animations when the recommendation list refreshes or re-orders.
7. **Onboarding Questionnaire:** For new users with no history, prompt a quick 3-step "What are you looking for?" UI overlay to kickstart the recommendation engine.

---

## 4. Knowledge Feed (Community & News)
**Current State**: A non-commercial space for sharing insights, news, and tips.

**Features to Add:**
1. **Rich Media Support:** Add the ability for users to attach up to 4 images to their knowledge posts.
2. **Threaded Comments:** Implement a nested view when opening a post to allow replies to specific comments rather than a flat list.
3. **Top Contributor Badges:** Introduce gamified badges for users whose posts consistently receive high engagement.
4. **Clickable Hashtags:** Allow users to tag posts (e.g., `#SafetyTips`) and click them to filter the feed by that topic.

**Features to Make Better:**
5. **"Read More" Animation:** Make the inline expansion of text smooth (animated expansion) rather than an instant snap.
6. **Read-Time Estimator:** Calculate and display an estimated read time (e.g., "2 min read") next to the timestamp for lengthy posts.
7. **Composer Enhancements:** Improve the "Share Knowledge" screen with basic rich text formatting tools (bold, italics, bullet points).

**General Improvements:**
8. **Bookmark Functionality:** Make the "Bookmark" icon fully functional, saving the specific post to a separate "Saved Articles" tab in the user's profile.

---

## 5. Rewards Screen (Gamification)
**Current State**: Interactive scratch cards and leaderboard system.

**Features to Add:**
1. **Daily Login Streak:** Add a visual "streak" counter (e.g., "🔥 5 Day Streak!") that grants bonus coins for consecutive daily opens.
2. **Redemption Store:** Add a "Redeem" tab where users can spend their earned coins on platform perks (e.g., listing highlights, partner discounts).
3. **Tier Progression UI:** Add a visual progress bar indicating how many more points/actions are needed to reach the next leaderboard rank (Bronze -> Silver -> Gold).

**Features to Make Better:**
4. **Scratch Mechanics:** Enhance the scratch card interaction with haptic feedback (vibrations) and realistic particle animations when "scratching" the screen.
5. **History Log Clarity:** Improve the "Coin History" list by grouping transactions by month and displaying clearer positive (green) and negative (red) visual indicators.
6. **Rule Tooltips:** Improve the accessibility of the gamification rules by replacing the static text with an interactive "How to earn" bottom sheet.

**General Improvements:**
7. **Push Notifications:** Integrate local scheduling to send a notification when a new scratch card becomes available.
8. **Share Milestones:** Add a "Share my Rank" button allowing users to post their leaderboard position to the Knowledge Feed or external social media.

---

## 6. Post Detail Screen (Single Listing)
**Current State**: Full view of a marketplace item, its price, seller details, and description.

**Features to Add:**
1. **Fullscreen Image Gallery:** Add a lightbox overlay allowing users to tap images, swipe through them full-screen, and pinch-to-zoom.
2. **Seller Rating Card:** Add a dedicated, clickable summary card showing the seller's star rating and recent reviews directly on the listing page.
3. **"Similar Items" Carousel:** Automatically append a horizontal scrolling list of 5-10 visually or categorically similar items at the very bottom of the page.

**Features to Make Better:**
4. **Sticky Action Bar:** Ensure the "Buy Now" or "Make Offer" buttons stick to the bottom of the screen regardless of how far the user scrolls down the description.
5. **Specifications Table:** Improve the display of custom attributes (brand, condition, year) by using a clean, collapsible 2-column grid rather than inline text.
6. **Report Button Prominence:** Move the "Report Listing" feature from a hidden top-right menu to a clearer, dedicated safety section at the bottom of the post.

**General Improvements:**
7. **Breadcrumb Navigation:** Display clickable breadcrumbs at the top (e.g., `Home > Electronics > Phones > iPhone`) for easier upwards navigation.
8. **Share via QR Code:** Add an option in the share menu to generate a scannable QR code for the specific listing.

---

## 7. Profile, Drawer & Settings Screen
**Current State**: User management, personal details, settings, and app navigation via side-drawer.

**Features to Add:**
1. **Manual Theme Override:** Add a quick-toggle switch in Settings to force Light/Dark mode independently of the system default.
2. **Vacation Mode:** Implement a toggle allowing sellers to temporarily hide all their active listings without deleting them while they are unavailable.
3. **Data Export:** Add a privacy compliance feature allowing users to request a downloadable JSON archive of their data and posts.
4. **Biometric Login:** Add an option to require FaceID/Fingerprint authentication when opening the app or accessing sensitive settings.

**Features to Make Better:**
5. **Avatar Upload Cropper:** Improve the profile picture upload flow by integrating an image cropper/rotator before the image is saved to the server.
6. **Notification Management:** Consolidate notification preferences into granular toggles (e.g., separate switches for "New Messages", "Price Drops", "Marketing").
7. **Tab Separation:** Improve the Profile UI by cleanly separating "Buying Activity" (Orders, Wishlist) from "Selling Activity" (My Posts, Sales) using a TabRow.

**General Improvements:**
8. **Storage Management:** Add a "Clear Cache" utility button within settings to allow users to free up device storage used by loaded images.
9. **Version Info:** Add a clickable app version number at the bottom of the drawer that copies diagnostic device info to the clipboard for support tickets.