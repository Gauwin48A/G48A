package com.mhub.app.ui.components

import androidx.compose.material.icons.automirrored.filled.StarHalf
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarHalf
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.mhub.app.data.mock.MockDataProvider
import com.mhub.app.domain.model.Category

/**
 * Horizontal scrollable subcategory chip row with icons.
 * Accessibility: each chip announces its name and product count.
 */
@Composable
fun SubcategoryChipRow(
    subcategories: List<Category>,
    selectedId: String? = null,
    onSelect: (Category) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    LazyRow(
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        items(subcategories, key = { it.stableId }) { sub ->
            val isSelected = sub.stableId == selectedId
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .clickable(
                        onClickLabel = "Open ${sub.displayName}, ${sub.productCount} products",
                    ) { onSelect(sub) }
                    .semantics { contentDescription = "${sub.displayName}, ${sub.productCount} products" }
                    .padding(4.dp),
            ) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape)
                        .background(
                            if (isSelected) MaterialTheme.colorScheme.primaryContainer
                            else MaterialTheme.colorScheme.surfaceVariant,
                        )
                        .then(
                            if (isSelected) Modifier.border(2.dp, MaterialTheme.colorScheme.primary, CircleShape)
                            else Modifier,
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    AsyncImage(
                        model = sub.iconUrl,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .size(64.dp)
                            .clip(CircleShape),
                    )
                }
                Spacer(Modifier.height(6.dp))
                Text(
                    text = sub.displayName,
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        color = if (isSelected) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.onSurface,
                    ),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

/**
 * Enhanced product card with Quick Add, wishlist toggle, rating, discount badge.
 * Accessibility: full description includes title, price, rating, stock status.
 */
@Composable
fun EnhancedProductCard(
    product: MockDataProvider.MockProduct,
    isWishlisted: Boolean = false,
    onTap: () -> Unit,
    onAddToCart: () -> Unit,
    onToggleWishlist: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val desc = buildString {
        append(product.title)
        append(", ₹${product.price.toInt()}")
        if (product.discountPercent > 0) append(", ${product.discountPercent}% off")
        append(", rated ${product.rating} out of 5")
        if (!product.inStock) append(", out of stock")
    }

    Surface(
        shape = RoundedCornerShape(12.dp),
        tonalElevation = 2.dp,
        modifier = modifier
            .clickable(onClickLabel = "View details for ${product.title}") { onTap() }
            .semantics { contentDescription = desc },
    ) {
        Column {
            Box {
                AsyncImage(
                    model = product.imageUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp)
                        .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp)),
                )
                // Discount badge
                if (product.discountPercent > 0) {
                    Surface(
                        color = MaterialTheme.colorScheme.error,
                        shape = RoundedCornerShape(topStart = 0.dp, topEnd = 12.dp, bottomStart = 8.dp, bottomEnd = 0.dp),
                        modifier = Modifier.align(Alignment.TopEnd),
                    ) {
                        Text(
                            text = "${product.discountPercent}% OFF",
                            style = MaterialTheme.typography.labelSmall.copy(
                                color = MaterialTheme.colorScheme.onError,
                                fontWeight = FontWeight.Bold,
                            ),
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        )
                    }
                }
                // Wishlist button
                IconButton(
                    onClick = onToggleWishlist,
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .size(40.dp)
                        .semantics {
                            contentDescription = if (isWishlisted)
                                "Remove ${product.title} from wishlist"
                            else
                                "Add ${product.title} to wishlist"
                        },
                ) {
                    Icon(
                        imageVector = if (isWishlisted) Icons.Filled.Bookmark else Icons.Outlined.BookmarkBorder,
                        contentDescription = null,
                        tint = if (isWishlisted) Color(0xFF6366F1) else Color.White,
                        modifier = Modifier.size(20.dp),
                    )
                }
                // Out of stock overlay
                if (!product.inStock) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(160.dp)
                            .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp))
                            .background(Color.Black.copy(alpha = 0.45f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Surface(
                            color = Color.Black.copy(alpha = 0.7f),
                            shape = RoundedCornerShape(4.dp),
                        ) {
                            Text(
                                "Out of Stock",
                                style = MaterialTheme.typography.labelMedium.copy(color = Color.White),
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            )
                        }
                    }
                }
            }

            Column(modifier = Modifier.padding(10.dp)) {
                Text(
                    text = product.title,
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(4.dp))
                // Rating row
                RatingStars(rating = product.rating, reviewCount = product.reviewCount)
                Spacer(Modifier.height(6.dp))
                // Price row
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "₹${product.price.toInt()}",
                        style = MaterialTheme.typography.titleSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                        ),
                    )
                    if (product.discountPercent > 0) {
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = "₹${product.originalPrice.toInt()}",
                            style = MaterialTheme.typography.bodySmall.copy(
                                textDecoration = TextDecoration.LineThrough,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            ),
                        )
                    }
                }
            }
        }
    }
}

/**
 * Rating stars display (read-only).
 * Accessibility: announces "Rated X out of 5, Y reviews".
 */
@Composable
fun RatingStars(
    rating: Float,
    reviewCount: Int,
    modifier: Modifier = Modifier,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier.semantics {
            contentDescription = "Rated $rating out of 5, $reviewCount reviews"
        },
    ) {
        val fullStars = rating.toInt()
        val hasHalf = (rating - fullStars) >= 0.4f
        val emptyStars = 5 - fullStars - if (hasHalf) 1 else 0
        repeat(fullStars) {
            Icon(Icons.Filled.Star, contentDescription = null, tint = Color(0xFFFFA000), modifier = Modifier.size(14.dp))
        }
        if (hasHalf) {
            Icon(Icons.AutoMirrored.Filled.StarHalf, contentDescription = null, tint = Color(0xFFFFA000), modifier = Modifier.size(14.dp))
        }
        repeat(emptyStars.coerceAtLeast(0)) {
            Icon(Icons.Filled.Star, contentDescription = null, tint = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.size(14.dp))
        }
        Spacer(Modifier.width(4.dp))
        Text(
            text = "(${reviewCount})",
            style = MaterialTheme.typography.bodySmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant),
        )
    }
}

/**
 * Price display: original strikethrough, sale price, discount %.
 */
@Composable
fun PriceDisplay(
    price: Double,
    originalPrice: Double,
    style: androidx.compose.ui.text.TextStyle = MaterialTheme.typography.titleMedium,
    modifier: Modifier = Modifier,
) {
    val discount = if (originalPrice > price) ((1 - price / originalPrice) * 100).toInt() else 0
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier,
    ) {
        Text(
            text = "₹${price.toInt()}",
            style = style.copy(fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary),
        )
        if (discount > 0) {
            Spacer(Modifier.width(8.dp))
            Text(
                text = "₹${originalPrice.toInt()}",
                style = MaterialTheme.typography.bodyMedium.copy(
                    textDecoration = TextDecoration.LineThrough,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                ),
            )
            Spacer(Modifier.width(6.dp))
            Surface(
                color = Color(0xFF4CAF50).copy(alpha = 0.15f),
                shape = RoundedCornerShape(4.dp),
            ) {
                Text(
                    text = "$discount% off",
                    style = MaterialTheme.typography.labelSmall.copy(color = Color(0xFF2E7D32), fontWeight = FontWeight.Bold),
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                )
            }
        }
    }
}

/** Section header with optional "See All" action. */
@Composable
fun SectionHeader(
    title: String,
    onSeeAll: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
            modifier = Modifier.semantics {
                contentDescription = title
                heading()
            },
        )
        if (onSeeAll != null) {
            Text(
                text = "See All",
                style = MaterialTheme.typography.labelMedium.copy(color = MaterialTheme.colorScheme.primary),
                modifier = Modifier
                    .clickable(onClickLabel = "See all $title") { onSeeAll() }
                    .padding(4.dp),
            )
        }
    }
}

