package com.zaruda.app.ui.onboarding

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.fadeIn
import androidx.compose.animation.scaleIn
import androidx.compose.foundation.ExperimentalFoundationApi
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
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.Shield
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

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

/**
 * Extra drift (fraction of a page's scroll displacement) applied to the decorative
 * background blob so it lags the foreground content while swiping — 0.3x parallax.
 */
private const val PARALLAX_FACTOR = 0.3f

private val sampleCategories = listOf("📱 Electronics", "🚗 Vehicles", "🏠 Properties", "👗 Fashion", "💼 Jobs", "🛠️ Services")

@OptIn(ExperimentalLayoutApi::class, ExperimentalFoundationApi::class)
@Composable
fun OnboardingScreen(
    onFinished: () -> Unit,
) {
    val pagerState = rememberPagerState(pageCount = { onboardingPages.size })
    val currentPage = pagerState.currentPage
    val page = onboardingPages[currentPage]
    val isLastPage = currentPage == onboardingPages.lastIndex
    var selectedInterests: Set<String> by remember { mutableStateOf(setOf("Electronics", "Vehicles")) }
    val haptic = LocalHapticFeedback.current
    val scope = rememberCoroutineScope()

    // Story-bar advance tick — fires on every slide change (button tap or swipe).
    LaunchedEffect(currentPage) {
        if (currentPage > 0) {
            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
        }
    }

    // Smoothly blend the background gradient while the user swipes between slides.
    val animatedStart by animateColorAsState(
        targetValue = page.gradientStart,
        animationSpec = spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessLow),
        label = "gradStart",
    )
    val animatedEnd by animateColorAsState(
        targetValue = page.gradientEnd,
        animationSpec = spring(dampingRatio = Spring.DampingRatioNoBouncy, stiffness = Spring.StiffnessLow),
        label = "gradEnd",
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Brush.verticalGradient(listOf(animatedStart, animatedEnd))),
    ) {
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
                                if (index <= currentPage) Color.White else Color.White.copy(alpha = 0.3f),
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

            // ── Swipeable pager (pages share the outer animated gradient) ──
            HorizontalPager(
                state = pagerState,
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
            ) { index ->
                OnboardingPagerPage(
                    page = onboardingPages[index],
                    pageIndex = index,
                    isLastPage = index == onboardingPages.lastIndex,
                    pagerState = pagerState,
                    selectedInterests = selectedInterests,
                    onToggleInterest = { cat ->
                        val name = cat.substringAfter(" ")
                        selectedInterests = if (name in selectedInterests) {
                            selectedInterests - name
                        } else {
                            selectedInterests + name
                        }
                    },
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Action button
            Button(
                onClick = {
                    if (isLastPage) {
                        onFinished()
                    } else {
                        scope.launch { pagerState.animateScrollToPage(currentPage + 1) }
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
        }
    }
}

@OptIn(ExperimentalFoundationApi::class, ExperimentalLayoutApi::class)
@Composable
private fun OnboardingPagerPage(
    page: OnboardingPage,
    pageIndex: Int,
    isLastPage: Boolean,
    pagerState: PagerState,
    selectedInterests: Set<String>,
    onToggleInterest: (String) -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize()) {
        // Decorative parallax blob — lags THIS page while swiping for depth.
        Box(
            modifier = Modifier
                .align(Alignment.Center)
                .graphicsLayer {
                    val distance = pagerState.getOffsetDistanceInPages(pageIndex)
                    translationX = distance * PARALLAX_FACTOR * size.width
                }
                .size(280.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.10f)),
        )

        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(modifier = Modifier.weight(0.12f))

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

            Text(
                text = page.title,
                color = Color.White,
                fontSize = 26.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
            )

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = page.description,
                color = Color.White.copy(alpha = 0.9f),
                fontSize = 15.sp,
                textAlign = TextAlign.Center,
                lineHeight = 22.sp,
            )

            if (isLastPage) {
                Spacer(modifier = Modifier.height(18.dp))
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
                        val isSelected = name in selectedInterests
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = if (isSelected) Color.White else Color.White.copy(alpha = 0.2f),
                            modifier = Modifier.clickable { onToggleInterest(cat) },
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
                InterestCounterChip(selectedCount = selectedInterests.size)
            }

            Spacer(modifier = Modifier.weight(0.06f))
        }
    }
}

/** Live interest counter — springs a scale pop every time the count changes. */
@Composable
private fun InterestCounterChip(selectedCount: Int) {
    var popScale by remember { mutableStateOf(1f) }
    LaunchedEffect(selectedCount) {
        if (selectedCount > 0) {
            popScale = 1.18f
            delay(150)
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
        enter = scaleIn(initialScale = 0.6f, animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy)) + fadeIn(),
        modifier = Modifier.padding(top = 14.dp),
    ) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = Color.White.copy(alpha = 0.22f),
            modifier = Modifier.graphicsLayer { scaleX = scale; scaleY = scale },
        ) {
            Text(
                text = if (selectedCount == 1) {
                    "1 category selected • 1,420 verified listings waiting for you"
                } else {
                    "$selectedCount categories selected • 1,420 verified listings waiting for you"
                },
                color = Color.White,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 7.dp),
            )
        }
    }
}
