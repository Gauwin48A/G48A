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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Article
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.AddCircleOutline
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.staticCompositionLocalOf
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
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navigation
import androidx.navigation.navArgument
import com.mhub.app.R
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
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
import com.mhub.app.ui.chat.ChatScreen
import com.mhub.app.ui.commerce.BoughtPostsScreen
import com.mhub.app.ui.commerce.BuyerViewScreen
import com.mhub.app.ui.commerce.CartScreen
import com.mhub.app.ui.commerce.CompareScreen
import com.mhub.app.ui.commerce.EditPostScreen
import com.mhub.app.ui.commerce.OffersScreen
import com.mhub.app.ui.commerce.PaymentScreen
import com.mhub.app.ui.commerce.PostWelcomeScreen
import com.mhub.app.ui.commerce.RecentlyViewedScreen
import com.mhub.app.ui.commerce.SaleDoneScreen
import com.mhub.app.ui.commerce.SaleUndoneScreen
import com.mhub.app.ui.commerce.SavedSearchesScreen
import com.mhub.app.ui.commerce.SoldPostsScreen
import com.mhub.app.ui.commerce.TierSelectionScreen
import com.mhub.app.ui.discovery.NearbyScreen
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
import com.mhub.app.ui.social.ReviewsScreen
import com.mhub.app.ui.home.CategoryDetailScreen
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
import com.mhub.app.ui.categoryapp.CategoryAppShell
import com.mhub.app.ui.categoryapp.MockProductDetailScreen
import com.mhub.app.ui.checkout.CheckoutAddressScreen
import com.mhub.app.ui.checkout.CheckoutPaymentScreen
import com.mhub.app.ui.checkout.CheckoutReviewScreen
import com.mhub.app.ui.checkout.OrderConfirmationScreen
import com.mhub.app.ui.checkout.OrderFailedScreen
import com.mhub.app.ui.recentlyviewed.RecentlyViewedFullScreen
import com.mhub.app.ui.staticpages.AboutUsScreen
import com.mhub.app.ui.staticpages.ContactUsScreen
import com.mhub.app.ui.staticpages.FAQScreen
import com.google.firebase.analytics.FirebaseAnalytics
import android.os.Bundle

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
        val authViewModel: AuthViewModel = hiltViewModel()
        val isAuthenticated by authViewModel.isAuthenticated.collectAsState()
        var activeCategoryKey by rememberSaveable { mutableStateOf<String?>(null) }
        var guestBrowsing by rememberSaveable { mutableStateOf(false) }
        var showMoreDrawer by rememberSaveable { mutableStateOf(false) }
        var showAuthGate by rememberSaveable { mutableStateOf(false) }
        val context = LocalContext.current
        val analytics = remember(context) { FirebaseAnalytics.getInstance(context) }
        val exitScope = kotlinx.coroutines.MainScope()

        // Double-back to exit on Home
        var backPressedOnce by remember { mutableStateOf(false) }
        BackHandler(enabled = true) {
            val currentRoute = navController.currentDestination?.route
            if (currentRoute == Routes.HOME && !navController.popBackStack()) {
                if (backPressedOnce) {
                    (context as? Activity)?.finish()
                } else {
                    backPressedOnce = true
                    Toast.makeText(context, "Press back again to exit", Toast.LENGTH_SHORT).show()
                    exitScope.launch { kotlinx.coroutines.delay(2000); backPressedOnce = false }
                }
            }
        }

        // Observe locale version to trigger recomposition on locale change
        val localeVersion = localeManager?.localeVersion?.collectAsState()

        // Provide activeCategoryKey and locale manager via CompositionLocal
        CompositionLocalProvider(
            LocalActiveCategoryKey provides activeCategoryKey,
            LocalOnOpenMore provides { showMoreDrawer = true },
            LocalAuthGate provides { if (!isAuthenticated) showAuthGate = true },
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

        // When user explicitly logs out (token cleared), redirect to auth
        // But allow guest browsing mode and don't react to transient auth state changes
        var wasAuthenticated by remember { mutableStateOf(isAuthenticated) }
        LaunchedEffect(isAuthenticated) {
            if (!isAuthenticated && wasAuthenticated && !guestBrowsing) {
                // User was authenticated but now isn't → explicit logout
                val currentRoute = navController.currentDestination?.route
                if (currentRoute != null && !currentRoute.startsWith("auth")) {
                    navController.navigate(Routes.AUTH_GRAPH) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            }
            wasAuthenticated = isAuthenticated
        }

        val startDestination = if (isAuthenticated) Routes.MAIN_GRAPH else Routes.AUTH_GRAPH

        Column(modifier = Modifier.fillMaxSize()) {
            // Offline banner shown above all content
            if (connectivityObserver != null) {
                OfflineBanner(connectivityObserver = connectivityObserver)
            }

            NavHost(
            navController = navController,
            startDestination = startDestination,
            enterTransition = { MhubMotion.pageEnter },
            exitTransition = { MhubMotion.pageExit },
            popEnterTransition = { MhubMotion.pagePopEnter },
            popExitTransition = { MhubMotion.pagePopExit },
        ) {
            // ── Auth Graph ──
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
                        onOpenSettings = { navController.navigate(Routes.SETTINGS) },
                        onForgotPassword = { navController.navigate(Routes.FORGOT_PASSWORD) },
                        onSignUp = { navController.navigate(Routes.SIGNUP) },
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

            // ── Main Graph (Bottom Nav) ──
            navigation(startDestination = Routes.HOME, route = Routes.MAIN_GRAPH) {
                composable(Routes.HOME) {
                    MainShell(navController = navController, selected = BottomTab.HOME, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }, showTopBar = false, showBottomBar = true) {
                    CategoryHubScreen(
                        onOpenCategory = { category ->
                            val mapped = when ((category.categoryGroup ?: category.name ?: "").lowercase()) {
                                "electronics" -> "electronics"
                                "fashion" -> "fashion"
                                "vehicles" -> "vehicles"
                                else -> "others"
                            }
                            analytics.logEvent(
                                "launcher_enter_category",
                                Bundle().apply {
                                    putString("category_key", mapped)
                                    putString("entry_type", "mapped_category")
                                },
                            )
                            activeCategoryKey = mapped
                            navController.navigate("cat/$mapped") { launchSingleTop = true }
                        },
                        onOpenAllPosts = {
                            analytics.logEvent(
                                "launcher_enter_category",
                                Bundle().apply {
                                    putString("category_key", "electronics")
                                    putString("entry_type", "fallback_default")
                                },
                            )
                            activeCategoryKey = "electronics"
                            navController.navigate("cat/electronics") { launchSingleTop = true }
                        },
                        onOpenSearch = { navController.navigate(Routes.SEARCH) },
                        onSelectApp = { key ->
                            val safeKey = key.lowercase().let {
                                if (it in setOf("electronics", "fashion", "vehicles", "others")) it else "electronics"
                            }
                            analytics.logEvent(
                                "launcher_enter_category",
                                Bundle().apply {
                                    putString("category_key", safeKey)
                                    putString("entry_type", "direct_card")
                                },
                            )
                            activeCategoryKey = safeKey
                            navController.navigate("cat/$safeKey") {
                                launchSingleTop = true
                            }
                        },
                        onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                        onOpenSettings = { navController.navigate(Routes.SETTINGS) },
                        onOpenScanner = { navController.navigate(Routes.SCANNER) },
                        onOpenCart = { navController.navigate(Routes.CART) },
                    )
                    }
                }

                composable(Routes.ALL_POSTS) {
                    MainShell(navController = navController, selected = BottomTab.ALL_POSTS, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }, showTopBar = false) {
                        ExploreScreen(
                            onOpenPost = { id ->
                                if (id.startsWith("ep") || id.startsWith("fp") || id.startsWith("gp") || id.startsWith("fup")) {
                                    navController.navigate("cat-product/$id")
                                } else {
                                    navController.navigate(Routes.postDetail(id))
                                }
                            },
                            onOpenSearch = { navController.navigate(Routes.SEARCH) },
                            onOpenCategories = { navController.navigate(Routes.CATEGORIES) },
                            title = "Explore",
                            subtitle = "Discover trending & curated picks",
                        )
                    }
                }

                composable(Routes.FOR_YOU) {
                    MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }, showTopBar = true) {
                        com.mhub.app.ui.foryou.ForYouScreen(
                            onBack = { navController.popBackStack() },
                            onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                            isGuest = !isAuthenticated,
                            onNavigateToLogin = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                        )
                    }
                }

                composable(Routes.FEED) {
                    MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }, showTopBar = true) {
                        FeedScreen(
                            onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                            onCreatePost = { navController.navigate(Routes.FEED_POST_ADD) },
                        )
                    }
                }

                composable(Routes.REWARDS) {
                    MainShell(navController = navController, selected = BottomTab.REWARDS, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }, showTopBar = true) {
                        RewardsScreen(
                            isAuthenticated = isAuthenticated,
                            onSignInRequired = {
                                navController.navigate(Routes.AUTH_GRAPH) {
                                    popUpTo(Routes.MAIN_GRAPH) { inclusive = true }
                                }
                            },
                            onBrowseMarketplace = { navController.navigate(Routes.ALL_POSTS) },
                        )
                    }
                }

                composable(Routes.PROFILE) {
                    if (!isAuthenticated) {
                        MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }, showTopBar = true) {
                            com.mhub.app.ui.components.LoginPromptCard(
                                onSignIn = {
                                    guestBrowsing = false
                                    navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } }
                                },
                                onCreateAccount = {
                                    guestBrowsing = false
                                    navController.navigate(Routes.SIGNUP)
                                },
                                modifier = androidx.compose.ui.Modifier.padding(top = 64.dp),
                            )
                        }
                    } else {
                    MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }, showTopBar = true) {
                        ProfileScreen(
                            onSignedOut = {
                                authViewModel.logout()
                                navController.navigate(Routes.AUTH_GRAPH) {
                                    popUpTo(0) { inclusive = true }
                                }
                            },
                            onOpenSettings = { navController.navigate(Routes.SETTINGS) },
                            onOpenMyPosts = { navController.navigate(Routes.MY_POSTS) },
                            onOpenKyc = { navController.navigate(Routes.KYC) },
                            onOpenChat = { navController.navigate(Routes.CHAT) },
                            onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                            onOpenSecurity = { navController.navigate(Routes.SECURITY) },
                            onOpenDashboard = { navController.navigate(Routes.DASHBOARD) },
                            onOpenAnalytics = { navController.navigate(Routes.ANALYTICS) },
                            onOpenAccountDelete = { navController.navigate(Routes.ACCOUNT_DELETE) },
                            onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                            onOpenOrders = { navController.navigate(Routes.ORDER_HISTORY) },
                            onOpenAddresses = { navController.navigate(Routes.ADDRESS_BOOK) },
                        )
                    }
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
                    MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }, showTopBar = true) {
                        if (!isAuthenticated) {
                            com.mhub.app.ui.components.LoginPromptCard(
                                onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                                onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) },
                            )
                        } else {
                        NotificationsScreen(
                            onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                        )
                        }
                    }
                }

                composable(Routes.WISHLIST) {
                    MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }, showTopBar = true) {
                        WishlistScreen(onBack = { navController.popBackStack() }, onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) })
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
                    onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                    onOpenCategory = { key -> navController.navigate(Routes.categoryDetail(key)) },
                )
            }

            composable(
                route = "${Routes.SEARCH}?query={query}",
                arguments = listOf(androidx.navigation.navArgument("query") { defaultValue = ""; nullable = true }),
            ) { backStack ->
                val prefillQuery = backStack.arguments?.getString("query") ?: ""
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    SearchScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                        prefillQuery = prefillQuery,
                    )
                }
            }

            composable(Routes.CATEGORIES) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    CategoriesScreen(
                        onBack = { navController.popBackStack() },
                        onCategoryClick = { _, name ->
                            val key = name.lowercase().trim().let { n ->
                                when {
                                    n.contains("electron") -> "electronics"
                                    n.contains("fashion") || n.contains("cloth") -> "fashion"
                                    n.contains("vehicle") || n.contains("car") || n.contains("bike") -> "vehicles"
                                    else -> "others"
                                }
                            }
                            navController.navigate(Routes.categoryDetail(key))
                        },
                    )
                }
            }

            composable(Routes.SUBCATEGORIES) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    com.mhub.app.ui.discovery.SubcategoriesScreen(
                        onBack = { navController.popBackStack() },
                        onOpenCategory = { catKey -> navController.navigate("cat/$catKey") },
                    )
                }
            }

            composable(Routes.CREATE_POST) {
                if (!isAuthenticated) {
                    MainShell(navController = navController, selected = BottomTab.SELL, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) },
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
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    if (!isAuthenticated) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) },
                        )
                    } else {
                    MyPostsScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                        onCreatePost = { navController.navigate(Routes.CREATE_POST) },
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

            composable(Routes.DAILY_CODE) {
                com.mhub.app.ui.rewards.DailyCodeScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.REFERRAL_TREE) {
                com.mhub.app.ui.rewards.ReferralTreeScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.CATEGORY_MODE) {
                com.mhub.app.ui.home.CategoryModeScreen(
                    onBack = { navController.popBackStack() },
                    onSelectApp = { appKey ->
                        if (appKey.isNotBlank()) {
                            navController.navigate("${Routes.ALL_POSTS}?category_group=${appKey}") {
                                popUpTo(Routes.CATEGORY_MODE)
                            }
                        } else {
                            navController.popBackStack()
                        }
                    },
                )
            }

            composable(Routes.CHAT) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    if (!isAuthenticated) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) },
                            modifier = Modifier.padding(top = 64.dp),
                        )
                    } else {
                        ChatScreen(onBack = { navController.popBackStack() }, onNavigateToLogin = { navController.navigate(Routes.LOGIN) })
                    }
                }
            }

            composable(Routes.SETTINGS) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    SettingsScreen(onBack = { navController.popBackStack() })
                }
            }

            // ── Commerce ──
            composable(Routes.POST_WELCOME) {
                MainShell(navController = navController, selected = BottomTab.SELL, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    if (!isAuthenticated) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) },
                            modifier = Modifier.padding(top = 64.dp),
                        )
                    } else {
                    PostWelcomeScreen(
                        onBack = { navController.popBackStack() },
                        onStartPost = { navController.navigate(Routes.CREATE_POST) },
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
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    if (!isAuthenticated) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) },
                        )
                    } else {
                    TierSelectionScreen(onBack = { navController.popBackStack() })
                    }
                }
            }

            composable(Routes.NEARBY) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    NearbyScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                    )
                }
            }

            composable(Routes.SCANNER) {
                com.mhub.app.ui.scanner.ScannerScreen(
                    onBack = { navController.popBackStack() },
                    onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                    onSearch = { query ->
                        navController.navigate("search?query=$query")
                    },
                )
            }

            composable(
                route = Routes.CATEGORY_DETAIL,
                arguments = listOf(navArgument("categoryKey") { type = NavType.StringType }),
            ) { entry ->
                val key = entry.arguments?.getString("categoryKey").orEmpty()
                CategoryDetailScreen(
                    onBack = { navController.popBackStack() },
                    onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                )
            }

            composable(Routes.BOUGHT_POSTS) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    if (!isAuthenticated) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) },
                        )
                    } else {
                    BoughtPostsScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                    )
                    }
                }
            }

            composable(Routes.SOLD_POSTS) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    if (!isAuthenticated) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) },
                        )
                    } else {
                    SoldPostsScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                    )
                    }
                }
            }

            composable(Routes.BUYER_VIEW) {
                BuyerViewScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.SALE_DONE) {
                SaleDoneScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.SALE_UNDONE) {
                SaleUndoneScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.OFFERS) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    if (!isAuthenticated) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) },
                        )
                    } else {
                    OffersScreen(onBack = { navController.popBackStack() })
                    }
                }
            }

            composable(Routes.PAYMENT) {
                PaymentScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.CART) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    CartScreen(onBack = { navController.popBackStack() })
                }
            }

            composable(Routes.RECENTLY_VIEWED) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    RecentlyViewedScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                    )
                }
            }

            composable(Routes.SAVED_SEARCHES) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    SavedSearchesScreen(onBack = { navController.popBackStack() }, onRunSearch = { q -> navController.navigate("search?query=${q}") })
                }
            }

            composable(Routes.COMPARE) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    CompareScreen(onBack = { navController.popBackStack() })
                }
            }

            // ── Social ──
            composable(
                route = Routes.FEED_DETAIL,
                arguments = listOf(navArgument("feedId") { type = NavType.StringType }),
            ) { entry ->
                val feedId = entry.arguments?.getString("feedId").orEmpty()
                FeedDetailScreen(feedId = feedId, onBack = { navController.popBackStack() })
            }

            composable(Routes.MY_FEED) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    MyFeedScreen(onBack = { navController.popBackStack() })
                }
            }

            composable(Routes.FEED_POST_ADD) {
                FeedPostAddScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.PUBLIC_WALL) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    PublicWallScreen(onBack = { navController.popBackStack() })
                }
            }

            composable(Routes.COMPLAINTS) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    ComplaintsScreen(onBack = { navController.popBackStack() })
                }
            }

            composable(Routes.FEEDBACK) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    FeedbackScreen(onBack = { navController.popBackStack() })
                }
            }

            composable(
                route = Routes.REVIEWS,
                arguments = listOf(navArgument("userId") { type = NavType.StringType }),
            ) { entry ->
                val userId = entry.arguments?.getString("userId").orEmpty()
                ReviewsScreen(userId = userId, onBack = { navController.popBackStack() })
            }

            // ── Account ──
            composable(Routes.DASHBOARD) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    if (!isAuthenticated) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) },
                        )
                    } else {
                    DashboardScreen(onBack = { navController.popBackStack() })
                    }
                }
            }

            composable(Routes.SECURITY) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    if (!isAuthenticated) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) },
                        )
                    } else {
                    SecurityScreen(onBack = { navController.popBackStack() })
                    }
                }
            }

            composable(Routes.ACCOUNT_DELETE) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    if (!isAuthenticated) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) },
                        )
                    } else {
                    AccountDeleteScreen(onBack = { navController.popBackStack() })
                    }
                }
            }

            composable(Routes.VERIFICATION) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    if (!isAuthenticated) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) },
                        )
                    } else {
                    VerificationScreen(onBack = { navController.popBackStack() })
                    }
                }
            }

            composable(Routes.ANALYTICS) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    if (!isAuthenticated) {
                        com.mhub.app.ui.components.LoginPromptCard(
                            onSignIn = { guestBrowsing = false; navController.navigate(Routes.AUTH_GRAPH) { popUpTo(0) { inclusive = true } } },
                            onCreateAccount = { guestBrowsing = false; navController.navigate(Routes.SIGNUP) },
                        )
                    } else {
                    AnalyticsScreen(onBack = { navController.popBackStack() })
                    }
                }
            }

            // ── Channels ──
            composable(Routes.CHANNELS) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    ChannelsListScreen(
                        onBack = { navController.popBackStack() },
                        onOpenChannel = { id -> navController.navigate(Routes.channelDetail(id)) },
                        onCreateChannel = { navController.navigate(Routes.CHANNEL_CREATE) },
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
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    CentreListScreen(
                        onBack = { navController.popBackStack() },
                        onOpenCentre = { id -> navController.navigate(Routes.centreDetail(id)) },
                        onCreateCentre = { navController.navigate(Routes.CENTRE_CREATE) },
                    )
                }
            }

            composable(Routes.CENTRE_CREATE) {
                CreateCentreScreen(onBack = { navController.popBackStack() })
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

            // ── Legal ──
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

            // ── New screens ──
            composable(Routes.ACTIVITY_HUB) {
                MainShell(navController = navController, selected = BottomTab.PROFILE, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }) {
                    com.mhub.app.ui.discovery.ActivityHubScreen(
                        onBack = { navController.popBackStack() },
                        onNavigate = { key ->
                            when (key) {
                                "chat" -> navController.navigate(Routes.CHAT)
                                "offers" -> navController.navigate(Routes.OFFERS)
                                "reviews" -> navController.navigate(Routes.PROFILE)
                                "nearby" -> navController.navigate(Routes.NEARBY)
                                "wishlist" -> navController.navigate(Routes.WISHLIST)
                                "cart" -> navController.navigate(Routes.CART)
                                "my-posts" -> navController.navigate(Routes.MY_POSTS)
                                "notifications" -> navController.navigate(Routes.NOTIFICATIONS)
                            }
                        },
                    )
                }
            }

            // ── Category App Shell (per-category mini-app) ──────────────────
            composable(
                route = "cat/{catKey}",
                arguments = listOf(navArgument("catKey") { type = NavType.StringType }),
            ) { entry ->
                val catKey = entry.arguments?.getString("catKey").orEmpty()
                MainShell(navController = navController, selected = BottomTab.ALL_POSTS, currentThemeMode = themeMode, onSetThemeMode = { themeVm.setThemeMode(it) }, activeCategoryKey = catKey) {
                CategoryAppShell(
                    categoryKey = catKey,
                    useExternalBottomNav = true,
                    onBackToLauncher = {
                        analytics.logEvent(
                            "category_exit_to_launcher",
                            Bundle().apply {
                                putString("category_key", catKey)
                            },
                        )
                        navController.navigate(Routes.HOME) {
                            popUpTo(Routes.HOME) { inclusive = false }
                            launchSingleTop = true
                        }
                    },
                    onOpenSearch = { navController.navigate("${Routes.SEARCH}?query=${catKey}") },
                    onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                    onOpenOrders = { navController.navigate(Routes.ORDER_HISTORY) },
                    onOpenSettings = { navController.navigate(Routes.SETTINGS) },
                    onOpenHelp = { navController.navigate(Routes.FAQ) },
                    onSwitchCategory = { nextKey ->
                        val safeKey = nextKey.lowercase().let {
                            if (it in setOf("electronics", "fashion", "vehicles", "others")) it else "electronics"
                        }
                        analytics.logEvent(
                            "category_switch",
                            Bundle().apply {
                                putString("from_category", catKey)
                                putString("to_category", safeKey)
                            },
                        )
                        navController.navigate("cat/$safeKey") {
                            launchSingleTop = true
                        }
                    },
                    onOpenPostDetail = { id ->
                        // route mock product IDs to MockProductDetailScreen
                        if (id.startsWith("ep") || id.startsWith("fp") || id.startsWith("gp") || id.startsWith("fup")) {
                            navController.navigate("cat-product/$id")
                        } else {
                            navController.navigate(Routes.postDetail(id))
                        }
                    },
                    onOpenFeed = { navController.navigate(Routes.FEED) },
                    onOpenForYou = { navController.navigate(Routes.FOR_YOU) },
                )
                }
            }

            // ── Mock Product Detail (category app products) ──────────────────
            composable(
                route = "cat-product/{productId}",
                arguments = listOf(navArgument("productId") { type = NavType.StringType }),
            ) { entry ->
                val productId = entry.arguments?.getString("productId").orEmpty()
                MockProductDetailScreen(
                    productId = productId,
                    onBack = { navController.popBackStack() },
                    onOpenProduct = { id -> navController.navigate("cat-product/$id") },
                )
            }

            // ── Checkout Flow ────────────────────────────────────────────────
            composable(Routes.CHECKOUT_ADDRESS) {
                CheckoutAddressScreen(
                    onBack = { navController.popBackStack() },
                    onNext = { _, _, address ->
                        navController.navigate(Routes.CHECKOUT_PAYMENT)
                    },
                )
            }

            composable(Routes.CHECKOUT_PAYMENT) {
                CheckoutPaymentScreen(
                    onBack = { navController.popBackStack() },
                    onNext = { method ->
                        navController.navigate(Routes.CHECKOUT_REVIEW + "?method=" + method)
                    },
                )
            }

            composable(
                route = Routes.CHECKOUT_REVIEW + "?method={method}",
                arguments = listOf(navArgument("method") { type = NavType.StringType; defaultValue = "UPI" }),
            ) { entry ->
                val method = entry.arguments?.getString("method") ?: "UPI"
                CheckoutReviewScreen(
                    address = "Selected delivery address",
                    paymentMethod = method,
                    onBack = { navController.popBackStack() },
                    onPlaceOrder = { orderId ->
                        navController.navigate(Routes.CHECKOUT_CONFIRM + "?orderId=${orderId ?: ""}") {
                            popUpTo(Routes.CHECKOUT_ADDRESS) { inclusive = true }
                        }
                    },
                    onOrderFailed = {
                        navController.navigate(Routes.CHECKOUT_FAILED) {
                            popUpTo(Routes.CHECKOUT_ADDRESS) { inclusive = true }
                        }
                    },
                )
            }

            composable(
                route = Routes.CHECKOUT_CONFIRM + "?orderId={orderId}",
                arguments = listOf(navArgument("orderId") { type = NavType.StringType; defaultValue = "" }),
            ) { entry ->
                val orderId = entry.arguments?.getString("orderId")?.ifBlank { null }
                OrderConfirmationScreen(
                    onContinueShopping = {
                        navController.navigate(Routes.HOME) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                    onViewOrder = { navController.navigate(Routes.BOUGHT_POSTS) },
                    orderId = orderId,
                )
            }

            composable(Routes.CHECKOUT_FAILED) {
                OrderFailedScreen(
                    onRetry = { navController.popBackStack() },
                    onGoToCart = { navController.navigate(Routes.CART) },
                )
            }

            // ── Recently Viewed (full screen) ────────────────────────────────
            composable(Routes.RECENTLY_VIEWED_SCREEN) {
                RecentlyViewedFullScreen(
                    onBack = { navController.popBackStack() },
                    onOpenProduct = { id -> navController.navigate("cat-product/$id") },
                )
            }

            // ── Static pages ─────────────────────────────────────────────────
            composable(Routes.ABOUT_US) {
                AboutUsScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.CONTACT_US) {
                ContactUsScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.FAQ) {
                FAQScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.SHIPPING_POLICY) {
                com.mhub.app.ui.legal.ShippingPolicyScreen(onBack = { navController.popBackStack() })
            }

            // ── Profile sub-screens ──────────────────────────────────────────
            composable(Routes.ORDER_HISTORY) {
                com.mhub.app.ui.profile.OrderHistoryScreen(
                    onBack = { navController.popBackStack() },
                    onOpenOrderDetail = { id -> navController.navigate(Routes.orderDetail(id)) },
                )
            }

            composable(
                route = Routes.ORDER_DETAIL,
                arguments = listOf(navArgument("orderId") { type = NavType.StringType }),
            ) { backStack ->
                val orderId = backStack.arguments?.getString("orderId") ?: ""
                com.mhub.app.ui.profile.OrderDetailScreen(
                    orderId = orderId,
                    onBack = { navController.popBackStack() },
                )
            }

            composable(Routes.ADDRESS_BOOK) {
                com.mhub.app.ui.profile.AddressBookScreen(
                    onBack = { navController.popBackStack() },
                    onAddAddress = { navController.navigate(Routes.ADDRESS_ADD) },
                    onEditAddress = { id -> navController.navigate(Routes.addressEdit(id)) },
                )
            }

            composable(Routes.ADDRESS_ADD) {
                com.mhub.app.ui.profile.AddressFormScreen(
                    onBack = { navController.popBackStack() },
                )
            }

            composable(
                route = Routes.ADDRESS_EDIT,
                arguments = listOf(navArgument("addressId") { type = NavType.StringType }),
            ) { backStack ->
                val addressId = backStack.arguments?.getString("addressId") ?: ""
                com.mhub.app.ui.profile.AddressFormScreen(
                    addressId = addressId,
                    onBack = { navController.popBackStack() },
                )
            }

            // EDIT_PROFILE is handled inline in ProfileScreen's edit dialog
            composable(Routes.EDIT_PROFILE) {
                // Redirect to Profile screen where edit is inline
                LaunchedEffect(Unit) {
                    navController.navigate(Routes.PROFILE) {
                        popUpTo(Routes.EDIT_PROFILE) { inclusive = true }
                    }
                }
            }

            // CHAT_LIST is an alias for CHAT
            composable(Routes.CHAT_LIST) {
                LaunchedEffect(Unit) {
                    navController.navigate(Routes.CHAT) {
                        popUpTo(Routes.CHAT_LIST) { inclusive = true }
                    }
                }
            }
        }
        }

        // ── Auth Gate Popup (app-level overlay) ─────────────────────────
        com.mhub.app.core.AuthGatePopup(
            visible = showAuthGate,
            onSignIn = { showAuthGate = false; navController.navigate(Routes.LOGIN) },
            onCreateAccount = { showAuthGate = false; navController.navigate(Routes.SIGNUP) },
            onDismiss = { showAuthGate = false },
        )

        // ── More Drawer Overlay (app-level) ──────────────────────────────
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
                        .clickable(enabled = false) {},
                ) {
                    MoreScreen(
                        onOpenNotifications = { showMoreDrawer = false; navController.navigate(Routes.NOTIFICATIONS) },
                        onOpenWishlist = { showMoreDrawer = false; navController.navigate(Routes.WISHLIST) },
                        onOpenSearch = { showMoreDrawer = false; navController.navigate(Routes.SEARCH) },
                        onOpenCategories = { showMoreDrawer = false; navController.navigate(Routes.CATEGORIES) },
                        onOpenCreatePost = { showMoreDrawer = false; navController.navigate(Routes.POST_WELCOME) },
                        onOpenChat = { showMoreDrawer = false; navController.navigate(Routes.CHAT) },
                        onOpenKyc = { showMoreDrawer = false; navController.navigate(Routes.KYC) },
                        onOpenSettings = { showMoreDrawer = false; navController.navigate(Routes.SETTINGS) },
                        onOpenForYou = { showMoreDrawer = false; navController.navigate(Routes.FOR_YOU) },
                        onOpenRewards = { showMoreDrawer = false; navController.navigate(Routes.REWARDS) },
                        onOpenOffers = { showMoreDrawer = false; navController.navigate(Routes.OFFERS) },
                        onOpenNearby = { showMoreDrawer = false; navController.navigate(Routes.NEARBY) },
                        onOpenDashboard = { showMoreDrawer = false; navController.navigate(Routes.DASHBOARD) },
                        onOpenScanner = { showMoreDrawer = false; navController.navigate(Routes.SCANNER) },
                        onOpenCart = { showMoreDrawer = false; navController.navigate(Routes.CART) },
                        onOpenTierSelection = { showMoreDrawer = false; navController.navigate(Routes.TIER_SELECTION) },
                        onOpenCentre = { showMoreDrawer = false; navController.navigate(Routes.CENTRE_LIST) },
                        onOpenCategoryMode = { showMoreDrawer = false; navController.navigate(Routes.CATEGORY_MODE) },
                        onOpenSavedSearches = { showMoreDrawer = false; navController.navigate(Routes.SAVED_SEARCHES) },
                        onOpenRecentlyViewed = { showMoreDrawer = false; navController.navigate(Routes.RECENTLY_VIEWED) },
                        onOpenCompare = { showMoreDrawer = false; navController.navigate(Routes.COMPARE) },
                        onOpenFeed = { showMoreDrawer = false; navController.navigate(Routes.FEED) },
                        onOpenMyFeed = { showMoreDrawer = false; navController.navigate(Routes.MY_FEED) },
                        onOpenChannels = { showMoreDrawer = false; navController.navigate(Routes.CHANNELS) },
                        onOpenPublicWall = { showMoreDrawer = false; navController.navigate(Routes.PUBLIC_WALL) },
                        onOpenMyReviews = { showMoreDrawer = false; navController.navigate(Routes.PROFILE) },
                        onOpenFeedback = { showMoreDrawer = false; navController.navigate(Routes.FEEDBACK) },
                        onOpenComplaints = { showMoreDrawer = false; navController.navigate(Routes.COMPLAINTS) },
                        onOpenActivityHub = { showMoreDrawer = false; navController.navigate(Routes.ACTIVITY_HUB) },
                        onOpenProfile = { showMoreDrawer = false; navController.navigate(Routes.PROFILE) },
                        onOpenMyPosts = { showMoreDrawer = false; navController.navigate(Routes.MY_POSTS) },
                        onOpenBoughtPosts = { showMoreDrawer = false; navController.navigate(Routes.BOUGHT_POSTS) },
                        onOpenSoldPosts = { showMoreDrawer = false; navController.navigate(Routes.SOLD_POSTS) },
                        onOpenVerification = { showMoreDrawer = false; navController.navigate(Routes.VERIFICATION) },
                        onOpenAnalytics = { showMoreDrawer = false; navController.navigate(Routes.ANALYTICS) },
                        onOpenAccountDelete = { showMoreDrawer = false; navController.navigate(Routes.ACCOUNT_DELETE) },
                        onOpenAdminPanel = { showMoreDrawer = false; navController.navigate(Routes.ADMIN_PANEL) },
                        onOpenAboutUs = { showMoreDrawer = false; navController.navigate(Routes.ABOUT_US) },
                        onOpenContactUs = { showMoreDrawer = false; navController.navigate(Routes.CONTACT_US) },
                        onOpenFaq = { showMoreDrawer = false; navController.navigate(Routes.FAQ) },
                        onOpenSubcategories = { showMoreDrawer = false; navController.navigate(Routes.SUBCATEGORIES) },
                        onOpenLogin = { showMoreDrawer = false; navController.navigate(Routes.LOGIN) },
                        isAdmin = false,
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
 * Profile → AllPosts loses category context and shows an empty feed.
 */
val LocalActiveCategoryKey = staticCompositionLocalOf<String?> { null }
val LocalOnOpenMore = staticCompositionLocalOf<() -> Unit> { {} }
val LocalAuthGate = staticCompositionLocalOf<() -> Unit> { {} }

enum class BottomTab(
    val route: String,
    val labelRes: Int,
    val iconOutlined: ImageVector,
    val iconFilled: ImageVector,
) {
    HOME(Routes.HOME, R.string.nav_home, Icons.Outlined.Home, Icons.Filled.Home),
    ALL_POSTS(Routes.ALL_POSTS, R.string.nav_explore, Icons.Outlined.GridView, Icons.Filled.GridView),
    SELL(Routes.POST_WELCOME, R.string.nav_sell, Icons.Outlined.AddCircleOutline, Icons.Filled.AddCircle),
    REWARDS(Routes.REWARDS, R.string.nav_rewards_tab, Icons.Outlined.EmojiEvents, Icons.Filled.EmojiEvents),
    PROFILE(Routes.PROFILE, R.string.nav_profile, Icons.Outlined.Person, Icons.Filled.Person),
}

@Composable
fun MainShell(
    navController: NavHostController,
    selected: BottomTab,
    currentThemeMode: ThemeMode = ThemeMode.SYSTEM,
    onSetThemeMode: (ThemeMode) -> Unit = {},
    showTopBar: Boolean = false,
    showBottomBar: Boolean = true,
    activeCategoryKey: String? = null,
    onOpenMore: () -> Unit = {},
    content: @Composable () -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(
            topBar = {
                if (showTopBar) {
                MhubTopBar(
                    onSearch = { navController.navigate(Routes.SEARCH) },
                    onNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                    onCart = { navController.navigate(Routes.CART) },
                    onWishlist = { navController.navigate(Routes.WISHLIST) },
                )
                }
            },
            bottomBar = {
                if (showBottomBar) {
                val liveActiveCategoryKey = LocalActiveCategoryKey.current ?: activeCategoryKey
                NavigationBar(
                    tonalElevation = 0.dp,
                    containerColor = MaterialTheme.colorScheme.surface,
                    modifier = Modifier.shadow(
                        elevation = MhubElevation.bottomBar,
                        shape = MhubShapes.bottomBar,
                    ),
                ) {
                    BottomTab.entries.forEach { tab ->
                        val isSelected = tab == selected
                        NavigationBarItem(
                            selected = isSelected,
                            onClick = {
                                val currentRoute = navController.currentDestination?.route
                                val targetRoute = if (tab == BottomTab.ALL_POSTS && liveActiveCategoryKey != null) {
                                    "cat/$liveActiveCategoryKey"
                                } else {
                                    tab.route
                                }
                                if (targetRoute != currentRoute) {
                                    navController.navigate(targetRoute) {
                                        // Pop up to the main graph root (not HOME) so category
                                        // routes in the back stack survive tab switches.
                                        popUpTo(Routes.MAIN_GRAPH) { saveState = true; inclusive = false }
                                        launchSingleTop = true
                                        restoreState = true
                                    }
                                }
                            },
                            icon = {
                                Icon(
                                    imageVector = if (isSelected) tab.iconFilled else tab.iconOutlined,
                                    contentDescription = null,
                                    modifier = Modifier.size(if (tab == BottomTab.SELL) 28.dp else 24.dp),
                                )
                            },
                            label = {
                                Text(
                                    text = stringResource(tab.labelRes),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                )
                            },
                            alwaysShowLabel = true,
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = if (tab == BottomTab.SELL) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.primary,
                                selectedTextColor = if (tab == BottomTab.SELL) MaterialTheme.colorScheme.tertiary else MaterialTheme.colorScheme.primary,
                                indicatorColor = if (tab == BottomTab.SELL) MaterialTheme.colorScheme.tertiaryContainer else MaterialTheme.colorScheme.primaryContainer,
                            ),
                        )
                    }
                    // "More" hamburger menu item
                    val openMore = LocalOnOpenMore.current
                    NavigationBarItem(
                        selected = false,
                        onClick = openMore,
                        icon = { Icon(Icons.Outlined.Menu, contentDescription = null, modifier = Modifier.size(24.dp)) },
                        label = { Text(stringResource(R.string.nav_more), style = MaterialTheme.typography.labelSmall) },
                        alwaysShowLabel = true,
                    )
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
        "chat", "messages" -> {
            val id = segments.getOrNull(1)
            if (id != null) navController.navigate("${Routes.CHAT}/$id")
            else navController.navigate(Routes.CHAT)
        }
        "search" -> navController.navigate(Routes.SEARCH)
        "create-post", "sell" -> navController.navigate(Routes.CREATE_POST)
        "profile" -> {
            val id = segments.getOrNull(1)
            if (id != null) navController.navigate("${Routes.PROFILE}/$id")
        }
        "wishlist", "saved" -> navController.navigate(Routes.WISHLIST)
        "cart" -> navController.navigate(Routes.CART)
        "notifications" -> navController.navigate(Routes.NOTIFICATIONS)
        "settings" -> navController.navigate(Routes.SETTINGS)
    }
}
