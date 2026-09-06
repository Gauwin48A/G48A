package com.zaruda.app.ui.profile

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Vibration
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zaruda.app.ui.theme.ColorTokens
import kotlinx.coroutines.launch

/* ── Layer 1: Ambient Atmospheric Canvas Backdrop ─────────────────────────── */

@Composable
private fun SettingsAtmosphericBackdrop(isDark: Boolean) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(230.dp)
            .background(
                Brush.verticalGradient(
                    colors = if (isDark) {
                        listOf(
                            Color(0xFF0F172A),
                            Color(0xFF1E1B4B),
                            Color(0xFF111827),
                        )
                    } else {
                        listOf(
                            Color(0xFFE0E7FF),
                            Color(0xFFF3E8FF),
                            Color(0xFFF8FAFC),
                        )
                    }
                )
            )
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val canvasWidth = size.width
            val canvasHeight = size.height

            // Aura 1 - Top Left glow
            drawCircle(
                brush = Brush.radialGradient(
                    colors = if (isDark) {
                        listOf(Color(0xFF6366F1).copy(alpha = 0.28f), Color.Transparent)
                    } else {
                        listOf(Color(0xFF818CF8).copy(alpha = 0.35f), Color.Transparent)
                    },
                    center = androidx.compose.ui.geometry.Offset(canvasWidth * 0.15f, canvasHeight * 0.25f),
                    radius = canvasWidth * 0.55f,
                )
            )

            // Aura 2 - Top Right emerald security aura
            drawCircle(
                brush = Brush.radialGradient(
                    colors = if (isDark) {
                        listOf(Color(0xFF059669).copy(alpha = 0.22f), Color.Transparent)
                    } else {
                        listOf(Color(0xFF34D399).copy(alpha = 0.30f), Color.Transparent)
                    },
                    center = androidx.compose.ui.geometry.Offset(canvasWidth * 0.85f, canvasHeight * 0.35f),
                    radius = canvasWidth * 0.50f,
                )
            )
        }

        // Ambient bottom gradient scrim
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(60.dp)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            if (isDark) Color(0xFF111827).copy(alpha = 0.7f) else Color(0xFFF8FAFC).copy(alpha = 0.8f),
                        )
                    )
                )
        )
    }
}

/* ── Layer 2: Pinned Floating Glassmorphic Top Bar ────────────────────────── */

@Composable
private fun SettingsFloatingTopBar(
    isDark: Boolean,
    onBack: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = if (isDark) Color.Black.copy(alpha = 0.65f) else Color.White.copy(alpha = 0.88f),
            border = BorderStroke(1.dp, if (isDark) Color.White.copy(alpha = 0.15f) else Color.Black.copy(alpha = 0.08f)),
            shadowElevation = 6.dp,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                // Back Button + Title
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Surface(
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                        modifier = Modifier.size(36.dp),
                        onClick = onBack,
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                modifier = Modifier.size(18.dp),
                            )
                        }
                    }

                    Text(
                        text = "Settings",
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp,
                    )
                }

                // Escrow Shield Badge
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFF059669).copy(alpha = 0.12f),
                    border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.25f)),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Shield,
                            contentDescription = null,
                            tint = Color(0xFF059669),
                            modifier = Modifier.size(13.dp),
                        )
                        Text(
                            text = "Escrow Safe",
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF059669),
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(onBack: () -> Unit) {
    val isDark = ColorTokens.isDarkTheme()
    val haptic = LocalHapticFeedback.current

    var pushEnabled by remember { mutableStateOf(true) }
    var emailEnabled by remember { mutableStateOf(true) }
    var darkEnabled by remember { mutableStateOf(isDark) }
    var biometricEnabled by remember { mutableStateOf(false) }
    var hapticsEnabled by remember { mutableStateOf(true) }
    var escrowOtpPrompt by remember { mutableStateOf(true) }

    val scope = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState()
    var showLanguageSheet by remember { mutableStateOf(false) }
    var selectedLanguage by remember { mutableStateOf("English") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
    ) {
        // ── Layer 1: Ambient Backdrop ──
        SettingsAtmosphericBackdrop(isDark = isDark)

        // ── Layer 3: 32dp Curved Content Sheet ──
        Column(
            modifier = Modifier.fillMaxSize(),
        ) {
            Spacer(modifier = Modifier.height(104.dp))

            Surface(
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                color = MaterialTheme.colorScheme.background,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxSize(),
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                ) {
                    // Tactile Drag Handle
                    Box(
                        modifier = Modifier
                            .padding(top = 12.dp, bottom = 6.dp)
                            .align(Alignment.CenterHorizontally)
                            .size(width = 36.dp, height = 4.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f))
                    )

                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(top = 8.dp, bottom = 48.dp),
                    ) {
                        // ── App Preferences Section ──
                        item {
                            SectionHeader(title = "App Preferences", icon = Icons.Filled.DarkMode)
                        }
                        item {
                            SettingsToggleCard(
                                title = "Dark Mode",
                                subtitle = "Toggle dark theme for the app",
                                icon = Icons.Filled.DarkMode,
                                checked = darkEnabled,
                                onCheckedChange = {
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    darkEnabled = it
                                }
                            )
                        }
                        item {
                            SettingsClickCard(
                                title = "Language",
                                subtitle = "Current: $selectedLanguage",
                                icon = Icons.Filled.Language,
                                onClick = {
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    showLanguageSheet = true
                                }
                            )
                        }
                        item {
                            SettingsToggleCard(
                                title = "Tactile Haptics",
                                subtitle = "Haptic feedback on marketplace taps and offers",
                                icon = Icons.Filled.Vibration,
                                checked = hapticsEnabled,
                                onCheckedChange = {
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    hapticsEnabled = it
                                }
                            )
                        }

                        // ── Security & Escrow Trust Section ──
                        item {
                            Spacer(Modifier.height(4.dp))
                            SectionHeader(title = "Security & Escrow Trust", icon = Icons.Filled.Security)
                        }
                        item {
                            SettingsToggleCard(
                                title = "Biometric Wallet Lock",
                                subtitle = "Require fingerprint/FaceID for wallet release",
                                icon = Icons.Filled.Fingerprint,
                                checked = biometricEnabled,
                                onCheckedChange = {
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    biometricEnabled = it
                                }
                            )
                        }
                        item {
                            SettingsToggleCard(
                                title = "Delivery Handover OTP Prompt",
                                subtitle = "Always verify 4-digit code before handing over items",
                                icon = Icons.Filled.Lock,
                                checked = escrowOtpPrompt,
                                onCheckedChange = {
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    escrowOtpPrompt = it
                                }
                            )
                        }

                        // ── Notifications Section ──
                        item {
                            Spacer(Modifier.height(4.dp))
                            SectionHeader(title = "Notifications & Alerts", icon = Icons.Filled.Notifications)
                        }
                        item {
                            SettingsToggleCard(
                                title = "Push Notifications",
                                subtitle = "Alerts for orders, escrow updates, and offers",
                                icon = Icons.Filled.Notifications,
                                checked = pushEnabled,
                                onCheckedChange = {
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    pushEnabled = it
                                }
                            )
                        }
                        item {
                            SettingsToggleCard(
                                title = "Email Alerts",
                                subtitle = "Receipts, escrow releases, and account summaries",
                                icon = Icons.Filled.Notifications,
                                checked = emailEnabled,
                                onCheckedChange = {
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    emailEnabled = it
                                }
                            )
                        }

                        // ── Trust & Escrow Guarantee Footer ──
                        item {
                            Spacer(Modifier.height(8.dp))
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = Color(0xFF059669).copy(alpha = 0.08f),
                                border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.25f)),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Row(
                                    modifier = Modifier.padding(14.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    Text("🛡️", fontSize = 24.sp)
                                    Column {
                                        Text(
                                            text = "Zero-Chat Escrow Guaranteed",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp,
                                            color = Color(0xFF059669),
                                        )
                                        Text(
                                            text = "All transactions are secured end-to-end. App Version 1.2.0 (Build 48).",
                                            fontSize = 11.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // ── Layer 2: Pinned Floating Glass Top Bar ──
        SettingsFloatingTopBar(
            isDark = isDark,
            onBack = onBack,
        )
    }

    // ── Language Selection Bottom Sheet ──
    if (showLanguageSheet) {
        ModalBottomSheet(
            onDismissRequest = { showLanguageSheet = false },
            sheetState = sheetState,
            containerColor = MaterialTheme.colorScheme.surface,
            shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    "Select Language",
                    style = MaterialTheme.typography.titleLarge,
                    fontWeight = FontWeight.Bold
                )
                listOf("English", "Hindi", "Telugu", "Tamil", "Marathi", "Kannada").forEach { lang ->
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (selectedLanguage == lang) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f) else Color.Transparent,
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            selectedLanguage = lang
                            scope.launch { sheetState.hide() }.invokeOnCompletion { showLanguageSheet = false }
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp)
                        ) {
                            RadioButton(
                                selected = selectedLanguage == lang,
                                onClick = {
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    selectedLanguage = lang
                                    scope.launch { sheetState.hide() }.invokeOnCompletion { showLanguageSheet = false }
                                }
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(lang, style = MaterialTheme.typography.bodyLarge, fontWeight = if (selectedLanguage == lang) FontWeight.Bold else FontWeight.Normal)
                        }
                    }
                }
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String, icon: ImageVector) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier.padding(top = 8.dp, bottom = 4.dp),
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(16.dp),
        )
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary,
        )
    }
}

@Composable
fun SettingsToggleCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = CircleShape,
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                modifier = Modifier.size(40.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
            Spacer(Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.width(8.dp))
            Switch(
                checked = checked,
                onCheckedChange = onCheckedChange,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = Color.White,
                    checkedTrackColor = Color(0xFF059669),
                )
            )
        }
    }
}

@Composable
fun SettingsClickCard(
    title: String,
    subtitle: String,
    icon: ImageVector,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.35f)),
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Surface(
                shape = CircleShape,
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                modifier = Modifier.size(40.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(
                        imageVector = icon,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
            Spacer(Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Text("›", fontSize = 20.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Light)
        }
    }
}
