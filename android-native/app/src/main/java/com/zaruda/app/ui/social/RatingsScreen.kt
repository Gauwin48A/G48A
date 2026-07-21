package com.zaruda.app.ui.social

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.TrustScoreResponse
import com.zaruda.app.data.repository.TrustRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class RatingsUiState(
    val loading: Boolean = true,
    val trustScore: TrustScoreResponse? = null,
    val error: String? = null,
)

@HiltViewModel
class RatingsViewModel @Inject constructor(
    private val trustRepo: TrustRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(RatingsUiState())
    val state: StateFlow<RatingsUiState> = _state.asStateFlow()

    fun load(userId: String) {
        _state.value = RatingsUiState(loading = true)
        viewModelScope.launch {
            when (val t = trustRepo.score(userId)) {
                is ApiResult.Success -> _state.value = RatingsUiState(
                    loading = false,
                    trustScore = t.data,
                )
                is ApiResult.Failure -> _state.value = RatingsUiState(
                    loading = false,
                    error = t.error.message ?: "Failed to load ratings",
                )
            }
        }
    }
}

@Composable
fun RatingsScreen(
    userId: String,
    onBack: () -> Unit,
    viewModel: RatingsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val isDark = isSystemInDarkTheme()

    LaunchedEffect(userId) { viewModel.load(userId) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        when {
            state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }

            state.error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Filled.VerifiedUser, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(48.dp))
                    Text("Ratings unavailable", fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(state.error ?: "", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    TextButton(onClick = { viewModel.load(userId) }) { Text("Retry") }
                }
            }

            else -> {
                val ts = state.trustScore
                val score = ts?.trustScore?.toInt() ?: 0
                val trustColor = when {
                    score >= 80 -> Color(0xFF22C55E)
                    score >= 50 -> Color(0xFFF59E0B)
                    else -> Color(0xFFEF4444)
                }

                Column(
                    modifier = Modifier.fillMaxSize(),
                ) {
                    // Top bar
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .padding(WindowInsets.statusBars.asPaddingValues())
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = MaterialTheme.colorScheme.primary)
                        }
                        Spacer(Modifier.width(8.dp))
                        Text("Ratings & Trust", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(androidx.compose.foundation.rememberScrollState())
                            .padding(horizontal = 16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        // Trust Score Card
                        Card(
                            shape = RoundedCornerShape(20.dp),
                            colors = CardDefaults.cardColors(containerColor = trustColor.copy(alpha = 0.1f)),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(
                                Modifier.padding(20.dp),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                Icon(Icons.Filled.VerifiedUser, null, tint = trustColor, modifier = Modifier.size(36.dp))
                                Text(
                                    "$score",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 40.sp,
                                    color = trustColor,
                                )
                                Text(
                                    when {
                                        score >= 80 -> "Highly Trusted"
                                        score >= 50 -> "Trusted"
                                        else -> "New Seller"
                                    },
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 16.sp,
                                    color = trustColor.copy(alpha = 0.8f),
                                )
                                ts?.trustLabel?.let { label ->
                                    Text(
                                        label,
                                        fontSize = 13.sp,
                                        color = trustColor.copy(alpha = 0.6f),
                                    )
                                }
                            }
                        }

                        // Rating breakdown
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1E293B) else Color.White),
                            elevation = CardDefaults.cardElevation(1.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(
                                Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                Text("Seller Rating", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface)

                                Row(
                                    Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceEvenly,
                                ) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("🛡️", fontSize = 28.sp)
                                        Text("Trust", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Text(
                                            "${score}/100",
                                            fontSize = 15.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = trustColor,
                                        )
                                    }
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(ts?.trustBadge?.let { "🏆" } ?: "⭐", fontSize = 28.sp)
                                        Text("Badge", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Text(
                                            ts?.trustBadge?.take(8) ?: "Standard",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = MaterialTheme.colorScheme.onSurface,
                                        )
                                    }
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text(ts?.riskState?.let {
                                            when (it.lowercase()) { "low" -> "🟢"; "medium" -> "🟡"; else -> "🔴" }
                                        } ?: "⚪", fontSize = 28.sp)
                                        Text("Risk", fontSize = 11.sp, fontWeight = FontWeight.Medium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Text(
                                            ts?.riskState?.replaceFirstChar { c -> c.uppercase() } ?: "Unknown",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = MaterialTheme.colorScheme.onSurface,
                                        )
                                    }
                                }
                            }
                        }

                        // Trust Factors
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = if (isDark) Color(0xFF1E293B) else Color.White),
                            elevation = CardDefaults.cardElevation(1.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(
                                Modifier.padding(16.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Text("Trust Factors", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface)
                                Text(
                                    when {
                                        score >= 80 -> "✅ Highly trusted seller with excellent track record"
                                        score >= 50 -> "🟡 Trusted seller — completing more transactions will improve your score"
                                        else -> "🔄 New seller — build trust through verified transactions"
                                    },
                                    fontSize = 13.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }

                        // Explain note
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                Modifier.padding(12.dp),
                                verticalAlignment = Alignment.Top,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Text("ℹ️", fontSize = 16.sp)
                                Column {
                                    Text(
                                        "Ratings are based on transaction history and seller performance. Complete verified sales and maintain high response rates to improve your trust score.",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        lineHeight = 17.sp,
                                    )
                                }
                            }
                        }

                        Spacer(Modifier.height(60.dp))
                    }
                }
            }
        }
    }
}
