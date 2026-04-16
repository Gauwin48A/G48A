package com.mhub.app.navigation

import androidx.compose.ui.graphics.vector.ImageVector

data class TopLevelRoute(
    val route: String,
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
)
