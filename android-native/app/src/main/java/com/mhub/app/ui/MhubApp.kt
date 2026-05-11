package com.mhub.app.ui

import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Article
import androidx.compose.material.icons.automirrored.outlined.Article
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Person
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
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
import com.mhub.app.data.local.ThemeMode
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
}

@Composable
fun MhubApp(
    onReady: () -> Unit = {},
    connectivityObserver: ConnectivityObserver? = null,
    deepLinkUri: String? = null,
    onDeepLinkConsumed: () -> Unit = {},
) {
    val themeVm: AppThemeViewModel = hiltViewModel()
    val themeMode by themeVm.themeMode.collectAsState()
    MhubTheme(themeMode = themeMode) {
        val navController = rememberNavController()
        val authViewModel: AuthViewModel = hiltViewModel()
        val isAuthenticated by authViewModel.isAuthenticated.collectAsState()
        var activeCategoryKey by rememberSaveable { mutableStateOf<String?>(null) }
        val context = LocalContext.current
        val analytics = remember(context) { FirebaseAnalytics.getInstance(context) }

        LaunchedEffect(Unit) { onReady() }

        // Handle deep links
        LaunchedEffect(deepLinkUri) {
            if (deepLinkUri != null && isAuthenticated) {
                handleDeepLink(deepLinkUri, navController)
                onDeepLinkConsumed()
            }
        }

        // When session expires (token cleared by authenticator), redirect to login
        LaunchedEffect(isAuthenticated) {
            if (!isAuthenticated) {
                val currentRoute = navController.currentDestination?.route
                if (currentRoute != null && !currentRoute.startsWith("auth")) {
                    navController.navigate(Routes.AUTH_GRAPH) {
                        popUpTo(0) { inclusive = true }
                    }
                }
            }
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
            enterTransition = { fadeIn() },
            exitTransition = { fadeOut() },
            popEnterTransition = { EnterTransition.None },
            popExitTransition = { ExitTransition.None },
        ) {
            // ── Auth Graph ──
            navigation(startDestination = Routes.LOGIN, route = Routes.AUTH_GRAPH) {
                composable(Routes.LOGIN) {
                    LoginScreen(
                        onSignedIn = {
                            navController.navigate(Routes.MAIN_GRAPH) {
                                popUpTo(Routes.AUTH_GRAPH) { inclusive = true }
                            }
                        },
                        onPreviewApp = {
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
                    // CategoryHub is the launcher — no MainShell, no bottom nav
                    CategoryHubScreen(
                        onOpenCategory = { category ->
                            val mapped = when ((category.categoryGroup ?: category.name).lowercase()) {
                                "electronics" -> "electronics"
                                "fashion" -> "fashion"
                                "grocery" -> "grocery"
                                else -> "furniture"
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
                                if (it in setOf("electronics", "fashion", "grocery", "furniture")) it else "electronics"
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
                    )
                }

                composable(Routes.ALL_POSTS) {
                    MainShell(navController = navController, selected = BottomTab.ALL_POSTS) {
                        HomeScreen(
                            onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                            onOpenSearch = { navController.navigate(Routes.SEARCH) },
                            onCreatePost = { navController.navigate(Routes.CREATE_POST) },
                            onOpenExplore = { navController.navigate(Routes.FOR_YOU) },
                            onOpenCategories = { navController.navigate(Routes.CATEGORIES) },
                            activeCategoryKey = activeCategoryKey,
                            onChangeApp = {
                                activeCategoryKey = null
                                navController.navigate(Routes.HOME) {
                                    popUpTo(Routes.HOME) { inclusive = true }
                                    launchSingleTop = true
                                }
                            },
                            onOpenCart = { navController.navigate(Routes.CART) },
                            onOpenWishlist = { navController.navigate(Routes.WISHLIST) },
                            onOpenRecentlyViewed = { navController.navigate(Routes.RECENTLY_VIEWED) },
                        )
                    }
                }

                composable(Routes.FOR_YOU) {
                    MainShell(navController = navController, selected = BottomTab.MORE) {
                        com.mhub.app.ui.foryou.ForYouScreen(
                            onBack = { navController.popBackStack() },
                            onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                        )
                    }
                }

                composable(Routes.FEED) {
                    MainShell(navController = navController, selected = BottomTab.FEED) {
                        FeedScreen(
                            onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                        )
                    }
                }

                composable(Routes.REWARDS) {
                    MainShell(navController = navController, selected = BottomTab.MORE) {
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
                    MainShell(navController = navController, selected = BottomTab.PROFILE) {
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
                        )
                    }
                }

                composable(Routes.MORE) {
                    MainShell(navController = navController, selected = BottomTab.MORE) {
                        MoreScreen(
                            onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                            onOpenWishlist = { navController.navigate(Routes.WISHLIST) },
                            onOpenSearch = { navController.navigate(Routes.SEARCH) },
                            onOpenCategories = { navController.navigate(Routes.CATEGORIES) },
                            onOpenCreatePost = { navController.navigate(Routes.CREATE_POST) },
                            onOpenChat = { navController.navigate(Routes.CHAT) },
                            onOpenKyc = { navController.navigate(Routes.KYC) },
                            onOpenSettings = { navController.navigate(Routes.SETTINGS) },
                            onOpenForYou = { navController.navigate(Routes.FOR_YOU) },
                            onOpenRewards = { navController.navigate(Routes.REWARDS) },
                            onOpenOffers = { navController.navigate(Routes.OFFERS) },
                            onOpenNearby = { navController.navigate(Routes.NEARBY) },
                            onOpenDashboard = { navController.navigate(Routes.DASHBOARD) },
                        )
                    }
                }

                composable(Routes.NOTIFICATIONS) {
                    MainShell(navController = navController, selected = BottomTab.MORE) {
                        NotificationsScreen(
                            onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                        )
                    }
                }

                composable(Routes.WISHLIST) {
                    MainShell(navController = navController, selected = BottomTab.MORE) {
                        WishlistScreen(onBack = { navController.popBackStack() }, onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) })
                    }
                }
            }

            // ── Full-Screen Routes ──
            composable(
                route = Routes.POST_DETAIL,
                arguments = listOf(navArgument("postId") { type = NavType.StringType }),
            ) {
                PostDetailScreen(onBack = { navController.popBackStack() })
            }

            composable(
                route = "${Routes.SEARCH}?query={query}",
                arguments = listOf(androidx.navigation.navArgument("query") { defaultValue = ""; nullable = true }),
            ) { backStack ->
                val prefillQuery = backStack.arguments?.getString("query") ?: ""
                SearchScreen(
                    onBack = { navController.popBackStack() },
                    onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                    prefillQuery = prefillQuery,
                )
            }

            composable(Routes.CATEGORIES) {
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

            composable(Routes.CREATE_POST) {
                CreatePostScreen(
                    onBack = { navController.popBackStack() },
                    onPublished = { navController.popBackStack() },
                )
            }

            composable(Routes.MY_POSTS) {
                MyPostsScreen(
                    onBack = { navController.popBackStack() },
                    onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                    onCreatePost = { navController.navigate(Routes.CREATE_POST) },
                )
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
                ChatScreen(onBack = { navController.popBackStack() }, onNavigateToLogin = { navController.navigate(Routes.LOGIN) })
            }

            composable(Routes.SETTINGS) {
                SettingsScreen(onBack = { navController.popBackStack() })
            }

            // ── Commerce ──
            composable(Routes.POST_WELCOME) {
                PostWelcomeScreen(
                    onBack = { navController.popBackStack() },
                    onStartPost = { navController.navigate(Routes.CREATE_POST) },
                )
            }

            composable(
                route = Routes.EDIT_POST,
                arguments = listOf(navArgument("postId") { type = NavType.StringType }),
            ) { entry ->
                val postId = entry.arguments?.getString("postId").orEmpty()
                EditPostScreen(postId = postId, onBack = { navController.popBackStack() })
            }

            composable(Routes.TIER_SELECTION) {
                TierSelectionScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.NEARBY) {
                NearbyScreen(
                    onBack = { navController.popBackStack() },
                    onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
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
                BoughtPostsScreen(
                    onBack = { navController.popBackStack() },
                    onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                )
            }

            composable(Routes.SOLD_POSTS) {
                SoldPostsScreen(
                    onBack = { navController.popBackStack() },
                    onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                )
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
                OffersScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.PAYMENT) {
                PaymentScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.CART) {
                CartScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.RECENTLY_VIEWED) {
                RecentlyViewedScreen(
                    onBack = { navController.popBackStack() },
                    onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                )
            }

            composable(Routes.SAVED_SEARCHES) {
                SavedSearchesScreen(onBack = { navController.popBackStack() }, onRunSearch = { q -> navController.navigate("search?query=${q}") })
            }

            composable(Routes.COMPARE) {
                CompareScreen(onBack = { navController.popBackStack() })
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
                MyFeedScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.FEED_POST_ADD) {
                FeedPostAddScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.PUBLIC_WALL) {
                PublicWallScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.COMPLAINTS) {
                ComplaintsScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.FEEDBACK) {
                FeedbackScreen(onBack = { navController.popBackStack() })
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
                DashboardScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.SECURITY) {
                SecurityScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.ACCOUNT_DELETE) {
                AccountDeleteScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.VERIFICATION) {
                VerificationScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.ANALYTICS) {
                AnalyticsScreen(onBack = { navController.popBackStack() })
            }

            // ── Channels ──
            composable(Routes.CHANNELS) {
                ChannelsListScreen(
                    onBack = { navController.popBackStack() },
                    onOpenChannel = { id -> navController.navigate(Routes.channelDetail(id)) },
                    onCreateChannel = { navController.navigate(Routes.CHANNEL_CREATE) },
                )
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
                CentreListScreen(
                    onBack = { navController.popBackStack() },
                    onOpenCentre = { id -> navController.navigate(Routes.centreDetail(id)) },
                    onCreateCentre = { navController.navigate(Routes.CENTRE_CREATE) },
                )
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

            // ── Category App Shell (per-category mini-app) ──────────────────
            composable(
                route = "cat/{catKey}",
                arguments = listOf(navArgument("catKey") { type = NavType.StringType }),
            ) { entry ->
                val catKey = entry.arguments?.getString("catKey").orEmpty()
                CategoryAppShell(
                    categoryKey = catKey,
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
                            if (it in setOf("electronics", "fashion", "grocery", "furniture")) it else "electronics"
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
                )
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
                    onPlaceOrder = {
                        navController.navigate(Routes.CHECKOUT_CONFIRM) {
                            popUpTo(Routes.CHECKOUT_ADDRESS) { inclusive = true }
                        }
                    },
                )
            }

            composable(Routes.CHECKOUT_CONFIRM) {
                OrderConfirmationScreen(
                    onContinueShopping = {
                        navController.navigate(Routes.HOME) {
                            popUpTo(0) { inclusive = true }
                        }
                    },
                    onViewOrder = { navController.navigate(Routes.BOUGHT_POSTS) },
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
        }
        }
    }
}

enum class BottomTab(
    val route: String,
    val labelRes: Int,
    val iconOutlined: ImageVector,
    val iconFilled: ImageVector,
) {
    HOME(Routes.HOME, R.string.nav_home, Icons.Outlined.Home, Icons.Filled.Home),
    ALL_POSTS(Routes.ALL_POSTS, R.string.nav_all_posts, Icons.Outlined.GridView, Icons.Filled.GridView),
    FEED(Routes.FEED, R.string.nav_feed, Icons.AutoMirrored.Outlined.Article, Icons.AutoMirrored.Filled.Article),
    PROFILE(Routes.PROFILE, R.string.nav_profile, Icons.Outlined.Person, Icons.Filled.Person),
    MORE(Routes.MORE, R.string.nav_more, Icons.Outlined.Menu, Icons.Filled.Menu),
}

@Composable
fun MainShell(
    navController: NavHostController,
    selected: BottomTab,
    content: @Composable () -> Unit,
) {
    Scaffold(
        topBar = {
            MhubTopBar(
                onSearch = { navController.navigate(Routes.SEARCH) },
                onNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                onCart = { navController.navigate(Routes.CART) },
            )
        },
        bottomBar = {
            NavigationBar(
                tonalElevation = 0.dp,
                containerColor = MaterialTheme.colorScheme.surface,
                modifier = Modifier.shadow(
                    elevation = 14.dp,
                    shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                ),
            ) {
                BottomTab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = tab == selected,
                        onClick = {
                            val currentRoute = navController.currentDestination?.route
                            if (tab.route != currentRoute) {
                                navController.navigate(tab.route) {
                                    popUpTo(Routes.HOME) { saveState = true; inclusive = false }
                                    launchSingleTop = true
                                    restoreState = tab.route == currentRoute
                                }
                            }
                        },
                        icon = {
                            Icon(
                                imageVector = if (tab == selected) tab.iconFilled else tab.iconOutlined,
                                contentDescription = null,
                            )
                        },
                        label = {
                            Text(
                                text = stringResource(tab.labelRes),
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = if (tab == selected) FontWeight.SemiBold else FontWeight.Normal,
                            )
                        },
                        alwaysShowLabel = true,
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = MaterialTheme.colorScheme.primary,
                            selectedTextColor = MaterialTheme.colorScheme.primary,
                            indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                        ),
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
            else navController.navigate(Routes.CHAT_LIST)
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
