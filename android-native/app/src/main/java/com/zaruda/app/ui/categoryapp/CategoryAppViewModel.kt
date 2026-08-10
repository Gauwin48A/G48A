package com.zaruda.app.ui.categoryapp

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.local.db.CartItemDao
import com.zaruda.app.data.local.db.CartItemEntity
import com.zaruda.app.data.local.db.WishlistItemDao
import com.zaruda.app.data.local.db.WishlistItemEntity
import com.zaruda.app.data.mock.MockDataProvider
import com.zaruda.app.data.repository.CartRepository
import com.zaruda.app.data.repository.PostsRepository
import com.zaruda.app.data.repository.WishlistRepository
import com.zaruda.app.domain.model.Post
import com.zaruda.app.ui.explore.SharedExploreStore
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
    private val cartItemDao: CartItemDao,
    private val wishlistItemDao: WishlistItemDao,
    private val cartRepo: CartRepository,
    private val wishlistRepo: WishlistRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(CategoryProductsState())
    val state: StateFlow<CategoryProductsState> = _state.asStateFlow()

    /** IDs currently in the local wishlist — powers the heart icon on product cards. */
    private val _wishlistedIds = MutableStateFlow<Set<String>>(emptySet())
    val wishlistedIds: StateFlow<Set<String>> = _wishlistedIds.asStateFlow()

    init {
        viewModelScope.launch {
            val local = wishlistItemDao.getAll()
            _wishlistedIds.value = local.mapNotNull { it.postId.ifBlank { it.id } }.toSet()
        }
    }

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
        if (current.any { it.id == product.id }) {
            // Remove existing
            _state.value = _state.value.copy(
                compareItems = current.filter { it.id != product.id }
            )
        } else if (current.size < 4) {
            // Subcategory match check: only allow comparing same type of products
            if (current.isNotEmpty() && product.subcategory.isNotBlank()) {
                val firstSub = current.first().subcategory
                if (firstSub.isNotBlank() && !firstSub.equals(product.subcategory, ignoreCase = true)) {
                    return // silently reject — same-type comparison only
                }
            }
            _state.value = _state.value.copy(
                compareItems = current + product
            )
        }
        // else already at max — no action needed
    }

    fun clearCompare() {
        _state.value = _state.value.copy(compareItems = emptyList())
    }

    // ── Cart ───────────────────────────────────────────────────────────────────

    /** Add a product to the cart: local Room (badge + offline), shared store (screen), server (best-effort). */
    fun addToCart(product: MockDataProvider.MockProduct) {
        val post = product.toPost()
        SharedExploreStore.addCart(post)
        viewModelScope.launch {
            runCatching {
                cartItemDao.insert(product.toCartEntity())
            }
            cartRepo.add(post.stableId)
        }
    }

    // ── Wishlist ───────────────────────────────────────────────────────────────

    /** Toggle wishlist state for a product: Room (badge + offline), shared store (screen), server (best-effort). */
    fun toggleWishlist(product: MockDataProvider.MockProduct) {
        val id = product.id
        val isWished = _wishlistedIds.value.contains(id)
        if (isWished) {
            _wishlistedIds.value = _wishlistedIds.value - id
            SharedExploreStore.removeWishlist(id)
            viewModelScope.launch {
                runCatching { wishlistItemDao.deleteByPostId(id) }
                wishlistRepo.remove(id)
            }
        } else {
            _wishlistedIds.value = _wishlistedIds.value + id
            val post = product.toPost()
            SharedExploreStore.addWishlist(post)
            viewModelScope.launch {
                runCatching { wishlistItemDao.insert(product.toWishlistEntity()) }
                wishlistRepo.add(id)
            }
        }
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

/** Bridge the rich mock product back to the API [Post] model for cart/wishlist screens. */
internal fun MockDataProvider.MockProduct.toPost(): Post = Post(
    id = id,
    postId = id,
    title = title,
    description = description,
    price = price,
    originalPrice = originalPrice,
    imageUrl = imageUrl,
    images = images,
    category = category,
    subcategory = subcategory,
    brand = brand,
    condition = condition,
)

/** Persist a mock product as a Room cart entity (drives the cart badge + offline list). */
internal fun MockDataProvider.MockProduct.toCartEntity(): CartItemEntity = CartItemEntity(
    id = id,
    postId = id,
    title = title,
    price = price,
    originalPrice = originalPrice,
    imageUrl = imageUrl,
    category = category,
    brand = brand,
    selectedColor = colors.firstOrNull().orEmpty(),
    selectedSize = sizes.firstOrNull().orEmpty(),
    quantity = 1,
    inStock = inStock,
)

/** Persist a mock product as a Room wishlist entity (drives the wishlist badge + offline list). */
internal fun MockDataProvider.MockProduct.toWishlistEntity(): WishlistItemEntity = WishlistItemEntity(
    id = id,
    postId = id,
    title = title,
    price = price,
    originalPrice = originalPrice,
    imageUrl = imageUrl,
    category = category,
    brand = brand,
    rating = rating,
    reviewCount = reviewCount,
)
