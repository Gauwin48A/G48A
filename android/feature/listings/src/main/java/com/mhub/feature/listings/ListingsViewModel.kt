package com.mhub.feature.listings

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.core.common.model.Post
import com.mhub.core.common.result.Result
import com.mhub.core.data.repository.PostRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ListingsUiState(
    val posts: List<Post> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val searchQuery: String = "",
    val category: String = "",
)

@HiltViewModel
class ListingsViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val postRepository: PostRepository,
) : ViewModel() {

    private val category: String = savedStateHandle.get<String>("category") ?: ""
    private val _uiState = MutableStateFlow(ListingsUiState(category = category))
    val uiState = _uiState.asStateFlow()

    private var searchJob: Job? = null

    init {
        viewModelScope.launch {
            postRepository.observePosts().collect { posts ->
                val filtered = if (category.isNotBlank()) {
                    posts.filter { it.categoryName.equals(category, ignoreCase = true) }
                } else posts
                _uiState.update { it.copy(posts = filtered) }
            }
        }
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            val cat = category.ifBlank { null }
            val search = _uiState.value.searchQuery.ifBlank { null }
            when (val result = postRepository.fetchPosts(category = cat, search = search)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, error = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun updateSearch(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(300)
            search()
        }
    }

    fun search() {
        refresh()
    }
}
