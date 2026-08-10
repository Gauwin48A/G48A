## Page-by-Page Feature Map

Each page below follows the same spec so product, QA, and engineering have a shared reference.

### Redirects & Aliases
- Routes: /categories/:slug -> /all-posts
- Routes: / -> /category-hub
- Routes: /my-recommendations -> /for-you

### /aadhaar-verify — AadhaarVerifyPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\GetVerified.jsx`
- Access: Auth
- Purpose: Aadhaar/identity verification info page.
- Key Features: CMS-driven instructions, verification CTA.
- User Flows: Review requirements, proceed.
- Data Sources / APIs: Services: @/services/api; Hooks: @/hooks/useCmsPage, @/hooks/use-toast
- State & Context: Contexts: none detected.

### /activity — ActivityHubPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\ActivityHub.jsx`
- Access: Auth
- Purpose: Activity shortcuts hub.
- Key Features: Quick links to key actions and updates.
- User Flows: Open hub, jump to feature.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: @/hooks/useCmsPage
- State & Context: Contexts: @/context/AuthContext

### /add-post, /sell — AddPostPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\AddPost.jsx`
- Access: Auth
- Purpose: Create a marketplace listing.
- Key Features: Multi-step listing form, media upload, category/subcategory, pricing, condition, location.
- User Flows: Fill form, submit listing, redirect to listing/manage.
- Data Sources / APIs: Services: @/services/api, @/services/categoriesService, @/services/subcategoriesService; Hooks: @/hooks/use-toast
- State & Context: Contexts: @/context/AuthContext, @/context/CategoryModeContext

### /all-posts, /listings — AllPostsPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\AllPosts.jsx`
- Access: Public
- Purpose: Primary marketplace listing feed.
- Key Features: Hero context banner, category/subcategory bar, quick filters, sort controls, shuffle, live refresh toggle, listing cards.
- User Flows: Browse, filter/sort, open listing, switch categories.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: none detected.
- State & Context: Contexts: @/context/AuthContext, @/context/CartContext, @/context/CategoryModeContext, @/context/FilterContext

### /analytics — AnalyticsPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Analytics.jsx`
- Access: Public
- Purpose: Analytics overview (internal).
- Key Features: Analytics dashboards and charts.
- User Flows: Review analytics.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: none detected.
- State & Context: Contexts: @/context/CategoryModeContext

### /bought-posts — BoughtPostsPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\BoughtPosts.jsx`
- Access: Auth
- Purpose: Purchase history.
- Key Features: List of bought items, status.
- User Flows: Review purchase, open detail.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: none detected.
- State & Context: Contexts: @/context/AuthContext, @/context/CategoryModeContext

### /buyer-view — BuyerViewPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\BuyerView.jsx`
- Access: Auth
- Purpose: Buyer-specific view of listings/flows.
- Key Features: Buyer content and purchase actions.
- User Flows: Review listing as buyer, take action.
- Data Sources / APIs: Services: @/services/api; Hooks: none detected.
- State & Context: Contexts: none detected.

### /cart — CartPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Cart.jsx`
- Access: Auth
- Purpose: Shopping cart and checkout staging.
- Key Features: Cart items, quantity/variant controls, totals, checkout CTA.
- User Flows: Review cart, adjust items, proceed to payment.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: none detected.
- State & Context: Contexts: @/context/CartContext, @/context/CategoryModeContext

### /category-hub — CategoryHubPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\CategoryHub.jsx`
- Access: Public
- Purpose: Category-first discovery hub for entering the marketplace by vertical.
- Key Features: Category tiles and discovery sections, quick navigation into category feeds.
- User Flows: Open hub, pick a category, route to listings or subcategory browser.
- Data Sources / APIs: Services: @/services/api, @/services/categoriesService; Hooks: @/hooks/useCmsPage
- State & Context: Contexts: @/context/CategoryModeContext, @/context/FilterContext, @/context/ThemeContext

### /category-mode — CategoryModeSelectPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\CategoryModeSelect.jsx`
- Access: Public
- Purpose: Mode switch between apps/categories.
- Key Features: Category mode selection UI.
- User Flows: Select mode, return to feed.
- Data Sources / APIs: Services: @/services/api; Hooks: @/hooks/useCmsPage
- State & Context: Contexts: @/context/AuthContext, @/context/CategoryModeContext

### /centre/:id/listings — CentreListingsPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\CentreListings.jsx`
- Access: Auth
- Purpose: Listings within a centre channel.
- Key Features: Centre-specific listings feed.
- User Flows: Browse centre listings, open listing.
- Data Sources / APIs: Services: @/services/api; Hooks: none detected.
- State & Context: Contexts: none detected.

### /centre/:id, /channels/:id — ChannelPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\ChannelPage.jsx`
- Access: Mixed (public + auth)
- Purpose: Channel detail page.
- Key Features: Channel feed, listings or posts, subscribe actions.
- User Flows: Open channel, browse content.
- Data Sources / APIs: Services: @/services/api; Hooks: @/hooks/use-toast
- State & Context: Contexts: none detected.

### /centre, /channels — ChannelsListPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\ChannelsListPage.jsx`
- Access: Mixed (public + auth)
- Purpose: Channel list (community/centre).
- Key Features: Browse and open channels, create CTA.
- User Flows: Open channel, create channel.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: none detected.
- State & Context: Contexts: none detected.

### /complaints — ComplaintsPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Complaints.jsx`
- Access: Auth
- Purpose: Issue/complaint submission.
- Key Features: Complaint form, validation, submission status.
- User Flows: Submit complaint, view status message.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: @/hooks/use-toast
- State & Context: Contexts: @/context/AuthContext

### /centre/create, /channels/create — CreateChannelPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\CreateChannelPage.jsx`
- Access: Auth
- Purpose: Create a channel or centre.
- Key Features: Channel creation form, validation.
- User Flows: Create channel, navigate to channel.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: none detected.
- State & Context: Contexts: @/context/AuthContext

### /dashboard — DashboardPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Dashboard.jsx`
- Access: Auth
- Purpose: Seller analytics and management.
- Key Features: Stats, listing management shortcuts, performance view.
- User Flows: Review stats, manage listings.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: none detected.
- State & Context: Contexts: @/context/AuthContext

### /edit-post/:postId — EditPostPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\EditPost.jsx`
- Access: Auth
- Purpose: Edit an existing listing.
- Key Features: Pre-filled form, update actions, validation.
- User Flows: Load listing, edit, save changes.
- Data Sources / APIs: Services: @/services/api; Hooks: @/hooks/use-toast
- State & Context: Contexts: @/context/AuthContext

### /feedback — FeedbackPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Feedback.jsx`
- Access: Auth
- Purpose: User feedback capture.
- Key Features: Feedback form, optional rating, submission state.
- User Flows: Submit feedback, confirmation.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: @/hooks/use-toast
- State & Context: Contexts: @/context/AuthContext

### /feed — FeedPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\FeedPage.jsx`
- Access: Public
- Purpose: Community/activity feed.
- Key Features: Post feed, engagement actions, filters, live updates.
- User Flows: Browse posts, open a post, react or comment.
- Data Sources / APIs: Services: @/services/api; Hooks: none detected.
- State & Context: Contexts: @/context/AuthContext, @/context/CategoryModeContext

### /feed/:id — FeedPostDetailPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\FeedPostDetail.jsx`
- Access: Public
- Purpose: Single community post detail view.
- Key Features: Post content, engagement thread, share/report actions.
- User Flows: Open post, view thread, engage.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: none detected.
- State & Context: Contexts: none detected.

### /forgot-password — ForgotPasswordPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Auth\ForgotPassword.jsx`
- Access: Public
- Purpose: Password reset request.
- Key Features: Email/phone submission, confirmation.
- User Flows: Request reset, check inbox.
- Data Sources / APIs: Services: @/services/api; Hooks: @/hooks/use-toast
- State & Context: Contexts: none detected.

### /for-you — ForYouPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\ForYou.jsx`
- Access: Public
- Purpose: Personalized marketplace feed.
- Key Features: Personalized recommendations, near-me context, quick filters, fallback for cold-start.
- User Flows: Open feed, apply filters, open listing.
- Data Sources / APIs: Services: @/services/categoriesService, @/services/preferencesService; Hooks: ../hooks/useTranslatedContent
- State & Context: Contexts: @/context/AuthContext, @/context/CartContext, @/context/CategoryModeContext

### /home — HomePage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Home.jsx`
- Access: Public
- Purpose: Curated landing/discovery home.
- Key Features: Highlighted sections, CTA entry points.
- User Flows: Browse sections, navigate.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: none detected.
- State & Context: Contexts: @/context/AuthContext

### /invite/:code — InviteRedirectPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\InviteRedirect.jsx`
- Access: Public
- Purpose: Referral/invite deep link handler.
- Key Features: Validates invite and routes to signup.
- User Flows: Open invite, redirect.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: @/hooks/useCmsPage
- State & Context: Contexts: none detected.

### /kyc — KycVerificationPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\KYC\KycVerification.jsx`
- Access: Auth
- Purpose: KYC verification workflow.
- Key Features: Identity document capture, verification status.
- User Flows: Submit KYC, await status.
- Data Sources / APIs: Services: ../../services/api; Hooks: none detected.
- State & Context: Contexts: none detected.

### /login — LoginPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Auth\Login.jsx`
- Access: Public
- Purpose: User sign-in.
- Key Features: Login form, validation, error handling.
- User Flows: Submit credentials, redirect.
- Data Sources / APIs: Services: @/services/api; Hooks: @/hooks/use-toast
- State & Context: Contexts: @/context/AuthContext, @/context/LocationContext

### /my-feed — MyFeedPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\MyFeedPage.jsx`
- Access: Auth
- Purpose: M yF ee d page and related flows.
- Key Features: Primary UI, actions, and standard empty/loading/error states as defined in the page component.
- User Flows: Open page, complete the primary action, navigate onward.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: @/hooks/usePullToRefresh, @/hooks/useTranslatedContent
- State & Context: Contexts: @/context/AuthContext, @/context/CategoryModeContext

### /my-home, /my-posts — MyHomePage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\MyHome.jsx`
- Access: Auth
- Purpose: M yH om e page and related flows.
- Key Features: Primary UI, actions, and standard empty/loading/error states as defined in the page component.
- User Flows: Open page, complete the primary action, navigate onward.
- Data Sources / APIs: Services: @/services/api; Hooks: @/hooks/usePullToRefresh, @/hooks/use-toast
- State & Context: Contexts: @/context/AuthContext, @/context/CategoryModeContext

### /nearby — NearbyPostsPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\NearbyPosts.jsx`
- Access: Auth
- Purpose: Nearby listings feed.
- Key Features: Location-based filtering, permission gating.
- User Flows: Allow location, browse nearby.
- Data Sources / APIs: Services: @/services/api; Hooks: none detected.
- State & Context: Contexts: @/context/CategoryModeContext, @/context/LocationContext

### /notifications — NotificationsPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Notifications.jsx`
- Access: Auth
- Purpose: Notification inbox.
- Key Features: Unread badge, filters, mark read.
- User Flows: Open notifications, read, clear.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: @/hooks/use-toast
- State & Context: Contexts: @/context/AuthContext, @/context/CategoryModeContext

### /offers — OffersPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Offers.jsx`
- Access: Public
- Purpose: Offers/promotions and deals.
- Key Features: Offers list, details view.
- User Flows: Browse offers, open details.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: @/hooks/useCmsPage, @/hooks/use-toast
- State & Context: Contexts: @/context/AuthContext, @/context/CategoryModeContext

### /payment — PaymentPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Payments\PaymentPage.jsx`
- Access: Auth
- Purpose: Payment/checkout workflow.
- Key Features: Plan purchase, payment status, receipt handling.
- User Flows: Pay, confirm, redirect.
- Data Sources / APIs: Services: ../../services/api; Hooks: @/hooks/useCmsPage, @/hooks/use-toast
- State & Context: Contexts: @/context/AuthContext

### /feed/feedpostadd, /post_add — PostAddPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\PostAdd.jsx`
- Access: Auth
- Purpose: Create a community/feed post.
- Key Features: Compact post creation, optional media, submit flow.
- User Flows: Compose post, submit, return to feed.
- Data Sources / APIs: Services: @/services/api; Hooks: @/hooks/use-toast
- State & Context: Contexts: none detected.

### /listing/:id, /post/:id — PostDetailPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\PostDetail.jsx`
- Access: Public
- Purpose: Listing detail view.
- Key Features: Media gallery, pricing, seller info, save/share, cart or contact actions, related listings.
- User Flows: Open listing, evaluate details, take action.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: @/hooks/use-toast
- State & Context: Contexts: @/context/AuthContext

### /post-welcome — PostWelcomePage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\PostWelcome.jsx`
- Access: Auth
- Purpose: Sell onboarding entry screen.
- Key Features: Selling benefits, CTA to create listing.
- User Flows: Start selling, proceed to add post.
- Data Sources / APIs: Services: @/services/api; Hooks: @/hooks/useCmsPage
- State & Context: Contexts: @/context/AuthContext

### /privacy-policy — PrivacyPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\PrivacyPolicy.jsx`
- Access: Public
- Purpose: Privacy policy.
- Key Features: Legal content display.
- User Flows: Read policy.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: @/hooks/useCmsPage
- State & Context: Contexts: none detected.

### /profile — ProfilePage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Profile.jsx`
- Access: Auth
- Purpose: Account hub and profile management.
- Key Features: Tabbed profile sections (overview/personal/preferences/settings), profile completion prompts.
- User Flows: Review profile, edit details, save preferences.
- Data Sources / APIs: Services: @/services/api, @/services/categoriesService, @/services/locationService, @/services/preferencesService; Hooks: @/hooks/use-toast, @/hooks/useTrustScore
- State & Context: Contexts: @/context/AuthContext, @/context/CategoryModeContext

### /chat, /chats — ProtectedChatPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\ProtectedChat.jsx`
- Access: Auth
- Purpose: Chat and messaging.
- Key Features: Thread list, message composer, attachment support.
- User Flows: Open thread, send message.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: none detected.
- State & Context: Contexts: @/context/AuthContext

### /public-wall — PublicWallPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\PublicWall.jsx`
- Access: Public
- Purpose: Public listings/activity wall.
- Key Features: Public feed and discovery content.
- User Flows: Browse, open listing.
- Data Sources / APIs: Services: @/services/api; Hooks: none detected.
- State & Context: Contexts: none detected.

### /recently-viewed — RecentlyViewedPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\RecentlyViewed.jsx`
- Access: Auth
- Purpose: Recent browsing history for quick return.
- Key Features: Recently viewed list, quick open.
- User Flows: Revisit a listing.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: @/hooks/useTranslatedContent
- State & Context: Contexts: @/context/AuthContext, @/context/CategoryModeContext

### /refund-policy — RefundPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\RefundPolicy.jsx`
- Access: Public
- Purpose: Refund policy.
- Key Features: Legal content display.
- User Flows: Read policy.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: @/hooks/useCmsPage
- State & Context: Contexts: none detected.

### /admin-panel — RequireAuth
- Access: Admin (role-gated)
- Purpose: R eq ui re Au th page and related flows.
- Key Features: Primary UI, actions, and standard empty/loading/error states as defined in the page component.
- User Flows: Open page, complete the primary action, navigate onward.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: none detected.
- State & Context: Contexts: none detected.

### /reset-password, /reset-password/:token — ResetPasswordPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Auth\ResetPassword.jsx`
- Access: Public
- Purpose: Password reset completion.
- Key Features: New password form, token validation.
- User Flows: Submit new password, login.
- Data Sources / APIs: Services: @/services/api; Hooks: @/hooks/use-toast
- State & Context: Contexts: none detected.

### /reviews/:userId — ReviewsPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Reviews.jsx`
- Access: Public
- Purpose: User reviews and ratings.
- Key Features: Review list, rating breakdown.
- User Flows: Browse reviews.
- Data Sources / APIs: Services: @/services/api; Hooks: @/hooks/use-toast
- State & Context: Contexts: @/context/AuthContext

### /rewards — RewardsPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Rewards.jsx`
- Access: Auth
- Purpose: Coins wallet, tiers, and earning guidance.
- Key Features: Balance + tier progress, daily check-in and spin, referral ladder, earn guide, store redemption, history.
- User Flows: Open rewards, claim daily actions, view history, redeem coins.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: @/hooks/use-toast, @/hooks/useTrustScore
- State & Context: Contexts: @/context/AuthContext

### /saledone — SaledonePage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Saledone.jsx`
- Access: Auth
- Purpose: Sale completion confirmation.
- Key Features: Success message, next steps.
- User Flows: Confirm sale, return to dashboard.
- Data Sources / APIs: Services: @/services/api; Hooks: @/hooks/use-toast
- State & Context: Contexts: none detected.

### /saleundone — SaleUndonePage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\SaleUndone.jsx`
- Access: Auth
- Purpose: Sale reversal/issue flow.
- Key Features: Status messaging, support actions.
- User Flows: Resolve sale issue.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: @/hooks/useCmsPage, @/hooks/use-toast
- State & Context: Contexts: @/context/CategoryModeContext

### /saved-searches — SavedSearchesPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\SavedSearches.jsx`
- Access: Auth
- Purpose: Saved search management.
- Key Features: Saved queries list, delete/run.
- User Flows: Open search from saved query.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: none detected.
- State & Context: Contexts: @/context/AuthContext, @/context/CategoryModeContext

### /search — SearchPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\SearchPage.jsx`
- Access: Public
- Purpose: Search and discovery entry point.
- Key Features: Search query, filters, results list.
- User Flows: Search, refine, open listing.
- Data Sources / APIs: Services: @/services/api, @/services/categoriesService; Hooks: none detected.
- State & Context: Contexts: @/context/CategoryModeContext, @/context/FilterContext

### /security — SecuritySettingsPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\SecuritySettings.jsx`
- Access: Auth
- Purpose: Security settings.
- Key Features: Password/2FA settings, device/session controls.
- User Flows: Update security settings.
- Data Sources / APIs: Services: @/services/api; Hooks: @/hooks/use-toast
- State & Context: Contexts: @/context/AuthContext

### /signup — SignUpPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Auth\SignUp.jsx`
- Access: Public
- Purpose: Account creation.
- Key Features: Signup form, referral code handling.
- User Flows: Register, redirect.
- Data Sources / APIs: Services: @/services/api; Hooks: @/hooks/use-toast
- State & Context: Contexts: @/context/AuthContext

### /sold-posts — SoldPostsPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\SoldPosts.jsx`
- Access: Auth
- Purpose: Sales history.
- Key Features: List of sold items, status.
- User Flows: Review sale, open detail.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: none detected.
- State & Context: Contexts: @/context/AuthContext, @/context/CategoryModeContext

### /categories, /subcategories — SubcategoriesPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Subcategories.jsx`
- Access: Public
- Purpose: Category + subcategory browser.
- Key Features: Hierarchical category navigation.
- User Flows: Select category or subcategory, navigate to feed.
- Data Sources / APIs: Services: @/services/subcategoriesService; Hooks: @/hooks/useCmsPage
- State & Context: Contexts: @/context/CategoryModeContext, @/context/ThemeContext

### /support-ticket-policy — SupportTicketPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\SupportTicketPolicy.jsx`
- Access: Public
- Purpose: Support ticket policy.
- Key Features: Legal content display.
- User Flows: Read policy.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: @/hooks/useCmsPage
- State & Context: Contexts: none detected.

### /t&c, /terms, /terms-and-conditions — TermsPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\TermsAndConditions.jsx`
- Access: Public
- Purpose: Terms and conditions.
- Key Features: Legal content display.
- User Flows: Read terms.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: @/hooks/useCmsPage
- State & Context: Contexts: none detected.

### /pricing, /tiers, /tier-selection — TierSelectionPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\TierSelection.jsx`
- Access: Auth
- Purpose: Plan selection and pricing.
- Key Features: Plan comparison, purchase CTA, coin redemption limits.
- User Flows: Compare tiers, choose plan, proceed to payment.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: @/hooks/useCmsPage, @/hooks/use-toast
- State & Context: Contexts: none detected.

### /verification — VerificationPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Verification.jsx`
- Access: Auth
- Purpose: Verification entry point.
- Key Features: Verification options and routing (Aadhaar/KYC).
- User Flows: Choose verification, proceed.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: @/hooks/use-toast
- State & Context: Contexts: @/context/AuthContext

### /wishlist — WishlistPage
- File: `C:\Users\laksh\GITHUB\MHUB\Mhub\client\src\pages\Wishlist.jsx`
- Access: Auth
- Purpose: Saved listings collection.
- Key Features: Saved items list, remove/save actions, open listing.
- User Flows: Browse saved items, open or remove.
- Data Sources / APIs: Services: none detected (local UI/state only).; Hooks: @/hooks/use-toast, @/hooks/useTranslatedContent
- State & Context: Contexts: @/context/AuthContext, @/context/CartContext, @/context/CategoryModeContext

