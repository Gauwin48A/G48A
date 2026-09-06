package com.zaruda.app.ui

import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Article
import androidx.compose.material.icons.automirrored.outlined.Article
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.Explore
import androidx.compose.material.icons.outlined.Forum
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.data.local.AppPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject
import androidx.navigation.NavController
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navigation
import androidx.navigation.navArgument
import com.zaruda.app.R
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import com.zaruda.app.ui.auth.AuthViewModel
import com.zaruda.app.ui.auth.ForgotPasswordScreen
import com.zaruda.app.ui.auth.LoginScreen
import com.zaruda.app.ui.auth.ResetPasswordScreen
import com.zaruda.app.ui.auth.SignUpScreen
import com.zaruda.app.ui.onboarding.BrandLaunchScreen
import com.zaruda.app.ui.account.AccountDeleteScreen
import com.zaruda.app.ui.account.AnalyticsScreen
import com.zaruda.app.ui.account.DashboardScreen
import com.zaruda.app.ui.account.SecurityScreen
import com.zaruda.app.ui.account.VerificationScreen
import com.zaruda.app.ui.account.PayoutScreen
import com.zaruda.app.ui.categories.CategoriesScreen
import com.zaruda.app.ui.channels.CentreDetailScreen
import com.zaruda.app.ui.channels.CentreListScreen
import com.zaruda.app.ui.channels.CentreListingsScreen
import com.zaruda.app.ui.channels.ChannelDetailScreen
import com.zaruda.app.ui.channels.ChannelsListScreen
import com.zaruda.app.ui.channels.CreateCentreScreen
import com.zaruda.app.ui.channels.CreateChannelScreen
import com.zaruda.app.ui.commerce.BoughtPostsScreen
import com.zaruda.app.ui.commerce.CartScreen
import com.zaruda.app.ui.commerce.CompareScreen
import com.zaruda.app.ui.commerce.EditPostScreen
import com.zaruda.app.ui.commerce.PaymentScreen
import com.zaruda.app.ui.commerce.PostWelcomeScreen
import com.zaruda.app.ui.commerce.RecentlyViewedScreen
import com.zaruda.app.ui.commerce.SaleDoneScreen
import com.zaruda.app.ui.commerce.ExpiryActionScreen
import com.zaruda.app.ui.commerce.RepostScreen
import com.zaruda.app.ui.commerce.SavedSearchesScreen
import com.zaruda.app.ui.commerce.SoldPostsScreen
import com.zaruda.app.ui.commerce.TierSelectionScreen
import com.zaruda.app.ui.explore.ExploreScreen
import com.zaruda.app.ui.feed.FeedScreen
import com.zaruda.app.ui.home.CategoryHubScreen
import com.zaruda.app.ui.home.HomeScreen
import com.zaruda.app.ui.home.PostDetailScreen
import com.zaruda.app.ui.kyc.KycScreen
import com.zaruda.app.ui.legal.AdminPanelScreen
import com.zaruda.app.ui.legal.InviteScreen
import com.zaruda.app.ui.legal.NotFoundScreen
import com.zaruda.app.ui.legal.PrivacyScreen
import com.zaruda.app.ui.legal.RefundScreen
import com.zaruda.app.ui.legal.HelpSupportScreen
import com.zaruda.app.ui.legal.TermsScreen
import com.zaruda.app.ui.more.MoreScreen
import com.zaruda.app.ui.navigation.Routes
import com.zaruda.app.core.AppLogger
import com.zaruda.app.core.LocalLocaleManager
import com.zaruda.app.core.LocaleManager
import com.zaruda.app.ui.notifications.NotificationsScreen
import com.zaruda.app.ui.post.CreatePostScreen
import com.zaruda.app.ui.post.MyPostsScreen
import com.zaruda.app.ui.profile.EditProfileScreen
import com.zaruda.app.ui.profile.ProfileScreen
import com.zaruda.app.ui.profile.ProfileViewModel
import com.zaruda.app.ui.profile.OrderHistoryScreen
import com.zaruda.app.ui.profile.OrderDetailScreen
import com.zaruda.app.ui.profile.AddressBookScreen
import com.zaruda.app.ui.profile.AddressFormScreen
import com.zaruda.app.ui.rewards.RewardsScreen
import com.zaruda.app.ui.rewards.ReferralTreeScreen
import com.zaruda.app.ui.search.SearchScreen
import com.zaruda.app.ui.social.ComplaintsScreen
import com.zaruda.app.ui.social.FeedbackScreen
import com.zaruda.app.ui.social.FeedDetailScreen
import com.zaruda.app.ui.social.FeedPostAddScreen
import com.zaruda.app.ui.social.MyFeedScreen
import com.zaruda.app.ui.social.PublicWallScreen
import com.zaruda.app.ui.social.RatingsScreen
import com.zaruda.app.ui.theme.ZarudaTheme
import com.zaruda.app.ui.wishlist.WishlistScreen
import com.zaruda.app.ui.wishlist.normalizeMarketplaceCategoryKey
import com.zaruda.app.core.ConnectivityObserver
import com.zaruda.app.ui.components.OfflineBanner
import com.zaruda.app.ui.components.ZarudaTopBar
import com.zaruda.app.ui.theme.ZarudaShapes
import com.zaruda.app.ui.theme.ZarudaElevation
import com.zaruda.app.ui.theme.ZarudaMotion
import android.app.Activity
import android.widget.Toast
import androidx.activity.compose.BackHandler
import com.zaruda.app.ui.theme.ZarudaGradients
import com.zaruda.app.ui.theme.ZarudaIconSize
import com.zaruda.app.ui.theme.spacing
import com.zaruda.app.data.local.ThemeMode
import kotlinx.coroutines.launch
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.flow.first
import com.google.firebase.analytics.FirebaseAnalytics
import android.os.Bundle
import com.zaruda.app.data.repository.KycRepository
import com.zaruda.app.data.repository.TiersRepository
import com.zaruda.app.core.ApiResult
import com.zaruda.app.core.CrashlyticsHelper

@HiltViewModel
class AppThemeViewModel @Inject constructor(
    private val prefs: AppPreferences,
) : ViewModel() {
    val themeMode: StateFlow<ThemeMode> = prefs.themeMode
        .stateIn(viewModelScope, kotlinx.coroutines.flow.SharingStarted.Eagerly, ThemeMode.SYSTEM)

    fun setThemeMode(mode: ThemeMode) {
        viewModelScope.launch { prefs.setThemeMode(mode) }
    }
}

/**
 * Resolves the correct destination for the + (Sell) FAB:
 *   1. KYC not approved â†’ Routes.KYC
 *   2. No active subscription â†’ Routes.TIER_SELECTION
 *   3. Everything OK â†’ Routes.POST_WELCOME
 */
@HiltViewModel
class SellFlowViewModel @Inject constructor(
    private val kycRepo: KycRepository,
    private val tiersRepo: TiersRepository,
    private val authRepo: com.zaruda.app.data.repository.AuthRepository,
) : ViewModel() {
    /** True when the KYC status string means the user is verified. */
    private fun isKycVerified(status: String?): Boolean {
        val s = status?.lowercase()?.trim()
        return s == "verified" || s == "approved" || s == "pan_verified"
    }

    /** Returns the route to navigate to when the sell button is tapped. */
    suspend fun resolveDestination(): String {
        // Demo sessions have premium + KYC enabled by design — go straight to post welcome
        if (authRepo.isDemoSession) return com.zaruda.app.ui.navigation.Routes.POST_WELCOME
        // Full access requires BOTH verified KYC AND an active subscription (any plan).
        // Plan is checked first: the server gates every /kyc/* endpoint behind an
        // active subscription (requireActivePlan), so KYC without a plan would hit a
        // 403 dead-end on submit. This matches the web flow (plan, then KYC).
        when (val subResult = tiersRepo.mySubscription()) {
            is ApiResult.Success -> {
                if (!subResult.data.active) return com.zaruda.app.ui.navigation.Routes.TIER_SELECTION
            }
            is ApiResult.Failure -> return com.zaruda.app.ui.navigation.Routes.TIER_SELECTION
        }
        when (val kycResult = kycRepo.status()) {
            is ApiResult.Success -> {
                if (!isKycVerified(kycResult.data.kycStatus)) return com.zaruda.app.ui.navigation.Routes.KYC
            }
            is ApiResult.Failure -> return com.zaruda.app.ui.navigation.Routes.KYC
        }
        return com.zaruda.app.ui.navigation.Routes.POST_WELCOME
    }

    /** Returns true if user has an active subscription (for Feed post creation). */
    suspend fun checkSubscriptionOnly(): Boolean {
        // Demo sessions have premium enabled by design
        if (authRepo.isDemoSession) return true
        return when (val subResult = tiersRepo.mySubscription()) {
            is ApiResult.Success -> subResult.data.active
            is ApiResult.Failure -> false
        }
    }
}

@Composable
fun ZarudaApp(
    onReady: () -> Unit = {},
    connectivityObserver: ConnectivityObserver? = null,
    deepLinkUri: String? = null,
    onDeepLinkConsumed: () -> Unit = {},
    localeManager: LocaleManager? = null,
) {        val themeVm: AppThemeViewModel = hiltViewModel()
        val themeMode by themeVm.themeMode.collectAsState()
        val onboardingVm: com.zaruda.app.ui.onboarding.OnboardingViewModel = hiltViewModel()
        val onboardingCompleted by onboardingVm.onboardingCompleted.collectAsState()
        var showSplash by rememberSaveable { mutableStateOf(true) }
        ZarudaTheme(themeMode = themeMode) {
            if (showSplash) {
                com.zaruda.app.ui.splash.AnimatedSplashScreen(
                    onSplashFinished = { showSplash = false },
                )
                return@ZarudaTheme
            }
            if (!onboardingCompleted) {
                com.zaruda.app.ui.onboarding.OnboardingScreen(
                    onFinished = {
                        onboardingVm.completeOnboarding()
                    },
                )
                return@ZarudaTheme
            }
            val navController = rememberNavController()

        // Navigation diagnostics
        DisposableEffect(navController) {
            val listener = NavController.OnDestinationChangedListener { _, destination, _ ->
                AppLogger.navPush(destination.route ?: "null")
            }
            navController.addOnDestinationChangedListener(listener)
            onDispose { navController.removeOnDestinationChangedListener(listener) }
        }

        val authViewModel: AuthViewModel = hiltViewModel()
        val isAuthenticated by authViewModel.isAuthenticated.collectAsState()
        val isAdmin by authViewModel.isAdmin.collectAsState()
        // Auto-detect GPS location on app launch (FusedLocationProvider + Geocoder)
        val appLocationVm: com.zaruda.app.ui.location.AppLocationViewModel = hiltViewModel()
        val currentCity by appLocationVm.currentCity.collectAsState()
        val currentArea by appLocationVm.currentArea.collectAsState()
        var activeCategoryKey by rememberSaveable { mutableStateOf<String?>(null) }
        var showMoreDrawer by rememberSaveable { mutableStateOf(false) }
        var showAuthGate by rememberSaveable { mutableStateOf(false) }
        var scrollToTopTrigger by androidx.compose.runtime.mutableIntStateOf(0)

        val context = LocalContext.current
        val exitScope = rememberCoroutineScope()
        // Request location permission on first launch only (skip if already restored from cache)
        val locationPermLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
            contract = androidx.activity.result.contract.ActivityResultContracts.RequestMultiplePermissions(),
        ) { perms ->
            val fine = perms[android.Manifest.permission.ACCESS_FINE_LOCATION] ?: false
            val coarse = perms[android.Manifest.permission.ACCESS_COARSE_LOCATION] ?: false
            if (fine || coarse) {
                // Only detect if location isn't already fresh (cooldown-aware)
                if (!appLocationVm.isLocationSet.value || !appLocationVm.isLocationFresh()) {
                    exitScope.launch {
                        appLocationVm.detectLocation(force = true)
                    }
                }
            }
        }
        LaunchedEffect(Unit) {
            // Skip entirely if location was already restored from SharedPreferences cache
            if (appLocationVm.isLocationSet.value) return@LaunchedEffect
            val hasFine = androidx.core.content.ContextCompat.checkSelfPermission(
                context, android.Manifest.permission.ACCESS_FINE_LOCATION
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            val hasCoarse = androidx.core.content.ContextCompat.checkSelfPermission(
                context, android.Manifest.permission.ACCESS_COARSE_LOCATION
            ) == android.content.pm.PackageManager.PERMISSION_GRANTED
            if (!hasFine && !hasCoarse) {
                locationPermLauncher.launch(arrayOf(
                    android.Manifest.permission.ACCESS_FINE_LOCATION,
                    android.Manifest.permission.ACCESS_COARSE_LOCATION,
                ))
            } else {
                appLocationVm.detectLocation()
            }
        }
        // ── Android 13+ POST_NOTIFICATIONS runtime permission ──────────────
        val notifPermLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
            contract = androidx.activity.result.contract.ActivityResultContracts.RequestPermission(),
        ) { /* no-op: user either grants or denies */ }
        LaunchedEffect(Unit) {
            if (android.os.Build.VERSION.SDK_INT >= 33) {
                val hasNotif = androidx.core.content.ContextCompat.checkSelfPermission(
                    context, android.Manifest.permission.POST_NOTIFICATIONS
                ) == android.content.pm.PackageManager.PERMISSION_GRANTED
                if (!hasNotif) notifPermLauncher.launch(android.Manifest.permission.POST_NOTIFICATIONS)
            }
        }

        val analytics = remember(context) { FirebaseAnalytics.getInstance(context) }

        androidx.compose.runtime.DisposableEffect(navController) {
            val listener = androidx.navigation.NavController.OnDestinationChangedListener { _, destination, _ ->
                val route = destination.route ?: return@OnDestinationChangedListener
                val params = android.os.Bundle().apply {
                    putString(FirebaseAnalytics.Param.SCREEN_NAME, route)
                    putString(FirebaseAnalytics.Param.SCREEN_CLASS, route)
                }
                analytics.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW, params)
            }
            navController.addOnDestinationChangedListener(listener)
            onDispose { navController.removeOnDestinationChangedListener(listener) }
        }


        fun openAllPosts(categoryKey: String? = null) {
            activeCategoryKey = categoryKey
            navController.navigate(Routes.ALL_POSTS) {
                popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                launchSingleTop = true
            }
        }

        /** Open the dedicated category mini-app (CategoryAppShell with its own 5-tab
         *  Home/Categories/Cart/Wishlist/Profile nav) for the given raw category key. */
        fun openCategoryApp(rawCategoryKey: String?) {
            val safeKey = normalizeMarketplaceCategoryKey(rawCategoryKey)
            navController.navigate(Routes.categoryDetail(safeKey)) { launchSingleTop = true }
        }

        /** Pop back stack; navigate to [fallback] if there's no back stack entry. */
        fun safeBack(fallback: String = Routes.ALL_POSTS) {
            if (!navController.popBackStack()) {
                navController.navigate(fallback) { popUpTo(0) { inclusive = true } }
            }
        }

        // Double-back to exit on Home
        var backPressedOnce by remember { mutableStateOf(false) }

        BackHandler(enabled = true) {
            // #7: Close drawer first if open
            if (showMoreDrawer) {
                showMoreDrawer = false
                return@BackHandler
            }
            // Close auth gate popup if visible
            if (showAuthGate) {
                showAuthGate = false
                return@BackHandler
            }

            val route = navController.currentDestination?.route
            // If on a main tab or category detail, navigate to HOME
            if (route == Routes.HOME) {
                if (backPressedOnce) {
                    (context as? Activity)?.finish()
                } else {
                    backPressedOnce = true
                    Toast.makeText(context, context.getString(R.string.msg_press_back_exit), Toast.LENGTH_SHORT).show()
                    exitScope.launch { kotlinx.coroutines.delay(2000); backPressedOnce = false }
                }
                return@BackHandler
            }

            // If on a main tab (ALL_POSTS, FOR_YOU, FEED, REWARDS, PROFILE), go to HOME
            if (route in listOf(Routes.ALL_POSTS, Routes.FOR_YOU, Routes.FEED, Routes.REWARDS, Routes.PROFILE)) {
                navController.navigate(Routes.HOME) {
                    popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                    launchSingleTop = true
                }
                return@BackHandler
            }

            // Try standard back navigation
            if (!navController.popBackStack()) {
                if (route?.startsWith("auth") == true) {
                    (context as? Activity)?.finish()
                } else {
                    navController.navigate(Routes.HOME) {
                        popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                        launchSingleTop = true
                    }
                }
            }
        }

        // Observe locale version to trigger recomposition on locale change
        val localeVersion = localeManager?.localeVersion?.collectAsState()

        val appContext = androidx.compose.ui.platform.LocalContext.current.applicationContext
        val crashlyticsHelper = remember { com.zaruda.app.core.CrashlyticsHelper() }
        LaunchedEffect(isAuthenticated) {
            if (isAuthenticated) {
                showAuthGate = false
                // Schedule daily plan expiry notification checks
                com.zaruda.app.core.schedulePlanExpiryChecks(appContext)
                // Set Crashlytics session context
                crashlyticsHelper.logBreadcrumb("SESSION", "User authenticated")
            } else {
                crashlyticsHelper.logBreadcrumb("SESSION", "User not authenticated")
            }
        }

        // Compute theme toggle once — directly toggles between LIGHT and DARK (skips SYSTEM)
        // so a single click always produces a visible change.
        val toggleTheme: () -> Unit = {
            themeVm.setThemeMode(if (themeMode == ThemeMode.DARK) ThemeMode.LIGHT else ThemeMode.DARK)
        }
        val setThemeMode: (ThemeMode) -> Unit = { mode -> themeVm.setThemeMode(mode) }

        // Unified notification bus — any screen can post a message via LocalSnackbarHostState
        val snackbarHostState = remember { androidx.compose.material3.SnackbarHostState() }

        // Provide activeCategoryKey, theme controller, locale manager, snackbar, and auth gate
        CompositionLocalProvider(
            LocalActiveCategoryKey provides activeCategoryKey,
            LocalOnOpenMore provides { showMoreDrawer = true },
            LocalAuthGate provides { if (!isAuthenticated) showAuthGate = true },
            LocalThemeController provides ThemeController(themeMode, toggleTheme, setThemeMode),
            LocalScrollToTopTrigger provides scrollToTopTrigger,
            LocalSnackbarHostState provides snackbarHostState,
            *listOfNotNull(
                localeManager?.let { LocalLocaleManager provides it },
            ).toTypedArray(),
        ) {

        LaunchedEffect(Unit) { onReady() }

        // Handle deep links
        LaunchedEffect(deepLinkUri) {
            if (deepLinkUri != null) {
                handleDeepLink(deepLinkUri, navController)
                onDeepLinkConsumed()
            }
        }

        // ── Session Expiry — Force re-auth ────────────────────────────────
        // Only monitor session expiry for REAL sessions (not demo/local).
        // Demo sessions have no JWT so API calls always 401 — that's expected.
        LaunchedEffect(Unit) {
            if (authViewModel.isDemoSession) {
                android.util.Log.d("SESSION_EXPIRY", "Demo session — skipping session expiry monitor entirely")
                return@LaunchedEffect
            }
            // Real session: watch for auth state becoming false without a stored session.
            // Track whether user was ever authenticated so we don't fire at startup.
            var hadAuth = false
            authViewModel.isAuthenticated.collect { authed ->
                val nowAuthed: Boolean = authed
                val nowHasSession: Boolean = authViewModel.hasSession
                android.util.Log.d("SESSION_EXPIRY", "Real session auth: authed=$nowAuthed hasSession=$nowHasSession hadAuth=$hadAuth")
                if (nowAuthed) hadAuth = true
                if (hadAuth && !nowAuthed && !nowHasSession) {
                    android.util.Log.w("SESSION_EXPIRY", "Real session expired! Redirecting to login.")
                    navController.navigate(Routes.AUTH_GRAPH) {
                        popUpTo(0) { inclusive = true }
                    }
                    Toast.makeText(
                        context,
                        "Session expired. Please sign in again.",
                        Toast.LENGTH_SHORT,
                    ).show()
                }
            }
        }

        val startDestination = Routes.MAIN_GRAPH
        var showingLaunch by remember { mutableStateOf(false) }

        if (showingLaunch) {
            BrandLaunchScreen(onFinished = { showingLaunch = false })
        } else {
            Column(modifier = Modifier.fillMaxSize()) {
                // Offline banner shown above all content
                if (connectivityObserver != null) {
                    OfflineBanner(connectivityObserver = connectivityObserver)
                }

                // Global snackbar host — fires notifications from any child screen
                Box(modifier = Modifier.fillMaxSize()) {
                    NavHost(
                        navController = navController,
                        startDestination = startDestination,
            enterTransition = { ZarudaMotion.pageEnter },
            exitTransition = { ZarudaMotion.pageExit },
            popEnterTransition = { ZarudaMotion.pagePopEnter },
            popExitTransition = { ZarudaMotion.pagePopExit },
        ) {
            // â”€â”€ Auth Graph â”€â”€
            navigation(startDestination = Routes.LOGIN, route = Routes.AUTH_GRAPH) {
                composable(Routes.LOGIN) {
                    LoginScreen(
                        onSignedIn = {
                            navController.navigate(Routes.MAIN_GRAPH) {
                                popUpTo(Routes.AUTH_GRAPH) { inclusive = true }
                            }
                        },
                        onForgotPassword = { navController.navigate(Routes.FORGOT_PASSWORD) { launchSingleTop = true } },
                        onSignUp = { navController.navigate(Routes.SIGNUP) { launchSingleTop = true } },
                        onBack = {
                            navController.navigate(Routes.MAIN_GRAPH) {
                                popUpTo(Routes.AUTH_GRAPH) { inclusive = true }
                            }
                        },
                    )
                }

                composable(Routes.FORGOT_PASSWORD) {
                    ForgotPasswordScreen(onBack = { navController.popBackStack() })
                }

                composable(Routes.SIGNUP) {
                    SignUpScreen(
                        onSignedUp = {
                            navController.navigate(Routes.MAIN_GRAPH) {
                                popUpTo(Routes.AUTH_GRAPH) { inclusive = true }
                            }
                        },
                        onBack = { navController.popBackStack() },
                        onSignIn = {
                            navController.popBackStack(Routes.LOGIN, inclusive = false)
                        },
                    )
                }

                composable(
                    route = Routes.RESET_PASSWORD,
                    arguments = listOf(navArgument("token") { type = NavType.StringType }),
                ) { entry ->
                    val token = entry.arguments?.getString("token").orEmpty()
                    ResetPasswordScreen(
                        token = token,
                        onBack = { navController.popBackStack() },
                        onGoToLogin = {
                            navController.popBackStack(Routes.LOGIN, inclusive = false)
                        },
                    )
                }
            }

            // â”€â”€ Main Graph (Bottom Nav) â”€â”€
            navigation(startDestination = Routes.HOME, route = Routes.MAIN_GRAPH) {
                composable(Routes.HOME) {
                    MainShell(navController = navController, selected = BottomTab.HOME, showTopBar = false, showBottomBar = false) {
                    CategoryHubScreen(
                        onOpenAllPosts = {
                            openAllPosts(null)
                        },
                        onSelectApp = { key ->
                            val safeKey = normalizeMarketplaceCategoryKey(key)
                            analytics.logEvent(
                                "launcher_enter_category",
                                Bundle().apply {
                                    putString("category_key", safeKey)
                                    putString("entry_type", "direct_card")
                                },
                            )
                            openCategoryApp(safeKey)
                        },
                        onOpenRecentlyViewed = { navController.navigate(Routes.RECENTLY_VIEWED) { launchSingleTop = true } },
                    )
                    }
                }

                composable(Routes.ALL_POSTS) {
                    MainShell(navController = navController, selected = BottomTab.ALL_POSTS, showTopBar = true) {
                        ExploreScreen(
                            onOpenPost = { id ->
                                navController.navigate(Routes.postDetail(id)) { launchSingleTop = true }
                            },
                            onBack = {
                                if (!navController.popBackStack()) {
                                    navController.navigate(Routes.HOME) {
                                        popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                                        launchSingleTop = true
                                    }
                                }
                            },
                            onOpenSearch = { navController.navigate(Routes.SEARCH) { launchSingleTop = true } },
                            onOpenHome = { navController.navigate(Routes.MY_POSTS) {
                                popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                                launchSingleTop = true
                            } },
                            onOpenProfile = { navController.navigate(Routes.PROFILE) { launchSingleTop = true } },
                            onOpenUser = { userId -> navController.navigate(Routes.userSoldPosts(userId)) { launchSingleTop = true } },
                            onOpenForYou = { navController.navigate(Routes.FOR_YOU) {
                                popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                                launchSingleTop = true
                            } },
                            onOpenCategories = { navController.navigate(Routes.CATEGORIES) { launchSingleTop = true } },
                            onOpenCompare = { navController.navigate(Routes.COMPARE) { launchSingleTop = true } },
                            onOpenCart = { navController.navigate(Routes.CART) { launchSingleTop = true } },
                            onOpenRewards = { navController.navigate(Routes.REWARDS) { launchSingleTop = true } },
                            onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) { launchSingleTop = true } },
                            onOpenRecentlyViewed = { navController.navigate(Routes.RECENTLY_VIEWED) { launchSingleTop = true } },
                            onOpenWishlist = { navController.navigate(Routes.WISHLIST) { launchSingleTop = true } },
                            onOpenTierSelection = { navController.navigate(Routes.TIER_SELECTION) { launchSingleTop = true } },
                            onOpenKyc = { navController.navigate(Routes.KYC) { launchSingleTop = true } },
                            currentThemeMode = themeMode,
                            onToggleTheme = toggleTheme,
                            showOwnTopBar = false,
                        )
                    }
                    }

                composable(Routes.FOR_YOU)  {
                    MainShell(navController = navController, selected = BottomTab.FOR_YOU, showTopBar = true) {
                        com.zaruda.app.ui.foryou.ForYouScreen(
                            onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                            onOpenSearch = { navController.navigate(Routes.SEARCH) { launchSingleTop = true } },
                            onOpenHome = { navController.navigate(Routes.MY_POSTS) {
                                popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                                launchSingleTop = true
                            } },
                            onOpenProfile = { navController.navigate(Routes.PROFILE) { launchSingleTop = true } },
                            onOpenForYou = {},
                            onOpenUser = { userId -> navController.navigate(Routes.userSoldPosts(userId)) { launchSingleTop = true } },
                            onOpenCategories = { navController.navigate(Routes.CATEGORIES) { launchSingleTop = true } },
                            onOpenCompare = { navController.navigate(Routes.COMPARE) { launchSingleTop = true } },
                            onOpenCart = { navController.navigate(Routes.CART) { launchSingleTop = true } },
                            onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) { launchSingleTop = true } },
                            onOpenRecentlyViewed = { navController.navigate(Routes.RECENTLY_VIEWED) { launchSingleTop = true } },
                            onOpenWishlist = { navController.navigate(Routes.WISHLIST) { launchSingleTop = true } },
                            onOpenTierSelection = { navController.navigate(Routes.TIER_SELECTION) { launchSingleTop = true } },
                            onOpenKyc = { navController.navigate(Routes.KYC) { launchSingleTop = true } },
                            currentThemeMode = themeMode,
                            onToggleTheme = toggleTheme,
                            showOwnTopBar = false,
                        )
                    }
                }

                composable(Routes.FEED) {
                    MainShell(navController = navController, selected = BottomTab.FEED, showTopBar = false) {
                        FeedScreen(
                            onOpenPost = { id -> navController.navigate(Routes.feedDetail(id)) { launchSingleTop = true } },
                            onCreatePost = { initialContent ->
                                navController.navigate(Routes.feedPostAdd(initialContent)) { launchSingleTop = true }
                            },
                            onOpenProfile = { userId -> navController.navigate(Routes.userSoldPosts(userId)) { launchSingleTop = true } },
                            onOpenMyFeed = { navController.navigate(Routes.MY_FEED) { launchSingleTop = true } },
                        )
                    }
                }

                composable(Routes.REWARDS) {
                    MainShell(navController = navController, selected = BottomTab.REWARDS) {
                        RewardsScreen(
                            onSignInRequired = {
                                navController.navigate(Routes.AUTH_GRAPH) {
                                    popUpTo(Routes.MAIN_GRAPH) { inclusive = true }
                                }
                            },
                            onBrowseMarketplace = { navController.navigate(Routes.ALL_POSTS) { launchSingleTop = true } },
                            onOpenReferralTree = { navController.navigate(Routes.REFERRAL_TREE) { launchSingleTop = true } },
                        )
                    }
                }

                composable(Routes.REFERRAL_TREE) {
                    MainShell(navController = navController, selected = BottomTab.REWARDS, topBarBack = { navController.popBackStack() }) {
                        ReferralTreeScreen(onBack = { navController.popBackStack() })
                    }
                }

                composable(Routes.PROFILE) {
                    MainShell(navController = navController, selected = BottomTab.PROFILE, showTopBar = false) {
                        ProfileScreen(
                            onSignedOut = {
                                authViewModel.logout()
                                navController.navigate(Routes.AUTH_GRAPH) {
                                    popUpTo(0) { inclusive = true }
                                }
                            },
                            onOpenSettings = { navController.navigate("settings") { launchSingleTop = true } },
                            onOpenMyPosts = { navController.navigate(Routes.MY_POSTS) { launchSingleTop = true } },
                            onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) { launchSingleTop = true } },
                            onOpenSecurity = { navController.navigate(Routes.SECURITY) { launchSingleTop = true } },
                            onOpenPayout = { navController.navigate(Routes.PAYOUT) { launchSingleTop = true } },
                            onOpenAccountDelete = { navController.navigate(Routes.ACCOUNT_DELETE) { launchSingleTop = true } },
                            onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                            onOpenOrders = { navController.navigate(Routes.ORDER_HISTORY) { launchSingleTop = true } },
                            onOpenSaleUndone = { navController.navigate(Routes.REPOST) { launchSingleTop = true } },
                            onOpenRecentlyViewed = { navController.navigate(Routes.RECENTLY_VIEWED) { launchSingleTop = true } },
                            onOpenEditProfile = { navController.navigate(Routes.EDIT_PROFILE) { launchSingleTop = true } },
                            onOpenLanguage = { navController.navigate(Routes.MORE) { launchSingleTop = true } },
                            onOpenHelp = { navController.navigate(Routes.HELP_SUPPORT) { launchSingleTop = true } },
                            onOpenKyc = { navController.navigate(Routes.KYC) { launchSingleTop = true } },
                            onOpenReferralTree = { navController.navigate(Routes.REFERRAL_TREE) { launchSingleTop = true } },
                            onOpenAbout = { navController.navigate(Routes.ABOUT_US) { launchSingleTop = true } },
                            onOpenTerms = { navController.navigate(Routes.TERMS) { launchSingleTop = true } },
                            onOpenPrivacy = { navController.navigate(Routes.PRIVACY) { launchSingleTop = true } },
                        )
                    }
                }

                composable(Routes.EDIT_PROFILE) {
                    val profileVm: ProfileViewModel = hiltViewModel()
                    val pState by profileVm.state.collectAsState()
                    EditProfileScreen(
                        user = pState.user,
                        saving = pState.editSaving,
                        saveError = pState.editError,
                        onDismiss = { navController.popBackStack() },
                        onSave = { name, phone, bio, loc, socialLinks, minP, maxP, cats ->
                            profileVm.updateProfile(name, phone, bio) {
                                socialLinks?.let { profileVm.updateSocialLinks(it) }
                                navController.popBackStack()
                            }
                        },
                        onUploadAvatar = { uri -> profileVm.uploadAvatar(context, uri) },
                        onUploadCover = { uri -> profileVm.uploadCoverImage(context, uri) },
                    )
                }

                // Settings Route
                composable("settings") {
                    com.zaruda.app.ui.profile.SettingsScreen(onBack = { navController.popBackStack() })
                }

                // Profile Sub-Screens
                composable(Routes.ORDER_HISTORY) {
                    OrderHistoryScreen(
                        onBack = { navController.popBackStack() },
                        onOpenOrderDetail = { orderId ->
                            navController.navigate(Routes.orderDetail(orderId)) { launchSingleTop = true }
                        },
                    )
                }

                composable(Routes.ORDER_DETAIL) { backStackEntry ->
                    val orderId = backStackEntry.arguments?.getString("orderId") ?: ""
                    OrderDetailScreen(
                        orderId = orderId,
                        onBack = { navController.popBackStack() },
                    )
                }

                composable(Routes.ADDRESS_BOOK) {
                    AddressBookScreen(
                        onBack = { navController.popBackStack() },
                        onAddAddress = { navController.navigate(Routes.ADDRESS_ADD) { launchSingleTop = true } },
                        onEditAddress = { addressId ->
                            navController.navigate(Routes.addressEdit(addressId)) { launchSingleTop = true }
                        },
                    )
                }

                composable(Routes.ADDRESS_ADD) {
                    AddressFormScreen(
                        onBack = { navController.popBackStack() },
                    )
                }

                composable(Routes.ADDRESS_EDIT) { backStackEntry ->
                    val addressId = backStackEntry.arguments?.getString("addressId")
                    AddressFormScreen(
                        addressId = addressId,
                        onBack = { navController.popBackStack() },
                    )
                }

                // MORE redirect to settings page
                composable(Routes.MORE) {
                    LaunchedEffect(Unit) {
                        navController.navigate("settings") {
                            popUpTo(Routes.MORE) { inclusive = true }
                        }
                    }
                }

                composable(Routes.NOTIFICATIONS) {
                    MainShell(navController = navController, selected = BottomTab.PROFILE, showTopBar = false) {
                        NotificationsScreen(
                            onBack = { navController.popBackStack() },
                            onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                            onOpenSale = { tab -> navController.navigate(Routes.saleDoneTab(tab)) { launchSingleTop = true } },
                        )
                    }
                }

                composable(Routes.WISHLIST) {
                    MainShell(navController = navController, selected = BottomTab.PROFILE, showTopBar = false) {
                        val catKey = LocalActiveCategoryKey.current
                        // Wishlist is category-scoped: when opened from a category app it
                        // only shows that category's saved items.
                        WishlistScreen(onBack = { navController.popBackStack() }, onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } }, categoryKey = catKey)
                    }
                }
            }

            // ── Full-Screen Routes ──
                composable(
                    route = Routes.POST_DETAIL,
                    arguments = listOf(navArgument("postId") { type = NavType.StringType }),
                ) {
                    PostDetailScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                    onOpenCategory = { key -> openCategoryApp(key) },
                    onOpenCentre = { id -> navController.navigate(Routes.centreDetail(id)) { launchSingleTop = true } },
                    onOpenSale = { postId, sellerId ->
                        navController.navigate(Routes.checkout(postId, 0.0)) { launchSingleTop = true }
                    },
                    onOpenUser = { userId -> navController.navigate(Routes.userSoldPosts(userId)) { launchSingleTop = true } },
                )
            }

            composable(
                route = "${Routes.SEARCH}?query={query}&category={category}",
                arguments = listOf(
                    androidx.navigation.navArgument("query") { defaultValue = ""; nullable = true },
                    androidx.navigation.navArgument("category") { defaultValue = ""; nullable = true },
                ),
            ) { backStack ->
                val prefillQuery = backStack.arguments?.getString("query") ?: ""
                val scopedCategory = backStack.arguments?.getString("category")?.takeIf { it.isNotBlank() }
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS, showTopBar = false, topBarBack = { navController.popBackStack() }) {
                    SearchScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                        prefillQuery = prefillQuery,
                        scopedCategory = scopedCategory,
                    )
                }
            }

            composable(Routes.LOCATION_SELECTION) {
                com.zaruda.app.ui.location.LocationSelectionScreen(
                    onBack = { navController.popBackStack() },
                    onSelect = { city ->
                        appLocationVm.selectCity(city.name, city.lat, city.lng)
                        navController.popBackStack()
                    },
                )
            }

            composable(Routes.CATEGORIES) {
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS, showTopBar = false, topBarBack = { navController.popBackStack() }) {
                    CategoriesScreen(
                        onBack = { navController.popBackStack() },
                        onCategoryClick = { _, name ->
                            openCategoryApp(name)
                        },
                    )
                }
            }

            composable(Routes.SUBCATEGORIES) {
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS, showTopBar = false, topBarBack = { navController.popBackStack() }) {
                    com.zaruda.app.ui.discovery.SubcategoriesScreen(
                        onBack = { navController.popBackStack() },
                        onOpenCategory = { catKey -> openCategoryApp(catKey) },
                    )
                }
            }

            composable(Routes.CREATE_POST) {
                CreatePostScreen(
                    onBack = { navController.popBackStack() },
                    onPublished = { navController.popBackStack() },
                )
            }

            composable(Routes.MY_POSTS) {
                MainShell(
                    navController = navController,
                    selected = BottomTab.PROFILE,
                    showTopBar = false,
                ) {
                    MyPostsScreen(
                        onBack = {
                            navController.navigate(Routes.ALL_POSTS) {
                                popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                                launchSingleTop = true
                            }
                        },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                        onCreatePost = { navController.navigate(Routes.CREATE_POST) { launchSingleTop = true } },
                        onEditPost = { id -> navController.navigate(Routes.editPost(id)) { launchSingleTop = true } },
                        onOpenSaleHub = { navController.navigate(Routes.SALE_DONE) { launchSingleTop = true } },
                        onOpenComplaints = { navController.navigate(Routes.COMPLAINTS) { launchSingleTop = true } },
                    )
                }
            }

            composable(Routes.KYC) {
                KycScreen(
                    onBack = { navController.popBackStack() },
                    onNavigateToAadhaarVerify = { navController.navigate(Routes.AADHAAR_VERIFY) }
                )
            }

            composable(Routes.AADHAAR_VERIFY) {
                com.zaruda.app.ui.kyc.AadhaarVerifyScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.GET_VERIFIED) {
                com.zaruda.app.ui.kyc.GetVerifiedScreen(
                    onBack = { navController.popBackStack() },
                    onDone = { navController.popBackStack() },
                )
            }

            composable(Routes.NOTIFICATION_PREFS) {
                com.zaruda.app.ui.notifications.NotificationPrefsScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.CATEGORY_MODE) {
                com.zaruda.app.ui.home.CategoryModeScreen(
                    onBack = { navController.popBackStack() },
                    onSelectApp = { appKey ->
                        if (appKey.isNotBlank()) {
                            openCategoryApp(appKey)
                        } else {
                            navController.popBackStack()
                        }
                    },
                )
            }

            


            // â”€â”€ Commerce â”€â”€
            composable(Routes.POST_WELCOME) {
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS, topBarBack = { navController.popBackStack() }) {
                    PostWelcomeScreen(
                        onBack = { navController.popBackStack() },
                        onStartPost = { navController.navigate(Routes.CREATE_POST) { launchSingleTop = true } },
                    )
                }
            }

            composable(
                route = Routes.EDIT_POST,
                arguments = listOf(navArgument("postId") { type = NavType.StringType }),
            ) { entry ->
                val postId = entry.arguments?.getString("postId").orEmpty()
                EditPostScreen(postId = postId, onBack = { navController.popBackStack() })
            }

            composable(Routes.TIER_SELECTION) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, topBarBack = { navController.popBackStack() }) {
                    TierSelectionScreen(onBack = { navController.popBackStack() })
                }
            }

            composable(Routes.SCANNER) {
                com.zaruda.app.ui.scanner.ScannerScreen(
                    onBack = { navController.popBackStack() },
                    onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                    onSearch = { query ->
                        navController.navigate("search?query=$query") { launchSingleTop = true }
                    },
                )
            }

            composable(
                route = Routes.CATEGORY_DETAIL,
                arguments = listOf(navArgument("categoryKey") { type = NavType.StringType }),
            ) { entry ->
                val key = entry.arguments?.getString("categoryKey").orEmpty().ifBlank { null }
                LaunchedEffect(key) {
                    activeCategoryKey = key
                    // Proactively refresh token when entering a category, so API calls
                    // below don't trigger a 401 → TokenRefreshAuthenticator cascade.
                    if (authViewModel.hasSession && !authViewModel.isAuthenticated.value) {
                        authViewModel.tryRefreshToken()
                    }
                }
                CompositionLocalProvider(LocalActiveCategoryKey provides key) {
                    MainShell(navController = navController, selected = BottomTab.ALL_POSTS, showTopBar = true, topBarBack = { navController.popBackStack() }) {
                        ExploreScreen(
                            onOpenPost = { id ->
                                navController.navigate(Routes.postDetail(id)) { launchSingleTop = true }
                            },
                            onBack = {
                                if (!navController.popBackStack()) {
                                    navController.navigate(Routes.HOME) {
                                        popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                                        launchSingleTop = true
                                    }
                                }
                            },
                            // Search opened from INSIDE a category app — keep the category
                            // scope so results never bleed into other categories.
                            onOpenSearch = { q ->
                                val base = if (q.isNullOrBlank()) Routes.SEARCH else "search?query=$q"
                                val scoped = if (key.isNullOrBlank()) base else
                                    if (q.isNullOrBlank()) "$base?category=$key" else "$base&category=$key"
                                navController.navigate(scoped) { launchSingleTop = true }
                            },
                            onOpenHome = { navController.navigate(Routes.MY_POSTS) {
                                popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                                launchSingleTop = true
                            } },
                            onOpenProfile = { navController.navigate(Routes.PROFILE) { launchSingleTop = true } },
                            onOpenUser = { userId -> navController.navigate(Routes.userSoldPosts(userId)) { launchSingleTop = true } },
                            onOpenForYou = { navController.navigate(Routes.FOR_YOU) {
                                popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                                launchSingleTop = true
                            } },
                            onOpenCategories = { navController.navigate(Routes.CATEGORIES) { launchSingleTop = true } },
                            onOpenCompare = { navController.navigate(Routes.COMPARE) { launchSingleTop = true } },
                            onOpenCart = { navController.navigate(Routes.CART) { launchSingleTop = true } },
                            onOpenRewards = { navController.navigate(Routes.REWARDS) { launchSingleTop = true } },
                            onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) { launchSingleTop = true } },
                            onOpenRecentlyViewed = { navController.navigate(Routes.RECENTLY_VIEWED) { launchSingleTop = true } },
                            onOpenWishlist = { navController.navigate(Routes.WISHLIST) { launchSingleTop = true } },
                            onOpenTierSelection = { navController.navigate(Routes.TIER_SELECTION) { launchSingleTop = true } },
                            onOpenKyc = { navController.navigate(Routes.KYC) { launchSingleTop = true } },
                            currentThemeMode = themeMode,
                            onToggleTheme = toggleTheme,
                            showOwnTopBar = false,
                        )
                    }
                }
            }

            composable(Routes.BOUGHT_POSTS) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, topBarBack = { navController.popBackStack() }) {
                    BoughtPostsScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                    )
                }
            }

            composable(Routes.SOLD_POSTS) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, topBarBack = { navController.popBackStack() }) {
                    SoldPostsScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                    )
                }
            }

            composable(Routes.USER_SOLD_POSTS) { backStackEntry ->
                val userId = backStackEntry.arguments?.getString("userId") ?: return@composable
                MainShell(navController = navController, selected = BottomTab.PROFILE, topBarBack = { navController.popBackStack() }) {
                    SoldPostsScreen(
                        userId = userId,
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                    )
                }
            }



            composable(
                route = Routes.SALE_DONE,
                arguments = listOf(
                    navArgument("tab") { type = NavType.IntType; defaultValue = 0 },
                ),
            ) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, showTopBar = false) {
                    SaleDoneScreen(onBack = {
                        navController.navigate(Routes.ALL_POSTS) {
                            popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                            launchSingleTop = true
                        }
                    })
                }
            }

            composable(
                route = Routes.SALE_DONE_WITH,
                arguments = listOf(
                    navArgument("postId") { type = NavType.StringType },
                    navArgument("sellerId") { type = NavType.StringType },
                ),
            ) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, showTopBar = false) {
                    SaleDoneScreen(onBack = {
                        navController.navigate(Routes.ALL_POSTS) {
                            popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                            launchSingleTop = true
                        }
                    })
                }
            }

            composable(Routes.REPOST) {
                MainShell(
                    navController = navController,
                    selected = BottomTab.PROFILE,
                    topBarBack = {
                        navController.navigate(Routes.ALL_POSTS) {
                            popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                            launchSingleTop = true
                        }
                    },
                ) {
                    RepostScreen(onBack = {
                        navController.navigate(Routes.ALL_POSTS) {
                            popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                            launchSingleTop = true
                        }
                    })
                }
            }

            composable(Routes.NEARBY) {
                com.zaruda.app.ui.nearby.NearbyScreen(
                    onBack = { navController.popBackStack() },
                    onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                )
            }

            composable(
                route = Routes.EXPIRY_ACTION,
                arguments = listOf(androidx.navigation.navArgument("postId") { type = androidx.navigation.NavType.StringType }),
            ) {
                ExpiryActionScreen(
                    postId = it.arguments?.getString("postId").orEmpty(),
                    onBack = { navController.popBackStack() },
                )
            }

            composable(Routes.PAYMENT) {
                PaymentScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.CART) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, showTopBar = false, topBarBack = { navController.popBackStack() }) {
                    val catKey = LocalActiveCategoryKey.current
                    CartScreen(
                        onBack = { navController.popBackStack() },
                        categoryKey = catKey,
                        onCheckout = {
                            navController.navigate(Routes.checkout("cart", 0.0)) { launchSingleTop = true }
                        },
                    )
                }
            }

            composable(
                route = Routes.CHECKOUT,
                arguments = listOf(
                    navArgument("postId") { type = NavType.StringType; defaultValue = "cart" },
                    navArgument("amount") { type = NavType.StringType; defaultValue = "0.0" },
                ),
            ) { backStack ->
                val checkoutVm: com.zaruda.app.ui.checkout.CheckoutViewModel = hiltViewModel(backStack)
                val checkoutState by checkoutVm.state.collectAsState()
                val amountStr = backStack.arguments?.getString("amount") ?: "0.0"
                val amount = amountStr.toDoubleOrNull() ?: 0.0

                var checkoutStep by remember { mutableStateOf(0) }

                when (checkoutStep) {
                    0 -> com.zaruda.app.ui.checkout.CheckoutAddressScreen(
                        onBack = { navController.popBackStack() },
                        onNext = { name, phone, address ->
                            checkoutVm.setDeliveryDetails(name, phone, address)
                            checkoutStep = 1
                        },
                    )
                    1 -> com.zaruda.app.ui.checkout.CheckoutPaymentScreen(
                        onBack = { checkoutStep = 0 },
                        onNext = { method ->
                            checkoutVm.setPaymentMethod(method)
                            checkoutStep = 2
                        },
                    )
                    else -> com.zaruda.app.ui.checkout.CheckoutReviewScreen(
                        address = checkoutState.address.ifBlank { "Delivery Address" },
                        paymentMethod = checkoutState.paymentMethod,
                        cartSubtotal = if (amount > 0) amount else 500.0,
                        onBack = { checkoutStep = 1 },
                        onPlaceOrder = { placedId ->
                            val id = placedId ?: checkoutState.orderNumber ?: checkoutState.orderId ?: "ZRD-INAPP"
                            navController.navigate(Routes.checkoutConfirm(id)) {
                                popUpTo(Routes.CHECKOUT) { inclusive = true }
                            }
                        },
                        onOrderFailed = {},
                        viewModel = checkoutVm,
                    )
                }
            }

            composable(
                route = Routes.CHECKOUT_CONFIRM,
                arguments = listOf(
                    navArgument("orderId") { type = NavType.StringType; nullable = true; defaultValue = null },
                ),
            ) { backStack ->
                val orderId = backStack.arguments?.getString("orderId")
                com.zaruda.app.ui.checkout.OrderConfirmationScreen(
                    orderId = orderId,
                    handoverOtp = backStack.arguments?.getString("orderId")?.takeIf { it.startsWith("OTP") } ?: "739201",
                    onContinueShopping = {
                        navController.navigate(Routes.HOME) {
                            popUpTo(Routes.HOME) { inclusive = false }
                        }
                    },
                    onViewOrder = {
                        navController.navigate(Routes.BOUGHT_POSTS) {
                            popUpTo(Routes.HOME) { inclusive = false }
                        }
                    },
                )
            }

            composable(Routes.RECENTLY_VIEWED) {
                // Main app (outside the 4 category apps) shows ALL categories' recently viewed
                // items. Pass null explicitly so a stale category key from a previous category
                // app visit can't scope it by accident.
                RecentlyViewedScreen(
                    onBack = { navController.popBackStack() },
                    onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                    onOpenFeed = { id -> navController.navigate(Routes.feedDetail(id)) { launchSingleTop = true } },
                    onWishlist = { navController.navigate(Routes.WISHLIST) { launchSingleTop = true } },
                    onRewards = { navController.navigate(Routes.REWARDS) { launchSingleTop = true } },
                    onNotifications = { navController.navigate(Routes.NOTIFICATIONS) { launchSingleTop = true } },
                    onCart = { navController.navigate(Routes.CART) { launchSingleTop = true } },
                    currentThemeMode = themeMode,
                    onToggleTheme = toggleTheme,
                    onLanguage = { },
                    categoryKey = null,
                )
            }

            composable(Routes.SAVED_SEARCHES) {
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS) {
                    SavedSearchesScreen(onBack = { navController.popBackStack() }, onRunSearch = { q -> navController.navigate("search?query=${q}") })
                }
            }

            composable(Routes.COMPARE) {
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS, topBarBack = { navController.popBackStack() }) {
                    CompareScreen(onBack = { navController.popBackStack() })
                }
            }

            // â”€â”€ Social â”€â”€
            composable(
                route = Routes.FEED_DETAIL,
                arguments = listOf(navArgument("feedId") { type = NavType.StringType }),
            ) { entry ->
                val feedId = entry.arguments?.getString("feedId").orEmpty()
                FeedDetailScreen(feedId = feedId, onBack = { navController.popBackStack() })
            }

            composable(Routes.MY_FEED) {
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS, topBarBack = { navController.popBackStack() }) {
                    MyFeedScreen(
                        onBack = { navController.popBackStack() },
                        onCreatePost = {
                            navController.navigate(Routes.FEED_POST_ADD) { launchSingleTop = true }
                        },
                    )
                }
            }

            composable(
                route = Routes.FEED_POST_ADD,
                arguments = listOf(androidx.navigation.navArgument("initialContent") { type = androidx.navigation.NavType.StringType; defaultValue = "" }),
            ) { backStackEntry ->
                val initialContent = backStackEntry.arguments?.getString("initialContent")?.let {
                    java.net.URLDecoder.decode(it, "UTF-8")
                } ?: ""
                FeedPostAddScreen(
                    initialContent = initialContent,
                    onBack = { navController.popBackStack() },
                )
            }

            composable(Routes.PUBLIC_WALL) {
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS, topBarBack = { navController.popBackStack() }) {
                    PublicWallScreen(onBack = { navController.popBackStack() })
                }
            }

            // Chat route removed in favor of direct buyer-seller notification alerts

            composable(Routes.COMPLAINTS) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, topBarBack = { navController.popBackStack() }) {
                    ComplaintsScreen(onBack = { navController.popBackStack() })
                }
            }

            composable(Routes.FEEDBACK) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, topBarBack = { navController.popBackStack() }) {
                    FeedbackScreen(onBack = { navController.popBackStack() })
                }
            }

            composable(
                route = Routes.RATINGS,
                arguments = listOf(navArgument("userId") { type = NavType.StringType }),
            ) { entry ->
                val userId = entry.arguments?.getString("userId").orEmpty()
                RatingsScreen(userId = userId, onBack = { navController.popBackStack() })
            }

            // ── Account ──
            composable(Routes.DASHBOARD) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, showTopBar = false) {
                    DashboardScreen(onBack = { navController.popBackStack() })
                }
            }

            composable(Routes.SECURITY) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, showTopBar = false) {
                    SecurityScreen(onBack = { navController.popBackStack() })
                }
            }

            composable(Routes.PAYOUT) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, showTopBar = false) {
                    PayoutScreen(onBack = { navController.popBackStack() })
                }
            }

            composable(Routes.ACCOUNT_DELETE) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, showTopBar = false) {
                    AccountDeleteScreen(onBack = { navController.popBackStack() })
                }
            }

            composable(Routes.VERIFICATION) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, showTopBar = false) {
                    VerificationScreen(onBack = { navController.popBackStack() })
                }
            }

            composable(Routes.ANALYTICS) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, showTopBar = false) {
                    AnalyticsScreen(onBack = { navController.popBackStack() })
                }
            }

            // ── Channels ──
            composable(Routes.CHANNELS) {
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS, topBarBack = { navController.popBackStack() }) {
                    ChannelsListScreen(
                        onBack = { navController.popBackStack() },
                        onOpenChannel = { id -> navController.navigate(Routes.channelDetail(id)) { launchSingleTop = true } },
                        onCreateChannel = { navController.navigate(Routes.CHANNEL_CREATE) { launchSingleTop = true } },
                    )
                }
            }

            composable(Routes.CHANNEL_CREATE) {
                CreateChannelScreen(onBack = { navController.popBackStack() })
            }

            composable(
                route = Routes.CHANNEL_DETAIL,
                arguments = listOf(navArgument("channelId") { type = NavType.StringType }),
            ) { entry ->
                val channelId = entry.arguments?.getString("channelId").orEmpty()
                ChannelDetailScreen(channelId = channelId, onBack = { navController.popBackStack() })
            }

            composable(Routes.CENTRE_LIST) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, topBarBack = { navController.popBackStack() }) {
                    CentreListScreen(
                        onBack = { navController.popBackStack() },
                        onOpenCentre = { id -> navController.navigate(Routes.centreDetail(id)) { launchSingleTop = true } },
                        onCreateCentre = { navController.navigate(Routes.CENTRE_CREATE) { launchSingleTop = true } },
                    )
                }
            }

            composable(Routes.CENTRE_CREATE) {
                CreateCentreScreen(
                    onBack = { navController.popBackStack() },
                    onNavigateToPremium = { navController.navigate(Routes.TIER_SELECTION) { launchSingleTop = true } },
                )
            }

            composable(
                route = Routes.CENTRE_DETAIL,
                arguments = listOf(navArgument("centreId") { type = NavType.StringType }),
            ) { entry ->
                val centreId = entry.arguments?.getString("centreId").orEmpty()
                CentreDetailScreen(centreId = centreId, onBack = { navController.popBackStack() })
            }

            composable(
                route = Routes.CENTRE_LISTINGS,
                arguments = listOf(navArgument("centreId") { type = NavType.StringType }),
            ) { entry ->
                val centreId = entry.arguments?.getString("centreId").orEmpty()
                CentreListingsScreen(centreId = centreId, onBack = { navController.popBackStack() })
            }

            val safePopBack: () -> Unit = {
                if (!navController.popBackStack()) {
                    navController.navigate(Routes.HOME) { launchSingleTop = true }
                }
            }

            // ── Static & Legal Pages ──
            composable(Routes.ABOUT_US) {
                com.zaruda.app.ui.staticpages.AboutUsScreen(onBack = safePopBack)
            }

            composable(Routes.CONTACT_US) {
                com.zaruda.app.ui.staticpages.ContactUsScreen(onBack = safePopBack)
            }

            composable(Routes.FAQ) {
                com.zaruda.app.ui.staticpages.FAQScreen(onBack = safePopBack)
            }

            composable(Routes.SHIPPING_POLICY) {
                com.zaruda.app.ui.legal.ShippingPolicyScreen(onBack = safePopBack)
            }

            composable(Routes.TERMS) {
                TermsScreen(onBack = safePopBack)
            }

            composable(Routes.PRIVACY) {
                PrivacyScreen(onBack = safePopBack)
            }

            composable(Routes.REFUND) {
                RefundScreen(onBack = safePopBack)
            }

            composable(Routes.HELP_SUPPORT) {
                HelpSupportScreen(
                    onBack = safePopBack,
                    onOpenFeedback = { navController.navigate(Routes.FEEDBACK) { launchSingleTop = true } },
                    onOpenComplaints = { navController.navigate(Routes.COMPLAINTS) { launchSingleTop = true } },
                )
            }

            composable(Routes.ADMIN_PANEL) {
                AdminPanelScreen(onBack = safePopBack)
            }

            composable(
                route = Routes.INVITE,
                arguments = listOf(navArgument("code") { type = NavType.StringType }),
            ) { entry ->
                val code = entry.arguments?.getString("code").orEmpty()
                InviteScreen(code = code, onBack = safePopBack)
            }

        } // end NavHost

                // Global snackbar host overlay (bottom-center)
                androidx.compose.material3.SnackbarHost(
                    hostState = snackbarHostState,
                    modifier = Modifier
                        .align(androidx.compose.ui.Alignment.BottomCenter)
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .navigationBarsPadding(),
                    snackbar = { data ->
                        androidx.compose.material3.Snackbar(
                            snackbarData = data,
                            containerColor = MaterialTheme.colorScheme.inverseSurface,
                            contentColor = MaterialTheme.colorScheme.inverseOnSurface,
                            shape = RoundedCornerShape(12.dp),
                        )
                    },
                )
            }
        }

        // â”€â”€ Auth Gate Popup (app-level overlay) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        com.zaruda.app.core.AuthGatePopup(
            visible = showAuthGate,
            onSignIn = { showAuthGate = false; navController.navigate(Routes.LOGIN) { launchSingleTop = true } },
            onCreateAccount = { showAuthGate = false; navController.navigate(Routes.SIGNUP) { launchSingleTop = true } },
            onDismiss = { showAuthGate = false },
        )

        // â”€â”€ More Drawer Overlay (app-level) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        androidx.compose.animation.AnimatedVisibility(
            visible = showMoreDrawer,
            enter = androidx.compose.animation.slideInHorizontally(
                initialOffsetX = { it },
                animationSpec = androidx.compose.animation.core.tween(280, easing = androidx.compose.animation.core.FastOutSlowInEasing),
            ) + fadeIn(androidx.compose.animation.core.tween(200)),
            exit = androidx.compose.animation.slideOutHorizontally(
                targetOffsetX = { it },
                animationSpec = androidx.compose.animation.core.tween(220),
            ) + fadeOut(androidx.compose.animation.core.tween(150)),
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.35f))
                        .clickable(
                            indication = null,
                            interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() },
                        ) { showMoreDrawer = false },
                )
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(0.88f)
                        .align(Alignment.CenterEnd)
                        .background(
                            MaterialTheme.colorScheme.surface,
                            shape = RoundedCornerShape(topStart = 20.dp, bottomStart = 20.dp),
                        )
                        
                ) {
                    // Helper: navigate from More drawer — pops to main graph so back navigation
                    // always returns to the tab you were on (no stuck states).
                    val drawerNav: (String) -> Unit = { route ->
                        showMoreDrawer = false
                        navController.navigate(route) {
                            launchSingleTop = true
                        }
                    }
                    MoreScreen(
                        onDismiss = { showMoreDrawer = false },
                        onOpenWishlist = { drawerNav(Routes.WISHLIST) },
                        onOpenCreatePost = { drawerNav(Routes.POST_WELCOME) },

                        onOpenTierSelection = { drawerNav(Routes.TIER_SELECTION) },
                        onOpenMyHome = { drawerNav(Routes.MY_HOME) },
                        onOpenSaleUndone = { drawerNav(Routes.REPOST) },
                        onOpenNearby = { drawerNav(Routes.NEARBY) },
                        onOpenPublicWall = { drawerNav(Routes.PUBLIC_WALL) },
                        onOpenFeedback = { drawerNav(Routes.FEEDBACK) },
                        onOpenComplaints = { drawerNav(Routes.COMPLAINTS) },
                        onOpenProfile = { drawerNav(Routes.PROFILE) },
                        onOpenAdminPanel = { drawerNav(Routes.ADMIN_PANEL) },
                        onOpenHelp = { drawerNav(Routes.HELP_SUPPORT) },
                        onOpenRewards = { drawerNav(Routes.REWARDS) },
                        onOpenKyc = { drawerNav(Routes.KYC) },
                        onOpenLogin = { showMoreDrawer = false; navController.navigate(Routes.LOGIN) { launchSingleTop = true } },
                        onOpenMyFeed = { drawerNav(Routes.MY_FEED) },
                        onLogout = {
                            showMoreDrawer = false
                            authViewModel.logout()
                            navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } }
                        },
                        onLanguageChange = { code -> localeManager?.setLocale(code) },
                        isAdmin = isAdmin,
                        isLoggedIn = isAuthenticated,
                        isDemoSession = authViewModel.isDemoSession,
                        currentThemeMode = themeMode,
                        onSetThemeMode = { themeVm.setThemeMode(it) },
                    )
                }
            }
        }
    }

        } // close CompositionLocalProvider
    }
}

/**
 * CompositionLocal exposing the currently-active category key (e.g. "electronics") from ZarudaApp
 * down to all composables. Ensures MainShell's bottom-bar navigation logic always sees the
 * latest category context regardless of which route composed it. Without this, navigating
 * Profile â†’ AllPosts loses category context and shows an empty feed.
 */
data class ThemeController(
    val currentThemeMode: ThemeMode,
    val onToggleTheme: () -> Unit,
    val onSetThemeMode: (ThemeMode) -> Unit,
)

val LocalThemeController = compositionLocalOf<ThemeController> {
    ThemeController(ThemeMode.SYSTEM, {}, {})
}

val LocalActiveCategoryKey = staticCompositionLocalOf<String?> { null }
val LocalOnOpenMore = staticCompositionLocalOf<() -> Unit> { {} }
val LocalAuthGate = staticCompositionLocalOf<() -> Unit> { {} }
/**
 * Scroll-to-top trigger: increments each time the current tab is re-tapped.
 * Screens observing this Int can scroll to top when it changes. (Checklist #6.6)
 */
val LocalScrollToTopTrigger = staticCompositionLocalOf<Int> { 0 }
val LocalSnackbarHostState = staticCompositionLocalOf<androidx.compose.material3.SnackbarHostState> {
    androidx.compose.material3.SnackbarHostState()
}

enum class BottomTab(
    val route: String,
    val labelRes: Int,
    val iconOutlined: ImageVector,
    val iconFilled: ImageVector,
) {
    HOME(Routes.HOME, R.string.nav_home, Icons.Outlined.Home, Icons.Filled.Home),
    ALL_POSTS(Routes.ALL_POSTS, R.string.nav_explore, Icons.Outlined.Search, Icons.Filled.Search),
    FOR_YOU(Routes.FOR_YOU, R.string.nav_for_you, Icons.Outlined.AutoAwesome, Icons.Filled.AutoAwesome),
    FEED(Routes.FEED, R.string.nav_feed, Icons.Outlined.Forum, Icons.Filled.Forum),
    REWARDS(Routes.REWARDS, R.string.nav_rewards, Icons.Outlined.EmojiEvents, Icons.Filled.EmojiEvents),
    PROFILE(Routes.PROFILE, R.string.nav_profile, Icons.Outlined.Person, Icons.Filled.Person),
}

@Composable
fun MainShell(
    navController: NavHostController,
    selected: BottomTab,
    showTopBar: Boolean = true,
    showBottomBar: Boolean = true,
    /** Hide the search capsule inside the top bar — the top bar is identical across
     *  all pages (location chip + action icons only); screens like Marketplace render
     *  their own search bar directly below the top bar instead of a capsule up top. */
    showTopBarSearch: Boolean = false,
    /** Show a back arrow in the top bar (pushed sub-pages). Same bar everywhere. */
    topBarBack: (() -> Unit)? = null,
    showSellFab: Boolean = true,
    activeCategoryKey: String? = null,
    onOpenMore: () -> Unit = {},
    content: @Composable () -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(
            topBar = {
                if (showTopBar) {
                val themeCtl = LocalThemeController.current
                val appLocationVm: com.zaruda.app.ui.location.AppLocationViewModel = hiltViewModel()
                val currentCity by appLocationVm.currentCity.collectAsState()
                val currentArea by appLocationVm.currentArea.collectAsState()
                val currentPincode by appLocationVm.currentPincode.collectAsState()
                val displayLocationText = remember(currentCity, currentArea, currentPincode) {
                    if (currentArea.isNotBlank() && currentPincode.isNotBlank()) {
                        "$currentArea $currentPincode"
                    } else if (currentPincode.isNotBlank() && currentCity.isNotBlank() && currentCity != "Detecting...") {
                        "$currentCity $currentPincode"
                    } else if (currentPincode.isNotBlank()) {
                        currentPincode
                    } else if (currentArea.isNotBlank() && currentArea != currentCity) {
                        "$currentArea, $currentCity"
                    } else if (currentCity.isNotBlank() && currentCity != "Detecting...") {
                        currentCity
                    } else {
                        "Detecting..."
                    }
                }
                val isDetecting by appLocationVm.isDetecting.collectAsState()
                ZarudaTopBar(
                    onSearch = { navController.navigate(Routes.SEARCH) { launchSingleTop = true } },
                    onWishlist = { navController.navigate(Routes.WISHLIST) { launchSingleTop = true } },
                    onRecentlyViewed = { navController.navigate(Routes.RECENTLY_VIEWED) { launchSingleTop = true } },
                    currentThemeMode = themeCtl.currentThemeMode,
                    onToggleTheme = themeCtl.onToggleTheme,
                    onNotifications = { navController.navigate(Routes.NOTIFICATIONS) { launchSingleTop = true } },
                    onCart = { navController.navigate(Routes.CART) { launchSingleTop = true } },
                    onProfile = { navController.navigate(Routes.PROFILE) { launchSingleTop = true } },
                    onLocationClick = { navController.navigate(Routes.LOCATION_SELECTION) { launchSingleTop = true } },
                    onLocationRefresh = { appLocationVm.detectLocation(force = true) },
                    isLocationDetecting = isDetecting,
                    locationText = displayLocationText,
                    showSearch = showTopBarSearch,
                    onBack = topBarBack,
                )
                }
            },
            bottomBar = {
                if (showBottomBar) {
                val openMore = LocalOnOpenMore.current
                val navigateToTab: (BottomTab) -> Unit = { tab ->
                    // If re-tapping current tab, trigger scroll-to-top via CompositionLocal (Checklist #6.6)
                    // The parent ZarudaApp increments the trigger; screens observe via LocalScrollToTopTrigger
                    navController.navigate(tab.route) {
                        popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                        launchSingleTop = true
                    }
                }
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(elevation = ZarudaElevation.bottomBar, shape = ZarudaShapes.bottomBar),
                    shape = ZarudaShapes.bottomBar,
                    color = MaterialTheme.colorScheme.surface,
                    tonalElevation = 0.dp,
                ) {
                    // Full-bleed bottom bar: the navigation-bar inset lives INSIDE the surface
                    // so the surface color extends to the very bottom of the screen (no dark
                    // gap under the bar), while the item row keeps its full un-squished 64dp.
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .navigationBarsPadding(),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(64.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            // Left cluster: Home, All Posts — shares the left half of the bar
                            // with the right cluster so the + button sits at the true center.
                            Row(
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxHeight(),
                            ) {
                                listOf(BottomTab.HOME, BottomTab.ALL_POSTS).forEach { tab ->
                                    BottomNavTabItem(
                                        tab = tab,
                                        isSelected = tab == selected,
                                        modifier = Modifier.weight(1f),
                                        onClick = { navigateToTab(tab) },
                                    )
                                }
                            }
                            // + Sell button — native 56dp FAB, dead-center of the screen
                            if (showSellFab) {
                                val sellFlowVm: SellFlowViewModel = hiltViewModel()
                                val authGate = LocalAuthGate.current
                                val authVm: AuthViewModel = hiltViewModel()
                                val isAuthed by authVm.isAuthenticated.collectAsState()
                                val sellScope = rememberCoroutineScope()
                                Box(
                                    modifier = Modifier
                                        .width(76.dp)
                                        .fillMaxHeight(),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    FloatingActionButton(
                                        onClick = {
                                            if (!isAuthed) {
                                                authGate()
                                            } else {
                                                sellScope.launch {
                                                    val destination = sellFlowVm.resolveDestination()
                                                    navController.navigate(destination) { launchSingleTop = true }
                                                }
                                            }
                                        },
                                        containerColor = MaterialTheme.colorScheme.primary,
                                        contentColor = MaterialTheme.colorScheme.onPrimary,
                                        modifier = Modifier.size(56.dp),
                                        elevation = FloatingActionButtonDefaults.elevation(
                                            defaultElevation = 4.dp,
                                            pressedElevation = 8.dp,
                                        ),
                                    ) {
                                        Icon(
                                            Icons.Filled.Add,
                                            contentDescription = stringResource(R.string.nav_sell),
                                            modifier = Modifier.size(28.dp),
                                        )
                                    }
                                }
                            }
                            // Right cluster: Feed, Rewards, More — mirrors the left half
                            Row(
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxHeight(),
                            ) {
                                listOf(BottomTab.FEED, BottomTab.REWARDS).forEach { tab ->
                                    BottomNavTabItem(
                                        tab = tab,
                                        isSelected = tab == selected,
                                        modifier = Modifier.weight(1f),
                                        onClick = { navigateToTab(tab) },
                                    )
                                }
                                // More menu button
                                Column(
                                    modifier = Modifier
                                        .weight(1f)
                                        .fillMaxHeight()
                                        .clickable(
                                            indication = null,
                                            interactionSource = remember { MutableInteractionSource() },
                                            onClick = openMore,
                                        ),
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center,
                                ) {
                                    Icon(
                                        Icons.Filled.Menu,
                                        contentDescription = stringResource(R.string.nav_more),
                                        modifier = Modifier.size(24.dp),
                                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                            Text(
                                text = stringResource(R.string.nav_more),
                                style = MaterialTheme.typography.labelMedium,
                                maxLines = 1,
                                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontWeight = FontWeight.Normal,
                            )
                                }
                            }
                        }
                    }
                }
                }
            },
        ) { padding ->
            Box(Modifier.padding(padding).consumeWindowInsets(padding)) {
                content()
            }
        }
    }
}

@Composable
private fun BottomNavTabItem(
    tab: BottomTab,
    isSelected: Boolean,
    badgeCount: Int = 0,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val contentColor = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
    Column(
        modifier = modifier
            .fillMaxHeight()
            .clickable(
                indication = null,
                interactionSource = remember { MutableInteractionSource() },
                onClick = onClick,
            ),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        BadgedBox(
            badge = {
                if (badgeCount > 0) {
                    Badge(containerColor = MaterialTheme.colorScheme.error) {
                        Text(
                            if (badgeCount > 99) "99+" else "$badgeCount",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onError,
                        )
                    }
                }
            }
        ) {
            Icon(
                imageVector = if (isSelected) tab.iconFilled else tab.iconOutlined,
                contentDescription = null,
                modifier = Modifier.size(24.dp),
                tint = contentColor,
            )
        }
        Text(
            text = stringResource(tab.labelRes),
            style = MaterialTheme.typography.labelMedium,
            maxLines = 1,
            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
            color = contentColor,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
        )
    }
}

/**
 * Route deep link URIs to the appropriate composable routes.
 * Supports: zaruda://post/{id}, zaruda://search, zaruda://create-post,
 * zaruda://saledone[/{tab}], https://zaruda.app/post/{id}
 */
private fun handleDeepLink(uri: String, navController: NavHostController) {
    val path = uri
        .removePrefix("zaruda://")
        .removePrefix("https://zaruda.app/")
        .removePrefix("zaruda://")
        .removePrefix("https://zaruda.app/")
        .trimEnd('/')
    val segments = path.split("/")
    when (segments.firstOrNull()) {
        "post", "posts", "listing" -> {
            val id = segments.getOrNull(1) ?: return
            if (id == "mine") {
                navController.navigate(Routes.MY_POSTS) { launchSingleTop = true }
                return
            }
            // Expiry reminders deep-link here with an action hint
            val action = segments.getOrNull(2)
            when (action) {
                "sold" -> navController.navigate(Routes.expiryAction(id)) { launchSingleTop = true }
                "repost" -> navController.navigate(Routes.expiryAction(id)) { launchSingleTop = true }
                else -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true }
            }
        }
        "my-posts", "my_posts", "mine" -> navController.navigate(Routes.MY_POSTS) { launchSingleTop = true }
        "home" -> navController.navigate(Routes.HOME) { launchSingleTop = true }
        "explore" -> navController.navigate(Routes.ALL_POSTS) { launchSingleTop = true }
        "login", "auth/login" -> navController.navigate(Routes.LOGIN) { launchSingleTop = true }
        "signup", "auth/signup" -> navController.navigate(Routes.SIGNUP) { launchSingleTop = true }
        "expiry-action" -> {
            val id = segments.getOrNull(1) ?: return
            navController.navigate(Routes.expiryAction(id)) { launchSingleTop = true }
        }

        "user" -> {
            val userId = segments.getOrNull(1) ?: return
            val subPath = segments.getOrNull(2)
            when (subPath) {
                "sold-posts" -> navController.navigate(Routes.userSoldPosts(userId)) { launchSingleTop = true }
                else -> navController.navigate(Routes.profileForUser(userId)) { launchSingleTop = true }
            }
        }

        "search" -> navController.navigate(Routes.SEARCH) { launchSingleTop = true }
        "create-post", "sell" -> navController.navigate(Routes.CREATE_POST) { launchSingleTop = true }
        "profile" -> {
            val userId = segments.getOrNull(1)
            if (userId != null) {
                navController.navigate(Routes.profileForUser(userId)) { launchSingleTop = true }
            } else {
                navController.navigate(Routes.PROFILE) { launchSingleTop = true }
            }
        }
        "wishlist", "saved" -> navController.navigate(Routes.WISHLIST) { launchSingleTop = true }
        "cart" -> navController.navigate(Routes.CART) { launchSingleTop = true }
        "notifications" -> navController.navigate(Routes.NOTIFICATIONS) { launchSingleTop = true }
        "checkout" -> {
            val postId = segments.getOrNull(1)?.substringBefore('?') ?: "cart"
            val amount = android.net.Uri.parse(uri).getQueryParameter("amount")?.toDoubleOrNull() ?: 35000.0
            navController.navigate(Routes.checkout(postId, amount)) { launchSingleTop = true }
        }
        "saledone", "sale-done", "sales" -> {
            val tab = segments.getOrNull(1)?.toIntOrNull()?.coerceIn(0, 3) ?: 0
            navController.navigate(Routes.saleDoneTab(tab)) { launchSingleTop = true }
        }
        "ratings" -> {
            val targetUser = segments.getOrNull(1) ?: "demo_user"
            navController.navigate(Routes.ratings(targetUser)) { launchSingleTop = true }
        }
        "nearby" -> navController.navigate(Routes.NEARBY) { launchSingleTop = true }
        "scanner" -> navController.navigate(Routes.SCANNER) { launchSingleTop = true }
        "kyc" -> navController.navigate(Routes.KYC) { launchSingleTop = true }
        "rewards" -> navController.navigate(Routes.REWARDS) { launchSingleTop = true }
    }
}
