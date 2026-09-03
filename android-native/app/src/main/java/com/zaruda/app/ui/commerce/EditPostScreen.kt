package com.zaruda.app.ui.commerce

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
import com.zaruda.app.R
import com.zaruda.app.ui.components.AppErrorState
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.*
import com.zaruda.app.data.repository.*
import com.zaruda.app.domain.model.Post
import com.zaruda.app.ui.common.LinkColor
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

// ──────────────────────────────────────────────────────────────────────────────

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
                images = s.existingImages,
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
                    Text("Photos (${state.existingImages.size}/10)", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
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
                    ZarudaTextFieldWithCounter(
                        label = stringResource(R.string.commerce_field_title),
                        value = state.title,
                        onValueChange = viewModel::setTitle,
                        maxLength = 100,
                        error = state.fieldErrors["title"],
                    )
                    // Description with char counter
                    ZarudaTextFieldWithCounter(
                        label = stringResource(R.string.commerce_field_description),
                        value = state.description,
                        onValueChange = viewModel::setDescription,
                        maxLength = 2000,
                        maxLines = 4,
                        minLines = 3,
                    )
                    // Price row
                    ZarudaTextFieldWithCounter(
                        label = "Price (₹)",
                        value = state.price,
                        onValueChange = viewModel::setPrice,
                        maxLength = 10,
                        error = state.fieldErrors["price"],
                    )
                    ZarudaTextField(stringResource(R.string.commerce_field_location), state.location, viewModel::setLocation)

                    var notifyPriceDrop by remember { mutableStateOf(true) }
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f),
                        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Checkbox(
                                checked = notifyPriceDrop,
                                onCheckedChange = { notifyPriceDrop = it },
                            )
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    "⚡ Broadcast price updates to buyers",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurface,
                                )
                                Text(
                                    "Notify users who saved or wishlisted this item about price changes",
                                    fontSize = 10.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
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


// ──────────────────────────────────────────────────────────────────────────────
// TierSelectionScreen
// ──────────────────────────────────────────────────────────────────────────────
data class TiersUiState(
    val loading: Boolean = true,
    val tiers: List<Tier> = emptyList(),
    val error: String? = null,
    val currentSubscription: SubscriptionRecord? = null,
    val subscriptionHistory: List<SubscriptionRecord> = emptyList(),
    val historyLoading: Boolean = false,
    val cancelLoading: Boolean = false,
    val cancelSuccess: Boolean = false,
    val bronzeClaimLoading: Boolean = false,
    val bronzeClaimSuccess: Boolean = false,
    val coinBalance: Int = 0,
    val coinsApplied: Int = 0,
    val coinsToApply: Int = 0,
    val subscribeLoading: String? = null,
)