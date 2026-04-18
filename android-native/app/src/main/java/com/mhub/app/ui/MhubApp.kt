package com.mhub.app.ui

import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.Favorite
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
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
import com.mhub.app.ui.home.HomeScreen
import com.mhub.app.ui.home.PostDetailScreen
import com.mhub.app.ui.kyc.KycScreen
import com.mhub.app.ui.navigation.Routes
import com.mhub.app.ui.post.CreatePostScreen
import com.mhub.app.ui.post.MyPostsScreen
import com.mhub.app.ui.profile.ProfileScreen
import com.mhub.app.ui.search.SearchScreen
import com.mhub.app.ui.settings.SettingsScreen
import com.mhub.app.ui.theme.MhubTheme
import com.mhub.app.ui.wishlist.WishlistScreen

@Composable
fun MhubApp(onReady: () -> Unit = {}) {
    MhubTheme {
        val navController = rememberNavController()
        val authViewModel: AuthViewModel = hiltViewModel()
        val isAuthenticated by authViewModel.isAuthenticated.collectAsState()

        LaunchedEffect(Unit) { onReady() }

        LaunchedEffect(isAuthenticated) {
            val currentRoute = navController.currentBackStackEntry?.destination?.route
            if (!isAuthenticated && currentRoute?.startsWith("main") == true) {
                navController.navigate(Routes.AUTH_GRAPH) {
                    popUpTo(0) { inclusive = true }
                }
            }
        }

        val startDestination = if (isAuthenticated) Routes.MAIN_GRAPH else Routes.AUTH_GRAPH

        NavHost(navController = navController, startDestination = startDestination) {

            navigation(startDestination = Routes.LOGIN, route = Routes.AUTH_GRAPH) {
                composable(Routes.LOGIN) {
                    LoginScreen(
                        onSignedIn = {
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
                    MainShell(navController, BottomTab.HOME) {
                        HomeScreen(
                            onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                            onOpenSearch = { navController.navigate(Routes.SEARCH) },
                            onCreatePost = { navController.navigate(Routes.CREATE_POST) },
                        )
                    }
                }
                composable(Routes.CATEGORIES) {
                    MainShell(navController, BottomTab.CATEGORIES) {
                        CategoriesScreen(
                            onCategoryClick = { id, _ ->
                                navController.navigate(Routes.SEARCH)
                            },
                        )
                    }
                }
                composable(Routes.WISHLIST) {
                    MainShell(navController, BottomTab.WISHLIST) {
                        WishlistScreen(onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) })
                    }
                }
                composable(Routes.PROFILE) {
                    MainShell(navController, BottomTab.PROFILE) {
                        ProfileScreen(
                            onSignedOut = {
                                navController.navigate(Routes.AUTH_GRAPH) {
                                    popUpTo(0) { inclusive = true }
                                }
                            },
                            onOpenSettings = { navController.navigate(Routes.SETTINGS) },
                            onOpenMyPosts = { navController.navigate(Routes.MY_POSTS) },
                            onOpenKyc = { navController.navigate(Routes.KYC) },
                        )
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

            composable(Routes.SETTINGS) {
                SettingsScreen(onBack = { navController.popBackStack() })
            }
        }
    }
}

enum class BottomTab(val route: String, val labelRes: Int) {
    HOME(Routes.HOME, R.string.nav_home),
    CATEGORIES(Routes.CATEGORIES, R.string.nav_categories),
    WISHLIST(Routes.WISHLIST, R.string.nav_wishlist),
    PROFILE(Routes.PROFILE, R.string.nav_profile),
}

@Composable
private fun MainShell(
    navController: NavHostController,
    selected: BottomTab,
    content: @Composable () -> Unit,
) {
    Scaffold(
        bottomBar = {
            NavigationBar {
                BottomTab.values().forEach { tab ->
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
                                when (tab) {
                                    BottomTab.HOME -> Icons.Outlined.Home
                                    BottomTab.CATEGORIES -> Icons.Outlined.Category
                                    BottomTab.WISHLIST -> Icons.Outlined.Favorite
                                    BottomTab.PROFILE -> Icons.Outlined.Person
                                },
                                contentDescription = null,
                            )
                        },
                        label = { Text(stringResource(tab.labelRes)) },
                    )
                }
            }
        }
    ) { padding ->
        androidx.compose.foundation.layout.Box(Modifier.padding(padding)) {
            content()
        }
    }
}
