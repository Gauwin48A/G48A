package com.mhub.feature.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun SettingsScreen(
    onNavigateBack: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState()),
        ) {
            // Appearance
            SettingsCategory("Appearance")
            ListItem(
                headlineContent = { Text("Dark Mode") },
                supportingContent = { Text(uiState.themeMode.displayName) },
                leadingContent = { Icon(Icons.Default.DarkMode, null) },
                trailingContent = {
                    var expanded by remember { mutableStateOf(false) }
                    Box {
                        TextButton(onClick = { expanded = true }) {
                            Text(uiState.themeMode.displayName)
                        }
                        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                            ThemeMode.entries.forEach { mode ->
                                DropdownMenuItem(
                                    text = { Text(mode.displayName) },
                                    onClick = {
                                        viewModel.setThemeMode(mode)
                                        expanded = false
                                    },
                                )
                            }
                        }
                    }
                },
            )

            HorizontalDivider()

            // Security
            SettingsCategory("Security")
            ListItem(
                headlineContent = { Text("Biometric Lock") },
                supportingContent = {
                    Text(
                        if (uiState.biometricAvailable) "Require fingerprint to open app"
                        else "Biometric not available on this device"
                    )
                },
                leadingContent = { Icon(Icons.Default.Fingerprint, null) },
                trailingContent = {
                    Switch(
                        checked = uiState.biometricEnabled,
                        onCheckedChange = { viewModel.toggleBiometric(it) },
                        enabled = uiState.biometricAvailable,
                    )
                },
            )

            HorizontalDivider()

            // Notifications
            SettingsCategory("Notifications")
            ListItem(
                headlineContent = { Text("Push Notifications") },
                supportingContent = { Text("Receive push notifications") },
                leadingContent = { Icon(Icons.Default.Notifications, null) },
                trailingContent = {
                    Switch(
                        checked = uiState.pushEnabled,
                        onCheckedChange = { viewModel.togglePush(it) },
                    )
                },
            )
            ListItem(
                headlineContent = { Text("Chat Notifications") },
                supportingContent = { Text("Notify for new messages") },
                leadingContent = { Icon(Icons.Default.Chat, null) },
                trailingContent = {
                    Switch(
                        checked = uiState.chatNotificationsEnabled,
                        onCheckedChange = { viewModel.toggleChatNotifications(it) },
                    )
                },
            )

            HorizontalDivider()

            // Data & Storage
            SettingsCategory("Data & Storage")
            ListItem(
                headlineContent = { Text("Clear Cache") },
                supportingContent = { Text("Free up storage space") },
                leadingContent = { Icon(Icons.Default.DeleteSweep, null) },
                modifier = Modifier.clickable { viewModel.clearCache() },
            )
            ListItem(
                headlineContent = { Text("Auto-download Images") },
                supportingContent = { Text("Download images over Wi-Fi only") },
                leadingContent = { Icon(Icons.Default.Image, null) },
                trailingContent = {
                    Switch(
                        checked = uiState.autoDownloadImages,
                        onCheckedChange = { viewModel.toggleAutoDownload(it) },
                    )
                },
            )

            HorizontalDivider()

            // About
            SettingsCategory("About")
            ListItem(
                headlineContent = { Text("Version") },
                supportingContent = { Text(uiState.appVersion) },
                leadingContent = { Icon(Icons.Default.Info, null) },
            )
            ListItem(
                headlineContent = { Text("Privacy Policy") },
                leadingContent = { Icon(Icons.Default.Policy, null) },
                modifier = Modifier.clickable { viewModel.openPrivacyPolicy() },
            )
            ListItem(
                headlineContent = { Text("Terms of Service") },
                leadingContent = { Icon(Icons.Default.Description, null) },
                modifier = Modifier.clickable { viewModel.openTerms() },
            )

            Spacer(Modifier.height(32.dp))
        }
    }
}

@Composable
private fun SettingsCategory(title: String) {
    Text(
        text = title,
        style = MaterialTheme.typography.titleSmall,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
    )
}
