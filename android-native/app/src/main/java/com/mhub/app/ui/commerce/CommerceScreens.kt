package com.mhub.app.ui.commerce

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
import androidx.compose.material.icons.automirrored.filled.ViewList
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.*
import com.mhub.app.data.repository.*
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.common.LinkColor
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import javax.inject.Inject

// ──────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────────────────────────────────────────

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
                    Text("₹${post.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF2563EB))
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

// ──────────────────────────────────────────────────────────────────────────────
// PostWelcomeScreen
// ──────────────────────────────────────────────────────────────────────────────
@Composable
fun PostWelcomeScreen(onBack: () -> Unit, onStartPost: () -> Unit) {
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar("Sell Something", onBack)
            Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(
                    Modifier.size(96.dp).clip(RoundedCornerShape(24.dp))
                        .background(Brush.radialGradient(listOf(Color(0xFF60A5FA), Color(0xFF2563EB)))),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Filled.Sell, null, tint = Color.White, modifier = Modifier.size(48.dp)) }
                Spacer(Modifier.height(24.dp))
                Text("Ready to Sell?", fontWeight = FontWeight.Bold, fontSize = 24.sp, color = Color(0xFF1E293B))
                Spacer(Modifier.height(8.dp))
                Text("Reach thousands of buyers in your area. Listing is quick and easy.", fontSize = 15.sp, color = Color(0xFF64748B))
                Spacer(Modifier.height(28.dp))
                // FlowStep visual progress
                Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text("How it works", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                        Spacer(Modifier.height(12.dp))
                        listOf(
                            Triple(Icons.Filled.PhotoCamera, "Add Photos", "Listings with photos get 3x more views"),
                            Triple(Icons.Filled.Description, "Write Details", "Clear title and description sell faster"),
                            Triple(Icons.Filled.PriceChange, "Set Your Price", "Price competitively to attract buyers"),
                        ).forEachIndexed { idx, (icon, title, desc) ->
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
                            Text("Free Plan — Up to 1 photo", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF92400E))
                            Text("Upgrade to Silver or Premium for more images & features", fontSize = 11.sp, color = Color(0xFFB45309))
                        }
                    }
                }
                Spacer(Modifier.height(24.dp))
                Button(
                    onClick = onStartPost,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                    contentPadding = PaddingValues(0.dp),
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                ) {
                    Box(
                        Modifier.fillMaxSize().clip(RoundedCornerShape(14.dp)).background(brandGrad),
                        contentAlignment = Alignment.Center,
                    ) { Text("Start Listing Now", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp) }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// EditPostScreen
// ──────────────────────────────────────────────────────────────────────────────
data class EditPostUiState(
    val loading: Boolean = true,
    val saving: Boolean = false,
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
}

@Composable
fun EditPostScreen(postId: String, onBack: () -> Unit, viewModel: EditPostViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(postId) { viewModel.load(postId) }
    LaunchedEffect(state.success) { if (state.success) onBack() }

    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar("Edit Listing", onBack)
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

                    // Existing images
                    if (state.existingImages.isNotEmpty()) {
                        Text("Photos", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            state.existingImages.take(8).forEachIndexed { idx, url ->
                                Box(Modifier.size(76.dp)) {
                                    AsyncImage(
                                        model = url, contentDescription = null,
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(10.dp)),
                                    )
                                    Surface(
                                        shape = CircleShape, color = Color.Black.copy(alpha = 0.5f),
                                        modifier = Modifier.size(18.dp).align(Alignment.TopEnd).padding(2.dp),
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text("${idx + 1}", fontSize = 9.sp, color = Color.White, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // Title with char counter
                    MhubTextFieldWithCounter(
                        label = "Title",
                        value = state.title,
                        onValueChange = viewModel::setTitle,
                        maxLength = 100,
                        error = state.fieldErrors["title"],
                    )
                    // Description with char counter
                    MhubTextFieldWithCounter(
                        label = "Description",
                        value = state.description,
                        onValueChange = viewModel::setDescription,
                        maxLength = 2000,
                        maxLines = 4,
                        minLines = 3,
                    )
                    // Price row
                    MhubTextFieldWithCounter(
                        label = "Price (₹)",
                        value = state.price,
                        onValueChange = viewModel::setPrice,
                        maxLength = 10,
                        error = state.fieldErrors["price"],
                    )
                    // Flash sale toggle
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Flash Sale", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                            Text("Show as limited-time offer", fontSize = 11.sp, color = Color(0xFF64748B))
                        }
                        Switch(checked = state.flashSale, onCheckedChange = { viewModel.toggleFlashSale() })
                    }

                    MhubTextField("Location", state.location, viewModel::setLocation)
                    MhubTextField("Brand", state.brand, viewModel::setBrand)
                    MhubTextField("Model", state.model, viewModel::setModel)

                    // Warranty select
                    Text("Warranty", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("No warranty", "3 months", "6 months", "1 year", "2+ years").forEach { w ->
                            val sel = state.warranty == w
                            Surface(
                                onClick = { viewModel.setWarranty(if (sel) "" else w) },
                                shape = RoundedCornerShape(10.dp),
                                color = if (sel) Color(0xFF2563EB) else Color.White,
                                border = ButtonDefaults.outlinedButtonBorder,
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
                    Text("Condition", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("New", "Like New", "Good", "Fair").forEach { cond ->
                            val selected = state.condition.equals(cond, ignoreCase = true)
                            Surface(
                                onClick = { viewModel.setCondition(cond) },
                                shape = RoundedCornerShape(10.dp),
                                color = if (selected) Color(0xFF2563EB) else Color.White,
                                border = ButtonDefaults.outlinedButtonBorder,
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
                    Text("Contact Preference", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("call" to "📞 Call", "chat" to "💬 Chat", "both" to "✅ Both").forEach { (key, label) ->
                            val sel = state.contactPreference == key
                            Surface(
                                onClick = { viewModel.setContactPreference(key) },
                                shape = RoundedCornerShape(10.dp),
                                color = if (sel) Color(0xFFEFF6FF) else Color.White,
                                border = if (sel) ButtonDefaults.outlinedButtonBorder.copy(width = 2.dp) else ButtonDefaults.outlinedButtonBorder,
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
                                    Text("Saving…", color = Color.White, fontWeight = FontWeight.SemiBold)
                                }
                            } else {
                                Text("Save Changes", color = Color.White, fontWeight = FontWeight.SemiBold)
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

// ──────────────────────────────────────────────────────────────────────────────
// TierSelectionScreen
// ──────────────────────────────────────────────────────────────────────────────
data class TiersUiState(val loading: Boolean = true, val tiers: List<Tier> = emptyList(), val error: String? = null)

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
        }
    }

    fun subscribe(tierId: String) {
        viewModelScope.launch {
            repo.subscribe(SubscribeRequest(tierId = tierId))
        }
    }

    private val defaultTiers = listOf(
        Tier("free", "Free", 0.0, "INR", 30, listOf("Up to 5 listings", "Standard visibility", "Basic analytics"), false),
        Tier("premium", "Premium", 299.0, "INR", 30, listOf("Unlimited listings", "Featured placement", "Priority support", "Advanced analytics"), true),
        Tier("business", "Business", 999.0, "INR", 30, listOf("Everything in Premium", "Dedicated account manager", "API access", "Custom branding"), false),
    )
}

@Composable
fun TierSelectionScreen(onBack: () -> Unit, viewModel: TiersViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar("Choose Your Plan", onBack)
            if (state.loading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
            } else {
                LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    item {
                        Text("Select the plan that fits your needs", fontSize = 14.sp, color = Color(0xFF64748B), modifier = Modifier.padding(bottom = 8.dp))
                    }
                    items(state.tiers, key = { it.id ?: it.name ?: "" }) { tier ->
                        TierCard(tier = tier, onSelect = { viewModel.subscribe(tier.id ?: "") })
                    }
                }
            }
        }
    }
}

@Composable
private fun TierCard(tier: Tier, onSelect: () -> Unit) {
    val isPopular = tier.popular
    val borderColor = if (isPopular) Color(0xFF2563EB) else Color(0xFFE2E8F0)
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = if (isPopular) Color(0xFFF0F9FF) else Color.White,
        border = ButtonDefaults.outlinedButtonBorder.copy(width = if (isPopular) 2.dp else 1.dp),
        modifier = Modifier.fillMaxWidth(),
        shadowElevation = if (isPopular) 4.dp else 2.dp,
    ) {
        Column(Modifier.padding(20.dp)) {
            if (isPopular) {
                Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFF2563EB), modifier = Modifier.padding(bottom = 12.dp)) {
                    Text("POPULAR", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(tier.name ?: "", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color(0xFF1E293B))
                Spacer(Modifier.weight(1f))
                if (tier.price == 0.0) {
                    Text("Free", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color(0xFF22C55E))
                } else {
                    Text("₹${tier.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color(0xFF2563EB))
                    Text("/mo", fontSize = 12.sp, color = Color(0xFF64748B))
                }
            }
            Spacer(Modifier.height(14.dp))
            tier.features.forEach { feature ->
                Row(Modifier.padding(vertical = 3.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(feature, fontSize = 13.sp, color = Color(0xFF374151))
                }
            }
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = onSelect, shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = if (isPopular) Color(0xFF2563EB) else Color(0xFFF1F5F9)),
                modifier = Modifier.fillMaxWidth().height(44.dp),
            ) {
                Text(
                    if (tier.price == 0.0) "Get Started Free" else "Subscribe Now",
                    color = if (isPopular) Color.White else Color(0xFF374151),
                    fontWeight = FontWeight.SemiBold, fontSize = 14.sp,
                )
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// BoughtPostsScreen / SoldPostsScreen
// ──────────────────────────────────────────────────────────────────────────────
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
    PostsListScreen("Sales History", Icons.Filled.Inventory, "Items you've sold", "No sales yet", state, onBack, onOpenPost)
}

@Composable
fun BoughtPostsScreen(onBack: () -> Unit, onOpenPost: (String) -> Unit = {}, viewModel: BoughtPostsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    PostsListScreen("Purchase History", Icons.Filled.ShoppingBag, "Items you've bought", "No purchases yet", state, onBack, onOpenPost)
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
                        placeholder = { Text("Search by title or location…") },
                        leadingIcon = { Icon(Icons.Filled.Search, null, tint = Color(0xFF64748B)) },
                        trailingIcon = { if (search.isNotBlank()) IconButton(onClick = { search = "" }) { Icon(Icons.Filled.Close, null, tint = Color(0xFF94A3B8)) } },
                        singleLine = true, shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
                    )
                    // Sort chips
                    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        listOf("newest" to "Newest", "price_asc" to "Price ↑", "price_desc" to "Price ↓").forEach { (key, label) ->
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
                        item { Text("${displayed.size} items", fontSize = 13.sp, color = Color(0xFF64748B)) }
                        items(displayed, key = { it.stableId }) { post ->
                            PostListItem(post) { (post.id ?: post.postId)?.let(onOpenPost) }
                        }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// OffersScreen
// ──────────────────────────────────────────────────────────────────────────────
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
            ScreenTopBar("Offers", onBack)
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
                placeholder = { Text("Search by name or title…") },
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
                        Text("₹${offer.amount.toLong()}", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF2563EB))
                        if (offer.originalPrice > 0) {
                            Spacer(Modifier.width(6.dp))
                            Text("₹${offer.originalPrice.toLong()}", fontSize = 12.sp, color = Color(0xFF94A3B8),
                                style = androidx.compose.ui.text.TextStyle(textDecoration = androidx.compose.ui.text.style.TextDecoration.LineThrough))
                            Spacer(Modifier.width(4.dp))
                            Text("${offer.savings.toInt()}% off", fontSize = 11.sp, color = Color(0xFF22C55E), fontWeight = FontWeight.SemiBold)
                        }
                    }
                    Text(if (isReceived) "From: ${offer.buyerName ?: "Buyer"}" else "To: ${offer.sellerName ?: "Seller"}", fontSize = 12.sp, color = Color(0xFF64748B))
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
                            placeholder = { Text("Counter ₹") }, shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.weight(1f),
                            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
                        Button(onClick = { counterPrice.toDoubleOrNull()?.let { onCounter(it); showCounter = false } },
                            shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B82F6)),
                            contentPadding = PaddingValues(horizontal = 12.dp)) { Text("Send") }
                    }
                } else {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = onDecline, modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp)) { Text("Decline", color = Color(0xFFDC2626)) }
                        OutlinedButton(onClick = { showCounter = true }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp)) { Text("Counter", color = Color(0xFF3B82F6)) }
                        Button(onClick = onAccept, modifier = Modifier.weight(1f), shape = RoundedCornerShape(10.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))) { Text("Accept") }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// CartScreen
// ──────────────────────────────────────────────────────────────────────────────
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
}

@Composable
fun CartScreen(onBack: () -> Unit, viewModel: CartViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar("Cart (${state.items.size})", onBack)
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                state.items.isEmpty() && state.savedForLater.isEmpty() -> EmptyState(
                    icon = { Icon(Icons.Filled.ShoppingCart, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp)) },
                    title = "Your cart is empty", subtitle = "Add items to proceed to checkout",
                )
                else -> Column(Modifier.fillMaxSize()) {
                    LazyColumn(Modifier.weight(1f), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        // Cart items
                        if (state.items.isNotEmpty()) {
                            item { Text("Cart (${state.items.size})", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151)) }
                            items(state.items, key = { it.stableId }) { item ->
                                CartItemCard(
                                    item = item,
                                    onRemove = { viewModel.remove(item.postId ?: "") },
                                    onQtyChange = { qty -> viewModel.updateQty(item.postId ?: "", qty) },
                                    onSaveForLater = { viewModel.saveForLater(item.postId ?: "") },
                                )
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
                                            Text("Delivery Address", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                                        }
                                        Spacer(Modifier.height(8.dp))
                                        OutlinedTextField(
                                            value = state.deliveryAddress, onValueChange = { viewModel.setDeliveryAddress(it) },
                                            placeholder = { Text("Enter delivery address…") },
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
                                            Text("Payment Method", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
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
                                                    border = if (sel) ButtonDefaults.outlinedButtonBorder.copy(width = 2.dp) else ButtonDefaults.outlinedButtonBorder,
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
                                        Text("Have a coupon?", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                                        Spacer(Modifier.height(8.dp))
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            OutlinedTextField(value = state.couponCode, onValueChange = { viewModel.setCouponCode(it) },
                                                placeholder = { Text("Enter code") }, singleLine = true, shape = RoundedCornerShape(10.dp),
                                                modifier = Modifier.weight(1f),
                                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
                                            Button(onClick = { viewModel.applyCoupon() }, shape = RoundedCornerShape(10.dp),
                                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)) { Text("Apply") }
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
                                        Text("Estimated delivery: 2-7 business days", fontSize = 13.sp, color = Color(0xFF166534))
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
                                    Text("Subtotal", fontSize = 14.sp, color = Color(0xFF64748B))
                                    Spacer(Modifier.weight(1f))
                                    Text("₹${viewModel.subtotal.toLong()}", fontSize = 14.sp, color = Color(0xFF1E293B))
                                }
                                Row(Modifier.fillMaxWidth()) {
                                    Text("Shipping", fontSize = 14.sp, color = Color(0xFF64748B))
                                    Spacer(Modifier.weight(1f))
                                    Text(if (viewModel.shipping == 0.0) "Free" else "₹${viewModel.shipping.toLong()}", fontSize = 14.sp, color = if (viewModel.shipping == 0.0) Color(0xFF22C55E) else Color(0xFF1E293B))
                                }
                                if (state.couponDiscount > 0) {
                                    Row(Modifier.fillMaxWidth()) {
                                        Text("Discount", fontSize = 14.sp, color = Color(0xFF22C55E))
                                        Spacer(Modifier.weight(1f))
                                        Text("-₹${state.couponDiscount.toLong()}", fontSize = 14.sp, color = Color(0xFF22C55E))
                                    }
                                }
                                HorizontalDivider(color = Color(0xFFE2E8F0), modifier = Modifier.padding(vertical = 8.dp))
                                Row(Modifier.fillMaxWidth()) {
                                    Text("Total", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
                                    Spacer(Modifier.weight(1f))
                                    Text("₹${viewModel.grandTotal.toLong()}", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color(0xFF2563EB))
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
                    if (item.price != null) Text("₹${item.price.toLong()}", fontSize = 14.sp, color = Color(0xFF2563EB), fontWeight = FontWeight.Bold)
                    if (item.sellerName != null) Text(item.sellerName, fontSize = 12.sp, color = Color(0xFF64748B))
                    // Qty controls
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 6.dp)) {
                        Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFFF1F5F9), modifier = Modifier.size(28.dp).clickable { onQtyChange(item.quantity - 1) }) {
                            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) { Text("−", fontWeight = FontWeight.Bold, color = Color(0xFF374151)) }
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
                Text("Save for later", fontSize = 12.sp, color = Color(0xFF2563EB))
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
                if (item.price != null) Text("₹${item.price.toLong()}", fontSize = 13.sp, color = Color(0xFF2563EB), fontWeight = FontWeight.Bold)
            }
            TextButton(onClick = onMoveToCart, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) {
                Text("Move to Cart", fontSize = 11.sp, color = Color(0xFF2563EB), fontWeight = FontWeight.SemiBold)
            }
            IconButton(onClick = onRemove, modifier = Modifier.size(30.dp)) {
                Icon(Icons.Filled.Close, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(14.dp))
            }
        }
    }
}



// ──────────────────────────────────────────────────────────────────────────────
// RecentlyViewedScreen
// ──────────────────────────────────────────────────────────────────────────────
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
    fun clearAll() { _state.value = _state.value.copy(posts = emptyList()) }
    fun removePost(id: String) { _state.value = _state.value.copy(posts = _state.value.posts.filter { it.stableId != id }) }
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
    val displayed = remember(state.posts, search) {
        if (search.isBlank()) state.posts else state.posts.filter { it.displayTitle.contains(search, true) || (it.location ?: "").contains(search, true) }
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
                    Text("Recently Viewed", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
                    if (state.posts.isNotEmpty()) Text("${state.posts.size} items browsed", fontSize = 11.sp, color = Color(0xFF64748B))
                }
                if (state.posts.isNotEmpty()) TextButton(onClick = { viewModel.clearAll() }) { Text("Clear All", color = Color(0xFFEF4444), fontSize = 13.sp) }
                IconButton(onClick = { isGrid = !isGrid }, modifier = Modifier.size(36.dp)) {
                    Icon(if (isGrid) Icons.AutoMirrored.Filled.ViewList else Icons.Filled.GridView, null, tint = Color(0xFF64748B))
                }
            }

            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                else -> {
                    OutlinedTextField(
                        value = search, onValueChange = { search = it },
                        placeholder = { Text("Search recently viewed…") },
                        leadingIcon = { Icon(Icons.Filled.Search, null, tint = Color(0xFF64748B)) },
                        trailingIcon = { if (search.isNotBlank()) IconButton(onClick = { search = "" }) { Icon(Icons.Filled.Close, null, tint = Color(0xFF94A3B8)) } },
                        singleLine = true, shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                    )
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
                                            if (post.price != null) Text("₹${post.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFF2563EB))
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
                    Text("₹${post.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF2563EB))
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

// ──────────────────────────────────────────────────────────────────────────────
// SavedSearchesScreen
// ──────────────────────────────────────────────────────────────────────────────
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
        _state.value = _state.value.copy(notificationsEnabled = _state.value.notificationsEnabled + (id to !current))
    }
    fun createSearch() {
        val s = _state.value
        if (s.newKeyword.isBlank()) return
        _state.value = s.copy(creating = true)
        viewModelScope.launch {
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
                    Text("Saved Searches", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
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
                                Text("New Saved Search", fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color(0xFF1E293B))
                                HorizontalDivider(color = Color(0xFFE2E8F0))
                                OutlinedTextField(value = state.newKeyword, onValueChange = { viewModel.setNewKeyword(it) },
                                    placeholder = { Text("Keywords (e.g. iPhone 13)") },
                                    leadingIcon = { Icon(Icons.Filled.Search, null, tint = Color(0xFF64748B), modifier = Modifier.size(18.dp)) },
                                    singleLine = true, shape = RoundedCornerShape(10.dp),
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                                    modifier = Modifier.fillMaxWidth())
                                OutlinedTextField(value = state.newLocation, onValueChange = { viewModel.setNewLocation(it) },
                                    placeholder = { Text("Location (optional)") },
                                    leadingIcon = { Icon(Icons.Filled.LocationOn, null, tint = Color(0xFF64748B), modifier = Modifier.size(18.dp)) },
                                    singleLine = true, shape = RoundedCornerShape(10.dp),
                                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                                    modifier = Modifier.fillMaxWidth())
                                // Price range
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedTextField(value = state.newMinPrice, onValueChange = { viewModel.setNewMinPrice(it) },
                                        placeholder = { Text("Min ₹") }, singleLine = true, shape = RoundedCornerShape(10.dp),
                                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                                        modifier = Modifier.weight(1f))
                                    OutlinedTextField(value = state.newMaxPrice, onValueChange = { viewModel.setNewMaxPrice(it) },
                                        placeholder = { Text("Max ₹") }, singleLine = true, shape = RoundedCornerShape(10.dp),
                                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                                        modifier = Modifier.weight(1f))
                                }
                                // Category chips
                                Text("Category", fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = Color(0xFF374151))
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
                                    modifier = Modifier.fillMaxWidth()) { Text(if (state.creating) "Saving…" else "Save Search", fontWeight = FontWeight.SemiBold) }
                            }
                        }
                    }
                    if (state.searches.isEmpty() && !state.showCreateForm) item {
                        EmptyState(icon = { Icon(Icons.Filled.Bookmark, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp)) },
                            title = "No saved searches", subtitle = "Tap + to create a search and get notified when new listings match")
                    }
                    else items(state.searches, key = { it.stableId }) { s ->
                        val notifOn = state.notificationsEnabled[s.stableId] ?: true
                        val newCount = (s.stableId.hashCode().and(0xFF)) % 8 // deterministic fake badge until API provides it
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
                                        border = ButtonDefaults.outlinedButtonBorder.copy(width = 1.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                        modifier = Modifier.weight(1f),
                                    ) {
                                        Icon(Icons.Filled.PlayArrow, null, modifier = Modifier.size(14.dp))
                                        Spacer(Modifier.width(4.dp))
                                        Text("Run", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                                    }
                                    // Delete
                                    OutlinedButton(
                                        onClick = { viewModel.delete(s.id ?: "") },
                                        shape = RoundedCornerShape(8.dp),
                                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFEF4444)),
                                        border = ButtonDefaults.outlinedButtonBorder.copy(width = 1.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                        modifier = Modifier.weight(1f),
                                    ) {
                                        Icon(Icons.Filled.Delete, null, modifier = Modifier.size(14.dp))
                                        Spacer(Modifier.width(4.dp))
                                        Text("Delete", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
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

// ──────────────────────────────────────────────────────────────────────────────
// CompareScreen
// ──────────────────────────────────────────────────────────────────────────────
@HiltViewModel
class CompareViewModel @Inject constructor(private val repo: PostsRepository) : ViewModel() {
    private val _state = MutableStateFlow(PostListUiState())
    val state: StateFlow<PostListUiState> = _state.asStateFlow()
    init { viewModelScope.launch {
        when (val r = repo.compareList()) {
            is ApiResult.Success -> _state.value = PostListUiState(loading = false, posts = r.data)
            is ApiResult.Failure -> _state.value = PostListUiState(loading = false, error = r.error.message)
        }
    } }
}

@Composable
fun CompareScreen(onBack: () -> Unit, viewModel: CompareViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar("Compare Listings", onBack)
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Color(0xFF2563EB)) }
                state.posts.isEmpty() -> EmptyState(
                    icon = { Icon(Icons.Filled.Compare, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(64.dp)) },
                    title = "Nothing to compare", subtitle = "Add listings to compare prices and features",
                )
                else -> {
                    val posts = state.posts
                    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
                        // Product cards row (horizontal scroll)
                        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            posts.forEach { post ->
                                Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.width(200.dp)) {
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
                                        if (post.price != null) Text("₹${post.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = Color(0xFF2563EB))
                                    }
                                }
                            }
                        }
                        // Comparison table
                        Surface(shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth().padding(16.dp)) {
                            Column(Modifier.padding(16.dp)) {
                                Text("Comparison", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B))
                                Spacer(Modifier.height(12.dp))
                                val specs = listOf(
                                    "Price" to { p: Post -> if (p.price != null) "₹${p.price.toLong()}" else "—" },
                                    "Location" to { p: Post -> p.location ?: "—" },
                                    "Seller" to { p: Post -> p.userName ?: "—" },
                                    "Category" to { p: Post -> p.categoryName ?: "—" },
                                    "Status" to { p: Post -> p.status ?: "—" },
                                )
                                specs.forEach { (label, getter) ->
                                    val values = posts.map { getter(it) }
                                    if (values.any { it != "—" }) {
                                        HorizontalDivider(color = Color(0xFFF1F5F9))
                                        Row(Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                                            Text(label, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, color = Color(0xFF64748B), modifier = Modifier.width(80.dp))
                                            posts.forEach { post ->
                                                Text(getter(post), fontSize = 12.sp, color = Color(0xFF1E293B), modifier = Modifier.weight(1f))
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

// ──────────────────────────────────────────────────────────────────────────────
// BuyerViewScreen — Full browse with search, brand, price filters
// ──────────────────────────────────────────────────────────────────────────────
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
    val priceRanges = listOf(null to "All", "0-25k" to "Under ₹25K", "25k-50k" to "₹25K-50K", "50k-75k" to "₹50K-75K", "75k+" to "₹75K+")
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar("Browse Listings", onBack)
            // Search bar
            OutlinedTextField(
                value = state.search, onValueChange = { viewModel.setSearch(it) },
                placeholder = { Text("Search by title, seller, location…") },
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
                        label = { Text("All Brands", fontSize = 11.sp) }, shape = RoundedCornerShape(20.dp),
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
                        Text("₹${post.price.toLong()}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp,
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

// ──────────────────────────────────────────────────────────────────────────────
// SaleDoneScreen — 5-step stepper: initiate, confirm, pending, receipt
// ──────────────────────────────────────────────────────────────────────────────
data class SaleDoneUiState(
    val step: Int = 0,
    val loading: Boolean = false,
    val pending: List<PendingSale> = emptyList(),
    val postId: String = "",
    val buyerId: String = "",
    val saleAmount: String = "",
    val txnId: String = "",
    val otp: String = "",
    val receiptId: String? = null,
    val transactionId: String? = null,
    val error: String? = null,
    val success: Boolean = false,
    val tab: String = "seller",
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
        if (s.postId.isBlank() || s.buyerId.isBlank() || s.saleAmount.isBlank()) { _state.value = s.copy(error = "All fields are required"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.initiate(InitiateSaleRequest(postId = s.postId, buyerId = s.buyerId, saleAmount = s.saleAmount.toDoubleOrNull() ?: 0.0))) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, transactionId = r.data.transactionId, step = 2)
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
            }
        }
    }
    fun confirmSale() {
        val s = _state.value
        if (s.txnId.isBlank() || s.otp.isBlank()) { _state.value = s.copy(error = "Transaction ID and OTP required"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.confirm(ConfirmSaleRequest(transactionId = s.txnId, otp = s.otp))) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, success = true, receiptId = r.data.receiptId, step = 4)
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
            }
        }
    }
}

@Composable
fun SaleDoneScreen(onBack: () -> Unit, viewModel: SaleDoneViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val steps = listOf("Listing Live", "Deal Agreed", "Payment", "Confirmation", "Complete")
    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0xFFF0FDF4), Color(0xFFDCFCE7))))) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar("Mark as Sold", onBack)
            // Stepper
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                steps.forEachIndexed { i, label ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                        Box(Modifier.size(28.dp).clip(CircleShape).background(if (i <= state.step) Color(0xFF22C55E) else Color(0xFFE2E8F0)),
                            contentAlignment = Alignment.Center) {
                            if (i < state.step) Icon(Icons.Filled.Check, null, tint = Color.White, modifier = Modifier.size(16.dp))
                            else Text("${i + 1}", fontSize = 11.sp, color = if (i <= state.step) Color.White else Color(0xFF94A3B8), fontWeight = FontWeight.Bold)
                        }
                        Text(label, fontSize = 9.sp, color = Color(0xFF64748B), maxLines = 1)
                    }
                }
            }
            // Seller / Buyer tabs
            TabRow(selectedTabIndex = if (state.tab == "seller") 0 else 1, containerColor = Color.Transparent) {
                Tab(selected = state.tab == "seller", onClick = { viewModel.setTab("seller") }, text = { Text("Seller") })
                Tab(selected = state.tab == "buyer", onClick = { viewModel.setTab("buyer") }, text = { Text("Buyer Confirm") })
            }
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                state.error?.let { Text(it, color = Color(0xFFDC2626), fontSize = 13.sp) }
                if (state.tab == "seller") {
                    if (state.success) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            // Success animation card
                            Surface(shape = RoundedCornerShape(24.dp), color = Color.White, shadowElevation = 4.dp, modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Box(Modifier.size(80.dp).clip(CircleShape).background(Color(0xFF22C55E)), contentAlignment = Alignment.Center) {
                                        Icon(Icons.Filled.CheckCircle, null, tint = Color.White, modifier = Modifier.size(48.dp))
                                    }
                                    Text("Sale Completed!", fontWeight = FontWeight.Bold, fontSize = 22.sp, color = Color(0xFF14532D))
                                    Text("Your sale has been confirmed successfully.", fontSize = 13.sp, color = Color(0xFF64748B), textAlign = TextAlign.Center)
                                }
                            }
                            // Receipt card
                            Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFFF0FDF4), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF86EFAC)), modifier = Modifier.fillMaxWidth()) {
                                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Text("TRANSACTION RECEIPT", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = Color(0xFF166534), letterSpacing = 1.5.sp)
                                    androidx.compose.material3.HorizontalDivider(color = Color(0xFF86EFAC))
                                    if (state.receiptId != null) {
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Receipt ID", fontSize = 13.sp, color = Color(0xFF64748B))
                                            Text(state.receiptId!!, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1E293B))
                                        }
                                    }
                                    if (state.transactionId != null) {
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Transaction", fontSize = 13.sp, color = Color(0xFF64748B))
                                            Text(state.transactionId!!, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1E293B))
                                        }
                                    }
                                    if (state.saleAmount.isNotBlank()) {
                                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text("Amount", fontSize = 13.sp, color = Color(0xFF64748B))
                                            Text("₹${state.saleAmount}", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = Color(0xFF22C55E))
                                        }
                                    }
                                }
                            }
                            // Reward earned card
                            Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFFFFF7ED), border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFFBBF24)), modifier = Modifier.fillMaxWidth()) {
                                Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Box(Modifier.size(48.dp).clip(RoundedCornerShape(14.dp)).background(Color(0xFFFEF3C7)), contentAlignment = Alignment.Center) {
                                        Text("🪙", fontSize = 26.sp)
                                    }
                                    Column {
                                        Text("Rewards Earned", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF92400E))
                                        Text("+25 coins for completing the sale!", fontSize = 13.sp, color = Color(0xFFB45309))
                                    }
                                }
                            }
                            Button(onClick = onBack, shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)), modifier = Modifier.fillMaxWidth().height(50.dp)) {
                                Text("Done", fontWeight = FontWeight.SemiBold)
                            }
                        }
                    } else {
                        MhubTextField("Post ID", state.postId, viewModel::setPostId)
                        MhubTextField("Buyer ID", state.buyerId, viewModel::setBuyerId)
                        MhubTextField("Sale Amount (₹)", state.saleAmount, viewModel::setSaleAmount)
                        Button(onClick = { viewModel.initiateSale() }, enabled = !state.loading,
                            shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)),
                            modifier = Modifier.fillMaxWidth().height(50.dp)) {
                            Text(if (state.loading) "Processing…" else "Initiate Sale", fontWeight = FontWeight.SemiBold)
                        }
                    }
                } else {
                    MhubTextField("Transaction ID", state.txnId, viewModel::setTxnId)
                    MhubTextField("OTP", state.otp, viewModel::setOtp)
                    Button(onClick = { viewModel.confirmSale() }, enabled = !state.loading,
                        shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)),
                        modifier = Modifier.fillMaxWidth().height(50.dp)) {
                        Text(if (state.loading) "Confirming…" else "Confirm Sale", fontWeight = FontWeight.SemiBold)
                    }
                }
                // Pending sales
                if (state.pending.isNotEmpty()) {
                    Text("Pending Sales", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B))
                    state.pending.forEach { sale ->
                        Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text(sale.postTitle ?: "Listing", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                                    Text("Buyer: ${sale.buyerName ?: "Unknown"}", fontSize = 12.sp, color = Color(0xFF64748B))
                                }
                                Text("₹${sale.amount.toLong()}", fontWeight = FontWeight.Bold, color = Color(0xFF22C55E))
                            }
                        }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// SaleUndoneScreen — 5-step stepper with undo form + history
// ──────────────────────────────────────────────────────────────────────────────
data class SaleUndoneUiState(
    val loading: Boolean = false,
    val postId: String = "",
    val reason: String = "",
    val description: String = "",
    val history: List<UndoneRecord> = emptyList(),
    val success: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class SaleUndoneViewModel @Inject constructor(private val repo: TransactionsRepository) : ViewModel() {
    private val _state = MutableStateFlow(SaleUndoneUiState())
    val state: StateFlow<SaleUndoneUiState> = _state.asStateFlow()
    private val reasons = listOf("buyer_backed_out", "wrong_item", "payment_issue", "mutual_agreement", "other")
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
    fun submit() {
        val s = _state.value
        if (s.postId.isBlank() || s.reason.isBlank()) { _state.value = s.copy(error = "Post ID and reason are required"); return }
        if (s.reason == "other" && s.description.isBlank()) { _state.value = s.copy(error = "Description required for 'Other' reason"); return }
        _state.value = s.copy(loading = true, error = null)
        viewModelScope.launch {
            when (repo.undoSale(UndoSaleRequest(postId = s.postId, reason = s.reason, description = s.description.ifBlank { null }))) {
                is ApiResult.Success -> { _state.value = _state.value.copy(loading = false, success = true); loadHistory() }
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = "Failed to undo sale")
            }
        }
    }
}

@Composable
fun SaleUndoneScreen(onBack: () -> Unit, viewModel: SaleUndoneViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val steps = listOf("Listed", "Marked Sold", "Issue Found", "Undo Request", "Reactivated")
    var expanded by remember { mutableStateOf(false) }
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar("Undo Sale", onBack)
            // Stepper
            Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                val currentStep = if (state.success) 4 else 2
                steps.forEachIndexed { i, label ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                        Box(Modifier.size(28.dp).clip(CircleShape).background(if (i <= currentStep) Color(0xFFF59E0B) else Color(0xFFE2E8F0)),
                            contentAlignment = Alignment.Center) {
                            if (i < currentStep) Icon(Icons.Filled.Check, null, tint = Color.White, modifier = Modifier.size(16.dp))
                            else Text("${i + 1}", fontSize = 11.sp, color = if (i <= currentStep) Color.White else Color(0xFF94A3B8), fontWeight = FontWeight.Bold)
                        }
                        Text(label, fontSize = 9.sp, color = Color(0xFF64748B), maxLines = 1)
                    }
                }
            }
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                state.error?.let { Text(it, color = Color(0xFFDC2626), fontSize = 13.sp) }
                if (state.success) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(32.dp)) {
                        Icon(Icons.Filled.Autorenew, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(64.dp))
                        Spacer(Modifier.height(16.dp))
                        Text("Listing Reactivated!", fontWeight = FontWeight.Bold, fontSize = 22.sp, color = Color(0xFF1E293B))
                        Text("The sale has been undone successfully.", fontSize = 14.sp, color = Color(0xFF64748B))
                    }
                } else {
                    MhubTextField("Post ID", state.postId, viewModel::setPostId)
                    // Reason dropdown
                    Column {
                        Text("Reason", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
                        Spacer(Modifier.height(4.dp))
                        Box {
                            OutlinedTextField(
                                value = state.reason.replace("_", " ").replaceFirstChar { it.uppercase() },
                                onValueChange = {}, readOnly = true, singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                trailingIcon = { IconButton(onClick = { expanded = true }) { Icon(Icons.Filled.ArrowDropDown, null) } },
                                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White),
                                modifier = Modifier.fillMaxWidth().clickable { expanded = true },
                            )
                            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                viewModel.getReasons().forEach { r ->
                                    DropdownMenuItem(text = { Text(r.replace("_", " ").replaceFirstChar { it.uppercase() }) },
                                        onClick = { viewModel.setReason(r); expanded = false })
                                }
                            }
                        }
                    }
                    if (state.reason == "other") {
                        MhubTextField("Description", state.description, viewModel::setDescription, maxLines = 3, minLines = 2)
                    }
                    Button(onClick = { viewModel.submit() }, enabled = !state.loading,
                        shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)),
                        modifier = Modifier.fillMaxWidth().height(50.dp)) {
                        Text(if (state.loading) "Processing…" else "Undo Sale", fontWeight = FontWeight.SemiBold, color = Color.White)
                    }
                }
                // History
                if (state.history.isNotEmpty()) {
                    Spacer(Modifier.height(8.dp))
                    Text("Undo History", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Color(0xFF1E293B))
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
                                Text("₹${rec.amount.toLong()}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color(0xFFF59E0B))
                            }
                        }
                    }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// PaymentScreen — 5-step stepper: Select Plan → Pay → Submit UTR → Verification → Active
// ──────────────────────────────────────────────────────────────────────────────
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
    val plans = listOf("silver" to "Silver ₹149/mo", "gold" to "Gold ₹299/mo", "platinum" to "Platinum ₹999/mo")
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar("Payment", onBack)
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
                            plans.forEach { (key, label) ->
                                Surface(shape = RoundedCornerShape(14.dp), color = if (state.selectedPlan == key) Color(0xFFEFF6FF) else Color.White,
                                    shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth().clickable { viewModel.selectPlan(key) }) {
                                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                                        RadioButton(selected = state.selectedPlan == key, onClick = { viewModel.selectPlan(key) },
                                            colors = RadioButtonDefaults.colors(selectedColor = Color(0xFF2563EB)))
                                        Text(label, fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = Color(0xFF1E293B))
                                    }
                                }
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
                                    state.instructions.forEach { Text("• $it", fontSize = 13.sp, color = Color(0xFF64748B)) }
                                    Spacer(Modifier.height(16.dp))
                                    Button(onClick = { viewModel.advanceStep() }, shape = RoundedCornerShape(12.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                        modifier = Modifier.fillMaxWidth().height(48.dp)) {
                                        Text("I've Paid → Enter UTR", fontWeight = FontWeight.SemiBold)
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
                                Text(if (state.submitting) "Submitting…" else "Submit for Verification", fontWeight = FontWeight.SemiBold)
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

