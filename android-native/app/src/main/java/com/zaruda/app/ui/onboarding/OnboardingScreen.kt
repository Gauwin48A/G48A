package com.zaruda.app.ui.onboarding

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

data class OnboardingPage(
    val badge: String,
    val title: String,
    val description: String,
    val bgImageUrl: String,
    val icon: ImageVector,
    val highlights: List<String>,
)

val onboardingPages = listOf(
    OnboardingPage(
        badge = "HYPERLOCAL MARKETPLACE",
        title = "Buy & Sell Locally",
        description = "Connect directly with verified buyers and sellers in your city. Post ads in seconds and trade without middlemen.",
        bgImageUrl = "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=1200&q=80",
        icon = Icons.Default.Storefront,
        highlights = listOf("⚡ Instant 30s Ad Listing", "📍 Verified City Neighbors", "🛡️ In-App Escrow Protection"),
    ),
    OnboardingPage(
        badge = "SMART DISCOVERY & PRICING",
        title = "Discover Real Deals",
        description = "Instant market valuation insights, trending electronics, and seamless search across 12+ verified categories.",
        bgImageUrl = "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
        icon = Icons.Default.Explore,
        highlights = listOf("📊 Fair Market Valuation", "🔍 Instant Lens Search", "🔔 Live Price Drop Alerts"),
    ),
    OnboardingPage(
        badge = "100% VERIFIED & SECURE",
        title = "Zero-Scam Escrow Trading",
        description = "Every transaction backed by 100% Escrow Protection, physical inspection, and Aadhaar-verified sellers.",
        bgImageUrl = "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80",
        icon = Icons.Default.Security,
        highlights = listOf("🛡️ 100% Escrow Protection", "👤 Aadhaar Verified Sellers", "🤝 Delivery Handover OTP"),
    ),
)

private val sampleCategories = listOf("📱 Electronics", "🚗 Vehicles", "🏠 Properties", "👗 Fashion", "💼 Jobs", "🛠️ Services")

@OptIn(ExperimentalLayoutApi::class, ExperimentalFoundationApi::class)
@Composable
fun OnboardingScreen(
    onFinished: () -> Unit,
) {
    val pagerState = rememberPagerState(pageCount = { onboardingPages.size })
    val currentPage = pagerState.currentPage
    val isLastPage = currentPage == onboardingPages.lastIndex
    var selectedInterests: Set<String> by remember { mutableStateOf(setOf("Electronics", "Vehicles")) }
    val haptic = LocalHapticFeedback.current
    val scope = rememberCoroutineScope()

    LaunchedEffect(currentPage) {
        if (currentPage > 0) {
            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0B0F19)),
    ) {
        // ── Full-Bleed Background Pager ──
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize(),
        ) { index ->
            val page = onboardingPages[index]
            Box(modifier = Modifier.fillMaxSize()) {
                AsyncImage(
                    model = page.bgImageUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
                // Cinematic Vignette Gradient Overlay
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(
                                    Color(0xFF0B0F19).copy(alpha = 0.55f),
                                    Color(0xFF0B0F19).copy(alpha = 0.35f),
                                    Color(0xFF0B0F19).copy(alpha = 0.85f),
                                    Color(0xFF0B0F19),
                                )
                            )
                        )
                )
            }
        }

        // ── Foreground Content Layout ──
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 40.dp, bottom = 28.dp, start = 20.dp, end = 20.dp),
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            // Top Bar: Story Progress Indicators & Skip Button
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                // Segmented story progress bar
                Row(
                    modifier = Modifier.weight(1f),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    onboardingPages.forEachIndexed { index, _ ->
                        val isActive = index == currentPage
                        val isPassed = index < currentPage
                        val indicatorColor by animateColorAsState(
                            targetValue = if (isActive) Color(0xFF3B82F6) else if (isPassed) Color.White else Color.White.copy(alpha = 0.3f),
                            label = "indicatorColor",
                        )
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(4.dp)
                                .clip(RoundedCornerShape(2.dp))
                                .background(indicatorColor),
                        )
                    }
                }

                Spacer(modifier = Modifier.width(16.dp))

                // Skip Pill
                if (!isLastPage) {
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = Color(0xFF131B2E).copy(alpha = 0.75f),
                        border = BorderStroke(1.dp, Color.White.copy(alpha = 0.2f)),
                        modifier = Modifier.clickable { onFinished() },
                    ) {
                        Text(
                            text = "Skip",
                            color = Color.White.copy(alpha = 0.9f),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                        )
                    }
                } else {
                    Spacer(Modifier.width(48.dp))
                }
            }

            // Bottom Frosted Glass Sheet Card
            val currentPageData = onboardingPages[currentPage]
            Surface(
                shape = RoundedCornerShape(32.dp),
                color = Color(0xFF131B2E).copy(alpha = 0.92f),
                border = BorderStroke(1.5.dp, Color(0xFF3B82F6).copy(alpha = 0.3f)),
                shadowElevation = 24.dp,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    // Badge Row with Icon
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(Color(0xFF2563EB).copy(alpha = 0.3f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = currentPageData.icon,
                                contentDescription = null,
                                tint = Color(0xFF60A5FA),
                                modifier = Modifier.size(16.dp),
                            )
                        }
                        Text(
                            text = currentPageData.badge,
                            color = Color(0xFF93C5FD),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 1.2.sp,
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = currentPageData.title,
                        color = Color.White,
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Black,
                        textAlign = TextAlign.Center,
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = currentPageData.description,
                        color = Color.White.copy(alpha = 0.75f),
                        fontSize = 13.sp,
                        lineHeight = 19.sp,
                        textAlign = TextAlign.Center,
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    if (!isLastPage) {
                        // Highlight features pills
                        Column(
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            currentPageData.highlights.forEach { highlight ->
                                Surface(
                                    shape = RoundedCornerShape(12.dp),
                                    color = Color.White.copy(alpha = 0.06f),
                                    border = BorderStroke(1.dp, Color.White.copy(alpha = 0.1f)),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        Text(
                                            text = highlight,
                                            color = Color.White.copy(alpha = 0.9f),
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Medium,
                                        )
                                    }
                                }
                            }
                        }
                    } else {
                        // Category Selection Grid on Last Page
                        Text(
                            text = "Choose categories you want to explore:",
                            color = Color.White.copy(alpha = 0.9f),
                            fontSize = 12.sp,
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
                                val isSelected = name in selectedInterests
                                Surface(
                                    shape = RoundedCornerShape(16.dp),
                                    color = if (isSelected) Color(0xFF2563EB) else Color.White.copy(alpha = 0.08f),
                                    border = BorderStroke(
                                        1.dp,
                                        if (isSelected) Color(0xFF60A5FA) else Color.White.copy(alpha = 0.15f),
                                    ),
                                    modifier = Modifier.clickable {
                                        haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                        selectedInterests = if (isSelected) selectedInterests - name else selectedInterests + name
                                    },
                                ) {
                                    Text(
                                        text = cat,
                                        color = if (isSelected) Color.White else Color.White.copy(alpha = 0.85f),
                                        fontSize = 12.sp,
                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                                    )
                                }
                            }
                        }
                        InterestCounterChip(selectedCount = selectedInterests.size)
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Primary Action Button
                    Button(
                        onClick = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            if (isLastPage) {
                                onFinished()
                            } else {
                                scope.launch { pagerState.animateScrollToPage(currentPage + 1) }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .shadow(12.dp, RoundedCornerShape(16.dp), ambientColor = Color(0xFF2563EB).copy(alpha = 0.5f)),
                        shape = RoundedCornerShape(16.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF2563EB),
                            contentColor = Color.White,
                        ),
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text(
                                text = if (isLastPage) "Explore Verified Marketplace" else "Continue",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 0.5.sp,
                            )
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}

/** Live interest counter — springs a scale pop every time the count changes. */
@Composable
private fun InterestCounterChip(selectedCount: Int) {
    var popScale by remember { mutableStateOf(1f) }
    LaunchedEffect(selectedCount) {
        if (selectedCount > 0) {
            popScale = 1.15f
            delay(120)
            popScale = 1f
        }
    }
    val scale by animateFloatAsState(
        targetValue = popScale,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessMedium),
        label = "counterPop",
    )

    AnimatedVisibility(
        visible = selectedCount > 0,
        enter = scaleIn(initialScale = 0.7f, animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy)) + fadeIn(),
        modifier = Modifier.padding(top = 10.dp),
    ) {
        Surface(
            shape = RoundedCornerShape(14.dp),
            color = Color(0xFF2563EB).copy(alpha = 0.2f),
            border = BorderStroke(1.dp, Color(0xFF3B82F6).copy(alpha = 0.35f)),
            modifier = Modifier.graphicsLayer { scaleX = scale; scaleY = scale },
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(
                    imageVector = Icons.Default.CheckCircle,
                    contentDescription = null,
                    tint = Color(0xFF60A5FA),
                    modifier = Modifier.size(14.dp),
                )
                Text(
                    text = if (selectedCount == 1) {
                        "1 Category • 1,420+ Verified Listings"
                    } else {
                        "$selectedCount Categories • 4,850+ Verified Listings"
                    },
                    color = Color(0xFF93C5FD),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}
