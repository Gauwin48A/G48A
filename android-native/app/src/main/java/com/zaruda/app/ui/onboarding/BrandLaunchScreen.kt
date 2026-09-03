package com.zaruda.app.ui.onboarding

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay

@Composable
fun BrandLaunchScreen(
    onFinished: () -> Unit,
) {
    var startAnim by remember { mutableStateOf(false) }

    val scale by animateFloatAsState(
        targetValue = if (startAnim) 1.0f else 0.4f,
        animationSpec = tween(durationMillis = 800, easing = FastOutSlowInEasing),
        label = "logoScale",
    )

    val alpha by animateFloatAsState(
        targetValue = if (startAnim) 1.0f else 0.0f,
        animationSpec = tween(durationMillis = 700, easing = FastOutSlowInEasing),
        label = "logoAlpha",
    )

    LaunchedEffect(Unit) {
        startAnim = true
        delay(1400)
        onFinished()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(
                        Color(0xFF0A1128),
                        Color(0xFF0F172A),
                        Color(0xFF1E3A8A),
                    )
                )
            ),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier
                .scale(scale)
                .alpha(alpha),
        ) {
            // Glowing outer aura with Zaruda Z Brand Emblem
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF3B82F6).copy(alpha = 0.25f)),
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    modifier = Modifier
                        .size(88.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                listOf(Color(0xFF1D4ED8), Color(0xFF3B82F6), Color(0xFF60A5FA))
                            )
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Text(
                            text = "Z",
                            fontSize = 44.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White,
                        )
                        // Golden Trust Spark on top right
                        Text(
                            text = "✦",
                            fontSize = 18.sp,
                            color = Color(0xFFF59E0B),
                            modifier = Modifier
                                .align(Alignment.TopEnd)
                                .padding(top = 2.dp, end = 2.dp)
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(22.dp))

            Text(
                text = "ZARUDA",
                fontSize = 34.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color.White,
                letterSpacing = 5.sp,
            )

            Spacer(modifier = Modifier.height(10.dp))

            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color(0xFF2563EB).copy(alpha = 0.25f),
                modifier = Modifier.padding(horizontal = 16.dp),
            ) {
                Text(
                    text = "INDIA'S SAFE & VERIFIED MARKETPLACE",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF93C5FD),
                    letterSpacing = 1.5.sp,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text("🛡️", fontSize = 12.sp)
                Text(
                    text = "100% Escrow Protected • Zero Scam Deals",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color.White.copy(alpha = 0.75f),
                )
            }
        }

        Text(
            text = "🇮🇳 Made with ❤️ for India",
            color = Color.White.copy(alpha = 0.45f),
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 36.dp)
        )
    }
}
