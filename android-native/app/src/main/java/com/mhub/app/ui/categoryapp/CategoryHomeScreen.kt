package com.mhub.app.ui.categoryapp

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mhub.app.data.mock.MockDataProvider
import com.mhub.app.ui.common.PageEmptyState
import com.mhub.app.ui.common.PageLoadingState
import com.mhub.app.ui.components.BannerShimmer
import com.mhub.app.ui.components.CountdownTimer
import com.mhub.app.ui.components.EnhancedProductCard
import com.mhub.app.ui.components.HeroBannerCarousel
import com.mhub.app.ui.components.SectionHeader
import com.mhub.app.ui.components.SubcategoryChipRow
import com.mhub.app.ui.components.SubcategoryChipShimmer
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * Per-category home screen shown when user enters a category mini-app.
 * Contains: hero banners, subcategory chips, featured products, deals,
 * trending carousel, new arrivals, brand spotlight.
 */
@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun CategoryHomeScreen(
    categoryKey: String,
    onOpenProduct: (String) -> Unit,
    onOpenSubcategory: (String) -> Unit,
    onOpenAllCategories: () -> Unit,
    onOpenListing: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var isRefreshing by remember { mutableStateOf(false) }
    var isLoading by rememberSaveable { mutableStateOf(false) }

    val banners     = remember(categoryKey) { MockDataProvider.bannersFor(categoryKey) }
    val subcats     = remember(categoryKey) { MockDataProvider.subcategoriesFor(categoryKey) }
    val allProducts = remember(categoryKey) { MockDataProvider.productsForCategory(categoryKey) }
    val deals       = remember(categoryKey) { MockDataProvider.dealsFor(categoryKey) }
    val trending    = remember(categoryKey) { MockDataProvider.trendingFor(categoryKey) }
    val newArrivals = remember(categoryKey) { MockDataProvider.newArrivalsFor(categoryKey) }
    val featured    = remember(categoryKey) { allProducts.take(6) }

    // Wishlist state (in real app this flows from ViewModel)
    val wishlistedIds = remember { mutableStateOf(setOf<String>()) }

    val onRefresh: () -> Unit = {
        scope.launch {
            isRefreshing = true
            delay(800L) // simulate network refresh
            isRefreshing = false
        }
    }

    LaunchedEffect(categoryKey) {
        isLoading = true
        delay(300)
        isLoading = false
    }

    if (isLoading) {
        PageLoadingState(title = "Loading $categoryKey")
        return
    }

    if (banners.isEmpty() && subcats.isEmpty() && allProducts.isEmpty()) {
        PageEmptyState(
            title = "No products yet",
            message = "This category is currently empty. Pull to refresh or open another category.",
            ctaLabel = "Retry",
            onCta = onRefresh,
        )
        return
    }

    PullToRefreshBox(
        isRefreshing = isRefreshing,
        onRefresh = onRefresh,
        modifier = Modifier.fillMaxSize(),
    ) {
        LazyColumn(
            contentPadding = PaddingValues(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(0.dp),
        ) {
            // ── Hero Banner Carousel ────────────────────────────────────────
            item(key = "banners") {
                Spacer(Modifier.height(12.dp))
                HeroBannerCarousel(
                    banners = banners,
                    modifier = Modifier.padding(horizontal = 16.dp),
                )
                Spacer(Modifier.height(20.dp))
            }

            // ── Subcategory Chips ───────────────────────────────────────────
            item(key = "subcat_header") {
                SectionHeader(title = "Shop by Category", onSeeAll = onOpenAllCategories)
                Spacer(Modifier.height(8.dp))
            }
            item(key = "subcat_chips") {
                SubcategoryChipRow(
                    subcategories = subcats,
                    onSelect = { sub -> onOpenSubcategory(sub.id) },
                )
                Spacer(Modifier.height(20.dp))
            }

            // ── Deals of the Day ────────────────────────────────────────────
            if (deals.isNotEmpty()) {
                item(key = "deals_header") {
                    Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                        Text(
                            "Deals of the Day",
                            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                        )
                        Spacer(Modifier.height(4.dp))
                        CountdownTimer(targetHours = 8)
                        Spacer(Modifier.height(8.dp))
                    }
                }
                item(key = "deals_row") {
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(deals, key = { it.id }) { product ->
                            EnhancedProductCard(
                                product = product,
                                isWishlisted = wishlistedIds.value.contains(product.id),
                                onTap = { onOpenProduct(product.id) },
                                onAddToCart = { /* TODO: ViewModel call */ },
                                onToggleWishlist = {
                                    wishlistedIds.value = if (wishlistedIds.value.contains(product.id))
                                        wishlistedIds.value - product.id
                                    else wishlistedIds.value + product.id
                                },
                                modifier = Modifier.fillParentMaxWidth(0.44f),
                            )
                        }
                    }
                    Spacer(Modifier.height(20.dp))
                }
            }

            // ── Featured Products ───────────────────────────────────────────
            item(key = "featured_header") {
                SectionHeader(title = "Featured Products", onSeeAll = onOpenListing)
                Spacer(Modifier.height(8.dp))
            }
            item(key = "featured_grid") {
                ProductGrid2Col(
                    products = featured,
                    wishlistedIds = wishlistedIds.value,
                    onOpenProduct = onOpenProduct,
                    onToggleWishlist = { id ->
                        wishlistedIds.value = if (wishlistedIds.value.contains(id))
                            wishlistedIds.value - id
                        else wishlistedIds.value + id
                    },
                )
                Spacer(Modifier.height(20.dp))
            }

            // ── Trending Products ───────────────────────────────────────────
            if (trending.isNotEmpty()) {
                item(key = "trending_header") {
                    SectionHeader(title = "🔥 Trending Now", onSeeAll = onOpenListing)
                    Spacer(Modifier.height(8.dp))
                }
                item(key = "trending_row") {
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(trending, key = { it.id }) { product ->
                            EnhancedProductCard(
                                product = product,
                                isWishlisted = wishlistedIds.value.contains(product.id),
                                onTap = { onOpenProduct(product.id) },
                                onAddToCart = { },
                                onToggleWishlist = {
                                    wishlistedIds.value = if (wishlistedIds.value.contains(product.id))
                                        wishlistedIds.value - product.id
                                    else wishlistedIds.value + product.id
                                },
                                modifier = Modifier.fillParentMaxWidth(0.44f),
                            )
                        }
                    }
                    Spacer(Modifier.height(20.dp))
                }
            }

            // ── New Arrivals ─────────────────────────────────────────────────
            if (newArrivals.isNotEmpty()) {
                item(key = "newarrival_header") {
                    SectionHeader(title = "✨ New Arrivals", onSeeAll = onOpenListing)
                    Spacer(Modifier.height(8.dp))
                }
                item(key = "newarrival_row") {
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(newArrivals, key = { it.id }) { product ->
                            EnhancedProductCard(
                                product = product,
                                isWishlisted = wishlistedIds.value.contains(product.id),
                                onTap = { onOpenProduct(product.id) },
                                onAddToCart = { },
                                onToggleWishlist = {
                                    wishlistedIds.value = if (wishlistedIds.value.contains(product.id))
                                        wishlistedIds.value - product.id
                                    else wishlistedIds.value + product.id
                                },
                                modifier = Modifier.fillParentMaxWidth(0.44f),
                            )
                        }
                    }
                    Spacer(Modifier.height(24.dp))
                }
            }
        }
    }
}

/**
 * Non-lazy 2-column product grid used inside a LazyColumn item.
 * Uses layout stagger so it renders correctly inside parent LazyColumn.
 */
@Composable
private fun ProductGrid2Col(
    products: List<MockDataProvider.MockProduct>,
    wishlistedIds: Set<String>,
    onOpenProduct: (String) -> Unit,
    onToggleWishlist: (String) -> Unit,
) {
    Column(
        modifier = Modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        products.chunked(2).forEach { rowProducts ->
            androidx.compose.foundation.layout.Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                rowProducts.forEach { product ->
                    EnhancedProductCard(
                        product = product,
                        isWishlisted = wishlistedIds.contains(product.id),
                        onTap = { onOpenProduct(product.id) },
                        onAddToCart = { },
                        onToggleWishlist = { onToggleWishlist(product.id) },
                        modifier = Modifier.weight(1f),
                    )
                }
                // Fill empty cell if odd number
                if (rowProducts.size == 1) {
                    Spacer(Modifier.weight(1f))
                }
            }
        }
    }
}
