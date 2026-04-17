package com.mhub.app.ui.settings

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.BuildConfig
import com.mhub.app.R
import com.mhub.app.data.local.AppPreferences
import com.mhub.app.ui.components.AppTextField
import com.mhub.app.ui.components.PrimaryButton
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(private val prefs: AppPreferences) : ViewModel() {
    private val _baseUrl = MutableStateFlow("")
    val baseUrl: StateFlow<String> = _baseUrl.asStateFlow()
    private val _saved = MutableStateFlow(false)
    val saved: StateFlow<Boolean> = _saved.asStateFlow()

    init {
        viewModelScope.launch { _baseUrl.value = prefs.baseUrl.first() }
    }

    fun update(value: String) { _baseUrl.value = value; _saved.value = false }
    fun save() {
        viewModelScope.launch {
            prefs.setBaseUrl(_baseUrl.value)
            _saved.value = true
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val baseUrl by viewModel.baseUrl.collectAsState()
    val saved by viewModel.saved.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.nav_settings)) },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, contentDescription = null) }
                },
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier.padding(padding).fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text(stringResource(R.string.settings_api_base_url), style = MaterialTheme.typography.titleMedium)
            Text(
                stringResource(R.string.settings_api_base_url_helper),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium,
            )
            AppTextField(
                value = baseUrl,
                onValueChange = viewModel::update,
                label = stringResource(R.string.settings_api_base_url),
            )
            Text(
                "Default: ${BuildConfig.DEFAULT_API_BASE_URL}",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            PrimaryButton(
                text = stringResource(R.string.action_save),
                onClick = viewModel::save,
            )
            if (saved) {
                Text(
                    "Saved. Restart the app to apply.",
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
            Spacer(Modifier.weight(1f))
            Text(
                "MHub v${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
