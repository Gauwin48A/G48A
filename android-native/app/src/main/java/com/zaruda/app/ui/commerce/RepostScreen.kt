package com.zaruda.app.ui.commerce

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.*
import com.zaruda.app.data.repository.PostsRepository
import com.zaruda.app.data.repository.TransactionsRepository
import com.zaruda.app.domain.model.Post
import com.zaruda.app.ui.theme.ColorTokens
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.temporal.ChronoUnit
import javax.inject.Inject

// ──────────────────────────────────────────────────────────────────────────────
// Repost — pick one of your active listings and repost it with a fresh
// visibility period (e.g. 30 days per the Starter/Basic plans). Listings that
// are expiring soon (or already expired) surface at the top of the dropdown.
// ──────────────────────────────────────────────────────────────────────────────

data class RepostUiState(
    val loading: Boolean = true,
    val posts: List<Post> = emptyList(),
    val selectedPostId: String? = null,
    val success: Boolean = false,
    val error: String? = null,
    val history: List<UndoneRecord> = emptyList(),
)

@HiltViewModel
class RepostViewModel @Inject constructor(
    private val postsRepo: PostsRepository,
    private val txRepo: TransactionsRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(RepostUiState())
    val state: StateFlow<RepostUiState> = _state.asStateFlow()

    init { load() }

    /** Loads the user's active listings, sorted so the soonest-expiring ones appear first. */
    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)
            when (val r = postsRepo.mine()) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    loading = false,
                    // The server only allows reposting SOLD or EXPIRED listings, or active
                    // ones already past their visibility period (15/30/45 days by plan) —
                    // active posts still in their window get rejected with a 400.
                    // So surface sold/expired first, then active-but-expired listings.
                    posts = r.data
                        .filter { isRepostable(it) }
                        .sortedBy { it.expiresAt ?: "9999-12-31T23:59:59" },
                )
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    loading = false,
                    error = r.error.message ?: "Could not load your listings. Please try again.",
                )
            }
        }
    }

    fun selectPost(id: String) { _state.value = _state.value.copy(selectedPostId = id, error = null) }

    fun reset() {
        val history = _state.value.history
        _state.value = RepostUiState(history = history)
        load()
    }

    fun submit() {
        val s = _state.value
        val postId = s.selectedPostId
        if (postId.isNullOrBlank()) {
            _state.value = s.copy(error = "Select a listing to repost")
            return
        }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = postsRepo.renew(postId)) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(loading = false, success = true)
                    loadHistory()
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    loading = false,
                    error = r.error.message ?: "Failed to repost. Please try again.",
                )
            }
        }
    }

    private fun loadHistory() {
        viewModelScope.launch {
            when (val r = txRepo.undoneHistory()) {
                is ApiResult.Success -> _state.value = _state.value.copy(history = r.data)
                is ApiResult.Failure -> {}
            }
        }
    }
}

/**
 * Whether a listing is eligible for repost, matching the server's reactivatePost rules:
 * sold, expired, or an active listing whose visibility window has passed.
 */
private fun isRepostable(post: Post): Boolean {
    val status = post.status?.lowercase()?.trim()
    val daysUntilExpiry = post.expiresAt?.let {
        try {
            ChronoUnit.DAYS.between(Instant.now(), Instant.parse(it))
        } catch (e: Exception) {
            999L
        }
    } ?: 999L
    return status == "sold" || status == "expired" || daysUntilExpiry <= 7L
}

/** Human-readable status + expiry countdown for a listing. */
private fun expiryLabel(post: Post): String {
    val status = post.status?.lowercase()?.trim()
    if (status == "sold") return "Sold — ready to repost"
    val raw = post.expiresAt ?: return "No expiry"
    return try {
        val days = ChronoUnit.DAYS.between(Instant.now(), Instant.parse(raw))
        when {
            days < 0 -> "Expired — ready to repost"
            days == 0L -> "Expires today"
            days <= 7 -> "Expires in $days days • renew soon"
            else -> "Expires in $days days"
        }
    } catch (e: Exception) {
        raw
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RepostScreen(onBack: () -> Unit, viewModel: RepostViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val steps = listOf("Listed", "Needs Renewal", "Select Listing", "Repost", "Live Again")
    var expanded by remember { mutableStateOf(false) }
    var showConfirmDialog by remember { mutableStateOf(false) }
    val isDark = ColorTokens.isDark
    val bgGradient = if (isDark) Brush.verticalGradient(listOf(Color(0xFF0F172A), Color(0xFF1E293B), Color(0xFF1E3A5F))) else Brush.verticalGradient(listOf(Color(0xFFF8FAFC), Color(0xFFEFF6FF), Color(0xFFF0F9FF)))

    val selectedPost = state.posts.find { it.stableId == state.selectedPostId }

    if (showConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showConfirmDialog = false },
            title = { Text("Repost Listing", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
            text = {
                Text(
                    if (selectedPost != null)
                        "Repost \"${selectedPost.title}\"? It will go live again immediately with a fresh visibility period."
                    else "Repost this listing? It will go live again immediately with a fresh visibility period.",
                    fontSize = 14.sp, color = ColorTokens.TextSecondary,
                )
            },
            confirmButton = {
                Button(
                    onClick = { showConfirmDialog = false; viewModel.submit() },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                    shape = RoundedCornerShape(10.dp),
                ) { Text("Repost", fontWeight = FontWeight.SemiBold) }
            },
            dismissButton = {
                OutlinedButton(onClick = { showConfirmDialog = false }, shape = RoundedCornerShape(10.dp)) {
                    Text("Cancel")
                }
            },
        )
    }

    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            // Top bar is the shared marketplace-style bar rendered by MainShell (back arrow via topBarBack).

            // Hero card
            Box(
                modifier = Modifier.fillMaxWidth()
                    .background(Brush.horizontalGradient(listOf(Color(0xFFF59E0B), Color(0xFFF97316), Color(0xFFEA580C)))),
            ) {
                Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("LISTING REPOST", fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp, color = Color.White.copy(alpha = 0.7f))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(Color.White.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                            Icon(Icons.Filled.Autorenew, null, tint = Color.White, modifier = Modifier.size(20.dp))
                        }
                        Text("Repost", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = Color.White)
                    }
                    Text("Renew an expiring or sold listing with a fresh visibility period.", fontSize = 13.sp, color = Color.White.copy(alpha = 0.85f))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("🕒 30-Day Renewal", "✓ Instant Relist", "📣 Buyer Notified").forEach { badge ->
                            Surface(shape = RoundedCornerShape(8.dp), color = Color.White.copy(alpha = 0.15f)) {
                                Text(badge, fontSize = 10.sp, color = Color.White, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                            }
                        }
                    }
                }
            }

            // Stepper
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                val currentStep = if (state.success) 4 else 2
                steps.forEachIndexed { i, label ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                        Box(Modifier.size(30.dp).clip(CircleShape).background(
                            when { i < currentStep -> Color(0xFFF59E0B); i == currentStep -> Color(0xFF3B82F6); else -> if (isDark) Color(0xFF475569) else Color(0xFFE2E8F0) }
                        ), contentAlignment = Alignment.Center) {
                            if (i < currentStep) Icon(Icons.Filled.Check, null, tint = Color.White, modifier = Modifier.size(16.dp))
                            else Text("${i + 1}", fontSize = 11.sp, color = Color.White, fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.height(2.dp))
                        Text(label, fontSize = 8.sp, color = if (i <= currentStep) ColorTokens.TextHeading else if (isDark) Color(0xFF94A3B8) else Color(0xFF94A3B8), maxLines = 1, textAlign = TextAlign.Center)
                    }
                    if (i < steps.size - 1) {
                        HorizontalDivider(modifier = Modifier.weight(0.5f).padding(bottom = 14.dp), color = if (i < currentStep) Color(0xFFF59E0B) else if (isDark) Color(0xFF475569) else Color(0xFFE2E8F0), thickness = 2.dp)
                    }
                }
            }

            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                state.error?.let { Text(it, color = ColorTokens.RedText, fontSize = 13.sp) }

                if (state.success) {
                    Surface(shape = RoundedCornerShape(20.dp), color = ColorTokens.GreenContainer, border = BorderStroke(1.dp, ColorTokens.GreenText.copy(alpha = 0.5f)), modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
                            Box(Modifier.size(96.dp).clip(CircleShape).background(Brush.radialGradient(listOf(Color(0xFF4ADE80), Color(0xFF22C55E), Color(0xFF16A34A)))), contentAlignment = Alignment.Center) {
                                Icon(Icons.Filled.Autorenew, null, tint = Color.White, modifier = Modifier.size(52.dp))
                            }
                            Text("✅ Listing Reposted!", fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = ColorTokens.GreenText)
                            Text("Your listing is live again with a fresh visibility period.", fontSize = 14.sp, color = ColorTokens.GreenText, textAlign = TextAlign.Center)
                            Surface(shape = RoundedCornerShape(12.dp), color = if (isDark) Color(0xFF064E3B) else Color(0xFFDCFCE7), border = BorderStroke(1.dp, ColorTokens.GreenText.copy(alpha = if (isDark) 0.3f else 0.5f)), modifier = Modifier.fillMaxWidth()) {
                                Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Icon(Icons.Filled.CheckCircle, null, tint = ColorTokens.GreenText, modifier = Modifier.size(28.dp))
                                        Text("Active", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = ColorTokens.GreenText)
                                        Text("Post Status", fontSize = 11.sp, color = ColorTokens.TextSecondary)
                                    }
                                    Box(modifier = Modifier.width(1.dp).height(48.dp).background(ColorTokens.GreenText.copy(alpha = 0.3f)))
                                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Icon(Icons.Filled.Visibility, null, tint = ColorTokens.GreenText, modifier = Modifier.size(28.dp))
                                        Text("Visible", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = ColorTokens.GreenText)
                                        Text("To Buyers", fontSize = 11.sp, color = ColorTokens.TextSecondary)
                                    }
                                }
                            }
                            OutlinedButton(
                                onClick = { viewModel.reset() },
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth().height(48.dp),
                                border = BorderStroke(1.5.dp, Color(0xFF22C55E)),
                            ) {
                                Icon(Icons.Filled.Autorenew, null, tint = Color(0xFF16A34A), modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Repost Another", fontWeight = FontWeight.SemiBold, color = Color(0xFF16A34A))
                            }
                            Button(onClick = onBack, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)), modifier = Modifier.fillMaxWidth().height(48.dp), elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)) {
                                Icon(Icons.Filled.Home, null, tint = Color.White, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Go to My Home", fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }
                } else {
                    // ── Listing picker: dropdown of the user's active posts ──
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("Select a listing to repost", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = ColorTokens.TextBody)
                        Text("Sold or expired listings appear first — they can be reposted instantly for a fresh visibility period.", fontSize = 11.sp, color = ColorTokens.TextSecondary)

                        when {
                            state.loading -> Box(Modifier.fillMaxWidth().padding(vertical = 24.dp), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(color = if (isDark) Color(0xFF93C5FD) else Color(0xFF2563EB), modifier = Modifier.size(28.dp))
                            }
                            state.posts.isEmpty() -> Surface(shape = RoundedCornerShape(12.dp), color = if (isDark) Color(0xFF1E293B) else Color.White, modifier = Modifier.fillMaxWidth()) {
                                Column(Modifier.padding(18.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("📭", fontSize = 24.sp)
                                    Spacer(Modifier.height(6.dp))
                                    Text("No listings to repost right now.", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = ColorTokens.TextHeading)
                                    Text("Sold and expired listings appear here. Active listings become repostable once their visibility window (15–45 days by plan) has passed.", fontSize = 12.sp, color = ColorTokens.TextSecondary)
                                }
                            }
                            else -> ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
                                OutlinedTextField(
                                    value = selectedPost?.title ?: "Select a listing",
                                    onValueChange = {},
                                    readOnly = true,
                                    singleLine = true,
                                    maxLines = 1,
                                    shape = RoundedCornerShape(12.dp),
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = if (isDark) Color(0xFF93C5FD) else Color(0xFF3B82F6),
                                        unfocusedBorderColor = if (isDark) Color(0xFF475569) else Color(0xFFE5E7EB),
                                        focusedContainerColor = if (isDark) Color(0xFF1E293B) else Color.White,
                                        unfocusedContainerColor = if (isDark) Color(0xFF1E293B) else Color.White,
                                    ),
                                    modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable),
                                )
                                ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                    state.posts.forEach { post ->
                                        val label = expiryLabel(post)
                                        val urgent = label.contains("Expired") || label.contains("today") || label.contains("renew soon") || label.contains("Sold")
                                        DropdownMenuItem(
                                            text = {
                                                Column(verticalArrangement = Arrangement.spacedBy(2.dp), modifier = Modifier.fillMaxWidth()) {
                                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                                        Text(
                                                            post.title ?: "Untitled",
                                                            fontWeight = FontWeight.SemiBold,
                                                            fontSize = 13.sp,
                                                            color = ColorTokens.TextHeading,
                                                            maxLines = 1,
                                                            overflow = TextOverflow.Ellipsis,
                                                            modifier = Modifier.weight(1f),
                                                        )
                                                        if (urgent) Text("⚠️", fontSize = 12.sp)
                                                    }
                                                    Text(
                                                        "₹${post.price?.toLong() ?: 0}  •  $label",
                                                        fontSize = 11.sp,
                                                        color = if (urgent) ColorTokens.RedText else ColorTokens.TextSecondary,
                                                    )
                                                }
                                            },
                                            onClick = { viewModel.selectPost(post.stableId); expanded = false },
                                        )
                                    }
                                }
                            }
                        }
                    }

                    // Repost action
                    Button(
                        onClick = { showConfirmDialog = true },
                        enabled = !state.loading && state.selectedPostId != null,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                    ) {
                        Icon(Icons.Filled.Autorenew, null, tint = Color.White, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(if (state.loading) "Reposting…" else "Repost", fontWeight = FontWeight.SemiBold, color = Color.White)
                    }
                    Text("Reposting renews the listing for its full visibility period — 30 days on most plans, 45 days on Premium. Listings can be reposted once per active period.", fontSize = 11.sp, color = ColorTokens.TextSecondary)
                }

                // Repost history
                if (state.history.isNotEmpty()) {
                    Spacer(Modifier.height(8.dp))
                    Text("Repost History", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = ColorTokens.TextHeading)
                    state.history.forEach { rec ->
                        Surface(shape = RoundedCornerShape(12.dp), color = ColorTokens.CardSurface, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                if (rec.postImage != null) {
                                    AsyncImage(model = rec.postImage, contentDescription = null, contentScale = ContentScale.Crop,
                                        modifier = Modifier.size(48.dp).clip(RoundedCornerShape(8.dp)))
                                }
                                Spacer(Modifier.width(10.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(rec.postTitle ?: "Listing", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = ColorTokens.TextHeading)
                                    Text(rec.reason ?: "Reposted", fontSize = 11.sp, color = ColorTokens.TextSecondary)
                                }
                                Text("₹${rec.amount.toLong()}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = ColorTokens.PremiumAmber)
                            }
                        }
                    }
                }
            }
        }
    }
}
