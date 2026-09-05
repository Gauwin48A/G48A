package com.zaruda.app.ui.foryou

import androidx.compose.runtime.Composable
import com.zaruda.app.data.local.ThemeMode
import com.zaruda.app.ui.explore.ExploreScreen

@Composable
fun ForYouScreen(
    onOpenPost: (String) -> Unit,
    isGuest: Boolean = false,
    onNavigateToLogin: () -> Unit = {},
    onOpenHome: () -> Unit = {},
    onOpenProfile: () -> Unit = {},
    onOpenForYou: () -> Unit = {},
    onOpenCompare: () -> Unit = {},
    onOpenCart: () -> Unit = {},
    onOpenSearch: () -> Unit = {},
    onOpenCategories: () -> Unit = {},
    onOpenNotifications: () -> Unit = {},
    onOpenRecentlyViewed: () -> Unit = {},
    onOpenWishlist: () -> Unit = {},
    onOpenUser: (String) -> Unit = {},
    onOpenTierSelection: () -> Unit = {},
    onOpenKyc: () -> Unit = {},
    currentThemeMode: ThemeMode = ThemeMode.SYSTEM,
    onToggleTheme: () -> Unit = {},
    showOwnTopBar: Boolean = true,
) {
    ExploreScreen(
        onOpenPost = onOpenPost,
        onOpenSearch = onOpenSearch,
        onOpenHome = onOpenHome,
        onOpenProfile = onOpenProfile,
        onOpenForYou = onOpenForYou,
        onOpenCategories = onOpenCategories,
        onOpenCompare = onOpenCompare,
        onOpenCart = onOpenCart,
        onOpenNotifications = onOpenNotifications,
        onOpenRecentlyViewed = onOpenRecentlyViewed,
        onOpenWishlist = onOpenWishlist,
        onOpenUser = onOpenUser,
        onOpenTierSelection = onOpenTierSelection,
        onOpenKyc = onOpenKyc,
        currentThemeMode = currentThemeMode,
        onToggleTheme = onToggleTheme,
        forYouMode = true,
        showOwnTopBar = showOwnTopBar,
    )
}
