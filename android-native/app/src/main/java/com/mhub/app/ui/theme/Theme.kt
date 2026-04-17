package com.mhub.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColors = lightColorScheme(
    primary = BrandBlue500,
    onPrimary = Neutral0,
    primaryContainer = BrandBlue100,
    onPrimaryContainer = BrandBlue700,
    secondary = BrandBlue600,
    onSecondary = Neutral0,
    background = Neutral50,
    onBackground = Neutral900,
    surface = Neutral0,
    onSurface = Neutral900,
    surfaceVariant = Neutral100,
    onSurfaceVariant = Neutral600,
    outline = Neutral200,
    error = ErrorRed,
    onError = Neutral0,
)

private val DarkColors = darkColorScheme(
    primary = BrandBlue400,
    onPrimary = Neutral900,
    primaryContainer = BrandBlue700,
    onPrimaryContainer = BrandBlue50,
    secondary = BrandBlue400,
    onSecondary = Neutral900,
    background = Neutral900,
    onBackground = Neutral50,
    surface = Neutral800,
    onSurface = Neutral50,
    surfaceVariant = Color(0xFF2A2F3C),
    onSurfaceVariant = Neutral200,
    outline = Color(0xFF3B4150),
    error = Color(0xFFFF6B6B),
    onError = Neutral900,
)

@Composable
fun MhubTheme(
    useDarkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (useDarkTheme) DarkColors else LightColors
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? android.app.Activity)?.window ?: return@SideEffect
            window.statusBarColor = Color.Transparent.toArgb()
            window.navigationBarColor = Color.Transparent.toArgb()
            WindowCompat.getInsetsController(window, view).apply {
                isAppearanceLightStatusBars = !useDarkTheme
                isAppearanceLightNavigationBars = !useDarkTheme
            }
        }
    }
    MaterialTheme(
        colorScheme = colors,
        typography = MhubTypography,
        content = content,
    )
}
