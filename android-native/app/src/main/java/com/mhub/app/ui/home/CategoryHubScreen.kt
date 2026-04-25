package com.mhub.app.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Category
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.CategoriesRepository
import com.mhub.app.domain.model.Category
import com.mhub.app.ui.components.AppEmptyState
import com.mhub.app.ui.components.AppErrorState
import com.mhub.app.ui.components.PrimaryButton
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CategoryHubState(
    val loading: Boolean = true,
    val categories: List<Category> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class CategoryHubViewModel @Inject constructor(
    private val categoriesRepository: CategoriesRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(CategoryHubState())
    val state: StateFlow<CategoryHubState> = _state.asStateFlow()

    init {
        load()
    }

    fun load() {
        _state.value = CategoryHubState(loading = true)
        viewModelScope.launch {
            when (val result = categoriesRepository.all()) {
                is ApiResult.Success -> _state.value = CategoryHubState(
                    loading = false,
                    categories = result.data,
                )

                is ApiResult.Failure -> _state.value = CategoryHubState(
                    loading = false,
                    error = result.error.message,
                )
            }
        }
    }
}

private val hubGradients = listOf(
    listOf(Color(0xFF2F80ED), Color(0xFF7F53F9)),
    listOf(Color(0xFFEC4899), Color(0xFFF97316)),
    listOf(Color(0xFF14B8A6), Color(0xFF0EA5E9)),
    listOf(Color(0xFF8B5CF6), Color(0xFF4F46E5)),
)

private fun categoryDescription(name: String): String {
    val normalized = name.lowercase()
    return when {
        "elect" in normalized -> "Phones, laptops, gadgets"
        "fashion" in normalized -> "Clothing, shoes, accessories"
        "vehicle" in normalized -> "Cars, bikes, spare parts"
        "job" in normalized -> "Jobs, projects, local services"
        "home" in normalized -> "Home decor, furniture, appliances"
        else -> "Top picks curated for your area"
    }
}

private fun categoryEmoji(name: String): String {
    val normalized = name.lowercase()
    return when {
        "elect" in normalized -> "📱"
        "fashion" in normalized -> "🛍️"
        "vehicle" in normalized -> "🚗"
        "job" in normalized -> "💼"
        "home" in normalized -> "🏠"
        else -> "✨"
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoryHubScreen(
    onOpenCategory: (Category) -> Unit,
    onOpenAllPosts: () -> Unit,
    onOpenSearch: () -> Unit,
    viewModel: CategoryHubViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Choose Your World", fontWeight = FontWeight.Bold)
                        Text(
                            "Android-optimized gateway for web category hub",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onOpenSearch) {
                        Icon(Icons.Outlined.Search, contentDescription = "Search")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        when {
            state.loading -> Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator()
            }

            state.error != null -> Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                AppErrorState(
                    title = "Category hub unavailable",
                    message = state.error ?: "Unable to load categories",
                    onRetry = { viewModel.load() },
                    retryLabel = "Retry",
                )
            }

            state.categories.isEmpty() -> Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                AppEmptyState(
                    icon = Icons.Outlined.Category,
                    title = "No categories available",
                    subtitle = "New categories will appear here.",
                )
            }

            else -> LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(state.categories, key = { it.stableId }) { category ->
                    val gradient = hubGradients[kotlin.math.abs(category.stableId.hashCode()) % hubGradients.size]
                    Surface(
                        onClick = { onOpenCategory(category) },
                        shape = RoundedCornerShape(20.dp),
                        tonalElevation = 1.dp,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Brush.linearGradient(gradient))
                                .padding(horizontal = 18.dp, vertical = 16.dp),
                        ) {
                            Column(
                                verticalArrangement = Arrangement.spacedBy(4.dp),
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    Text(categoryEmoji(category.displayName), style = MaterialTheme.typography.titleMedium)
                                    Text(
                                        category.displayName,
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White,
                                    )
                                }
                                Text(
                                    categoryDescription(category.displayName),
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = Color.White.copy(alpha = 0.92f),
                                )
                                Text(
                                    "Open listings",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = Color.White.copy(alpha = 0.86f),
                                )
                            }
                        }
                    }
                }
                item {
                    PrimaryButton(
                        text = "Browse all posts",
                        onClick = onOpenAllPosts,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                item {
                    Box(Modifier.size(56.dp))
                }
            }
        }
    }
}
