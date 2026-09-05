package com.zaruda.app.ui.onboarding

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.delay

@Composable
fun BrandLaunchScreen(
    onFinished: () -> Unit,
) {
    var logoScale by remember { mutableFloatStateOf(0f) }
    var glowAlpha by remember { mutableFloatStateOf(0f) }
    var taglineVisible by remember { mutableStateOf(false) }
    var badgeVisible by remember { mutableStateOf(false) }
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
        initialValue = 0.85f,
        targetValue = 1.25f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "glowScale",
    )

    LaunchedEffect(Unit) {
        delay(100)
        logoScale = 1f
        delay(150)
        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
        glowAlpha = 0.6f
        delay(200)
        taglineVisible = true
        delay(150)
        badgeVisible = true
        delay(800)
        onFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B0F19)),
        contentAlignment = Alignment.Center,
    ) {
        // Scenic Alpine Backdrop
        AsyncImage(
            model = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
            contentDescription = null,
            contentScale = androidx.compose.ui.layout.ContentScale.Crop,
            modifier = Modifier.fillMaxSize(),
        )

        // Dark Vignette Gradient Overlay
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color(0xFF0B0F19).copy(alpha = 0.45f),
                            Color(0xFF0B0F19).copy(alpha = 0.85f),
                            Color(0xFF0B0F19),
                        )
                    )
                )
        )

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            // Glowing Ambient Monogram
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

                // 3D Faceted Prism Shield Monogram
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
                        Text(
                            text = "Z",
                            fontSize = 68.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White,
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

            Spacer(modifier = Modifier.height(28.dp))

            // Editorial Brand Header
            Text(
                text = "Z A R U D A",
                fontSize = 32.sp,
                fontWeight = FontWeight.Black,
                color = Color.White,
                letterSpacing = 6.sp,
            )

            Spacer(modifier = Modifier.height(10.dp))

            AnimatedVisibility(
                visible = taglineVisible,
                enter = fadeIn(tween(500)) + scaleIn(initialScale = 0.9f),
            ) {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = Color(0xFF2563EB).copy(alpha = 0.25f),
                    border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF3B82F6).copy(alpha = 0.4f)),
                    modifier = Modifier.padding(horizontal = 16.dp),
                ) {
                    Text(
                        text = "INDIA'S SAFE & VERIFIED MARKETPLACE",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF93C5FD),
                        letterSpacing = 1.5.sp,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 7.dp),
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            AnimatedVisibility(
                visible = badgeVisible,
                enter = fadeIn(tween(500)),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    Text("🛡️", fontSize = 13.sp)
                    Text(
                        text = "100% Verified Local Deals",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.White.copy(alpha = 0.8f),
                    )
                }
            }
        }

        Text(
            text = "🇮🇳 Made with ❤️ for India",
            color = Color.White.copy(alpha = 0.55f),
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 36.dp)
        )
    }
}
