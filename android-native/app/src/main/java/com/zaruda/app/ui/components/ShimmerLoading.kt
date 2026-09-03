package com.zaruda.app.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/** Shimmer color palette */
private val ShimmerLight = listOf(
    Color(0xFFE2E8F0).copy(alpha = 0.6f),
    Color(0xFFF1F5F9).copy(alpha = 0.8f),
    Color(0xFFE2E8F0).copy(alpha = 0.6f),
)
private val ShimmerDark = listOf(
    Color(0xFF1E293B).copy(alpha = 0.6f),
    Color(0xFF334155).copy(alpha = 0.8f),
    Color(0xFF1E293B).copy(alpha = 0.6f),
)

@Composable
fun shimmerBrush(isDark: Boolean = false): Brush {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateX by transition.animateFloat(
        initialValue = -300f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = FastOutSlowInEasing),
        ),
        label = "shimmerX",
    )
    val colors = if (isDark) ShimmerDark else ShimmerLight
    return Brush.linearGradient(
        colors = colors,
        start = Offset(translateX, 0f),
        end = Offset(translateX + 300f, 0f),
    )
}

/** Shimmer placeholder for a post card */
@Composable
fun ShimmerPostCard(isDark: Boolean = false) {
    val brush = shimmerBrush(isDark)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        // Image placeholder
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(180.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(brush)
        )
        // Title placeholder
        Box(
            modifier = Modifier
                .width(200.dp)
                .height(16.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(brush)
        )
        // Price placeholder
        Box(
            modifier = Modifier
                .width(100.dp)
                .height(20.dp)
                .clip(RoundedCornerShape(4.dp))
                .background(brush)
        )
        // Location + views row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                modifier = Modifier
                    .width(120.dp)
                    .height(12.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(brush)
            )
            Box(
                modifier = Modifier
                    .width(50.dp)
                    .height(12.dp)
                    .clip(RoundedCornerShape(4.dp))
                    .background(brush)
            )
        }
    }
}

/** Shimmer placeholder for a list item (grid card) */
@Composable
fun ShimmerGridCard(isDark: Boolean = false) {
    val brush = shimmerBrush(isDark)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp)),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(120.dp)
                .clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp))
                .background(brush)
        )
        Column(modifier = Modifier.padding(8.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Box(modifier = Modifier.fillMaxWidth(0.8f).height(14.dp).clip(RoundedCornerShape(4.dp)).background(brush))
            Box(modifier = Modifier.width(80.dp).height(18.dp).clip(RoundedCornerShape(4.dp)).background(brush))
            Box(modifier = Modifier.fillMaxWidth(0.5f).height(10.dp).clip(RoundedCornerShape(4.dp)).background(brush))
        }
    }
}

/** Shimmer placeholder for profile header */
@Composable
fun ShimmerProfileHeader(isDark: Boolean = false) {
    val brush = shimmerBrush(isDark)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // Avatar
        Box(
            modifier = Modifier
                .size(72.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(brush)
        )
        // Name
        Box(modifier = Modifier.width(160.dp).height(20.dp).clip(RoundedCornerShape(4.dp)).background(brush))
        // Subtitle
        Box(modifier = Modifier.width(100.dp).height(14.dp).clip(RoundedCornerShape(4.dp)).background(brush))
        // Stats row
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            repeat(3) {
                Box(modifier = Modifier.width(60.dp).height(36.dp).clip(RoundedCornerShape(8.dp)).background(brush))
            }
        }
    }
}
