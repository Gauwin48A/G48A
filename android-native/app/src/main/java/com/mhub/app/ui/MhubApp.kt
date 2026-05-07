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
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navigation
import androidx.navigation.navArgument
import com.mhub.app.R
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
import com.mhub.app.ui.theme.MhubTheme
import com.mhub.app.ui.wishlist.WishlistScreen
import com.mhub.app.core.ConnectivityObserver
import com.mhub.app.ui.components.OfflineBanner

@Composable
fun MhubApp(
    onReady: () -> Unit = {},
    connectivityObserver: ConnectivityObserver? = null,
) {
    MhubTheme {
        val navController = rememberNavController()
        val authViewModel: AuthViewModel = hiltViewModel()
        val isAuthenticated by authViewModel.isAuthenticated.collectAsState()

        LaunchedEffect(Unit) { onReady() }

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
                    MainShell(navController = navController, selected = BottomTab.HOME) {
                        CategoryHubScreen(
                            onOpenCategory = { navController.navigate(Routes.ALL_POSTS) },
                            onOpenAllPosts = { navController.navigate(Routes.ALL_POSTS) },
                            onOpenSearch = { navController.navigate(Routes.SEARCH) },
                        )
                    }
                }

                composable(Routes.ALL_POSTS) {
                    MainShell(navController = navController, selected = BottomTab.ALL_POSTS) {
                        HomeScreen(
                            onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                            onOpenSearch = { navController.navigate(Routes.SEARCH) },
                            onCreatePost = { navController.navigate(Routes.CREATE_POST) },
                            onOpenExplore = { navController.navigate(Routes.FOR_YOU) },
                            onOpenCategories = { navController.navigate(Routes.CATEGORIES) },
                        )
                    }
                }

                composable(Routes.FOR_YOU) {
                    MainShell(navController = navController, selected = BottomTab.MORE) {
                        ExploreScreen(
                            onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                            onOpenSearch = { navController.navigate(Routes.SEARCH) },
                            onOpenCategories = { navController.navigate(Routes.CATEGORIES) },
                            title = "For You",
                            subtitle = "Personalized picks based on your activity",
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
                        WishlistScreen(onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) })
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

            composable(Routes.SEARCH) {
                SearchScreen(
                    onBack = { navController.popBackStack() },
                    onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                )
            }

            composable(Routes.CATEGORIES) {
                CategoriesScreen(
                    onBack = { navController.popBackStack() },
                    onCategoryClick = { _, _ -> navController.navigate(Routes.ALL_POSTS) },
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
                )
            }

            composable(Routes.KYC) {
                KycScreen(onBack = { navController.popBackStack() })
            }

            composable(Routes.CHAT) {
                ChatScreen(onBack = { navController.popBackStack() })
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
                SavedSearchesScreen(onBack = { navController.popBackStack() })
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
                            if (tab != selected) {
                                navController.navigate(tab.route) {
                                    popUpTo(Routes.HOME) { saveState = true; inclusive = false }
                                    launchSingleTop = true
                                    restoreState = true
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
