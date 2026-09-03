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
import androidx.compose.runtime.mutableIntStateOf
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

/**
 * 3-state progressive connectivity banner (UI/UX Checklist #42.3):
 * - Red: "No internet connection"
 * - Amber: "Reconnecting..."
 * - Green: "Back online ✓" (auto-dismisses after 2s)
 */
@Composable
fun OfflineBanner(connectivityObserver: ConnectivityObserver) {
    val isOnline by connectivityObserver.isOnline.collectAsState(initial = true)
    var wasOffline by remember { mutableStateOf(false) }
    var bannerState by remember { mutableIntStateOf(0) } // 0=hidden, 1=offline, 2=reconnecting, 3=back-online

    LaunchedEffect(isOnline) {
        if (!isOnline) {
            wasOffline = true
            bannerState = 1 // Red: "No internet"
        } else if (wasOffline) {
            bannerState = 2 // Amber: "Reconnecting..."
            delay(1500)
            bannerState = 3 // Green: "Back online ✓"
            delay(2400)
            bannerState = 0 // Hidden
            wasOffline = false
        } else {
            bannerState = 0
        }
    }

    val isVisible = bannerState != 0
    val bgColor by animateColorAsState(
        targetValue = when (bannerState) {
            1 -> Color(0xFFEF4444) // Red
            2 -> Color(0xFFF59E0B) // Amber
            3 -> Color(0xFF10B981) // Green
            else -> Color(0xFFEF4444)
        },
        animationSpec = tween(400),
        label = "bannerBg",
    )

    val bannerText = when (bannerState) {
        1 -> "No internet connection"
        2 -> "Reconnecting..."
        3 -> "✓ Back online"
        else -> ""
    }

    val dotColor = when (bannerState) {
        1 -> Color.White.copy(alpha = 0.8f)
        2 -> Color.White.copy(alpha = 0.9f)
        3 -> Color.White
        else -> Color.White
    }

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
                        .background(dotColor)
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = bannerText,
                    color = Color.White,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp,
                )
            }
        }
    }
}
