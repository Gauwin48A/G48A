package com.zaruda.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat
import com.zaruda.app.data.local.ThemeMode

private val LightColors = lightColorScheme(
    primary = BrandPrimary,
    onPrimary = Neutral0,
    primaryContainer = BrandContainer,
    onPrimaryContainer = BrandOnContainer,
    secondary = AccentTeal,
    onSecondary = Neutral0,
    secondaryContainer = Color(0xFFE5DFFF),
    onSecondaryContainer = Color(0xFF221A4E),
    tertiary = AccentAmber,
    onTertiary = Neutral900,
    tertiaryContainer = Color(0xFFFFE7C8),
    onTertiaryContainer = Color(0xFF261900),
    background = Neutral50,
    onBackground = Neutral900,
    surface = Neutral0,
    onSurface = Neutral900,
    surfaceVariant = Color(0xFFE9EDF7),
    onSurfaceVariant = Neutral600,
    outline = Neutral300,
    outlineVariant = Neutral200,
    error = ErrorRed,
    onError = Neutral0,
    errorContainer = Color(0xFFFFE5E1),
    onErrorContainer = Color(0xFF7A271A),
)

private val DarkColors = darkColorScheme(
    primary = BrandPrimaryDark,
    onPrimary = Neutral900,
    primaryContainer = Color(0xFF284AA0),
    onPrimaryContainer = Color(0xFFDCE6FF),
    secondary = Color(0xFFC9BCFF),
    onSecondary = Color(0xFF2D1E67),
    secondaryContainer = Color(0xFF43318A),
    onSecondaryContainer = Color(0xFFE5DFFF),
    tertiary = Color(0xFFFBC56A),
    onTertiary = Color(0xFF3A2A00),
    tertiaryContainer = Color(0xFF564000),
    onTertiaryContainer = Color(0xFFFFE9C9),
    background = Color(0xFF0F1422),
    onBackground = Neutral50,
    surface = Color(0xFF161D2D),
    onSurface = Neutral50,
    surfaceVariant = Color(0xFF26324A),
    onSurfaceVariant = Neutral300,
    outline = Neutral500,
    outlineVariant = Neutral700,
    error = Color(0xFFFFB4AB),
    onError = Color(0xFF690005),
    errorContainer = Color(0xFF93000A),
    onErrorContainer = Color(0xFFFFDAD6),
)

@Composable
fun MhubTheme(
    themeMode: ThemeMode = ThemeMode.SYSTEM,
    content: @Composable () -> Unit,
) {
    val useDarkTheme = when (themeMode) {
        ThemeMode.LIGHT -> false
        ThemeMode.DARK -> true
        ThemeMode.SYSTEM -> isSystemInDarkTheme()
    }
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
    ) {
        CompositionLocalProvider(LocalSpacing provides MhubSpacing()) {
            content()
        }
    }
}
