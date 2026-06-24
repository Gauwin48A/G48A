package com.mhub.app.ui.foryou

import androidx.compose.runtime.Composable
import com.mhub.app.ui.explore.ExploreScreen

@Suppress("UNUSED_PARAMETER")
@Composable
fun ForYouScreen(
    onOpenPost: (String) -> Unit,
    isGuest: Boolean = false,
    onNavigateToLogin: () -> Unit = {},
    onOpenCompare: () -> Unit = {},
    onOpenCart: () -> Unit = {},
    onOpenSearch: () -> Unit = {},
    onOpenCategories: () -> Unit = {},
    onOpenNotifications: () -> Unit = {},
    onOpenRecentlyViewed: () -> Unit = {},
    onOpenWishlist: () -> Unit = {},
    onLanguage: () -> Unit = {},
    onToggleTheme: () -> Unit = {},
) {
    ExploreScreen(
        onOpenPost = onOpenPost,
        onOpenSearch = onOpenSearch,
        onOpenCategories = onOpenCategories,
        onOpenCompare = onOpenCompare,
        onOpenCart = onOpenCart,
        onOpenNotifications = onOpenNotifications,
        onOpenRecentlyViewed = onOpenRecentlyViewed,
        onOpenWishlist = onOpenWishlist,
        onLanguage = onLanguage,
        onToggleTheme = onToggleTheme,
        forYouMode = true,
    )
}
