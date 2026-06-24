I have reorganized and rephrased the entire document into a structured page-wise implementation document. Each section includes:

* Current Issues / Bugs

* Missing Features

* UI/UX Improvements

* Functional Requirements

* Detailed Implementation Plan

### 1. Home / Landing Page

### Current Issues

* Home page currently contains unnecessary navigation elements.

* Top navigation bar appears where it should not.

* Bottom navigation bar appears where it should not.

* Jump-back controls are visible unnecessarily.

### Required Behavior

* Home page should remain a clean landing screen.

* Display only:

  * Welcome Section

  * Four Category Icons

* Each category should behave as an independent marketplace/module.

* Clicking a category should navigate directly to the corresponding All Posts page.

### UI/UX Improvements

* Use large, visually distinct category cards.

* Add category icons and short descriptions.

* Optimize spacing for mobile usability.

### Implementation Plan
if had then:

1. Remove top navbar from Home page.

2. Remove bottom navbar from Home page.

3. Remove jump-back controls.

4. Redesign Home page layout.

5. Implement category-based navigation routing.

6. Test navigation to all marketplace modules.

### 2. All Posts Page

### Current Issues / Bugs



* Subcategories have poor UI/UX.

* Search not functioning correctly.

* Compare feature not working.

* Filter panel lacks Close button.

* Posts load slowly.

* Infinite scrolling is delayed.

* App freezes during heavy usage.

* Detailed post view missing.

* Action button shows "View" instead of "View Details".

### Missing Features

* Quick Filters

* Subcategory Filters

* Advanced Filters

* Sort By options

* Featured Posts

* Premium Posts

* Boosted Posts

* Recently Viewed

* Saved/Wishlist

* Cart

* Notifications

### Required Search Behavior

Search must work on:

* Title

* Description

* Category

* Subcategory

* Tags

* Seller Information

* Location

* Other metadata

### Required Filters

* Category

* Subcategory

* Location

* Language

* Price Range

* Seller Type

* Featured Posts

* Premium Posts

* Boosted Posts

* Recently Added

### Required Sorting

* Latest

* Oldest

* Most Popular

* Price Low to High

* Price High to Low

* Most Viewed

* Featured First

* Premium First

### Detailed Post View Requirements

* Complete post information

* Featured options

* Boost options

* Premium promotion options

* Related posts

* Featured recommendations

* Boosted recommendations

* Premium recommendations

### Implementation Plan

1.in top navbar we had heart icon  which indicates  wishlist page so that is confusing with like symbol so for wishlist i.e. saving we had other icon which is save symbol which we had in instagram as well like that we need to have.

2. Redesign subcategory section.

3. Implement full-text search.

4. Build advanced filter system.

5. Add sorting functionality.

6. Rebuild Compare feature.

7. Add Close button to filters.

8. Implement detailed post page.

9. Add wishlist, cart, and notification icons.

10. Optimize pagination and infinite scroll.

11. Optimize image loading and caching.

12. Ensure parity with web application.

### 3. Feed / My Feed Module

### Current Issues / Bugs

* Feed functionality unclear.

* Publishing page incomplete.

* Users cannot publish posts.

* Bottom navbar missing Feed tab.

* "[TE]" placeholders appear in UI.

### Required Features

* Create Feed Post

* Edit Feed Post

* Save Draft

* Preview Post

* Publish Post

* Delete Post

* Manage Feed Posts

### Publishing Workflow

1. Open Add Feed page via + button.

2. Enter post details.

3. Upload media.

4. Validate fields.

5. Save draft if needed.

6. Preview post.

7. Publish via API.

8. Show success confirmation.

### Implementation Plan

1. Add Feed tab to bottom navbar.

2. Create Add Feed page.

3. Implement media upload support.

4. Add draft management.

5. Integrate publishing APIs.

6. Add error handling and retry logic.

7. Remove all "[TE]" placeholders.

8. Test complete Feed workflow.

### 4. Add Post / Seller Posting Module

### Current Issues

* Seller posting workflow is incomplete.

* Final submission fails.

* Validation is unreliable.

### Required Features

* Create post

* Edit post

* Save draft

* Upload images/videos

* Preview listing

* Publish listing

* Manage existing listings

### Implementation Plan

1. Rebuild Add Post page.

2. Implement multi-step form.

3. Add validation rules.

4. Integrate media upload APIs.

5. Add draft saving.

6. Implement publish API.

7. Add success and failure states.

8. Match web application behavior.

### 5. Rewards Module

### Current Issues / Bugs

* Many web features missing.

* Referral chain incomplete.

* Spin Wheel may be static.

* Daily Secret Code unclear.

* Rewards Activity underdeveloped.

* Tier Progression confusing.

* Impact Dashboard unclear.

### Required Features

### Referral System

* Level 1 referrals

* Level 2 referrals

* Level 3 referrals

* Referral earnings

* Growth metrics

### Rewards Activity

* Reward history

* Referral earnings

* Bonus history

* Daily claims

* Spin history

* Transactions

### Tier Progression

* Current tier

* Next tier

* Benefits

* Progress required

### Implementation Plan

1. Audit all web rewards features.

2. Implement referral hierarchy.

3. Make rewards dynamic per user.

4. Implement real-time reward calculations.

5. Redesign Rewards Activity page.

6. Redesign Tier Progression.

7. Add tooltips and explanations.

8. Test reward distribution flows.

### 6. For You Page

### Current Issues

* Page design is vague.

* Back button navigates incorrectly.

* Header is oversized.

* Missing quick actions.

### Required Features

* Add to Cart

* Save

* Share

* Compare

* Other quick actions

### UI/UX Improvements

* Use same styling as All Posts.

* Reduce header height.

* Remove unnecessary notification icon if unused.

### Implementation Plan

1. Rebuild page using All Posts design system.completely rebuild for-you page  based on referring to allposts page.

2. Remove incorrect back navigation.

3. Add quick-action buttons.

4. Optimize card layout.

5. Test navigation behavior.

### 7. Cart & Wishlist

### Current Issues

* Cart items disappear.

* Wishlist loading fails.

* Wrong heart icon shown in top navbar.

### Required Changes

* Use proper Wishlist/Save icon instead of heart.

* Ensure cart persistence.

* Ensure wishlist synchronization.

* Remove My Offers page if not required.

### Implementation Plan

1. Fix cart API integration.

2. Implement local persistence.

3. Fix wishlist loading issues.

4. Replace top navbar icon.

5. Remove deprecated pages.

### 8. Recently Viewed

### Current Issues

* Recently Viewed page not working.

* Viewed content is not tracked.

### Required Features

* Track viewed posts.

* Track feed posts.

* Track product listings.

* Display history chronologically.

### Implementation Plan

1. Implement view tracking service.

2. Store recent items locally/server-side.

3. Build Recently Viewed page UI.

4. Add clear history option.

### 9. Profile Module

### Current Issues

* Profile information not visible.

* Edit button beside Share/Verify KYC is unnecessary.

* Preferences page not working.

* Location selection is difficult.

* Referral codes missing.

### Required Features

### Personal Information

* Display existing data.

* Show empty fields as N/A.

* Allow editing and saving.

### Preferences

* Display selected values.

* Allow updates.

* Save changes successfully.

### Location Selection

* Country dropdown with search.

* State dropdown with search.

* District dropdown with search.

* City dropdown with search.

### Implementation Plan

1. Remove unnecessary edit button.

2. Redesign Profile page sections.

3. Add expandable/collapsible sections.

4. Implement searchable dropdowns.

5. Auto-generate referral codes.

6. Test profile update APIs.

### 10. Navigation & Layout Consistency

### Current Issues

* Hamburger menu close button fails.

* Back navigation inconsistent.

* Some pages lack bottom navbar.

* Sale Done page missing back button.

### Required Navigation Rules

* All internal pages should show bottom navbar.

* Bottom navbar should contain:

  * All Posts

  * Feed

  * For You

  * Rewards

  * Profile

  * More

* Hamburger menu pages should either:

  * Not show back button, or

  * Redirect to All Posts.

### Implementation Plan

1. Fix hamburger close button.

2. Standardize back navigation behavior.

3. Add bottom navbar to all internal pages.

4. Add back button to Sale Done page.

5. Test navigation across entire app.

### 11. Language Switching

### Current Issues

* Translations are incomplete.

* UI does not update consistently.

### Required Coverage

* Categories

* Subcategories

* Labels

* Menus

* Buttons

* Post data

* Screen content

* UI elements

### Implementation Plan

1. Audit all localization keys.

2. Replace hardcoded text.

3. Implement dynamic language reload.

4. Test all supported languages.

### 12. Premium & Centre Management

### Current Issues

* Centre creation eligibility unclear.

* Trial logic missing.

* Premium checks inconsistent.

### Required Business Rules

* Premium users can create Centres.

* New users receive 7-day trial.

* After trial, Centre creation is locked.

* Non-premium users see upgrade prompt.

### Implementation Plan

1. Implement trial tracking.

2. Implement subscription validation.

3. Add upgrade screen.

4. Document complete Centre workflow.

5. Test trial expiry scenarios.

### 13. Performance & Scalability

### Affected Pages

* All Posts

* Feed

* My Posts

* For You

* My Home

* Wishlist

### Required Optimizations

* API call optimization

* Pagination optimization

* Infinite scroll optimization

* Image lazy loading

* Data caching

* Memory management

* Network request batching

* Render optimization

### Implementation Plan

1. Conduct performance profiling.

2. Identify expensive renders.

3. Implement lazy loading.

4. Add caching layer.

5. Optimize API payloads.

6. Test under high user load.

### 14. Platform-Wide Audit & Web Parity

### Audit Scope

* Missing features

* Half-implemented features

* Non-functional features

* UI inconsistencies

* Navigation issues

* Performance bottlenecks

### Required Deliverables

* Screen-by-screen comparison with web app.

* Feature parity report.

* UI/UX rating for each screen.

* Functional completeness rating.

* Performance rating.

* Prioritized implementation roadmap.

### Final Implementation Roadmap

### Phase 1 – Critical Bugs

1. Navigation fixes

2. Hamburger close button

3. Back button issues

4. Feed publishing fix

5. All Posts publishing fix

6. Cart/Wishlist synchronization

7. Profile data visibility

### Phase 2 – Core Features

1. Search

2. Filters

3. Sorting

4. Compare

5. Detailed Post View

6. Recently Viewed

7. Referral System

8. Premium Trial System

### Phase 3 – UI/UX Rebuild

1. All Posts redesign

2. For You redesign

3. Rewards redesign

4. Profile redesign

5. Subcategory redesign

### Phase 4 – Performance

1. API optimization

2. Caching

3. Image optimization

4. Pagination tuning

5. Memory optimization

### Phase 5 – Web Parity & QA

1. Feature parity audit

2. Regression testing

3. Load testing

4. Localization testing

5. Production readiness review

Expected Outcome

After implementing the above roadmap, the Android application will achieve:

* Full feature parity with the web application

* Stable publishing workflows

* Consistent navigation

* Scalable performance

* Complete rewards ecosystem

* Reliable profile management

* Advanced search and filtering

* Production-ready user experience
