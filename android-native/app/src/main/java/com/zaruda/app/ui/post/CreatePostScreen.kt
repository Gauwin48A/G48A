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
import androidx.compose.foundation.ExperimentalFoundationApi
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
import androidx.compose.material.icons.filled.Title
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
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.zaruda.app.domain.model.Category
import com.zaruda.app.ui.common.InputValidators
import com.zaruda.app.ui.components.ErrorBanner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.text.NumberFormat
import java.util.Locale
import kotlin.coroutines.resume

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

    // Wizard step state
    var currentStep by rememberSaveable { mutableStateOf(1) }
    var stepError by remember { mutableStateOf<String?>(null) }
    var detectingLocation by remember { mutableStateOf(false) }

    // Scroll state — reset to top whenever the step changes so users always
    // land on the step's first section instead of a stale scroll offset.
    val scrollState = rememberScrollState()
    LaunchedEffect(currentStep) { scrollState.animateScrollTo(0) }

    // Focus / touched tracking for validation-on-blur
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
        if (granted) {
            detectLocation()
        } else if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
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
    val descError = if (descTouched && description.isNotBlank() && description.length < 20) "At least 20 characters" else null
    val categoryError = if (titleTouched && state.selectedCategory == null && title.isNotBlank()) "Select a category" else null
    val subcategoryError = if (state.selectedCategory != null && state.selectedSubcategory == null && titleTouched) "Select a subcategory" else null
    val imageError = if (state.imageUris.isEmpty() && titleTouched && title.isNotBlank()) "Add at least one photo" else null
    val contactError = if (state.contactNumber.isNotBlank() && !InputValidators.isValidIndianMobile(state.contactNumber)) {
        "Enter a valid 10-digit mobile number"
    } else null

    // ── Per-step gating ─────────────────────────────────────────────────
    fun stepGate(step: Int): String? = when (step) {
        1 -> if (state.imageUris.isEmpty()) "Add at least one photo to continue." else null
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

    /** Jump back to an already-completed step (tappable step indicator). */
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
                        Text(
                            when (currentStep) {
                                1 -> "Photos"
                                2 -> "Choose your category"
                                3 -> "Describe your item"
                                4 -> "Price, location & contact"
                                else -> "Review & publish"
                            },
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
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
        Box(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .imePadding(),
        ) {

            // ═════════════════════════════════════════════════════════════
            // Daily / listing limit dialog — shown when the server rejects a
            // publish because the user hit their plan's per-day or active-
            // listing cap. Explains the cap instead of a terse inline banner.
            // ═════════════════════════════════════════════════════════════
            val limitError = state.error?.takeIf {
                it.contains("Daily limit", ignoreCase = true) || it.contains("Listing limit", ignoreCase = true)
            }
            if (limitError != null) {
                AlertDialog(
                    onDismissRequest = { viewModel.clearError() },
                    icon = { Text("⏱️", fontSize = 28.sp) },
                    title = { Text("Posting limit reached", fontWeight = FontWeight.Bold, fontSize = 18.sp) },
                    text = {
                        Text(
                            "${limitError}\n\nYour plan caps how many listings you can publish per day. The limit resets at midnight — or upgrade your plan to post more.",
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
                    dismissButton = {
                        TextButton(onClick = { viewModel.clearError() }) { Text("Upgrade Plan") }
                    },
                )
            }

            // ═════════════════════════════════════════════════════════════
            // Wizard content
            // ═════════════════════════════════════════════════════════════
            AnimatedContent(
                targetState = currentStep,
                transitionSpec = { (fadeIn(tween(260)) togetherWith fadeOut(tween(160))) },
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
                    Spacer(Modifier.height(0.dp))

                    // Suppress the inline banner for limit errors — those surface as a dialog above.
                    if (state.error?.contains("Daily limit", ignoreCase = true) != true &&
                        state.error?.contains("Listing limit", ignoreCase = true) != true
                    ) {
                        ErrorBanner(message = state.error)
                    }

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

                    // Step indicator (tap a completed step to jump back)
                    StepIndicator(
                        currentStep = step,
                        totalSteps = 5,
                        labels = listOf("Photos", "Category", "Details", "Price", "Publish"),
                        onStepClick = { target -> goToStep(target) },
                    )

                    // Per-step error
                    val gateError = if (step == currentStep) stepError else null
                    AnimatedVisibility(visible = gateError != null, enter = fadeIn(), exit = fadeOut()) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.errorContainer.copy(alpha = 0.6f),
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
                                )
                            }
                        }
                    }

                    when (step) {
                        // ── STEP 1: Photos & Voice note ─────────────────
                        1 -> {
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
                                    Text(imageError, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error,
                                        modifier = Modifier.padding(start = 4.dp, top = 4.dp))
                                }

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

                        }

                        // ── STEP 2: Category & Subcategory ───────────────
                        2 -> {
                            FormSectionCard {
                                SectionHeader(
                                    icon = Icons.Default.Category,
                                    title = "Category & Subcategory",
                                    subtitle = "Select main category and specific subcategory for your item",
                                )
                                Spacer(Modifier.height(12.dp))

                                // Searchable category cards
                                val filteredCategories = remember(state.categories, categorySearch) {
                                    if (categorySearch.isBlank()) state.categories
                                    else state.categories.filter { it.displayName.contains(categorySearch, ignoreCase = true) }
                                }

                                OutlinedTextField(
                                    value = categorySearch,
                                    onValueChange = { categorySearch = it },
                                    modifier = Modifier.fillMaxWidth().then(rememberBringIntoViewOnFocusModifier()),
                                    label = { Text("Search category") },
                                    placeholder = { Text("e.g., Mobiles, Vehicles, Fashion…") },
                                    leadingIcon = { Icon(Icons.Default.Category, null, modifier = Modifier.size(18.dp)) },
                                    singleLine = true,
                                    shape = RoundedCornerShape(14.dp),
                                    colors = FormFieldColors(),
                                )
                                Spacer(Modifier.height(12.dp))

                                if (state.categories.isEmpty() && state.categoriesLoading) {
                                    Row(
                                        Modifier.fillMaxWidth().padding(vertical = 8.dp),
                                        horizontalArrangement = Arrangement.Center,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                                        Spacer(Modifier.width(10.dp))
                                        Text("Loading categories…", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                } else if (state.categories.isEmpty()) {
                                    Row(
                                        Modifier.fillMaxWidth().padding(vertical = 8.dp),
                                        horizontalArrangement = Arrangement.Center,
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text("Couldn't load categories. Check your connection.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                                    Text(categoryError, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error,
                                        modifier = Modifier.padding(start = 4.dp, top = 4.dp))
                                }
                            }

                            // Subcategory chips (animated reveal)
                            AnimatedVisibility(visible = state.selectedCategory != null, enter = fadeIn(), exit = fadeOut()) {
                                FormSectionCard {
                                    SectionHeader(
                                        icon = Icons.Default.Category,
                                        title = "Subcategory",
                                        subtitle = state.selectedCategory?.displayName,
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
                                            Text("Couldn't load subcategories.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                                        Text(subcategoryError, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error,
                                            modifier = Modifier.padding(start = 4.dp, top = 4.dp))
                                    }
                                }
                            }
                        }

                        // ── STEP 3: Details ──────────────────────────────
                        3 -> {
                            FormSectionCard {
                                SectionHeader(icon = Icons.Default.Description, title = "Listing Details")
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

                                // Brand + Model row
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
                                        placeholder = { Text("iPhone 14") },
                                        singleLine = true,
                                        shape = RoundedCornerShape(14.dp),
                                        colors = FormFieldColors(),
                                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                                    )
                                }

                                Spacer(Modifier.height(16.dp))
                                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                Spacer(Modifier.height(16.dp))

                                // Condition chips
                                Text("Condition", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(Modifier.height(8.dp))
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    CreatePostState.CONDITIONS.forEach { c ->
                                        val selected = state.condition == c
                                        FilterChip(
                                            selected = selected,
                                            onClick = { viewModel.selectCondition(c) },
                                            label = { Text(c, fontSize = 13.sp) },
                                            leadingIcon = if (selected) {{ Icon(Icons.Filled.Check, null, Modifier.size(16.dp)) }} else null,
                                            shape = RoundedCornerShape(20.dp),
                                            colors = FilterChipDefaults.filterChipColors(
                                                selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
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
                                Spacer(Modifier.height(16.dp))

                                // Age chips
                                Text("Item Age", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(Modifier.height(8.dp))
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    val ageOptions = listOf(0, 1, 3, 6, 12, 24, 36, 60, 120)
                                    ageOptions.forEach { months ->
                                        val label = when (months) {
                                            0 -> "New"
                                            1 -> "1m"
                                            3 -> "3m"
                                            6 -> "6m"
                                            12 -> "1y"
                                            24 -> "2y"
                                            36 -> "3y"
                                            60 -> "5y"
                                            120 -> "10y+"
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
                                Spacer(Modifier.height(16.dp))

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
                        }

                        // ── STEP 4: Price, Location, Contact, Flash Sale ─
                        4 -> {
                            FormSectionCard {
                                SectionHeader(icon = Icons.Default.PriceChange, title = "Pricing")
                                Spacer(Modifier.height(16.dp))

                                PriceField(
                                    value = priceText,
                                    onValueChange = { priceText = it; viewModel.clearError() },
                                    onFocusChanged = { focused -> if (!focused) priceTouched = true },
                                    error = priceError,
                                )

                                // Quick price suggestions — one tap to set a common price.
                                // Strip commas so parsePositiveAmount (toDoubleOrNull) accepts them.
                                Spacer(Modifier.height(10.dp))
                                QuickPriceChips(
                                    current = priceText,
                                    onPick = { priceText = it.replace(",", ""); priceTouched = true; viewModel.clearError() },
                                )

                                val priceNum = InputValidators.parsePositiveAmount(priceText)
                                if (priceNum != null && priceNum > 0) {
                                    Spacer(Modifier.height(12.dp))
                                    Surface(
                                        shape = RoundedCornerShape(12.dp),
                                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                                        modifier = Modifier.fillMaxWidth(),
                                        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                    ) {
                                        Column(Modifier.padding(12.dp)) {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                Text("📊", fontSize = 16.sp)
                                                Text("Zaruda Price Intelligence", style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
                                            }
                                            Spacer(Modifier.height(12.dp))
                                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                // Fast Sale
                                                Column(Modifier.weight(1f).clip(RoundedCornerShape(8.dp)).background(Color(0xFFDCFCE7).copy(alpha = 0.8f)).padding(8.dp)) {
                                                    Text("🟢 Fast Sale", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF166534))
                                                    Text("₹${String.format(Locale.ENGLISH, "%,.0f", priceNum * 0.85)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF166534))
                                                    Text("24-48 hrs", fontSize = 9.sp, color = Color(0xFF166534).copy(alpha = 0.8f))
                                                }
                                                // Fair Market
                                                Column(Modifier.weight(1f).clip(RoundedCornerShape(8.dp)).background(Color(0xFFDBEAFE).copy(alpha = 0.8f)).padding(8.dp)) {
                                                    Text("🔵 Fair Market", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF1E40AF))
                                                    Text("₹${String.format(Locale.ENGLISH, "%,.0f", priceNum)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1E40AF))
                                                    Text("Balanced", fontSize = 9.sp, color = Color(0xFF1E40AF).copy(alpha = 0.8f))
                                                }
                                                // High Range
                                                Column(Modifier.weight(1f).clip(RoundedCornerShape(8.dp)).background(Color(0xFFFFEDD5).copy(alpha = 0.8f)).padding(8.dp)) {
                                                    Text("🟠 High Range", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color(0xFF9A3412))
                                                    Text("₹${String.format(Locale.ENGLISH, "%,.0f", priceNum * 1.2)}", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = Color(0xFF9A3412))
                                                    Text("2+ weeks", fontSize = 9.sp, color = Color(0xFF9A3412).copy(alpha = 0.8f))
                                                }
                                            }
                                        }
                                    }
                                }

                                if (state.isNegotiable && priceText.isNotBlank() && InputValidators.parsePositiveAmount(priceText) != null) {
                                    Spacer(Modifier.height(6.dp))
                                    Surface(
                                        shape = RoundedCornerShape(10.dp),
                                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.08f),
                                        modifier = Modifier.fillMaxWidth(),
                                    ) {
                                        Row(
                                            Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        ) {
                                            Icon(Icons.Default.Sell, null, Modifier.size(14.dp), tint = MaterialTheme.colorScheme.primary)
                                            Text(
                                                "₹${priceText.trim()} or Best Offer",
                                                style = MaterialTheme.typography.labelMedium,
                                                fontWeight = FontWeight.SemiBold,
                                                color = MaterialTheme.colorScheme.primary,
                                            )
                                        }
                                    }
                                }

                                Spacer(Modifier.height(8.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        Icon(Icons.Default.Sell, null, tint = if (state.isNegotiable) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                                        Column {
                                            Text("Price Negotiable", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                            Text("Buyers can make offers", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                                    title = "Location",
                                    subtitle = "Buyers filter listings by city",
                                )
                                Spacer(Modifier.height(12.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text("Item location", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                                        Text(if (detectingLocation) "Detecting…" else "Detect my location", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                    }
                                }
                                Spacer(Modifier.height(4.dp))
                                FormTextField(
                                    value = location,
                                    onValueChange = { location = it },
                                    label = "Location",
                                    placeholder = "City, State",
                                    leadingIcon = Icons.Default.LocationOn,
                                    imeAction = ImeAction.Done,
                                )
                                Spacer(Modifier.height(8.dp))
                                Text(
                                    "We'll show your city on the listing — never your exact address.",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }

                            FormSectionCard {
                                SectionHeader(icon = Icons.Default.Phone, title = "Contact Information")
                                Spacer(Modifier.height(16.dp))

                                Text("Contact Number", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                Spacer(Modifier.height(4.dp))
                                OutlinedTextField(
                                    value = state.contactNumber,
                                    onValueChange = { viewModel.setContactNumber(it) },
                                    modifier = Modifier.fillMaxWidth().then(rememberBringIntoViewOnFocusModifier()),
                                    label = { Text("Phone (required)") },
                                    placeholder = { Text("98765 43210") },
                                    leadingIcon = { Text("+91", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant) },
                                    singleLine = true,
                                    textStyle = MaterialTheme.typography.bodyMedium,
                                    shape = RoundedCornerShape(14.dp),
                                    colors = FormFieldColors(),
                                    isError = contactError != null,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Done),
                                    supportingText = {
                                        Text(
                                            if (contactError != null) contactError
                                            else "Buyers will see this number on your listing",
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
                                                .size(34.dp)
                                                .clip(RoundedCornerShape(10.dp))
                                                .background(Color(0xFFFFF3E0)),
                                            contentAlignment = Alignment.Center,
                                        ) {
                                            Icon(Icons.Default.Bolt, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(18.dp))
                                        }
                                        Column {
                                            Text("Flash Sale Highlight", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                                            Text("Highlight this listing as an urgent deal", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                    }
                                    Switch(
                                        checked = state.flashSale,
                                        onCheckedChange = { viewModel.setFlashSale(it) },
                                    )
                                }
                            }
                        }

                        // ── STEP 5: Preview & Publish ────────────────────
                        else -> {
                            // Readiness checklist — what's missing before publishing
                            val hasPhoto = state.imageUris.isNotEmpty()
                            val hasCategory = state.selectedCategory != null && state.selectedSubcategory != null
                            val hasTitle = title.isNotBlank() && InputValidators.isValidTitle(title)
                            val hasCondition = state.condition != null
                            val hasPrice = priceText.isNotBlank() && InputValidators.parsePositiveAmount(priceText) != null || state.isNegotiable
                            val hasContact = state.contactNumber.isNotBlank() && InputValidators.isValidIndianMobile(state.contactNumber)
                            ListingReadinessCard(
                                checks = listOf(
                                    "Add at least one photo" to hasPhoto,
                                    "Choose a category & subcategory" to hasCategory,
                                    "Write a clear title" to hasTitle,
                                    "Select item condition" to hasCondition,
                                    "Set a price (or mark negotiable)" to hasPrice,
                                    "Add your 10-digit contact number" to hasContact,
                                ),
                            )

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

                            // Upload progress
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
                                                state.uploading -> "Uploading images…"
                                                else -> "Publishing listing…"
                                            },
                                            color = MaterialTheme.colorScheme.onSecondaryContainer,
                                        )
                                    }
                                }
                            }

                            Text(
                                "By publishing you agree buyers may contact you on the number shown.",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.fillMaxWidth(),
                            )
                        }
                    }

                    Spacer(Modifier.height(8.dp))
                }
            }

            // ═════════════════════════════════════════════════════════════
            // Bottom wizard navigation
            // ═════════════════════════════════════════════════════════════
            Surface(
                modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth(),
                color = MaterialTheme.colorScheme.surface,
                shadowElevation = 8.dp,
                tonalElevation = 2.dp,
            ) {
                Column(Modifier.fillMaxWidth()) {
                    // Thin progress accent above the action row
                    LinearProgressIndicator(
                        progress = { (currentStep - 1) / 4f },
                        modifier = Modifier.fillMaxWidth().height(3.dp),
                        color = MaterialTheme.colorScheme.primary,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant,
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        OutlinedButton(
                            onClick = { goBack() },
                            enabled = currentStep > 1 && !state.uploading && !state.submitting,
                            shape = RoundedCornerShape(12.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onSurfaceVariant),
                        ) {
                            Text("← Back", fontWeight = FontWeight.Bold)
                        }

                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                "Step $currentStep of 5",
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.ExtraBold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Text(
                                listOf("Photos", "Category", "Details", "Price", "Publish")[currentStep - 1],
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }

                        if (currentStep < 5) {
                            Button(
                                onClick = { goNext() },
                                enabled = !state.uploading && !state.submitting,
                                shape = RoundedCornerShape(12.dp),
                                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp),
                            ) {
                                Text("Next →", fontWeight = FontWeight.Bold)
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
                                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = MaterialTheme.colorScheme.primary,
                                    contentColor = MaterialTheme.colorScheme.onPrimary,
                                ),
                            ) {
                                Text("🚀 Publish", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
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
    onStepClick: (Int) -> Unit = {},
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 1.dp,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(horizontal = 14.dp, vertical = 12.dp)) {
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
                                        isDone -> Color(0xFF34D399)
                                        else -> MaterialTheme.colorScheme.surfaceVariant
                                    }
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            if (isDone) {
                                Icon(Icons.Default.Check, null, Modifier.size(14.dp), tint = Color.White)
                            } else {
                                Text(
                                    "$stepNum",
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isActive) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                        Spacer(Modifier.height(4.dp))
                        Text(
                            label,
                            fontSize = 9.sp,
                            fontWeight = if (isActive) FontWeight.Bold else FontWeight.Medium,
                            color = if (isActive) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                        )
                    }
                    if (idx < totalSteps - 1) {
                        Box(
                            Modifier
                                .weight(0.35f)
                                .height(2.dp)
                                .clip(RoundedCornerShape(1.dp))
                                .background(if (stepNum <= currentStep - 1) Color(0xFF34D399) else MaterialTheme.colorScheme.surfaceVariant),
                        )
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { (currentStep - 1) / (totalSteps - 1f) },
                modifier = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant,
            )
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
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        categories.forEach { cat ->
            val isSelected = selected?.stableId == cat.stableId
            Column(
                modifier = Modifier
                    .clip(RoundedCornerShape(14.dp))
                    .background(
                        if (isSelected) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                        else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.35f)
                    )
                    .border(
                        width = 1.5.dp,
                        color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
                        shape = RoundedCornerShape(14.dp),
                    )
                    .clickable { onSelect(cat) }
                    .padding(horizontal = 14.dp, vertical = 10.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(categoryEmoji(cat.displayName), fontSize = 22.sp)
                Spacer(Modifier.height(4.dp))
                Text(
                    cat.displayName,
                    fontSize = 12.sp,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                    color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                )
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
                label = { Text(sub.displayName, fontSize = 13.sp) },
                leadingIcon = if (isSelected) {{ Icon(Icons.Filled.Check, null, Modifier.size(15.dp)) }} else null,
                shape = RoundedCornerShape(18.dp),
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
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
    val suggestions = listOf("499", "999", "1,499", "2,999", "4,999", "9,999", "14,999", "29,999")
    Column {
        Text(
            "Quick prices",
            style = MaterialTheme.typography.labelSmall,
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
                    label = { Text("₹$s", fontSize = 12.sp, fontWeight = FontWeight.SemiBold) },
                    leadingIcon = if (selected) {{ Icon(Icons.Default.Check, null, Modifier.size(14.dp)) }} else null,
                    shape = RoundedCornerShape(16.dp),
                    colors = AssistChipDefaults.assistChipColors(
                        containerColor = if (selected) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f)
                        else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                        labelColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                    ),
                    border = AssistChipDefaults.assistChipBorder(
                        borderColor = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.outlineVariant,
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
        tonalElevation = 0.5.dp,
        shadowElevation = 2.dp,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text("Listing readiness", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleSmall)
                    Text(
                        "$doneCount of ${checks.size} complete",
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
                            "Ready to publish",
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
                            .size(22.dp)
                            .clip(CircleShape)
                            .background(if (ok) Color(0xFFDCFCE7) else MaterialTheme.colorScheme.surfaceVariant),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (ok) {
                            Icon(Icons.Default.Check, null, Modifier.size(13.dp), tint = Color(0xFF16A34A))
                        } else {
                            Text("•", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                    Text(
                        label,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = if (ok) FontWeight.Medium else FontWeight.Normal,
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
        shape = RoundedCornerShape(20.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
        shadowElevation = 4.dp,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                "Live preview — what buyers see",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.Top,
            ) {
                Box(
                    modifier = Modifier
                        .size(92.dp)
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
                            Icon(Icons.Default.AddAPhoto, null, Modifier.size(22.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.height(4.dp))
                            Text("No photo", fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    category?.let {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.align(Alignment.TopStart).padding(6.dp),
                        ) {
                            Text(it, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                }

                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        title.ifBlank { listOf(brand, model).filter { it.isNotBlank() }.joinToString(" ").ifBlank { "Your listing title" } },
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.ExtraBold,
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
                            condition?.let { "Condition: $it" },
                            location.ifBlank { null }?.let { "📍 $it" },
                            negotiable.takeIf { it }?.let { "₹ Negotiable" },
                            flashSale.takeIf { it }?.let { "⚡ Flash Sale" },
                        ).forEach { chip ->
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                            ) {
                                Text(chip, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
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
                Icon(Icons.Default.CheckCircle, null, Modifier.size(14.dp), tint = Color(0xFF16A34A))
                Text(
                    "$imageCount photo(s) · listed by a verified seller",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
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
                        .width(110.dp)
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
                            .background(Color.Black.copy(alpha = 0.55f)),
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
                            color = Color(0xFFFFD700).copy(alpha = 0.9f),
                            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 4.dp)
                        ) {
                            Text("⭐ Cover", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.Black, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    } else if (onMakeCoverClick != null) {
                        Surface(
                            shape = RoundedCornerShape(10.dp),
                            color = Color.Black.copy(alpha = 0.7f),
                            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 4.dp).clickable { onMakeCoverClick(idx) }
                        ) {
                            Text("Make Cover", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = Color.White, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                        }
                    }
                }
            }
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
                        Icon(Icons.Default.AddCircle, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(24.dp))
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
        Surface(
            shape = RoundedCornerShape(10.dp),
            color = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = 0.5f),
            modifier = Modifier.fillMaxWidth().padding(top = 4.dp)
        ) {
            Row(
                Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text("💡", fontSize = 16.sp)
                Text("Tip: First photo is your listing's cover. Photos from 3+ angles with clear lighting sell 4x faster!",
                    style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onTertiaryContainer)
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
            modifier = Modifier
                .fillMaxWidth()
                .onFocusChanged { onFocusChanged(it.isFocused) }
                .then(rememberBringIntoViewOnFocusModifier()),
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

// ═════════════════════════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════════════════════════

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

/** Fetch the device location — last known first, single-update as a fallback. */
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

/** Reverse-geocode coordinates into a "City, State" label (best effort). */
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
