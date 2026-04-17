package com.mhub.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.domain.model.Post
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val posts: List<Post> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repo: PostsRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(HomeUiState())
    val state: StateFlow<HomeUiState> = _state.asStateFlow()

    init { load(initial = true) }

    fun load(initial: Boolean = false) {
        _state.value = _state.value.copy(
            loading = initial || _state.value.posts.isEmpty(),
            refreshing = !initial,
            error = null,
        )
        viewModelScope.launch {
            when (val res = repo.feed(page = 1, limit = 20)) {
                is ApiResult.Success -> _state.value = HomeUiState(
                    loading = false,
                    refreshing = false,
                    posts = res.data,
                    error = null,
                )
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    loading = false,
                    refreshing = false,
                    error = res.error.message,
                )
            }
        }
    }
}
