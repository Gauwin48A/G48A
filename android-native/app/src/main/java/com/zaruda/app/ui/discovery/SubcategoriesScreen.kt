package com.zaruda.app.ui.discovery

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Close
import coil.request.ImageRequest
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.outlined.FilterList
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.repository.CategoriesRepository
import com.zaruda.app.domain.model.Category
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AllSubcategoriesViewModel @Inject constructor(
    private val repo: CategoriesRepository,
) : ViewModel() {
    data class State(
        val categories: List<Category> = emptyList(),
        val loading: Boolean = true,
        val error: String? = null,
    )

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            when (val r = repo.all()) {
                is ApiResult.Success -> _state.value = State(categories = r.data, loading = false)
                is ApiResult.Failure -> _state.value = State(loading = false, error = r.error.message)
            }
        }
    }
}

/* ── Subcategories Hero Backdrop (Full-Bleed Scenic Rapido Standard) ─────── */

@Composable
private fun SubcategoriesHeroBackdrop() {
    val context = LocalContext.current
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(290.dp),
    ) {
        AsyncImage(
            model = ImageRequest.Builder(context)
                .data("https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=85")
                .crossfade(true)
                .build(),
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )

        // Dark vignette scrim overlay for maximum text legibility
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.50f),
                            Color.Black.copy(alpha = 0.20f),
                            Color.Black.copy(alpha = 0.55f),
                            Color.Black.copy(alpha = 0.85f),
                        )
                    )
                )
        )

        // Hero Title + Escrow Trust Pill
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(WindowInsets.statusBars.asPaddingValues())
                .padding(top = 52.dp, start = 16.dp, end = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = "Curated",
                    fontFamily = FontFamily.Serif,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                    letterSpacing = 0.5.sp,
                )
                Text(
                    text = "✦",
                    fontSize = 18.sp,
                    color = Color.White.copy(alpha = 0.95f),
                )
                Text(
                    text = "Subcategories",
                    fontFamily = FontFamily.Cursive,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                )
            }

            Spacer(Modifier.height(6.dp))

            Surface(
                shape = RoundedCornerShape(8.dp),
                color = Color.White.copy(alpha = 0.25f),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.6f)),
            ) {
                Text(
                    text = "VERIFIED LOCAL DEALS",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.ExtraBold,
                    letterSpacing = 1.2.sp,
                    color = Color.White,
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 3.dp),
                )
            }

            Spacer(Modifier.height(4.dp))

            Text(
                text = "Explore verified categories • Zero-Chat direct deals",
                color = Color.White.copy(alpha = 0.90f),
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center,
            )
        }
    }
}

/* ── Floating Glassmorphic Top Capsule (Rapido Standard Layer 3) ──────────── */

@Composable
private fun SubcategoriesFloatingTopBar(
    onBack: () -> Unit,
    totalCount: Int,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        // Glassmorphic Back Button
        Surface(
            shape = CircleShape,
            color = Color.Black.copy(alpha = 0.40f),
            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.35f)),
            modifier = Modifier.size(40.dp),
            onClick = onBack,
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "Back",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp),
                )
            }
        }

        // Glassmorphic Title Pill
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Color.Black.copy(alpha = 0.40f),
            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.35f)),
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text("🏷️", fontSize = 13.sp)
                Text(
                    text = "Subcategories ✦",
                    color = Color.White,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp,
                )
            }
        }

        // Glassmorphic Item Count Pill
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = Color.Black.copy(alpha = 0.40f),
            border = BorderStroke(1.dp, Color.White.copy(alpha = 0.35f)),
        ) {
            Text(
                text = "$totalCount Types",
                color = Color.White,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SubcategoriesScreen(
    onBack: () -> Unit,
    onOpenCategory: (String) -> Unit = {},
    viewModel: AllSubcategoriesViewModel = hiltViewModel(),
) {
    val vmState by viewModel.state.collectAsState()
    var selectedGroup by remember { mutableStateOf<String?>(null) }
    var searchQuery by remember { mutableStateOf("") }
    var sortMode by remember { mutableStateOf("popular") }

    val groups = remember(vmState.categories) {
        vmState.categories.mapNotNull { it.categoryGroup }.distinct().sorted()
    }

    val filtered = remember(vmState.categories, selectedGroup, searchQuery) {
        vmState.categories.filter { cat ->
            val matchesGroup = selectedGroup == null || cat.categoryGroup == selectedGroup
            val matchesSearch = searchQuery.isBlank() ||
                cat.displayName.contains(searchQuery, ignoreCase = true) ||
                (cat.categoryGroup ?: "").contains(searchQuery, ignoreCase = true)
            matchesGroup && matchesSearch
        }
    }

    val sorted = remember(filtered, sortMode) {
        when (sortMode) {
            "az" -> filtered.sortedBy { it.displayName }
            else -> filtered.sortedByDescending { it.productCount }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        if (vmState.loading) {
            Box(
                Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) { CircularProgressIndicator() }
        } else if (vmState.error != null) {
            Box(
                Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Could not load categories")
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = { viewModel.load() }) { Text("Retry") }
                }
            }
        } else {
            // ── Layer 1: Scenic Hero Backdrop ──
            SubcategoriesHeroBackdrop()

            // ── Layer 2: 32dp Floating Curved Sheet ──
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                // Spacer for hero backdrop (200dp)
                item(span = { GridItemSpan(2) }, key = "hero_spacer") {
                    Spacer(modifier = Modifier.height(200.dp))
                }

                // 32dp Curved Sheet Header
                item(span = { GridItemSpan(2) }, key = "curved_sheet_header") {
                    Surface(
                        shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                        color = MaterialTheme.colorScheme.background,
                        shadowElevation = 8.dp,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 14.dp, bottom = 4.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            // Centered Tactile Drag Handle (40.dp x 4.dp)
                            Box(
                                modifier = Modifier
                                    .width(40.dp)
                                    .height(4.dp)
                                    .clip(RoundedCornerShape(2.dp))
                                    .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.35f))
                            )

                            Spacer(Modifier.height(12.dp))

                            // 100% Escrow Protection Guarantee Ribbon
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 14.dp, vertical = 2.dp),
                                shape = RoundedCornerShape(12.dp),
                                color = Color(0xFF059669).copy(alpha = 0.08f),
                                border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.25f)),
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Icon(
                                        imageVector = Icons.Filled.Shield,
                                        contentDescription = null,
                                        tint = Color(0xFF059669),
                                        modifier = Modifier.size(18.dp)
                                    )
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = "Verified Local Categories",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 12.sp,
                                            color = Color(0xFF059669),
                                        )
                                        Text(
                                            text = "Zero-Chat Verified Deals • Direct from verified sellers",
                                            fontSize = 10.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }

                            Spacer(Modifier.height(10.dp))

                            // Search bar
                            OutlinedTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                placeholder = { Text("Search subcategories...", fontSize = 13.sp) },
                                leadingIcon = { Icon(Icons.Outlined.Search, null, modifier = Modifier.size(20.dp)) },
                                trailingIcon = {
                                    if (searchQuery.isNotBlank()) {
                                        IconButton(onClick = { searchQuery = "" }) {
                                            Icon(Icons.Filled.Close, contentDescription = "Clear search", modifier = Modifier.size(18.dp))
                                        }
                                    }
                                },
                                singleLine = true,
                                shape = RoundedCornerShape(22.dp),
                                colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
                                    focusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
                                    unfocusedContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
                                ),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 14.dp)
                                    .height(48.dp),
                            )

                            if (groups.isNotEmpty()) {
                                Spacer(Modifier.height(10.dp))
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(horizontal = 14.dp),
                                ) {
                                    FilterChip(
                                        selected = selectedGroup == null,
                                        onClick = { selectedGroup = null },
                                        label = { Text("All", fontSize = 12.sp) },
                                        colors = FilterChipDefaults.filterChipColors(
                                            selectedContainerColor = MaterialTheme.colorScheme.primary,
                                            selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                        ),
                                    )
                                    groups.forEach { group ->
                                        FilterChip(
                                            selected = selectedGroup == group,
                                            onClick = { selectedGroup = if (selectedGroup == group) null else group },
                                            label = { Text(group.replaceFirstChar { it.titlecase() }, fontSize = 12.sp) },
                                            colors = FilterChipDefaults.filterChipColors(
                                                selectedContainerColor = MaterialTheme.colorScheme.primary,
                                                selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                            ),
                                        )
                                    }
                                }
                            }

                            Spacer(Modifier.height(8.dp))

                            // Sort mode & count row
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 14.dp, vertical = 4.dp),
                            ) {
                                Icon(Icons.Outlined.FilterList, null, modifier = Modifier.size(16.dp))
                                Text("Sort by", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold)
                                FilterChip(
                                    selected = sortMode == "popular",
                                    onClick = { sortMode = "popular" },
                                    label = { Text("Popular", fontSize = 11.sp) },
                                )
                                FilterChip(
                                    selected = sortMode == "az",
                                    onClick = { sortMode = "az" },
                                    label = { Text("A-Z", fontSize = 11.sp) },
                                )
                                Spacer(Modifier.weight(1f))
                                Text("${sorted.size} results", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }

                // Subcategory Photographic Tiles (with horizontal padding)
                items(sorted, key = { it.stableId }) { cat ->
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        tonalElevation = 2.dp,
                        shadowElevation = 3.dp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 8.dp)
                            .clickable { onOpenCategory(cat.stableId) },
                    ) {
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(12.dp),
                        ) {
                            AsyncImage(
                                model = cat.iconUrl,
                                contentDescription = cat.displayName,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .aspectRatio(1.2f)
                                    .clip(RoundedCornerShape(12.dp)),
                            )
                            Spacer(Modifier.height(8.dp))
                            Text(
                                cat.displayName,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                textAlign = TextAlign.Center,
                            )
                            Text(
                                "${cat.productCount} items",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            if (!cat.categoryGroup.isNullOrBlank()) {
                                Spacer(Modifier.height(4.dp))
                                Surface(
                                    shape = RoundedCornerShape(6.dp),
                                    color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f),
                                ) {
                                    Text(
                                        cat.categoryGroup?.replaceFirstChar { it.titlecase() } ?: "",
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // ── Layer 3: Pinned Floating Glassmorphic Top Capsule ──
            SubcategoriesFloatingTopBar(
                onBack = onBack,
                totalCount = sorted.size,
            )
        }
    }
}