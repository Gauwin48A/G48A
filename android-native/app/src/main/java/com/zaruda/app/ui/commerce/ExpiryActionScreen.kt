package com.zaruda.app.ui.commerce

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.PatchPostStatusRequest
import com.zaruda.app.data.remote.dto.ReactivatePostRequest
import com.zaruda.app.data.repository.PostsRepository
import com.zaruda.app.domain.model.Post
import com.zaruda.app.ui.theme.ColorTokens
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

// ──────────────────────────────────────────────────────────────────────────────
// ExpiryActionScreen — reached from expiry-reminder notifications:
//   • ≤7 days: "Is your post sold?" → Mark Sold / Still Available
//   • ≤2 days: "Expiring soon"      → Repost now (fresh visibility period)
// ──────────────────────────────────────────────────────────────────────────────

data class ExpiryActionUiState(
    val loading: Boolean = true,
    val post: Post? = null,
    val busy: Boolean = false,
    val doneMessage: String? = null,
    val error: String? = null,
)

@HiltViewModel
class ExpiryActionViewModel @Inject constructor(
    private val postsRepo: PostsRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ExpiryActionUiState())
    val state: StateFlow<ExpiryActionUiState> = _state.asStateFlow()

    fun load(postId: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            when (val r = postsRepo.detail(postId)) {
                is ApiResult.Success -> _state.value = ExpiryActionUiState(loading = false, post = r.data)
                is ApiResult.Failure -> _state.value = ExpiryActionUiState(
                    loading = false,
                    error = r.error.message ?: "Could not load this post.",
                )
            }
        }
    }

    /** "It's sold" → close the listing. */
    fun markSold() = runAction("Your listing is now marked as sold and removed from the marketplace feed.") {
        postsRepo.markSold(it)
    }

    /** "Still available" → refresh the expiry (same renewal path as repost). */
    fun keepLive() = runAction("Your listing is live again with a fresh visibility period.") {
        postsRepo.renew(it)
    }

    /** "Repost now" → fresh visibility period. */
    fun repost() = runAction("Your listing has been reposted with a fresh visibility period.") {
        postsRepo.renew(it)
    }

    private fun runAction(successMessage: String, op: suspend (String) -> ApiResult<Unit>) {
        val postId = _state.value.post?.stableId ?: return
        _state.value = _state.value.copy(busy = true, error = null)
        viewModelScope.launch {
            when (val r = op(postId)) {
                is ApiResult.Success -> _state.value = _state.value.copy(busy = false, doneMessage = successMessage)
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    busy = false,
                    error = r.error.message ?: "Could not update the listing. Please try again.",
                )
            }
        }
    }

    fun clearDone() { _state.value = _state.value.copy(doneMessage = null) }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExpiryActionScreen(
    postId: String,
    onBack: () -> Unit,
    viewModel: ExpiryActionViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(postId) { viewModel.load(postId) }

    Scaffold(
        topBar = { TopAppBar(title = { Text("Listing Expiry") }, navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") } }) },

        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {

            state.error?.let {
                Text(it, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
            }

            when {
                state.loading -> Box(Modifier.fillMaxWidth().padding(vertical = 40.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                state.post == null -> Text("Post not found.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                else -> {
                    val post = state.post!!

                    // Post card
                    Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), elevation = CardDefaults.cardElevation(2.dp)) {
                        Row(Modifier.padding(14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Box(Modifier.size(72.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                                if (post.primaryImage != null) AsyncImage(model = post.primaryImage, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                                else Icon(Icons.Filled.Image, null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            Column(verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.weight(1f)) {
                                Text(post.displayTitle, fontWeight = FontWeight.Bold, fontSize = 15.sp, maxLines = 2)
                                Text("₹%,.0f".format(post.price ?: 0.0), fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, fontSize = 16.sp)
                                post.expiresAt?.let {
                                    Text("Expires ${it.take(10)}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }

                    // Question
                    Text("Is this post sold?", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, modifier = Modifier.fillMaxWidth(), textAlign = TextAlign.Center)
                    Text(
                        "Let buyers know the current status. Mark it sold to close the listing, or keep it live / repost it for a fresh visibility period.",
                        fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth(),
                    )

                    // Actions
                    Button(
                        onClick = { viewModel.markSold() },
                        enabled = !state.busy,
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = ColorTokens.GreenText),
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                    ) {
                        Icon(Icons.Filled.CheckCircle, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(if (state.busy) "Updating…" else "It's sold — close the listing", fontWeight = FontWeight.Bold)
                    }

                    OutlinedButton(
                        onClick = { viewModel.keepLive() },
                        enabled = !state.busy,
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary),
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                    ) {
                        Icon(Icons.Filled.Visibility, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Still available — keep it live", fontWeight = FontWeight.SemiBold)
                    }

                    OutlinedButton(
                        onClick = { viewModel.repost() },
                        enabled = !state.busy,
                        shape = RoundedCornerShape(14.dp),
                        border = BorderStroke(1.dp, Color(0xFFF59E0B)),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFB45309)),
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                    ) {
                        Icon(Icons.Filled.Autorenew, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Repost — fresh 30/45-day visibility", fontWeight = FontWeight.SemiBold)
                    }

                    Text(
                        "• Reposting keeps the same listing live with a new expiry.\n• Marking sold removes it from the marketplace feed.",
                        fontSize = 11.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
            }
        }
    }

    state.doneMessage?.let { msg ->
        AlertDialog(
            onDismissRequest = { viewModel.clearDone() },
            icon = { Text("✅", fontSize = 28.sp) },
            title = { Text("Listing updated", fontWeight = FontWeight.Bold, fontSize = 17.sp) },
            text = { Text(msg, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) },
            confirmButton = { Button(onClick = { viewModel.clearDone(); onBack() }, shape = RoundedCornerShape(10.dp)) { Text("Done") } },
        )
    }
}
