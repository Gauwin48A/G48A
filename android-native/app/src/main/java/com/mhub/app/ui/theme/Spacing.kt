package com.mhub.app.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Unified spacing scale used throughout the app.
 * Provides consistent padding, margins, and gaps.
 */
data class MhubSpacing(
    val xxxs: Dp = 2.dp,
    val xxs: Dp = 4.dp,
    val xs: Dp = 6.dp,
    val sm: Dp = 8.dp,
    val md: Dp = 12.dp,
    val lg: Dp = 16.dp,
    val xl: Dp = 20.dp,
    val xxl: Dp = 24.dp,
    val xxxl: Dp = 32.dp,
    val xxxxl: Dp = 40.dp,
    val section: Dp = 48.dp,

    // Component-specific
    val cardPadding: Dp = 12.dp,
    val cardGap: Dp = 8.dp,
    val screenPadding: Dp = 16.dp,
    val listItemVertical: Dp = 10.dp,
    val chipGap: Dp = 6.dp,
    val iconTextGap: Dp = 8.dp,
    val sectionGap: Dp = 20.dp,

    // Border radii
    val radiusSm: Dp = 8.dp,
    val radiusMd: Dp = 12.dp,
    val radiusLg: Dp = 16.dp,
    val radiusXl: Dp = 20.dp,
    val radiusFull: Dp = 999.dp,
)

val LocalSpacing = staticCompositionLocalOf { MhubSpacing() }

/** Convenience accessor for spacing from any composable. */
val spacing: MhubSpacing
    @Composable get() = LocalSpacing.current
