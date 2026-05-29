package com.mhub.app.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.compose.AsyncImage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

// ─────────────────────────────────────────────────────────────
// 1. ShareLinkBottomSheet
// ─────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShareLinkBottomSheet(
    title: String,
    postId: String,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current
    val postUrl = "https://mhub.app/post/$postId"
    val shareText = "$title $postUrl"

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
                .navigationBarsPadding(),
        ) {
            Text(
                text = "Share",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(bottom = 16.dp),
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                // Copy Link
                ShareActionItem(
                    icon = {
                        Icon(Icons.Default.ContentCopy, contentDescription = "Copy Link")
                    },
                    label = "Copy Link",
                    modifier = Modifier.weight(1f),
                ) {
                    val clipboard =
                        context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                    clipboard.setPrimaryClip(ClipData.newPlainText("Post Link", postUrl))
                    Toast.makeText(context, "Link copied!", Toast.LENGTH_SHORT).show()
                    onDismiss()
                }
                // WhatsApp
                ShareActionItem(
                    icon = {
                        Icon(
                            Icons.AutoMirrored.Filled.Chat,
                            contentDescription = "WhatsApp",
                            tint = Color(0xFF25D366),
                        )
                    },
                    label = "WhatsApp",
                    modifier = Modifier.weight(1f),
                ) {
                    val intent = Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse("https://wa.me/?text=${Uri.encode(shareText)}"),
                    )
                    context.startActivity(intent)
                    onDismiss()
                }
                // Telegram
                ShareActionItem(
                    icon = {
                        Icon(
                            Icons.AutoMirrored.Outlined.Send,
                            contentDescription = "Telegram",
                            tint = Color(0xFF229ED9),
                        )
                    },
                    label = "Telegram",
                    modifier = Modifier.weight(1f),
                ) {
                    val intent = Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse(
                            "https://t.me/share/url?url=${Uri.encode(postUrl)}" +
                                "&text=${Uri.encode(title)}",
                        ),
                    )
                    context.startActivity(intent)
                    onDismiss()
                }
                // Twitter/X
                ShareActionItem(
                    icon = {
                        Icon(
                            Icons.Default.Share,
                            contentDescription = "Twitter",
                            tint = Color(0xFF1DA1F2),
                        )
                    },
                    label = "Twitter",
                    modifier = Modifier.weight(1f),
                ) {
                    val intent = Intent(
                        Intent.ACTION_VIEW,
                        Uri.parse("https://twitter.com/intent/tweet?text=${Uri.encode(shareText)}"),
                    )
                    context.startActivity(intent)
                    onDismiss()
                }
                // Email
                ShareActionItem(
                    icon = {
                        Icon(
                            Icons.Default.Email,
                            contentDescription = "Email",
                            tint = Color(0xFFEA4335),
                        )
                    },
                    label = "Email",
                    modifier = Modifier.weight(1f),
                ) {
                    val intent = Intent(Intent.ACTION_SEND).apply {
                        type = "message/rfc822"
                        putExtra(Intent.EXTRA_SUBJECT, title)
                        putExtra(Intent.EXTRA_TEXT, shareText)
                    }
                    context.startActivity(Intent.createChooser(intent, "Send Email"))
                    onDismiss()
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun ShareActionItem(
    icon: @Composable () -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Column(
        modifier = modifier
            .clickable { onClick() }
            .padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        icon()
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
        )
    }
}

// ─────────────────────────────────────────────────────────────
// 2. BuyerInterestModal
// ─────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BuyerInterestModal(
    postId: String,
    postTitle: String,
    onDismiss: () -> Unit,
    onSubmit: (name: String, phone: String, message: String) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }

    val truncatedTitle =
        if (postTitle.length > 40) postTitle.take(40) + "…" else postTitle
    val isSubmitEnabled = name.length >= 2 && phone.length == 10

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 8.dp)
                .navigationBarsPadding(),
        ) {
            Text(
                text = "I'm Interested",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = truncatedTitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(modifier = Modifier.height(16.dp))
            OutlinedTextField(
                value = name,
                onValueChange = { name = it },
                label = { Text("Name") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedTextField(
                value = phone,
                onValueChange = { if (it.length <= 10) phone = it },
                label = { Text("Phone") },
                placeholder = { Text("10-digit phone number") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            )
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedTextField(
                value = message,
                onValueChange = { message = it },
                label = { Text("Message") },
                placeholder = { Text("Any questions about this item?") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3,
                maxLines = 3,
            )
            Spacer(modifier = Modifier.height(20.dp))
            Button(
                onClick = { onSubmit(name, phone, message) },
                enabled = isSubmitEnabled,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Submit")
            }
            Spacer(modifier = Modifier.height(8.dp))
            TextButton(
                onClick = onDismiss,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Cancel")
            }
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

// ─────────────────────────────────────────────────────────────
// 3. PostActionRow
// ─────────────────────────────────────────────────────────────

@Composable
fun PostActionRow(
    postId: String,
    likeCount: Int = 0,
    viewCount: Int = 0,
    isLiked: Boolean = false,
    isWishlisted: Boolean = false,
    onLike: () -> Unit = {},
    onInterested: () -> Unit = {},
    onShare: () -> Unit = {},
    onWishlist: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceEvenly,
    ) {
        // Like
        ActionItem(
            icon = {
                Icon(
                    imageVector = if (isLiked) Icons.Filled.Favorite
                    else Icons.Default.FavoriteBorder,
                    contentDescription = "Like",
                    tint = if (isLiked) Color(0xFFE53935)
                    else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            },
            label = likeCount.toString(),
            onClick = onLike,
            modifier = Modifier.weight(1f),
        )
        // Interested
        ActionItem(
            icon = {
                Icon(
                    imageVector = Icons.Outlined.FavoriteBorder,
                    contentDescription = "Interested",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            },
            label = "Interested",
            onClick = onInterested,
            modifier = Modifier.weight(1f),
        )
        // Share
        ActionItem(
            icon = {
                Icon(
                    imageVector = Icons.Outlined.Share,
                    contentDescription = "Share",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            },
            label = "Share",
            onClick = onShare,
            modifier = Modifier.weight(1f),
        )
        // View Count
        ActionItem(
            icon = {
                Icon(
                    imageVector = Icons.Default.Visibility,
                    contentDescription = "Views",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            },
            label = viewCount.toString(),
            onClick = {},
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun ActionItem(
    icon: @Composable () -> Unit,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .clickable { onClick() }
            .padding(horizontal = 4.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        icon()
        Spacer(modifier = Modifier.width(4.dp))
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

// ─────────────────────────────────────────────────────────────
// 4. PostMoreMenuButton
// ─────────────────────────────────────────────────────────────

@Composable
fun PostMoreMenuButton(
    postId: String,
    isOwner: Boolean = false,
    onShare: () -> Unit = {},
    onSave: () -> Unit = {},
    onReport: () -> Unit = {},
    onAddToCart: () -> Unit = {},
    onPromote: () -> Unit = {},
    onDelete: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }

    Box(modifier = modifier) {
        IconButton(onClick = { expanded = true }) {
            Icon(Icons.Default.MoreVert, contentDescription = "More options")
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
        ) {
            DropdownMenuItem(
                text = { Text("Share") },
                leadingIcon = { Icon(Icons.Outlined.Share, contentDescription = null) },
                onClick = { expanded = false; onShare() },
            )
            DropdownMenuItem(
                text = { Text("Save") },
                leadingIcon = { Icon(Icons.Default.BookmarkBorder, contentDescription = null) },
                onClick = { expanded = false; onSave() },
            )
            DropdownMenuItem(
                text = { Text("Add to Cart") },
                leadingIcon = { Icon(Icons.Outlined.ShoppingCart, contentDescription = null) },
                onClick = { expanded = false; onAddToCart() },
            )
            if (isOwner) {
                DropdownMenuItem(
                    text = { Text("Promote") },
                    leadingIcon = { Icon(Icons.AutoMirrored.Filled.TrendingUp, contentDescription = null) },
                    onClick = { expanded = false; onPromote() },
                )
                DropdownMenuItem(
                    text = { Text("Delete", color = Color(0xFFE53935)) },
                    leadingIcon = {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = null,
                            tint = Color(0xFFE53935),
                        )
                    },
                    onClick = { expanded = false; onDelete() },
                )
            }
            if (!isOwner) {
                DropdownMenuItem(
                    text = { Text("Report") },
                    leadingIcon = { Icon(Icons.Default.Flag, contentDescription = null) },
                    onClick = { expanded = false; onReport() },
                )
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────
// 5. PromoBadgeRow
// ─────────────────────────────────────────────────────────────

@Composable
fun PromoBadgeRow(
    isBoosted: Boolean = false,
    isFeatured: Boolean = false,
    isHotDeal: Boolean = false,
    isJustListed: Boolean = false,
    modifier: Modifier = Modifier,
) {
    if (!isBoosted && !isFeatured && !isHotDeal && !isJustListed) return

    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (isHotDeal) {
            BadgeChip(
                label = "🔥 Hot Deal",
                brush = Brush.horizontalGradient(listOf(Color(0xFFFF5722), Color(0xFFFF9800))),
            )
        }
        if (isBoosted) {
            BadgeChip(
                label = "⚡ Boosted",
                brush = Brush.horizontalGradient(listOf(Color(0xFF7C3AED), Color(0xFF4F46E5))),
            )
        }
        if (isJustListed) {
            BadgeChip(
                label = "🆕 Just Listed",
                brush = Brush.horizontalGradient(listOf(Color(0xFF22C55E), Color(0xFF16A34A))),
            )
        }
        if (isFeatured) {
            BadgeChip(
                label = "⭐ Featured",
                brush = Brush.horizontalGradient(listOf(Color(0xFFF59E0B), Color(0xFFD97706))),
            )
        }
    }
}

@Composable
private fun BadgeChip(
    label: String,
    brush: Brush,
) {
    Box(
        modifier = Modifier
            .background(brush, shape = RoundedCornerShape(6.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp),
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = Color.White,
        )
    }
}

// ─────────────────────────────────────────────────────────────
// 6. GreatDealsBanner
// ─────────────────────────────────────────────────────────────

@Composable
fun GreatDealsBanner(
    onShopNow: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.horizontalGradient(
                        listOf(Color(0xFFFFF7ED), Color(0xFFFEF3C7)),
                    ),
                )
                .padding(horizontal = 16.dp, vertical = 12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "🔥",
                        fontSize = 32.sp,
                    )
                    Text(
                        text = "Great Deals",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF92400E),
                    )
                    Text(
                        text = "Handpicked savings just for you",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF78350F),
                    )
                }
                FilledTonalButton(onClick = onShopNow) {
                    Text("Shop Now")
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────
// 7. BackToTopButton
// ─────────────────────────────────────────────────────────────

@Composable
fun BackToTopButton(
    listState: LazyListState,
    coroutineScope: CoroutineScope,
    modifier: Modifier = Modifier,
) {
    val visible = listState.firstVisibleItemIndex > 3

    AnimatedVisibility(visible = visible) {
        SmallFloatingActionButton(
            onClick = {
                coroutineScope.launch {
                    listState.animateScrollToItem(0)
                }
            },
            modifier = modifier,
        ) {
            Icon(Icons.Default.KeyboardArrowUp, contentDescription = "Back to top")
        }
    }
}

// ─────────────────────────────────────────────────────────────
// 8. ImageZoomDialog
// ─────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ImageZoomDialog(
    imageUrls: List<String>,
    initialIndex: Int = 0,
    onDismiss: () -> Unit,
) {
    val pagerState = rememberPagerState(initialPage = initialIndex) { imageUrls.size }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            dismissOnBackPress = true,
            dismissOnClickOutside = false,
        ),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black),
        ) {
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxSize(),
            ) { page ->
                AsyncImage(
                    model = imageUrls[page],
                    contentDescription = "Image ${page + 1}",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.fillMaxSize(),
                )
            }

            // Image count indicator (top-left)
            if (imageUrls.size > 1) {
                Text(
                    text = "${pagerState.currentPage + 1} / ${imageUrls.size}",
                    color = Color.White,
                    style = MaterialTheme.typography.labelMedium,
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(16.dp)
                        .background(
                            Color.Black.copy(alpha = 0.5f),
                            RoundedCornerShape(4.dp),
                        )
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                )
            }

            // Close button (top-right)
            IconButton(
                onClick = onDismiss,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(8.dp),
            ) {
                Icon(
                    Icons.Default.Close,
                    contentDescription = "Close",
                    tint = Color.White,
                )
            }

            // Page indicator dots (bottom-center)
            if (imageUrls.size > 1) {
                Row(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .padding(bottom = 24.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    repeat(imageUrls.size) { index ->
                        val isSelected = pagerState.currentPage == index
                        Box(
                            modifier = Modifier
                                .size(if (isSelected) 10.dp else 7.dp)
                                .clip(CircleShape)
                                .background(
                                    if (isSelected) Color.White
                                    else Color.White.copy(alpha = 0.5f),
                                ),
                        )
                    }
                }
            }
        }
    }
}
