package com.zaruda.app.ui.profile
import com.zaruda.app.ui.theme.ColorTokens

import androidx.compose.ui.draw.alpha
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.zaruda.app.domain.model.User

// ─── Common Marketplace Categories ─────────────────────────────────────
val marketplaceCategories = listOf(
    "Vehicles", "Electronics", "Property", "Jobs",
    "Services", "Fashion", "Books", "Furniture",
    "Pets", "Sports", "Food", "Education",
    "Beauty", "Music", "Garden", "Toys"
)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun EditProfileScreen(
    user: User?,
    saving: Boolean,
    saveError: String?,
    initialLocation: String = "",
    initialMinPrice: Int? = null,
    initialMaxPrice: Int? = null,
    initialCategories: List<String> = emptyList(),
    onDismiss: () -> Unit,
    onSave: (fullName: String?, phone: String?, bio: String?, location: String?,
             socialLinks: Map<String, String>?, minPrice: Int?, maxPrice: Int?,
             categories: List<String>?) -> Unit,
    onUploadAvatar: (Uri) -> Unit,
    onUploadCover: (Uri) -> Unit,
) {
    val focusManager = LocalFocusManager.current
    val darkTheme = ColorTokens.isDarkTheme()
    val scrollState = rememberScrollState()

    // ── Form State ──
    var name by remember(user) { mutableStateOf(user?.displayName ?: "") }
    var phone by remember(user) { mutableStateOf(user?.phone ?: "") }
    var bio by remember(user) { mutableStateOf(user?.bio ?: "") }
    var location by remember(initialLocation) { mutableStateOf(initialLocation) }
    var minPrice by remember(initialMinPrice) { mutableStateOf(initialMinPrice?.toString() ?: "") }
    var maxPrice by remember(initialMaxPrice) { mutableStateOf(initialMaxPrice?.toString() ?: "") }
    var selectedCategories by remember(initialCategories) {
        mutableStateOf(initialCategories.toMutableList())
    }
    var twitterHandle by remember(user) {
        mutableStateOf((user?.socialLinks?.get("twitter") ?: "").removePrefix("@"))
    }
    var instagramHandle by remember(user) {
        mutableStateOf((user?.socialLinks?.get("instagram") ?: "").removePrefix("@"))
    }
    var linkedinHandle by remember(user) {
        mutableStateOf((user?.socialLinks?.get("linkedin") ?: "").removePrefix("in/"))
    }

    // ── Success State ──
    var showSuccess by remember { mutableStateOf(false) }
    LaunchedEffect(saveError) { if (saveError == null && !saving && showSuccess) {
        kotlinx.coroutines.delay(1500)
        showSuccess = false
        onDismiss()
    }}

    // ── Validation ──
    val nameError = when {
        name.isBlank() -> "Name is required"
        name.length < 2 -> "Must be at least 2 characters"
        name.length > 60 -> "Must be under 60 characters"
        else -> null
    }
    val phoneError = when {
        phone.isNotBlank() && phone.length < 10 -> "Enter a valid 10-digit number"
        phone.length > 20 -> "Phone number too long"
        else -> null
    }
    val bioError = if (bio.length > 500) "Bio must be under 500 characters" else null
    val minPriceError = if (minPrice.isNotBlank() && minPrice.toIntOrNull() == null) "Invalid number" else null
    val maxPriceError = if (maxPrice.isNotBlank() && maxPrice.toIntOrNull() == null) "Invalid number" else null

    val hasChanges = hasProfileChanges(name, phone, bio, location, twitterHandle,
        instagramHandle, linkedinHandle, minPrice, maxPrice, selectedCategories,
        user, initialLocation, initialMinPrice, initialMaxPrice, initialCategories)

    val isValid = nameError == null && phoneError == null && bioError == null

    val completionScore = listOf(
        name.isNotBlank() && name.length >= 2,
        phone.isNotBlank() && phone.length >= 10,
        bio.isNotBlank(), location.isNotBlank(),
        selectedCategories.isNotEmpty(), minPrice.isNotBlank(),
    ).count { it }

    // ── Discard Dialog ──
    var showDiscardDialog by remember { mutableStateOf(false) }
    if (showDiscardDialog) {
        AlertDialog(
            onDismissRequest = { showDiscardDialog = false },
            icon = { Icon(Icons.Default.Info, null, tint = MaterialTheme.colorScheme.primary) },
            title = { Text("Discard changes?", fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("You have unsaved changes that will be lost:",
                        fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            },
            confirmButton = {
                TextButton(onClick = { showDiscardDialog = false; onDismiss() }) {
                    Text("Discard", color = MaterialTheme.colorScheme.error,
                        fontWeight = FontWeight.SemiBold)
                }
            },
            dismissButton = {
                Button(onClick = { showDiscardDialog = false }) {
                    Text("Keep editing")
                }
            },
        )
    }

    // ── Image Picker ──
    var showImagePickerSheet by remember { mutableStateOf(false) }
    var imagePickerTarget by remember { mutableStateOf("") }
    val avatarPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri -> uri?.let { onUploadAvatar(it) }; showImagePickerSheet = false }
    val coverPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri -> uri?.let { onUploadCover(it) }; showImagePickerSheet = false }

    // ── Image Picker Sheet ──
    if (showImagePickerSheet) {
        ModalBottomSheet(
            onDismissRequest = { showImagePickerSheet = false },
            shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
                    .padding(bottom = 40.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    if (imagePickerTarget == "avatar") "Change Profile Photo" else "Change Cover Photo",
                    fontWeight = FontWeight.Bold, fontSize = 18.sp,
                )
                Spacer(Modifier.height(4.dp))
                ImagePickerOption(
                    icon = Icons.Default.PhotoLibrary,
                    title = "Choose from Gallery",
                    subtitle = "Browse your photo library",
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    iconTint = MaterialTheme.colorScheme.primary,
                    onClick = {
                        if (imagePickerTarget == "avatar") avatarPicker.launch("image/*")
                        else coverPicker.launch("image/*")
                    }
                )
                ImagePickerOption(
                    icon = Icons.Default.CameraAlt,
                    title = "Take a Photo",
                    subtitle = "Use your camera",
                    containerColor = MaterialTheme.colorScheme.secondaryContainer,
                    iconTint = MaterialTheme.colorScheme.secondary,
                    onClick = {
                        if (imagePickerTarget == "avatar") avatarPicker.launch("image/*")
                        else coverPicker.launch("image/*")
                    }
                )
                Spacer(Modifier.height(8.dp))
                TextButton(
                    onClick = { showImagePickerSheet = false },
                    modifier = Modifier.align(Alignment.CenterHorizontally)
                ) { Text("Cancel", fontWeight = FontWeight.Medium) }
            }
        }
    }

    // ── Build links helper ──
    fun buildLinks(): Map<String, String>? {
        val links = mutableMapOf<String, String>()
        if (twitterHandle.isNotBlank()) links["twitter"] = "@${twitterHandle.trim().removePrefix("@")}"
        if (instagramHandle.isNotBlank()) links["instagram"] = "@${instagramHandle.trim().removePrefix("@")}"
        if (linkedinHandle.isNotBlank()) links["linkedin"] = "in/${linkedinHandle.trim().removePrefix("in/")}"
        return if (links.isEmpty()) null else links
    }

    // ── Execute Save ──
    fun doSave() {
        focusManager.clearFocus()
        showSuccess = true
        onSave(
            name.trim().ifBlank { null },
            phone.trim().ifBlank { null },
            bio.trim().ifBlank { null },
            location.trim().ifBlank { null },
            buildLinks(),
            minPrice.toIntOrNull(),
            maxPrice.toIntOrNull(),
            if (selectedCategories.isEmpty()) null else selectedCategories.toList(),
        )
    }

    // ── Layout ──
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Edit Profile", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        AnimatedContent(targetState = saving || showSuccess,
                            label = "savingState") { loading ->
                            when {
                                loading && saving -> Text("Saving\u2026", fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.primary)
                                showSuccess && !saving -> Text("Saved!",
                                    fontSize = 11.sp, color = Color(0xFF22C55E))
                            }
                        }
                    }
                },
                navigationIcon = {
                    IconButton(
                        onClick = { if (hasChanges && !saving && !showSuccess)
                            showDiscardDialog = true else onDismiss() }
                    ) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
                },
                actions = {
                    AnimatedVisibility(
                        visible = hasChanges && isValid && !saving && !showSuccess,
                        enter = fadeIn() + expandHorizontally(),
                        exit = fadeOut() + shrinkHorizontally()
                    ) {
                        TextButton(onClick = { doSave() }, enabled = !saving) {
                            Icon(Icons.Default.CheckCircle, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Save", fontWeight = FontWeight.Bold)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface
                ),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(scrollState)
                .navigationBarsPadding()
                .imePadding()
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Spacer(Modifier.height(4.dp))

            // ─── Success Banner ──────────────────────────────────
            AnimatedVisibility(
                visible = showSuccess && !saving,
                enter = fadeIn() + expandVertically(expandFrom = Alignment.Top),
                exit = fadeOut() + shrinkVertically(shrinkTowards = Alignment.Top),
            ) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFFF0FDF4),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF22C55E),
                            modifier = Modifier.size(20.dp))
                        Text("Profile updated successfully!",
                            color = Color(0xFF166534), fontSize = 13.sp,
                            modifier = Modifier.weight(1f))
                    }
                }
            }

            // ─── Error Banner ────────────────────────────────────
            AnimatedVisibility(
                visible = saveError != null && !showSuccess,
                enter = fadeIn() + expandVertically(expandFrom = Alignment.Top),
                exit = fadeOut() + shrinkVertically(shrinkTowards = Alignment.Top),
            ) {
                saveError?.let { error ->
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = Color(0xFFFEF2F2),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Icon(Icons.Default.ErrorOutline, null, tint = Color(0xFFDC2626),
                                modifier = Modifier.size(20.dp))
                            Text(error, color = Color(0xFFDC2626), fontSize = 13.sp,
                                modifier = Modifier.weight(1f))
                        }
                    }
                }
            }

            // ─── Profile Preview ─────────────────────────────────
            ProfilePreviewCard(
                name = name,
                email = user?.email,
                avatar = user?.avatar,
                coverImage = user?.coverImage,
                completionScore = completionScore,
                darkTheme = darkTheme,
                onEditAvatar = {
                    imagePickerTarget = "avatar"
                    showImagePickerSheet = true
                },
                onEditCover = {
                    imagePickerTarget = "cover"
                    showImagePickerSheet = true
                },
            )

            // ─── Personal Information ────────────────────────────
            EditSection(
                title = "Personal Information",
                icon = Icons.Default.Person,
                accentColor = Color(0xFF6366F1),
                completionItems = listOf(
                    name.isNotBlank() && name.length >= 2,
                    phone.isNotBlank() && phone.length >= 10,
                ),
            ) {
                EnhancedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = "Full Name *",
                    placeholder = "Your full name",
                    error = nameError,
                    maxLength = 60,
                    leadingIcon = Icons.Default.Person,
                    imeAction = ImeAction.Next,
                    onNext = { focusManager.moveFocus(FocusDirection.Down) },
                    isRequired = true,
                )
                Spacer(Modifier.height(4.dp))
                EnhancedTextField(
                    value = phone,
                    onValueChange = { phone = it.filter { c -> c.isDigit() || c == '+' } },
                    label = "Phone Number",
                    placeholder = "+91 XXXXX XXXXX",
                    error = phoneError,
                    leadingIcon = Icons.Default.Phone,
                    keyboardType = KeyboardType.Phone,
                    imeAction = ImeAction.Next,
                    onNext = { focusManager.moveFocus(FocusDirection.Down) },
                )
                Spacer(Modifier.height(4.dp))
                // Email (read-only)
                OutlinedTextField(
                    value = user?.email ?: "",
                    onValueChange = {},
                    label = { Text("Email") },
                    readOnly = true, enabled = false, singleLine = true,
                    shape = RoundedCornerShape(16.dp),
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        disabledBorderColor = MaterialTheme.colorScheme.outline.copy(alpha = 0.3f),
                        disabledContainerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f),
                        disabledLabelColor = MaterialTheme.colorScheme.onSurfaceVariant,
                        disabledTextColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    ),
                    leadingIcon = { Icon(Icons.Default.Email, null, modifier = Modifier.size(18.dp)) },
                    trailingIcon = {
                        if (user?.isKycVerified == true) {
                            Surface(shape = RoundedCornerShape(8.dp),
                                color = Color(0xFF22C55E).copy(alpha = 0.12f)) {
                                Row(Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF22C55E),
                                        modifier = Modifier.size(12.dp))
                                    Text("Verified", fontSize = 11.sp, color = Color(0xFF22C55E),
                                        fontWeight = FontWeight.SemiBold)
                                }
                            }
                        }
                    },
                )
                Spacer(Modifier.height(4.dp))
                EnhancedTextField(
                    value = bio,
                    onValueChange = { if (it.length <= 500) bio = it },
                    label = "Bio",
                    placeholder = "Tell people about yourself\u2026",
                    error = bioError,
                    maxLength = 500,
                    minLines = 2, maxLines = 4,
                    leadingIcon = Icons.Default.Edit,
                    imeAction = ImeAction.Done,
                    onDone = { focusManager.clearFocus() },
                )
            }

            // ─── Location ────────────────────────────────────────
            EditSection(
                title = "Location",
                icon = Icons.Default.LocationOn,
                accentColor = Color(0xFF0EA5E9),
                completionItems = listOf(location.isNotBlank()),
            ) {
                EnhancedTextField(
                    value = location,
                    onValueChange = { location = it },
                    label = "City, State",
                    placeholder = "e.g. Mumbai, Maharashtra",
                    leadingIcon = Icons.Default.LocationOn,
                    imeAction = ImeAction.Next,
                    onNext = { focusManager.moveFocus(FocusDirection.Down) },
                    helperText = "Helps buyers find your listings nearby",
                )
            }

            // ─── Category Preferences ────────────────────────────
            CategorySelectionSection(
                selectedCategories = selectedCategories,
                onToggleCategory = { cat ->
                    selectedCategories = if (cat in selectedCategories)
                        selectedCategories.toMutableList().also { it.remove(cat) }
                    else selectedCategories.toMutableList().also { it.add(cat) }
                },
            )

            // ─── Price Preference ────────────────────────────────
            EditSection(
                title = "Price Range",
                icon = Icons.Default.Receipt,
                accentColor = Color(0xFF10B981),
                completionItems = listOf(minPrice.isNotBlank() || maxPrice.isNotBlank()),
            ) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = minPrice,
                        onValueChange = { minPrice = it.filter { c -> c.isDigit() } },
                        label = { Text("Min (\u20B9)") },
                        placeholder = { Text("0") },
                        isError = minPriceError != null,
                        supportingText = minPriceError?.let { { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 10.sp) } },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                        keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) }),
                        shape = RoundedCornerShape(16.dp), modifier = Modifier.weight(1f),
                        leadingIcon = { Text("\u20B9", fontWeight = FontWeight.Bold, fontSize = 14.sp) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFF10B981), cursorColor = Color(0xFF10B981),
                            focusedLeadingIconColor = Color(0xFF10B981),
                        ),
                    )
                    OutlinedTextField(
                        value = maxPrice,
                        onValueChange = { maxPrice = it.filter { c -> c.isDigit() } },
                        label = { Text("Max (\u20B9)") },
                        placeholder = { Text("100000") },
                        isError = maxPriceError != null,
                        supportingText = maxPriceError?.let { { Text(it, color = MaterialTheme.colorScheme.error, fontSize = 10.sp) } },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                        keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() }),
                        shape = RoundedCornerShape(16.dp), modifier = Modifier.weight(1f),
                        leadingIcon = { Text("\u20B9", fontWeight = FontWeight.Bold, fontSize = 14.sp) },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color(0xFF10B981), cursorColor = Color(0xFF10B981),
                            focusedLeadingIconColor = Color(0xFF10B981),
                        ),
                    )
                }
                Spacer(Modifier.height(4.dp))
                Text("Sets your preferred browsing range", fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            // ─── Social Links ────────────────────────────────────
            EditSection(
                title = "Social Links",
                icon = Icons.Default.Share,
                accentColor = Color(0xFFEC4899),
                completionItems = listOf(
                    twitterHandle.isNotBlank(), instagramHandle.isNotBlank(),
                    linkedinHandle.isNotBlank(),
                ),
            ) {
                SocialLinkField(
                    value = twitterHandle,
                    onValueChange = { twitterHandle = it.filter { c -> c.isLetterOrDigit() || c == '_' || c == '.' } },
                    label = "Twitter / X", placeholder = "username", prefix = "@",
                    accentColor = Color(0xFF1DA1F2),
                    onNext = { focusManager.moveFocus(FocusDirection.Down) },
                )
                Spacer(Modifier.height(4.dp))
                SocialLinkField(
                    value = instagramHandle,
                    onValueChange = { instagramHandle = it.filter { c -> c.isLetterOrDigit() || c == '_' || c == '.' } },
                    label = "Instagram", placeholder = "username", prefix = "@",
                    accentColor = Color(0xFFE4405F),
                    onNext = { focusManager.moveFocus(FocusDirection.Down) },
                )
                Spacer(Modifier.height(4.dp))
                SocialLinkField(
                    value = linkedinHandle,
                    onValueChange = { linkedinHandle = it.filter { c -> c.isLetterOrDigit() || c == '_' || c == '.' } },
                    label = "LinkedIn", placeholder = "username", prefix = "in/",
                    accentColor = Color(0xFF0A66C2),
                    onNext = { focusManager.clearFocus() },
                )
                Spacer(Modifier.height(4.dp))
                Text("Links appear on your public profile", fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant)
            }

            // ─── Save Button ──────────────────────────────────────
            Button(
                onClick = { doSave() },
                enabled = !saving && isValid && hasChanges && !showSuccess,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(20.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    disabledContainerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.3f),
                ),
                elevation = ButtonDefaults.buttonElevation(defaultElevation = 6.dp, pressedElevation = 12.dp),
            ) {
                AnimatedContent(targetState = saving || showSuccess, label = "saveBtn",
                    transitionSpec = {
                        fadeIn(tween(150)) + slideInVertically(tween(150)) { it } togetherWith
                        fadeOut(tween(150)) + slideOutVertically(tween(150)) { -it }
                    }
                ) { done ->
                    when {
                        saving -> {
                            CircularProgressIndicator(modifier = Modifier.size(22.dp),
                                strokeWidth = 2.5.dp, color = MaterialTheme.colorScheme.onPrimary)
                            Spacer(Modifier.width(12.dp))
                            Text("Saving\u2026", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                        }
                        showSuccess -> {
                            Icon(Icons.Default.CheckCircle, null, modifier = Modifier.size(22.dp))
                            Spacer(Modifier.width(10.dp))
                            Text("Saved!", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                        }
                        else -> {
                            Icon(Icons.Default.CheckCircle, null, modifier = Modifier.size(22.dp))
                            Spacer(Modifier.width(10.dp))
                            Text("Save Changes", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                        }
                    }
                }
            }
            Spacer(Modifier.height(40.dp))
        }
    }
}

// ─── Helper: Detect changes ───────────────────────────────────────────
private fun hasProfileChanges(
    name: String, phone: String, bio: String, location: String,
    twitterHandle: String, instagramHandle: String, linkedinHandle: String,
    minPrice: String, maxPrice: String, selectedCategories: List<String>,
    user: User?, initialLocation: String,
    initialMinPrice: Int?, initialMaxPrice: Int?,
    initialCategories: List<String>,
): Boolean {
    return name != (user?.displayName ?: "") ||
        phone != (user?.phone ?: "") ||
        bio != (user?.bio ?: "") ||
        location != initialLocation ||
        twitterHandle != (user?.socialLinks?.get("twitter") ?: "").removePrefix("@") ||
        instagramHandle != (user?.socialLinks?.get("instagram") ?: "").removePrefix("@") ||
        linkedinHandle != (user?.socialLinks?.get("linkedin") ?: "").removePrefix("in/") ||
        minPrice.toIntOrNull() != initialMinPrice ||
        maxPrice.toIntOrNull() != initialMaxPrice ||
        selectedCategories.toSet() != initialCategories.toSet()
}

// ─── Reusable Sub-Components ──────────────────────────────────────────

@Composable
private fun ImagePickerOption(
    icon: ImageVector,
    title: String,
    subtitle: String,
    containerColor: Color,
    iconTint: Color,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        color = containerColor,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Icon(icon, null, tint = iconTint, modifier = Modifier.size(24.dp))
            Column {
                Text(title, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                Text(subtitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun ProfilePreviewCard(
    name: String,
    email: String?,
    avatar: String?,
    coverImage: String?,
    completionScore: Int,
    darkTheme: Boolean,
    onEditAvatar: () -> Unit,
    onEditCover: () -> Unit,
) {
    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(6.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column {
            // Cover Image Area
            Box(modifier = Modifier.fillMaxWidth().height(120.dp)) {
                Box(
                    modifier = Modifier.fillMaxSize()
                        .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp))
                        .background(Brush.horizontalGradient(
                            if (darkTheme) listOf(Color(0xFF1E3A5F), Color(0xFF3B1F6E), Color(0xFF2D1B69))
                            else listOf(Color(0xFF0EA5E9), Color(0xFF6366F1), Color(0xFF8B5CF6))
                        ))
                ) {
                    coverImage?.let {
                        AsyncImage(model = it, contentDescription = "Cover",
                            contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    }
                    Box(modifier = Modifier.fillMaxSize().background(
                        Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.3f)))))
                }
                Surface(onClick = onEditCover, shape = RoundedCornerShape(10.dp),
                    color = Color.Black.copy(alpha = 0.35f),
                    modifier = Modifier.align(Alignment.TopEnd).padding(10.dp)) {
                    Row(Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Icon(Icons.Default.CameraAlt, null, tint = Color.White,
                            modifier = Modifier.size(14.dp))
                        Text("Edit Cover", color = Color.White, fontSize = 11.sp,
                            fontWeight = FontWeight.Medium)
                    }
                }
                Surface(shape = RoundedCornerShape(10.dp), color = Color.Black.copy(alpha = 0.4f),
                    modifier = Modifier.align(Alignment.TopStart).padding(10.dp)) {
                    Text("$completionScore/6 Complete", color = Color.White, fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp))
                }
            }
            // Avatar + Info Section
            Box(modifier = Modifier.fillMaxWidth()
                .padding(start = 20.dp, end = 20.dp, bottom = 16.dp)) {
                Box(modifier = Modifier.align(Alignment.TopStart).offset(y = (-36).dp)) {
                    Box(modifier = Modifier.size(80.dp)) {
                        if (avatar != null) {
                            AsyncImage(model = avatar, contentDescription = "Avatar",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.size(80.dp).clip(CircleShape)
                                    .border(3.5.dp, MaterialTheme.colorScheme.surface, CircleShape)
                                    .shadow(4.dp, CircleShape))
                        } else {
                            Box(modifier = Modifier.size(80.dp).clip(CircleShape)
                                .border(3.5.dp, MaterialTheme.colorScheme.surface, CircleShape)
                                .shadow(4.dp, CircleShape)
                                .background(Brush.horizontalGradient(
                                    listOf(Color(0xFF6366F1), Color(0xFF8B5CF6)))),
                                contentAlignment = Alignment.Center) {
                                Text((name.ifBlank { "?" }).firstOrNull()?.uppercase() ?: "?",
                                    color = Color.White, fontWeight = FontWeight.Bold, fontSize = 32.sp)
                            }
                        }
                        Surface(onClick = onEditAvatar, shape = CircleShape,
                            color = Color(0xFF6366F1), shadowElevation = 4.dp,
                            modifier = Modifier.align(Alignment.BottomEnd).size(28.dp)) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.CameraAlt, "Change avatar",
                                    tint = Color.White, modifier = Modifier.size(15.dp))
                            }
                        }
                    }
                }
                Column(modifier = Modifier.align(Alignment.CenterStart)
                    .padding(start = 96.dp, top = 8.dp)) {
                    Text(name.ifBlank { "Your Name" }, fontWeight = FontWeight.Bold, fontSize = 20.sp,
                        maxLines = 1, overflow = TextOverflow.Ellipsis,
                        color = MaterialTheme.colorScheme.onSurface)
                    Text(email ?: "email@example.com", fontSize = 13.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
            }
        }
    }
}

@Composable
private fun EditSection(
    title: String,
    icon: ImageVector,
    accentColor: Color = MaterialTheme.colorScheme.primary,
    completionItems: List<Boolean> = emptyList(),
    content: @Composable ColumnScope.() -> Unit,
) {
    val completedCount = completionItems.count { it }
    val totalCount = completionItems.size

    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Surface(shape = RoundedCornerShape(12.dp),
                    color = accentColor.copy(alpha = 0.12f), modifier = Modifier.size(36.dp)) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(icon, null, tint = accentColor, modifier = Modifier.size(20.dp))
                    }
                }
                Column(Modifier.weight(1f)) {
                    Text(title, fontWeight = FontWeight.Bold, fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onSurface)
                    if (totalCount > 0) {
                        Text("$completedCount/$totalCount completed", fontSize = 11.sp,
                            color = if (completedCount == totalCount) Color(0xFF22C55E)
                            else MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                if (totalCount > 0) {
                    val progress = animateFloatAsState(
                        targetValue = if (totalCount > 0) completedCount.toFloat() / totalCount else 0f,
                        animationSpec = tween(500, easing = FastOutSlowInEasing),
                        label = "sectionProgress")
                    Box(contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(progress = { progress.value },
                            modifier = Modifier.size(28.dp), strokeWidth = 3.dp,
                            color = if (completedCount == totalCount) Color(0xFF22C55E) else accentColor,
                            trackColor = MaterialTheme.colorScheme.surfaceVariant)
                        if (completedCount == totalCount) {
                            Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF22C55E),
                                modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }
            content()
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CategorySelectionSection(
    selectedCategories: List<String>,
    onToggleCategory: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val visibleCategories = if (expanded) marketplaceCategories else marketplaceCategories.take(8)

    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            // Header
            Row(verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Surface(shape = RoundedCornerShape(12.dp),
                    color = Color(0xFF8B5CF6).copy(alpha = 0.12f),
                    modifier = Modifier.size(36.dp)) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(Icons.Default.Category, null, tint = Color(0xFF8B5CF6),
                            modifier = Modifier.size(20.dp))
                    }
                }
                Column(Modifier.weight(1f)) {
                    Text("Category Preferences", fontWeight = FontWeight.Bold, fontSize = 16.sp,
                        color = MaterialTheme.colorScheme.onSurface)
                    Text("${selectedCategories.size} selected",
                        fontSize = 11.sp,
                        color = if (selectedCategories.isNotEmpty()) Color(0xFF22C55E)
                        else MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (selectedCategories.isNotEmpty()) {
                    val progress = animateFloatAsState(
                        targetValue = selectedCategories.size.toFloat() / marketplaceCategories.size,
                        animationSpec = tween(500), label = "catProgress")
                    Box(contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(progress = { progress.value },
                            modifier = Modifier.size(28.dp), strokeWidth = 3.dp,
                            color = Color(0xFF8B5CF6),
                            trackColor = MaterialTheme.colorScheme.surfaceVariant)
                    }
                }
            }

            // Chip Grid
            FlowRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                visibleCategories.forEach { category ->
                    val isSelected = category in selectedCategories
                    val animatedAlpha by animateFloatAsState(
                        targetValue = if (isSelected) 1f else 0.6f,
                        animationSpec = tween(200), label = "chipAlpha"
                    )
                    Surface(
                        onClick = { onToggleCategory(category) },
                        shape = RoundedCornerShape(20.dp),
                        color = if (isSelected) Color(0xFF8B5CF6).copy(alpha = 0.15f)
                        else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                        border = if (isSelected) BorderStroke(
                            1.5.dp, Color(0xFF8B5CF6).copy(alpha = 0.6f)
                        ) else null,
                        modifier = Modifier.alpha(animatedAlpha),
                    ) {
                        Row(
                            Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            if (isSelected) {
                                Icon(Icons.Default.CheckCircle, null,
                                    tint = Color(0xFF8B5CF6), modifier = Modifier.size(14.dp))
                            }
                            Text(
                                category,
                                fontSize = 13.sp,
                                fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                                color = if (isSelected) Color(0xFF8B5CF6)
                                else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }

            // Show More / Less
            if (marketplaceCategories.size > 8) {
                TextButton(
                    onClick = { expanded = !expanded },
                    modifier = Modifier.align(Alignment.CenterHorizontally),
                ) {
                    Text(
                        if (expanded) "Show less" else "+ Show all ${marketplaceCategories.size} categories",
                        fontSize = 12.sp,
                        color = Color(0xFF8B5CF6),
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }

            Text("Choose categories you're interested in",
                fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun EnhancedTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String = "",
    error: String? = null,
    maxLength: Int? = null,
    minLines: Int = 1,
    maxLines: Int = 1,
    leadingIcon: ImageVector? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    onNext: (() -> Unit)? = null,
    onDone: (() -> Unit)? = null,
    helperText: String? = null,
    isRequired: Boolean = false,
) {
    Column {
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            label = { Text(if (isRequired) "$label *" else label) },
            placeholder = { Text(placeholder,
                color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)) },
            isError = error != null,
            supportingText = {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    when {
                        error != null -> Text(error, color = MaterialTheme.colorScheme.error,
                            fontSize = 11.sp)
                        helperText != null -> Text(helperText,
                            color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                    }
                    if (maxLength != null) {
                        Text("${value.length}/$maxLength", fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            },
            singleLine = maxLines == 1,
            minLines = minLines, maxLines = maxLines,
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth(),
            keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
            keyboardActions = KeyboardActions(
                onNext = { onNext?.invoke() },
                onDone = { onDone?.invoke() },
            ),
            leadingIcon = leadingIcon?.let { { Icon(it, null, modifier = Modifier.size(18.dp)) } },
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = MaterialTheme.colorScheme.primary,
                cursorColor = MaterialTheme.colorScheme.primary,
                focusedLeadingIconColor = MaterialTheme.colorScheme.primary,
            ),
        )
    }
}

@Composable
private fun SocialLinkField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    placeholder: String,
    prefix: String,
    accentColor: Color = Color(0xFF6366F1),
    onNext: () -> Unit,
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label) },
        placeholder = { Text(placeholder,
            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f)) },
        singleLine = true,
        shape = RoundedCornerShape(16.dp),
        modifier = Modifier.fillMaxWidth(),
        leadingIcon = {
            Surface(shape = RoundedCornerShape(8.dp),
                color = accentColor.copy(alpha = 0.1f), modifier = Modifier.size(28.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Text(prefix, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = accentColor)
                }
            }
        },
        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
        keyboardActions = KeyboardActions(onNext = { onNext() }),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = accentColor, cursorColor = accentColor,
            focusedLeadingIconColor = accentColor,
        ),
    )
}
