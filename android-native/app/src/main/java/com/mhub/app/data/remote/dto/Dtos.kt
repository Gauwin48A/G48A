package com.mhub.app.data.remote.dto

import com.mhub.app.domain.model.Category
import com.mhub.app.domain.model.KycSubmission
import com.mhub.app.domain.model.Post
import com.mhub.app.domain.model.User
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// -------- Health --------
@Serializable
data class HealthResponse(
    val service: String = "",
    val status: String = "",
    val db: String = "",
)

// -------- Push Notifications --------
@Serializable
data class PushTokenRequest(
    val token: String,
    val deviceType: String = "android",
    val deviceName: String = "Android",
)

// -------- Auth --------
@Serializable
data class GoogleAuthRequest(val idToken: String)

@Serializable
data class EmailLoginRequest(val identifier: String, val password: String)

@Serializable
data class EmailSignupRequest(
    val fullName: String,
    val email: String,
    val phone: String,
    val password: String,
)

@Serializable
data class ForgotPasswordRequest(val identifier: String)

@Serializable
data class ResetPasswordRequest(val token: String, val newPassword: String)

@Serializable
data class CsrfTokenResponse(val csrfToken: String? = null)

@Serializable
data class AuthResponse(
    val success: Boolean = true,
    val token: String? = null,
    val refreshToken: String? = null,
    val user: User? = null,
    val requireOtp: Boolean = false,
    val code: String? = null,
)

// -------- Auth extended (OTP/Aadhaar/2FA) --------
@Serializable
data class SendOtpRequest(
    val phone: String,
    val purpose: String = "sim_verification",
    val deviceId: String? = null,
)

@Serializable
data class AadhaarSendOtpRequest(
    val aadhaarNumber: String,
    val mobileNumber: String? = null,
)

@Serializable
data class AadhaarOtpResponse(
    val success: Boolean = true,
    val txnId: String? = null,
    val message: String? = null,
)

@Serializable
data class AadhaarVerifyOtpRequest(
    val aadhaarNumber: String,
    val mobileNumber: String? = null,
    val otp: String,
    val txnId: String? = null,
)

@Serializable
data class AadhaarVerifyResponse(
    val success: Boolean = true,
    val signupToken: String? = null,
    val message: String? = null,
)

@Serializable
data class PanVerifyRequest(
    val signupToken: String,
    val panNumber: String,
)

@Serializable
data class CompleteAadhaarSignupRequest(
    val signupToken: String,
    val password: String,
    val confirmPassword: String,
    val panNumber: String? = null,
    val referralCode: String? = null,
)

@Serializable
data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String,
)

@Serializable
data class TwoFaSetupResponse(
    val success: Boolean = true,
    val qrCode: String? = null,
    val secret: String? = null,
)

@Serializable
data class TwoFaVerifyRequest(val code: String)

@Serializable
data class TwoFaVerifyResponse(
    val success: Boolean = true,
    val backupCodes: List<String> = emptyList(),
)

// -------- Extended Post/Discovery DTOs --------
@Serializable
data class TrackViewRequest(
    @SerialName("post_id") val postId: String,
)

@Serializable
data class BrandsResponse(
    val brands: List<Brand> = emptyList(),
)

@Serializable
data class Brand(
    val id: String? = null,
    val name: String? = null,
    @SerialName("post_count") val postCount: Int = 0,
)

@Serializable
data class TrustScoreResponse(
    val trustScore: Float = 0f,
    val trustLabel: String? = null,
    val trustBadge: String? = null,
    val riskState: String? = null,
)

@Serializable
data class CategoryStatsResponse(
    val stats: List<CategoryStat> = emptyList(),
)

@Serializable
data class CategoryStat(
    val key: String? = null,
    val name: String? = null,
    @SerialName("active_count") val activeCount: Int = 0,
    @SerialName("new_today") val newToday: Int = 0,
    @SerialName("new_week") val newWeek: Int = 0,
)

// -------- Offer extended DTOs --------
@Serializable
data class OfferActionRequest(
    val action: String,
    val counterPrice: Double? = null,
)

@Serializable
data class MakeOfferRequest(
    @SerialName("post_id") val postId: String,
    val amount: Double,
)

// -------- Cart extended DTOs --------
@Serializable
data class CartQtyRequest(val quantity: Int)

@Serializable
data class CouponRequest(val code: String)

@Serializable
data class CouponResponse(
    val success: Boolean = true,
    val discount: Double = 0.0,
    val message: String? = null,
)

// -------- Admin DTOs --------
@Serializable
data class AdminDashboardResponse(
    val stats: AdminStats = AdminStats(),
    val flaggedUsers: List<AdminFlaggedUser> = emptyList(),
    val flaggedPosts: List<AdminFlaggedPost> = emptyList(),
    val recentActivity: List<AdminActivity> = emptyList(),
)

@Serializable
data class AdminStats(
    val totalUsers: Int = 0,
    val totalPosts: Int = 0,
    val flaggedPosts: Int = 0,
    val restrictedUsers: Int = 0,
    val todaySignups: Int = 0,
    val todayPosts: Int = 0,
)

@Serializable
data class AdminFlaggedUser(
    val id: String? = null,
    val name: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val reason: String? = null,
    val status: String? = null,
)

@Serializable
data class AdminFlaggedPost(
    val id: String? = null,
    val title: String? = null,
    val reason: String? = null,
    val status: String? = null,
    @SerialName("user_id") val userId: String? = null,
)

@Serializable
data class AdminActivity(
    val id: String? = null,
    val type: String? = null,
    val description: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

// -------- Sale / Transaction DTOs --------
@Serializable
data class InitiateSaleRequest(
    @SerialName("post_id") val postId: String,
    @SerialName("buyer_id") val buyerId: String,
    @SerialName("sale_amount") val saleAmount: Double,
)

@Serializable
data class ConfirmSaleRequest(
    @SerialName("transaction_id") val transactionId: String,
    val otp: String,
)

@Serializable
data class SaleResponse(
    val success: Boolean = true,
    @SerialName("transaction_id") val transactionId: String? = null,
    @SerialName("receipt_id") val receiptId: String? = null,
    val message: String? = null,
)

@Serializable
data class PendingSale(
    val id: String? = null,
    @SerialName("transaction_id") val transactionId: String? = null,
    @SerialName("post_title") val postTitle: String? = null,
    @SerialName("buyer_name") val buyerName: String? = null,
    val amount: Double = 0.0,
    val status: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class PendingSalesResponse(
    val sales: List<PendingSale> = emptyList(),
)

@Serializable
data class UndoSaleRequest(
    @SerialName("post_id") val postId: String,
    val reason: String,
    val description: String? = null,
)

@Serializable
data class UndoneRecord(
    val id: String? = null,
    @SerialName("post_title") val postTitle: String? = null,
    @SerialName("post_image") val postImage: String? = null,
    val amount: Double = 0.0,
    val reason: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class UndoneHistoryResponse(
    val records: List<UndoneRecord> = emptyList(),
)

// -------- Payment DTOs --------
@Serializable
data class PaymentUpiDetailsResponse(
    @SerialName("upi_id") val upiId: String? = null,
    @SerialName("merchant_name") val merchantName: String? = null,
    @SerialName("gateway_enabled") val gatewayEnabled: Boolean = false,
    val instructions: List<String> = emptyList(),
)

@Serializable
data class PaymentHistoryItem(
    val id: String? = null,
    @SerialName("transaction_id") val transactionId: String? = null,
    val plan: String? = null,
    val purpose: String? = null,
    val amount: Double = 0.0,
    val status: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
)

@Serializable
data class PaymentHistoryResponse(
    val payments: List<PaymentHistoryItem> = emptyList(),
)

@Serializable
data class SubmitPaymentRequest(
    val transactionId: String,
    val plan: String? = null,
    val purpose: String = "subscription",
)

// -------- Analytics extended DTOs --------
@Serializable
data class SellerAnalyticsResponse(
    val totalViews: Int = 0,
    val totalInquiries: Int = 0,
    val soldPosts: Int = 0,
    val totalRevenue: Double = 0.0,
    val activePosts: Int = 0,
    val conversionRate: Float = 0f,
    val avgRating: Float = 0f,
    val totalReviews: Int = 0,
)

@Serializable
data class PostAnalytic(
    @SerialName("post_id") val postId: String? = null,
    val title: String? = null,
    val views: Int = 0,
    val inquiries: Int = 0,
    val offers: Int = 0,
)

@Serializable
data class PostAnalyticsResponse(
    val posts: List<PostAnalytic> = emptyList(),
)

@Serializable
data class CategoryAnalytic(
    val category: String? = null,
    val listings: Int = 0,
    val views: Int = 0,
    val sales: Int = 0,
)

@Serializable
data class CategoryAnalyticsResponse(
    val categories: List<CategoryAnalytic> = emptyList(),
)

// -------- Review extended DTOs --------
@Serializable
data class ReviewRespondRequest(val response: String)

// -------- Generic --------
@Serializable
data class MessageResponse(val success: Boolean = true, val message: String? = null)

@Serializable
data class IdResponse(val success: Boolean = true, val id: String? = null)

@Serializable
data class UploadResponse(val url: String? = null, val key: String? = null, val size: Long? = null)

// -------- Posts --------
@Serializable
data class PostsResponse(
    val posts: List<Post> = emptyList(),
    val data: List<Post> = emptyList(),
    val total: Int? = null,
) {
    val items: List<Post> get() = if (posts.isNotEmpty()) posts else data
}

@Serializable
data class PostDetailResponse(
    val success: Boolean = false,
    val post: Post? = null,
)

@Serializable
data class CreatePostRequest(
    val title: String,
    val description: String? = null,
    val price: Double? = null,
    val currency: String = "INR",
    val location: String? = null,
    @SerialName("category_id") val categoryId: String? = null,
    val images: List<String> = emptyList(),
    val brand: String? = null,
    val model: String? = null,
    val condition: String? = null,
    @SerialName("contact_number") val contactNumber: String? = null,
    @SerialName("warranty_status") val warrantyStatus: String? = null,
    @SerialName("flash_sale") val flashSale: Boolean? = null,
    @SerialName("age_months") val ageMonths: Int? = null,
)

// -------- Categories --------
@Serializable
data class CategoriesResponse(
    val categories: List<Category> = emptyList(),
    val data: List<Category> = emptyList(),
) {
    val items: List<Category> get() = if (categories.isNotEmpty()) categories else data
}

// -------- KYC --------
@Serializable
data class KycSubmitRequest(
    val docType: String,
    val docNumber: String,
    val docFrontKey: String,
    val docBackKey: String? = null,
    val selfieKey: String? = null,
)

@Serializable
data class KycSubmitResponse(
    val success: Boolean = true,
    val submissionId: String? = null,
    val status: String? = null,
    val mock: Boolean = false,
)

@Serializable
data class KycUploadResponse(val key: String, val size: Long? = null)

@Serializable
data class KycStatusResponse(
    @SerialName("kyc_status") val kycStatus: String = "none",
    val role: String = "viewer",
    @SerialName("latest_submission") val latestSubmission: KycSubmission? = null,
)

// -------- Wishlist --------
@Serializable
data class WishlistResponse(val posts: List<Post> = emptyList())

// -------- Notifications --------
@Serializable
data class NotificationsResponse(
    val notifications: List<com.mhub.app.domain.model.Notification> = emptyList(),
    val data: List<com.mhub.app.domain.model.Notification> = emptyList(),
    val unreadCount: Int? = null,
) {
    val items: List<com.mhub.app.domain.model.Notification> get() = if (notifications.isNotEmpty()) notifications else data
}

// -------- Chat --------
@Serializable
data class ConversationsResponse(
    val conversations: List<com.mhub.app.domain.model.ChatConversation> = emptyList(),
)

@Serializable
data class MessagesResponse(
    val messages: List<com.mhub.app.domain.model.ChatMessage> = emptyList(),
    val data: List<com.mhub.app.domain.model.ChatMessage> = emptyList(),
) {
    val items: List<com.mhub.app.domain.model.ChatMessage> get() = if (messages.isNotEmpty()) messages else data
}

@Serializable
data class SendMessageRequest(
    val content: String,
    @SerialName("post_id") val postId: String? = null,
    @SerialName("recipient_id") val recipientId: String? = null,
)

// -------- Rewards --------
@Serializable
data class RewardsOverviewResponse(
    val user: RewardsUserDto = RewardsUserDto(),
    val referralChain: List<RewardsReferralNodeDto> = emptyList(),
    val chainRules: List<RewardsChainRuleDto> = emptyList(),
)

@Serializable
data class RewardsUserDto(
    val id: String? = null,
    val name: String? = null,
    val rank: String? = null,
    val tier: String? = null,
    val membershipPlan: String? = null,
    @SerialName("current_plan") val currentPlan: String? = null,
    @SerialName("subscription_expiry") val subscriptionExpiry: String? = null,
    val level: Int = 1,
    val xpCurrent: Int = 0,
    val xpRequired: Int = 100,
    val referralCode: String? = null,
    val totalReferrals: Int = 0,
    val directReferrals: Int = 0,
    val indirectReferrals: Int = 0,
    val totalCoins: Int = 0,
    val directPoints: Int = 0,
    val indirectPoints: Int = 0,
    val potentialReferralPoints: Int = 0,
    val chainEarnedPoints: Int = 0,
    val qualifiedReferrals: Int = 0,
    val successfulRefs: Int = 0,
    val streak: Int = 0,
    val visitStreak: Int = 0,
    val postStreak: Int = 0,
    val profileComplete: Boolean = false,
    val hasPosted: Boolean = false,
    val dailySecretCode: String? = null,
    val dailySecretCodeExpiresAt: String? = null,
    val activityStats: RewardsActivityStatsDto = RewardsActivityStatsDto(),
    val leaderboard: RewardsLeaderboardDto = RewardsLeaderboardDto(),
    val referralLedger: RewardsReferralLedgerDto = RewardsReferralLedgerDto(),
)

@Serializable
data class RewardsActivityStatsDto(
    val salesCount: Int = 0,
    val purchasesCount: Int = 0,
    val referralsCount: Int = 0,
    val postsCount: Int = 0,
    val visitsCount: Int = 0,
    val salesToday: Int = 0,
    val purchasesToday: Int = 0,
    val referralsToday: Int = 0,
    val postsToday: Int = 0,
    val visitsToday: Int = 0,
)

@Serializable
data class RewardsLeaderboardDto(
    val nextPayoutAt: String? = null,
    val lastPayoutAt: String? = null,
)

@Serializable
data class RewardsReferralLedgerDto(
    val qualifiedReferralCount: Int = 0,
    val qualifiedBonusEntries: Int = 0,
    val chainRewardEntries: Int = 0,
    val lastReferralRewardAt: String? = null,
    val matchesQualifiedReferrals: Boolean = false,
    val status: String? = null,
)

@Serializable
data class RewardsReferralNodeDto(
    val id: String? = null,
    val parentId: String? = null,
    val name: String? = null,
    val depth: Int = 0,
    val type: String? = null,
    val coins: Int = 0,
    val joinDate: String? = null,
)

@Serializable
data class RewardsChainRuleDto(
    val depth: Int = 0,
    val points: Double = 0.0,
)

// -------- Coins / Engagement --------
@Serializable
data class CoinBalanceResponse(
    val balance: Int = 0,
    val updatedAt: String? = null,
)

@Serializable
data class CoinHistoryResponse(
    val history: List<CoinTransaction> = emptyList(),
    val total: Int = 0,
)

@Serializable
data class CoinTransaction(
    val id: String? = null,
    val action: String? = null,
    val description: String? = null,
    val amount: Int = 0,
    val balance: Int = 0,
    val createdAt: String? = null,
)

@Serializable
data class EngagementStatusResponse(
    val dailyCheckIn: DailyCheckInStatus = DailyCheckInStatus(),
    val spin: SpinStatus = SpinStatus(),
    val scratch: ScratchStatus = ScratchStatus(),
    val referralMilestones: ReferralMilestoneStatus = ReferralMilestoneStatus(),
)

@Serializable
data class DailyCheckInStatus(
    val canClaim: Boolean = false,
    val streak: Int = 0,
    val lastClaimDate: String? = null,
    val todayReward: Int = 5,
    val weekProgress: List<Boolean> = emptyList(),
)

@Serializable
data class SpinStatus(
    val canSpin: Boolean = false,
    val lastSpinDate: String? = null,
)

@Serializable
data class ScratchStatus(
    val available: Int = 0,
    val canScratch: Boolean = false,
)

@Serializable
data class ReferralMilestoneStatus(
    val canClaim: Boolean = false,
    val currentReferrals: Int = 0,
    val target: Int = 3,
    val reward: Int = 50,
)

@Serializable
data class DailyCheckInResponse(
    val success: Boolean = false,
    val reward: Int = 0,
    val streak: Int = 0,
    val message: String? = null,
)

@Serializable
data class SpinResultResponse(
    val success: Boolean = false,
    val reward: Int = 0,
    val message: String? = null,
)

@Serializable
data class ScratchResultResponse(
    val success: Boolean = false,
    val reward: Int = 0,
    val message: String? = null,
)

@Serializable
data class StoreRedeemRequest(
    val type: String,
    val postId: String? = null,
)

@Serializable
data class StoreRedeemResponse(
    val success: Boolean = false,
    val message: String? = null,
    val remainingBalance: Int = 0,
)

@Serializable
data class RewardsConfigResponse(
    val earnRules: List<EarnRuleDto> = emptyList(),
    val tiers: List<TierDto> = emptyList(),
    val referralLadder: List<RewardsChainRuleDto> = emptyList(),
    val spinPool: List<Int> = emptyList(),
    val scratchPool: List<Int> = emptyList(),
    val storeItems: List<StoreItemDto> = emptyList(),
)

@Serializable
data class EarnRuleDto(
    val action: String = "",
    val label: String = "",
    val reward: Int = 0,
    val description: String? = null,
)

@Serializable
data class TierDto(
    val name: String = "",
    val level: Int = 0,
    val xpRequired: Int = 0,
    val perks: List<String> = emptyList(),
)

@Serializable
data class StoreItemDto(
    val type: String = "",
    val name: String = "",
    val cost: Int = 0,
    val description: String? = null,
    val requiresPost: Boolean = false,
    val badge: String? = null,
)

@Serializable
data class ReferralLeaderboardResponse(
    val leaderboard: List<LeaderboardEntry> = emptyList(),
    val myPosition: Int = 0,
    val myReferrals: Int = 0,
)

@Serializable
data class LeaderboardEntry(
    val name: String = "",
    val referrals: Int = 0,
    val position: Int = 0,
)

@Serializable
data class ProfileUpdateRequest(
    @SerialName("full_name") val fullName: String? = null,
    val phone: String? = null,
    val address: String? = null,
    val bio: String? = null,
)

// -------- Dashboard --------
@Serializable
data class DashboardResponse(
    val user: User? = null,
    @SerialName("quickStats") val quickStats: List<DashboardStat> = emptyList(),
    @SerialName("recentActivity") val recentActivity: List<DashboardActivity> = emptyList(),
    @SerialName("topSellers") val topSellers: List<User> = emptyList(),
)

@Serializable
data class DashboardStat(
    @SerialName("labelKey") val labelKey: String? = null,
    val label: String? = null,
    val value: Int = 0,
    val trend: String? = null,
    val bg: String? = null,
    val color: String? = null,
)

@Serializable
data class DashboardActivity(
    val id: String? = null,
    val title: String? = null,
    val type: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("post_id") val postId: String? = null,
)

// -------- Feed / Social --------
@Serializable
data class FeedItem(
    val id: String? = null,
    @SerialName("feed_id") val feedId: String? = null,
    val content: String? = null,
    val title: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    val images: List<String> = emptyList(),
    @SerialName("user_id") val userId: String? = null,
    @SerialName("user_name") val userName: String? = null,
    @SerialName("user_avatar") val userAvatar: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("like_count") val likeCount: Int = 0,
    @SerialName("comment_count") val commentCount: Int = 0,
    @SerialName("is_liked") val isLiked: Boolean = false,
    @SerialName("post_id") val postId: String? = null,
) {
    val stableId: String get() = id ?: feedId ?: "${userId}-${createdAt}"
    val displayName: String get() = userName ?: "User"
    val displayContent: String get() = content ?: title ?: ""
}

@Serializable
data class FeedResponse(
    val items: List<FeedItem> = emptyList(),
    val feed: List<FeedItem> = emptyList(),
    val total: Int? = null,
) {
    val allItems: List<FeedItem> get() = if (items.isNotEmpty()) items else feed
}

@Serializable
data class CreateFeedRequest(
    val content: String,
    @SerialName("post_id") val postId: String? = null,
    val images: List<String> = emptyList(),
)

// -------- Reviews --------
@Serializable
data class Review(
    val id: String? = null,
    @SerialName("reviewer_id") val reviewerId: String? = null,
    @SerialName("reviewer_name") val reviewerName: String? = null,
    @SerialName("reviewer_avatar") val reviewerAvatar: String? = null,
    val rating: Float = 0f,
    val comment: String? = null,
    val response: String? = null,
    @SerialName("helpful_count") val helpfulCount: Int = 0,
    @SerialName("verified_purchase") val verifiedPurchase: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null,
) {
    val stableId: String get() = id ?: "${reviewerId}-${createdAt}"
}

@Serializable
data class ReviewsResponse(
    val reviews: List<Review> = emptyList(),
    @SerialName("average_rating") val averageRating: Float = 0f,
    @SerialName("total_reviews") val totalReviews: Int = 0,
    val stats: ReviewStats? = null,
)

@Serializable
data class ReviewStats(
    val distribution: Map<String, Int> = emptyMap(),
)

@Serializable
data class ReviewRequest(
    @SerialName("reviewed_user_id") val reviewedUserId: String,
    val rating: Int,
    val comment: String? = null,
)

// -------- Offers --------
@Serializable
data class Offer(
    val id: String? = null,
    @SerialName("offer_id") val offerId: String? = null,
    @SerialName("post_id") val postId: String? = null,
    @SerialName("post_title") val postTitle: String? = null,
    @SerialName("post_image") val postImage: String? = null,
    @SerialName("buyer_id") val buyerId: String? = null,
    @SerialName("buyer_name") val buyerName: String? = null,
    @SerialName("seller_id") val sellerId: String? = null,
    @SerialName("seller_name") val sellerName: String? = null,
    val amount: Double = 0.0,
    @SerialName("original_price") val originalPrice: Double = 0.0,
    @SerialName("counter_price") val counterPrice: Double? = null,
    val status: String? = null,
    @SerialName("expires_at") val expiresAt: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
) {
    val stableId: String get() = id ?: offerId ?: "${postId}-${buyerId}"
    val savings: Double get() = if (originalPrice > 0) ((originalPrice - amount) / originalPrice * 100) else 0.0
}

@Serializable
data class OffersResponse(
    val offers: List<Offer> = emptyList(),
)

// -------- Cart --------
@Serializable
data class CartItem(
    val id: String? = null,
    @SerialName("post_id") val postId: String? = null,
    val title: String? = null,
    val price: Double? = null,
    val currency: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("seller_name") val sellerName: String? = null,
    val quantity: Int = 1,
) {
    val stableId: String get() = id ?: postId ?: title.orEmpty()
}

@Serializable
data class CartResponse(
    val items: List<CartItem> = emptyList(),
    val total: Double = 0.0,
)

// -------- Saved Searches --------
@Serializable
data class SavedSearch(
    val id: String? = null,
    val query: String? = null,
    val category: String? = null,
    val location: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
) {
    val stableId: String get() = id ?: "${query}-${createdAt}"
    val displayQuery: String get() = query ?: "Search"
}

@Serializable
data class SavedSearchesResponse(
    val searches: List<SavedSearch> = emptyList(),
)

// -------- Channels --------
@Serializable
data class Channel(
    val id: String? = null,
    @SerialName("channel_id") val channelId: String? = null,
    val name: String? = null,
    val description: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("member_count") val memberCount: Int = 0,
    @SerialName("post_count") val postCount: Int = 0,
    @SerialName("owner_id") val ownerId: String? = null,
    @SerialName("owner_name") val ownerName: String? = null,
    @SerialName("is_member") val isMember: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("is_verified") val isVerified: Boolean = false,
    @SerialName("follower_count") val followerCount: Int = 0,
    val posts: List<com.mhub.app.domain.model.Post> = emptyList(),
) {
    val stableId: String get() = id ?: channelId ?: name.orEmpty()
    val displayName: String get() = name ?: "Channel"
}

@Serializable
data class ChannelsResponse(
    val channels: List<Channel> = emptyList(),
)

@Serializable
data class CreateChannelRequest(
    val name: String,
    val description: String? = null,
)

// -------- Centres --------
@Serializable
data class Centre(
    val id: String? = null,
    @SerialName("centre_id") val centreId: String? = null,
    val name: String? = null,
    val description: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    val location: String? = null,
    @SerialName("listing_count") val listingCount: Int = 0,
    @SerialName("owner_id") val ownerId: String? = null,
    @SerialName("owner_name") val ownerName: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("follower_count") val followerCount: Int? = null,
) {
    val stableId: String get() = id ?: centreId ?: name.orEmpty()
    val displayName: String get() = name ?: "Centre"
}

@Serializable
data class CentresResponse(
    val centres: List<Centre> = emptyList(),
)

@Serializable
data class CreateCentreRequest(
    val name: String,
    val description: String? = null,
    val location: String? = null,
)

// -------- Complaints / Feedback --------
@Serializable
data class ComplaintRequest(
    val subject: String,
    val description: String,
    @SerialName("post_id") val postId: String? = null,
    @SerialName("user_id") val userId: String? = null,
)

@Serializable
data class FeedbackRequest(
    val type: String,
    val message: String,
    val rating: Int? = null,
)

// -------- Analytics --------
@Serializable
data class AnalyticsResponse(
    @SerialName("post_views") val postViews: Int = 0,
    @SerialName("profile_visits") val profileVisits: Int = 0,
    @SerialName("total_listings") val totalListings: Int = 0,
    @SerialName("total_sales") val totalSales: Int = 0,
    @SerialName("total_revenue") val totalRevenue: Double = 0.0,
    @SerialName("click_rate") val clickRate: Float = 0f,
    @SerialName("conversion_rate") val conversionRate: Float = 0f,
    @SerialName("top_performing") val topPerforming: List<Post> = emptyList(),
)

// -------- Security --------
@Serializable
data class UserSession(
    @SerialName("session_id") val sessionId: String? = null,
    @SerialName("device_fingerprint") val deviceFingerprint: String? = null,
    @SerialName("user_agent") val userAgent: String? = null,
    @SerialName("ip_address") val ipAddress: String? = null,
    @SerialName("last_activity") val lastActivity: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("expires_at") val expiresAt: String? = null,
) {
    val stableId: String get() = sessionId ?: "${deviceFingerprint}-${createdAt}"
    val displayDevice: String get() = deviceFingerprint ?: "Unknown device"
    val maskedIp: String get() {
        val ip = ipAddress?.removePrefix("::ffff:") ?: return "Unknown"
        val parts = ip.split(".")
        return if (parts.size == 4) "${parts[0]}.${parts[1]}.x.x" else ip.take(8) + "..."
    }
}

@Serializable
data class SessionsResponse(
    val sessions: List<UserSession> = emptyList(),
)

@Serializable
data class TwoFaStatusResponse(
    val enabled: Boolean = false,
    val available: Boolean = true,
)

// -------- Account --------
@Serializable
data class DeleteAccountRequest(val reason: String? = null)

@Serializable
data class VerificationStatusResponse(
    val status: String? = null,
    @SerialName("submitted_at") val submittedAt: String? = null,
    @SerialName("verified_at") val verifiedAt: String? = null,
)

@Serializable
data class VerificationRequest(
    @SerialName("doc_type") val docType: String,
    @SerialName("doc_number") val docNumber: String,
)

// -------- Tier / Payment --------
@Serializable
data class Tier(
    val id: String? = null,
    val name: String? = null,
    val price: Double = 0.0,
    val currency: String = "INR",
    val duration: Int = 30,
    val features: List<String> = emptyList(),
    val popular: Boolean = false,
)

@Serializable
data class TiersResponse(
    val tiers: List<Tier> = emptyList(),
)

@Serializable
data class SubscribeRequest(
    @SerialName("tier_id") val tierId: String,
    @SerialName("payment_method") val paymentMethod: String = "upi",
)

// -------- Legal / CMS --------
@Serializable
data class CmsContentResponse(
    val content: String? = null,
    val html: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
) {
    val displayContent: String get() = content ?: html ?: ""
}

// -------- Invite --------
@Serializable
data class InviteResponse(
    val valid: Boolean = false,
    @SerialName("inviter_name") val inviterName: String? = null,
    @SerialName("inviter_id") val inviterId: String? = null,
    val bonus: Int = 0,
)

// -------- Price Alerts --------
@Serializable
data class PriceAlertRequest(
    @SerialName("post_id") val postId: String,
)

// -------- Post Boost --------
@Serializable
data class BoostRequest(
    val tier: String = "basic", // basic | featured | spotlight
    val duration: Int = 24, // hours
)

@Serializable
data class BoostStatusResponse(
    val boosted: Boolean = false,
    val tier: String? = null,
    @SerialName("expires_at") val expiresAt: String? = null,
    @SerialName("views_gained") val viewsGained: Int = 0,
)

// -------- Draft --------
@Serializable
data class DraftResponse(
    val title: String? = null,
    val description: String? = null,
    val price: Double? = null,
    @SerialName("category_id") val categoryId: String? = null,
    val location: String? = null,
    val condition: String? = null,
    val brand: String? = null,
)

@Serializable
data class DraftRequest(
    val title: String? = null,
    val description: String? = null,
    val price: Double? = null,
    @SerialName("category_id") val categoryId: String? = null,
    val location: String? = null,
    val condition: String? = null,
    val brand: String? = null,
)

// -------- Notification Preferences --------
@Serializable
data class NotificationPrefsResponse(
    val chat: Boolean = true,
    val offers: Boolean = true,
    @SerialName("price_drops") val priceDrops: Boolean = true,
    val sales: Boolean = true,
    val system: Boolean = true,
    val marketing: Boolean = false,
)

@Serializable
data class NotificationPrefsRequest(
    val chat: Boolean? = null,
    val offers: Boolean? = null,
    @SerialName("price_drops") val priceDrops: Boolean? = null,
    val sales: Boolean? = null,
    val system: Boolean? = null,
    val marketing: Boolean? = null,
)

// -------- Daily Code --------
@Serializable
data class DailyCodeResponse(
    val code: String = "",
    val reward: Int = 0,
    @SerialName("expires_at") val expiresAt: String? = null,
    val claimed: Boolean = false,
)

// -------- Referral Tree --------
@Serializable
data class ReferralTreeResponse(
    val total: Int = 0,
    @SerialName("level_1") val level1: Int = 0,
    @SerialName("level_2") val level2: Int = 0,
    @SerialName("level_3") val level3: Int = 0,
    val earnings: Double = 0.0,
    val referrals: List<ReferralNode> = emptyList(),
)

@Serializable
data class ReferralNode(
    val id: String = "",
    val name: String = "",
    val level: Int = 1,
    @SerialName("joined_at") val joinedAt: String? = null,
    val earnings: Double = 0.0,
)
