package com.mhub.core.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

// ─── MHub Brand Colors ───────────────────────────────────────────────────
val MhubPrimary = Color(0xFF1976D2)
val MhubOnPrimary = Color(0xFFFFFFFF)
val MhubPrimaryContainer = Color(0xFFD1E4FF)
val MhubOnPrimaryContainer = Color(0xFF001D36)

val MhubSecondary = Color(0xFF535F70)
val MhubOnSecondary = Color(0xFFFFFFFF)
val MhubSecondaryContainer = Color(0xFFD7E3F7)
val MhubOnSecondaryContainer = Color(0xFF101C2B)

val MhubTertiary = Color(0xFF6B5778)
val MhubOnTertiary = Color(0xFFFFFFFF)
val MhubTertiaryContainer = Color(0xFFF2DAFF)
val MhubOnTertiaryContainer = Color(0xFF251431)

val MhubError = Color(0xFFBA1A1A)
val MhubOnError = Color(0xFFFFFFFF)
val MhubErrorContainer = Color(0xFFFFDAD6)
val MhubOnErrorContainer = Color(0xFF410002)

val MhubBackground = Color(0xFFFDFCFF)
val MhubOnBackground = Color(0xFF1A1C1E)
val MhubSurface = Color(0xFFFDFCFF)
val MhubOnSurface = Color(0xFF1A1C1E)

// ─── Dark Colors ─────────────────────────────────────────────────────────
val MhubPrimaryDark = Color(0xFF9ECAFF)
val MhubOnPrimaryDark = Color(0xFF003258)
val MhubPrimaryContainerDark = Color(0xFF00497D)
val MhubOnPrimaryContainerDark = Color(0xFFD1E4FF)

val MhubBackgroundDark = Color(0xFF1A1C1E)
val MhubOnBackgroundDark = Color(0xFFE2E2E6)
val MhubSurfaceDark = Color(0xFF1A1C1E)
val MhubOnSurfaceDark = Color(0xFFE2E2E6)

private val LightColorScheme = lightColorScheme(
    primary = MhubPrimary,
    onPrimary = MhubOnPrimary,
    primaryContainer = MhubPrimaryContainer,
    onPrimaryContainer = MhubOnPrimaryContainer,
    secondary = MhubSecondary,
    onSecondary = MhubOnSecondary,
    secondaryContainer = MhubSecondaryContainer,
    onSecondaryContainer = MhubOnSecondaryContainer,
    tertiary = MhubTertiary,
    onTertiary = MhubOnTertiary,
    tertiaryContainer = MhubTertiaryContainer,
    onTertiaryContainer = MhubOnTertiaryContainer,
    error = MhubError,
    onError = MhubOnError,
    errorContainer = MhubErrorContainer,
    onErrorContainer = MhubOnErrorContainer,
    background = MhubBackground,
    onBackground = MhubOnBackground,
    surface = MhubSurface,
    onSurface = MhubOnSurface,
)

private val DarkColorScheme = darkColorScheme(
    primary = MhubPrimaryDark,
    onPrimary = MhubOnPrimaryDark,
    primaryContainer = MhubPrimaryContainerDark,
    onPrimaryContainer = MhubOnPrimaryContainerDark,
    background = MhubBackgroundDark,
    onBackground = MhubOnBackgroundDark,
    surface = MhubSurfaceDark,
    onSurface = MhubOnSurfaceDark,
    error = MhubError,
    onError = MhubOnError,
)

@Composable
fun MhubTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit,
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context)
            else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = MhubTypography,
        content = content,
    )
}
