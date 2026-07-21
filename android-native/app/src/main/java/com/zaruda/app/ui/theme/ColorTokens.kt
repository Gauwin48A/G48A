package com.zaruda.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.luminance

/**
 * Semantic theme tokens that resolve dynamically based on the current theme state.
 * Use these to replace hardcoded hex colors and support Dark Mode cleanly.
 *
 * Every token follows the pattern: res = darkValue else lightValue
 */
object ColorTokens {

    // ── Primary / Brand ──────────────────────────────────────────────
    val Primary: Color @Composable get() = MaterialTheme.colorScheme.primary
    val OnPrimary: Color @Composable get() = MaterialTheme.colorScheme.onPrimary
    val PrimaryContainer: Color @Composable get() = MaterialTheme.colorScheme.primaryContainer
    val OnPrimaryContainer: Color @Composable get() = MaterialTheme.colorScheme.onPrimaryContainer

    // ── Surface / Background ─────────────────────────────────────────
    val Background: Color @Composable get() = MaterialTheme.colorScheme.background
    val OnBackground: Color @Composable get() = MaterialTheme.colorScheme.onBackground

    val Surface: Color @Composable get() = MaterialTheme.colorScheme.surface
    val OnSurface: Color @Composable get() = MaterialTheme.colorScheme.onSurface

    val SurfaceVariant: Color @Composable get() = MaterialTheme.colorScheme.surfaceVariant
    val OnSurfaceVariant: Color @Composable get() = MaterialTheme.colorScheme.onSurfaceVariant

    val Outline: Color @Composable get() = MaterialTheme.colorScheme.outline
    val OutlineVariant: Color @Composable get() = MaterialTheme.colorScheme.outlineVariant

    // ── Card / Container backgrounds ─────────────────────────────────
    /** Card background: dark slate card or white */
    val CardSurface: Color
        @Composable get() = if (isDark) Color(0xFF1E293B) else Color.White

    /** Softer card surface for stats, secondary panels */
    val CardSurfaceSecondary: Color
        @Composable get() = if (isDark) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White.copy(alpha = 0.92f)

    /** Extra-dark panel for elevated sections */
    val CardSurfaceElevated: Color
        @Composable get() = if (isDark) Color(0xFF26324A) else Color(0xFFF1F5F9)

    /** Page background gradient start */
    val PageBgStart: Color
        @Composable get() = if (isDark) Color(0xFF0F1422) else Color(0xFFF8FAFC)
    /** Page background gradient mid */
    val PageBgMid: Color
        @Composable get() = if (isDark) Color(0xFF131B2E) else Color(0xFFEFF6FF)
    /** Page background gradient end */
    val PageBgEnd: Color
        @Composable get() = if (isDark) Color(0xFF152035) else Color(0xFFF0F9FF)

    // ── Text colors ──────────────────────────────────────────────────
    /** Primary heading text */
    val TextHeading: Color
        @Composable get() = if (isDark) Color.White else Color(0xFF1E1B4B)

    /** Body / paragraph text */
    val TextBody: Color
        @Composable get() = if (isDark) Color(0xFFE2E8F0) else Color(0xFF334155)

    /** Secondary / muted text */
    val TextSecondary: Color
        @Composable get() = if (isDark) Color(0xFF94A3B8) else Color(0xFF475569)

    /** Muted / tertiary text */
    val TextMuted: Color
        @Composable get() = if (isDark) Color(0xFF64748B) else Color(0xFF94A3B8)

    /** Text on dark gradient/color backgrounds */
    val TextOnDark: Color = Color.White
    /** Text on dark backgrounds (slightly muted) */
    val TextOnDarkMuted: Color
        @Composable get() = Color.White.copy(alpha = 0.75f)

    // ── Plan / Tier card theme tokens ────────────────────────────────
    /** Tier card surface (amber/gold tier) */
    val CardAmberSurface: Color
        @Composable get() = if (isDark) Color(0xFF2D1F00) else Color(0xFFFFFBEB)
    val CardAmberText: Color
        @Composable get() = if (isDark) Color(0xFFFBBF24) else Color(0xFF78350F)
    val CardAmberSubtext: Color
        @Composable get() = if (isDark) Color(0xFFF59E0B) else Color(0xFFB45309)
    val CardAmberBadge: Color
        @Composable get() = if (isDark) Color(0xFF3D2900) else Color(0xFFFDE68A)
    val CardAmberBadgeText: Color
        @Composable get() = if (isDark) Color(0xFFFCD34D) else Color(0xFF92400E)
    val CardAmberBorder: Color
        @Composable get() = if (isDark) Color(0xFF78350F) else Color(0xFFFBBF24)
    val CardAmberButton: Color
        @Composable get() = if (isDark) Color(0xFFD97706) else Color(0xFFD97706)

    /** Tier card surface (orange/bronze tier) */
    val CardOrangeSurface: Color
        @Composable get() = if (isDark) Color(0xFF2D0F00) else Color(0xFFFFF7ED)
    val CardOrangeText: Color
        @Composable get() = if (isDark) Color(0xFFFDBA74) else Color(0xFF7C2D12)
    val CardOrangeSubtext: Color
        @Composable get() = if (isDark) Color(0xFFF97316) else Color(0xFF9A3412)
    val CardOrangeBadge: Color
        @Composable get() = if (isDark) Color(0xFF3D1A00) else Color(0xFFFFEDD5)
    val CardOrangeBadgeText: Color
        @Composable get() = if (isDark) Color(0xFFFDBA74) else Color(0xFF9A3412)
    val CardOrangeBorder: Color
        @Composable get() = if (isDark) Color(0xFF9A3412) else Color(0xFFFED7AA)
    val CardOrangeButton: Color
        @Composable get() = if (isDark) Color(0xFFEA580C) else Color(0xFFC2410C)

    /** Tier card surface (slate/silver tier) */
    val CardSlateSurface: Color
        @Composable get() = if (isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9)
    val CardSlateText: Color
        @Composable get() = if (isDark) Color.White else Color(0xFF0F172A)
    val CardSlateSubtext: Color
        @Composable get() = if (isDark) Color(0xFF94A3B8) else Color(0xFF475569)
    val CardSlateBadge: Color
        @Composable get() = if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)
    val CardSlateBadgeText: Color
        @Composable get() = if (isDark) Color(0xFFCBD5E1) else Color(0xFF334155)
    val CardSlateBorder: Color
        @Composable get() = if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)
    val CardSlateButton: Color
        @Composable get() = if (isDark) Color(0xFF475569) else Color(0xFF334155)

    /** Tier card surface (purple/premium tier) */
    val CardPurpleSurface: Color
        @Composable get() = if (isDark) Color(0xFF1A112B) else Color(0xFFFAF5FF)
    val CardPurpleText: Color
        @Composable get() = if (isDark) Color(0xFFC4B5FD) else Color(0xFF4C1D95)
    val CardPurpleSubtext: Color
        @Composable get() = if (isDark) Color(0xFFA78BFA) else Color(0xFF6B21A8)
    val CardPurpleBadge: Color
        @Composable get() = if (isDark) Color(0xFF2D1B4E) else Color(0xFFE9D5FF)
    val CardPurpleBadgeText: Color
        @Composable get() = if (isDark) Color(0xFFC4B5FD) else Color(0xFF5B21B6)
    val CardPurpleBorder: Color
        @Composable get() = if (isDark) Color(0xFF4C1D95) else Color(0xFFE9D5FF)
    val CardPurpleButton: Color
        @Composable get() = if (isDark) Color(0xFF7C3AED) else Color(0xFF6D28D9)

    /** Tier card surface (gray/default tier) */
    val CardGraySurface: Color
        @Composable get() = if (isDark) Color(0xFF1E293B) else Color(0xFFF8FAFC)
    val CardGrayText: Color
        @Composable get() = if (isDark) Color.White else Color(0xFF1E293B)
    val CardGraySubtext: Color
        @Composable get() = if (isDark) Color(0xFF94A3B8) else Color(0xFF64748B)
    val CardGrayBadge: Color
        @Composable get() = if (isDark) Color(0xFF334155) else Color(0xFFF1F5F9)
    val CardGrayBadgeText: Color
        @Composable get() = if (isDark) Color(0xFFCBD5E1) else Color(0xFF475569)
    val CardGrayBorder: Color
        @Composable get() = if (isDark) Color(0xFF334155) else Color(0xFFCBD5E1)
    val CardGrayButton: Color
        @Composable get() = if (isDark) Color(0xFF64748B) else Color(0xFF475569)

    // ── Semantic containers (for info/warning/success/error banners) ──
    val BlueContainer: Color
        @Composable get() = if (isDark) Color(0xFF1E293B) else Color(0xFFEFF6FF)

    val BlueText: Color
        @Composable get() = if (isDark) Color(0xFF93C5FD) else Color(0xFF2563EB)

    val GreenContainer: Color
        @Composable get() = if (isDark) Color(0xFF064E3B) else Color(0xFFECFDF5)

    val GreenText: Color
        @Composable get() = if (isDark) Color(0xFF86EFAC) else Color(0xFF059669)

    val AmberContainer: Color
        @Composable get() = if (isDark) Color(0xFF78350F) else Color(0xFFFFF7ED)

    val AmberText: Color
        @Composable get() = if (isDark) Color(0xFFFDE047) else Color(0xFFD97706)

    val RedContainer: Color
        @Composable get() = if (isDark) Color(0xFF7F1D1D) else Color(0xFFFEF2F2)

    val RedText: Color
        @Composable get() = if (isDark) Color(0xFFFCA5A5) else Color(0xFFDC2626)

    // ── Special / Common hardcoded colors used across screens ────────
    /** White-on-dark icon/button color */
    val IconOnDark: Color = Color.White
    /** Star / highlight accent */
    val StarAccent: Color = Color(0xFFFCD34D)
    /** Verified green check */
    val VerifiedGreen: Color = Color(0xFF22C55E)
    /** Verified green container */
    val VerifiedGreenContainer: Color
        @Composable get() = if (isDark) Color(0xFF064E3B) else Color(0xFF22C55E).copy(alpha = 0.12f)
    /** Premium amber accent */
    val PremiumAmber: Color = Color(0xFFF59E0B)
    /** Premium amber container */
    val PremiumAmberContainer: Color
        @Composable get() = if (isDark) Color(0xFF2D1F00) else Color(0xFFF59E0B).copy(alpha = 0.12f)

    // ── Divider / Separator ──────────────────────────────────────────
    val Divider: Color
        @Composable get() = if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)

    /** Divider with low emphasis (for cards, featured sections) */
    val DividerSubtle: Color
        @Composable get() = if (isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9)

    // ── Badge / Chip colors ──────────────────────────────────────────
    val BadgeGreen: Color
        @Composable get() = if (isDark) Color(0xFF064E3B) else Color(0xFFD1FAE5)
    val BadgeGreenText: Color
        @Composable get() = if (isDark) Color(0xFF6EE7B7) else Color(0xFF065F46)

    // ── Rewards specific ─────────────────────────────────────────────
    val RewardsCardBg: Color
        @Composable get() = if (isDark) Color(0xFF1A2744) else Color(0xFFF8FAFF)
    val RewardsGoldBg: Color
        @Composable get() = if (isDark) Color(0xFF2D210E) else Color(0xFFFFFBEB)
    val RewardsGoldText: Color
        @Composable get() = if (isDark) Color(0xFFFCD34D) else Color(0xFFB45309)
    val RewardsGoldProgress: Color
        @Composable get() = if (isDark) Color(0xFF2D1F00) else Color(0xFFFEF3C7)

    // ── Helper ───────────────────────────────────────────────────────
    /**
     * Returns whether the CURRENT Applied ColorScheme is dark.
     * Unlike [androidx.compose.foundation.isSystemInDarkTheme] which checks the
     * device-level system setting, this checks the active [MaterialTheme.colorScheme] that
     * [com.zaruda.app.ui.theme.MhubTheme] applies. Critical for the app's explicit dark mode
     * toggle — without this, toggling dark mode in-app would return light-mode ColorTokens
     * (dark text on dark background = invisible).
     * Checks background luminance rather than using [isSystemInDarkTheme] which only
     * reads the device system setting (not the app's applied MaterialTheme).
     */
    val isDark: Boolean
        @Composable get() = MaterialTheme.colorScheme.background.luminance() < 0.5f
}
