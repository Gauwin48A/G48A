package com.mhub.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.CategoriesRepository
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.domain.model.Category
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
    val loadingMore: Boolean = false,
    val posts: List<Post> = emptyList(),
    val categories: List<Category> = emptyList(),
    val subcategories: List<Category> = emptyList(),
    val selectedSubcategory: String? = null,
    val error: String? = null,
    val currentPage: Int = 1,
    val hasMore: Boolean = true,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repo: PostsRepository,
    private val categoriesRepo: CategoriesRepository,
    private val boostRepo: com.mhub.app.data.repository.BoostRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(HomeUiState())
    val state: StateFlow<HomeUiState> = _state.asStateFlow()

    private var _categoryKey: String? = null

    init { load(initial = true) }

    /** Set the active category group key. Reloads if changed. */
    fun setCategoryKey(key: String?) {
        if (key != _categoryKey) {
            _categoryKey = key
            _state.value = _state.value.copy(selectedSubcategory = null, subcategories = emptyList())
            load(initial = true)
        }
    }

    /** Select a subcategory within the active category. */
    fun selectSubcategory(id: String?) {
        _state.value = _state.value.copy(
            selectedSubcategory = id,
            currentPage = 1,
            posts = emptyList(),
            loading = true,
        )
        viewModelScope.launch {
            val categoryId = id ?: _categoryKey
            when (val res = repo.feed(page = 1, limit = PAGE_SIZE, categoryId = categoryId)) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    loading = false,
                    posts = res.data,
                    currentPage = 1,
                    hasMore = res.data.size >= PAGE_SIZE,
                    error = null,
                )
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    loading = false,
                    error = res.error.message,
                )
            }
        }
    }

    fun load(initial: Boolean = false) {
        _state.value = _state.value.copy(
            loading = initial || _state.value.posts.isEmpty(),
            refreshing = !initial,
            error = null,
            currentPage = 1,
            hasMore = true,
        )
        val categoryId = _state.value.selectedSubcategory ?: _categoryKey
        viewModelScope.launch {
            when (val res = repo.feed(page = 1, limit = PAGE_SIZE, categoryId = categoryId)) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    loading = false,
                    refreshing = false,
                    posts = res.data,
                    currentPage = 1,
                    hasMore = res.data.size >= PAGE_SIZE,
                    error = null,
                )
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    loading = false,
                    refreshing = false,
                    error = res.error.message,
                )
            }
        }
        viewModelScope.launch {
            when (val res = categoriesRepo.all()) {
                is ApiResult.Success -> {
                    val allCats = res.data
                    val subs = if (_categoryKey != null) {
                        allCats.filter { cat ->
                            val group = (cat.categoryGroup ?: "others").lowercase()
                            group == _categoryKey || (_categoryKey == "others" && group !in listOf("electronics", "fashion", "vehicles"))
                        }
                    } else emptyList()
                    _state.value = _state.value.copy(categories = allCats, subcategories = subs)
                }
                is ApiResult.Failure -> Unit
            }
        }
    }

    fun loadMore() {
        val current = _state.value
        if (current.loadingMore || !current.hasMore) return

        val nextPage = current.currentPage + 1
        _state.value = current.copy(loadingMore = true)

        val categoryId = current.selectedSubcategory ?: _categoryKey
        viewModelScope.launch {
            when (val res = repo.feed(page = nextPage, limit = PAGE_SIZE, categoryId = categoryId)) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(
                        loadingMore = false,
                        posts = _state.value.posts + res.data,
                        currentPage = nextPage,
                        hasMore = res.data.size >= PAGE_SIZE,
                    )
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(loadingMore = false)
            }
        }
    }

    fun boostPost(postId: String, tier: String, duration: Int) {
        viewModelScope.launch {
            boostRepo.boost(postId, tier.lowercase(), duration * 24)
        }
    }

    private companion object {
        const val PAGE_SIZE = 20
    }
}

