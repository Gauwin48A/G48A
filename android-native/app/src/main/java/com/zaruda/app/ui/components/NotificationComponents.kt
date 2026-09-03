package com.zaruda.app.ui.components

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Live activity status timeline — order/escrow tracking */
data class TimelineStep(
    val label: String,
    val emoji: String,
    val isCompleted: Boolean,
    val isCurrent: Boolean,
)

@Composable
fun OrderTimeline(
    steps: List<TimelineStep>,
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 1.dp,
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(0.dp)) {
            Text("Order Status", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            Spacer(Modifier.height(12.dp))

            steps.forEachIndexed { index, step ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .animateContentSize(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    // Step indicator
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .clip(CircleShape)
                            .background(
                                when {
                                    step.isCompleted -> Brush.linearGradient(listOf(Color(0xFF10B981), Color(0xFF059669)))
                                    step.isCurrent -> Brush.linearGradient(listOf(Color(0xFF3B82F6), Color(0xFF2563EB)))
                                    else -> Brush.linearGradient(listOf(Color(0xFFE2E8F0), Color(0xFFCBD5E1)))
                                }
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            if (step.isCompleted) "\u2714" else step.emoji,
                            fontSize = 14.sp,
                        )
                    }

                    Spacer(Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            step.label,
                            fontWeight = if (step.isCurrent) FontWeight.Bold else FontWeight.Medium,
                            fontSize = 13.sp,
                            color = when {
                                step.isCompleted -> Color(0xFF059669)
                                step.isCurrent -> MaterialTheme.colorScheme.primary
                                else -> MaterialTheme.colorScheme.onSurfaceVariant
                            },
                        )
                    }

                    if (step.isCurrent) {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.primaryContainer,
                        ) {
                            Text(
                                "In Progress",
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }
                }

                // Connector line
                if (index < steps.lastIndex) {
                    Box(
                        modifier = Modifier
                            .padding(start = 15.dp)
                            .width(2.dp)
                            .height(20.dp)
                            .clip(RoundedCornerShape(1.dp))
                            .background(
                                if (step.isCompleted) Color(0xFF10B981)
                                else Color(0xFFE2E8F0)
                            )
                    )
                }
            }
        }
    }
}

/** Non-intrusive toast alert banner */
@Composable
fun ToastAlertBanner(
    message: String,
    emoji: String = "\uD83D\uDD14",
    modifier: Modifier = Modifier,
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.9f),
        shadowElevation = 4.dp,
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(emoji, fontSize = 18.sp)
            Text(
                message,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.weight(1f),
            )
        }
    }
}
