package com.mhub.app.ui.commerce

import android.content.Intent
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.CompareArrows
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.*
import androidx.compose.material3.AlertDialog
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.R
import com.mhub.app.ui.components.AppErrorState
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.*
import com.mhub.app.data.repository.*
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.common.LinkColor
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import javax.inject.Inject

// ──────────────────────────────────────────────────────────────────────────────

@HiltViewModel
class SavedSearchesViewModel @Inject constructor(private val repo: SavedSearchesRepository) : ViewModel() {
    private val _state = MutableStateFlow(SavedSearchesUiState())
    val state: StateFlow<SavedSearchesUiState> = _state.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        when (val r = repo.list()) {
            is ApiResult.Success -> _state.value = _state.value.copy(loading = false, searches = r.data)
            is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
        }
    } }
    fun delete(id: String) { viewModelScope.launch { repo.delete(id); load() } }
    fun setNewKeyword(v: String) { _state.value = _state.value.copy(newKeyword = v) }
    fun setNewLocation(v: String) { _state.value = _state.value.copy(newLocation = v) }
    fun setNewMinPrice(v: String) { _state.value = _state.value.copy(newMinPrice = v.filter { it.isDigit() }) }
    fun setNewMaxPrice(v: String) { _state.value = _state.value.copy(newMaxPrice = v.filter { it.isDigit() }) }
    fun setNewCategory(v: String) { _state.value = _state.value.copy(newCategory = v) }
    fun toggleCreateForm() { _state.value = _state.value.copy(showCreateForm = !_state.value.showCreateForm) }
    fun toggleNotification(id: String) {
        val current = _state.value.notificationsEnabled[id] ?: true
        val newEnabled = !current
        _state.value = _state.value.copy(notificationsEnabled = _state.value.notificationsEnabled + (id to newEnabled))
        viewModelScope.launch { repo.toggleNotification(id, newEnabled) }
    }
    fun createSearch() {
        val s = _state.value
        if (s.newKeyword.isBlank()) return
        _state.value = s.copy(creating = true)
        viewModelScope.launch {
            repo.save(s.newKeyword, s.newCategory.ifBlank { null })
            _state.value = _state.value.copy(creating = false, showCreateForm = false, newKeyword = "", newLocation = "", newMinPrice = "", newMaxPrice = "", newCategory = "")
            load()
        }
    }
}


@Composable
fun SavedSearchesScreen(onBack: () -> Unit, onRunSearch: (String) -> Unit = {}, viewModel: SavedSearchesViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val categoryOptions = listOf("Electronics", "Fashion", "Vehicles", "Others", "Furniture", "Sports")
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            Row(Modifier.fillMaxWidth().padding(WindowInsets.statusBars.asPaddingValues()).padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Color(0xFF2563EB)) }
                Spacer(Modifier.width(8.dp))
                Column(Modifier.weight(1f)) {
                    Text(stringResource(R.string.saved_searches_title), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
                    if (state.searches.isNotEmpty()) Text("${state.searches.size} searches · get notified on new matches", fontSize = 11.sp, color = Color(0xFF64748B))
                }
                IconButton(onClick = { viewModel.toggleCreateForm() }, modifier = Modifier.size(36.dp)) {
                    Icon(if (state.showCreateForm) Icons.Filled.Close else Icons.Filled.Add, null, tint = Color(0xFF2563EB))
                }
            }
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                else -> LazyColumn(contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    // Create form
                    if (state.showCreateForm) item {
                        Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 4.dp, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Text(stringResource(R.string.commerce_new_saved_search), fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color(0xFF1E293B))
                                HorizontalDivider(color = Color(0xFFE2E8F0))
                                OutlinedTextField(value = state.newKeyword, onValueChange = { viewModel.setNewKeyword(it) },
                                    placeholder = { Text(stringResource(R.string.commerce_keywords_hint)) },
                                    leadingIcon = { Icon(Icons.Filled.Search, null, tint = Color(0xFF64748B), modifier = Modifier.size(18.dp)) },
                                    singleLine = true, shape = RoundedCornerShape(10.dp),
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                                    modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = state.newLocation, onValueChange = { viewModel.setNewLocation(it) },
                                    placeholder = { Text(stringResource(R.string.commerce_location_optional)) },
                                    leadingIcon = { Icon(Icons.Filled.LocationOn, null, tint = Color(0xFF64748B), modifier = Modifier.size(18.dp)) },
                                    singleLine = true, shape = RoundedCornerShape(10.dp),
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                                    modifier = Modifier.fillMaxWidth())
                                // Price range
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedTextField(value = state.newMinPrice, onValueChange = { viewModel.setNewMinPrice(it) },
                                        placeholder = { Text(stringResource(R.string.commerce_min_price)) }, singleLine = true, shape = RoundedCornerShape(10.dp),
                                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                                        modifier = Modifier.weight(1f))
                                    OutlinedTextField(value = state.newMaxPrice, onValueChange = { viewModel.setNewMaxPrice(it) },
                                        placeholder = { Text(stringResource(R.string.commerce_max_price)) }, singleLine = true, shape = RoundedCornerShape(10.dp),
                                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                                        modifier = Modifier.weight(1f))
                                }
                                // Category chips
                                Text(stringResource(R.string.commerce_category), fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = Color(0xFF374151))
                                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    categoryOptions.forEach { cat ->
                                        val sel = state.newCategory == cat
                                        FilterChip(selected = sel, onClick = { viewModel.setNewCategory(if (sel) "" else cat) },
                                            label = { Text(cat, fontSize = 11.sp) }, shape = RoundedCornerShape(20.dp),
                                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White))
                                    }
                                }
                                Button(onClick = { viewModel.createSearch() }, enabled = state.newKeyword.isNotBlank() && !state.creating,
                                    shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                    modifier = Modifier.fillMaxWidth()) { Text(if (state.creating) "Saving…" else "Save Search", fontWeight = FontWeight.SemiBold) }
                            }
                        }
                    }
                    if (state.searches.isEmpty() && !state.showCreateForm) item {
                        EmptyState(icon = { Icon(Icons.Filled.Bookmark, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp)) },
                            title = "No saved searches", subtitle = "Tap + to create a search and get notified when new listings match")
                    }
                    else items(state.searches, key = { it.stableId }) { s ->
                        val notifOn = state.notificationsEnabled[s.stableId] ?: true
                        // newResultCount comes from API; hide badge if 0 or null
                        val newCount = 0
                        Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(horizontal = 14.dp, vertical = 12.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(Modifier.size(40.dp).background(Color(0xFFEFF6FF), RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                                        Icon(Icons.Filled.Search, null, tint = Color(0xFF2563EB), modifier = Modifier.size(20.dp))
                                    }
                                    Spacer(Modifier.width(12.dp))
                                    Column(Modifier.weight(1f)) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Text(s.displayQuery, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                                            if (newCount > 0) {
                                                Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFF22C55E)) {
                                                    Text("+$newCount new", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White,
                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                                }
                                            }
                                        }
                                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                            if (s.category != null) Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFF1F5F9)) {
                                                Text(s.category, fontSize = 11.sp, color = Color(0xFF64748B), modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                            }
                                            if (s.location != null) Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFFEF3C7)) {
                                                Row(Modifier.padding(horizontal = 5.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                                    Icon(Icons.Filled.LocationOn, null, tint = Color(0xFFB45309), modifier = Modifier.size(10.dp))
                                                    Text(s.location, fontSize = 11.sp, color = Color(0xFF92400E))
                                                }
                                            }
                                        }
                                    }
                                    // Notification toggle
                                    IconButton(onClick = { viewModel.toggleNotification(s.stableId) }, modifier = Modifier.size(34.dp)) {
                                        Icon(
                                            if (notifOn) Icons.Filled.Notifications else Icons.Filled.NotificationsOff,
                                            null,
                                            tint = if (notifOn) Color(0xFF2563EB) else Color(0xFFCBD5E1),
                                            modifier = Modifier.size(18.dp),
                                        )
                                    }
                                }
                                Spacer(Modifier.height(8.dp))
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    // Run search
                                    OutlinedButton(
                                        onClick = { onRunSearch(s.displayQuery) },
                                        shape = RoundedCornerShape(8.dp),
                                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF22C55E)),
                                        border = ButtonDefaults.outlinedButtonBorder(enabled = true).copy(width = 1.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                        modifier = Modifier.weight(1f),
                                    ) {
                                        Icon(Icons.Filled.PlayArrow, null, modifier = Modifier.size(14.dp))
                                        Spacer(Modifier.width(4.dp))
                                        Text(stringResource(R.string.btn_run), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                    }
                                    // Delete
                                    OutlinedButton(
                                        onClick = { viewModel.delete(s.id ?: "") },
                                        shape = RoundedCornerShape(8.dp),
                                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEF4444)),
                                        border = ButtonDefaults.outlinedButtonBorder(enabled = true).copy(width = 1.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                        modifier = Modifier.weight(1f),
                                    ) {
                                        Icon(Icons.Filled.Delete, null, modifier = Modifier.size(14.dp))
                                        Spacer(Modifier.width(4.dp))
                                        Text(stringResource(R.string.btn_delete), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// CompareScreen
// ──────────────────────────────────────────────────────────────────────────────