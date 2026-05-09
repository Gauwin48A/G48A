package com.mhub.app.ui.categoryapp

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.mhub.app.ui.navigation.Routes
import com.mhub.app.ui.wishlist.WishlistScreen

/** Defines the 4 category mini-apps with metadata. */
data class CategoryAppDef(
    val key: String,
    val label: String,
    val emoji: String,
)

val CATEGORY_APPS = listOf(
    CategoryAppDef("electronics", "Electronics", "📱"),
    CategoryAppDef("fashion",     "Fashion",     "👗"),
    CategoryAppDef("grocery",     "Grocery",     "🛒"),
    CategoryAppDef("furniture",   "Furniture",   "🪑"),
)

private enum class CategoryTab {
    HOME, CATEGORIES, CART, WISHLIST, PROFILE
}

/**
 * The full category app shell wrapping all screens for a given category.
 * Provides:
 *  - Top app bar with category title, back-to-launcher, search, cart badge, notifications
 *  - Bottom navigation with 5 tabs (Home, Categories, Cart, Wishlist, Profile)
 *  - Independent NavHost scoped to this category
 *
 * No bottom nav is present on the Launcher screen itself — it only appears here,
 * inside a category app.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoryAppShell(
    categoryKey: String,
    onBackToLauncher: () -> Unit,
    onOpenSearch: () -> Unit,
    onOpenNotifications: () -> Unit,
    onOpenPostDetail: (String) -> Unit,
    cartBadgeCount: Int = 0,
) {
    val appDef = CATEGORY_APPS.find { it.key == categoryKey }
        ?: CATEGORY_APPS.first()

    val innerNav = rememberNavController()
    var selectedTab by rememberSaveable { mutableStateOf(CategoryTab.HOME) }

    Scaffold(
        topBar = {
            CategoryTopBar(
                appDef = appDef,
                cartBadgeCount = cartBadgeCount,
                onBackToLauncher = onBackToLauncher,
                onSearch = onOpenSearch,
                onNotifications = onOpenNotifications,
                onCartClick = {
                    selectedTab = CategoryTab.CART
                    innerNav.navigate(Routes.categoryCart(categoryKey)) {
                        launchSingleTop = true
                    }
                },
            )
        },
        bottomBar = {
            CategoryBottomNavBar(
                selected = selectedTab,
                onSelect = { tab ->
                    selectedTab = tab
                    val route = when (tab) {
                        CategoryTab.HOME       -> Routes.categoryHome(categoryKey)
                        CategoryTab.CATEGORIES -> Routes.categorySubcats(categoryKey)
                        CategoryTab.CART       -> Routes.categoryCart(categoryKey)
                        CategoryTab.WISHLIST   -> Routes.categoryWishlist(categoryKey)
                        CategoryTab.PROFILE    -> Routes.categoryProfileTab(categoryKey)
                    }
                    innerNav.navigate(route) {
                        popUpTo(Routes.categoryHome(categoryKey)) { saveState = true }
                        launchSingleTop = true
                        restoreState = true
                    }
                },
                cartBadgeCount = cartBadgeCount,
            )
        },
    ) { innerPadding ->
        NavHost(
            navController = innerNav,
            startDestination = Routes.categoryHome(categoryKey),
            enterTransition = { fadeIn(tween(220)) },
            exitTransition = { fadeOut(tween(180)) },
            modifier = Modifier.padding(innerPadding),
        ) {
            composable(Routes.categoryHome(categoryKey)) {
                CategoryHomeScreen(
                    categoryKey = categoryKey,
                    onOpenProduct = onOpenPostDetail,
                    onOpenSubcategory = { subcatId ->
                        innerNav.navigate(Routes.categorySubcatDetail(categoryKey, subcatId))
                    },
                    onOpenAllCategories = {
                        selectedTab = CategoryTab.CATEGORIES
                        innerNav.navigate(Routes.categorySubcats(categoryKey)) {
                            launchSingleTop = true
                        }
                    },
                    onOpenListing = {
                        innerNav.navigate(Routes.categoryListing(categoryKey)) {
                            launchSingleTop = true
                        }
                    },
                )
            }

            composable(Routes.categorySubcats(categoryKey)) {
                SubcategoryScreen(
                    categoryKey = categoryKey,
                    subcategoryId = null,
                    onOpenProduct = onOpenPostDetail,
                    onOpenSubcategory = { subcatId ->
                        innerNav.navigate(Routes.categorySubcatDetail(categoryKey, subcatId))
                    },
                )
            }

            composable(
                route = Routes.CATEGORY_SUBCATS_ID,
                arguments = listOf(
                    navArgument("catKey") { type = NavType.StringType },
                    navArgument("subcatId") { type = NavType.StringType },
                ),
            ) { entry ->
                val subcatId = entry.arguments?.getString("subcatId").orEmpty()
                ProductListingScreen(
                    categoryKey = categoryKey,
                    subcategoryId = subcatId,
                    onOpenProduct = onOpenPostDetail,
                    onBack = { innerNav.popBackStack() },
                )
            }

            composable(Routes.categoryListing(categoryKey)) {
                ProductListingScreen(
                    categoryKey = categoryKey,
                    subcategoryId = null,
                    onOpenProduct = onOpenPostDetail,
                    onBack = { innerNav.popBackStack() },
                )
            }

            composable(Routes.categoryCart(categoryKey)) {
                com.mhub.app.ui.commerce.CartScreen(
                    onBack = { innerNav.popBackStack() },
                )
            }

            composable(Routes.categoryWishlist(categoryKey)) {
                WishlistScreen(
                    onBack = { innerNav.popBackStack() },
                    onOpenPost = onOpenPostDetail,
                )
            }

            composable(Routes.categoryProfileTab(categoryKey)) {
                com.mhub.app.ui.profile.ProfileScreen(
                    onSignedOut = { /* handled by root */ },
                    onOpenSettings = { },
                    onOpenMyPosts = { },
                    onOpenKyc = { },
                    onOpenChat = { },
                    onOpenNotifications = onOpenNotifications,
                    onOpenSecurity = { },
                    onOpenDashboard = { },
                    onOpenAnalytics = { },
                    onOpenAccountDelete = { },
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CategoryTopBar(
    appDef: CategoryAppDef,
    cartBadgeCount: Int,
    onBackToLauncher: () -> Unit,
    onSearch: () -> Unit,
    onNotifications: () -> Unit,
    onCartClick: () -> Unit,
) {
    TopAppBar(
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(appDef.emoji, modifier = Modifier.padding(end = 6.dp))
                Text(
                    appDef.label,
                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                )
            }
        },
        navigationIcon = {
            IconButton(
                onClick = onBackToLauncher,
                modifier = Modifier.semantics {
                    contentDescription = "Return to app launcher"
                },
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = null,
                )
            }
        },
        actions = {
            IconButton(
                onClick = onSearch,
                modifier = Modifier.semantics { contentDescription = "Search in ${appDef.label}" },
            ) {
                Icon(Icons.Filled.Search, contentDescription = null)
            }
            IconButton(
                onClick = onNotifications,
                modifier = Modifier.semantics { contentDescription = "View notifications" },
            ) {
                Icon(Icons.Filled.Notifications, contentDescription = null)
            }
            BadgedBox(
                badge = {
                    if (cartBadgeCount > 0) {
                        Badge(
                            modifier = Modifier.semantics {
                                contentDescription = "$cartBadgeCount items in cart"
                            },
                        ) {
                            Text(cartBadgeCount.toString())
                        }
                    }
                },
            ) {
                IconButton(
                    onClick = onCartClick,
                    modifier = Modifier.semantics { contentDescription = "Shopping cart, $cartBadgeCount items" },
                ) {
                    Icon(Icons.Filled.ShoppingCart, contentDescription = null)
                }
            }
        },
        colors = TopAppBarDefaults.topAppBarColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
        modifier = Modifier.shadow(4.dp),
    )
}

@Composable
private fun CategoryBottomNavBar(
    selected: CategoryTab,
    onSelect: (CategoryTab) -> Unit,
    cartBadgeCount: Int,
) {
    data class TabItem(
        val tab: CategoryTab,
        val label: String,
        val selectedIcon: ImageVector,
        val unselectedIcon: ImageVector,
    )

    val tabs = listOf(
        TabItem(CategoryTab.HOME,       "Home",       Icons.Filled.Home,         Icons.Outlined.Home),
        TabItem(CategoryTab.CATEGORIES, "Categories", Icons.Filled.Category,     Icons.Outlined.Category),
        TabItem(CategoryTab.CART,       "Cart",       Icons.Filled.ShoppingCart, Icons.Outlined.ShoppingCart),
        TabItem(CategoryTab.WISHLIST,   "Wishlist",   Icons.Filled.FavoriteBorder, Icons.Outlined.FavoriteBorder),
        TabItem(CategoryTab.PROFILE,    "Profile",    Icons.Filled.Person,       Icons.Outlined.Person),
    )

    NavigationBar(modifier = Modifier.shadow(8.dp)) {
        tabs.forEach { item ->
            val isSelected = selected == item.tab
            NavigationBarItem(
                selected = isSelected,
                onClick = { onSelect(item.tab) },
                icon = {
                    if (item.tab == CategoryTab.CART && cartBadgeCount > 0) {
                        BadgedBox(
                            badge = {
                                Badge { Text(cartBadgeCount.toString()) }
                            },
                        ) {
                            Icon(
                                if (isSelected) item.selectedIcon else item.unselectedIcon,
                                contentDescription = null,
                            )
                        }
                    } else {
                        Icon(
                            if (isSelected) item.selectedIcon else item.unselectedIcon,
                            contentDescription = null,
                        )
                    }
                },
                label = { Text(item.label, style = MaterialTheme.typography.labelSmall) },
                modifier = Modifier.semantics {
                    contentDescription = "${item.label}${if (isSelected) ", selected" else ""}"
                },
            )
        }
    }
}
