package com.mhub.feature.profile

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.core.common.model.User
import com.mhub.core.common.result.Result
import com.mhub.core.data.repository.AuthRepository
import com.mhub.core.data.repository.ProfileRepository
import com.mhub.core.ui.components.MhubErrorState
import com.mhub.core.ui.components.MhubLoadingIndicator
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@Composable
fun ProfileScreen(
    onLogout: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToMyPosts: () -> Unit = {},
    onNavigateToWishlist: () -> Unit = {},
    onNavigateToMessages: () -> Unit = {},
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    var showLogoutDialog by remember { mutableStateOf(false) }

    if (showLogoutDialog) {
        AlertDialog(
            onDismissRequest = { showLogoutDialog = false },
            title = { Text("Sign Out") },
            text = { Text("Are you sure you want to sign out?") },
            confirmButton = {
                TextButton(onClick = {
                    showLogoutDialog = false
                    viewModel.logout()
                }) { Text("Sign Out") }
            },
            dismissButton = {
                TextButton(onClick = { showLogoutDialog = false }) { Text("Cancel") }
            },
        )
    }

    LaunchedEffect(uiState.isLoggedOut) {
        if (uiState.isLoggedOut) onLogout()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Profile") },
                actions = {
                    IconButton(onClick = onNavigateToSettings) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings")
                    }
                    IconButton(onClick = { showLogoutDialog = true }) {
                        Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = "Sign out")
                    }
                },
            )
        },
    ) { padding ->
        when {
            uiState.isLoading -> MhubLoadingIndicator(modifier = Modifier.padding(padding))
            uiState.error != null -> MhubErrorState(message = uiState.error!!, onRetry = viewModel::refresh, modifier = Modifier.padding(padding))
            uiState.user != null -> {
                val user = uiState.user!!
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(24.dp)
                        .semantics { contentDescription = "Profile for ${user.name}" },
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    // Avatar
                    user.avatar?.let { avatar ->
                        AsyncImage(
                            model = avatar,
                            contentDescription = "Profile picture",
                            modifier = Modifier.size(96.dp).clip(CircleShape),
                            contentScale = ContentScale.Crop,
                        )
                    }

                    Spacer(modifier = Modifier.height(16.dp))
                    Text(text = user.name, style = MaterialTheme.typography.headlineSmall)

                    user.bio?.let { bio ->
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(text = bio, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    user.email?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                    user.phone?.let { Text(it, style = MaterialTheme.typography.bodySmall) }

                    if (user.isVerified) {
                        Spacer(modifier = Modifier.height(8.dp))
                        AssistChip(onClick = {}, label = { Text("Verified") })
                    }

                    Spacer(modifier = Modifier.height(32.dp))
                    HorizontalDivider()
                    Spacer(modifier = Modifier.height(16.dp))

                    // Quick links
                    ListItem(
                        headlineContent = { Text("My Listings") },
                        modifier = Modifier.fillMaxWidth().clickable(onClick = onNavigateToMyPosts),
                    )
                    ListItem(
                        headlineContent = { Text("Wishlist") },
                        modifier = Modifier.fillMaxWidth().clickable(onClick = onNavigateToWishlist),
                    )
                    ListItem(
                        headlineContent = { Text("Messages") },
                        modifier = Modifier.fillMaxWidth().clickable(onClick = onNavigateToMessages),
                    )
                }
            }
        }
    }
}

data class ProfileUiState(
    val user: User? = null, val isLoading: Boolean = false, val error: String? = null, val isLoggedOut: Boolean = false,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            authRepository.currentUser.collect { user ->
                _uiState.update { it.copy(user = user) }
            }
        }
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            when (val result = profileRepository.getProfile()) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, user = result.data) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepository.logout()
            _uiState.update { it.copy(isLoggedOut = true) }
        }
    }
}
