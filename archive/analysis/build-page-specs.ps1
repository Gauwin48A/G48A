$text = Get-Content -Path client\src\App.jsx -Raw
$routeMatches = [regex]::Matches($text, '<Route\s+path="([^"]+)"\s+element=\{([^}]+)\}', [System.Text.RegularExpressions.RegexOptions]::Singleline)
$routes = @()
foreach ($m in $routeMatches) {
  $routes += [pscustomobject]@{ Path = $m.Groups[1].Value; Element = $m.Groups[2].Value }
}
$authRoutes = New-Object System.Collections.Generic.HashSet[string]
$adminRoutes = New-Object System.Collections.Generic.HashSet[string]
foreach ($r in $routes) {
  if ($r.Element -match '<RequireAuth') {
    $authRoutes.Add($r.Path) | Out-Null
    if ($r.Element -match 'requiredRoles') { $adminRoutes.Add($r.Path) | Out-Null }
  }
}
$componentRoutes = @{}
foreach ($r in $routes) {
  if ($r.Path -eq '*') { continue }
  if ($r.Element -match 'Navigate\s+to="([^"]+)"') {
    $comp = 'Navigate->' + $Matches[1]
  } elseif ($r.Element -match '<RequireAuth[^>]*>\s*<([^\s/>]+)') {
    $comp = $Matches[1]
  } elseif ($r.Element -match '<([^\s/>]+)') {
    $comp = $Matches[1]
  } else {
    $comp = 'Unknown'
  }
  if (-not $componentRoutes.ContainsKey($comp)) { $componentRoutes[$comp] = @() }
  $componentRoutes[$comp] += $r.Path
}
$importMatches = [regex]::Matches($text, 'const\s+([A-Za-z0-9_]+)\s*=\s*lazyWithRetry\(\s*\(\)\s*=>\s*import\("([^"]+)"\)', [System.Text.RegularExpressions.RegexOptions]::Singleline)
$componentFiles = @{}
foreach ($m in $importMatches) { $componentFiles[$m.Groups[1].Value] = $m.Groups[2].Value }
$pageData = Get-Content -Path analysis\page-data.json -Raw | ConvertFrom-Json
$pageMap = @{}
foreach ($p in $pageData) { $pageMap[$p.Component] = $p }
$overrides = @{
  'CategoryHubPage' = @{ Purpose = 'Category-first discovery hub for entering the marketplace by vertical.'; Features = 'Category tiles and discovery sections, quick navigation into category feeds.'; Flows = 'Open hub, pick a category, route to listings or subcategory browser.' }
  'AllPostsPage' = @{ Purpose = 'Primary marketplace listing feed.'; Features = 'Hero context banner, category/subcategory bar, quick filters, sort controls, shuffle, live refresh toggle, listing cards.'; Flows = 'Browse, filter/sort, open listing, switch categories.' }
  'ForYouPage' = @{ Purpose = 'Personalized marketplace feed.'; Features = 'Personalized recommendations, near-me context, quick filters, fallback for cold-start.'; Flows = 'Open feed, apply filters, open listing.' }
  'FeedPage' = @{ Purpose = 'Community/activity feed.'; Features = 'Post feed, engagement actions, filters, live updates.'; Flows = 'Browse posts, open a post, react or comment.' }
  'FeedPostDetailPage' = @{ Purpose = 'Single community post detail view.'; Features = 'Post content, engagement thread, share/report actions.'; Flows = 'Open post, view thread, engage.' }
  'RewardsPage' = @{ Purpose = 'Coins wallet, tiers, and earning guidance.'; Features = 'Balance + tier progress, daily check-in and spin, referral ladder, earn guide, store redemption, history.'; Flows = 'Open rewards, claim daily actions, view history, redeem coins.' }
  'ProfilePage' = @{ Purpose = 'Account hub and profile management.'; Features = 'Tabbed profile sections (overview/personal/preferences/settings), profile completion prompts.'; Flows = 'Review profile, edit details, save preferences.' }
  'AddPostPage' = @{ Purpose = 'Create a marketplace listing.'; Features = 'Multi-step listing form, media upload, category/subcategory, pricing, condition, location.'; Flows = 'Fill form, submit listing, redirect to listing/manage.' }
  'PostAddPage' = @{ Purpose = 'Create a community/feed post.'; Features = 'Compact post creation, optional media, submit flow.'; Flows = 'Compose post, submit, return to feed.' }
  'EditPostPage' = @{ Purpose = 'Edit an existing listing.'; Features = 'Pre-filled form, update actions, validation.'; Flows = 'Load listing, edit, save changes.' }
  'PostDetailPage' = @{ Purpose = 'Listing detail view.'; Features = 'Media gallery, pricing, seller info, save/share, cart or contact actions, related listings.'; Flows = 'Open listing, evaluate details, take action.' }
  'CartPage' = @{ Purpose = 'Shopping cart and checkout staging.'; Features = 'Cart items, quantity/variant controls, totals, checkout CTA.'; Flows = 'Review cart, adjust items, proceed to payment.' }
  'WishlistPage' = @{ Purpose = 'Saved listings collection.'; Features = 'Saved items list, remove/save actions, open listing.'; Flows = 'Browse saved items, open or remove.' }
  'RecentlyViewedPage' = @{ Purpose = 'Recent browsing history for quick return.'; Features = 'Recently viewed list, quick open.'; Flows = 'Revisit a listing.' }
  'SearchPage' = @{ Purpose = 'Search and discovery entry point.'; Features = 'Search query, filters, results list.'; Flows = 'Search, refine, open listing.' }
  'SubcategoriesPage' = @{ Purpose = 'Category + subcategory browser.'; Features = 'Hierarchical category navigation.'; Flows = 'Select category or subcategory, navigate to feed.' }
  'CategoryModeSelectPage' = @{ Purpose = 'Mode switch between apps/categories.'; Features = 'Category mode selection UI.'; Flows = 'Select mode, return to feed.' }
  'TierSelectionPage' = @{ Purpose = 'Plan selection and pricing.'; Features = 'Plan comparison, purchase CTA, coin redemption limits.'; Flows = 'Compare tiers, choose plan, proceed to payment.' }
  'PostWelcomePage' = @{ Purpose = 'Sell onboarding entry screen.'; Features = 'Selling benefits, CTA to create listing.'; Flows = 'Start selling, proceed to add post.' }
  'DashboardPage' = @{ Purpose = 'Seller analytics and management.'; Features = 'Stats, listing management shortcuts, performance view.'; Flows = 'Review stats, manage listings.' }
  'NotificationsPage' = @{ Purpose = 'Notification inbox.'; Features = 'Unread badge, filters, mark read.'; Flows = 'Open notifications, read, clear.' }
  'ComplaintsPage' = @{ Purpose = 'Issue/complaint submission.'; Features = 'Complaint form, validation, submission status.'; Flows = 'Submit complaint, view status message.' }
  'FeedbackPage' = @{ Purpose = 'User feedback capture.'; Features = 'Feedback form, optional rating, submission state.'; Flows = 'Submit feedback, confirmation.' }
  'VerificationPage' = @{ Purpose = 'Verification entry point.'; Features = 'Verification options and routing (Aadhaar/KYC).'; Flows = 'Choose verification, proceed.' }
  'KycVerificationPage' = @{ Purpose = 'KYC verification workflow.'; Features = 'Identity document capture, verification status.'; Flows = 'Submit KYC, await status.' }
  'AadhaarVerifyPage' = @{ Purpose = 'Aadhaar/identity verification info page.'; Features = 'CMS-driven instructions, verification CTA.'; Flows = 'Review requirements, proceed.' }
  'PaymentPage' = @{ Purpose = 'Payment/checkout workflow.'; Features = 'Plan purchase, payment status, receipt handling.'; Flows = 'Pay, confirm, redirect.' }
  'OffersPage' = @{ Purpose = 'Offers/promotions and deals.'; Features = 'Offers list, details view.'; Flows = 'Browse offers, open details.' }
  'ActivityHubPage' = @{ Purpose = 'Activity shortcuts hub.'; Features = 'Quick links to key actions and updates.'; Flows = 'Open hub, jump to feature.' }
  'ChannelsListPage' = @{ Purpose = 'Channel list (community/centre).'; Features = 'Browse and open channels, create CTA.'; Flows = 'Open channel, create channel.' }
  'ChannelPage' = @{ Purpose = 'Channel detail page.'; Features = 'Channel feed, listings or posts, subscribe actions.'; Flows = 'Open channel, browse content.' }
  'CreateChannelPage' = @{ Purpose = 'Create a channel or centre.'; Features = 'Channel creation form, validation.'; Flows = 'Create channel, navigate to channel.' }
  'CentreListingsPage' = @{ Purpose = 'Listings within a centre channel.'; Features = 'Centre-specific listings feed.'; Flows = 'Browse centre listings, open listing.' }
  'PublicWallPage' = @{ Purpose = 'Public listings/activity wall.'; Features = 'Public feed and discovery content.'; Flows = 'Browse, open listing.' }
  'HomePage' = @{ Purpose = 'Curated landing/discovery home.'; Features = 'Highlighted sections, CTA entry points.'; Flows = 'Browse sections, navigate.' }
  'BuyerViewPage' = @{ Purpose = 'Buyer-specific view of listings/flows.'; Features = 'Buyer content and purchase actions.'; Flows = 'Review listing as buyer, take action.' }
  'BoughtPostsPage' = @{ Purpose = 'Purchase history.'; Features = 'List of bought items, status.'; Flows = 'Review purchase, open detail.' }
  'SoldPostsPage' = @{ Purpose = 'Sales history.'; Features = 'List of sold items, status.'; Flows = 'Review sale, open detail.' }
  'SaledonePage' = @{ Purpose = 'Sale completion confirmation.'; Features = 'Success message, next steps.'; Flows = 'Confirm sale, return to dashboard.' }
  'SaleUndonePage' = @{ Purpose = 'Sale reversal/issue flow.'; Features = 'Status messaging, support actions.'; Flows = 'Resolve sale issue.' }
  'SavedSearchesPage' = @{ Purpose = 'Saved search management.'; Features = 'Saved queries list, delete/run.'; Flows = 'Open search from saved query.' }
  'NearbyPostsPage' = @{ Purpose = 'Nearby listings feed.'; Features = 'Location-based filtering, permission gating.'; Flows = 'Allow location, browse nearby.' }
  'ProtectedChatPage' = @{ Purpose = 'Chat and messaging.'; Features = 'Thread list, message composer, attachment support.'; Flows = 'Open thread, send message.' }
  'SecuritySettingsPage' = @{ Purpose = 'Security settings.'; Features = 'Password/2FA settings, device/session controls.'; Flows = 'Update security settings.' }
  'ReviewsPage' = @{ Purpose = 'User reviews and ratings.'; Features = 'Review list, rating breakdown.'; Flows = 'Browse reviews.' }
  'InviteRedirectPage' = @{ Purpose = 'Referral/invite deep link handler.'; Features = 'Validates invite and routes to signup.'; Flows = 'Open invite, redirect.' }
  'LoginPage' = @{ Purpose = 'User sign-in.'; Features = 'Login form, validation, error handling.'; Flows = 'Submit credentials, redirect.' }
  'SignUpPage' = @{ Purpose = 'Account creation.'; Features = 'Signup form, referral code handling.'; Flows = 'Register, redirect.' }
  'ForgotPasswordPage' = @{ Purpose = 'Password reset request.'; Features = 'Email/phone submission, confirmation.'; Flows = 'Request reset, check inbox.' }
  'ResetPasswordPage' = @{ Purpose = 'Password reset completion.'; Features = 'New password form, token validation.'; Flows = 'Submit new password, login.' }
  'TermsPage' = @{ Purpose = 'Terms and conditions.'; Features = 'Legal content display.'; Flows = 'Read terms.' }
  'PrivacyPage' = @{ Purpose = 'Privacy policy.'; Features = 'Legal content display.'; Flows = 'Read policy.' }
  'RefundPage' = @{ Purpose = 'Refund policy.'; Features = 'Legal content display.'; Flows = 'Read policy.' }
  'SupportTicketPage' = @{ Purpose = 'Support ticket policy.'; Features = 'Legal content display.'; Flows = 'Read policy.' }
  'AnalyticsPage' = @{ Purpose = 'Analytics overview (internal).'; Features = 'Analytics dashboards and charts.'; Flows = 'Review analytics.' }
}
$lines = @()
$lines += '## Page-by-Page Feature Map'
$lines += ''
$lines += 'Each page below follows the same spec so product, QA, and engineering have a shared reference.'
$lines += ''
$redirects = $componentRoutes.Keys | Where-Object { $_ -like 'Navigate->*' } | Sort-Object
if ($redirects.Count -gt 0) {
  $lines += '### Redirects & Aliases'
  foreach ($comp in $redirects) {
    $routesList = $componentRoutes[$comp] | Sort-Object
    $target = $comp -replace '^Navigate->',''
    $lines += "- Routes: $($routesList -join ', ') -> $target"
  }
  $lines += ''
}
$components = $componentRoutes.Keys | Where-Object { $_ -notlike 'Navigate->*' -and $_ -ne 'Unknown' } | Sort-Object
foreach ($comp in $components) {
  $routesList = $componentRoutes[$comp] | Sort-Object
  $routeLabel = $routesList -join ', '
  $data = $pageMap[$comp]
  $fileRel = $componentFiles[$comp]
  $fileAbs = ''
  if ($data -and $data.File) {
    $fileAbs = $data.File
  } elseif ($fileRel) {
    $fileAbs = (Resolve-Path -Path (Join-Path 'client/src' ($fileRel -replace '^\./',''))).Path
  }
  $services = $data.Services
  $hooks = $data.Hooks
  $contexts = $data.Contexts
  $access = 'Public'
  $hasAuth = $false
  $hasPublic = $false
  foreach ($r in $routesList) { if ($authRoutes.Contains($r)) { $hasAuth = $true } else { $hasPublic = $true } }
  if ($hasAuth -and -not $hasPublic) { $access = 'Auth' }
  elseif ($hasAuth -and $hasPublic) { $access = 'Mixed (public + auth)' }
  if ($routesList | Where-Object { $adminRoutes.Contains($_) }) { $access = 'Admin (role-gated)' }
  $purpose = ''
  $features = ''
  $flows = ''
  if ($overrides.ContainsKey($comp)) {
    $purpose = $overrides[$comp].Purpose
    $features = $overrides[$comp].Features
    $flows = $overrides[$comp].Flows
  } else {
    $friendly = ($comp -replace 'Page$','') -replace '([a-z])([A-Z])','$1 $2'
    $purpose = "$friendly page and related flows."
    $features = "Primary UI, actions, and standard empty/loading/error states as defined in the page component."
    $flows = "Open page, complete the primary action, navigate onward."
  }
  $servicesText = if ($services) { "Services: $services" } else { 'Services: none detected (local UI/state only).' }
  $hooksText = if ($hooks) { "Hooks: $hooks" } else { 'Hooks: none detected.' }
  $contextsText = if ($contexts) { "Contexts: $contexts" } else { 'Contexts: none detected.' }
  $lines += "### $routeLabel — $comp"
  if ($fileAbs) { $lines += ('- File: `' + $fileAbs + '`') }
  $lines += "- Access: $access"
  $lines += "- Purpose: $purpose"
  $lines += "- Key Features: $features"
  $lines += "- User Flows: $flows"
  $lines += "- Data Sources / APIs: $servicesText; $hooksText"
  $lines += "- State & Context: $contextsText"
  $lines += ''
}
$lines | Set-Content -Path analysis\page-specs.md -Encoding UTF8
