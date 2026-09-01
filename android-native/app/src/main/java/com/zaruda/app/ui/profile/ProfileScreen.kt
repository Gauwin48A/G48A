package com.zaruda.app.ui.profile

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
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
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
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.PersonRemove
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Receipt
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.LinearProgressIndicator
import coil.compose.AsyncImage
import androidx.compose.ui.layout.ContentScale
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
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
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.res.stringResource
import com.zaruda.app.ui.theme.ColorTokens
import com.zaruda.app.R
import com.zaruda.app.ui.explore.SharedExploreStore
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.core.ApiError
import com.zaruda.app.core.ApiResult
import com.zaruda.app.core.userFacingMessage
import com.zaruda.app.data.remote.dto.ProfileUpdateRequest
import com.zaruda.app.data.repository.AuthRepository
import com.zaruda.app.data.repository.DashboardRepository
import com.zaruda.app.data.repository.RewardsRepository
import com.zaruda.app.data.repository.UploadRepository
import com.zaruda.app.data.repository.UserSocialRepository
import com.zaruda.app.domain.model.User
import com.zaruda.app.ui.components.AppEmptyState
import com.zaruda.app.ui.components.AppErrorState
import com.zaruda.app.ui.components.ErrorBanner
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.Stable
import javax.inject.Inject

// ── Demo user mock posts for profile gallery ──
private val DEMO_USER_POSTS: List<com.zaruda.app.domain.model.Post> = listOf(
    com.zaruda.app.domain.model.Post(id="demo_p1", title="iPhone 15 Pro Max 256GB – Natural Titanium", description="Brand new sealed. AppleCare+ eligible. 48MP camera.", price=119000.0, originalPrice=159900.0, imageUrl="https://picsum.photos/seed/demo_iphone15/400/300", category="electronics", subcategory="Phones", brand="Apple", condition="New", city="Mumbai", location="Mumbai, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=342, likeCount=28, createdAt="2024-03-15", sellerVerified=true, isNegotiable=true),
    com.zaruda.app.domain.model.Post(id="demo_p3", title="Sony WH-1000XM5 – Midnight Blue ANC Headphones", description="1 month old. Flawless ANC, 30hr battery. Carry case included.", price=18900.0, imageUrl="https://picsum.photos/seed/demo_sonyxm5/400/300", category="electronics", subcategory="Audio", brand="Sony", condition="Like New", city="Delhi", location="Delhi, DL", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=156, likeCount=18, createdAt="2024-03-01"),
    com.zaruda.app.domain.model.Post(id="demo_p4", title="Canon EOS R6 Mark II – Body + 24-105mm Kit Lens", description="6 months old. 24.2MP, 4K 60fps, IBIS. Includes extra battery.", price=185000.0, imageUrl="https://picsum.photos/seed/demo_canonr6/400/300", category="electronics", subcategory="Cameras", brand="Canon", condition="Used", city="Pune", location="Pune, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=490, likeCount=45, createdAt="2024-01-10"),
    com.zaruda.app.domain.model.Post(id="demo_p6", title="Nike Air Force 1 Low White – UK 9 Brand New", description="Deadstock, never worn. Original box. 100% authentic.", price=8500.0, imageUrl="https://picsum.photos/seed/demo_af1/400/300", category="fashion", subcategory="Shoes", brand="Nike", condition="New", city="Mumbai", location="Mumbai, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=620, likeCount=74, createdAt="2024-03-20"),
    com.zaruda.app.domain.model.Post(id="demo_p7", title="Levi\'s 512 Slim Taper Jeans – Black W32 L32", description="Brand new with tags. Premium stretch denim. Authentic Levi\'s.", price=2800.0, imageUrl="https://picsum.photos/seed/demo_levis512/400/300", category="fashion", subcategory="Men\'s Clothing", brand="Levi\'s", condition="New", city="Bengaluru", location="Bengaluru, KA", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=89, likeCount=8, createdAt="2024-02-28"),
    com.zaruda.app.domain.model.Post(id="demo_p11", title="Honda Activa 6G – Pearl White 2022", description="8,500 km driven. First owner. All service records.", price=68000.0, imageUrl="https://picsum.photos/seed/demo_activa/400/300", category="vehicles", subcategory="Scooters", brand="Honda", condition="Used", city="Pune", location="Pune, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=318, likeCount=38, createdAt="2024-03-18"),
    com.zaruda.app.domain.model.Post(id="demo_p13", title="Hyundai Grand i10 NIOS – Magna 1.2L Petrol 2020", description="35,000 km. First owner. Sunroof, touchscreen infotainment.", price=475000.0, imageUrl="https://picsum.photos/seed/demo_i10/400/300", category="vehicles", subcategory="Cars", brand="Hyundai", condition="Used", city="Mumbai", location="Mumbai, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=725, likeCount=89, createdAt="2024-01-30"),
    com.zaruda.app.domain.model.Post(id="demo_p15", title="IKEA KALLAX Shelf Unit – 4 Cube White", description="6 months old. Sturdy particleboard. Great for books & decor.", price=3500.0, imageUrl="https://picsum.photos/seed/demo_kallax/400/300", category="others", subcategory="Home & Furniture", brand="IKEA", condition="Used", city="Gurgaon", location="Gurgaon, HR", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=203, likeCount=22, createdAt="2024-03-08"),
    com.zaruda.app.domain.model.Post(id="demo_p18", title="2BHK Apartment for Rent – HSR Layout Bangalore", description="950 sqft. Semi-furnished 2BHK. Close to HSR Club, metro.", price=22000.0, imageUrl="https://picsum.photos/seed/demo_apartment/400/300", category="others", subcategory="Real Estate", brand=null, condition=null, city="Bengaluru", location="HSR Layout, Bengaluru", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=478, likeCount=45, createdAt="2024-03-25"),
)

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
    val editError: String? = null,
    val followersCount: Int = 0,
    val followingCount: Int = 0,
    val isFollowing: Boolean = false,
    val responseTimeMinutes: Int? = null,
    val socialLinks: Map<String, String> = emptyMap(),
    val isOwnProfile: Boolean = true,
    val userPosts: List<com.zaruda.app.domain.model.Post> = emptyList(),
    val reviews: List<UserReview> = emptyList(),
    val trustScore: com.zaruda.app.data.remote.dto.TrustScoreResponse? = null,
    val hasEliteBadge: Boolean = false,
    val showFollowersList: Boolean = false,
    val followers: List<com.zaruda.app.data.remote.dto.FollowUserBrief> = emptyList(),
    val following: List<com.zaruda.app.data.remote.dto.FollowUserBrief> = emptyList(),
    val profileActivity: List<com.zaruda.app.data.remote.dto.ProfileActivityItem> = emptyList(),
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
    private val dashboardRepo: com.zaruda.app.data.repository.DashboardRepository,
    private val rewardsRepo: RewardsRepository,
    private val socialRepo: UserSocialRepository,
    private val uploadRepo: com.zaruda.app.data.repository.UploadRepository,
    private val api: com.zaruda.app.data.remote.ZarudaApi,
) : ViewModel() {
    private val _state = MutableStateFlow(ProfileState())
    val state: StateFlow<ProfileState> = _state.asStateFlow()

    /** In-memory cache: preserves last known good state across config changes / re-navigation. */
    private var cachedProfile: ProfileState? = null

    init { load() }

    /**
     * Load profile data with:
     * - Proactive token refresh before API calls to prevent session-expired flickering
     * - Instant display of cached data (no loading spinner if we have it)
     * - Parallel execution of stats, referral code, and trust score
     * - Automatic retry for transient failures + token refresh retry on 401
     * - Cache-first: even on auth errors, show cached profile with non-blocking warning
     */
    fun load() {
        val current = _state.value
        // Prevent redundant loads if data is fresh
        if (current.user != null && System.currentTimeMillis() - current.lastLoadTimeMs < 30_000L) return

        // Show cached data instantly — no full-screen spinner if we already have data
        if (cachedProfile?.user != null && current.user == null) {
            cachedProfile?.let { _state.value = it.copy(loading = false, refreshing = true) }
        } else if (current.user == null) {
            _state.value = ProfileState(loading = true)
        }

        viewModelScope.launch {
            // Step 1: Proactively refresh token if we have a session but token may be expired
            if (repo.hasSession && !repo.isCurrentlyAuthenticated) {
                repo.tryRefreshToken()
            }

            // Step 2: Load profile
            val meResult = repo.me()
            when (meResult) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(
                        loading = false, refreshing = false, user = meResult.data,
                        lastLoadTimeMs = System.currentTimeMillis(), error = null,
                        isSessionExpired = false,
                    )
                }
                is ApiResult.Failure -> {
                    val isUnauth = meResult.error is ApiError.Unauthorized || meResult.error is ApiError.Forbidden
                    if (isUnauth) {
                        // Step 3: Retry with token refresh before declaring session expired
                        repo.tryRefreshToken()
                        when (val retry = repo.me()) {
                            is ApiResult.Success -> {
                                _state.value = _state.value.copy(
                                    loading = false, refreshing = false, user = retry.data,
                                    lastLoadTimeMs = System.currentTimeMillis(), error = null,
                                    isSessionExpired = false,
                                )
                            }
                            is ApiResult.Failure -> {
                                val expired = retry.error is ApiError.Unauthorized || retry.error is ApiError.Forbidden
                                // Cache-first: always prefer showing cached profile over blocking UI
                                if (cachedProfile?.user != null) {
                                    // Show cached profile with a non-blocking warning banner
                                    cachedProfile?.let { c ->
                                        _state.value = c.copy(
                                            loading = false, refreshing = false,
                                            error = if (expired)
                                                "Session expired. Please sign in again."
                                            else
                                                retry.error.userFacingMessage("refresh your profile"),
                                            isSessionExpired = expired,
                                        )
                                    }
                                } else if (repo.isDemoSession) {
                                    val demoUser = createDemoUser()
                                    _state.value = _state.value.copy(
                                        loading = false, refreshing = false,
                                        user = demoUser, error = null, isSessionExpired = false,
                                        userPosts = DEMO_USER_POSTS,
                                    )
                                    cachedProfile = _state.value
                                } else {
                                    // No cache available — show minimal error state
                                    _state.value = _state.value.copy(
                                        loading = false, refreshing = false,
                                        isSessionExpired = expired,
                                        error = retry.error.userFacingMessage("load your profile"),
                                    )
                                }
                            }
                        }
                    } else {
                        // Network/server error — fall back to cache or demo
                        if (cachedProfile?.user != null) {
                            cachedProfile?.let { c ->
                                _state.value = c.copy(
                                    loading = false, refreshing = false,
                                    error = meResult.error.userFacingMessage("refresh your profile"),
                                )
                            }
                        } else if (repo.isDemoSession) {
                            _state.value = _state.value.copy(
                                loading = false, refreshing = false,
                                user = createDemoUser(), error = null, isSessionExpired = false,
                                userPosts = DEMO_USER_POSTS,
                            )
                            cachedProfile = _state.value
                        } else {
                            _state.value = _state.value.copy(
                                loading = false, refreshing = false,
                                error = meResult.error.userFacingMessage("load your profile"),
                            )
                        }
                    }
                }
            }
            // Fire stats, referral code, and trust score concurrently
            coroutineScope {
                val statsDeferred = async { loadStats() }
                val referralDeferred = async { loadReferralCode() }
                val trustDeferred = async { loadTrustScore() }
                statsDeferred.await()
                referralDeferred.await()
                trustDeferred.await()
            }
            // Cache the successful state for instant display next time
            val s = _state.value
            if (s.user != null && s.error == null) {
                cachedProfile = s
            }
        }
    }

    fun refresh() {
        _state.value = _state.value.copy(refreshing = true)
        viewModelScope.launch {
            // Proactive token refresh before refresh call
            if (repo.hasSession && !repo.isCurrentlyAuthenticated) {
                repo.tryRefreshToken()
            }
            val meResult = repo.me()
            when (meResult) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    refreshing = false, user = meResult.data,
                    lastLoadTimeMs = System.currentTimeMillis(), error = null,
                )
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    refreshing = false,
                    error = meResult.error.userFacingMessage("refresh your profile"),
                )
            }
            // Parallel secondary loads
            coroutineScope {
                val statsDef = async { loadStats() }
                val referralDef = async { loadReferralCode() }
                val trustDef = async { loadTrustScore() }
                statsDef.await(); referralDef.await(); trustDef.await()
            }
            // Update cache
            val s = _state.value
            if (s.user != null && s.error == null) cachedProfile = s
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
            is ApiResult.Success -> _state.value = _state.value.copy(
                referralCode = r.data.user.referralCode,
                hasEliteBadge = r.data.user.hasEliteBadge,
            )
            is ApiResult.Failure -> {}
        }
    }

    fun updateProfile(fullName: String?, phone: String?, bio: String?, onDone: () -> Unit) {
        _state.value = _state.value.copy(editSaving = true, editError = null, editResult = null)
        
        // Handle demo sessions locally — no server to call
        if (repo.isDemoSession) {
            val currentUser = _state.value.user
            val updatedUser = currentUser?.copy(
                fullName = fullName ?: currentUser.fullName,
                phone = phone ?: currentUser.phone,
                bio = bio ?: currentUser.bio,
            )
            _state.value = _state.value.copy(
                editSaving = false,
                editResult = "Profile updated!",
                editError = null,
                user = updatedUser,
            )
            cachedProfile = _state.value
            onDone()
            return
        }
        
        viewModelScope.launch {
            when (val result = rewardsRepo.updateProfile(ProfileUpdateRequest(fullName = fullName, phone = phone, bio = bio))) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(editSaving = false, editResult = "Profile updated!", editError = null)
                    // Refresh user data
                    when (val result = repo.me()) {
                        is ApiResult.Success -> _state.value = _state.value.copy(user = result.data)
                        is ApiResult.Failure -> {}
                    }
                    onDone()
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    editSaving = false,
                    editError = result.error.userFacingMessage("save your profile"),
                )
            }
        }
    }

    fun clearEditResult() { _state.value = _state.value.copy(editResult = null, editError = null) }

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

    private fun createDemoUser(): User {
        return User(
            id = "demo_user",
            userId = "demo_user",
            fullName = "Demo User",
            phone = "+91-9876543210",
            email = "demo@zaruda.app",
            bio = "This is a demo account for preview purposes.",
            username = "demo_user",
            currentPlan = "premium",
            kycStatus = "verified",
            role = "seller",
            pictureUrl = null,
            coverImage = null,
            rewardsRank = "DEMO",
            isVerified = true,
        )
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

    fun loadFollowers() {
        val userId = _state.value.user?.stableId ?: return
        _state.value = _state.value.copy(showFollowersList = true)
        viewModelScope.launch {
            when (val r = socialRepo.followers(userId)) {
                is ApiResult.Success -> _state.value = _state.value.copy(followers = r.data.users)
                is ApiResult.Failure -> {}
            }
        }
    }

    fun loadFollowing() {
        val userId = _state.value.user?.stableId ?: return
        _state.value = _state.value.copy(showFollowersList = true)
        viewModelScope.launch {
            when (val r = socialRepo.following(userId)) {
                is ApiResult.Success -> _state.value = _state.value.copy(following = r.data.users)
                is ApiResult.Failure -> {}
            }
        }
    }

    fun dismissFollowersList() {
        _state.value = _state.value.copy(showFollowersList = false)
    }

    fun loadProfileActivity() {
        val current = _state.value
        if (current.profileActivity.isNotEmpty()) return
        val userId = current.user?.stableId ?: return
        viewModelScope.launch {
            when (val r = socialRepo.activity(userId)) {
                is ApiResult.Success -> _state.value = _state.value.copy(profileActivity = r.data.activities)
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

    private val _prefsLoaded = MutableStateFlow<com.zaruda.app.data.remote.dto.PreferencesResponse?>(null)
    val prefsLoaded: StateFlow<com.zaruda.app.data.remote.dto.PreferencesResponse?> = _prefsLoaded.asStateFlow()

    fun loadPreferences() {
        viewModelScope.launch {
            try {
                val resp = api.getPreferences()
                _prefsLoaded.value = resp
            } catch (_: Exception) {
                // Demo fallback — provide defaults so UI doesn't show N/A
                if (repo.isDemoSession && _prefsLoaded.value == null) {
                    _prefsLoaded.value = com.zaruda.app.data.remote.dto.PreferencesResponse(
                        location = "Mumbai, MH",
                        minPrice = null,
                        maxPrice = null,
                        categories = emptyList(),
                    )
                }
            }
        }
    }

    fun savePreferences(location: String, minPrice: Int?, maxPrice: Int?, categories: List<String> = emptyList()) {
        _prefsSaving.value = true
        
        // Sync with SharedExploreStore for ForYou page filtering
        SharedExploreStore.updateSelectedSubcategories(categories.toSet())
        
        // Handle demo sessions locally — no server to call
        if (repo.isDemoSession) {
            // Simulate saving by updating in-memory preferences
            val fakeResponse = com.zaruda.app.data.remote.dto.PreferencesResponse(
                location = location,
                minPrice = minPrice,
                maxPrice = maxPrice,
                categories = categories,
            )
            _prefsLoaded.value = fakeResponse
            _state.value = _state.value.copy(editResult = "Preferences saved")
            _prefsSaving.value = false
            return
        }
        
        viewModelScope.launch {
            try {
                api.updatePreferences(
                    com.zaruda.app.data.remote.dto.PreferencesUpdateRequest(
                        location = location,
                        minPrice = minPrice,
                        maxPrice = maxPrice,
                        categories = categories,
                    )
                )
                _state.value = _state.value.copy(editResult = "Preferences saved")
                loadPreferences()
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
        "premium" -> "Premium Plan"
        "gold" -> "Gold Plan"
        "silver" -> "Silver Plan"
        "bronze" -> "Bronze Plan"
        else -> "Starter"
    }
}

private val profileHeroGradientLight = listOf(
    Color(0xFF0EA5E9),
    Color(0xFF3B82F6),
    Color(0xFF8B5CF6),
)

private val profileHeroGradientDark = listOf(
    Color(0xFF1A2744),
    Color(0xFF2D3A6E),
    Color(0xFF3D2D6B),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    onSignedOut: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenMyPosts: () -> Unit,
    onOpenNotifications: () -> Unit = {},
    onOpenSecurity: () -> Unit = {},
    onOpenPayout: () -> Unit = {},

    onOpenAccountDelete: () -> Unit = {},
    onOpenPost: (String) -> Unit = {},
    onOpenOrders: () -> Unit = {},
    onOpenSaleUndone: () -> Unit = {},
    onOpenRecentlyViewed: () -> Unit = {},
    onOpenEditProfile: () -> Unit = {},
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val context = androidx.compose.ui.platform.LocalContext.current
    val darkTheme = ColorTokens.isDark
    val heroGradient = Brush.horizontalGradient(
        if (darkTheme) profileHeroGradientDark else profileHeroGradientLight,
    )

    LaunchedEffect(Unit) { viewModel.loadPreferences() }

    PullToRefreshBox(
        isRefreshing = state.refreshing,
        onRefresh = { viewModel.refresh() },
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
    ) {
            when {
                state.loading -> Box(
                    Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) { CircularProgressIndicator(color = MaterialTheme.colorScheme.primary) }

                else -> {
                    val user = state.user
                    val coverPickerLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
                        contract = androidx.activity.result.contract.ActivityResultContracts.GetContent()
                    ) { uri -> uri?.let { viewModel.uploadCoverImage(context, it) } }

                    // Edit result toast
                    state.editResult?.let { msg ->
                        androidx.compose.runtime.LaunchedEffect(msg) {
                            kotlinx.coroutines.delay(2500)
                            viewModel.clearEditResult()
                        }
                    }

                    var selectedTab by remember { mutableIntStateOf(0) }
                    var showEditDialog by remember { mutableStateOf(false) }

                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState()),
                    ) {
                        // Non-blocking session expired banner (keeps profile content visible)
                        if (state.isSessionExpired) {
                            Surface(
                                shape = RoundedCornerShape(0.dp),
                                color = if (darkTheme) Color(0xFF2D0A0A) else Color(0xFFFEF2F2),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    Icon(
                                        Icons.Outlined.Lock,
                                        contentDescription = null,
                                        tint = if (darkTheme) Color(0xFFFCA5A5) else Color(0xFFDC2626),
                                        modifier = Modifier.size(20.dp),
                                    )
                                    Column(Modifier.weight(1f)) {
                                        Text(
                                            stringResource(R.string.session_expired_title),
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 13.sp,
                                            color = if (darkTheme) Color(0xFFFCA5A5) else Color(0xFF991B1B),
                                        )
                                        Text(
                                            stringResource(R.string.session_expired_message),
                                            fontSize = 11.sp,
                                            color = if (darkTheme) Color(0xFFFCA5A5).copy(alpha = 0.85f) else Color(0xFFB91C1C),
                                        )
                                    }
                                    OutlinedButton(
                                        onClick = onSignedOut,
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                    ) {
                                        Text(stringResource(R.string.action_sign_in), fontSize = 11.sp)
                                    }
                                }
                            }
                        }
                        ErrorBanner(message = if (state.isSessionExpired) null else state.error)
                        state.editResult?.let { msg ->
                            ProfileFeedbackBanner(
                                message = msg,
                                isError = msg.contains("failed", ignoreCase = true),
                            )
                        }

                        // ─── Cover Image Section ────────────────────────────────
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(128.dp),
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
                                // Gradient overlay on cover image for better text contrast
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(
                                            Brush.verticalGradient(
                                                colors = listOf(
                                                    Color.Transparent,
                                                    Color.Black.copy(alpha = 0.65f),
                                                ),
                                                startY = 0f,
                                                endY = Float.POSITIVE_INFINITY,
                                            )
                                        )
                                )
                            }
                            // Edit cover button
                            Surface(
                                onClick = { coverPickerLauncher.launch("image/*") },
                                shape = CircleShape,
                                color = Color.Black.copy(alpha = 0.55f),
                                modifier = Modifier
                                    .align(Alignment.BottomEnd)
                                    .padding(12.dp)
                                    .size(32.dp),
                            ) {
                                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                    Icon(
                                        Icons.Default.CameraAlt,
                                        contentDescription = "Edit cover",
                                        tint = Color.White,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            }
                            // Plan tier badge on cover
                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopStart)
                                    .padding(12.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(Color.Black.copy(alpha = 0.4f))
                                    .padding(horizontal = 10.dp, vertical = 5.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Icon(Icons.Default.Star, null, tint = Color(0xFFFCD34D), modifier = Modifier.size(12.dp))
                                    Text(
                                        tierLabel(user?.currentPlan),
                                        color = Color.White,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                }
                            }
                        }

                        // ─── Hero Section — Modern Clean Layout ─────────────
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(heroGradient)
                                .padding(horizontal = 16.dp, vertical = 14.dp),
                        ) {
                            val completionPct = profileCompletion(user)
                            val avatarPickerLauncher = androidx.activity.compose.rememberLauncherForActivityResult(
                                contract = androidx.activity.result.contract.ActivityResultContracts.GetContent()
                            ) { uri -> uri?.let { viewModel.uploadAvatar(context, it) } }

                            Row(
                                verticalAlignment = Alignment.Top,
                                horizontalArrangement = Arrangement.spacedBy(14.dp),
                            ) {
                                // Avatar with ring
                                Box(contentAlignment = Alignment.BottomEnd) {
                                    AvatarWithRing(
                                        initial = user?.displayName?.firstOrNull()?.uppercaseChar() ?: '?',
                                        completionPercent = completionPct,
                                        size = 60.dp,
                                    )
                                    Surface(
                                        onClick = { avatarPickerLauncher.launch("image/*") },
                                        shape = CircleShape,
                                        color = Color(0xFF3B82F6).copy(alpha = 0.9f),
                                        border = BorderStroke(2.dp, Color.White),
                                        modifier = Modifier.size(24.dp).offset(x = 2.dp, y = 2.dp),
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Icon(Icons.Default.CameraAlt, "Upload avatar", tint = Color.White, modifier = Modifier.size(13.dp))
                                        }
                                    }
                                }

                                // Info column
                                Column(
                                    modifier = Modifier.weight(1f),
                                    verticalArrangement = Arrangement.spacedBy(4.dp),
                                ) {
                                    Text(
                                        text = user?.displayName ?: stringResource(R.string.profile_guest),
                                        style = MaterialTheme.typography.titleLarge,
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Text(
                                        text = user?.phone ?: user?.email ?: "",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = Color.White.copy(alpha = 0.75f),
                                    )

                                    // Bio
                                    user?.bio?.takeIf { it.isNotBlank() }?.let { bio ->
                                        Text(
                                            text = bio,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Color.White.copy(alpha = 0.8f),
                                            maxLines = 2,
                                            overflow = TextOverflow.Ellipsis,
                                        )
                                    }

                                    Spacer(Modifier.height(2.dp))

                                    // Followers / Following inline — clickable
                                    Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                        Text(
                                            stringResource(R.string.profile_followers_count, state.followersCount),
                                            style = MaterialTheme.typography.labelMedium,
                                            color = Color.White.copy(alpha = 0.9f),
                                            fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.clickable { viewModel.loadFollowers() },
                                        )
                                        Text(
                                            stringResource(R.string.profile_following_count, state.followingCount),
                                            style = MaterialTheme.typography.labelMedium,
                                            color = Color.White.copy(alpha = 0.9f),
                                            fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.clickable { viewModel.loadFollowing() },
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
                                                modifier = Modifier.size(26.dp),
                                            ) {
                                                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                                                    Text(
                                                        when (platform.lowercase()) {
                                                            "twitter" -> "🐦"
                                                            "instagram" -> "📸"
                                                            "linkedin" -> "in"
                                                            else -> "🌐"
                                                        },
                                                        color = Color.White,
                                                        fontSize = 12.sp,
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
                                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                                ) {
                                                    Icon(Icons.Default.ContentCopy, null, tint = Color.White.copy(alpha = 0.8f), modifier = Modifier.size(11.dp))
                                                    Text(handle, fontSize = 11.sp, color = Color.White.copy(alpha = 0.9f), fontWeight = FontWeight.Medium)
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

                        // Followers / Following bottom sheet
                        if (state.showFollowersList) {
                            FollowersBottomSheet(
                                followers = state.followers,
                                following = state.following,
                                onDismiss = { viewModel.dismissFollowersList() },
                            )
                        }

                        // Badges with wrapping layout
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 10.dp),
                        ) {
                            // Row 1: KYC + Tier + Elite
                            Row(
                                modifier = Modifier.fillMaxWidth(),
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
                                // Elite Seller badge
                                if (state.hasEliteBadge) {
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = Color(0xFF7C3AED).copy(alpha = 0.12f),
                                        border = BorderStroke(1.dp, Color(0xFF7C3AED).copy(alpha = 0.5f)),
                                    ) {
                                        Row(Modifier.padding(horizontal = 8.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                            Icon(Icons.Default.VerifiedUser, null, tint = Color(0xFF7C3AED), modifier = Modifier.size(12.dp))
                                            Text("Elite", style = MaterialTheme.typography.labelSmall, color = Color(0xFF7C3AED), fontWeight = FontWeight.SemiBold)
                                        }
                                    }
                                }
                            }
                            // Row 2: Role + Response Time
                            if (roleLabel != null || (state.responseTimeMinutes?.let { it > 0 } == true)) {
                                Spacer(Modifier.height(6.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    if (roleLabel != null) {
                                        Surface(
                                            shape = RoundedCornerShape(8.dp),
                                            color = MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                                            border = BorderStroke(1.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f)),
                                        ) {
                                            Text(roleLabel, modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
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

                            if (state.isOwnProfile) {

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
                                    if (state.isOwnProfile) {
                                        DropdownMenuItem(
                                            text = { Text(stringResource(R.string.profile_edit_profile)) },
                                            onClick = { onOpenEditProfile(); showMoreMenu = false },
                                            leadingIcon = { Icon(Icons.Default.Edit, null) },
                                        )
                                    }
                                }
                            }
                        }
                        // ─── Profile Tabs ─────────────────────────────────────
                        ScrollableTabRow(
                            selectedTabIndex = selectedTab,
                            edgePadding = 16.dp,
                            containerColor = if (darkTheme) Color(0xFF1E293B) else MaterialTheme.colorScheme.surface,
                            divider = { HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f)) },

                        ) {
                            Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text(stringResource(R.string.profile_tab_overview), fontWeight = if (selectedTab == 0) FontWeight.Bold else FontWeight.Normal, fontSize = 12.sp) })
                            Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text(stringResource(R.string.profile_tab_personal), fontWeight = if (selectedTab == 1) FontWeight.Bold else FontWeight.Normal, fontSize = 12.sp) })
                        }

                        if (selectedTab == 0) {
                        ProfileOverviewSections(
                            user = user,
                            referralCode = profileReferralCode(state.referralCode, user),
                            onEditPersonal = { showEditDialog = true },
                        )

                        // ─── Stats & Quick Actions (unified) ─────────────────────
                        Card(
                            shape = RoundedCornerShape(20.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = if (darkTheme) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White.copy(alpha = 0.92f),
                            ),
                            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
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
                                // Stats 2x2 grid
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

                                // Trust Score inline (compact)
                                state.trustScore?.let { ts ->
                                    if (ts.trustScore > 0f || ts.trustLabel != null) {
                                        HorizontalDivider(modifier = Modifier.padding(vertical = 2.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                                        val trustColor = when (ts.riskState?.lowercase()) {
                                            "low_risk", "trusted" -> Color(0xFF22C55E)
                                            "medium_risk" -> Color(0xFFF59E0B)
                                            "high_risk" -> Color(0xFFEF4444)
                                            else -> Color(0xFF6366F1)
                                        }
                                        Surface(
                                            shape = RoundedCornerShape(12.dp),
                                            color = trustColor.copy(alpha = 0.06f),
                                            modifier = Modifier.fillMaxWidth(),
                                        ) {
                                            Row(
                                                modifier = Modifier.padding(12.dp),
                                                verticalAlignment = Alignment.CenterVertically,
                                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                            ) {
                                                Box(Modifier.size(36.dp).clip(RoundedCornerShape(10.dp)).background(trustColor.copy(alpha = 0.12f)), contentAlignment = Alignment.Center) {
                                                    Icon(Icons.Default.VerifiedUser, null, tint = trustColor, modifier = Modifier.size(18.dp))
                                                }
                                                Column(Modifier.weight(1f)) {
                                                    Text(stringResource(R.string.profile_trust_score), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                        Text(ts.trustScore.toInt().toString() + "/100", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = trustColor)
                                                        if (ts.trustBadge != null) Text(ts.trustBadge, fontSize = 16.sp)
                                                    }
                                                }
                                                if (ts.trustLabel != null) {
                                                    Surface(shape = RoundedCornerShape(6.dp), color = trustColor.copy(alpha = 0.12f)) {
                                                        Text(ts.trustLabel, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall, color = trustColor, fontWeight = FontWeight.SemiBold)
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                // Quick Actions inline
                                HorizontalDivider(modifier = Modifier.padding(vertical = 2.dp), color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                                Text(
                                    "Quick Actions",
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    letterSpacing = 0.8.sp,
                                )
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    ProfileQuickActionButton(
                                        icon = Icons.Filled.RadioButtonUnchecked,
                                        label = "Repost",
                                        subtitle = "Relist this item",
                                        accentColor = Color(0xFFEF4444),
                                        onClick = onOpenSaleUndone,
                                        modifier = Modifier.weight(1f),
                                    )
                                }
                            }
                        }

                        // ─── User Posts removed — handled by MyHome page ──────

                        // ─── My Channel / Centre ─────────────────────────────
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF1E293B) else MaterialTheme.colorScheme.surface),
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
                                        Text("👤", fontSize = 20.sp)
                                    }
                                }
                                Column(Modifier.weight(1f)) {
                                    Text(stringResource(R.string.profile_my_channel), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                                    Text(stringResource(R.string.profile_my_channel_desc), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Icon(Icons.Default.ChevronRight, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                            }
                        }

                        }

                        // ─── All Settings (unified collapsible menu) ────────────────
                        var showSettingsExpanded by remember { mutableStateOf(false) }
                        Card(
                            shape = RoundedCornerShape(20.dp),
                            colors = CardDefaults.cardColors(containerColor = if (darkTheme) Color(0xFF0F172A).copy(alpha = 0.88f) else Color.White.copy(alpha = 0.92f)),
                            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                                .padding(top = 4.dp, bottom = 4.dp)
                                .border(1.dp, if (darkTheme) Color(0xFF94A3B8).copy(alpha = 0.24f) else Color(0xFFE2E8F0).copy(alpha = 0.75f), RoundedCornerShape(20.dp)),
                        ) {
                            Column {
                                Row(
                                    modifier = Modifier.fillMaxWidth().clickable { showSettingsExpanded = !showSettingsExpanded }.padding(horizontal = 14.dp, vertical = 12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    Box(Modifier.size(32.dp).clip(RoundedCornerShape(8.dp)).background(MaterialTheme.colorScheme.primaryContainer), contentAlignment = Alignment.Center) {
                                        Icon(Icons.Default.Settings, null, tint = MaterialTheme.colorScheme.onPrimaryContainer, modifier = Modifier.size(16.dp))
                                    }
                                    Column(Modifier.weight(1f)) {
                                        Text("All Settings", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                                        Text("Selling, orders, account & more", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                    Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(20.dp).graphicsLayer { rotationZ = if (showSettingsExpanded) 90f else 0f })
                                }
                                if (showSettingsExpanded) {
                                    HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                                    Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                        // Selling subgroup
                                        Text("Selling", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(vertical = 6.dp))
                                        ProfileMenuItemCompact(icon = Icons.AutoMirrored.Filled.ListAlt, label = "My Listings", subtitle = "Manage your active posts", onClick = onOpenMyPosts)
                                        ProfileMenuItemCompact(icon = Icons.Filled.AccountBalance, label = "Payout Account", subtitle = "UPI & bank details for payouts", onClick = onOpenPayout)

                                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f), modifier = Modifier.padding(vertical = 4.dp))

                                        // Orders subgroup
                                        Text("Orders", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(vertical = 6.dp))
                                        ProfileMenuItemCompact(icon = Icons.Default.Receipt, label = "Order History", subtitle = "Purchases and sales", onClick = onOpenOrders)

                                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f), modifier = Modifier.padding(vertical = 4.dp))

                                        // Account subgroup
                                        Text("Account", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary, modifier = Modifier.padding(vertical = 6.dp))
                                        ProfileMenuItemCompact(icon = Icons.Default.Notifications, label = "Notifications", subtitle = "Push alerts", onClick = onOpenNotifications)
                                        ProfileMenuItemCompact(icon = Icons.Default.Security, label = "Security", subtitle = "Password, 2FA", onClick = onOpenSecurity)
                                        ProfileMenuItemCompact(icon = Icons.Default.DeleteForever, label = "Delete Account", subtitle = "Remove your account", onClick = onOpenAccountDelete, tint = MaterialTheme.colorScheme.error)
                                    }
                                }
                            }
                        }

                        // ─── Sign Out (with confirmation) ──────────────────────
                        var showSignOutConfirm by remember { mutableStateOf(false) }
                        OutlinedButton(
                            onClick = { showSignOutConfirm = true },
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp)
                                .height(52.dp),
                        ) {
                            Icon(Icons.AutoMirrored.Filled.ExitToApp, contentDescription = null)
                            Spacer(Modifier.width(8.dp))
                            Text(stringResource(R.string.profile_sign_out), fontWeight = FontWeight.SemiBold)
                        }
                        if (showSignOutConfirm) {
                            AlertDialog(
                                onDismissRequest = { showSignOutConfirm = false },
                                title = { Text(stringResource(R.string.profile_sign_out), fontWeight = FontWeight.Bold) },
                                text = { Text(stringResource(R.string.profile_sign_out_confirm_message)) },
                                confirmButton = {
                                    TextButton(
                                        onClick = {
                                            showSignOutConfirm = false
                                            viewModel.logout(onSignedOut)
                                        },
                                    ) {
                                        Text(stringResource(R.string.profile_sign_out_yes), color = MaterialTheme.colorScheme.error, fontWeight = FontWeight.Bold)
                                    }
                                },
                                dismissButton = {
                                    TextButton(onClick = { showSignOutConfirm = false }) {
                                        Text(stringResource(R.string.profile_sign_out_no))
                                    }
                                },
                            )
                        }
                        Spacer(Modifier.height(24.dp))

                        // ─── Tab 1: Personal Info ─────────────────────────────
                        if (selectedTab == 1) {
                            PersonalInfoTab(
                                user = user,
                                onEdit = { showEditDialog = true },
                            )
                        }

                        // ─── Tab content for out-of-range tabs (safe fallback) ────
                        if (selectedTab >= 3) {
                            selectedTab = 0
                        }

                        Spacer(Modifier.height(24.dp))
                    }

                    // ─── Edit Profile Dialog ──────────────────────────────────────
                    if (showEditDialog) {
                        EditProfileDialog(
                            user = user,
                            saving = state.editSaving,
                            saveError = state.editError,
                            onDismiss = { showEditDialog = false },
                            onSave = { name, phone, bio ->
                                viewModel.updateProfile(name, phone, bio) {
                                    showEditDialog = false
                                }
                            },
                        )
                    }
                }
            }
    }
}

// ── Tab composables ───────────────────────────────────────────────────────────

@Composable
private fun ProfileOverviewSections(
    user: User?,
    referralCode: String,
    onEditPersonal: () -> Unit,
) {
    val clipboardManager = LocalClipboardManager.current

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(top = 12.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        ProfileExpandableSection(
            title = stringResource(R.string.profile_personal_info),
            subtitle = stringResource(R.string.profile_overview_personal_subtitle),
            actionLabel = stringResource(R.string.profile_edit),
            onAction = onEditPersonal,
            defaultExpanded = true,
        ) {
            ProfileInfoRow(stringResource(R.string.profile_full_name), user?.displayName)
            ProfileInfoRow(stringResource(R.string.profile_email), user?.email)
            ProfileInfoRow(stringResource(R.string.profile_phone), user?.phone)
            ProfileInfoRow(stringResource(R.string.profile_bio_optional), user?.bio)
            ProfileInfoRow(stringResource(R.string.profile_current_plan), tierLabel(user?.currentPlan))
            ProfileInfoRow(stringResource(R.string.profile_verification_status), user?.kycStatus?.replaceFirstChar { it.uppercase() })
        }

        ProfileExpandableSection(
            title = stringResource(R.string.profile_referral_code),
            subtitle = stringResource(R.string.profile_overview_referral_subtitle),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    text = referralCode,
                    style = MaterialTheme.typography.titleMedium,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = { clipboardManager.setText(AnnotatedString(referralCode)) }) {
                    Icon(Icons.Default.ContentCopy, contentDescription = stringResource(R.string.profile_copy_referral), tint = MaterialTheme.colorScheme.primary)
                }
            }
        }
    }
}

@Composable
private fun ProfileExpandableSection(
    title: String,
    subtitle: String,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
    defaultExpanded: Boolean = false,
    content: @Composable () -> Unit,
) {
    var expanded by remember { mutableStateOf(defaultExpanded) }
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = !expanded }
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Column(Modifier.weight(1f)) {
                    Text(title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                    Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                if (expanded && actionLabel != null && onAction != null) {
                    TextButton(onClick = onAction) {
                        Text(actionLabel, style = MaterialTheme.typography.labelMedium)
                    }
                }
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier
                        .size(20.dp)
                        .graphicsLayer { rotationZ = if (expanded) 90f else 0f },
                )
            }
            if (expanded) {
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                Column(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    content()
                }
            }
        }
    }
}

@Composable
private fun ProfileInfoRow(label: String, value: String?) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.weight(0.9f),
        )
        Text(
            text = profileDisplayValue(value),
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.End,
            modifier = Modifier.weight(1.1f),
        )
    }
}

@Composable
private fun PersonalInfoTab(
    user: com.zaruda.app.domain.model.User?,
    onEdit: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(stringResource(R.string.profile_personal_info), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)

        Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                ProfileInfoRow(stringResource(R.string.profile_full_name), user?.displayName)
                ProfileInfoRow(stringResource(R.string.profile_phone), user?.phone)
                ProfileInfoRow(stringResource(R.string.profile_email), user?.email)
                ProfileInfoRow(stringResource(R.string.profile_bio), user?.bio)
                ProfileInfoRow(stringResource(R.string.profile_user_id), user?.stableId)
                ProfileInfoRow(stringResource(R.string.profile_current_plan), tierLabel(user?.currentPlan))

                Button(
                    onClick = onEdit,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF6366F1)),
                ) {
                    Icon(Icons.Default.Edit, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.profile_edit_profile), fontWeight = FontWeight.SemiBold)
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

private fun profileDisplayValue(value: String?): String = value?.trim()?.takeIf { it.isNotBlank() } ?: "N/A"

private fun profileReferralCode(explicitCode: String?, user: User?): String {
    explicitCode?.trim()?.takeIf { it.isNotBlank() }?.let { return it }
    user?.rewardsRank?.trim()?.takeIf { it.isNotBlank() }?.let { return it }
    val suffix = user?.stableId
        ?.filter { it.isLetterOrDigit() }
        ?.takeLast(6)
        ?.uppercase()
        ?.takeIf { it.isNotBlank() }
        ?: "USER"
    return "REF$suffix"
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
    val darkTheme = ColorTokens.isDark
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
    val darkTheme = ColorTokens.isDark
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
    val darkTheme = ColorTokens.isDark
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
    val darkTheme = ColorTokens.isDark
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
    val darkTheme = ColorTokens.isDark
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
    val darkTheme = ColorTokens.isDark
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
private fun ProfileMenuItemCompact(
    icon: ImageVector,
    label: String,
    subtitle: String,
    onClick: () -> Unit,
    tint: Color = MaterialTheme.colorScheme.onSurface,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(10.dp),
        color = Color.Transparent,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(Modifier.size(28.dp).clip(RoundedCornerShape(6.dp)).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = tint, modifier = Modifier.size(14.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(label, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, color = tint)
                Text(subtitle, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(Icons.Default.ChevronRight, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
        }
    }
}

@Composable
private fun UserIdSection(userId: String) {
    val darkTheme = ColorTokens.isDark
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
private fun ProfileFeedbackBanner(message: String, isError: Boolean) {
    val darkTheme = ColorTokens.isDark
    val bg = if (isError) MaterialTheme.colorScheme.errorContainer else if (darkTheme) Color(0xFF0F2E20) else Color(0xFFDCFCE7)
    val fg = if (isError) MaterialTheme.colorScheme.onErrorContainer else if (darkTheme) Color(0xFF6EE7B7) else Color(0xFF166534)
    Surface(shape = RoundedCornerShape(14.dp), color = bg, modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Icon(if (isError) Icons.Default.ErrorOutline else Icons.Default.CheckCircle, contentDescription = null, tint = fg, modifier = Modifier.size(18.dp))
            Text(message, style = MaterialTheme.typography.bodySmall, color = fg, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun EditProfileDialog(
    user: User?,
    saving: Boolean,
    saveError: String?,
    onDismiss: () -> Unit,
    onSave: (name: String?, phone: String?, bio: String?) -> Unit,
) {
    val initialName = user?.displayName.orEmpty()
    val initialPhone = user?.phone.orEmpty()
    val initialBio = user?.bio.orEmpty()
    var name by remember(user?.id, initialName) { mutableStateOf(initialName) }
    var phone by remember(user?.id, initialPhone) { mutableStateOf(initialPhone) }
    var bio by remember(user?.id, initialBio) { mutableStateOf(initialBio) }
    val bioMaxLen = 160
    val trimmedName = name.trim()
    val trimmedPhone = phone.trim()
    val trimmedBio = bio.trim()
    val nameError = if (trimmedName.isNotBlank() && trimmedName.length < 2) "Name must be at least 2 characters"
        else if (name.length > 60) "Name too long"
        else null
    val phoneError = if (trimmedPhone.length > 20) "Phone is too long" else null
    val canSave = !saving && nameError == null && phoneError == null

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        val config = androidx.compose.ui.platform.LocalConfiguration.current
        val sheetMaxHeight = config.screenHeightDp * 0.85f
        val scrollState = rememberScrollState()
        Surface(
            shape = RoundedCornerShape(24.dp),
            tonalElevation = 6.dp,
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = sheetMaxHeight.dp)
                .padding(horizontal = 18.dp)
                .imePadding()
                .navigationBarsPadding(),
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                // Fixed gradient header with avatar preview
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            Brush.horizontalGradient(listOf(Color(0xFF6366F1), Color(0xFF8B5CF6), Color(0xFFA855F7)))
                        )
                        .padding(20.dp),
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                (user?.displayName?.firstOrNull() ?: '?').uppercaseChar().toString(),
                                fontWeight = FontWeight.Bold,
                                fontSize = 24.sp,
                                color = Color.White,
                            )
                        }
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) {
                            Text("Edit Profile", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = Color.White)
                            Text("Update your personal details", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.8f))
                        }
                        IconButton(onClick = onDismiss, enabled = !saving) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = Color.White.copy(alpha = 0.9f))
                        }
                    }
                }

                // Scrollable content area (takes remaining space)
                Column(
                    modifier = Modifier
                        .weight(1f, fill = false)
                        .verticalScroll(scrollState)
                        .fillMaxWidth()
                        .padding(start = 20.dp, end = 20.dp, top = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    saveError?.let { message ->
                        Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.errorContainer, modifier = Modifier.fillMaxWidth()) {
                            Row(Modifier.padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Default.ErrorOutline, null, tint = MaterialTheme.colorScheme.onErrorContainer, modifier = Modifier.size(18.dp))
                                Text(message, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onErrorContainer)
                            }
                        }
                    }

                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text("Full Name") },
                        placeholder = { Text("Add your full name") },
                        leadingIcon = { Icon(Icons.Default.Person, null, modifier = Modifier.size(18.dp)) },
                        singleLine = true,
                        enabled = !saving,
                        isError = nameError != null,
                        supportingText = {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text(nameError ?: "2-60 characters", style = MaterialTheme.typography.labelSmall, color = if (nameError != null) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant)
                                Text(name.length.toString() + "/60", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        },
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth(),
                    )

                    OutlinedTextField(
                        value = phone,
                        onValueChange = { phone = it.take(20) },
                        label = { Text("Phone Number") },
                        placeholder = { Text("Add phone number") },
                        leadingIcon = { Icon(Icons.Filled.Phone, null, modifier = Modifier.size(18.dp)) },
                        singleLine = true,
                        enabled = !saving,
                        isError = phoneError != null,
                        supportingText = phoneError?.let { { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.labelSmall) } },
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth(),
                    )

                    OutlinedTextField(
                        value = bio,
                        onValueChange = { if (it.length <= bioMaxLen) bio = it },
                        label = { Text("Bio (optional)") },
                        placeholder = { Text("Short intro, interests, or selling style") },
                        leadingIcon = { Icon(Icons.Filled.Info, null, modifier = Modifier.size(18.dp)) },
                        enabled = !saving,
                        maxLines = 4,
                        minLines = 3,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth(),
                        supportingText = {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                                Text(
                                    bio.length.toString() + "/" + bioMaxLen.toString(),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = if (bio.length > bioMaxLen * 0.9) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        },
                    )

                    // Profile completeness indicator
                    val completeness = listOf(
                        trimmedName.isNotBlank() to "Name added",
                        trimmedPhone.isNotBlank() to "Phone added",
                        trimmedBio.isNotBlank() to "Bio added",
                    )
                    val completedCount = completeness.count { it.first }
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Profile Completeness", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                                Spacer(Modifier.weight(1f))
                                Text(completedCount.toString() + "/3", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                            }
                            Spacer(Modifier.height(6.dp))
                            LinearProgressIndicator(
                                progress = { completedCount / 3f },
                                color = MaterialTheme.colorScheme.primary,
                                trackColor = MaterialTheme.colorScheme.surfaceVariant,
                                modifier = Modifier.fillMaxWidth().height(4.dp).clip(RoundedCornerShape(2.dp)),
                            )
                            Spacer(Modifier.height(6.dp))
                            completeness.forEach { (done, label) ->
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                    Icon(
                                        if (done) Icons.Filled.CheckCircle else Icons.Filled.RadioButtonUnchecked,
                                        null,
                                        tint = if (done) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.size(12.dp),
                                    )
                                    Text(label, fontSize = 11.sp, color = if (done) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }

                // Fixed footer — always visible Save/Cancel buttons
                Surface(
                    tonalElevation = 8.dp,
                    color = MaterialTheme.colorScheme.surface,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 20.dp, vertical = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        OutlinedButton(
                            onClick = onDismiss,
                            enabled = !saving,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.weight(1f),
                        ) {
                            Text("Cancel", modifier = Modifier.padding(vertical = 4.dp))
                        }
                        Button(
                            onClick = {
                                onSave(
                                    trimmedName.ifBlank { null },
                                    trimmedPhone.ifBlank { null },
                                    trimmedBio.ifBlank { null },
                                )
                            },
                            enabled = canSave,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF6366F1),
                            ),
                        ) {
                            if (saving) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                                Spacer(Modifier.width(8.dp))
                            }
                            Text(if (saving) "Saving..." else "Save Changes", fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    }
}

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

/* ── Quick action button (2-per-row) ───────────────────────────────────── */

@Composable
private fun ProfileQuickActionButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    subtitle: String,
    accentColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        color = accentColor.copy(alpha = 0.08f),
        border = androidx.compose.foundation.BorderStroke(1.5.dp, accentColor.copy(alpha = 0.3f)),
        shadowElevation = 2.dp,
        modifier = modifier,
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(accentColor.copy(alpha = 0.12f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = label, tint = accentColor, modifier = Modifier.size(18.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(label, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
                Text(subtitle, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Icon(Icons.Default.ChevronRight, null, tint = accentColor.copy(alpha = 0.5f), modifier = Modifier.size(16.dp))
        }
    }
}
// ── Followers / Following Bottom Sheet ───────────────────────────────────

@Composable
private fun FollowersBottomSheet(
    followers: List<com.zaruda.app.data.remote.dto.FollowUserBrief>,
    following: List<com.zaruda.app.data.remote.dto.FollowUserBrief>,
    onDismiss: () -> Unit,
) {
    val showFollowing = remember { mutableStateOf(false) }
    val list = if (showFollowing.value) following else followers
    val title = if (showFollowing.value) "Following" else "Followers"
    val emptyMsg = if (showFollowing.value) "Not following anyone yet" else "No followers yet"

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .heightIn(max = 480.dp),
        ) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        TextButton(onClick = { showFollowing.value = false }, enabled = !showFollowing.value) {
                            Text("Followers (${followers.size})", style = MaterialTheme.typography.labelSmall)
                        }
                        TextButton(onClick = { showFollowing.value = true }, enabled = showFollowing.value) {
                            Text("Following (${following.size})", style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }
                HorizontalDivider()
                if (list.isEmpty()) {
                    Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                        Text(emptyMsg, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.verticalScroll(rememberScrollState())) {
                        list.forEach { user ->
                            Row(
                                modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)).padding(10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                            ) {
                                Box(modifier = Modifier.size(36.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primary), contentAlignment = Alignment.Center) {
                                    Text(user.initials, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimary)
                                }
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(user.displayName, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                                    user.username?.let {
                                        Text("@$it", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                                if (user.isVerified) {
                                    Text("\u2713", color = Color(0xFF3B82F6), fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                }
                                if (user.isFollowingBack) {
                                    Surface(shape = RoundedCornerShape(6.dp), color = MaterialTheme.colorScheme.primary.copy(alpha = 0.1f)) {
                                        Text("Follows you", modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary, fontSize = 9.sp)
                                    }
                                }
                            }
                        }
                    }
                }
                OutlinedButton(onClick = onDismiss, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().height(40.dp)) {
                    Text("Close", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

// ── Activity Feed ─────────────────────────────────────────────────────────────

