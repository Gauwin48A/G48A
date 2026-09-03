package com.zaruda.app.ui.onboarding

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
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

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun OnboardingScreen(
    onFinished: () -> Unit,
) {
    var currentPage by remember { mutableIntStateOf(0) }
    val page = onboardingPages[currentPage]
    val isLastPage = currentPage == onboardingPages.lastIndex
    var selectedInterests: Set<String> by remember { mutableStateOf(setOf("Electronics", "Vehicles")) }
    val sampleCategories = listOf("📱 Electronics", "🚗 Vehicles", "🏠 Properties", "👗 Fashion", "💼 Jobs", "🛠️ Services")

    Box(modifier = Modifier.fillMaxSize()) {
        // Background gradient
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(page.gradientStart, page.gradientEnd)
                    )
                ),
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Top story-style segmented progress bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp, bottom = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                onboardingPages.forEachIndexed { index, _ ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(4.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(
                                if (index <= currentPage) Color.White else Color.White.copy(alpha = 0.3f)
                            ),
                    )
                }
            }

            // Skip button top-right
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
            ) {
                if (!isLastPage) {
                    TextButton(onClick = onFinished) {
                        Text(
                            text = "Skip",
                            color = Color.White.copy(alpha = 0.85f),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                } else {
                    Spacer(Modifier.height(36.dp))
                }
            }

            Spacer(modifier = Modifier.weight(0.15f))

            // Icon in a frosted glass circle
            Box(
                modifier = Modifier
                    .size(110.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = page.icon,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(52.dp),
                )
            }

            Spacer(modifier = Modifier.height(28.dp))

            // Title
            Text(
                text = page.title,
                color = Color.White,
                fontSize = 26.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Description
            Text(
                text = page.description,
                color = Color.White.copy(alpha = 0.9f),
                fontSize = 15.sp,
                textAlign = TextAlign.Center,
                lineHeight = 22.sp,
            )

            if (isLastPage) {
                Spacer(modifier = Modifier.height(20.dp))
                Text(
                    text = "Pick categories you love:",
                    color = Color.White.copy(alpha = 0.95f),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(modifier = Modifier.height(10.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    sampleCategories.forEach { cat ->
                        val name = cat.substringAfter(" ")
                        val isSelected = selectedInterests.contains(name)
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = if (isSelected) Color.White else Color.White.copy(alpha = 0.2f),
                            modifier = Modifier.clickable {
                                selectedInterests = if (isSelected) (selectedInterests - name) else (selectedInterests + name)
                            }
                        ) {
                            Text(
                                text = cat,
                                color = if (isSelected) page.gradientStart else Color.White,
                                fontSize = 12.sp,
                                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.weight(0.25f))

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
                    .height(52.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.White,
                    contentColor = page.gradientStart,
                ),
            ) {
                Text(
                    text = if (isLastPage) "Explore Verified Marketplace →" else "Continue →",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
