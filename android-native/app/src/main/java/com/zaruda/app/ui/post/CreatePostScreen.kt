package com.zaruda.app.ui.post

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.PriceChange
import androidx.compose.material.icons.filled.Sell
import androidx.compose.material.icons.filled.Title
import androidx.compose.material3.*
import androidx.compose.material3.MenuAnchorType
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.zaruda.app.ui.common.InputValidators
import com.zaruda.app.ui.components.ErrorBanner
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun CreatePostScreen(
    onBack: () -> Unit,
    onPublished: () -> Unit,
    viewModel: CreatePostViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    val focusManager = LocalFocusManager.current

    // ── Local form state ────────────────────────────────────────────────
    var title by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var priceText by rememberSaveable { mutableStateOf("") }
    var location by rememberSaveable { mutableStateOf("") }
    var categoryExpanded by rememberSaveable { mutableStateOf(false) }
    var categoryQuery by rememberSaveable { mutableStateOf("") }
    var subcategoryExpanded by rememberSaveable { mutableStateOf(false) }

    // Focus / touched tracking for validation-on-blur
    var titleTouched by rememberSaveable { mutableStateOf(false) }
    var descTouched by rememberSaveable { mutableStateOf(false) }
    var priceTouched by rememberSaveable { mutableStateOf(false) }

    // ── Draft restore ───────────────────────────────────────────────────
    LaunchedEffect(state.draftData) {
        state.draftData?.let { draft ->
            if (title.isBlank() && !draft.title.isNullOrBlank()) title = draft.title ?: ""
            if (description.isBlank() && !draft.description.isNullOrBlank()) description = draft.description ?: ""
            if (priceText.isBlank() && draft.price != null && draft.price > 0) priceText = draft.price.toString()
            if (location.isBlank() && !draft.location.isNullOrBlank()) location = draft.location ?: ""
        }
    }

    // ── Auto-save draft with 2s debounce ────────────────────────────────
    LaunchedEffect(title, description, priceText, location, state.selectedCategory?.stableId) {
        if (title.isNotBlank() || description.isNotBlank() || priceText.isNotBlank() || location.isNotBlank()) {
            delay(2000)
            viewModel.saveDraft(
                title = title.ifBlank { null },
                description = description.ifBlank { null },
                priceText = priceText.ifBlank { null },
                location = location.ifBlank { null },
            )
        }
    }

    // ── Validation ──────────────────────────────────────────────────────
    val titleError = if (titleTouched && title.isNotBlank() && !InputValidators.isValidTitle(title)) "3–120 characters required" else null
    val priceError = if (priceTouched && priceText.isNotBlank() && InputValidators.parsePositiveAmount(priceText) == null) "Enter a valid price" else null
    val descError = if (descTouched && description.isNotBlank() && description.length < 20) "At least 20 characters" else null
    val categoryError = if (titleTouched && state.selectedCategory == null && title.isNotBlank()) "Select a category" else null
    val subcategoryError = if (state.selectedCategory != null && state.selectedSubcategory == null && titleTouched) "Select a subcategory" else null
    val imageError = if (state.imageUris.isEmpty() && titleTouched && title.isNotBlank()) "Add at least one photo" else null
    val canSubmit = title.isNotBlank() && titleError == null &&
        state.selectedCategory != null && state.selectedSubcategory != null &&
        state.imageUris.isNotEmpty()

    // ── Image picker ────────────────────────────────────────────────────
    val multiplePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia(maxItems = state.maxImages.coerceAtLeast(2)),
    ) { uris -> if (uris.isNotEmpty()) viewModel.setImages(uris.take(state.maxImages)) }
    val singlePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
    ) { uri -> uri?.let { viewModel.setImages(listOf(it)) } }
    val imagePickerLauncher: () -> Unit = if (state.maxImages <= 1) {
        { singlePicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }
    } else {
        { multiplePicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) }
    }

    // ── Navigate on success with brief delay for animation ──────────────
    LaunchedEffect(state.success) {
        if (state.success) {
            viewModel.clearDraft()
            delay(1200)
            onPublished()
        }
    }

    // ── Draft indicator message ─────────────────────────────────────────
    val draftMessage = when {
        state.savingDraft -> "Saving draft…"
        state.draftSaved -> "Draft saved"
        else -> null
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Create Listing", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Text("Fill in the details below", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = {
                    FilledIconButton(
                        onClick = onBack,
                        modifier = Modifier.padding(start = 4.dp).size(36.dp),
                        colors = IconButtonDefaults.filledIconButtonColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, null, modifier = Modifier.size(20.dp))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {

            // ═════════════════════════════════════════════════════════════
            // Main scrollable content
            // ═════════════════════════════════════════════════════════════
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .imePadding()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Spacer(Modifier.height(0.dp))

                // Error banner
                ErrorBanner(message = state.error)

                // Draft indicator
                AnimatedVisibility(visible = draftMessage != null, enter = fadeIn(), exit = fadeOut()) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.secondaryContainer.copy(alpha = 0.6f),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Row(
                            Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            if (state.savingDraft) {
                                CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp)
                            } else {
                                Icon(Icons.Default.Check, null, Modifier.size(14.dp), tint = MaterialTheme.colorScheme.primary)
                            }
                            Text(draftMessage.orEmpty(), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSecondaryContainer)
                        }
                    }
                }

                // ── Section 1: Photos ───────────────────────────────────
                FormSectionCard {
                    SectionHeader(
                        icon = Icons.Default.AddAPhoto,
                        title = "Photos",
                        subtitle = "${state.imageUris.size}/${state.maxImages} · JPG/PNG",
                    )
                    Spacer(Modifier.height(12.dp))

                    if (state.imageUris.isEmpty()) {
                        ImagePickerEmptyState(
                            maxImages = state.maxImages,
                            onClick = { viewModel.clearError(); imagePickerLauncher() },
                        )
                    } else {
                        ImageGrid(
                            uris = state.imageUris,
                            maxImages = state.maxImages,
                            onAddClick = { imagePickerLauncher() },
                            onRemoveClick = { idx ->
                                val updated = state.imageUris.toMutableList().apply { removeAt(idx) }
                                viewModel.setImages(updated)
                            },
                        )
                    }

                    if (imageError != null) {
                        Text(imageError, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(start = 4.dp, top = 4.dp))
                    }

                    // Upgrade prompt for basic plan
                    if (state.maxImages <= 1 && state.imageUris.isEmpty()) {
                        Spacer(Modifier.height(8.dp))
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFFFFF3E0),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Icon(Icons.Default.Info, null, Modifier.size(16.dp), tint = Color(0xFFE65100))
                                Text("Upgrade to upload more photos per listing",
                                    style = MaterialTheme.typography.labelSmall, color = Color(0xFFBF360C))
                            }
                        }
                    }
                }

                // ── Section 2: Details ──────────────────────────────────
                FormSectionCard {
                    SectionHeader(icon = Icons.Default.Sell, title = "Listing Details")
                    Spacer(Modifier.height(16.dp))

                    // Title
                    CharCountField(
                        value = title,
                        onValueChange = { title = it; viewModel.clearError() },
                        onFocusChanged = { focused -> if (!focused) titleTouched = true },
                        label = "Title",
                        placeholder = "e.g., iPhone 14 Pro Max 256GB",
                        leadingIcon = Icons.Default.Title,
                        error = titleError,
                        maxLength = 120,
                        imeAction = ImeAction.Next,
                    )

                    Spacer(Modifier.height(14.dp))

                    // Description
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text("Description", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(
                            "${description.length}/1000",
                            style = MaterialTheme.typography.labelSmall,
                            color = when {
                                description.length < 20 && description.isNotBlank() -> MaterialTheme.colorScheme.error
                                description.length > 900 -> Color(0xFFF59E0B)
                                else -> MaterialTheme.colorScheme.onSurfaceVariant
                            },
                        )
                    }
                    Spacer(Modifier.height(4.dp))
                    FormTextField(
                        value = description,
                        onValueChange = { if (it.length <= 1000) { description = it; viewModel.clearError() } },
                        onFocusChanged = { focused -> if (!focused) descTouched = true },
                        label = "Description",
                        placeholder = "Describe your item — condition, features, reason for selling…",
                        leadingIcon = Icons.Default.Description,
                        singleLine = false,
                        imeAction = ImeAction.None,
                        error = descError,
                        minLines = 3,
                    )
                }

                // ── Section 3: Pricing & Location ───────────────────────
                FormSectionCard {
                    SectionHeader(icon = Icons.Default.PriceChange, title = "Pricing & Location")
                    Spacer(Modifier.height(16.dp))

                    // Price with ₹ prefix and strict decimal validation
                    PriceField(
                        value = priceText,
                        onValueChange = { priceText = it; viewModel.clearError() },
                        onFocusChanged = { focused -> if (!focused) priceTouched = true },
                        error = priceError,
                    )

                    Spacer(Modifier.height(14.dp))

                    // Location
                    FormTextField(
                        value = location,
                        onValueChange = { location = it },
                        label = "Location",
                        placeholder = "City, State",
                        leadingIcon = Icons.Default.LocationOn,
                        imeAction = ImeAction.Done,
                    )
                }

                // ── Section 4: Category ─────────────────────────────────
                FormSectionCard {
                    SectionHeader(icon = Icons.Default.Category, title = "Category")
                    Spacer(Modifier.height(16.dp))

                    // Category dropdown
                    val filteredCategories = remember(categoryQuery, state.categories) {
                        if (categoryQuery.isBlank()) state.categories
                        else state.categories.filter { it.displayName.contains(categoryQuery, ignoreCase = true) }
                    }

                    ExposedDropdownMenuBox(
                        expanded = categoryExpanded,
                        onExpandedChange = { categoryExpanded = !categoryExpanded },
                    ) {
                        OutlinedTextField(
                            value = if (categoryExpanded) categoryQuery else state.selectedCategory?.displayName.orEmpty(),
                            onValueChange = { categoryQuery = it; categoryExpanded = true },
                            readOnly = false,
                            label = { Text("Category") },
                            placeholder = { Text("Choose a category") },
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = categoryExpanded) },
                            textStyle = MaterialTheme.typography.bodyMedium,
                            shape = RoundedCornerShape(14.dp),
                            colors = FormFieldColors(),
                            modifier = Modifier.fillMaxWidth().menuAnchor(
                                type = MenuAnchorType.PrimaryEditable,
                                enabled = true,
                            ),
                        )
                        ExposedDropdownMenu(
                            expanded = categoryExpanded && filteredCategories.isNotEmpty(),
                            onDismissRequest = { categoryExpanded = false },
                        ) {
                            filteredCategories.forEach { cat ->
                                DropdownMenuItem(
                                    text = { Text(cat.displayName) },
                                    onClick = {
                                        viewModel.selectCategory(cat)
                                        categoryQuery = ""
                                        categoryExpanded = false
                                    },
                                )
                            }
                            if (filteredCategories.isEmpty() && categoryQuery.isNotBlank()) {
                                DropdownMenuItem(
                                    text = { Text("No matches for \"$categoryQuery\"", color = MaterialTheme.colorScheme.onSurfaceVariant) },
                                    onClick = { categoryExpanded = false },
                                )
                            }
                        }
                    }
                    if (categoryError != null) {
                        Text(categoryError, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error,
                            modifier = Modifier.padding(start = 4.dp, top = 2.dp))
                    }

                    // Subcategory (animated)
                    AnimatedVisibility(visible = state.selectedCategory != null, enter = fadeIn(), exit = fadeOut()) {
                        Column {
                            Spacer(Modifier.height(14.dp))
                            ExposedDropdownMenuBox(
                                expanded = subcategoryExpanded,
                                onExpandedChange = { subcategoryExpanded = !subcategoryExpanded },
                            ) {
                                OutlinedTextField(
                                    value = state.selectedSubcategory?.displayName.orEmpty(),
                                    onValueChange = {},
                                    readOnly = true,
                                    label = { Text("Subcategory") },
                                    placeholder = {
                                        Text(
                                            if (state.subcategories.isEmpty()) "Loading…" else "Choose subcategory",
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    },
                                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = subcategoryExpanded) },
                                    textStyle = MaterialTheme.typography.bodyMedium,
                                    shape = RoundedCornerShape(14.dp),
                                    colors = FormFieldColors(),
                                    modifier = Modifier.fillMaxWidth().menuAnchor(
                                        type = MenuAnchorType.PrimaryNotEditable,
                                        enabled = state.subcategories.isNotEmpty(),
                                    ),
                                )
                                ExposedDropdownMenu(
                                    expanded = subcategoryExpanded && state.subcategories.isNotEmpty(),
                                    onDismissRequest = { subcategoryExpanded = false },
                                ) {
                                    state.subcategories.forEach { sub ->
                                        DropdownMenuItem(
                                            text = { Text(sub.displayName) },
                                            onClick = {
                                                viewModel.selectSubcategory(sub)
                                                subcategoryExpanded = false
                                            },
                                        )
                                    }
                                }
                            }
                            if (subcategoryError != null) {
                                Text(subcategoryError, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error,
                                    modifier = Modifier.padding(start = 4.dp, top = 2.dp))
                            }
                        }
                    }
                }

                // ── Upload progress ─────────────────────────────────────
                AnimatedVisibility(visible = state.uploading || state.submitting, enter = fadeIn(), exit = fadeOut()) {
                    Surface(
                        shape = RoundedCornerShape(14.dp),
                        color = MaterialTheme.colorScheme.secondaryContainer,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(14.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                            Text(
                                if (state.uploading) "Uploading images…" else "Publishing listing…",
                                color = MaterialTheme.colorScheme.onSecondaryContainer,
                            )
                        }
                    }
                }

                // ── Publish button ──────────────────────────────────────
                Button(
                    onClick = {
                        // Mark all fields touched so all errors show
                        titleTouched = true; descTouched = true; priceTouched = true
                        focusManager.clearFocus()
                        viewModel.uploadImagesAndSubmit(
                            title = title,
                            description = description,
                            priceText = priceText,
                            location = location,
                            bytesProvider = { uri ->
                                runCatching {
                                    val resolver = context.contentResolver
                                    val bytes = resolver.openInputStream(uri)?.use { it.readBytes() } ?: return@runCatching null
                                    val mime = resolver.getType(uri) ?: "image/jpeg"
                                    bytes to mime
                                }.getOrNull()
                            },
                        )
                    },
                    enabled = canSubmit && !state.uploading && !state.submitting,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth().height(56.dp).animateContentSize(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant,
                    ),
                    contentPadding = PaddingValues(0.dp),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp, pressedElevation = 8.dp),
                ) {
                    if (state.uploading || state.submitting) {
                        CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.5.dp, color = MaterialTheme.colorScheme.onPrimary)
                    } else {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.Sell, null, Modifier.size(20.dp))
                            Text("Publish Listing", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                        }
                    }
                }

                Spacer(Modifier.height(32.dp))
            }

            // ═════════════════════════════════════════════════════════════
            // Success overlay
            // ═════════════════════════════════════════════════════════════
            AnimatedVisibility(visible = state.success, enter = fadeIn(), exit = fadeOut()) {
                Box(
                    modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.5f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Surface(shape = RoundedCornerShape(24.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 8.dp) {
                        Column(
                            Modifier.padding(32.dp).widthIn(min = 220.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Box(
                                Modifier.size(64.dp).clip(CircleShape).background(Color(0xFFDCFCE7)),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(Icons.Default.Check, null, Modifier.size(32.dp), tint = Color(0xFF16A34A))
                            }
                            Spacer(Modifier.height(16.dp))
                            Text("Published!", fontWeight = FontWeight.Bold, fontSize = 20.sp)
                            Spacer(Modifier.height(4.dp))
                            Text("Your listing is live", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

// ═════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═════════════════════════════════════════════════════════════════════════════

// ── Image grid (FlowRow) ────────────────────────────────────────────────────

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ImageGrid(
    uris: List<Uri>,
    maxImages: Int,
    onAddClick: () -> Unit,
    onRemoveClick: (Int) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        FlowRow(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            uris.forEachIndexed { idx, uri ->
                Box(
                    modifier = Modifier
                        .width(110.dp)
                        .aspectRatio(1f),
                ) {
                    AsyncImage(
                        model = uri,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(14.dp)),
                    )
                    // Index badge
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(6.dp)
                            .size(20.dp)
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.55f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("${idx + 1}", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Bold)
                    }
                    // Remove button
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(6.dp)
                            .size(22.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFEF4444).copy(alpha = 0.9f))
                            .clickable { onRemoveClick(idx) },
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(Icons.Default.Close, null, tint = Color.White, modifier = Modifier.size(12.dp))
                    }
                }
            }
            // Add-more cell
            if (uris.size < maxImages) {
                Box(
                    modifier = Modifier
                        .width(110.dp)
                        .aspectRatio(1f)
                        .clip(RoundedCornerShape(14.dp))
                        .border(1.5f.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(14.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f))
                        .clickable { onAddClick() },
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.AddAPhoto, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(24.dp))
                        Text("Add", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
        Text(
            "${uris.size}/${maxImages} selected",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

// ── Image picker empty state ────────────────────────────────────────────────

@Composable
private fun ImagePickerEmptyState(maxImages: Int, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(180.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f))
            .border(2.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(16.dp))
            .clickable { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(52.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.AddAPhoto, null, tint = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.size(26.dp))
            }
            Spacer(Modifier.height(10.dp))
            Text("Tap to add photos", fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
            Text(
                if (maxImages <= 1) "Single image (upgrade for more)" else "Up to $maxImages images",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

// ── Price field with ₹ prefix and strict decimal validation ─────────────────

@Composable
private fun PriceField(
    value: String,
    onValueChange: (String) -> Unit,
    onFocusChanged: (Boolean) -> Unit,
    error: String?,
) {
    Column {
        Text("Price", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(4.dp))
        OutlinedTextField(
            value = value,
            onValueChange = { newVal ->
                // Allow only: empty, digits, single dot with up to 2 decimal places
                if (newVal.isEmpty() || newVal.matches(Regex("^\\d*\\.?\\d{0,2}$"))) {
                    onValueChange(newVal)
                }
            },
            modifier = Modifier.fillMaxWidth().onFocusChanged { onFocusChanged(it.isFocused) },
            label = { Text("Price (₹)") },
            placeholder = { Text("0") },
            leadingIcon = { Text("₹", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = MaterialTheme.colorScheme.onSurface) },
            isError = error != null,
            singleLine = true,
            textStyle = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.SemiBold),
            shape = RoundedCornerShape(14.dp),
            colors = FormFieldColors(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal, imeAction = ImeAction.Next),
            supportingText = if (error != null) {{ Text(error, color = MaterialTheme.colorScheme.error) }} else null,
        )
    }
}

// ── Char-count field ────────────────────────────────────────────────────────

@Composable
private fun CharCountField(
    value: String,
    onValueChange: (String) -> Unit,
    onFocusChanged: (Boolean) -> Unit,
    label: String,
    placeholder: String,
    leadingIcon: ImageVector,
    error: String?,
    maxLength: Int,
    imeAction: ImeAction,
) {
    Column {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(
                "${value.length}/$maxLength",
                style = MaterialTheme.typography.labelSmall,
                color = when {
                    value.length > maxLength * 0.9 -> Color(0xFFF59E0B)
                    value.isNotBlank() -> MaterialTheme.colorScheme.onSurfaceVariant
                    else -> MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)
                },
            )
        }
        Spacer(Modifier.height(4.dp))
        OutlinedTextField(
            value = value,
            onValueChange = { if (it.length <= maxLength) onValueChange(it) },
            modifier = Modifier.fillMaxWidth().onFocusChanged { onFocusChanged(it.isFocused) },
            label = { Text(label) },
            placeholder = { Text(placeholder, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)) },
            leadingIcon = { Icon(leadingIcon, null, modifier = Modifier.size(18.dp)) },
            isError = error != null,
            singleLine = true,
            textStyle = MaterialTheme.typography.bodyMedium,
            shape = RoundedCornerShape(14.dp),
            colors = FormFieldColors(),
            keyboardOptions = KeyboardOptions(imeAction = imeAction),
            supportingText = if (error != null) {{ Text(error, color = MaterialTheme.colorScheme.error) }} else null,
        )
    }
}

// ── Generic form text field ─────────────────────────────────────────────────

@Composable
private fun FormTextField(
    value: String,
    onValueChange: (String) -> Unit,
    onFocusChanged: ((Boolean) -> Unit)? = null,
    label: String,
    placeholder: String,
    leadingIcon: ImageVector,
    modifier: Modifier = Modifier,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    singleLine: Boolean = true,
    error: String? = null,
    minLines: Int = 1,
) {
    Column(modifier = modifier) {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth().then(
                if (onFocusChanged != null) Modifier.onFocusChanged { onFocusChanged(it.isFocused) }
                else Modifier
            ),
            label = { Text(label) },
            placeholder = { Text(placeholder, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)) },
            leadingIcon = { Icon(leadingIcon, null, modifier = Modifier.size(18.dp)) },
            isError = error != null,
            singleLine = singleLine,
            minLines = minLines,
            textStyle = MaterialTheme.typography.bodyMedium,
            shape = RoundedCornerShape(14.dp),
            colors = FormFieldColors(),
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
            supportingText = if (error != null) {{ Text(error, color = MaterialTheme.colorScheme.error) }} else null,
        )
    }
}

// ── Section card ────────────────────────────────────────────────────────────

@Composable
private fun FormSectionCard(content: @Composable () -> Unit) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 0.5.dp,
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp)) {
            content()
        }
    }
}

// ── Section header ──────────────────────────────────────────────────────────

@Composable
private fun SectionHeader(icon: ImageVector, title: String, subtitle: String? = null) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(32.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.size(18.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column {
            Text(title, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.bodyLarge)
            if (subtitle != null) {
                Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

// ── Shared color config ─────────────────────────────────────────────────────

@Composable
private fun FormFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedContainerColor = MaterialTheme.colorScheme.surface,
    unfocusedContainerColor = MaterialTheme.colorScheme.surface,
    focusedBorderColor = MaterialTheme.colorScheme.primary,
    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
    focusedLeadingIconColor = MaterialTheme.colorScheme.primary,
    unfocusedLeadingIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
    cursorColor = MaterialTheme.colorScheme.primary,
    focusedLabelColor = MaterialTheme.colorScheme.primary,
    unfocusedLabelColor = MaterialTheme.colorScheme.onSurfaceVariant,
    errorBorderColor = MaterialTheme.colorScheme.error,
)
