package com.zaruda.app.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zaruda.app.ui.theme.ColorTokens
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(onBack: () -> Unit) {
    val isDark = ColorTokens.isDark
    var pushEnabled by remember { mutableStateOf(true) }
    var emailEnabled by remember { mutableStateOf(true) }
    var darkEnabled by remember { mutableStateOf(isDark) }
    var biometricEnabled by remember { mutableStateOf(false) }

    val scope = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState()
    var showLanguageSheet by remember { mutableStateOf(false) }
    var selectedLanguage by remember { mutableStateOf("English") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            contentPadding = padding,
            modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { Spacer(modifier = Modifier.height(8.dp)) }

            item {
                Text("App Preferences", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
            item {
                SettingsToggleCard(
                    title = "Dark Mode",
                    subtitle = "Toggle dark theme for the app",
                    icon = Icons.Filled.DarkMode,
                    checked = darkEnabled,
                    onCheckedChange = { darkEnabled = it }
                )
            }
            item {
                SettingsClickCard(
                    title = "Language",
                    subtitle = "Current: $selectedLanguage",
                    icon = Icons.Filled.Language,
                    onClick = { showLanguageSheet = true }
                )
            }

            item { Spacer(modifier = Modifier.height(8.dp)) }
            item {
                Text("Notifications", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
            item {
                SettingsToggleCard(
                    title = "Push Notifications",
                    subtitle = "Alerts for orders, messages, and offers",
                    icon = Icons.Filled.Notifications,
                    checked = pushEnabled,
                    onCheckedChange = { pushEnabled = it }
                )
            }
            item {
                SettingsToggleCard(
                    title = "Email Alerts",
                    subtitle = "Marketing and account summaries",
                    icon = Icons.Filled.Notifications,
                    checked = emailEnabled,
                    onCheckedChange = { emailEnabled = it }
                )
            }

            item { Spacer(modifier = Modifier.height(8.dp)) }
            item {
                Text("Security", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            }
            item {
                SettingsToggleCard(
                    title = "Biometric Wallet Lock",
                    subtitle = "Require fingerprint/FaceID for wallet access",
                    icon = Icons.Filled.Fingerprint,
                    checked = biometricEnabled,
                    onCheckedChange = { biometricEnabled = it }
                )
            }

            item { Spacer(modifier = Modifier.height(24.dp)) }
        }

        if (showLanguageSheet) {
            ModalBottomSheet(
                onDismissRequest = { showLanguageSheet = false },
                sheetState = sheetState
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text("Select Language", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    listOf("English", "Hindi", "Telugu", "Tamil", "Marathi").forEach { lang ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            RadioButton(
                                selected = selectedLanguage == lang,
                                onClick = {
                                    selectedLanguage = lang
                                    scope.launch { sheetState.hide() }.invokeOnCompletion { showLanguageSheet = false }
                                }
                            )
                            Spacer(Modifier.width(8.dp))
                            Text(lang, style = MaterialTheme.typography.bodyLarge)
                        }
                    }
                    Spacer(Modifier.height(32.dp))
                }
            }
        }
    }
}

@Composable
fun SettingsToggleCard(title: String, subtitle: String, icon: ImageVector, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(24.dp))
            Spacer(Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Switch(checked = checked, onCheckedChange = onCheckedChange)
        }
    }
}

@Composable
fun SettingsClickCard(title: String, subtitle: String, icon: ImageVector, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        onClick = onClick,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(24.dp))
            Spacer(Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
