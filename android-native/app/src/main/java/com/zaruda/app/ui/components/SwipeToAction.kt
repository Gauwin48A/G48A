package com.zaruda.app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.Spring
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Icon
import androidx.compose.material3.SwipeToDismissBox
import androidx.compose.material3.SwipeToDismissBoxState
import androidx.compose.material3.SwipeToDismissBoxValue
import androidx.compose.material3.rememberSwipeToDismissBoxState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp

/**
 * Swipe-to-action wrapper for list items.
 * Swipe left = destructive action (delete), swipe right = positive action (save/star).
 * (UI/UX Checklist #34.1)
 */
@Composable
fun SwipeToAction(
    onSwipeLeft: (() -> Unit)? = null,
    onSwipeRight: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
    content: @Composable RowScope.() -> Unit,
) {
    val haptic = LocalHapticFeedback.current
    val dismissState = rememberSwipeToDismissBoxState(
        confirmValueChange = { value ->
            when (value) {
                SwipeToDismissBoxValue.EndToStart -> {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onSwipeLeft?.invoke()
                    false // Don't dismiss — let the callback handle it
                }
                SwipeToDismissBoxValue.StartToEnd -> {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    onSwipeRight?.invoke()
                    false
                }
                SwipeToDismissBoxValue.Settled -> false
            }
        }
    )

    SwipeToDismissBox(
        state = dismissState,
        backgroundContent = {
            val direction = dismissState.dismissDirection

            val deleteColor by animateColorAsState(
                when (direction) {
                    SwipeToDismissBoxValue.EndToStart -> Color(0xFFEF4444)
                    else -> Color.Transparent
                },
                label = "deleteColor"
            )
            val saveColor by animateColorAsState(
                when (direction) {
                    SwipeToDismissBoxValue.StartToEnd -> Color(0xFF10B981)
                    else -> Color.Transparent
                },
                label = "saveColor"
            )

            val alignment = when (direction) {
                SwipeToDismissBoxValue.EndToStart -> Alignment.CenterEnd
                SwipeToDismissBoxValue.StartToEnd -> Alignment.CenterStart
                else -> Alignment.Center
            }

            val icon = when (direction) {
                SwipeToDismissBoxValue.EndToStart -> Icons.Default.Delete
                SwipeToDismissBoxValue.StartToEnd -> Icons.Default.Star
                else -> Icons.Default.Delete
            }
            val tint = when (direction) {
                SwipeToDismissBoxValue.EndToStart -> Color.White
                SwipeToDismissBoxValue.StartToEnd -> Color.White
                else -> Color.Transparent
            }
            val bg = when (direction) {
                SwipeToDismissBoxValue.EndToStart -> deleteColor
                SwipeToDismissBoxValue.StartToEnd -> saveColor
                else -> Color.Transparent
            }

            val iconScale by animateFloatAsState(
                targetValue = if (direction == SwipeToDismissBoxValue.Settled) 0.75f else 1f,
                animationSpec = spring(stiffness = Spring.StiffnessLow),
                label = "iconScale"
            )

            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(bg)
                    .padding(horizontal = 20.dp),
                contentAlignment = alignment,
            ) {
                Icon(
                    icon,
                    contentDescription = null,
                    tint = tint,
                    modifier = Modifier.graphicsLayer {
                        scaleX = iconScale
                        scaleY = iconScale
                    }
                )
            }
        },
        modifier = modifier,
        content = content,
    )
}
