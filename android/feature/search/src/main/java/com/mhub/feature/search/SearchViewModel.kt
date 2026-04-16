package com.mhub.feature.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import androidx.paging.cachedIn
import com.mhub.core.common.model.Post
import com.mhub.core.network.api.PostsApi
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.flow.*
import javax.inject.Inject

data class SearchFilters(
    val category: String? = null,
    val sort: String? = null,
    val minPrice: Double? = null,
    val maxPrice: Double? = null,
    val condition: String? = null,
)

@OptIn(FlowPreview::class, ExperimentalCoroutinesApi::class)
@HiltViewModel
class SearchViewModel @Inject constructor(
    private val postsApi: PostsApi,
) : ViewModel() {

    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    private val _filters = MutableStateFlow(SearchFilters())
    val filters: StateFlow<SearchFilters> = _filters.asStateFlow()

    private val _recentSearches = MutableStateFlow<List<String>>(emptyList())
    val recentSearches: StateFlow<List<String>> = _recentSearches.asStateFlow()

    val searchResults: Flow<PagingData<Post>> = combine(_query, _filters) { q, f -> Pair(q, f) }
        .debounce(350)
        .distinctUntilChanged()
        .flatMapLatest { (q, f) ->
            Pager(
                config = PagingConfig(pageSize = 20, prefetchDistance = 5, enablePlaceholders = false),
                pagingSourceFactory = {
                    SearchPagingSource(
                        postsApi = postsApi,
                        query = q,
                        category = f.category,
                        sort = f.sort,
                        minPrice = f.minPrice,
                        maxPrice = f.maxPrice,
                        condition = f.condition,
                    )
                }
            ).flow
        }
        .cachedIn(viewModelScope)

    fun updateQuery(newQuery: String) {
        _query.value = newQuery
    }

    fun submitSearch() {
        val q = _query.value.trim()
        if (q.isNotEmpty() && !_recentSearches.value.contains(q)) {
            _recentSearches.update { (listOf(q) + it).take(10) }
        }
    }

    fun updateFilters(newFilters: SearchFilters) {
        _filters.value = newFilters
    }

    fun clearFilters() {
        _filters.value = SearchFilters()
    }

    fun selectRecentSearch(search: String) {
        _query.value = search
    }

    fun clearRecentSearches() {
        _recentSearches.value = emptyList()
    }
}
