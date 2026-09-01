package com.zaruda.app.ui.theme

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/**
 * Unified shape definitions for cards, chips, buttons, modals.
 */
object ZarudaShapes {
    val cardSmall = RoundedCornerShape(8.dp)
    val card = RoundedCornerShape(12.dp)
    val cardLarge = RoundedCornerShape(16.dp)
    val chip = RoundedCornerShape(20.dp)
    val button = RoundedCornerShape(12.dp)
    val buttonPill = RoundedCornerShape(999.dp)
    val bottomSheet = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
    val bottomBar = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
    val dialog = RoundedCornerShape(20.dp)
    val inputField = RoundedCornerShape(12.dp)
    val avatar = RoundedCornerShape(999.dp)
    val banner = RoundedCornerShape(16.dp)
}

/**
 * Standard elevation levels.
 */
object ZarudaElevation {
    val none = 0.dp
    val low = 1.dp
    val card = 2.dp
    val raised = 4.dp
    val floating = 8.dp
    val modal = 16.dp
    val topBar = 4.dp
    val bottomBar = 12.dp
}

/**
 * Brand gradient brushes.
 */
object ZarudaGradients {
    val primaryHorizontal: Brush
        get() = Brush.horizontalGradient(
            listOf(BrandPrimary, Color(0xFF4F5CF3)),
        )
    val primaryVertical: Brush
        get() = Brush.verticalGradient(
            listOf(BrandPrimary, Color(0xFF4F5CF3)),
        )
    val heroLight: Brush
        get() = Brush.verticalGradient(
            listOf(
                Color(0xFF2F66EA).copy(alpha = 0.08f),
                Color(0xFF6C4CF3).copy(alpha = 0.04f),
                Color.Transparent,
            ),
        )
    val heroDark: Brush
        get() = Brush.verticalGradient(
            listOf(
                Color(0xFF2F66EA).copy(alpha = 0.15f),
                Color(0xFF6C4CF3).copy(alpha = 0.08f),
                Color.Transparent,
            ),
        )
    val rewardsGold: Brush
        get() = Brush.horizontalGradient(
            listOf(Color(0xFFF59E0B), Color(0xFFFF8C00)),
        )
    val successGreen: Brush
        get() = Brush.horizontalGradient(
            listOf(Color(0xFF067647), Color(0xFF10B981)),
        )
}

/**
 * Standard icon sizes.
 */
object ZarudaIconSize {
    val xs = 14.dp
    val sm = 16.dp
    val md = 20.dp
    val lg = 24.dp
    val xl = 28.dp
    val xxl = 32.dp
    val avatar = 40.dp
    val avatarLarge = 56.dp
    val hero = 72.dp
}
