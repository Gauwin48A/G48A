package com.zaruda.app.ui.theme

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically

/**
 * Standard animation specs used throughout the app for consistency.
 */
object ZarudaMotion {
    const val DURATION_FAST = 150
    const val DURATION_MEDIUM = 250
    const val DURATION_SLOW = 400
    const val DURATION_EMPHASIS = 500

    // Page transitions
    val pageEnter get() = fadeIn(tween(DURATION_MEDIUM)) + slideInHorizontally(
        initialOffsetX = { it / 6 },
        animationSpec = tween(DURATION_MEDIUM, easing = FastOutSlowInEasing),
    )
    val pageExit get() = fadeOut(tween(DURATION_FAST))
    val pagePopEnter get() = fadeIn(tween(DURATION_MEDIUM)) + slideInHorizontally(
        initialOffsetX = { -it / 6 },
        animationSpec = tween(DURATION_MEDIUM, easing = FastOutSlowInEasing),
    )
    val pagePopExit get() = fadeOut(tween(DURATION_FAST)) + slideOutHorizontally(
        targetOffsetX = { it / 6 },
        animationSpec = tween(DURATION_FAST),
    )

    // Bottom sheet / modal
    val sheetEnter get() = fadeIn(tween(DURATION_MEDIUM)) + slideInVertically(
        initialOffsetY = { it / 4 },
        animationSpec = tween(DURATION_MEDIUM, easing = FastOutSlowInEasing),
    )
    val sheetExit get() = fadeOut(tween(DURATION_FAST)) + slideOutVertically(
        targetOffsetY = { it / 4 },
        animationSpec = tween(DURATION_FAST),
    )

    // Fab / floating element
    val fabEnter get() = scaleIn(tween(DURATION_MEDIUM)) + fadeIn(tween(DURATION_MEDIUM))
    val fabExit get() = scaleOut(tween(DURATION_FAST)) + fadeOut(tween(DURATION_FAST))
}
