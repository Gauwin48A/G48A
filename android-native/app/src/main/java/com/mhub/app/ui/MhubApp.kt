package com.mhub.app.ui

import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.consumeWindowInsets
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Article
import androidx.compose.material.icons.automirrored.outlined.Article
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.EmojiEvents
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Star
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
import com.mhub.app.ui.auth.LoginScreen
import com.mhub.app.ui.categories.CategoriesScreen
import com.mhub.app.ui.chat.ChatScreen
import com.mhub.app.ui.explore.ExploreScreen
import com.mhub.app.ui.feed.FeedScreen
import com.mhub.app.ui.home.CategoryHubScreen
import com.mhub.app.ui.home.HomeScreen
import com.mhub.app.ui.home.PostDetailScreen
import com.mhub.app.ui.kyc.KycScreen
import com.mhub.app.ui.more.MoreScreen
import com.mhub.app.ui.navigation.Routes
import com.mhub.app.ui.notifications.NotificationsScreen
import com.mhub.app.ui.parity.WebParityHubScreen
import com.mhub.app.ui.parity.WebParityWebReplicaScreen
import com.mhub.app.ui.post.CreatePostScreen
import com.mhub.app.ui.post.MyPostsScreen
import com.mhub.app.ui.profile.ProfileScreen
import com.mhub.app.ui.rewards.RewardsScreen
import com.mhub.app.ui.search.SearchScreen
import com.mhub.app.ui.settings.SettingsScreen
import com.mhub.app.ui.theme.MhubTheme
import com.mhub.app.ui.wishlist.WishlistScreen

@Composable
fun MhubApp(
    onReady: () -> Unit = {},
    debugRouteOverride: String? = null,
) {
    MhubTheme {
        val navController = rememberNavController()
        val authViewModel: AuthViewModel = hiltViewModel()
        val isAuthenticated by authViewModel.isAuthenticated.collectAsState()
        var lastHandledDebugRoute by remember { mutableStateOf<String?>(null) }

        LaunchedEffect(Unit) { onReady() }
        LaunchedEffect(debugRouteOverride) {
            val targetRoute = debugRouteOverride?.trim().orEmpty()
            if (targetRoute.isNotEmpty() && targetRoute != lastHandledDebugRoute) {
                lastHandledDebugRoute = targetRoute
                navController.navigate(targetRoute) {
                    launchSingleTop = true
                    // Pop previous parity screens to prevent backstack overflow
                    // during automated capture runs.
                    popUpTo(navController.graph.startDestinationId) { inclusive = false }
                }
            }
        }

        val startDestination = if (isAuthenticated) Routes.MAIN_GRAPH else Routes.AUTH_GRAPH

        NavHost(
            navController = navController,
            startDestination = startDestination,
            enterTransition = { fadeIn() },
            exitTransition = { fadeOut() },
            popEnterTransition = { EnterTransition.None },
            popExitTransition = { ExitTransition.None },
        ) {
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
                    )
                }
            }

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
                            onOpenWebParity = { navController.navigate(Routes.WEB_PARITY_HUB) },
                        )
                    }
                }

                composable(Routes.FOR_YOU) {
                    MainShell(navController = navController, selected = BottomTab.FOR_YOU) {
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
                    MainShell(navController = navController, selected = BottomTab.REWARDS) {
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
                            onOpenWebParity = { navController.navigate(Routes.WEB_PARITY_HUB) },
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
                            onOpenParityHub = { navController.navigate(Routes.WEB_PARITY_HUB) },
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
                    onCategoryClick = { _, _ ->
                        navController.navigate(Routes.ALL_POSTS)
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

            composable(Routes.WEB_PARITY_HUB) {
                WebParityHubScreen(
                    onBack = { navController.popBackStack() },
                    onOpenPage = { key -> navController.navigate(Routes.webParityDetail(key)) },
                )
            }

            composable(
                route = Routes.WEB_PARITY_DETAIL,
                arguments = listOf(navArgument("pageKey") { type = NavType.StringType }),
            ) { entry ->
                val key = entry.arguments?.getString("pageKey").orEmpty()
                WebParityWebReplicaScreen(
                    pageKey = key,
                    onBack = { navController.popBackStack() },
                )
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
    FOR_YOU(Routes.FOR_YOU, R.string.nav_for_you, Icons.Outlined.Star, Icons.Filled.Star),
    FEED(Routes.FEED, R.string.nav_feed, Icons.AutoMirrored.Outlined.Article, Icons.AutoMirrored.Filled.Article),
    REWARDS(Routes.REWARDS, R.string.nav_rewards, Icons.Outlined.EmojiEvents, Icons.Filled.EmojiEvents),
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
