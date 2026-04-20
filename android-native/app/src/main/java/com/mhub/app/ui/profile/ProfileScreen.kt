package com.mhub.app.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.ListAlt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Message
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.AuthRepository
import com.mhub.app.domain.model.User
import com.mhub.app.ui.components.AppErrorState
import com.mhub.app.ui.components.ErrorBanner
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileState(
    val loading: Boolean = true,
    val user: User? = null,
    val error: String? = null,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val repo: AuthRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ProfileState())
    val state: StateFlow<ProfileState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.value = ProfileState(loading = true)
        viewModelScope.launch {
            when (val result = repo.me()) {
                is ApiResult.Success -> _state.value = ProfileState(loading = false, user = result.data)
                is ApiResult.Failure -> _state.value = ProfileState(loading = false, error = result.error.message)
            }
        }
    }

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch { repo.logout(); onDone() }
    }
}

private fun tierColor(plan: String?): Color {
    return when (plan?.lowercase()) {
        "premium" -> Color(0xFFD97706)
        "gold" -> Color(0xFFF59E0B)
        "silver" -> Color(0xFF6B7280)
        "bronze" -> Color(0xFFB45309)
        else -> Color(0xFF6B7280)
    }
}

private fun tierLabel(plan: String?): String {
    return when (plan?.lowercase()) {
        "premium" -> "Premium"
        "gold" -> "Gold"
        "silver" -> "Silver"
        "bronze" -> "Bronze"
        else -> "Basic"
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onSignedOut: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenMyPosts: () -> Unit,
    onOpenKyc: () -> Unit,
    onOpenChat: () -> Unit = {},
    onOpenWebParity: () -> Unit = {},
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Profile", fontWeight = FontWeight.Bold)
                    }
                },
                actions = {
                    androidx.compose.material3.IconButton(onClick = onOpenSettings) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        when {
            state.loading -> Box(
                Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center,
            ) { CircularProgressIndicator(color = MaterialTheme.colorScheme.primary) }

            else -> {
                val user = state.user
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    ErrorBanner(message = state.error)

                    // ── Avatar header card ────────────────────────────────
                    Card(
                        shape = RoundedCornerShape(24.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(
                                    Brush.verticalGradient(
                                        listOf(
                                            MaterialTheme.colorScheme.primary,
                                            MaterialTheme.colorScheme.secondary,
                                        ),
                                    ),
                                )
                                .padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            // Avatar circle
                            Box(
                                modifier = Modifier
                                    .size(80.dp)
                                    .clip(CircleShape)
                                    .background(MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.2f)),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    text = (user?.displayName?.firstOrNull()?.uppercaseChar() ?: '?').toString(),
                                    style = MaterialTheme.typography.headlineLarge,
                                    color = MaterialTheme.colorScheme.onPrimary,
                                    fontWeight = FontWeight.Bold,
                                )
                            }

                            Text(
                                text = user?.displayName ?: "Guest",
                                style = MaterialTheme.typography.titleLarge,
                                color = MaterialTheme.colorScheme.onPrimary,
                                fontWeight = FontWeight.Bold,
                            )

                            // Email / phone row
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Icon(
                                    imageVector = if (user?.phone != null) Icons.Default.Phone else Icons.Default.Email,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.8f),
                                    modifier = Modifier.size(14.dp),
                                )
                                Text(
                                    text = user?.phone ?: user?.email ?: "No contact info",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.85f),
                                )
                            }

                            // Badge row
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                // KYC badge
                                Surface(
                                    shape = RoundedCornerShape(20.dp),
                                    color = if (user?.isKycVerified == true)
                                        Color(0xFF059669).copy(alpha = 0.9f)
                                    else
                                        MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.15f),
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                                    ) {
                                        Icon(
                                            Icons.Default.CheckCircle,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.onPrimary,
                                            modifier = Modifier.size(12.dp),
                                        )
                                        Text(
                                            text = when {
                                                user?.isKycVerified == true -> "Verified Seller"
                                                user?.kycStatus == "pending" -> "KYC Pending"
                                                else -> "Not Verified"
                                            },
                                            style = MaterialTheme.typography.labelSmall,
                                            color = MaterialTheme.colorScheme.onPrimary,
                                        )
                                    }
                                }

                                // Tier badge
                                val tier = user?.currentPlan
                                if (tier != null) {
                                    Surface(
                                        shape = RoundedCornerShape(20.dp),
                                        color = tierColor(tier).copy(alpha = 0.9f),
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                                        ) {
                                            Icon(
                                                Icons.Default.Star,
                                                contentDescription = null,
                                                tint = Color.White,
                                                modifier = Modifier.size(12.dp),
                                            )
                                            Text(
                                                text = tierLabel(tier),
                                                style = MaterialTheme.typography.labelSmall,
                                                color = Color.White,
                                                fontWeight = FontWeight.Bold,
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // ── Stats row ─────────────────────────────────────────
                    Card(
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 16.dp),
                            horizontalArrangement = Arrangement.SpaceEvenly,
                        ) {
                            StatItem(label = "Listings", value = "—")
                            VerticalDivider()
                            StatItem(label = "Rank", value = tierLabel(user?.currentPlan))
                            VerticalDivider()
                            StatItem(label = "Sales", value = "—")
                            VerticalDivider()
                            StatItem(label = "Rating", value = "—")
                        }
                    }

                    // ── Selling section ───────────────────────────────────
                    SectionHeader(title = "Selling")
                    ProfileMenuCard {
                        ProfileMenuItem(
                            icon = Icons.AutoMirrored.Filled.ListAlt,
                            label = "My Listings",
                            subtitle = "Manage your active posts",
                            onClick = onOpenMyPosts,
                        )
                        HorizontalDivider(modifier = Modifier.padding(start = 68.dp))
                        ProfileMenuItem(
                            icon = Icons.Default.VerifiedUser,
                            label = if (user?.isKycVerified == true) "Verification Status" else "Get Verified",
                            subtitle = "Required to sell on MHub",
                            onClick = onOpenKyc,
                        )
                        HorizontalDivider(modifier = Modifier.padding(start = 68.dp))
                        ProfileMenuItem(
                            icon = Icons.Default.Message,
                            label = "Messages",
                            subtitle = "Chat with buyers and sellers",
                            onClick = onOpenChat,
                        )
                    }

                    // ── Account section ───────────────────────────────────
                    SectionHeader(title = "Account")
                    ProfileMenuCard {
                        ProfileMenuItem(
                            icon = Icons.Default.Notifications,
                            label = "Notifications",
                            subtitle = "Push alerts and email preferences",
                            onClick = onOpenSettings,
                        )
                        HorizontalDivider(modifier = Modifier.padding(start = 68.dp))
                        ProfileMenuItem(
                            icon = Icons.Default.Security,
                            label = "Security",
                            subtitle = "Password, 2FA and sessions",
                            onClick = onOpenSettings,
                        )
                        HorizontalDivider(modifier = Modifier.padding(start = 68.dp))
                        ProfileMenuItem(
                            icon = Icons.Default.Language,
                            label = "Language",
                            subtitle = "English (EN)",
                            onClick = onOpenSettings,
                        )
                        HorizontalDivider(modifier = Modifier.padding(start = 68.dp))
                        ProfileMenuItem(
                            icon = Icons.Default.Settings,
                            label = "Settings",
                            subtitle = "API endpoint and app preferences",
                            onClick = onOpenSettings,
                        )
                        HorizontalDivider(modifier = Modifier.padding(start = 68.dp))
                        ProfileMenuItem(
                            icon = Icons.Default.Language,
                            label = "Web parity pages",
                            subtitle = "All localhost route references",
                            onClick = onOpenWebParity,
                        )
                    }

                    // ── Sign out ──────────────────────────────────────────
                    OutlinedButton(
                        onClick = { viewModel.logout(onSignedOut) },
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                    ) {
                        Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Sign Out", fontWeight = FontWeight.SemiBold)
                    }

                    Spacer(Modifier.height(16.dp))
                }
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        letterSpacing = androidx.compose.ui.unit.TextUnit(
            value = 1.5f,
            type = androidx.compose.ui.unit.TextUnitType.Sp,
        ),
        modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp),
    )
}

@Composable
private fun StatItem(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(text = value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun VerticalDivider() {
    Box(
        modifier = Modifier
            .height(36.dp)
            .width(1.dp)
            .background(MaterialTheme.colorScheme.outlineVariant),
    )
}

@Composable
private fun ProfileMenuCard(content: @Composable () -> Unit) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column { content() }
    }
}

@Composable
private fun ProfileMenuItem(
    icon: ImageVector,
    label: String,
    subtitle: String,
    onClick: () -> Unit,
) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(0.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimaryContainer,
                    modifier = Modifier.size(20.dp),
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(text = label, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
