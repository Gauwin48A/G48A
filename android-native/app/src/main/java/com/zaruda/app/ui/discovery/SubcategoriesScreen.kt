package com.zaruda.app.ui.discovery

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
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

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Subcategories", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
    ) { padding ->
        when {
            vmState.loading -> Box(
                Modifier.padding(padding).fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) { CircularProgressIndicator() }

            vmState.error != null -> Box(
                Modifier.padding(padding).fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Could not load categories")
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = { viewModel.load() }) { Text("Retry") }
                }
            }

            else -> LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(16.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item(span = { GridItemSpan(2) }) {
                    OutlinedTextField(
                        value = searchQuery,
                        onValueChange = { searchQuery = it },
                        placeholder = { Text("Search categories") },
                        leadingIcon = { Icon(Icons.Outlined.Search, null, modifier = Modifier.size(20.dp)) },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                    )
                }

                if (groups.isNotEmpty()) {
                    item(span = { GridItemSpan(2) }) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            FilterChip(
                                selected = selectedGroup == null,
                                onClick = { selectedGroup = null },
                                label = { Text("All") },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = MaterialTheme.colorScheme.primary,
                                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                ),
                            )
                            groups.forEach { group ->
                                FilterChip(
                                    selected = selectedGroup == group,
                                    onClick = { selectedGroup = if (selectedGroup == group) null else group },
                                    label = { Text(group.replaceFirstChar { it.titlecase() }) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = MaterialTheme.colorScheme.primary,
                                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                                    ),
                                )
                            }
                        }
                    }
                }

                item(span = { GridItemSpan(2) }) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Icon(Icons.Outlined.FilterList, null, modifier = Modifier.size(16.dp))
                        Text("Sort by", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold)
                        FilterChip(
                            selected = sortMode == "popular",
                            onClick = { sortMode = "popular" },
                            label = { Text("Popular") },
                        )
                        FilterChip(
                            selected = sortMode == "az",
                            onClick = { sortMode = "az" },
                            label = { Text("A-Z") },
                        )
                        Spacer(Modifier.weight(1f))
                        Text("${sorted.size} results", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }

                items(sorted, key = { it.stableId }) { cat ->
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        tonalElevation = 1.dp,
                        modifier = Modifier
                            .fillMaxWidth()
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
                                Text(
                                    cat.categoryGroup?.replaceFirstChar { it.titlecase() } ?: "",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.primary,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}