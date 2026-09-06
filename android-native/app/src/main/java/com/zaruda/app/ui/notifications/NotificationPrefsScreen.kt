package com.zaruda.app.ui.notifications

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.TrendingDown
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.NotificationPrefsRequest
import com.zaruda.app.data.remote.dto.NotificationPrefsResponse
import com.zaruda.app.data.repository.NotificationPrefsRepository
import com.zaruda.app.ui.theme.ColorTokens
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NotifPrefsState(
    val loading: Boolean = true,
    val pushEnabled: Boolean = true,
    val emailEnabled: Boolean = true,
    val smsEnabled: Boolean = false,
    val offers: Boolean = true,
    val priceDrops: Boolean = true,
    val sales: Boolean = true,
    val system: Boolean = true,
    val marketing: Boolean = false,
    val saved: Boolean = false,
)

@HiltViewModel
class NotifPrefsViewModel @Inject constructor(
    private val repo: NotificationPrefsRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(NotifPrefsState())
    val state: StateFlow<NotifPrefsState> = _state.asStateFlow()

    init { load() }

    private fun load() {
        viewModelScope.launch {
            when (val r = repo.get()) {
                is ApiResult.Success -> _state.value = NotifPrefsState(
                    loading = false,
                    pushEnabled = r.data.pushEnabled,
                    emailEnabled = r.data.emailEnabled,
                    smsEnabled = r.data.smsEnabled,
                    offers = r.data.offers,
                    priceDrops = r.data.priceDrops,
                    sales = r.data.sales,
                    system = r.data.system,
                    marketing = r.data.marketing,
                )
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false)
            }
        }
    }

    fun toggle(field: String) {
        val s = _state.value
        _state.value = when (field) {
            "push"      -> s.copy(pushEnabled = !s.pushEnabled)
            "email"     -> s.copy(emailEnabled = !s.emailEnabled)
            "sms"       -> s.copy(smsEnabled = !s.smsEnabled)
            "offers"    -> s.copy(offers = !s.offers)
            "priceDrops"-> s.copy(priceDrops = !s.priceDrops)
            "sales"     -> s.copy(sales = !s.sales)
            "system"    -> s.copy(system = !s.system)
            "marketing" -> s.copy(marketing = !s.marketing)
            else -> s
        }
        save()
    }

    private fun save() {
        val s = _state.value
        viewModelScope.launch {
            repo.update(NotificationPrefsRequest(
                pushEnabled = s.pushEnabled,
                emailEnabled = s.emailEnabled,
                smsEnabled = s.smsEnabled,
                offers = s.offers,
                priceDrops = s.priceDrops,
                sales = s.sales,
                system = s.system,
                marketing = s.marketing,
            ))
            _state.value = _state.value.copy(saved = true)
        }
    }
}

/* ── Layer 1: Ambient Atmospheric Canvas Backdrop ─────────────────────────── */

@Composable
private fun NotificationPrefsAtmosphericBackdrop(isDark: Boolean) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(230.dp)
            .background(
                Brush.verticalGradient(
                    colors = if (isDark) {
                        listOf(Color(0xFF0F172A), Color(0xFF1E1B4B), Color(0xFF020617))
                    } else {
                        listOf(Color(0xFF4F46E5), Color(0xFF4338CA), Color(0xFF312E81))
                    }
                )
            )
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF818CF8).copy(alpha = if (isDark) 0.35f else 0.45f),
                        Color.Transparent,
                    ),
                    center = Offset(size.width * 0.75f, 40.dp.toPx()),
                    radius = 160.dp.toPx(),
                )
            )
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFFA855F7).copy(alpha = if (isDark) 0.25f else 0.35f),
                        Color.Transparent,
                    ),
                    center = Offset(size.width * 0.20f, 90.dp.toPx()),
                    radius = 140.dp.toPx(),
                )
            )
        }

        // Top scrim for status bar readability
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(90.dp)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Black.copy(alpha = 0.50f), Color.Transparent)
                    )
                )
        )

        // Bottom vignette scrim blending into 32dp curved sheet
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(70.dp)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.35f))
                    )
                )
        )
    }
}

/* ── Layer 2: Floating Glassmorphic Top Bar ───────────────────────────────── */

@Composable
private fun NotificationPrefsFloatingTopBar(
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
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Surface(
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                        modifier = Modifier.size(34.dp),
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
                        text = "Notification Preferences",
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                    )
                }

                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFF059669).copy(alpha = 0.12f),
                    border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.3f)),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text("🛡️", fontSize = 11.sp)
                        Text(
                            "Escrow Safe",
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

/* ── Screen Composable with 3-Layer Architecture ───────────────────────────── */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationPrefsScreen(
    onBack: () -> Unit,
    viewModel: NotifPrefsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val isDark = ColorTokens.isDarkTheme()
    val haptic = LocalHapticFeedback.current

    Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
        // Layer 1: Atmospheric Canvas Backdrop
        NotificationPrefsAtmosphericBackdrop(isDark = isDark)

        // Layer 3: 32dp Curved Content Sheet
        Column(modifier = Modifier.fillMaxSize()) {
            Spacer(modifier = Modifier.height(108.dp))

            Surface(
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                color = MaterialTheme.colorScheme.background,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxSize(),
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Tactile Drag Handle
                    Box(
                        modifier = Modifier
                            .padding(top = 12.dp, bottom = 8.dp)
                            .width(44.dp)
                            .height(4.5.dp)
                            .clip(RoundedCornerShape(2.5.dp))
                            .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.35f))
                            .align(Alignment.CenterHorizontally),
                    )

                    if (state.loading) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                        }
                    } else {
                        Column(
                            Modifier
                                .fillMaxSize()
                                .verticalScroll(rememberScrollState())
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text(
                                text = "Choose which notifications you'd like to receive",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Spacer(Modifier.height(4.dp))

                            NotifToggleRow(
                                icon = Icons.Filled.LocalOffer,
                                title = "Offers & Negotiations",
                                subtitle = "New offers, counter-offers, and acceptances",
                                checked = state.offers
                            ) {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                viewModel.toggle("offers")
                            }

                            NotifToggleRow(
                                icon = Icons.AutoMirrored.Filled.TrendingDown,
                                title = "Price Drops",
                                subtitle = "Price changes on items you're watching",
                                checked = state.priceDrops
                            ) {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                viewModel.toggle("priceDrops")
                            }

                            NotifToggleRow(
                                icon = Icons.Filled.ShoppingCart,
                                title = "Sales & Transactions",
                                subtitle = "Sale confirmations, payments, and deliveries",
                                checked = state.sales
                            ) {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                viewModel.toggle("sales")
                            }

                            NotifToggleRow(
                                icon = Icons.Filled.Settings,
                                title = "System Notifications",
                                subtitle = "Account security, verification, and updates",
                                checked = state.system
                            ) {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                viewModel.toggle("system")
                            }

                            NotifToggleRow(
                                icon = Icons.Filled.Campaign,
                                title = "Marketing & Promotions",
                                subtitle = "Deals, offers, and new feature announcements",
                                checked = state.marketing
                            ) {
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                viewModel.toggle("marketing")
                            }

                            if (state.saved) {
                                Spacer(Modifier.height(8.dp))
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = Color(0xFF059669).copy(alpha = 0.12f),
                                    border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.3f)),
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Row(
                                        modifier = Modifier.padding(14.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF059669), modifier = Modifier.size(18.dp))
                                        Text(
                                            "Preferences saved instantly",
                                            color = Color(0xFF059669),
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 13.sp
                                        )
                                    }
                                }
                            }
                            Spacer(Modifier.height(16.dp))
                        }
                    }
                }
            }
        }

        // Layer 2: Floating Glass Top Bar
        NotificationPrefsFloatingTopBar(
            isDark = isDark,
            onBack = onBack,
        )
    }
}

@Composable
private fun NotifToggleRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    checked: Boolean,
    onToggle: () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        shadowElevation = 1.dp,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Surface(
                shape = CircleShape,
                color = MaterialTheme.colorScheme.primary.copy(alpha = 0.10f),
                modifier = Modifier.size(40.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp))
                }
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Text(subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Switch(
                checked = checked,
                onCheckedChange = { onToggle() },
                colors = SwitchDefaults.colors(
                    checkedThumbColor = Color.White,
                    checkedTrackColor = Color(0xFF059669),
                )
            )
        }
    }
}
