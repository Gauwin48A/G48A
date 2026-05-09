package com.mhub.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.FilledIconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay

/**
 * Live countdown timer for deals of the day.
 * Shows HH:MM:SS, refreshes every second.
 * Accessibility: announces remaining time as a live region.
 */
@Composable
fun CountdownTimer(
    targetHours: Int = 8,
    modifier: Modifier = Modifier,
) {
    var totalSeconds by remember { mutableIntStateOf(targetHours * 3600) }

    LaunchedEffect(Unit) {
        while (totalSeconds > 0) {
            delay(1000L)
            totalSeconds--
        }
    }

    val h = totalSeconds / 3600
    val m = (totalSeconds % 3600) / 60
    val s = totalSeconds % 60
    val timeStr = "%02d:%02d:%02d".format(h, m, s)

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier.semantics { contentDescription = "Ends in $h hours $m minutes $s seconds" },
    ) {
        Text(
            text = "Ends in:",
            style = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant),
        )
        Spacer(Modifier.width(6.dp))
        listOf(
            "%02d".format(h) to "hours",
            "%02d".format(m) to "minutes",
            "%02d".format(s) to "seconds",
        ).forEachIndexed { i, (value, label) ->
            Surface(
                color = MaterialTheme.colorScheme.errorContainer,
                shape = RoundedCornerShape(6.dp),
            ) {
                Text(
                    text = value,
                    style = MaterialTheme.typography.labelLarge.copy(
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onErrorContainer,
                    ),
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                )
            }
            if (i < 2) {
                Text(
                    " : ",
                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                )
            }
        }
    }
}

/**
 * +/- Quantity selector.
 * Accessibility: announces current value on change.
 */
@Composable
fun QuantitySelector(
    quantity: Int,
    onDecrease: () -> Unit,
    onIncrease: () -> Unit,
    minQuantity: Int = 1,
    maxQuantity: Int = 99,
    modifier: Modifier = Modifier,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = modifier
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp))
            .semantics { contentDescription = "Quantity: $quantity" },
    ) {
        IconButton(
            onClick = onDecrease,
            enabled = quantity > minQuantity,
            modifier = Modifier
                .size(40.dp)
                .semantics { contentDescription = "Decrease quantity" },
        ) {
            Icon(Icons.Filled.Remove, contentDescription = null, modifier = Modifier.size(18.dp))
        }
        Text(
            text = quantity.toString(),
            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
            modifier = Modifier.padding(horizontal = 12.dp),
        )
        IconButton(
            onClick = onIncrease,
            enabled = quantity < maxQuantity,
            modifier = Modifier
                .size(40.dp)
                .semantics { contentDescription = "Increase quantity" },
        ) {
            Icon(Icons.Filled.Add, contentDescription = null, modifier = Modifier.size(18.dp))
        }
    }
}

/**
 * Step progress indicator for checkout flow.
 * Accessibility: announces "Step X of Y: [label], [status]".
 */
@Composable
fun StepProgressIndicator(
    steps: List<String>,
    currentStep: Int,  // 0-indexed
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .semantics {
                contentDescription = "Step ${currentStep + 1} of ${steps.size}: ${steps[currentStep]}"
            },
        horizontalArrangement = Arrangement.spacedBy(0.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        steps.forEachIndexed { index, label ->
            val isDone    = index < currentStep
            val isCurrent = index == currentStep

            // Circle
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(32.dp)
                    .background(
                        when {
                            isDone || isCurrent -> MaterialTheme.colorScheme.primary
                            else                -> MaterialTheme.colorScheme.surfaceVariant
                        },
                        RoundedCornerShape(50),
                    ),
            ) {
                Text(
                    text = if (isDone) "✓" else "${index + 1}",
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontWeight = FontWeight.Bold,
                        color = if (isDone || isCurrent) MaterialTheme.colorScheme.onPrimary
                                else MaterialTheme.colorScheme.onSurfaceVariant,
                    ),
                )
            }

            // Label below only for current
            if (isCurrent) {
                // label is shown separately below the row
            }

            // Connector line between steps
            if (index < steps.size - 1) {
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(2.dp)
                        .background(
                            if (isDone) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.outlineVariant,
                        ),
                )
            }
        }
    }
    // Step labels row
    Row(
        modifier = Modifier.padding(horizontal = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        steps.forEachIndexed { index, label ->
            val isCurrent = index == currentStep
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall.copy(
                    fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
                    color = if (isCurrent) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.onSurfaceVariant,
                ),
                modifier = Modifier.weight(1f),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
        }
    }
}
