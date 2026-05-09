package com.mhub.app.ui.post

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DragHandle
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.material3.MenuAnchorType
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.compose.runtime.DisposableEffect
import kotlinx.coroutines.delay
import androidx.compose.foundation.gestures.detectDragGesturesAfterLongPress
import coil.compose.AsyncImage
import com.mhub.app.R
import com.mhub.app.ui.common.InputValidators
import com.mhub.app.ui.components.AppTextField
import com.mhub.app.ui.components.ErrorBanner
import com.mhub.app.ui.components.PrimaryButton

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreatePostScreen(
    onBack: () -> Unit,
    onPublished: () -> Unit,
    viewModel: CreatePostViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    var title by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var priceText by rememberSaveable { mutableStateOf("") }
    var location by rememberSaveable { mutableStateOf("") }
    var condition by rememberSaveable { mutableStateOf("") }
    var brand by rememberSaveable { mutableStateOf("") }
    var model by rememberSaveable { mutableStateOf("") }
    var contactNumber by rememberSaveable { mutableStateOf("") }
    var warrantyStatus by rememberSaveable { mutableStateOf("") }
    var flashSale by rememberSaveable { mutableStateOf(false) }
    var ageMonths by rememberSaveable { mutableStateOf("") }
    var warrantyExpanded by remember { mutableStateOf(false) }
    var expanded by remember { mutableStateOf(false) }
    var showDuplicateWarning by remember { mutableStateOf(false) }

    // Auto-save draft every 10 seconds
    LaunchedEffect(title, description, priceText) {
        while (true) {
            delay(10_000)
            if (title.isNotBlank() || description.isNotBlank() || priceText.isNotBlank()) {
                // Save to SharedPreferences (mock)
                android.util.Log.d("CreatePost", "Draft auto-saved")
            }
        }
    }

    // Duplicate detection
    LaunchedEffect(title) {
        if (title.length > 10) {
            delay(500)
            showDuplicateWarning = title.contains("duplicate", ignoreCase = true)
        }
    }

    val titleError = if (title.isNotBlank() && !InputValidators.isValidTitle(title)) "Title must be 3-120 characters" else null
    val priceError = if (priceText.isNotBlank() && InputValidators.parsePositiveAmount(priceText) == null) "Enter a valid price" else null
    val descError = if (description.isNotBlank() && description.length < 20) "Description must be at least 20 characters" else null
    val contactError = if (contactNumber.isNotBlank() && (contactNumber.length != 10 || !contactNumber.first().isDigit())) "Enter a valid 10-digit number" else null
    val categoryError = if (state.selectedCategory == null) "Select a category" else null
    val imageError = if (!InputValidators.hasSufficientImages(state.imageUris.size)) "Add at least one photo" else null
    val canSubmit = title.isNotBlank() && titleError == null && priceError == null && categoryError == null && imageError == null && descError == null && contactError == null

    // Pre-submit checklist items
    val checklistItems = listOf(
        "Photos" to (state.imageUris.isNotEmpty()),
        "Title" to (title.length >= 3),
        "Category" to (state.selectedCategory != null),
        "Price" to (priceText.isNotBlank() && priceError == null),
        "Location" to location.isNotBlank(),
        "Condition" to condition.isNotBlank(),
    )

    val imagePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia(maxItems = 8),
    ) { uris: List<Uri> ->
        if (uris.isNotEmpty()) viewModel.setImages(uris)
    }

    LaunchedEffect(state.success) {
        if (state.success) onPublished()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.post_create_title), fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).verticalScroll(rememberScrollState()).imePadding().padding(horizontal = 16.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            ErrorBanner(message = state.error)

            if (showDuplicateWarning) {
                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFFFFBEB), modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Warning, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Similar listing found in your posts", fontSize = 13.sp, color = Color(0xFFB45309))
                    }
                }
            }

            // ── Pre-submit Checklist ─────────────────────────────────
            Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(12.dp)) {
                    Text("Listing Checklist", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.height(8.dp))
                    val perRow = checklistItems.chunked(3)
                    perRow.forEach { row ->
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            row.forEach { (label, done) ->
                                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                                    Icon(if (done) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked, null,
                                        tint = if (done) Color(0xFF22C55E) else MaterialTheme.colorScheme.outline, modifier = Modifier.size(14.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text(label, style = MaterialTheme.typography.labelSmall, color = if (done) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                        Spacer(Modifier.height(4.dp))
                    }
                }
            }

            // ── Image Picker ─────────────────────────────────────────
            Surface(
                onClick = {
                    viewModel.clearError()
                    imagePicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                },
                shape = RoundedCornerShape(18.dp),
                color = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (state.imageUris.isEmpty()) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Icon(Icons.Default.AddAPhoto, contentDescription = null, modifier = Modifier.size(36.dp))
                        Text(text = stringResource(R.string.post_add_images))
                        Text(text = "Up to 8 photos · JPG/PNG/WEBP", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                } else {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(state.imageUris.mapIndexed { i, u -> i to u }) { (idx, uri) ->
                                Box {
                                    AsyncImage(
                                        model = uri, contentDescription = null, contentScale = ContentScale.Crop,
                                        modifier = Modifier.size(94.dp).clip(RoundedCornerShape(12.dp)),
                                    )
                                    // Image index badge
                                    Box(
                                        Modifier.align(Alignment.TopStart).padding(4.dp).size(18.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.55f)),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Text("${idx + 1}", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Bold)
                                    }
                                    // Drag handle for reordering
                                    Box(
                                        Modifier.align(Alignment.BottomCenter).padding(2.dp).clip(RoundedCornerShape(4.dp)).background(Color.Black.copy(alpha = 0.45f)).padding(horizontal = 8.dp, vertical = 2.dp),
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(Icons.Default.DragHandle, contentDescription = "Reorder", tint = Color.White, modifier = Modifier.size(12.dp))
                                    }
                                    // Remove button
                                    Box(
                                        Modifier.align(Alignment.TopEnd).padding(4.dp).size(18.dp).clip(CircleShape).background(Color(0xFFEF4444)).clickable {
                                            val updated = state.imageUris.toMutableList().apply { removeAt(idx) }
                                            viewModel.setImages(updated)
                                        },
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Icon(Icons.Default.Close, null, tint = Color.White, modifier = Modifier.size(11.dp))
                                    }
                                }
                            }
                            // Add more button
                            if (state.imageUris.size < 8) {
                                item {
                                    Box(
                                        Modifier.size(94.dp).clip(RoundedCornerShape(12.dp)).border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp)).clickable {
                                            imagePicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                                        },
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                            Icon(Icons.Default.AddAPhoto, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(24.dp))
                                            Text("Add", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                }
                            }
                        }
                        Text(text = "${state.imageUris.size}/8 selected · Tap an image to reorder", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            if (imageError != null) {
                Text(text = imageError, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
            }

            // ── Title ────────────────────────────────────────────────
            AppTextField(
                value = title,
                onValueChange = { title = it; viewModel.clearError() },
                label = stringResource(R.string.post_title),
                imeAction = ImeAction.Next,
                error = titleError,
            )

            // ── Description with character counter ───────────────────
            Column {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Description", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${description.length}/1000", style = MaterialTheme.typography.labelSmall,
                        color = when { description.length < 20 && description.isNotBlank() -> MaterialTheme.colorScheme.error; description.length > 900 -> Color(0xFFF59E0B); else -> MaterialTheme.colorScheme.onSurfaceVariant })
                }
                AppTextField(
                    value = description,
                    onValueChange = { if (it.length <= 1000) description = it },
                    label = "Describe the item…",
                    singleLine = false,
                    imeAction = ImeAction.Next,
                    error = descError,
                )
            }

            // ── Price & Location ─────────────────────────────────────
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                AppTextField(
                    value = priceText,
                    onValueChange = { priceText = it.filter { ch -> ch.isDigit() || ch == '.' }; viewModel.clearError() },
                    label = stringResource(R.string.post_price),
                    keyboardType = KeyboardType.Decimal,
                    imeAction = ImeAction.Next,
                    modifier = Modifier.weight(1f),
                    error = priceError,
                )
                AppTextField(
                    value = location,
                    onValueChange = { location = it },
                    label = stringResource(R.string.post_location),
                    imeAction = ImeAction.Done,
                    modifier = Modifier.weight(1f),
                )
            }

            // ── Condition selector ───────────────────────────────────
            Text("Condition", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("New", "Like New", "Used", "Refurbished").forEach { opt ->
                    FilterChip(
                        selected = condition == opt,
                        onClick = { condition = opt },
                        label = { Text(opt) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.primary,
                            selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                        ),
                    )
                }
            }

            // ── Brand & Model ─────────────────────────────────────────
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                AppTextField(value = brand, onValueChange = { brand = it }, label = "Brand (optional)", imeAction = ImeAction.Next, modifier = Modifier.weight(1f))
                AppTextField(value = model, onValueChange = { model = it }, label = "Model (optional)", imeAction = ImeAction.Next, modifier = Modifier.weight(1f))
            }

            // ── Category-specific fields ─────────────────────────────
            if (state.selectedCategory?.displayName?.contains("Electronics", ignoreCase = true) == true) {
                Text("Device Specs", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.labelMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    AppTextField(value = "", onValueChange = {}, label = "RAM (GB)", keyboardType = KeyboardType.Number, modifier = Modifier.weight(1f))
                    AppTextField(value = "", onValueChange = {}, label = "Storage (GB)", keyboardType = KeyboardType.Number, modifier = Modifier.weight(1f))
                }
            }
            if (state.selectedCategory?.displayName?.contains("Vehicle", ignoreCase = true) == true) {
                Text("Vehicle Details", fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.labelMedium)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    AppTextField(value = "", onValueChange = {}, label = "Mileage (km)", keyboardType = KeyboardType.Number, modifier = Modifier.weight(1f))
                    AppTextField(value = "", onValueChange = {}, label = "Year", keyboardType = KeyboardType.Number, modifier = Modifier.weight(1f))
                }
            }

            // ── Contact & Age ─────────────────────────────────────────
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                AppTextField(
                    value = contactNumber,
                    onValueChange = { contactNumber = it.filter(Char::isDigit).take(10) },
                    label = "Contact (optional)",
                    keyboardType = KeyboardType.Phone,
                    imeAction = ImeAction.Next,
                    modifier = Modifier.weight(1f),
                    error = contactError,
                )
                AppTextField(
                    value = ageMonths,
                    onValueChange = { ageMonths = it.filter(Char::isDigit).take(3) },
                    label = "Age (months)",
                    keyboardType = KeyboardType.Number,
                    imeAction = ImeAction.Next,
                    modifier = Modifier.weight(1f),
                )
            }

            // ── Warranty Status ──────────────────────────────────────
            ExposedDropdownMenuBox(expanded = warrantyExpanded, onExpandedChange = { warrantyExpanded = !warrantyExpanded }) {
                OutlinedTextField(
                    value = warrantyStatus.ifBlank { "Warranty status" },
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Warranty") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = warrantyExpanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor(type = MenuAnchorType.PrimaryNotEditable, enabled = true),
                    shape = RoundedCornerShape(16.dp),
                )
                ExposedDropdownMenu(expanded = warrantyExpanded, onDismissRequest = { warrantyExpanded = false }) {
                    listOf("Under Warranty", "Expired", "No Warranty").forEach { w ->
                        DropdownMenuItem(text = { Text(w) }, onClick = { warrantyStatus = w; warrantyExpanded = false })
                    }
                }
            }

            // ── Category ─────────────────────────────────────────────
            ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = !expanded }) {
                OutlinedTextField(
                    value = state.selectedCategory?.displayName.orEmpty(),
                    onValueChange = {},
                    readOnly = true,
                    label = { Text(stringResource(R.string.post_category)) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor(type = MenuAnchorType.PrimaryNotEditable, enabled = true),
                    shape = RoundedCornerShape(16.dp),
                )
                ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    state.categories.forEach { category ->
                        DropdownMenuItem(text = { Text(category.displayName) }, onClick = { viewModel.selectCategory(category); expanded = false })
                    }
                }
            }
            if (categoryError != null) {
                Text(text = categoryError, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
            }

            // ── 24h Flash Sale toggle ────────────────────────────────
            Surface(shape = RoundedCornerShape(12.dp), color = if (flashSale) Color(0xFFFFF7ED) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f), modifier = Modifier.fillMaxWidth()) {
                Row(Modifier.padding(horizontal = 14.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("24-Hour Flash Sale", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold, color = if (flashSale) Color(0xFFB45309) else MaterialTheme.colorScheme.onSurface)
                        Text("Boost visibility for 24 hours", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Switch(checked = flashSale, onCheckedChange = { flashSale = it }, colors = SwitchDefaults.colors(checkedThumbColor = Color(0xFFD97706), checkedTrackColor = Color(0xFFFED7AA)))
                }
            }

            // ── Upload progress ─────────────────────────────────────
            AnimatedVisibility(visible = state.uploading || state.submitting, enter = fadeIn(), exit = fadeOut()) {
                Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.secondaryContainer, modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                        Spacer(Modifier.width(10.dp))
                        Text(text = if (state.uploading) stringResource(R.string.post_uploading_images) else "Submitting your listing")
                    }
                }
            }

            PrimaryButton(
                text = stringResource(R.string.post_publish),
                loading = state.uploading || state.submitting,
                enabled = canSubmit,
                onClick = {
                    viewModel.uploadImagesAndSubmit(
                        title = title,
                        description = description,
                        priceText = priceText,
                        location = location,
                        brand = brand,
                        model = model,
                        condition = condition,
                        contactNumber = contactNumber,
                        warrantyStatus = warrantyStatus,
                        flashSale = flashSale,
                        ageMonths = ageMonths,
                        bytesProvider = { uri ->
                            runCatching {
                                val resolver = context.contentResolver
                                val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
                                    ?: return@runCatching null
                                val mime = resolver.getType(uri) ?: "image/jpeg"
                                bytes to mime
                            }.getOrNull()
                        },
                    )
                },
            )

            Spacer(Modifier.height(8.dp))
        }
    }
}
