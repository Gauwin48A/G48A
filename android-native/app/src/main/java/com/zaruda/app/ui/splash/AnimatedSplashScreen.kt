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
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
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
    val haptic = LocalHapticFeedback.current

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
        delay(150)
        logoScale = 1f
        // Tactile tick the instant the golden trust spark ✦ springs into visibility.
        delay(160)
        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
        delay(90)
        glowAlpha = 0.6f
        delay(200)
        taglineVisible = true
        delay(150)
        badgeVisible = true
        delay(100)
        contentVisible = true
        // Hard cap: splash never exceeds 1200ms total (quick, snappy launch).
        delay(350)
        onSplashFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B0F19)),
        contentAlignment = Alignment.Center,
    ) {
        // ── Scenic Alpine Backdrop (Matching Home Screen) ──
        coil.compose.AsyncImage(
            model = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
            contentDescription = null,
            contentScale = androidx.compose.ui.layout.ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )
        // Dark vignette overlay
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color(0xFF0B0F19).copy(alpha = 0.45f),
                            Color(0xFF0B0F19).copy(alpha = 0.88f),
                            Color(0xFF0B0F19),
                        )
                    )
                )
        )

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            // Glowing Ambient Emblem
            Box(contentAlignment = Alignment.Center) {
                // Radial Sapphire Aura
                Box(
                    modifier = Modifier
                        .size(180.dp)
                        .scale(glowScale * glowAlpha)
                        .clip(CircleShape)
                        .background(
                            Brush.radialGradient(
                                listOf(Color(0xFF2563EB).copy(alpha = 0.45f), Color(0xFF2563EB).copy(alpha = 0f))
                            )
                        )
                )
                // Prism Shield Monogram
                Box(
                    modifier = Modifier
                        .size(124.dp)
                        .scale(scaleAnim.value)
                        .shadow(28.dp, RoundedCornerShape(32.dp), ambientColor = Color(0xFF2563EB).copy(alpha = 0.6f))
                        .clip(RoundedCornerShape(32.dp))
                        .background(
                            Brush.linearGradient(
                                listOf(Color(0xFF1E3A8A), Color(0xFF2563EB), Color(0xFF3B82F6))
                            )
                        )
                        .border(1.5.dp, Color.White.copy(alpha = 0.35f), RoundedCornerShape(32.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = Icons.Filled.Storefront,
                            contentDescription = null,
                            tint = Color.White,
                            modifier = Modifier.size(64.dp),
                        )
                        Text(
                            text = "✦",
                            fontSize = 26.sp,
                            color = Color(0xFFF59E0B),
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(top = 4.dp, end = 4.dp)
                        )
                    }
                }
            }

            Spacer(Modifier.height(32.dp))

            // Editorial Brand Header — brand name intentionally generic until
            // the final app-name decision (see /DECISIONS.md at repo root).
            Text(
                text = "M A R K E T P L A C E",
                color = Color.White,
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 6.sp,
            )

            Spacer(Modifier.height(10.dp))

            AnimatedVisibility(
                visible = taglineVisible,
                enter = fadeIn(tween(600)) + scaleIn(initialScale = 0.85f, animationSpec = tween(600)),
            ) {
                Text(
                    text = "Deals & Direct Sellers • Verified",
                    color = Color.White.copy(alpha = 0.9f),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium,
                    letterSpacing = 0.5.sp,
                )
            }

            Spacer(Modifier.height(16.dp))

            AnimatedVisibility(
                visible = badgeVisible,
                enter = fadeIn(tween(500)) + scaleIn(initialScale = 0.6f, animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy)),
            ) {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color.White.copy(alpha = 0.12f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.2f)),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Text("🛡️", fontSize = 13.sp)
                        Text("Verified Local Deals", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                        Text("•", color = Color.White.copy(alpha = 0.5f), fontSize = 12.sp)
                        Text("Aadhaar Verified", color = Color(0xFF60A5FA), fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(Modifier.height(36.dp))

            AnimatedVisibility(visible = contentVisible, enter = fadeIn()) {
                LoadingDots()
            }
        }

        AnimatedVisibility(
            visible = contentVisible,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 36.dp),
            enter = fadeIn(tween(800)),
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "🇮🇳 Made with ❤️ for India",
                    color = Color.White.copy(alpha = 0.65f),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }

        Text(
            text = "v1.2.0",
            color = Color.White.copy(alpha = 0.4f),
            fontSize = 10.sp,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 12.dp)
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
