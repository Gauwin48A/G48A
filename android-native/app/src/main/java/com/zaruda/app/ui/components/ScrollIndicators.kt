package com.zaruda.app.ui.components

import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp

/**
 * Shows a subtle horizontal scrollbar below scrollable content.
 * Only visible when the content can actually scroll (maxValue > 0).
 * Place this below a [Row] that uses [androidx.compose.foundation.horizontalScroll].
 */
@Composable
fun HorizontalScrollIndicator(
    scrollState: ScrollState,
    modifier: Modifier = Modifier,
) {
    if (scrollState.maxValue > 0) {
        val density = LocalDensity.current
        BoxWithConstraints(
            modifier = modifier
                .fillMaxWidth()
                .height(3.dp)
                .clip(RoundedCornerShape(1.5.dp))
                .background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f)),
        ) {
            val totalWidthPx = with(density) { maxWidth.toPx() }
            val contentWidthPx = totalWidthPx + scrollState.maxValue.toFloat()
            val thumbWidthFraction = (totalWidthPx / contentWidthPx).coerceIn(0.08f, 0.5f)
            val scrollFraction = if (contentWidthPx > totalWidthPx) {
                scrollState.value.toFloat() / (contentWidthPx - totalWidthPx)
            } else 0f
            val maxThumbOffsetPx = totalWidthPx - (totalWidthPx * thumbWidthFraction)
            val thumbOffsetPx = maxThumbOffsetPx * scrollFraction

            Box(
                modifier = Modifier
                    .offset(x = with(density) { thumbOffsetPx.toDp() })
                    .width(with(density) { (totalWidthPx * thumbWidthFraction).toDp() })
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(1.5.dp))
                    .background(MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
            )
        }
    }
}
