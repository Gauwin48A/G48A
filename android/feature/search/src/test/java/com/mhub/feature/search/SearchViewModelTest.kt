package com.mhub.feature.search

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import com.mhub.core.network.api.PostsApi
import io.mockk.mockk
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SearchViewModelTest {

    private val testDispatcher = UnconfinedTestDispatcher()
    private lateinit var postsApi: PostsApi
    private lateinit var viewModel: SearchViewModel

    @Before
    fun setup() {
        Dispatchers.setMain(testDispatcher)
        postsApi = mockk(relaxed = true)
        viewModel = SearchViewModel(postsApi)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `updateQuery updates state`() = runTest {
        viewModel.updateQuery("phone")
        assertEquals("phone", viewModel.query.value)
    }

    @Test
    fun `submitSearch adds to recent searches`() = runTest {
        viewModel.updateQuery("laptop")
        viewModel.submitSearch()

        assertEquals(1, viewModel.recentSearches.value.size)
        assertEquals("laptop", viewModel.recentSearches.value.first())
    }

    @Test
    fun `submitSearch does not duplicate`() = runTest {
        viewModel.updateQuery("laptop")
        viewModel.submitSearch()
        viewModel.submitSearch()

        assertEquals(1, viewModel.recentSearches.value.size)
    }

    @Test
    fun `clearRecentSearches empties list`() = runTest {
        viewModel.updateQuery("test")
        viewModel.submitSearch()
        viewModel.clearRecentSearches()

        assertTrue(viewModel.recentSearches.value.isEmpty())
    }

    @Test
    fun `updateFilters updates state`() = runTest {
        val filters = SearchFilters(category = "Electronics", sort = "price_low")
        viewModel.updateFilters(filters)

        assertEquals("Electronics", viewModel.filters.value.category)
        assertEquals("price_low", viewModel.filters.value.sort)
    }

    @Test
    fun `clearFilters resets to default`() = runTest {
        viewModel.updateFilters(SearchFilters(category = "Test"))
        viewModel.clearFilters()

        assertNull(viewModel.filters.value.category)
    }

    @Test
    fun `selectRecentSearch sets query`() = runTest {
        viewModel.selectRecentSearch("test query")
        assertEquals("test query", viewModel.query.value)
    }

    @Test
    fun `recent searches limited to 10`() = runTest {
        repeat(15) { i ->
            viewModel.updateQuery("search_$i")
            viewModel.submitSearch()
        }

        assertEquals(10, viewModel.recentSearches.value.size)
    }
}
