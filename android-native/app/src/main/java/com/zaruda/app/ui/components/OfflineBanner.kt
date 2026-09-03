package com.zaruda.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zaruda.app.core.ConnectivityObserver
import kotlinx.coroutines.delay

@Composable
fun OfflineBanner(connectivityObserver: ConnectivityObserver) {
    val isOnline by connectivityObserver.isOnline.collectAsState(initial = true)
    var wasOffline by remember { mutableStateOf(false) }
    var showBackOnline by remember { mutableStateOf(false) }

    LaunchedEffect(isOnline) {
        if (!isOnline) {
            wasOffline = true
            showBackOnline = false
        } else if (wasOffline) {
            showBackOnline = true
            delay(2400)
            showBackOnline = false
            wasOffline = false
        }
    }

    val isVisible = !isOnline || showBackOnline
    val bgColor by animateColorAsState(
        targetValue = if (!isOnline) Color(0xFFEF4444) else Color(0xFF10B981),
        animationSpec = tween(400),
        label = "bannerBg",
    )

    AnimatedVisibility(
        visible = isVisible,
        enter = expandVertically(),
        exit = shrinkVertically(),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(bgColor)
                .padding(vertical = 6.dp, horizontal = 12.dp),
            contentAlignment = Alignment.Center,
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(Color.White)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = if (!isOnline) "No internet connection • Using cached data" else "✓ Back online",
                    color = Color.White,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp,
                )
            }
        }
    }
}
