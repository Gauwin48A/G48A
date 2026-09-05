package com.zaruda.app.ui.components
import com.zaruda.app.ui.theme.ColorTokens

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.zaruda.app.domain.model.Post


private val PillDefaultBg = Color(0xFFF1F5F9)
private val PillLikeBg = Color(0xFFFEF2F2)
private val PillLikeActive = Color(0xFFEF4444)
private val PillInterestedActive = Color(0xFF059669)
private val PillSavedActive = Color(0xFF6366F1)
private val VerifiedBadge = Color(0xFF3B82F6)
private val PriceGradientStart = Color(0xFF4F46E5)
private val PriceGradientEnd = Color(0xFF7C3AED)
private val PillDefaultBgDark = Color(0xFF1E293B)
private val PillLikeBgDark = Color(0xFF450A0A)
private val PriceGradientStartDark = Color(0xFF818CF8)
private val PriceGradientEndDark = Color(0xFFA78BFA)

private val CURRENCY_SYMBOL = "\u20B9"

private fun formatPrice(price: Double): String = CURRENCY_SYMBOL + "%,.0f".format(price)

@Composable
fun PostCard(
    post: Post,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isWishlisted: Boolean = false,
    onUserClick: (() -> Unit)? = null,
    onToggleWishlist: (() -> Unit)? = null,
    isCompared: Boolean = false,
    onToggleCompare: (() -> Unit)? = null,
    isInCart: Boolean = false,
    onToggleCart: (() -> Unit)? = null,
    onInterested: (() -> Unit)? = null,
    onShare: (() -> Unit)? = null,
    isOwner: Boolean = false,
    onPromote: (() -> Unit)? = null,
    showActions: Boolean = true,
    showCompare: Boolean = false,
    showCart: Boolean = false,
    showFullDescription: Boolean = false,
    distanceLabel: String? = null,
    topLeftBadge: (@Composable () -> Unit)? = null,
    onHidePost: (() -> Unit)? = null,
    extraMenuItems: (@Composable () -> Unit)? = null,
    elevation: androidx.compose.ui.unit.Dp = 2.dp,
    imageHeight: androidx.compose.ui.unit.Dp = 200.dp,
) {
    val darkTheme = ColorTokens.isDarkTheme()
    val pillBg = if (darkTheme) PillDefaultBgDark else PillDefaultBg
    val likeBg = if (darkTheme) PillLikeBgDark else PillLikeBg
    val priceStart = if (darkTheme) PriceGradientStartDark else PriceGradientStart
    var localLiked by remember { mutableStateOf(false) }
    var localLikeCount by remember { mutableStateOf(post.likeCount ?: 0) }
    var showFullDesc by remember { mutableStateOf(showFullDescription) }
    var showMoreMenu by remember { mutableStateOf(false) }
    val saveScale by animateFloatAsState(
        targetValue = if (isWishlisted) 1.15f else 1f,
        animationSpec = tween(200), label = "saveScale")

    Card(onClick = onClick, shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = elevation),
        modifier = modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // IMAGE
            Box(Modifier.fillMaxWidth().height(imageHeight)) {
                val images = listOfNotNull(post.primaryImage) + (post.images ?: emptyList())
                if (images.isNotEmpty()) {
                    AsyncImage(model = images[0], contentDescription = post.displayTitle,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)))
                    Box(Modifier.fillMaxWidth().height(80.dp).align(Alignment.BottomCenter)
                        .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.6f)), startY = 0f)))
                } else {
                    Box(Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                        Icon(Icons.Outlined.ImageNotSupported, null, modifier = Modifier.size(40.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }

                // Price badge
                post.price?.let { price ->
                    Surface(Modifier.align(Alignment.BottomStart).padding(12.dp),
                        shape = RoundedCornerShape(12.dp), color = Color(0xFF1E293B).copy(alpha = 0.88f)) {
                        Row(Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text(formatPrice(price), fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = Color.White)
                            post.originalPrice?.let { orig ->
                                if (orig > price && orig > 0) {
                                    val pct = ((orig - price) / orig * 100).toInt()
                                    Text("" + pct + "% OFF", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF34D399))
                                }
                            }
                        }
                    }
                }

                // Discount tag
                post.originalPrice?.let { orig ->
                    post.price?.let { price ->
                        if (orig > price && orig > 0) {
                            val pct = ((orig - price) / orig * 100).toInt()
                            Surface(Modifier.align(Alignment.TopStart).padding(8.dp), shape = RoundedCornerShape(8.dp), color = Color(0xFFEF4444)) {
                                Text("-" + pct + "%", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                            }
                        }
                    }
                }

                // Top-left badge
                if (topLeftBadge != null) { Box(Modifier.align(Alignment.TopStart).padding(8.dp)) { topLeftBadge() } }

                PromoBadgeRow(
                    boostLevel = post.boostLevel,
                    promoLabel = post.promoLabel,
                    isPromoted = post.isPromoted,
                    expiresAt = post.expiresAt,
                    modifier = Modifier.align(Alignment.TopStart).padding(
                        top = if (topLeftBadge != null) 36.dp else if ((post.originalPrice ?: 0.0) > (post.price ?: 0.0)) 32.dp else 8.dp, start = 8.dp))

                // Wishlist save
                if (onToggleWishlist != null) {
                    val saveColor by animateColorAsState(targetValue = if (isWishlisted) Color(0xFF6366F1) else Color.White,
                        animationSpec = tween(200), label = "saveColor")
                    Surface(Modifier.align(Alignment.TopEnd).padding(8.dp).size(36.dp), shape = CircleShape, color = Color.Black.copy(alpha = 0.3f)) {
                        IconButton(onClick = { onToggleWishlist() }, modifier = Modifier.fillMaxSize()) {
                            Icon(if (isWishlisted) Icons.Default.Bookmark else Icons.Outlined.BookmarkBorder,
                                contentDescription = null, tint = saveColor, modifier = Modifier.size(18.dp).scale(saveScale))
                        }
                    }
                }



                // Distance
                if (distanceLabel != null) {
                    Surface(Modifier.align(Alignment.BottomEnd).padding(12.dp), shape = RoundedCornerShape(8.dp),
                        color = Color(0xFF3B82F6).copy(alpha = 0.85f)) {
                        Row(Modifier.padding(horizontal = 8.dp, vertical = 3.dp), verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                            Icon(Icons.Default.LocationOn, null, tint = Color.White, modifier = Modifier.size(11.dp))
                            Text(distanceLabel, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.White)
                        }
                    }
                }
            }

            // CONTENT
            Column(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)) {

                // Seller row — tap the name/avatar to open the seller's sold-posts trust page
                val sellerClickable = onUserClick != null && !post.userId.isNullOrBlank()
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    val sellerName = post.sellerName ?: post.userName ?: "Verified Seller"
                    val initial = sellerName.firstOrNull()?.uppercaseChar()?.toString() ?: "M"
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        modifier = if (sellerClickable) Modifier.weight(1f, fill = false).clip(RoundedCornerShape(8.dp)).clickable { onUserClick?.invoke() } else Modifier.weight(1f, fill = false),
                    ) {
                        Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.size(28.dp)) {
                            Box(contentAlignment = Alignment.Center) { Text(initial, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary) }
                        }
                        Text(sellerName, fontSize = 12.sp, fontWeight = FontWeight.Medium, color = if (sellerClickable) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    if (sellerClickable) {
                        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                    }
                    if (post.sellerVerified == true) {
                        Surface(shape = RoundedCornerShape(4.dp), color = VerifiedBadge.copy(alpha = 0.1f)) {
                            Row(modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                                Icon(Icons.Default.Verified, null, tint = VerifiedBadge, modifier = Modifier.size(10.dp))
                                Text("Verified", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = VerifiedBadge)
                            }
                        }
                    }
                    if (post.rewardBadge != null && post.rewardBadge.lowercase().contains("elite")) {
                        Surface(shape = RoundedCornerShape(4.dp), color = Color(0xFF7C3AED).copy(alpha = 0.1f)) {
                            Row(modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                                Icon(Icons.Default.Star, null, tint = Color(0xFF7C3AED), modifier = Modifier.size(10.dp))
                                Text("Elite Seller", fontSize = 8.sp, fontWeight = FontWeight.Bold, color = Color(0xFF7C3AED))
                            }
                        }
                    }
                    // 3-dot menu
                    Box {
                        IconButton(onClick = { showMoreMenu = true }, modifier = Modifier.size(24.dp)) {
                            Icon(Icons.Default.MoreVert, null, modifier = Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        DropdownMenu(expanded = showMoreMenu, onDismissRequest = { showMoreMenu = false }) {
                            if (onShare != null) {
                                DropdownMenuItem(
                                    text = { Text("Share", fontSize = 13.sp) },
                                    leadingIcon = { Icon(Icons.Outlined.Share, null, modifier = Modifier.size(16.dp)) },
                                    onClick = { showMoreMenu = false; onShare() })
                            }
                            if (onToggleCompare != null) {
                                DropdownMenuItem(
                                    text = { Text(if (isCompared) "Remove from Compare" else "Compare", fontSize = 13.sp) },
                                    leadingIcon = { Icon(Icons.Default.Compare, null, modifier = Modifier.size(16.dp)) },
                                    onClick = { showMoreMenu = false; onToggleCompare() })
                            }
                            if (onToggleCart != null) {
                                DropdownMenuItem(
                                    text = { Text(if (isInCart) "Remove from Cart" else "Add to Cart", fontSize = 13.sp) },
                                    leadingIcon = { Icon(Icons.Outlined.ShoppingCart, null, modifier = Modifier.size(16.dp)) },
                                    onClick = { showMoreMenu = false; onToggleCart() })
                            }
                            if (onHidePost != null) {
                                DropdownMenuItem(
                                    text = { Text("Not interested", fontSize = 13.sp) },
                                    leadingIcon = { Icon(Icons.Default.ThumbDown, null, modifier = Modifier.size(16.dp)) },
                                    onClick = { showMoreMenu = false; onHidePost() })
                            }
                            if (extraMenuItems != null) { extraMenuItems() }
                            if (isOwner && onPromote != null) {
                                DropdownMenuItem(
                                    text = { Text("Promote", fontSize = 13.sp) },
                                    leadingIcon = { Icon(Icons.AutoMirrored.Filled.ArrowForward, null, modifier = Modifier.size(16.dp)) },
                                    onClick = { showMoreMenu = false; onPromote() })
                            }
                        }
                    }
                }

                // Title
                Text(text = post.displayTitle, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface, maxLines = 2, overflow = TextOverflow.Ellipsis, lineHeight = 22.sp, style = MaterialTheme.typography.bodyLarge)

                // Price
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    post.price?.let { price ->
                        val formatted = formatPrice(price)
                        if (post.isPremium == true) {
                            Text(formatted, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = priceStart)
                        } else {
                            Text(formatted, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                    post.originalPrice?.let { orig ->
                        post.price?.let { price ->
                            if (orig > price) {
                                Text(formatPrice(orig), fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, textDecoration = TextDecoration.LineThrough)
                            }
                        }
                    }
                    if (post.isNegotiable == true) {
                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFF59E0B).copy(alpha = 0.12f)) {
                            Text("Negotiable", fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFFD97706), modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                }

                // Location + views + time
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    post.location?.let { loc ->
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                            Icon(Icons.Default.LocationOn, null, modifier = Modifier.size(13.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text(text = loc, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        }
                    }
                    post.viewCount?.let { views ->
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                            Icon(Icons.Default.Visibility, null, modifier = Modifier.size(13.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Text("" + views + " views", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    post.createdAt?.let { created ->
                        val timeAgo = formatTimeAgo(created)
                        if (timeAgo != null) { Text(timeAgo, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) }
                    }
                }

                // Tags
                if (post.condition != null || post.brand != null || post.categoryName != null) {
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                        post.condition?.let { cond ->
                            val isNew = cond.equals("new", ignoreCase = true)
                            TagChip(cond, if (isNew) Color(0xFFDCFCE7) else if (darkTheme) Color(0xFF451A03) else Color(0xFFFEF3C7), if (isNew) Color(0xFF16A34A) else Color(0xFFD97706))
                        }
                        post.brand?.let { brand ->
                            TagChip(brand, if (darkTheme) Color(0xFF1E3A5F) else Color(0xFFDBEAFE), Color(0xFF2563EB))
                        }
                        post.subcategoryName?.let { subName ->
                            TagChip(subName, if (darkTheme) Color(0xFF1A1A2E) else Color(0xFFF3E8FF), Color(0xFF7C3AED))
                        }
                    }
                }

                // Description
                if (!post.description.isNullOrBlank()) {
                    val descText = post.description
                    if (showFullDesc || descText.length <= 80) {
                        Text(text = descText, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 18.sp, maxLines = if (showFullDesc) Int.MAX_VALUE else 3, overflow = TextOverflow.Ellipsis)
                        if (descText.length > 80 && !showFullDesc) {
                            TextButton(onClick = { showFullDesc = true }, contentPadding = PaddingValues(0.dp), modifier = Modifier.height(28.dp)) {
                                Text("Read more", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                            }
                        }
                    } else {
                        Text(text = descText.take(80) + "\u2026", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 18.sp)
                        TextButton(onClick = { showFullDesc = true }, contentPadding = PaddingValues(0.dp), modifier = Modifier.height(28.dp)) {
                            Text("Read more", fontSize = 12.sp, fontWeight = FontWeight.Medium)
                        }
                    }
                }

                // ACTIONS
                if (showActions) {
                    HorizontalDivider(thickness = 0.5.dp, color = MaterialTheme.colorScheme.outlineVariant)
                    Spacer(Modifier.height(2.dp))
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceEvenly) {
                        ActionPill(icon = if (localLiked) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder,
                            label = if (localLiked) "" + localLikeCount else "Like", isActive = localLiked,
                            activeColor = PillLikeActive, activeBg = likeBg, defaultBg = pillBg,
                            onClick = { localLiked = !localLiked; if (localLiked) localLikeCount++ else localLikeCount-- },
                            modifier = Modifier.weight(1f))
                        if (onInterested != null) {
                            ActionPill(Icons.Outlined.Star, "Interested", false, PillInterestedActive, Color(0xFFECFDF5), pillBg, onInterested, Modifier.weight(1f), true)
                        }
                        if (onShare != null) {
                            ActionPill(Icons.Outlined.Share, "Share", false, MaterialTheme.colorScheme.onSurfaceVariant, pillBg, pillBg, onShare, Modifier.weight(1f), true)
                        }
                        ActionPill(Icons.Default.Visibility, "View Details", false, Color(0xFF6366F1), Color(0xFFEEF2FF), pillBg, onClick, Modifier.weight(1f), true)
                    }

                    if (showCompare || showCart) {
                        Spacer(Modifier.height(4.dp))
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                            if (showCompare && onToggleCompare != null) {
                                Row(Modifier.clickable { onToggleCompare() }.padding(horizontal = 8.dp, vertical = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Checkbox(checked = isCompared, onCheckedChange = { onToggleCompare() }, modifier = Modifier.size(20.dp), colors = CheckboxDefaults.colors(checkedColor = MaterialTheme.colorScheme.primary))
                                    Text("Compare", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                            if (showCart && onToggleCart != null) {
                                Surface(onClick = { onToggleCart() }, shape = RoundedCornerShape(8.dp),
                                    color = if (isInCart) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.primaryContainer) {
                                    Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Icon(if (isInCart) Icons.Default.RemoveShoppingCart else Icons.Outlined.ShoppingCart, null, modifier = Modifier.size(14.dp), tint = if (isInCart) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.primary)
                                        Text(if (isInCart) "Remove" else "Add to Cart", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = if (isInCart) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.primary)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun PostCardCompact(
    post: Post,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    isWishlisted: Boolean = false,
    onUserClick: (() -> Unit)? = null,
    onToggleWishlist: (() -> Unit)? = null,
) {
    Card(onClick = onClick, shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp), modifier = modifier) {
        Column {
            Box(Modifier.fillMaxWidth().aspectRatio(1f).background(MaterialTheme.colorScheme.surfaceVariant)) {
                if (post.primaryImage != null) {
                    AsyncImage(model = post.primaryImage, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)))
                } else {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Icon(Icons.Outlined.ImageNotSupported, null, modifier = Modifier.size(28.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                post.price?.let { price ->
                    Box(Modifier.align(Alignment.BottomStart).fillMaxWidth()
                        .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.5f)), startY = 0f))
                        .padding(8.dp)) {
                        Text(formatPrice(price), fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color.White)
                    }
                }
                if (onToggleWishlist != null) {
                    val saveColor by animateColorAsState(targetValue = if (isWishlisted) Color(0xFF6366F1) else Color.White, animationSpec = tween(200), label = "compactSaveColor")
                    Icon(if (isWishlisted) Icons.Default.Bookmark else Icons.Outlined.BookmarkBorder, contentDescription = null, tint = saveColor, modifier = Modifier.align(Alignment.TopEnd).padding(6.dp).size(18.dp).clickable { onToggleWishlist() })
                }
            }
            Column(Modifier.padding(8.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(post.displayTitle, maxLines = 2, overflow = TextOverflow.Ellipsis, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold)
                post.price?.let { Text(formatPrice(it), fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.primary) }
                post.location?.let { loc ->
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                        Icon(Icons.Default.LocationOn, null, modifier = Modifier.size(10.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(loc, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
        }
    }
}

@Composable
private fun ActionPill(
    icon: ImageVector,
    label: String,
    isActive: Boolean,
    activeColor: Color,
    activeBg: Color,
    defaultBg: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    labelTranslatable: Boolean = false,
) {
    val bg by animateColorAsState(targetValue = if (isActive) activeBg else defaultBg, animationSpec = tween(200), label = "pillBg")
    val tint by animateColorAsState(targetValue = if (isActive) activeColor else MaterialTheme.colorScheme.onSurfaceVariant, animationSpec = tween(200), label = "pillTint")
    Surface(onClick = onClick, shape = RoundedCornerShape(20.dp), color = bg, modifier = modifier.padding(horizontal = 2.dp)) {
        Row(Modifier.padding(horizontal = 8.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            Icon(icon, null, tint = tint, modifier = Modifier.size(14.dp))
            if (labelTranslatable) {
                Text(text = label, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = tint, maxLines = 1)
            } else {
                Text(label, fontSize = 11.sp, fontWeight = FontWeight.Medium, color = tint, maxLines = 1)
            }
        }
    }
}

@Composable
private fun TagChip(text: String, bg: Color, textColor: Color) {
    Surface(shape = RoundedCornerShape(6.dp), color = bg) {
        Text(text, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = textColor, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
    }
}

private fun formatTimeAgo(isoDate: String): String? {
    return try {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US)
        sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
        val date = sdf.parse(isoDate.take(19)) ?: return null
        val diff = System.currentTimeMillis() - date.time
        val mins = diff / 60000
        val hours = mins / 60
        val days = hours / 24
        return when {
            mins < 1 -> "Just now"
            mins < 60 -> "" + mins + "m ago"
            hours < 24 -> "" + hours + "h ago"
            days < 7 -> "" + days + "d ago"
            days < 30 -> "" + (days / 7) + "w ago"
            else -> "" + (days / 30) + "mo ago"
        }
    } catch (_: Exception) { null }
}
