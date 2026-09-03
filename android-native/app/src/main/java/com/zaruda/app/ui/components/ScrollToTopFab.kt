package com.zaruda.app.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.FloatingActionButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

/**
 * Shows a scroll-to-top FAB when the user has scrolled past [scrollThreshold] items.
 * (UI/UX Checklist #33.6)
 */
@Composable
fun ScrollToTopFab(
    listState: LazyListState,
    modifier: Modifier = Modifier,
    scrollThreshold: Int = 15,
) {
    val scope = rememberCoroutineScope()
    val showFab by remember {
        derivedStateOf {
            listState.firstVisibleItemIndex > scrollThreshold ||
                    (listState.firstVisibleItemIndex == 0 && listState.firstVisibleItemScrollOffset > 100)
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        AnimatedVisibility(
            visible = showFab,
            enter = fadeIn() + slideInVertically(initialOffsetY = { it }),
            exit = fadeOut() + slideOutVertically(targetOffsetY = { it }),
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 16.dp, bottom = 80.dp),
        ) {
            FloatingActionButton(
                onClick = {
                    scope.launch {
                        listState.animateScrollToItem(0)
                    }
                },
                containerColor = MaterialTheme.colorScheme.primaryContainer,
                contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 4.dp),
                modifier = Modifier.size(44.dp),
            ) {
                Icon(
                    Icons.Default.KeyboardArrowUp,
                    contentDescription = "Scroll to top",
                    modifier = Modifier.size(24.dp),
                )
            }
        }
    }
}
