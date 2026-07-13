package com.mhub.app.ui.notifications

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.NotificationPrefsRequest
import com.mhub.app.data.remote.dto.NotificationPrefsResponse
import com.mhub.app.data.repository.NotificationPrefsRepository
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NotificationPrefsScreen(
    onBack: () -> Unit,
    viewModel: NotifPrefsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Notification Preferences", fontWeight = FontWeight.Bold) },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null) } },
            )
        },
    ) { padding ->
        if (state.loading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        } else {
            Column(
                Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text("Choose which notifications you'd like to receive", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(12.dp))

                NotifToggleRow(icon = Icons.Filled.LocalOffer, title = "Offers & Negotiations", subtitle = "New offers, counter-offers, and acceptances", checked = state.offers) { viewModel.toggle("offers") }
                NotifToggleRow(icon = Icons.AutoMirrored.Filled.TrendingDown, title = "Price Drops", subtitle = "Price changes on items you're watching", checked = state.priceDrops) { viewModel.toggle("priceDrops") }
                NotifToggleRow(icon = Icons.Filled.ShoppingCart, title = "Sales & Transactions", subtitle = "Sale confirmations, payments, and deliveries", checked = state.sales) { viewModel.toggle("sales") }
                NotifToggleRow(icon = Icons.Filled.Settings, title = "System Notifications", subtitle = "Account security, verification, and updates", checked = state.system) { viewModel.toggle("system") }
                NotifToggleRow(icon = Icons.Filled.Campaign, title = "Marketing & Promotions", subtitle = "Deals, offers, and new feature announcements", checked = state.marketing) { viewModel.toggle("marketing") }

                if (state.saved) {
                    Spacer(Modifier.height(12.dp))
                    Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.fillMaxWidth()) {
                        Text("✓ Preferences saved", modifier = Modifier.padding(12.dp), color = MaterialTheme.colorScheme.onPrimaryContainer, fontWeight = FontWeight.Medium, fontSize = 13.sp)
                    }
                }
            }
        }
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
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
    ) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(24.dp))
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                Text(subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Switch(checked = checked, onCheckedChange = { onToggle() })
        }
    }
}
