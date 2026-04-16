package com.mhub.app.navigation

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.mhub.feature.auth.LoginScreen
import com.mhub.feature.auth.SignupScreen
import com.mhub.feature.auth.ForgotPasswordScreen
import com.mhub.feature.auth.ResetPasswordScreen
import com.mhub.feature.chat.ChatScreen
import com.mhub.feature.chat.ConversationListScreen
import com.mhub.feature.detail.PostDetailScreen
import com.mhub.feature.home.CategoryHubScreen
import com.mhub.feature.home.HomeScreen
import com.mhub.feature.listings.EditPostScreen
import com.mhub.feature.listings.ListingsScreen
import com.mhub.feature.listings.AddPostScreen
import com.mhub.feature.listings.MyPostsScreen
import com.mhub.feature.listings.WishlistScreen
import com.mhub.feature.notifications.NotificationsScreen
import com.mhub.feature.profile.ProfileScreen
import com.mhub.feature.search.SearchScreen
import com.mhub.feature.settings.SettingsScreen

@Composable
fun MhubNavHost(
    navController: NavHostController,
    isAuthenticated: Boolean,
    modifier: Modifier = Modifier,
) {
    val startDestination = if (isAuthenticated) "home" else "login"

    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = modifier,
    ) {
        // ─── Auth ────────────────────────────────────────────────────
        composable("login") {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate("home") {
                        popUpTo("login") { inclusive = true }
                    }
                },
                onNavigateToSignup = { navController.navigate("signup") },
                onNavigateToForgotPassword = { navController.navigate("forgot_password") },
            )
        }

        composable("signup") {
            SignupScreen(
                onSignupSuccess = {
                    navController.navigate("home") {
                        popUpTo("signup") { inclusive = true }
                    }
                },
                onNavigateToLogin = { navController.popBackStack() },
            )
        }

        composable("forgot_password") {
            ForgotPasswordScreen(
                onBack = { navController.popBackStack() },
            )
        }

        composable(
            route = "reset_password/{token}",
            arguments = listOf(navArgument("token") { type = NavType.StringType }),
            deepLinks = listOf(
                navDeepLink { uriPattern = "mhub://reset-password/{token}" },
                navDeepLink { uriPattern = "https://mhub.app/reset-password/{token}" },
            ),
        ) { backStackEntry ->
            val token = backStackEntry.arguments?.getString("token") ?: ""
            ResetPasswordScreen(
                token = token,
                onResetSuccess = {
                    navController.navigate("login") {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onBack = { navController.popBackStack() },
            )
        }

        // ─── Main Tabs ──────────────────────────────────────────────
        composable(
            route = "home",
            deepLinks = listOf(
                navDeepLink { uriPattern = "mhub://home" },
                navDeepLink { uriPattern = "https://mhub.app/home" },
            ),
        ) {
            HomeScreen(
                onPostClick = { postId -> navController.navigate("post/$postId") },
                onSearchClick = { navController.navigate("search") },
                onCategoryClick = { category -> navController.navigate("listings?category=$category") },
            )
        }

        composable(
            route = "listings?category={category}",
            arguments = listOf(navArgument("category") { type = NavType.StringType; defaultValue = "" }),
        ) {
            ListingsScreen(
                onPostClick = { postId -> navController.navigate("post/$postId") },
            )
        }

        composable("add_post") {
            AddPostScreen(
                onPostCreated = { navController.popBackStack() },
                onBack = { navController.popBackStack() },
            )
        }

        composable(
            route = "notifications",
            deepLinks = listOf(
                navDeepLink { uriPattern = "mhub://notifications" },
            ),
        ) {
            NotificationsScreen(
                onNotificationClick = { notification ->
                    notification.data?.get("postId")?.toIntOrNull()?.let { postId ->
                        navController.navigate("post/$postId")
                    }
                    notification.data?.get("conversationId")?.toIntOrNull()?.let { convId ->
                        navController.navigate("chat/$convId")
                    }
                },
            )
        }

        composable(
            route = "profile",
            deepLinks = listOf(
                navDeepLink { uriPattern = "mhub://profile" },
            ),
        ) {
            ProfileScreen(
                onLogout = {
                    navController.navigate("login") {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onNavigateToSettings = { navController.navigate("settings") },
                onNavigateToMyPosts = { navController.navigate("my_posts") },
                onNavigateToWishlist = { navController.navigate("wishlist") },
                onNavigateToMessages = { navController.navigate("conversations") },
            )
        }

        // ─── Search ─────────────────────────────────────────────────
        composable("search") {
            SearchScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToPost = { postId -> navController.navigate("post/$postId") },
            )
        }

        // ─── Detail Screens ─────────────────────────────────────────
        composable(
            route = "post/{postId}",
            arguments = listOf(navArgument("postId") { type = NavType.IntType }),
            deepLinks = listOf(
                navDeepLink { uriPattern = "mhub://post/{postId}" },
                navDeepLink { uriPattern = "https://mhub.app/post/{postId}" },
                navDeepLink { uriPattern = "https://mhub.app/listing/{postId}" },
            ),
        ) {
            PostDetailScreen(
                onBack = { navController.popBackStack() },
                onNavigateToChat = { userId ->
                    navController.navigate("conversations")
                },
            )
        }

        // ─── Edit Post ──────────────────────────────────────────────
        composable(
            route = "edit_post/{postId}",
            arguments = listOf(navArgument("postId") { type = NavType.IntType }),
        ) {
            EditPostScreen(
                onPostUpdated = { navController.popBackStack() },
                onPostDeleted = {
                    navController.navigate("home") {
                        popUpTo("home") { inclusive = true }
                    }
                },
                onBack = { navController.popBackStack() },
            )
        }

        // ─── My Posts ───────────────────────────────────────────────
        composable("my_posts") {
            MyPostsScreen(
                onPostClick = { postId -> navController.navigate("post/$postId") },
                onEditPost = { postId -> navController.navigate("edit_post/$postId") },
                onBack = { navController.popBackStack() },
            )
        }

        // ─── Wishlist ───────────────────────────────────────────────
        composable("wishlist") {
            WishlistScreen(
                onPostClick = { postId -> navController.navigate("post/$postId") },
                onBack = { navController.popBackStack() },
            )
        }

        // ─── Categories Hub ─────────────────────────────────────────
        composable("categories") {
            CategoryHubScreen(
                onCategoryClick = { category -> navController.navigate("listings?category=$category") },
                onBack = { navController.popBackStack() },
            )
        }

        // ─── Chat ───────────────────────────────────────────────────
        composable("conversations") {
            ConversationListScreen(
                onNavigateToChat = { conversationId ->
                    navController.navigate("chat/$conversationId")
                },
                onNavigateBack = { navController.popBackStack() },
            )
        }

        composable(
            route = "chat/{conversationId}",
            arguments = listOf(navArgument("conversationId") { type = NavType.IntType }),
        ) {
            ChatScreen(
                onNavigateBack = { navController.popBackStack() },
            )
        }

        // ─── Settings ───────────────────────────────────────────────
        composable("settings") {
            SettingsScreen(
                onNavigateBack = { navController.popBackStack() },
            )
        }
    }
}
