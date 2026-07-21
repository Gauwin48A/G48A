package com.zaruda.app.ui.categoryapp

import androidx.compose.ui.res.stringResource
import com.zaruda.app.R
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Category
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
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.zaruda.app.data.local.AppPreferences
import com.zaruda.app.data.local.db.CartItemDao
import com.zaruda.app.data.local.db.WishlistItemDao

import com.zaruda.app.ui.navigation.Routes
import com.zaruda.app.ui.wishlist.WishlistScreen
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch


/** Defines the 4 category mini-apps with metadata. */
data class CategoryAppDef(
    val key: String,
    val label: String,
    val emoji: String,
)

val CATEGORY_APPS = listOf(
    CategoryAppDef("electronics", "Electronics", "💻"),
    CategoryAppDef("fashion",     "Fashion",     "👗"),
    CategoryAppDef("vehicles",    "Vehicles",    "🚗"),
    CategoryAppDef("others",      "Others",      "✨"),
)

internal enum class CategoryTab {
    HOME, CATEGORIES, CART, WISHLIST, PROFILE
}

@HiltViewModel
class CategoryShellViewModel @Inject constructor(
    private val cartItemDao: CartItemDao,
    private val wishlistItemDao: WishlistItemDao,
    private val appPreferences: AppPreferences,
) : ViewModel() {
    val cartCount: StateFlow<Int> = cartItemDao.observeCount()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0)

    val wishlistCount: StateFlow<Int> = wishlistItemDao.observeCount()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0)

    internal suspend fun loadLastTab(categoryKey: String): CategoryTab {
        val saved = appPreferences.lastCategoryTabValue(categoryKey)
        return CategoryTab.entries.firstOrNull { it.name == saved } ?: CategoryTab.HOME
    }

    internal fun persistTab(categoryKey: String, tab: CategoryTab) {
        viewModelScope.launch {
            appPreferences.setLastCategoryTab(categoryKey, tab.name)
        }
    }

    fun persistCategory(categoryKey: String) {
        viewModelScope.launch {
            appPreferences.setLastOpenedCategory(categoryKey)
        }
    }
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
    useExternalBottomNav: Boolean = false,
    onBackToLauncher: () -> Unit,
    onOpenSearch: () -> Unit,
    onOpenNotifications: () -> Unit,
    onOpenOrders: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenHelp: () -> Unit,
    onSwitchCategory: (String) -> Unit,
    onOpenPostDetail: (String) -> Unit,
    onOpenFeed: () -> Unit = {},
    onOpenForYou: () -> Unit = {},
    cartBadgeCount: Int = 0,
) {
    val viewModel: CategoryShellViewModel = hiltViewModel()
    val appDef = CATEGORY_APPS.find { it.key == categoryKey }
        ?: CATEGORY_APPS.first()

    val innerNav = rememberNavController()
    var selectedTab by rememberSaveable { mutableStateOf(CategoryTab.HOME) }
    val roomCartCount by viewModel.cartCount.collectAsState()
    val roomWishlistCount by viewModel.wishlistCount.collectAsState()
    val effectiveCartBadgeCount = maxOf(cartBadgeCount, roomCartCount)

    fun routeForTab(tab: CategoryTab): String = when (tab) {
        CategoryTab.HOME -> Routes.categoryHome(categoryKey)
        CategoryTab.CATEGORIES -> Routes.categorySubcats(categoryKey)
        CategoryTab.CART -> Routes.categoryCart(categoryKey)
        CategoryTab.WISHLIST -> Routes.categoryWishlist(categoryKey)
        CategoryTab.PROFILE -> Routes.categoryProfileTab(categoryKey)
    }

    LaunchedEffect(categoryKey) {
        viewModel.persistCategory(categoryKey)
        // Always start on HOME tab when entering a category (don't restore old tab)
        selectedTab = CategoryTab.HOME
    }

    Scaffold(
            topBar = {
                CategoryTopBar(
                    appDef = appDef,
                    cartBadgeCount = effectiveCartBadgeCount,
                    onBackToLauncher = onBackToLauncher,
                    onSearch = onOpenSearch,
                    onNotifications = onOpenNotifications,
                    onCartClick = {
                        selectedTab = CategoryTab.CART
                        viewModel.persistTab(categoryKey, CategoryTab.CART)
                        innerNav.navigate(Routes.categoryCart(categoryKey)) {
                            launchSingleTop = true
                        }
                    },
                )
            },
            bottomBar = {
                if (!useExternalBottomNav) {
                CategoryBottomNavBar(
                    selected = selectedTab,
                    onSelect = { tab ->
                        selectedTab = tab
                        viewModel.persistTab(categoryKey, tab)
                        val route = routeForTab(tab)
                        innerNav.navigate(route) {
                            popUpTo(Routes.categoryHome(categoryKey)) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    cartBadgeCount = effectiveCartBadgeCount,
                    wishlistBadgeCount = roomWishlistCount,
                )
                }
            },
        ) { innerPadding ->
            // When external bottom nav is used, don't apply bottom padding from inner scaffold
            val effectivePadding = if (useExternalBottomNav) {
                androidx.compose.foundation.layout.PaddingValues(
                    start = innerPadding.calculateLeftPadding(androidx.compose.ui.unit.LayoutDirection.Ltr),
                    top = innerPadding.calculateTopPadding(),
                    end = innerPadding.calculateRightPadding(androidx.compose.ui.unit.LayoutDirection.Ltr),
                    bottom = 0.dp,
                )
            } else innerPadding
            NavHost(
                navController = innerNav,
                startDestination = Routes.categoryHome(categoryKey),
                enterTransition = { fadeIn(tween(220)) },
                exitTransition = { fadeOut(tween(180)) },
                modifier = Modifier.padding(effectivePadding),
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
                        viewModel.persistTab(categoryKey, CategoryTab.CATEGORIES)
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
                com.zaruda.app.ui.commerce.CartScreen(
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
                com.zaruda.app.ui.profile.ProfileScreen(
                    onSignedOut = { /* handled by root */ },
                    onOpenSettings = { },
                    onOpenMyPosts = { },
                    onOpenNotifications = onOpenNotifications,
                    onOpenSecurity = { },
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
                    contentDescription = "Back to launcher"
                },
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = null,
                )
            }
        },
        actions = {
            // Search moved out of the top bar — AllPosts/listing screens expose an
            // inline search + filter row below the navbar (web parity).
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
    wishlistBadgeCount: Int,
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
        TabItem(CategoryTab.WISHLIST,   "Wishlist",   Icons.Filled.Bookmark,     Icons.Outlined.BookmarkBorder),
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
                    } else if (item.tab == CategoryTab.WISHLIST && wishlistBadgeCount > 0) {
                        BadgedBox(
                            badge = {
                                Badge { Text(wishlistBadgeCount.toString()) }
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
