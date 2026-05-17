package com.mhub.app.ui.categoryapp

import androidx.compose.ui.res.stringResource
import com.mhub.app.R
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
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.HelpOutline
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.ShoppingCart
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.AssistChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
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
import com.mhub.app.data.local.AppPreferences
import com.mhub.app.data.local.db.CartItemDao
import com.mhub.app.data.local.db.WishlistItemDao
import com.mhub.app.data.mock.MockDataProvider
import com.mhub.app.ui.navigation.Routes
import com.mhub.app.ui.wishlist.WishlistScreen
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
    CategoryAppDef("electronics", "Electronics", "📱"),
    CategoryAppDef("fashion",     "Fashion",     "�"),
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
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    var selectedTab by rememberSaveable { mutableStateOf(CategoryTab.HOME) }
    val roomCartCount by viewModel.cartCount.collectAsState()
    val roomWishlistCount by viewModel.wishlistCount.collectAsState()
    val effectiveCartBadgeCount = maxOf(cartBadgeCount, roomCartCount)

    fun routeForTab(tab: CategoryTab): String = when (tab) {
        CategoryTab.HOME -> Routes.categoryListing(categoryKey)
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

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            CategoryDrawerContent(
                currentApp = appDef,
                onBackToLauncher = {
                    scope.launch { drawerState.close() }
                    onBackToLauncher()
                },
                onOpenOrders = {
                    scope.launch { drawerState.close() }
                    onOpenOrders()
                },
                onOpenSettings = {
                    scope.launch { drawerState.close() }
                    onOpenSettings()
                },
                onBrowseSubcategories = {
                    scope.launch { drawerState.close() }
                    selectedTab = CategoryTab.CATEGORIES
                    viewModel.persistTab(categoryKey, CategoryTab.CATEGORIES)
                    innerNav.navigate(Routes.categorySubcats(categoryKey)) {
                        launchSingleTop = true
                    }
                },
                onOpenHelp = {
                    scope.launch { drawerState.close() }
                    onOpenHelp()
                },
                onOpenFeed = {
                    scope.launch { drawerState.close() }
                    onOpenFeed()
                },
                onOpenForYou = {
                    scope.launch { drawerState.close() }
                    onOpenForYou()
                },
                onSwitchCategory = { nextKey ->
                    scope.launch { drawerState.close() }
                    onSwitchCategory(nextKey)
                },
            )
        },
    ) {
        Scaffold(
            topBar = {
                CategoryTopBar(
                    appDef = appDef,
                    cartBadgeCount = effectiveCartBadgeCount,
                    onOpenDrawer = { scope.launch { drawerState.open() } },
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
                            popUpTo(Routes.categoryListing(categoryKey)) { saveState = true }
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
                startDestination = Routes.categoryListing(categoryKey),
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
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CategoryTopBar(
    appDef: CategoryAppDef,
    cartBadgeCount: Int,
    onOpenDrawer: () -> Unit,
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
                onClick = onOpenDrawer,
                modifier = Modifier.semantics {
                    contentDescription = "Open category menu"
                },
            ) {
                Icon(
                    Icons.Filled.Menu,
                    contentDescription = null,
                )
            }
        },
        actions = {
            IconButton(
                onClick = onBackToLauncher,
                modifier = Modifier.semantics { contentDescription = "Return to app launcher" },
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
            }
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

@OptIn(androidx.compose.foundation.layout.ExperimentalLayoutApi::class)
@Composable
private fun CategoryDrawerContent(
    currentApp: CategoryAppDef,
    onBackToLauncher: () -> Unit,
    onOpenOrders: () -> Unit,
    onOpenSettings: () -> Unit,
    onBrowseSubcategories: () -> Unit,
    onOpenHelp: () -> Unit,
    onOpenFeed: () -> Unit,
    onOpenForYou: () -> Unit,
    onSwitchCategory: (String) -> Unit,
) {
    val shortcutSubcats = MockDataProvider.subcategoriesFor(currentApp.key).take(6)

    ModalDrawerSheet {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 20.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .background(MaterialTheme.colorScheme.primaryContainer, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(currentApp.emoji)
                }
                Spacer(Modifier.width(10.dp))
                Column {
                    Text(
                        text = stringResource(R.string.catshell_guest_user),
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    )
                    Text(
                        text = stringResource(R.string.catshell_browsing, currentApp.label),
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
            Spacer(Modifier.height(14.dp))

            Text(
                text = "${currentApp.emoji} ${currentApp.label}",
                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                modifier = Modifier.semantics { contentDescription = "Current category ${currentApp.label}" },
            )
            Text(
                text = stringResource(R.string.catshell_menu),
                style = MaterialTheme.typography.bodyMedium,
                modifier = Modifier.padding(top = 2.dp, bottom = 14.dp),
            )

            DrawerActionRow(label = stringResource(R.string.catshell_back_to_launcher), icon = Icons.AutoMirrored.Filled.ArrowBack, onClick = onBackToLauncher)
            DrawerActionRow(label = stringResource(R.string.catshell_browse_subcategories), icon = Icons.Filled.Category, onClick = onBrowseSubcategories)
            DrawerActionRow(label = stringResource(R.string.catshell_for_you), icon = Icons.Filled.FavoriteBorder, onClick = onOpenForYou)
            DrawerActionRow(label = stringResource(R.string.catshell_community_feed), icon = Icons.Filled.Notifications, onClick = onOpenFeed)
            DrawerActionRow(label = stringResource(R.string.catshell_order_history), icon = Icons.Filled.Dashboard, onClick = onOpenOrders)
            DrawerActionRow(label = stringResource(R.string.catshell_settings), icon = Icons.Filled.Settings, onClick = onOpenSettings)
            DrawerActionRow(label = stringResource(R.string.catshell_help_faq), icon = Icons.Filled.HelpOutline, onClick = onOpenHelp)

            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
            Text(
                text = stringResource(R.string.catshell_switch_category),
                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
            )
            Spacer(Modifier.height(8.dp))

            CATEGORY_APPS.forEach { app ->
                DrawerCategoryRow(
                    app = app,
                    isCurrent = app.key == currentApp.key,
                    onClick = { onSwitchCategory(app.key) },
                )
            }

            HorizontalDivider(modifier = Modifier.padding(vertical = 12.dp))
            Text(
                text = stringResource(R.string.catshell_quick_subcategories),
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
            )
            Spacer(Modifier.height(8.dp))
            FlowRow(
                horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp),
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(8.dp),
            ) {
                shortcutSubcats.forEach { subcat ->
                    AssistChip(
                        onClick = onBrowseSubcategories,
                        label = { Text(subcat.name) },
                    )
                }
            }
        }
    }
}

@Composable
private fun DrawerActionRow(
    label: String,
    icon: ImageVector,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClickLabel = label, onClick = onClick)
            .padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null)
        Spacer(Modifier.width(10.dp))
        Text(label, style = MaterialTheme.typography.bodyLarge)
    }
}

@Composable
private fun DrawerCategoryRow(
    app: CategoryAppDef,
    isCurrent: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClickLabel = "Switch to ${app.label}", onClick = onClick)
            .padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(app.emoji)
        Spacer(Modifier.width(10.dp))
        Text(
            text = app.label,
            style = MaterialTheme.typography.bodyLarge.copy(
                fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
            ),
            modifier = Modifier.weight(1f),
        )
        if (isCurrent) {
            Badge { Text(stringResource(R.string.catshell_now)) }
        }
    }
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
