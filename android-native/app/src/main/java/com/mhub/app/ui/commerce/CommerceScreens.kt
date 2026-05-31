package com.mhub.app.ui.commerce

import android.content.Intent
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.CompareArrows
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.*
import androidx.compose.material3.AlertDialog
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.R
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.*
import com.mhub.app.data.repository.*
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.common.LinkColor
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import javax.inject.Inject

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Shared helpers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

private val bgGradient get() = Brush.verticalGradient(listOf(Color(0xFFF0F9FF), Color(0xFFEFF6FF), Color(0xFFE0E7FF)))
private val brandGrad get() = Brush.horizontalGradient(listOf(Color(0xFF3B82F6), Color(0xFF2563EB)))

@Composable
private fun ScreenTopBar(title: String, onBack: () -> Unit) {
    Row(
        Modifier.fillMaxWidth()
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Color(0xFF2563EB))
        }
        Spacer(Modifier.width(8.dp))
        Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
    }
}

@Composable
private fun PostListItem(post: Post, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp,
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
            if (post.primaryImage != null) {
                AsyncImage(
                    model = post.primaryImage, contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(70.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)),
                )
            } else {
                Box(
                    Modifier.size(70.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Filled.Image, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(28.dp)) }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B), maxLines = 2)
                if (post.price != null) {
                    Spacer(Modifier.height(4.dp))
                    Text("â‚¹${post.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF2563EB))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    post.status?.let { s ->
                        StatusChip(s)
                    }
                    post.status?.let { c ->
                        Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFFF1F5F9)) {
                            Text(c.replaceFirstChar { it.uppercase() }, fontSize = 11.sp, color = Color(0xFF475569), modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                        }
                    }
                }
                post.location?.let { loc ->
                    Spacer(Modifier.height(2.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.LocationOn, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(12.dp))
                        Spacer(Modifier.width(2.dp))
                        Text(loc, fontSize = 11.sp, color = Color(0xFF94A3B8), maxLines = 1)
                    }
                }
                post.createdAt?.take(10)?.let { date ->
                    Text(date, fontSize = 11.sp, color = Color(0xFFCBD5E1))
                }
            }
        }
    }
}

@Composable
private fun StatusChip(status: String) {
    val (bg, fg) = when (status.lowercase()) {
        "active" -> Color(0xFFDCFCE7) to Color(0xFF166534)
        "sold" -> Color(0xFFDBEAFE) to Color(0xFF1D4ED8)
        "pending" -> Color(0xFFFEF9C3) to Color(0xFF854D0E)
        else -> Color(0xFFF1F5F9) to Color(0xFF475569)
    }
    Surface(shape = RoundedCornerShape(20.dp), color = bg) {
        Text(status.replaceFirstChar { it.uppercase() }, fontSize = 11.sp, color = fg,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
    }
}

@Composable
private fun EmptyState(icon: @Composable () -> Unit, title: String, subtitle: String) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
            icon()
            Spacer(Modifier.height(16.dp))
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = Color(0xFF374151))
            Spacer(Modifier.height(6.dp))
            Text(subtitle, fontSize = 13.sp, color = Color(0xFF64748B))
        }
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PostWelcomeScreen
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@Composable
fun PostWelcomeScreen(onBack: () -> Unit, onStartPost: () -> Unit) {
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar(stringResource(R.string.sell_title), onBack)
            Column(
                Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(
                    Modifier.size(96.dp).clip(RoundedCornerShape(24.dp))
                        .background(Brush.radialGradient(listOf(Color(0xFF60A5FA), Color(0xFF2563EB)))),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Filled.Sell, null, tint = Color.White, modifier = Modifier.size(48.dp)) }
                Spacer(Modifier.height(24.dp))
                Text(stringResource(R.string.sell_ready), fontWeight = FontWeight.Bold, fontSize = 24.sp, color = Color(0xFF1E293B))
                Spacer(Modifier.height(8.dp))
                Text(stringResource(R.string.sell_subtitle), fontSize = 15.sp, color = Color(0xFF64748B))
                Spacer(Modifier.height(28.dp))
                // FlowStep visual progress
                Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text(stringResource(R.string.sell_how_it_works), fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                        Spacer(Modifier.height(12.dp))
                        val steps = listOf(
                            Triple(Icons.Filled.PhotoCamera, stringResource(R.string.sell_step_photos), stringResource(R.string.sell_step_photos_desc)),
                            Triple(Icons.Filled.Description, stringResource(R.string.sell_step_details), stringResource(R.string.sell_step_details_desc)),
                            Triple(Icons.Filled.PriceChange, stringResource(R.string.sell_step_price), stringResource(R.string.sell_step_price_desc)),
                        )
                        steps.forEachIndexed { idx, (icon, title, desc) ->
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Box(Modifier.size(32.dp).clip(CircleShape).background(Color(0xFF2563EB)), contentAlignment = Alignment.Center) {
                                        Text("${idx + 1}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    }
                                    if (idx < 2) Box(Modifier.width(2.dp).height(24.dp).background(Color(0xFFDBEAFE)))
                                }
                                Spacer(Modifier.width(14.dp))
                                Column(Modifier.padding(bottom = if (idx < 2) 24.dp else 0.dp)) {
                                    Text(title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                                    Text(desc, fontSize = 12.sp, color = Color(0xFF64748B))
                                }
                            }
                        }
                    }
                }
                Spacer(Modifier.height(28.dp))
                // Tier badge display
                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFFEF3C7), modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Stars, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(stringResource(R.string.sell_free_plan), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF92400E))
                            Text(stringResource(R.string.sell_upgrade_hint), fontSize = 11.sp, color = Color(0xFFB45309))
                        }
                    }
                }
            }
            // â”€â”€ Sticky bottom CTA â”€â”€
            Surface(shadowElevation = 8.dp, color = Color.White) {
                Button(
                    onClick = onStartPost,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                    contentPadding = PaddingValues(0.dp),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp).height(54.dp),
                ) {
                    Box(
                        Modifier.fillMaxSize().clip(RoundedCornerShape(14.dp)).background(brandGrad),
                        contentAlignment = Alignment.Center,
                    ) { Text(stringResource(R.string.sell_start_listing), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp) }
                }
            }
        }
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// EditPostScreen
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class EditPostUiState(
    val loading: Boolean = true,
    val saving: Boolean = false,
    val uploading: Boolean = false,
    val uploadProgress: Float = 0f,
    val error: String? = null,
    val success: Boolean = false,
    val title: String = "",
    val description: String = "",
    val price: String = "",
    val location: String = "",
    val condition: String = "",
    val brand: String = "",
    val model: String = "",
    val warranty: String = "",
    val ageMonths: String = "",
    val contactPreference: String = "call",
    val flashSale: Boolean = false,
    val existingImages: List<String> = emptyList(),
    val fieldErrors: Map<String, String> = emptyMap(),
)

@HiltViewModel
class EditPostViewModel @Inject constructor(
    private val repo: PostsRepository,
    private val uploadRepo: UploadRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(EditPostUiState())
    val state: StateFlow<EditPostUiState> = _state.asStateFlow()

    fun load(postId: String) {
        viewModelScope.launch {
            when (val r = repo.detail(postId)) {
                is ApiResult.Success -> {
                    val p = r.data
                    _state.value = EditPostUiState(
                        loading = false,
                        title = p.displayTitle,
                        description = p.description ?: "",
                        price = p.price?.toLong()?.toString() ?: "",
                        location = p.location ?: "",
                        condition = p.condition ?: "",
                        brand = p.brand ?: "",
                        existingImages = p.images,
                    )
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
            }
        }
    }

    fun save(postId: String) {
        val s = _state.value
        val errors = mutableMapOf<String, String>()
        if (s.title.isBlank()) errors["title"] = "Title is required"
        else if (s.title.length < 5) errors["title"] = "Title must be at least 5 characters"
        if (s.price.isNotBlank() && s.price.toDoubleOrNull() == null) errors["price"] = "Enter a valid price"
        if (errors.isNotEmpty()) { _state.value = s.copy(fieldErrors = errors); return }
        _state.value = s.copy(saving = true, error = null, fieldErrors = emptyMap())
        viewModelScope.launch {
            val req = CreatePostRequest(
                title = s.title,
                description = s.description.ifBlank { null },
                price = s.price.toDoubleOrNull(),
                location = s.location.ifBlank { null },
                condition = s.condition.ifBlank { null },
                brand = s.brand.ifBlank { null },
                model = s.model.ifBlank { null },
                warrantyStatus = s.warranty.ifBlank { null },
                ageMonths = s.ageMonths.toIntOrNull(),
                flashSale = if (s.flashSale) true else null,
            )
            when (val r = repo.update(postId, req)) {
                is ApiResult.Success -> _state.value = _state.value.copy(saving = false, success = true)
                is ApiResult.Failure -> _state.value = _state.value.copy(saving = false, error = r.error.message)
            }
        }
    }

    fun setTitle(v: String) { _state.value = _state.value.copy(title = v.take(100), fieldErrors = _state.value.fieldErrors - "title") }
    fun setDescription(v: String) { _state.value = _state.value.copy(description = v.take(2000)) }
    fun setPrice(v: String) { _state.value = _state.value.copy(price = v.filter { it.isDigit() || it == '.' }.take(10), fieldErrors = _state.value.fieldErrors - "price") }
    fun setLocation(v: String) { _state.value = _state.value.copy(location = v) }
    fun setCondition(v: String) { _state.value = _state.value.copy(condition = v) }
    fun setBrand(v: String) { _state.value = _state.value.copy(brand = v) }
    fun setModel(v: String) { _state.value = _state.value.copy(model = v) }
    fun setWarranty(v: String) { _state.value = _state.value.copy(warranty = v) }
    fun setAgeMonths(v: String) { _state.value = _state.value.copy(ageMonths = v.filter { it.isDigit() }.take(3)) }
    fun setContactPreference(v: String) { _state.value = _state.value.copy(contactPreference = v) }
    fun toggleFlashSale() { _state.value = _state.value.copy(flashSale = !_state.value.flashSale) }

    fun removeImage(idx: Int) {
        val imgs = _state.value.existingImages.toMutableList()
        if (idx in imgs.indices) {
            imgs.removeAt(idx)
            _state.value = _state.value.copy(existingImages = imgs)
        }
    }

    fun addImages(context: android.content.Context, uris: List<android.net.Uri>) {
        if (uris.isEmpty()) return
        val current = _state.value.existingImages
        val canAdd = minOf(uris.size, 10 - current.size)
        if (canAdd <= 0) { _state.value = _state.value.copy(error = "Maximum 10 images allowed"); return }
        _state.value = _state.value.copy(uploading = true, uploadProgress = 0f, error = null)
        viewModelScope.launch {
            val uploaded = mutableListOf<String>()
            uris.take(canAdd).forEachIndexed { i, uri ->
                try {
                    val resolver = context.contentResolver
                    val mimeType = resolver.getType(uri) ?: "image/jpeg"
                    val bytes = resolver.openInputStream(uri)?.readBytes() ?: return@forEachIndexed
                    if (bytes.size > 2 * 1024 * 1024) {
                        _state.value = _state.value.copy(error = "Image ${i + 1} exceeds 2 MB limit")
                        return@forEachIndexed
                    }
                    when (val r = uploadRepo.uploadPostImage(bytes, mimeType)) {
                        is ApiResult.Success -> {
                            uploaded.add(r.data)
                            _state.value = _state.value.copy(uploadProgress = (i + 1f) / canAdd)
                        }
                        is ApiResult.Failure -> _state.value = _state.value.copy(error = "Upload failed: ${r.error.message}")
                    }
                } catch (e: Exception) {
                    _state.value = _state.value.copy(error = "Upload error: ${e.message}")
                }
            }
            _state.value = _state.value.copy(
                uploading = false, uploadProgress = 0f,
                existingImages = _state.value.existingImages + uploaded,
            )
        }
    }
}

@Composable
fun EditPostScreen(postId: String, onBack: () -> Unit, viewModel: EditPostViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val context = androidx.compose.ui.platform.LocalContext.current
    LaunchedEffect(postId) { viewModel.load(postId) }
    LaunchedEffect(state.success) { if (state.success) onBack() }

    val imagePickerLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
        contract = androidx.activity.result.contract.ActivityResultContracts.GetMultipleContents()
    ) { uris -> if (uris.isNotEmpty()) viewModel.addImages(context, uris) }

    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar(stringResource(R.string.edit), onBack)
            if (state.loading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
            } else {
                Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    state.error?.let {
                        Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFFEF2F2), modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Filled.Error, null, tint = Color(0xFFDC2626), modifier = Modifier.size(16.dp))
                                Text(it, color = Color(0xFFDC2626), fontSize = 13.sp)
                            }
                        }
                    }

                    // Upload progress
                    if (state.uploading) {
                        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text(stringResource(R.string.commerce_uploading), fontSize = 12.sp, color = Color(0xFF64748B))
                            LinearProgressIndicator(
                                progress = { state.uploadProgress },
                                modifier = Modifier.fillMaxWidth(),
                                color = Color(0xFF2563EB),
                            )
                        }
                    }

                    // Photos section with X remove + Add button
                    Text("Photos (${state.existingImages.size}/10)", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        state.existingImages.forEachIndexed { idx, url ->
                            Box(Modifier.size(76.dp)) {
                                AsyncImage(
                                    model = url, contentDescription = null,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(10.dp)),
                                )
                                // X remove button
                                Surface(
                                    onClick = { viewModel.removeImage(idx) },
                                    shape = CircleShape,
                                    color = Color.Black.copy(alpha = 0.65f),
                                    modifier = Modifier.size(20.dp).align(Alignment.TopEnd).padding(2.dp),
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(Icons.Default.Close, null, tint = Color.White, modifier = Modifier.size(12.dp))
                                    }
                                }
                            }
                        }
                        // Add photos button
                        if (state.existingImages.size < 10) {
                            Surface(
                                onClick = { imagePickerLauncher.launch("image/*") },
                                shape = RoundedCornerShape(10.dp),
                                color = Color(0xFFEFF6FF),
                                border = androidx.compose.foundation.BorderStroke(1.5.dp, Color(0xFF93C5FD)),
                                modifier = Modifier.size(76.dp),
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Icon(Icons.Default.AddPhotoAlternate, null, tint = Color(0xFF2563EB), modifier = Modifier.size(24.dp))
                                        Text(stringResource(R.string.commerce_add_images), fontSize = 10.sp, color = Color(0xFF2563EB), fontWeight = FontWeight.SemiBold)
                                    }
                                }
                            }
                        }
                    }

                    // Title with char counter
                    MhubTextFieldWithCounter(
                        label = stringResource(R.string.commerce_field_title),
                        value = state.title,
                        onValueChange = viewModel::setTitle,
                        maxLength = 100,
                        error = state.fieldErrors["title"],
                    )
                    // Description with char counter
                    MhubTextFieldWithCounter(
                        label = stringResource(R.string.commerce_field_description),
                        value = state.description,
                        onValueChange = viewModel::setDescription,
                        maxLength = 2000,
                        maxLines = 4,
                        minLines = 3,
                    )
                    // Price row
                    MhubTextFieldWithCounter(
                        label = "Price (â‚¹)",
                        value = state.price,
                        onValueChange = viewModel::setPrice,
                        maxLength = 10,
                        error = state.fieldErrors["price"],
                    )
                    // Flash sale toggle
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(stringResource(R.string.commerce_flash_sale), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                            Text(stringResource(R.string.commerce_flash_sale_show), fontSize = 11.sp, color = Color(0xFF64748B))
                        }
                        Switch(checked = state.flashSale, onCheckedChange = { viewModel.toggleFlashSale() })
                    }

                    MhubTextField(stringResource(R.string.commerce_field_location), state.location, viewModel::setLocation)
                    MhubTextField(stringResource(R.string.commerce_field_brand), state.brand, viewModel::setBrand)
                    MhubTextField(stringResource(R.string.commerce_field_model), state.model, viewModel::setModel)

                    // Warranty select
                    Text(stringResource(R.string.commerce_warranty), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("No warranty", "3 months", "6 months", "1 year", "2+ years").forEach { w ->
                            val sel = state.warranty == w
                            Surface(
                                onClick = { viewModel.setWarranty(if (sel) "" else w) },
                                shape = RoundedCornerShape(10.dp),
                                color = if (sel) Color(0xFF2563EB) else Color.White,
                                border = ButtonDefaults.outlinedButtonBorder(enabled = true),
                            ) {
                                Text(w, fontSize = 12.sp, color = if (sel) Color.White else Color(0xFF374151),
                                    fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 7.dp))
                            }
                        }
                    }

                    // Age in months
                    MhubTextFieldWithCounter("Age (months)", state.ageMonths, viewModel::setAgeMonths, maxLength = 3)

                    // Condition selector
                    Text(stringResource(R.string.commerce_condition), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("New", "Like New", "Good", "Fair").forEach { cond ->
                            val selected = state.condition.equals(cond, ignoreCase = true)
                            Surface(
                                onClick = { viewModel.setCondition(cond) },
                                shape = RoundedCornerShape(10.dp),
                                color = if (selected) Color(0xFF2563EB) else Color.White,
                                border = ButtonDefaults.outlinedButtonBorder(enabled = true),
                                modifier = Modifier.weight(1f),
                            ) {
                                Text(cond, fontSize = 12.sp, color = if (selected) Color.White else Color(0xFF374151),
                                    fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
                                    textAlign = TextAlign.Center)
                            }
                        }
                    }

                    // Contact preference
                    Text(stringResource(R.string.commerce_contact_pref), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("call" to "ðŸ“ž Call", "chat" to "ðŸ’¬ Chat", "both" to "âœ… Both").forEach { (key, label) ->
                            val sel = state.contactPreference == key
                            Surface(
                                onClick = { viewModel.setContactPreference(key) },
                                shape = RoundedCornerShape(10.dp),
                                color = if (sel) Color(0xFFEFF6FF) else Color.White,
                                border = if (sel) ButtonDefaults.outlinedButtonBorder(enabled = true).copy(width = 2.dp) else ButtonDefaults.outlinedButtonBorder(enabled = true),
                                modifier = Modifier.weight(1f),
                            ) {
                                Text(label, fontSize = 12.sp, color = if (sel) Color(0xFF2563EB) else Color(0xFF374151),
                                    fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal,
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 8.dp),
                                    textAlign = TextAlign.Center)
                            }
                        }
                    }

                    Spacer(Modifier.height(8.dp))
                    Button(
                        onClick = { viewModel.save(postId) }, enabled = !state.saving,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                        contentPadding = PaddingValues(0.dp),
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                    ) {
                        Box(
                            Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp))
                                .background(if (!state.saving) brandGrad else Brush.horizontalGradient(listOf(Color(0xFFCBD5E1), Color(0xFFCBD5E1)))),
                            contentAlignment = Alignment.Center,
                        ) {
                            if (state.saving) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    CircularProgressIndicator(color = Color.White, modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                                    Text(stringResource(R.string.commerce_saving), color = Color.White, fontWeight = FontWeight.SemiBold)
                                }
                            } else {
                                Text(stringResource(R.string.commerce_save_changes), color = Color.White, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MhubTextFieldWithCounter(
    label: String, value: String, onValueChange: (String) -> Unit,
    maxLength: Int = 200, maxLines: Int = 1, minLines: Int = 1, error: String? = null,
) {
    Column {
        Row(Modifier.fillMaxWidth()) {
            Text(label, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151), modifier = Modifier.weight(1f))
            Text("${value.length}/$maxLength", fontSize = 11.sp, color = if (value.length > maxLength * 0.9) Color(0xFFEF4444) else Color(0xFF94A3B8))
        }
        Spacer(Modifier.height(4.dp))
        OutlinedTextField(
            value = value, onValueChange = onValueChange, singleLine = maxLines == 1,
            maxLines = maxLines, minLines = minLines,
            shape = RoundedCornerShape(12.dp),
            isError = error != null,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFF3B82F6),
                unfocusedBorderColor = if (error != null) Color(0xFFEF4444) else Color(0xFFE5E7EB),
                focusedContainerColor = Color.White, unfocusedContainerColor = Color.White,
                errorBorderColor = Color(0xFFEF4444), errorContainerColor = Color(0xFFFFF5F5),
            ),
            modifier = Modifier.fillMaxWidth(),
        )
        if (error != null) {
            Text(error, fontSize = 11.sp, color = Color(0xFFDC2626), modifier = Modifier.padding(start = 4.dp, top = 2.dp))
        }
    }
}

@Composable
private fun MhubTextField(label: String, value: String, onValueChange: (String) -> Unit, maxLines: Int = 1, minLines: Int = 1) {
    Column {
        Text(label, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
        Spacer(Modifier.height(4.dp))
        OutlinedTextField(
            value = value, onValueChange = onValueChange, singleLine = maxLines == 1,
            maxLines = maxLines, minLines = minLines,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB),
                focusedContainerColor = Color.White, unfocusedContainerColor = Color.White,
            ),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TierSelectionScreen
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class TiersUiState(
    val loading: Boolean = true,
    val tiers: List<Tier> = emptyList(),
    val error: String? = null,
    val currentSubscription: SubscriptionRecord? = null,
    val subscriptionHistory: List<SubscriptionRecord> = emptyList(),
    val historyLoading: Boolean = false,
    val cancelLoading: Boolean = false,
    val cancelSuccess: Boolean = false,
)

@HiltViewModel
class TiersViewModel @Inject constructor(private val repo: TiersRepository) : ViewModel() {
    private val _state = MutableStateFlow(TiersUiState())
    val state: StateFlow<TiersUiState> = _state.asStateFlow()

    init { load() }
    private fun load() {
        viewModelScope.launch {
            when (val r = repo.list()) {
                is ApiResult.Success -> _state.value = TiersUiState(loading = false, tiers = r.data.ifEmpty { defaultTiers })
                is ApiResult.Failure -> _state.value = TiersUiState(loading = false, tiers = defaultTiers)
            }
            // Load current subscription and history in parallel
            loadSubscriptionData()
        }
    }

    private fun loadSubscriptionData() {
        viewModelScope.launch {
            _state.value = _state.value.copy(historyLoading = true)
            val mySub = repo.mySubscription()
            val history = repo.subscriptionHistory()
            _state.value = _state.value.copy(
                historyLoading = false,
                currentSubscription = (mySub as? ApiResult.Success)?.data?.subscription,
                subscriptionHistory = (history as? ApiResult.Success)?.data ?: emptyList(),
            )
        }
    }

    fun subscribe(tierId: String) {
        viewModelScope.launch {
            repo.subscribe(SubscribeRequest(tierId = tierId))
            loadSubscriptionData()
        }
    }

    fun cancelSubscription() {
        val subId = _state.value.currentSubscription?.id ?: return
        _state.value = _state.value.copy(cancelLoading = true)
        viewModelScope.launch {
            when (repo.cancelSubscription(subId)) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(cancelLoading = false, cancelSuccess = true, currentSubscription = null)
                    loadSubscriptionData()
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(cancelLoading = false)
            }
        }
    }

    private val defaultTiers = listOf(
        Tier("basic", "Basic", 500.0, "INR", 15, listOf("1 listing credit", "Standard reach", "15 days visibility", "1 photo per post"), false),
        Tier("bronze", "Bronze", 850.0, "INR", 90, listOf("100 listings", "30 days visibility", "Seller badge", "3 photos per post", "Basic analytics"), false),
        Tier("silver", "Silver", 1200.0, "INR", 180, listOf("200 listings", "Boosts & featured", "Verified badge", "5 photos per post", "7-day free trial", "Chat support"), true),
        Tier("premium", "Premium", 1500.0, "INR", 365, listOf("Unlimited listings", "45 days visibility", "Crown badge", "10 photos per post", "Priority support", "14-day free trial", "Custom storefront"), false),
    )
}

@Composable
fun TierSelectionScreen(onBack: () -> Unit, viewModel: TiersViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0xFFF8FAFC), Color(0xFFEFF6FF), Color(0xFFF0F9FF))))) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar(stringResource(R.string.plans_title), onBack)
            if (state.loading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
            } else {
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    // Hero section
                    item {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                            Surface(shape = CircleShape, color = Color(0xFF2563EB).copy(alpha = 0.1f), modifier = Modifier.size(64.dp)) {
                                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                    Icon(Icons.Filled.Bolt, null, tint = Color(0xFF2563EB), modifier = Modifier.size(32.dp))
                                }
                            }
                            Spacer(Modifier.height(12.dp))
                            Text(stringResource(R.string.plans_title), fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = Color(0xFF0F172A))
                            Spacer(Modifier.height(4.dp))
                            Text(stringResource(R.string.plans_subtitle), fontSize = 14.sp, color = Color(0xFF64748B), textAlign = androidx.compose.ui.text.style.TextAlign.Center, modifier = Modifier.padding(horizontal = 24.dp))
                        }
                    }
                    // Trial-period banner
                    item {
                        Surface(shape = RoundedCornerShape(16.dp), color = Color(0xFFFEF3C7), modifier = Modifier.fillMaxWidth(), shadowElevation = 2.dp) {
                            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Surface(shape = CircleShape, color = Color(0xFFFBBF24).copy(alpha = 0.3f), modifier = Modifier.size(40.dp)) {
                                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                        Icon(Icons.Filled.Bolt, null, tint = Color(0xFFD97706), modifier = Modifier.size(22.dp))
                                    }
                                }
                                Column(Modifier.weight(1f)) {
                                    Text(stringResource(R.string.plans_trial_title), fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF78350F))
                                    Text(stringResource(R.string.plans_trial_subtitle), fontSize = 12.sp, color = Color(0xFF92400E))
                                }
                                Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFD97706)) {
                                    Text("FREE", fontSize = 10.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                                }
                            }
                        }
                    }
                    // Active subscription banner with cancel
                    state.currentSubscription?.let { sub ->
                        item(key = "active_sub") {
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = Color(0xFFEFF6FF),
                                border = BorderStroke(1.5.dp, Color(0xFF2563EB).copy(alpha = 0.4f)),
                                modifier = Modifier.fillMaxWidth(),
                                shadowElevation = 2.dp,
                            ) {
                                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF2563EB), modifier = Modifier.size(20.dp))
                                        Text("Active Plan", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF1E40AF))
                                        Spacer(Modifier.weight(1f))
                                        Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFF2563EB)) {
                                            Text("ACTIVE", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color.White, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                                        }
                                    }
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Column {
                                            Text(sub.tier?.replaceFirstChar(Char::uppercase) ?: "Subscription", fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = Color(0xFF0F172A))
                                            sub.expiresAt?.let { exp ->
                                                Text("Expires: $exp", fontSize = 11.sp, color = Color(0xFF64748B))
                                            }
                                        }
                                        OutlinedButton(
                                            onClick = { viewModel.cancelSubscription() },
                                            enabled = !state.cancelLoading,
                                            colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFDC2626)),
                                            border = BorderStroke(1.dp, Color(0xFFDC2626).copy(alpha = 0.5f)),
                                        ) {
                                            if (state.cancelLoading) {
                                                CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp, color = Color(0xFFDC2626))
                                            } else {
                                                Text("Cancel", fontSize = 12.sp)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    items(state.tiers, key = { it.id ?: it.name ?: "" }) { tier ->
                        TierCard(tier = tier, onSelect = { viewModel.subscribe(tier.id ?: "") })
                    }
                    // Feature comparison
                    item {
                        Spacer(Modifier.height(8.dp))
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 12.dp)) {
                            Icon(Icons.AutoMirrored.Filled.CompareArrows, null, tint = Color(0xFF2563EB), modifier = Modifier.size(22.dp))
                            Text(stringResource(R.string.plans_feature_comparison), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF0F172A))
                        }
                        val tierNames = listOf(stringResource(R.string.plans_basic), stringResource(R.string.plans_bronze), stringResource(R.string.plans_silver), stringResource(R.string.plans_gold), stringResource(R.string.plans_premium))
                        val featureMatrixRows = listOf(
                            stringResource(R.string.plans_post_listings) to listOf("1", "3", "5", "10", stringResource(R.string.plans_unlimited)),
                            stringResource(R.string.plans_photos_per_post) to listOf("1", "3", "5", "8", "10"),
                            stringResource(R.string.plans_promoted_posts) to listOf("âœ—", "1", "2", "5", stringResource(R.string.plans_unlimited)),
                            stringResource(R.string.plans_analytics_access) to listOf("âœ—", stringResource(R.string.plans_basic), stringResource(R.string.plans_basic), stringResource(R.string.plans_advanced), stringResource(R.string.plans_full)),
                            stringResource(R.string.plans_priority_support) to listOf("âœ—", "âœ—", "âœ“", "âœ“", "âœ“"),
                            stringResource(R.string.plans_profile_badge) to listOf("âœ—", stringResource(R.string.plans_bronze), stringResource(R.string.plans_silver), stringResource(R.string.plans_gold), stringResource(R.string.plans_premium)),
                            stringResource(R.string.plans_kyc_verified) to listOf("âœ“", "âœ“", "âœ“", "âœ“", "âœ“"),
                            stringResource(R.string.plans_chat_support) to listOf("âœ—", "âœ—", "âœ“", "âœ“", "âœ“"),
                            stringResource(R.string.plans_bulk_manage) to listOf("âœ—", "âœ—", "âœ—", "âœ“", "âœ“"),
                            stringResource(R.string.plans_export_analytics) to listOf("âœ—", "âœ—", "âœ—", "âœ“", "âœ“"),
                            stringResource(R.string.plans_custom_storefront) to listOf("âœ—", "âœ—", "âœ—", "âœ—", "âœ“"),
                            stringResource(R.string.plans_dedicated_manager) to listOf("âœ—", "âœ—", "âœ—", "âœ—", "âœ“"),
                        )
                        val unlimitedLabel = stringResource(R.string.plans_unlimited)
                        val fullLabel = stringResource(R.string.plans_full)
                        Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 3.dp, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(16.dp)) {
                                Row(Modifier.fillMaxWidth()) {
                                    Text(stringResource(R.string.commerce_feature_col), fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF64748B), modifier = Modifier.width(110.dp))
                                    tierNames.forEach { name ->
                                        Text(name, fontWeight = FontWeight.Bold, fontSize = 9.sp, color = Color(0xFF1E293B), textAlign = androidx.compose.ui.text.style.TextAlign.Center, modifier = Modifier.weight(1f), maxLines = 1)
                                    }
                                }
                                HorizontalDivider(Modifier.padding(vertical = 8.dp), color = Color(0xFFE2E8F0))
                                featureMatrixRows.forEachIndexed { idx, (feature, values) ->
                                    Row(
                                        Modifier.fillMaxWidth().then(if (idx % 2 == 0) Modifier.background(Color(0xFFF8FAFC), RoundedCornerShape(6.dp)) else Modifier).padding(vertical = 6.dp, horizontal = 4.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(feature, fontSize = 11.sp, color = Color(0xFF374151), modifier = Modifier.width(110.dp))
                                        values.forEach { v ->
                                            Text(
                                                v, fontSize = 10.sp,
                                                color = when { v == "âœ“" || v == unlimitedLabel || v == fullLabel -> Color(0xFF22C55E); v == "âœ—" -> Color(0xFFCBD5E1); else -> Color(0xFF374151) },
                                                fontWeight = if (v == "âœ“" || v == "âœ—" || v == unlimitedLabel) FontWeight.Bold else FontWeight.Normal,
                                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                                modifier = Modifier.weight(1f),
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                    // Subscription history
                    if (state.historyLoading || state.subscriptionHistory.isNotEmpty()) {
                        item(key = "sub_history_header") {
                            Spacer(Modifier.height(8.dp))
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 4.dp)) {
                                Icon(Icons.Filled.History, null, tint = Color(0xFF2563EB), modifier = Modifier.size(20.dp))
                                Text("Subscription History", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF0F172A))
                            }
                            if (state.historyLoading) {
                                Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                                    CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = Color(0xFF2563EB))
                                }
                            }
                        }
                        items(state.subscriptionHistory, key = { it.id ?: it.tier ?: it.hashCode().toString() }) { record ->
                            Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Surface(shape = CircleShape, color = Color(0xFFEFF6FF), modifier = Modifier.size(36.dp)) {
                                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                            Icon(Icons.Filled.Receipt, null, tint = Color(0xFF2563EB), modifier = Modifier.size(18.dp))
                                        }
                                    }
                                    Column(Modifier.weight(1f)) {
                                        Text(record.tier?.replaceFirstChar(Char::uppercase) ?: "Plan", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF0F172A))
                                        record.startedAt?.let { Text("Started: $it", fontSize = 11.sp, color = Color(0xFF64748B)) }
                                        record.expiresAt?.let { Text("Expires: $it", fontSize = 11.sp, color = Color(0xFF64748B)) }
                                    }
                                    val statusColor = when (record.status?.lowercase()) {
                                        "active" -> Color(0xFF22C55E)
                                        "cancelled", "canceled" -> Color(0xFFEF4444)
                                        "expired" -> Color(0xFF94A3B8)
                                        else -> Color(0xFF94A3B8)
                                    }
                                    Surface(shape = RoundedCornerShape(20.dp), color = statusColor.copy(alpha = 0.1f)) {
                                        Text(
                                            record.status?.replaceFirstChar(Char::uppercase) ?: "Unknown",
                                            fontSize = 10.sp, fontWeight = FontWeight.Bold, color = statusColor,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                        )
                                    }
                                }
                            }
                        }
                    }
                    // Bottom FAQ/Trust section
                    item {
                        Spacer(Modifier.height(8.dp))
                        Surface(shape = RoundedCornerShape(16.dp), color = Color(0xFFF0FDF4), modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                Icon(Icons.Filled.Security, null, tint = Color(0xFF16A34A), modifier = Modifier.size(24.dp))
                                Column {
                                    Text("100% Secure Payment", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF14532D))
                                    Text("Cancel anytime â€¢ No hidden charges â€¢ Instant activation", fontSize = 11.sp, color = Color(0xFF166534))
                                }
                            }
                        }
                        Spacer(Modifier.height(80.dp))
                    }
                }
            }
        }
    }
}

@Composable
private fun TierCard(tier: Tier, onSelect: () -> Unit) {
    val isPopular = tier.popular
    val cardColors = if (isPopular) {
        listOf(Color(0xFF1E40AF), Color(0xFF2563EB), Color(0xFF3B82F6))
    } else null

    Surface(
        shape = RoundedCornerShape(20.dp),
        color = if (isPopular) Color.Transparent else Color.White,
        border = if (!isPopular) BorderStroke(1.dp, Color(0xFFE2E8F0)) else null,
        modifier = Modifier.fillMaxWidth(),
        shadowElevation = if (isPopular) 8.dp else 3.dp,
    ) {
        Box(
            modifier = if (isPopular) Modifier.background(Brush.linearGradient(cardColors!!)).padding(1.dp) else Modifier,
        ) {
            Column(
                Modifier
                    .then(if (isPopular) Modifier.background(Color(0xFFF0F9FF), RoundedCornerShape(19.dp)) else Modifier)
                    .padding(20.dp)
            ) {
                if (isPopular) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(bottom = 12.dp)) {
                        Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFF2563EB)) {
                            Row(Modifier.padding(horizontal = 10.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                Icon(Icons.Filled.Star, null, tint = Color(0xFFFBBF24), modifier = Modifier.size(12.dp))
                                Text(stringResource(R.string.plans_recommended), fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Bold)
                            }
                        }
                        Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFFDCFCE7)) {
                            Text("BEST VALUE", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A), modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                        }
                    }
                }
                Row(verticalAlignment = Alignment.Bottom) {
                    Column(Modifier.weight(1f)) {
                        Text(tier.name ?: "", fontWeight = FontWeight.Bold, fontSize = 22.sp, color = Color(0xFF0F172A))
                        if (tier.duration > 0) {
                            val durationText = when {
                                tier.duration >= 365 -> "${tier.duration / 365} year"
                                tier.duration >= 30 -> "${tier.duration / 30} months"
                                else -> "${tier.duration} days"
                            }
                            Text(durationText, fontSize = 12.sp, color = Color(0xFF64748B))
                        }
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        if (tier.price == 0.0) {
                            Text(stringResource(R.string.plans_free), fontWeight = FontWeight.ExtraBold, fontSize = 28.sp, color = Color(0xFF22C55E))
                        } else {
                            Text("â‚¹${tier.price.toLong()}", fontWeight = FontWeight.ExtraBold, fontSize = 28.sp, color = if (isPopular) Color(0xFF1E40AF) else Color(0xFF0F172A))
                            val period = when {
                                tier.duration >= 365 -> stringResource(R.string.plans_per_year)
                                tier.duration >= 180 -> stringResource(R.string.plans_per_half_year)
                                tier.duration >= 90 -> stringResource(R.string.plans_per_quarter)
                                else -> stringResource(R.string.plans_per_listing)
                            }
                            Text(period, fontSize = 11.sp, color = Color(0xFF94A3B8))
                        }
                    }
                }
                Spacer(Modifier.height(16.dp))
                HorizontalDivider(color = if (isPopular) Color(0xFFBFDBFE) else Color(0xFFF1F5F9))
                Spacer(Modifier.height(14.dp))
                tier.features.forEach { feature ->
                    Row(Modifier.padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                        Surface(shape = CircleShape, color = Color(0xFFDCFCE7), modifier = Modifier.size(20.dp)) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                Icon(Icons.Filled.Check, null, tint = Color(0xFF16A34A), modifier = Modifier.size(12.dp))
                            }
                        }
                        Spacer(Modifier.width(10.dp))
                        Text(feature, fontSize = 13.sp, color = Color(0xFF374151), lineHeight = 18.sp)
                    }
                }
                Spacer(Modifier.height(18.dp))
                Button(
                    onClick = onSelect,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isPopular) Color(0xFF2563EB) else Color(0xFF0F172A),
                    ),
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = if (isPopular) 6.dp else 2.dp),
                ) {
                    Text(
                        if (tier.price == 0.0) stringResource(R.string.plans_get_started_free) else stringResource(R.string.plans_subscribe_now),
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                    )
                    if (isPopular) {
                        Spacer(Modifier.width(8.dp))
                        Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = Color.White, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MyPostsScreen â€” with status filter, sort, menu, delete, promote, auto-refresh
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class MyPostsUiState(
    val loading: Boolean = true,
    val posts: List<Post> = emptyList(),
    val error: String? = null,
    val statusFilter: String = "all",
    val sortBy: String = "date",
    val showDeleteDialog: String? = null,
    val showPromoteDialog: String? = null,
    val showMenu: String? = null,
)

@HiltViewModel
class MyPostsViewModel @Inject constructor(private val repo: PostsRepository) : ViewModel() {
    private val _state = MutableStateFlow(MyPostsUiState())
    val state: StateFlow<MyPostsUiState> = _state.asStateFlow()
    init { load() }
    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true)
            when (val r = repo.mine()) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, posts = r.data)
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
            }
        }
    }
    fun setStatusFilter(f: String) { _state.value = _state.value.copy(statusFilter = f) }
    fun setSortBy(s: String) { _state.value = _state.value.copy(sortBy = s) }
    fun showDeleteDialog(id: String?) { _state.value = _state.value.copy(showDeleteDialog = id) }
    fun showPromoteDialog(id: String?) { _state.value = _state.value.copy(showPromoteDialog = id) }
    fun showMenu(id: String?) { _state.value = _state.value.copy(showMenu = id) }
    fun deletePost(id: String) {
        viewModelScope.launch {
            repo.delete(id)
            _state.value = _state.value.copy(posts = _state.value.posts.filter { it.stableId != id }, showDeleteDialog = null)
        }
    }
    fun filteredPosts(): List<Post> {
        val s = _state.value
        var filtered = when (s.statusFilter) {
            "active" -> s.posts.filter { it.status?.lowercase() == "active" }
            "draft" -> s.posts.filter { it.status?.lowercase() == "draft" }
            "sold" -> s.posts.filter { it.status?.lowercase() == "sold" }
            "archived" -> s.posts.filter { it.status?.lowercase() == "archived" }
            else -> s.posts
        }
        filtered = when (s.sortBy) {
            "views" -> filtered.sortedByDescending { it.views ?: 0 }
            "likes" -> filtered.sortedByDescending { it.likes ?: 0 }
            "price" -> filtered.sortedByDescending { it.price ?: 0.0 }
            "title" -> filtered.sortedBy { it.displayTitle }
            else -> filtered.sortedByDescending { it.createdAt ?: "" }
        }
        return filtered
    }
}

@Composable
fun MyPostsScreen(onBack: () -> Unit, onEdit: (String) -> Unit = {}, viewModel: MyPostsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val filtered = remember(state) { viewModel.filteredPosts() }
    var expanded by remember { mutableStateOf(false) }

    // Auto-refresh every 45 seconds
    LaunchedEffect(Unit) {
        while (isActive) {
            kotlinx.coroutines.delay(45_000)
            viewModel.load()
        }
    }

    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar(stringResource(R.string.my_posts_label), onBack)
            // Status filter tabs
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("all" to stringResource(R.string.commerce_filter_all), "active" to stringResource(R.string.commerce_filter_active), "draft" to stringResource(R.string.commerce_filter_draft), "sold" to stringResource(R.string.commerce_filter_sold), "archived" to stringResource(R.string.commerce_filter_archived)).forEach { (key, label) ->
                    FilterChip(
                        selected = state.statusFilter == key,
                        onClick = { viewModel.setStatusFilter(key) },
                        label = { Text(label, fontSize = 11.sp) },
                        shape = RoundedCornerShape(20.dp),
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White),
                    )
                }
            }
            // Sort dropdown
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.commerce_sort_by), fontSize = 13.sp, color = Color(0xFF64748B))
                Spacer(Modifier.width(8.dp))
                Box {
                    Surface(
                        onClick = { expanded = true },
                        shape = RoundedCornerShape(10.dp),
                        color = Color.White,
                        border = ButtonDefaults.outlinedButtonBorder(enabled = true),
                    ) {
                        Row(Modifier.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                when (state.sortBy) {
                                    "views" -> stringResource(R.string.commerce_sort_views)
                                    "likes" -> stringResource(R.string.commerce_sort_likes)
                                    "price" -> stringResource(R.string.commerce_sort_price)
                                    "title" -> stringResource(R.string.commerce_sort_title)
                                    else -> stringResource(R.string.commerce_sort_date)
                                },
                                fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF2563EB),
                            )
                            Icon(Icons.Filled.ArrowDropDown, null, tint = Color(0xFF2563EB), modifier = Modifier.size(18.dp))
                        }
                    }
                    DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                        listOf("date" to stringResource(R.string.commerce_sort_date), "views" to stringResource(R.string.commerce_sort_views), "likes" to stringResource(R.string.commerce_sort_likes), "price" to stringResource(R.string.commerce_sort_price), "title" to stringResource(R.string.commerce_sort_title)).forEach { (key, label) ->
                            DropdownMenuItem(text = { Text(label) }, onClick = { viewModel.setSortBy(key); expanded = false })
                        }
                    }
                }
            }

            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                filtered.isEmpty() -> EmptyState(
                    icon = { Icon(Icons.Filled.PostAdd, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp)) },
                    title = stringResource(R.string.commerce_no_posts), subtitle = stringResource(R.string.commerce_no_posts_desc),
                )
                else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    item { Text(stringResource(R.string.commerce_posts_count, filtered.size), fontSize = 13.sp, color = Color(0xFF64748B)) }
                    items(filtered, key = { it.stableId }) { post ->
                        MyPostCard(
                            post = post,
                            onEdit = { onEdit(post.stableId) },
                            onDelete = { viewModel.showDeleteDialog(post.stableId) },
                            onPromote = { viewModel.showPromoteDialog(post.stableId) },
                            onMenu = { viewModel.showMenu(post.stableId) },
                            isMenuOpen = state.showMenu == post.stableId,
                            onMenuDismiss = { viewModel.showMenu(null) },
                        )
                    }
                }
            }
        }
    }

    // Delete confirmation dialog
    if (state.showDeleteDialog != null) {
        AlertDialog(
            onDismissRequest = { viewModel.showDeleteDialog(null) },
            title = { Text(stringResource(R.string.commerce_delete_post_title)) },
            text = { Text(stringResource(R.string.commerce_delete_confirm)) },
            confirmButton = {
                Button(
                    onClick = { viewModel.deletePost(state.showDeleteDialog!!) },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                ) { Text(stringResource(R.string.action_delete)) }
            },
            dismissButton = { TextButton(onClick = { viewModel.showDeleteDialog(null) }) { Text(stringResource(R.string.action_cancel)) } },
        )
    }

    // Promote dialog
    if (state.showPromoteDialog != null) {
        AlertDialog(
            onDismissRequest = { viewModel.showPromoteDialog(null) },
            title = { Text(stringResource(R.string.commerce_boost_title)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(
                        Triple("Basic Boost", "â‚¹49", "3 days featured â€¢ 2x visibility"),
                        Triple("Pro Boost", "â‚¹99", "7 days featured â€¢ 5x visibility â€¢ Priority badge"),
                        Triple("Premium Boost", "â‚¹199", "14 days featured â€¢ 10x visibility â€¢ Homepage placement"),
                    ).forEach { (tier, price, desc) ->
                        Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFF8FAFC), modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(tier, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                                    Spacer(Modifier.weight(1f))
                                    Text(price, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF2563EB))
                                }
                                Text(desc, fontSize = 12.sp, color = Color(0xFF64748B))
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(onClick = { viewModel.showPromoteDialog(null) }) { Text(stringResource(R.string.commerce_continue_payment)) }
            },
            dismissButton = { TextButton(onClick = { viewModel.showPromoteDialog(null) }) { Text(stringResource(R.string.action_cancel)) } },
        )
    }
}

@Composable
private fun MyPostCard(
    post: Post,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onPromote: () -> Unit,
    onMenu: () -> Unit,
    isMenuOpen: Boolean,
    onMenuDismiss: () -> Unit,
) {
    Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                if (post.primaryImage != null) {
                    AsyncImage(
                        model = post.primaryImage, contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.size(70.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)),
                    )
                } else {
                    Box(Modifier.size(70.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Filled.Image, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(28.dp))
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B), maxLines = 2)
                    if (post.price != null) Text("â‚¹${post.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF2563EB))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                        post.status?.let { s -> StatusChip(s) }
                    }
                    // Metrics
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 4.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Visibility, null, tint = Color(0xFF64748B), modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(3.dp))
                            Text("${post.views ?: 0}", fontSize = 11.sp, color = Color(0xFF64748B))
                        }
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Favorite, null, tint = Color(0xFF64748B), modifier = Modifier.size(14.dp))
                            Spacer(Modifier.width(3.dp))
                            Text("${post.likes ?: 0}", fontSize = 11.sp, color = Color(0xFF64748B))
                        }
                    }
                }
                // Menu button
                Box {
                    IconButton(onClick = onMenu, modifier = Modifier.size(30.dp)) {
                        Icon(Icons.Filled.MoreVert, null, tint = Color(0xFF64748B))
                    }
                    DropdownMenu(expanded = isMenuOpen, onDismissRequest = onMenuDismiss) {
                        DropdownMenuItem(
                            text = { Text(stringResource(R.string.btn_edit)) },
                            leadingIcon = { Icon(Icons.Filled.Edit, null) },
                            onClick = { onEdit(); onMenuDismiss() },
                        )
                        DropdownMenuItem(
                            text = { Text(stringResource(R.string.btn_promote)) },
                            leadingIcon = { Icon(Icons.AutoMirrored.Filled.TrendingUp, null) },
                            onClick = { onPromote(); onMenuDismiss() },
                        )
                        DropdownMenuItem(
                            text = { Text(stringResource(R.string.btn_delete), color = Color(0xFFEF4444)) },
                            leadingIcon = { Icon(Icons.Filled.Delete, null, tint = Color(0xFFEF4444)) },
                            onClick = { onDelete(); onMenuDismiss() },
                        )
                    }
                }
            }
        }
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// BoughtPostsScreen / SoldPostsScreen
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class PostListUiState(val loading: Boolean = true, val posts: List<Post> = emptyList(), val error: String? = null)

@HiltViewModel
class SoldPostsViewModel @Inject constructor(private val repo: PostsRepository) : ViewModel() {
    private val _state = MutableStateFlow(PostListUiState())
    val state: StateFlow<PostListUiState> = _state.asStateFlow()
    init { load() }
    fun load() {
        viewModelScope.launch {
            _state.value = PostListUiState(loading = true)
            when (val r = repo.sold()) {
                is ApiResult.Success -> _state.value = PostListUiState(loading = false, posts = r.data)
                is ApiResult.Failure -> _state.value = PostListUiState(loading = false, error = r.error.message)
            }
        }
    }
}

@HiltViewModel
class BoughtPostsViewModel @Inject constructor(private val repo: PostsRepository) : ViewModel() {
    private val _state = MutableStateFlow(PostListUiState())
    val state: StateFlow<PostListUiState> = _state.asStateFlow()
    init { load() }
    fun load() {
        viewModelScope.launch {
            _state.value = PostListUiState(loading = true)
            when (val r = repo.bought()) {
                is ApiResult.Success -> _state.value = PostListUiState(loading = false, posts = r.data)
                is ApiResult.Failure -> _state.value = PostListUiState(loading = false, error = r.error.message)
            }
        }
    }
}

@Composable
fun SoldPostsScreen(onBack: () -> Unit, onOpenPost: (String) -> Unit = {}, viewModel: SoldPostsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    SoldPostsListScreen(state, onBack, onOpenPost)
}

@Composable
private fun SoldPostsListScreen(state: PostListUiState, onBack: () -> Unit, onOpenPost: (String) -> Unit) {
    var search by remember { mutableStateOf("") }
    var sortBy by remember { mutableStateOf("newest") }
    val displayed = remember(state.posts, search, sortBy) {
        var list = state.posts
        if (search.isNotBlank()) list = list.filter { it.displayTitle.contains(search, true) || (it.location ?: "").contains(search, true) }
        when (sortBy) {
            "price_asc" -> list = list.sortedBy { it.price ?: 0.0 }
            "price_desc" -> list = list.sortedByDescending { it.price ?: 0.0 }
            "views" -> list = list.sortedByDescending { it.viewCount ?: 0 }
            "likes" -> list = list.sortedByDescending { it.likeCount ?: 0 }
            else -> list = list.sortedByDescending { it.createdAt ?: "" }
        }
        list
    }
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar(stringResource(R.string.sold_title), onBack)
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                state.error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(state.error, color = Color(0xFF64748B), fontSize = 14.sp) }
                else -> {
                    OutlinedTextField(
                        value = search, onValueChange = { search = it },
                        placeholder = { Text(stringResource(R.string.commerce_search_sales)) },
                        leadingIcon = { Icon(Icons.Filled.Search, null, tint = Color(0xFF64748B)) },
                        trailingIcon = { if (search.isNotBlank()) IconButton(onClick = { search = "" }) { Icon(Icons.Filled.Close, null, tint = Color(0xFF94A3B8)) } },
                        singleLine = true, shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                    )
                    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        // Extended sort: now includes views/likes (web-parity: SoldPosts.jsx sort options)
                        listOf("newest" to stringResource(R.string.commerce_sort_newest), "price_desc" to stringResource(R.string.commerce_sort_price_down), "views" to stringResource(R.string.commerce_sort_views), "likes" to stringResource(R.string.commerce_sort_likes)).forEach { (key, label) ->
                            FilterChip(selected = sortBy == key, onClick = { sortBy = key },
                                label = { Text(label, fontSize = 11.sp) }, shape = RoundedCornerShape(20.dp),
                                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White))
                        }
                    }
                    if (displayed.isEmpty()) EmptyState(icon = { Icon(Icons.Filled.Inventory, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp)) }, title = stringResource(R.string.sold_empty), subtitle = stringResource(R.string.sold_empty_subtitle))
                    else LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        item { Text(stringResource(R.string.commerce_sales_count, displayed.size), fontSize = 13.sp, color = Color(0xFF64748B)) }
                        items(displayed, key = { it.stableId }) { post ->
                            // Rich card with per-item analytics mini-row (web-parity: SoldPosts.jsx statRow)
                            Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                                Column(Modifier.clickable { (post.id ?: post.postId)?.let(onOpenPost) }) {
                                    Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                        if (post.primaryImage != null) AsyncImage(model = post.primaryImage, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.size(56.dp).clip(RoundedCornerShape(10.dp)))
                                        else Box(Modifier.size(56.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)), contentAlignment = Alignment.Center) { Icon(Icons.Filled.Image, null, tint = Color(0xFFCBD5E1)) }
                                        Spacer(Modifier.width(12.dp))
                                        Column(Modifier.weight(1f)) {
                                            Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF1E293B), maxLines = 1, overflow = TextOverflow.Ellipsis)
                                            if (post.price != null) Text("â‚¹${post.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF2563EB))
                                        }
                                        Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFDCFCE7)) {
                                            Text(stringResource(R.string.commerce_badge_sold), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color(0xFF16A34A), modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp))
                                        }
                                    }
                                    // Per-item analytics row (web-parity: SoldPosts.jsx inline stats)
                                    HorizontalDivider(color = Color(0xFFF1F5F9))
                                    Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                            Icon(Icons.Filled.Visibility, null, tint = Color(0xFF64748B), modifier = Modifier.size(13.dp))
                                            Text("${post.viewCount ?: 0} views", fontSize = 11.sp, color = Color(0xFF64748B))
                                        }
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                            Icon(Icons.Filled.Favorite, null, tint = Color(0xFFEF4444), modifier = Modifier.size(13.dp))
                                            Text("${post.likeCount ?: 0} likes", fontSize = 11.sp, color = Color(0xFF64748B))
                                        }
                                        post.createdAt?.take(10)?.let { date ->
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                                Icon(Icons.Filled.CalendarToday, null, tint = Color(0xFF64748B), modifier = Modifier.size(13.dp))
                                                Text(date, fontSize = 11.sp, color = Color(0xFF64748B))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun BoughtPostsScreen(onBack: () -> Unit, onOpenPost: (String) -> Unit = {}, viewModel: BoughtPostsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    PostsListScreen(stringResource(R.string.bought_title), Icons.Filled.ShoppingBag, stringResource(R.string.bought_title), stringResource(R.string.bought_empty), state, onBack, onOpenPost)
}

@Composable
private fun PostsListScreen(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    subtitle: String,
    emptyMsg: String,
    state: PostListUiState,
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit = {},
) {
    var search by remember { mutableStateOf("") }
    var sortBy by remember { mutableStateOf("newest") }
    val displayed = remember(state.posts, search, sortBy) {
        var list = state.posts
        if (search.isNotBlank()) list = list.filter { it.displayTitle.contains(search, true) || (it.location ?: "").contains(search, true) }
        when (sortBy) {
            "price_asc" -> list = list.sortedBy { it.price ?: 0.0 }
            "price_desc" -> list = list.sortedByDescending { it.price ?: 0.0 }
            else -> list = list.sortedByDescending { it.createdAt ?: "" }
        }
        list
    }
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar(title, onBack)
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                state.error != null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(state.error, color = Color(0xFF64748B), fontSize = 14.sp)
                }
                else -> {
                    // Search bar
                    OutlinedTextField(
                        value = search, onValueChange = { search = it },
                        placeholder = { Text(stringResource(R.string.commerce_search_location)) },
                        leadingIcon = { Icon(Icons.Filled.Search, null, tint = Color(0xFF64748B)) },
                        trailingIcon = { if (search.isNotBlank()) IconButton(onClick = { search = "" }) { Icon(Icons.Filled.Close, null, tint = Color(0xFF94A3B8)) } },
                        singleLine = true, shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                    )
                    // Sort chips
                    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("newest" to "Newest", "price_asc" to "Price â†‘", "price_desc" to "Price â†“").forEach { (key, label) ->
                            FilterChip(selected = sortBy == key, onClick = { sortBy = key },
                                label = { Text(label, fontSize = 11.sp) }, shape = RoundedCornerShape(20.dp),
                                colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White))
                        }
                    }
                    if (displayed.isEmpty()) EmptyState(
                        icon = { Icon(icon, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp)) },
                        title = if (search.isNotBlank()) "No results for \"$search\"" else emptyMsg, subtitle = subtitle,
                    )
                    else LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        item { Text(stringResource(R.string.commerce_items_count, displayed.size), fontSize = 13.sp, color = Color(0xFF64748B)) }
                        items(displayed, key = { it.stableId }) { post ->
                            PostListItem(post) { (post.id ?: post.postId)?.let(onOpenPost) }
                        }
                    }
                }
            }
        }
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// OffersScreen
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class OffersUiState(
    val loading: Boolean = true,
    val received: List<Offer> = emptyList(),
    val sent: List<Offer> = emptyList(),
    val error: String? = null,
    val tab: String = "received",
    val statusFilter: String? = null,
    val search: String = "",
)

@HiltViewModel
class OffersViewModel @Inject constructor(private val repo: OffersRepository) : ViewModel() {
    private val _state = MutableStateFlow(OffersUiState())
    val state: StateFlow<OffersUiState> = _state.asStateFlow()
    init { load() }
    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true)
            val received = repo.list("received")
            val sent = repo.list("sent")
            _state.value = _state.value.copy(
                loading = false,
                received = (received as? ApiResult.Success)?.data ?: emptyList(),
                sent = (sent as? ApiResult.Success)?.data ?: emptyList(),
            )
        }
    }
    fun setTab(t: String) { _state.value = _state.value.copy(tab = t) }
    fun setStatusFilter(f: String?) { _state.value = _state.value.copy(statusFilter = f) }
    fun setSearch(v: String) { _state.value = _state.value.copy(search = v) }
    fun accept(id: String) { viewModelScope.launch { repo.accept(id); load() } }
    fun decline(id: String) { viewModelScope.launch { repo.decline(id); load() } }
    fun counter(id: String, price: Double) { viewModelScope.launch { repo.counter(id, price); load() } }
    fun filteredOffers(): List<Offer> {
        val s = _state.value
        val base = if (s.tab == "received") s.received else s.sent
        var filtered = base
        if (s.statusFilter != null) filtered = filtered.filter { it.status?.lowercase() == s.statusFilter }
        if (s.search.isNotBlank()) filtered = filtered.filter {
            (it.postTitle ?: "").contains(s.search, true) || (it.buyerName ?: "").contains(s.search, true)
        }
        return filtered
    }
}

@Composable
fun OffersScreen(onBack: () -> Unit, viewModel: OffersViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val tabs = listOf("received" to "Received", "sent" to "Sent")
    val offers = remember(state) { viewModel.filteredOffers() }
    val statusFilters = listOf(null to "All", "pending" to "Pending", "accepted" to "Accepted", "rejected" to "Rejected", "countered" to "Countered")
    val steps = listOf("Submitted", "Review", "Payment", "Verification", "Closed")
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar(stringResource(R.string.offers_title), onBack)
            // Stepper
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                steps.forEachIndexed { i, label ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                        Box(Modifier.size(24.dp).clip(CircleShape).background(if (i == 0) Color(0xFF2563EB) else Color(0xFFE2E8F0)),
                            contentAlignment = Alignment.Center) {
                            Text("${i + 1}", fontSize = 10.sp, color = if (i == 0) Color.White else Color(0xFF94A3B8), fontWeight = FontWeight.Bold)
                        }
                        Text(label, fontSize = 8.sp, color = Color(0xFF64748B), maxLines = 1)
                    }
                }
            }
            TabRow(selectedTabIndex = tabs.indexOfFirst { it.first == state.tab }.coerceAtLeast(0), containerColor = Color.Transparent) {
                tabs.forEach { (key, label) ->
                    Tab(selected = state.tab == key, onClick = { viewModel.setTab(key) },
                        text = { Text(label, fontWeight = if (state.tab == key) FontWeight.SemiBold else FontWeight.Normal) })
                }
            }
            // Search + status filters
            OutlinedTextField(value = state.search, onValueChange = { viewModel.setSearch(it) },
                placeholder = { Text(stringResource(R.string.commerce_search_name)) },
                leadingIcon = { Icon(Icons.Filled.Search, null, tint = Color(0xFF64748B)) },
                singleLine = true, shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp))
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                statusFilters.forEach { (key, label) ->
                    FilterChip(selected = state.statusFilter == key, onClick = { viewModel.setStatusFilter(key) },
                        label = { Text(label, fontSize = 11.sp) }, shape = RoundedCornerShape(20.dp),
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White))
                }
            }
            if (state.loading) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
            else if (offers.isEmpty()) EmptyState(
                icon = { Icon(Icons.Filled.LocalOffer, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp)) },
                title = "No offers", subtitle = "Offers will appear here",
            )
            else LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                items(offers, key = { it.stableId }) { offer ->
                    OfferCard(offer = offer, isReceived = state.tab == "received",
                        onAccept = { viewModel.accept(offer.stableId) },
                        onDecline = { viewModel.decline(offer.stableId) },
                        onCounter = { price -> viewModel.counter(offer.stableId, price) })
                }
            }
        }
    }
}

@Composable
private fun OfferCard(offer: Offer, isReceived: Boolean, onAccept: () -> Unit, onDecline: () -> Unit, onCounter: (Double) -> Unit) {
    var showCounter by remember { mutableStateOf(false) }
    var counterPrice by remember { mutableStateOf("") }
    val statusColor = when (offer.status?.lowercase()) {
        "pending" -> Color(0xFFF59E0B)
        "accepted" -> Color(0xFF22C55E)
        "rejected" -> Color(0xFFEF4444)
        "countered" -> Color(0xFF3B82F6)
        "paid" -> Color(0xFF10B981)
        else -> Color(0xFF64748B)
    }
    
    // Expiry countdown
    val expiryLabel = remember(offer.expiresAt) {
        if (offer.expiresAt == null) null
        else try {
            val expiry = Instant.parse(if (offer.expiresAt.endsWith("Z")) offer.expiresAt else "${offer.expiresAt}Z")
            val now = Instant.now()
            val hoursLeft = ChronoUnit.HOURS.between(now, expiry)
            val minutesLeft = ChronoUnit.MINUTES.between(now, expiry)
            when {
                minutesLeft <= 0 -> "Expired"
                hoursLeft < 1 -> "${minutesLeft}m left"
                hoursLeft < 24 -> "${hoursLeft}h left"
                else -> "${hoursLeft / 24}d left"
            }
        } catch (_: Exception) { null }
    }
    
    // Savings percentage
    val savingsPercent = if (offer.originalPrice > 0 && offer.amount > 0) {
        ((offer.originalPrice - offer.amount) / offer.originalPrice * 100).toInt()
    } else 0

    Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (offer.postImage != null) {
                    AsyncImage(model = offer.postImage, contentDescription = null, contentScale = ContentScale.Crop,
                        modifier = Modifier.size(50.dp).clip(RoundedCornerShape(8.dp)))
                    Spacer(Modifier.width(12.dp))
                }
                Column(Modifier.weight(1f)) {
                    Text(offer.postTitle ?: "Listing", fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color(0xFF1E293B))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("â‚¹${offer.amount.toLong()}", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF2563EB))
                        if (offer.originalPrice > 0) {
                            Spacer(Modifier.width(6.dp))
                            Text("â‚¹${offer.originalPrice.toLong()}", fontSize = 12.sp, color = Color(0xFF94A3B8),
                                style = androidx.compose.ui.text.TextStyle(textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough))
                        }
                        if (savingsPercent > 0) {
                            Spacer(Modifier.width(4.dp))
                            Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFDCFCE7)) {
                                Text("$savingsPercent% off", fontSize = 11.sp, color = Color(0xFF166534), fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                            }
                        }
                    }
                    Text(if (isReceived) "From: ${offer.buyerName ?: "Buyer"}" else "To: ${offer.sellerName ?: "Seller"}", fontSize = 12.sp, color = Color(0xFF64748B))
                    
                    // Expiry countdown with urgency badge
                    if (expiryLabel != null) {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                            Icon(Icons.Filled.Schedule, null, tint = if (expiryLabel.contains("m left")) Color(0xFFEF4444) else Color(0xFF64748B), modifier = Modifier.size(12.dp))
                            Spacer(Modifier.width(3.dp))
                            Text(expiryLabel, fontSize = 11.sp, color = if (expiryLabel.contains("m left")) Color(0xFFEF4444) else Color(0xFF64748B), fontWeight = FontWeight.Medium)
                            if (expiryLabel.contains("m left") || (expiryLabel.contains("h left") && expiryLabel.startsWith("1") || expiryLabel.startsWith("2"))) {
                                Spacer(Modifier.width(4.dp))
                                Surface(shape = RoundedCornerShape(4.dp), color = Color(0xFFEF4444)) {
                                    Text(stringResource(R.string.commerce_badge_urgent), fontSize = 9.sp, color = Color.White, fontWeight = FontWeight.Bold,
                                        modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp))
                                }
                            }
                        }
                    }
                }
                Surface(shape = RoundedCornerShape(12.dp), color = statusColor.copy(alpha = 0.15f)) {
                    Text(offer.status?.replaceFirstChar { it.uppercase() } ?: "Pending", fontSize = 11.sp,
                        color = statusColor, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                }
            }
            if (isReceived && offer.status?.lowercase() == "pending") {
                Spacer(Modifier.height(12.dp))
                if (showCounter) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(value = counterPrice, onValueChange = { counterPrice = it }, singleLine = true,
                            placeholder = { Text(stringResource(R.string.commerce_counter_price)) }, shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.weight(1f),
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
                        Button(onClick = { counterPrice.toDoubleOrNull()?.let { onCounter(it); showCounter = false } },
                            shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
                            contentPadding = PaddingValues(horizontal = 12.dp)) { Text(stringResource(R.string.btn_send)) }
                    }
                } else {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = onDecline, modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp)) { Text(stringResource(R.string.btn_decline), color = Color(0xFFDC2626)) }
                        OutlinedButton(onClick = { showCounter = true }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp)) { Text(stringResource(R.string.btn_counter), color = Color(0xFF3B82F6)) }
                        Button(onClick = onAccept, modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))) { Text(stringResource(R.string.btn_accept)) }
                    }
                }
            }
        }
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CartScreen
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class CartUiState(
    val loading: Boolean = true,
    val items: List<CartItem> = emptyList(),
    val savedForLater: List<CartItem> = emptyList(),
    val total: Double = 0.0,
    val error: String? = null,
    val couponCode: String = "",
    val couponDiscount: Double = 0.0,
    val couponMessage: String? = null,
    val couponApplied: Boolean = false,
    val selectedPayment: String = "upi",
    val deliveryAddress: String = "",
    val pendingUndoItem: CartItem? = null,
    val selectedIds: Set<String> = emptySet(),
)

@HiltViewModel
class CartViewModel @Inject constructor(private val repo: CartRepository) : ViewModel() {
    private val _state = MutableStateFlow(CartUiState())
    val state: StateFlow<CartUiState> = _state.asStateFlow()
    init { load() }
    fun load() {
        viewModelScope.launch {
            when (val r = repo.get()) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, items = r.data.items, total = r.data.total)
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
            }
        }
    }
    fun remove(postId: String) { viewModelScope.launch { repo.remove(postId); load() } }
    fun removeWithUndo(postId: String) {
        val item = _state.value.items.find { it.postId == postId } ?: return
        _state.value = _state.value.copy(
            items = _state.value.items.filter { it.postId != postId },
            pendingUndoItem = item,
        )
    }
    fun undoRemove() {
        val item = _state.value.pendingUndoItem ?: return
        _state.value = _state.value.copy(
            items = listOf(item) + _state.value.items,
            pendingUndoItem = null,
        )
    }
    fun commitRemove() {
        val item = _state.value.pendingUndoItem ?: return
        _state.value = _state.value.copy(pendingUndoItem = null)
        viewModelScope.launch { repo.remove(item.postId ?: "") }
    }
    fun saveForLater(postId: String) {
        val item = _state.value.items.find { it.postId == postId } ?: return
        _state.value = _state.value.copy(
            items = _state.value.items.filter { it.postId != postId },
            savedForLater = _state.value.savedForLater + item,
        )
    }
    fun moveToCart(postId: String) {
        val item = _state.value.savedForLater.find { it.postId == postId } ?: return
        _state.value = _state.value.copy(
            savedForLater = _state.value.savedForLater.filter { it.postId != postId },
            items = _state.value.items + item,
        )
    }
    fun updateQty(postId: String, qty: Int) {
        if (qty < 1 || qty > 10) return
        viewModelScope.launch { repo.updateQty(postId, qty); load() }
    }
    fun setCouponCode(v: String) { _state.value = _state.value.copy(couponCode = v) }
    fun setPayment(v: String) { _state.value = _state.value.copy(selectedPayment = v) }
    fun setDeliveryAddress(v: String) { _state.value = _state.value.copy(deliveryAddress = v) }
    fun applyCoupon() {
        val code = _state.value.couponCode.trim()
        if (code.isBlank()) return
        viewModelScope.launch {
            when (val r = repo.applyCoupon(code)) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    couponApplied = r.data.success, couponDiscount = r.data.discount,
                    couponMessage = r.data.message ?: if (r.data.success) "Coupon applied!" else "Invalid coupon")
                is ApiResult.Failure -> _state.value = _state.value.copy(couponMessage = "Failed to apply coupon")
            }
        }
    }
    val subtotal: Double get() = _state.value.items.sumOf { (it.price ?: 0.0) * it.quantity }
    val shipping: Double get() = if (subtotal > 500) 0.0 else 49.0
    val grandTotal: Double get() = subtotal + shipping - _state.value.couponDiscount
    fun toggleSelect(postId: String) {
        val cur = _state.value.selectedIds
        _state.value = _state.value.copy(selectedIds = if (postId in cur) cur - postId else cur + postId)
    }
    fun toggleSelectAll() {
        val allIds = _state.value.items.mapNotNull { it.postId }.toSet()
        _state.value = _state.value.copy(selectedIds = if (_state.value.selectedIds == allIds) emptySet() else allIds)
    }
    fun bulkRemove() {
        val ids = _state.value.selectedIds
        _state.value = _state.value.copy(items = _state.value.items.filter { (it.postId ?: "") !in ids }, selectedIds = emptySet())
        viewModelScope.launch { ids.forEach { repo.remove(it) } }
    }
    fun bulkSaveForLater() {
        val ids = _state.value.selectedIds
        val (toSave, keep) = _state.value.items.partition { (it.postId ?: "") in ids }
        _state.value = _state.value.copy(items = keep, savedForLater = _state.value.savedForLater + toSave, selectedIds = emptySet())
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CartScreen(onBack: () -> Unit, viewModel: CartViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()

    // Fire-and-forget snackbar when an item is pending undo
    LaunchedEffect(state.pendingUndoItem) {
        val item = state.pendingUndoItem ?: return@LaunchedEffect
        val result = snackbarHostState.showSnackbar(
            message = "${item.title ?: "Item"} removed",
            actionLabel = "UNDO",
            duration = SnackbarDuration.Short,
        )
        if (result == SnackbarResult.ActionPerformed) {
            viewModel.undoRemove()
        } else {
            viewModel.commitRemove()
        }
    }

    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar("${stringResource(R.string.cart_title)} (${state.items.size})", onBack)

            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                state.items.isEmpty() && state.savedForLater.isEmpty() -> EmptyState(
                    icon = { Icon(Icons.Filled.ShoppingCart, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp)) },
                    title = "Your cart is empty", subtitle = "Add items to proceed to checkout",
                )
                else -> Column(Modifier.fillMaxSize()) {
                    // Bulk selection toolbar
                    if (state.items.isNotEmpty()) {
                        Surface(color = Color.White, shadowElevation = 1.dp) {
                            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                                val allIds = state.items.mapNotNull { it.postId }.toSet()
                                Checkbox(checked = state.selectedIds == allIds && allIds.isNotEmpty(), onCheckedChange = { viewModel.toggleSelectAll() })
                                Text(if (state.selectedIds.isEmpty()) "Select All" else "${state.selectedIds.size} selected",
                                    fontSize = 13.sp, color = Color(0xFF374151), modifier = Modifier.weight(1f))
                                if (state.selectedIds.isNotEmpty()) {
                                    TextButton(onClick = { viewModel.bulkSaveForLater() }) { Text(stringResource(R.string.commerce_save_for_later), fontSize = 12.sp) }
                                    TextButton(onClick = { viewModel.bulkRemove() }, colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFFEF4444))) { Text(stringResource(R.string.btn_remove), fontSize = 12.sp) }
                                }
                            }
                        }
                    }
                    LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        // Cart items
                        if (state.items.isNotEmpty()) {
                            item { Text("Cart (${state.items.size})", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151)) }
                            items(state.items, key = { it.stableId }) { item ->
                                val checked = (item.postId ?: "") in state.selectedIds
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Checkbox(checked = checked, onCheckedChange = { viewModel.toggleSelect(item.postId ?: "") }, modifier = Modifier.size(32.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Box(Modifier.weight(1f)) {
                                val dismissState = rememberSwipeToDismissBoxState(
                                    confirmValueChange = { value ->
                                        if (value == SwipeToDismissBoxValue.EndToStart || value == SwipeToDismissBoxValue.StartToEnd) {
                                            viewModel.removeWithUndo(item.postId ?: "")
                                            true
                                        } else false
                                    },
                                    positionalThreshold = { it * 0.4f },
                                )
                                SwipeToDismissBox(
                                    state = dismissState,
                                    backgroundContent = {
                                        val color by animateColorAsState(
                                            if (dismissState.dismissDirection == SwipeToDismissBoxValue.Settled) Color.Transparent
                                            else Color(0xFFEF4444),
                                            label = "swipe_bg",
                                        )
                                        Box(
                                            Modifier.fillMaxSize().clip(RoundedCornerShape(14.dp)).background(color),
                                            contentAlignment = Alignment.CenterEnd,
                                        ) {
                                            Icon(
                                                Icons.Filled.Delete, contentDescription = "Remove",
                                                tint = Color.White, modifier = Modifier.padding(end = 20.dp),
                                            )
                                        }
                                    },
                                ) {
                                    CartItemCard(
                                        item = item,
                                        onRemove = { viewModel.removeWithUndo(item.postId ?: "") },
                                        onQtyChange = { qty -> viewModel.updateQty(item.postId ?: "", qty) },
                                        onSaveForLater = { viewModel.saveForLater(item.postId ?: "") },
                                    )
                                }
                                    } // Box
                                } // Row
                            }
                        }

                        // Saved for later
                        if (state.savedForLater.isNotEmpty()) {
                            item {
                                Spacer(Modifier.height(4.dp))
                                Text("Saved for Later (${state.savedForLater.size})", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                            }
                            items(state.savedForLater, key = { "sfl_${it.stableId}" }) { item ->
                                SavedForLaterCard(item = item,
                                    onMoveToCart = { viewModel.moveToCart(item.postId ?: "") },
                                    onRemove = { viewModel.remove(item.postId ?: "") })
                            }
                        }

                        if (state.items.isNotEmpty()) {
                            // Delivery address
                            item {
                                Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(14.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Filled.LocationOn, null, tint = Color(0xFF2563EB), modifier = Modifier.size(18.dp))
                                            Spacer(Modifier.width(6.dp))
                                            Text(stringResource(R.string.commerce_delivery_address), fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                                        }
                                        Spacer(Modifier.height(8.dp))
                                        OutlinedTextField(
                                            value = state.deliveryAddress, onValueChange = { viewModel.setDeliveryAddress(it) },
                                            placeholder = { Text(stringResource(R.string.commerce_delivery_address_hint)) },
                                            maxLines = 2, minLines = 2, shape = RoundedCornerShape(10.dp),
                                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                                            modifier = Modifier.fillMaxWidth(),
                                        )
                                    }
                                }
                            }

                            // Payment method
                            item {
                                Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(14.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            Icon(Icons.Filled.Payment, null, tint = Color(0xFF2563EB), modifier = Modifier.size(18.dp))
                                            Spacer(Modifier.width(6.dp))
                                            Text(stringResource(R.string.commerce_payment_method), fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                                        }
                                        Spacer(Modifier.height(10.dp))
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            listOf(
                                                Triple("upi", "UPI", Icons.Filled.AccountBalance),
                                                Triple("card", "Card", Icons.Filled.CreditCard),
                                                Triple("cod", "Cash", Icons.Filled.Money),
                                            ).forEach { (key, label, icon) ->
                                                val sel = state.selectedPayment == key
                                                Surface(
                                                    onClick = { viewModel.setPayment(key) },
                                                    shape = RoundedCornerShape(10.dp),
                                                    color = if (sel) Color(0xFFEFF6FF) else Color(0xFFF8FAFC),
                                                    border = if (sel) ButtonDefaults.outlinedButtonBorder(enabled = true).copy(width = 2.dp) else ButtonDefaults.outlinedButtonBorder(enabled = true),
                                                    modifier = Modifier.weight(1f),
                                                ) {
                                                    Column(
                                                        Modifier.padding(10.dp),
                                                        horizontalAlignment = Alignment.CenterHorizontally,
                                                        verticalArrangement = Arrangement.spacedBy(4.dp),
                                                    ) {
                                                        Icon(icon, null, tint = if (sel) Color(0xFF2563EB) else Color(0xFF64748B), modifier = Modifier.size(20.dp))
                                                        Text(label, fontSize = 12.sp, fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal, color = if (sel) Color(0xFF2563EB) else Color(0xFF64748B))
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            // Coupon section
                            item {
                                Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(14.dp)) {
                                        Text(stringResource(R.string.commerce_have_coupon), fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                                        Spacer(Modifier.height(8.dp))
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            OutlinedTextField(value = state.couponCode, onValueChange = { viewModel.setCouponCode(it) },
                                                placeholder = { Text(stringResource(R.string.commerce_enter_code)) }, singleLine = true, shape = RoundedCornerShape(10.dp),
                                                modifier = Modifier.weight(1f),
                                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
                                            Button(onClick = { viewModel.applyCoupon() }, shape = RoundedCornerShape(10.dp),
                                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)) { Text(stringResource(R.string.commerce_apply)) }
                                        }
                                        state.couponMessage?.let { msg ->
                                            Spacer(Modifier.height(4.dp))
                                            Text(msg, fontSize = 12.sp, color = if (state.couponApplied) Color(0xFF22C55E) else Color(0xFFEF4444))
                                        }
                                    }
                                }
                            }

                            // Delivery ETA
                            item {
                                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFF0FDF4), modifier = Modifier.fillMaxWidth()) {
                                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Filled.LocalShipping, null, tint = Color(0xFF22C55E), modifier = Modifier.size(20.dp))
                                        Spacer(Modifier.width(8.dp))
                                        Text(stringResource(R.string.commerce_est_delivery), fontSize = 13.sp, color = Color(0xFF166534))
                                    }
                                }
                            }
                        }
                    }
                    // Summary footer (only if there are cart items)
                    if (state.items.isNotEmpty()) {
                        Surface(color = Color.White, shadowElevation = 8.dp) {
                            Column(Modifier.fillMaxWidth().padding(16.dp)) {
                                Row(Modifier.fillMaxWidth()) {
                                    Text(stringResource(R.string.commerce_subtotal), fontSize = 14.sp, color = Color(0xFF64748B))
                                    Spacer(Modifier.weight(1f))
                                    Text("â‚¹${viewModel.subtotal.toLong()}", fontSize = 14.sp, color = Color(0xFF1E293B))
                                }
                                Row(Modifier.fillMaxWidth()) {
                                    Text(stringResource(R.string.commerce_shipping), fontSize = 14.sp, color = Color(0xFF64748B))
                                    Spacer(Modifier.weight(1f))
                                    Text(if (viewModel.shipping == 0.0) "Free" else "â‚¹${viewModel.shipping.toLong()}", fontSize = 14.sp, color = if (viewModel.shipping == 0.0) Color(0xFF22C55E) else Color(0xFF1E293B))
                                }
                                if (state.couponDiscount > 0) {
                                    Row(Modifier.fillMaxWidth()) {
                                        Text(stringResource(R.string.commerce_discount), fontSize = 14.sp, color = Color(0xFF22C55E))
                                        Spacer(Modifier.weight(1f))
                                        Text("-â‚¹${state.couponDiscount.toLong()}", fontSize = 14.sp, color = Color(0xFF22C55E))
                                    }
                                }
                                HorizontalDivider(color = Color(0xFFE2E8F0), modifier = Modifier.padding(vertical = 8.dp))
                                Row(Modifier.fillMaxWidth()) {
                                    Text(stringResource(R.string.commerce_total), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
                                    Spacer(Modifier.weight(1f))
                                    Text("â‚¹${viewModel.grandTotal.toLong()}", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color(0xFF2563EB))
                                }
                                Spacer(Modifier.height(12.dp))
                                Button(onClick = {}, shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                    modifier = Modifier.fillMaxWidth().height(50.dp)) {
                                    Text(
                                        when (state.selectedPayment) {
                                            "upi" -> "Pay via UPI"
                                            "card" -> "Pay via Card"
                                            else -> "Place Order (COD)"
                                        },
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                }
                                Spacer(Modifier.height(12.dp))
                                // Trust badges
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                                    listOf(Icons.Filled.Lock to "Secure", Icons.Filled.VerifiedUser to "Protected", Icons.Filled.Replay to "Easy Returns").forEach { (icon, label) ->
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Icon(icon, null, tint = Color(0xFF22C55E), modifier = Modifier.size(18.dp))
                                            Text(label, fontSize = 10.sp, color = Color(0xFF64748B))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier.align(Alignment.BottomCenter),
        )
    }
}

@Composable
private fun CartItemCard(item: CartItem, onRemove: () -> Unit, onQtyChange: (Int) -> Unit, onSaveForLater: () -> Unit = {}) {
    Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
        Column {
            Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                if (item.imageUrl != null) {
                    AsyncImage(model = item.imageUrl, contentDescription = null, contentScale = ContentScale.Crop,
                        modifier = Modifier.size(60.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)))
                } else {
                    Box(Modifier.size(60.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Filled.Image, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(24.dp))
                    }
                }
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(item.title ?: "Item", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B), maxLines = 2)
                    if (item.price != null) Text("â‚¹${item.price.toLong()}", fontSize = 14.sp, color = Color(0xFF2563EB), fontWeight = FontWeight.Bold)
                    if (item.sellerName != null) Text(item.sellerName, fontSize = 12.sp, color = Color(0xFF64748B))
                    // Qty controls
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 6.dp)) {
                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFF1F5F9), modifier = Modifier.size(28.dp).clickable { onQtyChange(item.quantity - 1) }) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) { Text("âˆ’", fontWeight = FontWeight.Bold, color = Color(0xFF374151)) }
                        }
                        Text("${item.quantity}", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B), modifier = Modifier.padding(horizontal = 12.dp))
                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFF1F5F9), modifier = Modifier.size(28.dp).clickable { onQtyChange(item.quantity + 1) }) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) { Text("+", fontWeight = FontWeight.Bold, color = Color(0xFF374151)) }
                        }
                    }
                }
                IconButton(onClick = onRemove) {
                    Icon(Icons.Filled.Delete, null, tint = Color(0xFFEF4444))
                }
            }
            // Save for later
            TextButton(
                onClick = onSaveForLater,
                modifier = Modifier.padding(start = 8.dp, bottom = 4.dp),
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
            ) {
                Icon(Icons.Filled.Bookmark, null, tint = Color(0xFF2563EB), modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(4.dp))
                Text(stringResource(R.string.commerce_save_for_later), fontSize = 12.sp, color = Color(0xFF2563EB))
            }
        }
    }
}

@Composable
private fun SavedForLaterCard(item: CartItem, onMoveToCart: () -> Unit, onRemove: () -> Unit) {
    Surface(shape = RoundedCornerShape(14.dp), color = Color(0xFFF8FAFC), shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            if (item.imageUrl != null) {
                AsyncImage(model = item.imageUrl, contentDescription = null, contentScale = ContentScale.Crop,
                    modifier = Modifier.size(50.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)))
            } else {
                Box(Modifier.size(50.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.Image, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(20.dp))
                }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(item.title ?: "Item", fontSize = 13.sp, color = Color(0xFF374151), maxLines = 1)
                if (item.price != null) Text("â‚¹${item.price.toLong()}", fontSize = 13.sp, color = Color(0xFF2563EB), fontWeight = FontWeight.Bold)
            }
            TextButton(onClick = onMoveToCart, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) {
                Text(stringResource(R.string.commerce_move_to_cart), fontSize = 11.sp, color = Color(0xFF2563EB), fontWeight = FontWeight.SemiBold)
            }
            IconButton(onClick = onRemove, modifier = Modifier.size(30.dp)) {
                Icon(Icons.Filled.Close, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
            }
        }
    }
}



// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// RecentlyViewedScreen
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class RecentlyViewedUiState(val loading: Boolean = true, val posts: List<Post> = emptyList(), val error: String? = null)

@HiltViewModel
class RecentlyViewedViewModel @Inject constructor(private val repo: PostsRepository) : ViewModel() {
    private val _state = MutableStateFlow(RecentlyViewedUiState())
    val state: StateFlow<RecentlyViewedUiState> = _state.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        _state.value = RecentlyViewedUiState(loading = true)
        when (val r = repo.recentlyViewed()) {
            is ApiResult.Success -> _state.value = RecentlyViewedUiState(loading = false, posts = r.data)
            is ApiResult.Failure -> _state.value = RecentlyViewedUiState(loading = false, error = r.error.message)
        }
    } }
    fun clearAll() {
        _state.value = _state.value.copy(posts = emptyList())
        viewModelScope.launch { repo.clearRecentlyViewed() }
    }
    fun removePost(id: String) {
        _state.value = _state.value.copy(posts = _state.value.posts.filter { it.stableId != id })
        viewModelScope.launch { repo.deleteRecentlyViewed(id) }
    }
}

private fun timeSinceLabel(isoDate: String?): String {
    if (isoDate == null) return ""
    return try {
        val instant = Instant.parse(if (isoDate.endsWith("Z")) isoDate else "${isoDate}Z")
        val now = Instant.now()
        val minutesAgo = ChronoUnit.MINUTES.between(instant, now)
        when {
            minutesAgo < 1 -> "just now"
            minutesAgo < 60 -> "${minutesAgo}m ago"
            minutesAgo < 1440 -> "${minutesAgo / 60}h ago"
            minutesAgo < 10080 -> "${minutesAgo / 1440}d ago"
            else -> DateTimeFormatter.ofPattern("d MMM").format(instant.atZone(ZoneId.systemDefault()))
        }
    } catch (_: Exception) { isoDate.take(10) }
}

private fun dayGroup(isoDate: String?): String {
    if (isoDate == null) return "Earlier"
    return try {
        val date = Instant.parse(if (isoDate.endsWith("Z")) isoDate else "${isoDate}Z")
            .atZone(ZoneId.systemDefault()).toLocalDate()
        val today = LocalDate.now()
        when (ChronoUnit.DAYS.between(date, today)) {
            0L -> "Today"
            1L -> "Yesterday"
            else -> "Earlier"
        }
    } catch (_: Exception) { "Earlier" }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RecentlyViewedScreen(onBack: () -> Unit, onOpenPost: (String) -> Unit = {}, viewModel: RecentlyViewedViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    var isGrid by remember { mutableStateOf(false) }
    var search by remember { mutableStateOf("") }
    var statusFilter by remember { mutableStateOf("All") }
    var bulkSelect by remember { mutableStateOf(false) }
    var selectedIds by remember { mutableStateOf(setOf<String>()) }
    val statusOptions = listOf("All", "Available", "Sold", "Promoted")
    val displayed = remember(state.posts, search, statusFilter) {
        state.posts
            .filter { if (search.isBlank()) true else it.displayTitle.contains(search, true) || (it.location ?: "").contains(search, true) }
            .filter { post -> when (statusFilter) {
                "Available" -> post.status?.lowercase()?.let { it != "sold" } ?: true
                "Sold" -> post.status?.lowercase() == "sold"
                "Promoted" -> post.isPromoted == true
                else -> true
            } }
    }
    // Group by day
    val grouped = remember(displayed) {
        displayed.groupBy { dayGroup(it.createdAt) }
    }
    val groupOrder = listOf("Today", "Yesterday", "Earlier")

    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            // Header
            Row(
                Modifier.fillMaxWidth().padding(WindowInsets.statusBars.asPaddingValues()).padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Color(0xFF2563EB)) }
                Spacer(Modifier.width(8.dp))
                Column(Modifier.weight(1f)) {
                    Text(stringResource(R.string.recently_viewed_title), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
                    if (state.posts.isNotEmpty()) Text("${state.posts.size} items browsed", fontSize = 11.sp, color = Color(0xFF64748B))
                }
                if (state.posts.isNotEmpty()) TextButton(onClick = { viewModel.clearAll() }) { Text(stringResource(R.string.btn_clear_all), color = Color(0xFFEF4444), fontSize = 13.sp) }
                IconButton(onClick = { bulkSelect = !bulkSelect; if (!bulkSelect) selectedIds = emptySet() }, modifier = Modifier.size(36.dp)) {
                    Icon(if (bulkSelect) Icons.Filled.CheckBox else Icons.Filled.CheckBoxOutlineBlank, null, tint = if (bulkSelect) Color(0xFF2563EB) else Color(0xFF64748B))
                }
                IconButton(onClick = { isGrid = !isGrid }, modifier = Modifier.size(36.dp)) {
                    Icon(if (isGrid) Icons.AutoMirrored.Filled.ViewList else Icons.Filled.GridView, null, tint = Color(0xFF64748B))
                }
            }

            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                else -> {
                    OutlinedTextField(
                        value = search, onValueChange = { search = it },
                        placeholder = { Text(stringResource(R.string.commerce_search_recently)) },
                        leadingIcon = { Icon(Icons.Filled.Search, null, tint = Color(0xFF64748B)) },
                        trailingIcon = { if (search.isNotBlank()) IconButton(onClick = { search = "" }) { Icon(Icons.Filled.Close, null, tint = Color(0xFF94A3B8)) } },
                        singleLine = true, shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                    )
                    // Status filter chips (web-parity: RecentlyViewed.jsx filterTabs)
                    androidx.compose.foundation.lazy.LazyRow(
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(statusOptions) { opt ->
                            FilterChip(
                                selected = statusFilter == opt,
                                onClick = { statusFilter = opt },
                                label = { Text(opt, fontSize = 12.sp) },
                            )
                        }
                    }
                    // Bulk-select toolbar
                    if (bulkSelect && selectedIds.isNotEmpty()) {
                        Surface(color = Color(0xFFFEE2E2)) {
                            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                                Text("${selectedIds.size} selected", fontWeight = FontWeight.SemiBold, color = Color(0xFFDC2626), modifier = Modifier.weight(1f))
                                TextButton(onClick = { selectedIds.forEach { viewModel.removePost(it) }; selectedIds = emptySet(); bulkSelect = false }) {
                                    Text(stringResource(R.string.btn_delete_selected), color = Color(0xFFDC2626))
                                }
                                TextButton(onClick = { selectedIds = emptySet(); bulkSelect = false }) { Text(stringResource(R.string.btn_cancel)) }
                            }
                        }
                    }
                    Spacer(Modifier.height(4.dp))
                    if (displayed.isEmpty()) EmptyState(
                        icon = { Icon(Icons.Filled.History, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp)) },
                        title = if (search.isNotBlank()) "No results for \"$search\"" else "No recently viewed items",
                        subtitle = "Items you browse will appear here",
                    )
                    else if (isGrid) LazyVerticalGrid(
                        columns = GridCells.Fixed(2), contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        items(displayed, key = { it.stableId }) { post ->
                            val swipeState = rememberSwipeToDismissBoxState(
                                confirmValueChange = { value -> if (value == SwipeToDismissBoxValue.EndToStart) { viewModel.removePost(post.stableId); true } else false }
                            )
                            SwipeToDismissBox(
                                state = swipeState,
                                backgroundContent = {
                                    Box(Modifier.fillMaxSize().clip(RoundedCornerShape(14.dp)).background(Color(0xFFEF4444)), contentAlignment = Alignment.CenterEnd) {
                                        Icon(Icons.Filled.Delete, null, tint = Color.White, modifier = Modifier.padding(end = 16.dp))
                                    }
                                },
                                modifier = Modifier.clip(RoundedCornerShape(14.dp)),
                            ) {
                                Surface(modifier = Modifier.clickable { onOpenPost(post.stableId) }, shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp) {
                                    Column {
                                        Box(Modifier.fillMaxWidth().height(110.dp)) {
                                            if (post.primaryImage != null) AsyncImage(model = post.primaryImage, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 14.dp, topEnd = 14.dp)))
                                            else Box(Modifier.fillMaxSize().background(Color(0xFFF1F5F9)), contentAlignment = Alignment.Center) { Icon(Icons.Filled.Image, null, tint = Color(0xFFCBD5E1)) }
                                        }
                                        Column(Modifier.padding(8.dp)) {
                                            Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = Color(0xFF1E293B), maxLines = 2)
                                            if (post.price != null) Text("â‚¹${post.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF2563EB))
                                            val timeLabel = timeSinceLabel(post.createdAt)
                                            if (timeLabel.isNotEmpty()) Text(timeLabel, fontSize = 10.sp, color = Color(0xFF94A3B8))
                                        }
                                    }
                                }
                            }
                        }
                    }
                    else LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
                        groupOrder.forEach { group ->
                            val groupPosts = grouped[group] ?: return@forEach
                            if (groupPosts.isEmpty()) return@forEach
                            item {
                                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Text(group, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF6366F1))
                                    Spacer(Modifier.width(6.dp))
                                    Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFFEEF2FF)) {
                                        Text("${groupPosts.size}", fontSize = 11.sp, color = Color(0xFF6366F1), fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 7.dp, vertical = 2.dp))
                                    }
                                }
                            }
                            items(groupPosts, key = { it.stableId }) { post ->
                                val swipeState = rememberSwipeToDismissBoxState(
                                    confirmValueChange = { value -> if (value == SwipeToDismissBoxValue.EndToStart) { viewModel.removePost(post.stableId); true } else false }
                                )
                                SwipeToDismissBox(
                                    state = swipeState,
                                    backgroundContent = {
                                        Box(Modifier.fillMaxSize().padding(horizontal = 16.dp).clip(RoundedCornerShape(16.dp)).background(Color(0xFFEF4444)), contentAlignment = Alignment.CenterEnd) {
                                            Icon(Icons.Filled.Delete, null, tint = Color.White, modifier = Modifier.padding(end = 16.dp))
                                        }
                                    },
                                ) {
                                    Box(Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) {
                                        RecentlyViewedListItem(post) { onOpenPost(post.stableId) }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun RecentlyViewedListItem(post: Post, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp,
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
            if (post.primaryImage != null) {
                AsyncImage(
                    model = post.primaryImage, contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(70.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)),
                )
            } else {
                Box(
                    Modifier.size(70.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Filled.Image, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(28.dp)) }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B), maxLines = 2)
                if (post.price != null) {
                    Spacer(Modifier.height(3.dp))
                    Text("â‚¹${post.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF2563EB))
                }
                Spacer(Modifier.height(3.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    post.location?.let { loc ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.LocationOn, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(12.dp))
                            Text(loc, fontSize = 11.sp, color = Color(0xFF94A3B8), maxLines = 1)
                        }
                    }
                    val timeLabel = timeSinceLabel(post.createdAt)
                    if (timeLabel.isNotEmpty()) {
                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFF1F5F9)) {
                            Row(Modifier.padding(horizontal = 5.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                Icon(Icons.Filled.AccessTime, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(10.dp))
                                Text(timeLabel, fontSize = 10.sp, color = Color(0xFF94A3B8))
                            }
                        }
                    }
                }
                post.condition?.let { cond ->
                    Spacer(Modifier.height(2.dp))
                    StatusChip(cond)
                }
            }
        }
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SavedSearchesScreen
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class SavedSearchesUiState(
    val loading: Boolean = true,
    val searches: List<SavedSearch> = emptyList(),
    val error: String? = null,
    val newKeyword: String = "",
    val newLocation: String = "",
    val newMinPrice: String = "",
    val newMaxPrice: String = "",
    val newCategory: String = "",
    val showCreateForm: Boolean = false,
    val creating: Boolean = false,
    val notificationsEnabled: Map<String, Boolean> = emptyMap(),
)

@HiltViewModel
class SavedSearchesViewModel @Inject constructor(private val repo: SavedSearchesRepository) : ViewModel() {
    private val _state = MutableStateFlow(SavedSearchesUiState())
    val state: StateFlow<SavedSearchesUiState> = _state.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        when (val r = repo.list()) {
            is ApiResult.Success -> _state.value = _state.value.copy(loading = false, searches = r.data)
            is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
        }
    } }
    fun delete(id: String) { viewModelScope.launch { repo.delete(id); load() } }
    fun setNewKeyword(v: String) { _state.value = _state.value.copy(newKeyword = v) }
    fun setNewLocation(v: String) { _state.value = _state.value.copy(newLocation = v) }
    fun setNewMinPrice(v: String) { _state.value = _state.value.copy(newMinPrice = v.filter { it.isDigit() }) }
    fun setNewMaxPrice(v: String) { _state.value = _state.value.copy(newMaxPrice = v.filter { it.isDigit() }) }
    fun setNewCategory(v: String) { _state.value = _state.value.copy(newCategory = v) }
    fun toggleCreateForm() { _state.value = _state.value.copy(showCreateForm = !_state.value.showCreateForm) }
    fun toggleNotification(id: String) {
        val current = _state.value.notificationsEnabled[id] ?: true
        val newEnabled = !current
        _state.value = _state.value.copy(notificationsEnabled = _state.value.notificationsEnabled + (id to newEnabled))
        viewModelScope.launch { repo.toggleNotification(id, newEnabled) }
    }
    fun createSearch() {
        val s = _state.value
        if (s.newKeyword.isBlank()) return
        _state.value = s.copy(creating = true)
        viewModelScope.launch {
            repo.save(s.newKeyword, s.newCategory.ifBlank { null })
            _state.value = _state.value.copy(creating = false, showCreateForm = false, newKeyword = "", newLocation = "", newMinPrice = "", newMaxPrice = "", newCategory = "")
            load()
        }
    }
}

@Composable
fun SavedSearchesScreen(onBack: () -> Unit, onRunSearch: (String) -> Unit = {}, viewModel: SavedSearchesViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val categoryOptions = listOf("Electronics", "Fashion", "Vehicles", "Others", "Furniture", "Sports")
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            Row(Modifier.fillMaxWidth().padding(WindowInsets.statusBars.asPaddingValues()).padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Color(0xFF2563EB)) }
                Spacer(Modifier.width(8.dp))
                Column(Modifier.weight(1f)) {
                    Text(stringResource(R.string.saved_searches_title), fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
                    if (state.searches.isNotEmpty()) Text("${state.searches.size} searches · get notified on new matches", fontSize = 11.sp, color = Color(0xFF64748B))
                }
                IconButton(onClick = { viewModel.toggleCreateForm() }, modifier = Modifier.size(36.dp)) {
                    Icon(if (state.showCreateForm) Icons.Filled.Close else Icons.Filled.Add, null, tint = Color(0xFF2563EB))
                }
            }
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                else -> LazyColumn(contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    // Create form
                    if (state.showCreateForm) item {
                        Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 4.dp, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Text(stringResource(R.string.commerce_new_saved_search), fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color(0xFF1E293B))
                                HorizontalDivider(color = Color(0xFFE2E8F0))
                                OutlinedTextField(value = state.newKeyword, onValueChange = { viewModel.setNewKeyword(it) },
                                    placeholder = { Text(stringResource(R.string.commerce_keywords_hint)) },
                                    leadingIcon = { Icon(Icons.Filled.Search, null, tint = Color(0xFF64748B), modifier = Modifier.size(18.dp)) },
                                    singleLine = true, shape = RoundedCornerShape(10.dp),
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                                    modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = state.newLocation, onValueChange = { viewModel.setNewLocation(it) },
                                    placeholder = { Text(stringResource(R.string.commerce_location_optional)) },
                                    leadingIcon = { Icon(Icons.Filled.LocationOn, null, tint = Color(0xFF64748B), modifier = Modifier.size(18.dp)) },
                                    singleLine = true, shape = RoundedCornerShape(10.dp),
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                                    modifier = Modifier.fillMaxWidth())
                                // Price range
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedTextField(value = state.newMinPrice, onValueChange = { viewModel.setNewMinPrice(it) },
                                        placeholder = { Text(stringResource(R.string.commerce_min_price)) }, singleLine = true, shape = RoundedCornerShape(10.dp),
                                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                                        modifier = Modifier.weight(1f))
                                    OutlinedTextField(value = state.newMaxPrice, onValueChange = { viewModel.setNewMaxPrice(it) },
                                        placeholder = { Text(stringResource(R.string.commerce_max_price)) }, singleLine = true, shape = RoundedCornerShape(10.dp),
                                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                                        modifier = Modifier.weight(1f))
                                }
                                // Category chips
                                Text(stringResource(R.string.commerce_category), fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = Color(0xFF374151))
                                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    categoryOptions.forEach { cat ->
                                        val sel = state.newCategory == cat
                                        FilterChip(selected = sel, onClick = { viewModel.setNewCategory(if (sel) "" else cat) },
                                            label = { Text(cat, fontSize = 11.sp) }, shape = RoundedCornerShape(20.dp),
                                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White))
                                    }
                                }
                                Button(onClick = { viewModel.createSearch() }, enabled = state.newKeyword.isNotBlank() && !state.creating,
                                    shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                    modifier = Modifier.fillMaxWidth()) { Text(if (state.creating) "Savingâ€¦" else "Save Search", fontWeight = FontWeight.SemiBold) }
                            }
                        }
                    }
                    if (state.searches.isEmpty() && !state.showCreateForm) item {
                        EmptyState(icon = { Icon(Icons.Filled.Bookmark, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp)) },
                            title = "No saved searches", subtitle = "Tap + to create a search and get notified when new listings match")
                    }
                    else items(state.searches, key = { it.stableId }) { s ->
                        val notifOn = state.notificationsEnabled[s.stableId] ?: true
                        // newResultCount comes from API; hide badge if 0 or null
                        val newCount = 0
                        Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(horizontal = 14.dp, vertical = 12.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(Modifier.size(40.dp).background(Color(0xFFEFF6FF), RoundedCornerShape(10.dp)), contentAlignment = Alignment.Center) {
                                        Icon(Icons.Filled.Search, null, tint = Color(0xFF2563EB), modifier = Modifier.size(20.dp))
                                    }
                                    Spacer(Modifier.width(12.dp))
                                    Column(Modifier.weight(1f)) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Text(s.displayQuery, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                                            if (newCount > 0) {
                                                Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFF22C55E)) {
                                                    Text("+$newCount new", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White,
                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                                }
                                            }
                                        }
                                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                            if (s.category != null) Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFF1F5F9)) {
                                                Text(s.category, fontSize = 11.sp, color = Color(0xFF64748B), modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                            }
                                            if (s.location != null) Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFFEF3C7)) {
                                                Row(Modifier.padding(horizontal = 5.dp, vertical = 2.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                                    Icon(Icons.Filled.LocationOn, null, tint = Color(0xFFB45309), modifier = Modifier.size(10.dp))
                                                    Text(s.location, fontSize = 11.sp, color = Color(0xFF92400E))
                                                }
                                            }
                                        }
                                    }
                                    // Notification toggle
                                    IconButton(onClick = { viewModel.toggleNotification(s.stableId) }, modifier = Modifier.size(34.dp)) {
                                        Icon(
                                            if (notifOn) Icons.Filled.Notifications else Icons.Filled.NotificationsOff,
                                            null,
                                            tint = if (notifOn) Color(0xFF2563EB) else Color(0xFFCBD5E1),
                                            modifier = Modifier.size(18.dp),
                                        )
                                    }
                                }
                                Spacer(Modifier.height(8.dp))
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    // Run search
                                    OutlinedButton(
                                        onClick = { onRunSearch(s.displayQuery) },
                                        shape = RoundedCornerShape(8.dp),
                                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF22C55E)),
                                        border = ButtonDefaults.outlinedButtonBorder(enabled = true).copy(width = 1.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                        modifier = Modifier.weight(1f),
                                    ) {
                                        Icon(Icons.Filled.PlayArrow, null, modifier = Modifier.size(14.dp))
                                        Spacer(Modifier.width(4.dp))
                                        Text(stringResource(R.string.btn_run), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                    }
                                    // Delete
                                    OutlinedButton(
                                        onClick = { viewModel.delete(s.id ?: "") },
                                        shape = RoundedCornerShape(8.dp),
                                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEF4444)),
                                        border = ButtonDefaults.outlinedButtonBorder(enabled = true).copy(width = 1.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                        modifier = Modifier.weight(1f),
                                    ) {
                                        Icon(Icons.Filled.Delete, null, modifier = Modifier.size(14.dp))
                                        Spacer(Modifier.width(4.dp))
                                        Text(stringResource(R.string.btn_delete), fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CompareScreen
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
@HiltViewModel
class CompareViewModel @Inject constructor(private val repo: PostsRepository) : ViewModel() {
    private val _state = MutableStateFlow(PostListUiState())
    val state: StateFlow<PostListUiState> = _state.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        _state.value = _state.value.copy(loading = true)
        when (val r = repo.compareList()) {
            is ApiResult.Success -> _state.value = PostListUiState(loading = false, posts = r.data)
            is ApiResult.Failure -> _state.value = PostListUiState(loading = false, error = r.error.message)
        }
    } }
    fun removePost(postId: String) {
        // Optimistic remove
        val prev = _state.value.posts
        _state.value = _state.value.copy(posts = prev.filter { it.stableId != postId })
        viewModelScope.launch {
            val result = repo.removeFromCompare(postId)
            if (result is ApiResult.Failure) {
                _state.value = _state.value.copy(posts = prev)
            }
        }
    }
    fun clearAll() {
        val prev = _state.value.posts
        _state.value = _state.value.copy(posts = emptyList())
        viewModelScope.launch {
            val result = repo.clearCompare()
            if (result is ApiResult.Failure) _state.value = _state.value.copy(posts = prev)
        }
    }
}

@Composable
fun CompareScreen(onBack: () -> Unit, viewModel: CompareViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar(stringResource(R.string.compare_title), onBack)
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                state.posts.isEmpty() -> EmptyState(
                    icon = { Icon(Icons.Filled.Compare, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp)) },
                    title = stringResource(R.string.compare_nothing), subtitle = stringResource(R.string.compare_add_hint),
                )
                else -> {
                    val posts = state.posts
                    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                        // Clear All button
                        Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.End) {
                            Surface(
                                onClick = { viewModel.clearAll() },
                                shape = RoundedCornerShape(8.dp),
                                color = Color(0xFFFEF2F2),
                                border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFCA5A5)),
                            ) {
                                Row(Modifier.padding(horizontal = 12.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Icon(Icons.Default.DeleteForever, null, tint = Color(0xFFDC2626), modifier = Modifier.size(14.dp))
                                    Text(stringResource(R.string.compare_clear_all), fontSize = 12.sp, color = Color(0xFFDC2626), fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                        // Product cards row (horizontal scroll) with X remove button
                        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            posts.forEach { post ->
                                Box(Modifier.width(200.dp)) {
                                    Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp) {
                                        Column(Modifier.padding(10.dp)) {
                                            if (post.primaryImage != null) {
                                                AsyncImage(model = post.primaryImage, contentDescription = null, contentScale = ContentScale.Crop,
                                                    modifier = Modifier.fillMaxWidth().height(120.dp).clip(RoundedCornerShape(10.dp)))
                                            } else {
                                                Box(Modifier.fillMaxWidth().height(120.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)), contentAlignment = Alignment.Center) {
                                                    Icon(Icons.Filled.Image, null, tint = Color(0xFFCBD5E1))
                                                }
                                            }
                                            Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF1E293B), maxLines = 2)
                                            if (post.price != null) Text("â‚¹${post.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF2563EB))
                                        }
                                    }
                                    // Remove X button
                                    Surface(
                                        onClick = { viewModel.removePost(post.stableId) },
                                        shape = CircleShape,
                                        color = Color(0xFFDC2626),
                                        modifier = Modifier.align(Alignment.TopEnd).padding(4.dp).size(22.dp),
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Icon(Icons.Default.Close, null, tint = Color.White, modifier = Modifier.size(14.dp))
                                        }
                                    }
                                }
                            }
                        }
                        // Dynamic comparison table
                        Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                            Column(Modifier.padding(16.dp)) {
                                Text(stringResource(R.string.compare_comparison), fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B))
                                Spacer(Modifier.height(12.dp))
                                // Build dynamic specs: include any field that has a non-null value across all posts
                                val allSpecs = listOf(
                                    stringResource(R.string.compare_price) to { p: Post -> if (p.price != null) "â‚¹${p.price.toLong()}" else "â€”" },
                                    stringResource(R.string.compare_condition) to { p: Post -> p.condition ?: "â€”" },
                                    stringResource(R.string.compare_brand) to { p: Post -> p.brand ?: "â€”" },
                                    stringResource(R.string.compare_model) to { p: Post -> p.model ?: "â€”" },
                                    stringResource(R.string.compare_location) to { p: Post -> p.location ?: "â€”" },
                                    stringResource(R.string.compare_color) to { p: Post -> p.color ?: "â€”" },
                                    stringResource(R.string.compare_size) to { p: Post -> p.size ?: "â€”" },
                                    stringResource(R.string.compare_year) to { p: Post -> p.year?.toString() ?: "â€”" },
                                    stringResource(R.string.compare_mileage) to { p: Post -> if (p.mileage != null) "${p.mileage} km" else "â€”" },
                                    stringResource(R.string.compare_ram_storage) to { p: Post -> p.ramStorage ?: "â€”" },
                                    stringResource(R.string.compare_category) to { p: Post -> p.categoryName ?: "â€”" },
                                    "Subcategory" to { p: Post -> p.subcategoryName ?: "â€”" },
                                    stringResource(R.string.compare_seller) to { p: Post -> p.userName ?: "â€”" },
                                    stringResource(R.string.compare_status) to { p: Post -> p.status ?: "â€”" },
                                    "Posted" to { p: Post -> p.createdAt?.take(10) ?: "â€”" },
                                )
                                val visibleSpecs = allSpecs.filter { (_, getter) -> posts.any { getter(it) != "â€”" } }
                                visibleSpecs.forEach { (label, getter) ->
                                    HorizontalDivider(color = Color(0xFFF1F5F9))
                                    Row(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                                        Text(label, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = Color(0xFF64748B), modifier = Modifier.width(90.dp))
                                        posts.forEach { post ->
                                            Text(getter(post), fontSize = 12.sp, color = Color(0xFF1E293B), modifier = Modifier.weight(1f), maxLines = 2, overflow = TextOverflow.Ellipsis)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// BuyerViewScreen â€” Full browse with search, brand, price filters
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class BuyerViewUiState(
    val loading: Boolean = true,
    val posts: List<Post> = emptyList(),
    val error: String? = null,
    val search: String = "",
    val selectedBrand: String? = null,
    val priceRange: String? = null,
    val brands: List<Brand> = emptyList(),
)

@HiltViewModel
class BuyerViewViewModel @Inject constructor(
    private val postsRepo: PostsRepository,
    private val brandsRepo: BrandsRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(BuyerViewUiState())
    val state: StateFlow<BuyerViewUiState> = _state.asStateFlow()
    init { load() }
    fun load() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true)
            val brandsResult = brandsRepo.list()
            if (brandsResult is ApiResult.Success) _state.value = _state.value.copy(brands = brandsResult.data)
            when (val r = postsRepo.feed(limit = 60, categoryId = null, query = _state.value.search.ifBlank { null })) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, posts = r.data, error = null)
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
            }
        }
    }
    fun setSearch(v: String) { _state.value = _state.value.copy(search = v) }
    fun setBrand(v: String?) { _state.value = _state.value.copy(selectedBrand = v) }
    fun setPriceRange(v: String?) { _state.value = _state.value.copy(priceRange = v) }
    fun resetFilters() { _state.value = _state.value.copy(search = "", selectedBrand = null, priceRange = null); load() }

    fun filteredPosts(): List<Post> {
        val s = _state.value
        var filtered = s.posts
        if (!s.search.isBlank()) filtered = filtered.filter {
            it.displayTitle.contains(s.search, true) || (it.location ?: "").contains(s.search, true)
        }
        if (s.selectedBrand != null) filtered = filtered.filter {
            it.displayTitle.contains(s.selectedBrand ?: "", true)
        }
        when (s.priceRange) {
            "0-25k" -> filtered = filtered.filter { (it.price ?: 0.0) < 25000 }
            "25k-50k" -> filtered = filtered.filter { val p = it.price ?: 0.0; p in 25000.0..50000.0 }
            "50k-75k" -> filtered = filtered.filter { val p = it.price ?: 0.0; p in 50000.0..75000.0 }
            "75k+" -> filtered = filtered.filter { (it.price ?: 0.0) > 75000 }
        }
        return filtered
    }
}

@Composable
fun BuyerViewScreen(onBack: () -> Unit, viewModel: BuyerViewViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val filtered = remember(state) { viewModel.filteredPosts() }
    val priceRanges = listOf(null to "All", "0-25k" to "Under â‚¹25K", "25k-50k" to "â‚¹25K-50K", "50k-75k" to "â‚¹50K-75K", "75k+" to "â‚¹75K+")
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar("Browse Listings", onBack)
            // Search bar
            OutlinedTextField(
                value = state.search, onValueChange = { viewModel.setSearch(it) },
                placeholder = { Text(stringResource(R.string.commerce_search_bought)) },
                leadingIcon = { Icon(Icons.Filled.Search, null, tint = Color(0xFF64748B)) },
                singleLine = true, shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
            )
            // Price filter chips
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                priceRanges.forEach { (key, label) ->
                    FilterChip(
                        selected = state.priceRange == key,
                        onClick = { viewModel.setPriceRange(key) },
                        label = { Text(label, fontSize = 11.sp) },
                        shape = RoundedCornerShape(20.dp),
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White),
                    )
                }
            }
            // Brand filter
            if (state.brands.isNotEmpty()) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    FilterChip(selected = state.selectedBrand == null, onClick = { viewModel.setBrand(null) },
                        label = { Text(stringResource(R.string.commerce_all_brands), fontSize = 11.sp) }, shape = RoundedCornerShape(20.dp),
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White))
                    state.brands.take(5).forEach { brand ->
                        FilterChip(selected = state.selectedBrand == brand.name, onClick = { viewModel.setBrand(brand.name) },
                            label = { Text(brand.name ?: "", fontSize = 11.sp) }, shape = RoundedCornerShape(20.dp),
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White))
                    }
                }
            }
            // Results
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                filtered.isEmpty() -> EmptyState(
                    icon = { Icon(Icons.Filled.SearchOff, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp)) },
                    title = "No listings found", subtitle = "Try adjusting your filters",
                )
                else -> LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    item { Text("${filtered.size} listings", fontSize = 13.sp, color = Color(0xFF64748B)) }
                    items(filtered, key = { it.stableId }) { post ->
                        BuyerPostCard(post)
                    }
                }
            }
        }
    }
}

@Composable
private fun BuyerPostCard(post: Post) {
    Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
        Column {
            Box(Modifier.fillMaxWidth().height(160.dp)) {
                if (post.primaryImage != null) {
                    AsyncImage(model = post.primaryImage, contentDescription = null, contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)))
                } else {
                    Box(Modifier.fillMaxSize().background(Color(0xFFF1F5F9)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Filled.Image, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(48.dp))
                    }
                }
                // Price overlay
                if (post.price != null) {
                    Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFF1E293B).copy(alpha = 0.85f),
                        modifier = Modifier.align(Alignment.BottomStart).padding(8.dp)) {
                        Text("â‚¹${post.price.toLong()}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                    }
                }
            }
            Column(Modifier.padding(12.dp)) {
                Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color(0xFF1E293B), maxLines = 2)
                Spacer(Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    if (post.userName != null) {
                        Icon(Icons.Filled.Person, null, tint = Color(0xFF64748B), modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(4.dp))
                        Text(post.userName ?: "", fontSize = 12.sp, color = Color(0xFF64748B))
                        Spacer(Modifier.width(12.dp))
                    }
                    if (post.location != null) {
                        Icon(Icons.Filled.LocationOn, null, tint = Color(0xFF64748B), modifier = Modifier.size(14.dp))
                        Spacer(Modifier.width(2.dp))
                        Text(post.location ?: "", fontSize = 12.sp, color = Color(0xFF64748B), maxLines = 1)
                    }
                }
                post.status?.let { c ->
                    Spacer(Modifier.height(4.dp))
                    StatusChip(c)
                }
            }
        }
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SaleDoneScreen â€” 2-tab: Mark as Sold (seller initiate + buyer confirm)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class SaleDoneUiState(
    val step: Int = 0,
    val loading: Boolean = false,
    val pending: List<PendingSale> = emptyList(),
    val postId: String = "",
    val buyerId: String = "",
    val saleAmount: String = "",
    val txnId: String = "",
    val otp: String = "",
    // initiate result
    val initiatedTxnId: String? = null,
    val initiatedOtp: String? = null,
    val initiatedOtpExpiresIn: String? = null,
    // confirm result
    val completedReceipt: SaleReceiptInfo? = null,
    val completedBuyer: SalePartyInfo? = null,
    val completedItem: SaleItemInfo? = null,
    val completedRewards: SaleRewardsInfo? = null,
    val error: String? = null,
    val success: Boolean = false,
    val tab: String = "seller",      // seller | buyer
)

@HiltViewModel
class SaleDoneViewModel @Inject constructor(private val repo: TransactionsRepository) : ViewModel() {
    private val _state = MutableStateFlow(SaleDoneUiState())
    val state: StateFlow<SaleDoneUiState> = _state.asStateFlow()
    init { loadPending() }
    fun loadPending() { viewModelScope.launch {
        when (val r = repo.pending()) {
            is ApiResult.Success -> _state.value = _state.value.copy(pending = r.data)
            is ApiResult.Failure -> {}
        }
    } }
    fun setTab(t: String) { _state.value = _state.value.copy(tab = t, error = null) }
    fun setPostId(v: String) { _state.value = _state.value.copy(postId = v) }
    fun setBuyerId(v: String) { _state.value = _state.value.copy(buyerId = v) }
    fun setSaleAmount(v: String) { _state.value = _state.value.copy(saleAmount = v) }
    fun setTxnId(v: String) { _state.value = _state.value.copy(txnId = v) }
    fun setOtp(v: String) { _state.value = _state.value.copy(otp = v) }
    fun initiateSale() {
        val s = _state.value
        if (s.postId.isBlank() || s.buyerId.isBlank() || s.saleAmount.isBlank()) { _state.value = s.copy(error = "All fields are required: Post ID, Buyer ID, and Sale Amount"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.initiate(InitiateSaleRequest(postId = s.postId, buyerId = s.buyerId, agreedPrice = s.saleAmount.toDoubleOrNull() ?: 0.0))) {
                is ApiResult.Success -> {
                    val txnId = r.data.transaction?.transactionId ?: ""
                    val otp = r.data.transaction?.secretOTP
                    val expiresIn = r.data.transaction?.otpExpiresIn
                    _state.value = _state.value.copy(loading = false, initiatedTxnId = txnId, initiatedOtp = otp, initiatedOtpExpiresIn = expiresIn, txnId = txnId, step = 2, tab = "buyer")
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = mapSaleError(r.error.message))
            }
        }
    }
    fun confirmSale() {
        val s = _state.value
        if (s.txnId.isBlank() || s.otp.isBlank()) { _state.value = s.copy(error = "Both Transaction ID and OTP are required"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.confirm(ConfirmSaleRequest(transactionId = s.txnId, otp = s.otp))) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(
                        loading = false, success = true, step = 4,
                        completedReceipt = r.data.receipt,
                        completedBuyer = r.data.buyer,
                        completedItem = r.data.item,
                        completedRewards = r.data.rewards,
                    )
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = mapSaleError(r.error.message))
            }
        }
    }
    private fun mapSaleError(msg: String?): String {
        val m = (msg ?: "").lowercase()
        return when {
            m.contains("auth") || m.contains("401") || m.contains("login") -> "Please sign in again and retry this action."
            m.contains("403") || m.contains("not authorized") -> "You are not authorized for this sale action."
            m.contains("404") || m.contains("not found") -> "Record not found. Verify Post ID / Transaction ID and retry."
            m.contains("otp") && m.contains("expired") -> "OTP expired. Seller must initiate a new sale."
            m.contains("schema") || m.contains("missing sale columns") -> "Backend sale schema is incomplete. Please contact support."
            else -> msg ?: "An error occurred. Please try again."
        }
    }
    fun resetForNewSale() {
        _state.value = SaleDoneUiState()
        loadPending()
    }
}

@Composable
fun SaleDoneScreen(onBack: () -> Unit, viewModel: SaleDoneViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val context = androidx.compose.ui.platform.LocalContext.current
    val clipboardManager = androidx.compose.ui.platform.LocalClipboardManager.current
    val steps = listOf(stringResource(R.string.commerce_step_listing_live), stringResource(R.string.commerce_step_deal_agreed), stringResource(R.string.commerce_step_payment), stringResource(R.string.commerce_step_confirmation), stringResource(R.string.commerce_step_complete))
    var showTestingGuide by remember { mutableStateOf(false) }
    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0xFFF0FDF4), Color(0xFFECFDF5), Color(0xFFF0FDF4))))) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar(stringResource(R.string.commerce_mark_sold), onBack)
            // Hero gradient card (web parity: mhub-hero-card "Sale Confirmation")
            Box(
                modifier = Modifier.fillMaxWidth()
                    .background(Brush.horizontalGradient(listOf(Color(0xFF16A34A), Color(0xFF059669), Color(0xFF0D9488)))),
            ) {
                Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(stringResource(R.string.commerce_sale_verification_label), fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp, color = Color.White.copy(alpha = 0.7f))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(Color.White.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                            Icon(Icons.Filled.CheckCircle, null, tint = Color.White, modifier = Modifier.size(20.dp))
                        }
                        Text(stringResource(R.string.commerce_sale_confirmation_title), fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = Color.White)
                    }
                    Text(stringResource(R.string.commerce_sale_confirmation_subtitle), fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf(
                            stringResource(R.string.commerce_badge_secure),
                            stringResource(R.string.commerce_badge_rewarded),
                            stringResource(R.string.commerce_badge_verified),
                        ).forEach { badge ->
                            Surface(shape = RoundedCornerShape(8.dp), color = Color.White.copy(alpha = 0.15f)) {
                                Text(badge, fontSize = 10.sp, color = Color.White, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                            }
                        }
                    }
                }
            }
            // Premium Stepper with connecting lines
            Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
                Column(Modifier.padding(16.dp)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
                        steps.forEachIndexed { i, label ->
                            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                                Box(
                                    Modifier.size(32.dp).clip(CircleShape).background(
                                        when {
                                            i < state.step -> Brush.linearGradient(listOf(Color(0xFF22C55E), Color(0xFF22C55E)))
                                            i == state.step -> Brush.linearGradient(listOf(Color(0xFF22C55E), Color(0xFF16A34A)))
                                            else -> Brush.linearGradient(listOf(Color(0xFFE2E8F0), Color(0xFFE2E8F0)))
                                        }
                                    ),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    if (i < state.step) Icon(Icons.Filled.Check, null, tint = Color.White, modifier = Modifier.size(18.dp))
                                    else Text("${i + 1}", fontSize = 12.sp, color = if (i == state.step) Color.White else Color(0xFF94A3B8), fontWeight = FontWeight.Bold)
                                }
                                Spacer(Modifier.height(4.dp))
                                Text(label, fontSize = 8.sp, color = if (i <= state.step) Color(0xFF16A34A) else Color(0xFF94A3B8), maxLines = 2, textAlign = TextAlign.Center, fontWeight = if (i == state.step) FontWeight.Bold else FontWeight.Normal)
                            }
                        }
                    }
                }
            }
            // Seller / Buyer tabs (web parity: Saledone.jsx)
            Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFF1F5F9), modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp)) {
                Row(Modifier.padding(4.dp)) {
                    listOf(
                        "seller" to stringResource(R.string.commerce_tab_seller),
                        "buyer" to stringResource(R.string.commerce_tab_buyer_confirm),
                    ).forEach { (key, label) ->
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = if (state.tab == key) Color.White else Color.Transparent,
                            shadowElevation = if (state.tab == key) 2.dp else 0.dp,
                            modifier = Modifier.weight(1f).clickable { viewModel.setTab(key) },
                        ) {
                            Text(label, fontSize = 12.sp, fontWeight = if (state.tab == key) FontWeight.Bold else FontWeight.Normal, color = if (state.tab == key) Color(0xFF16A34A) else Color(0xFF64748B), textAlign = TextAlign.Center, modifier = Modifier.padding(vertical = 10.dp), maxLines = 1)
                        }
                    }
                }
            }
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                state.error?.let {
                    Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFFEF2F2)) {
                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Filled.Error, null, tint = Color(0xFFDC2626), modifier = Modifier.size(18.dp))
                            Text(it, color = Color(0xFFDC2626), fontSize = 13.sp)
                        }
                    }
                }
                // Testing Guide (web parity: collapsible "How to test this page")
                if (!state.success) {
                    Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFEFF6FF), border = BorderStroke(1.dp, Color(0xFFBFDBFE)), modifier = Modifier.fillMaxWidth()) {
                        Column {
                            Row(
                                modifier = Modifier.fillMaxWidth().clickable { showTestingGuide = !showTestingGuide }.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Icon(Icons.Filled.Info, null, tint = Color(0xFF2563EB), modifier = Modifier.size(16.dp))
                                Text("How to test this page â€” tap to expand", fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1D4ED8), modifier = Modifier.weight(1f))
                                Icon(if (showTestingGuide) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore, null, tint = Color(0xFF2563EB), modifier = Modifier.size(16.dp))
                            }
                            if (showTestingGuide) {
                                Column(Modifier.padding(horizontal = 12.dp).padding(bottom = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    listOf(
                                        "Step 1 â€” Find your Post ID" to "Go to My Home â†’ tap any active listing â†’ copy the Post ID from the URL.",
                                        "Step 2 â€” Get Buyer's User ID" to "Ask the buyer to share their User ID from Profile â†’ Settings â†’ Account Info.",
                                        "Step 3 â€” Seller initiates" to "Enter Post ID, Buyer ID and agreed amount â†’ tap Initiate Sale. Share Transaction ID + OTP with buyer.",
                                        "Step 4 â€” Buyer confirms" to "Switch to 'Confirm Purchase' tab. Enter Transaction ID + OTP â†’ tap Confirm Purchase. Post moves to Sold.",
                                    ).forEach { (title, desc) ->
                                        Surface(shape = RoundedCornerShape(8.dp), color = Color.White, modifier = Modifier.fillMaxWidth()) {
                                            Column(Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                                Text(title, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1E40AF))
                                                Text(desc, fontSize = 11.sp, color = Color(0xFF3B82F6))
                                            }
                                        }
                                    }
                                    Text("OTPs expire in 24 hours. If expired, seller must re-initiate.", fontSize = 10.sp, color = Color(0xFF3B82F6))
                                }
                            }
                        }
                    }
                }
                if (state.tab == "seller") {
                    if (state.success) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            // Success animation card
                            Surface(shape = RoundedCornerShape(24.dp), color = Color.White, shadowElevation = 6.dp, modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
                                    Box(Modifier.size(88.dp).clip(CircleShape).background(Brush.radialGradient(listOf(Color(0xFF22C55E), Color(0xFF16A34A)))), contentAlignment = Alignment.Center) {
                                        Icon(Icons.Filled.CheckCircle, null, tint = Color.White, modifier = Modifier.size(52.dp))
                                    }
                                    Text(stringResource(R.string.commerce_sale_completed), fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = Color(0xFF14532D))
                                    Text(stringResource(R.string.commerce_sale_confirmed_msg), fontSize = 14.sp, color = Color(0xFF64748B), textAlign = TextAlign.Center)
                                }
                            }
                            // Receipt card
                            Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFFF0FDF4), border = BorderStroke(1.dp, Color(0xFF86EFAC)), modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Icon(Icons.Filled.Receipt, null, tint = Color(0xFF16A34A), modifier = Modifier.size(18.dp))
                                        Text(stringResource(R.string.commerce_transaction_receipt), fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFF166534), letterSpacing = 1.sp)
                                    }
                                    HorizontalDivider(color = Color(0xFF86EFAC))
                                    // Item title
                                    state.completedItem?.title?.let { title ->
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Item", fontSize = 13.sp, color = Color(0xFF64748B))
                                            Text(title, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1E293B), modifier = Modifier.weight(1f, fill = false), textAlign = TextAlign.End)
                                        }
                                    }
                                    // Buyer name
                                    state.completedBuyer?.name?.let { name ->
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Buyer", fontSize = 13.sp, color = Color(0xFF64748B))
                                            Text(name, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1E293B))
                                        }
                                    }
                                    // Receipt ID
                                    state.completedReceipt?.receiptId?.let { rid ->
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text(stringResource(R.string.commerce_receipt_id), fontSize = 13.sp, color = Color(0xFF64748B))
                                            Text(rid, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1E293B))
                                        }
                                    }
                                    // Transaction ID with copy
                                    val txId = state.completedReceipt?.transactionId ?: state.initiatedTxnId
                                    if (txId != null) {
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                            Text(stringResource(R.string.commerce_transaction), fontSize = 13.sp, color = Color(0xFF64748B))
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                Text(txId, fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1E293B))
                                                IconButton(onClick = { clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(txId)) }, modifier = Modifier.size(20.dp)) {
                                                    Icon(Icons.Default.ContentCopy, null, tint = Color(0xFF64748B), modifier = Modifier.size(12.dp))
                                                }
                                            }
                                        }
                                    }
                                    // Amount
                                    val amount = state.completedReceipt?.amount ?: state.saleAmount.toDoubleOrNull()
                                    if (amount != null) {
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text(stringResource(R.string.commerce_amount), fontSize = 13.sp, color = Color(0xFF64748B))
                                            Text("â‚¹${amount.toLong()}", fontSize = 17.sp, fontWeight = FontWeight.Bold, color = Color(0xFF22C55E))
                                        }
                                    }
                                    // Completed at
                                    state.completedReceipt?.completedAt?.let { ts ->
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Completed", fontSize = 13.sp, color = Color(0xFF64748B))
                                            Text(ts.take(19).replace("T", " "), fontSize = 11.sp, color = Color(0xFF64748B))
                                        }
                                    }
                                }
                            }
                            // Reward earned card â€” show actual points from API
                            val rewardsInfo = state.completedRewards
                            val totalPoints = rewardsInfo?.totalPoints ?: 0
                            if (totalPoints > 0) {
                                Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFFFFF7ED), border = BorderStroke(1.dp, Color(0xFFFBBF24)), modifier = Modifier.fillMaxWidth()) {
                                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Text("ðŸª™", fontSize = 22.sp)
                                            Text("Rewards Earned!", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF92400E))
                                        }
                                        // 4-metric breakdown (web parity)
                                        val metricsRow1 = listOf(
                                            "Seller Points" to (rewardsInfo?.sellerPoints ?: 0),
                                            "Buyer Points" to (rewardsInfo?.buyerPoints ?: 0),
                                        )
                                        val metricsRow2 = listOf(
                                            "Bonus Points" to (rewardsInfo?.bonusPoints ?: 0),
                                            "Referral Points" to ((rewardsInfo?.referralPoints ?: 0) + (rewardsInfo?.chainPoints ?: 0)),
                                        )
                                        listOf(metricsRow1, metricsRow2).forEach { row ->
                                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                row.forEach { (label, pts) ->
                                                    Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFFEF3C7), modifier = Modifier.weight(1f)) {
                                                        Column(Modifier.padding(10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                                            Text("+$pts", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = Color(0xFFB45309))
                                                            Text(label, fontSize = 10.sp, color = Color(0xFF92400E), textAlign = TextAlign.Center)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            // Sold Item Card (web parity)
                            state.completedItem?.let { item ->
                                Surface(shape = RoundedCornerShape(20.dp), color = Color.White, shadowElevation = 3.dp, modifier = Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Icon(Icons.Filled.Inventory2, null, tint = Color(0xFF2563EB), modifier = Modifier.size(16.dp))
                                            Text("Sold Item", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF1E293B))
                                        }
                                        HorizontalDivider(color = Color(0xFFE2E8F0))
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
                                            // Item image
                                            item.imageUrl?.let { url ->
                                                AsyncImage(
                                                    model = url,
                                                    contentDescription = null,
                                                    modifier = Modifier.size(60.dp).clip(RoundedCornerShape(8.dp)),
                                                    contentScale = ContentScale.Crop,
                                                )
                                            } ?: Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFE2E8F0), modifier = Modifier.size(60.dp)) {
                                                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                                    Icon(Icons.Filled.Image, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(28.dp))
                                                }
                                            }
                                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                                item.title?.let { Text(it, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF0F172A), maxLines = 2) }
                                                item.categoryName?.let { cat ->
                                                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                        Text(cat, fontSize = 11.sp, color = Color(0xFF64748B))
                                                        item.subcategoryName?.let { sub -> Text("· $sub", fontSize = 11.sp, color = Color(0xFF64748B)) }
                                                    }
                                                }
                                                item.location?.let { Text("ðŸ“ $it", fontSize = 11.sp, color = Color(0xFF64748B)) }
                                                // Agreed vs listing price
                                                val agreed = item.agreedPrice ?: item.price
                                                val listing = item.listingPrice ?: item.price
                                                if (agreed != null) {
                                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                        Text("â‚¹${agreed.toLong()}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF22C55E))
                                                        if (listing != null && listing != agreed) {
                                                            Text("â‚¹${listing.toLong()}", fontSize = 12.sp, color = Color(0xFF94A3B8), textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            // Buyer Details Card (web parity)
                            state.completedBuyer?.let { buyer ->
                                Surface(shape = RoundedCornerShape(20.dp), color = Color.White, shadowElevation = 3.dp, modifier = Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Icon(Icons.Filled.Person, null, tint = Color(0xFF7C3AED), modifier = Modifier.size(16.dp))
                                            Text("Buyer Details", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF1E293B))
                                        }
                                        HorizontalDivider(color = Color(0xFFE2E8F0))
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                            // Avatar circle
                                            Surface(shape = CircleShape, color = Color(0xFF7C3AED).copy(alpha = 0.15f), modifier = Modifier.size(48.dp)) {
                                                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                                    Text(buyer.name?.firstOrNull()?.uppercase() ?: "?", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color(0xFF7C3AED))
                                                }
                                            }
                                            Column(Modifier.weight(1f)) {
                                                buyer.name?.let { Text(it, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF0F172A)) }
                                                buyer.username?.let { Text("@$it", fontSize = 12.sp, color = Color(0xFF64748B)) }
                                                val buyerIdDisplay = buyer.userId ?: buyer.id
                                                buyerIdDisplay?.let { uid ->
                                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                                        Text("ID: $uid", fontSize = 11.sp, color = Color(0xFF94A3B8))
                                                        IconButton(onClick = { clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(uid)) }, modifier = Modifier.size(18.dp)) {
                                                            Icon(Icons.Default.ContentCopy, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(12.dp))
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            // Receipt Actions row (web parity: copy/share)
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                // Copy receipt
                                OutlinedButton(
                                    onClick = {
                                        val receiptText = buildString {
                                            append("Transaction: ${state.completedReceipt?.transactionId ?: state.initiatedTxnId ?: ""}\n")
                                            append("Amount: â‚¹${state.completedReceipt?.amount?.toLong() ?: state.saleAmount}")
                                        }
                                        clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(receiptText))
                                    },
                                    modifier = Modifier.weight(1f),
                                ) {
                                    Icon(Icons.Default.ContentCopy, null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Copy", style = MaterialTheme.typography.labelMedium)
                                }
                                // Share receipt
                                OutlinedButton(
                                    onClick = {
                                        val shareText = buildString {
                                            append("MHub Sale Receipt\n")
                                            append("Transaction: ${state.completedReceipt?.transactionId ?: state.initiatedTxnId ?: ""}\n")
                                            append("Amount: â‚¹${state.completedReceipt?.amount?.toLong() ?: state.saleAmount}")
                                        }
                                        val intent = Intent(Intent.ACTION_SEND).apply {
                                            type = "text/plain"
                                            putExtra(Intent.EXTRA_TEXT, shareText)
                                            putExtra(Intent.EXTRA_SUBJECT, "Sale Receipt")
                                        }
                                        context.startActivity(Intent.createChooser(intent, "Share Receipt"))
                                    },
                                    modifier = Modifier.weight(1f),
                                ) {
                                    Icon(Icons.Outlined.Share, null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Share", style = MaterialTheme.typography.labelMedium)
                                }
                            }
                            // Next Steps Section (web parity)
                            Surface(shape = RoundedCornerShape(16.dp), color = Color(0xFFEFF6FF), border = BorderStroke(1.dp, Color(0xFFBFDBFE)), modifier = Modifier.fillMaxWidth()) {
                                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("Next Steps", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF1D4ED8))
                                    listOf(
                                        "ðŸ " to "View your post in My Home â†’ Sold tab",
                                        "â­" to "Leave a review for the buyer",
                                        "ðŸ“ˆ" to "List more items to grow your sales",
                                    ).forEach { (emoji, text) ->
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.Top) {
                                            Text(emoji, fontSize = 14.sp)
                                            Text(text, fontSize = 12.sp, color = Color(0xFF1E40AF))
                                        }
                                    }
                                }
                            }
                            // Action buttons
                            OutlinedButton(
                                onClick = { viewModel.resetForNewSale() },
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth().height(50.dp),
                                border = BorderStroke(1.5.dp, Color(0xFF16A34A)),
                            ) {
                                Icon(Icons.Default.Add, null, tint = Color(0xFF16A34A), modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Confirm Another Sale", fontWeight = FontWeight.SemiBold, color = Color(0xFF16A34A))
                            }
                            OutlinedButton(
                                onClick = onBack,
                                shape = RoundedCornerShape(14.dp),
                                modifier = Modifier.fillMaxWidth().height(50.dp),
                                border = BorderStroke(1.5.dp, Color(0xFF6366F1)),
                            ) {
                                Icon(Icons.Filled.Star, null, tint = Color(0xFF6366F1), modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Leave Feedback", fontWeight = FontWeight.SemiBold, color = Color(0xFF6366F1))
                            }
                            Button(onClick = onBack, shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)), modifier = Modifier.fillMaxWidth().height(50.dp), elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)) {
                                Icon(Icons.Filled.Home, null, tint = Color.White, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("View My Listings", fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    } else {
                        // Seller initiation form
                        Surface(shape = RoundedCornerShape(20.dp), color = Color.White, shadowElevation = 3.dp, modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Surface(shape = CircleShape, color = Color(0xFFDCFCE7), modifier = Modifier.size(36.dp)) {
                                        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                            Icon(Icons.Filled.Sell, null, tint = Color(0xFF16A34A), modifier = Modifier.size(18.dp))
                                        }
                                    }
                                    Text("Initiate Sale", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF0F172A))
                                }
                                MhubTextField(stringResource(R.string.commerce_field_post_id), state.postId, viewModel::setPostId)
                                MhubTextField(stringResource(R.string.commerce_field_buyer_id), state.buyerId, viewModel::setBuyerId)
                                MhubTextField(stringResource(R.string.commerce_field_sale_amount), state.saleAmount, viewModel::setSaleAmount)
                                Button(
                                    onClick = { viewModel.initiateSale() },
                                    enabled = !state.loading,
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)),
                                    modifier = Modifier.fillMaxWidth().height(52.dp),
                                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp),
                                ) {
                                    if (state.loading) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                                    else {
                                        Icon(Icons.Filled.Favorite, null, tint = Color.White, modifier = Modifier.size(20.dp))
                                        Spacer(Modifier.width(8.dp))
                                        Text(stringResource(R.string.commerce_initiate_sale), fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp)
                                    }
                                }
                            }
                        }
                        // Blue info card: show transaction ID + OTP after successful initiation (web parity: initiatedSale card in Saledone.jsx)
                        if (state.initiatedTxnId != null) {
                            Surface(
                                shape = RoundedCornerShape(14.dp),
                                color = Color(0xFFEFF6FF),
                                border = BorderStroke(1.dp, Color(0xFFBFDBFE)),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    Text("Transaction Created", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF1D4ED8))
                                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                        Text("Transaction ID:", fontSize = 12.sp, color = Color(0xFF2563EB))
                                        Text(state.initiatedTxnId!!, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFF1E40AF), modifier = Modifier.weight(1f, fill = false), maxLines = 1)
                                    }
                                    if (state.initiatedOtp != null) {
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("OTP to share with buyer:", fontSize = 12.sp, color = Color(0xFF2563EB))
                                            Text(state.initiatedOtp!!, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = Color(0xFF1E40AF))
                                        }
                                    } else {
                                        Text("OTP sent to buyer's notification channel.", fontSize = 12.sp, color = Color(0xFF3B82F6))
                                    }
                                    state.initiatedOtpExpiresIn?.let { expiry ->
                                        Text("Expires in: $expiry", fontSize = 11.sp, color = Color(0xFF60A5FA))
                                    }
                                    Text("Switch to 'Confirm Purchase' tab to complete the sale.", fontSize = 11.sp, color = Color(0xFF93C5FD))
                                }
                            }
                        }
                    }
                } else {
                    // Buyer confirmation form
                    Surface(shape = RoundedCornerShape(20.dp), color = Color.White, shadowElevation = 3.dp, modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                Surface(shape = CircleShape, color = Color(0xFFEDE9FE), modifier = Modifier.size(36.dp)) {
                                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                        Icon(Icons.Filled.Verified, null, tint = Color(0xFF7C3AED), modifier = Modifier.size(18.dp))
                                    }
                                }
                                Text("Confirm Purchase", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF0F172A))
                            }
                            MhubTextField(stringResource(R.string.commerce_field_txn_id), state.txnId, viewModel::setTxnId)
                            MhubTextField(stringResource(R.string.commerce_field_otp), state.otp, viewModel::setOtp)
                            Button(
                                onClick = { viewModel.confirmSale() },
                                enabled = !state.loading,
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF7C3AED)),
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp),
                            ) {
                                if (state.loading) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                                else {
                                    Icon(Icons.Filled.Verified, null, tint = Color.White, modifier = Modifier.size(20.dp))
                                    Spacer(Modifier.width(8.dp))
                                    Text(stringResource(R.string.commerce_confirm_sale), fontWeight = FontWeight.Bold, color = Color.White, fontSize = 15.sp)
                                }
                            }
                        }
                    }
                }
                // Pending sales
                if (state.pending.isNotEmpty()) {
                    Spacer(Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Filled.PendingActions, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(20.dp))
                        Text(stringResource(R.string.commerce_pending_sales), fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B))
                    }
                    state.pending.forEach { sale ->
                        Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFFEF3C7), modifier = Modifier.size(40.dp)) {
                                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                        Icon(Icons.Filled.Timer, null, tint = Color(0xFFD97706), modifier = Modifier.size(20.dp))
                                    }
                                }
                                Spacer(Modifier.width(12.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(sale.postTitle ?: stringResource(R.string.commerce_listing), fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                                    Text(stringResource(R.string.commerce_buyer_label) + (sale.buyerName ?: stringResource(R.string.commerce_unknown_buyer)), fontSize = 12.sp, color = Color(0xFF64748B))
                                }
                                Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFDCFCE7)) {
                                    Text("â‚¹${sale.amount.toLong()}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF16A34A), modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp))
                                }
                            }
                        }
                    }
                }
                Spacer(Modifier.height(60.dp))
            }
        }
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SaleUndoneScreen â€” 5-step stepper with undo form + history
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class SaleUndoneUiState(
    val loading: Boolean = false,
    val postId: String = "",
    val reason: String = "",
    val description: String = "",
    val history: List<UndoneRecord> = emptyList(),
    val success: Boolean = false,
    val transactionId: String? = null,
    val error: String? = null,
)

@HiltViewModel
class SaleUndoneViewModel @Inject constructor(private val repo: TransactionsRepository) : ViewModel() {
    private val _state = MutableStateFlow(SaleUndoneUiState())
    val state: StateFlow<SaleUndoneUiState> = _state.asStateFlow()
    private val reasons = listOf(
        "no_buyers_found", "buyer_not_interested", "buyer_changed_mind",
        "price_too_high", "item_condition_issue", "location_issue",
        "communication_failed", "payment_issue", "want_to_relist", "other",
    )
    fun getReasons() = reasons
    init { loadHistory() }
    fun loadHistory() { viewModelScope.launch {
        when (val r = repo.undoneHistory()) {
            is ApiResult.Success -> _state.value = _state.value.copy(history = r.data)
            is ApiResult.Failure -> {}
        }
    } }
    fun setPostId(v: String) { _state.value = _state.value.copy(postId = v) }
    fun setReason(v: String) { _state.value = _state.value.copy(reason = v) }
    fun setDescription(v: String) { _state.value = _state.value.copy(description = v) }
    fun reset() { val history = _state.value.history; _state.value = SaleUndoneUiState(history = history) }
    fun submit() {
        val s = _state.value
        // Post ID validation (web parity: alphanumeric + dashes only)
        val sanitized = s.postId.replace(Regex("[^a-zA-Z0-9\\-]"), "")
        if (sanitized.isBlank()) { _state.value = s.copy(error = "Post ID is required"); return }
        // Description required only when reason === "other" (web parity: SaleUndone.jsx)
        if (s.reason == "other" && s.description.isBlank()) { _state.value = s.copy(error = "Please add a short note for this reason"); return }
        if (s.description.isNotBlank() && s.description.length < 20) { _state.value = s.copy(error = "Description must be at least 20 characters"); return }
        _state.value = s.copy(postId = sanitized, loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.undoSale(UndoSaleRequest(postId = sanitized, reason = s.reason, description = s.description.ifBlank { null }))) {
                is ApiResult.Success -> { _state.value = _state.value.copy(loading = false, success = true, transactionId = null); loadHistory() }
                is ApiResult.Failure -> {
                    val msg = r.error.message ?: ""
                    val mapped = when {
                        msg.lowercase().contains("401") || msg.lowercase().contains("auth") -> "Please sign in again to continue."
                        msg.lowercase().contains("403") -> "You are not authorized to undo this sale."
                        msg.lowercase().contains("404") || msg.lowercase().contains("not found") -> "Post not found. Verify the Post ID and try again."
                        msg.lowercase().contains("already active") -> "This listing is already active."
                        else -> msg.ifBlank { "Failed to undo sale. Please try again." }
                    }
                    _state.value = _state.value.copy(loading = false, error = mapped)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SaleUndoneScreen(onBack: () -> Unit, viewModel: SaleUndoneViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val steps = listOf(stringResource(R.string.commerce_step_listed), stringResource(R.string.commerce_step_marked_sold), stringResource(R.string.commerce_step_issue_found), stringResource(R.string.commerce_step_undo_request), stringResource(R.string.commerce_step_reactivated))
    var expanded by remember { mutableStateOf(false) }
    var showConfirmDialog by remember { mutableStateOf(false) }
    
    // Confirmation AlertDialog (web parity)
    if (showConfirmDialog) {
        AlertDialog(
            onDismissRequest = { showConfirmDialog = false },
            title = { Text("Confirm Undo Sale", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
            text = { Text("Are you sure you want to undo this sale? This will reactivate the listing and notify the buyer.", fontSize = 14.sp, color = Color(0xFF64748B)) },
            confirmButton = {
                Button(
                    onClick = { showConfirmDialog = false; viewModel.submit() },
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                    shape = RoundedCornerShape(10.dp),
                ) {
                    Text("Yes, Undo Sale", fontWeight = FontWeight.SemiBold)
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = { showConfirmDialog = false },
                    shape = RoundedCornerShape(10.dp),
                ) {
                    Text("Cancel")
                }
            },
        )
    }
    
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar(stringResource(R.string.commerce_undo_sale), onBack)
            // Hero gradient card (web parity: mhub-hero-card "Sale Undone")
            Box(
                modifier = Modifier.fillMaxWidth()
                    .background(Brush.horizontalGradient(listOf(Color(0xFFF59E0B), Color(0xFFEF4444), Color(0xFFDC2626)))),
            ) {
                Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("SALE REACTIVATION", fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 2.sp, color = Color.White.copy(alpha = 0.7f))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(Color.White.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                            Icon(Icons.Filled.Autorenew, null, tint = Color.White, modifier = Modifier.size(20.dp))
                        }
                        Text("Sale Undone", fontWeight = FontWeight.ExtraBold, fontSize = 20.sp, color = Color.White)
                    }
                    Text("Undo a sale and reactivate your listing.", fontSize = 13.sp, color = Color.White.copy(alpha = 0.8f))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("ðŸ›¡ Safe Process", "âœ“ Listing Restored", "ðŸ“§ Buyer Notified").forEach { badge ->
                            Surface(shape = RoundedCornerShape(8.dp), color = Color.White.copy(alpha = 0.15f)) {
                                Text(badge, fontSize = 10.sp, color = Color.White, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                            }
                        }
                    }
                }
            }
            // Stepper with connector lines (web parity)
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                val currentStep = if (state.success) 4 else 2
                steps.forEachIndexed { i, label ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                        Box(Modifier.size(30.dp).clip(CircleShape).background(
                            when { i < currentStep -> Color(0xFFF59E0B); i == currentStep -> Color(0xFF3B82F6); else -> Color(0xFFE2E8F0) }
                        ), contentAlignment = Alignment.Center) {
                            if (i < currentStep) Icon(Icons.Filled.Check, null, tint = Color.White, modifier = Modifier.size(16.dp))
                            else Text("${i + 1}", fontSize = 11.sp, color = if (i <= currentStep) Color.White else Color(0xFF94A3B8), fontWeight = FontWeight.Bold)
                        }
                        Spacer(Modifier.height(2.dp))
                        Text(label, fontSize = 8.sp, color = if (i <= currentStep) Color(0xFF374151) else Color(0xFF94A3B8), maxLines = 1, textAlign = TextAlign.Center)
                    }
                    if (i < steps.size - 1) {
                        HorizontalDivider(modifier = Modifier.weight(0.5f).padding(bottom = 14.dp), color = if (i < currentStep) Color(0xFFF59E0B) else Color(0xFFE2E8F0), thickness = 2.dp)
                    }
                }
            }
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                state.error?.let { Text(it, color = Color(0xFFDC2626), fontSize = 13.sp) }
                if (state.success) {
                    Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFFF0FDF4), border = BorderStroke(1.dp, Color(0xFF22C55E)), modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
                            Box(Modifier.size(96.dp).clip(CircleShape).background(Brush.radialGradient(listOf(Color(0xFF4ADE80), Color(0xFF22C55E), Color(0xFF16A34A)))), contentAlignment = Alignment.Center) {
                                Icon(Icons.Filled.Autorenew, null, tint = Color.White, modifier = Modifier.size(52.dp))
                            }
                            Text("ðŸ”„ " + stringResource(R.string.commerce_listing_reactivated), fontWeight = FontWeight.ExtraBold, fontSize = 24.sp, color = Color(0xFF14532D))
                            Text(stringResource(R.string.commerce_undo_success_msg), fontSize = 14.sp, color = Color(0xFF166534), textAlign = TextAlign.Center)
                            // Active | Visible status panel (web parity)
                            Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFDCFCE7), border = BorderStroke(1.dp, Color(0xFF86EFAC)), modifier = Modifier.fillMaxWidth()) {
                                Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF16A34A), modifier = Modifier.size(28.dp))
                                        Text("Active", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF166534))
                                        Text("Post Status", fontSize = 11.sp, color = Color(0xFF64748B))
                                    }
                                    Box(modifier = Modifier.width(1.dp).height(48.dp).background(Color(0xFF86EFAC)))
                                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Icon(Icons.Filled.Visibility, null, tint = Color(0xFF16A34A), modifier = Modifier.size(28.dp))
                                        Text("Visible", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF166534))
                                        Text("To Buyers", fontSize = 11.sp, color = Color(0xFF64748B))
                                    }
                                }
                            }
                            state.transactionId?.let { txnId ->
                                Surface(shape = RoundedCornerShape(8.dp), color = Color(0xFFF0F9FF)) {
                                    Row(Modifier.padding(horizontal = 12.dp, vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Icon(Icons.Filled.Tag, null, tint = Color(0xFF2563EB), modifier = Modifier.size(14.dp))
                                        Text("Reference: $txnId", fontSize = 12.sp, color = Color(0xFF2563EB), fontWeight = FontWeight.SemiBold)
                                    }
                                }
                            }
                            // Action buttons
                            OutlinedButton(
                                onClick = { viewModel.reset() },
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.fillMaxWidth().height(48.dp),
                                border = BorderStroke(1.5.dp, Color(0xFF22C55E)),
                            ) {
                                Icon(Icons.Filled.Autorenew, null, tint = Color(0xFF16A34A), modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Reactivate Another", fontWeight = FontWeight.SemiBold, color = Color(0xFF16A34A))
                            }
                            Button(onClick = onBack, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)), modifier = Modifier.fillMaxWidth().height(48.dp), elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)) {
                                Icon(Icons.Filled.Home, null, tint = Color.White, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Go to My Home", fontWeight = FontWeight.Bold, color = Color.White)
                            }
                        }
                    }
                } else {
                    MhubTextField(stringResource(R.string.commerce_field_post_id), state.postId, viewModel::setPostId)
                    // Reason dropdown (ExposedDropdownMenuBox for proper scroll-safe rendering)
                    val reasonLabels = remember { mapOf(
                        "no_buyers_found" to "No buyers found",
                        "buyer_not_interested" to "Buyer not interested",
                        "buyer_changed_mind" to "Buyer changed mind",
                        "price_too_high" to "Price too high",
                        "item_condition_issue" to "Item condition concerns",
                        "location_issue" to "Location not convenient",
                        "communication_failed" to "Communication failed",
                        "payment_issue" to "Payment issue",
                        "want_to_relist" to "Want to relist with new details",
                        "other" to "Other reason",
                    ) }
                    Column {
                        Text(stringResource(R.string.commerce_field_reason), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                        Spacer(Modifier.height(4.dp))
                        ExposedDropdownMenuBox(
                            expanded = expanded,
                            onExpandedChange = { expanded = it },
                        ) {
                            OutlinedTextField(
                                value = if (state.reason.isBlank()) "Select reason" else (reasonLabels[state.reason] ?: state.reason.replace("_", " ").replaceFirstChar { it.uppercase() }),
                                onValueChange = {},
                                readOnly = true,
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                                modifier = Modifier.fillMaxWidth().menuAnchor(MenuAnchorType.PrimaryNotEditable),
                            )
                            ExposedDropdownMenu(
                                expanded = expanded,
                                onDismissRequest = { expanded = false },
                            ) {
                                // Web parity: first option is empty (optional)
                                DropdownMenuItem(
                                    text = { Text("Select reason (optional)", color = Color(0xFF9CA3AF)) },
                                    onClick = { viewModel.setReason(""); expanded = false },
                                )
                                viewModel.getReasons().forEach { r ->
                                    DropdownMenuItem(
                                        text = { Text(reasonLabels[r] ?: r.replace("_", " ").replaceFirstChar { it.uppercase() }) },
                                        onClick = { viewModel.setReason(r); expanded = false },
                                    )
                                }
                            }
                        }
                    }
                    // Web parity: description only required when reason == "other"
                    Column {
                        MhubTextField(
                            label = if (state.reason == "other") "Description (required)" else "Description (optional)",
                            value = state.description,
                            onValueChange = viewModel::setDescription,
                            maxLines = 5,
                            minLines = 3,
                        )
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            if (state.reason == "other" && state.description.isNotBlank() && state.description.length < 20) {
                                Text("Minimum 20 characters required", fontSize = 11.sp, color = Color(0xFFEF4444))
                            } else {
                                Spacer(Modifier.weight(1f))
                            }
                            Text("${state.description.length}/2000", fontSize = 11.sp, color = Color(0xFF94A3B8))
                        }
                    }
                    Button(onClick = { showConfirmDialog = true }, enabled = !state.loading,
                        shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                        modifier = Modifier.fillMaxWidth().height(50.dp)) {
                        Text(if (state.loading) stringResource(R.string.commerce_processing) else stringResource(R.string.commerce_undo_sale), fontWeight = FontWeight.SemiBold, color = Color.White)
                    }
                }
                // History
                if (state.history.isNotEmpty()) {
                    Spacer(Modifier.height(8.dp))
                    Text(stringResource(R.string.commerce_undo_history), fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B))
                    state.history.forEach { rec ->
                        Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                if (rec.postImage != null) {
                                    AsyncImage(model = rec.postImage, contentDescription = null, contentScale = ContentScale.Crop,
                                        modifier = Modifier.size(48.dp).clip(RoundedCornerShape(8.dp)))
                                }
                                Spacer(Modifier.width(10.dp))
                                Column(Modifier.weight(1f)) {
                                    Text(rec.postTitle ?: "Listing", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF1E293B))
                                    Text(rec.reason ?: "", fontSize = 11.sp, color = Color(0xFF64748B))
                                }
                                Text("â‚¹${rec.amount.toLong()}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFFF59E0B))
                            }
                        }
                    }
                }
            }
        }
    }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PaymentScreen â€” 5-step stepper: Select Plan â†’ Pay â†’ Submit UTR â†’ Verification â†’ Active
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
data class PaymentUiState(
    val step: Int = 0,
    val loading: Boolean = true,
    val upiId: String? = null,
    val merchantName: String? = null,
    val instructions: List<String> = emptyList(),
    val history: List<PaymentHistoryItem> = emptyList(),
    val selectedPlan: String? = null,
    val transactionId: String = "",
    val submitting: Boolean = false,
    val success: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class PaymentViewModel @Inject constructor(private val repo: PaymentsRepository) : ViewModel() {
    private val _state = MutableStateFlow(PaymentUiState())
    val state: StateFlow<PaymentUiState> = _state.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        _state.value = _state.value.copy(loading = true)
        when (val r = repo.upiDetails()) {
            is ApiResult.Success -> _state.value = _state.value.copy(loading = false, upiId = r.data.upiId, merchantName = r.data.merchantName, instructions = r.data.instructions)
            is ApiResult.Failure -> _state.value = _state.value.copy(loading = false)
        }
        when (val r = repo.history()) {
            is ApiResult.Success -> _state.value = _state.value.copy(history = r.data)
            is ApiResult.Failure -> {}
        }
    } }
    fun selectPlan(plan: String) { _state.value = _state.value.copy(selectedPlan = plan, step = 1) }
    fun advanceStep() { _state.value = _state.value.copy(step = _state.value.step + 1) }
    fun setTransactionId(v: String) { _state.value = _state.value.copy(transactionId = v) }
    fun submitPayment() {
        val s = _state.value
        if (s.transactionId.isBlank()) { _state.value = s.copy(error = "Enter transaction ID"); return }
        _state.value = s.copy(submitting = true, error = null)
        viewModelScope.launch {
            when (repo.submit(SubmitPaymentRequest(transactionId = s.transactionId, plan = s.selectedPlan))) {
                is ApiResult.Success -> _state.value = _state.value.copy(submitting = false, success = true, step = 4)
                is ApiResult.Failure -> _state.value = _state.value.copy(submitting = false, error = "Submission failed")
            }
        }
    }
}

@Composable
fun PaymentScreen(onBack: () -> Unit, viewModel: PaymentViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val steps = listOf("Select Plan", "Pay", "Submit UTR", "Verification", "Active")
    val plans = listOf("silver" to "Silver â‚¹149/mo", "gold" to "Gold â‚¹299/mo", "platinum" to "Platinum â‚¹999/mo")
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar(stringResource(R.string.checkout_payment_title), onBack)
            // Stepper
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                steps.forEachIndexed { i, label ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                        Box(Modifier.size(28.dp).clip(CircleShape).background(if (i <= state.step) Color(0xFF2563EB) else Color(0xFFE2E8F0)),
                            contentAlignment = Alignment.Center) {
                            if (i < state.step) Icon(Icons.Filled.Check, null, tint = Color.White, modifier = Modifier.size(16.dp))
                            else Text("${i + 1}", fontSize = 11.sp, color = if (i <= state.step) Color.White else Color(0xFF94A3B8), fontWeight = FontWeight.Bold)
                        }
                        Text(label, fontSize = 9.sp, color = Color(0xFF64748B), maxLines = 1)
                    }
                }
            }
            if (state.loading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
            } else {
                Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    state.error?.let { Text(it, color = Color(0xFFDC2626), fontSize = 13.sp) }
                    if (state.success) {
                        Surface(shape = RoundedCornerShape(16.dp), color = Color(0xFFF0FDF4), modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(56.dp))
                                Spacer(Modifier.height(12.dp))
                                Text("Payment Submitted!", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color(0xFF14532D))
                                Text("Your payment is being verified. This usually takes 2-24 hours.", fontSize = 13.sp, color = Color(0xFF166534))
                            }
                        }
                    } else when (state.step) {
                        0 -> {
                            Text("Choose Your Plan", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
                            
                            // Plan comparison
                            val planFeatures = mapOf(
                                "silver" to listOf("Up to 10 posts", "Basic support", "Standard delivery"),
                                "gold" to listOf("Up to 50 posts", "Priority support", "Featured badge", "Fast delivery"),
                                "platinum" to listOf("Unlimited posts", "24/7 VIP support", "Homepage placement", "Instant delivery", "Custom branding"),
                            )
                            
                            plans.forEach { (key, label) ->
                                Surface(
                                    shape = RoundedCornerShape(14.dp),
                                    color = if (state.selectedPlan == key) Color(0xFFEFF6FF) else Color.White,
                                    shadowElevation = if (state.selectedPlan == key) 4.dp else 2.dp,
                                    border = if (state.selectedPlan == key) BorderStroke(2.dp, Brush.horizontalGradient(listOf(Color(0xFF3B82F6), Color(0xFF2563EB)))) else ButtonDefaults.outlinedButtonBorder(enabled = true),
                                    modifier = Modifier.fillMaxWidth().clickable { viewModel.selectPlan(key) }
                                ) {
                                    Column(Modifier.padding(16.dp)) {
                                        Row(verticalAlignment = Alignment.CenterVertically) {
                                            RadioButton(
                                                selected = state.selectedPlan == key,
                                                onClick = { viewModel.selectPlan(key) },
                                                colors = RadioButtonDefaults.colors(selectedColor = Color(0xFF2563EB))
                                            )
                                            Text(label, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B), modifier = Modifier.weight(1f))
                                            if (key == "gold") {
                                                Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFF2563EB)) {
                                                    Text("POPULAR", fontSize = 9.sp, color = Color.White, fontWeight = FontWeight.Bold,
                                                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                                }
                                            }
                                        }
                                        HorizontalDivider(color = Color(0xFFE2E8F0), modifier = Modifier.padding(vertical = 8.dp))
                                        planFeatures[key]?.forEach { feature ->
                                            Row(Modifier.padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                                                Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(14.dp))
                                                Spacer(Modifier.width(6.dp))
                                                Text(feature, fontSize = 12.sp, color = Color(0xFF64748B))
                                            }
                                        }
                                    }
                                }
                                Spacer(Modifier.height(10.dp))
                            }
                        }
                        1 -> {
                            Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                                Column(Modifier.padding(20.dp)) {
                                    Text("Pay via UPI", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
                                    Spacer(Modifier.height(12.dp))
                                    if (state.upiId != null) {
                                        Surface(shape = RoundedCornerShape(10.dp), color = Color(0xFFF0F9FF), modifier = Modifier.fillMaxWidth()) {
                                            Column(Modifier.padding(14.dp)) {
                                                Text("UPI ID", fontSize = 12.sp, color = Color(0xFF64748B))
                                                Text(state.upiId ?: "", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF2563EB))
                                                if (state.merchantName != null) Text("Merchant: ${state.merchantName}", fontSize = 12.sp, color = Color(0xFF64748B))
                                            }
                                        }
                                    }
                                    Spacer(Modifier.height(12.dp))
                                    state.instructions.forEach { Text("â€¢ $it", fontSize = 13.sp, color = Color(0xFF64748B)) }
                                    Spacer(Modifier.height(16.dp))
                                    Button(onClick = { viewModel.advanceStep() }, shape = RoundedCornerShape(12.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                        modifier = Modifier.fillMaxWidth().height(48.dp)) {
                                        Text("I've Paid â†’ Enter UTR", fontWeight = FontWeight.SemiBold)
                                    }
                                }
                            }
                        }
                        else -> {
                            Text("Enter Transaction ID (UTR)", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B))
                            MhubTextField("Transaction ID / UTR", state.transactionId, viewModel::setTransactionId)
                            Button(onClick = { viewModel.submitPayment() }, enabled = !state.submitting,
                                shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                modifier = Modifier.fillMaxWidth().height(50.dp)) {
                                Text(if (state.submitting) "Submittingâ€¦" else "Submit for Verification", fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                    // Payment history
                    if (state.history.isNotEmpty()) {
                        Spacer(Modifier.height(8.dp))
                        Text("Payment History", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B))
                        state.history.forEach { pay ->
                            val statusColor = when (pay.status?.lowercase()) {
                                "verified" -> Color(0xFF22C55E)
                                "rejected" -> Color(0xFFEF4444)
                                else -> Color(0xFFF59E0B)
                            }
                            Surface(shape = RoundedCornerShape(10.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Column(Modifier.weight(1f)) {
                                        Text(pay.plan ?: pay.purpose ?: "Payment", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF1E293B))
                                        Text(pay.transactionId ?: "", fontSize = 11.sp, color = Color(0xFF64748B))
                                    }
                                    Surface(shape = RoundedCornerShape(12.dp), color = statusColor.copy(alpha = 0.15f)) {
                                        Text(pay.status?.replaceFirstChar { it.uppercase() } ?: "Pending", fontSize = 11.sp,
                                            color = statusColor, fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}


