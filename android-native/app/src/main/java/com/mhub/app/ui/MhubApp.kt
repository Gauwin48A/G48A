package com.mhub.app.ui

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Article
import androidx.compose.material.icons.automirrored.outlined.Article
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Forum
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.outlined.ChatBubbleOutline
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
import com.mhub.app.data.local.AppPreferences
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
import com.mhub.app.R
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import com.mhub.app.ui.auth.AuthViewModel
import com.mhub.app.ui.auth.ForgotPasswordScreen
import com.mhub.app.ui.auth.LoginScreen
import com.mhub.app.ui.auth.ResetPasswordScreen
import com.mhub.app.ui.auth.SignUpScreen
import com.mhub.app.ui.account.AccountDeleteScreen
import com.mhub.app.ui.account.AnalyticsScreen
import com.mhub.app.ui.account.DashboardScreen
import com.mhub.app.ui.account.SecurityScreen
import com.mhub.app.ui.account.VerificationScreen
import com.mhub.app.ui.categories.CategoriesScreen
import com.mhub.app.ui.channels.CentreDetailScreen
import com.mhub.app.ui.channels.CentreListScreen
import com.mhub.app.ui.channels.CentreListingsScreen
import com.mhub.app.ui.channels.ChannelDetailScreen
import com.mhub.app.ui.channels.ChannelsListScreen
import com.mhub.app.ui.channels.CreateCentreScreen
import com.mhub.app.ui.channels.CreateChannelScreen
import com.mhub.app.ui.commerce.BoughtPostsScreen
import com.mhub.app.ui.commerce.CartScreen
import com.mhub.app.ui.commerce.CompareScreen
import com.mhub.app.ui.commerce.EditPostScreen
import com.mhub.app.ui.commerce.PaymentScreen
import com.mhub.app.ui.commerce.PostWelcomeScreen
import com.mhub.app.ui.commerce.RecentlyViewedScreen
import com.mhub.app.ui.commerce.SaleDoneScreen
import com.mhub.app.ui.commerce.SaleUndoneScreen
import com.mhub.app.ui.commerce.SavedSearchesScreen
import com.mhub.app.ui.commerce.SoldPostsScreen
import com.mhub.app.ui.commerce.TierSelectionScreen
import com.mhub.app.ui.explore.ExploreScreen
import com.mhub.app.ui.feed.FeedScreen
import com.mhub.app.ui.home.CategoryHubScreen
import com.mhub.app.ui.home.HomeScreen
import com.mhub.app.ui.home.PostDetailScreen
import com.mhub.app.ui.kyc.KycScreen
import com.mhub.app.ui.legal.AdminPanelScreen
import com.mhub.app.ui.legal.InviteScreen
import com.mhub.app.ui.legal.NotFoundScreen
import com.mhub.app.ui.legal.PrivacyScreen
import com.mhub.app.ui.legal.RefundScreen
import com.mhub.app.ui.legal.SupportPolicyScreen
import com.mhub.app.ui.legal.TermsScreen
import com.mhub.app.ui.more.MoreScreen
import com.mhub.app.ui.navigation.Routes
import com.mhub.app.core.AppLogger
import com.mhub.app.core.LocalLocaleManager
import com.mhub.app.core.LocaleManager
import com.mhub.app.ui.notifications.NotificationsScreen
import com.mhub.app.ui.post.CreatePostScreen
import com.mhub.app.ui.post.MyPostsScreen
import com.mhub.app.ui.profile.ProfileScreen
import com.mhub.app.ui.rewards.RewardsScreen
import com.mhub.app.ui.search.SearchScreen
import com.mhub.app.ui.settings.SettingsScreen
import com.mhub.app.ui.social.ComplaintsScreen
import com.mhub.app.ui.social.FeedbackScreen
import com.mhub.app.ui.social.FeedDetailScreen
import com.mhub.app.ui.social.FeedPostAddScreen
import com.mhub.app.ui.social.MyFeedScreen
import com.mhub.app.ui.social.PublicWallScreen
import com.mhub.app.ui.social.RatingsScreen
import com.mhub.app.ui.theme.MhubTheme
import com.mhub.app.ui.wishlist.WishlistScreen
import com.mhub.app.core.ConnectivityObserver
import com.mhub.app.ui.components.OfflineBanner
import com.mhub.app.ui.components.MhubTopBar
import com.mhub.app.ui.theme.MhubShapes
import com.mhub.app.ui.theme.MhubElevation
import com.mhub.app.ui.theme.MhubMotion
import android.app.Activity
import android.widget.Toast
import androidx.activity.compose.BackHandler
import com.mhub.app.ui.theme.MhubGradients
import com.mhub.app.ui.theme.MhubIconSize
import com.mhub.app.ui.theme.spacing
import com.mhub.app.data.local.ThemeMode
import kotlinx.coroutines.launch
import com.google.firebase.analytics.FirebaseAnalytics
import android.os.Bundle
import com.mhub.app.data.repository.KycRepository
import com.mhub.app.data.repository.TiersRepository
import com.mhub.app.core.ApiResult

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
) : ViewModel() {
    /** Returns the route to navigate to when the sell button is tapped. */
    suspend fun resolveDestination(): String {
        // Free 3-month launch promo: skip subscription check
        if (com.mhub.app.core.FreeLaunchPlan.isActive()) {
            // Still require KYC
            when (val kycResult = kycRepo.status()) {
                is ApiResult.Success -> {
                    if (kycResult.data.kycStatus != "approved") return com.mhub.app.ui.navigation.Routes.KYC
                }
                is ApiResult.Failure -> return com.mhub.app.ui.navigation.Routes.KYC
            }
            return com.mhub.app.ui.navigation.Routes.POST_WELCOME
        }
        when (val kycResult = kycRepo.status()) {
            is ApiResult.Success -> {
                val status = kycResult.data.kycStatus
                if (status != "approved") return com.mhub.app.ui.navigation.Routes.KYC
            }
            is ApiResult.Failure -> return com.mhub.app.ui.navigation.Routes.KYC
        }
        when (val subResult = tiersRepo.mySubscription()) {
            is ApiResult.Success -> {
                if (!subResult.data.active) return com.mhub.app.ui.navigation.Routes.TIER_SELECTION
            }
            is ApiResult.Failure -> return com.mhub.app.ui.navigation.Routes.TIER_SELECTION
        }
        return com.mhub.app.ui.navigation.Routes.POST_WELCOME
    }

    /** Returns true if user has an active subscription (for Feed post creation). */
    suspend fun checkSubscriptionOnly(): Boolean {
        // Free 3-month launch promo: everyone can post
        if (com.mhub.app.core.FreeLaunchPlan.isActive()) return true
        return when (val subResult = tiersRepo.mySubscription()) {
            is ApiResult.Success -> subResult.data.active
            is ApiResult.Failure -> false
        }
    }
}

@Composable
fun MhubApp(
    onReady: () -> Unit = {},
    connectivityObserver: ConnectivityObserver? = null,
    deepLinkUri: String? = null,
    onDeepLinkConsumed: () -> Unit = {},
    localeManager: LocaleManager? = null,
) {
    val themeVm: AppThemeViewModel = hiltViewModel()
    val themeMode by themeVm.themeMode.collectAsState()
    MhubTheme(themeMode = themeMode) {
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
        var activeCategoryKey by rememberSaveable { mutableStateOf<String?>(null) }
        var guestBrowsing by rememberSaveable { mutableStateOf(false) }
        var showMoreDrawer by rememberSaveable { mutableStateOf(false) }
        var showAuthGate by rememberSaveable { mutableStateOf(false) }
        // Show login gate only when truly unauthenticated AND in guest mode
        // Prevents login prompts for demo-login users whose token might transiently be null
        val needsLogin = !isAuthenticated && guestBrowsing
        val context = LocalContext.current
        val analytics = remember(context) { FirebaseAnalytics.getInstance(context) }
        val exitScope = rememberCoroutineScope()

        fun normalizeMarketplaceCategoryKey(raw: String?): String {
            val value = raw?.lowercase()?.trim().orEmpty()
            return when {
                value in setOf("electronics", "fashion", "vehicles", "others") -> value
                value.contains("electron") || value.contains("phone") || value.contains("laptop") ||
                    value.contains("camera") || value.contains("audio") || value.contains("gadget") -> "electronics"
                value.contains("fashion") || value.contains("cloth") || value.contains("apparel") ||
                    value.contains("shoe") || value.contains("bag") || value.contains("watch") -> "fashion"
                value.contains("vehicle") || value.contains("car") || value.contains("bike") ||
                    value.contains("motor") || value.contains("cycle") || value.contains("truck") ||
                    value.contains("scooter") || value.contains("spare") -> "vehicles"
                else -> "others"
            }
        }

        fun openAllPosts(categoryKey: String? = null) {
            activeCategoryKey = categoryKey
            navController.navigate(Routes.ALL_POSTS) {
                popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                launchSingleTop = true
            }
        }

        fun openCategoryInAllPosts(rawCategoryKey: String?) {
            openAllPosts(normalizeMarketplaceCategoryKey(rawCategoryKey))
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

        // Reset guest mode when user becomes authenticated (prevents stale guest state after login)
        val appContext = androidx.compose.ui.platform.LocalContext.current.applicationContext
        LaunchedEffect(isAuthenticated) {
            if (isAuthenticated) {
                guestBrowsing = false
                showAuthGate = false
                // Schedule daily plan expiry notification checks
                com.mhub.app.core.schedulePlanExpiryChecks(appContext)
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
            LocalSnackbarHostState provides snackbarHostState,
            *listOfNotNull(
                localeManager?.let { LocalLocaleManager provides it },
            ).toTypedArray(),
        ) {

        LaunchedEffect(Unit) { onReady() }

        // Handle deep links
        LaunchedEffect(deepLinkUri) {
            if (deepLinkUri != null && isAuthenticated) {
                handleDeepLink(deepLinkUri, navController)
                onDeepLinkConsumed()
            }
        }

        // ── Graceful Session Degradation ──────────────────────────────────
        // When the token is cleared involuntarily (e.g., refresh token expired on server),
        // transition to guest browsing mode instead of force-redirecting to login.
        // This ensures the user can continue browsing the marketplace without interruption.
        // Only a user-initiated logout (tapping "Logout") should redirect to the auth graph.
        var wasAuthenticated by remember { mutableStateOf(isAuthenticated) }
        var userInitiatedLogout by rememberSaveable { mutableStateOf(false) }
        LaunchedEffect(isAuthenticated) {
            if (!isAuthenticated && wasAuthenticated) {
                if (userInitiatedLogout) {
                    // User tapped Logout — redirect to auth graph
                    navController.navigate(Routes.AUTH_GRAPH) {
                        popUpTo(0) { inclusive = true }
                    }
                    userInitiatedLogout = false
                } else if (!guestBrowsing && !authViewModel.hasSession) {
                    // Session involuntarily cleared (refresh expired, server rejected) —
                    // degrade gracefully to guest browsing mode instead of force-login.
                    // Show a non-intrusive toast so the user knows, but let them continue.
                    guestBrowsing = true
                    Toast.makeText(
                        context,
                        "Session expired. Sign in to access all features.",
                        Toast.LENGTH_SHORT,
                    ).show()
                }
            }
            wasAuthenticated = isAuthenticated
        }

        // Use hasSession so users with an expired-but-refreshable token start on the main
        // graph where the first API call triggers the OkHttp token refresh flow.
        val startDestination = if (authViewModel.hasSession || isAuthenticated) Routes.MAIN_GRAPH else Routes.AUTH_GRAPH

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
            enterTransition = { MhubMotion.pageEnter },
            exitTransition = { MhubMotion.pageExit },
            popEnterTransition = { MhubMotion.pagePopEnter },
            popExitTransition = { MhubMotion.pagePopExit },
        ) {
            // â”€â”€ Auth Graph â”€â”€
            navigation(startDestination = Routes.LOGIN, route = Routes.AUTH_GRAPH) {
                composable(Routes.LOGIN) {
                    LoginScreen(
                        onSignedIn = {
                            guestBrowsing = false
                            navController.navigate(Routes.MAIN_GRAPH) {
                                popUpTo(Routes.AUTH_GRAPH) { inclusive = true }
                            }
                        },
                        onPreviewApp = {
                            guestBrowsing = true
                            navController.navigate(Routes.MAIN_GRAPH) {
                                popUpTo(Routes.AUTH_GRAPH) { inclusive = true }
                            }
                        },
                        onOpenSettings = { navController.navigate(Routes.SETTINGS) { launchSingleTop = true } },
                        onForgotPassword = { navController.navigate(Routes.FORGOT_PASSWORD) { launchSingleTop = true } },
                        onSignUp = { navController.navigate(Routes.SIGNUP) { launchSingleTop = true } },
                    )
                }

                composable(Routes.FORGOT_PASSWORD) {
                    ForgotPasswordScreen(onBack = { navController.popBackStack() })
                }

                composable(Routes.SIGNUP) {
                    SignUpScreen(
                        onSignedUp = {
                            guestBrowsing = false
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
                        onOpenCategory = { category ->
                            val mapped = normalizeMarketplaceCategoryKey(category.categoryGroup ?: category.name)
                            analytics.logEvent(
                                "launcher_enter_category",
                                Bundle().apply {
                                    putString("category_key", mapped)
                                    putString("entry_type", "mapped_category")
                                },
                            )
                            openAllPosts(mapped)
                        },
                        onOpenAllPosts = {
                            openAllPosts(null)
                        },
                        onOpenSearch = { navController.navigate(Routes.SEARCH) { launchSingleTop = true } },
                        onSelectApp = { key ->
                            val safeKey = normalizeMarketplaceCategoryKey(key)
                            analytics.logEvent(
                                "launcher_enter_category",
                                Bundle().apply {
                                    putString("category_key", safeKey)
                                    putString("entry_type", "direct_card")
                                },
                            )
                            openAllPosts(safeKey)
                        },
                        onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) { launchSingleTop = true } },
                        onOpenSettings = { navController.navigate(Routes.SETTINGS) { launchSingleTop = true } },
                        onOpenScanner = { navController.navigate(Routes.SCANNER) { launchSingleTop = true } },
                        onOpenCart = { navController.navigate(Routes.CART) { launchSingleTop = true } },
                    )
                    }
                }

                composable(Routes.ALL_POSTS) {
                    MainShell(navController = navController, selected = BottomTab.ALL_POSTS, showTopBar = false) {
                        ExploreScreen(
                            onOpenPost = { id ->
                                navController.navigate(Routes.postDetail(id)) { launchSingleTop = true }
                            },
                            onOpenSearch = { navController.navigate(Routes.SEARCH) { launchSingleTop = true } },
                            onOpenHome = { navController.navigate(Routes.MY_POSTS) {
                                popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                                launchSingleTop = true
                            } },
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
                            onLanguage = { navController.navigate(Routes.SETTINGS) { launchSingleTop = true } },
                            currentThemeMode = themeMode,
                            onToggleTheme = toggleTheme,
                        )
                    }
                    }

                composable(Routes.FOR_YOU)  {
                    MainShell(navController = navController, selected = BottomTab.FOR_YOU, showTopBar = false) {
                        com.mhub.app.ui.foryou.ForYouScreen(
                            onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                            isGuest = guestBrowsing && !isAuthenticated,
                            onNavigateToLogin = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onOpenSearch = { navController.navigate(Routes.SEARCH) { launchSingleTop = true } },
                            onOpenHome = { navController.navigate(Routes.MY_POSTS) {
                                popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                                launchSingleTop = true
                            } },
                            onOpenForYou = {},
                            onOpenCategories = { navController.navigate(Routes.CATEGORIES) { launchSingleTop = true } },
                            onOpenCompare = { navController.navigate(Routes.COMPARE) { launchSingleTop = true } },
                            onOpenCart = { navController.navigate(Routes.CART) { launchSingleTop = true } },
                            onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) { launchSingleTop = true } },
                            onOpenRecentlyViewed = { navController.navigate(Routes.RECENTLY_VIEWED) { launchSingleTop = true } },
                            onOpenWishlist = { navController.navigate(Routes.WISHLIST) { launchSingleTop = true } },
                            currentThemeMode = themeMode,
                            onToggleTheme = toggleTheme,
                        )
                    }
                }

                composable(Routes.FEED) {
                    MainShell(navController = navController, selected = BottomTab.FEED) {
                        val feedSellVm: SellFlowViewModel = hiltViewModel()
                        val feedScope = rememberCoroutineScope()
                        FeedScreen(
                            onOpenPost = { id -> navController.navigate(Routes.feedDetail(id)) { launchSingleTop = true } },
                            onCreatePost = {
                                if (!isAuthenticated) {
                                    guestBrowsing = false
                                    navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } }
                                } else {
                                    feedScope.launch {
                                        // Feed posts require active plan (same as sell flow)
                                        val subResult = feedSellVm.checkSubscriptionOnly()
                                        if (subResult) {
                                            navController.navigate(Routes.FEED_POST_ADD) { launchSingleTop = true }
                                        } else {
                                            navController.navigate(Routes.TIER_SELECTION) { launchSingleTop = true }
                                        }
                                    }
                                }
                            },
                            isGuest = guestBrowsing && !isAuthenticated,
                            onNavigateToLogin = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                        )
                    }
                }

                composable(Routes.REWARDS) {
                    MainShell(navController = navController, selected = BottomTab.REWARDS) {
                        RewardsScreen(
                            isAuthenticated = isAuthenticated,
                            onSignInRequired = {
                                guestBrowsing = false
                                navController.navigate(Routes.AUTH_GRAPH) {
                                    popUpTo(Routes.MAIN_GRAPH) { inclusive = true }
                                }
                            },
                            onBrowseMarketplace = { navController.navigate(Routes.ALL_POSTS) { launchSingleTop = true } },
                        )
                    }
                }

                composable(Routes.PROFILE) {
                    MainShell(navController = navController, selected = BottomTab.PROFILE, showTopBar = false) {
                        ProfileScreen(
                            onSignedOut = {
                                userInitiatedLogout = true
                                authViewModel.logout()
                                navController.navigate(Routes.AUTH_GRAPH) {
                                    popUpTo(0) { inclusive = true }
                                }
                            },
                            onOpenSettings = { navController.navigate(Routes.SETTINGS) { launchSingleTop = true } },
                            onOpenMyPosts = { navController.navigate(Routes.MY_POSTS) { launchSingleTop = true } },
                            onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) { launchSingleTop = true } },
                            onOpenSecurity = { navController.navigate(Routes.SECURITY) { launchSingleTop = true } },
                            onOpenAccountDelete = { navController.navigate(Routes.ACCOUNT_DELETE) { launchSingleTop = true } },
                            onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                            onOpenOrders = { navController.navigate(Routes.BOUGHT_POSTS) { launchSingleTop = true } },
                            onOpenSaleDone = { navController.navigate(Routes.SALE_DONE) { launchSingleTop = true } },
                            onOpenSaleUndone = { navController.navigate(Routes.SALE_UNDONE) { launchSingleTop = true } },
                        )
                    }
                }

                // MORE is now a drawer overlay (not a page), redirect to HOME
                composable(Routes.MORE) {
                    LaunchedEffect(Unit) {
                        navController.navigate(Routes.HOME) {
                            popUpTo(Routes.MORE) { inclusive = true }
                        }
                    }
                }

                composable(Routes.NOTIFICATIONS) {
                    MainShell(navController = navController, selected = BottomTab.PROFILE) {
                        if (needsLogin) {
                            com.mhub.app.ui.components.LoginPromptCard(
                                onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                                onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) { launchSingleTop = true } },
                            )
                        } else {
                        NotificationsScreen(
                            onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                        )
                        }
                    }
                }

                composable(Routes.WISHLIST) {
                    MainShell(navController = navController, selected = BottomTab.PROFILE) {
                        WishlistScreen(onBack = { navController.popBackStack() }, onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } })
                    }
                }
            }

            // â”€â”€ Full-Screen Routes â”€â”€
                composable(
                    route = Routes.POST_DETAIL,
                    arguments = listOf(navArgument("postId") { type = NavType.StringType }),
                ) {
                    PostDetailScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                    onOpenCategory = { key -> openCategoryInAllPosts(key) },
                    onOpenCentre = { id -> navController.navigate(Routes.centreDetail(id)) { launchSingleTop = true } },
                )
            }

            composable(
                route = "${Routes.SEARCH}?query={query}",
                arguments = listOf(androidx.navigation.navArgument("query") { defaultValue = ""; nullable = true }),
            ) { backStack ->
                val prefillQuery = backStack.arguments?.getString("query") ?: ""
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS) {
                    SearchScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                        prefillQuery = prefillQuery,
                    )
                }
            }

            composable(Routes.CATEGORIES) {
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS) {
                    CategoriesScreen(
                        onBack = { navController.popBackStack() },
                        onCategoryClick = { _, name ->
                            openCategoryInAllPosts(name)
                        },
                    )
                }
            }

            composable(Routes.SUBCATEGORIES) {
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS) {
                    com.mhub.app.ui.discovery.SubcategoriesScreen(
                        onBack = { navController.popBackStack() },
                        onOpenCategory = { catKey -> openCategoryInAllPosts(catKey) },
                    )
                }
            }

            composable(Routes.CREATE_POST) {
                if (needsLogin) {
                    MainShell(navController = navController, selected = BottomTab.ALL_POSTS) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) { launchSingleTop = true } },
                        )
                    }
                } else {
                CreatePostScreen(
                    onBack = { navController.popBackStack() },
                    onPublished = { navController.popBackStack() },
                )
                }
            }

            composable(Routes.MY_POSTS) {
                MainShell(navController = navController, selected = BottomTab.PROFILE) {
                    if (needsLogin) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) { launchSingleTop = true } },
                        )
                    } else {
                    MyPostsScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                        onCreatePost = { navController.navigate(Routes.CREATE_POST) { launchSingleTop = true } },
                    )
                    }
                }
            }

            composable(Routes.KYC) {
                KycScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.AADHAAR_VERIFY) {
                com.mhub.app.ui.kyc.AadhaarVerifyScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.GET_VERIFIED) {
                com.mhub.app.ui.kyc.GetVerifiedScreen(
                    onBack = { navController.popBackStack() },
                    onDone = { navController.popBackStack() },
                )
            }

            composable(Routes.NOTIFICATION_PREFS) {
                com.mhub.app.ui.notifications.NotificationPrefsScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.CATEGORY_MODE) {
                com.mhub.app.ui.home.CategoryModeScreen(
                    onBack = { navController.popBackStack() },
                    onSelectApp = { appKey ->
                        if (appKey.isNotBlank()) {
                            openCategoryInAllPosts(appKey)
                        } else {
                            navController.popBackStack()
                        }
                    },
                )
            }

            

            composable(Routes.SETTINGS) {
                MainShell(navController = navController, selected = BottomTab.PROFILE) {
                    SettingsScreen(onBack = { navController.popBackStack() }, onLogout = { navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } })
                }
            }

            // â”€â”€ Commerce â”€â”€
            composable(Routes.POST_WELCOME) {
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS) {
                    if (needsLogin) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) { launchSingleTop = true } },
                            modifier = Modifier.padding(top = 64.dp),
                        )
                    } else {
                    PostWelcomeScreen(
                        onBack = { navController.popBackStack() },
                        onStartPost = { navController.navigate(Routes.CREATE_POST) { launchSingleTop = true } },
                    )
                    }
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
                MainShell(navController = navController, selected = BottomTab.PROFILE) {
                    if (needsLogin) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) { launchSingleTop = true } },
                        )
                    } else {
                    TierSelectionScreen(onBack = { navController.popBackStack() })
                    }
                }
            }

            composable(Routes.SCANNER) {
                com.mhub.app.ui.scanner.ScannerScreen(
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
                    MainShell(navController = navController, selected = BottomTab.ALL_POSTS, showTopBar = false, showBottomBar = true) {
                        val catKey = key ?: "others"
                        com.mhub.app.ui.categoryapp.CategoryAppShell(
                            categoryKey = catKey,
                            useExternalBottomNav = true,
                            onBackToLauncher = { navController.popBackStack() },
                            onOpenSearch = { navController.navigate(Routes.SEARCH) { launchSingleTop = true } },
                            onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) { launchSingleTop = true } },
                            onOpenOrders = { navController.navigate(Routes.BOUGHT_POSTS) { launchSingleTop = true } },
                            onOpenSettings = { navController.navigate(Routes.SETTINGS) { launchSingleTop = true } },
                            onOpenHelp = { navController.navigate(Routes.SUPPORT_POLICY) { launchSingleTop = true } },
                            onSwitchCategory = { cat -> navController.navigate(Routes.categoryDetail(cat)) { launchSingleTop = true } },
                            onOpenPostDetail = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                            onOpenFeed = { navController.navigate(Routes.FEED) { launchSingleTop = true } },
                            onOpenForYou = { navController.navigate(Routes.FOR_YOU) { launchSingleTop = true } },
                        )
                    }
                }
            }

            composable(Routes.BOUGHT_POSTS) {
                MainShell(navController = navController, selected = BottomTab.PROFILE) {
                    if (needsLogin) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) { launchSingleTop = true } },
                        )
                    } else {
                    BoughtPostsScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                    )
                    }
                }
            }

            composable(Routes.SOLD_POSTS) {
                MainShell(navController = navController, selected = BottomTab.PROFILE) {
                    if (needsLogin) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) { launchSingleTop = true } },
                        )
                    } else {
                    SoldPostsScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) { launchSingleTop = true } },
                    )
                    }
                }
            }



            composable(Routes.SALE_DONE) {
                MainShell(navController = navController, selected = BottomTab.PROFILE) {
                    if (needsLogin) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) { launchSingleTop = true } },
                        )
                    } else {
                        SaleDoneScreen(onBack = { navController.popBackStack() })
                    }
                }
            }

            composable(Routes.SALE_UNDONE) {
                MainShell(navController = navController, selected = BottomTab.PROFILE) {
                    if (needsLogin) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) { launchSingleTop = true } },
                        )
                    } else {
                        SaleUndoneScreen(onBack = { navController.popBackStack() })
                    }
                }
            }

            composable(Routes.PAYMENT) {
                PaymentScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.CART) {
                MainShell(navController = navController, selected = BottomTab.PROFILE) {
                    CartScreen(onBack = { navController.popBackStack() })
                }
            }

            composable(Routes.RECENTLY_VIEWED) {
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
                    onLanguage = { navController.navigate(Routes.SETTINGS) { launchSingleTop = true } },
                )
            }

            composable(Routes.SAVED_SEARCHES) {
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS) {
                    SavedSearchesScreen(onBack = { navController.popBackStack() }, onRunSearch = { q -> navController.navigate("search?query=${q}") })
                }
            }

            composable(Routes.COMPARE) {
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS) {
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
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS) {
                    val feedSellVm: SellFlowViewModel = hiltViewModel()
                    val feedScope = rememberCoroutineScope()
                    MyFeedScreen(
                        onBack = { navController.popBackStack() },
                        onCreatePost = {
                            if (!isAuthenticated) {
                                guestBrowsing = false
                                navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } }
                            } else {
                                feedScope.launch {
                                    val subResult = feedSellVm.checkSubscriptionOnly()
                                    if (subResult) {
                                        navController.navigate(Routes.FEED_POST_ADD) { launchSingleTop = true }
                                    } else {
                                        navController.navigate(Routes.TIER_SELECTION) { launchSingleTop = true }
                                    }
                                }
                            }
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
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS) {
                    PublicWallScreen(onBack = { navController.popBackStack() })
                }
            }

            composable(Routes.COMPLAINTS) {
                MainShell(navController = navController, selected = BottomTab.PROFILE) {
                    ComplaintsScreen(onBack = { navController.popBackStack() })
                }
            }

            composable(Routes.FEEDBACK) {
                MainShell(navController = navController, selected = BottomTab.PROFILE) {
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

            // â”€â”€ Account â”€â”€
            composable(Routes.DASHBOARD) {
                MainShell(navController = navController, selected = BottomTab.PROFILE) {
                    if (needsLogin) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) { launchSingleTop = true } },
                        )
                    } else {
                    DashboardScreen(onBack = { navController.popBackStack() })
                    }
                }
            }

            composable(Routes.SECURITY) {
                MainShell(navController = navController, selected = BottomTab.PROFILE) {
                    if (needsLogin) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) { launchSingleTop = true } },
                        )
                    } else {
                    SecurityScreen(onBack = { navController.popBackStack() })
                    }
                }
            }

            composable(Routes.ACCOUNT_DELETE) {
                MainShell(navController = navController, selected = BottomTab.PROFILE) {
                    if (needsLogin) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) { launchSingleTop = true } },
                        )
                    } else {
                    AccountDeleteScreen(onBack = { navController.popBackStack() })
                    }
                }
            }

            composable(Routes.VERIFICATION) {
                MainShell(navController = navController, selected = BottomTab.PROFILE) {
                    if (needsLogin) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) { launchSingleTop = true } },
                        )
                    } else {
                    VerificationScreen(onBack = { navController.popBackStack() })
                    }
                }
            }

            composable(Routes.ANALYTICS) {
                MainShell(navController = navController, selected = BottomTab.PROFILE) {
                    if (needsLogin) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) { launchSingleTop = true } },
                        )
                    } else {
                    AnalyticsScreen(onBack = { navController.popBackStack() })
                    }
                }
            }

            // â”€â”€ Channels â”€â”€
            composable(Routes.CHANNELS) {
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS) {
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
                MainShell(navController = navController, selected = BottomTab.PROFILE) {
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

            // â”€â”€ Legal â”€â”€
            composable(Routes.TERMS) {
                TermsScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.PRIVACY) {
                PrivacyScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.REFUND) {
                RefundScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.SUPPORT_POLICY) {
                SupportPolicyScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.ADMIN_PANEL) {
                AdminPanelScreen(onBack = { navController.popBackStack() })
            }

            composable(
                route = Routes.INVITE,
                arguments = listOf(navArgument("code") { type = NavType.StringType }),
            ) { entry ->
                val code = entry.arguments?.getString("code").orEmpty()
                InviteScreen(code = code, onBack = { navController.popBackStack() })
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
        com.mhub.app.core.AuthGatePopup(
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
                            popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                            launchSingleTop = true
                        }
                    }
                    MoreScreen(
                        onDismiss = { showMoreDrawer = false },
                        onOpenWishlist = { drawerNav(Routes.WISHLIST) },
                        onOpenCreatePost = { drawerNav(Routes.POST_WELCOME) },
                        onOpenKyc = { drawerNav(Routes.KYC) },
                        onOpenSettings = { drawerNav(Routes.SETTINGS) },
                        onOpenTierSelection = { drawerNav(Routes.TIER_SELECTION) },
                        onOpenMyHome = { drawerNav(Routes.MY_HOME) },
                        onOpenSaleDone = { drawerNav(Routes.SALE_DONE) },
                        onOpenSaleUndone = { drawerNav(Routes.SALE_UNDONE) },
                        onOpenPublicWall = { drawerNav(Routes.PUBLIC_WALL) },
                        onOpenFeedback = { drawerNav(Routes.FEEDBACK) },
                        onOpenComplaints = { drawerNav(Routes.COMPLAINTS) },
                        onOpenProfile = { drawerNav(Routes.PROFILE) },
                        onOpenAdminPanel = { drawerNav(Routes.ADMIN_PANEL) },
                        onOpenHelp = { drawerNav(Routes.SUPPORT_POLICY) },
                        onOpenLogin = { showMoreDrawer = false; navController.navigate(Routes.LOGIN) { launchSingleTop = true } },
                        onOpenMyFeed = { drawerNav(Routes.MY_FEED) },
                        onLogout = {
                            showMoreDrawer = false
                            userInitiatedLogout = true
                            authViewModel.logout()
                            navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } }
                        },
                        onLanguageChange = { code -> localeManager?.setLocale(code) },
                        isAdmin = isAdmin,
                        isLoggedIn = isAuthenticated,
                        currentThemeMode = themeMode,
                        onSetThemeMode = { themeVm.setThemeMode(it) },
                    )
                }
            }
        }

        } // close CompositionLocalProvider
    }
}

/**
 * CompositionLocal exposing the currently-active category key (e.g. "electronics") from MhubApp
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
    activeCategoryKey: String? = null,
    onOpenMore: () -> Unit = {},
    content: @Composable () -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(
            topBar = {
                if (showTopBar) {
                val themeCtl = LocalThemeController.current
                MhubTopBar(
                    onSearch = { navController.navigate(Routes.SEARCH) { launchSingleTop = true } },
                    onWishlist = { navController.navigate(Routes.WISHLIST) { launchSingleTop = true } },
                    currentThemeMode = themeCtl.currentThemeMode,
                    onToggleTheme = themeCtl.onToggleTheme,
                    onNotifications = { navController.navigate(Routes.NOTIFICATIONS) { launchSingleTop = true } },
                    onCart = { navController.navigate(Routes.CART) { launchSingleTop = true } },
                    onRewards = { navController.navigate(Routes.REWARDS) { launchSingleTop = true } },
                )
                }
            },
            bottomBar = {
                if (showBottomBar) {
                val openMore = LocalOnOpenMore.current
                val navigateToTab: (BottomTab) -> Unit = { tab ->
                    navController.navigate(tab.route) {
                        popUpTo(Routes.MAIN_GRAPH) { inclusive = false }
                        launchSingleTop = true
                    }
                }
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .shadow(elevation = MhubElevation.bottomBar, shape = MhubShapes.bottomBar),
                    color = MaterialTheme.colorScheme.surface,
                    tonalElevation = 0.dp,
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(60.dp)
                            .navigationBarsPadding(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        // Left cluster: Home, Browse
                        listOf(BottomTab.HOME, BottomTab.ALL_POSTS).forEach { tab ->
                            BottomNavTabItem(
                                tab = tab,
                                isSelected = tab == selected,
                                modifier = Modifier.weight(1f),
                                onClick = { navigateToTab(tab) },
                            )
                        }
                        // + Sell button — prominent center action with flow resolution
                        val sellFlowVm: SellFlowViewModel = hiltViewModel()
                        val authGate = LocalAuthGate.current
                        val authVm: AuthViewModel = hiltViewModel()
                        val isAuthed by authVm.isAuthenticated.collectAsState()
                        val sellScope = rememberCoroutineScope()
                        Box(
                            modifier = Modifier
                                .weight(1f)
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
                                modifier = Modifier.size(44.dp),
                                elevation = FloatingActionButtonDefaults.elevation(
                                    defaultElevation = 4.dp,
                                    pressedElevation = 8.dp,
                                ),
                            ) {
                                Icon(
                                    Icons.Filled.AddCircle,
                                    contentDescription = stringResource(R.string.nav_sell),
                                    modifier = Modifier.size(26.dp),
                                )
                            }
                        }
                        // Right cluster: Feed, Rewards, Profile, More
                        listOf(BottomTab.FEED, BottomTab.PROFILE).forEach { tab ->
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
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                fontWeight = FontWeight.Normal,
                            )
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
            style = MaterialTheme.typography.labelSmall,
            color = contentColor,
            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
        )
    }
}

/**
 * Route deep link URIs to the appropriate composable routes.
 * Supports: mhub://post/{id}, mhub://chat/{id}, mhub://search, mhub://create-post,
 * https://mhub.app/post/{id}, https://mhub.app/chat/{id}
 */
private fun handleDeepLink(uri: String, navController: NavHostController) {
    val path = uri.removePrefix("mhub://").removePrefix("https://mhub.app/").trimEnd('/')
    val segments = path.split("/")
    when (segments.firstOrNull()) {
        "post", "posts", "listing" -> {
            val id = segments.getOrNull(1) ?: return
            navController.navigate("${Routes.POST_DETAIL}/$id")
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
        "settings" -> navController.navigate(Routes.SETTINGS) { launchSingleTop = true }
    }
}
