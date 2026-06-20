• The top navigation bar is missing on the All Posts page. Add a proper header similar to the web application, including relevant actions and navigation options.

• Subcategories on the All Posts page need significant UI/UX improvements. They should be displayed in a more interactive, visually appealing, user-friendly, and easily discoverable manner.

• When the hamburger menu is opened and the user navigates to any page, the back button is not functioning correctly. Review and fix the navigation flow across all hamburger menu pages.

• Centre creation should be restricted to Premium users only. Non-Premium users should see a clear Premium Subscription prompt or upgrade screen when attempting to access this feature.

• New users should receive a 7-day trial period during which they can create and use Centres. Once the trial expires, Centre creation should be locked and require an active Premium subscription.

• The complete Centre Creation workflow is currently unclear. Review and document the end-to-end process, user eligibility checks, subscription validation, trial handling, creation flow, and access restrictions.

• The My Feed module requires a complete functional review. The current behavior, data flow, and content visibility logic are unclear and need validation.

• The Feed Post Publishing page is incomplete and not functioning correctly. Users are currently unable to successfully publish feed posts.

• Review and fix the entire Feed Post publishing workflow, including form validation, media uploads, draft handling, API integration, error handling, submission process, and successful post creation confirmation.

• Ensure that users can create, edit, save, preview, publish, and manage feed posts without errors, matching the expected behavior available in the web application.
• Similar to the Feed module, the All Posts publishing workflow is not functioning correctly. Users are encountering errors during the final submission and publishing stage after completing all required steps.

• Review and fix the complete All Posts creation and publishing process, including validation, media uploads, API integration, draft handling, submission workflow, error handling, and successful post publication.

• The Feed page displays unexpected placeholders such as "[TE]" in various locations, especially when accessing the three-dot (More Options) menu on posts.

• Investigate the root cause of all "[TE]" text occurrences, which may be related to missing translations, localization keys, UI rendering issues, or incomplete implementations. Replace them with proper labels and user-friendly text throughout the application.

• The Compare functionality on the All Posts page is not working as expected. When users select two or more posts and click Compare, the comparison view either fails to load or does not function correctly.

• Review and rebuild the Compare feature to match the web application experience, ensuring accurate side-by-side comparison of selected posts.

• The search functionality on the All Posts page is not working effectively. Searches should return relevant results based on:

* Post Title
* Description
* Category
* Subcategory
* Tags
* Seller Information
* Location
* Other searchable metadata

• Build a comprehensive filtering system on the All Posts page with useful and user-friendly filters such as:

* Category
* Subcategory
* Location
* Language
* Price Range
* Seller Type
* Featured Posts
* Premium Posts
* Boosted Posts
* Recently Added Posts
* Other relevant business filters

• Implement a robust Sort By functionality with options such as:

* Latest
* Oldest
* Most Popular
* Price Low to High
* Price High to Low
* Most Viewed
* Featured First
* Premium First

• The All Posts page experiences multiple performance issues, including:

* Slow loading of posts
* Delayed pagination/infinite scrolling
* Posts appearing very late when scrolling
* Unexpected application freezes or crashes
* Performance degradation during heavy usage

• Conduct a complete performance audit of the application and optimize rendering, pagination, API calls, caching, image loading, and memory management to ensure a smooth experience even under high user loads.

• The All Posts page should include a top navigation bar similar to the For You page, containing:

* Notifications
* Cart
* Recently Viewed
* Saved/Wishlist

• Compare the Android application against the web application and identify all missing, partially implemented, or non-functional features.

• Ensure full feature parity with the web platform, including:

* Compare Functionality
* Boosted Posts
* Featured Posts
* Premium Posts
* Advanced Post Management
* Promotion Features
* User Engagement Features
* Any additional functionality available on the web platform

• The For You page currently contains a back button that appears unnecessary and is incorrectly navigating users to the Cart page.

• Review and fix all navigation issues on the For You page and determine whether the back button should be removed entirely.

• The My Home page is experiencing loading failures and is not functioning reliably.

• Investigate and resolve the "Can't Reach MHub Services" issue affecting:

* My Home
* Bought Posts
* Sold Posts
* Other dependent screens

• The Sale Done (Confirm Sale) and Sale Undone pages should maintain consistent navigation behavior with the rest of the application.

• Add the bottom navigation bar to Sale Done and Sale Undone pages.

• All pages accessed through the hamburger menu should either:

* Not display a back button, or
* Redirect users to the All Posts page when the back button is pressed

• Ensure every application page (except the landing/home screen where intentionally excluded) includes a consistent bottom navigation bar.

• The language switching functionality is currently incomplete and unreliable.

• Language selection should translate the entire application experience, including:

* Categories
* Subcategories
* Labels
* Menus
* Buttons
* Post Data
* Screen Content
* User Interface Elements

• The language-switching experience should match the responsiveness and completeness of the web application.

• Several pages, including All Posts and related modules, suffer from slow loading times and require long-term performance optimization.

• After resolving all critical issues, perform a complete feature-by-feature comparison against the web application to ensure full parity.

• On the All Posts page, clicking a post should open a detailed post view similar to the web application.

• The detailed post view should include:

* Complete Post Information
* Featured Post Options
* Boost Post Options
* Premium Promotion Options
* Related Posts
* Featured Recommendations
* Boosted Recommendations
* Premium Post Recommendations

• The search functionality on the My Home page is not working correctly and requires investigation and fixes.

• In the Profile section, edit references/options are displayed, but the actual profile information is not visible.

• The Profile page should:

* Display complete user information
* Provide clear edit options
* Allow users to update and save profile information successfully
* Maintain consistency with the web application experience
### Rewards Module

• The Rewards page is missing several features and functionalities currently available in the web application. Conduct a detailed feature parity review and implement all missing capabilities.

• The Referral Chain Rewards system appears to be incomplete or missing. Users should be able to clearly view:

* Direct Referrals (Level 1)
* Indirect Referrals (Level 2, Level 3, etc.)
* Referral Hierarchy Structure
* Referral-Based Earnings
* Referral Growth Metrics

• Review the Spin Wheel and Daily Secret Code features:

* Verify whether rewards are actually claimable.
* Confirm whether rewards are dynamically generated or statically configured.
* Ensure daily refresh and reward distribution work correctly.
* Identify and fix any partially implemented or non-functional reward features.

• Conduct a complete audit of the Rewards module to identify all half-implemented, missing, or non-functional features.

• The Rewards Activity page is currently underdeveloped and requires significant UI/UX improvements.

• The Rewards Activity page should clearly display:

* Reward History
* Referral Earnings
* Bonus History
* Daily Reward Claims
* Spin History
* Transaction Activity

• The Tier Progression section is currently unclear and may confuse users.

• Redesign Tier Progression to clearly explain:

* Current Tier
* Next Tier
* Benefits of Each Tier
* Progress Required to Reach the Next Tier

• The Impact Dashboard and Success Rate metrics are unclear and lack proper explanations.

• Add user-friendly descriptions, tooltips, or help sections to explain:

* Impact Score
* Success Rate
* Reward Calculations
* Tier Benefits

• Review the Rewards module against the web application and restore all missing features to achieve full feature parity.

---

### All Posts Page

• The filter panel does not provide a Close button after opening. Add a visible and intuitive Close/Cancel option.

• The All Posts search functionality is not working as expected.

• Search should return results based on:

* Title
* Description
* Category
* Subcategory
* Tags
* Seller Information
* Location
* Other searchable metadata

• Search behavior should match the web application experience.

• The action button currently displays "View" instead of "View Details".

• Update the button label to "View Details" for improved clarity and consistency.

• The All Posts page is missing several important UI elements:

* Quick Filters
* Subcategory Filters
* Complete Header Section
* Enhanced Navigation Controls

• Compare the All Posts implementation with the web application and restore all missing features.

---

### Performance & Scalability

• The following pages are experiencing slow loading and performance issues:

* All Posts
* My Posts
* Feed
* For You

• Conduct a full performance review and optimize:

* API Calls
* Pagination
* Infinite Scrolling
* Image Loading
* Data Rendering
* Memory Usage
* Network Requests

• The application should be optimized to support large-scale growth and high user volumes without performance degradation.

• Investigate excessive rendering occurring on the All Posts page and resolve any unnecessary re-renders or resource-intensive operations.

---

### For You Page

• Each post should provide quick-action options such as:

* Add to Cart
* Save
* Share
* Compare
* Other relevant actions

• Review the header layout and reduce excessive header height for a cleaner and more efficient user experience.

• The notification icon next to the language selector appears unnecessary and may be removed if it does not provide meaningful value.

---

### Recently Viewed

• The Recently Viewed page is not functioning correctly.

• Any content viewed by the user should automatically appear in Recently Viewed, including:

* Posts
* Feed Posts
* Product Listings
* Other Supported Content Types

• Ensure recently viewed history is accurately tracked and displayed.

---

### Cart & Wishlist

• Items added to the cart are not consistently appearing on the Cart page.

• Review and fix:

* Add to Cart Functionality
* Cart Synchronization
* Cart Persistence
* Cart API Integration

• The Wishlist page is experiencing loading issues and requires investigation and fixes.

• Validate all Wishlist-related functionality and ensure it works consistently.

• Remove the My Offers page entirely if it is no longer required by business requirements.

---

### Profile Module

• Referral codes should be automatically generated for every user.

• Referral codes should be:

* Unique
* Dynamic
* Available immediately after registration

• The Account section should use expandable/collapsible sections rather than displaying all content simultaneously.

• The Personal Information section should:

* Display existing profile data
* Provide Edit functionality
* Allow users to update and save information successfully

• The Preferences section is not functioning correctly and requires improvements.

• Preferences should:

* Display currently selected values
* Allow users to edit selections
* Save changes correctly
* Reflect updates throughout the application

• Remove the Search Radius setting if it is not required.

• Replace location selection with searchable dropdowns for:

* Country
* State
* District
* City (if applicable)

• Add search functionality inside dropdowns to improve usability and user experience.

---

### Navigation & Layout Consistency

• Remove the Search icon from the top navigation bar across all pages if it is not required.

• The Sale Done page is missing a Back button. Add appropriate navigation support.

• The Home page should remain a clean landing screen and should not display:

* Top Navigation Bar
* Bottom Navigation Bar
* Jump Back Controls

• The Home page should only display:

* Welcome Section
* Four Category Icons

• Each category should function as an independent marketplace/module while sharing the same platform capabilities.

• Selecting a category should navigate users directly to the corresponding All Posts page.

• All internal application pages should display a consistent bottom navigation bar containing:

* All Posts
* For You
* Rewards
* Profile
* More (Hamburger Menu)

• Maintain consistent navigation behavior across the entire application.

---

### Application Audit & Feature Parity Review

• Conduct a comprehensive platform-wide audit to identify:

* Missing Features
* Half-Implemented Features
* Non-Functional Features
* UI Inconsistencies
* Navigation Issues
* Performance Bottlenecks

• Compare every mobile application screen against the web application and document:

* Missing Functionality
* Missing UI Components
* Missing Business Logic
* Missing User Flows

• Provide ratings for each screen covering:

* UI/UX Quality
* Functional Completeness
* Performance
* User Experience
* Feature Parity with Web Application

• Create a prioritized implementation roadmap to achieve full web-to-mobile feature parity and production readiness.

---

### Web Application Feature Parity

• Compare the Rewards module against the web application and restore all missing functionality.

• Compare the All Posts page against the web application and restore:

* Quick Filters
* Subcategory Filters
* Header Components
* Search Features
* Compare Functionality
* Featured Posts
* Premium Posts
* Boosted Posts

• Ensure the mobile application provides the same level of functionality, usability, and user experience currently available in the web platform.
