package com.mhub.app.ui

import android.net.Uri
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
import com.mhub.app.BuildConfig
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
import com.mhub.app.ui.parity.WebParityHubScreen
import com.mhub.app.ui.parity.WebRouteCatalog
import com.mhub.app.ui.parity.WebParityWebReplicaScreen
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

@Composable
fun MhubApp(
    onReady: () -> Unit = {},
    debugRouteOverride: String? = null,
) {
    MhubTheme {
        val navController = rememberNavController()
        val authViewModel: AuthViewModel = hiltViewModel()
        val isAuthenticated by authViewModel.isAuthenticated.collectAsState()
        val webReplicaMode = BuildConfig.WEB_REPLICA_MODE
        var lastHandledDebugRoute by remember { mutableStateOf<String?>(null) }

        LaunchedEffect(Unit) { onReady() }
        LaunchedEffect(debugRouteOverride) {
            val targetRoute = normalizeDebugRoute(debugRouteOverride)
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

        val startDestination = when {
            webReplicaMode -> Routes.MAIN_GRAPH
            isAuthenticated -> Routes.MAIN_GRAPH
            else -> Routes.AUTH_GRAPH
        }

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
                    if (webReplicaMode) {
                        WebParityWebReplicaScreen(
                            pageKey = "login",
                            onBack = {},
                        )
                    } else {
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
                }

                composable(Routes.FORGOT_PASSWORD) {
                    if (webReplicaMode) {
                        WebParityWebReplicaScreen(
                            pageKey = "forgot_password",
                            onBack = { navController.popBackStack() },
                        )
                    } else {
                        ForgotPasswordScreen(
                            onBack = { navController.popBackStack() },
                        )
                    }
                }

                composable(Routes.SIGNUP) {
                    if (webReplicaMode) {
                        WebParityWebReplicaScreen(
                            pageKey = "signup",
                            onBack = { navController.popBackStack() },
                        )
                    } else {
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
                }

                composable(
                    route = Routes.RESET_PASSWORD,
                    arguments = listOf(navArgument("token") { type = NavType.StringType }),
                ) { entry ->
                    val token = entry.arguments?.getString("token").orEmpty()
                    if (webReplicaMode) {
                        WebParityWebReplicaScreen(
                            pageKey = "reset_password",
                            onBack = { navController.popBackStack() },
                        )
                    } else {
                        ResetPasswordScreen(
                            token = token,
                            onBack = { navController.popBackStack() },
                            onGoToLogin = {
                                navController.popBackStack(Routes.LOGIN, inclusive = false)
                            },
                        )
                    }
                }
            }

            navigation(startDestination = Routes.HOME, route = Routes.MAIN_GRAPH) {
                composable(Routes.HOME) {
                    if (webReplicaMode) {
                        WebParityWebReplicaScreen(
                            pageKey = "category_hub",
                            onBack = {},
                        )
                    } else {
                        MainShell(navController = navController, selected = BottomTab.HOME) {
                            CategoryHubScreen(
                                onOpenCategory = { navController.navigate(Routes.ALL_POSTS) },
                                onOpenAllPosts = { navController.navigate(Routes.ALL_POSTS) },
                                onOpenSearch = { navController.navigate(Routes.SEARCH) },
                            )
                        }
                    }
                }

                composable(Routes.ALL_POSTS) {
                    if (webReplicaMode) {
                        WebParityWebReplicaScreen(
                            pageKey = "all_posts",
                            onBack = { navController.popBackStack() },
                        )
                    } else {
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
                }

                composable(Routes.FOR_YOU) {
                    if (webReplicaMode) {
                        WebParityWebReplicaScreen(
                            pageKey = "for_you",
                            onBack = { navController.popBackStack() },
                        )
                    } else {
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
                }

                composable(Routes.FEED) {
                    if (webReplicaMode) {
                        WebParityWebReplicaScreen(
                            pageKey = "feed",
                            onBack = { navController.popBackStack() },
                        )
                    } else {
                        MainShell(navController = navController, selected = BottomTab.FEED) {
                            FeedScreen(
                                onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                            )
                        }
                    }
                }

                composable(Routes.REWARDS) {
                    if (webReplicaMode) {
                        WebParityWebReplicaScreen(
                            pageKey = "rewards",
                            onBack = { navController.popBackStack() },
                        )
                    } else {
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
                }

                composable(Routes.PROFILE) {
                    if (webReplicaMode) {
                        WebParityWebReplicaScreen(
                            pageKey = "profile",
                            onBack = { navController.popBackStack() },
                        )
                    } else {
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
                                onOpenNotifications = { navController.navigate(Routes.NOTIFICATIONS) },
                                onOpenSecurity = { navController.navigate(Routes.SECURITY) },
                                onOpenDashboard = { navController.navigate(Routes.DASHBOARD) },
                                onOpenAnalytics = { navController.navigate(Routes.ANALYTICS) },
                                onOpenAccountDelete = { navController.navigate(Routes.ACCOUNT_DELETE) },
                            )
                        }
                    }
                }

                composable(Routes.MORE) {
                    if (webReplicaMode) {
                        WebParityWebReplicaScreen(
                            pageKey = "activity",
                            onBack = { navController.popBackStack() },
                        )
                    } else {
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
                                onOpenForYou = { navController.navigate(Routes.FOR_YOU) },
                                onOpenRewards = { navController.navigate(Routes.REWARDS) },
                                onOpenOffers = { navController.navigate(Routes.OFFERS) },
                                onOpenNearby = { navController.navigate(Routes.NEARBY) },
                                onOpenDashboard = { navController.navigate(Routes.DASHBOARD) },
                            )
                        }
                    }
                }

                composable(Routes.NOTIFICATIONS) {
                    if (webReplicaMode) {
                        WebParityWebReplicaScreen(
                            pageKey = "notifications",
                            onBack = { navController.popBackStack() },
                        )
                    } else {
                        MainShell(navController = navController, selected = BottomTab.MORE) {
                            NotificationsScreen(
                                onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                            )
                        }
                    }
                }

                composable(Routes.WISHLIST) {
                    if (webReplicaMode) {
                        WebParityWebReplicaScreen(
                            pageKey = "wishlist",
                            onBack = { navController.popBackStack() },
                        )
                    } else {
                        MainShell(navController = navController, selected = BottomTab.MORE) {
                            WishlistScreen(onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) })
                        }
                    }
                }
            }

            composable(
                route = Routes.POST_DETAIL,
                arguments = listOf(navArgument("postId") { type = NavType.StringType }),
            ) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(
                        pageKey = "post_detail",
                        onBack = { navController.popBackStack() },
                    )
                } else {
                    PostDetailScreen(onBack = { navController.popBackStack() })
                }
            }

            composable(Routes.SEARCH) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(
                        pageKey = "search",
                        onBack = { navController.popBackStack() },
                    )
                } else {
                    SearchScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                    )
                }
            }

            composable(Routes.CATEGORIES) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(
                        pageKey = "subcategories",
                        onBack = { navController.popBackStack() },
                    )
                } else {
                    CategoriesScreen(
                        onBack = { navController.popBackStack() },
                        onCategoryClick = { _, _ ->
                            navController.navigate(Routes.ALL_POSTS)
                        },
                    )
                }
            }

            composable(Routes.CREATE_POST) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(
                        pageKey = "add_post",
                        onBack = { navController.popBackStack() },
                    )
                } else {
                    CreatePostScreen(
                        onBack = { navController.popBackStack() },
                        onPublished = { navController.popBackStack() },
                    )
                }
            }

            composable(Routes.MY_POSTS) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(
                        pageKey = "my_home",
                        onBack = { navController.popBackStack() },
                    )
                } else {
                    MyPostsScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                    )
                }
            }

            composable(Routes.KYC) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(
                        pageKey = "kyc",
                        onBack = { navController.popBackStack() },
                    )
                } else {
                    KycScreen(onBack = { navController.popBackStack() })
                }
            }

            composable(Routes.CHAT) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(
                        pageKey = "chat",
                        onBack = { navController.popBackStack() },
                    )
                } else {
                    ChatScreen(onBack = { navController.popBackStack() })
                }
            }

            composable(Routes.SETTINGS) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(
                        pageKey = "security",
                        onBack = { navController.popBackStack() },
                    )
                } else {
                    SettingsScreen(onBack = { navController.popBackStack() })
                }
            }

            // ── Phase 1-2: Commerce Core ──
            composable(Routes.POST_WELCOME) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(
                        pageKey = "post_welcome",
                        onBack = { navController.popBackStack() },
                    )
                } else {
                    PostWelcomeScreen(
                        onBack = { navController.popBackStack() },
                        onStartPost = { navController.navigate(Routes.CREATE_POST) },
                    )
                }
            }
            composable(
                route = Routes.EDIT_POST,
                arguments = listOf(navArgument("postId") { type = NavType.StringType }),
            ) { entry ->
                val postId = entry.arguments?.getString("postId").orEmpty()
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(
                        pageKey = "edit_post",
                        onBack = { navController.popBackStack() },
                    )
                } else {
                    EditPostScreen(postId = postId, onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.TIER_SELECTION) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(
                        pageKey = "tiers",
                        onBack = { navController.popBackStack() },
                    )
                } else {
                    TierSelectionScreen(onBack = { navController.popBackStack() })
                }
            }

            // ── Phase 2: Discovery ──
            composable(Routes.NEARBY) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(
                        pageKey = "nearby",
                        onBack = { navController.popBackStack() },
                    )
                } else {
                    NearbyScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                    )
                }
            }

            // ── Phase 4: Commerce Extended ──
            composable(Routes.BOUGHT_POSTS) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "bought_posts", onBack = { navController.popBackStack() })
                } else {
                    BoughtPostsScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                    )
                }
            }
            composable(Routes.SOLD_POSTS) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "sold_posts", onBack = { navController.popBackStack() })
                } else {
                    SoldPostsScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                    )
                }
            }
            composable(Routes.BUYER_VIEW) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "buyer_view", onBack = { navController.popBackStack() })
                } else {
                    BuyerViewScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.SALE_DONE) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "sale_done", onBack = { navController.popBackStack() })
                } else {
                    SaleDoneScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.SALE_UNDONE) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "sale_undone", onBack = { navController.popBackStack() })
                } else {
                    SaleUndoneScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.OFFERS) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "offers", onBack = { navController.popBackStack() })
                } else {
                    OffersScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.PAYMENT) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "payment", onBack = { navController.popBackStack() })
                } else {
                    PaymentScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.CART) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "cart", onBack = { navController.popBackStack() })
                } else {
                    CartScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.RECENTLY_VIEWED) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "recently_viewed", onBack = { navController.popBackStack() })
                } else {
                    RecentlyViewedScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPost = { id -> navController.navigate(Routes.postDetail(id)) },
                    )
                }
            }
            composable(Routes.SAVED_SEARCHES) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "saved_searches", onBack = { navController.popBackStack() })
                } else {
                    SavedSearchesScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.COMPARE) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "compare", onBack = { navController.popBackStack() })
                } else {
                    CompareScreen(onBack = { navController.popBackStack() })
                }
            }

            // ── Phase 5: Social ──
            composable(
                route = Routes.FEED_DETAIL,
                arguments = listOf(navArgument("feedId") { type = NavType.StringType }),
            ) { entry ->
                val feedId = entry.arguments?.getString("feedId").orEmpty()
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(
                        pageKey = "feed_detail",
                        onBack = { navController.popBackStack() },
                    )
                } else {
                    FeedDetailScreen(feedId = feedId, onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.MY_FEED) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "my_feed", onBack = { navController.popBackStack() })
                } else {
                    MyFeedScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.FEED_POST_ADD) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "post_add", onBack = { navController.popBackStack() })
                } else {
                    FeedPostAddScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.PUBLIC_WALL) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "public_wall", onBack = { navController.popBackStack() })
                } else {
                    PublicWallScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.COMPLAINTS) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "complaints", onBack = { navController.popBackStack() })
                } else {
                    ComplaintsScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.FEEDBACK) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "feedback", onBack = { navController.popBackStack() })
                } else {
                    FeedbackScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(
                route = Routes.REVIEWS,
                arguments = listOf(navArgument("userId") { type = NavType.StringType }),
            ) { entry ->
                val userId = entry.arguments?.getString("userId").orEmpty()
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(
                        pageKey = "reviews",
                        onBack = { navController.popBackStack() },
                    )
                } else {
                    ReviewsScreen(userId = userId, onBack = { navController.popBackStack() })
                }
            }

            // ── Phase 6: Account ──
            composable(Routes.DASHBOARD) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "dashboard", onBack = { navController.popBackStack() })
                } else {
                    DashboardScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.SECURITY) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "security", onBack = { navController.popBackStack() })
                } else {
                    SecurityScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.ACCOUNT_DELETE) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "account_delete", onBack = { navController.popBackStack() })
                } else {
                    AccountDeleteScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.VERIFICATION) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "verification", onBack = { navController.popBackStack() })
                } else {
                    VerificationScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.ANALYTICS) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "analytics", onBack = { navController.popBackStack() })
                } else {
                    AnalyticsScreen(onBack = { navController.popBackStack() })
                }
            }

            // ── Phase 7: Channels ──
            composable(Routes.CHANNELS) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "channels", onBack = { navController.popBackStack() })
                } else {
                    ChannelsListScreen(
                        onBack = { navController.popBackStack() },
                        onOpenChannel = { id -> navController.navigate(Routes.channelDetail(id)) },
                        onCreateChannel = { navController.navigate(Routes.CHANNEL_CREATE) },
                    )
                }
            }
            composable(Routes.CHANNEL_CREATE) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "channel_create", onBack = { navController.popBackStack() })
                } else {
                    CreateChannelScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(
                route = Routes.CHANNEL_DETAIL,
                arguments = listOf(navArgument("channelId") { type = NavType.StringType }),
            ) { entry ->
                val channelId = entry.arguments?.getString("channelId").orEmpty()
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "channel_detail", onBack = { navController.popBackStack() })
                } else {
                    ChannelDetailScreen(channelId = channelId, onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.CENTRE_LIST) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "centre_list", onBack = { navController.popBackStack() })
                } else {
                    CentreListScreen(
                        onBack = { navController.popBackStack() },
                        onOpenCentre = { id -> navController.navigate(Routes.centreDetail(id)) },
                        onCreateCentre = { navController.navigate(Routes.CENTRE_CREATE) },
                    )
                }
            }
            composable(Routes.CENTRE_CREATE) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "centre_create", onBack = { navController.popBackStack() })
                } else {
                    CreateCentreScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(
                route = Routes.CENTRE_DETAIL,
                arguments = listOf(navArgument("centreId") { type = NavType.StringType }),
            ) { entry ->
                val centreId = entry.arguments?.getString("centreId").orEmpty()
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "centre_detail", onBack = { navController.popBackStack() })
                } else {
                    CentreDetailScreen(centreId = centreId, onBack = { navController.popBackStack() })
                }
            }
            composable(
                route = Routes.CENTRE_LISTINGS,
                arguments = listOf(navArgument("centreId") { type = NavType.StringType }),
            ) { entry ->
                val centreId = entry.arguments?.getString("centreId").orEmpty()
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "centre_listings", onBack = { navController.popBackStack() })
                } else {
                    CentreListingsScreen(centreId = centreId, onBack = { navController.popBackStack() })
                }
            }

            // ── Phase 8: Legal & System ──
            composable(Routes.TERMS) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "terms", onBack = { navController.popBackStack() })
                } else {
                    TermsScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.PRIVACY) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "privacy", onBack = { navController.popBackStack() })
                } else {
                    PrivacyScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.REFUND) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "refund", onBack = { navController.popBackStack() })
                } else {
                    RefundScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.SUPPORT_POLICY) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "support_policy", onBack = { navController.popBackStack() })
                } else {
                    SupportPolicyScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(Routes.ADMIN_PANEL) {
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "admin_panel", onBack = { navController.popBackStack() })
                } else {
                    AdminPanelScreen(onBack = { navController.popBackStack() })
                }
            }
            composable(
                route = Routes.INVITE,
                arguments = listOf(navArgument("code") { type = NavType.StringType }),
            ) { entry ->
                val code = entry.arguments?.getString("code").orEmpty()
                if (webReplicaMode) {
                    WebParityWebReplicaScreen(pageKey = "invite", onBack = { navController.popBackStack() })
                } else {
                    InviteScreen(code = code, onBack = { navController.popBackStack() })
                }
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

private fun normalizeDebugRoute(rawRoute: String?): String {
    val route = rawRoute
        ?.trim()
        ?.removeSurrounding("\"")
        ?.removeSurrounding("'")
        ?.trim()
        .orEmpty()
    if (route.isEmpty()) return ""
    if (route.startsWith("parity/page/") || route == Routes.WEB_PARITY_HUB) return route

    val normalizedPath = route.substringBefore("?").substringBefore("#")
    if (route.startsWith("/") || !route.contains("/")) {
        val key = resolveRouteKeyFromPath(normalizedPath)
        if (key != null) {
            if (route.contains("?") || route.contains("#")) {
                val encodedRoute = Uri.encode(route)
                return Routes.webParityDetail("$key~route~$encodedRoute")
            }
            return Routes.webParityDetail(key)
        }
    }
    return route
}

private fun resolveRouteKeyFromPath(path: String): String? {
    val normalizedPath = when {
        path.isBlank() || path == "/" -> "/"
        path.startsWith("/") -> path
        else -> "/$path"
    }

    return WebRouteCatalog.all.firstOrNull { ref ->
        routePatternMatches(ref.canonicalPath, normalizedPath) ||
            ref.aliases.any { alias -> routePatternMatches(alias, normalizedPath) }
    }?.key
}

private fun routePatternMatches(pattern: String, actualPath: String): Boolean {
    if (pattern == "*") return false
    if (pattern == "/" && actualPath == "/") return true

    val patternSegments = pattern.trim('/').split('/').filter { it.isNotBlank() }
    val actualSegments = actualPath.trim('/').split('/').filter { it.isNotBlank() }
    if (patternSegments.size != actualSegments.size) return false

    return patternSegments.zip(actualSegments).all { (left, right) ->
        left.startsWith(":") || left == right
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
