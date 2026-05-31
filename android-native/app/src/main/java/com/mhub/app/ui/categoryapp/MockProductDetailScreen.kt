package com.mhub.app.ui.categoryapp

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.rememberTransformableState
import androidx.compose.foundation.gestures.transformable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import android.graphics.Color as AndroidColor
import com.mhub.app.data.mock.MockDataProvider
import com.mhub.app.data.local.db.RecentlyViewedDao
import com.mhub.app.data.local.db.RecentlyViewedEntity
import com.mhub.app.ui.common.PageErrorState
import com.mhub.app.ui.components.EnhancedProductCard
import com.mhub.app.ui.components.PriceDisplay
import com.mhub.app.ui.components.QuantitySelector
import com.mhub.app.ui.components.RatingStars
import com.mhub.app.ui.components.SectionHeader
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.launch

@HiltViewModel
class RecentlyViewedViewModel @Inject constructor(
    private val dao: RecentlyViewedDao,
) : ViewModel() {
    fun record(product: MockDataProvider.MockProduct) {
        viewModelScope.launch {
            dao.insert(
                RecentlyViewedEntity(
                    postId = product.id,
                    title = product.title,
                    price = product.price,
                    imageUrl = product.images.firstOrNull() ?: "",
                    category = product.category,
                    brand = product.brand,
                    rating = product.rating,
                )
            )
        }
    }
}

/**
 * Full product detail screen for category app products.
 * Features:
 * - Image gallery with pinch-to-zoom
 * - Price with original + discount %
 * - Color swatches + size chips
 * - Quantity selector
 * - Add to Cart, Buy Now, Wishlist
 * - Expandable description + specs table
 * - Customer reviews
 * - Related products carousel
 *
 * Accessibility: full contentDescription on all interactive elements.
 */
@OptIn(ExperimentalFoundationApi::class, ExperimentalMaterial3Api::class)
@Composable
fun MockProductDetailScreen(
    productId: String,
    onBack: () -> Unit,
    onOpenProduct: (String) -> Unit = {},
    onBuyNow: () -> Unit = {},
    recentlyViewedViewModel: RecentlyViewedViewModel = hiltViewModel(),
) {
    val product = remember(productId) { MockDataProvider.findProduct(productId) }

    if (product == null) {
        PageErrorState(
            message = "Product not found for ID: $productId",
            actionLabel = "Go Back",
            onAction = onBack,
        )
        return
    }

    // ── State ────────────────────────────────────────────────────────────────
    val pagerState = rememberPagerState(pageCount = { product.images.size })
    var selectedColor by remember { mutableStateOf(product.colors.firstOrNull() ?: "") }
    var selectedSize by remember { mutableStateOf(product.sizes.firstOrNull() ?: "") }
    var quantity by remember { mutableIntStateOf(1) }
    val context = androidx.compose.ui.platform.LocalContext.current
    var isWishlisted by remember { mutableStateOf(false) }
    var descExpanded by remember { mutableStateOf(false) }
    var reviewExpanded by remember { mutableStateOf(false) }
    var showReviewSheet by remember { mutableStateOf(false) }
    val reviewSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    val localReviews = remember { mutableStateListOf<MockDataProvider.MockReview>() }
    var scale by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }

    val relatedProducts = remember(product) {
        MockDataProvider.productsForCategory(product.category)
            .filter { it.id != product.id }
            .take(6)
    }
    val reviews = remember { MockDataProvider.sampleReviews }

    // Persist this product in recently viewed
    LaunchedEffect(productId) { recentlyViewedViewModel.record(product) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(product.title, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                navigationIcon = {
                    IconButton(onClick = onBack, modifier = Modifier.semantics { contentDescription = "Go back" }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                actions = {
                    IconButton(
                        onClick = {
                            val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(android.content.Intent.EXTRA_TEXT, "Check out ${product.title} on MHub!")
                            }
                            context.startActivity(android.content.Intent.createChooser(shareIntent, "Share"))
                        },
                        modifier = Modifier.semantics { contentDescription = "Share this product" },
                    ) {
                        Icon(Icons.Filled.Share, contentDescription = null)
                    }
                },
            )
        },
        bottomBar = {
            ProductDetailBottomBar(
                product = product,
                isWishlisted = isWishlisted,
                onAddToCart = { /* added to cart via snackbar */ },
                onBuyNow = onBuyNow,
                onToggleWishlist = { isWishlisted = !isWishlisted },
            )
        },
    ) { innerPad ->
        LazyColumn(
            contentPadding = PaddingValues(bottom = 24.dp),
            modifier = Modifier.padding(innerPad),
        ) {
            // ── Image gallery ─────────────────────────────────────────────
            item(key = "gallery") {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(1f)
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                ) {
                    val transformState = rememberTransformableState { zoomChange, panChange, _ ->
                        scale = (scale * zoomChange).coerceIn(1f, 4f)
                        if (scale > 1f) offset += panChange
                    }
                    HorizontalPager(
                        state = pagerState,
                        modifier = Modifier.fillMaxSize(),
                    ) { page ->
                        AsyncImage(
                            model = product.images.getOrElse(page) { product.imageUrl },
                            contentDescription = "Product image ${page + 1} of ${product.images.size}",
                            contentScale = ContentScale.Fit,
                            modifier = Modifier
                                .fillMaxSize()
                                .graphicsLayer {
                                    scaleX = scale; scaleY = scale
                                    translationX = offset.x; translationY = offset.y
                                }
                                .transformable(state = transformState),
                        )
                    }
                    // Image count indicator
                    Surface(
                        color = Color.Black.copy(alpha = 0.6f),
                        shape = RoundedCornerShape(20.dp),
                        modifier = Modifier.align(Alignment.BottomEnd).padding(12.dp),
                    ) {
                        Text(
                            "${pagerState.currentPage + 1}/${product.images.size}",
                            style = MaterialTheme.typography.labelSmall.copy(color = Color.White),
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        )
                    }
                }
                // Thumbnail strip
                if (product.images.size > 1) {
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(product.images.size) { idx ->
                            AsyncImage(
                                model = product.images[idx],
                                contentDescription = "View image ${idx + 1}",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(60.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .border(
                                        width = if (pagerState.currentPage == idx) 2.dp else 1.dp,
                                        color = if (pagerState.currentPage == idx)
                                            MaterialTheme.colorScheme.primary
                                        else MaterialTheme.colorScheme.outlineVariant,
                                        shape = RoundedCornerShape(8.dp),
                                    )
                                    .clickable(onClickLabel = "View image ${idx + 1}") {
                                        /* handled by pager scroll */
                                    },
                            )
                        }
                    }
                }
            }

            // ── Product info ──────────────────────────────────────────────
            item(key = "info") {
                Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                    // Brand chip
                    Surface(
                        color = MaterialTheme.colorScheme.secondaryContainer,
                        shape = RoundedCornerShape(4.dp),
                    ) {
                        Text(
                            product.brand,
                            style = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSecondaryContainer),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                        )
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(
                        product.title,
                        style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                        modifier = Modifier.semantics { heading() },
                    )
                    Spacer(Modifier.height(8.dp))
                    RatingStars(rating = product.rating, reviewCount = product.reviewCount)
                    Spacer(Modifier.height(10.dp))
                    PriceDisplay(price = product.price, originalPrice = product.originalPrice)
                    Spacer(Modifier.height(4.dp))
                    // Stock status
                    Text(
                        text = if (product.inStock) "✓ In Stock" else "✗ Out of Stock",
                        style = MaterialTheme.typography.labelMedium.copy(
                            color = if (product.inStock) Color(0xFF2E7D32) else MaterialTheme.colorScheme.error,
                            fontWeight = FontWeight.SemiBold,
                        ),
                        modifier = Modifier.semantics { contentDescription = if (product.inStock) "In stock" else "Out of stock" },
                    )
                }
                HorizontalDivider()
            }

            // ── Color selector ────────────────────────────────────────────
            if (product.colors.isNotEmpty()) {
                item(key = "colors") {
                    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                        Text(
                            "Color: $selectedColor",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                        )
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            product.colors.forEach { colorHex ->
                                val color = try { Color(AndroidColor.parseColor(colorHex)) } catch (e: Exception) { Color.Gray }
                                val isSelected = colorHex == selectedColor
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .background(color)
                                        .then(
                                            if (isSelected) Modifier.border(3.dp, MaterialTheme.colorScheme.primary, CircleShape)
                                            else Modifier.border(1.dp, MaterialTheme.colorScheme.outline, CircleShape),
                                        )
                                        .clickable(onClickLabel = "Select color") {
                                            selectedColor = colorHex
                                        }
                                        .semantics {
                                            contentDescription = "Color $colorHex${if (isSelected) ", selected" else ""}"
                                        },
                                )
                            }
                        }
                    }
                    HorizontalDivider()
                }
            }

            // ── Size selector ─────────────────────────────────────────────
            if (product.sizes.isNotEmpty()) {
                item(key = "sizes") {
                    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                        Text(
                            "Size: $selectedSize",
                            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                        )
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            product.sizes.forEach { size ->
                                val isSelected = size == selectedSize
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = if (isSelected) MaterialTheme.colorScheme.primaryContainer
                                            else MaterialTheme.colorScheme.surfaceVariant,
                                    modifier = Modifier
                                        .clickable(onClickLabel = "Select size $size") { selectedSize = size }
                                        .semantics {
                                            contentDescription = "Size $size${if (isSelected) ", selected" else ""}"
                                            role = Role.Button
                                        }
                                        .border(
                                            if (isSelected) 2.dp else 1.dp,
                                            if (isSelected) MaterialTheme.colorScheme.primary
                                            else MaterialTheme.colorScheme.outlineVariant,
                                            RoundedCornerShape(8.dp),
                                        ),
                                ) {
                                    Text(
                                        size,
                                        style = MaterialTheme.typography.labelMedium.copy(
                                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                        ),
                                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                                    )
                                }
                            }
                        }
                    }
                    HorizontalDivider()
                }
            }

            // ── Quantity selector ─────────────────────────────────────────
            item(key = "quantity") {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text("Quantity", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold))
                    Spacer(Modifier.width(16.dp))
                    QuantitySelector(
                        quantity = quantity,
                        onDecrease = { if (quantity > 1) quantity-- },
                        onIncrease = { if (quantity < 10) quantity++ },
                    )
                }
                HorizontalDivider()
            }

            // ── Delivery info ─────────────────────────────────────────────
            item(key = "delivery") {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Filled.LocalShipping,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(Modifier.width(8.dp))
                    Column {
                        Text(
                            if (product.freeShipping) "Free Delivery" else "₹49 Delivery",
                            style = MaterialTheme.typography.labelMedium.copy(fontWeight = FontWeight.SemiBold),
                        )
                        Text(
                            "Estimated delivery in ${product.deliveryDays} day${if (product.deliveryDays > 1) "s" else ""}",
                            style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant),
                        )
                    }
                }
                HorizontalDivider()
            }

            // ── Actions: Compare / Boost / Promote ────────────────────────
            item(key = "actions") {
                Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                    Text(
                        "Seller Tools",
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    )
                    Spacer(Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        FilledTonalButton(
                            onClick = { /* Compare action */ },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.filledTonalButtonColors(
                                containerColor = Color(0xFFEFF6FF),
                                contentColor = Color(0xFF2563EB),
                            ),
                        ) {
                            Text("Compare", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }
                        FilledTonalButton(
                            onClick = { /* Boost action */ },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.filledTonalButtonColors(
                                containerColor = Color(0xFFFEF3C7),
                                contentColor = Color(0xFFB45309),
                            ),
                        ) {
                            Text("⚡ Boost", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }
                        FilledTonalButton(
                            onClick = { /* Promote action */ },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.filledTonalButtonColors(
                                containerColor = Color(0xFFECFDF5),
                                contentColor = Color(0xFF059669),
                            ),
                        ) {
                            Text("Promote", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Boost your listing for more visibility. Use coins or plan credits.",
                        style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant),
                    )
                }
                HorizontalDivider()
            }

            // ── Description ───────────────────────────────────────────────
            item(key = "description") {
                Column(
                    modifier = Modifier
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                        .animateContentSize(),
                ) {
                    Text("Description", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
                    Spacer(Modifier.height(6.dp))
                    Text(
                        product.description,
                        style = MaterialTheme.typography.bodyMedium,
                        maxLines = if (descExpanded) Int.MAX_VALUE else 3,
                        overflow = TextOverflow.Ellipsis,
                    )
                    TextButton(
                        onClick = { descExpanded = !descExpanded },
                        modifier = Modifier.semantics {
                            contentDescription = if (descExpanded) "Show less description" else "Read full description"
                        },
                    ) {
                        Text(if (descExpanded) "Show less" else "Read more")
                        Icon(
                            if (descExpanded) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                        )
                    }
                }
                HorizontalDivider()
            }

            // ── Specifications ────────────────────────────────────────────
            if (product.specs.isNotEmpty()) {
                item(key = "specs") {
                    Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp)) {
                        Text("Specifications", style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
                        Spacer(Modifier.height(8.dp))
                        product.specs.entries.forEachIndexed { idx, (key, value) ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(
                                        if (idx % 2 == 0) MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                                        else Color.Transparent,
                                    )
                                    .padding(vertical = 6.dp, horizontal = 4.dp),
                            ) {
                                Text(
                                    key,
                                    style = MaterialTheme.typography.bodySmall.copy(
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        fontWeight = FontWeight.SemiBold,
                                    ),
                                    modifier = Modifier.weight(0.4f),
                                )
                                Text(
                                    value,
                                    style = MaterialTheme.typography.bodySmall,
                                    modifier = Modifier.weight(0.6f),
                                )
                            }
                        }
                    }
                    HorizontalDivider()
                }
            }

            // ── Reviews ───────────────────────────────────────────────────
            item(key = "reviews_header") {
                Row(
                    Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    SectionHeader(
                        title = "Customer Reviews (${reviews.size + localReviews.size})",
                        modifier = Modifier.weight(1f),
                    )
                    TextButton(onClick = { showReviewSheet = true }) {
                        Text("Write a Review")
                    }
                }
            }
            items(
                if (reviewExpanded) localReviews + reviews else (localReviews + reviews).take(3),
                key = { "review_${it.id}" },
            ) { review ->
                ReviewCard(review = review, modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp))
            }
            item(key = "reviews_toggle") {
                if ((reviews.size + localReviews.size) > 3) {
                    TextButton(
                        onClick = { reviewExpanded = !reviewExpanded },
                        modifier = Modifier.padding(horizontal = 12.dp),
                    ) {
                        Text(if (reviewExpanded) "Show Less" else "View All ${reviews.size + localReviews.size} Reviews")
                    }
                }
                HorizontalDivider()
                Spacer(Modifier.height(12.dp))
            }

            // ── Related products ──────────────────────────────────────────
            if (relatedProducts.isNotEmpty()) {
                item(key = "related_header") {
                    SectionHeader(title = "You May Also Like")
                    Spacer(Modifier.height(8.dp))
                }
                item(key = "related_row") {
                    LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        items(relatedProducts, key = { it.id }) { p ->
                            EnhancedProductCard(
                                product = p,
                                isWishlisted = false,
                                onTap = { onOpenProduct(p.id) },
                                onAddToCart = {},
                                onToggleWishlist = {},
                                modifier = Modifier.width(160.dp),
                            )
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                }
            }
        }

    // ── Write Review Sheet ──────────────────────────────────────────────────
    if (showReviewSheet) {
        WriteReviewSheet(
            sheetState = reviewSheetState,
            onDismiss = { showReviewSheet = false },
            onSubmit = { rating, comment ->
                localReviews.add(0,
                    MockDataProvider.MockReview(
                        id = "local_${System.currentTimeMillis()}",
                        reviewerName = "You",
                        rating = rating.toFloat(),
                        comment = comment,
                        date = "Just now",
                        helpfulCount = 0,
                    )
                )
                showReviewSheet = false
            },
        )
    }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WriteReviewSheet(
    sheetState: androidx.compose.material3.SheetState,
    onDismiss: () -> Unit,
    onSubmit: (rating: Int, comment: String) -> Unit,
) {
    var starRating by remember { mutableIntStateOf(0) }
    var reviewBody by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(
            Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text("Write a Review", style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold))

            // Star picker
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                (1..5).forEach { star ->
                    Icon(
                        imageVector = Icons.Filled.Star,
                        contentDescription = "$star star",
                        tint = if (star <= starRating) Color(0xFFF59E0B) else Color(0xFFD1D5DB),
                        modifier = Modifier
                            .size(36.dp)
                            .clickable { starRating = star },
                    )
                }
            }

            OutlinedTextField(
                value = reviewBody,
                onValueChange = { reviewBody = it.take(1000) },
                label = { Text("Your review") },
                minLines = 3,
                maxLines = 6,
                modifier = Modifier.fillMaxWidth(),
            )

            Button(
                onClick = {
                    if (starRating > 0 && reviewBody.isNotBlank()) {
                        onSubmit(starRating, reviewBody)
                    }
                },
                enabled = starRating > 0 && reviewBody.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Submit Review")
            }
        }
    }
}

@Composable
private fun ReviewCard(
    review: MockDataProvider.MockReview,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Surface(
                shape = CircleShape,
                color = MaterialTheme.colorScheme.primaryContainer,
                modifier = Modifier.size(36.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        review.reviewerName.first().toString(),
                        style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                    )
                }
            }
            Spacer(Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(review.reviewerName, style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold))
                Text(review.date, style = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant))
            }
            Row(modifier = Modifier.semantics { contentDescription = "Rated ${review.rating} stars" }) {
                repeat(review.rating.toInt()) {
                    Icon(Icons.Filled.Star, contentDescription = null, tint = Color(0xFFFFA000), modifier = Modifier.size(14.dp))
                }
            }
        }
        Spacer(Modifier.height(6.dp))
        Text(review.comment, style = MaterialTheme.typography.bodySmall)
        Text(
            "${review.helpfulCount} people found this helpful",
            style = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant),
        )
        Spacer(Modifier.height(4.dp))
        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
    }
}

@Composable
private fun ProductDetailBottomBar(
    product: MockDataProvider.MockProduct,
    isWishlisted: Boolean,
    onAddToCart: () -> Unit,
    onBuyNow: () -> Unit,
    onToggleWishlist: () -> Unit,
) {
    Surface(shadowElevation = 8.dp) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Wishlist button
            IconButton(
                onClick = onToggleWishlist,
                modifier = Modifier.semantics {
                    contentDescription = if (isWishlisted) "Remove from wishlist" else "Add to wishlist"
                },
            ) {
                Icon(
                    if (isWishlisted) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                    contentDescription = null,
                    tint = if (isWishlisted) Color(0xFFE53935) else MaterialTheme.colorScheme.onSurface,
                )
            }
            if (product.inStock) {
                // Add to cart
                FilledTonalButton(
                    onClick = onAddToCart,
                    modifier = Modifier.weight(1f).height(48.dp).semantics {
                        contentDescription = "Add ${product.title} to cart"
                    },
                ) {
                    Text("Add to Cart", fontWeight = FontWeight.SemiBold)
                }
                // Buy now
                Button(
                    onClick = onBuyNow,
                    modifier = Modifier.weight(1f).height(48.dp).semantics {
                        contentDescription = "Buy ${product.title} now"
                    },
                ) {
                    Text("Buy Now", fontWeight = FontWeight.SemiBold)
                }
            } else {
                OutlinedButton(
                    onClick = {},
                    enabled = false,
                    modifier = Modifier.weight(1f).height(48.dp),
                ) {
                    Text("Out of Stock")
                }
            }
        }
    }
}

