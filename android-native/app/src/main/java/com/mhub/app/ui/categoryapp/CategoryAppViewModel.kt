package com.mhub.app.ui.categoryapp

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.mock.MockDataProvider
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.domain.model.Post
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CategoryProductsState(
    val isLoading: Boolean = true,
    val products: List<MockDataProvider.MockProduct> = emptyList(),
    val error: String? = null,
    val compareItems: List<MockDataProvider.MockProduct> = emptyList(),
)

@HiltViewModel
class CategoryAppViewModel @Inject constructor(
    private val postsRepository: PostsRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(CategoryProductsState())
    val state: StateFlow<CategoryProductsState> = _state.asStateFlow()

    /** Load posts for the given category key, falling back to mock data on API failure. */
    fun load(categoryKey: String) {
        viewModelScope.launch {
            _state.value = CategoryProductsState(isLoading = true)
            when (val result = postsRepository.feed(page = 1, limit = 50, categoryId = categoryKey, sort = "newest")) {
                is ApiResult.Success -> {
                    val apiProducts = result.data.map { it.toMockProduct() }
                    _state.value = CategoryProductsState(
                        isLoading = false,
                        products = apiProducts.ifEmpty { MockDataProvider.productsForCategory(categoryKey) },
                    )
                }
                is ApiResult.Failure -> {
                    // Graceful degradation: serve cached mock products so the UI is never blank
                    _state.value = CategoryProductsState(
                        isLoading = false,
                        products = MockDataProvider.productsForCategory(categoryKey),
                    )
                }
            }
        }
    }
    /** Toggle a product in the compare list (max 4 items). */
    fun toggleCompare(product: MockDataProvider.MockProduct) {
        val current = _state.value.compareItems
        _state.value = _state.value.copy(
            compareItems = if (current.any { it.id == product.id })
                current.filter { it.id != product.id }
            else if (current.size < 4)
                current + product
            else
                current // already at max
        )
    }

    fun clearCompare() {
        _state.value = _state.value.copy(compareItems = emptyList())
    }
}

/** Bridges the API [Post] model to the rich [MockDataProvider.MockProduct] used by the category UI. */
internal fun Post.toMockProduct() = MockDataProvider.MockProduct(
    id = stableId,
    title = displayTitle,
    description = description ?: "",
    price = price ?: 0.0,
    originalPrice = price ?: 0.0,
    imageUrl = primaryImage ?: "",
    images = images.ifEmpty { listOfNotNull(primaryImage) },
    category = category ?: "others",
    subcategory = subcategory ?: "",
    brand = brand ?: "",
    rating = 4.0f,
    reviewCount = (likeCount ?: 0) + (viewCount ?: 0),
    colors = listOfNotNull(color).filter { it.isNotBlank() },
    sizes = listOfNotNull(size, ramStorage).filter { it.isNotBlank() },
    inStock = status == "active",
    condition = condition ?: "Used",
    specs = buildMap {
        model?.let { put("Model", it) }
        year?.let { put("Year", it.toString()) }
        ramStorage?.let { put("Storage", it) }
        mileage?.let { put("Mileage", "$it km") }
        location?.let { put("Location", it) }
    },
    deliveryDays = 3,
    freeShipping = false,
    isTrending = (viewCount ?: 0) > 10,
    isNewArrival = false,
    isDeal = false,
)
