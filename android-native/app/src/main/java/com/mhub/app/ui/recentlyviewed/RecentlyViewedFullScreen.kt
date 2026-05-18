package com.mhub.app.ui.recentlyviewed

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccessTime
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.Image
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.mhub.app.ui.commerce.RecentlyViewedViewModel
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.mhub.app.domain.model.Post

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecentlyViewedFullScreen(
    onBack: () -> Unit,
    onOpenProduct: (String) -> Unit,
    viewModel: RecentlyViewedViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var showClearDialog by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Recently Viewed") },
                navigationIcon = {
                    IconButton(onClick = onBack, modifier = Modifier.semantics { contentDescription = "Go back" }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                actions = {
                    if (state.posts.isNotEmpty()) {
                        IconButton(
                            onClick = { showClearDialog = true },
                            modifier = Modifier.semantics { contentDescription = "Clear all recently viewed" },
                        ) {
                            Icon(Icons.Filled.DeleteSweep, contentDescription = null)
                        }
                    }
                },
            )
        },
    ) { pad ->
        when {
            state.loading -> Box(Modifier.padding(pad).fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            state.error != null -> Box(Modifier.padding(pad).fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("Could not load recently viewed", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = { viewModel.load() }) { Text("Retry") }
                }
            }
            state.posts.isEmpty() -> Box(Modifier.padding(pad).fillMaxSize(), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("\uD83D\uDC40", style = MaterialTheme.typography.displayMedium)
                    Spacer(Modifier.height(16.dp))
                    Text("Nothing viewed yet", style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold))
                    Text(
                        "Products you view will appear here",
                        style = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurfaceVariant),
                    )
                    Spacer(Modifier.height(24.dp))
                    Button(onClick = onBack) { Text("Browse Products") }
                }
            }
            else -> {
                LazyColumn(
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.padding(pad),
                ) {
                    items(state.posts, key = { it.stableId }) { post ->
                        RecentlyViewedPostItem(
                            post = post,
                            onTap = { onOpenProduct(post.stableId) },
                        )
                    }
                }
            }
        }
    }

    if (showClearDialog) {
        AlertDialog(
            onDismissRequest = { showClearDialog = false },
            title = { Text("Clear History") },
            text = { Text("Recently viewed history cannot be cleared from the app — it is managed by your account.") },
            confirmButton = {
                TextButton(onClick = { showClearDialog = false }) { Text("OK") }
            },
        )
    }
}

@Composable
private fun RecentlyViewedPostItem(
    post: Post,
    onTap: () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        tonalElevation = 2.dp,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClickLabel = "View ${post.displayTitle}") { onTap() }
            .semantics {
                contentDescription = "${post.displayTitle}, viewed recently"
            },
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            if (post.primaryImage != null) {
                AsyncImage(
                    model = post.primaryImage,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(72.dp).clip(RoundedCornerShape(8.dp)),
                )
            } else {
                Box(
                    Modifier.size(72.dp).clip(RoundedCornerShape(8.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Filled.Image, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(32.dp))
                }
            }
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    post.displayTitle,
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                if (post.price != null) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "₹${post.price.toLong()}",
                        style = MaterialTheme.typography.titleSmall.copy(
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary,
                        ),
                    )
                }
                Spacer(Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.AccessTime, contentDescription = null, modifier = Modifier.size(12.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.width(4.dp))
                    Text("Viewed recently", style = MaterialTheme.typography.labelSmall.copy(color = MaterialTheme.colorScheme.onSurfaceVariant))
                }
            }
        }
    }
}
