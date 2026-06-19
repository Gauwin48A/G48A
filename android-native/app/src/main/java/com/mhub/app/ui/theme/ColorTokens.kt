package com.mhub.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/**
 * Semantic theme tokens that resolve dynamically based on the current theme state.
 * Use these to replace hardcoded hex colors and support Dark Mode cleanly.
 */
object ColorTokens {
    val Primary: Color
        @Composable get() = MaterialTheme.colorScheme.primary

    val Background: Color
        @Composable get() = MaterialTheme.colorScheme.background

    val Surface: Color
        @Composable get() = MaterialTheme.colorScheme.surface

    val SurfaceVariant: Color
        @Composable get() = MaterialTheme.colorScheme.surfaceVariant

    val OnSurface: Color
        @Composable get() = MaterialTheme.colorScheme.onSurface

    val OnSurfaceVariant: Color
        @Composable get() = MaterialTheme.colorScheme.onSurfaceVariant

    val Outline: Color
        @Composable get() = MaterialTheme.colorScheme.outline

    val Error: Color
        @Composable get() = MaterialTheme.colorScheme.error

    val BlueContainer: Color
        @Composable get() = if (androidx.compose.foundation.isSystemInDarkTheme()) {
            Color(0xFF1E293B)
        } else {
            Color(0xFFEFF6FF)
        }

    val BlueText: Color
        @Composable get() = if (androidx.compose.foundation.isSystemInDarkTheme()) {
            Color(0xFF93C5FD)
        } else {
            Color(0xFF2563EB)
        }

    val GreenContainer: Color
        @Composable get() = if (androidx.compose.foundation.isSystemInDarkTheme()) {
            Color(0xFF064E3B)
        } else {
            Color(0xFFECFDF5)
        }

    val GreenText: Color
        @Composable get() = if (androidx.compose.foundation.isSystemInDarkTheme()) {
            Color(0xFF86EFAC)
        } else {
            Color(0xFF059669)
        }

    val AmberContainer: Color
        @Composable get() = if (androidx.compose.foundation.isSystemInDarkTheme()) {
            Color(0xFF78350F)
        } else {
            Color(0xFFFFF7ED)
        }

    val AmberText: Color
        @Composable get() = if (androidx.compose.foundation.isSystemInDarkTheme()) {
            Color(0xFFFDE047)
        } else {
            Color(0xFFD97706)
        }

    val RedContainer: Color
        @Composable get() = if (androidx.compose.foundation.isSystemInDarkTheme()) {
            Color(0xFF7F1D1D)
        } else {
            Color(0xFFFEF2F2)
        }

    val RedText: Color
        @Composable get() = if (androidx.compose.foundation.isSystemInDarkTheme()) {
            Color(0xFFFCA5A5)
        } else {
            Color(0xFFDC2626)
        }
}
