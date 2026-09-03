package com.zaruda.app.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp

/** Spring press modifier — tactile scale-down on press (0.96f) with spring bounce back. */
@Composable
fun Modifier.springPress(onPress: () -> Unit = {}): Modifier {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.96f else 1f,
        animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessHigh),
        label = "pressScale",
    )
    val haptic = LocalHapticFeedback.current
    return this
        .scale(scale)
        .clickable(interactionSource = interactionSource, indication = null) {
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            onPress()
        }
}

/** Pulsing FAB — central Sell button with animated gradient ring. */
@Composable
fun PulsingSellFAB(onClick: () -> Unit, modifier: Modifier = Modifier) {
    val infiniteTransition = rememberInfiniteTransition(label = "fabPulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f, targetValue = 1.15f,
        animationSpec = infiniteRepeatable(tween(1200, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "pulseScale",
    )
    val pulseAlpha by infiniteTransition.animateFloat(
        initialValue = 0.6f, targetValue = 0f,
        animationSpec = infiniteRepeatable(tween(1200, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "pulseAlpha",
    )
    val haptic = LocalHapticFeedback.current

    Box(modifier = modifier) {
        Surface(
            modifier = Modifier.size(64.dp).scale(pulseScale),
            shape = CircleShape,
            color = Color(0xFF2563EB).copy(alpha = pulseAlpha),
        ) {}
        FloatingActionButton(
            onClick = {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                onClick()
            },
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
            shape = CircleShape,
            elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 6.dp, pressedElevation = 12.dp),
            modifier = Modifier.size(56.dp),
        ) {
            Icon(Icons.Default.Add, contentDescription = "Sell", modifier = Modifier.size(28.dp))
        }
    }
}
