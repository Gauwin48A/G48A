package com.mhub.app.ui.profile

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ExitToApp
import androidx.compose.material.icons.automirrored.filled.ListAlt
import androidx.compose.material.icons.automirrored.filled.Message
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.PersonRemove
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import coil.compose.AsyncImage
import androidx.compose.ui.layout.ContentScale
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.TextButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import androidx.compose.foundation.isSystemInDarkTheme
import com.mhub.app.R
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiError
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.ProfileUpdateRequest
import com.mhub.app.data.repository.AuthRepository
import com.mhub.app.data.repository.DashboardRepository
import com.mhub.app.data.repository.RewardsRepository
import com.mhub.app.data.repository.UploadRepository
import com.mhub.app.data.repository.UserSocialRepository
import com.mhub.app.domain.model.User
import com.mhub.app.ui.components.AppEmptyState
import com.mhub.app.ui.components.AppErrorState
import com.mhub.app.ui.components.ErrorBanner
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import javax.inject.Inject

@Stable
data class ProfileState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val user: User? = null,
    val listingsCount: String = "\u2014",
    val salesCount: String = "\u2014",
    val ratingValue: String = "\u2014",
    val error: String? = null,
    val isSessionExpired: Boolean = false,
    val referralCode: String? = null,
    val editSaving: Boolean = false,
    val editResult: String? = null,
    val followersCount: Int = 0,
    val followingCount: Int = 0,
    val isFollowing: Boolean = false,
    val responseTimeMinutes: Int? = null,
    val socialLinks: Map<String, String> = emptyMap(),
    val isOwnProfile: Boolean = true,
    val userPosts: List<com.mhub.app.domain.model.Post> = emptyList(),
    val reviews: List<UserReview> = emptyList(),
    val trustScore: com.mhub.app.data.remote.dto.TrustScoreResponse? = null,
    val dataExportDone: Boolean = false,
    val lastLoadTimeMs: Long = 0L,
)

data class UserReview(
    val id: String,
    val reviewerName: String,
    val reviewerAvatar: String?,
    val rating: Int,
    val message: String,
    val date: String,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val repo: AuthRepository,
    private val dashboardRepo: com.mhub.app.data.repository.DashboardRepository,
    private val rewardsRepo: RewardsRepository,
    private val socialRepo: UserSocialRepository,
    private val uploadRepo: com.mhub.app.data.repository.UploadRepository,
    private val api: com.mhub.app.data.remote.MhubApi,
) : ViewModel() {
    private val _state = MutableStateFlow(ProfileState())
    val state: StateFlow<ProfileState> = _state.asStateFlow()

    init { load() }

    fun load() {
        // Prevent redundant loads if data is fresh
        val current = _state.value
        if (current.user != null && System.currentTimeMillis() - current.lastLoadTimeMs < 30_000L) return

        _state.value = ProfileState(loading = true)
        viewModelScope.launch {
            when (val result = repo.me()) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    loading = false, user = result.data, lastLoadTimeMs = System.currentTimeMillis(),
                )
                is ApiResult.Failure -> {
                    val isUnauth = result.error is ApiError.Unauthorized || result.error is ApiError.Forbidden
                    if (isUnauth) {
                        // Retry once before declaring session expired (avoids false positives)
                        when (val retry = repo.me()) {
                            is ApiResult.Success -> _state.value = _state.value.copy(
                                loading = false, user = retry.data, lastLoadTimeMs = System.currentTimeMillis(),
                            )
                            is ApiResult.Failure -> _state.value = _state.value.copy(
                                loading = false,
                                isSessionExpired = retry.error is ApiError.Unauthorized || retry.error is ApiError.Forbidden,
                                error = retry.error.message,
                            )
                        }
                    } else {
                        _state.value = _state.value.copy(loading = false, error = result.error.message)
                    }
                }
            }
            loadStats()
            loadReferralCode()
            loadTrustScore()
        }
    }

    fun refresh() {
        _state.value = _state.value.copy(refreshing = true)
        viewModelScope.launch {
            when (val result = repo.me()) {
                is ApiResult.Success -> _state.value = _state.value.copy(refreshing = false, user = result.data)
                is ApiResult.Failure -> _state.value = _state.value.copy(refreshing = false, error = result.error.message)
            }
            loadStats()
            loadReferralCode()
            loadTrustScore()
        }
    }

    private suspend fun loadStats() {
        when (val r = dashboardRepo.get()) {
            is ApiResult.Success -> {
                val stats = r.data.quickStats
                _state.value = _state.value.copy(
                    listingsCount = stats.find { it.labelKey == "totalListings" || it.label?.contains("listing", true) == true }?.value?.toString() ?: "0",
                    salesCount = stats.find { it.labelKey == "totalSales" || it.label?.contains("sale", true) == true }?.value?.toString() ?: "0",
                    ratingValue = stats.find { it.labelKey == "avgRating" || it.label?.contains("rating", true) == true }?.value?.toString() ?: "\u2014",
                )
            }
            is ApiResult.Failure -> {}
        }
    }

    private suspend fun loadReferralCode() {
        when (val r = rewardsRepo.overview()) {
            is ApiResult.Success -> _state.value = _state.value.copy(referralCode = r.data.user.referralCode)
            is ApiResult.Failure -> {}
        }
    }

    fun updateProfile(fullName: String?, phone: String?, bio: String?, onDone: () -> Unit) {
        _state.value = _state.value.copy(editSaving = true)
        viewModelScope.launch {
            when (rewardsRepo.updateProfile(ProfileUpdateRequest(fullName = fullName, phone = phone, bio = bio))) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(editSaving = false, editResult = "Profile updated!")
                    // Refresh user data
                    when (val result = repo.me()) {
                        is ApiResult.Success -> _state.value = _state.value.copy(user = result.data)
                        is ApiResult.Failure -> {}
                    }
                    onDone()
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(editSaving = false, editResult = "Failed to update")
            }
        }
    }

    fun clearEditResult() { _state.value = _state.value.copy(editResult = null) }

    fun updateSocialLinks(links: Map<String, String>) {
        // Optimistic update — persist via profile update endpoint
        _state.value = _state.value.copy(socialLinks = links)
        viewModelScope.launch {
            rewardsRepo.updateProfile(ProfileUpdateRequest(socialLinks = links))
        }
    }

    fun logout(onDone: () -> Unit) {
        viewModelScope.launch { repo.logout(); onDone() }
    }

    fun shareProfile(context: android.content.Context) {
        val user = _state.value.user ?: return
        val shareText = "Check out ${user.fullName ?: "my profile"} on MHub!\nhttps://mhub.app/u/${user.username ?: user.id}"
        val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(android.content.Intent.EXTRA_TEXT, shareText)
        }
        context.startActivity(android.content.Intent.createChooser(intent, "Share Profile"))
    }

    fun blockUser() {
        val userId = _state.value.user?.stableId ?: return
        _state.value = _state.value.copy(editResult = "Blocking user…")
        viewModelScope.launch {
            when (socialRepo.blockUser(userId)) {
                is ApiResult.Success -> _state.value = _state.value.copy(editResult = "User blocked")
                is ApiResult.Failure -> _state.value = _state.value.copy(editResult = "Failed to block user")
            }
        }
    }

    fun uploadCoverImage(context: android.content.Context, uri: android.net.Uri) {
        viewModelScope.launch {
            try {
                val resolver = context.contentResolver
                val mimeType = resolver.getType(uri) ?: "image/jpeg"
                val bytes = resolver.openInputStream(uri)?.readBytes() ?: return@launch
                val base64 = android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
                val dataUri = "data:$mimeType;base64,$base64"
                rewardsRepo.updateProfile(ProfileUpdateRequest(coverImage = dataUri))
                load()
            } catch (e: Exception) {
                _state.value = _state.value.copy(editResult = "Cover upload failed")
            }
        }
    }

    fun reportUser() {
        _state.value = _state.value.copy(editResult = "User reported")
    }

    fun toggleFollow() {
        val userId = _state.value.user?.stableId ?: return
        val isFollowing = _state.value.isFollowing
        // Optimistic update
        _state.value = _state.value.copy(isFollowing = !isFollowing)
        viewModelScope.launch {
            val result = if (isFollowing) socialRepo.unfollow(userId) else socialRepo.follow(userId)
            if (result is ApiResult.Failure) {
                // Revert on failure
                _state.value = _state.value.copy(isFollowing = isFollowing)
            }
        }
    }

    fun loadTrustScore() {
        val userId = _state.value.user?.stableId ?: return
        viewModelScope.launch {
            when (val r = dashboardRepo.trustScore(userId)) {
                is ApiResult.Success -> _state.value = _state.value.copy(trustScore = r.data)
                is ApiResult.Failure -> {}
            }
        }
    }

    fun uploadAvatar(context: android.content.Context, uri: android.net.Uri) {
        viewModelScope.launch {
            try {
                val resolver = context.contentResolver
                val mimeType = resolver.getType(uri) ?: "image/jpeg"
                val bytes = resolver.openInputStream(uri)?.readBytes() ?: return@launch
                when (val r = uploadRepo.uploadPostImage(bytes, mimeType)) {
                    is ApiResult.Success -> {
                        rewardsRepo.updateProfile(ProfileUpdateRequest(avatar = r.data))
                        load()
                    }
                    is ApiResult.Failure -> _state.value = _state.value.copy(editResult = "Avatar upload failed")
                }
            } catch (e: Exception) {
                _state.value = _state.value.copy(editResult = "Avatar upload failed")
            }
        }
    }

    fun exportData() {
        viewModelScope.launch {
            when (socialRepo.dataExport()) {
                is ApiResult.Success -> _state.value = _state.value.copy(dataExportDone = true, editResult = "Data export request sent. You'll receive an email.")
                is ApiResult.Failure -> _state.value = _state.value.copy(editResult = "Export request failed. Please try again.")
            }
        }
    }

    // ── Preferences persistence ──
    private val _prefsSaving = MutableStateFlow(false)
    val prefsSaving: StateFlow<Boolean> = _prefsSaving.asStateFlow()

    private val _prefsLoaded = MutableStateFlow<com.mhub.app.data.remote.dto.PreferencesResponse?>(null)
    val prefsLoaded: StateFlow<com.mhub.app.data.remote.dto.PreferencesResponse?> = _prefsLoaded.asStateFlow()

    fun loadPreferences() {
        viewModelScope.launch {
            try {
                val resp = api.getPreferences()
                _prefsLoaded.value = resp
            } catch (_: Exception) { }
        }
    }

    fun savePreferences(location: String, minPrice: Int?, maxPrice: Int?) {
        _prefsSaving.value = true
        viewModelScope.launch {
            try {
                api.updatePreferences(
                    com.mhub.app.data.remote.dto.PreferencesUpdateRequest(
                        location = location,
                        minPrice = minPrice,
                        maxPrice = maxPrice,
                    )
                )
                _state.value = _state.value.copy(editResult = "Preferences saved")
            } catch (_: Exception) {
                _state.value = _state.value.copy(editResult = "Failed to save preferences")
            } finally {
                _prefsSaving.value = false
            }
        }
    }

    // ── Reviews loading ──
    private var reviewsLoaded = false

    fun loadReviews() {
        if (reviewsLoaded) return
        val userId = _state.value.user?.id ?: return
        reviewsLoaded = true
        viewModelScope.launch {
            try {
                val resp = api.userReviews(userId.toString())
                val mapped = resp.reviews.map { r ->
                    UserReview(
                        id = r.stableId,
                        reviewerName = r.reviewerName ?: "Anonymous",
                        reviewerAvatar = r.reviewerAvatar,
                        rating = r.rating.toInt().coerceIn(1, 5),
                        message = r.comment ?: "",
                        date = r.createdAt?.take(10) ?: "",
                    )
                }
                _state.value = _state.value.copy(reviews = mapped)
            } catch (_: Exception) { }
        }
    }
}

private fun tierColor(plan: String?): Color {
    return when (plan?.lowercase()) {
        "premium" -> Color(0xFFD97706)
        "gold" -> Color(0xFFF59E0B)
        "silver" -> Color(0xFF9CA3AF)
        "bronze" -> Color(0xFFB45309)
        else -> Color(0xFF6B7280)
    }
}

private fun tierLabel(plan: String?): String {
    return when (plan?.lowercase()) {
        "premium" -> "Premium"
        "gold" -> "Gold"
        "silver" -> "Silver"
        "bronze" -> "Bronze"
        else -> "Basic"
    }
}

private val profileHeroGradientLight = listOf(
    Color(0xFF0EA5E9),
    Color(0xFF3B82F6),
    Color(0xFF8B5CF6),
)

private val profileHeroGradientDark = listOf(
    Color(0xFF0B1220),
    Color(0xFF1B2542),
    Color(0xFF2A1F45),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onSignedOut: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenMyPosts: () -> Unit,
    onOpenKyc: () -> Unit,
    onOpenChat: () -> Unit = {},
    onOpenNotifications: () -> Unit = {},
    onOpenSecurity: () -> Unit = {},
    onOpenDashboard: () -> Unit = {},
    onOpenAnalytics: () -> Unit = {},
    onOpenOffers: () -> Unit = {},
    onOpenAccountDelete: () -> Unit = {},
    onOpenPost: (String) -> Unit = {},
    onOpenOrders: () -> Unit = {},
    onOpenAddresses: () -> Unit = {},
    onOpenMyFeed: () -> Unit = {},
    onOpenReviews: (String) -> Unit = {},
    onOpenCentre: () -> Unit = {},
    onOpenSaleDone: () -> Unit = {},
    onOpenSaleUndone: () -> Unit = {},
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val context = androidx.compose.ui.platform.LocalContext.current
    val darkTheme = isSystemInDarkTheme()
    val heroGradient = Brush.horizontalGradient(
        if (darkTheme) profileHeroGradientDark else profileHeroGradientLight,
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.profile_title), fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = {
                        val userId = state.user?.id ?: ""
                        val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(android.content.Intent.EXTRA_TEXT, "Check out my MHub profile: https://mhub.app/u/$userId")
                        }
                        context.startActivity(android.content.Intent.createChooser(intent, "Share profile via"))
                    }) {
                        Icon(Icons.Default.Share, contentDescription = "Share profile")
                    }
                    androidx.compose.material3.IconButton(onClick = onOpenSettings) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = state.refreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier.fillMaxSize().padding(padding),
        ) {
            when {
                state.loading -> Box(
                    Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) { CircularProgressIndicator(color = MaterialTheme.colorScheme.primary) }

                state.isSessionExpired -> Box(
                    Modifier.fillMaxSize().padding(32.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Card(
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                    ) {
                        Column(
                            Modifier.padding(24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            Icon(Icons.Outlined.Lock, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.error)
                            Text(stringResource(R.string.session_expired_title), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            Text(stringResource(R.string.session_expired_message), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onErrorContainer, textAlign = TextAlign.Center)
                            Button(onClick = onSignedOut) {
                                Text(stringResource(R.string.action_sign_in))
                            }
                        }
                    }
                }

                else -> {
                    val user = state.user
                    var showEditDialog by remember { mutableStateOf(false) }
                    val coverPickerLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
                        contract = androidx.activity.result.contract.ActivityResultContracts.GetContent()
                    ) { uri -> uri?.let { viewModel.uploadCoverImage(context, it) } }

                    // Edit Profile Dialog
                    if (showEditDialog) {
                        EditProfileDialog(
                            user = user,
                            saving = state.editSaving,
                            onDismiss = { showEditDialog = false },
                            onSave = { name: String?, phone: String?, bio: String? ->
                                viewModel.updateProfile(name, phone, bio) { showEditDialog = false }
                            },
                        )
                    }

                    // Edit result toast
                    state.editResult?.let { msg ->
                        androidx.compose.runtime.LaunchedEffect(msg) {
                            kotlinx.coroutines.delay(2500)
                            viewModel.clearEditResult()
                        }
                    }

                    var selectedTab by remember { mutableIntStateOf(0) }

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState()),
                    ) {
                        ErrorBanner(message = state.error)

                        // ─── Cover Image Section ────────────────────────────────
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(72.dp),
                        ) {
                            // Cover image or gradient placeholder
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .then(
                                        if (user?.coverImage != null) Modifier.background(Color.Transparent)
                                        else Modifier.background(Brush.horizontalGradient(listOf(Color(0xFF0EA5E9), Color(0xFF8B5CF6))))
                                    )
                            ) {
                                user?.coverImage?.let { coverUrl ->
                                    AsyncImage(
                                        model = coverUrl,
                                        contentDescription = "Cover image",
                                        contentScale = ContentScale.Crop,
                                        modifier = Modifier.fillMaxSize()
                                    )
                                }
                            }
                            // Edit cover button
                            IconButton(
                                onClick = { coverPickerLauncher.launch("image/*") },
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(8.dp)
                                    .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                                    .size(28.dp)
                            ) {
                                Icon(
                                    Icons.Default.CameraAlt,
                                    contentDescription = "Edit cover",
                                    tint = Color.White,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }

                        // ─── Hero Section — Compact Horizontal Layout ───────────
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(heroGradient)
                                .padding(horizontal = 14.dp, vertical = 12.dp),
                        ) {
                            val completionPct = profileCompletion(user)
                            val avatarPickerLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
                                contract = androidx.activity.result.contract.ActivityResultContracts.GetContent()
                            ) { uri -> uri?.let { viewModel.uploadAvatar(context, it) } }

                            Row(
                                verticalAlignment = Alignment.Top,
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                // Avatar
                                Box(contentAlignment = Alignment.BottomEnd) {
                                    AvatarWithRing(
                                        initial = user?.displayName?.firstOrNull()?.uppercaseChar() ?: '?',
                                        completionPercent = completionPct,
                                        size = 56.dp,
                                    )
                                    Surface(
                                        onClick = { avatarPickerLauncher.launch("image/*") },
                                        shape = CircleShape,
                                        color = Color.Black.copy(alpha = 0.6f),
                                        modifier = Modifier.size(22.dp).offset(x = 2.dp, y = 2.dp),
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Icon(Icons.Default.CameraAlt, "Upload avatar", tint = Color.White, modifier = Modifier.size(12.dp))
                                        }
                                    }
                                }

                                // Info column
                                Column(
                                    modifier = Modifier.weight(1f),
                                    verticalArrangement = Arrangement.spacedBy(3.dp),
                                ) {
                                    Text(
                                        text = user?.displayName ?: stringResource(R.string.profile_guest),
                                        style = MaterialTheme.typography.titleMedium,
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Text(
                                        text = user?.phone ?: user?.email ?: "",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color.White.copy(alpha = 0.8f),
                                    )

                                    // Bio (web parity: shown in hero section)
                                    user?.bio?.takeIf { it.isNotBlank() }?.let { bio ->
                                        Text(
                                            text = bio,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Color.White.copy(alpha = 0.85f),
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis,
                                        )
                                    }

                                    // Followers / Following inline
                                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        Text(
                                            stringResource(R.string.profile_followers_count, state.followersCount),
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Color.White.copy(alpha = 0.8f),
                                            fontWeight = FontWeight.SemiBold,
                                        )
                                        Text(
                                            stringResource(R.string.profile_following_count, state.followingCount),
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Color.White.copy(alpha = 0.8f),
                                            fontWeight = FontWeight.SemiBold,
                                        )
                                    }

                                    // Social icons + copy handle inline
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        state.socialLinks.forEach { (platform, _) ->
                                            Surface(
                                                shape = CircleShape,
                                                color = Color.White.copy(alpha = 0.2f),
                                                modifier = Modifier.size(24.dp),
                                            ) {
                                                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                                    Text(
                                                        when (platform.lowercase()) {
                                                            "twitter" -> "�"
                                                            "instagram" -> "�"
                                                            "linkedin" -> "in"
                                                            else -> "�"
                                                        },
                                                        color = Color.White,
                                                        fontSize = 11.sp,
                                                        fontWeight = FontWeight.Bold,
                                                    )
                                                }
                                            }
                                        }
                                        val handle = user?.username ?: user?.email ?: ""
                                        if (handle.isNotBlank()) {
                                            val clipboardManager = LocalClipboardManager.current
                                            Surface(
                                                shape = RoundedCornerShape(12.dp),
                                                color = Color.White.copy(alpha = 0.15f),
                                                modifier = Modifier.clickable {
                                                    clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(handle))
                                                },
                                            ) {
                                                Row(
                                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(3.dp),
                                                ) {
                                                    Icon(Icons.Default.ContentCopy, null, tint = Color.White.copy(alpha = 0.8f), modifier = Modifier.size(10.dp))
                                                    Text(handle, fontSize = 10.sp, color = Color.White.copy(alpha = 0.9f))
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        // ─── Badges Row ────────────────────────────────────────
                        val kycStatus = user?.kycStatus
                        val roleLabel = when (user?.role?.lowercase()) {
                            "admin" -> "Admin"
                            "seller" -> "Seller"
                            "moderator" -> "Mod"
                            else -> null
                        }
                        val tierCol = tierColor(user?.currentPlan)
                        val tierLbl = tierLabel(user?.currentPlan)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            when (kycStatus) {
                                "verified" -> Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = Color(0xFF22C55E).copy(alpha = 0.12f),
                                    border = BorderStroke(1.dp, Color(0xFF22C55E).copy(alpha = 0.5f)),
                                ) {
                                    Row(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(12.dp))
                                        Text(stringResource(R.string.profile_verified), style = MaterialTheme.typography.labelSmall, color = Color(0xFF22C55E), fontWeight = FontWeight.SemiBold)
                                    }
                                }
                                "pending" -> Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = Color(0xFFF59E0B).copy(alpha = 0.12f),
                                    border = BorderStroke(1.dp, Color(0xFFF59E0B).copy(alpha = 0.5f)),
                                ) {
                                    Row(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Icon(Icons.Default.RadioButtonUnchecked, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(12.dp))
                                        Text(stringResource(R.string.profile_pending), style = MaterialTheme.typography.labelSmall, color = Color(0xFFF59E0B), fontWeight = FontWeight.SemiBold)
                                    }
                                }
                                else -> Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = MaterialTheme.colorScheme.surfaceVariant,
                                    border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f)),
                                ) {
                                    Row(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Icon(Icons.Default.Shield, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(12.dp))
                                        Text(stringResource(R.string.profile_unverified), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            }
                            Surface(
                                shape = RoundedCornerShape(8.dp),
                                color = tierCol.copy(alpha = 0.12f),
                                border = BorderStroke(1.dp, tierCol.copy(alpha = 0.5f)),
                            ) {
                                Row(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Icon(Icons.Default.Star, null, tint = tierCol, modifier = Modifier.size(12.dp))
                                    Text(tierLbl, style = MaterialTheme.typography.labelSmall, color = tierCol, fontWeight = FontWeight.SemiBold)
                                }
                            }
                            if (roleLabel != null) {
                                Surface(
                                    shape = RoundedCornerShape(8.dp),
                                    color = Color(0xFF6366F1).copy(alpha = 0.12f),
                                    border = BorderStroke(1.dp, Color(0xFF6366F1).copy(alpha = 0.5f)),
                                ) {
                                    Text(roleLabel, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, color = Color(0xFF6366F1), fontWeight = FontWeight.SemiBold)
                                }
                            }
                            state.responseTimeMinutes?.let { rt ->
                                if (rt > 0) {
                                    Surface(shape = RoundedCornerShape(8.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                                        Text("⚡ ${rt}m response", modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            }
                        }
                        // ─── Action Buttons ────────────────────────────────────
                        var showMoreMenu by remember { mutableStateOf(false) }
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            OutlinedButton(
                                onClick = { viewModel.shareProfile(context) },
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.height(36.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.5f)),
                            ) {
                                Icon(Icons.Default.Share, null, modifier = Modifier.size(14.dp))
                                Spacer(Modifier.width(4.dp))
                                Text(stringResource(R.string.profile_share), style = MaterialTheme.typography.labelMedium)
                            }
                            if (state.isOwnProfile) {
                                if (user?.isKycVerified != true) {
                                    Button(
                                        onClick = onOpenKyc,
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.height(36.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                                    ) {
                                        Icon(Icons.Default.VerifiedUser, null, modifier = Modifier.size(14.dp))
                                        Spacer(Modifier.width(4.dp))
                                        Text(stringResource(R.string.profile_verify_kyc), style = MaterialTheme.typography.labelMedium)
                                    }
                                }
                                OutlinedButton(
                                    onClick = { showEditDialog = true },
                                    shape = RoundedCornerShape(10.dp),
                                    modifier = Modifier.height(36.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                                ) {
                                    Icon(Icons.Default.Edit, null, modifier = Modifier.size(14.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text(stringResource(R.string.profile_edit), style = MaterialTheme.typography.labelMedium)
                                }
                            } else {
                                if (state.isFollowing) {
                                    OutlinedButton(
                                        onClick = { viewModel.toggleFollow() },
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.height(36.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                                    ) {
                                        Icon(Icons.Default.PersonRemove, null, modifier = Modifier.size(14.dp))
                                        Spacer(Modifier.width(4.dp))
                                        Text(stringResource(R.string.profile_unfollow), style = MaterialTheme.typography.labelMedium)
                                    }
                                } else {
                                    Button(
                                        onClick = { viewModel.toggleFollow() },
                                        shape = RoundedCornerShape(10.dp),
                                        modifier = Modifier.height(36.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 0.dp),
                                    ) {
                                        Icon(Icons.Default.PersonAdd, null, modifier = Modifier.size(14.dp))
                                        Spacer(Modifier.width(4.dp))
                                        Text(stringResource(R.string.profile_follow), style = MaterialTheme.typography.labelMedium)
                                    }
                                }
                            }
                            Spacer(Modifier.weight(1f))
                            Box {
                                IconButton(
                                    onClick = { showMoreMenu = !showMoreMenu },
                                    modifier = Modifier.size(36.dp),
                                ) {
                                    Icon(Icons.Default.MoreVert, "More options")
                                }
                                DropdownMenu(
                                    expanded = showMoreMenu,
                                    onDismissRequest = { showMoreMenu = false },
                                ) {
                                    if (!state.isOwnProfile) {
                                        DropdownMenuItem(
                                            text = { Text(stringResource(R.string.profile_block_user)) },
                                            onClick = { viewModel.blockUser(); showMoreMenu = false },
                                            leadingIcon = { Icon(Icons.Default.Block, null) },
                                        )
                                        DropdownMenuItem(
                                            text = { Text(stringResource(R.string.profile_report_user)) },
                                            onClick = { viewModel.reportUser(); showMoreMenu = false },
                                            leadingIcon = { Icon(Icons.Default.Flag, null) },
                                        )
                                    }
                                    DropdownMenuItem(
                                        text = { Text(stringResource(R.string.profile_share_profile)) },
                                        onClick = { viewModel.shareProfile(context); showMoreMenu = false },
                                        leadingIcon = { Icon(Icons.Default.Share, null) },
                                    )
                                }
                            }
                        }
                        // ─── Profile Tabs ─────────────────────────────────────
                        ScrollableTabRow(
                            selectedTabIndex = selectedTab,
                            edgePadding = 16.dp,
                            containerColor = MaterialTheme.colorScheme.surface,
                        ) {
                            Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text(stringResource(R.string.profile_tab_overview)) })
                            Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text(stringResource(R.string.profile_tab_personal)) })
                            Tab(selected = selectedTab == 2, onClick = { selectedTab = 2 }, text = { Text(stringResource(R.string.profile_tab_preferences)) })
                            Tab(selected = selectedTab == 3, onClick = { selectedTab = 3 }, text = { Text(stringResource(R.string.profile_tab_settings)) })
                            Tab(selected = selectedTab == 4, onClick = { selectedTab = 4 }, text = { Text(stringResource(R.string.profile_tab_reviews)) })
                        }

                        if (selectedTab == 0) {
                        // ─── Marketplace Pulse ────────────────────────────────
                        Card(
                            shape = RoundedCornerShape(20.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (darkTheme) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White.copy(alpha = 0.92f),
                            ),
                            elevation = CardDefaults.cardElevation(defaultElevation = 6.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                                .padding(top = 16.dp, bottom = 4.dp)
                                .border(
                                    1.dp,
                                    if (darkTheme) Color(0xFF94A3B8).copy(alpha = 0.24f) else Color(0xFFE2E8F0).copy(alpha = 0.75f),
                                    RoundedCornerShape(20.dp),
                                ),
                        ) {
                            Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Text(
                                    stringResource(R.string.profile_marketplace_pulse),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    letterSpacing = 1.2.sp,
                                )
                                // 2x2 grid
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    PulseStatCard(
                                        label = stringResource(R.string.profile_listings), value = state.listingsCount,
                                        accentColor = Color(0xFF6366F1), modifier = Modifier.weight(1f),
                                    )
                                    PulseStatCard(
                                        label = stringResource(R.string.profile_rating), value = state.ratingValue,
                                        accentColor = Color(0xFFF59E0B), modifier = Modifier.weight(1f),
                                    )
                                }
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    PulseStatCard(
                                        label = stringResource(R.string.profile_sales), value = state.salesCount,
                                        accentColor = Color(0xFF10B981), modifier = Modifier.weight(1f),
                                    )
                                    PulseStatCard(
                                        label = stringResource(R.string.profile_rank), value = tierLabel(user?.currentPlan),
                                        accentColor = tierColor(user?.currentPlan), modifier = Modifier.weight(1f),
                                    )
                                }
                            }
                        }

                        // ─── Trust Score ──────────────────────────────────────
                        state.trustScore?.let { ts ->
                            if (ts.trustScore > 0f || ts.trustLabel != null) {
                                Card(
                                    shape = RoundedCornerShape(20.dp),
                                    colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White.copy(alpha = 0.92f)),
                                    elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(top = 4.dp, bottom = 4.dp),
                                ) {
                                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                        val trustColor = when (ts.riskState?.lowercase()) {
                                            "low_risk", "trusted" -> Color(0xFF22C55E)
                                            "medium_risk" -> Color(0xFFF59E0B)
                                            "high_risk" -> Color(0xFFEF4444)
                                            else -> Color(0xFF6366F1)
                                        }
                                        Box(Modifier.size(52.dp).clip(RoundedCornerShape(14.dp)).background(trustColor.copy(alpha = 0.12f)), contentAlignment = Alignment.Center) {
                                            Icon(Icons.Default.VerifiedUser, null, tint = trustColor, modifier = Modifier.size(28.dp))
                                        }
                                        Column(Modifier.weight(1f)) {
                                            Text(stringResource(R.string.profile_trust_score), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, letterSpacing = 1.sp)
                                            Text("${ts.trustScore.toInt()}/100", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = trustColor)
                                            if (ts.trustLabel != null) Text(ts.trustLabel, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                        }
                                        if (ts.trustBadge != null) {
                                            Text(ts.trustBadge, fontSize = 28.sp)
                                        }
                                    }
                                }
                            }
                        }

                        // ─── Quick Actions (4-per-row compact grid) ───────────
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                                .padding(top = 4.dp, bottom = 4.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            Text(
                                stringResource(R.string.profile_quick_actions),
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                letterSpacing = 1.2.sp,
                            )
                            val userId = state.user?.id ?: ""
                            // Row 1: 4 actions compact
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                CompactActionChip(icon = Icons.AutoMirrored.Filled.ListAlt, label = "My Home", accentColor = Color(0xFF10B981), onClick = onOpenMyPosts, modifier = Modifier.weight(1f))
                                CompactActionChip(icon = Icons.AutoMirrored.Filled.Message, label = "Feed", accentColor = Color(0xFF6366F1), onClick = onOpenMyFeed, modifier = Modifier.weight(1f))
                                CompactActionChip(icon = Icons.Filled.Star, label = "Reviews", accentColor = Color(0xFFF59E0B), onClick = { onOpenReviews(userId) }, modifier = Modifier.weight(1f))
                                CompactActionChip(icon = Icons.Filled.Dashboard, label = "Hub", accentColor = Color(0xFF8B5CF6), onClick = onOpenCentre, modifier = Modifier.weight(1f))
                            }
                            // Row 2: 3 actions + spacer
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                CompactActionChip(icon = Icons.Filled.CheckCircle, label = "Sale Done", accentColor = Color(0xFF22C55E), onClick = onOpenSaleDone, modifier = Modifier.weight(1f))
                                CompactActionChip(icon = Icons.Filled.RadioButtonUnchecked, label = "Reactivate", accentColor = Color(0xFFEF4444), onClick = onOpenSaleUndone, modifier = Modifier.weight(1f))
                                CompactActionChip(icon = Icons.AutoMirrored.Filled.TrendingUp, label = "Offers", accentColor = Color(0xFFF97316), onClick = onOpenOffers, modifier = Modifier.weight(1f))
                                Spacer(modifier = Modifier.weight(1f))
                            }
                        }

                        // ─── User Posts Grid ──────────────────────────────────
                        if (state.userPosts.isNotEmpty()) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp)
                                    .padding(top = 8.dp, bottom = 4.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Text(
                                    stringResource(R.string.profile_recent_posts),
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    letterSpacing = 1.2.sp,
                                )
                                // 2-column grid
                                val postChunks = state.userPosts.chunked(2)
                                postChunks.forEach { rowPosts ->
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        rowPosts.forEach { post ->
                                            Card(
                                                onClick = { post.id?.let { onOpenPost(it) } },
                                                modifier = Modifier.weight(1f),
                                                shape = RoundedCornerShape(12.dp),
                                            ) {
                                                Column {
                                                    Box(
                                                        modifier = Modifier
                                                            .fillMaxWidth()
                                                            .height(120.dp)
                                                            .background(MaterialTheme.colorScheme.surfaceVariant)
                                                    ) {
                                                        post.primaryImage?.let { img ->
                                                            AsyncImage(
                                                                model = img,
                                                                contentDescription = null,
                                                                contentScale = ContentScale.Crop,
                                                                modifier = Modifier.fillMaxSize()
                                                            )
                                                        }
                                                    }
                                                    Column(modifier = Modifier.padding(8.dp)) {
                                                        Text(
                                                            text = post.displayTitle,
                                                            style = MaterialTheme.typography.labelMedium,
                                                            fontWeight = FontWeight.SemiBold,
                                                            maxLines = 1,
                                                            overflow = TextOverflow.Ellipsis
                                                        )
                                                        post.price?.let {
                                                            Text(
                                                                text = "₹${it.toInt()}",
                                                                style = MaterialTheme.typography.labelSmall,
                                                                color = MaterialTheme.colorScheme.primary,
                                                                fontWeight = FontWeight.Bold
                                                            )
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                        // Fill empty cell if odd number
                                        if (rowPosts.size == 1) {
                                            Spacer(Modifier.weight(1f))
                                        }
                                    }
                                }
                            }
                        }

                        // ─── My Channel / Centre ─────────────────────────────
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                        ) {
                            Row(
                                Modifier.fillMaxWidth().padding(14.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.size(40.dp)) {
                                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                        Text("�", fontSize = 20.sp)
                                    }
                                }
                                Column(Modifier.weight(1f)) {
                                    Text(stringResource(R.string.profile_my_channel), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                                    Text(stringResource(R.string.profile_my_channel_desc), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                            }
                        }

                        // ─── Profile Checklist ────────────────────────────────────
                        ProfileChecklist(
                            user = user,
                            onEditProfile = { showEditDialog = true },
                            onVerify = onOpenKyc,
                        )

                        // ─── User ID ─────────────────────────────────────────────
                        UserIdSection(userId = user?.stableId ?: user?.userId ?: "")

                        // ─── Referral Code Box ────────────────────────────────────
                        ReferralCodeBox(code = state.referralCode ?: user?.rewardsRank ?: "MHUB${user?.stableId?.take(4)?.uppercase() ?: ""}")

                        // ─── Menu Sections ──────────────────────────────────────
                        Column(
                            modifier = Modifier
                                .padding(horizontal = 16.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp),
                        ) {
                            SectionHeader(title = "Selling")
                            ProfileMenuCard {
                                ProfileMenuItem(
                                    icon = Icons.AutoMirrored.Filled.ListAlt,
                                    label = "My Listings",
                                    subtitle = "Manage your active posts",
                                    onClick = onOpenMyPosts,
                                )
                                HorizontalDivider(modifier = Modifier.padding(start = 64.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                ProfileMenuItem(
                                    icon = Icons.Default.VerifiedUser,
                                    label = if (user?.isKycVerified == true) "Verification Status" else "Get Verified",
                                    subtitle = "Required to sell on MHub",
                                    onClick = onOpenKyc,
                                )
                                HorizontalDivider(modifier = Modifier.padding(start = 64.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                ProfileMenuItem(
                                    icon = Icons.AutoMirrored.Filled.Message,
                                    label = "Messages",
                                    subtitle = "Chat with buyers and sellers",
                                    onClick = onOpenChat,
                                )
                            }

                            SectionHeader(title = "Orders & Shipping")
                            ProfileMenuCard {
                                ProfileMenuItem(
                                    icon = Icons.Default.Receipt,
                                    label = "Order History",
                                    subtitle = "Purchases and sales",
                                    onClick = onOpenOrders,
                                )
                            }

                            SectionHeader(title = "Account")
                            ProfileMenuCard {
                                ProfileMenuItem(
                                    icon = Icons.Default.Notifications,
                                    label = "Notifications",
                                    subtitle = "Push alerts and email preferences",
                                    onClick = onOpenNotifications,
                                )
                                HorizontalDivider(modifier = Modifier.padding(start = 64.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                ProfileMenuItem(
                                    icon = Icons.Default.Security,
                                    label = "Security",
                                    subtitle = "Password, 2FA and sessions",
                                    onClick = onOpenSecurity,
                                )
                                HorizontalDivider(modifier = Modifier.padding(start = 64.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                ProfileMenuItem(
                                    icon = Icons.Default.Dashboard,
                                    label = "Dashboard",
                                    subtitle = "Account metrics and shortcuts",
                                    onClick = onOpenDashboard,
                                )
                                HorizontalDivider(modifier = Modifier.padding(start = 64.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                ProfileMenuItem(
                                    icon = Icons.Default.BarChart,
                                    label = "Analytics",
                                    subtitle = "Seller trends and insights",
                                    onClick = onOpenAnalytics,
                                )
                                HorizontalDivider(modifier = Modifier.padding(start = 64.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                ProfileMenuItem(
                                    icon = Icons.Default.Settings,
                                    label = "Settings",
                                    subtitle = "App preferences",
                                    onClick = onOpenSettings,
                                )
                                HorizontalDivider(modifier = Modifier.padding(start = 64.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                ProfileMenuItem(
                                    icon = Icons.Default.DeleteForever,
                                    label = "Delete Account",
                                    subtitle = "Permanently remove your account",
                                    onClick = onOpenAccountDelete,
                                    tint = MaterialTheme.colorScheme.error,
                                )
                            }

                            // Sign out
                            OutlinedButton(
                                onClick = { viewModel.logout(onSignedOut) },
                                shape = RoundedCornerShape(16.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(52.dp),
                            ) {
                                Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null)
                                Spacer(Modifier.width(8.dp))
                                Text(stringResource(R.string.profile_sign_out), fontWeight = FontWeight.SemiBold)
                            }

                            Spacer(Modifier.height(24.dp))
                        }
                        } // end overview tab

                        // ─── Tab 1: Personal Info ─────────────────────────────
                        if (selectedTab == 1) {
                            PersonalInfoTab(
                                user = user,
                                saving = state.editSaving,
                                onSave = { name, phone, bio -> viewModel.updateProfile(name, phone, bio) {} },
                            )
                        }

                        // ─── Tab 2: Preferences ───────────────────────────────
                        if (selectedTab == 2) {
                            val prefs by viewModel.prefsLoaded.collectAsState()
                            val prefsSaving by viewModel.prefsSaving.collectAsState()
                            LaunchedEffect(Unit) { viewModel.loadPreferences() }
                            PreferencesTab(
                                onOpenCategoryMode = {},
                                initialLocation = prefs?.location ?: "",
                                initialMinPrice = prefs?.minPrice?.toString() ?: "",
                                initialMaxPrice = prefs?.maxPrice?.toString() ?: "",
                                saving = prefsSaving,
                                onSave = { loc, min, max -> viewModel.savePreferences(loc, min, max) },
                            )
                        }

                        // ─── Tab 3: Settings ──────────────────────────────────
                        if (selectedTab == 3) {
                            SettingsTab(
                                user = user,
                                onOpenSettings = onOpenSettings,
                                onOpenSecurity = onOpenSecurity,
                                onOpenNotifications = onOpenNotifications,
                                onSignOut = { viewModel.logout(onSignedOut) },
                                onExportData = { viewModel.exportData() },
                                dataExportDone = state.dataExportDone,
                            )
                        }

                        // ─── Tab 4: Reviews ───────────────────────────────────
                        if (selectedTab == 4) {
                            LaunchedEffect(state.user?.id) { viewModel.loadReviews() }
                            ReviewsTab(reviews = state.reviews)
                        }

                        Spacer(Modifier.height(24.dp))
                    }
                }
            }
        }
    }
}

// ── Tab composables ───────────────────────────────────────────────────────────

@Composable
private fun PersonalInfoTab(
    user: com.mhub.app.domain.model.User?,
    saving: Boolean,
    onSave: (String?, String?, String?) -> Unit,
) {
    var fullName by remember(user?.fullName) { mutableStateOf(user?.fullName ?: "") }
    var phone by remember(user?.phone) { mutableStateOf(user?.phone ?: "") }
    var bio by remember { mutableStateOf("") }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.profile_personal_info), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)

        Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                OutlinedTextField(
                    value = fullName,
                    onValueChange = { fullName = it },
                    label = { Text(stringResource(R.string.profile_full_name)) },
                    placeholder = { Text(stringResource(R.string.profile_name_hint)) },
                    singleLine = true,
                    isError = fullName.isNotBlank() && fullName.length < 2,
                    supportingText = if (fullName.isNotBlank() && fullName.length < 2) {{ Text(stringResource(R.string.profile_name_min)) }} else null,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                )
                OutlinedTextField(
                    value = phone,
                    onValueChange = { if (it.length <= 10) phone = it.filter { c -> c.isDigit() } },
                    label = { Text(stringResource(R.string.profile_phone)) },
                    placeholder = { Text(stringResource(R.string.profile_phone_hint)) },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                    singleLine = true,
                    isError = phone.isNotBlank() && phone.length != 10,
                    supportingText = { Text("${phone.length}/10 digits") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                )
                OutlinedTextField(
                    value = bio,
                    onValueChange = { if (it.length <= 200) bio = it },
                    label = { Text("Bio") },
                    placeholder = { Text("Tell buyers about yourself…") },
                    minLines = 3,
                    maxLines = 5,
                    supportingText = { Text("${bio.length}/200") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                )
                Button(
                    onClick = { onSave(fullName.ifBlank { null }, phone.ifBlank { null }, bio.ifBlank { null }) },
                    enabled = !saving && (fullName.isBlank() || fullName.length >= 2) && (phone.isBlank() || phone.length == 10),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                ) {
                    Text(if (saving) stringResource(R.string.commerce_saving) else stringResource(R.string.commerce_save_changes), fontWeight = FontWeight.SemiBold)
                }
            }
        }

        // Email (read-only)
        if (!user?.email.isNullOrBlank()) {
            Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f), modifier = Modifier.fillMaxWidth()) {
                Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF10B981), modifier = Modifier.size(18.dp))
                    Column {
                        Text(stringResource(R.string.profile_email), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(user!!.email, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                    }
                    Spacer(Modifier.weight(1f))
                    Surface(shape = RoundedCornerShape(6.dp), color = Color(0xFF10B981).copy(alpha = 0.15f)) {
                        Text(stringResource(R.string.profile_verified), style = MaterialTheme.typography.labelSmall, color = Color(0xFF10B981), modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }

        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun PreferencesTab(
    onOpenCategoryMode: () -> Unit,
    initialLocation: String = "",
    initialMinPrice: String = "",
    initialMaxPrice: String = "",
    saving: Boolean = false,
    onSave: (location: String, minPrice: Int?, maxPrice: Int?) -> Unit = { _, _, _ -> },
) {
    var location by remember { mutableStateOf(initialLocation) }
    var selectedRadius by remember { mutableIntStateOf(25) }
    var minPrice by remember { mutableStateOf(initialMinPrice) }
    var maxPrice by remember { mutableStateOf(initialMaxPrice) }
    var pageDensity by remember { mutableStateOf("comfortable") }
    val radii = listOf(5, 10, 25, 50)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.profile_search_prefs), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)

        Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                OutlinedTextField(
                    value = location,
                    onValueChange = { location = it },
                    label = { Text(stringResource(R.string.profile_location)) },
                    placeholder = { Text(stringResource(R.string.profile_location_hint)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp),
                )

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(stringResource(R.string.profile_search_radius), style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Medium)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        radii.forEach { r ->
                            val isSelected = selectedRadius == r
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = if (isSelected) Color(0xFF6366F1) else MaterialTheme.colorScheme.surfaceVariant,
                                modifier = Modifier.weight(1f).clickable { selectedRadius = r },
                            ) {
                                Text(
                                    "${r}km",
                                    modifier = Modifier.padding(vertical = 8.dp).fillMaxWidth(),
                                    textAlign = TextAlign.Center,
                                    style = MaterialTheme.typography.labelMedium,
                                    color = if (isSelected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                )
                            }
                        }
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = minPrice,
                        onValueChange = { minPrice = it.filter { c -> c.isDigit() } },
                        label = { Text(stringResource(R.string.profile_min_price)) },
                        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                    )
                    OutlinedTextField(
                        value = maxPrice,
                        onValueChange = { maxPrice = it.filter { c -> c.isDigit() } },
                        label = { Text(stringResource(R.string.profile_max_price)) },
                        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(12.dp),
                    )
                }

                Button(
                    onClick = { onSave(location, minPrice.toIntOrNull(), maxPrice.toIntOrNull()) },
                    enabled = !saving,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth().height(50.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                ) {
                    if (saving) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Text(stringResource(R.string.profile_save_prefs), fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }

        // Category Mode link
        Surface(
            shape = RoundedCornerShape(14.dp),
            color = Color(0xFFEFF6FF),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFBFDBFE)),
            modifier = Modifier.fillMaxWidth().clickable(onClick = onOpenCategoryMode),
        ) {
            Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Text("�", fontSize = 22.sp)
                Column(Modifier.weight(1f)) {
                    Text(stringResource(R.string.profile_category_mode), style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = Color(0xFF1D4ED8))
                    Text(stringResource(R.string.profile_category_mode_desc), style = MaterialTheme.typography.bodySmall, color = Color(0xFF3B82F6))
                }
                Icon(Icons.Default.ChevronRight, null, tint = Color(0xFF3B82F6), modifier = Modifier.size(18.dp))
            }
        }

        // Page-density selector (web-parity: Profile.jsx densityPreference C8)
        Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(stringResource(R.string.profile_page_density), style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                Text(stringResource(R.string.profile_page_density_desc), style = MaterialTheme.typography.bodySmall, color = Color(0xFF64748B))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("compact" to "Compact", "comfortable" to "Comfortable", "spacious" to "Spacious").forEach { (mode, label) ->
                        val sel = pageDensity == mode
                        Surface(
                            modifier = Modifier.weight(1f).clickable { pageDensity = mode },
                            shape = RoundedCornerShape(10.dp),
                            color = if (sel) Color(0xFF6366F1) else MaterialTheme.colorScheme.surfaceVariant,
                        ) {
                            Text(label, style = MaterialTheme.typography.labelSmall, color = if (sel) Color.White else MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = if (sel) FontWeight.Bold else FontWeight.Normal, textAlign = TextAlign.Center, modifier = Modifier.padding(vertical = 8.dp).fillMaxWidth())
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun SettingsTab(
    user: com.mhub.app.domain.model.User?,
    onOpenSettings: () -> Unit,
    onOpenSecurity: () -> Unit,
    onOpenNotifications: () -> Unit,
    onSignOut: () -> Unit,
    onExportData: () -> Unit = {},
    dataExportDone: Boolean = false,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.profile_account_settings), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)

        // Subscription card
        val plan = user?.currentPlan?.replaceFirstChar { it.uppercase() } ?: "Basic"
        val planColor = tierColor(user?.currentPlan)
        Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(modifier = Modifier.size(44.dp).clip(RoundedCornerShape(14.dp)).background(planColor.copy(alpha = 0.15f)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Star, null, tint = planColor, modifier = Modifier.size(24.dp))
                }
                Column(Modifier.weight(1f)) {
                    Text(stringResource(R.string.profile_current_plan), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(plan, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = planColor)
                }
                Surface(shape = RoundedCornerShape(8.dp), color = planColor.copy(alpha = 0.1f)) {
                    Text(stringResource(R.string.profile_upgrade), style = MaterialTheme.typography.labelSmall, color = planColor, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), fontWeight = FontWeight.SemiBold)
                }
            }
        }

        // Settings menu
        Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
            Column {
                SettingsRow(Icons.Default.Settings, "App Settings", "Theme, language, display", onClick = onOpenSettings)
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                SettingsRow(Icons.Default.Security, "Security", "Password, 2FA, sessions", onClick = onOpenSecurity)
                HorizontalDivider(modifier = Modifier.padding(start = 56.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                SettingsRow(Icons.Default.Notifications, "Notifications", "Alerts and push settings", onClick = onOpenNotifications)
            }
        }

        OutlinedButton(
            onClick = onSignOut,
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) {
            Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text(stringResource(R.string.profile_sign_out), fontWeight = FontWeight.SemiBold)
        }

        // GDPR: Download My Data
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = if (dataExportDone) Color(0xFFDCFCE7) else MaterialTheme.colorScheme.surface,
            shadowElevation = 2.dp,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFF6366F1).copy(alpha = 0.1f)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Download, null, tint = Color(0xFF6366F1), modifier = Modifier.size(20.dp))
                }
                Column(Modifier.weight(1f)) {
                    Text(stringResource(R.string.profile_download_data), style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Medium)
                    Text(
                        if (dataExportDone) "Export request sent — check your email" else "Request a GDPR export of your account data",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (dataExportDone) Color(0xFF15803D) else MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (!dataExportDone) {
                    androidx.compose.material3.TextButton(onClick = onExportData) { Text(stringResource(R.string.profile_request)) }
                } else {
                    Icon(Icons.Default.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(20.dp))
                }
            }
        }

        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun SettingsRow(icon: ImageVector, label: String, subtitle: String, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Box(modifier = Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
            Icon(icon, null, modifier = Modifier.size(20.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Column(Modifier.weight(1f)) {
            Text(label, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Medium)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
    }
}

@Composable
private fun ReviewsTab(reviews: List<UserReview>) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            "User Reviews",
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.SemiBold
        )

        if (reviews.isEmpty()) {
            AppEmptyState(
                icon = Icons.Default.Star,
                title = "No reviews yet",
                subtitle = "Reviews from other users will appear here"
            )
        } else {
            reviews.forEach { review ->
                Card(
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = MaterialTheme.colorScheme.surface
                    ),
                    modifier = Modifier.fillMaxWidth(),
                    elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF6366F1)),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(
                                        review.reviewerName.firstOrNull()?.uppercase() ?: "?",
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                Column {
                                    Text(
                                        review.reviewerName,
                                        style = MaterialTheme.typography.labelLarge,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Text(
                                        review.date,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                            // Star rating
                            Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                                repeat(5) { index ->
                                    Icon(
                                        Icons.Default.Star,
                                        contentDescription = null,
                                        tint = if (index < review.rating) Color(0xFFFBBF24) else Color(0xFFD1D5DB),
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                        }
                        Text(
                            review.message,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }

        Spacer(Modifier.height(24.dp))
    }
}

@Composable
private fun AvatarWithRing(initial: Char, completionPercent: Int, size: Dp) {
    val ringColor = Color(0xFF34D399)
    val ringTrack = Color.White.copy(alpha = 0.25f)
    val sweepAngle = 360f * completionPercent / 100f

    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(size + 8.dp)) {
        Canvas(modifier = Modifier.size(size)) {
            val strokeWidth = 4.dp.toPx()
            val inset = strokeWidth / 2f
            val arcSize = Size(this.size.width - strokeWidth, this.size.height - strokeWidth)
            val topLeft = Offset(inset, inset)
            drawArc(
                color = ringTrack,
                startAngle = -90f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round),
            )
            drawArc(
                color = ringColor,
                startAngle = -90f,
                sweepAngle = sweepAngle,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = Stroke(width = strokeWidth, cap = StrokeCap.Round),
            )
        }
        Box(
            modifier = Modifier
                .size(size - 12.dp)
                .clip(CircleShape)
                .background(
                    Brush.linearGradient(
                        listOf(Color(0xFF6366F1), Color(0xFF8B5CF6)),
                    ),
                ),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                text = initial.toString(),
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
                fontWeight = FontWeight.Bold,
            )
        }
        // Crown badge overlay — bottom-right
        Box(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .size(24.dp)
                .clip(CircleShape)
                .background(Color(0xFFF59E0B))
                .border(2.dp, Color.White, CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Default.Star,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(14.dp),
            )
        }
    }
}

private fun profileCompletion(user: User?): Int {
    if (user == null) return 0
    var score = 0
    if (!user.displayName.isNullOrBlank() && user.displayName != "User") score += 25
    if (!user.phone.isNullOrBlank()) score += 25
    if (!user.email.isNullOrBlank()) score += 25
    if (user.isKycVerified) score += 25
    return score.coerceIn(0, 100)
}

private fun profileCompletionHint(user: User?): String {
    return when {
        user == null -> "Sign in to complete your profile"
        !user.isKycVerified -> "Get verified to reach 100%"
        user.email.isNullOrBlank() -> "Add your email to reach 100%"
        user.phone.isNullOrBlank() -> "Add your phone to reach 100%"
        else -> "Your profile is complete!"
    }
}

@Composable
private fun PulseStatCard(label: String, value: String, accentColor: Color, modifier: Modifier = Modifier) {
    val darkTheme = isSystemInDarkTheme()
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (darkTheme) Color(0xFF0F172A).copy(alpha = 0.8f) else Color.White.copy(alpha = 0.95f),
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        modifier = modifier
            .border(1.dp, accentColor.copy(alpha = if (darkTheme) 0.3f else 0.15f), RoundedCornerShape(16.dp)),
    ) {
        Box {
            // Accent top bar
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .background(Brush.horizontalGradient(listOf(accentColor, accentColor.copy(alpha = 0.7f)))),
            )
            Column(
                modifier = Modifier.padding(top = 12.dp, start = 12.dp, end = 12.dp, bottom = 12.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    value,
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Black,
                    color = accentColor,
                )
                Text(
                    label.uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    letterSpacing = 0.8.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

@Composable
private fun QuickActionCard(
    icon: ImageVector,
    label: String,
    subtitle: String,
    accentColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val darkTheme = isSystemInDarkTheme()
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (darkTheme) Color(0xFF0F172A).copy(alpha = 0.8f) else Color.White,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
        modifier = modifier
            .border(1.dp, accentColor.copy(alpha = if (darkTheme) 0.2f else 0.12f), RoundedCornerShape(16.dp)),
    ) {
        Box {
            // Gradient top accent
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .background(Brush.horizontalGradient(listOf(accentColor, accentColor.copy(alpha = 0.6f)))),
            )
            Row(
                modifier = Modifier.padding(top = 12.dp, start = 12.dp, end = 12.dp, bottom = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(
                            Brush.linearGradient(
                                listOf(accentColor.copy(alpha = 0.18f), accentColor.copy(alpha = 0.08f)),
                            ),
                        )
                        .border(1.dp, accentColor.copy(alpha = 0.18f), RoundedCornerShape(14.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(icon, null, tint = accentColor, modifier = Modifier.size(20.dp))
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(label, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                    Text(subtitle, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                }
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String) {
    Text(
        text = title.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        letterSpacing = 1.2.sp,
        modifier = Modifier.padding(start = 4.dp, bottom = 2.dp),
    )
}

@Composable
private fun ProfileChecklist(user: User?, onEditProfile: () -> Unit, onVerify: () -> Unit) {
    val darkTheme = isSystemInDarkTheme()
    val steps = listOf(
        Triple("Display name", !user?.displayName.isNullOrBlank() && user?.displayName != "User", "Add your name"),
        Triple("Phone number", !user?.phone.isNullOrBlank(), "Add phone number"),
        Triple("Email address", !user?.email.isNullOrBlank(), "Add email"),
        Triple("KYC Verification", user?.isKycVerified == true, "Get verified"),
    )
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (darkTheme) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White.copy(alpha = 0.92f),
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(top = 8.dp)
            .border(
                1.dp,
                if (darkTheme) Color(0xFF94A3B8).copy(alpha = 0.22f) else Color(0xFFE2E8F0).copy(alpha = 0.7f),
                RoundedCornerShape(20.dp),
            ),
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(0.dp)) {
            Text(
                "PROFILE CHECKLIST",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                letterSpacing = 1.2.sp,
            )
            Spacer(Modifier.height(10.dp))
            steps.forEachIndexed { index, (label, completed, hint) ->
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier
                        .padding(vertical = 6.dp)
                        .then(
                            if (!completed) Modifier.clickable {
                                if (index == 3) onVerify() else onEditProfile()
                            } else Modifier,
                        ),
                ) {
                    // Vertical connector line + circle
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        if (index > 0) {
                            Box(
                                modifier = Modifier
                                    .width(2.dp)
                                    .height(12.dp)
                                    .background(if (completed) Color(0xFF10B981) else MaterialTheme.colorScheme.outlineVariant),
                            )
                        }
                        Icon(
                            if (completed) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                            contentDescription = null,
                            tint = if (completed) Color(0xFF10B981) else MaterialTheme.colorScheme.outlineVariant,
                            modifier = Modifier.size(20.dp),
                        )
                        if (index < steps.lastIndex) {
                            Box(
                                modifier = Modifier
                                    .width(2.dp)
                                    .height(12.dp)
                                    .background(if (completed) Color(0xFF10B981) else MaterialTheme.colorScheme.outlineVariant),
                            )
                        }
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            label,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = if (completed) FontWeight.SemiBold else FontWeight.Normal,
                            color = if (completed) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        if (!completed) {
                            Text(
                                hint,
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFF6366F1),
                            )
                        }
                    }
                    if (completed) {
                        Text("✓", color = Color(0xFF10B981), fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun ReferralCodeBox(code: String) {
    val darkTheme = isSystemInDarkTheme()
    val clipboardManager = LocalClipboardManager.current
    val shimmerTransition = rememberInfiniteTransition(label = "refShimmer")
    val shimmerX by shimmerTransition.animateFloat(
        initialValue = -0.5f,
        targetValue = 1.5f,
        animationSpec = infiniteRepeatable(
            animation = tween(2500, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "refShimmerX",
    )
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (darkTheme) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White.copy(alpha = 0.92f),
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(top = 8.dp, bottom = 8.dp)
            .border(
                1.dp,
                if (darkTheme) Color(0xFF94A3B8).copy(alpha = 0.22f) else Color(0xFFE2E8F0).copy(alpha = 0.7f),
                RoundedCornerShape(20.dp),
            ),
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                "YOUR REFERRAL CODE",
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                letterSpacing = 1.2.sp,
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(
                        if (darkTheme) Brush.linearGradient(listOf(Color(0xFF1E1B4B), Color(0xFF312E81)))
                        else Brush.linearGradient(listOf(Color(0xFFEEF2FF), Color(0xFFE0E7FF))),
                    )
                    .border(
                        2.dp,
                        if (darkTheme) Color(0xFF4338CA) else Color(0xFFA5B4FC),
                        RoundedCornerShape(12.dp),
                    )
                    .drawBehind {
                        // Shimmer overlay
                        drawRect(
                            Brush.horizontalGradient(
                                colors = listOf(
                                    Color.Transparent,
                                    Color.White.copy(alpha = 0.3f),
                                    Color.Transparent,
                                ),
                                startX = size.width * shimmerX,
                                endX = size.width * (shimmerX + 0.5f),
                            ),
                        )
                    }
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                contentAlignment = Alignment.Center,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text(
                        text = code,
                        style = MaterialTheme.typography.titleMedium,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 2.sp,
                        color = if (darkTheme) Color(0xFFA5B4FC) else Color(0xFF4338CA),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.weight(1f),
                    )
                    IconButton(onClick = { clipboardManager.setText(AnnotatedString(code)) }) {
                        Icon(
                            Icons.Default.ContentCopy,
                            contentDescription = "Copy code",
                            tint = if (darkTheme) Color(0xFFA5B4FC) else Color(0xFF6366F1),
                            modifier = Modifier.size(20.dp),
                        )
                    }
                }
            }
            Text(
                "Share this code to earn rewards when friends sign up",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun ProfileMenuCard(content: @Composable () -> Unit) {
    val darkTheme = isSystemInDarkTheme()
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (darkTheme) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White.copy(alpha = 0.92f),
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        modifier = Modifier
            .fillMaxWidth()
            .border(
                1.dp,
                if (darkTheme) Color(0xFF94A3B8).copy(alpha = 0.22f) else Color(0xFFE2E8F0).copy(alpha = 0.7f),
                RoundedCornerShape(16.dp),
            ),
    ) {
        Column { content() }
    }
}

@Composable
private fun ProfileMenuItem(
    icon: ImageVector,
    label: String,
    subtitle: String,
    onClick: () -> Unit,
    tint: Color? = null,
) {
    val darkTheme = isSystemInDarkTheme()
    val iconTint = tint ?: if (darkTheme) Color(0xFFBFDBFE) else Color(0xFF1D4ED8)
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(0.dp),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (darkTheme) Color(0xFF1E293B) else Color(0xFFEFF6FF)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconTint,
                    modifier = Modifier.size(20.dp),
                )
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(text = label, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

@Composable
private fun UserIdSection(userId: String) {
    val darkTheme = isSystemInDarkTheme()
    val clipboardManager = LocalClipboardManager.current
    if (userId.isBlank()) return
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (darkTheme) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White.copy(alpha = 0.92f),
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(top = 8.dp)
            .border(1.dp, if (darkTheme) Color(0xFF94A3B8).copy(alpha = 0.22f) else Color(0xFFE2E8F0).copy(alpha = 0.7f), RoundedCornerShape(20.dp)),
    ) {
        Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(stringResource(R.string.profile_user_id), style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurfaceVariant, letterSpacing = 1.2.sp)
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    text = userId,
                    style = MaterialTheme.typography.bodyMedium,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = { clipboardManager.setText(AnnotatedString(userId)) }) {
                    Icon(Icons.Default.ContentCopy, contentDescription = "Copy", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                }
            }
            Text(stringResource(R.string.profile_user_id_hint), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

@Composable
private fun EditProfileDialog(
    user: User?,
    saving: Boolean,
    onDismiss: () -> Unit,
    onSave: (name: String?, phone: String?, bio: String?) -> Unit,
) {
    var name by remember { mutableStateOf(user?.displayName ?: "") }
    var phone by remember { mutableStateOf(user?.phone ?: "") }
    var bio by remember { mutableStateOf("") }
    val bioMaxLen = 160
    val nameError = if (name.isNotBlank() && name.length < 2) "Name must be at least 2 characters"
        else if (name.length > 60) "Name too long"
        else null

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.profile_edit_profile), fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = name,
                    onValueChange = { name = it },
                    label = { Text(stringResource(R.string.profile_full_name)) },
                    singleLine = true,
                    isError = nameError != null,
                    supportingText = nameError?.let { { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.labelSmall) } },
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = phone,
                    onValueChange = { phone = it },
                    label = { Text(stringResource(R.string.profile_phone_short)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Column {
                    OutlinedTextField(
                        value = bio,
                        onValueChange = { if (it.length <= bioMaxLen) bio = it },
                        label = { Text(stringResource(R.string.profile_bio_optional)) },
                        maxLines = 3,
                        modifier = Modifier.fillMaxWidth(),
                        supportingText = {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                                Text(
                                    "${bio.length}/$bioMaxLen",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (bio.length > bioMaxLen * 0.9) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        },
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onSave(name.ifBlank { null }, phone.ifBlank { null }, bio.ifBlank { null }) },
                enabled = !saving && nameError == null,
            ) { Text(if (saving) stringResource(R.string.commerce_saving) else stringResource(R.string.btn_save)) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.btn_cancel)) } },
    )
}

/* ── Social Links Edit Dialog (web-parity: EditProfile.jsx socialLinks) ── */
@Composable
private fun SocialLinksEditDialog(
    initial: Map<String, String>,
    onDismiss: () -> Unit,
    onSave: (Map<String, String>) -> Unit,
) {
    var twitter by remember { mutableStateOf(initial["twitter"] ?: "") }
    var instagram by remember { mutableStateOf(initial["instagram"] ?: "") }
    var linkedin by remember { mutableStateOf(initial["linkedin"] ?: "") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.profile_social_links), fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = twitter,
                    onValueChange = { twitter = it },
                    label = { Text(stringResource(R.string.profile_twitter)) },
                    placeholder = { Text(stringResource(R.string.profile_handle_hint)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = instagram,
                    onValueChange = { instagram = it },
                    label = { Text(stringResource(R.string.profile_instagram)) },
                    placeholder = { Text(stringResource(R.string.profile_handle_hint)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                OutlinedTextField(
                    value = linkedin,
                    onValueChange = { linkedin = it },
                    label = { Text(stringResource(R.string.profile_linkedin)) },
                    placeholder = { Text(stringResource(R.string.profile_linkedin_hint)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val links = buildMap<String, String> {
                    if (twitter.isNotBlank()) put("twitter", twitter.trim().removePrefix("@"))
                    if (instagram.isNotBlank()) put("instagram", instagram.trim().removePrefix("@"))
                    if (linkedin.isNotBlank()) put("linkedin", linkedin.trim())
                }
                onSave(links)
            }) { Text(stringResource(R.string.btn_save)) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(R.string.btn_cancel)) } },
    )
}

/* ── Compact action chip (4-per-row) ─────────────────────────────────────── */

@Composable
private fun CompactActionChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    accentColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = accentColor.copy(alpha = 0.1f),
        border = androidx.compose.foundation.BorderStroke(1.dp, accentColor.copy(alpha = 0.25f)),
        modifier = modifier,
    ) {
        Column(
            modifier = Modifier.padding(vertical = 10.dp, horizontal = 6.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Icon(icon, contentDescription = label, tint = accentColor, modifier = Modifier.size(20.dp))
            Text(label, fontSize = 10.sp, fontWeight = FontWeight.SemiBold, color = accentColor, maxLines = 1, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Center)
        }
    }
}
