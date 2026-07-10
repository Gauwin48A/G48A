package com.mhub.app.ui.foryou

import androidx.compose.runtime.Composable
import com.mhub.app.data.local.ThemeMode
import com.mhub.app.ui.explore.ExploreScreen

@Composable
fun ForYouScreen(
    onOpenPost: (String) -> Unit,
    isGuest: Boolean = false,
    onNavigateToLogin: () -> Unit = {},
    onOpenHome: () -> Unit = {},
    onOpenForYou: () -> Unit = {},
    onOpenCompare: () -> Unit = {},
    onOpenCart: () -> Unit = {},
    onOpenSearch: () -> Unit = {},
    onOpenCategories: () -> Unit = {},
    onOpenNotifications: () -> Unit = {},
    onOpenRecentlyViewed: () -> Unit = {},
    onOpenWishlist: () -> Unit = {},
    onLanguage: () -> Unit = {},
    currentThemeMode: ThemeMode = ThemeMode.SYSTEM,
    onToggleTheme: () -> Unit = {},
) {
    ExploreScreen(
        onOpenPost = onOpenPost,
        onOpenSearch = onOpenSearch,
        onOpenHome = onOpenHome,
        onOpenForYou = onOpenForYou,
        onOpenCategories = onOpenCategories,
        onOpenCompare = onOpenCompare,
        onOpenCart = onOpenCart,
        onOpenNotifications = onOpenNotifications,
        onOpenRecentlyViewed = onOpenRecentlyViewed,
        onOpenWishlist = onOpenWishlist,
        onLanguage = onLanguage,
        currentThemeMode = currentThemeMode,
        onToggleTheme = onToggleTheme,
        forYouMode = true,
    )
}
