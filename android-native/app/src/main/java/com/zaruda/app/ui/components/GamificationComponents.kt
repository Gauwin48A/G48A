package com.zaruda.app.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

/** 7-day daily check-in streak tracker */
@Composable
fun DailyCheckInStreak(
    currentStreak: Int = 0,
    todayCheckedIn: Boolean = false,
    onCheckIn: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    val days = listOf("Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun")
    val coinRewards = listOf(5, 10, 10, 15, 15, 20, 50) // coins earned per day (progressive ladder)

    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 2.dp,
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Daily Check-In", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                if (currentStreak > 0) {
                    Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFFEF3C7)) {
                        Text(
                            "\uD83D\uDD25 $currentStreak day streak",
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFFD97706),
                        )
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                days.forEachIndexed { index, day ->
                    val isCheckedIn = index < currentStreak
                    val isToday = index == currentStreak && !todayCheckedIn
                    val reward = coinRewards[index]

                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Box(
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(
                                    when {
                                        isCheckedIn -> Brush.linearGradient(listOf(Color(0xFF10B981), Color(0xFF059669)))
                                        isToday -> Brush.linearGradient(listOf(Color(0xFFF59E0B), Color(0xFFD97706)))
                                        else -> Brush.linearGradient(listOf(Color(0xFFE2E8F0), Color(0xFFCBD5E1)))
                                    }
                                )
                                .then(
                                    if (isToday) Modifier.border(2.dp, Color(0xFFF59E0B), CircleShape)
                                    else Modifier
                                )
                                .clickable(enabled = isToday) { onCheckIn() },
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                when {
                                    isCheckedIn -> "\u2714"
                                    isToday -> "\uD83C\uDF1F"
                                    else -> "\uD83D\uDD14"
                                },
                                fontSize = 16.sp,
                            )
                        }
                        Text(day, fontSize = 9.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("+$reward", fontSize = 9.sp, color = Color(0xFF10B981), fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

/** Confetti celebration animation — Canvas-based particle system */
@Composable
fun ConfettiCelebration(
    isActive: Boolean = false,
    modifier: Modifier = Modifier,
) {
    if (!isActive) return

    val particles = remember {
        List(60) {
            ConfettiParticle(
                x = Random.nextFloat(),
                y = -Random.nextFloat() * 0.3f,
                color = listOf(
                    Color(0xFFF59E0B), Color(0xFFEF4444), Color(0xFF10B981),
                    Color(0xFF3B82F6), Color(0xFF8B5CF6), Color(0xFFEC4899),
                ).random(),
                size = Random.nextFloat() * 8f + 4f,
                speed = Random.nextFloat() * 0.02f + 0.01f,
                rotation = Random.nextFloat() * 360f,
                rotSpeed = Random.nextFloat() * 10f - 5f,
            )
        }
    }

    val transition = rememberInfiniteTransition(label = "confetti")
    val progress by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = LinearEasing),
        ),
        label = "confettiProgress",
    )

    Canvas(modifier = modifier.fillMaxSize()) {
        particles.forEach { particle ->
            val y = (particle.y + progress * particle.speed * 30f) % 1.3f
            val x = particle.x + sin(progress * particle.rotSpeed) * 0.05f
            val alpha = (1f - y).coerceIn(0f, 1f)

            drawCircle(
                color = particle.color.copy(alpha = alpha),
                radius = particle.size,
                center = Offset(x * size.width, y * size.height),
            )
        }
    }
}

private data class ConfettiParticle(
    val x: Float,
    val y: Float,
    val color: Color,
    val size: Float,
    val speed: Float,
    val rotation: Float,
    val rotSpeed: Float,
)
