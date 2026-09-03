package com.zaruda.app.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.text.SimpleDateFormat
import java.util.*

/** Personalized greeting based on time of day */
@Composable
fun PersonalizedGreeting(
    userName: String = "",
    streakDays: Int = 0,
    modifier: Modifier = Modifier,
) {
    val greeting = remember {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        when {
            hour < 12 -> "Good Morning"
            hour < 17 -> "Good Afternoon"
            else -> "Good Evening"
        }
    }
    val displayName = if (userName.isNotBlank()) ", $userName" else ""

    Row(
        modifier = modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column {
            Text(
                "$greeting$displayName \u2728",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground,
            )
            Text(
                "Find amazing deals near you",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        // Daily streak badge
        if (streakDays > 0) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = Color(0xFFF59E0B).copy(alpha = 0.12f),
                modifier = Modifier.clickable { },
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    Text("\uD83D\uDCB0", fontSize = 14.sp)
                    Text(
                        "${streakDays}d streak",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFFD97706),
                    )
                }
            }
        }
    }
}

/** Story bubbles tray — horizontal scrollable circles for flash sales, categories */
data class StoryBubble(
    val emoji: String,
    val label: String,
    val gradient: List<Color>,
    val onClick: () -> Unit = {},
)

@Composable
fun StoryBubblesTray(
    modifier: Modifier = Modifier,
) {
    val bubbles = remember {
        listOf(
            StoryBubble("\u26A1", "Flash Sales", listOf(Color(0xFFF59E0B), Color(0xFFEF4444))),
            StoryBubble("\uD83D\uDEE1\uFE0F", "Top Sellers", listOf(Color(0xFF10B981), Color(0xFF059669))),
            StoryBubble("\uD83D\uDCF1", "Electronics", listOf(Color(0xFF3B82F6), Color(0xFF2563EB))),
            StoryBubble("\uD83D\uDE97", "Vehicles", listOf(Color(0xFF8B5CF6), Color(0xFF7C3AED))),
            StoryBubble("\uD83D\uDC57", "Fashion", listOf(Color(0xFFEC4899), Color(0xFFDB2777))),
            StoryBubble("\uD83C\uDFE0", "Home", listOf(Color(0xFF14B8A6), Color(0xFF0D9488))),
        )
    }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        bubbles.forEach { bubble ->
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.clickable { bubble.onClick() },
            ) {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(CircleShape)
                        .background(Brush.verticalGradient(bubble.gradient))
                        .border(2.5.dp, Color.White, CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(bubble.emoji, fontSize = 26.sp)
                }
                Spacer(Modifier.height(4.dp))
                Text(
                    bubble.label,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 10.sp,
                )
            }
        }
    }
}

/** Flash sale countdown banner */
@Composable
fun FlashSaleBanner(
    modifier: Modifier = Modifier,
    endTimeMillis: Long = System.currentTimeMillis() + 2 * 3600_000 + 14 * 60_000 + 5_000,
) {
    var remaining by remember { mutableLongStateOf(endTimeMillis - System.currentTimeMillis()) }

    LaunchedEffect(Unit) {
        while (remaining > 0) {
            remaining = endTimeMillis - System.currentTimeMillis()
            kotlinx.coroutines.delay(1000)
        }
    }

    val hours = (remaining / 3600_000).toInt()
    val minutes = ((remaining % 3600_000) / 60_000).toInt()
    val seconds = ((remaining % 60_000) / 1000).toInt()

    Surface(
        modifier = modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(16.dp),
        color = Color.Transparent,
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(
                    Brush.horizontalGradient(
                        listOf(Color(0xFFEF4444), Color(0xFFF59E0B))
                    )
                )
                .padding(14.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.Bolt, null, tint = Color.White, modifier = Modifier.size(20.dp))
                    Column {
                        Text("Flash Deals", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                        Text("Limited time offers", color = Color.White.copy(alpha = 0.8f), fontSize = 11.sp)
                    }
                }
                Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = Color.White.copy(alpha = 0.2f),
                ) {
                    Text(
                        "%02dh : %02dm : %02ds".format(hours, minutes, seconds),
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                    )
                }
            }
        }
    }
}

/** Trending search pills */
@Composable
fun TrendingSearchPills(
    modifier: Modifier = Modifier,
    onPillClick: (String) -> Unit = {},
) {
    val trending = listOf(
        "\uD83D\uDD25 iPhone 15", "Royal Enfield", "PS5", "MacBook M3",
        "Nike Air Max", "Samsung S24", "IKEA Furniture",
    )

    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        trending.forEach { item ->
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                modifier = Modifier.clickable { onPillClick(item) },
            ) {
                Text(
                    item,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
            }
        }
    }
}
