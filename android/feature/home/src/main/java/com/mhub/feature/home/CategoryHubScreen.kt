package com.mhub.feature.home

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.core.common.model.Category
import com.mhub.core.common.result.Result
import com.mhub.core.data.repository.CategoryRepository
import com.mhub.core.ui.components.MhubErrorState
import com.mhub.core.ui.components.MhubLoadingIndicator
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@Composable
fun CategoryHubScreen(
    onCategoryClick: (String) -> Unit,
    onBack: () -> Unit,
    viewModel: CategoryHubViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Categories") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
            )
        },
    ) { padding ->
        when {
            uiState.isLoading -> MhubLoadingIndicator(modifier = Modifier.padding(padding))
            uiState.error != null -> MhubErrorState(message = uiState.error!!, onRetry = viewModel::refresh, modifier = Modifier.padding(padding))
            else -> {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(3),
                    modifier = Modifier.padding(padding),
                    contentPadding = PaddingValues(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(uiState.categories) { category ->
                        Card(
                            modifier = Modifier.fillMaxWidth().clickable { onCategoryClick(category.name) },
                        ) {
                            Column(
                                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                Text(
                                    text = getCategoryEmoji(category.name),
                                    style = MaterialTheme.typography.headlineMedium,
                                )
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    text = category.name,
                                    style = MaterialTheme.typography.bodySmall,
                                    textAlign = TextAlign.Center,
                                    maxLines = 2,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun getCategoryEmoji(name: String): String = when (name.lowercase()) {
    "electronics" -> "📱"
    "vehicles" -> "🚗"
    "fashion" -> "👗"
    "furniture" -> "🪑"
    "books" -> "📚"
    "sports" -> "⚽"
    "toys" -> "🧸"
    "services" -> "🔧"
    "property" -> "🏠"
    "jobs" -> "💼"
    else -> "📦"
}

data class CategoryHubUiState(
    val categories: List<Category> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class CategoryHubViewModel @Inject constructor(
    private val categoryRepository: CategoryRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(CategoryHubUiState())
    val uiState = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            categoryRepository.observeCategories().collect { categories ->
                if (categories.isNotEmpty()) {
                    _uiState.update { it.copy(categories = categories, isLoading = false) }
                }
            }
        }
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = _uiState.value.categories.isEmpty(), error = null) }
            when (val result = categoryRepository.fetchCategories()) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }
}
