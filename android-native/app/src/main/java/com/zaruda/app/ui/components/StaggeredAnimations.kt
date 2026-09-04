package com.zaruda.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.MutableTransitionState
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier

/**
 * Staggered entry animation for LazyColumn/LazyRow items.
 * Each item fades in + slides up with increasing delay based on index.
 * (UI/UX Checklist #9.2, #10.14, #35.3)
 *
 * Usage:
 * items(list) { item ->
 *     AnimatedLazyItem(index = index) {
 *         MyCard(item)
 *     }
 * }
 */
@Composable
fun AnimatedLazyItem(
    index: Int,
    modifier: Modifier = Modifier,
    delayPerItemMs: Int = 50,
    content: @Composable () -> Unit,
) {
    val visibleState = remember {
        MutableTransitionState(false).apply {
            targetState = true
        }
    }

    AnimatedVisibility(
        visibleState = visibleState,
        enter = fadeIn(
            animationSpec = tween(
                delayMillis = index * delayPerItemMs,
                durationMillis = 300,
            )
        ) + slideInVertically(
            animationSpec = tween(
                delayMillis = index * delayPerItemMs,
                durationMillis = 300,
            ),
            initialOffsetY = { it / 4 },
        ),
        modifier = modifier,
    ) {
        content()
    }
}
