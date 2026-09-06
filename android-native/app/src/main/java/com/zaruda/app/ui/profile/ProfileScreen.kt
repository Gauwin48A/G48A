package com.zaruda.app.ui.profile

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.*
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.zaruda.app.R
import com.zaruda.app.core.ApiError
import com.zaruda.app.core.ApiResult
import com.zaruda.app.core.userFacingMessage
import com.zaruda.app.data.remote.ZarudaApi
import com.zaruda.app.data.remote.dto.FollowUserBrief
import com.zaruda.app.data.remote.dto.FullProfileResponse
import com.zaruda.app.data.remote.dto.PreferencesResponse
import com.zaruda.app.data.remote.dto.PreferencesUpdateRequest
import com.zaruda.app.data.remote.dto.ProfileActivityItem
import com.zaruda.app.data.remote.dto.ProfileUpdateRequest
import com.zaruda.app.data.remote.dto.TrustScoreResponse
import com.zaruda.app.data.repository.AnalyticsRepository
import com.zaruda.app.data.repository.AuthRepository
import com.zaruda.app.data.repository.DashboardRepository
import com.zaruda.app.data.repository.RewardsRepository
import com.zaruda.app.data.repository.UploadRepository
import com.zaruda.app.data.repository.UserSocialRepository
import com.zaruda.app.domain.model.Post
import com.zaruda.app.domain.model.User
import com.zaruda.app.ui.components.AppEmptyState
import com.zaruda.app.ui.components.ErrorBanner
import com.zaruda.app.ui.explore.SharedExploreStore
import com.zaruda.app.ui.theme.ColorTokens
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

// ── Demo user mock posts for profile gallery ──
private val DEMO_USER_POSTS: List<Post> = listOf(
    Post(id="demo_p1", title="iPhone 15 Pro Max 256GB – Natural Titanium", description="Brand new sealed. AppleCare+ eligible. 48MP camera.", price=119000.0, originalPrice=159900.0, imageUrl="https://picsum.photos/seed/demo_iphone15/400/300", category="electronics", subcategory="Phones", brand="Apple", condition="New", city="Mumbai", location="Mumbai, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=342, likeCount=28, createdAt="2024-03-15", sellerVerified=true, isNegotiable=true),
    Post(id="demo_p3", title="Sony WH-1000XM5 – Midnight Blue ANC Headphones", description="1 month old. Flawless ANC, 30hr battery. Carry case included.", price=18900.0, imageUrl="https://picsum.photos/seed/demo_sonyxm5/400/300", category="electronics", subcategory="Audio", brand="Sony", condition="Like New", city="Delhi", location="Delhi, DL", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=156, likeCount=18, createdAt="2024-03-01"),
    Post(id="demo_p4", title="Canon EOS R6 Mark II – Body + 24-105mm Kit Lens", description="6 months old. 24.2MP, 4K 60fps, IBIS. Includes extra battery.", price=185000.0, imageUrl="https://picsum.photos/seed/demo_canonr6/400/300", category="electronics", subcategory="Cameras", brand="Canon", condition="Used", city="Pune", location="Pune, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=490, likeCount=45, createdAt="2024-01-10"),
    Post(id="demo_p6", title="Nike Air Force 1 Low White – UK 9 Brand New", description="Deadstock, never worn. Original box. 100% authentic.", price=8500.0, imageUrl="https://picsum.photos/seed/demo_af1/400/300", category="fashion", subcategory="Shoes", brand="Nike", condition="New", city="Mumbai", location="Mumbai, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=620, likeCount=74, createdAt="2024-03-20"),
    Post(id="demo_p7", title="Levi's 512 Slim Taper Jeans – Black W32 L32", description="Brand new with tags. Premium stretch denim. Authentic Levi's.", price=2800.0, imageUrl="https://picsum.photos/seed/demo_levis512/400/300", category="fashion", subcategory="Men's Clothing", brand="Levi's", condition="New", city="Bengaluru", location="Bengaluru, KA", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=89, likeCount=8, createdAt="2024-02-28"),
    Post(id="demo_p11", title="Honda Activa 6G – Pearl White 2022", description="8,500 km driven. First owner. All service records.", price=68000.0, imageUrl="https://picsum.photos/seed/demo_activa/400/300", category="vehicles", subcategory="Scooters", brand="Honda", condition="Used", city="Pune", location="Pune, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=318, likeCount=38, createdAt="2024-03-18"),
    Post(id="demo_p13", title="Hyundai Grand i10 NIOS – Magna 1.2L Petrol 2020", description="35,000 km. First owner. Sunroof, touchscreen infotainment.", price=475000.0, imageUrl="https://picsum.photos/seed/demo_i10/400/300", category="vehicles", subcategory="Cars", brand="Hyundai", condition="Used", city="Mumbai", location="Mumbai, MH", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=725, likeCount=89, createdAt="2024-01-30"),
    Post(id="demo_p15", title="IKEA KALLAX Shelf Unit – 4 Cube White", description="6 months old. Sturdy particleboard. Great for books & decor.", price=3500.0, imageUrl="https://picsum.photos/seed/demo_kallax/400/300", category="others", subcategory="Home & Furniture", brand="IKEA", condition="Used", city="Gurgaon", location="Gurgaon, HR", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=203, likeCount=22, createdAt="2024-03-08"),
    Post(id="demo_p18", title="2BHK Apartment for Rent – HSR Layout Bangalore", description="950 sqft. Semi-furnished 2BHK. Close to HSR Club, metro.", price=22000.0, imageUrl="https://picsum.photos/seed/demo_apartment/400/300", category="others", subcategory="Real Estate", brand=null, condition=null, city="Bengaluru", location="HSR Layout, Bengaluru", sellerName="Demo User", userId="demo_user", userName="Demo User", status="active", viewCount=478, likeCount=45, createdAt="2024-03-25"),
)

@Stable
data class ProfileState(
    val loading: Boolean = false,
    val refreshing: Boolean = false,
    val user: User? = null,
    val listingsCount: String = "0",
    val salesCount: String = "0",
    val ratingValue: String = "4.9",
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
    val userPosts: List<Post> = emptyList(),
    val reviews: List<UserReview> = emptyList(),
    val trustScore: TrustScoreResponse? = null,
    val hasEliteBadge: Boolean = false,
    val showFollowersList: Boolean = false,
    val followers: List<FollowUserBrief> = emptyList(),
    val following: List<FollowUserBrief> = emptyList(),
    val profileActivity: List<ProfileActivityItem> = emptyList(),
    val dataExportDone: Boolean = false,
    val lastLoadTimeMs: Long = 0L,
    val profileViews: Int? = null,
    val viewsTrend: List<Float>? = null,
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
    private val dashboardRepo: DashboardRepository,
    private val rewardsRepo: RewardsRepository,
    private val socialRepo: UserSocialRepository,
    private val uploadRepo: UploadRepository,
    private val analyticsRepo: AnalyticsRepository,
    private val api: ZarudaApi,
) : ViewModel() {
    private val _state = MutableStateFlow(ProfileState())
    val state: StateFlow<ProfileState> = _state.asStateFlow()

    private var cachedProfile: ProfileState? = null

    init {
        load()
    }

    fun load() {
        val current = _state.value
        if (current.user != null && System.currentTimeMillis() - current.lastLoadTimeMs < 30_000L) return

        // If unauthenticated and not demo, gracefully set Guest state without error or session warning
        if (!repo.hasSession && !repo.isDemoSession) {
            _state.value = ProfileState(
                loading = false,
                refreshing = false,
                user = null,
                error = null,
                isSessionExpired = false,
                lastLoadTimeMs = System.currentTimeMillis(),
            )
            return
        }

        if (cachedProfile?.user != null && current.user == null) {
            cachedProfile?.let { _state.value = it.copy(loading = false, refreshing = true) }
        } else if (current.user == null) {
            _state.value = ProfileState(loading = true)
        }

        viewModelScope.launch {
            if (repo.hasSession && !repo.isCurrentlyAuthenticated) {
                repo.tryRefreshToken()
            }

            val fullResult = dashboardRepo.getFullProfile()
            when (fullResult) {
                is ApiResult.Success -> {
                    applyFullProfileResponse(fullResult.data)
                }
                is ApiResult.Failure -> {
                    loadViaLegacyFlow()
                }
            }

            when (val r = analyticsRepo.sellerStats()) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    profileViews = r.data.totalViews,
                    viewsTrend = null,
                )
                is ApiResult.Failure -> {}
            }

            val s = _state.value
            if (s.user != null && s.error == null) {
                cachedProfile = s
            }
        }
    }

    private fun applyFullProfileResponse(full: FullProfileResponse) {
        val fullUser = full.user ?: return
        val fullProfile = full.profile ?: com.zaruda.app.data.remote.dto.FullProfileData()
        val verification = full.verification ?: com.zaruda.app.data.remote.dto.FullProfileVerification()
        val stats = full.stats ?: com.zaruda.app.data.remote.dto.FullProfileStats()

        val user = User(
            userId = fullUser.userId,
            id = fullUser.userId,
            fullName = fullProfile.fullName ?: fullUser.name,
            name = fullUser.name,
            phone = fullUser.phone,
            email = fullUser.email,
            role = fullUser.role,
            currentPlan = fullUser.currentPlan,
            rewardsRank = fullUser.rewardsRank,
            rewardBadge = fullUser.rewardBadge,
            coins = fullUser.coins,
            bio = fullProfile.bio,
            address = fullProfile.location?.address,
            location = fullProfile.location?.address,
            pictureUrl = fullProfile.avatarUrl?.takeIf { it.isNotBlank() },
            coverImage = fullProfile.coverImageUrl?.takeIf { it.isNotBlank() },
            socialLinks = fullProfile.socialLinks,
            isVerified = verification.aadhaarVerified || verification.kycStatus == "verified",
            kycStatus = verification.kycStatus,
        )

        val trustResp = TrustScoreResponse(
            trustScore = verification.trustScore.toFloat(),
            trustLabel = verification.trustBadge,
            trustBadge = verification.trustBadge,
        )

        _state.value = _state.value.copy(
            loading = false,
            refreshing = false,
            user = user,
            listingsCount = stats.activeListings.toString(),
            salesCount = stats.soldListings.toString(),
            error = null,
            isSessionExpired = false,
            socialLinks = fullProfile.socialLinks ?: emptyMap(),
            trustScore = trustResp,
            lastLoadTimeMs = System.currentTimeMillis(),
        )
    }

    private suspend fun loadViaLegacyFlow() {
        if (!repo.hasSession && !repo.isDemoSession) {
            _state.value = ProfileState(loading = false, refreshing = false, user = null, error = null, isSessionExpired = false)
            return
        }

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
                if (isUnauth && repo.hasSession) {
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
                            if (cachedProfile?.user != null) {
                                cachedProfile?.let { c ->
                                    _state.value = c.copy(
                                        loading = false, refreshing = false,
                                        error = if (expired) "Session expired. Please sign in again."
                                        else retry.error.userFacingMessage("refresh your profile"),
                                        isSessionExpired = expired,
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
                                    user = null,
                                    isSessionExpired = false,
                                    error = null,
                                )
                            }
                        }
                    }
                } else {
                    if (repo.isDemoSession) {
                        _state.value = _state.value.copy(
                            loading = false, refreshing = false,
                            user = createDemoUser(), error = null, isSessionExpired = false,
                            userPosts = DEMO_USER_POSTS,
                        )
                        cachedProfile = _state.value
                    } else {
                        _state.value = _state.value.copy(
                            loading = false, refreshing = false,
                            user = null,
                            error = null,
                        )
                    }
                }
            }
        }

        if (_state.value.user != null) {
            coroutineScope {
                val statsDeferred = async { loadStats() }
                val referralDeferred = async { loadReferralCode() }
                val trustDeferred = async { loadTrustScore() }
                statsDeferred.await()
                referralDeferred.await()
                trustDeferred.await()
            }
        }
    }

    private fun createDemoUser(): User {
        return User(
            id = "demo_user",
            userId = "demo_user",
            name = "Demo User",
            fullName = "Demo User",
            email = "demo@example.com",
            phone = "+91 98765 43210",
            role = "user",
            currentPlan = "Premium",
            rewardBadge = "VIP",
            coins = 1450,
            bio = "Verified Pro Trader. Electronics & Luxury Goods enthusiast.",
            isVerified = true,
            kycStatus = "verified",
        )
    }

    fun refresh() {
        _state.value = _state.value.copy(refreshing = true)
        viewModelScope.launch {
            if (repo.hasSession && !repo.isCurrentlyAuthenticated) {
                repo.tryRefreshToken()
            }
            val fullResult = dashboardRepo.getFullProfile()
            when (fullResult) {
                is ApiResult.Success -> applyFullProfileResponse(fullResult.data)
                is ApiResult.Failure -> loadViaLegacyFlow()
            }
        }
    }

    private suspend fun loadStats() {
        when (val r = dashboardRepo.get()) {
            is ApiResult.Success -> {
                val stats = r.data.quickStats
                val listings = stats.firstOrNull { it.labelKey == "listings" || it.label?.contains("listing", true) == true }?.value?.toString() ?: "0"
                val sales = stats.firstOrNull { it.labelKey == "sales" || it.label?.contains("sale", true) == true }?.value?.toString() ?: "0"
                _state.value = _state.value.copy(
                    listingsCount = listings,
                    salesCount = sales,
                    ratingValue = "4.9",
                )
            }
            is ApiResult.Failure -> {}
        }
    }

    private suspend fun loadReferralCode() {
        when (val r = rewardsRepo.overview()) {
            is ApiResult.Success -> {
                val code = r.data.user.referralCode
                _state.value = _state.value.copy(referralCode = code)
            }
            is ApiResult.Failure -> {}
        }
    }

    fun clearEditResult() {
        _state.value = _state.value.copy(editResult = null, editError = null)
    }

    fun updateProfile(fullName: String?, phone: String?, bio: String?, onDone: () -> Unit) {
        _state.value = _state.value.copy(editSaving = true, editError = null)
        viewModelScope.launch {
            when (rewardsRepo.updateProfile(ProfileUpdateRequest(fullName = fullName, phone = phone, bio = bio))) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(editSaving = false, editResult = "Profile updated!")
                    load()
                    onDone()
                }
                is ApiResult.Failure -> {
                    _state.value = _state.value.copy(editSaving = false, editError = "Failed to update profile")
                }
            }
        }
    }

    fun updateSocialLinks(links: Map<String, String>) {
        viewModelScope.launch {
            rewardsRepo.updateProfile(ProfileUpdateRequest(socialLinks = links))
            load()
        }
    }

    fun uploadCoverImage(context: android.content.Context, uri: Uri) {
        viewModelScope.launch {
            try {
                val resolver = context.contentResolver
                val mimeType = resolver.getType(uri) ?: "image/jpeg"
                val bytes = resolver.openInputStream(uri)?.readBytes() ?: return@launch
                when (val r = uploadRepo.uploadPostImage(bytes, mimeType)) {
                    is ApiResult.Success -> {
                        rewardsRepo.updateProfile(ProfileUpdateRequest(coverImage = r.data))
                        load()
                    }
                    is ApiResult.Failure -> _state.value = _state.value.copy(editResult = "Cover upload failed")
                }
            } catch (e: Exception) {
                _state.value = _state.value.copy(editResult = "Cover upload failed")
            }
        }
    }

    fun uploadAvatar(context: android.content.Context, uri: Uri) {
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

    private val _prefsLoaded = MutableStateFlow<PreferencesResponse?>(null)
    val prefsLoaded: StateFlow<PreferencesResponse?> = _prefsLoaded.asStateFlow()

    fun loadPreferences() {
        viewModelScope.launch {
            try {
                val resp = api.getPreferences()
                _prefsLoaded.value = resp
            } catch (_: Exception) {}
        }
    }
}

private fun tierLabel(plan: String?): String {
    return when (plan?.lowercase()) {
        "premium" -> "👑 Premium VIP"
        "gold" -> "🥇 Gold Trader"
        "silver" -> "🥈 Silver Member"
        "bronze" -> "🥉 Bronze Tier"
        else -> "⭐ Verified Member"
    }
}

private fun profileCompletion(user: User?): Int {
    if (user == null) return 0
    var score = 30
    if (!user.fullName.isNullOrBlank()) score += 15
    if (!user.phone.isNullOrBlank()) score += 15
    if (!user.email.isNullOrBlank()) score += 15
    if (!user.bio.isNullOrBlank()) score += 15
    if (user.isVerified == true || (user.kycStatus?.lowercase() == "verified")) score += 10
    return score.coerceAtMost(100)
}

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
    onOpenLanguage: () -> Unit = {},
    onOpenHelp: () -> Unit = {},
    onOpenKyc: () -> Unit = {},
    onOpenReferralTree: () -> Unit = {},
    onOpenAbout: () -> Unit = {},
    onOpenTerms: () -> Unit = {},
    onOpenPrivacy: () -> Unit = {},
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    val darkTheme = ColorTokens.isDark

    LaunchedEffect(Unit) {
        viewModel.loadPreferences()
    }

    PullToRefreshBox(
        isRefreshing = state.refreshing,
        onRefresh = { viewModel.refresh() },
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        when {
            state.loading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                }
            }
            state.user == null -> {
                // ─── GUEST PROFILE VIEW ───
                GuestProfileView(
                    isDark = darkTheme,
                    onSignIn = onSignedOut,
                    onOpenLanguage = onOpenLanguage,
                    onOpenHelp = onOpenHelp,
                    onOpenNotifications = onOpenNotifications,
                    onOpenAbout = onOpenAbout,
                    onOpenTerms = onOpenTerms,
                    onOpenPrivacy = onOpenPrivacy,
                )
            }
            else -> {
                // ─── 10/10 AUTHENTICATED PROFILE VIEW ───
                val user = state.user!!
                AuthenticatedProfileView(
                    user = user,
                    state = state,
                    isDark = darkTheme,
                    context = context,
                    viewModel = viewModel,
                    onOpenSettings = onOpenSettings,
                    onOpenMyPosts = onOpenMyPosts,
                    onOpenNotifications = onOpenNotifications,
                    onOpenSecurity = onOpenSecurity,
                    onOpenPayout = onOpenPayout,
                    onOpenOrders = onOpenOrders,
                    onOpenSaleUndone = onOpenSaleUndone,
                    onOpenRecentlyViewed = onOpenRecentlyViewed,
                    onOpenEditProfile = onOpenEditProfile,
                    onOpenLanguage = onOpenLanguage,
                    onOpenHelp = onOpenHelp,
                    onOpenKyc = onOpenKyc,
                    onOpenReferralTree = onOpenReferralTree,
                    onSignOut = onSignedOut,
                )
            }
        }
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   GUEST PROFILE VIEW (Zero fake data, high-conversion, gold standard)
   ═══════════════════════════════════════════════════════════════════════════ */
@Composable
private fun GuestProfileView(
    isDark: Boolean,
    onSignIn: () -> Unit,
    onOpenLanguage: () -> Unit,
    onOpenHelp: () -> Unit,
    onOpenNotifications: () -> Unit,
    onOpenAbout: () -> Unit = {},
    onOpenTerms: () -> Unit = {},
    onOpenPrivacy: () -> Unit = {},
) {
    val heroGradient = Brush.verticalGradient(
        colors = if (isDark) {
            listOf(Color(0xFF0F172A), Color(0xFF1E293B), Color(0xFF0F172A))
        } else {
            listOf(Color(0xFFE0F2FE), Color(0xFFEFF6FF), Color(0xFFF8FAFC))
        }
    )

    Box(modifier = Modifier.fillMaxSize()) {
        // Layer 1: Ambient Backdrop Canvas
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(260.dp)
                .background(heroGradient)
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                drawCircle(
                    color = Color(0xFF3B82F6).copy(alpha = if (isDark) 0.15f else 0.25f),
                    radius = size.width * 0.45f,
                    center = Offset(size.width * 0.2f, size.height * 0.3f)
                )
                drawCircle(
                    color = Color(0xFF10B981).copy(alpha = if (isDark) 0.12f else 0.20f),
                    radius = size.width * 0.35f,
                    center = Offset(size.width * 0.85f, size.height * 0.4f)
                )
            }
        }

        // Layer 2: Floating Top Bar Capsule
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            shape = RoundedCornerShape(24.dp),
            color = (if (isDark) Color(0xFF1E293B) else Color.White).copy(alpha = 0.88f),
            border = BorderStroke(1.dp, (if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)).copy(alpha = 0.6f)),
            shadowElevation = 4.dp,
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Icon(
                        Icons.Outlined.AccountCircle,
                        contentDescription = null,
                        tint = if (isDark) Color.White else Color(0xFF0F172A),
                        modifier = Modifier.size(22.dp)
                    )
                    Text(
                        "My Account",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 16.sp,
                        color = if (isDark) Color.White else Color(0xFF0F172A)
                    )
                }
                IconButton(
                    onClick = onOpenHelp,
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        Icons.Outlined.HelpOutline,
                        contentDescription = "Help",
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }

        // Layer 3: 32dp Curved Content Canvas
        Surface(
            shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
            color = MaterialTheme.colorScheme.background,
            shadowElevation = 12.dp,
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 110.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 18.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                // ─── Guest Hero Card ───
                Card(
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isDark) Color(0xFF1E293B) else Color.White,
                    ),
                    border = BorderStroke(
                        1.dp,
                        if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)
                    ),
                    elevation = CardDefaults.cardElevation(defaultElevation = 3.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Glowing Avatar Icon
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(76.dp)
                                .clip(CircleShape)
                                .background(
                                    Brush.radialGradient(
                                        listOf(
                                            Color(0xFF3B82F6).copy(alpha = 0.3f),
                                            Color(0xFF1D4ED8).copy(alpha = 0.1f),
                                        )
                                    )
                                )
                                .border(2.dp, Color(0xFF3B82F6).copy(alpha = 0.5f), CircleShape)
                        ) {
                            Icon(
                                imageVector = Icons.Filled.Person,
                                contentDescription = null,
                                tint = Color(0xFF3B82F6),
                                modifier = Modifier.size(40.dp)
                            )
                        }

                        Text(
                            text = "Welcome! Sign in to get started",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Black,
                            color = if (isDark) Color.White else Color(0xFF0F172A)
                        )

                        Text(
                            text = "Create an account to sell items, buy securely and track everything in one place.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            textAlign = TextAlign.Center,
                            lineHeight = 20.sp,
                        )

                        Button(
                            onClick = onSignIn,
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFF2563EB),
                                contentColor = Color.White
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(50.dp)
                                .shadow(8.dp, RoundedCornerShape(16.dp), ambientColor = Color(0xFF2563EB), spotColor = Color(0xFF2563EB)),
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    "✨ Sign In / Create Account",
                                    fontSize = 15.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }

                // ─── What you get (concrete, user-ease focused) ───
                Text(
                    text = "WITH AN ACCOUNT",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp
                )

                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    GuestBenefitRow(
                        emoji = "📦",
                        title = "Sell your items",
                        desc = "Post listings in minutes and reach buyers near you.",
                        isDark = isDark
                    )
                    GuestBenefitRow(
                        emoji = "🛒",
                        title = "Buy with confidence",
                        desc = "Secure in-app payment on electronics — money is held safely until your item is delivered.",
                        isDark = isDark
                    )
                    GuestBenefitRow(
                        emoji = "🪙",
                        title = "Earn coins daily",
                        desc = "Check in daily and refer friends to unlock real discounts.",
                        isDark = isDark
                    )
                    GuestBenefitRow(
                        emoji = "✅",
                        title = "Verified community",
                        desc = "Aadhaar-verified members and public ratings keep deals genuine.",
                        isDark = isDark
                    )
                }

                // ─── Preferences & Quick Actions ───
                Text(
                    text = "SETTINGS",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp
                )

                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isDark) Color(0xFF1E293B) else Color.White,
                    ),
                    border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)),
                ) {
                    Column {
                        ProfileMenuRow(
                            icon = Icons.Outlined.Translate,
                            title = "Language",
                            subtitle = "Choose your preferred app language",
                            onClick = onOpenLanguage,
                            isDark = isDark
                        )
                        HorizontalDivider(color = if (isDark) Color(0xFF334155) else Color(0xFFF1F5F9))
                        ProfileMenuRow(
                            icon = Icons.Outlined.Notifications,
                            title = "Notifications",
                            subtitle = "Alerts for deals, chats & orders",
                            onClick = onOpenNotifications,
                            isDark = isDark
                        )
                        HorizontalDivider(color = if (isDark) Color(0xFF334155) else Color(0xFFF1F5F9))
                        ProfileMenuRow(
                            icon = Icons.Outlined.HelpCenter,
                            title = "Help & Support",
                            subtitle = "FAQs, contact support & raise tickets",
                            onClick = onOpenHelp,
                            isDark = isDark
                        )
                    }
                }

                // ─── About & Legal ───
                Text(
                    text = "ABOUT & LEGAL",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp
                )

                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isDark) Color(0xFF1E293B) else Color.White,
                    ),
                    border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)),
                ) {
                    Column {
                        ProfileMenuRow(
                            icon = Icons.Outlined.Info,
                            title = "About Us",
                            subtitle = "Who we are & what we stand for",
                            onClick = onOpenAbout,
                            isDark = isDark
                        )
                        HorizontalDivider(color = if (isDark) Color(0xFF334155) else Color(0xFFF1F5F9))
                        ProfileMenuRow(
                            icon = Icons.Outlined.Description,
                            title = "Terms & Conditions",
                            subtitle = "Rules for using the platform",
                            onClick = onOpenTerms,
                            isDark = isDark
                        )
                        HorizontalDivider(color = if (isDark) Color(0xFF334155) else Color(0xFFF1F5F9))
                        ProfileMenuRow(
                            icon = Icons.Outlined.PrivacyTip,
                            title = "Privacy Policy",
                            subtitle = "How your data is collected & protected",
                            onClick = onOpenPrivacy,
                            isDark = isDark
                        )
                    }
                }

                // App Version & Security Note
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        "v2.4.0 • Verified Local Deals Platform",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f)
                    )
                }
            }
        }
    }
}

@Composable
private fun GuestBenefitRow(
    emoji: String,
    title: String,
    desc: String,
    isDark: Boolean,
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = if (isDark) Color(0xFF1E293B) else Color.White,
        border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Box(
                contentAlignment = Alignment.Center,
                modifier = Modifier
                    .size(42.dp)
                    .clip(CircleShape)
                    .background(Color(0xFFEFF6FF))
            ) {
                Text(emoji, fontSize = 20.sp)
            }
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(title, fontWeight = FontWeight.Bold, fontSize = 14.sp, color = if (isDark) Color.White else Color(0xFF0F172A))
                Text(desc, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, lineHeight = 16.sp)
            }
        }
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   AUTHENTICATED PROFILE VIEW (Scenic Cover, 4-KPIs, Hubs, Full Richness)
   ═══════════════════════════════════════════════════════════════════════════ */
@Composable
private fun AuthenticatedProfileView(
    user: User,
    state: ProfileState,
    isDark: Boolean,
    context: android.content.Context,
    viewModel: ProfileViewModel,
    onOpenSettings: () -> Unit,
    onOpenMyPosts: () -> Unit,
    onOpenNotifications: () -> Unit,
    onOpenSecurity: () -> Unit,
    onOpenPayout: () -> Unit,
    onOpenOrders: () -> Unit,
    onOpenSaleUndone: () -> Unit,
    onOpenRecentlyViewed: () -> Unit,
    onOpenEditProfile: () -> Unit,
    onOpenLanguage: () -> Unit,
    onOpenHelp: () -> Unit,
    onOpenKyc: () -> Unit,
    onOpenReferralTree: () -> Unit,
    onSignOut: () -> Unit,
) {
    val coverPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri -> uri?.let { viewModel.uploadCoverImage(context, it) } }

    val avatarPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri -> uri?.let { viewModel.uploadAvatar(context, it) } }

    val clipboardManager = LocalClipboardManager.current
    var showSignOutConfirm by remember { mutableStateOf(false) }

    val completionPct = profileCompletion(user)
    val heroGradient = Brush.verticalGradient(
        colors = if (isDark) {
            listOf(Color(0xFF1A2744), Color(0xFF2D3A6E), Color(0xFF0F172A))
        } else {
            listOf(Color(0xFF0EA5E9), Color(0xFF3B82F6), Color(0xFF8B5CF6))
        }
    )

    Box(modifier = Modifier.fillMaxSize()) {
        // ── Layer 1: Photographic / Ambient Cover Backdrop ──
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(230.dp)
                .background(heroGradient)
        ) {
            user.coverImage?.let { coverUrl ->
                AsyncImage(
                    model = coverUrl,
                    contentDescription = "Cover",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }

            // Dark Scrim for high contrast & clarity
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            listOf(
                                Color.Black.copy(alpha = 0.65f),
                                Color.Transparent,
                                Color.Black.copy(alpha = 0.45f)
                            )
                        )
                    )
            )

            // Edit Cover Camera Button
            Surface(
                onClick = { coverPickerLauncher.launch("image/*") },
                shape = CircleShape,
                color = Color.Black.copy(alpha = 0.6f),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.3f)),
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 16.dp, bottom = 44.dp)
                    .size(36.dp)
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                    Icon(Icons.Default.CameraAlt, "Edit Cover", tint = Color.White, modifier = Modifier.size(16.dp))
                }
            }

            // Plan tier badge on cover
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color.Black.copy(alpha = 0.5f),
                border = BorderStroke(1.dp, Color.White.copy(alpha = 0.25f)),
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(start = 16.dp, bottom = 44.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        tierLabel(user.currentPlan),
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // ── Layer 2: Floating Glass Capsule Top Bar ──
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            shape = RoundedCornerShape(24.dp),
            color = (if (isDark) Color(0xFF1E293B) else Color.White).copy(alpha = 0.88f),
            border = BorderStroke(1.dp, (if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)).copy(alpha = 0.6f)),
            shadowElevation = 4.dp,
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 14.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        "👤 Profile",
                        fontWeight = FontWeight.ExtraBold,
                        fontSize = 16.sp,
                        color = if (isDark) Color.White else Color(0xFF0F172A)
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    IconButton(
                        onClick = onOpenEditProfile,
                        modifier = Modifier.size(34.dp)
                    ) {
                        Icon(Icons.Outlined.Edit, "Edit", tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                    }
                    IconButton(
                        onClick = onOpenNotifications,
                        modifier = Modifier.size(34.dp)
                    ) {
                        Icon(Icons.Outlined.Notifications, "Notifications", tint = MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(18.dp))
                    }
                    IconButton(
                        onClick = onOpenSettings,
                        modifier = Modifier.size(34.dp)
                    ) {
                        Icon(Icons.Outlined.Settings, "Settings", tint = MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(18.dp))
                    }
                }
            }
        }

        // ── Layer 3: 32dp Curved Content Canvas ──
        Surface(
            shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
            color = MaterialTheme.colorScheme.background,
            shadowElevation = 12.dp,
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 160.dp)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp, vertical = 14.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                // Non-blocking session expired banner (only if true)
                if (state.isSessionExpired) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (isDark) Color(0xFF2D0A0A) else Color(0xFFFEF2F2),
                        border = BorderStroke(1.dp, if (isDark) Color(0xFFEF4444).copy(alpha = 0.3f) else Color(0xFFFCA5A5)),
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
                                tint = if (isDark) Color(0xFFFCA5A5) else Color(0xFFDC2626),
                                modifier = Modifier.size(20.dp),
                            )
                            Column(Modifier.weight(1f)) {
                                Text(
                                    "Session Expired",
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp,
                                    color = if (isDark) Color(0xFFFCA5A5) else Color(0xFF991B1B),
                                )
                                Text(
                                    "Please sign in again to sync your listings & deals.",
                                    fontSize = 11.sp,
                                    color = if (isDark) Color(0xFFFCA5A5).copy(alpha = 0.85f) else Color(0xFFB91C1C),
                                )
                            }
                            OutlinedButton(
                                onClick = onSignOut,
                                shape = RoundedCornerShape(8.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                            ) {
                                Text("Sign In", fontSize = 11.sp)
                            }
                        }
                    }
                }

                // ── 1. User Hero Header (Avatar + Identity + KYC Ribbon) ──
                Row(
                    verticalAlignment = Alignment.Top,
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    // Avatar with Completion Arc Ring & Upload Overlay
                    Box(contentAlignment = Alignment.BottomEnd) {
                        AvatarWithRing(
                            initial = user.displayName.firstOrNull()?.uppercaseChar() ?: '?',
                            pictureUrl = user.pictureUrl,
                            completionPercent = completionPct,
                            size = 72.dp,
                        )
                        Surface(
                            onClick = { avatarPickerLauncher.launch("image/*") },
                            shape = CircleShape,
                            color = MaterialTheme.colorScheme.primary,
                            border = BorderStroke(2.dp, MaterialTheme.colorScheme.surface),
                            modifier = Modifier
                                .size(26.dp)
                                .offset(x = 2.dp, y = 2.dp),
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(Icons.Default.CameraAlt, "Upload avatar", tint = Color.White, modifier = Modifier.size(14.dp))
                            }
                        }
                    }

                    // User Details Column
                    Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text(
                            text = user.displayName,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Black,
                            color = if (isDark) Color.White else Color(0xFF0F172A)
                        )
                        Text(
                            text = user.phone ?: user.email ?: "",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )

                        // Real KYC status ribbon
                        val isKycOk = user.isVerified == true || (user.kycStatus?.lowercase() == "verified")
                        Surface(
                            onClick = { if (!isKycOk) onOpenKyc() },
                            shape = RoundedCornerShape(20.dp),
                            color = if (isKycOk) Color(0xFF059669).copy(alpha = 0.12f) else Color(0xFFF59E0B).copy(alpha = 0.14f),
                            border = BorderStroke(1.dp, if (isKycOk) Color(0xFF059669).copy(alpha = 0.35f) else Color(0xFFF59E0B).copy(alpha = 0.4f)),
                            modifier = Modifier.padding(vertical = 2.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                                Icon(
                                    if (isKycOk) Icons.Filled.Verified else Icons.Default.Info,
                                    contentDescription = null,
                                    tint = if (isKycOk) Color(0xFF059669) else Color(0xFFB45309),
                                    modifier = Modifier.size(14.dp)
                                )
                                Text(
                                    text = if (isKycOk) "Aadhaar KYC Verified" else "KYC Pending — tap to verify",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isKycOk) Color(0xFF059669) else Color(0xFFB45309)
                                )
                            }
                        }

                        // Bio
                        user.bio?.takeIf { it.isNotBlank() }?.let { bio ->
                            Text(
                                text = bio,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }

                        // Handle copy chip
                        val handle = user.username ?: user.email?.substringBefore('@') ?: user.id ?: ""
                        if (handle.isNotBlank()) {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
                                modifier = Modifier.clickable {
                                    clipboardManager.setText(AnnotatedString(handle))
                                },
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                                ) {
                                    Icon(Icons.Default.ContentCopy, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(11.dp))
                                    Text("@$handle", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Medium)
                                }
                            }
                        }
                    }
                }

                // ── 2. 4-KPI Neumorphic Matrix Cards (Listings, Deals, Trust, Coins) ──
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    KpiCard(
                        title = "Listings",
                        value = state.listingsCount,
                        subtitle = "Active items",
                        icon = Icons.Outlined.Inventory2,
                        accent = Color(0xFF3B82F6),
                        modifier = Modifier.weight(1f),
                        onClick = onOpenMyPosts,
                        isDark = isDark
                    )
                    KpiCard(
                        title = "Deals",
                        value = state.salesCount,
                        subtitle = "Completed sales",
                        icon = Icons.Outlined.Handshake,
                        accent = Color(0xFF10B981),
                        modifier = Modifier.weight(1f),
                        onClick = onOpenSaleUndone,
                        isDark = isDark
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    val trustVal = state.trustScore?.trustScore?.toInt()
                    KpiCard(
                        title = "Trust Score",
                        value = trustVal?.let { "$it/100" } ?: "—",
                        subtitle = if (trustVal == null) "Verify to build" else "Keep it up",
                        icon = Icons.Outlined.Shield,
                        accent = Color(0xFF8B5CF6),
                        modifier = Modifier.weight(1f),
                        onClick = onOpenKyc,
                        isDark = isDark
                    )
                    KpiCard(
                        title = "My Coins",
                        value = "🪙 ${user.coins ?: 0}",
                        subtitle = "Redeem perks",
                        icon = Icons.Outlined.Toll,
                        accent = Color(0xFFF59E0B),
                        modifier = Modifier.weight(1f),
                        onClick = onOpenReferralTree,
                        isDark = isDark
                    )
                }

                // ── 3. Selling ──
                Text(
                    text = "SELLING",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp
                )

                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isDark) Color(0xFF1E293B) else Color.White,
                    ),
                    border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)),
                ) {
                    Column {
                        ProfileMenuRow(
                            icon = Icons.Outlined.LocalShipping,
                            title = "My Sales",
                            subtitle = "Orders, offers & secure payments",
                            onClick = onOpenSaleUndone,
                            isDark = isDark
                        )
                        HorizontalDivider(color = if (isDark) Color(0xFF334155) else Color(0xFFF1F5F9))
                        ProfileMenuRow(
                            icon = Icons.Outlined.AccountBalance,
                            title = "Bank & Payouts",
                            subtitle = "Where your sales money arrives",
                            onClick = onOpenPayout,
                            isDark = isDark
                        )
                    }
                }

                // ── 4. Buying ──
                Text(
                    text = "BUYING",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp
                )

                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isDark) Color(0xFF1E293B) else Color.White,
                    ),
                    border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)),
                ) {
                    Column {
                        ProfileMenuRow(
                            icon = Icons.Outlined.ReceiptLong,
                            title = "My Purchases",
                            subtitle = "Orders & secure payments",
                            onClick = onOpenOrders,
                            isDark = isDark
                        )
                        HorizontalDivider(color = if (isDark) Color(0xFF334155) else Color(0xFFF1F5F9))
                        ProfileMenuRow(
                            icon = Icons.Outlined.History,
                            title = "Recently Viewed",
                            subtitle = "Pick up where you left off",
                            onClick = onOpenRecentlyViewed,
                            isDark = isDark
                        )
                    }
                }

                // ── 5. Settings ──
                Text(
                    text = "SETTINGS",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.2.sp
                )

                Card(
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isDark) Color(0xFF1E293B) else Color.White,
                    ),
                    border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)),
                ) {
                    Column {
                        ProfileMenuRow(
                            icon = Icons.Outlined.Security,
                            title = "Account & Security",
                            subtitle = "Password, 2FA & devices",
                            onClick = onOpenSecurity,
                            isDark = isDark
                        )
                        HorizontalDivider(color = if (isDark) Color(0xFF334155) else Color(0xFFF1F5F9))
                        ProfileMenuRow(
                            icon = Icons.Outlined.HelpOutline,
                            title = "Help & Support",
                            subtitle = "FAQs & contact support",
                            onClick = onOpenHelp,
                            isDark = isDark
                        )
                    }
                }

                // ── 6. Sign Out Action Button ──
                OutlinedButton(
                    onClick = { showSignOutConfirm = true },
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        contentColor = Color(0xFFEF4444)
                    ),
                    border = BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.4f)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.AutoMirrored.Filled.ExitToApp, null, modifier = Modifier.size(18.dp))
                        Text("Sign Out", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                    }
                }

                Spacer(Modifier.height(16.dp))
            }
        }
    }

    // Sign Out Confirmation Dialog
    if (showSignOutConfirm) {
        AlertDialog(
            onDismissRequest = { showSignOutConfirm = false },
            title = { Text("Sign Out", fontWeight = FontWeight.Bold) },
            text = { Text("Are you sure you want to sign out on this device?") },
            confirmButton = {
                TextButton(
                    onClick = {
                        showSignOutConfirm = false
                        onSignOut()
                    }
                ) {
                    Text("Sign Out", color = Color(0xFFEF4444), fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showSignOutConfirm = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPER COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */
@Composable
private fun AvatarWithRing(
    initial: Char,
    pictureUrl: String? = null,
    completionPercent: Int,
    size: Dp = 64.dp,
) {
    val progress = (completionPercent / 100f).coerceIn(0f, 1f)
    Box(
        modifier = Modifier.size(size),
        contentAlignment = Alignment.Center,
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            drawArc(
                color = Color(0xFFE2E8F0),
                startAngle = 0f,
                sweepAngle = 360f,
                useCenter = false,
                style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round),
            )
            drawArc(
                brush = Brush.sweepGradient(
                    listOf(
                        Color(0xFF3B82F6),
                        Color(0xFF10B981),
                        Color(0xFF3B82F6)
                    )
                ),
                startAngle = -90f,
                sweepAngle = progress * 360f,
                useCenter = false,
                style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round),
            )
        }

        if (!pictureUrl.isNullOrBlank()) {
            AsyncImage(
                model = pictureUrl,
                contentDescription = "Avatar",
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(size - 10.dp)
                    .clip(CircleShape)
            )
        } else {
            Box(
                modifier = Modifier
                    .size(size - 10.dp)
                    .clip(CircleShape)
                    .background(Color(0xFF2563EB)),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = initial.toString(),
                    style = MaterialTheme.typography.titleLarge,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
    }
}

@Composable
private fun KpiCard(
    title: String,
    value: String,
    subtitle: String,
    icon: ImageVector,
    accent: Color,
    modifier: Modifier = Modifier,
    onClick: () -> Unit = {},
    isDark: Boolean,
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(20.dp),
        color = if (isDark) Color(0xFF1E293B) else Color.White,
        border = BorderStroke(1.dp, if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0)),
        modifier = modifier
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title.uppercase(),
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 10.sp,
                    letterSpacing = 1.sp
                )
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(accent.copy(alpha = 0.12f)),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(icon, null, tint = accent, modifier = Modifier.size(16.dp))
                }
            }

            Text(
                text = value,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Black,
                color = if (isDark) Color.White else Color(0xFF0F172A),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 11.sp
            )
        }
    }
}

@Composable
private fun ProfileMenuRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    isDark: Boolean,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Box(
            modifier = Modifier
                .size(36.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(if (isDark) Color(0xFF334155).copy(alpha = 0.5f) else Color(0xFFF1F5F9)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(20.dp)
            )
        }

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Bold,
                color = if (isDark) Color.White else Color(0xFF0F172A)
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 11.sp
            )
        }

        Icon(
            Icons.Filled.ChevronRight,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
            modifier = Modifier.size(18.dp)
        )
    }
}
