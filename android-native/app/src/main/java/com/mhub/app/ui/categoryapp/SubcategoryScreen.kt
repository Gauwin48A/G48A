package com.mhub.app.ui.categoryapp

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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.CategoriesRepository
import com.mhub.app.domain.model.Category
import com.mhub.app.ui.common.PageEmptyState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SubcategoryListViewModel @Inject constructor(
    private val repo: CategoriesRepository,
) : ViewModel() {
    data class State(
        val subcats: List<Category> = emptyList(),
        val loading: Boolean = false,
        val error: String? = null,
    )

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state.asStateFlow()

    private var lastKey = ""

    fun loadFor(categoryKey: String) {
        if (categoryKey == lastKey && _state.value.subcats.isNotEmpty()) return
        lastKey = categoryKey
        viewModelScope.launch {
            _state.value = State(loading = true)
            when (val r = repo.subcategories(categoryKey)) {
                is ApiResult.Success -> _state.value = State(subcats = r.data)
                is ApiResult.Failure -> _state.value = State(error = r.error.message)
            }
        }
    }
}

/**
 * Subcategory grid screen shown when user taps "Categories" tab or
 * "See All" on the category home.
 */
@Composable
fun SubcategoryScreen(
    categoryKey: String,
    subcategoryId: String?,
    onOpenProduct: (String) -> Unit,
    onOpenSubcategory: (String) -> Unit,
    viewModel: SubcategoryListViewModel = hiltViewModel(),
) {
    val vmState by viewModel.state.collectAsState()

    LaunchedEffect(categoryKey) { viewModel.loadFor(categoryKey) }

    val categoryLabel = remember(categoryKey) {
        categoryKey.replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }
    }

    when {
        vmState.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }

        vmState.error != null -> PageEmptyState(
            title = "Could not load subcategories",
            message = vmState.error ?: "Please try again.",
            ctaLabel = "Retry",
            onCta = { viewModel.loadFor(categoryKey) },
        )

        vmState.subcats.isEmpty() -> PageEmptyState(
            title = "No subcategories found",
            message = "We could not find subcategories for this category right now.",
            ctaLabel = "Back",
            onCta = { },
        )

        else -> {
            val subcats = vmState.subcats
            val totalItems = subcats.sumOf { it.productCount }

            Column(modifier = Modifier.fillMaxSize()) {
                Surface(
                    shape = RoundedCornerShape(bottomStart = 20.dp, bottomEnd = 20.dp),
                    tonalElevation = 2.dp,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Home", style = MaterialTheme.typography.labelMedium)
                            androidx.compose.material3.Icon(
                                Icons.AutoMirrored.Filled.ArrowForward,
                                contentDescription = null,
                                modifier = Modifier.padding(horizontal = 4.dp).height(14.dp),
                            )
                            Text(categoryLabel, style = MaterialTheme.typography.labelMedium)
                            androidx.compose.material3.Icon(
                                Icons.AutoMirrored.Filled.ArrowForward,
                                contentDescription = null,
                                modifier = Modifier.padding(horizontal = 4.dp).height(14.dp),
                            )
                            Text("Subcategories", style = MaterialTheme.typography.labelMedium)
                        }
                        Spacer(Modifier.height(8.dp))
                        Text(
                            text = "$categoryLabel Collections",
                            style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                        )
                        Text(
                            text = "${subcats.size} subcategories • $totalItems items",
                            style = MaterialTheme.typography.bodyMedium.copy(
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            ),
                        )
                    }
                }

                LazyVerticalGrid(
                    columns = GridCells.Fixed(3),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    items(subcats, key = { it.stableId }) { subcat ->
                        SubcategoryCard(
                            subcategory = subcat,
                            onClick = { onOpenSubcategory(subcat.stableId) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun SubcategoryCard(
    subcategory: Category,
    onClick: () -> Unit,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clickable(
                onClickLabel = "Browse ${subcategory.displayName}, ${subcategory.productCount} products",
            ) { onClick() }
            .semantics {
                contentDescription = "${subcategory.displayName}, ${subcategory.productCount} products"
            },
    ) {
        Surface(
            shape = RoundedCornerShape(12.dp),
            tonalElevation = 2.dp,
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f),
        ) {
            Box {
                AsyncImage(
                    model = subcategory.iconUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            }
        }
        Spacer(Modifier.height(6.dp))
        Text(
            text = subcategory.displayName,
            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
        )
        Text(
            text = "${subcategory.productCount} items",
            style = MaterialTheme.typography.labelSmall.copy(
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            ),
        )
    }
}