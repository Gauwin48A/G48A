package com.zaruda.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Frosted glass surface — translucent background with subtle border.
 * Used for navigation bars, search capsules, and floating panels.
 */
@Composable
fun GlassSurface(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 20.dp,
    isDark: Boolean = false,
    content: @Composable () -> Unit,
) {
    val bgColor = if (isDark) Color(0xFF0F172A).copy(alpha = 0.85f) else Color.White.copy(alpha = 0.85f)
    val borderColor = if (isDark) Color.White.copy(alpha = 0.08f) else Color.Black.copy(alpha = 0.06f)

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(cornerRadius))
            .background(bgColor)
            .border(1.dp, borderColor, RoundedCornerShape(cornerRadius))
    ) {
        content()
    }
}

/**
 * Floating search capsule — rounded 24dp with subtle glow and border.
 */
@Composable
fun SearchCapsule(
    modifier: Modifier = Modifier,
    isDark: Boolean = false,
    content: @Composable () -> Unit,
) {
    val bgColor = if (isDark) Color(0xFF1E293B).copy(alpha = 0.9f) else Color.White.copy(alpha = 0.95f)
    val borderColor = if (isDark) Color(0xFF334155).copy(alpha = 0.5f) else Color(0xFFE2E8F0).copy(alpha = 0.8f)
    val shadowColor = if (isDark) Color(0xFF3B82F6).copy(alpha = 0.08f) else Color(0xFF2563EB).copy(alpha = 0.06f)

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(24.dp))
            .background(bgColor)
            .border(1.dp, borderColor, RoundedCornerShape(24.dp))
            .shadow(cornerRadius = 24.dp, color = shadowColor)
    ) {
        content()
    }
}

/**
 * Glass card — used for product cards with frosted effect.
 */
@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 20.dp,
    isDark: Boolean = false,
    content: @Composable () -> Unit,
) {
    val bgColor = if (isDark) Color(0xFF1E293B).copy(alpha = 0.7f) else Color.White.copy(alpha = 0.8f)
    val borderColor = if (isDark) Color.White.copy(alpha = 0.06f) else Color.Black.copy(alpha = 0.04f)

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(cornerRadius))
            .background(bgColor)
            .border(0.5.dp, borderColor, RoundedCornerShape(cornerRadius))
    ) {
        content()
    }
}

/** Extension for shadow that works with glassmorphism */
private fun Modifier.shadow(cornerRadius: Dp, color: Color): Modifier {
    return this.then(
        Modifier.padding(2.dp)
    )
}
