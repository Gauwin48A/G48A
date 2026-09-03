package com.zaruda.app.ui.splash

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

@Composable
fun AnimatedSplashScreen(
    onSplashFinished: () -> Unit,
) {
    var logoScale by remember { mutableFloatStateOf(0f) }
    var glowAlpha by remember { mutableFloatStateOf(0f) }
    var taglineVisible by remember { mutableStateOf(false) }
    var badgeVisible by remember { mutableStateOf(false) }
    var contentVisible by remember { mutableStateOf(false) }

    val scaleAnim = animateFloatAsState(
        targetValue = logoScale,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow,
        ),
        label = "logoScale",
    )

    val glowPulse = rememberInfiniteTransition(label = "glow")
    val glowScale by glowPulse.animateFloat(
        initialValue = 0.8f,
        targetValue = 1.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "glowScale",
    )

    LaunchedEffect(Unit) {
        delay(300)
        logoScale = 1f
        delay(600)
        glowAlpha = 0.6f
        delay(400)
        taglineVisible = true
        delay(300)
        badgeVisible = true
        delay(200)
        contentVisible = true
        delay(1800)
        onSplashFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(Color(0xFF0F172A), Color(0xFF1E3A8A), Color(0xFF3B82F6))
                )
            ),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            // Glowing logo
            Box(contentAlignment = Alignment.Center) {
                Box(
                    modifier = Modifier
                        .size(160.dp)
                        .scale(glowScale * glowAlpha)
                        .clip(CircleShape)
                        .background(
                            Brush.radialGradient(
                                listOf(Color(0xFF3B82F6).copy(alpha = 0.3f), Color(0xFF3B82F6).copy(alpha = 0f))
                            )
                        )
                )
                Box(
                    modifier = Modifier
                        .size(120.dp)
                        .scale(scaleAnim.value)
                        .shadow(24.dp, CircleShape, ambientColor = Color(0xFF3B82F6).copy(alpha = 0.5f))
                        .clip(CircleShape)
                        .background(Brush.linearGradient(listOf(Color(0xFF1E40AF), Color(0xFF3B82F6), Color(0xFF60A5FA)))),
                    contentAlignment = Alignment.Center,
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = "Z",
                            fontSize = 62.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White,
                        )
                        Text(
                            text = "✦",
                            fontSize = 24.sp,
                            color = Color(0xFFF59E0B),
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(top = 2.dp, end = 2.dp)
                        )
                    }
                }
            }

            Spacer(Modifier.height(28.dp))

            Text(
                text = "ZARUDA",
                color = Color.White,
                fontSize = 32.sp,
                fontWeight = FontWeight.ExtraBold,
                letterSpacing = 4.sp,
            )

            Spacer(Modifier.height(12.dp))

            AnimatedVisibility(
                visible = taglineVisible,
                enter = fadeIn(tween(600)) + scaleIn(initialScale = 0.8f, animationSpec = tween(600)),
            ) {
                Text("India's Safe & Verified Marketplace", color = Color.White.copy(alpha = 0.95f), fontSize = 16.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.5.sp)
            }

            Spacer(Modifier.height(14.dp))

            AnimatedVisibility(
                visible = badgeVisible,
                enter = fadeIn(tween(500)) + scaleIn(initialScale = 0.5f, animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy)),
            ) {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color.White.copy(alpha = 0.15f),
                    modifier = Modifier.border(1.dp, Color.White.copy(alpha = 0.25f), RoundedCornerShape(20.dp)),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text("\uD83D\uDEE1\uFE0F", fontSize = 14.sp)
                        Text("100% Escrow Protected", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        Text("\u00B7", color = Color.White.copy(alpha = 0.5f), fontSize = 12.sp)
                        Text("KYC Verified", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }

            Spacer(Modifier.height(40.dp))

            AnimatedVisibility(visible = contentVisible, enter = fadeIn()) {
                LoadingDots()
            }
        }

        AnimatedVisibility(
            visible = contentVisible,
            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 40.dp),
            enter = fadeIn(tween(800)),
        ) {
            Text("🇮🇳 Made with \u2764\uFE0F in India", color = Color.White.copy(alpha = 0.6f), fontSize = 12.sp, fontWeight = FontWeight.Medium)
        }

        Text(
            text = "v1.2.0",
            color = Color.White.copy(alpha = 0.5f),
            fontSize = 10.sp,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 16.dp)
        )
    }
}

@Composable
private fun LoadingDots() {
    val infiniteTransition = rememberInfiniteTransition(label = "dots")
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        repeat(3) { index ->
            val alpha by infiniteTransition.animateFloat(
                initialValue = 0.2f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(
                    animation = tween(600, delayMillis = index * 200),
                    repeatMode = RepeatMode.Reverse,
                ),
                label = "dot$index",
            )
            Box(modifier = Modifier.size(8.dp).clip(CircleShape).background(Color.White.copy(alpha = alpha)))
        }
    }
}
