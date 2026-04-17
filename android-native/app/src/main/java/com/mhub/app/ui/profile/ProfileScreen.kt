package com.mhub.app.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.ListAlt
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.R
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.AuthRepository
import com.mhub.app.domain.model.User
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileState(val loading: Boolean = true, val user: User? = null, val error: String? = null)

@HiltViewModel
class ProfileViewModel @Inject constructor(private val repo: AuthRepository) : ViewModel() {
    private val _state = MutableStateFlow(ProfileState())
    val state: StateFlow<ProfileState> = _state.asStateFlow()
    init { load() }
    fun load() {
        _state.value = ProfileState(loading = true)
        viewModelScope.launch {
            when (val r = repo.me()) {
                is ApiResult.Success -> _state.value = ProfileState(loading = false, user = r.data)
                is ApiResult.Failure -> _state.value = ProfileState(loading = false, error = r.error.message)
            }
        }
    }
    fun logout(onDone: () -> Unit) {
        viewModelScope.launch { repo.logout(); onDone() }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onSignedOut: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenMyPosts: () -> Unit,
    onOpenKyc: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.nav_profile)) },
                actions = {
                    IconButton(onClick = onOpenSettings) {
                        Icon(Icons.Default.Settings, contentDescription = null)
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier.padding(padding).fillMaxSize().padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            when {
                state.loading -> Box(Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                else -> {
                    val user = state.user
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        if (!user?.avatar.isNullOrBlank()) {
                            AsyncImage(
                                model = user!!.avatar,
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.size(72.dp).clip(CircleShape),
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .size(72.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.primaryContainer),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    (user?.displayName?.firstOrNull()?.uppercaseChar() ?: '?').toString(),
                                    style = MaterialTheme.typography.headlineMedium,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                )
                            }
                        }
                        Column {
                            Text(user?.displayName ?: "—", style = MaterialTheme.typography.titleLarge)
                            user?.email?.let { Text(it, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        }
                    }

                    RoleBadge(user)
                    Spacer(Modifier.height(8.dp))

                    ProfileRow(
                        icon = Icons.AutoMirrored.Filled.ListAlt,
                        label = stringResource(R.string.profile_my_posts),
                        onClick = onOpenMyPosts,
                    )
                    ProfileRow(
                        icon = Icons.Default.VerifiedUser,
                        label = if (user?.isKycVerified == true) stringResource(R.string.profile_kyc)
                                else stringResource(R.string.kyc_become_seller),
                        onClick = onOpenKyc,
                    )

                    state.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                }
            }
            Spacer(Modifier.weight(1f))
            OutlinedButton(
                onClick = { viewModel.logout(onSignedOut) },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.profile_logout))
            }
        }
    }
}

@Composable
private fun RoleBadge(user: User?) {
    val (text, color) = when {
        user?.isKycVerified == true -> "Verified seller" to Color(0xFF16A34A)
        user?.kycStatus == "pending" -> "KYC pending" to Color(0xFFF59E0B)
        user?.kycStatus == "rejected" -> "KYC rejected" to MaterialTheme.colorScheme.error
        else -> "Viewer" to MaterialTheme.colorScheme.onSurfaceVariant
    }
    AssistChip(onClick = {}, label = { Text(text) }, leadingIcon = {
        Icon(Icons.Default.VerifiedUser, contentDescription = null, tint = color)
    })
}

@Composable
private fun ProfileRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        tonalElevation = 1.dp,
        shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Icon(icon, contentDescription = null)
            Text(label, style = MaterialTheme.typography.titleSmall)
        }
    }
}
