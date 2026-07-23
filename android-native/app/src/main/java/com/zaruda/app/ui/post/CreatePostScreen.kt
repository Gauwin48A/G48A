package com.zaruda.app.ui.post

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.material.icons.filled.Close
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
import coil.compose.AsyncImage
import com.zaruda.app.R
import com.zaruda.app.ui.common.InputValidators
import com.zaruda.app.ui.components.AppTextField
import com.zaruda.app.ui.components.ErrorBanner
import com.zaruda.app.ui.components.PrimaryButton

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
    var categoryExpanded by remember { mutableStateOf(false) }
    var categoryQuery by rememberSaveable { mutableStateOf("") }
    var subcategoryExpanded by remember { mutableStateOf(false) }

    val titleError = if (title.isNotBlank() && !InputValidators.isValidTitle(title)) stringResource(R.string.post_title_error) else null
    val priceError = if (priceText.isNotBlank() && InputValidators.parsePositiveAmount(priceText) == null) stringResource(R.string.post_price_error) else null
    val descError = if (description.isNotBlank() && description.length < 20) stringResource(R.string.post_desc_error) else null
    val categoryError = if (title.isNotBlank() && state.selectedCategory == null) stringResource(R.string.post_category_error) else null
    val subcategoryError = if (state.selectedCategory != null && state.selectedSubcategory == null) "Select a subcategory" else null
    val imageError = if (title.isNotBlank() && !InputValidators.hasSufficientImages(state.imageUris.size)) stringResource(R.string.post_image_required) else null
    val canSubmit = title.isNotBlank() && titleError == null && priceError == null &&
        state.selectedCategory != null && state.selectedSubcategory != null &&
        InputValidators.hasSufficientImages(state.imageUris.size)

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
                title = { Text("Create Listing", fontWeight = FontWeight.Bold) },
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
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            ErrorBanner(message = state.error)

            // Image Picker
            Surface(
                onClick = {
                    viewModel.clearError()
                    imagePicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                },
                shape = RoundedCornerShape(16.dp),
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
                        Text("Add Photos", fontWeight = FontWeight.SemiBold)
                        Text("Up to ${state.maxImages} photos (JPG/PNG/WEBP)",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                                    Box(
                                        Modifier.align(Alignment.TopStart).padding(4.dp).size(18.dp).clip(CircleShape).background(Color.Black.copy(alpha = 0.55f)),
                                        contentAlignment = Alignment.Center,
                                    ) { Text("${idx + 1}", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Bold) }
                                    Box(
                                        Modifier.align(Alignment.TopEnd).padding(4.dp).size(18.dp).clip(CircleShape).background(Color(0xFFEF4444)).clickable {
                                            val updated = state.imageUris.toMutableList().apply { removeAt(idx) }
                                            viewModel.setImages(updated)
                                        },
                                        contentAlignment = Alignment.Center,
                                    ) { Icon(Icons.Default.Close, null, tint = Color.White, modifier = Modifier.size(11.dp)) }
                                }
                            }
                            if (state.imageUris.size < state.maxImages) {
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
                        Text("${state.imageUris.size}/${state.maxImages} selected",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            if (imageError != null) {
                Text(text = imageError, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
            }

            // Title
            AppTextField(
                value = title,
                onValueChange = { title = it; viewModel.clearError() },
                label = stringResource(R.string.post_title),
                imeAction = ImeAction.Next,
                error = titleError,
            )

            // Description
            Column {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(stringResource(R.string.post_description_label),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("${description.length}/1000", style = MaterialTheme.typography.labelSmall,
                        color = when {
                            description.length < 20 && description.isNotBlank() -> MaterialTheme.colorScheme.error
                            description.length > 900 -> Color(0xFFF59E0B)
                            else -> MaterialTheme.colorScheme.onSurfaceVariant
                        })
                }
                AppTextField(
                    value = description,
                    onValueChange = {
                        if (it.length <= 1000) {
                            description = it
                            viewModel.clearError()
                        }
                    },
                    label = stringResource(R.string.post_description_hint),
                    singleLine = false,
                    imeAction = ImeAction.Next,
                    error = descError,
                )
            }

            // Price & Location
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

            // Category
            val filteredCategories = remember(categoryQuery, state.categories) {
                if (categoryQuery.isBlank()) state.categories
                else state.categories.filter { it.displayName.contains(categoryQuery, ignoreCase = true) }
            }
            ExposedDropdownMenuBox(expanded = categoryExpanded, onExpandedChange = { categoryExpanded = !categoryExpanded }) {
                OutlinedTextField(
                    value = if (categoryExpanded) categoryQuery else state.selectedCategory?.displayName.orEmpty(),
                    onValueChange = { categoryQuery = it; categoryExpanded = true },
                    readOnly = false,
                    label = { Text("Category") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = categoryExpanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor(type = MenuAnchorType.PrimaryEditable, enabled = true),
                    shape = RoundedCornerShape(16.dp),
                )
                ExposedDropdownMenu(expanded = categoryExpanded && filteredCategories.isNotEmpty(), onDismissRequest = { categoryExpanded = false }) {
                    filteredCategories.forEach { category ->
                        DropdownMenuItem(
                            text = { Text(category.displayName) },
                            onClick = {
                                viewModel.selectCategory(category)
                                categoryQuery = ""
                                categoryExpanded = false
                            },
                        )
                    }
                }
            }
            if (categoryError != null) {
                Text(text = categoryError, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
            }

            // Subcategory (based on selected category)
            if (state.selectedCategory != null) {
                ExposedDropdownMenuBox(expanded = subcategoryExpanded, onExpandedChange = { subcategoryExpanded = !subcategoryExpanded }) {
                    OutlinedTextField(
                        value = state.selectedSubcategory?.displayName.orEmpty(),
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Subcategory") },
                        placeholder = { if (state.subcategories.isEmpty()) Text("Loading...") else Text("Select subcategory") },
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = subcategoryExpanded) },
                        modifier = Modifier.fillMaxWidth().menuAnchor(type = MenuAnchorType.PrimaryNotEditable, enabled = state.subcategories.isNotEmpty()),
                        shape = RoundedCornerShape(16.dp),
                    )
                    ExposedDropdownMenu(expanded = subcategoryExpanded && state.subcategories.isNotEmpty(), onDismissRequest = { subcategoryExpanded = false }) {
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
                    Text(text = subcategoryError, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                }
            }

            // Condition
            Text("Condition",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("New", "Like New", "Used", "Refurbished").forEach { option ->
                    FilterChip(
                        selected = condition == option,
                        onClick = { condition = option },
                        label = { Text(option) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = MaterialTheme.colorScheme.primary,
                            selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                        ),
                    )
                }
            }

            // Upload progress
            if (state.uploading || state.submitting) {
                Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.secondaryContainer, modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.fillMaxWidth().padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                        Spacer(Modifier.width(10.dp))
                        Text(if (state.uploading) "Uploading images..." else "Publishing listing...")
                    }
                }
            }

            // Publish Button
            PrimaryButton(
                text = "Publish Listing",
                loading = state.uploading || state.submitting,
                enabled = canSubmit,
                onClick = {
                    viewModel.uploadImagesAndSubmit(
                        title = title,
                        description = description,
                        priceText = priceText,
                        location = location,
                        condition = condition,
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

