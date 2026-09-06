package com.zaruda.app.ui.post

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.LocationManager
import android.net.Uri
import android.os.Looper
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
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
import androidx.compose.foundation.relocation.BringIntoViewRequester
import androidx.compose.foundation.relocation.bringIntoViewRequester
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.MyLocation
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.PriceChange
import androidx.compose.material.icons.filled.Sell
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Title
import androidx.compose.material.icons.filled.Verified
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.zaruda.app.R
import com.zaruda.app.domain.model.Category
import com.zaruda.app.ui.common.InputValidators
import com.zaruda.app.ui.components.ErrorBanner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.text.NumberFormat
import java.util.Locale

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
    val scope = rememberCoroutineScope()

    // ── Local form state ────────────────────────────────────────────────
    var title by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var priceText by rememberSaveable { mutableStateOf("") }
    var location by rememberSaveable { mutableStateOf("") }
    var categorySearch by rememberSaveable { mutableStateOf("") }
    var brandExpanded by rememberSaveable { mutableStateOf(false) }

    // Wizard step state (1: Photos, 2: Category, 3: Details, 4: Pricing & Contact, 5: Review & Publish)
    var currentStep by rememberSaveable { mutableStateOf(1) }
    var stepError by remember { mutableStateOf<String?>(null) }
    var detectingLocation by remember { mutableStateOf(false) }

    val scrollState = rememberScrollState()
    LaunchedEffect(currentStep) { scrollState.animateScrollTo(0) }

    var titleTouched by rememberSaveable { mutableStateOf(false) }
    var descTouched by rememberSaveable { mutableStateOf(false) }
    var priceTouched by rememberSaveable { mutableStateOf(false) }

    // ── GPS location detection ──────────────────────────────────────────
    fun detectLocation() {
        if (detectingLocation) return
        scope.launch {
            detectingLocation = true
            val loc = withTimeoutOrNull(10_000) { fetchCurrentLocation(context) }
            if (loc != null) {
                val label = reverseGeocodeCityState(context, loc.latitude, loc.longitude)
                if (!label.isNullOrBlank()) {
                    location = label
                    stepError = null
                } else {
                    stepError = "Found your location but couldn't resolve the city — please type it."
                }
            } else {
                stepError = "Couldn't detect your location. Check GPS is on, or enter it manually."
            }
            detectingLocation = false
        }
    }

    val locationPermissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted || ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            detectLocation()
        } else {
            stepError = "Location permission is needed to auto-detect. You can type your city instead."
        }
    }

    fun onDetectLocation() {
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!granted) {
            locationPermissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
        } else {
            detectLocation()
        }
    }

    // ── Draft restore ───────────────────────────────────────────────────
    LaunchedEffect(state.draftData) {
        state.draftData?.let { draft ->
            if (title.isBlank() && !draft.title.isNullOrBlank()) title = draft.title ?: ""
            if (description.isBlank() && !draft.description.isNullOrBlank()) description = draft.description ?: ""
            if (priceText.isBlank() && draft.price != null && draft.price > 0) priceText = draft.price.toString()
            if (location.isBlank() && !draft.location.isNullOrBlank()) location = draft.location ?: ""
            if (draft.condition != null && state.condition == null) viewModel.selectCondition(draft.condition)
            if (state.brand.isBlank() && !draft.brand.isNullOrBlank()) viewModel.setBrand(draft.brand)
            if (state.model.isBlank() && !draft.model.isNullOrBlank()) viewModel.setModel(draft.model)
            if (state.contactNumber.isBlank() && !draft.contactNumber.isNullOrBlank()) viewModel.setContactNumber(draft.contactNumber)
            if (state.ageMonths == null && draft.ageMonths != null) viewModel.setAgeMonths(draft.ageMonths)
            if (draft.isNegotiable == true && !state.isNegotiable) viewModel.toggleNegotiable()
        }
    }

    // ── Auto-save draft with 2s debounce ────────────────────────────────
    LaunchedEffect(
        title, description, priceText, location,
        state.selectedCategory?.stableId, state.brand, state.model, state.condition,
        state.contactNumber, state.ageMonths, state.isNegotiable,
    ) {
        if (title.isNotBlank() || description.isNotBlank() || priceText.isNotBlank() || location.isNotBlank() ||
            state.brand.isNotBlank() || state.model.isNotBlank() || state.condition != null
        ) {
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
    val descError = if (descTouched && description.isNotBlank() && description.length < 20) "At least 20 characters required" else null
    val categoryError = if (titleTouched && state.selectedCategory == null && title.isNotBlank()) "Select a category" else null
    val subcategoryError = if (state.selectedCategory != null && state.selectedSubcategory == null && titleTouched) "Select a subcategory" else null
    val imageError = if (state.imageUris.isEmpty() && titleTouched && title.isNotBlank()) "Add at least one photo" else null
    val contactError = if (state.contactNumber.isNotBlank() && !InputValidators.isValidIndianMobile(state.contactNumber)) {
        "Enter a valid 10-digit mobile number"
    } else null

    // ── Per-step gating ─────────────────────────────────────────────────
    fun stepGate(step: Int): String? = when (step) {
        1 -> if (state.imageUris.isEmpty()) "Add at least one photo to proceed." else null
        2 -> when {
            state.selectedCategory == null -> "Select a category to continue."
            state.selectedSubcategory == null -> "Select a subcategory to continue."
            else -> null
        }
        3 -> when {
            title.isBlank() || titleError != null -> titleError ?: "Enter a title (3–120 characters)."
            state.condition == null -> "Select a condition to continue."
            else -> null
        }
        4 -> when {
            priceText.isBlank() && !state.isNegotiable -> "Enter a price or mark it negotiable."
            priceError != null -> priceError ?: "Enter a valid price."
            state.contactNumber.isBlank() -> "Enter your 10-digit contact number."
            contactError != null -> contactError ?: "Enter a valid 10-digit mobile number."
            else -> null
        }
        else -> null
    }

    fun goNext() {
        if (currentStep >= 5) return
        when (currentStep) {
            1 -> titleTouched = true
            2 -> titleTouched = true
            3 -> titleTouched = true
            4 -> priceTouched = true
        }
        val gate = stepGate(currentStep)
        if (gate != null) {
            stepError = gate
            return
        }
        stepError = null
        currentStep++
    }

    fun goBack() {
        if (currentStep > 1) {
            currentStep--
            stepError = null
        }
    }

    fun goToStep(target: Int) {
        if (target in 1..currentStep) {
            currentStep = target
            stepError = null
        }
    }

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

    // ── Navigate on success ─────────────────────────────────────────────
    LaunchedEffect(state.success) {
        if (state.success) {
            viewModel.clearDraft()
            delay(1200)
            onPublished()
        }
    }

    val draftMessage = when {
        state.savingDraft -> "Saving draft…"
        state.draftSaved -> "Draft saved"
        else -> null
    }

    Scaffold(
        topBar = {
            Surface(
                color = MaterialTheme.colorScheme.surface,
                shadowElevation = 2.dp,
            ) {
                Column(Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            FilledIconButton(
                                onClick = onBack,
                                modifier = Modifier.size(38.dp),
                                colors = IconButtonDefaults.filledIconButtonColors(
                                    containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.7f),
                                    contentColor = MaterialTheme.colorScheme.onSurface,
                                ),
                                shape = RoundedCornerShape(12.dp),
                            ) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, null, modifier = Modifier.size(18.dp))
                            }
                            Column {
                                Text("Create Listing", fontWeight = FontWeight.Black, fontSize = 18.sp, color = MaterialTheme.colorScheme.onSurface)
                                Text("Sell in 60s • Zero Platform Fees", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }

                        // Draft status / Fast Sell pill
                        Surface(
                            shape = RoundedCornerShape(20.dp),
                            color = if (draftMessage != null) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.6f) else Color(0xFFDCFCE7),
                            border = BorderStroke(1.dp, if (draftMessage != null) MaterialTheme.colorScheme.primary.copy(alpha = 0.2f) else Color(0xFF86EFAC)),
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(5.dp),
                            ) {
                                if (state.savingDraft) {
                                    CircularProgressIndicator(Modifier.size(11.dp), strokeWidth = 1.5.dp, color = MaterialTheme.colorScheme.primary)
                                } else {
                                    Icon(
                                        if (draftMessage != null) Icons.Default.Check else Icons.Filled.Verified,
                                        null,
                                        Modifier.size(13.dp),
                                        tint = if (draftMessage != null) MaterialTheme.colorScheme.primary else Color(0xFF16A34A),
                                    )
                                }
                                Text(
                                    draftMessage ?: "⚡ Fast Sell",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (draftMessage != null) MaterialTheme.colorScheme.onPrimaryContainer else Color(0xFF166534),
                                )
                            }
                        }
                    }
                }
            }
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Box(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .imePadding(),
        ) {
            val limitError = state.error?.takeIf {
                it.contains("Daily limit", ignoreCase = true) || it.contains("Listing limit", ignoreCase = true)
            }
            if (limitError != null) {
                AlertDialog(
                    onDismissRequest = { viewModel.clearError() },
                    icon = { Text("⏱️", fontSize = 28.sp) },
                    title = { Text("Posting Limit Reached", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                    text = {
                        Text(
                            "${limitError}\n\nYour plan caps daily listing submissions. Resets at midnight.",
                            fontSize = 14.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    },
                    confirmButton = {
                        Button(
                            onClick = { viewModel.clearError() },
                            shape = RoundedCornerShape(10.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                        ) { Text("Got it") }
                    },
                )
            }

            AnimatedContent(
                targetState = currentStep,
                transitionSpec = { fadeIn(tween(240)) togetherWith fadeOut(tween(160)) },
                label = "wizardStep",
            ) { step ->
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(scrollState)
                        .padding(horizontal = 16.dp)
                        .padding(bottom = 104.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Spacer(Modifier.height(4.dp))

                    if (state.error?.contains("Daily limit", ignoreCase = true) != true &&
                        state.error?.contains("Listing limit", ignoreCase = true) != true
                    ) {
                        ErrorBanner(message = state.error)
                    }

                    // 10/10 Step Indicator (Tappable completed steps)
                    StepIndicator(
                        currentStep = step,
                        totalSteps = 5,
                        labels = listOf("Photos", "Category", "Details", "Price", "Publish"),
                        icons = listOf("📸", "🏷️", "📝", "💰", "🚀"),
                        onStepClick = { target -> goToStep(target) },
                    )

                    val gateError = if (step == currentStep) stepError else null
                    AnimatedVisibility(visible = gateError != null, enter = fadeIn(), exit = fadeOut()) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.7f),
                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.error.copy(alpha = 0.3f)),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Row(
                                Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Icon(Icons.Default.Info, null, Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onErrorContainer)
                                Text(
                                    gateError.orEmpty(),
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onErrorContainer,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                    }

                    when (step) {
                        // ── STEP 1: Photos & Media ──────────────────────
                        1 -> {
                            FormSectionCard {
                                SectionHeader(
                                    icon = Icons.Default.AddAPhoto,
                                    title = "Upload Photos",
                                    subtitle = "${state.imageUris.size}/${state.maxImages} photos selected • JPG / PNG",
                                )
                                Spacer(Modifier.height(14.dp))

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
                                        onMakeCoverClick = { idx ->
                                            val updated = state.imageUris.toMutableList().apply { 
                                                val item = removeAt(idx)
                                                add(0, item)
                                            }
                                            viewModel.setImages(updated)
                                        },
                                    )
                                }

                                if (imageError != null) {
                                    Text(
                                        imageError,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.error,
                                        modifier = Modifier.padding(start = 4.dp, top = 6.dp),
                                    )
                                }

                                if (state.maxImages <= 1 && state.imageUris.isEmpty()) {
                                    Spacer(Modifier.height(10.dp))
                                    Surface(
                                        shape = RoundedCornerShape(12.dp),
                                        color = Color(0xFFFFF3E0),
                                        border = BorderStroke(1.dp, Color(0xFFFFCC80)),
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Row(
                                            Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        ) {
                                            Text("⭐", fontSize = 16.sp)
                                            Text(
                                                "Gold & Premium sellers can upload up to 10 photos per listing.",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = Color(0xFFBF360C),
                                            )
                                        }
                                    }
                                }
                            }
                        }

                        // ── STEP 2: Category & Subcategory ───────────────
                        2 -> {
                            FormSectionCard {
                                SectionHeader(
                                    icon = Icons.Default.Category,
                                    title = "Choose Category",
                                    subtitle = "Select where your listing should appear in marketplace",
                                )
                                Spacer(Modifier.height(14.dp))

                                val filteredCategories = remember(state.categories, categorySearch) {
                                    if (categorySearch.isBlank()) state.categories
                                    else state.categories.filter { it.displayName.contains(categorySearch, ignoreCase = true) }
                                }

                                OutlinedTextField(
                                    value = categorySearch,
                                    onValueChange = { categorySearch = it },
                                    modifier = Modifier.fillMaxWidth().then(rememberBringIntoViewOnFocusModifier()),
                                    label = { Text("Search Category") },
                                    placeholder = { Text("e.g., Mobiles, Vehicles, Fashion…") },
                                    leadingIcon = { Icon(Icons.Default.Category, null, modifier = Modifier.size(18.dp)) },
                                    trailingIcon = if (categorySearch.isNotBlank()) {
                                        { IconButton(onClick = { categorySearch = "" }) { Icon(Icons.Default.Close, null, modifier = Modifier.size(16.dp)) } }
                                    } else null,
                                    singleLine = true,
                                    shape = RoundedCornerShape(14.dp),
                                    colors = FormFieldColors(),
                                )
                                Spacer(Modifier.height(14.dp))

                                if (state.categories.isEmpty() && state.categoriesLoading) {
                                    Row(
                                        Modifier.fillMaxWidth().padding(vertical = 12.dp),
                                        horizontalArrangement = Arrangement.Center,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                                        Spacer(Modifier.width(10.dp))
                                        Text("Loading categories…", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                } else if (state.categories.isEmpty()) {
                                    Row(
                                        Modifier.fillMaxWidth().padding(vertical = 8.dp),
                                        horizontalArrangement = Arrangement.Center,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text("Couldn't load categories.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        Spacer(Modifier.width(8.dp))
                                        TextButton(onClick = { viewModel.retryCategories() }) {
                                            Text("Retry", fontWeight = FontWeight.Bold)
                                        }
                                    }
                                } else if (filteredCategories.isEmpty()) {
                                    Text("No categories match \"$categorySearch\"", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                } else {
                                    CategoryCardGrid(
                                        categories = filteredCategories,
                                        selected = state.selectedCategory,
                                        onSelect = { viewModel.selectCategory(it); categorySearch = "" },
                                    )
                                }

                                if (categoryError != null) {
                                    Text(
                                        categoryError,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.error,
                                        modifier = Modifier.padding(start = 4.dp, top = 6.dp),
                                    )
                                }
                            }

                            AnimatedVisibility(visible = state.selectedCategory != null, enter = fadeIn(), exit = fadeOut()) {
                                FormSectionCard {
                                    SectionHeader(
                                        icon = Icons.Default.Category,
                                        title = "Subcategory",
                                        subtitle = "Specific to ${state.selectedCategory?.displayName}",
                                    )
                                    Spacer(Modifier.height(12.dp))
                                    if (state.subcategories.isEmpty() && state.subcategoriesLoading) {
                                        Row(
                                            Modifier.fillMaxWidth().padding(vertical = 8.dp),
                                            horizontalArrangement = Arrangement.Center,
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                                            Spacer(Modifier.width(10.dp))
                                            Text("Loading subcategories…", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    } else if (state.subcategories.isEmpty()) {
                                        Row(
                                            Modifier.fillMaxWidth().padding(vertical = 8.dp),
                                            horizontalArrangement = Arrangement.Center,
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Text("No subcategories found.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                            Spacer(Modifier.width(8.dp))
                                            TextButton(onClick = { state.selectedCategory?.let { viewModel.selectCategory(it) } }) {
                                                Text("Retry", fontWeight = FontWeight.Bold)
                                            }
                                        }
                                    } else {
                                        SubcategoryChips(
                                            subcategories = state.subcategories,
                                            selected = state.selectedSubcategory,
                                            onSelect = { viewModel.selectSubcategory(it) },
                                        )
                                    }
                                    if (subcategoryError != null) {
                                        Text(
                                            subcategoryError,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.error,
                                            modifier = Modifier.padding(start = 4.dp, top = 6.dp),
                                        )
                                    }
                                }
                            }
                        }

                        // ── STEP 3: Details & Condition ──────────────────
                        3 -> {
                            FormSectionCard {
                                SectionHeader(icon = Icons.Default.Description, title = "Item Specifications")
                                Spacer(Modifier.height(16.dp))

                                CharCountField(
                                    value = title,
                                    onValueChange = { title = it; viewModel.clearError() },
                                    onFocusChanged = { focused -> if (!focused) titleTouched = true },
                                    label = "Listing Title",
                                    placeholder = "e.g., iPhone 15 Pro Max 256GB Natural Titanium",
                                    leadingIcon = Icons.Default.Title,
                                    error = titleError,
                                    maxLength = 120,
                                    imeAction = ImeAction.Next,
                                )

                                Spacer(Modifier.height(14.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    val brandFiltered = remember(state.brand, state.brandSuggestions) {
                                        if (state.brand.isBlank()) state.brandSuggestions.take(15)
                                        else state.brandSuggestions.filter { it.contains(state.brand, ignoreCase = true) }.take(15)
                                    }
                                    ExposedDropdownMenuBox(
                                        expanded = brandExpanded && brandFiltered.isNotEmpty(),
                                        onExpandedChange = { if (brandFiltered.isNotEmpty()) brandExpanded = !brandExpanded },
                                        modifier = Modifier.weight(1f),
                                    ) {
                                        OutlinedTextField(
                                            value = state.brand,
                                            onValueChange = { viewModel.setBrand(it); brandExpanded = true },
                                            modifier = Modifier.fillMaxWidth().menuAnchor(type = MenuAnchorType.PrimaryEditable).then(rememberBringIntoViewOnFocusModifier()),
                                            label = { Text("Brand") },
                                            placeholder = { Text("Apple") },
                                            leadingIcon = { Icon(Icons.Default.Sell, null, modifier = Modifier.size(18.dp)) },
                                            singleLine = true,
                                            shape = RoundedCornerShape(14.dp),
                                            colors = FormFieldColors(),
                                            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                                        )
                                        ExposedDropdownMenu(expanded = brandExpanded && brandFiltered.isNotEmpty(), onDismissRequest = { brandExpanded = false }) {
                                            brandFiltered.forEach { b ->
                                                DropdownMenuItem(
                                                    text = { Text(b) },
                                                    onClick = { viewModel.setBrand(b); brandExpanded = false },
                                                )
                                            }
                                        }
                                    }
                                    OutlinedTextField(
                                        value = state.model,
                                        onValueChange = { viewModel.setModel(it) },
                                        modifier = Modifier.weight(1f).then(rememberBringIntoViewOnFocusModifier()),
                                        label = { Text("Model") },
                                        placeholder = { Text("15 Pro Max") },
                                        singleLine = true,
                                        shape = RoundedCornerShape(14.dp),
                                        colors = FormFieldColors(),
                                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                                    )
                                }

                                Spacer(Modifier.height(16.dp))
                                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                Spacer(Modifier.height(14.dp))

                                Text("Item Condition", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                                Spacer(Modifier.height(8.dp))
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    val conditionBadges = listOf(
                                        "New" to "✨ Brand New",
                                        "Like New" to "💎 Like New",
                                        "Used" to "👍 Good / Used",
                                        "Refurbished" to "🔧 Refurbished",
                                    )
                                    conditionBadges.forEach { (cKey, cLabel) ->
                                        val selected = state.condition == cKey
                                        FilterChip(
                                            selected = selected,
                                            onClick = { viewModel.selectCondition(cKey) },
                                            label = { Text(cLabel, fontSize = 13.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium) },
                                            leadingIcon = if (selected) {{ Icon(Icons.Filled.Check, null, Modifier.size(16.dp)) }} else null,
                                            shape = RoundedCornerShape(20.dp),
                                            colors = FilterChipDefaults.filterChipColors(
                                                selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.14f),
                                                selectedLabelColor = MaterialTheme.colorScheme.primary,
                                            ),
                                            border = FilterChipDefaults.filterChipBorder(
                                                borderColor = MaterialTheme.colorScheme.outlineVariant,
                                                selectedBorderColor = MaterialTheme.colorScheme.primary,
                                                enabled = true,
                                                selected = selected,
                                            ),
                                        )
                                    }
                                }

                                Spacer(Modifier.height(16.dp))
                                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                Spacer(Modifier.height(14.dp))

                                Text("Item Age", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                                Spacer(Modifier.height(8.dp))
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    val ageOptions = listOf(0, 1, 3, 6, 12, 24, 36, 60, 120)
                                    ageOptions.forEach { months ->
                                        val label = when (months) {
                                            0 -> "Brand New"
                                            1 -> "< 1 Month"
                                            3 -> "3 Months"
                                            6 -> "6 Months"
                                            12 -> "1 Year"
                                            24 -> "2 Years"
                                            36 -> "3 Years"
                                            60 -> "5 Years"
                                            120 -> "10+ Years"
                                            else -> "${months}m"
                                        }
                                        val selected = state.ageMonths == months
                                        FilterChip(
                                            selected = selected,
                                            onClick = { viewModel.setAgeMonths(if (selected) null else months) },
                                            label = { Text(label, fontSize = 12.sp) },
                                            shape = RoundedCornerShape(16.dp),
                                            colors = FilterChipDefaults.filterChipColors(
                                                selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                                                selectedLabelColor = MaterialTheme.colorScheme.primary,
                                            ),
                                        )
                                    }
                                }

                                Spacer(Modifier.height(16.dp))
                                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                Spacer(Modifier.height(14.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Text("Description", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
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
                                Spacer(Modifier.height(6.dp))
                                FormTextField(
                                    value = description,
                                    onValueChange = { if (it.length <= 1000) { description = it; viewModel.clearError() } },
                                    onFocusChanged = { focused -> if (!focused) descTouched = true },
                                    label = "Description",
                                    placeholder = "Describe condition, accessories (box/charger/bill), battery health, and warranty status…",
                                    leadingIcon = Icons.Default.Description,
                                    singleLine = false,
                                    imeAction = ImeAction.None,
                                    error = descError,
                                    minLines = 4,
                                )
                            }
                        }

                        // ── STEP 4: Price, Smart Calculator, Location & Contact ─
                        4 -> {
                            FormSectionCard {
                                SectionHeader(icon = Icons.Default.PriceChange, title = "Set Price & Intelligence")
                                Spacer(Modifier.height(16.dp))

                                PriceField(
                                    value = priceText,
                                    onValueChange = { priceText = it; viewModel.clearError() },
                                    onFocusChanged = { focused -> if (!focused) priceTouched = true },
                                    error = priceError,
                                )

                                Spacer(Modifier.height(10.dp))
                                QuickPriceChips(
                                    current = priceText,
                                    onPick = { priceText = it.replace(",", ""); priceTouched = true; viewModel.clearError() },
                                )

                                val priceNum = InputValidators.parsePositiveAmount(priceText)
                                if (priceNum != null && priceNum > 0) {
                                    Spacer(Modifier.height(12.dp))
                                    Surface(
                                        shape = RoundedCornerShape(14.dp),
                                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                                        modifier = Modifier.fillMaxWidth(),
                                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
                                    ) {
                                        Column(Modifier.padding(12.dp)) {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                Text("📊", fontSize = 16.sp)
                                                Text("Market Price Intelligence", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                                            }
                                            Spacer(Modifier.height(10.dp))
                                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                Column(
                                                    Modifier
                                                        .weight(1f)
                                                        .clip(RoundedCornerShape(10.dp))
                                                        .background(Color(0xFFDCFCE7))
                                                        .padding(8.dp),
                                                ) {
                                                    Text("🟢 Quick Sale", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF166534))
                                                    Text("₹${String.format(Locale.ENGLISH, "%,.0f", priceNum * 0.85)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF166534))
                                                    Text("1-2 days", fontSize = 9.sp, color = Color(0xFF166534).copy(alpha = 0.8f))
                                                }
                                                Column(
                                                    Modifier
                                                        .weight(1f)
                                                        .clip(RoundedCornerShape(10.dp))
                                                        .background(Color(0xFFDBEAFE))
                                                        .padding(8.dp),
                                                ) {
                                                    Text("🔵 Fair Market", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1E40AF))
                                                    Text("₹${String.format(Locale.ENGLISH, "%,.0f", priceNum)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E40AF))
                                                    Text("Standard", fontSize = 9.sp, color = Color(0xFF1E40AF).copy(alpha = 0.8f))
                                                }
                                                Column(
                                                    Modifier
                                                        .weight(1f)
                                                        .clip(RoundedCornerShape(10.dp))
                                                        .background(Color(0xFFFFEDD5))
                                                        .padding(8.dp),
                                                ) {
                                                    Text("🟠 Premium", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF9A3412))
                                                    Text("₹${String.format(Locale.ENGLISH, "%,.0f", priceNum * 1.15)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF9A3412))
                                                    Text("1-2 weeks", fontSize = 9.sp, color = Color(0xFF9A3412).copy(alpha = 0.8f))
                                                }
                                            }
                                        }
                                    }
                                }

                                Spacer(Modifier.height(10.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Icon(Icons.Default.Sell, null, tint = if (state.isNegotiable) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                                        Column {
                                            Text("Price Negotiable", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                                            Text("Allow buyers to send counter-offers", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                    Switch(
                                        checked = state.isNegotiable,
                                        onCheckedChange = { viewModel.toggleNegotiable() },
                                    )
                                }
                            }

                            FormSectionCard {
                                SectionHeader(
                                    icon = Icons.Default.LocationOn,
                                    title = "Listing Location",
                                    subtitle = "City / Locality shown on marketplace feed",
                                )
                                Spacer(Modifier.height(12.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text("City / Locality", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    OutlinedButton(
                                        onClick = { onDetectLocation() },
                                        enabled = !detectingLocation,
                                        shape = RoundedCornerShape(10.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                                        colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.primary),
                                    ) {
                                        if (detectingLocation) {
                                            CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp)
                                            Spacer(Modifier.width(6.dp))
                                        } else {
                                            Icon(Icons.Default.MyLocation, null, Modifier.size(14.dp))
                                            Spacer(Modifier.width(6.dp))
                                        }
                                        Text(if (detectingLocation) "Detecting…" else "Detect GPS", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                                Spacer(Modifier.height(4.dp))
                                FormTextField(
                                    value = location,
                                    onValueChange = { location = it },
                                    label = "Location",
                                    placeholder = "e.g., Tirupati, Andhra Pradesh",
                                    leadingIcon = Icons.Default.LocationOn,
                                    imeAction = ImeAction.Done,
                                )
                            }

                            FormSectionCard {
                                SectionHeader(icon = Icons.Default.Phone, title = "Seller Contact")
                                Spacer(Modifier.height(14.dp))

                                OutlinedTextField(
                                    value = state.contactNumber,
                                    onValueChange = { viewModel.setContactNumber(it) },
                                    modifier = Modifier.fillMaxWidth().then(rememberBringIntoViewOnFocusModifier()),
                                    label = { Text("Mobile Number (Required)") },
                                    placeholder = { Text("98765 43210") },
                                    leadingIcon = { Text("🇮🇳 +91", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(start = 12.dp, end = 4.dp)) },
                                    singleLine = true,
                                    textStyle = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = FormFieldColors(),
                                    isError = contactError != null,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Done),
                                    supportingText = {
                                        Text(
                                            if (contactError != null) contactError
                                            else "Verified buyers can contact you via call or WhatsApp",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = if (contactError != null) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    },
                                )
                            }

                            FormSectionCard {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                        Box(
                                            modifier = Modifier
                                                .size(36.dp)
                                                .clip(RoundedCornerShape(10.dp))
                                                .background(Color(0xFFFFF3E0)),
                                            contentAlignment = Alignment.Center,
                                        ) {
                                            Icon(Icons.Default.Bolt, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(20.dp))
                                        }
                                        Column {
                                            Text("⚡ Flash Sale Badge", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                                            Text("Highlight on Home & Nearby Radar feeds", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                    Switch(
                                        checked = state.flashSale,
                                        onCheckedChange = { viewModel.setFlashSale(it) },
                                    )
                                }
                            }
                        }

                        // ── STEP 5: Live Feed Marketplace Preview & Publish ─
                        else -> {
                            val hasPhoto = state.imageUris.isNotEmpty()
                            val hasCategory = state.selectedCategory != null && state.selectedSubcategory != null
                            val hasTitle = title.isNotBlank() && InputValidators.isValidTitle(title)
                            val hasCondition = state.condition != null
                            val hasPrice = priceText.isNotBlank() && InputValidators.parsePositiveAmount(priceText) != null || state.isNegotiable
                            val hasContact = state.contactNumber.isNotBlank() && InputValidators.isValidIndianMobile(state.contactNumber)

                            ListingReadinessCard(
                                checks = listOf(
                                    "Add at least one clear photo" to hasPhoto,
                                    "Select category & subcategory" to hasCategory,
                                    "Descriptive title (3–120 chars)" to hasTitle,
                                    "Specify item condition" to hasCondition,
                                    "Valid price or negotiable tag" to hasPrice,
                                    "10-digit seller contact phone" to hasContact,
                                ),
                            )

                            // 10/10 Interactive Live Feed Preview
                            LiveListingPreview(
                                title = title,
                                description = description,
                                priceText = priceText,
                                location = location,
                                condition = state.condition,
                                negotiable = state.isNegotiable,
                                flashSale = state.flashSale,
                                imageUri = state.imageUris.firstOrNull(),
                                category = state.selectedCategory?.displayName,
                                brand = state.brand,
                                model = state.model,
                                imageCount = state.imageUris.size,
                            )

                            // Escrow & Zero Fee Guarantee Ribbon
                            Surface(
                                shape = RoundedCornerShape(14.dp),
                                color = Color(0xFFECFDF5),
                                border = BorderStroke(1.dp, Color(0xFFA7F3D0)),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Row(
                                    modifier = Modifier.padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    Icon(Icons.Filled.Shield, null, tint = Color(0xFF059669), modifier = Modifier.size(24.dp))
                                    Column {
                                        Text("100% Free Seller Protection", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color(0xFF065F46))
                                        Text("Direct verified transactions with zero listing commission fees.", fontSize = 11.sp, color = Color(0xFF047857))
                                    }
                                }
                            }

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
                                            when {
                                                state.uploading -> "Optimizing and uploading images…"
                                                else -> "Broadcasting listing to marketplace…"
                                            },
                                            color = MaterialTheme.colorScheme.onSecondaryContainer,
                                            fontWeight = FontWeight.SemiBold,
                                        )
                                    }
                                }
                            }
                        }
                    }

                    Spacer(Modifier.height(8.dp))
                }
            }

            // ═════════════════════════════════════════════════════════════
            // Sticky 10/10 Bottom Wizard Navigation Bar
            // ═════════════════════════════════════════════════════════════
            Surface(
                modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth(),
                color = MaterialTheme.colorScheme.surface,
                shadowElevation = 10.dp,
                tonalElevation = 3.dp,
            ) {
                Column(Modifier.fillMaxWidth()) {
                    LinearProgressIndicator(
                        progress = { (currentStep - 1) / 4f },
                        modifier = Modifier.fillMaxWidth().height(3.5.dp),
                        color = MaterialTheme.colorScheme.primary,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        OutlinedButton(
                            onClick = { goBack() },
                            enabled = currentStep > 1 && !state.uploading && !state.submitting,
                            shape = RoundedCornerShape(12.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurface),
                        ) {
                            Text("← Back", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }

                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                "Step $currentStep of 5",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Black,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                listOf("Photos", "Category", "Details", "Price", "Publish")[currentStep - 1],
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.Bold,
                            )
                        }

                        if (currentStep < 5) {
                            Button(
                                onClick = { goNext() },
                                enabled = !state.uploading && !state.submitting,
                                shape = RoundedCornerShape(12.dp),
                                contentPadding = PaddingValues(horizontal = 22.dp, vertical = 10.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.primary,
                                    contentColor = MaterialTheme.colorScheme.onPrimary,
                                ),
                            ) {
                                Text("Next →", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                        } else {
                            Button(
                                onClick = {
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
                                enabled = !state.uploading && !state.submitting,
                                shape = RoundedCornerShape(12.dp),
                                contentPadding = PaddingValues(horizontal = 22.dp, vertical = 10.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color(0xFF059669),
                                    contentColor = Color.White,
                                ),
                            ) {
                                Text("🚀 Publish Now", fontWeight = FontWeight.Black, fontSize = 13.sp)
                            }
                        }
                    }
                }
            }

            // Success overlay
            AnimatedVisibility(visible = state.success, enter = fadeIn(), exit = fadeOut()) {
                Box(
                    modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.6f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Surface(
                        shape = RoundedCornerShape(24.dp),
                        color = MaterialTheme.colorScheme.surface,
                        shadowElevation = 12.dp,
                    ) {
                        Column(
                            Modifier.padding(32.dp).widthIn(min = 240.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Box(
                                Modifier.size(68.dp).clip(CircleShape).background(Color(0xFFDCFCE7)),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(Icons.Default.Check, null, Modifier.size(36.dp), tint = Color(0xFF16A34A))
                            }
                            Spacer(Modifier.height(16.dp))
                            Text("Listing Published! 🎉", fontWeight = FontWeight.Black, fontSize = 20.sp)
                            Spacer(Modifier.height(6.dp))
                            Text("Your ad is live in Zaruda Marketplace", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

// ── Auto-scroll focused fields above the keyboard ───────────────────────────

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun rememberBringIntoViewOnFocusModifier(): Modifier {
    val requester = remember { BringIntoViewRequester() }
    val scope = rememberCoroutineScope()
    return Modifier
        .bringIntoViewRequester(requester)
        .onFocusChanged { focused -> if (focused.isFocused) scope.launch { requester.bringIntoView() } }
}

// ── Step indicator ──────────────────────────────────────────────────────────

@Composable
private fun StepIndicator(
    currentStep: Int,
    totalSteps: Int,
    labels: List<String>,
    icons: List<String>,
    onStepClick: (Int) -> Unit = {},
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 2.dp,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(horizontal = 12.dp, vertical = 12.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                labels.take(totalSteps).forEachIndexed { idx, label ->
                    val stepNum = idx + 1
                    val isActive = currentStep == stepNum
                    val isDone = currentStep > stepNum
                    val canJump = isDone
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .then(if (canJump) Modifier.clickable { onStepClick(stepNum) } else Modifier)
                            .clip(RoundedCornerShape(10.dp))
                            .padding(vertical = 2.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(CircleShape)
                                .background(
                                    when {
                                        isActive -> MaterialTheme.colorScheme.primary
                                        isDone -> Color(0xFF10B981)
                                        else -> MaterialTheme.colorScheme.surfaceVariant
                                    }
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            if (isDone) {
                                Icon(Icons.Default.Check, null, Modifier.size(15.dp), tint = Color.White)
                            } else {
                                Text(
                                    icons.getOrElse(idx) { "$stepNum" },
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isActive) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        Spacer(Modifier.height(4.dp))
                        Text(
                            label,
                            fontSize = 10.sp,
                            fontWeight = if (isActive) FontWeight.ExtraBold else FontWeight.Medium,
                            color = if (isActive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                        )
                    }
                    if (idx < totalSteps - 1) {
                        Box(
                            Modifier
                                .weight(0.35f)
                                .height(2.5.dp)
                                .clip(RoundedCornerShape(1.dp))
                                .background(if (stepNum <= currentStep - 1) Color(0xFF10B981) else MaterialTheme.colorScheme.surfaceVariant),
                        )
                    }
                }
            }
        }
    }
}

// ── Category card grid ──────────────────────────────────────────────────────

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CategoryCardGrid(
    categories: List<Category>,
    selected: Category?,
    onSelect: (Category) -> Unit,
) {
    FlowRow(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        categories.forEach { cat ->
            val isSelected = selected?.stableId == cat.stableId
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = if (isSelected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
                else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f),
                border = BorderStroke(
                    width = if (isSelected) 1.5.dp else 1.dp,
                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f),
                ),
                modifier = Modifier
                    .clip(RoundedCornerShape(14.dp))
                    .clickable { onSelect(cat) },
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(categoryEmoji(cat.displayName), fontSize = 18.sp)
                    Text(
                        cat.displayName,
                        fontSize = 12.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                        color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                        maxLines = 1,
                    )
                    if (isSelected) {
                        Icon(Icons.Filled.CheckCircle, null, Modifier.size(15.dp), tint = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
    }
}

// ── Subcategory chips ───────────────────────────────────────────────────────

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun SubcategoryChips(
    subcategories: List<Category>,
    selected: Category?,
    onSelect: (Category) -> Unit,
) {
    FlowRow(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        subcategories.forEach { sub ->
            val isSelected = selected?.stableId == sub.stableId
            FilterChip(
                selected = isSelected,
                onClick = { onSelect(sub) },
                label = { Text(sub.displayName, fontSize = 12.sp, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal) },
                leadingIcon = if (isSelected) {{ Icon(Icons.Filled.Check, null, Modifier.size(14.dp)) }} else null,
                shape = RoundedCornerShape(16.dp),
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.14f),
                    selectedLabelColor = MaterialTheme.colorScheme.primary,
                ),
                border = FilterChipDefaults.filterChipBorder(
                    borderColor = MaterialTheme.colorScheme.outlineVariant,
                    selectedBorderColor = MaterialTheme.colorScheme.primary,
                    enabled = true,
                    selected = isSelected,
                ),
            )
        }
    }
}

// ── Quick price chips ───────────────────────────────────────────────────────

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun QuickPriceChips(current: String, onPick: (String) -> Unit) {
    val suggestions = listOf("499", "999", "1,999", "4,999", "9,999", "14,999", "29,999", "49,999")
    Column {
        Text(
            "Quick Price Presets",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(6.dp))
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            suggestions.forEach { s ->
                val selected = current.replace(",", "") == s.replace(",", "")
                AssistChip(
                    onClick = { onPick(s) },
                    label = { Text("₹$s", fontSize = 12.sp, fontWeight = FontWeight.Bold) },
                    leadingIcon = if (selected) {{ Icon(Icons.Default.Check, null, Modifier.size(13.dp)) }} else null,
                    shape = RoundedCornerShape(16.dp),
                    colors = AssistChipDefaults.assistChipColors(
                        containerColor = if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.14f)
                        else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f),
                        labelColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                    ),
                    border = AssistChipDefaults.assistChipBorder(
                        borderColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f),
                        enabled = true,
                    ),
                )
            }
        }
    }
}

// ── Listing readiness checklist ─────────────────────────────────────────────

@Composable
private fun ListingReadinessCard(checks: List<Pair<String, Boolean>>) {
    val doneCount = checks.count { it.second }
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 2.dp,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("Listing Quality Check", fontWeight = FontWeight.Black, style = MaterialTheme.typography.titleSmall)
                    Text(
                        "$doneCount of ${checks.size} requirements met",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (doneCount == checks.size) Color(0xFF16A34A) else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (doneCount == checks.size) {
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = Color(0xFFDCFCE7),
                    ) {
                        Text(
                            "Ready to Publish ✨",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF16A34A),
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        )
                    }
                }
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            checks.forEach { (label, ok) ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(
                        modifier = Modifier
                            .size(20.dp)
                            .clip(CircleShape)
                            .background(if (ok) Color(0xFFDCFCE7) else MaterialTheme.colorScheme.surfaceVariant),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (ok) {
                            Icon(Icons.Default.Check, null, Modifier.size(13.dp), tint = Color(0xFF16A34A))
                        } else {
                            Text("•", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    Text(
                        label,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = if (ok) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (ok) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
    }
}

// ── Live listing preview ────────────────────────────────────────────────────

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun LiveListingPreview(
    title: String,
    description: String,
    priceText: String,
    location: String,
    condition: String?,
    negotiable: Boolean,
    flashSale: Boolean,
    imageUri: Uri?,
    category: String?,
    brand: String,
    model: String,
    imageCount: Int,
) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 3.dp,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.6f)),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "Marketplace Live Preview",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.primary,
                )
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f),
                ) {
                    Text(
                        "Buyer View",
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                    )
                }
            }
            Spacer(Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.Top,
            ) {
                Box(
                    modifier = Modifier
                        .size(100.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
                    contentAlignment = Alignment.Center,
                ) {
                    if (imageUri != null) {
                        AsyncImage(
                            model = imageUri,
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(14.dp)),
                        )
                    } else {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.AddAPhoto, null, Modifier.size(24.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(4.dp))
                            Text("No Photo", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    category?.let {
                        Surface(
                            shape = RoundedCornerShape(6.dp),
                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.9f),
                            modifier = Modifier.align(Alignment.TopStart).padding(5.dp),
                        ) {
                            Text(it, fontSize = 8.sp, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp))
                        }
                    }
                }

                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        title.ifBlank { listOf(brand, model).filter { it.isNotBlank() }.joinToString(" ").ifBlank { "Your Listing Title" } },
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Black,
                        maxLines = 2,
                    )
                    val parsed = InputValidators.parsePositiveAmount(priceText)
                    Text(
                        if (parsed != null) "₹${NumberFormat.getNumberInstance(Locale.ENGLISH).format(parsed)}"
                        else if (negotiable) "₹ Best Offer"
                        else "₹ —",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Black,
                        color = Color(0xFF059669),
                    )
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        listOfNotNull(
                            condition?.let { "✨ $it" },
                            location.ifBlank { null }?.let { "📍 $it" },
                            negotiable.takeIf { it }?.let { "💬 Negotiable" },
                            flashSale.takeIf { it }?.let { "⚡ Flash Deal" },
                        ).forEach { chip ->
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                            ) {
                                Text(chip, fontSize = 9.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp))
                            }
                        }
                    }
                }
            }

            if (description.isNotBlank()) {
                Spacer(Modifier.height(10.dp))
                Text(
                    "\"$description\"",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 3,
                    modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)).padding(10.dp),
                )
            }

            Spacer(Modifier.height(10.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(Icons.Filled.Verified, null, Modifier.size(15.dp), tint = Color(0xFF059669))
                Text(
                    "$imageCount photo(s) • Listed by Verified Seller",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }
}

// ── Image grid (FlowRow) ────────────────────────────────────────────────────

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ImageGrid(
    uris: List<Uri>,
    maxImages: Int,
    onAddClick: () -> Unit,
    onRemoveClick: (Int) -> Unit,
    onMakeCoverClick: ((Int) -> Unit)? = null,
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
                        .width(105.dp)
                        .aspectRatio(1f),
                ) {
                    AsyncImage(
                        model = uri,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(14.dp)),
                    )
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(6.dp)
                            .size(20.dp)
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.6f)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("${idx + 1}", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Bold)
                    }
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
                    if (idx == 0) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color(0xFFFFD700).copy(alpha = 0.95f),
                            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 4.dp),
                        ) {
                            Text("⭐ Cover", fontSize = 9.sp, fontWeight = FontWeight.ExtraBold, color = Color.Black, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    } else if (onMakeCoverClick != null) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color.Black.copy(alpha = 0.75f),
                            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 4.dp).clickable { onMakeCoverClick(idx) }
                        ) {
                            Text("Set Cover", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                }
            }
            if (uris.size < maxImages) {
                Box(
                    modifier = Modifier
                        .width(105.dp)
                        .aspectRatio(1f)
                        .clip(RoundedCornerShape(14.dp))
                        .border(1.5f.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(14.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f))
                        .clickable { onAddClick() },
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.AddCircle, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(26.dp))
                        Spacer(Modifier.height(2.dp))
                        Text("Add More", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                    }
                }
            }
        }
        Text(
            "${uris.size}/${maxImages} photos added",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Surface(
            shape = RoundedCornerShape(12.dp),
            color = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.5f),
            modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
        ) {
            Row(
                Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text("💡", fontSize = 16.sp)
                Text(
                    "First photo is your cover. High-resolution photos from 3+ angles sell 4x faster!",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onTertiaryContainer,
                )
            }
        }
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
            .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f))
            .border(1.5.dp, MaterialTheme.colorScheme.outlineVariant, RoundedCornerShape(16.dp))
            .clickable { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Default.AddAPhoto, null, tint = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.size(28.dp))
            }
            Spacer(Modifier.height(10.dp))
            Text("Tap to Add Product Photos", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurface)
            Spacer(Modifier.height(2.dp))
            Text(
                if (maxImages <= 1) "1 photo included (Gold/Premium get 10)" else "Select up to $maxImages photos",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

// ── Price field with ₹ prefix ───────────────────────────────────────────────

@Composable
private fun PriceField(
    value: String,
    onValueChange: (String) -> Unit,
    onFocusChanged: (Boolean) -> Unit,
    error: String?,
) {
    Column {
        Text("Selling Price", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
        Spacer(Modifier.height(4.dp))
        OutlinedTextField(
            value = value,
            onValueChange = { newVal ->
                if (newVal.isEmpty() || newVal.matches(Regex("^\\d*\\.?\\d{0,2}$"))) {
                    onValueChange(newVal)
                }
            },
            modifier = Modifier
                .fillMaxWidth()
                .onFocusChanged { onFocusChanged(it.isFocused) }
                .then(rememberBringIntoViewOnFocusModifier()),
            label = { Text("Price (₹)") },
            placeholder = { Text("0") },
            leadingIcon = { Text("₹", fontWeight = FontWeight.Black, fontSize = 18.sp, color = Color(0xFF059669), modifier = Modifier.padding(start = 12.dp, end = 4.dp)) },
            isError = error != null,
            singleLine = true,
            textStyle = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
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
            Text(label, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
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
            modifier = Modifier
                .fillMaxWidth()
                .onFocusChanged { onFocusChanged(it.isFocused) }
                .then(rememberBringIntoViewOnFocusModifier()),
            label = { Text(label) },
            placeholder = { Text(placeholder, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)) },
            leadingIcon = { Icon(leadingIcon, null, modifier = Modifier.size(18.dp)) },
            isError = error != null,
            singleLine = true,
            textStyle = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
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
            modifier = Modifier
                .fillMaxWidth()
                .then(
                    if (onFocusChanged != null) Modifier.onFocusChanged { onFocusChanged(it.isFocused) }
                    else Modifier
                )
                .then(rememberBringIntoViewOnFocusModifier()),
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
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 2.dp,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
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
                .size(34.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center,
        ) {
            Icon(icon, null, tint = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.size(18.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column {
            Text(title, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyLarge)
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

// ── Category Emoji resolver ────────────────────────────────────────────────

private fun categoryEmoji(name: String): String = when {
    name.contains("mobile", true) || name.contains("phone", true) -> "📱"
    name.contains("electron", true) -> "💻"
    name.contains("vehicle", true) || name.contains("car", true) -> "🚗"
    name.contains("bike", true) || name.contains("motor", true) -> "🏍️"
    name.contains("fashion", true) || name.contains("cloth", true) || name.contains("apparel", true) -> "👗"
    name.contains("furniture", true) || name.contains("home", true) -> "🛋️"
    name.contains("appliance", true) -> "🔌"
    name.contains("book", true) -> "📚"
    name.contains("toy", true) -> "🧸"
    name.contains("sport", true) -> "⚽"
    name.contains("watch", true) -> "⌚"
    name.contains("game", true) || name.contains("gaming", true) -> "🎮"
    name.contains("beauty", true) -> "💄"
    name.contains("grocery", true) || name.contains("food", true) -> "🛒"
    name.contains("gadget", true) -> "⌚"
    name.contains("job", true) || name.contains("service", true) -> "🛠️"
    else -> "📦"
}

// ── Location Helpers ────────────────────────────────────────────────────────

private suspend fun fetchCurrentLocation(context: Context): android.location.Location? =
    withContext(Dispatchers.IO) {
        try {
            val fusedClient = com.google.android.gms.location.LocationServices.getFusedLocationProviderClient(context)
            val locationTask = fusedClient.lastLocation
            com.google.android.gms.tasks.Tasks.await(locationTask, 8, java.util.concurrent.TimeUnit.SECONDS)
        } catch (_: Exception) {
            null
        }
    }

private suspend fun reverseGeocodeCityState(context: Context, latitude: Double, longitude: Double): String? =
    withContext(Dispatchers.IO) {
        runCatching {
            val addresses = Geocoder(context, Locale.getDefault()).getFromLocation(latitude, longitude, 1)
            val a = addresses?.firstOrNull() ?: return@withContext null
            val city = a.locality ?: a.subLocality ?: a.subAdminArea
            val state = a.adminArea
            listOfNotNull(city, state).distinct().joinToString(", ").ifBlank { null }
        }.getOrNull()
    }
