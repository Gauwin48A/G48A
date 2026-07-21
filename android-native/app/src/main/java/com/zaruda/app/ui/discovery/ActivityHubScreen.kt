package com.zaruda.app.ui.discovery

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

private data class ActivityItem(
    val key: String,
    val label: String,
    val description: String,
    val icon: ImageVector,
    val tint: Color,
    val bgColor: Color,
    val requiresAuth: Boolean = true,
)

private val ACTIVITY_ITEMS = listOf(
    ActivityItem(
        key = "chat",
        label = "Messages",
        description = "View your conversations and messages",
        icon = Icons.AutoMirrored.Filled.Chat,
        tint = Color(0xFF2563EB),
        bgColor = Color(0xFFEFF6FF),
    ),
    ActivityItem(
        key = "offers",
        label = "Offers & Negotiations",
        description = "Manage your price negotiations",
        icon = Icons.Default.LocalOffer,
        tint = Color(0xFF7C3AED),
        bgColor = Color(0xFFF5F3FF),
    ),
    ActivityItem(
        key = "reviews",
        label = "Reviews",
        description = "Check your ratings and reviews",
        icon = Icons.Default.Star,
        tint = Color(0xFFD97706),
        bgColor = Color(0xFFFFFBEB),
        requiresAuth = true,
    ),

    ActivityItem(
        key = "wishlist",
        label = "Wishlist",
        description = "Items you have saved",
        icon = Icons.Default.Bookmark,
        tint = Color(0xFF6366F1),
        bgColor = Color(0xFFF5F3FF),
    ),
    ActivityItem(
        key = "cart",
        label = "Cart",
        description = "Items ready for checkout",
        icon = Icons.Default.ShoppingCart,
        tint = Color(0xFF0891B2),
        bgColor = Color(0xFFECFEFF),
    ),
    ActivityItem(
        key = "my-posts",
        label = "My Listings",
        description = "Your active and sold posts",
        icon = Icons.Default.Inventory2,
        tint = Color(0xFF6D28D9),
        bgColor = Color(0xFFF5F3FF),
    ),
    ActivityItem(
        key = "notifications",
        label = "Notifications",
        description = "Alerts, updates and messages",
        icon = Icons.Default.Notifications,
        tint = Color(0xFFDB2777),
        bgColor = Color(0xFFFDF2F8),
    ),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActivityHubScreen(
    onNavigate: (String) -> Unit = {},
    onBack: () -> Unit = {},
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Activity Hub", fontWeight = FontWeight.Bold)
                        Text("Quick access to your activity", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            // Hero
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Brush.linearGradient(listOf(Color(0xFF1E40AF), Color(0xFF7C3AED))))
                    .padding(16.dp),
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Activity Hub", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                    Text(
                        "Quick access to your conversations, offers, reviews, and activity.",
                        color = Color.White.copy(alpha = 0.85f),
                        fontSize = 13.sp,
                    )
                }
            }

            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(12.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                items(ACTIVITY_ITEMS, key = { it.key }) { item ->
                    ActivityCard(item = item, onOpen = { onNavigate(item.key) })
                }
            }
        }
    }
}

@Composable
private fun ActivityCard(item: ActivityItem, onOpen: () -> Unit) {
    Card(
        onClick = onOpen,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(item.bgColor),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(item.icon, contentDescription = null, tint = item.tint, modifier = Modifier.size(22.dp))
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(item.label, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 1)
                    Text(
                        item.description,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                    )
                }
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Surface(
                    shape = RoundedCornerShape(999.dp),
                    color = if (item.requiresAuth) MaterialTheme.colorScheme.primaryContainer else Color(0xFFDCFCE7),
                ) {
                    Text(
                        if (item.requiresAuth) "Members only" else "Available",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (item.requiresAuth) MaterialTheme.colorScheme.primary else Color(0xFF166534),
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                    )
                }
                FilledTonalButton(
                    onClick = onOpen,
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                    modifier = Modifier.height(30.dp),
                ) {
                    Text("Open", fontSize = 11.sp)
                }
            }
        }
    }
}
