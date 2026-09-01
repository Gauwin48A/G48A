package com.zaruda.app.ui.onboarding

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class OnboardingPage(
    val icon: ImageVector,
    val title: String,
    val description: String,
    val gradientStart: Color,
    val gradientEnd: Color,
)

val onboardingPages = listOf(
    OnboardingPage(
        icon = Icons.Default.Storefront,
        title = "Buy & Sell Locally",
        description = "Discover amazing deals from sellers in your neighbourhood. List your items in seconds and reach thousands of buyers.",
        gradientStart = Color(0xFF1E40AF),
        gradientEnd = Color(0xFF3B82F6),
    ),
    OnboardingPage(
        icon = Icons.Default.Explore,
        title = "Smart Discovery",
        description = "Personalised recommendations, trending categories, and powerful search to find exactly what you need — fast.",
        gradientStart = Color(0xFF7C3AED),
        gradientEnd = Color(0xFFA78BFA),
    ),
    OnboardingPage(
        icon = Icons.Default.Shield,
        title = "Trusted & Secure",
        description = "KYC-verified sellers, secure payments, and buyer protection. Shop with confidence every time.",
        gradientStart = Color(0xFF059669),
        gradientEnd = Color(0xFF34D399),
    ),
)

@Composable
fun OnboardingScreen(
    onFinished: () -> Unit,
) {
    var currentPage by remember { mutableIntStateOf(0) }
    val page = onboardingPages[currentPage]
    val isLastPage = currentPage == onboardingPages.lastIndex

    Box(modifier = Modifier.fillMaxSize()) {
        // Animated gradient background
        AnimatedVisibility(
            visible = true,
            enter = fadeIn(),
            exit = fadeOut(),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            listOf(page.gradientStart, page.gradientEnd)
                        )
                    ),
            )
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Spacer(modifier = Modifier.weight(0.2f))

            // Icon in a frosted glass circle
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = page.icon,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(56.dp),
                )
            }

            Spacer(modifier = Modifier.height(48.dp))

            // Title
            Text(
                text = page.title,
                color = Color.White,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Description
            Text(
                text = page.description,
                color = Color.White.copy(alpha = 0.85f),
                fontSize = 16.sp,
                textAlign = TextAlign.Center,
                lineHeight = 24.sp,
            )

            Spacer(modifier = Modifier.weight(0.3f))

            // Page indicators
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
            ) {
                onboardingPages.forEachIndexed { index, _ ->
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 4.dp)
                            .size(if (index == currentPage) 24.dp else 8.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(
                                if (index == currentPage) Color.White
                                else Color.White.copy(alpha = 0.4f)
                            ),
                    )
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Action button
            Button(
                onClick = {
                    if (isLastPage) {
                        onFinished()
                    } else {
                        currentPage++
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.White,
                    contentColor = page.gradientStart,
                ),
            ) {
                Text(
                    text = if (isLastPage) "Get Started" else "Next",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Skip button (only show if not last page)
            if (!isLastPage) {
                TextButton(onClick = onFinished) {
                    Text(
                        text = "Skip",
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 14.sp,
                    )
                }
            } else {
                Spacer(modifier = Modifier.height(48.dp))
            }
        }
    }
}
