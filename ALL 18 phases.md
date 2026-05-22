# PHASE 1 — WEB APP REVERSE ENGINEERING & FEATURE INVENTORY

# MASTER IMPLEMENTATION + AUDIT + PARITY VALIDATION PROMPT

======================================================================
OBJECTIVE
=========

Before implementing ANY further Android fixes, perform a complete reverse-engineering and feature inventory audit of the web application and compare it against the Android application.

The goal of this phase is to:

* stop random implementations
* stop guessed functionality
* stop fake parity
* stop Android-only invented pages
* stop approximate UX recreations
* establish the web app as the SINGLE SOURCE OF TRUTH
* build a validated product blueprint before reconstruction

This phase is NOT optional.

No further implementation should continue until this audit is fully completed and validated.

======================================================================
PRIMARY PROBLEM IDENTIFIED
==========================

The Android app currently contains:

* incorrectly interpreted features
* misunderstood page purposes
* invented pages
* duplicated flows
* incorrect navigation structure
* redundant routes
* inconsistent UI hierarchies
* incorrect ownership semantics
* invalid feature grouping
* fake implementations not matching web app

Examples already identified:

* Feed semantics incorrect
* My Feed semantics incorrect
* My Home semantics incorrect
* Compare feature incorrectly isolated
* Hamburger menu contains invented pages
* Bottom navbar contains wrong tabs
* Top navbar inconsistent with web app
* SaleDone/SaleUndone implementations incorrect
* Wishlist/Notifications duplicated across multiple locations
* Saved Searches placed incorrectly
* Category ecosystem architecture misunderstood
* Fashion/Electronics ecosystem boundaries broken

These failures indicate that the Android implementation team is implementing assumptions instead of validated product behavior.

======================================================================
STRICT EXECUTION RULES
======================

MANDATORY:

DO NOT:

* implement guessed functionality
* create new pages without validation
* rename routes arbitrarily
* create approximate UX flows
* add Android-specific feature assumptions
* create random menu structures
* invent navigation systems
* mark features complete without parity proof

ONLY:

* reverse engineer web app
* document actual behavior
* compare Android vs web
* identify gaps
* classify issues
* define exact reconstruction requirements

======================================================================
WEB APP IS THE SOURCE OF TRUTH
==============================

Reference:
[http://localhost:8081/](http://localhost:8081/)

The web application defines:

* feature semantics
* ownership rules
* navigation hierarchy
* route structure
* page grouping
* content behavior
* filter logic
* compare logic
* social logic
* marketplace logic
* guest access behavior
* authentication behavior
* localization behavior
* API expectations
* UI hierarchy
* interaction patterns

Android must follow this exactly unless explicitly optimized for mobile UX.

======================================================================
MANDATORY WEB APP REVERSE ENGINEERING TASKS
===========================================

Analyze EVERY:

* page
* route
* interaction
* flow
* modal
* drawer
* filter
* compare interaction
* posting flow
* ownership flow
* navbar item
* hamburger menu item
* auth restriction
* guest restriction
* CTA behavior
* quick action
* notification behavior
* wishlist behavior
* saved search behavior
* recently viewed behavior
* compare behavior
* plans flow
* rewards flow
* complaints flow
* feedback flow
* profile flow
* feed flow
* my feed flow
* my home flow
* allposts flow
* sell flow
* category flow
* subcategory flow

======================================================================
MANDATORY SCREENSHOT-BASED ANALYSIS
===================================

For EVERY major page:

Capture:

1. Web app screenshots
2. Android screenshots
3. Side-by-side comparisons
4. Navigation recordings
5. Interaction recordings

MANDATORY pages:

* Home
* AllPosts
* Feed
* My Feed
* My Home
* ForYou
* Sell
* Plans
* Rewards
* Profile
* Complaints
* Feedback
* SaleDone
* SaleUndone
* Wishlist
* Notifications
* Saved Searches
* Recently Viewed
* Compare
* Hamburger Menu
* Bottom Navbar
* Top Navbar
* Category pages
* Subcategory pages

WITHOUT VISUAL COMPARISON:
DO NOT MARK ANY FEATURE COMPLETE.

======================================================================
MANDATORY FEATURE INVENTORY TABLE
=================================

Create COMPLETE inventory documentation.

Format:

| Feature/Page | Exists in Web | Exists in Android | Matching Web App | Missing | Broken | Redundant | Wrong Logic | Wrong UX | Severity | Action Required |

MANDATORY FOR:

* Home
* AllPosts
* Feed
* My Feed
* My Home
* Compare
* Sell
* Plans
* Rewards
* Complaints
* Feedback
* SaleDone
* SaleUndone
* Profile
* Wishlist
* Notifications
* Recently Viewed
* Saved Searches
* Categories
* Subcategories
* Quick Filters
* Hero Banners
* Sticky Filters
* Hamburger Menu
* Bottom Navbar
* Top Navbar
* Localization
* Authentication
* Guest Access
* Navigation
* Compare Flows
* Product Cards
* Detail Pages

======================================================================
MANDATORY FEATURE SEMANTICS VALIDATION
======================================

The Android team is currently misunderstanding page purposes.

You MUST validate exact semantics.

---

## FEED

Actual purpose:

* news sharing
* discussion sharing
* knowledge content
* informational/social content

NOT:

* marketplace image feed
* product listing feed

---

## MY FEED

Actual purpose:

* current user’s own social/discussion content

---

## ALL POSTS

Actual purpose:

* marketplace listings
* all user product posts
* category-specific product browsing

---

## MY HOME

Actual purpose:

* current user’s own marketplace listings
* ownership management area

NOT:

* dashboard clone
* feed clone

---

## COMPARE

Actual purpose:

* integrated marketplace browsing utility

NOT:

* isolated major standalone navigation emphasis

======================================================================
NAVIGATION HIERARCHY VALIDATION
===============================

Validate:

* actual bottom navbar structure in web app
* actual top navbar structure in web app
* actual hamburger menu structure in web app
* which routes are duplicated
* which routes should be removed
* which routes are ecosystem-specific
* which routes belong inside AllPosts only
* which routes belong inside Profile only
* which routes should NOT exist in Android

======================================================================
CATEGORY ECOSYSTEM VALIDATION
=============================

This is a critical misunderstanding.

Correct expected behavior:

Home Page:

* user selects ecosystem/category
* example:

  * Fashion
  * Electronics
  * etc.

Once user enters Fashion:

* entire browsing ecosystem becomes Fashion-only
* AllPosts becomes Fashion marketplace
* subcategories become Fashion-specific
* filters become Fashion-specific
* compare becomes Fashion-specific

User should NOT see:

* global categories
* mixed-category browsing
* unrelated ecosystem content

To switch ecosystems:

User must return to Home.

Validate whether Android currently violates this.

======================================================================
REDUNDANT PAGE DETECTION
========================

Identify ALL Android-only redundant pages.

Examples already identified:

* duplicate Profile routes
* duplicate Dashboard routes
* Orders page
* My Listings page
* random Chat/Messages pages
* Compare page misuse
* Saved Searches duplication
* Wishlist duplication
* Notifications duplication

Classify each as:

* Valid
* Redundant
* Duplicate
* Misplaced
* Android-only invention
* Wrong hierarchy

======================================================================
MOBILE UX VALIDATION
====================

Validate:

* whether web structure was blindly copied
* whether mobile UX adaptation exists
* whether navigation density is too high
* whether hamburger menu is overloaded
* whether redundant pages create confusion
* whether routes should move to Profile
* whether routes should become contextual actions
* whether routes should move inside AllPosts

======================================================================
AUTH & GUEST FLOW ANALYSIS
==========================

Validate:

* guest browsing restrictions
* login popup behavior
* rewards auth flow
* session persistence
* route guards
* ownership restrictions
* protected actions
* guest preview behavior

Identify:

* Android auth inconsistencies
* duplicate login prompts
* session timeout bugs
* route access mismatches

======================================================================
LOCALIZATION ANALYSIS
=====================

Validate:

* language switching behavior in web app
* how web app refreshes data
* how APIs refresh localized content
* how navigation labels refresh
* how dynamic listings refresh
* how banners refresh
* how filters refresh

Compare against Android.

Document ALL gaps.

======================================================================
DELIVERABLES REQUIRED
=====================

MANDATORY OUTPUTS:

1. Complete Feature Inventory Table
2. Web vs Android Gap Report
3. Redundant Feature Report
4. Missing Feature Report
5. Incorrect Semantics Report
6. Navigation Architecture Report
7. Menu Architecture Report
8. Category Ecosystem Report
9. Auth & Guest Flow Report
10. Localization Gap Report
11. Mobile UX Evaluation Report
12. Screenshot Comparison Library
13. Route Mapping Documentation
14. Feature Ownership Mapping
15. Final Reconstruction Blueprint

======================================================================
STRICT ACCEPTANCE CRITERIA
==========================

This phase is ONLY COMPLETE when:

* every web app page is mapped
* every Android page is classified
* every redundant page is identified
* every missing feature is identified
* every incorrect semantic is documented
* every navigation inconsistency is documented
* every parity issue is documented
* every duplicated feature is documented
* every menu inconsistency is documented
* ecosystem architecture is fully understood
* screenshot proof exists for every feature
* Android/web route mapping is finalized

======================================================================
DO NOT MARK THIS PHASE COMPLETE IF:
===================================

* assumptions still exist
* guessed functionality still exists
* Android-only pages still exist without validation
* route hierarchy still unclear
* feature semantics still unclear
* screenshots missing
* comparison tables incomplete
* ecosystem behavior not validated
* mobile adaptation strategy not documented

======================================================================
FINAL DIRECTIVE
===============

This phase defines the FOUNDATION of the entire Android reconstruction.

If this phase is weak:

* future implementations will continue failing
* parity will remain fake
* redundant pages will continue appearing
* UX inconsistency will continue
* bugs will continue recurring

This phase must produce a COMPLETE PRODUCT BLUEPRINT before implementation proceeds.

NO RANDOM FIXES.
NO GUESSED FEATURES.
NO APPROXIMATE PARITY.
NO PLACEHOLDER IMPLEMENTATIONS.

Everything must be:

* validated
* documented
* compared
* classified
* mapped
* tested
* proven.
PHASE 2 — ARCHITECTURE & STATE MANAGEMENT REBUILD
MASTER IMPLEMENTATION + STABILIZATION + SCALABILITY PROMPT
======================================================================
OBJECTIVE

Rebuild the Android application architecture completely to eliminate:

stale states
broken navigation restoration
auth corruption
lifecycle bugs
refresh inconsistencies
screen rebuild corruption
session instability
duplicated business logic
inconsistent API handling
fragmented state management
non-scalable feature implementation

The current Android app is behaving like:

disconnected screens
isolated temporary fixes
patch-work implementations
fragile navigation flows

instead of:
ONE centralized, scalable, production-grade ecosystem.

This phase is the FOUNDATION for stabilizing the entire application.

Without fixing architecture first:

all future fixes will keep breaking
bugs will continue recurring
parity will never become stable
UX will continue degrading
======================================================================
CURRENT CRITICAL FAILURES IDENTIFIED

The current architecture likely contains:

fragmented state handling
multiple local states fighting each other
improper controller disposal
stale cached data
improper rebuild handling
inconsistent navigation state
duplicate listeners
non-centralized auth logic
non-centralized localization logic
route-state mismatches
API lifecycle inconsistencies
screen recreation corruption
back-stack instability

Examples already identified:

AllPosts showing “No listings available” after navigation
Rewards asking login despite active session
Session timeout appearing incorrectly
Feed/ForYou crashing after navigation
Navbar active state mismatches
Listings disappearing after screen reopen
Old language content persisting after locale change
State corruption after returning from Profile/Chat
Incorrect page reopening behavior
Refresh issues after navigating between tabs

These are NOT isolated UI bugs.

These are ARCHITECTURE FAILURES.

======================================================================
MANDATORY ARCHITECTURE STACK

The application MUST migrate to a stable production architecture.

MANDATORY STACK:

STATE MANAGEMENT

Riverpod (preferred) OR Bloc
centralized app-wide reactive state handling

NAVIGATION

GoRouter OR AutoRoute
route-aware navigation architecture
nested navigation support

NETWORKING

Dio
centralized interceptors
auth interceptors
retry handling
API lifecycle control

LOCAL STORAGE / CACHING

Hive OR Drift
centralized cache strategy
offline-safe architecture

ARCHITECTURE STYLE

Clean Architecture
Feature-first modular architecture
Repository pattern
Service abstraction
Dependency injection
======================================================================
MANDATORY ARCHITECTURE RESTRUCTURE

CURRENT PROBLEM:
Features are likely tightly coupled and fragmented.

Required:
FULL modular restructuring.

Recommended structure:

lib/
├── core/
│ ├── auth/
│ ├── localization/
│ ├── networking/
│ ├── navigation/
│ ├── caching/
│ ├── storage/
│ ├── theme/
│ ├── utils/
│ └── shared/
│
├── features/
│ ├── home/
│ ├── allposts/
│ ├── feed/
│ ├── myfeed/
│ ├── myhome/
│ ├── rewards/
│ ├── profile/
│ ├── sell/
│ ├── plans/
│ ├── compare/
│ ├── complaints/
│ ├── feedback/
│ ├── saledone/
│ ├── saleundone/
│ └── auth/
│
├── shared_widgets/
├── shared_models/
└── app/

======================================================================
CENTRALIZED STATE MANAGEMENT REQUIREMENTS

REMOVE:

isolated screen state hacks
local temporary fixes
manual refresh dependencies
widget-level business logic

IMPLEMENT:

centralized app state
reactive rebuilds
shared app lifecycle awareness
feature-scoped providers/blocs
derived state handling
predictable state transitions
======================================================================
AUTH STATE REBUILD

Current auth handling is unstable.

Required centralized auth manager:

Must control:

login state
guest state
token lifecycle
refresh token handling
logout cleanup
protected routes
ownership validation
auth-based rendering

MUST PREVENT:

duplicate login prompts
false session timeouts
stale auth state
incorrect route protection
session corruption after navigation
======================================================================
LOCALIZATION STATE REBUILD

Localization must become centralized.

Current failures:

stale translated labels
old content retained
partial refreshes

Required:
single global locale controller.

When locale changes:

entire app rebuilds
APIs re-fetch localized content
banners refresh
filters refresh
listings refresh
navbars refresh
menu labels refresh

WITHOUT manual refresh.

======================================================================
NAVIGATION STATE REBUILD

Current navigation state handling is broken.

Required:
centralized navigation manager.

Must support:

nested navigation
independent tab stacks
ecosystem-scoped navigation
persistent tab history
deep linking
auth redirects
back-stack restoration

Must prevent:

wrong active tabs
incorrect screen restoration
stale page reopenings
navigation corruption
======================================================================
API LIFECYCLE REBUILD

Current API handling likely fragmented.

Required:
centralized API layer.

Implement:

repository pattern
request cancellation
retry strategies
loading-state consistency
error normalization
pagination management
interceptor handling
auth injection
localized requests

Prevent:

duplicate requests
stale data
race conditions
disposed-context updates
inconsistent loading states
======================================================================
CACHE & DATA PERSISTENCE REBUILD

Current cache handling appears unstable.

Required:
centralized cache strategy.

Implement:

ecosystem-aware cache
locale-aware cache
auth-aware cache
pagination-aware cache
invalidation rules
cache refresh strategy

Prevent:

stale listings
stale filters
old language content
inconsistent persistence
======================================================================
FEATURE MODULE ISOLATION

Each feature must become independently maintainable.

Every feature module should contain:

models
repositories
providers/blocs
screens
widgets
services
routes

Examples:

AllPosts module
Feed module
Rewards module
Compare module
Sell module

NO cross-feature business logic leakage.

======================================================================
REACTIVE UI REBUILD REQUIREMENTS

UI must become fully reactive.

Prevent:

manual refresh dependencies
inconsistent screen updates
stale widgets
incorrect lifecycle rebuilds

Implement:

provider-driven rendering
observable state transitions
lifecycle-safe rebuilding
predictable rendering behavior
======================================================================
ERROR HANDLING REBUILD

Current error handling appears weak.

Implement:

centralized error system
user-friendly error UI
retry handling
fallback states
offline handling
API failure normalization

Prevent:

blank screens
silent failures
stuck loaders
broken refresh states
======================================================================
PERFORMANCE OPTIMIZATION REQUIREMENTS

Optimize:

rebuild frequency
memory usage
scroll performance
image loading
pagination
API batching
cache retrieval
lifecycle efficiency

Prevent:

shimmer freezing
unnecessary rebuilds
frame drops
memory leaks
screen jank
======================================================================
STRICT TESTING REQUIREMENTS

MANDATORY TESTING:

STATE TESTING

provider/bloc tests
state transition tests
cache restoration tests

NAVIGATION TESTING

stack persistence
tab switching
deep linking
auth redirects

AUTH TESTING

session persistence
logout cleanup
token refresh
guest behavior

LIFECYCLE TESTING

app background/foreground
screen recreation
route restoration

CACHE TESTING

stale cache prevention
locale cache refresh
auth cache cleanup

PERFORMANCE TESTING

rebuild profiling
memory profiling
frame-drop analysis
======================================================================
MANDATORY DEBUGGING REQUIREMENTS

Identify and fix ALL:

duplicate listeners
context-after-dispose issues
memory leaks
race conditions
rebuild loops
navigation corruption
provider misuse
invalid state restoration
======================================================================
PROOF-BASED DELIVERY REQUIRED

For EVERY architecture fix provide:

before/after architecture diagrams
provider/bloc flow diagrams
route flow diagrams
lifecycle handling proof
performance profiling proof
memory usage proof
regression proof
crash-free validation proof

WITHOUT PROOF:
TASK NOT COMPLETE.

======================================================================
STRICT ACCEPTANCE CRITERIA

This phase is ONLY COMPLETE when:

no stale states remain
navigation never corrupts
auth state never desynchronizes
lifecycle rebuilds stable
localization reactive globally
cache invalidation reliable
screen restoration predictable
APIs centralized
feature modules isolated
performance stable
memory leaks removed
rebuild behavior predictable
======================================================================
DO NOT MARK COMPLETE IF
local fixes still exist
isolated widget state hacks still exist
duplicate listeners still exist
refresh bugs still reproducible
auth inconsistencies remain
stale data still appears
navigation corruption still occurs
architecture still tightly coupled
======================================================================
FINAL DIRECTIVE

This phase is NOT:
“cleanup”.

This is:
FULL FOUNDATION RECONSTRUCTION.

The goal is to create:

scalable architecture
predictable rendering
stable navigation
centralized logic
production-grade state handling
maintainable feature modules
future-proof mobile platform

NO PATCHWORK.
NO TEMP FIXES.
NO LOCALIZED HACKS.
NO RANDOM STATE MANAGEMENT.

Everything must become:

centralized
reactive
modular
scalable
testable
lifecycle-safe
production-grade.

# PHASE 3 — NAVIGATION SYSTEM RECONSTRUCTION

# MASTER NAVIGATION ARCHITECTURE + ROUTING + UX FLOW STABILIZATION PROMPT

======================================================================
OBJECTIVE
=========

Completely rebuild the Android navigation architecture to achieve:

* true web-app parity
* stable routing behavior
* predictable back-stack handling
* ecosystem-scoped navigation
* correct navbar synchronization
* lifecycle-safe route persistence
* production-grade mobile navigation UX

The current navigation system is unstable, inconsistent, and semantically incorrect.

This phase must eliminate:

* broken route restoration
* wrong active-tab highlighting
* incorrect screen reopening
* stale navigation state
* inconsistent back behavior
* category ecosystem leakage
* duplicated navigation flows
* invalid route hierarchy

This is NOT a small routing fix.

This is:
FULL NAVIGATION RECONSTRUCTION.

======================================================================
CURRENT CRITICAL FAILURES IDENTIFIED
====================================

Current Android navigation problems include:

* Home button not working correctly
* Bottom navbar highlighting wrong tabs
* Opening category sometimes opens wrong screen
* Returning from Profile keeps stale page state
* Back navigation restoring invalid screens
* Listings disappearing after navigation
* Navigation stack corruption
* Duplicate route flows
* Hamburger menu routes inconsistent
* Random Android-only navigation paths
* Incorrect ecosystem transitions
* Invalid route hierarchy
* Context mismatch between navbar and actual page
* App crashes on ForYou navigation
* Wrong screen restoration after tab switching

Examples:

USER FLOW:
Home → Fashion → AllPosts → Profile → Back

Current behavior:

* stale Profile state remains
* wrong tab highlighted
* listings disappear
* navigation becomes inconsistent

Expected behavior:

* ecosystem preserved
* AllPosts restored correctly
* active tab accurate
* state intact

======================================================================
STRICT NAVIGATION PRINCIPLES
============================

The Android app must follow:

* ecosystem-based navigation
* route-aware rendering
* independent navigation stacks
* mobile-first navigation UX
* predictable route restoration
* web-app-aligned hierarchy

DO NOT:

* use random navigation shortcuts
* create duplicate route trees
* mix ecosystems globally
* reuse stale navigation stacks
* allow ambiguous back behavior

======================================================================
MANDATORY NAVIGATION STACK
==========================

REQUIRED:
GoRouter OR AutoRoute

Navigation architecture must support:

* nested routing
* deep linking
* independent tab navigation
* route restoration
* auth-aware redirects
* ecosystem-aware navigation
* persistent navigation state
* lazy route loading

======================================================================
MANDATORY NAVIGATION HIERARCHY
==============================

ROOT FLOW:

App Launch
→ Home
→ User selects ecosystem/category
→ Internal ecosystem navigation begins

IMPORTANT:
Home is NOT part of ecosystem navigation.

Home is:
ecosystem selector.

======================================================================
HOME PAGE NAVIGATION RULES
==========================

Current issue:
Home page incorrectly behaves like internal app screen.

Required behavior:

HOME PAGE SHOULD ONLY:

* show branding
* show 4 ecosystem categories
* act as ecosystem entry point

REMOVE:

* bottom navbar
* top navbar clutter
* ecosystem routes
* internal navigation controls

Correct flow:

Launch App
→ Home
→ Select Fashion
→ Fashion ecosystem initializes
→ Navigate to Fashion AllPosts

======================================================================
ECOSYSTEM-SCOPED NAVIGATION
===========================

CRITICAL CONCEPT:

Each category acts like:
its own mini-application.

Example:

Fashion ecosystem:

* Fashion AllPosts
* Fashion filters
* Fashion compare
* Fashion subcategories
* Fashion feed relevance

Electronics ecosystem:

* Electronics-specific everything

DO NOT:
mix category ecosystems globally.

User must return Home to switch ecosystems.

======================================================================
BOTTOM NAVBAR RECONSTRUCTION
============================

Current bottom navbar is incorrect.

Problems:

* wrong tabs
* duplicate routes
* invalid screens
* stale active state
* mismatch with web app

MANDATORY:
Use ONLY web-app validated tabs.

Expected structure:

* Home
* AllPosts
* ForYou
* Feed
* Rewards
* Profile

(Adjust ONLY if web app confirms.)

REMOVE:

* duplicate utilities
* compare page
* redundant pages
* experimental routes
* random Android-only tabs

======================================================================
BOTTOM NAVBAR BEHAVIOR
======================

Must support:

* independent tab stacks
* persistent tab state
* lifecycle-safe restoration
* route-aware highlighting
* ecosystem persistence

MUST PREVENT:

* wrong active tabs
* stale route restoration
* incorrect screen reopening
* stack corruption

EXAMPLE:

AllPosts → Product Detail → Profile → Back

Should restore:
correct previous state,
NOT reload random screen.

======================================================================
TOP NAVBAR REBUILD
==================

Current top navbar reused incorrectly across screens.

Required:
context-aware navbar system.

---

HOME
→ NO navbar

---

ALLPOSTS
→ search
→ filters
→ compare actions
→ ecosystem-aware context

---

FEED
→ social/discussion actions

---

PROFILE
→ minimal clean header

---

SELL
→ guided workflow navigation

---

DO NOT:
reuse same navbar globally.

======================================================================
HAMBURGER MENU NAVIGATION REBUILD
=================================

Current hamburger navigation is cluttered and incorrect.

Problems:

* duplicate routes
* redundant pages
* misplaced features
* Android-only pages
* invalid hierarchy

STRICT RULE:
ONLY web-app validated routes allowed.

REMOVE:

* duplicate Profile
* duplicate Dashboard
* duplicate Compare
* duplicate Wishlist
* duplicate Notifications
* duplicate Saved Searches
* random Messages/Chat pages
* experimental routes

======================================================================
CONTEXTUAL FEATURE PLACEMENT RULES
==================================

IMPORTANT:

Some features should NOT exist as standalone menu pages.

Examples:

* Compare
* Saved Searches
* Quick Filters
* Recently Viewed

These belong contextually inside:
AllPosts/browsing flows.

DO NOT:
overload hamburger menu.

======================================================================
BACK BUTTON BEHAVIOR REBUILD
============================

Current back behavior inconsistent.

Required:
predictable mobile-native UX.

Rules:

* back restores previous screen state
* back preserves ecosystem context
* back never opens random routes
* back never resets valid stacks unnecessarily

Implement:

* controlled back-stack handling
* route-aware back navigation
* navigation guards

======================================================================
DEEP LINKING & ROUTE RESTORATION
================================

Implement:

* deep link support
* ecosystem-aware route restoration
* auth-safe restoration
* state persistence after app restart

Prevent:

* broken reopen flows
* invalid stack restoration
* stale route reopening

======================================================================
AUTH-AWARE NAVIGATION
=====================

Protected routes:

* Rewards
* ownership flows
* posting flows
* account actions

Guest behavior:

* partial browsing allowed
* restricted actions trigger auth

Navigation must:

* preserve intended route after login
* redirect correctly
* avoid duplicate login prompts

======================================================================
ROUTE PERMISSION VALIDATION
===========================

Validate:

* which routes require auth
* which routes allow preview
* ownership-only routes
* guest-accessible routes

Prevent:

* invalid page access
* false auth prompts
* unauthorized rendering

======================================================================
ANIMATION & TRANSITION IMPROVEMENTS
===================================

Implement:

* smooth page transitions
* ecosystem-aware transitions
* native-feeling animations
* controlled modal behavior
* predictable gesture navigation

Prevent:

* abrupt navigation jumps
* broken transitions
* double animations

======================================================================
STRICT TESTING REQUIREMENTS
===========================

MANDATORY TESTS:

NAVIGATION TESTING

* tab switching
* nested navigation
* back-stack restoration
* deep links
* auth redirects
* ecosystem switching

LIFECYCLE TESTING

* app minimize/restore
* orientation changes
* screen recreation

EDGE CASE TESTING

* rapid navigation
* guest-to-auth transitions
* invalid route access
* stale route restoration

UX TESTING

* predictability
* discoverability
* navigation clarity

======================================================================
MANDATORY FLOW TESTING
======================

Test EVERY flow:

* Home → Category → AllPosts
* AllPosts → Detail → Back
* AllPosts → Profile → Back
* Feed → Detail → Back
* Rewards auth flow
* Hamburger route flows
* Guest browsing flows
* Compare flows
* Sell flows
* Plans flows
* Profile flows

NO FLOW SHOULD:

* lose state
* crash
* reopen wrong screen
* highlight wrong tab

======================================================================
PROOF-BASED DELIVERY REQUIRED
=============================

For EVERY navigation fix provide:

* route hierarchy diagrams
* navigation flow diagrams
* before/after recordings
* stack restoration proof
* deep-link proof
* back-button validation proof
* tab synchronization proof
* ecosystem switching proof

WITHOUT PROOF:
TASK NOT COMPLETE.

======================================================================
STRICT ACCEPTANCE CRITERIA
==========================

This phase is ONLY COMPLETE when:

* navigation always predictable
* tabs always synchronized
* ecosystems always isolated correctly
* no stale route restoration
* no random back behavior
* no duplicate navigation flows
* no invalid routes
* no navigation crashes
* no tab mismatch
* no broken stack restoration

======================================================================
DO NOT MARK COMPLETE IF
=======================

* wrong tabs still highlight
* stale screens still reopen
* back behavior inconsistent
* ecosystem leakage still exists
* duplicate routes still exist
* hamburger clutter remains
* auth redirects inconsistent
* navigation crashes remain

======================================================================
FINAL DIRECTIVE
===============

This phase defines:
HOW USERS EXPERIENCE THE ENTIRE APPLICATION.

If navigation is weak:

* product feels broken
* UX feels confusing
* parity fails
* discoverability fails
* trust fails

The final navigation system must feel:

* premium
* predictable
* ecosystem-aware
* mobile-native
* scalable
* stable
* intuitive
* production-grade

NO RANDOM ROUTING.
NO PATCHWORK STACK FIXES.
NO DUPLICATE NAVIGATION SYSTEMS.
NO FAKE PARITY.

Everything must become:

* centralized
* validated
* ecosystem-aware
* lifecycle-safe
* mobile-first
* production-grade.
# PHASE 4 — LOCALIZATION, LANGUAGE SWITCHING & GLOBAL STATE MANAGEMENT RECONSTRUCTION

# MASTER MULTILINGUAL ARCHITECTURE + STATE SYNCHRONIZATION + APP-WIDE REACTIVE REBUILD PROMPT

======================================================================
OBJECTIVE
=========

Completely rebuild the Android application's:

* localization system
* language switching architecture
* global state synchronization
* reactive UI rebuilding
* cache invalidation strategy
* API localization handling
* dynamic content translation pipeline

The current implementation is critically broken and nowhere near the web app behavior.

This phase must achieve:
TRUE WEB-APP LEVEL MULTILINGUAL EXPERIENCE.

======================================================================
CURRENT CRITICAL FAILURES IDENTIFIED
====================================

Current Android localization problems include:

* language changes only partially apply
* many pages remain untranslated
* stale language data persists
* navigation keeps previous language state
* filters remain in old language
* banners remain untranslated
* bottom navbar labels stale
* hamburger menu labels stale
* dynamic API content not refreshed
* page rebuilds inconsistent
* category data mismatched
* app requires manual refresh
* cached data remains old language
* page states become corrupted
* reactive rebuilds missing

Current behavior quality:
~1/10 compared to web app.

Web app behavior:
instant, seamless, global multilingual transition.

Android must achieve SAME behavior.

======================================================================
WEB APP IS THE SOURCE OF TRUTH
==============================

Reference:
[http://localhost:8081/](http://localhost:8081/)

Analyze EXACTLY how web app handles:

* localization state
* route refresh
* API re-fetching
* dynamic content translation
* cache invalidation
* reactive rebuilds
* page restoration
* navigation updates
* filters/banners refresh

DO NOT:
guess implementation behavior.

======================================================================
STRICT REQUIREMENT
==================

When language changes:

EVERYTHING must update instantly.

INCLUDING:

* labels
* listings
* categories
* subcategories
* filters
* banners
* buttons
* cards
* navbar labels
* hamburger menu
* profile data
* rewards data
* dynamic content
* API-driven content
* placeholders
* validation messages

WITHOUT manual refresh.

======================================================================
MANDATORY ARCHITECTURE REBUILD
==============================

Current architecture likely fragmented.

Need:
CENTRALIZED GLOBAL LOCALIZATION SYSTEM.

MANDATORY STACK:

State Management:
Riverpod OR Bloc

Localization:
centralized locale controller

Networking:
Dio interceptors

Caching:
Hive/Drift localization-aware cache

Architecture:
Clean Architecture + Feature-first modules

======================================================================
GLOBAL LOCALIZATION CONTROLLER
==============================

Create centralized localization engine.

Responsibilities:

* current locale state
* reactive rebuild triggers
* locale persistence
* API locale propagation
* cache invalidation
* dynamic content refresh
* route refresh handling

ALL pages must subscribe reactively.

NO page-level isolated localization handling.

======================================================================
REACTIVE APP REBUILD REQUIREMENT
================================

When locale changes:

App must automatically:

* rebuild visible screens
* refresh active data
* invalidate stale localized cache
* refresh route-aware content
* update UI labels
* refresh API content
* rebuild navigation labels

WITHOUT:
manual refresh,
screen reopening,
forced restart.

======================================================================
API LOCALIZATION SYNCHRONIZATION
================================

Current issue:
API content remains stale after language switch.

Required:
ALL API requests must include:

* current locale
* locale headers/params

Implement:

* centralized request interceptors
* locale-aware repositories
* automatic localized re-fetching

When language changes:

* invalidate stale API data
* refetch active datasets
* refresh visible content

======================================================================
CACHE INVALIDATION REBUILD
==========================

Current problem:
stale cached content persists after locale switch.

Implement:
locale-aware caching strategy.

Requirements:

* cache per locale
* invalidate outdated language cache
* prevent mixed-language rendering
* isolate multilingual datasets

Must prevent:

* English + Telugu mixed rendering
* stale category names
* stale filters
* stale listings

======================================================================
NAVIGATION LOCALIZATION SYNCHRONIZATION
=======================================

Current issue:
navigation retains old locale state.

Required:
language change must refresh:

* route labels
* navbar text
* menu text
* active page labels
* route-aware components

Navigation stack must:
preserve flow,
BUT rebuild localized UI correctly.

======================================================================
BOTTOM NAVBAR LOCALIZATION
==========================

Current issues:

* stale labels
* delayed updates
* inconsistent rebuilds

Required:
instant reactive updates for:

* Home
* AllPosts
* ForYou
* Feed
* Rewards
* Profile

No stale labels allowed.

======================================================================
HAMBURGER MENU LOCALIZATION
===========================

Current issues:

* untranslated items
* stale text
* inconsistent rendering

Required:
ALL menu items must:

* rebuild instantly
* use centralized translations
* maintain route synchronization

======================================================================
DYNAMIC CONTENT LOCALIZATION
============================

CRITICAL:
Dynamic content must localize correctly.

INCLUDING:

* listings
* categories
* subcategories
* filters
* hero banners
* plans
* rewards
* feed content
* compare attributes

NOT just static labels.

======================================================================
CATEGORY ECOSYSTEM LOCALIZATION
===============================

Each ecosystem/category must localize independently.

Example:
Fashion ecosystem:

* Fashion filters localized
* Fashion subcategories localized
* Fashion compare localized

Electronics ecosystem:

* independent localized data

Prevent:
cross-category localization contamination.

======================================================================
FORM & VALIDATION LOCALIZATION
==============================

ALL forms must localize:

* placeholders
* validation messages
* hints
* errors
* CTA labels

INCLUDING:

* Sell flow
* Plans
* Feedback
* Complaints
* Login
* Signup

======================================================================
AUTH & SESSION LOCALIZATION
===========================

Current issues:
session/auth messages inconsistent.

Example:
Profile page showing:
"session timeout"

incorrectly.

Need:

* localized auth states
* correct session handling
* proper translated auth messaging
* centralized auth-state synchronization

======================================================================
RTL/LAYOUT READINESS
====================

Prepare architecture for:
future RTL support if needed.

Implement:

* layout-safe spacing
* text-safe containers
* scalable typography

======================================================================
FONT & TYPOGRAPHY HANDLING
==========================

Implement:

* multilingual font compatibility
* proper fallback fonts
* text overflow handling
* dynamic font scaling
* responsive typography

Prevent:

* clipped text
* broken layouts
* overflow issues

======================================================================
PERFORMANCE REQUIREMENTS
========================

Language switching must feel:
instant.

Prevent:

* full app freezes
* delayed rebuilds
* white flashes
* visible reload lag

Optimize:

* rebuild scope
* API refresh strategy
* cache invalidation
* reactive listeners

======================================================================
STRICT TESTING REQUIREMENTS
===========================

MANDATORY TESTING:

LOCALIZATION TESTING

* full app switching
* every page validation
* dynamic content validation
* form validation messages
* navbar labels
* menu labels

STATE TESTING

* app restore after locale change
* minimize/restore
* route restoration
* tab switching

CACHE TESTING

* stale cache validation
* mixed-language prevention
* API synchronization

EDGE CASE TESTING

* rapid language switching
* switching during API loading
* switching during navigation
* switching while logged out
* switching during form entry

======================================================================
MANDATORY PAGE-BY-PAGE VALIDATION
=================================

Validate EVERY screen:

* Home
* AllPosts
* Feed
* MyFeed
* ForYou
* Rewards
* Plans
* Sell
* Profile
* Complaints
* Feedback
* SaleDone
* SaleUndone
* Compare
* Notifications
* Wishlist
* Recently Viewed

NO page can retain stale language state.

======================================================================
PROOF-BASED DELIVERY REQUIRED
=============================

For EVERY completed localization module provide:

* before/after recordings
* multilingual screenshots
* API refresh proof
* cache invalidation proof
* navbar update proof
* menu update proof
* route rebuild proof
* dynamic content refresh proof

WITHOUT PROOF:
TASK NOT COMPLETE.

======================================================================
STRICT ACCEPTANCE CRITERIA
==========================

This phase is ONLY COMPLETE when:

* entire app updates instantly
* no stale language content exists
* no manual refresh required
* no mixed-language rendering
* all APIs re-fetch correctly
* all labels rebuild instantly
* all pages synchronize correctly
* navigation remains stable
* dynamic content localizes properly

======================================================================
DO NOT MARK COMPLETE IF
=======================

* some pages still untranslated
* stale labels remain
* banners not refreshed
* filters remain old language
* cache persists incorrectly
* navigation retains old locale
* mixed-language UI exists
* manual refresh still required

======================================================================
FINAL DIRECTIVE
===============

Localization is NOT:
just changing labels.

It is:
FULL APPLICATION STATE SYNCHRONIZATION.

The final multilingual system must feel:

* instant
* intelligent
* reactive
* seamless
* scalable
* premium
* production-grade

EXACTLY like:
a world-class multilingual mobile platform.

NO PATCHWORK TRANSLATIONS.
NO PAGE-LEVEL FIXES.
NO STATIC-ONLY LOCALIZATION.
NO STALE CACHE.

Everything must become:

* centralized
* reactive
* synchronized
* lifecycle-safe
* locale-aware
* production-grade.

# PHASE 5 — ALLPOSTS, FEED, FOR-YOU & CONTENT EXPERIENCE RECONSTRUCTION

# MASTER MARKETPLACE EXPERIENCE + SOCIAL FEED + CONTENT SEMANTICS + DISCOVERY UX PROMPT

======================================================================
OBJECTIVE
=========

Completely rebuild the Android application's:

* AllPosts experience
* Feed experience
* MyFeed
* ForYou
* MyHome
* browsing architecture
* listing presentation
* content semantics
* discovery UX
* compare integration
* filters/subcategory system
* content hierarchy

The current Android implementation fundamentally misunderstands the web app structure and page semantics.

This phase must establish:
TRUE WEB-APP CONTENT PARITY
+
PREMIUM MOBILE DISCOVERY EXPERIENCE.

======================================================================
CURRENT CRITICAL FAILURES IDENTIFIED
====================================

Current Android problems include:

* AllPosts UI weak and outdated
* Feed semantics completely wrong
* Feed showing image/listing style instead of discussion/news style
* MyFeed incorrectly implemented
* ForYou duplicated from AllPosts
* ForYou crashing app
* MyHome incorrect logic
* Compare implemented as separate page
* Quick filters missing
* Hero banners missing
* Sticky filters missing
* Subcategories broken
* Category bars incorrect
* Listings visually weak
* Feed cards inconsistent
* Wrong content hierarchy
* Category ecosystem leakage
* Filters not web-aligned
* Compare flow broken
* Browsing UX poor
* Discovery UX weak

Current Android experience:
feels random and disconnected.

Required outcome:
immersive premium browsing ecosystem.

======================================================================
WEB APP IS THE SINGLE SOURCE OF TRUTH
=====================================

Reference:
[http://localhost:8081/](http://localhost:8081/)

MANDATORY:
Analyze EXACT web app behavior for:

* Feed semantics
* MyFeed behavior
* MyHome logic
* ForYou recommendation structure
* AllPosts browsing flow
* Compare integration
* Quick filters
* Hero banners
* Sticky filters
* Listing card design
* Detail-page opening
* Category/subcategory logic
* Recommendation ordering

DO NOT:
invent behaviors,
guess semantics,
or create approximations.

======================================================================
MANDATORY CONTENT SEMANTICS
===========================

The team currently misunderstands core page purposes.

These MUST be corrected.

---

# FEED

Purpose:
knowledge/news/discussion sharing.

NOT:
marketplace listings feed.

Implement:

* text-focused posts
* educational content
* discussion-style layout
* readable typography
* expandable descriptions
* engagement interactions
* comment/discussion UX

---

# MY FEED

Purpose:
current user's shared feed/discussion content.

NOT:
marketplace inventory.

Implement:

* ownership-based feed posts
* user-created discussions/posts
* same behavior as web app

---

# ALL POSTS

Purpose:
all marketplace listings from all users.

Implement:

* immersive marketplace browsing
* product/listing discovery
* compare interactions
* quick filters
* listing cards
* detailed post navigation

---

# MY HOME

Purpose:
current user's own marketplace listings.

NOT:
dashboard clone.
NOT:
feed clone.

Implement:

* user-owned listings only
* edit/delete actions
* ownership management flows
* listing insights

---

# FOR YOU

Purpose:
personalized recommendation/discovery experience.

NOT:
duplicate AllPosts.

Implement:

* recommendation engine
* preference-based ordering
* engagement-aware discovery
* dynamic ranking

======================================================================
CATEGORY ECOSYSTEM LOGIC
========================

CRITICAL CONCEPT:

Each ecosystem/category behaves like:
its own independent marketplace app.

Example:

User enters:
Fashion ecosystem.

THEN:
Everything becomes fashion-specific.

INCLUDING:

* listings
* subcategories
* filters
* compare flows
* recommendations
* hero banners

DO NOT:
show global categories again inside ecosystem.

======================================================================
CRITICAL CURRENT BUG
====================

Current Android issue:
AllPosts shows category bar again.

This is WRONG.

Example:
User already entered Fashion ecosystem.

Showing:
Electronics / Vehicles / etc
inside Fashion ecosystem
is a major UX failure.

REQUIRED:
Inside ecosystem:
ONLY relevant subcategories allowed.

Example:
Fashion ecosystem:

* Men's Wear
* Women's Wear
* Shoes
* Accessories

NOT:
other ecosystems.

======================================================================
ALLPOSTS COMPLETE REBUILD
=========================

Current AllPosts quality:
extremely weak.

Required:
premium marketplace browsing experience.

Implement:

* hero banners
* sticky filters
* subcategory chips
* compare interactions
* quick filters
* immersive listing cards
* responsive layouts
* lazy loading
* infinite scroll
* smooth animations

======================================================================
HERO BANNERS REBUILD
====================

Current issue:
hero banners missing or weak.

Implement:

* dynamic banners
* ecosystem-specific promotions
* responsive mobile banners
* animated carousels
* CTA-driven interactions

Must visually match:
premium marketplace standards.

======================================================================
QUICK FILTERS REBUILD
=====================

Current issue:
filters weak/missing.

Implement:

* sticky filter system
* responsive chips
* animated selections
* API-driven filters
* ecosystem-specific filters

Prevent:

* cluttered filter bars
* incorrect categories
* irrelevant filters

======================================================================
SUBCATEGORY SYSTEM REBUILD
==========================

Current issue:
subcategory system poor and incorrect.

Implement:

* ecosystem-aware subcategories
* dynamic loading
* responsive chips
* proper hierarchy

Example:
Fashion ecosystem:
ONLY fashion subcategories.

======================================================================
LISTING CARD DESIGN REBUILD
===========================

Current cards weak and inconsistent.

Required:
AllPosts cards should visually align with:
Feed card design language.

BUT:
retain marketplace functionality.

Implement:

* image-first premium cards
* proper spacing
* better typography
* listing metadata
* compare triggers
* save/wishlist actions
* responsive layouts

======================================================================
DETAILED LISTING NAVIGATION
===========================

Clicking listing cards must:
open detailed listing page.

Implement:

* smooth transitions
* preserved scroll state
* preserved filters
* back-stack restoration

Prevent:

* list reload
* scroll reset
* stale refresh issues

======================================================================
COMPARE FEATURE REBUILD
=======================

Current implementation incorrect.

Compare should NOT:
exist as isolated menu-heavy page.

Correct behavior:
integrated inside browsing flow.

Implement:

* multi-select compare
* sticky compare CTA
* side-by-side comparison
* compare drawer/modal
* attribute comparison
* ecosystem-specific comparison

======================================================================
FOR YOU REBUILD
===============

Current issue:
ForYou duplicated from AllPosts and crashes app.

Required:
completely separate recommendation architecture.

Implement:

* recommendation engine
* engagement-based ranking
* viewed-history logic
* personalized discovery
* behavioral relevance
* adaptive content ordering

Must feel:
intelligent and dynamic.

======================================================================
FEED EXPERIENCE REBUILD
=======================

Current Feed semantics incorrect.

Required:
social knowledge-sharing experience.

Implement:

* long-form content cards
* discussion posts
* readable typography
* social engagement
* expandable text
* reactions/comments
* knowledge-sharing layout

DO NOT:
treat Feed like product marketplace.

======================================================================
MY FEED REBUILD
===============

Implement:

* user-created discussions/posts
* ownership filtering
* user activity management
* same behavior as web app

======================================================================
MY HOME REBUILD
===============

Current implementation incorrect.

Implement:

* user-owned listings
* listing management
* edit/delete
* listing analytics if applicable
* ownership-focused actions

DO NOT:
duplicate dashboard logic.

======================================================================
RECENTLY VIEWED / SAVED SEARCHES / WISHLIST
===========================================

Current issue:
wrong placement in hamburger menu.

These should become:
contextual browsing utilities.

Integrate intelligently into:

* AllPosts
* Search flows
* Profile utilities

DO NOT:
clutter hamburger menu.

======================================================================
SEARCH EXPERIENCE REBUILD
=========================

Current issue:
top navbar filter beside search not working.

Required:
fully functional search/discovery UX.

Implement:

* responsive search
* live suggestions
* recent searches
* saved searches
* ecosystem-aware filtering
* subcategory filtering

Search must remain:
within active ecosystem.

======================================================================
STICKY INTERACTION SYSTEM
=========================

Implement:

* sticky compare actions
* sticky quick filters
* sticky category context
* floating contextual actions

Must remain:
minimal,
clean,
mobile-friendly.

======================================================================
EMPTY STATES & LOADING STATES
=============================

Implement:

* premium skeleton loaders
* proper empty states
* contextual messaging
* retry states
* network-failure handling

Prevent:
blank pages,
"No listings available" bugs,
stale rendering.

======================================================================
STATE MANAGEMENT REQUIREMENTS
=============================

Current issues likely caused by:
weak state handling.

Implement:

* centralized browsing state
* ecosystem-scoped state
* pagination-safe state
* preserved scroll state
* lifecycle-safe restoration

Prevent:

* disappearing listings
* stale feeds
* duplicated requests
* broken pagination

======================================================================
STRICT TESTING REQUIREMENTS
===========================

MANDATORY TESTING:

CONTENT TESTING

* Feed semantics
* MyFeed ownership
* AllPosts browsing
* MyHome ownership logic
* ForYou recommendations

FILTER TESTING

* subcategories
* quick filters
* sticky filters
* compare flows

STATE TESTING

* scrolling restoration
* navigation restoration
* filter persistence
* compare persistence

CRASH TESTING

* ForYou crash
* rapid navigation
* deep listing navigation

======================================================================
MANDATORY FLOW VALIDATION
=========================

Test EVERY flow:

* Home → Ecosystem → AllPosts
* AllPosts → Listing Detail → Back
* AllPosts → Compare
* AllPosts → Save/Wishlist
* Feed → Discussion Detail
* MyFeed ownership flows
* MyHome listing management
* ForYou recommendation flows

NO flow should:

* crash
* reset incorrectly
* lose filters
* lose scroll position
* lose compare state

======================================================================
PROOF-BASED DELIVERY REQUIRED
=============================

For EVERY module provide:

* web reference screenshots
* Android before screenshots
* Android after screenshots
* flow recordings
* compare-flow proof
* filter proof
* state-restoration proof
* recommendation-flow proof

WITHOUT PROOF:
TASK NOT COMPLETE.

======================================================================
STRICT ACCEPTANCE CRITERIA
==========================

This phase is ONLY COMPLETE when:

* Feed semantics match web app
* AllPosts premium browsing complete
* ForYou personalized correctly
* MyFeed ownership correct
* MyHome ownership correct
* compare integrated properly
* hero banners working
* sticky filters working
* subcategories correct
* no ecosystem leakage
* no duplicate categories
* no crashes remain

======================================================================
DO NOT MARK COMPLETE IF
=======================

* Feed still marketplace-like
* ForYou duplicates AllPosts
* compare still isolated page
* category bars incorrect
* hero banners missing
* filters weak
* listings visually poor
* crashes still exist
* stale states remain
* browsing UX weak

======================================================================
FINAL DIRECTIVE
===============

This phase defines:
HOW USERS DISCOVER CONTENT.

The final browsing/content experience must feel:

* immersive
* premium
* intelligent
* ecosystem-aware
* socially engaging
* marketplace-native
* mobile-first
* production-grade

NOT:
a random collection of cloned pages.

NO FAKE FEEDS.
NO DUPLICATED PAGES.
NO RANDOM CATEGORY BARS.
NO WEAK LISTING CARDS.
NO GENERIC DISCOVERY UX.

Everything must become:

* semantically correct
* ecosystem-aware
* visually premium
* reactive
* scalable
* production-grade.
# PHASE 6 — PROFILE, REWARDS, AUTHENTICATION & USER ACCOUNT EXPERIENCE RECONSTRUCTION

# MASTER ACCOUNT SYSTEM + USER IDENTITY + SESSION MANAGEMENT + OWNERSHIP FLOW PROMPT

======================================================================
OBJECTIVE
=========

Completely rebuild the Android application's:

* Profile experience
* Rewards system
* Authentication architecture
* Session management
* Ownership flows
* Guest-access behavior
* User identity management
* Account-based navigation
* Protected route handling
* User utility structure

The current Android implementation contains:

* broken auth behavior
* session corruption
* incorrect protected-route handling
* redundant account pages
* weak mobile UX
* inconsistent ownership flows
* invalid guest restrictions
* poor account architecture

This phase must achieve:
TRUE WEB-APP ACCOUNT PARITY
+
PREMIUM MOBILE ACCOUNT EXPERIENCE.

======================================================================
CURRENT CRITICAL FAILURES IDENTIFIED
====================================

Current Android issues include:

* Rewards asks login even after already logged in
* Profile page showing incorrect "session timeout"
* Auth state inconsistent
* Duplicate profile routes
* Redundant account pages
* Wrong quick actions
* Hamburger menu duplicates Profile
* Ownership logic broken
* Guest access inconsistent
* Protected routes improperly gated
* Session persistence unstable
* User utilities scattered randomly
* Login prompts appearing incorrectly
* Route protection inconsistent
* Account UX fragmented
* Notifications/wishlist/cart duplicated in multiple places

Current implementation:
feels unstable and confusing.

Required outcome:
clean, premium, centralized account ecosystem.

======================================================================
WEB APP IS THE SINGLE SOURCE OF TRUTH
=====================================

Reference:
[http://localhost:8081/](http://localhost:8081/)

MANDATORY:
Analyze EXACT web app behavior for:

* login flow
* session persistence
* rewards access
* guest restrictions
* ownership visibility
* profile structure
* quick actions
* account navigation
* feedback/complaints
* SaleDone/SaleUndone
* protected routes
* auth redirects

DO NOT:
invent account flows,
invent auth behavior,
or create random account pages.

======================================================================
AUTHENTICATION ARCHITECTURE REBUILD
===================================

Current auth architecture likely fragmented.

MANDATORY:
Centralized authentication system.

Implement:

* global auth controller
* centralized session management
* token lifecycle management
* auth-aware navigation
* route-level protection
* guest-aware rendering

MANDATORY STACK:

* Riverpod/Bloc
* Dio interceptors
* secure token persistence
* centralized auth repository

======================================================================
SESSION MANAGEMENT REBUILD
==========================

Current issue:
false session timeout states.

Example:
Profile page displays:
"session timeout"
incorrectly.

Required:
stable session lifecycle architecture.

Implement:

* token validation
* refresh-token handling
* session restoration
* lifecycle-safe auth persistence
* centralized auth-state synchronization

Prevent:

* false logout states
* duplicate login prompts
* stale auth rendering
* invalid session warnings

======================================================================
REWARDS PAGE REBUILD
====================

Current issues:

* login prompt despite authenticated user
* weak layout
* unstable rendering
* inconsistent state handling

Required:
premium rewards experience.

Implement:

* authenticated-only rendering
* stable session synchronization
* rewards summary cards
* progress visualization
* responsive layouts
* premium mobile-first UI
* smooth animations

Must feel:
engaging,
rewarding,
premium.

======================================================================
PROFILE PAGE REBUILD
====================

Current issues:

* oversized sections
* redundant quick actions
* duplicate utilities
* cluttered layout
* poor hierarchy

Required:
minimal premium account experience.

Implement:

* compact responsive hero section
* clean spacing
* proper CTA hierarchy
* web-app-aligned quick actions
* ownership-focused utilities
* premium mobile-first design

======================================================================
REMOVE REDUNDANT PROFILE FEATURES
=================================

Current Android issue:
random/unnecessary pages inside Profile.

STRICT RULE:
ONLY web-app validated quick actions allowed.

REMOVE:

* redundant utilities
* duplicate navigation
* duplicate profile access
* experimental actions
* placeholder utilities

======================================================================
ACCOUNT ECOSYSTEM RESTRUCTURE
=============================

Current issue:
account features scattered randomly across:

* top navbar
* hamburger menu
* profile
* bottom navbar

Required:
clear account architecture.

Implement:

---

PROFILE PAGE
→ personal identity hub

---

HAMBURGER MENU
→ secondary account utilities

---

BOTTOM NAVBAR
→ direct Profile access only

---

DO NOT:
duplicate same utilities everywhere.

======================================================================
WISHLIST / NOTIFICATIONS / CART / RECENTLY VIEWED
=================================================

Current issue:
duplicated across:

* top navbar
* hamburger menu
* profile

Causing:
clutter and confusion.

Required:
clear placement strategy.

Implement:

PRIMARY ACCESS:
top contextual actions

SECONDARY ACCESS:
Profile utilities

REMOVE:
duplicate hamburger clutter.

======================================================================
GUEST ACCESS REBUILD
====================

Current guest-access behavior inconsistent.

Required:
same behavior as web app.

Implement:
partial browsing for guests.

Guests can:

* browse limited listings
* browse limited feed content
* preview content

Guests CANNOT:

* access ownership actions
* access rewards
* perform protected interactions

======================================================================
LOGIN GATING REBUILD
====================

Correct behavior:

Guest user browses:
→ limited interactions allowed
→ after deeper interaction:
show login/signup modal

Examples:

* scrolling beyond limit
* saving item
* compare persistence
* rewards access
* posting actions

DO NOT:
block entire app aggressively.

======================================================================
AUTH REDIRECT FLOW
==================

Implement:

* intended-route preservation
* post-login restoration
* auth-aware navigation
* protected-route handling

Example:
Guest opens Rewards
→ login modal
→ successful login
→ automatically open Rewards

======================================================================
OWNERSHIP FLOW REBUILD
======================

Current ownership flows weak.

Implement proper ownership logic for:

* MyHome
* MyFeed
* SaleDone
* SaleUndone
* Complaints
* Feedback

Ownership must determine:

* visibility
* edit permissions
* delete permissions
* management actions

======================================================================
SALE DONE / SALE UNDONE REBUILD
===============================

Current Android pages:
randomly created,
not matching web app.

MANDATORY:
Capture web-app reference after login
and replicate EXACT behavior.

Implement:

* ownership-specific sales tracking
* sale status management
* proper workflows
* responsive layouts
* same hierarchy as web app

NO invented implementations allowed.

======================================================================
COMPLAINTS & FEEDBACK REBUILD
=============================

Current Android versions:
not aligned with web app.

Required:
same:

* workflows
* permissions
* UI hierarchy
* form structure
* validation behavior
* ownership handling

Implement:

* premium mobile forms
* responsive layouts
* proper submission states
* success/error handling

======================================================================
NOTIFICATION SYSTEM REBUILD
===========================

Current issue:
notification architecture fragmented.

Implement:

* centralized notification center
* route-aware notifications
* read/unread states
* categorized notifications
* ownership-aware actions

DO NOT:
duplicate notification routes.

======================================================================
ACCOUNT NAVIGATION CLEANUP
==========================

Current hamburger menu/account system cluttered.

Required:
clean account utility structure.

REMOVE:

* duplicate profile pages
* duplicate dashboard pages
* duplicate utilities
* Android-only experimental routes

======================================================================
USER DATA SYNCHRONIZATION
=========================

Implement centralized synchronization for:

* user profile
* rewards
* wishlist
* saved searches
* notifications
* ownership listings
* compare persistence

Prevent:

* stale account data
* inconsistent ownership state
* login desynchronization

======================================================================
SECURITY & SESSION SAFETY
=========================

Implement:

* secure token storage
* auth interceptors
* session expiration handling
* unauthorized-route handling
* logout synchronization

Prevent:

* ghost sessions
* invalid cached auth state
* unauthorized rendering

======================================================================
STRICT TESTING REQUIREMENTS
===========================

MANDATORY TESTING:

AUTH TESTING

* login
* logout
* session restore
* token refresh
* auth redirects

GUEST TESTING

* guest browsing
* login triggers
* restricted routes

OWNERSHIP TESTING

* MyHome
* MyFeed
* SaleDone
* SaleUndone

ROUTE TESTING

* rewards access
* protected pages
* auth restoration

SESSION TESTING

* minimize/restore
* app restart
* token expiry
* logout synchronization

======================================================================
MANDATORY FLOW VALIDATION
=========================

Test EVERY flow:

* Guest → Browse → Login Prompt
* Guest → Rewards → Login → Redirect
* Login → Profile → Rewards
* Profile → SaleDone
* Profile → Complaints
* Profile → Feedback
* Logout → Protected Route Access
* Session Restore After Restart

NO flow should:

* falsely ask login
* lose auth state
* show stale profile
* show session timeout incorrectly
* duplicate navigation

======================================================================
PROOF-BASED DELIVERY REQUIRED
=============================

For EVERY account module provide:

* web reference screenshots
* Android before screenshots
* Android after screenshots
* auth-flow recordings
* ownership validation proof
* guest-access proof
* session persistence proof
* rewards-access proof

WITHOUT PROOF:
TASK NOT COMPLETE.

======================================================================
STRICT ACCEPTANCE CRITERIA
==========================

This phase is ONLY COMPLETE when:

* rewards never falsely asks login
* session state stable
* guest flow correct
* profile premium and clean
* ownership flows accurate
* no duplicate account pages
* auth redirects work properly
* notifications centralized
* account UX uncluttered

======================================================================
DO NOT MARK COMPLETE IF
=======================

* session timeout still appears randomly
* rewards login bug remains
* duplicate utilities remain
* guest restrictions inconsistent
* ownership flows incorrect
* auth restoration broken
* hamburger clutter remains
* stale auth state persists

======================================================================
FINAL DIRECTIVE
===============

This phase defines:
HOW USERS TRUST THE PLATFORM.

Weak account systems destroy:

* trust
* retention
* usability
* premium feel

The final account ecosystem must feel:

* secure
* stable
* intelligent
* premium
* mobile-native
* ownership-aware
* scalable
* production-grade

NOT:
a fragmented collection of random account pages.

NO FAKE AUTH FLOWS.
NO RANDOM SESSION STATES.
NO DUPLICATE ACCOUNT UTILITIES.
NO INVENTED PAGES.

Everything must become:

* centralized
* synchronized
* secure
* ownership-aware
* lifecycle-safe
* production-grade.
# PHASE 7 — HAMBURGER MENU, INFORMATION ARCHITECTURE & FEATURE DISCOVERABILITY RECONSTRUCTION

# MASTER MENU SYSTEM + FEATURE ORGANIZATION + UX SIMPLIFICATION + MOBILE INFORMATION HIERARCHY PROMPT

======================================================================
OBJECTIVE
=========

Completely rebuild the Android application's:

* hamburger menu architecture
* feature discoverability
* menu hierarchy
* navigation grouping
* information architecture
* utility organization
* account utility placement
* contextual feature access
* mobile UX simplification

The current Android hamburger menu is:

* cluttered
* inconsistent
* redundant
* confusing
* overloaded
* not aligned with web app
* filled with duplicate utilities
* filled with random Android-only pages

This phase must transform the app into:
A CLEAN, INTUITIVE, PREMIUM MOBILE NAVIGATION ECOSYSTEM.

======================================================================
CURRENT CRITICAL FAILURES IDENTIFIED
====================================

Current Android hamburger/menu issues include:

* too many unnecessary pages
* duplicate routes
* random Android-only pages
* duplicate Profile
* duplicate Dashboard
* duplicate Compare
* duplicate Notifications
* duplicate Wishlist
* duplicate Saved Searches
* duplicate utilities across app
* wrong feature grouping
* cluttered UX
* feature discoverability poor
* utility hierarchy broken
* menu not aligned with web app
* some important pages missing
* some invalid pages added
* SaleDone/SaleUndone misplaced
* Feedback/Complaints inconsistent
* Compare incorrectly menu-focused
* contextual utilities incorrectly globalized

Current result:
menu overwhelms users.

Required result:
minimal, intentional, premium navigation hierarchy.

======================================================================
WEB APP IS THE SINGLE SOURCE OF TRUTH
=====================================

Reference:
[http://localhost:8081/](http://localhost:8081/)

MANDATORY:
Capture and analyze:

* hamburger menu structure
* grouped sections
* feature hierarchy
* menu depth
* utility placement
* contextual actions
* account organization

DO NOT:
invent menu pages,
invent feature hierarchy,
or create Android-only clutter.

======================================================================
STRICT MENU PRINCIPLE
=====================

The hamburger menu should contain ONLY:

* validated features
* secondary utilities
* contextual account tools
* support/help actions
* workflow extensions

It should NOT become:
a dumping ground for every feature.

======================================================================
CORE ROOT FAILURE
=================

The current Android implementation misunderstands:

* what should be global
* what should be contextual
* what belongs in browsing flow
* what belongs in profile
* what belongs in menu

This causes:

* discoverability failure
* UX clutter
* cognitive overload
* duplicate functionality
* fake parity

======================================================================
MANDATORY FEATURE PLACEMENT STRATEGY
====================================

IMPORTANT:
NOT every feature should exist in hamburger menu.

Correct placement rules:

---

CONTEXTUAL FEATURES
(inside AllPosts/Search)

* Compare
* Saved Searches
* Recently Viewed
* Quick Filters
* Sticky Compare
* Recommendation actions

---

TOP NAVBAR CONTEXTUAL ACTIONS

* Wishlist
* Notifications
* Cart

---

PROFILE UTILITIES

* account management
* user ownership actions
* personal settings

---

HAMBURGER MENU

ONLY:
secondary navigation
+
support utilities
+
workflow extensions

======================================================================
REMOVE REDUNDANT MENU PAGES
===========================

REMOVE if not validated in web app:

* Orders
* My Listings
* duplicate Dashboard
* duplicate Profile
* duplicate Compare
* duplicate Wishlist
* duplicate Saved Searches
* duplicate Notifications
* experimental routes
* random Messages/Chat pages
* Android-only utilities
* placeholder screens

STRICT RULE:
If feature already accessible contextually,
DO NOT duplicate in menu.

======================================================================
MENU RESTRUCTURING REQUIREMENTS
===============================

Implement:
clean grouped hierarchy.

Suggested structure:

---

TRADE

* MyHome
* SaleDone
* SaleUndone
* Sell
* Plans

---

SOCIAL

* Feed
* MyFeed
* Feedback
* Complaints

---

ACCOUNT

* Rewards
* Settings
* Logout

---

SUPPORT

* Help
* About
* Policies

---

IMPORTANT:
Validate ALL structure against web app first.

======================================================================
SALE DONE / SALE UNDONE MENU INTEGRATION
========================================

Current issue:
pages either missing,
incorrect,
or randomly implemented.

MANDATORY:
Capture authenticated web-app screenshots
and replicate EXACT hierarchy.

Implement:

* correct placement
* ownership-aware access
* proper workflows
* mobile-friendly UX

======================================================================
FEEDBACK & COMPLAINTS REBUILD
=============================

Current issue:
not aligned with web app.

Required:
same:

* menu placement
* workflows
* permissions
* UI hierarchy
* ownership logic

Must feel:
intentional,
minimal,
professional.

======================================================================
WISHLIST / NOTIFICATIONS / CART CLEANUP
=======================================

Current issue:
duplicated everywhere.

Required:
centralized contextual access.

DO NOT:
place same feature in:

* top navbar
* profile
* hamburger
  simultaneously.

Implement:
single source of access hierarchy.

======================================================================
COMPARE FEATURE CLEANUP
=======================

Current issue:
Compare exists incorrectly as menu-focused feature.

Correct behavior:
Compare is part of:
AllPosts browsing flow.

REMOVE:
standalone Compare-heavy menu emphasis.

======================================================================
SAVED SEARCHES CLEANUP
======================

Current issue:
incorrectly menu-focused.

Required:
integrated inside:
search/discovery ecosystem.

NOT:
primary hamburger route.

======================================================================
MENU UX REBUILD
===============

Current UX:
cluttered and overwhelming.

Required:
premium mobile navigation UX.

Implement:

* grouped sections
* collapsible categories
* smooth animations
* responsive spacing
* clear icon hierarchy
* visual breathing space
* touch-friendly interactions
* simplified depth

======================================================================
MENU VISUAL DESIGN REBUILD
==========================

Current design:
weak and inconsistent.

Required:
premium modern design.

Implement:

* elegant typography
* proper spacing
* modern iconography
* responsive layouts
* subtle transitions
* polished interaction states

Must visually align with:
premium mobile apps.

======================================================================
DISCOVERABILITY OPTIMIZATION
============================

Goal:
users should discover features naturally.

Prevent:

* feature overload
* navigation fatigue
* utility duplication
* hidden important flows

Implement:
intentional discoverability hierarchy.

======================================================================
TOP NAVBAR + HAMBURGER SYNCHRONIZATION
======================================

Current issue:
duplicate features across:

* top navbar
* hamburger
* profile

Required:
single-responsibility placement.

Example:
Notifications
→ top navbar access
→ optional profile access

NOT:
everywhere.

======================================================================
ROLE-BASED MENU RENDERING
=========================

Implement:
auth-aware menu rendering.

Guest users:
limited menu options.

Authenticated users:
ownership/account features enabled.

Prevent:

* invalid route visibility
* unauthorized actions
* confusing guest UX

======================================================================
RESPONSIVE MOBILE BEHAVIOR
==========================

Implement:

* mobile-first layouts
* adaptive spacing
* touch optimization
* smooth scroll behavior
* gesture-safe interactions

Prevent:

* cramped layouts
* accidental taps
* menu overflow issues

======================================================================
STRICT TESTING REQUIREMENTS
===========================

MANDATORY TESTING:

MENU TESTING

* grouped sections
* collapsible behavior
* feature discoverability
* route correctness

ROLE TESTING

* guest menu
* authenticated menu
* ownership routes

UX TESTING

* navigation simplicity
* cognitive load
* discoverability

RESPONSIVENESS TESTING

* different screen sizes
* orientation handling
* touch accessibility

======================================================================
MANDATORY FLOW VALIDATION
=========================

Test EVERY flow:

* Open hamburger
* Navigate grouped routes
* Open Trade utilities
* Open Social utilities
* Open Account utilities
* Guest → Authenticated transitions
* SaleDone flows
* Feedback flows
* Complaint flows

NO flow should:

* duplicate routes
* confuse users
* expose redundant pages
* create navigation clutter

======================================================================
PROOF-BASED DELIVERY REQUIRED
=============================

For EVERY completed module provide:

* web reference screenshots
* Android before screenshots
* Android after screenshots
* menu hierarchy diagrams
* route validation proof
* discoverability testing proof
* guest/auth menu proof

WITHOUT PROOF:
TASK NOT COMPLETE.

======================================================================
STRICT ACCEPTANCE CRITERIA
==========================

This phase is ONLY COMPLETE when:

* hamburger menu uncluttered
* no duplicate utilities
* no random Android-only pages
* all routes web-aligned
* discoverability improved
* menu hierarchy intentional
* contextual features relocated correctly
* mobile UX premium

======================================================================
DO NOT MARK COMPLETE IF
=======================

* duplicate pages still exist
* Compare still menu-heavy
* Notifications duplicated
* Wishlist duplicated
* Saved Searches duplicated
* menu still overwhelming
* random routes remain
* invalid pages still visible

======================================================================
FINAL DIRECTIVE
===============

This phase defines:
HOW USERS UNDERSTAND THE PLATFORM STRUCTURE.

Weak information architecture creates:

* confusion
* abandonment
* feature blindness
* poor retention

The final menu system must feel:

* intentional
* minimal
* intelligent
* uncluttered
* discoverable
* mobile-native
* scalable
* premium

NOT:
a random collection of links.

NO DUMPING FEATURES INTO MENU.
NO DUPLICATE UTILITIES.
NO RANDOM ROUTES.
NO FAKE WEB PARITY.

Everything must become:

* organized
* contextual
* intentional
* discoverable
* mobile-first
* production-grade.
# PHASE 8 — ALLPOSTS, CATEGORY ECOSYSTEM & MARKETPLACE DISCOVERY RECONSTRUCTION

# COMPLETE CATEGORY LOGIC + ALLPOSTS UX + SUBCATEGORY SYSTEM + FILTER ARCHITECTURE + MARKETPLACE DISCOVERY REBUILD PROMPT

======================================================================
OBJECTIVE
=========

Completely rebuild the Android marketplace discovery experience by reconstructing:

* category ecosystem architecture
* AllPosts behavior
* subcategory hierarchy
* discovery flows
* marketplace navigation logic
* filter architecture
* compare integration
* listing card system
* sticky filters
* hero banners
* marketplace browsing UX

The current Android implementation fundamentally misunderstands
the web app’s category ecosystem and marketplace structure.

This phase must rebuild Android into:
A TRUE MULTI-ECOSYSTEM MARKETPLACE EXPERIENCE.

======================================================================
CRITICAL ROOT FAILURE IDENTIFIED
================================

Current Android implementation incorrectly treats the platform as:

ONE merged marketplace.

This is WRONG.

The actual web app behavior is:

HOME PAGE
→ ecosystem selector

Each category acts like:
its OWN independent platform/ecosystem.

Example:

Fashion
→ fully isolated fashion ecosystem

Electronics
→ fully isolated electronics ecosystem

Agriculture
→ isolated agriculture ecosystem

etc.

Users should NEVER feel:
all categories are merged together globally.

======================================================================
CURRENT ANDROID FAILURES
========================

Current Android issues include:

* category bar incorrectly shown in AllPosts
* subcategories missing
* filters incorrect
* category logic broken
* hero banners missing
* compare integration wrong
* quick filters weak
* listing cards poor
* sticky filters missing
* ecosystem boundaries broken
* navigation confusing
* discovery UX weak
* marketplace semantics incorrect

This creates:
fake parity
+
broken marketplace identity.

======================================================================
WEB APP IS THE SINGLE SOURCE OF TRUTH
=====================================

Reference:
[http://localhost:8081/](http://localhost:8081/)

MANDATORY:
Reverse engineer COMPLETE marketplace behavior from web app.

Analyze:

* category architecture
* ecosystem isolation
* AllPosts hierarchy
* subcategory behavior
* compare flows
* quick filters
* sticky filters
* listing card structure
* banners
* search behavior
* discovery UX
* recommendation behavior

DO NOT:
invent marketplace logic.

======================================================================
MANDATORY CATEGORY ECOSYSTEM RULE
=================================

CRITICAL:

# Home Page

ecosystem selector.

Once user enters category:

they enter an independent marketplace ecosystem.

---

EXAMPLE FLOW

Launch App
→ Home
→ Select Fashion
→ Fashion ecosystem opens

Now:
EVERYTHING becomes Fashion-specific.

* AllPosts
* banners
* subcategories
* filters
* recommendations
* compare
* search
* listings

NO electronics contamination.
NO global category switching inside ecosystem.

---

To switch ecosystems:

User MUST return to Home.

======================================================================
REMOVE INCORRECT CATEGORY BAR
=============================

Current Android issue:
AllPosts contains category bar.

This is fundamentally wrong.

Reason:
user ALREADY selected ecosystem from Home.

---

REMOVE:

* global category bar
* cross-category switching
* merged marketplace UX

---

REPLACE WITH:
subcategory chips relevant ONLY to selected ecosystem.

======================================================================
SUBCATEGORY SYSTEM REBUILD
==========================

Current Android subcategories:
poorly designed,
incorrect,
weak UX.

---

Required:
subcategory-first discovery system.

Implement:

* horizontally scrollable chips
* sticky subcategory selector
* responsive interactions
* animated state transitions
* API-driven subcategory rendering
* ecosystem-specific filtering

---

Example:

Fashion ecosystem:

* Men
* Women
* Footwear
* Watches
* Accessories

Electronics ecosystem:

* Mobiles
* Laptops
* Audio
* Gaming

---

NO cross-category pollution.

======================================================================
ALLPOSTS COMPLETE REBUILD
=========================

Current AllPosts quality:
far below web app.

---

Required:
premium marketplace browsing experience.

Implement:

* immersive browsing
* ecosystem-aware listings
* sticky filters
* hero banners
* quick filters
* compare integration
* premium cards
* infinite scroll
* responsive loading
* proper empty states
* recommendation logic

---

Must feel:
like a world-class marketplace.

======================================================================
LISTING CARD SYSTEM REBUILD
===========================

Current listing cards:
weak,
dated,
inconsistent.

---

Required:
AllPosts cards should visually align with:
Feed card system aesthetics.

BUT:
behavior remains marketplace-focused.

---

Card Requirements:

* premium visual hierarchy
* image-first layout
* responsive typography
* optimized spacing
* engagement indicators
* compare triggers
* save/wishlist actions
* smooth interactions

---

Click behavior:
must open detailed listing page.

======================================================================
HERO BANNERS REBUILD
====================

Current issue:
hero banners missing or weak.

---

Required:
dynamic ecosystem-specific banners.

Implement:

* carousel support
* API-driven banners
* promotional highlights
* responsive mobile layouts
* animated transitions
* contextual relevance

---

Examples:
Fashion:

* seasonal collections
* trending styles

Electronics:

* new launches
* premium deals

======================================================================
QUICK FILTERS REBUILD
=====================

Current Android filters:
weak and inconsistent.

---

Implement:
sticky quick-filter architecture.

Requirements:

* responsive chips
* animated active states
* scroll-safe sticky behavior
* API-driven filters
* ecosystem-aware filtering
* modern mobile interactions

---

Examples:
Fashion:

* Brand
* Size
* Color
* Price

Electronics:

* RAM
* Storage
* Brand
* Processor

======================================================================
SEARCH + FILTER INTEGRATION FIX
===============================

Current issue:
top navbar filter beside search not working.

---

MANDATORY:
rebuild entire filter/search architecture.

Implement:

* fully functional filters
* modal/bottom-sheet filtering
* ecosystem-aware search
* sticky search state
* filter persistence
* responsive animations

---

Prevent:

* dead buttons
* broken modals
* stale filters
* invalid state restoration

======================================================================
COMPARE FEATURE INTEGRATION
===========================

Current compare implementation:
incorrectly isolated.

---

Correct behavior:
Compare is integrated INSIDE browsing experience.

Implement:

* compare selection
* sticky compare tray
* compare count indicator
* side-by-side comparison
* ecosystem-specific comparisons

---

NO standalone compare emphasis.

======================================================================
SAVED SEARCHES & RECENTLY VIEWED
================================

Current issue:
misplaced globally.

---

Correct behavior:
contextual discovery utilities.

Implement:

* recently viewed inside discovery ecosystem
* saved searches inside search flows
* contextual persistence
* ecosystem-aware restoration

---

DO NOT:
place them as heavy hamburger features.

======================================================================
DISCOVERY UX REBUILD
====================

Goal:
users should naturally discover products.

Implement:

* recommendation hierarchy
* immersive scrolling
* content grouping
* contextual suggestions
* premium transitions
* progressive discovery UX

---

Prevent:

* clutter
* filter overload
* confusing hierarchy
* weak browsing experience

======================================================================
CATEGORY STATE MANAGEMENT REBUILD
=================================

Current issue:
category state becomes corrupted.

---

Implement:
centralized ecosystem state management.

Requirements:

* isolated ecosystem context
* navigation-safe persistence
* lifecycle-safe restoration
* category-aware caching
* ecosystem-aware APIs

---

Switching ecosystem:
must reset relevant marketplace context safely.

======================================================================
API ARCHITECTURE REQUIREMENTS
=============================

Implement:
ecosystem-aware APIs.

---

Requirements:

* category-scoped APIs
* subcategory APIs
* ecosystem-specific banners
* ecosystem-specific recommendations
* filter-specific APIs
* compare-aware APIs

---

Prevent:
cross-category data contamination.

======================================================================
EMPTY STATES & LOADING STATES
=============================

Current issue:
poor/no empty states.

---

Implement:
premium states for:

* loading
* empty results
* API failure
* no recommendations
* no search results

---

Must feel:
intentional and premium.

======================================================================
STRICT TESTING REQUIREMENTS
===========================

MANDATORY TESTING:

CATEGORY TESTING

* ecosystem isolation
* category switching
* state restoration

FILTER TESTING

* sticky filters
* filter persistence
* API synchronization

SEARCH TESTING

* search accuracy
* contextual filtering
* ecosystem search isolation

COMPARE TESTING

* compare persistence
* compare accuracy
* compare lifecycle handling

LISTING TESTING

* infinite scroll
* loading states
* image rendering
* navigation flows

======================================================================
MANDATORY USER FLOWS
====================

Test ALL flows:

Launch App
→ Home
→ Fashion
→ AllPosts
→ Subcategory
→ Filter
→ Compare
→ Product Detail
→ Back Navigation

---

Repeat for:
ALL ecosystems.

---

Validate:

* no stale category state
* no cross-category contamination
* no broken filters
* no invalid compare state

======================================================================
PROOF-BASED DELIVERY REQUIRED
=============================

For EVERY completed module provide:

* web reference screenshots
* Android before screenshots
* Android after screenshots
* category hierarchy diagrams
* filter flow recordings
* compare flow proof
* ecosystem isolation proof
* QA validation proof

WITHOUT PROOF:
TASK NOT COMPLETE.

======================================================================
STRICT ACCEPTANCE CRITERIA
==========================

This phase is ONLY COMPLETE when:

* category ecosystem fully isolated
* no global category contamination
* subcategories fully implemented
* AllPosts premium quality
* sticky filters functional
* compare integrated correctly
* banners implemented
* listing cards premium
* search/filter fully working
* discovery UX premium

======================================================================
DO NOT MARK COMPLETE IF
=======================

* category bar still exists incorrectly
* cross-category browsing still possible
* subcategories weak
* compare isolated
* filters partially working
* banners missing
* listing cards outdated
* discovery UX weak

======================================================================
FINAL DIRECTIVE
===============

This phase defines:
THE CORE MARKETPLACE EXPERIENCE.

If this layer fails:
the entire platform feels broken.

The final marketplace experience must feel:

* immersive
* ecosystem-aware
* premium
* intuitive
* mobile-native
* scalable
* intelligent
* modern
* high-conversion
* production-grade

NOT:
a generic merged listing application.

NO GLOBAL CATEGORY CONFUSION.
NO FAKE MARKETPLACE PARITY.
NO RANDOM FILTERS.
NO WEAK DISCOVERY UX.

Everything must become:

* ecosystem-driven
* intentional
* contextual
* immersive
* premium
* production-grade.

# PHASE 9 — FEED, MY FEED, MY HOME & SOCIAL-COMMERCE SEMANTICS RECONSTRUCTION

# COMPLETE SOCIAL FEED + USER OWNERSHIP + CONTENT SEMANTICS + COMMUNITY EXPERIENCE REBUILD PROMPT

======================================================================
OBJECTIVE
=========

Completely rebuild the Android application's:

* Feed
* MyFeed
* MyHome
* social-content architecture
* ownership semantics
* community interactions
* content hierarchy
* social-commerce behavior
* feed rendering system
* engagement UX
* content identity

The current Android implementation fundamentally misunderstands
the PURPOSE and SEMANTICS of these pages.

This phase must transform the platform into:
A TRUE SOCIAL-COMMERCE ECOSYSTEM
matching the web app exactly.

======================================================================
CRITICAL ROOT FAILURE IDENTIFIED
================================

The Android app currently confuses:

* Feed
* MyFeed
* MyHome
* AllPosts

and treats them as:
duplicated/random listing pages.

This is fundamentally wrong.

The web app clearly separates:

* marketplace listings
* social/community content
* user-owned content
* user-owned listings

These semantics MUST be replicated exactly.

======================================================================
CURRENT ANDROID FAILURES
========================

Current issues include:

* Feed incorrectly treated as image marketplace
* MyFeed semantics broken
* MyHome semantics broken
* duplicated listing logic everywhere
* ownership logic incorrect
* social hierarchy missing
* community UX weak
* text-based discussions broken
* feed rendering inconsistent
* feed visually weak
* user identity flows unclear
* interactions incomplete
* random cloned pages
* no proper social-commerce separation

Result:
platform feels structurally confused.

======================================================================
WEB APP IS THE SINGLE SOURCE OF TRUTH
=====================================

Reference:
[http://localhost:8081/](http://localhost:8081/)

MANDATORY:
Reverse engineer ALL social/content semantics.

Analyze:

* Feed purpose
* MyFeed purpose
* MyHome purpose
* content ownership
* visibility rules
* engagement flows
* interaction models
* content types
* layouts
* permissions
* posting flows
* moderation behavior

DO NOT:
guess semantics.

======================================================================
MANDATORY SEMANTIC DEFINITIONS
==============================

---

# FEED

Public community/news/knowledge/discussion feed.

Purpose:

* knowledge sharing
* updates
* discussions
* informational content
* descriptive posts

NOT:
marketplace listings.

---

# MY FEED

Current user’s own:

* shared posts
* discussions
* informational content

NOT:
marketplace inventory page.

---

# MY HOME

Current user’s own:
marketplace listings/products/posts.

Purpose:
ownership + listing management.

NOT:
feed clone.
NOT:
dashboard clone.

---

# ALL POSTS

Marketplace ecosystem for:
all users’ listings.

---

These distinctions are CRITICAL.

======================================================================
FEED PAGE COMPLETE REBUILD
==========================

Current Android Feed:
incorrect.

---

Required:
true community/content experience.

Implement:

* descriptive posts
* knowledge-sharing cards
* expandable text
* rich discussions
* community interactions
* engagement actions
* informational layouts
* responsive typography
* readable hierarchy

---

Feed should feel like:
social knowledge/community platform.

NOT:
generic product feed.

======================================================================
FEED CONTENT SYSTEM
===================

Implement support for:

* text-first posts
* article-style content
* educational posts
* announcements
* discussions
* updates
* community knowledge sharing

---

Optional:

* image attachments
* link previews
* media embeds

BUT:
content remains discussion-first.

======================================================================
FEED CARD DESIGN REBUILD
========================

Current cards:
weak,
outdated,
low readability.

---

Required:
premium social-content cards.

Implement:

* readable typography
* optimized spacing
* expandable/collapsible text
* interaction footer
* engagement metadata
* responsive layout
* modern mobile design

---

Must prioritize:
READABILITY.

======================================================================
MY FEED COMPLETE REBUILD
========================

Current implementation:
incorrect clone behavior.

---

Required:
ownership-aware social content system.

Implement:

* current user’s shared content only
* ownership visibility
* edit/delete actions
* draft handling
* content management
* user engagement insights

---

MyFeed must feel:
personal,
organized,
ownership-aware.

======================================================================
MY HOME COMPLETE REBUILD
========================

Current Android implementation:
incorrect and random.

---

Correct purpose:
current user’s marketplace listings.

---

Implement:

* user-owned listings only
* listing management
* edit/delete listing
* listing analytics
* listing status
* sale workflows
* ownership actions

---

MyHome is:
inventory/listing management.

NOT:
discussion feed.

======================================================================
ALLPOSTS VS MYHOME SEPARATION
=============================

MANDATORY:

---

# ALLPOSTS

all users marketplace listings

---

# MYHOME

current user marketplace listings

---

Feed/MyFeed semantics MUST remain separate.

NO semantic overlap allowed.

======================================================================
SOCIAL-COMMERCE ARCHITECTURE
============================

Platform has TWO distinct ecosystems:

---

SOCIAL LAYER

* Feed
* MyFeed
* discussions
* knowledge
* community

---

MARKETPLACE LAYER

* AllPosts
* MyHome
* SaleDone
* SaleUndone
* listings
* selling

---

Android currently mixes both incorrectly.

MUST separate clearly.

======================================================================
ENGAGEMENT SYSTEM REBUILD
=========================

Implement proper interactions:

* likes/reactions
* comments
* discussion replies
* content sharing
* saves/bookmarks
* reporting

---

Must align with:
web app behavior.

======================================================================
OWNERSHIP RULES REBUILD
=======================

Implement strict ownership visibility.

---

MY FEED
→ current user content only

MY HOME
→ current user listings only

---

Prevent:
cross-user ownership leakage.

======================================================================
POST CREATION FLOWS
===================

Implement distinct flows for:

---

SOCIAL POSTS

* Feed/MyFeed

---

MARKETPLACE POSTS

* AllPosts/MyHome

---

Current Android likely merges both incorrectly.

MUST separate workflows clearly.

======================================================================
CONTENT MODERATION & REPORTING
==============================

Implement:

* report flows
* content moderation hooks
* ownership controls
* abuse prevention
* deletion confirmation flows

---

Must feel:
safe and intentional.

======================================================================
NAVIGATION REBUILD
==================

Current issue:
navigation between social & marketplace unclear.

---

Required:
clear ecosystem separation.

Examples:

Feed
→ social context

AllPosts
→ marketplace context

MyFeed
→ user social ownership

MyHome
→ user marketplace ownership

---

Each page must feel distinct.

======================================================================
EMPTY STATES & LOADING STATES
=============================

Implement premium states for:

* no posts
* no discussions
* no listings
* API failures
* loading states
* draft states

---

Must feel:
intentional and polished.

======================================================================
API & DATA ARCHITECTURE
=======================

Implement separate APIs/models for:

---

SOCIAL CONTENT

* discussions
* feed posts
* comments

---

MARKETPLACE CONTENT

* listings
* products
* inventory

---

Prevent:
mixed rendering logic.

======================================================================
STATE MANAGEMENT REQUIREMENTS
=============================

Implement centralized handling for:

* social feed state
* marketplace state
* ownership state
* engagement state
* posting state
* content caching

---

Prevent:

* stale feed data
* duplicated posts
* broken ownership visibility
* lifecycle corruption

======================================================================
STRICT TESTING REQUIREMENTS
===========================

MANDATORY TESTING:

SOCIAL TESTING

* Feed rendering
* MyFeed ownership
* interactions
* comments
* reporting

MARKETPLACE TESTING

* MyHome ownership
* listing management
* listing workflows

SEMANTIC TESTING

* Feed != Marketplace
* MyFeed != MyHome

---

NO semantic confusion allowed.

======================================================================
MANDATORY USER FLOWS
====================

Test ALL flows:

---

SOCIAL FLOW

Feed
→ Open discussion
→ Engage
→ Reply
→ Navigate back

---

OWNERSHIP FLOW

MyFeed
→ Edit content
→ Delete content
→ Refresh state

---

MARKETPLACE FLOW

MyHome
→ Edit listing
→ SaleDone
→ SaleUndone
→ Refresh listing state

---

Validate:

* ownership correctness
* state restoration
* lifecycle safety

======================================================================
PROOF-BASED DELIVERY REQUIRED
=============================

For EVERY completed module provide:

* web reference screenshots
* Android before screenshots
* Android after screenshots
* ownership flow proof
* semantic validation proof
* QA validation proof
* interaction recordings

WITHOUT PROOF:
TASK NOT COMPLETE.

======================================================================
STRICT ACCEPTANCE CRITERIA
==========================

This phase is ONLY COMPLETE when:

* Feed correctly social-focused
* MyFeed ownership-aware
* MyHome marketplace-only
* AllPosts separated correctly
* semantic duplication removed
* social interactions working
* ownership rules correct
* content hierarchy clear
* UX premium

======================================================================
DO NOT MARK COMPLETE IF
=======================

* Feed still behaves like marketplace
* MyFeed cloned incorrectly
* MyHome still dashboard/feed clone
* ownership rules broken
* social & marketplace mixed
* interactions incomplete
* duplicated logic remains

======================================================================
FINAL DIRECTIVE
===============

This phase defines:
THE CORE SOCIAL-COMMERCE IDENTITY.

If semantics fail:
the entire platform feels fake.

The final platform must feel:

* socially intelligent
* community-driven
* ownership-aware
* marketplace-integrated
* premium
* modern
* intentional
* scalable
* production-grade

NOT:
random duplicated pages with inconsistent logic.

NO FEED/LISTING CONFUSION.
NO OWNERSHIP CONFUSION.
NO DUPLICATED PAGE PURPOSES.

Everything must become:

* semantically accurate
* ecosystem-aware
* socially meaningful
* marketplace-integrated
* intentional
* production-grade.
# PHASE 10 — PROFILE, REWARDS, AUTHENTICATION & USER STATE RECONSTRUCTION

# COMPLETE USER ACCOUNT SYSTEM + SESSION MANAGEMENT + REWARDS + PROFILE EXPERIENCE + AUTH FLOW STABILIZATION PROMPT

======================================================================
OBJECTIVE
=========

Completely rebuild the Android application's:

* Profile system
* Rewards system
* authentication flows
* session handling
* user state management
* account ownership flows
* login gating
* guest access behavior
* session lifecycle handling
* account UX
* auth-aware rendering

The current Android implementation has:

* broken authentication behavior
* inconsistent user state handling
* redundant profile utilities
* invalid session handling
* fake login states
* weak rewards UX
* incorrect guest restrictions
* stale auth rendering
* random auth prompts

This phase must transform the platform into:
A STABLE, INTELLIGENT, PRODUCTION-GRADE ACCOUNT ECOSYSTEM.

======================================================================
CRITICAL ROOT FAILURE IDENTIFIED
================================

The Android app currently has NO centralized,
reliable auth/session architecture.

This causes:

* logged-in users treated as guests
* rewards page asking login repeatedly
* session timeout banners randomly appearing
* invalid user state restoration
* stale auth cache
* route authorization corruption
* profile rendering inconsistencies
* ownership visibility failures

The app currently behaves:
unpredictably.

======================================================================
CURRENT ANDROID FAILURES
========================

Current issues include:

* Rewards asks login even after login
* Session timeout appearing incorrectly
* stale auth state
* profile quick actions redundant
* invalid auth redirects
* guest/auth flows inconsistent
* auth state lost during navigation
* duplicate profile utilities
* broken ownership handling
* invalid token lifecycle
* rewards rendering weak
* account rendering inconsistent
* auth-based visibility broken

Result:
user trust collapses.

======================================================================
WEB APP IS THE SINGLE SOURCE OF TRUTH
=====================================

Reference:
[http://localhost:8081/](http://localhost:8081/)

MANDATORY:
Reverse engineer ALL account/authentication behavior.

Analyze:

* login flows
* session persistence
* token lifecycle
* guest restrictions
* rewards behavior
* ownership logic
* profile hierarchy
* account utilities
* protected routes
* auth-aware rendering
* logout behavior
* refresh token behavior

DO NOT:
invent auth logic.

======================================================================
MANDATORY AUTH ARCHITECTURE REBUILD
===================================

Current auth system:
fragmented and unstable.

---

Required:
centralized authentication architecture.

Implement centralized handling for:

* auth tokens
* refresh tokens
* session persistence
* route authorization
* guest restrictions
* ownership state
* profile rendering
* auth-aware APIs

---

Recommended stack:
Riverpod/Bloc + centralized auth repository.

======================================================================
SESSION MANAGEMENT REBUILD
==========================

Current session handling:
broken.

---

Issues:

* session timeout banners appear randomly
* stale auth state persists
* logged-in users treated as guests
* invalid logout behavior

---

Required:
stable session lifecycle management.

Implement:

* secure token persistence
* refresh token handling
* session restoration
* silent auth refresh
* lifecycle-safe auth restoration
* auth-aware navigation

---

Prevent:

* fake session timeout
* stale auth rendering
* duplicate login prompts

======================================================================
REWARDS PAGE COMPLETE REBUILD
=============================

Current rewards implementation:
broken and inconsistent.

---

Current failures:

* login prompt appears incorrectly
* layout weak
* rendering unstable
* spacing poor
* state inconsistent

---

Required:
premium rewards ecosystem.

Implement:

* stable authenticated rendering
* responsive mobile layout
* rewards overview
* points/progress hierarchy
* transaction history
* reward summaries
* smooth animations
* proper empty states
* API synchronization

---

Must feel:
premium and trustworthy.

======================================================================
PROFILE PAGE COMPLETE REBUILD
=============================

Current profile:
cluttered and redundant.

---

Issues:

* unnecessary quick actions
* duplicate routes
* oversized layout
* weak hierarchy
* confusing UX

---

Required:
minimal premium profile experience.

Implement:

* compact hero section
* responsive spacing
* intentional hierarchy
* ownership-focused actions
* clean typography
* mobile-first layout
* smooth interactions

---

Remove:

* duplicate utilities
* unnecessary shortcuts
* redundant navigation

======================================================================
PROFILE QUICK ACTION CLEANUP
============================

Current issue:
Android profile contains utilities not aligned with web app.

---

MANDATORY:
Only keep:
validated web-app actions.

---

Remove:

* random Android-only utilities
* duplicate routes
* fake dashboard actions
* redundant ownership pages

---

Profile should feel:
clean,
minimal,
intentional.

======================================================================
LOGIN GATING REBUILD
====================

Current Android guest behavior:
incorrect.

---

Web app behavior:
guests can partially browse,
then login gating appears intelligently.

---

Required:
same behavior in Android.

Implement:

PUBLIC ACCESS

* partial browsing
* limited Feed
* limited AllPosts
* preview access

AUTH TRIGGERS

* protected interactions
* deep scrolling
* ownership actions
* rewards access
* protected pages

---

Login prompts must feel:
contextual,
intentional,
non-intrusive.

======================================================================
AUTH-AWARE PAGE RENDERING
=========================

Implement:
page rendering based on auth state.

---

Guest users:

* limited access
* limited interactions

Authenticated users:

* ownership tools
* rewards
* management actions

---

Prevent:

* unauthorized route access
* broken redirects
* stale auth rendering

======================================================================
ROUTE PROTECTION REBUILD
========================

Implement centralized route guards.

---

Protect:

* Rewards
* MyHome
* MyFeed
* SaleDone
* SaleUndone
* account utilities

---

Prevent:

* invalid access
* auth loops
* redirect corruption

======================================================================
SESSION RESTORATION TESTING
===========================

MANDATORY:
Auth state must survive:

* app restart
* lifecycle pause/resume
* navigation switching
* category switching
* language switching
* API refreshes

---

Prevent:

* auth reset
* fake logout
* invalid guest fallback

======================================================================
TOKEN & API SYNCHRONIZATION
===========================

Implement:
centralized token-aware networking.

---

Requirements:

* token interceptors
* auth refresh handling
* retry handling
* unauthorized handling
* session expiration handling

---

Prevent:

* invalid auth requests
* stale token usage
* inconsistent user rendering

======================================================================
REWARDS + PROFILE STATE SYNCHRONIZATION
=======================================

Current issue:
Rewards/Profile states inconsistent.

---

Required:
single source of truth for user state.

---

Changes in:

* rewards
* profile
* listings
* user actions

must instantly reflect globally.

======================================================================
AUTH ERROR HANDLING
===================

Implement:
premium auth UX.

---

Handle:

* token expiration
* invalid credentials
* network failures
* unauthorized actions
* account restrictions

---

Must feel:
clear and intentional.

NO cryptic errors.

======================================================================
ACCOUNT SETTINGS REBUILD
========================

Implement:
clean account settings hierarchy.

---

Include:

* profile management
* language settings
* notification preferences
* logout
* privacy/settings

---

Remove:

* clutter
* redundant utilities
* duplicate routes

======================================================================
STRICT TESTING REQUIREMENTS
===========================

MANDATORY TESTING:

AUTH TESTING

* login
* logout
* token refresh
* session restoration
* auth-aware routing

GUEST TESTING

* browsing restrictions
* auth prompts
* protected route handling

PROFILE TESTING

* ownership rendering
* account updates
* navigation consistency

REWARDS TESTING

* rewards rendering
* API synchronization
* auth persistence

---

NO inconsistent auth behavior allowed.

======================================================================
MANDATORY USER FLOWS
====================

Test ALL flows:

---

AUTH FLOW

Launch App
→ Login
→ Navigate categories
→ Open Rewards
→ Open Profile
→ Navigate back
→ Restart app
→ Verify session persists

---

GUEST FLOW

Launch App
→ Browse Feed
→ Browse AllPosts
→ Trigger protected action
→ Login modal appears

---

PROFILE FLOW

Open Profile
→ Edit account
→ Navigate utilities
→ Return
→ Verify state consistency

---

Validate:

* no fake logout
* no repeated login prompts
* no session corruption

======================================================================
PROOF-BASED DELIVERY REQUIRED
=============================

For EVERY completed module provide:

* web reference screenshots
* Android before screenshots
* Android after screenshots
* auth flow recordings
* guest/auth validation proof
* token lifecycle proof
* session persistence proof
* QA validation proof

WITHOUT PROOF:
TASK NOT COMPLETE.

======================================================================
STRICT ACCEPTANCE CRITERIA
==========================

This phase is ONLY COMPLETE when:

* Rewards no longer randomly asks login
* session timeout bugs resolved
* auth state centralized
* profile uncluttered
* guest flows correct
* route protection stable
* session restoration stable
* rewards UX premium
* ownership rendering accurate

======================================================================
DO NOT MARK COMPLETE IF
=======================

* Rewards still asks login incorrectly
* session timeout appears randomly
* auth state stale
* profile cluttered
* guest/auth rendering inconsistent
* route protection broken
* token lifecycle unstable

======================================================================
FINAL DIRECTIVE
===============

This phase defines:
USER TRUST & ACCOUNT STABILITY.

If auth/session behavior fails:
the entire platform feels unreliable.

The final experience must feel:

* secure
* stable
* intelligent
* seamless
* trustworthy
* premium
* mobile-native
* scalable
* production-grade

NOT:
random auth prompts and broken sessions.

NO FAKE LOGIN STATES.
NO RANDOM SESSION TIMEOUTS.
NO AUTH STATE CORRUPTION.

Everything must become:

* centralized
* lifecycle-safe
* ownership-aware
* intentional
* premium
* production-grade.


# MASTER QA & VALIDATION TEST SUITE

# PHASES 1–10 COMPLETE E2E TEST CASES

# WEB-APP PARITY + MOBILE UX + STABILITY + FUNCTIONAL + REGRESSION TEST PLAN

======================================================================
OBJECTIVE
=========

This document defines the COMPLETE validation strategy for Phases 1–10.

Purpose:

* validate ALL implemented fixes
* ensure true web-app parity
* detect fake implementations
* prevent regressions
* verify UX quality
* verify navigation stability
* verify auth/session handling
* verify category ecosystem behavior
* verify social-commerce semantics
* ensure production-grade stability

IMPORTANT:
A feature is NOT considered complete unless ALL relevant test cases pass.

======================================================================
MASTER VALIDATION PRINCIPLE
===========================

DO NOT validate by:

* checking only UI visually
* testing happy path only
* assuming functionality works

MANDATORY:

* functional testing
* lifecycle testing
* state testing
* navigation testing
* auth testing
* localization testing
* API testing
* UX testing
* stress testing
* regression testing

======================================================================
GLOBAL TESTING REQUIREMENTS
===========================

MANDATORY DEVICES:

* Small Android phones
* Medium Android phones
* Tablets (if supported)

MANDATORY CONDITIONS:

* slow network
* offline recovery
* app background/foreground
* orientation changes
* repeated navigation
* repeated login/logout
* language switching during usage
* category switching during usage

MANDATORY BUILD TYPES:

* Debug
* Release

======================================================================
PHASE 1 — WEB PARITY AUDIT TEST CASES
=====================================

OBJECTIVE:
Validate Android is truly aligned with web app.

---

## TEST CASES

[TC-WP-001]
Compare every Android page with web app visually.

Expected:

* same purpose
* same hierarchy
* same UX intent

---

[TC-WP-002]
Validate all web-app pages exist in Android.

Expected:
No missing critical pages.

---

[TC-WP-003]
Validate no Android-only random pages exist.

Expected:
No invented routes/pages.

---

[TC-WP-004]
Capture screenshots:

* web app
* Android app

Compare:

* structure
* hierarchy
* spacing
* flows

---

[TC-WP-005]
Validate all feature semantics match web app.

Expected:

* Feed != AllPosts
* MyFeed != MyHome
* Compare contextual
* ecosystem isolation correct

======================================================================
PHASE 2 — HOME PAGE TEST CASES
==============================

OBJECTIVE:
Validate ecosystem selector behavior.

---

## TEST CASES

[TC-HOME-001]
Launch app.

Expected:
ONLY:

* branding
* 4 ecosystems/categories

NOT:

* bottom navbar
* top navbar clutter

---

[TC-HOME-002]
Select Fashion category.

Expected:
Navigate into Fashion ecosystem only.

---

[TC-HOME-003]
Return Home from Fashion.

Expected:
Home resets correctly.

---

[TC-HOME-004]
Switch ecosystem:
Fashion → Electronics.

Expected:
No stale Fashion data.

---

[TC-HOME-005]
Validate no global category leakage.

Expected:
Electronics never appears inside Fashion ecosystem.

======================================================================
PHASE 3 — NAVIGATION TEST CASES
===============================

OBJECTIVE:
Validate navigation stability.

---

## TEST CASES

[TC-NAV-001]
Open category → AllPosts.

Expected:
Bottom navbar highlights AllPosts correctly.

---

[TC-NAV-002]
Navigate:
AllPosts → Profile → Rewards → Feed → Back.

Expected:
Correct active tabs maintained.

---

[TC-NAV-003]
Repeated back navigation stress test.

Expected:
No navigation corruption.

---

[TC-NAV-004]
Switch category while deep inside app.

Expected:
Navigation stack resets safely.

---

[TC-NAV-005]
Kill app → reopen.

Expected:
Navigation state restores safely.

======================================================================
PHASE 4 — LANGUAGE SWITCHING TEST CASES
=======================================

OBJECTIVE:
Validate full localization rebuild.

---

## TEST CASES

[TC-LANG-001]
Switch language.

Expected:
Entire app updates instantly.

---

[TC-LANG-002]
Validate:

* labels
* filters
* banners
* listings
* navbars
* rewards
* profile

Expected:
ALL translated correctly.

---

[TC-LANG-003]
Switch language while inside AllPosts.

Expected:
No stale language state.

---

[TC-LANG-004]
Switch language repeatedly.

Expected:
No crashes.
No partial translations.

---

[TC-LANG-005]
Restart app after language switch.

Expected:
Selected language persists.

======================================================================
PHASE 5 — TOP/BOTTOM NAVBAR TEST CASES
======================================

OBJECTIVE:
Validate navbar correctness.

---

## TEST CASES

[TC-NB-001]
Home page opened.

Expected:
No bottom navbar.

---

[TC-NB-002]
Inside ecosystem → AllPosts.

Expected:
Correct navbar appears.

---

[TC-NB-003]
Tap each navbar item.

Expected:
Correct page opens.

---

[TC-NB-004]
Validate active tab state.

Expected:
Always synchronized.

---

[TC-NB-005]
Validate top navbar contextual behavior.

Expected:
Different pages show different navbar actions.

---

[TC-NB-006]
Filter button beside search.

Expected:
Fully functional.

======================================================================
PHASE 6 — UI/UX QUALITY TEST CASES
==================================

OBJECTIVE:
Validate premium mobile UX.

---

## TEST CASES

[TC-UX-001]
Validate spacing consistency.

Expected:
No cramped layouts.

---

[TC-UX-002]
Validate typography hierarchy.

Expected:
Readable and responsive.

---

[TC-UX-003]
Validate animations/transitions.

Expected:
Smooth.
No jank.

---

[TC-UX-004]
Validate touch targets.

Expected:
Easy mobile interaction.

---

[TC-UX-005]
Validate responsiveness.

Expected:
No overflow or broken layouts.

======================================================================
PHASE 7 — HAMBURGER MENU TEST CASES
===================================

OBJECTIVE:
Validate information architecture.

---

## TEST CASES

[TC-HM-001]
Open hamburger menu.

Expected:
Clean grouped sections.

---

[TC-HM-002]
Validate no duplicate pages.

Expected:
No duplicate:

* compare
* notifications
* wishlist
* profile

---

[TC-HM-003]
Validate only web-app pages exist.

Expected:
No random Android-only pages.

---

[TC-HM-004]
Validate collapsible groups.

Expected:
Smooth behavior.

---

[TC-HM-005]
Open:

* SaleDone
* SaleUndone
* Feedback
* Complaints

Expected:
Correct pages/functionality.

======================================================================
PHASE 8 — ALLPOSTS & MARKETPLACE TEST CASES
===========================================

OBJECTIVE:
Validate marketplace ecosystem.

---

## TEST CASES

[TC-AP-001]
Open Fashion ecosystem.

Expected:
ONLY Fashion subcategories visible.

---

[TC-AP-002]
Validate category bar removal.

Expected:
No global category bar.

---

[TC-AP-003]
Validate subcategory chips.

Expected:
Correct ecosystem subcategories.

---

[TC-AP-004]
Validate sticky filters.

Expected:
Fully functional.

---

[TC-AP-005]
Validate hero banners.

Expected:
Responsive and dynamic.

---

[TC-AP-006]
Validate compare flow.

Expected:
Integrated inside browsing.

---

[TC-AP-007]
Validate listing cards.

Expected:
Premium feed-like design.

---

[TC-AP-008]
Validate infinite scroll.

Expected:
No duplicate listings.
No stale states.

======================================================================
PHASE 9 — FEED / MYFEED / MYHOME TEST CASES
===========================================

OBJECTIVE:
Validate semantic correctness.

---

## TEST CASES

[TC-FEED-001]
Open Feed.

Expected:
Knowledge/discussion content.
NOT marketplace.

---

[TC-FEED-002]
Open MyFeed.

Expected:
Current user's social posts only.

---

[TC-FEED-003]
Open MyHome.

Expected:
Current user's marketplace listings only.

---

[TC-FEED-004]
Validate semantic separation.

Expected:
No duplication between:

* Feed
* MyFeed
* MyHome
* AllPosts

---

[TC-FEED-005]
Validate interactions:

* comments
* engagement
* replies

Expected:
Functional and stable.

======================================================================
PHASE 10 — AUTH / PROFILE / REWARDS TEST CASES
==============================================

OBJECTIVE:
Validate account stability.

---

## TEST CASES

[TC-AUTH-001]
Login using demo user.

Expected:
Stable authenticated state.

---

[TC-AUTH-002]
Navigate to Rewards.

Expected:
No repeated login prompt.

---

[TC-AUTH-003]
Navigate to Profile.

Expected:
No fake session timeout.

---

[TC-AUTH-004]
Restart app.

Expected:
Session persists.

---

[TC-AUTH-005]
Logout.

Expected:
Protected pages inaccessible.

---

[TC-AUTH-006]
Guest browsing.

Expected:
Limited access works correctly.

---

[TC-AUTH-007]
Trigger protected action as guest.

Expected:
Login modal appears.

---

[TC-AUTH-008]
Validate token refresh.

Expected:
No auth corruption.

======================================================================
MASTER REGRESSION TEST CASES
============================

RUN AFTER EVERY MAJOR FIX.

---

## TEST CASES

[TC-REG-001]
Repeated navigation stress.

---

[TC-REG-002]
Repeated language switching.

---

[TC-REG-003]
Repeated category switching.

---

[TC-REG-004]
Background/foreground stress.

---

[TC-REG-005]
Login/logout repeatedly.

---

[TC-REG-006]
Open all menu pages.

---

[TC-REG-007]
Scroll stress testing.

---

[TC-REG-008]
Memory leak testing.

---

[TC-REG-009]
Crash testing.

---

[TC-REG-010]
Offline/online switching.

======================================================================
STRICT ACCEPTANCE CRITERIA
==========================

DO NOT MARK FEATURE COMPLETE IF:

* only UI fixed
* semantics incorrect
* web parity missing
* stale states exist
* navigation inconsistent
* auth unstable
* localization partial
* duplicated pages exist
* crashes/jank exist
* placeholders remain

======================================================================
FINAL QA DIRECTIVE
==================

This is NOT:
simple mobile testing.

This is:
FULL PRODUCT VALIDATION.

The Android app must finally become:

* semantically accurate
* visually premium
* stable
* scalable
* responsive
* mobile-native
* fully web-aligned
* production-grade

with:

* zero fake parity
* zero guessed behavior
* zero stale state
* zero duplicate UX
* zero inconsistent flows
* zero broken navigation
* zero weak testing coverage

EVERY PHASE MUST PASS FULL QA BEFORE MOVING TO NEXT PHASES.


# PHASE 11 — PROFILE, ACCOUNT ECOSYSTEM & USER OWNERSHIP FLOWS

# COMPLETE REBUILD + WEB-APP PARITY + MOBILE-FIRST UX DIRECTIVE

======================================================================
PHASE OBJECTIVE
===============

This phase focuses on rebuilding the COMPLETE account ecosystem.

Current Android implementation problems:

* profile structure incorrect
* unnecessary quick actions
* duplicate pages
* fake shortcuts
* poor mobile hierarchy
* incorrect ownership flows
* wrong navigation semantics
* inconsistent authenticated behavior
* weak UX structure
* oversized sections
* incorrect web parity
* cluttered account management

This phase must transform Profile + Account ecosystem into:

* premium
* minimal
* intentional
* mobile-first
* ownership-driven
* web-app aligned
* production-grade

======================================================================
MANDATORY WEB-APP REFERENCE ANALYSIS
====================================

FIRST:
Analyze web app deeply.

Reference:
[http://localhost:8081/](http://localhost:8081/)

MANDATORY ANALYSIS:

* profile structure
* quick actions
* ownership pages
* user management flows
* rewards integration
* listings integration
* account navigation
* complaints/feedback access
* permissions
* visibility logic

DO NOT:
invent profile actions.

ONLY implement:
validated web-app actions.

======================================================================
CURRENT ROOT FAILURES
=====================

Android profile currently has:

* redundant quick actions
* duplicated routes
* fake dashboard entries
* random utility shortcuts
* wrong ownership structure
* incorrect user-flow grouping
* weak mobile UX hierarchy
* session inconsistency
* auth corruption
* unnecessary clutter

This creates:

* confusion
* low discoverability
* broken ownership experience
* weak trust
* non-premium UX

======================================================================
PROFILE PAGE COMPLETE REBUILD
=============================

OBJECTIVE:
Create premium mobile-native profile experience.

---

## REMOVE

REMOVE:

* duplicate profile access
* duplicate dashboard entries
* unnecessary quick actions
* experimental shortcuts
* placeholder buttons
* unused utilities
* fake management pages

---

## KEEP ONLY WEB-VALIDATED FEATURES

Examples:
(Validate from web app first)

* My Home
* My Feed
* Rewards
* Feedback
* Complaints
* SaleDone
* SaleUndone
* Plans
* Account Settings

ONLY if actually present in web app.

======================================================================
PROFILE HERO SECTION REBUILD
============================

CURRENT PROBLEMS

* oversized banner
* poor spacing
* weak responsiveness
* cluttered information
* incorrect hierarchy

---

REQUIRED REBUILD

Implement:

* compact responsive header
* premium card layout
* adaptive spacing
* mobile-first hierarchy
* cleaner visual density
* profile image optimization
* responsive typography
* balanced CTA positioning

---

PROFILE HEADER SHOULD FEEL

* premium
* lightweight
* intentional
* trustworthy
* uncluttered

======================================================================
PROFILE INFORMATION ARCHITECTURE
================================

MANDATORY STRUCTURE

---

## SECTION 1 — USER IDENTITY

Include:

* profile image
* username
* verification/badges if applicable
* joined date
* reputation/reward indicators

---

## SECTION 2 — PRIMARY ACTIONS

ONLY high-value actions.

Examples:
(validate from web app)

* My Home
* My Feed
* Rewards
* Sell/Post

---

## SECTION 3 — OWNERSHIP MANAGEMENT

Ownership flows only.

Examples:

* SaleDone
* SaleUndone
* Feedback
* Complaints

---

## SECTION 4 — SETTINGS / SUPPORT

Minimal utility actions.

Examples:

* language
* help
* logout

======================================================================
REMOVE REDUNDANT PAGE DUPLICATION
=================================

CURRENT ISSUE

Same pages appear:

* bottom navbar
* top navbar
* hamburger menu
* profile quick actions

This creates:

* redundancy
* confusion
* bloated UX

---

MANDATORY RULES

IF FEATURE EXISTS IN:
bottom navbar

DO NOT duplicate unnecessarily inside:
profile quick actions.

---

Examples:

IF:
Rewards exists in navbar

DO NOT create:
another heavy Rewards shortcut inside profile.

---

KEEP:
only contextual shortcuts.

======================================================================
MY HOME REBUILD
===============

CURRENT ISSUE

Android implementation incorrect.

---

CORRECT SEMANTICS

My Home =
current user's own marketplace listings.

NOT:
dashboard clone.
NOT:
social feed.

---

IMPLEMENT

* user-owned listings
* ownership actions
* edit listing
* delete listing
* mark sold
* relist
* status indicators
* ownership analytics if applicable

---

MUST MATCH WEB APP

* structure
* actions
* filters
* permissions
* UX hierarchy

======================================================================
SALE DONE / SALE UNDONE REBUILD
===============================

CURRENT ISSUE

Random Android implementations created.

No web parity.

---

MANDATORY ACTION

Login to web app using demo credentials.

Capture:

* screenshots
* workflows
* layouts
* interactions
* permissions

THEN:
replicate accurately.

---

IMPLEMENT

SaleDone:

* completed sales
* sold records
* buyer interactions
* status tracking

SaleUndone:

* pending/incomplete sales
* unresolved deals
* follow-up actions

---

NO:
placeholder implementations.
NO:
fake dashboards.

======================================================================
FEEDBACK & COMPLAINTS REBUILD
=============================

CURRENT ISSUE

Incorrect structure and weak functionality.

---

IMPLEMENT WEB-ALIGNED FLOWS

Required:

* proper form structure
* proper issue categorization
* ticket status if web supports
* ownership visibility
* submission confirmation
* history tracking if supported

---

UX REQUIREMENTS

* clean forms
* mobile spacing
* guided submission
* proper validation
* premium interaction feedback

======================================================================
AUTHENTICATION & SESSION STABILITY
==================================

CRITICAL ISSUES

Currently:

* rewards asking login again
* fake session timeout
* auth state corruption
* stale token handling
* incorrect protected-route behavior

---

MANDATORY FIXES

Implement centralized auth system.

---

REQUIRED ARCHITECTURE

Centralized:

* auth provider
* token manager
* refresh handler
* session lifecycle manager
* protected route middleware

---

VALIDATE

* login persistence
* token refresh
* protected route access
* guest handling
* logout cleanup

======================================================================
GUEST VS AUTHENTICATED USER FLOWS
=================================

IMPLEMENT WEB-APP LOGIC EXACTLY.

---

GUEST USERS

Can:

* partially browse
* limited previews
* limited feed access

Cannot:

* access ownership pages
* perform protected actions

---

AUTH TRIGGERS

Show login/signup modal when:

* protected action attempted
* deep scrolling threshold reached
* ownership route opened

---

IMPORTANT

Do NOT:
randomly force login on already authenticated users.

======================================================================
PROFILE NAVIGATION TESTING
==========================

MANDATORY TESTS

---

TEST:
Profile → Rewards

Expected:
No login prompt.

---

TEST:
Profile → SaleDone

Expected:
Correct ownership data.

---

TEST:
Logout → Open protected page

Expected:
Login modal.

---

TEST:
Login → restart app

Expected:
Session persists.

---

TEST:
Open profile repeatedly

Expected:
No session timeout errors.

======================================================================
UX QUALITY REQUIREMENTS
=======================

PROFILE ECOSYSTEM MUST FEEL

* premium
* lightweight
* intentional
* ownership-focused
* scalable
* uncluttered

---

DO NOT CREATE

* admin-dashboard feel
* cluttered account center
* duplicate utilities
* random shortcuts

---

TARGET EXPERIENCE

Modern:
social-commerce account ecosystem.

======================================================================
PROOF-BASED DELIVERY
====================

MANDATORY DELIVERABLES

For EVERY rebuilt page provide:

* web-app screenshots
* Android before screenshots
* Android after screenshots
* UX comparison proof
* navigation proof
* auth validation proof
* regression proof

WITHOUT PROOF:
task NOT complete.

======================================================================
STRICT ACCEPTANCE CRITERIA
==========================

DO NOT MARK COMPLETE IF:

* quick actions still redundant
* auth prompts still broken
* fake session timeout exists
* SaleDone mismatches web app
* profile structure cluttered
* duplicate navigation exists
* ownership semantics incorrect
* placeholder pages remain
* mobile spacing weak
* web parity partial

======================================================================
FINAL PHASE GOAL
================

The Profile + Account ecosystem must become:

* web-app aligned
* semantically correct
* mobile-first
* stable
* premium
* ownership-focused
* production-grade

with:

* zero auth corruption
* zero duplicate routes
* zero fake dashboards
* zero placeholder flows
* zero redundant shortcuts
* zero weak mobile UX
* zero inconsistent ownership logic

The final experience should feel like:
a premium modern social-commerce mobile account system,
NOT a cluttered utility/settings panel.
# PHASE 11 — PROFILE, ACCOUNT, AUTH & OWNERSHIP FLOWS

# COMPLETE QA / TEST CASE SUITE

# PRODUCTION-GRADE VALIDATION MATRIX

======================================================================
PHASE OBJECTIVE
===============

Validate the COMPLETE stability, correctness, UX quality, navigation behavior, authentication integrity, ownership semantics, and web-app parity of:

* Profile
* Rewards
* My Home
* My Feed
* SaleDone
* SaleUndone
* Feedback
* Complaints
* Auth flows
* Session management
* Guest access
* Ownership flows
* Account ecosystem

NO feature should be considered complete until ALL tests pass.

======================================================================
TESTING COVERAGE
================

This QA suite covers:

* Functional testing
* UI/UX testing
* Regression testing
* State testing
* Auth testing
* Session testing
* Lifecycle testing
* Navigation testing
* Edge-case testing
* Stress testing
* Web-parity validation
* Permission testing
* Ownership testing
* Mobile responsiveness testing

======================================================================
SECTION 1 — PROFILE PAGE TEST CASES
===================================

OBJECTIVE:
Validate premium profile experience + correct ownership architecture.

---

## TC-PROFILE-001

ACTION:
Open Profile page after login.

EXPECTED:

* profile loads successfully
* no blank state
* no session timeout
* no auth popup
* correct user data shown

---

## TC-PROFILE-002

VALIDATE:
Profile hero section.

EXPECTED:

* compact layout
* responsive spacing
* no oversized banner
* mobile-friendly hierarchy
* premium visual feel

---

## TC-PROFILE-003

VALIDATE:
Quick actions.

EXPECTED:

* only relevant actions visible
* no duplicate utilities
* no random shortcuts
* no redundant pages

---

## TC-PROFILE-004

VALIDATE:
No duplicate navigation.

EXPECTED:
Pages already in:

* bottom navbar
* hamburger menu

should NOT unnecessarily duplicate in profile.

---

## TC-PROFILE-005

ACTION:
Repeatedly open/close profile.

EXPECTED:

* no flicker
* no stale state
* no crashes
* no memory leaks

---

## TC-PROFILE-006

ACTION:
Navigate:
Profile → Rewards → Back → Profile.

EXPECTED:

* correct state persistence
* no re-login
* no session corruption

---

## TC-PROFILE-007

ACTION:
Rotate device.

EXPECTED:

* layout preserved
* no overflow
* no state reset

---

## TC-PROFILE-008

ACTION:
Background app → foreground app while on Profile.

EXPECTED:

* profile restores correctly
* no session timeout

---

## TC-PROFILE-009

VALIDATE:
Typography and spacing.

EXPECTED:

* premium spacing
* consistent margins
* readable hierarchy

---

## TC-PROFILE-010

VALIDATE:
Web parity.

EXPECTED:
Profile structure matches web app semantics.

======================================================================
SECTION 2 — AUTHENTICATION TEST CASES
=====================================

OBJECTIVE:
Validate auth/session stability.

---

## TC-AUTH-001

ACTION:
Login using demo user.

EXPECTED:

* login success
* token stored correctly
* session active

---

## TC-AUTH-002

ACTION:
Navigate to Rewards after login.

EXPECTED:

* NO login prompt
* NO session timeout

---

## TC-AUTH-003

ACTION:
Navigate:
Profile → SaleDone → Complaints → Rewards.

EXPECTED:
Session remains valid globally.

---

## TC-AUTH-004

ACTION:
Restart app after login.

EXPECTED:

* session persists
* no forced logout

---

## TC-AUTH-005

ACTION:
Token refresh simulation.

EXPECTED:

* silent token refresh
* no forced login

---

## TC-AUTH-006

ACTION:
Logout.

EXPECTED:

* auth cleared
* protected pages inaccessible

---

## TC-AUTH-007

ACTION:
Guest opens protected page.

EXPECTED:

* login/signup modal shown

---

## TC-AUTH-008

ACTION:
Repeated login/logout stress test.

EXPECTED:

* no auth corruption
* no stale session

---

## TC-AUTH-009

ACTION:
Force network interruption during auth refresh.

EXPECTED:

* graceful recovery
* no app crash

---

## TC-AUTH-010

VALIDATE:
No fake “Session Timeout” messages.

EXPECTED:
No incorrect timeout states.

======================================================================
SECTION 3 — MY HOME TEST CASES
==============================

OBJECTIVE:
Validate ownership semantics.

---

## TC-MYHOME-001

ACTION:
Open My Home.

EXPECTED:
ONLY current user's listings visible.

---

## TC-MYHOME-002

VALIDATE:
No feed/social posts inside My Home.

EXPECTED:
Marketplace listings only.

---

## TC-MYHOME-003

ACTION:
Edit listing.

EXPECTED:

* edit successful
* state updates correctly

---

## TC-MYHOME-004

ACTION:
Delete listing.

EXPECTED:

* listing removed
* UI updates instantly

---

## TC-MYHOME-005

ACTION:
Mark listing sold.

EXPECTED:
Moves correctly into SaleDone.

---

## TC-MYHOME-006

VALIDATE:
Ownership actions.

EXPECTED:
Only owner's listings editable.

---

## TC-MYHOME-007

ACTION:
Guest opens My Home.

EXPECTED:
Authentication required.

---

## TC-MYHOME-008

VALIDATE:
Web-app parity.

EXPECTED:
Same structure/flows as web app.

======================================================================
SECTION 4 — SALEDONE / SALEUNDONE TEST CASES
============================================

OBJECTIVE:
Validate marketplace ownership tracking.

---

## TC-SALE-001

ACTION:
Open SaleDone.

EXPECTED:
Completed sales visible.

---

## TC-SALE-002

ACTION:
Open SaleUndone.

EXPECTED:
Pending/incomplete deals visible.

---

## TC-SALE-003

VALIDATE:
No placeholder data.

EXPECTED:
Real API-driven content only.

---

## TC-SALE-004

ACTION:
Open sale detail.

EXPECTED:
Correct detail rendering.

---

## TC-SALE-005

ACTION:
Repeated navigation stress.

EXPECTED:
No blank pages.
No stale state.

---

## TC-SALE-006

VALIDATE:
Web parity.

EXPECTED:
Same workflow as web app.

---

## TC-SALE-007

ACTION:
Guest opens SaleDone.

EXPECTED:
Login required.

======================================================================
SECTION 5 — FEEDBACK & COMPLAINTS TEST CASES
============================================

OBJECTIVE:
Validate support flows.

---

## TC-FC-001

ACTION:
Open Feedback page.

EXPECTED:
Correct form structure.

---

## TC-FC-002

ACTION:
Submit valid feedback.

EXPECTED:
Success response.

---

## TC-FC-003

ACTION:
Submit empty feedback.

EXPECTED:
Validation error shown.

---

## TC-FC-004

ACTION:
Open Complaints page.

EXPECTED:
Correct categories/options visible.

---

## TC-FC-005

ACTION:
Submit complaint.

EXPECTED:
Complaint saved successfully.

---

## TC-FC-006

VALIDATE:
Responsive forms.

EXPECTED:
No overflow or broken layout.

---

## TC-FC-007

VALIDATE:
Web-app parity.

EXPECTED:
Same fields/workflow as web app.

======================================================================
SECTION 6 — REWARDS PAGE TEST CASES
===================================

OBJECTIVE:
Validate rewards stability.

---

## TC-REWARD-001

ACTION:
Open Rewards while logged in.

EXPECTED:
No login popup.

---

## TC-REWARD-002

VALIDATE:
Rewards rendering.

EXPECTED:
No blank sections.

---

## TC-REWARD-003

VALIDATE:
Responsive card layout.

EXPECTED:
Proper spacing/alignment.

---

## TC-REWARD-004

ACTION:
Repeated open/close Rewards.

EXPECTED:
No crashes.
No auth corruption.

---

## TC-REWARD-005

VALIDATE:
Reward summaries/progress.

EXPECTED:
Correct data rendering.

---

## TC-REWARD-006

VALIDATE:
Web-app parity.

EXPECTED:
Same reward behavior as web app.

======================================================================
SECTION 7 — GUEST ACCESS TEST CASES
===================================

OBJECTIVE:
Validate guest vs auth logic.

---

## TC-GUEST-001

ACTION:
Use app without login.

EXPECTED:
Limited browsing allowed.

---

## TC-GUEST-002

ACTION:
Deep scroll AllPosts.

EXPECTED:
Login prompt appears at threshold.

---

## TC-GUEST-003

ACTION:
Open protected ownership page.

EXPECTED:
Login required.

---

## TC-GUEST-004

VALIDATE:
Guest restrictions.

EXPECTED:
No ownership actions accessible.

---

## TC-GUEST-005

ACTION:
Login after guest browsing.

EXPECTED:
Smooth state transition.

======================================================================
SECTION 8 — STRESS & REGRESSION TEST CASES
==========================================

OBJECTIVE:
Prevent hidden production bugs.

---

## TC-REG-001

Repeated navigation stress test:

* Profile
* Rewards
* MyHome
* SaleDone
* Feed

EXPECTED:
No crashes.

---

## TC-REG-002

Repeated login/logout cycles.

EXPECTED:
Stable auth lifecycle.

---

## TC-REG-003

Background/foreground stress.

EXPECTED:
State persistence maintained.

---

## TC-REG-004

Low-network simulation.

EXPECTED:
Graceful handling.

---

## TC-REG-005

Offline recovery.

EXPECTED:
No app corruption.

---

## TC-REG-006

Memory leak testing.

EXPECTED:
No abnormal memory growth.

---

## TC-REG-007

Crash testing.

EXPECTED:
No fatal exceptions.

---

## TC-REG-008

Rapid tap testing.

EXPECTED:
No duplicated navigation/events.

---

## TC-REG-009

Lifecycle destruction/recreation.

EXPECTED:
State restored safely.

---

## TC-REG-010

Full regression after fixes.

EXPECTED:
No old bugs reintroduced.

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK PHASE COMPLETE IF:

* auth still unstable
* rewards asks login
* fake session timeout exists
* MyHome semantics incorrect
* SaleDone differs from web app
* duplicate pages remain
* profile clutter exists
* ownership flows broken
* placeholder pages exist
* weak mobile UX remains
* stale states occur
* lifecycle bugs remain
* regression failures exist

======================================================================
FINAL PHASE GOAL
================

The account ecosystem must finally become:

* stable
* premium
* ownership-driven
* web-aligned
* scalable
* mobile-first
* production-grade

with:

* zero auth corruption
* zero fake session bugs
* zero duplicate navigation
* zero redundant pages
* zero placeholder implementations
* zero stale state issues
* zero broken ownership flows
* zero weak mobile UX

The final result must feel like:
a world-class social-commerce mobile account ecosystem.
# PHASE 12 — HAMBURGER MENU, INFORMATION ARCHITECTURE & NAVIGATION ECOSYSTEM REBUILD

# COMPLETE WEB-APP PARITY + MOBILE-FIRST UX + FEATURE DISCOVERY OPTIMIZATION

======================================================================
PHASE OBJECTIVE
===============

This phase focuses on rebuilding the COMPLETE navigation ecosystem.

Current Android implementation problems:

* hamburger menu too lengthy
* random pages added
* required pages missing
* duplicate routes everywhere
* inconsistent navigation hierarchy
* fake web parity
* poor information architecture
* user confusion
* redundant access points
* weak discoverability
* poor grouping logic
* cluttered UX
* broken page routing
* invented Android-only pages
* non-functional menu pages

This phase must transform navigation into:

* clean
* intentional
* web-aligned
* discoverable
* minimal
* mobile-native
* scalable
* production-grade

======================================================================
MANDATORY WEB-APP ANALYSIS
==========================

BEFORE IMPLEMENTATION:

Perform COMPLETE reverse engineering of:

[http://localhost:8081/](http://localhost:8081/)

MANDATORY ANALYSIS:

* bottom navbar pages
* top navbar actions
* hamburger menu items
* page grouping
* feature ownership
* contextual actions
* repeated routes
* navigation hierarchy
* account vs trade vs social separation
* utility placement
* user journey flows

---

DO NOT:

* invent navigation
* invent menu pages
* invent grouping logic
* create Android-only utility clutter

---

ONLY IMPLEMENT:
validated web-app navigation architecture.

======================================================================
CRITICAL ROOT FAILURES
======================

Current Android navigation has:

* duplicated pages
* fake parity
* random utilities
* unnecessary routes
* redundant menu entries
* overlapping responsibilities
* weak contextual navigation
* incorrect feature discoverability

This creates:

* user confusion
* navigation fatigue
* clutter
* broken UX hierarchy
* poor usability

======================================================================
NAVIGATION PHILOSOPHY
=====================

The app should behave like:

MODULAR ECOSYSTEMS.

---

HOME PAGE

Acts as:
ecosystem selector.

Examples:

* Fashion
* Electronics
* Vehicles
* etc.

---

AFTER CATEGORY ENTRY

User enters:
dedicated category ecosystem.

Example:
Fashion ecosystem should feel like:
independent Fashion marketplace/social platform.

---

IMPORTANT

Inside Fashion ecosystem:
DO NOT show Electronics categories.

---

This ecosystem separation must match web app.

======================================================================
BOTTOM NAVBAR COMPLETE REBUILD
==============================

CURRENT ISSUES

* wrong pages
* missing pages
* inconsistent tabs
* incorrect parity
* random Android additions
* broken active states

---

MANDATORY TASK

Capture bottom navbar from web app after login.

---

COMPARE:

WEB NAVBAR
vs
ANDROID NAVBAR

---

REMOVE:
any Android-only tabs not present in web app.

---

VALIDATE:
every tab against web app.

---

EXPECTED STRUCTURE
(Validate before finalizing)

Potential structure:

* Home
* AllPosts
* ForYou
* Feed
* Rewards
* Profile

ONLY if web app confirms.

---

STRICT RULE

Bottom navbar must contain:
PRIMARY HIGH-FREQUENCY DESTINATIONS ONLY.

---

DO NOT ADD:

* utility pages
* secondary tools
* admin flows
* compare page
* saved searches
* wishlist
* notifications
* recently viewed

unless web app explicitly places them there.

======================================================================
TOP NAVBAR COMPLETE REBUILD
===========================

CURRENT ISSUES

* inconsistent actions
* duplicate features
* broken filters
* weak contextual behavior
* random icons

---

MANDATORY REBUILD

Top navbar must be:
CONTEXTUAL.

---

HOME PAGE

NO top navbar clutter.

---

ALLPOSTS

Include ONLY:

* search
* quick filters
* compare triggers
* saved search if validated
* contextual actions

---

FEED

Social/discussion actions only.

---

PROFILE

Minimal clean header only.

---

REMOVE:
duplicate utilities from top navbar if already elsewhere.

======================================================================
HAMBURGER MENU COMPLETE RESTRUCTURE
===================================

CURRENT FAILURE

Hamburger menu currently:

* too large
* cluttered
* duplicated
* confusing
* semantically incorrect

---

MANDATORY TASK

Capture FULL hamburger menu from web app.

---

COMPARE:

WEB MENU
vs
ANDROID MENU

---

REMOVE:
every Android-only redundant route.

---

DO NOT KEEP:

* duplicate compare
* duplicate profile
* duplicate rewards
* duplicate wishlist
* duplicate notifications
* duplicate cart
* duplicate saved searches
* duplicate recently viewed

IF already accessible contextually elsewhere.

======================================================================
CONTEXTUAL FEATURE OWNERSHIP RULES
==================================

MANDATORY RULE:

Features must live in their MOST NATURAL CONTEXT.

---

COMPARE

Should exist:
inside AllPosts browsing experience.

NOT:
heavy standalone hamburger focus.

---

SAVED SEARCHES

Should exist:
inside search/filter flow.

NOT:
prominent menu clutter.

---

RECENTLY VIEWED

Should exist:
inside browsing/history context.

NOT:
major menu emphasis.

---

NOTIFICATIONS

Should exist:
top-level lightweight access.

NOT:
duplicated everywhere.

======================================================================
MENU GROUPING REBUILD
=====================

CURRENT ISSUE

Trade / Social / Accounts grouping still cluttered.

---

MANDATORY RESTRUCTURE

Group ONLY:
high-value pages.

---

EXAMPLE STRUCTURE
(Validate with web app)

TRADE

* MyHome
* SaleDone
* SaleUndone
* Plans

SOCIAL

* Feed
* MyFeed

ACCOUNT

* Rewards
* Complaints
* Feedback
* Settings

---

REMOVE:
low-value utility clutter.

---

DO NOT:
create deep overwhelming navigation trees.

======================================================================
PAGE VALIDATION REQUIREMENTS
============================

MANDATORY:
Every menu page must be:

* fully functional
* API connected
* web-parity aligned
* mobile-optimized
* semantically correct

---

NO:

* placeholder pages
* copied screens
* fake implementations
* empty pages
* random cloned layouts

======================================================================
MY HOME / SALEDONE / FEEDBACK WEB REFERENCE REBUILD
===================================================

MANDATORY TASK

Login into web app.

Capture screenshots of:

* MyHome
* SaleDone
* SaleUndone
* Complaints
* Feedback

---

THEN:
implement EXACT semantic equivalents in Android.

---

NO:
invented Android versions allowed.

======================================================================
BACK NAVIGATION REBUILD
=======================

CURRENT ISSUE

Back navigation feels inconsistent and confusing.

---

IMPLEMENT:

predictable mobile-native navigation behavior.

---

EXAMPLES

Deep page → Back:
should return logically.

NOT:
random navigation stack jumps.

---

INSIDE ECOSYSTEM

Back should maintain:
ecosystem continuity.

---

OPTIONAL IMPROVEMENT

Some flows may return:
AllPosts
instead of:
exiting ecosystem completely.

Validate best UX behavior.

======================================================================
SEARCH / FILTER / COMPARE INTEGRATION
=====================================

CURRENT ISSUE

Features fragmented across app.

---

MANDATORY REBUILD

Integrate tightly into AllPosts.

---

IMPLEMENT:

* sticky quick filters
* subcategory chips
* compare actions
* saved searches
* contextual browsing tools

---

DO NOT:
scatter these into hamburger unnecessarily.

======================================================================
REDUNDANCY ELIMINATION DIRECTIVE
================================

REMOVE:

* duplicate routes
* duplicate utilities
* duplicate profile access
* duplicate compare access
* duplicate wishlist access
* duplicate saved-search access

---

GOAL

Every feature should have:
ONE primary home.

======================================================================
UX QUALITY REQUIREMENTS
=======================

FINAL NAVIGATION MUST FEEL:

* lightweight
* premium
* intentional
* scalable
* uncluttered
* discoverable
* ecosystem-driven
* mobile-native

---

NOT:
utility-dashboard-heavy.

======================================================================
STRICT TESTING REQUIREMENTS
===========================

MANDATORY TESTING

* navigation testing
* route consistency testing
* back-stack testing
* duplicate-route testing
* lifecycle testing
* menu interaction testing
* responsiveness testing
* stress testing
* ecosystem-isolation testing
* web parity testing

---

TEST:

* every menu item
* every navbar item
* every back action
* every route transition
* every contextual action

======================================================================
PROOF-BASED DELIVERY
====================

MANDATORY DELIVERABLES

For EACH rebuilt navigation module provide:

* web screenshots
* Android before screenshots
* Android after screenshots
* navigation recordings
* route validation proof
* regression proof
* parity proof

WITHOUT PROOF:
task NOT complete.

======================================================================
STRICT ACCEPTANCE CRITERIA
==========================

DO NOT MARK COMPLETE IF:

* hamburger still cluttered
* duplicate pages remain
* fake parity exists
* Android-only pages remain
* contextual actions duplicated
* compare still fragmented
* navigation inconsistent
* back behavior confusing
* ecosystem separation broken
* web parity partial
* utility clutter remains

======================================================================
FINAL PHASE GOAL
================

The navigation ecosystem must become:

* clean
* intuitive
* web-aligned
* scalable
* premium
* ecosystem-driven
* mobile-native
* production-grade

with:

* zero duplicate routes
* zero fake parity
* zero Android-only clutter
* zero navigation confusion
* zero inconsistent back behavior
* zero placeholder pages
* zero fragmented feature ownership

The final experience should feel like:
a world-class mobile-native social-commerce ecosystem,
NOT a cluttered multi-tool utility application.
# PHASE 12 — HAMBURGER MENU, NAVIGATION & INFORMATION ARCHITECTURE

# COMPLETE QA / TEST CASE SUITE

# WEB-APP PARITY + NAVIGATION STABILITY + MOBILE UX VALIDATION

======================================================================
PHASE OBJECTIVE
===============

Validate the COMPLETE navigation ecosystem including:

* Home navigation
* Bottom navbar
* Top navbar
* Hamburger menu
* Back navigation
* Ecosystem isolation
* Route consistency
* Feature discoverability
* Contextual feature ownership
* Menu grouping
* Navigation hierarchy
* Web-app parity
* UX consistency
* State persistence
* Lifecycle stability

Goal:
Create a clean, predictable, mobile-native navigation ecosystem with zero redundancy and full web parity.

======================================================================
SECTION 1 — HOME PAGE NAVIGATION TEST CASES
===========================================

OBJECTIVE:
Validate ecosystem-entry architecture.

---

## TC-HOME-NAV-001

ACTION:
Launch app.

EXPECTED:
Only visible:

* branding
* 4 ecosystem categories

NOT visible:

* bottom navbar
* unnecessary top navbar
* clutter utilities

---

## TC-HOME-NAV-002

ACTION:
Open Fashion ecosystem.

EXPECTED:
Navigate into Fashion ecosystem only.

---

## TC-HOME-NAV-003

ACTION:
Inside Fashion ecosystem.

EXPECTED:
No Electronics categories visible.

---

## TC-HOME-NAV-004

ACTION:
Back from ecosystem to Home.

EXPECTED:
Home restored correctly.

---

## TC-HOME-NAV-005

ACTION:
Switch ecosystems repeatedly.

EXPECTED:
No stale ecosystem state.

---

## TC-HOME-NAV-006

ACTION:
Restart app while inside ecosystem.

EXPECTED:
Correct restoration behavior.

======================================================================
SECTION 2 — BOTTOM NAVBAR TEST CASES
====================================

OBJECTIVE:
Validate bottom navbar correctness.

---

## TC-BNAV-001

ACTION:
Compare Android bottom navbar with web app.

EXPECTED:
Only web-app validated tabs exist.

---

## TC-BNAV-002

VALIDATE:
No Android-only tabs.

EXPECTED:
No random pages added.

---

## TC-BNAV-003

ACTION:
Tap Home.

EXPECTED:
Returns correctly to ecosystem/home behavior.

---

## TC-BNAV-004

ACTION:
Tap AllPosts.

EXPECTED:
Correct AllPosts rendering.

---

## TC-BNAV-005

ACTION:
Tap Feed.

EXPECTED:
Feed opens correctly.

---

## TC-BNAV-006

ACTION:
Tap ForYou.

EXPECTED:
No crash.
Correct page rendering.

---

## TC-BNAV-007

ACTION:
Tap Rewards.

EXPECTED:
No login issue for authenticated user.

---

## TC-BNAV-008

ACTION:
Tap Profile.

EXPECTED:
Correct profile rendering.

---

## TC-BNAV-009

VALIDATE:
Active tab highlighting.

EXPECTED:
Always synchronized with current route.

---

## TC-BNAV-010

ACTION:
Rapidly switch tabs repeatedly.

EXPECTED:
No stale navigation state.
No crashes.

---

## TC-BNAV-011

ACTION:
Background/foreground app while switching tabs.

EXPECTED:
State restored safely.

======================================================================
SECTION 3 — TOP NAVBAR TEST CASES
=================================

OBJECTIVE:
Validate contextual navbar behavior.

---

## TC-TNAV-001

ACTION:
Open Home page.

EXPECTED:
No unnecessary top navbar clutter.

---

## TC-TNAV-002

ACTION:
Open AllPosts.

EXPECTED:
Top navbar contains:

* search
* filters
* contextual actions only

---

## TC-TNAV-003

ACTION:
Tap filter button beside search.

EXPECTED:
Filter panel opens correctly.

---

## TC-TNAV-004

ACTION:
Apply filters.

EXPECTED:
Listings update correctly.

---

## TC-TNAV-005

ACTION:
Open Feed.

EXPECTED:
Feed-specific actions only.

---

## TC-TNAV-006

ACTION:
Open Profile.

EXPECTED:
Minimal clean header.

---

## TC-TNAV-007

VALIDATE:
No duplicated contextual actions.

EXPECTED:
No unnecessary repeated icons/features.

======================================================================
SECTION 4 — HAMBURGER MENU TEST CASES
=====================================

OBJECTIVE:
Validate clean information architecture.

---

## TC-HMENU-001

ACTION:
Open hamburger menu.

EXPECTED:
Clean grouped structure.

---

## TC-HMENU-002

VALIDATE:
Menu grouping.

EXPECTED:
Logical grouping:

* Trade
* Social
* Account

ONLY if validated from web app.

---

## TC-HMENU-003

VALIDATE:
No duplicate pages.

EXPECTED:
No duplicated:

* Profile
* Rewards
* Compare
* Wishlist
* Notifications

---

## TC-HMENU-004

VALIDATE:
No Android-only invented pages.

EXPECTED:
Only web-app validated routes exist.

---

## TC-HMENU-005

ACTION:
Open MyHome from menu.

EXPECTED:
Correct ownership listings page.

---

## TC-HMENU-006

ACTION:
Open SaleDone.

EXPECTED:
Correct completed sales page.

---

## TC-HMENU-007

ACTION:
Open SaleUndone.

EXPECTED:
Correct pending sales page.

---

## TC-HMENU-008

ACTION:
Open Feedback.

EXPECTED:
Correct feedback workflow.

---

## TC-HMENU-009

ACTION:
Open Complaints.

EXPECTED:
Correct complaint workflow.

---

## TC-HMENU-010

ACTION:
Open every menu page sequentially.

EXPECTED:
No blank screens.
No crashes.
No placeholder pages.

---

## TC-HMENU-011

ACTION:
Collapse/expand grouped sections repeatedly.

EXPECTED:
Smooth behavior.
No UI glitches.

======================================================================
SECTION 5 — CONTEXTUAL FEATURE OWNERSHIP TEST CASES
===================================================

OBJECTIVE:
Validate features exist in correct locations.

---

## TC-CONTEXT-001

VALIDATE:
Compare feature placement.

EXPECTED:
Integrated inside AllPosts.
NOT unnecessarily duplicated in menu.

---

## TC-CONTEXT-002

VALIDATE:
Saved searches placement.

EXPECTED:
Inside search/filter flow only.

---

## TC-CONTEXT-003

VALIDATE:
Recently viewed placement.

EXPECTED:
Contextual browsing/history location only.

---

## TC-CONTEXT-004

VALIDATE:
Wishlist placement.

EXPECTED:
No duplicate access points.

---

## TC-CONTEXT-005

VALIDATE:
Notifications placement.

EXPECTED:
Single intentional access point.

======================================================================
SECTION 6 — BACK NAVIGATION TEST CASES
======================================

OBJECTIVE:
Validate predictable mobile navigation.

---

## TC-BACK-001

ACTION:
Navigate:
AllPosts → Detail → Back.

EXPECTED:
Returns correctly to AllPosts.

---

## TC-BACK-002

ACTION:
Deep navigation chain then back repeatedly.

EXPECTED:
Predictable navigation stack behavior.

---

## TC-BACK-003

ACTION:
Navigate:
Profile → Rewards → Back.

EXPECTED:
Returns correctly to Profile.

---

## TC-BACK-004

ACTION:
Switch ecosystem then press back.

EXPECTED:
Correct ecosystem navigation handling.

---

## TC-BACK-005

ACTION:
Rapid back presses.

EXPECTED:
No crashes.
No route corruption.

======================================================================
SECTION 7 — ECOSYSTEM ISOLATION TEST CASES
==========================================

OBJECTIVE:
Validate category-platform separation.

---

## TC-ECO-001

ACTION:
Enter Fashion ecosystem.

EXPECTED:
Only Fashion-related subcategories visible.

---

## TC-ECO-002

ACTION:
Validate AllPosts category bar.

EXPECTED:
NO global categories.
Only ecosystem-specific subcategories.

---

## TC-ECO-003

ACTION:
Apply subcategory filters.

EXPECTED:
Correct ecosystem filtering.

---

## TC-ECO-004

ACTION:
Switch to Electronics ecosystem.

EXPECTED:
Fashion data fully removed.

---

## TC-ECO-005

VALIDATE:
Cross-category leakage.

EXPECTED:
No mixed ecosystem data.

======================================================================
SECTION 8 — RESPONSIVENESS & UX TEST CASES
==========================================

OBJECTIVE:
Validate mobile-native quality.

---

## TC-UXNAV-001

VALIDATE:
Menu spacing.

EXPECTED:
Clean mobile spacing.

---

## TC-UXNAV-002

VALIDATE:
Touch targets.

EXPECTED:
Easy thumb accessibility.

---

## TC-UXNAV-003

VALIDATE:
Typography hierarchy.

EXPECTED:
Readable and premium.

---

## TC-UXNAV-004

VALIDATE:
Animations/transitions.

EXPECTED:
Smooth interactions.

---

## TC-UXNAV-005

VALIDATE:
Small-screen responsiveness.

EXPECTED:
No overflow issues.

======================================================================
SECTION 9 — STRESS & REGRESSION TEST CASES
==========================================

OBJECTIVE:
Prevent hidden navigation bugs.

---

## TC-REGNAV-001

Repeated menu open/close stress test.

EXPECTED:
No glitches.

---

## TC-REGNAV-002

Repeated navbar switching stress test.

EXPECTED:
Stable navigation state.

---

## TC-REGNAV-003

Rapid ecosystem switching.

EXPECTED:
No stale data.

---

## TC-REGNAV-004

Background/foreground lifecycle stress.

EXPECTED:
Navigation state preserved.

---

## TC-REGNAV-005

Offline/online navigation testing.

EXPECTED:
Graceful recovery.

---

## TC-REGNAV-006

Memory leak testing.

EXPECTED:
No abnormal growth.

---

## TC-REGNAV-007

Crash testing.

EXPECTED:
No fatal exceptions.

---

## TC-REGNAV-008

Full regression after every navbar/menu fix.

EXPECTED:
No previous issues reintroduced.

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK PHASE COMPLETE IF:

* hamburger still cluttered
* duplicate pages exist
* Android-only routes remain
* fake parity exists
* compare duplicated incorrectly
* saved searches duplicated
* ecosystem separation broken
* navbar states inconsistent
* filter button broken
* back navigation confusing
* placeholder pages exist
* stale navigation states exist
* lifecycle issues remain

======================================================================
FINAL PHASE GOAL
================

The navigation ecosystem must finally become:

* clean
* intuitive
* scalable
* premium
* web-aligned
* mobile-native
* ecosystem-driven
* production-grade

with:

* zero redundant pages
* zero fake parity
* zero duplicate routes
* zero navigation confusion
* zero stale state issues
* zero Android-only clutter
* zero broken navigation flows
* zero inconsistent contextual actions

The final experience should feel like:
a premium modern mobile-native social-commerce ecosystem,
NOT a cluttered utility-heavy converted web app.

# PHASE 13 — ALLPOSTS, FEED, MY FEED, FOR-YOU & CONTENT EXPERIENCE

# COMPLETE IMPLEMENTATION + QA + WEB PARITY TEST SUITE

======================================================================
PHASE OBJECTIVE
===============

Rebuild and validate the COMPLETE content ecosystem including:

* AllPosts
* Feed
* My Feed
* ForYou
* My Home
* Listing cards
* Content semantics
* Hero banners
* Sticky filters
* Quick filters
* Subcategory architecture
* Compare integration
* Content ownership logic
* Infinite scrolling
* Feed hierarchy
* Mobile UX
* Web-app parity

This phase exists because the Android implementation currently has:

* incorrect feature semantics
* duplicated experiences
* fake implementations
* missing web parity
* weak UI/UX
* broken filtering logic
* wrong category behavior
* poor content hierarchy
* unstable navigation behavior
* non-premium browsing experience

Goal:
Transform the browsing/content experience into a premium production-grade mobile ecosystem.

======================================================================
SECTION 1 — FEATURE SEMANTICS VALIDATION
========================================

MANDATORY UNDERSTANDING:

The team MUST first understand the actual purpose of each page.

---

## CORRECT FEATURE PURPOSES

# ALLPOSTS

Marketplace/product listings from all users.

NOT:
social feed
NOT:
news feed

---

# FEED

Knowledge/news/discussion sharing.

NOT:
listing marketplace

---

# MY FEED

Current user's own shared feed/discussion posts.

---

# MY HOME

Current user's marketplace listings/posts.

---

# FOR-YOU

Personalized recommendation engine.

NOT:
duplicate AllPosts page.

---

NO IMPLEMENTATION SHOULD START
until these semantics are fully understood.

======================================================================
SECTION 2 — ALLPOSTS REBUILD REQUIREMENTS
=========================================

CURRENT ISSUES

* weak listing cards
* missing hero banners
* broken quick filters
* wrong category bars
* category confusion
* missing compare integration
* poor mobile UX
* weak browsing experience
* Android differs heavily from web app

---

## REQUIRED REBUILD

ALLPOSTS must become:

* immersive marketplace experience
* premium browsing flow
* highly visual
* mobile-native
* fast and responsive
* filter-driven
* ecosystem-specific

---

## MANDATORY FEATURES

Implement:

* sticky filters
* quick filter chips
* subcategory chips
* hero banners
* compare integration
* premium listing cards
* infinite scroll
* skeleton loaders
* lazy image loading
* responsive spacing
* listing detail navigation

---

## IMPORTANT CATEGORY RULE

The user already selected ecosystem from Home.

Example:

Home
→ Fashion

Then entire internal ecosystem becomes:
Fashion-only ecosystem.

Therefore:

DO NOT show:
global category bars.

ONLY show:
Fashion subcategories.

This is CRITICAL.

---

## CORRECT FLOW

Home
→ Select Fashion
→ Fashion ecosystem
→ AllPosts
→ Fashion subcategories only

NOT:
All global categories mixed again.

======================================================================
SECTION 3 — ALLPOSTS TEST CASES
===============================

---

## TC-ALLPOSTS-001

ACTION:
Enter Fashion ecosystem.

EXPECTED:
Only Fashion data visible.

---

## TC-ALLPOSTS-002

VALIDATE:
Top category bar.

EXPECTED:
Subcategories only.
NO global categories.

---

## TC-ALLPOSTS-003

VALIDATE:
Hero banners.

EXPECTED:
Present and aligned with web app.

---

## TC-ALLPOSTS-004

VALIDATE:
Quick filters.

EXPECTED:
Working sticky quick filters.

---

## TC-ALLPOSTS-005

ACTION:
Tap filter button beside search.

EXPECTED:
Working filter panel.

---

## TC-ALLPOSTS-006

ACTION:
Apply filters.

EXPECTED:
Listings update correctly.

---

## TC-ALLPOSTS-007

VALIDATE:
Listing cards.

EXPECTED:
Premium mobile card design.

---

## TC-ALLPOSTS-008

VALIDATE:
Card style parity.

EXPECTED:
Visual language aligned with Feed card system.

---

## TC-ALLPOSTS-009

ACTION:
Tap listing card.

EXPECTED:
Detailed listing opens correctly.

---

## TC-ALLPOSTS-010

ACTION:
Scroll large dataset.

EXPECTED:
Smooth infinite scrolling.

---

## TC-ALLPOSTS-011

ACTION:
Background/foreground app.

EXPECTED:
Listings persist correctly.

---

## TC-ALLPOSTS-012

ACTION:
Navigate:
AllPosts → Profile → Back.

EXPECTED:
Listings remain loaded.

---

## TC-ALLPOSTS-013

VALIDATE:
No “No Listings Available” stale-state bug.

EXPECTED:
Stable state restoration.

---

## TC-ALLPOSTS-014

VALIDATE:
Compare integration.

EXPECTED:
Integrated compare interactions inside listings.

---

## TC-ALLPOSTS-015

VALIDATE:
No isolated Compare page dependency.

EXPECTED:
Compare contextual only.

======================================================================
SECTION 4 — FEED PAGE REBUILD REQUIREMENTS
==========================================

CURRENT ISSUES

* semantically incorrect
* behaving like image marketplace
* weak layouts
* inconsistent rendering
* not matching web app

---

## CORRECT FEED PURPOSE

Feed =
knowledge/news/discussion sharing.

NOT:
listing marketplace.

---

## REQUIRED FEATURES

Implement:

* descriptive content posts
* article/discussion layouts
* expandable text
* rich typography
* engagement interactions
* comment/share patterns
* readable UX
* discussion-oriented design

---

DO NOT:
convert Feed into listing marketplace.

======================================================================
SECTION 5 — FEED PAGE TEST CASES
================================

---

## TC-FEED-001

VALIDATE:
Feed content type.

EXPECTED:
Discussion/news/knowledge posts.

---

## TC-FEED-002

VALIDATE:
No marketplace listing confusion.

EXPECTED:
Semantics match web app.

---

## TC-FEED-003

VALIDATE:
Typography hierarchy.

EXPECTED:
Readable long-form content.

---

## TC-FEED-004

ACTION:
Expand/collapse long post.

EXPECTED:
Smooth interaction.

---

## TC-FEED-005

VALIDATE:
Feed engagement actions.

EXPECTED:
Working interactions.

---

## TC-FEED-006

ACTION:
Infinite scroll.

EXPECTED:
Stable rendering.

---

## TC-FEED-007

ACTION:
Refresh feed.

EXPECTED:
No duplicated data.

======================================================================
SECTION 6 — MY FEED REBUILD REQUIREMENTS
========================================

CURRENT ISSUES

* wrong ownership logic
* weak differentiation from Feed
* inconsistent data rendering

---

## CORRECT PURPOSE

My Feed =
current user's own shared/discussion posts.

---

## REQUIRED FEATURES

Implement:

* ownership-based filtering
* edit/delete actions
* proper user-content flows
* user-specific rendering
* web parity behavior

======================================================================
SECTION 7 — MY FEED TEST CASES
==============================

---

## TC-MYFEED-001

VALIDATE:
Only current user's feed posts visible.

---

## TC-MYFEED-002

ACTION:
Create new feed post.

EXPECTED:
Appears correctly.

---

## TC-MYFEED-003

ACTION:
Edit post.

EXPECTED:
Updates correctly.

---

## TC-MYFEED-004

ACTION:
Delete post.

EXPECTED:
Removes correctly.

---

## TC-MYFEED-005

VALIDATE:
No cross-user leakage.

EXPECTED:
Only owner data visible.

======================================================================
SECTION 8 — FOR-YOU PAGE REBUILD REQUIREMENTS
=============================================

CURRENT ISSUES

* duplicate AllPosts behavior
* app crashes
* fake recommendation implementation
* weak UX

---

## CORRECT PURPOSE

ForYou =
personalized recommendation experience.

NOT:
AllPosts duplicate.

---

## REQUIRED FEATURES

Implement:

* personalized ordering
* recommendation logic
* engagement-driven suggestions
* browsing history adaptation
* preference-aware content
* mixed intelligent discovery

---

MUST FEEL:
smart
personalized
dynamic

======================================================================
SECTION 9 — FOR-YOU TEST CASES
==============================

---

## TC-FORYOU-001

ACTION:
Open ForYou.

EXPECTED:
No crash.

---

## TC-FORYOU-002

VALIDATE:
Content differs from AllPosts.

EXPECTED:
Personalized recommendations.

---

## TC-FORYOU-003

VALIDATE:
Recommendation quality.

EXPECTED:
Relevant suggestions.

---

## TC-FORYOU-004

ACTION:
Interact with listings repeatedly.

EXPECTED:
Recommendations adapt.

---

## TC-FORYOU-005

ACTION:
Refresh page.

EXPECTED:
No stale recommendation state.

======================================================================
SECTION 10 — MY HOME REBUILD REQUIREMENTS
=========================================

CURRENT ISSUES

* confused with dashboard
* confused with feed
* wrong hierarchy
* fake implementations

---

## CORRECT PURPOSE

My Home =
current user's own marketplace listings/posts.

---

## REQUIRED FEATURES

Implement:

* owned listings only
* edit/delete actions
* manage listing flow
* ownership tools
* listing analytics if web app supports

======================================================================
SECTION 11 — MY HOME TEST CASES
===============================

---

## TC-MYHOME-001

VALIDATE:
Only user-owned listings visible.

---

## TC-MYHOME-002

ACTION:
Edit listing.

EXPECTED:
Updates correctly.

---

## TC-MYHOME-003

ACTION:
Delete listing.

EXPECTED:
Removes correctly.

---

## TC-MYHOME-004

ACTION:
Navigate away and back.

EXPECTED:
Listings persist correctly.

======================================================================
SECTION 12 — PERFORMANCE & STABILITY TESTS
==========================================

---

## TC-CONTENT-STRESS-001

Rapid scrolling stress test.

EXPECTED:
No jank.

---

## TC-CONTENT-STRESS-002

Open multiple listing details rapidly.

EXPECTED:
Stable navigation.

---

## TC-CONTENT-STRESS-003

Network interruption testing.

EXPECTED:
Graceful retry states.

---

## TC-CONTENT-STRESS-004

Offline restoration testing.

EXPECTED:
Safe cached behavior.

---

## TC-CONTENT-STRESS-005

Memory leak testing.

EXPECTED:
No abnormal memory growth.

======================================================================
SECTION 13 — WEB PARITY VALIDATION
==================================

MANDATORY:

Capture screenshots from web app for:

* AllPosts
* Feed
* My Feed
* My Home
* ForYou
* Compare interactions
* Filters
* Hero banners
* Subcategories

Then compare Android implementation.

---

## DO NOT MARK COMPLETE IF:

* AllPosts still shows global categories
* hero banners missing
* filters weak
* Feed behaves like marketplace
* ForYou duplicates AllPosts
* MyHome incorrect
* compare isolated incorrectly
* cards weak
* crashes remain
* stale state issues remain
* fake parity exists

======================================================================
FINAL PHASE GOAL
================

The content ecosystem must become:

* semantically correct
* highly immersive
* visually premium
* ecosystem-aware
* personalized
* stable
* scalable
* mobile-native
* production-grade

with:

* zero fake parity
* zero duplicated semantics
* zero stale state bugs
* zero incorrect ownership logic
* zero category confusion
* zero crashes
* zero weak browsing UX

The final result should feel like:
a premium intelligent mobile commerce + social discovery platform,
NOT disconnected pages with guessed functionality.

# PHASE 13 — COMPLETE TEST CASE SUITE

# ALLPOSTS + FEED + MY FEED + FOR-YOU + MY HOME

# WEB PARITY + CONTENT SEMANTICS + MOBILE UX VALIDATION

======================================================================
TESTING OBJECTIVE
=================

Validate the ENTIRE content ecosystem end-to-end including:

* AllPosts
* Feed
* My Feed
* ForYou
* My Home
* Compare integration
* Hero banners
* Sticky filters
* Quick filters
* Subcategory logic
* Listing cards
* Personalized recommendations
* Ownership logic
* Infinite scrolling
* Refresh handling
* Navigation stability
* Lifecycle handling
* Web-app parity

Goal:
Ensure the Android app behaves EXACTLY like the web app with correct feature semantics and production-grade UX.

======================================================================
SECTION 1 — ALLPOSTS TEST CASES
===============================

---

## TC-ALLPOSTS-001 — Ecosystem Isolation

ACTION:
Open Home → Select Fashion ecosystem.

EXPECTED:

* Only Fashion ecosystem loads
* No Electronics categories visible
* No global categories visible

---

## TC-ALLPOSTS-002 — Subcategory Bar Validation

ACTION:
Open AllPosts.

EXPECTED:

* Only Fashion subcategories shown
* No global category bar
* Subcategories match web app

---

## TC-ALLPOSTS-003 — Hero Banner Validation

EXPECTED:

* Hero banners visible
* Banner carousel smooth
* Same hierarchy as web app
* Mobile responsive

---

## TC-ALLPOSTS-004 — Quick Filters Validation

EXPECTED:

* Sticky quick filters visible
* Scroll-safe behavior
* Correct spacing
* Smooth chip interactions

---

## TC-ALLPOSTS-005 — Filter Button Functionality

ACTION:
Tap filter icon beside search.

EXPECTED:

* Filter panel opens
* No dead click
* No UI freeze

---

## TC-ALLPOSTS-006 — Filter Application

ACTION:
Apply filters.

EXPECTED:

* Listings refresh correctly
* No stale data
* Correct API updates

---

## TC-ALLPOSTS-007 — Listing Card Design

EXPECTED:

* Premium card UI
* Same design language as Feed cards
* Mobile-first spacing
* Proper shadows/padding

---

## TC-ALLPOSTS-008 — Listing Card Interaction

ACTION:
Tap listing card.

EXPECTED:

* Detailed post page opens
* Correct listing data
* Smooth navigation

---

## TC-ALLPOSTS-009 — Infinite Scrolling

ACTION:
Scroll deeply.

EXPECTED:

* Pagination works
* No duplicate listings
* No UI jank

---

## TC-ALLPOSTS-010 — Compare Feature Integration

EXPECTED:

* Compare available contextually
* Compare NOT isolated in menu
* Compare selections persist

---

## TC-ALLPOSTS-011 — Compare Flow

ACTION:
Select multiple listings for compare.

EXPECTED:

* Sticky compare action appears
* Side-by-side compare opens correctly

---

## TC-ALLPOSTS-012 — Back Navigation Stability

ACTION:
AllPosts → Detail → Back.

EXPECTED:

* Scroll position retained
* Listings remain loaded
* No refresh issue

---

## TC-ALLPOSTS-013 — Navigation Lifecycle Stability

ACTION:
AllPosts → Profile → Back.

EXPECTED:

* Listings persist
* No “No Listings Available” issue

---

## TC-ALLPOSTS-014 — App Background/Foreground

ACTION:
Background app → reopen.

EXPECTED:

* AllPosts state restored
* No stale content

---

## TC-ALLPOSTS-015 — Pull To Refresh

ACTION:
Pull refresh.

EXPECTED:

* Smooth refresh
* No duplicated data
* No loader freeze

---

## TC-ALLPOSTS-016 — Skeleton Loader Validation

EXPECTED:

* Proper loading placeholders
* No blank flashes

---

## TC-ALLPOSTS-017 — Error State Validation

ACTION:
Disable internet.

EXPECTED:

* Proper retry UI
* No app crash

---

## TC-ALLPOSTS-018 — Responsive Layout Validation

EXPECTED:

* No overflow
* No clipping
* Proper responsive spacing

======================================================================
SECTION 2 — FEED PAGE TEST CASES
================================

---

## TC-FEED-001 — Semantic Validation

EXPECTED:

* Feed behaves like discussion/news platform
* NOT marketplace listings

---

## TC-FEED-002 — Feed Content Rendering

EXPECTED:

* Text-rich posts
* Expandable content
* Readable typography

---

## TC-FEED-003 — Feed Interaction Validation

EXPECTED:

* Like/comment/share interactions work

---

## TC-FEED-004 — Expand/Collapse Behavior

ACTION:
Expand long content.

EXPECTED:

* Smooth expansion
* No layout jumps

---

## TC-FEED-005 — Infinite Scrolling

EXPECTED:

* Smooth loading
* No duplicated posts

---

## TC-FEED-006 — Refresh Stability

ACTION:
Refresh feed.

EXPECTED:

* No duplicated data
* Stable ordering

---

## TC-FEED-007 — Navigation Stability

ACTION:
Feed → Detail → Back.

EXPECTED:

* Feed preserved
* Scroll retained

---

## TC-FEED-008 — Typography Hierarchy

EXPECTED:

* Proper readability
* Mobile-friendly text sizes

======================================================================
SECTION 3 — MY FEED TEST CASES
==============================

---

## TC-MYFEED-001 — Ownership Filtering

EXPECTED:

* Only current user posts visible

---

## TC-MYFEED-002 — Create Feed Post

ACTION:
Create post.

EXPECTED:

* Appears immediately

---

## TC-MYFEED-003 — Edit Feed Post

ACTION:
Edit post.

EXPECTED:

* Updates correctly

---

## TC-MYFEED-004 — Delete Feed Post

ACTION:
Delete post.

EXPECTED:

* Removed immediately

---

## TC-MYFEED-005 — Ownership Isolation

EXPECTED:

* No other users' posts visible

---

## TC-MYFEED-006 — Refresh Persistence

ACTION:
Refresh page.

EXPECTED:

* Correct user posts retained

======================================================================
SECTION 4 — FOR-YOU TEST CASES
==============================

---

## TC-FORYOU-001 — Crash Validation

ACTION:
Open ForYou.

EXPECTED:

* No crash
* Stable rendering

---

## TC-FORYOU-002 — Recommendation Validation

EXPECTED:

* Personalized content visible
* Different from AllPosts

---

## TC-FORYOU-003 — Recommendation Adaptation

ACTION:
Interact repeatedly with categories.

EXPECTED:

* Recommendations adapt dynamically

---

## TC-FORYOU-004 — Infinite Scrolling

EXPECTED:

* Smooth recommendation loading

---

## TC-FORYOU-005 — Refresh Stability

ACTION:
Refresh page.

EXPECTED:

* No stale recommendations

---

## TC-FORYOU-006 — Navigation Stability

ACTION:
ForYou → Detail → Back.

EXPECTED:

* State preserved

---

## TC-FORYOU-007 — Recommendation Diversity

EXPECTED:

* Mixed intelligent suggestions
* Not duplicate listing spam

======================================================================
SECTION 5 — MY HOME TEST CASES
==============================

---

## TC-MYHOME-001 — Ownership Listings

EXPECTED:

* Only current user listings visible

---

## TC-MYHOME-002 — Edit Listing

ACTION:
Edit listing.

EXPECTED:

* Updates correctly

---

## TC-MYHOME-003 — Delete Listing

ACTION:
Delete listing.

EXPECTED:

* Removed correctly

---

## TC-MYHOME-004 — Listing Persistence

ACTION:
Navigate away and back.

EXPECTED:

* Listings retained

---

## TC-MYHOME-005 — Empty State Validation

EXPECTED:

* Proper empty-state UI

======================================================================
SECTION 6 — WEB PARITY VALIDATION TEST CASES
============================================

---

## TC-WEBPARITY-001

Capture web screenshots for:

* AllPosts
* Feed
* My Feed
* My Home
* ForYou

Compare Android implementation.

EXPECTED:

* Same semantics
* Same hierarchy
* Same feature behavior

---

## TC-WEBPARITY-002

Compare:

* Filters
* Hero banners
* Compare flows
* Listing cards
* Navigation

EXPECTED:
Android aligned with web app.

---

## TC-WEBPARITY-003

VALIDATE:
No Android-only invented functionality.

EXPECTED:
Only validated features exist.

======================================================================
SECTION 7 — PERFORMANCE & STRESS TESTS
======================================

---

## TC-STRESS-001

Rapid scrolling stress test.

EXPECTED:

* No lag
* No frame drops

---

## TC-STRESS-002

Rapid navigation switching.

EXPECTED:

* No crashes
* Stable state

---

## TC-STRESS-003

Memory leak validation.

EXPECTED:

* Stable memory usage

---

## TC-STRESS-004

Network interruption handling.

EXPECTED:

* Graceful retry states

---

## TC-STRESS-005

Low-end device testing.

EXPECTED:

* Smooth behavior

---

## TC-STRESS-006

Background/foreground lifecycle stress.

EXPECTED:

* Correct state restoration

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK COMPLETE IF:

* AllPosts still shows global categories
* hero banners missing
* filters weak/broken
* compare isolated incorrectly
* Feed behaves like marketplace
* ForYou duplicates AllPosts
* MyHome incorrect
* crashes remain
* stale-state bugs remain
* lifecycle bugs remain
* listing cards weak
* fake parity exists
* Android-only random features remain

======================================================================
FINAL PHASE GOAL
================

The content ecosystem must finally become:

* semantically accurate
* visually premium
* intelligent
* immersive
* stable
* scalable
* mobile-native
* ecosystem-aware
* production-grade

with:

* zero fake parity
* zero duplicated semantics
* zero stale-state bugs
* zero crashes
* zero lifecycle corruption
* zero weak UX
* zero navigation inconsistencies

The final result should feel like:
a premium AI-powered mobile social-commerce ecosystem,
NOT random disconnected pages with guessed functionality.

# PHASE 14 — PROFILE, REWARDS, SELL, PLANS & ACCOUNT EXPERIENCE

# COMPLETE IMPLEMENTATION + QA + WEB PARITY TEST SUITE

======================================================================
PHASE OBJECTIVE
===============

Rebuild and validate the COMPLETE account and monetization ecosystem including:

* Profile
* Rewards
* Sell
* Plans
* Centre Plans
* Account flows
* User ownership flows
* Quick actions
* Monetization UX
* Auth/session handling
* CTA hierarchy
* Premium mobile UI
* Subscription flows
* Mobile responsiveness
* Web parity
* Lifecycle stability

This phase exists because the Android implementation currently suffers from:

* weak UI quality
* fake parity
* broken auth/session behavior
* redundant quick actions
* inconsistent layouts
* poor mobile responsiveness
* oversized sections
* weak monetization UX
* incomplete Centre Plans implementation
* non-premium visual hierarchy
* poor CTA structure
* unstable rendering
* placeholder implementations

Goal:
Transform the account ecosystem into a premium production-grade mobile experience matching or exceeding the web app.

======================================================================
SECTION 1 — PROFILE PAGE REBUILD REQUIREMENTS
=============================================

CURRENT ISSUES

* oversized hero/banner
* redundant quick actions
* Android-only pages
* wrong hierarchy
* weak mobile UX
* cluttered experience
* session timeout bugs
* fake parity
* poor spacing
* inconsistent layout structure

---

## REQUIRED PROFILE EXPERIENCE

Profile must feel:

* clean
* premium
* intentional
* minimal
* mobile-native
* ownership-focused

---

## MANDATORY PROFILE IMPROVEMENTS

Implement:

* compact responsive hero section
* proper spacing system
* responsive typography
* premium profile cards
* ownership-focused actions
* web-aligned hierarchy
* contextual quick actions only
* adaptive mobile layout
* lifecycle-safe rendering

---

## REMOVE

* duplicate actions
* Android-only utility pages
* unnecessary shortcuts
* fake dashboard routes
* redundant account flows

---

## IMPORTANT

Quick actions MUST match web app semantics.

DO NOT invent profile utilities.

======================================================================
SECTION 2 — PROFILE TEST CASES
==============================

---

## TC-PROFILE-001 — Hero Section Validation

EXPECTED:

* Compact responsive header
* No oversized banner

---

## TC-PROFILE-002 — Quick Actions Validation

EXPECTED:

* Only web-app validated actions visible
* No redundant shortcuts

---

## TC-PROFILE-003 — Session Stability

ACTION:
Open Profile repeatedly.

EXPECTED:

* No session timeout bug
* No auth flicker

---

## TC-PROFILE-004 — Navigation Stability

ACTION:
Profile → Rewards → Back.

EXPECTED:

* Correct state restoration

---

## TC-PROFILE-005 — Responsive Layout Validation

EXPECTED:

* Mobile-friendly spacing
* No clipping
* No overflow

---

## TC-PROFILE-006 — Typography Hierarchy

EXPECTED:

* Premium readable typography

---

## TC-PROFILE-007 — Ownership Actions

EXPECTED:

* Ownership actions work correctly

---

## TC-PROFILE-008 — Lifecycle Stability

ACTION:
Background/foreground app.

EXPECTED:

* Profile restored safely

---

## TC-PROFILE-009 — Dark/Theme Compatibility

EXPECTED:

* Stable rendering in all themes

======================================================================
SECTION 3 — REWARDS PAGE REBUILD REQUIREMENTS
=============================================

CURRENT ISSUES

* login/session bugs
* weak layout
* poor rendering
* inconsistent spacing
* weak hierarchy
* poor responsiveness
* stale state behavior

---

## REQUIRED REWARDS EXPERIENCE

Rewards must feel:

* gamified
* premium
* rewarding
* visually engaging
* stable
* modern

---

## MANDATORY IMPROVEMENTS

Implement:

* premium reward cards
* progress hierarchy
* mobile-first spacing
* animated reward indicators
* responsive layouts
* lifecycle-safe rendering
* proper authenticated flow

---

## CRITICAL

Authenticated users MUST NEVER see:
unexpected login prompts.

======================================================================
SECTION 4 — REWARDS TEST CASES
==============================

---

## TC-REWARDS-001 — Auth Validation

ACTION:
Login → Open Rewards.

EXPECTED:

* No login prompt
* Session retained

---

## TC-REWARDS-002 — Reward Rendering

EXPECTED:

* Correct reward data
* Stable rendering

---

## TC-REWARDS-003 — Responsive Layout

EXPECTED:

* Proper mobile spacing
* No overflow

---

## TC-REWARDS-004 — Progress Indicators

EXPECTED:

* Correct calculations
* Smooth animations

---

## TC-REWARDS-005 — Lifecycle Stability

ACTION:
Background/foreground app.

EXPECTED:

* Rewards state restored

---

## TC-REWARDS-006 — Refresh Stability

ACTION:
Refresh page.

EXPECTED:

* No duplicated rewards
* No stale state

---

## TC-REWARDS-007 — Navigation Stability

ACTION:
Rewards → Profile → Back.

EXPECTED:

* Stable rendering

======================================================================
SECTION 5 — SELL PAGE REBUILD REQUIREMENTS
==========================================

CURRENT ISSUES

* weak design
* poor onboarding UX
* non-premium forms
* inconsistent layouts
* weak CTA hierarchy
* low visual quality
* poor mobile experience

---

## REQUIRED SELL EXPERIENCE

Sell page must feel:

* premium
* guided
* conversion-focused
* image-first
* mobile-native
* intuitive

---

## MANDATORY FEATURES

Implement:

* guided posting flow
* image-first upload UX
* category recommendations
* premium forms
* progress indicators
* smart validation
* modern CTA hierarchy
* smooth animations
* responsive layouts

---

## SELL FLOW MUST FEEL

fast
simple
professional
trustworthy

======================================================================
SECTION 6 — SELL PAGE TEST CASES
================================

---

## TC-SELL-001 — Form Rendering

EXPECTED:

* Premium mobile forms
* Proper spacing

---

## TC-SELL-002 — Image Upload Flow

ACTION:
Upload images.

EXPECTED:

* Smooth upload UX
* Preview rendering works

---

## TC-SELL-003 — Category Selection

EXPECTED:

* Correct ecosystem categories only

---

## TC-SELL-004 — Validation Flow

ACTION:
Submit incomplete form.

EXPECTED:

* Smart validation errors

---

## TC-SELL-005 — CTA Hierarchy

EXPECTED:

* Primary actions visually clear

---

## TC-SELL-006 — Posting Flow

ACTION:
Complete listing submission.

EXPECTED:

* Smooth successful posting

---

## TC-SELL-007 — Draft Restoration

ACTION:
Leave form → return.

EXPECTED:

* Draft state retained

---

## TC-SELL-008 — Responsive Layout

EXPECTED:

* Mobile-first layout quality

======================================================================
SECTION 7 — PLANS PAGE REBUILD REQUIREMENTS
===========================================

CURRENT ISSUES

* extremely weak design
* poor monetization UX
* weak card hierarchy
* missing Centre Plans
* poor conversion flow
* fake parity

---

## REQUIRED PLANS EXPERIENCE

Plans page must feel:

* premium SaaS platform
* modern subscription system
* visually persuasive
* conversion-focused

---

## MANDATORY FEATURES

Implement:

* premium pricing cards
* animated highlights
* plan comparison tables
* responsive card layouts
* benefits hierarchy
* CTA-focused flow
* smooth animations
* trust indicators

---

## CRITICAL

Centre Plans page from web app must be fully implemented.

======================================================================
SECTION 8 — PLANS TEST CASES
============================

---

## TC-PLANS-001 — Plan Card Rendering

EXPECTED:

* Premium pricing cards

---

## TC-PLANS-002 — Comparison Hierarchy

EXPECTED:

* Clear plan differences

---

## TC-PLANS-003 — CTA Validation

EXPECTED:

* Upgrade actions clear

---

## TC-PLANS-004 — Responsive Layout

EXPECTED:

* Mobile optimized layout

---

## TC-PLANS-005 — Centre Plans Validation

EXPECTED:

* Fully implemented
* Matches web app

---

## TC-PLANS-006 — Plan Selection Flow

ACTION:
Select plan.

EXPECTED:

* Correct navigation/payment flow

---

## TC-PLANS-007 — Animation Smoothness

EXPECTED:

* Smooth premium interactions

======================================================================
SECTION 9 — AUTH & SESSION TEST CASES
=====================================

---

## TC-AUTH-001

ACTION:
Login once → navigate across app.

EXPECTED:

* Session persists globally

---

## TC-AUTH-002

ACTION:
Open Rewards/Profile repeatedly.

EXPECTED:

* No repeated login prompts

---

## TC-AUTH-003

ACTION:
Background app for long duration.

EXPECTED:

* Session restoration works

---

## TC-AUTH-004

ACTION:
Token expiration simulation.

EXPECTED:

* Graceful re-authentication

---

## TC-AUTH-005

ACTION:
Guest user attempts protected flow.

EXPECTED:

* Correct auth gating

======================================================================
SECTION 10 — WEB PARITY VALIDATION
==================================

MANDATORY:

Capture web screenshots for:

* Profile
* Rewards
* Sell
* Plans
* Centre Plans

Compare Android implementation carefully.

---

## VALIDATE

* hierarchy
* semantics
* ownership logic
* CTA structure
* layouts
* spacing
* animations
* flows
* monetization UX

---

## DO NOT MARK COMPLETE IF

* oversized profile sections remain
* rewards auth bug exists
* fake profile pages exist
* plans still weak
* Centre Plans missing
* sell flow weak
* Android-only utilities exist
* placeholder pages remain
* fake parity exists

======================================================================
SECTION 11 — PERFORMANCE & STABILITY TESTS
==========================================

---

## TC-STRESS-001

Rapid navigation stress testing.

EXPECTED:

* No crashes

---

## TC-STRESS-002

Repeated auth flow testing.

EXPECTED:

* Stable sessions

---

## TC-STRESS-003

Memory leak validation.

EXPECTED:

* Stable memory usage

---

## TC-STRESS-004

Network interruption handling.

EXPECTED:

* Graceful recovery

---

## TC-STRESS-005

Low-end device responsiveness.

EXPECTED:

* Smooth UX

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK PHASE COMPLETE IF:

* rewards login bug remains
* session timeout bug remains
* oversized profile hero remains
* plans still weak
* Centre Plans incomplete
* sell flow poor
* fake parity exists
* redundant pages exist
* Android-only utilities exist
* weak mobile UX remains
* stale auth state exists
* placeholder implementations exist

======================================================================
FINAL PHASE GOAL
================

The account ecosystem must become:

* premium
* stable
* visually polished
* conversion-focused
* mobile-native
* scalable
* web-aligned
* lifecycle-safe
* production-grade

with:

* zero fake parity
* zero redundant utilities
* zero auth instability
* zero weak monetization UX
* zero placeholder flows
* zero stale session bugs
* zero inconsistent layouts

The final experience should feel like:
a premium world-class mobile commerce platform,
NOT partially converted screens with weak UX and unstable flows.
# PHASE 14 — COMPLETE TEST CASE SUITE

# PROFILE + REWARDS + SELL + PLANS + ACCOUNT FLOWS

# WEB PARITY + AUTH STABILITY + PREMIUM UX VALIDATION

======================================================================
TESTING OBJECTIVE
=================

Validate the COMPLETE account ecosystem end-to-end including:

* Profile
* Rewards
* Sell
* Plans
* Centre Plans
* Authentication
* Session persistence
* Ownership flows
* Monetization flows
* CTA hierarchy
* Quick actions
* Mobile responsiveness
* Navigation stability
* Lifecycle handling
* Web-app parity
* Performance stability

Goal:
Ensure the Android account ecosystem becomes fully production-grade, visually premium, stable, and behaviorally aligned with the web app.

======================================================================
SECTION 1 — PROFILE PAGE TEST CASES
===================================

---

## TC-PROFILE-001 — Profile Page Rendering

ACTION:
Open Profile page.

EXPECTED:

* Page loads correctly
* No blank states
* No shimmer freeze
* No session errors

---

## TC-PROFILE-002 — Hero Section Validation

EXPECTED:

* Compact responsive header
* No oversized blue banner
* Mobile-friendly proportions

---

## TC-PROFILE-003 — Quick Actions Validation

EXPECTED:

* Only web-app validated actions visible
* No redundant pages
* No Android-only utilities

---

## TC-PROFILE-004 — Profile Navigation Validation

ACTION:
Open every profile quick action.

EXPECTED:

* Correct page opens
* No placeholder screens
* No wrong routes

---

## TC-PROFILE-005 — Session Stability

ACTION:
Open Profile repeatedly.

EXPECTED:

* No “Session Timeout”
* No auth flicker
* No forced logout

---

## TC-PROFILE-006 — Back Navigation Stability

ACTION:
Profile → Rewards → Back.

EXPECTED:

* Correct restoration
* No duplicate reloads

---

## TC-PROFILE-007 — Refresh Stability

ACTION:
Pull refresh.

EXPECTED:

* Smooth refresh
* No duplicate data
* No UI jumps

---

## TC-PROFILE-008 — Lifecycle Restoration

ACTION:
Background app → reopen.

EXPECTED:

* Profile state restored
* No re-login

---

## TC-PROFILE-009 — Responsive Layout Validation

EXPECTED:

* Proper spacing
* No overflow
* No clipped UI

---

## TC-PROFILE-010 — Typography Hierarchy

EXPECTED:

* Readable text hierarchy
* Premium visual balance

---

## TC-PROFILE-011 — Dark Mode Validation

EXPECTED:

* Stable UI in all themes

---

## TC-PROFILE-012 — Ownership Data Validation

EXPECTED:

* Correct user data shown
* No cross-user leakage

======================================================================
SECTION 2 — REWARDS PAGE TEST CASES
===================================

---

## TC-REWARDS-001 — Auth Persistence Validation

ACTION:
Login → Open Rewards.

EXPECTED:

* No login prompt
* Session retained

---

## TC-REWARDS-002 — Rewards Rendering

EXPECTED:

* Rewards load correctly
* No shimmer freeze
* No blank state

---

## TC-REWARDS-003 — Rewards Progress Validation

EXPECTED:

* Progress bars accurate
* Correct reward values

---

## TC-REWARDS-004 — Responsive Layout

EXPECTED:

* Proper mobile spacing
* No overlap/clipping

---

## TC-REWARDS-005 — Rewards Navigation Stability

ACTION:
Rewards → Profile → Back.

EXPECTED:

* State preserved
* No reload issues

---

## TC-REWARDS-006 — Lifecycle Stability

ACTION:
Background/foreground app.

EXPECTED:

* Rewards restored correctly

---

## TC-REWARDS-007 — Pull To Refresh

EXPECTED:

* No duplicated rewards
* Correct refresh behavior

---

## TC-REWARDS-008 — Session Timeout Validation

EXPECTED:

* No unexpected auth errors

---

## TC-REWARDS-009 — Animation Smoothness

EXPECTED:

* Smooth progress animations
* No jank

======================================================================
SECTION 3 — SELL PAGE TEST CASES
================================

---

## TC-SELL-001 — Sell Page Rendering

EXPECTED:

* Premium UI visible
* Proper layout structure

---

## TC-SELL-002 — Image Upload Flow

ACTION:
Upload images.

EXPECTED:

* Fast upload
* Preview renders correctly

---

## TC-SELL-003 — Multi-Image Handling

ACTION:
Upload multiple images.

EXPECTED:

* Correct ordering
* No crashes

---

## TC-SELL-004 — Ecosystem Category Validation

EXPECTED:

* Only current ecosystem categories shown

---

## TC-SELL-005 — Form Validation

ACTION:
Submit empty form.

EXPECTED:

* Smart validation messages

---

## TC-SELL-006 — Draft Persistence

ACTION:
Leave form → return.

EXPECTED:

* Draft restored

---

## TC-SELL-007 — CTA Hierarchy

EXPECTED:

* Primary CTA visually dominant

---

## TC-SELL-008 — Posting Flow

ACTION:
Submit valid listing.

EXPECTED:

* Listing created successfully

---

## TC-SELL-009 — Error Recovery

ACTION:
Disable internet during submission.

EXPECTED:

* Retry flow works gracefully

---

## TC-SELL-010 — Responsive Layout

EXPECTED:

* Mobile optimized spacing
* No overflow

---

## TC-SELL-011 — Navigation Stability

ACTION:
Sell → Back → Reopen.

EXPECTED:

* Stable rendering
* No corrupted form state

======================================================================
SECTION 4 — PLANS PAGE TEST CASES
=================================

---

## TC-PLANS-001 — Plans Page Rendering

EXPECTED:

* Premium pricing cards visible

---

## TC-PLANS-002 — Centre Plans Validation

EXPECTED:

* Fully implemented
* Not placeholder

---

## TC-PLANS-003 — Plan Comparison Layout

EXPECTED:

* Clear feature comparison hierarchy

---

## TC-PLANS-004 — CTA Visibility

EXPECTED:

* Upgrade buttons prominent

---

## TC-PLANS-005 — Responsive Layout

EXPECTED:

* Mobile-friendly cards
* No clipping

---

## TC-PLANS-006 — Plan Selection Flow

ACTION:
Select plan.

EXPECTED:

* Correct purchase/upgrade flow

---

## TC-PLANS-007 — Animation Validation

EXPECTED:

* Smooth premium transitions

---

## TC-PLANS-008 — Web Parity Validation

EXPECTED:

* Layout matches web app hierarchy

---

## TC-PLANS-009 — Pricing Accuracy

EXPECTED:

* Correct pricing and benefits

======================================================================
SECTION 5 — AUTH & SESSION TEST CASES
=====================================

---

## TC-AUTH-001 — Persistent Login Validation

ACTION:
Login once → navigate entire app.

EXPECTED:

* Session retained everywhere

---

## TC-AUTH-002 — Protected Route Validation

ACTION:
Guest opens Rewards/Profile.

EXPECTED:

* Correct auth gating

---

## TC-AUTH-003 — Token Expiration Simulation

EXPECTED:

* Graceful re-authentication flow

---

## TC-AUTH-004 — Background Session Validation

ACTION:
Background app for long duration.

EXPECTED:

* Session restored safely

---

## TC-AUTH-005 — Logout Flow

ACTION:
Logout.

EXPECTED:

* Tokens cleared correctly
* Protected pages inaccessible

---

## TC-AUTH-006 — Multi-Navigation Auth Stability

ACTION:
Rapidly navigate authenticated pages.

EXPECTED:

* No auth flicker
* No unexpected login prompts

======================================================================
SECTION 6 — WEB PARITY VALIDATION TEST CASES
============================================

---

## TC-WEBPARITY-001

Capture web screenshots for:

* Profile
* Rewards
* Sell
* Plans
* Centre Plans

Compare Android implementation.

EXPECTED:

* Same semantics
* Same hierarchy
* Same ownership logic

---

## TC-WEBPARITY-002

Compare:

* spacing
* typography
* CTA hierarchy
* animations
* flows
* monetization UX

EXPECTED:
Android aligned with web app.

---

## TC-WEBPARITY-003

VALIDATE:
No Android-only invented utilities.

EXPECTED:
Only validated features exist.

======================================================================
SECTION 7 — PERFORMANCE & STRESS TESTS
======================================

---

## TC-STRESS-001

Rapid page switching stress test.

EXPECTED:

* No crashes

---

## TC-STRESS-002

Repeated login/logout stress test.

EXPECTED:

* Stable session handling

---

## TC-STRESS-003

Memory leak validation.

EXPECTED:

* Stable memory usage

---

## TC-STRESS-004

Network interruption testing.

EXPECTED:

* Graceful recovery

---

## TC-STRESS-005

Low-end device responsiveness.

EXPECTED:

* Smooth UX

---

## TC-STRESS-006

Long-session testing.

EXPECTED:

* No stale auth state
* No session corruption

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK COMPLETE IF:

* rewards login bug exists
* profile session timeout exists
* oversized hero remains
* plans still weak
* Centre Plans incomplete
* sell flow weak
* fake parity exists
* Android-only utilities exist
* stale auth state exists
* placeholder pages remain
* weak monetization UX remains
* redundant quick actions remain

======================================================================
FINAL PHASE GOAL
================

The account ecosystem must finally become:

* premium
* stable
* scalable
* visually polished
* monetization-ready
* lifecycle-safe
* mobile-native
* web-aligned
* production-grade

with:

* zero auth instability
* zero fake parity
* zero placeholder flows
* zero stale session bugs
* zero weak UI
* zero redundant utilities
* zero inconsistent account behavior

The final experience should feel like:
a premium world-class mobile commerce ecosystem,
NOT partially converted screens with unstable UX and weak flows.
# PHASE 15 — FEED, MY FEED, MY HOME, SOCIAL FLOWS & CONTENT SEMANTICS RECONSTRUCTION

# COMPLETE IMPLEMENTATION + WEB PARITY + UX + STABILITY DIRECTIVE

======================================================================
PHASE OBJECTIVE
===============

Rebuild the COMPLETE social/content ecosystem of the Android app using the web app as the ONLY source of truth.

This phase focuses on correcting the major semantic misunderstandings and fake implementations currently present in:

* Feed
* My Feed
* My Home
* Social flows
* User-owned content flows
* Discussion/content UX
* Content ownership hierarchy
* Post rendering
* Engagement systems
* Social navigation behavior

Goal:
Transform the Android social ecosystem into a semantically correct, premium, scalable, mobile-native experience fully aligned with the web application.

======================================================================
CRITICAL ROOT FAILURE IDENTIFIED
================================

The Android app currently misunderstands the PURPOSE of multiple core pages.

This caused:

* fake parity
* wrong content rendering
* wrong UX hierarchy
* duplicate behaviors
* incorrect ownership flows
* confusing user experience
* incorrect social-commerce separation

This phase fixes the CORE PRODUCT SEMANTICS.

======================================================================
MANDATORY WEB APP SEMANTICS
===========================

THESE DEFINITIONS ARE ABSOLUTE.

NO deviations allowed.

---

## FEED

Purpose:
News / knowledge / discussion sharing.

NOT:
Marketplace listings feed.

Feed must contain:

* informative posts
* discussion content
* knowledge sharing
* updates
* text-first social content
* optional supporting media

Feed should feel like:
community + discussion + information ecosystem.

---

## MY FEED

Purpose:
Current user's own shared posts/content.

NOT:
Marketplace listings manager.

My Feed must contain:

* current user's discussions/posts
* authored social content
* ownership filtering
* engagement management

---

## ALL POSTS

Purpose:
Marketplace/product listings from all users.

NOT:
social feed.

---

## MY HOME

Purpose:
Current user’s own marketplace listings/posts.

NOT:
social feed clone
NOT:
dashboard clone

======================================================================
SECTION 1 — FEED PAGE COMPLETE REBUILD
======================================

CURRENT ISSUES

* feed behaves like marketplace
* incorrect card design
* weak social UX
* no proper discussion hierarchy
* poor readability
* poor engagement structure
* weak rendering
* fake parity

---

## REQUIRED FEED EXPERIENCE

Feed must feel like:

* modern social discussion platform
* readable
* engaging
* informative
* community-driven
* mobile-native

---

## MANDATORY FEED FEATURES

Implement:

* text-first content cards
* expandable descriptions
* rich typography hierarchy
* discussion-oriented layouts
* author visibility
* engagement indicators
* comments/replies
* timestamps
* lightweight media support
* responsive spacing
* smooth scrolling

---

## IMPORTANT

Feed is NOT:
image-heavy marketplace browsing.

It is:
social knowledge/discussion sharing.

======================================================================
SECTION 2 — FEED CARD SYSTEM REBUILD
====================================

Implement premium social cards:

* readable text blocks
* clean spacing
* author section
* timestamp hierarchy
* engagement footer
* expandable content
* responsive typography
* smooth interactions

---

## CARD UX GOAL

Should feel like:

premium social content platform
NOT marketplace listing grid.

======================================================================
SECTION 3 — FEED TEST CASES
===========================

---

## TC-FEED-001 — Feed Rendering

EXPECTED:

* Feed loads correctly
* No shimmer freeze
* No blank states

---

## TC-FEED-002 — Semantic Validation

EXPECTED:

* Feed contains discussion/news content
* NOT marketplace cards

---

## TC-FEED-003 — Expandable Content

ACTION:
Open long post.

EXPECTED:

* Expand/collapse works smoothly

---

## TC-FEED-004 — Engagement Rendering

EXPECTED:

* Like/comment/share indicators visible

---

## TC-FEED-005 — Author Hierarchy

EXPECTED:

* Author details clearly visible

---

## TC-FEED-006 — Scroll Performance

EXPECTED:

* Smooth scrolling
* No jank

---

## TC-FEED-007 — Lifecycle Restoration

ACTION:
Background app → reopen.

EXPECTED:

* Feed restores correctly

---

## TC-FEED-008 — Pull To Refresh

EXPECTED:

* Refresh works correctly
* No duplicated posts

---

## TC-FEED-009 — Responsive Layout

EXPECTED:

* Mobile optimized spacing
* No overflow

======================================================================
SECTION 4 — MY FEED COMPLETE REBUILD
====================================

CURRENT ISSUES

* semantics incorrect
* ownership logic missing
* behaves like duplicate feed
* fake parity
* wrong filtering

---

## REQUIRED MY FEED EXPERIENCE

My Feed must feel like:

* personal authored content space
* user-owned social profile stream
* creator/content management ecosystem

---

## MANDATORY FEATURES

Implement:

* current user's posts only
* ownership filtering
* authored-content management
* edit/delete support
* engagement visibility
* post insights if available
* lifecycle-safe rendering

---

## IMPORTANT

My Feed is NOT:
AllPosts clone.

======================================================================
SECTION 5 — MY FEED TEST CASES
==============================

---

## TC-MYFEED-001 — Ownership Filtering

EXPECTED:

* Only current user posts visible

---

## TC-MYFEED-002 — Edit/Delete Flow

ACTION:
Edit/delete post.

EXPECTED:

* Correct ownership actions

---

## TC-MYFEED-003 — State Restoration

EXPECTED:

* Feed restores safely

---

## TC-MYFEED-004 — Pull To Refresh

EXPECTED:

* No duplicate content

---

## TC-MYFEED-005 — Responsive Layout

EXPECTED:

* Proper mobile spacing

---

## TC-MYFEED-006 — Navigation Stability

ACTION:
Navigate across app → return.

EXPECTED:

* Stable state restoration

======================================================================
SECTION 6 — MY HOME COMPLETE REBUILD
====================================

CURRENT ISSUES

* behaves incorrectly
* dashboard confusion
* ownership logic broken
* fake parity
* duplicate functionality

---

## REQUIRED MY HOME EXPERIENCE

My Home must contain:

* current user's marketplace listings only
* ownership management
* listing actions
* listing lifecycle handling

---

## MANDATORY FEATURES

Implement:

* user-owned listings
* edit listing
* delete listing
* mark sold
* manage visibility
* ownership actions
* listing analytics if web app supports

---

## IMPORTANT

My Home is:
marketplace ownership page.

NOT:
social feed.

======================================================================
SECTION 7 — MY HOME TEST CASES
==============================

---

## TC-MYHOME-001 — Ownership Validation

EXPECTED:

* Only current user listings visible

---

## TC-MYHOME-002 — Listing Management

ACTION:
Edit/delete listing.

EXPECTED:

* Correct management flow

---

## TC-MYHOME-003 — Mark Sold Flow

EXPECTED:

* Correct sold-state update

---

## TC-MYHOME-004 — Responsive Layout

EXPECTED:

* Mobile optimized UI

---

## TC-MYHOME-005 — Navigation Stability

EXPECTED:

* Stable route restoration

---

## TC-MYHOME-006 — Empty State Validation

EXPECTED:

* Proper empty-state messaging

======================================================================
SECTION 8 — SOCIAL NAVIGATION & FLOW REBUILD
============================================

CURRENT ISSUES

* duplicated social flows
* incorrect route semantics
* confusing ownership hierarchy
* fake parity

---

## REQUIRED STRUCTURE

FEED
→ global social content

MY FEED
→ current user's authored content

ALL POSTS
→ marketplace listings

MY HOME
→ current user's marketplace listings

---

This separation MUST remain strict.

======================================================================
SECTION 9 — SOCIAL ENGAGEMENT SYSTEMS
=====================================

Implement proper:

* like systems
* comments
* replies
* share actions
* engagement counters
* ownership controls
* moderation hooks if supported

---

## IMPORTANT

Engagement systems must be lifecycle-safe and reactive.

======================================================================
SECTION 10 — WEB PARITY VALIDATION
==================================

MANDATORY:

Capture screenshots from web app for:

* Feed
* My Feed
* My Home

Compare carefully.

---

## VALIDATE

* semantics
* content hierarchy
* ownership behavior
* navigation
* engagement flows
* layouts
* spacing
* typography
* interactions

---

## DO NOT MARK COMPLETE IF

* Feed still behaves like marketplace
* My Feed semantics wrong
* My Home semantics wrong
* ownership filtering broken
* duplicate flows exist
* fake parity exists
* Android-only semantics exist

======================================================================
SECTION 11 — ARCHITECTURE REQUIREMENTS
======================================

MANDATORY

Use centralized:

* feed state
* ownership state
* engagement state
* comment state
* pagination state
* lifecycle restoration

---

## Prevent:

* stale state
* duplicated posts
* pagination corruption
* lifecycle resets
* comment duplication
* ownership leakage

======================================================================
SECTION 12 — PERFORMANCE & STABILITY TESTS
==========================================

---

## TC-STRESS-001

Rapid scroll stress testing.

EXPECTED:

* Smooth rendering

---

## TC-STRESS-002

Repeated navigation testing.

EXPECTED:

* Stable restoration

---

## TC-STRESS-003

Heavy content loading.

EXPECTED:

* No crashes

---

## TC-STRESS-004

Network interruption testing.

EXPECTED:

* Graceful recovery

---

## TC-STRESS-005

Long-session testing.

EXPECTED:

* Stable feed state

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK COMPLETE IF:

* Feed still marketplace-like
* My Feed semantics wrong
* My Home semantics wrong
* ownership filtering broken
* fake parity exists
* duplicate content exists
* engagement broken
* navigation unstable
* stale feed state exists
* weak mobile UX remains

======================================================================
FINAL PHASE GOAL
================

The social ecosystem must become:

* semantically correct
* premium
* readable
* community-driven
* ownership-aware
* scalable
* lifecycle-safe
* web-aligned
* mobile-native
* production-grade

with:

* zero fake parity
* zero semantic confusion
* zero duplicated flows
* zero stale content state
* zero weak readability
* zero ownership leakage
* zero unstable navigation

The final result should feel like:
a premium world-class social-commerce mobile ecosystem,
NOT a partially misunderstood marketplace clone with random social screens.
# PHASE 15 — COMPLETE TEST CASE SUITE

# FEED + MY FEED + MY HOME + SOCIAL FLOWS + CONTENT SEMANTICS

======================================================================
TESTING OBJECTIVE
=================

Validate the COMPLETE social-content ecosystem against the web app with focus on:

* semantic correctness
* ownership logic
* social vs marketplace separation
* lifecycle stability
* engagement systems
* rendering performance
* navigation consistency
* pagination stability
* mobile UX quality
* content restoration
* responsive layouts
* web parity accuracy

Goal:
Ensure Feed, My Feed, My Home, and related social systems become production-grade, semantically accurate, and fully aligned with the web application.

======================================================================
SECTION 1 — FEED PAGE TEST CASES
================================

---

## TC-FEED-001 — Feed Initial Rendering

ACTION:
Open Feed page.

EXPECTED:

* Feed loads correctly
* No shimmer freeze
* No blank state
* No crashes

---

## TC-FEED-002 — Semantic Validation

EXPECTED:
Feed contains:

* knowledge posts
* discussion content
* informational posts

Feed must NOT contain:

* marketplace listing cards
* pricing-focused cards
* selling layouts

---

## TC-FEED-003 — Typography Hierarchy

EXPECTED:

* Proper readable text
* Clean content spacing
* Correct title/body hierarchy

---

## TC-FEED-004 — Expandable Post Validation

ACTION:
Open long descriptive post.

EXPECTED:

* Read more works
* Expand/collapse smooth
* Layout stable

---

## TC-FEED-005 — Author Metadata Validation

EXPECTED:

* Author visible
* Timestamp visible
* Social hierarchy clear

---

## TC-FEED-006 — Engagement Footer Validation

EXPECTED:

* Like button visible
* Comment button visible
* Share button visible
* Engagement counts correct

---

## TC-FEED-007 — Scroll Performance

ACTION:
Rapid scrolling.

EXPECTED:

* No frame drops
* No UI lag
* Smooth rendering

---

## TC-FEED-008 — Pull To Refresh

ACTION:
Pull refresh.

EXPECTED:

* Feed refreshes correctly
* No duplicate posts
* No content jumps

---

## TC-FEED-009 — Infinite Pagination

ACTION:
Scroll to bottom repeatedly.

EXPECTED:

* New content loads correctly
* No duplicate pages
* No pagination freeze

---

## TC-FEED-010 — Lifecycle Restoration

ACTION:
Background app → reopen.

EXPECTED:

* Feed position restored
* Content preserved

---

## TC-FEED-011 — Navigation Restoration

ACTION:
Feed → Profile → Back.

EXPECTED:

* Scroll position retained
* Feed restored safely

---

## TC-FEED-012 — Network Recovery

ACTION:
Disable internet during loading.

EXPECTED:

* Graceful retry
* Proper error state

---

## TC-FEED-013 — Empty State Validation

EXPECTED:

* Premium empty state
* No broken placeholders

---

## TC-FEED-014 — Responsive Layout Validation

EXPECTED:

* Proper mobile spacing
* No overflow/clipping

---

## TC-FEED-015 — Dark Mode Validation

EXPECTED:

* Proper readability
* Stable theme rendering

======================================================================
SECTION 2 — MY FEED TEST CASES
==============================

---

## TC-MYFEED-001 — Ownership Filtering

EXPECTED:

* Only current user's social posts visible

---

## TC-MYFEED-002 — Wrong User Leakage Validation

EXPECTED:

* No other users' content visible

---

## TC-MYFEED-003 — Edit Content Flow

ACTION:
Edit own post.

EXPECTED:

* Content updates correctly
* State refreshes safely

---

## TC-MYFEED-004 — Delete Content Flow

ACTION:
Delete own post.

EXPECTED:

* Post removed safely
* No stale UI remains

---

## TC-MYFEED-005 — Ownership Actions Visibility

EXPECTED:

* Edit/delete only visible for owner

---

## TC-MYFEED-006 — Pull To Refresh

EXPECTED:

* Correct data refresh
* No duplication

---

## TC-MYFEED-007 — Pagination Stability

EXPECTED:

* Smooth loading
* Stable state

---

## TC-MYFEED-008 — Lifecycle Restoration

ACTION:
Background app → reopen.

EXPECTED:

* State restored safely

---

## TC-MYFEED-009 — Navigation Stability

ACTION:
Navigate across app → return.

EXPECTED:

* Correct restoration

---

## TC-MYFEED-010 — Responsive Layout

EXPECTED:

* Proper spacing
* Mobile optimized layout

======================================================================
SECTION 3 — MY HOME TEST CASES
==============================

---

## TC-MYHOME-001 — Listing Ownership Validation

EXPECTED:

* Only current user's marketplace listings visible

---

## TC-MYHOME-002 — Wrong Listing Leakage

EXPECTED:

* No чужие listings shown

---

## TC-MYHOME-003 — Listing Edit Flow

ACTION:
Edit listing.

EXPECTED:

* Changes persist correctly

---

## TC-MYHOME-004 — Listing Delete Flow

ACTION:
Delete listing.

EXPECTED:

* Listing removed correctly

---

## TC-MYHOME-005 — Mark Sold Flow

ACTION:
Mark listing sold.

EXPECTED:

* Status updates correctly
* Listing state refreshed

---

## TC-MYHOME-006 — Listing Visibility Management

EXPECTED:

* Hide/show actions function correctly

---

## TC-MYHOME-007 — Empty State Validation

EXPECTED:

* Premium empty state
* Correct CTA guidance

---

## TC-MYHOME-008 — Pull To Refresh

EXPECTED:

* No duplicate listings
* Smooth refresh

---

## TC-MYHOME-009 — Lifecycle Restoration

EXPECTED:

* Listing state restored safely

---

## TC-MYHOME-010 — Navigation Stability

ACTION:
MyHome → Listing → Back.

EXPECTED:

* Correct restoration

---

## TC-MYHOME-011 — Responsive Layout

EXPECTED:

* Mobile optimized cards
* No overflow

======================================================================
SECTION 4 — SOCIAL ENGAGEMENT TEST CASES
========================================

---

## TC-SOCIAL-001 — Like Interaction

ACTION:
Like/unlike content.

EXPECTED:

* Count updates instantly
* No duplicate requests

---

## TC-SOCIAL-002 — Comment Flow

ACTION:
Add comment.

EXPECTED:

* Comment appears correctly
* State reactive

---

## TC-SOCIAL-003 — Reply Flow

ACTION:
Reply to comment.

EXPECTED:

* Correct nesting

---

## TC-SOCIAL-004 — Share Flow

EXPECTED:

* Share works correctly

---

## TC-SOCIAL-005 — Engagement Persistence

ACTION:
Leave page → return.

EXPECTED:

* Engagement state preserved

---

## TC-SOCIAL-006 — Rapid Interaction Stress

ACTION:
Rapid likes/comments.

EXPECTED:

* No duplicate state corruption

======================================================================
SECTION 5 — WEB PARITY VALIDATION TEST CASES
============================================

---

## TC-WEBPARITY-001 — Feed Semantic Validation

Compare Android Feed vs web app.

EXPECTED:

* Same content purpose
* Same social semantics

---

## TC-WEBPARITY-002 — My Feed Semantic Validation

EXPECTED:

* Same ownership behavior

---

## TC-WEBPARITY-003 — My Home Semantic Validation

EXPECTED:

* Same marketplace ownership behavior

---

## TC-WEBPARITY-004 — Layout Comparison

Compare:

* spacing
* typography
* hierarchy
* cards
* interactions

EXPECTED:
Android aligned with web app.

---

## TC-WEBPARITY-005 — Navigation Comparison

EXPECTED:

* Same route behavior
* Same UX hierarchy

======================================================================
SECTION 6 — PERFORMANCE & STRESS TESTS
======================================

---

## TC-STRESS-001 — Rapid Scroll Stress

EXPECTED:

* Stable rendering
* No crashes

---

## TC-STRESS-002 — Long Session Testing

EXPECTED:

* No stale feed state

---

## TC-STRESS-003 — Heavy Content Loading

EXPECTED:

* Stable pagination

---

## TC-STRESS-004 — Memory Leak Validation

EXPECTED:

* Stable memory usage

---

## TC-STRESS-005 — Repeated Navigation Stress

ACTION:
Switch pages repeatedly.

EXPECTED:

* Stable lifecycle handling

---

## TC-STRESS-006 — Background/Foreground Stress

EXPECTED:

* State restoration safe

======================================================================
SECTION 7 — NEGATIVE TEST CASES
===============================

---

## TC-NEGATIVE-001

Feed accidentally shows marketplace cards.

RESULT:
FAIL

---

## TC-NEGATIVE-002

My Feed shows other users' posts.

RESULT:
FAIL

---

## TC-NEGATIVE-003

My Home behaves like Feed.

RESULT:
FAIL

---

## TC-NEGATIVE-004

Duplicate posts appear after refresh.

RESULT:
FAIL

---

## TC-NEGATIVE-005

Pagination duplicates content.

RESULT:
FAIL

---

## TC-NEGATIVE-006

Lifecycle resets scroll position incorrectly.

RESULT:
FAIL

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK COMPLETE IF:

* Feed still marketplace-like
* My Feed semantics incorrect
* My Home semantics incorrect
* ownership filtering broken
* duplicate content exists
* engagement unstable
* pagination broken
* fake parity exists
* Android-only logic exists
* stale state exists
* weak readability exists

======================================================================
FINAL PHASE GOAL
================

The social ecosystem must finally become:

* semantically correct
* socially intuitive
* readable
* ownership-aware
* lifecycle-safe
* performant
* scalable
* web-aligned
* mobile-native
* production-grade

with:

* zero semantic confusion
* zero fake parity
* zero duplicated flows
* zero ownership leakage
* zero stale state
* zero unstable interactions
* zero weak UX

The final result should feel like:
a premium modern social-commerce platform,
NOT randomly mixed marketplace and social screens with inconsistent behavior.
# PHASE 16 — SALEDONE, SALEUNDONE, COMPLAINTS, FEEDBACK & POST-SALE WORKFLOW RECONSTRUCTION

# COMPLETE WEB PARITY + OWNERSHIP FLOWS + SUPPORT SYSTEM + PRODUCTION STABILIZATION

======================================================================
PHASE OBJECTIVE
===============

Rebuild the COMPLETE post-sale and support ecosystem using the web app as the ONLY source of truth.

This phase focuses on:

* SaleDone
* SaleUndone
* Complaints
* Feedback
* Post-sale workflows
* Ownership flows
* Marketplace transaction lifecycle
* User support systems
* Status handling
* Resolution flows
* Mobile-first UX
* Web parity reconstruction

Goal:
Transform the Android support and post-sale ecosystem into a fully production-grade, semantically accurate, lifecycle-safe, premium mobile experience aligned 100% with the web application.

======================================================================
CRITICAL ROOT FAILURE IDENTIFIED
================================

Current Android implementations are:

* invented independently
* semantically incorrect
* visually inconsistent
* structurally disconnected from web app
* fake parity
* placeholder implementations
* incorrect ownership flows
* incomplete transaction lifecycle systems

Example:
SaleDone pages were created randomly without actual web-app reference analysis.

This phase fixes that.

======================================================================
MANDATORY RULE
==============

Before implementation:

Capture screenshots and flows from web app after authenticated login for:

* SaleDone
* SaleUndone
* Complaints
* Feedback

Analyze:

* layouts
* workflows
* ownership logic
* permissions
* status transitions
* API behavior
* action hierarchy
* support flows

DO NOT GUESS.

======================================================================
SECTION 1 — SALEDONE PAGE COMPLETE REBUILD
==========================================

CURRENT ISSUES

* random Android implementation
* fake layouts
* incorrect semantics
* wrong ownership behavior
* unstable loading
* unrelated UI
* missing workflow hierarchy

---

## REQUIRED SALEDONE EXPERIENCE

SaleDone must represent:

completed/successful marketplace transactions.

---

## MANDATORY FEATURES

Implement:

* sold listings history
* transaction summaries
* buyer/seller references
* sold timestamps
* ownership visibility
* completed transaction status
* post-sale actions
* lifecycle-safe rendering
* responsive mobile layouts

---

## IMPORTANT

SaleDone is NOT:
random dashboard clone.

It is:
completed transaction lifecycle view.

======================================================================
SECTION 2 — SALEDONE TEST CASES
===============================

---

## TC-SALEDONE-001 — Sold Listings Rendering

EXPECTED:

* Sold listings load correctly
* No placeholder data

---

## TC-SALEDONE-002 — Ownership Validation

EXPECTED:

* Only current user's sold transactions visible

---

## TC-SALEDONE-003 — Transaction Status Validation

EXPECTED:

* Sold/completed status accurate

---

## TC-SALEDONE-004 — Navigation Stability

ACTION:
Open transaction → Back.

EXPECTED:

* Correct restoration

---

## TC-SALEDONE-005 — Pull To Refresh

EXPECTED:

* Correct refresh behavior
* No duplicate transactions

---

## TC-SALEDONE-006 — Lifecycle Restoration

EXPECTED:

* State restored correctly

---

## TC-SALEDONE-007 — Responsive Layout

EXPECTED:

* Mobile optimized cards
* Proper spacing

======================================================================
SECTION 3 — SALEUNDONE PAGE COMPLETE REBUILD
============================================

CURRENT ISSUES

* incorrect semantics
* fake parity
* unstable rendering
* unrelated layouts
* wrong ownership handling

---

## REQUIRED SALEUNDONE EXPERIENCE

SaleUndone must represent:

transactions/listings that were not successfully completed.

---

## MANDATORY FEATURES

Implement:

* incomplete transaction tracking
* unresolved listings
* retry/relist actions
* ownership filtering
* failure states
* post-failure workflows
* lifecycle-safe rendering

---

## IMPORTANT

SaleUndone is NOT:
generic listings page.

======================================================================
SECTION 4 — SALEUNDONE TEST CASES
=================================

---

## TC-SALEUNDONE-001 — Failed Listings Rendering

EXPECTED:

* Correct unresolved listings visible

---

## TC-SALEUNDONE-002 — Ownership Validation

EXPECTED:

* Only current user's unresolved transactions shown

---

## TC-SALEUNDONE-003 — Retry Flow

ACTION:
Retry/relist listing.

EXPECTED:

* Correct retry flow works

---

## TC-SALEUNDONE-004 — State Restoration

EXPECTED:

* Stable restoration

---

## TC-SALEUNDONE-005 — Responsive Layout

EXPECTED:

* Mobile optimized UX

======================================================================
SECTION 5 — COMPLAINTS PAGE COMPLETE REBUILD
============================================

CURRENT ISSUES

* random Android implementation
* weak UX
* fake parity
* placeholder flows
* incorrect hierarchy

---

## REQUIRED COMPLAINTS EXPERIENCE

Complaints page must feel like:

professional support/ticketing system.

---

## MANDATORY FEATURES

Implement:

* complaint submission
* complaint history
* issue categories
* ticket status
* resolution tracking
* ownership filtering
* lifecycle-safe updates
* responsive layouts

---

## COMPLAINT FLOW MUST FEEL

* trustworthy
* professional
* organized
* responsive

======================================================================
SECTION 6 — COMPLAINTS TEST CASES
=================================

---

## TC-COMPLAINT-001 — Complaint Submission

ACTION:
Submit complaint.

EXPECTED:

* Ticket created successfully

---

## TC-COMPLAINT-002 — Complaint History

EXPECTED:

* User complaint history visible

---

## TC-COMPLAINT-003 — Status Tracking

EXPECTED:

* Correct ticket statuses shown

---

## TC-COMPLAINT-004 — Ownership Validation

EXPECTED:

* Only current user's tickets visible

---

## TC-COMPLAINT-005 — Pull To Refresh

EXPECTED:

* Correct refresh behavior

---

## TC-COMPLAINT-006 — Responsive Layout

EXPECTED:

* Mobile optimized support UI

======================================================================
SECTION 7 — FEEDBACK PAGE COMPLETE REBUILD
==========================================

CURRENT ISSUES

* fake placeholder implementation
* incorrect layouts
* weak UX
* non-web parity

---

## REQUIRED FEEDBACK EXPERIENCE

Feedback page must feel like:

professional user-feedback ecosystem.

---

## MANDATORY FEATURES

Implement:

* feedback submission
* rating flows
* text feedback
* submission history if supported
* lifecycle-safe rendering
* responsive layouts

---

## IMPORTANT

Feedback UX must feel:
simple
clean
professional

======================================================================
SECTION 8 — FEEDBACK TEST CASES
===============================

---

## TC-FEEDBACK-001 — Feedback Submission

ACTION:
Submit feedback.

EXPECTED:

* Submission successful

---

## TC-FEEDBACK-002 — Validation Handling

ACTION:
Submit empty feedback.

EXPECTED:

* Smart validation errors

---

## TC-FEEDBACK-003 — Rating Flow

EXPECTED:

* Ratings selectable correctly

---

## TC-FEEDBACK-004 — Responsive Layout

EXPECTED:

* Mobile optimized UI

---

## TC-FEEDBACK-005 — Lifecycle Stability

EXPECTED:

* Safe restoration after backgrounding

======================================================================
SECTION 9 — POST-SALE WORKFLOW RECONSTRUCTION
=============================================

MANDATORY:
Reconstruct COMPLETE post-sale lifecycle using web app flows.

---

## WORKFLOWS INCLUDE

* listing sold flow
* unresolved sale flow
* complaint escalation
* feedback submission
* ownership validation
* transaction visibility
* retry/relist actions

---

## IMPORTANT

All workflows must be:

* lifecycle-safe
* reactive
* ownership-aware
* permission-safe
* web-aligned

======================================================================
SECTION 10 — HAMBURGER MENU VALIDATION
======================================

CRITICAL ISSUE

Android hamburger menu currently contains:

* wrong pages
* redundant utilities
* fake flows
* missing real workflows

---

## REQUIRED

Ensure:

* SaleDone
* SaleUndone
* Complaints
* Feedback

exist ONLY if validated from web app.

---

## REMOVE

* invented Android pages
* fake dashboard routes
* duplicate utilities
* placeholder implementations

======================================================================
SECTION 11 — WEB PARITY VALIDATION
==================================

MANDATORY

Capture authenticated web screenshots for:

* SaleDone
* SaleUndone
* Complaints
* Feedback

---

## VALIDATE

* semantics
* workflows
* permissions
* ownership behavior
* UI hierarchy
* navigation
* layouts
* typography
* interactions

---

## DO NOT MARK COMPLETE IF

* Android still fake parity
* random implementations remain
* workflows differ
* ownership logic broken
* placeholder pages remain

======================================================================
SECTION 12 — ARCHITECTURE REQUIREMENTS
======================================

MANDATORY

Centralize:

* ticket state
* transaction state
* ownership state
* feedback state
* refresh state
* pagination state

---

## PREVENT

* stale ticket data
* duplicated complaints
* incorrect ownership visibility
* broken retry flows
* lifecycle corruption
* state mismatch

======================================================================
SECTION 13 — PERFORMANCE & STABILITY TESTS
==========================================

---

## TC-STRESS-001

Rapid navigation stress testing.

EXPECTED:

* No crashes

---

## TC-STRESS-002

Repeated complaint submission testing.

EXPECTED:

* No duplicate submissions

---

## TC-STRESS-003

Network interruption testing.

EXPECTED:

* Graceful recovery

---

## TC-STRESS-004

Long-session testing.

EXPECTED:

* Stable lifecycle restoration

---

## TC-STRESS-005

Low-end device responsiveness.

EXPECTED:

* Smooth mobile UX

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK COMPLETE IF:

* SaleDone fake parity exists
* SaleUndone semantics incorrect
* Complaints weak/placeholder
* Feedback weak/placeholder
* ownership filtering broken
* workflows differ from web app
* hamburger clutter remains
* lifecycle instability exists
* Android-only fake routes exist
* stale state exists

======================================================================
FINAL PHASE GOAL
================

The post-sale ecosystem must become:

* semantically accurate
* ownership-aware
* professional
* trustworthy
* responsive
* lifecycle-safe
* mobile-native
* scalable
* web-aligned
* production-grade

with:

* zero fake parity
* zero invented workflows
* zero placeholder screens
* zero ownership leakage
* zero unstable state
* zero incorrect semantics
* zero redundant routes

The final result should feel like:
a premium professional transaction-support ecosystem,
NOT randomly invented Android support pages disconnected from the actual product.
# PHASE 17 — ALLPOSTS, FILTERS, SUBCATEGORIES, COMPARE, HERO BANNERS & MARKETPLACE BROWSING RECONSTRUCTION

# COMPLETE WEB PARITY + MARKETPLACE UX + CATEGORY ISOLATION + PRODUCTION STABILIZATION

======================================================================
PHASE OBJECTIVE
===============

Rebuild the COMPLETE marketplace browsing ecosystem using the web app as the ONLY source of truth.

This phase focuses on:

* AllPosts
* Hero banners
* Sticky filters
* Quick filters
* Subcategories
* Compare feature
* Marketplace browsing UX
* Category isolation architecture
* Listing cards
* Search/filter interactions
* Navigation hierarchy
* Category ecosystems
* Responsive browsing experience

Goal:
Transform AllPosts into a premium marketplace browsing experience fully aligned with the web application and semantically correct for ecosystem-based navigation.

======================================================================
CRITICAL ROOT FAILURE IDENTIFIED
================================

The Android app currently misunderstands the ENTIRE marketplace architecture.

Major issues:

* categories mixed globally
* wrong category bars
* subcategories missing
* compare implemented incorrectly
* filters weak/broken
* hero banners missing
* fake marketplace parity
* weak listing cards
* incorrect ecosystem isolation
* random compare page in hamburger menu
* wrong navigation hierarchy

This phase fixes the CORE marketplace architecture.

======================================================================
MANDATORY MARKETPLACE ARCHITECTURE
==================================

CRITICAL PRODUCT RULE:

HOME PAGE
= ecosystem selector.

Example:

User enters:
Fashion ecosystem.

From that point:
the ENTIRE browsing experience becomes:
Fashion-only ecosystem.

NOT:
mixed global marketplace.

---

## CORRECT FLOW

Launch App
→ Home
→ Select Ecosystem
→ Enter isolated marketplace ecosystem
→ AllPosts becomes ecosystem-specific browsing experience

---

## IMPORTANT

If user wants Electronics:
they MUST return to Home
and enter Electronics ecosystem separately.

NO cross-ecosystem category confusion allowed.

======================================================================
SECTION 1 — ALLPOSTS COMPLETE REBUILD
=====================================

CURRENT ISSUES

* weak UI
* fake parity
* categories incorrect
* subcategories missing
* compare incorrect
* hero banners missing
* sticky filters weak
* marketplace semantics broken
* poor card design
* weak UX hierarchy

---

## REQUIRED ALLPOSTS EXPERIENCE

AllPosts must feel like:

* premium marketplace
* immersive browsing platform
* ecosystem-specific commerce experience
* modern mobile marketplace

---

## MANDATORY FEATURES

Implement:

* ecosystem-isolated browsing
* hero banners
* sticky filters
* quick filters
* subcategory chips
* premium listing cards
* compare interactions
* smooth pagination
* immersive browsing UX
* responsive layouts
* lifecycle-safe rendering

======================================================================
SECTION 2 — HERO BANNERS REBUILD
================================

CURRENT ISSUES

* missing entirely
* weak replacements
* non-web parity

---

## REQUIRED HERO EXPERIENCE

Implement:

* dynamic hero banners
* ecosystem-specific banners
* carousel support
* swipe gestures
* responsive mobile banners
* CTA integration
* smooth transitions

---

## IMPORTANT

Hero banners MUST match:
web app visual hierarchy.

======================================================================
SECTION 3 — HERO BANNER TEST CASES
==================================

---

## TC-HERO-001 — Hero Rendering

EXPECTED:

* Banner loads correctly
* No blank area

---

## TC-HERO-002 — Ecosystem Validation

EXPECTED:

* Banner matches current ecosystem only

---

## TC-HERO-003 — Carousel Navigation

ACTION:
Swipe banners.

EXPECTED:

* Smooth transitions

---

## TC-HERO-004 — CTA Interaction

EXPECTED:

* Banner actions work correctly

---

## TC-HERO-005 — Responsive Layout

EXPECTED:

* Mobile optimized rendering

======================================================================
SECTION 4 — STICKY FILTERS & QUICK FILTERS REBUILD
==================================================

CURRENT ISSUES

* weak implementation
* broken interactions
* filter button not working
* categories incorrectly shown
* web parity missing

---

## REQUIRED FILTER EXPERIENCE

Implement:

* sticky filter bar
* animated quick filters
* responsive filter chips
* dynamic filter loading
* ecosystem-aware filtering
* mobile-friendly interactions
* reactive filter updates

---

## IMPORTANT

Top navbar filter beside search MUST work correctly.

======================================================================
SECTION 5 — FILTER TEST CASES
=============================

---

## TC-FILTER-001 — Filter Button Validation

ACTION:
Tap filter button beside search.

EXPECTED:

* Filter modal opens correctly

---

## TC-FILTER-002 — Sticky Behavior

EXPECTED:

* Filter bar remains accessible while scrolling

---

## TC-FILTER-003 — Quick Filter Interaction

EXPECTED:

* Chips selectable correctly

---

## TC-FILTER-004 — Reactive Filtering

EXPECTED:

* Listings update instantly

---

## TC-FILTER-005 — Filter Persistence

ACTION:
Navigate away → return.

EXPECTED:

* Filter state restored safely

---

## TC-FILTER-006 — Responsive Layout

EXPECTED:

* Mobile optimized chip layout

======================================================================
SECTION 6 — SUBCATEGORY REBUILD
===============================

CURRENT ISSUES

* categories shown incorrectly
* subcategories missing
* ecosystem hierarchy broken

---

## CRITICAL RULE

Inside ecosystem:
ONLY subcategories must appear.

NOT:
global categories.

---

## EXAMPLE

If user enters Fashion ecosystem:

AllPosts should show:

* Men
* Women
* Footwear
* Accessories

NOT:
Electronics
Vehicles
Furniture

---

## MANDATORY FEATURES

Implement:

* ecosystem-specific subcategory chips
* dynamic subcategory loading
* sticky subcategory bar
* responsive interactions
* lifecycle-safe rendering

======================================================================
SECTION 7 — SUBCATEGORY TEST CASES
==================================

---

## TC-SUBCATEGORY-001 — Ecosystem Isolation

EXPECTED:

* Only ecosystem subcategories visible

---

## TC-SUBCATEGORY-002 — Cross-Ecosystem Validation

EXPECTED:

* No unrelated categories shown

---

## TC-SUBCATEGORY-003 — Selection Flow

EXPECTED:

* Subcategory updates listings correctly

---

## TC-SUBCATEGORY-004 — Sticky Bar Validation

EXPECTED:

* Bar remains accessible

---

## TC-SUBCATEGORY-005 — Responsive Layout

EXPECTED:

* Mobile optimized chips

======================================================================
SECTION 8 — LISTING CARD SYSTEM REBUILD
=======================================

CURRENT ISSUES

* weak card design
* fake parity
* poor visual hierarchy
* weak engagement
* inconsistent layouts

---

## REQUIRED CARD EXPERIENCE

AllPosts cards must visually align with:
Feed card quality/style,
BUT:
retain marketplace functionality.

---

## MANDATORY FEATURES

Implement:

* premium listing cards
* image-first layouts
* responsive spacing
* engagement indicators
* compare triggers
* ownership indicators
* lifecycle-safe rendering
* immersive browsing feel

---

## IMPORTANT

Clicking card must:
open detailed listing page.

======================================================================
SECTION 9 — COMPARE FEATURE REBUILD
===================================

CURRENT ISSUES

* compare wrongly exists as separate page
* hamburger clutter
* fake UX
* incorrect architecture

---

## CORRECT COMPARE BEHAVIOR

Compare is:
integrated browsing functionality.

NOT:
standalone emphasized menu page.

---

## MANDATORY FEATURES

Implement:

* compare selection toggles
* sticky compare tray
* side-by-side comparison
* attribute comparison
* integrated listing comparison UX
* compare persistence

---

## REMOVE

* isolated compare page emphasis
* redundant compare routes in hamburger menu

======================================================================
SECTION 10 — COMPARE TEST CASES
===============================

---

## TC-COMPARE-001 — Compare Selection

EXPECTED:

* Listings selectable correctly

---

## TC-COMPARE-002 — Sticky Compare Tray

EXPECTED:

* Tray appears correctly

---

## TC-COMPARE-003 — Side-by-Side Comparison

EXPECTED:

* Correct comparison rendering

---

## TC-COMPARE-004 — Persistence Validation

ACTION:
Navigate away → return.

EXPECTED:

* Compare state retained

---

## TC-COMPARE-005 — Responsive Layout

EXPECTED:

* Mobile optimized comparison UI

======================================================================
SECTION 11 — SEARCH & NAVBAR VALIDATION
=======================================

CURRENT ISSUES

* top navbar incomplete
* search/filter broken
* incorrect hierarchy

---

## REQUIRED

ALLPOSTS TOP NAVBAR:

* search
* working filter button
* contextual actions only

---

## DO NOT

show:
global category confusion.

======================================================================
SECTION 12 — WEB PARITY VALIDATION
==================================

MANDATORY

Capture web screenshots for:

* AllPosts
* Hero banners
* Filters
* Compare
* Subcategories

---

## VALIDATE

* ecosystem behavior
* category isolation
* layouts
* interactions
* compare UX
* filter behavior
* card hierarchy
* hero banners

---

## DO NOT MARK COMPLETE IF

* categories still mixed
* compare isolated incorrectly
* hero banners missing
* sticky filters weak
* subcategories incorrect
* fake parity exists

======================================================================
SECTION 13 — ARCHITECTURE REQUIREMENTS
======================================

MANDATORY

Centralize:

* ecosystem state
* filter state
* compare state
* pagination state
* subcategory state
* search state
* hero banner state

---

## PREVENT

* stale filters
* mixed ecosystems
* compare corruption
* pagination duplication
* lifecycle resets
* state mismatch

======================================================================
SECTION 14 — PERFORMANCE & STABILITY TESTS
==========================================

---

## TC-STRESS-001

Rapid browsing stress test.

EXPECTED:

* Smooth rendering

---

## TC-STRESS-002

Repeated filter switching.

EXPECTED:

* Stable updates

---

## TC-STRESS-003

Heavy pagination loading.

EXPECTED:

* No duplication

---

## TC-STRESS-004

Network interruption handling.

EXPECTED:

* Graceful recovery

---

## TC-STRESS-005

Long-session testing.

EXPECTED:

* Stable browsing state

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK COMPLETE IF:

* categories mixed globally
* subcategories incorrect
* compare isolated incorrectly
* hero banners missing
* sticky filters weak
* search/filter broken
* fake parity exists
* ecosystem isolation broken
* weak card design remains
* stale filter state exists

======================================================================
FINAL PHASE GOAL
================

The marketplace ecosystem must become:

* ecosystem-isolated
* semantically correct
* premium
* immersive
* mobile-native
* scalable
* lifecycle-safe
* visually polished
* web-aligned
* production-grade

with:

* zero mixed ecosystem confusion
* zero fake compare UX
* zero broken filters
* zero missing hero banners
* zero weak listing cards
* zero incorrect subcategories
* zero stale browsing state

The final result should feel like:
a premium world-class mobile marketplace browsing experience,
NOT a randomly mixed category system with weak filters and fake parity.

# PHASE 16 — COMPLETE TEST CASE SUITE

# SALEDONE + SALEUNDONE + COMPLAINTS + FEEDBACK + POST-SALE WORKFLOWS

======================================================================
SECTION 1 — SALEDONE TEST CASES
===============================

### TC-SALEDONE-001 — Page Load Validation

ACTION:
Open SaleDone page after login.

EXPECTED:

* Page loads successfully
* No blank screen
* No shimmer freeze
* No crash
* No placeholder content

---

### TC-SALEDONE-002 — Ownership Validation

EXPECTED:

* Only current user’s sold/completed listings visible
* No other user transactions visible

---

### TC-SALEDONE-003 — Web Parity Validation

COMPARE:
Web app vs Android.

EXPECTED:

* Same layout hierarchy
* Same semantics
* Same transaction meaning
* Same workflow behavior

---

### TC-SALEDONE-004 — Listing Card Validation

EXPECTED:

* Sold item image visible
* Status visible
* Timestamp visible
* Buyer/seller details visible if applicable

---

### TC-SALEDONE-005 — Transaction Status Validation

EXPECTED:

* Completed/Sold badge accurate
* Status synced with backend

---

### TC-SALEDONE-006 — Pagination Validation

ACTION:
Scroll continuously.

EXPECTED:

* Smooth pagination
* No duplicate items
* No list jumps

---

### TC-SALEDONE-007 — Pull To Refresh

EXPECTED:

* Correct refresh
* State updated safely
* No duplicated records

---

### TC-SALEDONE-008 — Back Navigation Validation

ACTION:
Open listing → Back.

EXPECTED:

* Correct scroll restoration
* No list reload unnecessarily

---

### TC-SALEDONE-009 — Lifecycle Restoration

ACTION:
Background app → reopen.

EXPECTED:

* Page restored correctly
* Scroll retained

---

### TC-SALEDONE-010 — Empty State Validation

EXPECTED:

* Premium empty state
* Correct CTA guidance

---

### TC-SALEDONE-011 — Error State Validation

ACTION:
Disconnect internet.

EXPECTED:

* Graceful retry state
* No app crash

---

### TC-SALEDONE-012 — Responsive Layout Validation

EXPECTED:

* Mobile optimized spacing
* No overflow
* No clipping

======================================================================
SECTION 2 — SALEUNDONE TEST CASES
=================================

### TC-SALEUNDONE-001 — Page Rendering

EXPECTED:

* Correct unresolved listings shown

---

### TC-SALEUNDONE-002 — Ownership Filtering

EXPECTED:

* Only current user's unresolved transactions visible

---

### TC-SALEUNDONE-003 — Semantic Validation

EXPECTED:

* Page represents incomplete/failed transactions
* NOT generic listings page

---

### TC-SALEUNDONE-004 — Retry/Relist Flow

ACTION:
Tap relist/retry.

EXPECTED:

* Correct relist workflow

---

### TC-SALEUNDONE-005 — Status Validation

EXPECTED:

* Correct unresolved status shown

---

### TC-SALEUNDONE-006 — Pagination Validation

EXPECTED:

* Smooth infinite loading

---

### TC-SALEUNDONE-007 — Refresh Validation

EXPECTED:

* No duplicate items

---

### TC-SALEUNDONE-008 — Lifecycle Validation

EXPECTED:

* Stable restoration after reopen

---

### TC-SALEUNDONE-009 — Empty State Validation

EXPECTED:

* Premium empty state

---

### TC-SALEUNDONE-010 — Responsive Layout

EXPECTED:

* Mobile optimized rendering

======================================================================
SECTION 3 — COMPLAINTS TEST CASES
=================================

### TC-COMPLAINT-001 — Complaint Submission

ACTION:
Submit complaint.

EXPECTED:

* Ticket created successfully

---

### TC-COMPLAINT-002 — Validation Handling

ACTION:
Submit incomplete complaint.

EXPECTED:

* Smart validation messages

---

### TC-COMPLAINT-003 — Complaint History

EXPECTED:

* User complaint history visible

---

### TC-COMPLAINT-004 — Ownership Validation

EXPECTED:

* Only current user tickets visible

---

### TC-COMPLAINT-005 — Status Tracking

EXPECTED:

* Open/InProgress/Resolved statuses accurate

---

### TC-COMPLAINT-006 — Attachment Upload Validation

ACTION:
Upload proof/image.

EXPECTED:

* Upload works safely

---

### TC-COMPLAINT-007 — Refresh Validation

EXPECTED:

* Complaint list updates correctly

---

### TC-COMPLAINT-008 — Pagination Validation

EXPECTED:

* Stable scrolling

---

### TC-COMPLAINT-009 — Lifecycle Restoration

EXPECTED:

* Complaint state preserved

---

### TC-COMPLAINT-010 — Error State Validation

EXPECTED:

* Retry handling works

---

### TC-COMPLAINT-011 — Responsive Layout

EXPECTED:

* Mobile optimized support UI

======================================================================
SECTION 4 — FEEDBACK TEST CASES
===============================

### TC-FEEDBACK-001 — Feedback Submission

ACTION:
Submit feedback.

EXPECTED:

* Submission successful

---

### TC-FEEDBACK-002 — Rating Selection

EXPECTED:

* Ratings selectable properly

---

### TC-FEEDBACK-003 — Validation Handling

ACTION:
Submit empty form.

EXPECTED:

* Smart validation errors

---

### TC-FEEDBACK-004 — Submission Confirmation

EXPECTED:

* Success state visible

---

### TC-FEEDBACK-005 — Lifecycle Restoration

EXPECTED:

* Safe restoration after backgrounding

---

### TC-FEEDBACK-006 — Responsive Layout

EXPECTED:

* Mobile optimized form UI

---

### TC-FEEDBACK-007 — Network Failure Handling

EXPECTED:

* Retry flow works correctly

======================================================================
SECTION 5 — POST-SALE WORKFLOW TEST CASES
=========================================

### TC-POSTSALE-001 — Mark Sold Workflow

ACTION:
Mark listing sold.

EXPECTED:

* Listing moves correctly to SaleDone

---

### TC-POSTSALE-002 — Failed Sale Workflow

EXPECTED:

* Failed/unresolved listings appear in SaleUndone

---

### TC-POSTSALE-003 — Complaint Escalation

ACTION:
Raise complaint from listing.

EXPECTED:

* Complaint linked properly

---

### TC-POSTSALE-004 — Feedback After Transaction

EXPECTED:

* Feedback tied to correct flow

---

### TC-POSTSALE-005 — Ownership Validation

EXPECTED:

* Users cannot manipulate others’ transactions

---

### TC-POSTSALE-006 — API State Sync

EXPECTED:

* Android and backend states synchronized

======================================================================
SECTION 6 — HAMBURGER MENU VALIDATION
=====================================

### TC-HMENU-001

EXPECTED:

* Only validated web-app pages exist

---

### TC-HMENU-002

EXPECTED:

* No duplicate profile/dashboard routes

---

### TC-HMENU-003

EXPECTED:

* SaleDone/SaleUndone/Feedback/Complaints accessible correctly

---

### TC-HMENU-004

EXPECTED:

* No random Android-only pages remain

======================================================================
SECTION 7 — WEB PARITY VALIDATION
=================================

### TC-WEBPARITY-001

COMPARE:
SaleDone web vs Android.

EXPECTED:

* Same semantics
* Same workflows

---

### TC-WEBPARITY-002

COMPARE:
SaleUndone web vs Android.

EXPECTED:

* Same unresolved transaction logic

---

### TC-WEBPARITY-003

COMPARE:
Complaints web vs Android.

EXPECTED:

* Same support workflow

---

### TC-WEBPARITY-004

COMPARE:
Feedback web vs Android.

EXPECTED:

* Same submission UX

======================================================================
SECTION 8 — NEGATIVE TEST CASES
===============================

### TC-NEGATIVE-001

SaleDone shows random dashboard content.

RESULT:
FAIL

---

### TC-NEGATIVE-002

SaleUndone behaves like generic listings page.

RESULT:
FAIL

---

### TC-NEGATIVE-003

Complaints page uses placeholder implementation.

RESULT:
FAIL

---

### TC-NEGATIVE-004

Feedback form broken after backgrounding app.

RESULT:
FAIL

---

### TC-NEGATIVE-005

Other users’ transactions visible.

RESULT:
FAIL

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK COMPLETE IF:

* fake parity remains
* ownership broken
* placeholder pages remain
* workflows differ from web app
* lifecycle issues exist
* duplicate records appear
* hamburger clutter remains
* weak support UX remains

# PHASE 17 — COMPLETE TEST CASE SUITE

# ALLPOSTS + FILTERS + SUBCATEGORIES + HERO BANNERS + COMPARE + MARKETPLACE BROWSING

======================================================================
SECTION 1 — ECOSYSTEM ISOLATION TEST CASES
==========================================

### TC-ECO-001 — Ecosystem Entry Validation

ACTION:
Open Fashion ecosystem from Home.

EXPECTED:

* Entire browsing experience becomes Fashion-only

---

### TC-ECO-002 — Cross-Ecosystem Leakage Validation

EXPECTED:

* Electronics categories NOT shown inside Fashion

---

### TC-ECO-003 — Home Return Validation

ACTION:
Return Home → Enter Electronics.

EXPECTED:

* New ecosystem loads correctly

---

### TC-ECO-004 — Ecosystem Persistence

ACTION:
Navigate inside ecosystem.

EXPECTED:

* Ecosystem state retained

---

### TC-ECO-005 — Lifecycle Restoration

EXPECTED:

* Ecosystem restored correctly after reopen

======================================================================
SECTION 2 — ALLPOSTS TEST CASES
===============================

### TC-ALLPOSTS-001 — Page Rendering

EXPECTED:

* Listings load correctly
* No blank state

---

### TC-ALLPOSTS-002 — Premium Card Validation

EXPECTED:

* Image-first cards
* Proper spacing
* Premium visual hierarchy

---

### TC-ALLPOSTS-003 — Feed Card Style Validation

EXPECTED:

* Similar visual language as Feed cards
* Marketplace semantics preserved

---

### TC-ALLPOSTS-004 — Detailed Navigation Validation

ACTION:
Tap listing.

EXPECTED:

* Opens detailed listing page

---

### TC-ALLPOSTS-005 — Pagination Validation

EXPECTED:

* Smooth infinite loading

---

### TC-ALLPOSTS-006 — Refresh Validation

EXPECTED:

* No duplicate listings

---

### TC-ALLPOSTS-007 — Scroll Performance

EXPECTED:

* Smooth rendering
* No lag

---

### TC-ALLPOSTS-008 — Responsive Layout

EXPECTED:

* Mobile optimized UI

======================================================================
SECTION 3 — HERO BANNER TEST CASES
==================================

### TC-HERO-001 — Hero Rendering

EXPECTED:

* Banners visible correctly

---

### TC-HERO-002 — Ecosystem Banner Validation

EXPECTED:

* Fashion banners only in Fashion ecosystem

---

### TC-HERO-003 — Carousel Swipe Validation

EXPECTED:

* Smooth transitions

---

### TC-HERO-004 — CTA Interaction

EXPECTED:

* Banner actions functional

---

### TC-HERO-005 — Responsive Rendering

EXPECTED:

* No clipping
* Proper scaling

======================================================================
SECTION 4 — FILTER TEST CASES
=============================

### TC-FILTER-001 — Filter Button Validation

ACTION:
Tap filter beside search.

EXPECTED:

* Filter modal opens

---

### TC-FILTER-002 — Sticky Filter Validation

EXPECTED:

* Filter bar sticky while scrolling

---

### TC-FILTER-003 — Quick Filter Chips

EXPECTED:

* Chips selectable correctly

---

### TC-FILTER-004 — Reactive Filtering

EXPECTED:

* Listings update instantly

---

### TC-FILTER-005 — Filter Persistence

EXPECTED:

* Filter state retained after navigation

---

### TC-FILTER-006 — Filter Reset Validation

EXPECTED:

* Reset works safely

---

### TC-FILTER-007 — Responsive Filter Layout

EXPECTED:

* Mobile optimized chips

======================================================================
SECTION 5 — SUBCATEGORY TEST CASES
==================================

### TC-SUBCATEGORY-001 — Subcategory Rendering

EXPECTED:

* Ecosystem-specific subcategories visible

---

### TC-SUBCATEGORY-002 — Global Category Leakage

EXPECTED:

* No unrelated global categories

---

### TC-SUBCATEGORY-003 — Selection Validation

EXPECTED:

* Listings update correctly

---

### TC-SUBCATEGORY-004 — Sticky Subcategory Bar

EXPECTED:

* Bar remains accessible

---

### TC-SUBCATEGORY-005 — Scroll Performance

EXPECTED:

* Smooth horizontal scrolling

---

### TC-SUBCATEGORY-006 — Responsive Layout

EXPECTED:

* Mobile optimized chips

======================================================================
SECTION 6 — COMPARE FEATURE TEST CASES
======================================

### TC-COMPARE-001 — Compare Toggle Validation

EXPECTED:

* Compare selection works correctly

---

### TC-COMPARE-002 — Sticky Compare Tray

EXPECTED:

* Tray visible after selections

---

### TC-COMPARE-003 — Side-by-Side Comparison

EXPECTED:

* Accurate attribute comparison

---

### TC-COMPARE-004 — Compare Persistence

EXPECTED:

* Compare state retained after navigation

---

### TC-COMPARE-005 — Remove Compare Item

EXPECTED:

* Item removed safely

---

### TC-COMPARE-006 — Responsive Comparison UI

EXPECTED:

* Mobile optimized compare layout

---

### TC-COMPARE-007 — Hamburger Validation

EXPECTED:

* No isolated Compare page clutter

======================================================================
SECTION 7 — SEARCH & NAVBAR TEST CASES
======================================

### TC-NAVBAR-001 — Search Validation

EXPECTED:

* Search works correctly

---

### TC-NAVBAR-002 — Filter Button Validation

EXPECTED:

* Working filter beside search

---

### TC-NAVBAR-003 — Contextual Navbar Validation

EXPECTED:

* Only relevant actions visible

---

### TC-NAVBAR-004 — No Global Category Confusion

EXPECTED:

* Navbar respects ecosystem isolation

======================================================================
SECTION 8 — WEB PARITY VALIDATION
=================================

### TC-WEBPARITY-001

COMPARE:
AllPosts web vs Android.

EXPECTED:

* Same hierarchy
* Same semantics

---

### TC-WEBPARITY-002

COMPARE:
Filters web vs Android.

EXPECTED:

* Same filter behavior

---

### TC-WEBPARITY-003

COMPARE:
Subcategories web vs Android.

EXPECTED:

* Same ecosystem logic

---

### TC-WEBPARITY-004

COMPARE:
Compare feature web vs Android.

EXPECTED:

* Same integrated UX

---

### TC-WEBPARITY-005

COMPARE:
Hero banners web vs Android.

EXPECTED:

* Same visual hierarchy

======================================================================
SECTION 9 — STRESS & PERFORMANCE TESTS
======================================

### TC-STRESS-001

Rapid filter switching.

EXPECTED:

* Stable updates

---

### TC-STRESS-002

Heavy pagination loading.

EXPECTED:

* No duplicate data

---

### TC-STRESS-003

Long-session browsing.

EXPECTED:

* Stable ecosystem state

---

### TC-STRESS-004

Background/foreground stress.

EXPECTED:

* Safe restoration

---

### TC-STRESS-005

Network interruption handling.

EXPECTED:

* Graceful retry behavior

======================================================================
SECTION 10 — NEGATIVE TEST CASES
================================

### TC-NEGATIVE-001

Fashion ecosystem shows Electronics categories.

RESULT:
FAIL

---

### TC-NEGATIVE-002

Compare exists as isolated clutter page.

RESULT:
FAIL

---

### TC-NEGATIVE-003

Filter button beside search not working.

RESULT:
FAIL

---

### TC-NEGATIVE-004

Global categories shown instead of subcategories.

RESULT:
FAIL

---

### TC-NEGATIVE-005

Hero banners missing.

RESULT:
FAIL

---

### TC-NEGATIVE-006

AllPosts cards weak/non-premium.

RESULT:
FAIL

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK COMPLETE IF:

* ecosystem isolation broken
* compare architecture wrong
* subcategories incorrect
* filters weak/broken
* hero banners missing
* fake parity exists
* listing cards weak
* search/filter broken
* stale browsing state exists

# PHASE 18 — NAVIGATION, HAMBURGER MENU, TOP NAVBAR, BOTTOM NAVBAR, REDUNDANCY CLEANUP & GLOBAL UX ARCHITECTURE

# COMPLETE WEB PARITY + MOBILE-FIRST NAVIGATION + INFORMATION ARCHITECTURE REBUILD

======================================================================
PHASE OBJECTIVE
===============

Rebuild the ENTIRE navigation architecture of the Android app using the web app as the ONLY source of truth while optimizing for premium mobile UX.

This phase focuses on:

* Hamburger menu reconstruction
* Bottom navbar reconstruction
* Top navbar reconstruction
* Navigation hierarchy
* Redundant page removal
* Feature discoverability
* Information architecture
* Mobile-first route organization
* Stack handling
* Back navigation
* Context-aware navigation
* Utility consolidation
* Navigation state management

Goal:
Transform the Android app from a cluttered, confusing, route-heavy system into a clean, intuitive, scalable, premium mobile navigation ecosystem.

======================================================================
CRITICAL ROOT FAILURE IDENTIFIED
================================

Current Android navigation suffers from:

* random pages
* invented routes
* duplicate destinations
* hamburger clutter
* utility duplication
* fake parity
* inconsistent navigation
* weak mobile adaptation
* poor discoverability
* redundant actions
* navigation loops
* unclear feature ownership

Examples:

* Compare exists both in AllPosts and hamburger
* Wishlist exists multiple places
* Notifications duplicated
* Cart duplicated
* Profile duplicated
* Dashboard renamed randomly
* Random Android-only pages added
* Hamburger menu too lengthy/confusing

This phase resolves ALL navigation architecture failures.

======================================================================
MANDATORY RULE
==============

The web app defines:

* feature existence
* navigation hierarchy
* route ownership
* feature grouping
* page semantics

Android must:

* follow web semantics
* optimize for mobile UX
* reduce clutter
* reduce duplication
* improve discoverability

DO NOT:
blindly copy desktop navigation.

======================================================================
SECTION 1 — COMPLETE NAVIGATION AUDIT
=====================================

MANDATORY FIRST STEP

Create FULL navigation inventory table.

---

## REQUIRED TABLE

| Feature/Page | Exists in Web | Exists in Android | Correct Placement | Duplicate? | Redundant? | Mobile Appropriate? | Action Required |

---

## MANDATORY FOR ALL FEATURES

* Home
* Feed
* My Feed
* AllPosts
* ForYou
* Compare
* Saved Searches
* Wishlist
* Notifications
* Cart
* Rewards
* Profile
* SaleDone
* SaleUndone
* Complaints
* Feedback
* Plans
* Centre Plans
* Search
* Categories
* Subcategories
* My Home
* Settings
* Localization
* Authentication
* Recently Viewed

NO IMPLEMENTATION BEFORE AUDIT.

======================================================================
SECTION 2 — BOTTOM NAVBAR RECONSTRUCTION
========================================

CURRENT ISSUES

* wrong tabs
* missing tabs
* inconsistent structure
* fake parity
* clutter
* non-web aligned routes

---

## REQUIRED BOTTOM NAVBAR

Use ONLY validated web-app aligned primary destinations.

EXPECTED PRIMARY TABS:

* Home
* AllPosts
* ForYou
* Feed
* Rewards
* Profile

(Adjust ONLY if validated from web app.)

---

## REMOVE

* random extra tabs
* duplicate routes
* utility pages
* experimental pages
* Android-only routes

---

## IMPORTANT

Bottom navbar must contain ONLY:
high-frequency primary destinations.

======================================================================
SECTION 3 — BOTTOM NAVBAR TEST CASES
====================================

### TC-BOTTOMNAV-001

EXPECTED:

* Correct tab structure

---

### TC-BOTTOMNAV-002

EXPECTED:

* Active tab highlighted correctly

---

### TC-BOTTOMNAV-003

EXPECTED:

* No duplicate routes

---

### TC-BOTTOMNAV-004

ACTION:
Switch tabs rapidly.

EXPECTED:

* Stable navigation state

---

### TC-BOTTOMNAV-005

EXPECTED:

* Correct lifecycle restoration

---

### TC-BOTTOMNAV-006

EXPECTED:

* No navigation loops

======================================================================
SECTION 4 — TOP NAVBAR RECONSTRUCTION
=====================================

CURRENT ISSUES

* globally reused navbar
* wrong actions
* clutter
* non-contextual UX
* duplicate utilities

---

## REQUIRED TOP NAVBAR SYSTEM

Context-aware navbar architecture.

---

## EXAMPLES

HOME
→ no navbar

ALLPOSTS
→ search + filters only

FEED
→ social/discussion actions

PROFILE
→ minimal profile header

SELL
→ progress header

---

## IMPORTANT

DO NOT:
reuse same navbar globally.

======================================================================
SECTION 5 — TOP NAVBAR TEST CASES
=================================

### TC-TOPNAV-001

EXPECTED:

* Context-aware rendering

---

### TC-TOPNAV-002

EXPECTED:

* Only relevant actions shown

---

### TC-TOPNAV-003

EXPECTED:

* No duplicate utilities

---

### TC-TOPNAV-004

EXPECTED:

* Search/filter functional in AllPosts

---

### TC-TOPNAV-005

EXPECTED:

* Minimal header in Profile

======================================================================
SECTION 6 — HAMBURGER MENU RECONSTRUCTION
=========================================

CURRENT ISSUES

* too lengthy
* cluttered
* duplicate routes
* invented pages
* fake parity
* utility overload
* poor discoverability

---

## CRITICAL RULE

Hamburger menu should contain ONLY:
secondary/less-frequent features.

---

## REMOVE FROM HAMBURGER

If already accessible elsewhere:

* Compare
* Saved Searches
* Wishlist
* Notifications
* Cart
* Profile
* Feed
* AllPosts

---

## IMPORTANT

Do NOT duplicate routes across navigation systems unnecessarily.

======================================================================
SECTION 7 — SMART FEATURE OWNERSHIP ARCHITECTURE
================================================

MANDATORY FEATURE OWNERSHIP

---

## BOTTOM NAVBAR

Primary high-frequency destinations.

---

## TOP NAVBAR

Contextual quick actions only.

---

## ALLPOSTS

* Compare
* Saved searches
* Filters
* Search
* Recently viewed

---

## PROFILE

* account settings
* user actions
* preferences
* support shortcuts

---

## HAMBURGER MENU

Secondary features only.

---

## DO NOT

repeat same features everywhere.

======================================================================
SECTION 8 — REDUNDANCY CLEANUP
==============================

REMOVE ALL:

* duplicate profile routes
* duplicate dashboard routes
* duplicate compare flows
* duplicate notifications
* duplicate cart routes
* random Android-only pages
* invented utilities
* fake placeholder routes

---

## EXAMPLES OF CURRENT FAILURES

* Compare in hamburger + AllPosts
* Wishlist in multiple places
* Notifications duplicated
* Profile duplicated
* My Listings invented
* Orders invented
* Dashboard renamed randomly

---

ALL MUST BE CLEANED.

======================================================================
SECTION 9 — BACK NAVIGATION REBUILD
===================================

CURRENT ISSUES

* incorrect back stack
* navigation loops
* unexpected exits
* poor restoration

---

## REQUIRED

Implement:

* predictable back behavior
* stack-safe navigation
* ecosystem-aware restoration
* proper tab restoration
* modal-safe navigation

---

## IMPORTANT

Back should NEVER:
feel random/confusing.

======================================================================
SECTION 10 — BACK NAVIGATION TEST CASES
=======================================

### TC-BACK-001

ACTION:
Open listing → Back.

EXPECTED:

* Returns to same scroll position

---

### TC-BACK-002

ACTION:
Open filters → Back.

EXPECTED:

* Returns safely

---

### TC-BACK-003

ACTION:
Switch tabs repeatedly.

EXPECTED:

* No stack corruption

---

### TC-BACK-004

ACTION:
Press back from root tab.

EXPECTED:

* Correct app exit behavior

---

### TC-BACK-005

EXPECTED:

* No navigation loops

======================================================================
SECTION 11 — WEB PARITY VALIDATION
==================================

MANDATORY

Capture screenshots and flows for:

* hamburger menu
* top navbar
* bottom navbar
* contextual actions
* navigation hierarchy

---

## VALIDATE

* feature placement
* route ownership
* discoverability
* hierarchy
* interactions
* mobile optimization

---

## DO NOT MARK COMPLETE IF

* duplicate routes remain
* hamburger clutter remains
* fake parity exists
* random Android routes remain
* contextual navbars missing
* navigation loops exist

======================================================================
SECTION 12 — STATE MANAGEMENT REQUIREMENTS
==========================================

CENTRALIZE:

* navigation state
* tab state
* modal state
* ecosystem state
* back-stack state
* auth-aware routing

---

## PREVENT

* stale routes
* duplicate stacks
* navigation corruption
* lifecycle resets
* route mismatch

======================================================================
SECTION 13 — PERFORMANCE & STRESS TESTS
=======================================

### TC-STRESS-001

Rapid tab switching.

EXPECTED:

* Stable rendering

---

### TC-STRESS-002

Repeated hamburger open/close.

EXPECTED:

* Smooth animations

---

### TC-STRESS-003

Long navigation sessions.

EXPECTED:

* Stable back stack

---

### TC-STRESS-004

Background/foreground restoration.

EXPECTED:

* Safe navigation recovery

---

### TC-STRESS-005

Deep navigation stress.

EXPECTED:

* No memory leaks

======================================================================
SECTION 14 — NEGATIVE TEST CASES
================================

### TC-NEGATIVE-001

Compare exists in hamburger and AllPosts.

RESULT:
FAIL

---

### TC-NEGATIVE-002

Wishlist duplicated.

RESULT:
FAIL

---

### TC-NEGATIVE-003

Global navbar reused everywhere.

RESULT:
FAIL

---

### TC-NEGATIVE-004

Hamburger menu extremely lengthy.

RESULT:
FAIL

---

### TC-NEGATIVE-005

Random Android-only pages exist.

RESULT:
FAIL

---

### TC-NEGATIVE-006

Back navigation unpredictable.

RESULT:
FAIL

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK COMPLETE IF:

* hamburger clutter remains
* duplicate features remain
* contextual navbars missing
* random routes remain
* fake parity exists
* back navigation broken
* utility duplication exists
* discoverability weak
* mobile UX weak

======================================================================
FINAL PHASE GOAL
================

The navigation architecture must become:

* intuitive
* minimal
* premium
* scalable
* mobile-native
* semantically correct
* web-aligned
* discoverable
* uncluttered
* production-grade

with:

* zero duplicate routes
* zero hamburger clutter
* zero fake parity
* zero random Android pages
* zero navigation confusion
* zero back-stack corruption
* zero utility duplication

The final result should feel like:
a world-class premium mobile navigation ecosystem,
NOT a cluttered web-to-mobile conversion with random duplicated routes.

# PHASE 18 — COMPLETE TEST CASE SUITE

# NAVIGATION + HAMBURGER MENU + TOP NAVBAR + BOTTOM NAVBAR + REDUNDANCY CLEANUP + GLOBAL UX ARCHITECTURE

======================================================================
SECTION 1 — NAVIGATION INVENTORY VALIDATION
===========================================

### TC-NAVINV-001 — Web vs Android Route Inventory

ACTION:
Compare all Android routes/pages with web app.

EXPECTED:

* Every Android route mapped to real web feature
* No invented Android-only routes

---

### TC-NAVINV-002 — Duplicate Route Detection

EXPECTED:

* No duplicated routes across:

  * hamburger
  * bottom navbar
  * profile quick actions
  * top navbar

---

### TC-NAVINV-003 — Feature Ownership Validation

EXPECTED:
Each feature exists in correct location only.

Examples:

* Compare → AllPosts only
* Wishlist → single ownership
* Cart → single ownership
* Notifications → single ownership

---

### TC-NAVINV-004 — Redundant Page Detection

EXPECTED:

* No fake utility pages
* No random dashboard clones
* No placeholder pages

======================================================================
SECTION 2 — BOTTOM NAVBAR TEST CASES
====================================

### TC-BOTTOMNAV-001 — Tab Rendering Validation

EXPECTED:

* Only approved tabs visible:

  * Home
  * AllPosts
  * ForYou
  * Feed
  * Rewards
  * Profile

---

### TC-BOTTOMNAV-002 — Tab Order Validation

EXPECTED:

* Correct web-aligned order

---

### TC-BOTTOMNAV-003 — Active State Validation

ACTION:
Switch tabs.

EXPECTED:

* Active tab highlighted correctly

---

### TC-BOTTOMNAV-004 — Navigation Stability

ACTION:
Rapid tab switching.

EXPECTED:

* No crashes
* No blank states
* No stack corruption

---

### TC-BOTTOMNAV-005 — State Preservation

ACTION:
Switch tabs repeatedly.

EXPECTED:

* Scroll positions preserved
* State retained safely

---

### TC-BOTTOMNAV-006 — Lifecycle Restoration

ACTION:
Background app → reopen.

EXPECTED:

* Correct tab restored

---

### TC-BOTTOMNAV-007 — Duplicate Tab Validation

EXPECTED:

* No duplicate features/routes

---

### TC-BOTTOMNAV-008 — Performance Validation

EXPECTED:

* Smooth animations
* No lag

---

### TC-BOTTOMNAV-009 — Responsive Layout

EXPECTED:

* Proper spacing
* No overflow/clipping

---

### TC-BOTTOMNAV-010 — Ecosystem Awareness

EXPECTED:

* Bottom nav respects ecosystem state

======================================================================
SECTION 3 — TOP NAVBAR TEST CASES
=================================

### TC-TOPNAV-001 — Context-Aware Rendering

EXPECTED:

* Different navbar per page context

---

### TC-TOPNAV-002 — Home Navbar Validation

EXPECTED:

* Home has no unnecessary navbar clutter

---

### TC-TOPNAV-003 — AllPosts Navbar Validation

EXPECTED:

* Search visible
* Filter button visible
* Filter functional

---

### TC-TOPNAV-004 — Feed Navbar Validation

EXPECTED:

* Social/discussion actions only

---

### TC-TOPNAV-005 — Profile Navbar Validation

EXPECTED:

* Minimal clean header

---

### TC-TOPNAV-006 — Duplicate Utility Validation

EXPECTED:

* No duplicated actions

---

### TC-TOPNAV-007 — Search Functionality

ACTION:
Use search.

EXPECTED:

* Correct search results

---

### TC-TOPNAV-008 — Filter Functionality

ACTION:
Tap filter beside search.

EXPECTED:

* Filter modal opens correctly

---

### TC-TOPNAV-009 — Responsive Layout

EXPECTED:

* No clipping
* Proper spacing

---

### TC-TOPNAV-010 — Scroll Behavior Validation

EXPECTED:

* Smooth sticky/collapse behavior

======================================================================
SECTION 4 — HAMBURGER MENU TEST CASES
=====================================

### TC-HMENU-001 — Menu Rendering

EXPECTED:

* Menu opens smoothly

---

### TC-HMENU-002 — Approved Feature Validation

EXPECTED:

* Only validated secondary features exist

---

### TC-HMENU-003 — Duplicate Route Validation

EXPECTED:

* No duplicate:

  * Compare
  * Wishlist
  * Notifications
  * Cart
  * Profile
  * Feed
  * AllPosts

---

### TC-HMENU-004 — Route Functionality

ACTION:
Open every menu item.

EXPECTED:

* Correct navigation
* No blank pages

---

### TC-HMENU-005 — Web Parity Validation

COMPARE:
Web menu vs Android menu.

EXPECTED:

* Same hierarchy
* Same semantics

---

### TC-HMENU-006 — Grouping Validation

EXPECTED:

* Proper feature grouping
* No clutter

---

### TC-HMENU-007 — Scroll Performance

EXPECTED:

* Smooth scrolling
* No lag

---

### TC-HMENU-008 — Responsive Layout

EXPECTED:

* Proper mobile spacing

---

### TC-HMENU-009 — Animation Validation

EXPECTED:

* Smooth open/close animation

---

### TC-HMENU-010 — Empty/Dead Route Validation

EXPECTED:

* No dead routes
* No placeholder pages

======================================================================
SECTION 5 — REDUNDANCY CLEANUP TEST CASES
=========================================

### TC-REDUNDANCY-001

EXPECTED:

* Compare only exists in AllPosts flow

---

### TC-REDUNDANCY-002

EXPECTED:

* Saved searches not duplicated

---

### TC-REDUNDANCY-003

EXPECTED:

* Wishlist not duplicated

---

### TC-REDUNDANCY-004

EXPECTED:

* Notifications not duplicated

---

### TC-REDUNDANCY-005

EXPECTED:

* Cart not duplicated

---

### TC-REDUNDANCY-006

EXPECTED:

* Profile not duplicated

---

### TC-REDUNDANCY-007

EXPECTED:

* No fake Android dashboard pages

---

### TC-REDUNDANCY-008

EXPECTED:

* No invented Orders/My Listings pages unless validated in web app

======================================================================
SECTION 6 — BACK NAVIGATION TEST CASES
======================================

### TC-BACK-001 — Listing Back Navigation

ACTION:
Open listing → Back.

EXPECTED:

* Previous scroll position restored

---

### TC-BACK-002 — Filter Modal Back Navigation

ACTION:
Open filters → Back.

EXPECTED:

* Modal closes safely

---

### TC-BACK-003 — Deep Navigation Restoration

ACTION:
Navigate deep → Back repeatedly.

EXPECTED:

* Correct stack restoration

---

### TC-BACK-004 — Root Exit Validation

ACTION:
Back from root page.

EXPECTED:

* Proper app exit behavior

---

### TC-BACK-005 — Tab Navigation Restoration

ACTION:
Switch tabs → Back.

EXPECTED:

* Correct navigation behavior

---

### TC-BACK-006 — No Navigation Loops

EXPECTED:

* No repeated page loops

---

### TC-BACK-007 — Lifecycle Restoration

ACTION:
Background app → reopen.

EXPECTED:

* Navigation stack restored safely

======================================================================
SECTION 7 — CONTEXTUAL FEATURE OWNERSHIP TEST CASES
===================================================

### TC-FEATUREOWN-001

EXPECTED:

* Compare belongs to AllPosts only

---

### TC-FEATUREOWN-002

EXPECTED:

* Filters belong to AllPosts context only

---

### TC-FEATUREOWN-003

EXPECTED:

* Profile actions belong to Profile context

---

### TC-FEATUREOWN-004

EXPECTED:

* Support utilities grouped correctly

---

### TC-FEATUREOWN-005

EXPECTED:

* High-frequency actions prioritized properly

======================================================================
SECTION 8 — WEB PARITY VALIDATION
=================================

### TC-WEBPARITY-001

COMPARE:
Bottom navbar web vs Android.

EXPECTED:

* Same feature hierarchy

---

### TC-WEBPARITY-002

COMPARE:
Hamburger menu web vs Android.

EXPECTED:

* Same route grouping

---

### TC-WEBPARITY-003

COMPARE:
Top navbar contexts.

EXPECTED:

* Same contextual behavior

---

### TC-WEBPARITY-004

COMPARE:
Feature ownership architecture.

EXPECTED:

* Same placement semantics

---

### TC-WEBPARITY-005

COMPARE:
Back navigation flows.

EXPECTED:

* Same UX behavior

======================================================================
SECTION 9 — PERFORMANCE & STRESS TESTS
======================================

### TC-STRESS-001

Rapid tab switching stress.

EXPECTED:

* Stable rendering

---

### TC-STRESS-002

Repeated hamburger open/close.

EXPECTED:

* No lag

---

### TC-STRESS-003

Long-session navigation stress.

EXPECTED:

* Stable memory usage

---

### TC-STRESS-004

Deep stack stress testing.

EXPECTED:

* No navigation corruption

---

### TC-STRESS-005

Background/foreground stress.

EXPECTED:

* Correct navigation restoration

---

### TC-STRESS-006

Low-end device testing.

EXPECTED:

* Smooth UX

======================================================================
SECTION 10 — NEGATIVE TEST CASES
================================

### TC-NEGATIVE-001

Compare exists in hamburger and AllPosts.

RESULT:
FAIL

---

### TC-NEGATIVE-002

Wishlist duplicated across routes.

RESULT:
FAIL

---

### TC-NEGATIVE-003

Same navbar reused globally.

RESULT:
FAIL

---

### TC-NEGATIVE-004

Hamburger menu extremely lengthy.

RESULT:
FAIL

---

### TC-NEGATIVE-005

Random Android-only pages exist.

RESULT:
FAIL

---

### TC-NEGATIVE-006

Back navigation unpredictable.

RESULT:
FAIL

---

### TC-NEGATIVE-007

Dead routes exist.

RESULT:
FAIL

---

### TC-NEGATIVE-008

Navigation loops occur.

RESULT:
FAIL

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK COMPLETE IF:

* hamburger clutter remains
* duplicate routes remain
* feature ownership incorrect
* contextual navbars missing
* fake parity exists
* random Android routes remain
* dead routes exist
* navigation loops occur
* back-stack restoration broken
* mobile UX weak

======================================================================
FINAL PHASE GOAL
================

The navigation ecosystem must become:

* minimal
* premium
* intuitive
* discoverable
* scalable
* web-aligned
* mobile-native
* context-aware
* uncluttered
* production-grade

with:

* zero duplicate routes
* zero fake parity
* zero hamburger clutter
* zero dead pages
* zero navigation confusion
* zero stack corruption
* zero inconsistent routing

The final result should feel like:
a world-class premium mobile navigation architecture,
NOT a cluttered route-heavy Android conversion with duplicated utilities and broken UX.
# PHASE 19 — ALLPOSTS, CATEGORY ECOSYSTEM, SUBCATEGORY ARCHITECTURE, FILTERS, SEARCH & COMPARE FLOW RECONSTRUCTION

# COMPLETE MARKETPLACE BROWSING EXPERIENCE REBUILD

======================================================================
PHASE OBJECTIVE
===============

Rebuild the ENTIRE marketplace browsing ecosystem of the Android app using the web app as the ONLY source of truth.

This phase focuses on:

* AllPosts reconstruction
* Category ecosystem architecture
* Subcategory system
* Filters
* Sticky filters
* Quick filters
* Search
* Compare
* Saved searches
* Recently viewed
* Listing card redesign
* Marketplace browsing UX
* Mobile-first browsing architecture
* Ecosystem isolation
* Listing interactions

Goal:
Transform AllPosts into a premium, scalable, immersive marketplace browsing experience with FULL web parity and correct business semantics.

======================================================================
CRITICAL ROOT FAILURE IDENTIFIED
================================

Current Android AllPosts implementation is fundamentally incorrect.

Major failures:

* categories incorrectly shown
* subcategories missing
* compare wrongly implemented
* filters broken
* search/filter button not working
* category ecosystem logic broken
* fake browsing flows
* weak listing cards
* poor marketplace UX
* web parity missing
* incorrect hierarchy
* ecosystem separation broken

---

## BIGGEST FAILURE

The Android app currently mixes ecosystems incorrectly.

Example:

User enters:
Fashion ecosystem

BUT Android still behaves like:
global mixed marketplace.

THIS IS WRONG.

======================================================================
MANDATORY BUSINESS LOGIC
========================

The app is NOT:
one merged marketplace.

It is:
multiple ecosystem-driven platforms.

---

## CORRECT FLOW

Launch App
→ Home
→ Select Ecosystem
Example:

* Fashion
* Electronics
* Agriculture
* Vehicles

→ THEN user enters THAT ecosystem only.

---

## IMPORTANT

Inside Fashion ecosystem:

* only fashion categories
* only fashion subcategories
* only fashion filters
* only fashion listings
* only fashion compare flows

NOT:
electronics/agriculture mixing.

---

To switch ecosystems:
User must return to Home.

THIS IS A CORE PRODUCT RULE.

======================================================================
SECTION 1 — CATEGORY ECOSYSTEM REBUILD
======================================

CURRENT ISSUES

* global categories mixed
* ecosystem isolation broken
* wrong category bars
* fake hierarchy
* web parity missing

---

## REQUIRED ARCHITECTURE

HOME PAGE
→ ecosystem selector

AFTER ecosystem entry:
AllPosts becomes:
ecosystem-specific marketplace.

---

## EXAMPLE

FASHION ECOSYSTEM

Top:
Fashion subcategories only.

Examples:

* Men
* Women
* Kids
* Footwear
* Accessories

---

ELECTRONICS ECOSYSTEM

Top:
Electronics subcategories only.

Examples:

* Mobiles
* Laptops
* Audio
* Cameras

---

## MANDATORY

NO cross-ecosystem contamination.

======================================================================
SECTION 2 — SUBCATEGORY ARCHITECTURE REBUILD
============================================

CURRENT FAILURE

Android currently shows:
categories instead of subcategories.

THIS IS WRONG.

---

## CORRECT BEHAVIOR

Home:
select ecosystem

AllPosts:
show subcategories within selected ecosystem.

---

## IMPLEMENT

* horizontal subcategory chips
* sticky behavior
* active highlighting
* smooth scrolling
* responsive wrapping
* premium chip design

---

## IMPORTANT

Subcategories must dynamically change based on ecosystem.

======================================================================
SECTION 3 — SEARCH & FILTER REBUILD
===================================

CURRENT ISSUES

* search/filter button not working
* filters weak
* fake filtering
* web parity missing

---

## REQUIRED

Implement FULL marketplace filtering system.

---

## FILTER TYPES

* category
* subcategory
* location
* price
* condition
* popularity
* recency
* seller type
* rating
* availability

---

## REQUIRED UX

* sticky filters
* instant updates
* filter pills
* filter reset
* applied filter indicators
* mobile optimized modal
* animated transitions

---

## IMPORTANT

Filters must be:
ecosystem-aware.

======================================================================
SECTION 4 — SEARCH REBUILD
==========================

IMPLEMENT

* real-time search
* debounced search
* suggestions
* recent searches
* trending searches
* search history
* ecosystem-specific search

---

## IMPORTANT

Fashion search:
must NOT return electronics results.

======================================================================
SECTION 5 — COMPARE FLOW REBUILD
================================

CURRENT FAILURE

Compare incorrectly exists as:
isolated page/menu-focused feature.

THIS IS WRONG.

---

## CORRECT BEHAVIOR

Compare is:
integrated browsing functionality.

---

## IMPLEMENT

* multi-select compare
* sticky compare tray
* compare button on cards
* side-by-side comparison
* compare limits
* remove comparison
* compare state persistence

---

## IMPORTANT

Compare belongs INSIDE:
AllPosts ecosystem only.

NOT hamburger menu.

======================================================================
SECTION 6 — SAVED SEARCHES & RECENTLY VIEWED
============================================

CURRENT ISSUES

* duplicated routes
* poor discoverability
* wrong placement

---

## IMPLEMENT

Saved searches:
inside AllPosts/search flow.

Recently viewed:
inside marketplace browsing experience.

---

## DO NOT

create standalone clutter-heavy routes unnecessarily.

======================================================================
SECTION 7 — LISTING CARD REBUILD
================================

CURRENT ISSUES

* weak cards
* inconsistent design
* poor visual hierarchy
* web parity missing

---

## REQUIRED

AllPosts card design should match:
Feed card visual quality/language.

BUT:
maintain marketplace semantics.

---

## IMPLEMENT

* premium cards
* image-first layout
* clean typography
* seller indicators
* price prominence
* location badges
* save actions
* compare actions
* responsive spacing
* smooth animations

---

## IMPORTANT

Card click:
must open detailed listing page.

======================================================================
SECTION 8 — LISTING DETAIL FLOW
===============================

IMPLEMENT

* immersive gallery
* seller details
* specifications
* compare actions
* related listings
* recently viewed update
* sticky CTA
* premium mobile layout

---

## IMPORTANT

Preserve:
correct back-stack restoration.

======================================================================
SECTION 9 — QUICK FILTERS & STICKY FILTERS
==========================================

IMPLEMENT

* sticky top filter row
* quick chips
* smart recommendations
* dynamic sorting
* scroll-aware visibility

---

## EXAMPLES

Fashion:

* Trending
* New Arrivals
* Budget Picks
* Premium
* Branded

---

## IMPORTANT

Quick filters must be:
ecosystem-aware.

======================================================================
SECTION 10 — EMPTY STATES & ERROR STATES
========================================

IMPLEMENT

* no-results state
* network failure state
* retry state
* loading skeletons
* empty compare state
* empty saved search state

---

## IMPORTANT

All states must feel:
premium and intentional.

======================================================================
SECTION 11 — PERFORMANCE OPTIMIZATION
=====================================

MANDATORY

Implement:

* lazy loading
* pagination
* image optimization
* cache strategy
* scroll optimization
* shimmer loading
* request deduplication

---

## TARGET

Smooth marketplace browsing on low-end Android devices.

======================================================================
SECTION 12 — WEB PARITY VALIDATION
==================================

MANDATORY

Capture screenshots for:

* AllPosts
* filters
* compare
* search
* listing cards
* subcategories
* listing details

---

## COMPARE

Web vs Android:

* hierarchy
* interactions
* semantics
* browsing flows
* ecosystem isolation
* compare logic

---

## DO NOT MARK COMPLETE IF

* categories shown instead of subcategories
* ecosystems mixed
* compare isolated in hamburger
* filter button broken
* fake parity exists
* search broken
* listing cards weak
* ecosystem contamination exists

======================================================================
SECTION 13 — ARCHITECTURE REQUIREMENTS
======================================

MANDATORY

Centralize:

* ecosystem state
* filter state
* search state
* compare state
* recently viewed state
* saved searches state

---

## PREVENT

* stale filters
* wrong search results
* ecosystem contamination
* duplicate compare states
* cache corruption

======================================================================
SECTION 14 — STRESS TEST REQUIREMENTS
=====================================

Test:

* rapid filtering
* rapid searching
* compare stress
* pagination stress
* deep scroll stress
* lifecycle restoration
* low network conditions
* background restoration

---

## EXPECTED

Stable browsing experience.

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK COMPLETE IF:

* categories displayed instead of subcategories
* ecosystems mixed
* compare isolated wrongly
* filters broken
* search/filter button broken
* listing cards weak
* fake parity exists
* ecosystem switching broken
* saved searches duplicated
* recently viewed duplicated
* sticky filters missing

======================================================================
FINAL PHASE GOAL
================

The marketplace browsing ecosystem must become:

* immersive
* ecosystem-aware
* scalable
* visually premium
* mobile-native
* semantically correct
* web-aligned
* high performance
* intuitive
* production-grade

with:

* zero fake parity
* zero ecosystem contamination
* zero broken filters
* zero weak listing cards
* zero wrong category hierarchy
* zero isolated compare flows
* zero broken search flows

The final result should feel like:
a world-class premium mobile marketplace browsing ecosystem,
NOT a generic mixed-category listing app with broken navigation and fake filtering.
# PHASE 20 — AUTHENTICATION, GUEST ACCESS, SESSION MANAGEMENT & ACCOUNT FLOW RECONSTRUCTION

# COMPLETE SECURITY + SESSION + AUTH-AWARE NAVIGATION + WEB PARITY FOUNDATION

======================================================================
PHASE OBJECTIVE
===============

Rebuild the entire authentication and session system of the Android app to achieve:

* strict web-app parity
* stable login/logout lifecycle
* secure token handling
* consistent guest behavior
* navigation safety under auth changes
* zero session-related crashes
* zero stale user states

This is a FOUNDATION PHASE for ALL other modules:
Rewards, Profile, My Home, Orders-like flows, Wishlist, Cart, Notifications, etc.

If auth is wrong → everything else will break.

======================================================================
CRITICAL ROOT FAILURE IDENTIFIED
================================

Current Android app likely suffers from:

* inconsistent login state handling
* partial guest access confusion
* broken session persistence
* stale cached user data after logout/login
* reward/profile failing due to auth mismatch
* API unauthorized loops
* random redirects
* lifecycle state corruption after auth changes
* multi-screen auth desync

---

## BIGGEST ISSUE

Auth state is NOT the single source of truth.

Different screens behave differently depending on:

* cached state
* local UI state
* API state
* navigation state

This is invalid architecture.

======================================================================
MANDATORY RULE
==============

AUTH SYSTEM MUST BE:

* SINGLE SOURCE OF TRUTH
* CENTRALIZED
* CONSISTENT ACROSS ALL SCREENS
* SYNCHRONIZED WITH API + UI + NAVIGATION

======================================================================
SECTION 1 — AUTH ARCHITECTURE REBUILD
=====================================

IMPLEMENT CENTRAL AUTH SYSTEM

Must include:

* AuthStateManager (global)
* TokenManager
* SessionManager
* UserProfileManager

---

## AUTH STATE MODEL

States:

* UNAUTHENTICATED
* GUEST
* AUTHENTICATED
* TOKEN_EXPIRED
* REFRESHING
* LOGGING_OUT

---

## IMPORTANT RULE

Every screen MUST depend ONLY on AuthStateManager.

NO local auth duplication allowed.

======================================================================
SECTION 2 — LOGIN FLOW REBUILD
==============================

CURRENT ISSUES

* inconsistent login redirects
* stale user data after login
* partial session initialization
* missing profile sync
* reward/profile failures

---

## REQUIRED FLOW

1. User enters credentials
2. API login call
3. Receive:

   * access token
   * refresh token
   * user profile
4. Store securely
5. Initialize global auth state
6. Sync user data across modules
7. Rebuild navigation state
8. Reload dependent screens

---

POST LOGIN MUST TRIGGER:

* profile refresh
* cart refresh
* wishlist refresh
* notifications sync
* rewards refresh
* my home refresh

======================================================================
SECTION 3 — LOGOUT FLOW REBUILD
===============================

CURRENT ISSUES

* stale UI after logout
* cached user data visible
* navigation inconsistency
* partial cleanup

---

## REQUIRED LOGOUT FLOW

1. Clear tokens
2. Clear user cache
3. Reset AuthStateManager
4. Reset navigation stack
5. Clear local storage (secure + cache)
6. Redirect to login/home (web parity rule)
7. Reinitialize guest state

---

## IMPORTANT

NO screen should retain:

* user data
* session state
* cached API responses

after logout.

======================================================================
SECTION 4 — GUEST ACCESS ARCHITECTURE
=====================================

CURRENT ISSUES

* unclear guest behavior
* restricted screens behaving inconsistently
* random login prompts
* broken navigation for guest users

---

## GUEST MODE RULES

Guest users:

* can browse Feed
* can view AllPosts (limited if web allows)
* cannot perform:

  * posting
  * buying actions
  * rewards access
  * profile edits
  * wishlist/cart full actions

---

## IMPORTANT

Guest restrictions MUST match web app EXACTLY.

NO random Android-specific restrictions.

======================================================================
SECTION 5 — TOKEN LIFECYCLE MANAGEMENT
======================================

IMPLEMENT:

* access token storage (secure storage)
* refresh token rotation
* auto-refresh mechanism
* expiry detection interceptor

---

## DIO / NETWORK INTERCEPTOR RULE

ON API CALL:

IF 401 Unauthorized:
→ attempt refresh token
→ retry request once
→ if fail → force logout

---

## IMPORTANT

NO infinite API retry loops.

======================================================================
SECTION 6 — SESSION PERSISTENCE
===============================

REQUIRED:

* app restart session restore
* background/foreground restore
* deep link restore
* crash recovery restore

---

ON APP START:

1. check stored tokens
2. validate token
3. restore user state OR guest state
4. initialize navigation
5. sync user data

---

## IMPORTANT

NO screen should load BEFORE auth state is resolved.

======================================================================
SECTION 7 — AUTH-AWARE NAVIGATION INTEGRATION
=============================================

CURRENT ISSUE

Navigation is not tied to auth state.

---

REQUIRED BEHAVIOR

Navigation must respond to:

* login
* logout
* session expiry
* guest mode activation

---

EXAMPLES

LOGIN:
→ refresh all tabs
→ reload profile
→ reload rewards

LOGOUT:
→ reset stack
→ redirect to guest home/login

SESSION EXPIRE:
→ show session expired modal
→ force refresh login

======================================================================
SECTION 8 — PROFILE PAGE AUTH PARITY
====================================

CURRENT ISSUES

* profile inconsistencies
* incorrect quick actions
* stale data
* mismatch with web

---

REQUIRED

Profile must:

* always reflect AuthStateManager user
* auto-refresh after login/logout
* never show cached stale user data
* hide restricted actions for guest

======================================================================
SECTION 9 — REWARDS PAGE AUTH FIX
=================================

CURRENT ISSUE

Rewards frequently fails due to auth mismatch.

---

REQUIRED

* strict authenticated access
* redirect guest → login prompt
* auto reload after login
* no null session crashes

======================================================================
SECTION 10 — API AUTH CONSISTENCY
=================================

ALL API CALLS MUST USE:

* central token injector
* interceptor validation
* refresh logic

---

NO EXCEPTIONS:

* no direct token usage in UI
* no manual auth handling per screen

======================================================================
SECTION 11 — SECURITY REQUIREMENTS
==================================

IMPLEMENT:

* secure token storage (Encrypted storage)
* no plain token logs
* session timeout protection
* replay protection (if backend supports)
* API throttling safety

======================================================================
SECTION 12 — STATE RESET RULES
==============================

ON AUTH CHANGE:

MUST RESET:

* Feed state
* AllPosts state
* Wishlist state
* Cart state
* Notifications state
* Profile state
* Rewards state
* Navigation stack

======================================================================
SECTION 13 — TEST CASES (AUTH SYSTEM)
=====================================

### TC-AUTH-001 — Login Initialization

EXPECTED:

* user session created correctly
* profile loaded
* tokens stored securely

---

### TC-AUTH-002 — Logout Cleanup

EXPECTED:

* all cached data cleared
* navigation reset
* no user data visible

---

### TC-AUTH-003 — Token Expiry Handling

ACTION:
Force token expiry

EXPECTED:

* refresh token triggered
* retry success OR logout

---

### TC-AUTH-004 — Guest Mode Behavior

EXPECTED:

* restricted actions blocked
* browsing allowed
* correct UI restrictions

---

### TC-AUTH-005 — App Restart Persistence

ACTION:
Restart app

EXPECTED:

* session restored correctly OR guest mode

---

### TC-AUTH-006 — Multi-screen Sync

ACTION:
Login while on different screens

EXPECTED:

* all screens update instantly

---

### TC-AUTH-007 — Logout Mid-Navigation

EXPECTED:

* no crashes
* stack reset properly

---

### TC-AUTH-008 — API Unauthorized Handling

EXPECTED:

* no infinite loops
* proper fallback

---

### TC-AUTH-009 — Profile Sync Validation

EXPECTED:

* correct user info always shown

---

### TC-AUTH-010 — Rewards Access Control

EXPECTED:

* guest blocked
* authenticated allowed

======================================================================
SECTION 14 — PERFORMANCE REQUIREMENTS
=====================================

* auth state updates must be instant (<100ms UI reaction)
* no repeated API calls during refresh
* no duplicate token refresh calls
* minimal re-renders

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK COMPLETE IF:

* session inconsistencies exist
* guest/auth mix occurs
* stale user data visible
* rewards/profile break under auth change
* token refresh fails silently
* navigation not resetting on logout
* API loops occur
* auth state not centralized

======================================================================
FINAL PHASE GOAL
================

The authentication system must become:

* single source of truth
* fully synchronized
* web-parity aligned
* secure
* scalable
* crash-proof
* lifecycle-safe
* production-grade

with:

* zero session bugs
* zero stale state issues
* zero auth mismatch
* zero guest confusion
* zero unauthorized loops

The final result should feel like:
a world-class production authentication backbone powering a premium mobile ecosystem,
NOT a fragmented multi-screen inconsistent login system.
# PHASE 21 — LOCALIZATION, LANGUAGE SWITCHING & GLOBALIZATION RECONSTRUCTION

# DYNAMIC MULTI-LANGUAGE SYSTEM + WEB PARITY + REAL-TIME UI REACTIVITY

======================================================================
PHASE OBJECTIVE
===============

Rebuild the entire localization system of the Android app to ensure:

* perfect parity with web app language behavior
* instant UI language switching
* API + UI + cached data synchronization
* no partial translations
* no mixed-language screens
* full app re-render consistency
* ecosystem-aware translations (AllPosts, Feed, Profile, etc.)

Goal:
Make the app fully production-grade multilingual system with ZERO inconsistencies.

======================================================================
CRITICAL ROOT FAILURE IDENTIFIED
================================

Current Android localization likely suffers from:

* partial translations (some screens updated, others not)
* cached strings not refreshing
* mixed-language UI after navigation
* API content not switching language
* navbar/hamburger not updating dynamically
* filters/categories not translated consistently
* static hardcoded strings in UI
* web vs Android language mismatch
* delayed language refresh (requires restart)

---

## BIGGEST ISSUE

Localization is NOT SYSTEM-WIDE.

It is currently:

* screen-level / UI-level patchwork

Instead of:

* global reactive system

======================================================================
MANDATORY RULE
==============

LOCALIZATION MUST BE:

* GLOBAL SINGLE SOURCE OF TRUTH
* REACTIVE ACROSS ENTIRE APP
* SYNCHRONIZED WITH API + CACHE + UI + NAVIGATION
* WEB PARITY ALIGNED

NO hardcoded strings allowed in UI.

======================================================================
SECTION 1 — GLOBAL LOCALIZATION ARCHITECTURE
============================================

IMPLEMENT CENTRAL SYSTEM:

* LocalizationManager (global)
* LanguageStateController
* TranslationService
* API Language Injector
* Cache Language Resolver

---

LANGUAGE STATE MUST INCLUDE:

* currentLanguage
* supportedLanguages
* fallbackLanguage
* loading state
* sync state

---

## IMPORTANT RULE

Every UI text must come ONLY from LocalizationManager.

NO EXCEPTIONS.

======================================================================
SECTION 2 — LANGUAGE SWITCHING FLOW REBUILD
===========================================

CURRENT ISSUE

Language change is partial and inconsistent.

---

REQUIRED FLOW

1. User selects language
2. Update global LanguageStateController
3. Trigger:

   * UI rebuild
   * API language header update
   * cache invalidation
   * navigation refresh
4. Reload active screens
5. Refresh dependent modules

---

## IMPORTANT

Language switch MUST be:

* instant
* full-app reactive
* no restart required

======================================================================
SECTION 3 — UI REACTIVITY REQUIREMENTS
======================================

ON LANGUAGE CHANGE:

MUST UPDATE:

* Bottom Navbar labels
* Top Navbar labels
* Hamburger menu labels
* AllPosts UI
* Feed UI
* Profile UI
* Rewards UI
* Plans UI
* All category labels
* Filters & chips
* Buttons
* Error messages
* Empty states

---

## IMPORTANT

NO screen should retain old language strings.

======================================================================
SECTION 4 — API LANGUAGE INTEGRATION
====================================

ALL API CALLS MUST INCLUDE:

* language header OR query param

Example:

* Accept-Language: en / hi / te etc.

---

REQUIRED BEHAVIOR

* API returns localized content
* listings, feed, categories adapt to language
* server-driven content respects language

---

## IMPORTANT

If API does not support language:
→ fallback safely
→ never break UI

======================================================================
SECTION 5 — CACHE LANGUAGE INVALIDATION
=======================================

CURRENT ISSUE

Cached data remains in old language.

---

REQUIRED

On language switch:

* invalidate cached UI data
* refresh API cache layer
* clear localized stored strings
* reload ecosystem data

---

IMPORTANT

Cache must be language-aware:

cacheKey = feature + language

======================================================================
SECTION 6 — NAVIGATION LANGUAGE CONSISTENCY
===========================================

MUST UPDATE:

* Bottom navbar labels
* Hamburger menu items
* Top navbar actions
* Page titles

---

IMPORTANT

Navigation is part of UI → must be fully localized.

======================================================================
SECTION 7 — ECOSYSTEM-AWARE LOCALIZATION
========================================

CRITICAL RULE

Localization must respect:

* ecosystems (Fashion, Electronics, etc.)
* subcategories
* filters
* compare labels

---

EXAMPLE

Fashion ecosystem:

* “Men”
* “Women”

Electronics:

* “Mobiles”
* “Laptops”

ALL must translate correctly per language.

======================================================================
SECTION 8 — HARD-CODED STRING ELIMINATION
=========================================

MANDATORY TASK

Scan entire Android app and REMOVE:

* hardcoded labels
* inline strings
* UI constants not using localization keys

---

REPLACE WITH:

Localization keys only:

* t("home.title")
* t("allposts.filters")
* etc.

======================================================================
SECTION 9 — ERROR / EMPTY / SYSTEM TEXT LOCALIZATION
====================================================

MUST LOCALIZE:

* error messages
* API failures
* network errors
* empty states
* loading texts
* permission messages

======================================================================
SECTION 10 — PROFILE + REWARDS LOCALIZATION SYNC
================================================

CURRENT ISSUE

Profile and Rewards often break language sync.

---

REQUIRED

* instant language refresh
* no stale labels
* full re-render on language switch
* consistent API + UI match

======================================================================
SECTION 11 — PERFORMANCE REQUIREMENTS
=====================================

* language switch < 200ms UI reaction
* no full app restart required
* minimal re-render (only affected components)
* no duplicate API calls

======================================================================
SECTION 12 — TEST CASES (LOCALIZATION SYSTEM)
=============================================

### TC-LANG-001 — Global Language Switch

ACTION:
Change language in settings

EXPECTED:

* entire app updates instantly

---

### TC-LANG-002 — Navigation Localization

EXPECTED:

* bottom + top + hamburger update correctly

---

### TC-LANG-003 — API Language Sync

EXPECTED:

* API responses match selected language

---

### TC-LANG-004 — Cached Data Refresh

EXPECTED:

* no old language data visible

---

### TC-LANG-005 — Ecosystem Translation

ACTION:
Switch language in Fashion ecosystem

EXPECTED:

* all labels updated correctly

---

### TC-LANG-006 — Deep Navigation Language Consistency

EXPECTED:

* no mixed-language screens

---

### TC-LANG-007 — Restart App Persistence

EXPECTED:

* selected language restored correctly

---

### TC-LANG-008 — Partial Screen Failure Test

EXPECTED:

* NO screen remains untranslated

---

### TC-LANG-009 — Error Message Localization

EXPECTED:

* errors shown in selected language

---

### TC-LANG-010 — Performance Validation

EXPECTED:

* no lag during language switch

======================================================================
SECTION 13 — NEGATIVE TEST CASES
================================

### FAIL IF:

* any screen remains in old language
* navbar partially updates
* API language mismatch occurs
* cached data shows old language
* restart required to apply language
* mixed-language UI appears

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK COMPLETE IF:

* localization is partial
* hardcoded strings exist
* API not language-aware
* cache not invalidated
* navigation not updated
* mixed-language screens exist
* language switch requires restart
* ecosystem labels not translated

======================================================================
FINAL PHASE GOAL
================

The localization system must become:

* fully reactive
* globally consistent
* web-parity aligned
* ecosystem-aware
* API-synchronized
* cache-safe
* production-grade

with:

* zero mixed-language UI
* zero stale translations
* zero hardcoded strings
* zero restart dependency
* zero navigation mismatch

The final result should feel like:
a world-class multilingual mobile platform with seamless global localization,
NOT a partially translated app with inconsistent UI and broken language sync.
# PHASE 22 — WISHLIST, NOTIFICATIONS, CART, RECENTLY VIEWED & USER ENGAGEMENT SYSTEM RECONSTRUCTION

# COMPLETE PERSONALIZATION + ENGAGEMENT + STATE SYNC + WEB PARITY MODULE

======================================================================
PHASE OBJECTIVE
===============

Rebuild all user engagement and personalization systems to ensure:

* perfect web-app parity
* single source of truth across all engagement features
* no duplicate routes or scattered implementations
* real-time sync across screens
* correct placement (NO hamburger duplication clutter)
* stable state management
* ecosystem-aware behavior (AllPosts / Feed / All ecosystems)

This phase covers:

* Wishlist
* Notifications
* Cart
* Recently Viewed
* Saved Searches (final alignment check)
* Engagement counters & badges
* Cross-screen sync behavior

Goal:
Create a unified, premium engagement system that feels seamless, real-time, and production-grade.

======================================================================
CRITICAL ROOT FAILURE IDENTIFIED
================================

Current Android app likely has:

* wishlist in multiple locations (hamburger + profile + AllPosts)
* notifications duplicated or stale
* cart not syncing correctly across screens
* recently viewed inconsistent or missing
* saved searches scattered
* engagement data not centralized
* UI state != API state mismatch
* missing real-time updates
* stale badge counts
* inconsistent cache updates

---

## BIGGEST ISSUE

Engagement systems are NOT centralized.

They are:

* UI-driven per screen
  instead of
* backend + global state driven system

======================================================================
MANDATORY RULE
==============

ALL engagement features MUST:

* use SINGLE GLOBAL STATE STORE
* sync with backend APIs
* NOT be duplicated in multiple navigation layers
* follow web-app semantics exactly
* update in real-time across all screens

======================================================================
SECTION 1 — GLOBAL ENGAGEMENT ARCHITECTURE
==========================================

IMPLEMENT CENTRAL SYSTEM:

* EngagementStateManager
* WishlistController
* NotificationController
* CartController
* RecentlyViewedController

---

GLOBAL STATE MUST INCLUDE:

* wishlistItems
* cartItems
* notifications
* unreadCount
* recentlyViewedItems
* savedSearches

---

IMPORTANT RULE

NO screen should maintain local copies of these states.

======================================================================
SECTION 2 — WISHLIST SYSTEM REBUILD
===================================

CURRENT ISSUES:

* duplicate wishlist entry points
* inconsistent updates
* not synced with AllPosts
* stale UI state
* missing backend sync

---

REQUIRED BEHAVIOR:

* add/remove wishlist item from ANY screen updates globally
* wishlist icon updates instantly everywhere
* AllPosts, Feed, Product details all sync
* no duplicate wishlist pages

---

UI RULE:

Wishlist should NOT exist in:

* hamburger menu (unless web explicitly has it)
* multiple redundant navigation entries

======================================================================
SECTION 3 — NOTIFICATIONS SYSTEM REBUILD
========================================

CURRENT ISSUES:

* stale notifications
* unread count mismatch
* partial refresh
* duplication across UI

---

REQUIRED:

* real-time notification sync (polling or websocket if available)
* unread badge consistency
* global notification center
* correct grouping (orders, system, engagement)

---

IMPORTANT:

Notifications MUST update across:

* bottom navbar badge
* profile badge
* notification center

======================================================================
SECTION 4 — CART SYSTEM REBUILD
===============================

CURRENT ISSUES:

* cart not synced across screens
* inconsistent item state
* missing updates after login/logout
* duplication of cart entry points

---

REQUIRED BEHAVIOR:

* cart is globally synced
* add/remove updates instantly everywhere
* cart persists across sessions
* cart clears on logout properly

---

IMPORTANT:

Cart must behave as SINGLE SOURCE OF TRUTH.

======================================================================
SECTION 5 — RECENTLY VIEWED REBUILD
===================================

CURRENT ISSUES:

* missing or partial implementation
* not ecosystem-aware
* not synced across screens
* weak persistence

---

REQUIRED:

* track every listing view
* ecosystem-specific history
* persistent storage
* synced across sessions

---

IMPORTANT:

Recently viewed MUST NOT appear in multiple scattered places.

======================================================================
SECTION 6 — SAVED SEARCHES FINAL ALIGNMENT
==========================================

CURRENT ISSUES:

* duplicated routes
* wrong placement in hamburger
* weak integration with AllPosts

---

REQUIRED:

* must belong ONLY to AllPosts/search flow
* no standalone clutter page unless web explicitly requires it
* synced with backend
* ecosystem-aware saved filters

======================================================================
SECTION 7 — BADGE & COUNT SYNC SYSTEM
=====================================

IMPLEMENT:

* wishlist count badge
* cart count badge
* notification unread badge

---

IMPORTANT:

Badges must update:

* instantly
* globally
* across all screens
* without refresh

======================================================================
SECTION 8 — CROSS-SCREEN STATE SYNC
===================================

WHEN USER ACTIONS OCCUR:

Example:
Add to wishlist in AllPosts

MUST UPDATE:

* wishlist page
* product card icon
* profile counters
* any badge indicators

---

NO SCREEN SHOULD BE OUT OF SYNC.

======================================================================
SECTION 9 — CACHE & BACKEND SYNC RULES
======================================

* engagement data must be cached safely
* cache must be invalidated on login/logout
* server is source of truth
* local cache is only performance layer

---

IMPORTANT:

NO stale engagement data allowed after:

* logout
* login
* app restart

======================================================================
SECTION 10 — UI/UX REQUIREMENTS
===============================

* smooth animations for wishlist/cart actions
* optimistic updates with rollback on failure
* skeleton loading for engagement screens
* empty states for wishlist/cart
* premium UI consistency

======================================================================
SECTION 11 — TEST CASES (ENGAGEMENT SYSTEM)
===========================================

### TC-ENG-001 — Wishlist Sync

ACTION:
Add item to wishlist in AllPosts

EXPECTED:

* appears instantly everywhere

---

### TC-ENG-002 — Wishlist Removal Sync

EXPECTED:

* removed globally across UI

---

### TC-ENG-003 — Cart Consistency

ACTION:
Add item in product page

EXPECTED:

* cart updates everywhere

---

### TC-ENG-004 — Notification Badge Sync

EXPECTED:

* unread badge updates instantly

---

### TC-ENG-005 — Recently Viewed Tracking

ACTION:
Open multiple listings

EXPECTED:

* correct history saved

---

### TC-ENG-006 — Login Sync

EXPECTED:

* engagement data loads correctly after login

---

### TC-ENG-007 — Logout Cleanup

EXPECTED:

* all engagement data cleared

---

### TC-ENG-008 — Cross-Screen Sync

ACTION:
Update wishlist in Profile

EXPECTED:

* AllPosts reflects change instantly

---

### TC-ENG-009 — Badge Accuracy

EXPECTED:

* counts always match backend

---

### TC-ENG-010 — Offline/Online Sync

EXPECTED:

* correct reconciliation after reconnect

======================================================================
SECTION 12 — NEGATIVE TEST CASES
================================

### FAIL IF:

* wishlist appears in multiple unrelated places
* cart not syncing globally
* notifications stale
* badges incorrect
* recently viewed missing or partial
* saved searches duplicated in hamburger
* engagement state not consistent
* logout leaves stale data

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK COMPLETE IF:

* engagement systems are duplicated
* state is not centralized
* wishlist/cart/notifications not synced globally
* badges inconsistent
* stale UI exists after login/logout
* recently viewed broken or partial
* saved searches mislocated
* duplicate navigation entries exist

======================================================================
FINAL PHASE GOAL
================

The engagement system must become:

* fully centralized
* real-time synchronized
* web-parity aligned
* scalable
* cache-safe
* production-grade
* UX-consistent

with:

* zero duplication
* zero stale state
* zero sync mismatch
* zero badge errors
* zero scattered implementations

The final result should feel like:
a world-class real-time engagement ecosystem inside a premium mobile commerce platform,
NOT a fragmented set of loosely connected UI counters and partially synced screens.
# PHASE 23 — API CONTRACT VALIDATION, BACKEND PARITY & DATA SYNC RECONSTRUCTION

# STRICT WEB-BACKEND ALIGNMENT + ZERO MISMATCH DATA ARCHITECTURE

======================================================================
PHASE OBJECTIVE
===============

Ensure the Android app is **100% aligned with backend + web app API contracts**, so that:

* no feature works on guessed data
* no field mismatch exists
* no partial responses break UI
* no screen renders without valid schema
* all modules (Feed, AllPosts, Profile, Rewards, Cart, Wishlist) are consistent

This phase eliminates:
“it works in UI but breaks in real data” problems.

======================================================================
CRITICAL ROOT FAILURE IDENTIFIED
================================

Current system likely has:

* Android assuming API response structure incorrectly
* Web app and Android using slightly different mappings
* Missing field handling causing UI crashes
* Silent null failures in production screens
* Inconsistent pagination handling
* Different filtering logic between web and Android
* Fake “working UI” with incomplete backend mapping
* Partial API integration (UI-first development)

---

## BIGGEST ISSUE

Android is not strictly contract-driven.

Instead:
UI is built first → API adapted later → mismatch remains.

This is INVALID for production systems.

======================================================================
MANDATORY RULE
==============

ALL DATA FLOW MUST BE:

BACKEND → CONTRACT → MODEL → DOMAIN → UI

NOT:

UI → GUESS → API fit

======================================================================
SECTION 1 — API CONTRACT AUDIT SYSTEM
=====================================

CREATE FULL API INVENTORY:

For every endpoint:

* request schema
* response schema
* pagination rules
* filtering rules
* sorting rules
* auth requirements
* error responses

---

MANDATORY TABLE:

| Endpoint | Web Usage | Android Usage | Schema Match | Missing Fields | Extra Fields | Broken Mapping | Status |

======================================================================
SECTION 2 — STRICT MODEL ENFORCEMENT
====================================

IMPLEMENT:

* strongly typed models (DTOs)
* strict parsing
* null safety enforcement
* default fallback rules only when approved

---

RULE:

NO dynamic JSON usage in UI layer.

EVERY response MUST map to a model.

======================================================================
SECTION 3 — WEB vs ANDROID PARITY CHECK
=======================================

FOR EACH MODULE:

* Feed API parity
* AllPosts API parity
* Profile API parity
* Rewards API parity
* Cart API parity
* Wishlist API parity
* Notifications API parity

---

MANDATORY CHECK:

If web uses field X → Android MUST use same field X

NO exceptions.

======================================================================
SECTION 4 — ERROR HANDLING STANDARDIZATION
==========================================

CURRENT ISSUE:

* silent failures
* UI crashes on null
* inconsistent error messages
* missing fallback screens

---

REQUIRED STANDARD:

ALL APIs must return:

* success state
* error state
* empty state
* loading state handled separately

---

UI MUST SUPPORT:

* network failure
* timeout
* unauthorized
* server error
* empty dataset

======================================================================
SECTION 5 — PAGINATION & FILTER CONSISTENCY
===========================================

CURRENT ISSUE:

* AllPosts pagination mismatch
* Feed pagination inconsistent
* filters behave differently across screens

---

REQUIRED:

* unified pagination model
* consistent page size logic
* same filter parameters as web
* server-driven filtering only

======================================================================
SECTION 6 — DATA SYNC RULES
===========================

ALL DATA MUST FOLLOW:

* server is source of truth
* client is rendering layer only

---

RULES:

* no local computation of business logic
* no UI-side filtering unless explicitly allowed
* no fake derived states

======================================================================
SECTION 7 — REAL-TIME UPDATE ALIGNMENT
======================================

APIs must support:

* wishlist sync
* cart sync
* notifications sync
* profile sync

---

IF REAL-TIME NOT AVAILABLE:

* use polling strategy
* or manual refresh triggers

BUT NEVER SHOW STALE DATA.

======================================================================
SECTION 8 — FIELD MAPPING STANDARDIZATION
=========================================

EXAMPLE ISSUES:

* web uses "post_id", Android uses "id"
* web uses "created_at", Android uses "time"
* web uses "user_profile", Android uses "user"

---

REQUIRED:

* unified mapping layer
* explicit transformation layer only in data layer

NO UI-side mapping.

======================================================================
SECTION 9 — API VERSION CONTROL SAFETY
======================================

IMPLEMENT:

* API version locking
* backward compatibility handling
* graceful fallback for missing fields

---

RULE:

NO silent breakage allowed on API changes.

======================================================================
SECTION 10 — DEBUGGING & OBSERVABILITY
======================================

ADD:

* API logging interceptor (safe, no sensitive data leak)
* request-response tracing
* error categorization
* failure analytics hooks

---

IMPORTANT:

Must help identify:

* web vs android mismatch instantly

======================================================================
SECTION 11 — TEST CASES (API CONTRACT SYSTEM)
=============================================

### TC-API-001 — Schema Match Validation

EXPECTED:
Android model matches web API exactly

---

### TC-API-002 — Missing Field Handling

EXPECTED:
No crash on missing optional fields

---

### TC-API-003 — Pagination Consistency

EXPECTED:
Same results as web app

---

### TC-API-004 — Filter Parity Test

EXPECTED:
Same filtered results as web app

---

### TC-API-005 — Auth Protected API Test

EXPECTED:
Unauthorized handled correctly

---

### TC-API-006 — Cart Sync API Test

EXPECTED:
Same cart data in web + Android

---

### TC-API-007 — Wishlist Sync API Test

EXPECTED:
No mismatch across platforms

---

### TC-API-008 — Notification API Sync

EXPECTED:
Unread counts match web

---

### TC-API-009 — Error Response Handling

EXPECTED:
No crashes on server errors

---

### TC-API-010 — Data Integrity Test

EXPECTED:
No corrupted or partial rendering

======================================================================
SECTION 12 — NEGATIVE TEST CASES
================================

### FAIL IF:

* Android shows data not present in web
* fields mismatch silently
* UI crashes on missing fields
* filters behave differently than web
* pagination differs
* stale cached API data shown
* inconsistent counts (wishlist/cart/notifications)

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK COMPLETE IF:

* API contracts are not fully matched
* models are loosely defined
* UI depends on guessed data
* web and Android results differ
* pagination/filter mismatch exists
* stale or partial data exists
* error handling is inconsistent

======================================================================
FINAL PHASE GOAL
================

The API system must become:

* contract-driven
* fully typed
* web-parity aligned
* strictly validated
* stable under failure
* scalable and maintainable

with:

* zero schema mismatch
* zero silent failures
* zero UI guessing
* zero inconsistent data
* zero backend drift

The final result should feel like:
a production-grade contract-first distributed system where Android is a perfect client of the web backend,
NOT a loosely connected UI consuming inconsistent APIs.
# PHASE 24 — UI/UX DESIGN SYSTEM STANDARDIZATION & VISUAL PARITY RECONSTRUCTION

# PREMIUM MOBILE DESIGN SYSTEM + WEB PARITY + CONSISTENT EXPERIENCE LAYER

======================================================================
PHASE OBJECTIVE
===============

Rebuild the entire Android UI/UX system so that:

* every screen follows a unified design system
* all pages match web app visual hierarchy
* components are reusable and consistent
* spacing, typography, colors, and layouts are standardized
* no “random UI per page” exists anymore
* UX feels premium, modern, and production-grade

Goal:
Transform UI from fragmented screens → ONE cohesive design system.

======================================================================
CRITICAL ROOT FAILURE IDENTIFIED
================================

Current Android UI likely has:

* inconsistent card designs (AllPosts vs Feed mismatch)
* random spacing differences across pages
* multiple button styles
* non-unified typography rules
* inconsistent header behavior
* hamburger/menu UI clutter
* bottom navbar inconsistent styling
* feed/posts visual mismatch
* plans/sell pages not premium-grade
* mixed design language from partial implementations

---

## BIGGEST ISSUE

NO CENTRAL DESIGN SYSTEM EXISTS.

Instead:
Each page is designed independently → causing fragmentation.

======================================================================
MANDATORY RULE
==============

ALL UI MUST FOLLOW:

DESIGN SYSTEM → COMPONENT LIBRARY → PAGE COMPOSITION

NOT:

Page-by-page ad hoc UI

======================================================================
SECTION 1 — DESIGN SYSTEM FOUNDATION
====================================

CREATE CENTRAL DESIGN TOKENS:

* Colors
* Typography
* Spacing scale
* Radius system
* Shadows
* Elevation levels
* Icon sizes
* Animation durations

---

COLOR SYSTEM

* Primary
* Secondary
* Background
* Surface
* Error
* Success
* Warning

---

TYPOGRAPHY SYSTEM

* H1 (titles)
* H2 (sections)
* Body
* Caption
* Button text

---

SPACING SYSTEM

* 4px grid system
* consistent padding rules
* margin hierarchy

======================================================================
SECTION 2 — COMPONENT LIBRARY STANDARDIZATION
=============================================

BUILD REUSABLE COMPONENTS:

* PostCard (Feed + AllPosts unified style base)
* ProductCard (marketplace listings)
* CategoryChip
* FilterChip
* NavbarComponent (top/bottom)
* DrawerMenuComponent (hamburger)
* Button system (primary/secondary/ghost)
* Input fields
* Modal system
* Skeleton loaders

---

IMPORTANT RULE

NO screen should create its own custom UI components.

======================================================================
SECTION 3 — FEED + ALLPOSTS VISUAL UNIFICATION
==============================================

CURRENT ISSUE:

* Feed = text-heavy
* AllPosts = inconsistent card design
* UI mismatch between same content type variations

---

REQUIRED:

* shared base PostCard design system
* Feed uses “content mode”
* AllPosts uses “market mode”
* same visual language, different data layers

---

RULE:

Same card architecture, different render mode ONLY.

======================================================================
SECTION 4 — NAVIGATION UI STANDARDIZATION
=========================================

BOTTOM NAVBAR:

* unified style
* active indicator consistency
* icon + label alignment
* badge support

TOP NAVBAR:

* context-aware only
* no global duplication
* consistent height + spacing

HAMBURGER MENU:

* collapsible sections
* no clutter lists
* grouped logically (web parity only)

======================================================================
SECTION 5 — PAGE STRUCTURE STANDARDIZATION
==========================================

EVERY PAGE MUST FOLLOW:

1. Header
2. Filter/Action area (if applicable)
3. Content area
4. Empty state
5. Loading state
6. Error state

---

NO PAGE CAN SKIP STATES.

======================================================================
SECTION 6 — PREMIUM UX REQUIREMENTS
===================================

IMPLEMENT:

* smooth animations
* micro-interactions
* hover/tap feedback
* skeleton loaders
* shimmer effects
* smooth page transitions

---

IMPORTANT:

UX must feel like a premium marketplace/social app.

======================================================================
SECTION 7 — SELL & PLANS PAGE VISUAL REBUILD
============================================

SELL PAGE:

* step-based flow UI
* visual progress indicator
* image-first UX
* guided posting cards

PLANS PAGE:

* pricing cards system
* comparison table design
* highlight badges
* conversion-focused layout

---

RULE:

These pages MUST feel 10/10 premium SaaS/mobile UX.

======================================================================
SECTION 8 — PROFILE UI STANDARDIZATION
======================================

REQUIRED:

* minimal layout
* clean spacing
* no redundant quick actions
* consistent avatar/header section
* unified settings list style

---

REMOVE:

* cluttered tiles
* duplicate actions
* inconsistent sections

======================================================================
SECTION 9 — EMPTY / ERROR / LOADING STATES
==========================================

STANDARDIZE ALL STATES:

* skeleton loaders (consistent style)
* empty state illustrations
* error UI format
* retry buttons

---

IMPORTANT:

No page should feel “unfinished”.

======================================================================
SECTION 10 — RESPONSIVE MOBILE UX RULES
=======================================

* thumb-friendly spacing
* no cramped layouts
* minimum tap size rules
* avoid dense UI in AllPosts/Feed
* proper scroll behavior
* no overlapping navbar issues

======================================================================
SECTION 11 — THEME & DARK MODE STANDARDIZATION
==============================================

IMPLEMENT:

* full theme support (light/dark)
* consistent color mapping
* no hardcoded colors
* adaptive components

======================================================================
SECTION 12 — TEST CASES (UI/UX SYSTEM)
======================================

### TC-UI-001 — Component Consistency

EXPECTED:
Same component looks identical across all screens

---

### TC-UI-002 — Feed vs AllPosts UI parity

EXPECTED:
Same card system base design

---

### TC-UI-003 — Navigation consistency

EXPECTED:
Bottom/top/hamburger follow same style rules

---

### TC-UI-004 — Loading state consistency

EXPECTED:
All skeletons look uniform

---

### TC-UI-005 — Empty state consistency

EXPECTED:
No missing UI states

---

### TC-UI-006 — Theme switching

EXPECTED:
Full app updates instantly

---

### TC-UI-007 — Sell page UX validation

EXPECTED:
Guided flow works smoothly

---

### TC-UI-008 — Plans page premium check

EXPECTED:
SaaS-grade UI feel

---

### TC-UI-009 — Profile UI cleanup

EXPECTED:
No clutter, clean hierarchy

---

### TC-UI-010 — Cross-screen UI uniformity

EXPECTED:
No page feels visually different system-wise

======================================================================
SECTION 13 — NEGATIVE TEST CASES
================================

### FAIL IF:

* Feed and AllPosts look unrelated
* different button styles exist across screens
* inconsistent spacing between pages
* random UI patterns exist per page
* dark mode breaks layout
* skeleton loaders differ across pages
* hamburger/menu looks inconsistent
* any page looks “un-designed”

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK COMPLETE IF:

* design system is not centralized
* components are duplicated per page
* UI is inconsistent across modules
* Feed vs AllPosts mismatch exists
* navigation UI is fragmented
* any screen lacks loading/empty/error states
* theme is partially applied

======================================================================
FINAL PHASE GOAL
================

The UI system must become:

* fully standardized
* component-driven
* design-token based
* web-parity aligned
* reusable and scalable
* premium-grade

with:

* zero visual inconsistency
* zero ad-hoc UI
* zero fragmented design
* zero missing states
* zero unstructured screens

The final result should feel like:
a world-class design system powering a premium unified mobile ecosystem,
NOT a collection of independently designed screens stitched together.
# PHASE 25 — PERFORMANCE OPTIMIZATION, MEMORY MANAGEMENT & CRASH ELIMINATION

# PRODUCTION HARDENING + SMOOTH UX + ZERO LAG ARCHITECTURE

======================================================================
PHASE OBJECTIVE
===============

Stabilize the Android app for production by ensuring:

* smooth performance across all screens
* zero UI lag in navigation
* optimized API usage
* controlled memory usage
* crash-free experience
* stable scrolling in AllPosts / Feed
* fast app startup
* no jank during state updates

Goal:
Make the app feel **instant, fluid, and production-grade under real-world usage**.

======================================================================
CRITICAL ROOT FAILURE IDENTIFIED
================================

Current Android app likely suffers from:

* heavy UI rebuilds on state change
* unnecessary API re-fetching
* large list rendering issues (Feed / AllPosts)
* memory leaks from navigation stack
* repeated widget rebuilds
* poor image loading optimization
* unoptimized caching strategy
* slow startup due to initialization overload
* lag during auth or language switch
* crash in edge navigation (already reported earlier like For-you crash)

---

## BIGGEST ISSUE

App is FUNCTIONALLY built but NOT PERFORMANCE HARDENED.

======================================================================
MANDATORY RULE
==============

PERFORMANCE MUST BE BUILT INTO ARCHITECTURE, NOT PATCHED LATER.

NO screen-level optimization hacks allowed.

======================================================================
SECTION 1 — APP STARTUP OPTIMIZATION
====================================

CURRENT ISSUE:

* slow initialization
* auth + cache + API loading blocking UI

---

REQUIRED:

* lazy initialization
* parallel boot processes
* deferred non-critical API calls
* splash screen optimization
* minimal blocking operations

---

BOOT FLOW:

1. minimal UI render (splash)
2. auth restore (async)
3. cache restore (async)
4. initial route load
5. background API sync

======================================================================
SECTION 2 — STATE UPDATE OPTIMIZATION
=====================================

CURRENT ISSUE:

* entire screens rebuild unnecessarily
* excessive re-rendering on small changes

---

REQUIRED:

* granular state updates
* selective rebuild strategy
* immutable state handling
* scoped listeners only

---

RULE:

Only affected widgets should rebuild.

NOT full page refresh.

======================================================================
SECTION 3 — LIST PERFORMANCE (CRITICAL)
=======================================

AFFECTED SCREENS:

* AllPosts
* Feed
* Wishlist
* Notifications
* Recently Viewed

---

REQUIRED:

* lazy loading lists
* pagination + infinite scroll
* item recycling
* image caching
* skeleton placeholders

---

RULE:

NO full list reload unless necessary.

======================================================================
SECTION 4 — IMAGE & MEDIA OPTIMIZATION
======================================

CURRENT ISSUE:

* slow image loading
* memory spikes due to large images
* poor caching

---

REQUIRED:

* compressed image loading
* CDN-based optimization (if available)
* cached thumbnails
* progressive loading
* placeholder + shimmer

======================================================================
SECTION 5 — API CALL OPTIMIZATION
=================================

CURRENT ISSUE:

* duplicate API calls
* unnecessary refetch on navigation
* no request deduplication

---

REQUIRED:

* request caching layer
* debounce repeated calls
* shared API results across screens
* background refresh instead of blocking refresh

======================================================================
SECTION 6 — MEMORY MANAGEMENT
=============================

CURRENT ISSUE:

* navigation stack memory leaks
* retained controllers
* unused listeners not disposed
* background state leaks

---

REQUIRED:

* proper dispose lifecycle
* controller cleanup
* event listener cleanup
* screen unmount handling

======================================================================
SECTION 7 — NAVIGATION PERFORMANCE
==================================

CURRENT ISSUE:

* lag when switching tabs
* reloading entire screens unnecessarily

---

REQUIRED:

* persistent tab state
* route caching
* avoid full rebuild on tab switch
* stack reuse strategy

======================================================================
SECTION 8 — SCROLL PERFORMANCE
==============================

AFFECTED:

* Feed
* AllPosts
* Comments
* Notifications

---

REQUIRED:

* smooth 60fps scrolling
* avoid heavy widget trees
* reduce nested rebuilds
* use efficient list rendering

======================================================================
SECTION 9 — BACKGROUND TASK OPTIMIZATION
========================================

CURRENT ISSUE:

* too many synchronous background operations

---

REQUIRED:

* isolate heavy operations
* background sync queue
* scheduled refresh instead of instant reloads

======================================================================
SECTION 10 — CRASH ELIMINATION STRATEGY
=======================================

CURRENT ISSUES:

* For-you page crash (previously reported)
* null state crashes
* API mismatch crashes
* navigation stack crashes

---

REQUIRED:

* global error boundary
* safe navigation guards
* null-safe rendering everywhere
* fallback UI on failure

======================================================================
SECTION 11 — OBSERVABILITY & DEBUGGING
======================================

IMPLEMENT:

* performance logs (frame drops)
* API timing logs
* memory usage tracking
* crash reporting hooks

---

IMPORTANT:

Must identify bottlenecks per screen.

======================================================================
SECTION 12 — TEST CASES (PERFORMANCE SYSTEM)
============================================

### TC-PERF-001 — App Startup Time

EXPECTED:
App loads within acceptable threshold without blocking UI

---

### TC-PERF-002 — Scroll Performance

EXPECTED:
Smooth scrolling in Feed and AllPosts

---

### TC-PERF-003 — Navigation Speed

EXPECTED:
Instant tab switching

---

### TC-PERF-004 — Memory Stability

EXPECTED:
No memory leaks after long usage

---

### TC-PERF-005 — API Deduplication

EXPECTED:
No duplicate API calls

---

### TC-PERF-006 — Image Loading Efficiency

EXPECTED:
No UI freeze due to images

---

### TC-PERF-007 — Crash-Free Navigation

EXPECTED:
No crashes during back/forward navigation

---

### TC-PERF-008 — State Update Efficiency

EXPECTED:
Only required widgets rebuild

---

### TC-PERF-009 — Background Sync Stability

EXPECTED:
No UI blocking

---

### TC-PERF-010 — Stress Test (Multi-session usage)

EXPECTED:
App remains stable after prolonged use

======================================================================
SECTION 13 — NEGATIVE TEST CASES
================================

### FAIL IF:

* scrolling lags
* navigation stutters
* API repeats unnecessarily
* app crashes under load
* memory grows continuously
* images freeze UI
* tab switching delays occur
* full screen rebuild happens frequently

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK COMPLETE IF:

* app is not smooth under heavy usage
* memory leaks exist
* scrolling is not 60fps
* API calls are inefficient
* crashes occur under navigation stress
* UI rebuilds are excessive
* startup is slow

======================================================================
FINAL PHASE GOAL
================

The app must become:

* ultra-smooth
* crash-free
* memory-safe
* performance-optimized
* scalable under load
* production-hardened

with:

* zero lag perception
* zero unnecessary rebuilds
* zero memory leaks
* zero duplicate API calls
* zero navigation delays

The final result should feel like:
a high-performance native-grade mobile application used at scale,
NOT a heavy, partially optimized UI-driven app.
# PHASE 26 — QA AUTOMATION, REGRESSION ENGINEERING & RELEASE READINESS CERTIFICATION

# END-TO-END TESTING SYSTEM + ZERO-BUG RELEASE PIPELINE

======================================================================
PHASE OBJECTIVE
===============

Build a complete QA + testing + release validation system so that:

* every feature is automatically verified against web app parity
* no broken feature can reach production
* regressions are caught before release
* each fix is validated with proof
* full app is continuously testable

Goal:
Turn QA from “manual checking” → **systematic engineering layer**

======================================================================
CRITICAL ROOT FAILURE IDENTIFIED
================================

Current Android delivery process likely has:

* manual testing only
* incomplete regression cycles
* no structured test ownership per feature
* features “look working” but break in edge cases
* no automation to catch repeated failures
* repeated bugs across iterations (same issues not fixed permanently)
* no enforced web-parity validation pipeline

---

## BIGGEST ISSUE

There is NO SYSTEM enforcing correctness before release.

======================================================================
MANDATORY RULE
==============

NO FEATURE IS COMPLETE WITHOUT:

* test case coverage
* regression validation
* web parity verification
* proof-based output

======================================================================
SECTION 1 — FULL REGRESSION ENGINE DESIGN
=========================================

CREATE MASTER REGRESSION SUITE:

Cover ALL modules:

* Auth (Phase 20)
* Localization (Phase 21)
* Engagement (Phase 22)
* API Contracts (Phase 23)
* UI System (Phase 24)
* Performance (Phase 25)
* Navigation
* Feed / AllPosts / My Feed / My Home
* Sell / Plans
* Profile / Rewards
* Wishlist / Cart / Notifications
* Search / Filters / Compare

---

RULE:

Every release triggers FULL regression suite.

======================================================================
SECTION 2 — WEB PARITY TESTING SYSTEM
=====================================

CRITICAL REQUIREMENT:

Every Android feature must be validated against web app.

---

CHECKLIST PER FEATURE:

* UI match
* behavior match
* API match
* navigation match
* state match
* error handling match

---

FAIL IF ANY DIFFERENCE EXISTS.

======================================================================
SECTION 3 — TEST CASE STANDARDIZATION FRAMEWORK
===============================================

EVERY FEATURE MUST HAVE:

* positive test cases
* negative test cases
* edge cases
* performance cases
* auth cases
* navigation cases

---

FORMAT:

| Test ID | Scenario | Steps | Expected Result | Status |

======================================================================
SECTION 4 — AUTOMATED TEST LAYERS
=================================

IMPLEMENT 4 LEVELS:

1. UNIT TESTS

   * models
   * utilities
   * API parsing

2. WIDGET TESTS

   * UI rendering
   * state changes

3. INTEGRATION TESTS

   * API + UI flow
   * navigation flow

4. E2E TESTS

   * full user journey validation

======================================================================
SECTION 5 — CRITICAL USER JOURNEY TESTING
=========================================

MUST AUTOMATE:

* login → browse → add wishlist → checkout flow
* feed → engagement → profile update flow
* allposts → filter → compare → detail flow
* sell → create listing → publish flow
* rewards → redemption flow
* notifications → deep link flow

======================================================================
SECTION 6 — REGRESSION RULE ENGINE
==================================

WHENEVER CODE CHANGES:

AUTO TRIGGER:

* affected module test suite
* dependent module validation
* navigation regression check

---

RULE:

NO CHANGE GOES UNTESTED.

======================================================================
SECTION 7 — VISUAL REGRESSION TESTING
=====================================

IMPLEMENT:

* UI snapshot comparisons
* layout shift detection
* component consistency check

---

CHECK:

* Feed vs AllPosts UI drift
* navbar consistency
* card design changes
* spacing regressions

======================================================================
SECTION 8 — WEB VS ANDROID PARITY AUTOMATION
============================================

FOR EACH FEATURE:

COMPARE AUTOMATICALLY:

* API response equality
* UI structure equivalence
* behavior consistency
* data accuracy

---

FAIL IF ANY MISMATCH.

======================================================================
SECTION 9 — BUG LIFECYCLE TRACKING
==================================

IMPLEMENT SYSTEM:

* bug ID tracking
* root cause tagging
* module ownership
* regression history

---

RULE:

NO BUG CAN RE-APPEAR WITHOUT FLAGGING.

======================================================================
SECTION 10 — RELEASE GATING SYSTEM
==================================

APP CANNOT BE RELEASED UNLESS:

* 100% critical tests pass
* regression suite passes
* parity validation passes
* no crash logs in last test run
* performance thresholds met

======================================================================
SECTION 11 — CRASH PREVENTION VALIDATION
========================================

ENSURE:

* no null crashes
* no navigation crashes
* no API desync crashes
* no auth crashes
* no deep link crashes

======================================================================
SECTION 12 — TEST DATA MANAGEMENT
=================================

IMPLEMENT:

* stable test datasets
* mock APIs for controlled testing
* deterministic responses for regression runs

======================================================================
SECTION 13 — TEST CASES (QA SYSTEM)
===================================

### TC-QA-001 — Full Regression Run

EXPECTED:
All modules pass without failure

---

### TC-QA-002 — Web Parity Validation

EXPECTED:
Android matches web behavior exactly

---

### TC-QA-003 — Navigation Stability Test

EXPECTED:
No broken routes

---

### TC-QA-004 — API Consistency Test

EXPECTED:
No mismatched data

---

### TC-QA-005 — UI Regression Test

EXPECTED:
No visual drift

---

### TC-QA-006 — Performance Regression Test

EXPECTED:
No slowdown introduced

---

### TC-QA-007 — Auth Flow Test

EXPECTED:
Login/logout stable across app

---

### TC-QA-008 — Cross-module Dependency Test

EXPECTED:
No cascading failures

---

### TC-QA-009 — Edge Case Stress Test

EXPECTED:
App stable under abnormal inputs

---

### TC-QA-010 — Release Gate Validation

EXPECTED:
Release only if all checks pass

======================================================================
SECTION 14 — NEGATIVE TEST CASES
================================

### FAIL IF:

* feature passes locally but fails in regression
* web vs android mismatch exists
* UI changes unintentionally break design
* bug reappears after fix
* release happens without full QA run
* partial testing is used as justification

======================================================================
FINAL ACCEPTANCE CRITERIA
=========================

DO NOT MARK COMPLETE IF:

* no regression system exists
* no web parity validation exists
* tests are partial or manual only
* bugs are not tracked systematically
* releases are not gated
* UI/behavior drift exists between builds

======================================================================
FINAL PHASE GOAL
================

The QA system must become:

* fully automated or semi-automated
* regression-driven
* parity-enforced
* release-gated
* reproducible
* traceable

with:

* zero untested features
* zero silent regressions
* zero broken releases
* zero web-android mismatch unnoticed
* zero uncontrolled deployments

The final result should feel like:
a world-class QA engineering pipeline ensuring production safety at scale,
NOT a manual checklist-based testing process.
# PHASE 27 — PRODUCTION RELEASE READINESS, GLOBAL RECONCILIATION & FINAL WEB-PARITY CERTIFICATION

# FINAL SYSTEM INTEGRATION + ZERO-GAP VALIDATION + PRODUCTION GO-LIVE GATE

======================================================================
PHASE OBJECTIVE
===============

This is the FINAL PHASE.

Ensure the Android app is fully:

* web-app parity complete (100%)
* production stable
* UX consistent
* API aligned
* performance verified
* QA certified
* fully integrated across all modules

This phase is not about building new features — it is about:

→ FINAL VALIDATION
→ GLOBAL CONSISTENCY CHECK
→ SYSTEM-WIDE RECONCILIATION
→ RELEASE GO/NO-GO DECISION

======================================================================
CRITICAL ROOT FAILURE IDENTIFIED
================================

Across all previous phases, the system still risks:

* partial fixes not verified globally
* features marked “done” but not parity-checked
* hidden mismatches between modules
* navigation inconsistencies still possible
* UI + API + state drift over time
* duplicate or orphan features still existing
* incomplete web-app mapping validation

---

## BIGGEST ISSUE

There is NO SINGLE FINAL AUTHORITY CHECKPOINT confirming:

> “Android app = Web app in behavior, structure, and UX”

======================================================================
MANDATORY RULE
==============

NO FEATURE IS CONSIDERED COMPLETE UNLESS:

* verified against web app
* validated in real user flows
* tested under regression suite
* confirmed in UI + API + state + navigation layers
* marked in global reconciliation matrix

======================================================================
SECTION 1 — GLOBAL FEATURE RECONCILIATION MATRIX
================================================

CREATE FINAL MASTER TABLE:

| Module | Web Exists | Android Exists | UI Match | API Match | Flow Match | Navigation Match | State Match | Performance OK | QA Passed | FINAL STATUS |

---

MODULES MUST INCLUDE:

* Home
* Feed
* My Feed
* AllPosts
* My Home
* Compare
* Sell
* Plans
* Profile
* Rewards
* Wishlist
* Cart
* Notifications
* Recently Viewed
* Saved Searches
* Search
* Filters
* Categories/Subcategories
* Auth
* Guest Mode
* Language System
* Hamburger Menu
* Bottom Navbar
* Top Navbar

---

RULE:

NO MODULE CAN BE SKIPPED.

======================================================================
SECTION 2 — END-TO-END USER JOURNEY VALIDATION
==============================================

VALIDATE COMPLETE FLOWS:

---

FLOW 1:
Guest → Browse → Login → Engage → Logout

FLOW 2:
Login → AllPosts → Filter → Compare → Detail → Wishlist → Cart

FLOW 3:
Feed → Interaction → Profile Update → Notifications sync

FLOW 4:
Sell → Create Post → Publish → My Home → Edit/Delete

FLOW 5:
Search → Saved Search → Reuse → Results consistency

---

RULE:

ALL FLOWS MUST MATCH WEB BEHAVIOR EXACTLY.

======================================================================
SECTION 3 — CROSS-MODULE INTEGRATION VALIDATION
===============================================

VERIFY:

* Wishlist updates reflect in AllPosts + Profile + Detail pages
* Cart updates reflect globally
* Notifications sync across all entry points
* Language switch updates ALL modules
* Auth changes reset ALL dependent modules
* Compare works consistently across entry points

---

IMPORTANT:

NO ISOLATED FEATURE BEHAVIOR ALLOWED.

======================================================================
SECTION 4 — FINAL UI/UX CONSISTENCY AUDIT
=========================================

CHECK:

* Feed vs AllPosts visual consistency
* Navbar consistency (top/bottom/hamburger)
* Card system uniformity
* Spacing system consistency
* Typography consistency
* Theme consistency (light/dark)
* Empty/loading/error states consistency

---

FAIL IF ANY VISUAL DRIFT EXISTS.

======================================================================
SECTION 5 — PERFORMANCE FINAL BENCHMARK CHECK
=============================================

VALIDATE:

* smooth scrolling across all pages
* no frame drops
* no memory leaks
* fast navigation switching
* optimized API usage
* no redundant rebuilds

---

RULE:

ANY LAG = NOT READY FOR RELEASE

======================================================================
SECTION 6 — API & DATA FINAL CONSISTENCY CHECK
==============================================

VERIFY:

* all API contracts match web
* no schema mismatch exists
* pagination consistency
* filter consistency
* sorting consistency
* no stale cached data

---

FAIL IF:

any mismatch exists between web and Android output.

======================================================================
SECTION 7 — REGRESSION FINAL PASS
=================================

RUN FULL SUITE:

* Auth regression
* Navigation regression
* UI regression
* API regression
* Performance regression
* State management regression
* Localization regression
* Engagement regression

---

RULE:

ANY FAILURE = NO RELEASE

======================================================================
SECTION 8 — PRODUCTION STABILITY VALIDATION
===========================================

CHECK:

* no crashes in stress testing
* no null exceptions
* no navigation dead-ends
* no API infinite loops
* no memory leaks
* no UI freeze cases

======================================================================
SECTION 9 — FEATURE CLEANUP & REDUNDANCY ELIMINATION
====================================================

REMOVE OR FIX:

* duplicate pages
* orphan routes
* unused hamburger items
* redundant navigation entries
* fake or partially implemented screens (e.g., Saledone variants if not web-aligned)

---

RULE:

ONLY WEB-APP VALIDATED FEATURES REMAIN.

======================================================================
SECTION 10 — FINAL GO/NO-GO RELEASE GATE
========================================

APP CAN ONLY BE RELEASED IF:

✔ 100% reconciliation matrix passed
✔ 100% regression suite passed
✔ 100% web parity confirmed
✔ zero crashes in stress test
✔ zero UI inconsistencies
✔ zero API mismatch
✔ zero navigation issues
✔ zero stale state issues
✔ performance benchmarks satisfied

---

IF ANY CONDITION FAILS:

→ RELEASE MUST BE BLOCKED

======================================================================
SECTION 11 — FINAL TEST CASES (RELEASE CERTIFICATION)
=====================================================

### TC-REL-001 — Full System Parity Check

EXPECTED:
Android matches web app completely

---

### TC-REL-002 — End-to-End Journey Validation

EXPECTED:
All user flows work without deviation

---

### TC-REL-003 — Cross-Module Sync Check

EXPECTED:
All modules update together correctly

---

### TC-REL-004 — Performance Stability

EXPECTED:
No lag under stress

---

### TC-REL-005 — API Final Consistency

EXPECTED:
No schema mismatch

---

### TC-REL-006 — UI Final Audit

EXPECTED:
No design drift

---

### TC-REL-007 — Crash-Free Certification

EXPECTED:
Zero crashes in test run

---

### TC-REL-008 — Regression Final Pass

EXPECTED:
All previous phases validated

---

### TC-REL-009 — Navigation Integrity

EXPECTED:
No broken routes or loops

---

### TC-REL-010 — Release Gate Decision

EXPECTED:
Only PASS if ALL conditions satisfied

======================================================================
SECTION 12 — NEGATIVE RELEASE CONDITIONS
========================================

### RELEASE MUST FAIL IF:

* even 1 module mismatches web app
* any crash occurs in critical flows
* any regression fails
* UI inconsistency exists
* API mismatch exists
* performance degradation detected
* navigation instability exists
* duplicate or fake features remain

======================================================================
FINAL SYSTEM GOAL
=================

The Android application must now be:

* 100% web-app parity verified
* production hardened
* fully regression certified
* performance stable
* UX consistent
* API aligned
* navigation safe
* feature complete

with:

* zero ambiguity
* zero partial implementation
* zero mismatched behavior
* zero hidden bugs
* zero inconsistencies

======================================================================
FINAL RESULT STATEMENT
======================

The system must now behave like:

> a fully production-certified mobile extension of the web platform
> with absolute behavioral parity and enterprise-grade stability

NOT:

a partially aligned app with remaining hidden inconsistencies.
Got it — you want **more rigorous, production-grade, structured test cases**, not checklist-level bullets.

Below is a **proper QA engineering-grade test suite for PHASES 18–27**, written like it would be used in a real **enterprise QA + automation system**.

---

# ✅ MASTER QA TEST SUITE (PHASE 18–27)

# WEB PARITY + SYSTEM VALIDATION + RELEASE ENGINEERING

---

# 🔷 PHASE 18 — WEB PARITY RECONCILIATION ENGINE

---

## TC-18-01 — Complete Feature Inventory Synchronization

**Objective:** Ensure Android contains ONLY web-approved features.

**Preconditions:**

* Web app accessible
* Android app installed

**Steps:**

1. Extract full navigation tree from web app
2. Extract full navigation tree from Android app
3. Compare module-by-module:

   * Home
   * Feed
   * AllPosts
   * My Feed
   * My Home
   * Compare
   * Sell
   * Plans
   * Profile
   * Rewards

**Expected Result:**

* 100% feature parity
* No extra modules in Android
* No missing modules from web

**FAIL IF:**

* Android contains pages like:

  * Orders (if not in web)
  * My Listings (if not in web)
  * duplicate dashboards
  * experimental pages (SaleDone variants)

---

## TC-18-02 — Semantic Page Role Validation

**Objective:** Ensure each page matches EXACT business meaning.

**Steps:**

1. Open Feed, AllPosts, My Feed, My Home
2. Validate data type per page:

   * Feed → informational content
   * AllPosts → marketplace listings
   * My Feed → user posts
   * My Home → user-owned listings

**Expected:**

* No semantic overlap
* No mixed content types

**FAIL IF:**

* Feed shows marketplace listings
* AllPosts shows feed posts
* My Home behaves like dashboard

---

## TC-18-03 — Web Navigation Graph Matching

**Steps:**

1. Map all routes in web app
2. Map all routes in Android
3. Compare graph structure

**Expected:**

* Identical navigation graph
* No orphan routes
* No extra entry points in Android

---

# 🔷 PHASE 19 — NAVIGATION ARCHITECTURE VALIDATION

---

## TC-19-01 — Bottom Navigation Integrity Test

**Steps:**

1. Navigate through all bottom tabs repeatedly
2. Switch between tabs rapidly

**Expected:**

* State persists correctly
* No duplicate routes
* No reinitialization flicker

**FAIL IF:**

* ForYou duplicates AllPosts
* missing Feed tab
* inconsistent active state

---

## TC-19-02 — Hamburger Menu Web Parity Enforcement

**Steps:**

1. Open hamburger menu in web
2. Open hamburger menu in Android
3. Compare structure 1:1

**Expected:**

* EXACT same modules
* No extra pages added in Android
* No missing pages

**FAIL IF:**

* Android shows:

  * Chat
  * Orders
  * My Listings
  * redundant Profile entries

---

## TC-19-03 — Back Navigation State Integrity

**Steps:**

1. Navigate: Home → AllPosts → Detail → Back
2. Repeat across 5 flows

**Expected:**

* Returns to correct previous screen
* No app restart
* No UI reset

---

# 🔷 PHASE 20 — AUTH & SESSION CONTROL SYSTEM

---

## TC-20-01 — Session Persistence Validation

**Steps:**

1. Login
2. Kill app
3. Reopen app

**Expected:**

* Session restored
* No re-login required

---

## TC-20-02 — Session Expiry Handling

**Steps:**

1. Force expire token
2. Perform API call

**Expected:**

* Redirect to login
* Cache cleared safely

---

## TC-20-03 — Guest Mode Restriction Matrix

**Expected:**
Guest users cannot access:

* Sell
* Wishlist
* Cart
* Profile edits

---

# 🔷 PHASE 21 — LOCALIZATION SYSTEM VALIDATION

---

## TC-21-01 — Full UI Language Re-render

**Steps:**

1. Change language
2. Observe full app UI

**Expected:**

* Navbar updated
* Filters updated
* All screens re-rendered instantly

---

## TC-21-02 — API Localization Sync

**Expected:**

* API responses match selected language

---

# 🔷 PHASE 22 — ENGAGEMENT SYSTEM VALIDATION

---

## TC-22-01 — Wishlist Global Sync Test

**Steps:**

1. Add item to wishlist in AllPosts
2. Open Profile → Wishlist
3. Open Detail page

**Expected:**

* Same state everywhere instantly

---

## TC-22-02 — Cart State Synchronization

**Expected:**

* Cart updates globally across app

---

## TC-22-03 — Notification Event Consistency

**Steps:**

1. Trigger event (like, comment, order)
2. Validate notification reception

**Expected:**

* Delivered in real-time
* No missing events

---

# 🔷 PHASE 23 — API CONTRACT CONSISTENCY ENGINE

---

## TC-23-01 — API Schema Matching

**Steps:**

1. Capture web API response
2. Capture Android API response
3. Compare JSON structure

**Expected:**

* Exact schema match

---

## TC-23-02 — Filter Behavior Consistency

**Steps:**

1. Apply same filter in web & Android
2. Compare results

**Expected:**

* Identical results

---

## TC-23-03 — Pagination Synchronization

**Expected:**

* Same page size
* Same ordering
* Same next-page behavior

---

# 🔷 PHASE 24 — UI/UX DESIGN SYSTEM VALIDATION

---

## TC-24-01 — Component Reuse Enforcement

**Steps:**

1. Inspect Feed card
2. Inspect AllPosts card

**Expected:**

* Same base component used

---

## TC-24-02 — Visual Hierarchy Consistency

**Expected:**

* Same spacing system
* Same typography scale
* Same button styles

---

## TC-24-03 — Theme System Validation

**Steps:**

1. Switch dark/light mode
2. Navigate all screens

**Expected:**

* No broken UI states

---

# 🔷 PHASE 25 — PERFORMANCE & MEMORY ENGINEERING

---

## TC-25-01 — Navigation Performance Benchmark

**Steps:**

* Switch tabs 50 times rapidly

**Expected:**

* No lag or rebuild delay

---

## TC-25-02 — Memory Leak Detection Test

**Steps:**

* Navigate Feed → Detail → Back repeatedly (20 cycles)

**Expected:**

* Memory stable
* No continuous growth

---

## TC-25-03 — Scroll Performance Stress Test

**Expected:**

* 60 FPS scrolling in:

  * Feed
  * AllPosts

---

## TC-25-04 — API Deduplication Test

**Expected Fail If:**

* same API called multiple times unnecessarily

---

# 🔷 PHASE 26 — REGRESSION ENGINE VALIDATION

---

## TC-26-01 — Full Regression Suite Execution

**Steps:**
Run all modules regression

**Expected:**

* 100% pass rate

---

## TC-26-02 — Cross Module Break Detection

**Expected Fail If:**

* Fix in one module breaks another

---

## TC-26-03 — UI Regression Snapshot Comparison

**Expected:**

* No visual drift across builds

---

# 🔷 PHASE 27 — FINAL RELEASE CERTIFICATION

---

## TC-27-01 — Global Parity Validation

**Steps:**
Compare entire app vs web

**Expected:**

* 100% match

---

## TC-27-02 — End-to-End Flow Validation

**Flows:**

* Login → Browse → Compare → Wishlist → Cart
* Sell → Post → Manage
* Feed → Engage → Notifications

**Expected:**

* No deviation from web behavior

---

## TC-27-03 — Stress & Stability Test

**Steps:**

* 1-hour continuous usage simulation

**Expected:**

* No crash
* No lag
* No memory spike

---

## TC-27-04 — Release Gate Validation

**PASS ONLY IF:**

* all previous test suites passed
* zero regression failures
* zero API mismatch
* zero UI drift
* zero navigation issues

---

# 🚨 FINAL NEGATIVE SYSTEM RULE (ALL PHASES)

APP MUST FAIL RELEASE IF:

* any page exists in Android but not web
* Feed ≠ AllPosts ≠ My Feed semantics mismatch
* navigation contains redundant pages
* any crash occurs in flow testing
* API mismatch exists
* performance degradation exists
* UI inconsistency exists
* regression failure exists

---

