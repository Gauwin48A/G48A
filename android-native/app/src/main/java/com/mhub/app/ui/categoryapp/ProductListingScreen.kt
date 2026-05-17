package com.mhub.app.ui.categoryapp

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Sort
import androidx.compose.material3.AssistChip
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RangeSlider
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.mhub.app.data.mock.MockDataProvider
import com.mhub.app.ui.common.PageEmptyState
import com.mhub.app.ui.components.EnhancedProductCard
import com.mhub.app.ui.components.PostGridShimmer
import com.mhub.app.ui.components.RatingStars
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private enum class SortOption(val label: String) {
    RELEVANCE("Relevance"),
    PRICE_LOW("Price: Low to High"),
    PRICE_HIGH("Price: High to Low"),
    RATING("Top Rated"),
    NEWEST("Newest First"),
    POPULARITY("Popularity"),
}

/**
 * Product listing page with filters, sort, grid/list toggle, active filter chips.
 *
 * Accessibility:
 * - Filter drawer: labeled inputs, sliders announce values
 * - Active chips: announce name + "tap to remove"
 * - Grid toggle: announces current mode
 * - Product count: live region
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductListingScreen(
    categoryKey: String,
    subcategoryId: String?,
    onOpenProduct: (String) -> Unit,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()

    // ── Source data ─────────────────────────────────────────────────────────
    val allProducts = remember(categoryKey, subcategoryId) {
        if (subcategoryId != null)
            MockDataProvider.productsForSubcategory(subcategoryId)
        else
            MockDataProvider.productsForCategory(categoryKey)
    }
    val brands = remember(allProducts) { allProducts.map { it.brand }.distinct().sorted() }

    if (allProducts.isEmpty()) {
        PageEmptyState(
            title = "No products found",
            message = "This category has no products yet. Please try another category.",
            ctaLabel = "Go Back",
            onCta = onBack,
        )
        return
    }

    // ── Filter state ─────────────────────────────────────────────────────────
    var maxPrice = remember { allProducts.maxOfOrNull { it.originalPrice }?.toFloat() ?: 100000f }
    var priceRange by remember { mutableStateOf(0f..maxPrice) }
    val selectedBrands = remember { mutableStateListOf<String>() }
    var minRating by remember { mutableFloatStateOf(0f) }
    var inStockOnly by remember { mutableStateOf(false) }
    var sortOption by remember { mutableStateOf(SortOption.RELEVANCE) }
    var isGridView by remember { mutableStateOf(true) }
    var showFilterSheet by remember { mutableStateOf(false) }
    var showSortMenu by remember { mutableStateOf(false) }
    var isRefreshing by remember { mutableStateOf(false) }
    val wishlistedIds = remember { mutableStateOf(setOf<String>()) }

    val filterSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    // ── Subcategory data ─────────────────────────────────────────────────────
    val subcategories = remember(categoryKey) { MockDataProvider.subcategoriesFor(categoryKey) }
    var selectedSubcatId by remember { mutableStateOf(subcategoryId) }

    // ── Quick condition filter ────────────────────────────────────────────────
    var conditionFilter by remember { mutableStateOf<String?>(null) } // null = All, "new", "used"
    var verifiedOnly by remember { mutableStateOf(false) }

    // Re-derive products when subcategory changes
    val subcatProducts = remember(categoryKey, selectedSubcatId) {
        if (selectedSubcatId != null)
            MockDataProvider.productsForSubcategory(selectedSubcatId!!)
        else
            MockDataProvider.productsForCategory(categoryKey)
    }

    // ── Derived filtered + sorted list (using subcatProducts) ────────────────
    val filteredProducts by remember(
        priceRange, selectedBrands.toList(), minRating, inStockOnly, sortOption, subcatProducts, conditionFilter, verifiedOnly,
    ) {
        derivedStateOf {
            subcatProducts
                .filter { p ->
                    p.price >= priceRange.start && p.price <= priceRange.endInclusive
                }
                .filter { p -> selectedBrands.isEmpty() || selectedBrands.contains(p.brand) }
                .filter { p -> p.rating >= minRating }
                .filter { p -> if (inStockOnly) p.inStock else true }
                .filter { p ->
                    when (conditionFilter) {
                        "new" -> p.isNewArrival
                        "used" -> !p.isNewArrival
                        else -> true
                    }
                }
                .let { list ->
                    when (sortOption) {
                        SortOption.PRICE_LOW   -> list.sortedBy { it.price }
                        SortOption.PRICE_HIGH  -> list.sortedByDescending { it.price }
                        SortOption.RATING      -> list.sortedByDescending { it.rating }
                        SortOption.NEWEST      -> list.filter { it.isNewArrival } + list.filter { !it.isNewArrival }
                        SortOption.POPULARITY  -> list.sortedByDescending { it.reviewCount }
                        SortOption.RELEVANCE   -> list
                    }
                }
        }
    }

    // ── Active filter chips ───────────────────────────────────────────────────
    val activeFilters = buildList {
        if (priceRange.start > 0 || priceRange.endInclusive < maxPrice)
            add("₹${priceRange.start.toInt()} – ₹${priceRange.endInclusive.toInt()}")
        selectedBrands.forEach { add(it) }
        if (minRating > 0) add("${minRating.toInt()}★ & above")
        if (inStockOnly) add("In Stock")
        if (conditionFilter != null) add(if (conditionFilter == "new") "New" else "Used")
        if (verifiedOnly) add("Verified")
    }

    Scaffold { innerPad ->
        Column(modifier = Modifier.padding(innerPad).fillMaxSize()) {

            // ── Subcategory filter chips ─────────────────────────────────────
            if (subcategories.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 12.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    FilterChip(
                        selected = selectedSubcatId == null,
                        onClick = { selectedSubcatId = null },
                        label = { Text("All", style = MaterialTheme.typography.labelSmall) },
                    )
                    subcategories.forEach { subcat ->
                        FilterChip(
                            selected = selectedSubcatId == subcat.id,
                            onClick = {
                                selectedSubcatId = if (selectedSubcatId == subcat.id) null else subcat.id
                            },
                            label = { Text(subcat.name, style = MaterialTheme.typography.labelSmall) },
                        )
                    }
                }
            }

            // ── Quick filters row (Condition, Verified) ──────────────────────
            Row(
                modifier = Modifier
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = 12.dp, vertical = 2.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                FilterChip(
                    selected = conditionFilter == null,
                    onClick = { conditionFilter = null },
                    label = { Text("All", style = MaterialTheme.typography.labelSmall) },
                )
                FilterChip(
                    selected = conditionFilter == "new",
                    onClick = { conditionFilter = if (conditionFilter == "new") null else "new" },
                    label = { Text("New", style = MaterialTheme.typography.labelSmall) },
                )
                FilterChip(
                    selected = conditionFilter == "used",
                    onClick = { conditionFilter = if (conditionFilter == "used") null else "used" },
                    label = { Text("Used", style = MaterialTheme.typography.labelSmall) },
                )
                FilterChip(
                    selected = verifiedOnly,
                    onClick = { verifiedOnly = !verifiedOnly },
                    label = { Text("✓ Verified", style = MaterialTheme.typography.labelSmall) },
                )
            }

            // ── Toolbar strip ────────────────────────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // Sort button
                Box {
                    AssistChip(
                        onClick = { showSortMenu = true },
                        label = { Text(sortOption.label, style = MaterialTheme.typography.labelMedium) },
                        leadingIcon = {
                            Icon(Icons.Filled.Sort, contentDescription = null, modifier = Modifier.size(16.dp))
                        },
                        modifier = Modifier.semantics { contentDescription = "Sort: ${sortOption.label}" },
                    )
                    DropdownMenu(expanded = showSortMenu, onDismissRequest = { showSortMenu = false }) {
                        SortOption.entries.forEach { opt ->
                            DropdownMenuItem(
                                text = { Text(opt.label) },
                                onClick = { sortOption = opt; showSortMenu = false },
                                modifier = Modifier.semantics { contentDescription = "Sort by ${opt.label}" },
                            )
                        }
                    }
                }
                Spacer(Modifier.width(8.dp))

                // Filter button
                AssistChip(
                    onClick = { showFilterSheet = true },
                    label = { Text("Filter", style = MaterialTheme.typography.labelMedium) },
                    leadingIcon = {
                        Icon(Icons.Filled.FilterList, contentDescription = null, modifier = Modifier.size(16.dp))
                    },
                    trailingIcon = if (activeFilters.isNotEmpty()) {
                        {
                            Surface(
                                color = MaterialTheme.colorScheme.primary,
                                shape = RoundedCornerShape(50),
                            ) {
                                Text(
                                    "${activeFilters.size}",
                                    style = MaterialTheme.typography.labelSmall.copy(
                                        color = MaterialTheme.colorScheme.onPrimary,
                                        fontWeight = FontWeight.Bold,
                                    ),
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                )
                            }
                        }
                    } else null,
                    modifier = Modifier.semantics {
                        contentDescription = if (activeFilters.isEmpty()) "Filter products"
                        else "Filter products, ${activeFilters.size} active filters"
                    },
                )
                Spacer(Modifier.weight(1f))

                // Product count
                Text(
                    text = "Showing ${filteredProducts.size} of ${subcatProducts.size}",
                    style = MaterialTheme.typography.labelMedium.copy(
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    ),
                    modifier = Modifier.semantics { contentDescription = "Showing ${filteredProducts.size} of ${subcatProducts.size} products" },
                )
                Spacer(Modifier.width(8.dp))

                // Grid/List toggle
                IconButton(
                    onClick = { isGridView = !isGridView },
                    modifier = Modifier.semantics {
                        contentDescription = if (isGridView) "Switch to list view" else "Switch to grid view"
                    },
                ) {
                    Icon(
                        if (isGridView) Icons.Filled.List else Icons.Filled.GridView,
                        contentDescription = null,
                    )
                }
            }

            // ── Active filter chips ──────────────────────────────────────────
            AnimatedVisibility(visible = activeFilters.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 12.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    activeFilters.forEach { chip ->
                        FilterChip(
                            selected = true,
                            onClick = {
                                // Remove corresponding filter
                                when {
                                    chip.startsWith("₹") -> priceRange = 0f..maxPrice
                                    chip.contains("★")   -> minRating = 0f
                                    chip == "In Stock"   -> inStockOnly = false
                                    chip == "New" || chip == "Used" -> conditionFilter = null
                                    chip == "Verified"   -> verifiedOnly = false
                                    else                 -> selectedBrands.remove(chip)
                                }
                            },
                            label = { Text(chip, style = MaterialTheme.typography.labelSmall) },
                            trailingIcon = {
                                Icon(Icons.Filled.Close, contentDescription = "Remove filter: $chip", modifier = Modifier.size(14.dp))
                            },
                            modifier = Modifier.semantics { contentDescription = "$chip filter active, tap to remove" },
                        )
                    }
                }
            }

            // ── Product grid / list ──────────────────────────────────────────
            PullToRefreshBox(
                isRefreshing = isRefreshing,
                onRefresh = {
                    scope.launch {
                        isRefreshing = true
                        delay(700)
                        isRefreshing = false
                    }
                },
                modifier = Modifier.weight(1f),
            ) {
                if (filteredProducts.isEmpty()) {
                    // Empty state
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("😕", style = MaterialTheme.typography.displayMedium)
                            Spacer(Modifier.height(12.dp))
                            Text(
                                "No products found",
                                style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                            )
                            Text(
                                "Try adjusting your filters",
                                style = MaterialTheme.typography.bodyMedium.copy(
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                ),
                            )
                            Spacer(Modifier.height(16.dp))
                            Button(onClick = {
                                priceRange = 0f..maxPrice
                                selectedBrands.clear()
                                minRating = 0f
                                inStockOnly = false
                            }) {
                                Text("Clear Filters")
                            }
                        }
                    }
                } else {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(if (isGridView) 2 else 1),
                        contentPadding = PaddingValues(12.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(filteredProducts, key = { it.id }) { product ->
                            EnhancedProductCard(
                                product = product,
                                isWishlisted = wishlistedIds.value.contains(product.id),
                                onTap = { onOpenProduct(product.id) },
                                onAddToCart = { /* cart via parent */ },
                                onToggleWishlist = {
                                    wishlistedIds.value = if (wishlistedIds.value.contains(product.id))
                                        wishlistedIds.value - product.id
                                    else wishlistedIds.value + product.id
                                },
                            )
                        }
                    }
                }
            }
        }

        // ── Filter bottom sheet ─────────────────────────────────────────────
        if (showFilterSheet) {
            ModalBottomSheet(
                onDismissRequest = { showFilterSheet = false },
                sheetState = filterSheetState,
                dragHandle = { BottomSheetDefaults.DragHandle() },
            ) {
                Column(
                    modifier = Modifier
                        .padding(horizontal = 24.dp, vertical = 8.dp)
                        .padding(bottom = 32.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("Filters", style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold))
                        TextButton(onClick = {
                            priceRange = 0f..maxPrice
                            selectedBrands.clear()
                            minRating = 0f
                            inStockOnly = false
                        }) { Text("Clear All") }
                    }

                    // Price range
                    Column {
                        Text("Price Range", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold))
                        Spacer(Modifier.height(4.dp))
                        Text(
                            "₹${priceRange.start.toInt()} – ₹${priceRange.endInclusive.toInt()}",
                            style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold),
                        )
                        RangeSlider(
                            value = priceRange,
                            onValueChange = { priceRange = it },
                            valueRange = 0f..maxPrice,
                            modifier = Modifier.semantics {
                                contentDescription = "Price range slider: ₹${priceRange.start.toInt()} to ₹${priceRange.endInclusive.toInt()}"
                            },
                        )
                    }

                    // Brands
                    if (brands.isNotEmpty()) {
                        Column {
                            Text("Brands", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold))
                            Spacer(Modifier.height(4.dp))
                            brands.forEach { brand ->
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable(onClickLabel = "Toggle $brand brand filter") {
                                            if (selectedBrands.contains(brand)) selectedBrands.remove(brand)
                                            else selectedBrands.add(brand)
                                        }
                                        .padding(vertical = 4.dp),
                                ) {
                                    Checkbox(
                                        checked = selectedBrands.contains(brand),
                                        onCheckedChange = { checked ->
                                            if (checked) selectedBrands.add(brand)
                                            else selectedBrands.remove(brand)
                                        },
                                        modifier = Modifier.semantics { contentDescription = "$brand ${if (selectedBrands.contains(brand)) "selected" else "unselected"}" },
                                    )
                                    Text(brand, style = MaterialTheme.typography.bodyMedium)
                                }
                            }
                        }
                    }

                    // Min Rating
                    Column {
                        Text("Minimum Rating: ${minRating.toInt()}★", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold))
                        Slider(
                            value = minRating,
                            onValueChange = { minRating = it },
                            valueRange = 0f..5f,
                            steps = 4,
                            modifier = Modifier.semantics { contentDescription = "Minimum rating: ${minRating.toInt()} stars" },
                        )
                    }

                    // In stock toggle
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("In Stock Only", style = MaterialTheme.typography.bodyMedium)
                        Switch(
                            checked = inStockOnly,
                            onCheckedChange = { inStockOnly = it },
                            modifier = Modifier.semantics { contentDescription = "In stock only: ${if (inStockOnly) "on" else "off"}" },
                        )
                    }

                    Button(
                        onClick = { showFilterSheet = false },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                    ) {
                        Text("Apply Filters (${filteredProducts.size} results)")
                    }
                }
            }
        }
    }
}
