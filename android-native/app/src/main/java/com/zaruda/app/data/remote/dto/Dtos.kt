package com.zaruda.app.data.remote.dto

import com.zaruda.app.domain.model.Category
import com.zaruda.app.domain.model.KycSubmission
import com.zaruda.app.domain.model.Post
import com.zaruda.app.domain.model.User
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.contentOrNull

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

@Serializable
data class PreferredLanguageRequest(
    val language: String,
)

// -------- Auth --------
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
data class RefreshTokenRequest(val refreshToken: String)

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

@Serializable
data class GoogleSignInRequest(
    val idToken: String,
    val fullName: String? = null,
    val email: String? = null,
)

// -------- Auth extended (OTP/Aadhaar/2FA) --------
@Serializable
data class SendOtpRequest(
    val phone: String,
    val purpose: String = "sim_verification",
    val deviceId: String? = null,
)

@Serializable
data class VerifyOtpRequest(
    val phone: String,
    val otp: String,
    val purpose: String = "login",
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
data class AadhaarGenerateRequest(
    @SerialName("aadhaar_number") val aadhaarNumber: String,
)

@Serializable
data class AadhaarVerifyOtpRequest(
    val aadhaarNumber: String? = null,
    val mobileNumber: String? = null,
    val otp: String,
    val txnId: String? = null,
    val houseNo: String? = null,
    val area: String? = null,
    val city: String? = null,
    val state: String? = null,
    val pincode: String? = null,
)

@Serializable
data class AadhaarVerifyResponse(
    val success: Boolean = true,
    val signupToken: String? = null,
    val message: String? = null,
    val name: String? = null,
    val maskedAadhaar: String? = null,
    val kycToken: String? = null,
)

@Serializable
data class AadhaarVerifyRequest(
    val otp: String,
    @SerialName("txn_id") val txnId: String,
)

@Serializable
data class PanVerifyRequest(
    val signupToken: String,
    val panNumber: String,
)

@Serializable
data class PanVerifyResponse(
    val success: Boolean = true,
    val message: String? = null,
    val name: String? = null,
)

@Serializable
data class CompleteAadhaarSignupRequest(
    val signupToken: String,
    val password: String,
    val confirmPassword: String,
    val email: String? = null,
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

@Serializable
data class CreateInquiryRequest(
    @SerialName("post_id") val postId: String,
    @SerialName("buyer_name") val buyerName: String,
    val phone: String,
    val address: String? = null,
    val message: String? = null,
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
// NOTE: Field names must match the server's camelCase destructuring — do NOT use @SerialName here.
@Serializable
data class InitiateSaleRequest(
    val postId: String,
    val buyerId: String,
    val agreedPrice: Double,
)

@Serializable
data class ConfirmSaleRequest(
    val transactionId: String,
    val otp: String,
)

@Serializable
data class ReactivatePostRequest(
    val reason: String,
    val description: String? = null,
)

@Serializable
data class PostTotalsResponse(
    val totals: PostTotals? = null,
    val total: Int = 0,
    val active: Int = 0,
    val sold: Int = 0,
    val bought: Int = 0,
)

@Serializable
data class PostTotals(
    val total: Int = 0,
    val active: Int = 0,
    val sold: Int = 0,
    val bought: Int = 0,
)

@Serializable
data class PatchPostStatusRequest(
    val status: String,
    val reason: String? = null,
    val description: String? = null,
)

// initiate sale response — server wraps transactionId inside `transaction` object
@Serializable
data class SaleTransactionInfo(
    val transactionId: String? = null,
    val status: String? = null,
    val completedAt: String? = null,
    val agreedPrice: Double? = null,
    val otpExpiresIn: String? = null,
    val expiresAt: String? = null,
    // secretOTP returned by server on initiation so seller can share with buyer
    @SerialName("secretOTP") val secretOTP: String? = null,
)

@Serializable
data class InitiateSaleResponse(
    val message: String? = null,
    val transaction: SaleTransactionInfo? = null,
    val instructions: String? = null,
)

// confirm sale response — rich object with buyer/item/rewards/receipt
@Serializable
data class SalePartyInfo(
    val id: String? = null,
    val name: String? = null,
    val username: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("user_id") val userId: String? = null,
)

@Serializable
data class SaleItemInfo(
    @SerialName("post_id") val postId: String? = null,
    val title: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    val location: String? = null,
    val category: String? = null,
    @SerialName("category_name") val categoryName: String? = null,
    @SerialName("subcategory_name") val subcategoryName: String? = null,
    val price: Double? = null,
    @SerialName("listing_price") val listingPrice: Double? = null,
    @SerialName("agreed_price") val agreedPrice: Double? = null,
)

@Serializable
data class SaleRewardsInfo(
    val sellerPoints: Int? = null,
    val buyerPoints: Int? = null,
    val bonusPoints: Int? = null,
    val referralPoints: Int? = null,
    val chainPoints: Int? = null,
) {
    val totalPoints: Int get() = (sellerPoints ?: 0) + (bonusPoints ?: 0) + (referralPoints ?: 0) + (chainPoints ?: 0)
}

@Serializable
data class SaleReceiptInfo(
    val receiptId: String? = null,
    val transactionId: String? = null,
    val amount: Double? = null,
    val currency: String? = null,
    val completedAt: String? = null,
)

@Serializable
data class ConfirmSaleResponse(
    val message: String? = null,
    val transaction: SaleTransactionInfo? = null,
    val postStatus: String? = null,
    val item: SaleItemInfo? = null,
    val buyer: SalePartyInfo? = null,
    val seller: SalePartyInfo? = null,
    val rewards: SaleRewardsInfo? = null,
    val receipt: SaleReceiptInfo? = null,
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
data class MessageResponse(val success: Boolean = true, val message: String? = null, val inWishlist: Boolean? = null)

@Serializable
data class IdResponse(val success: Boolean = true, val id: String? = null)

@Serializable
data class UploadResponse(val url: String? = null, val key: String? = null, val size: Long? = null)

@Serializable
data class PostsResponse(
    val posts: List<Post> = emptyList(),
    val data: List<Post> = emptyList(),
    val items: List<Post> = emptyList(),
    val rows: List<Post> = emptyList(),
    val total: Int? = null,
    @SerialName("is_restricted") val isRestricted: Boolean = false,
) {
    // Mirror web app extractPostList() — handle all response shapes
    val allItems: List<Post> get() = when {
        posts.isNotEmpty() -> posts
        data.isNotEmpty() -> data
        items.isNotEmpty() -> items
        rows.isNotEmpty() -> rows
        else -> emptyList()
    }
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
    @SerialName("subcategory_id") val subcategoryId: String? = null,
    val images: List<String> = emptyList(),
    val condition: String? = null,
    val brand: String? = null,
    val model: String? = null,
    @SerialName("contact_number") val contactNumber: String? = null,
    @SerialName("warranty_status") val warrantyStatus: String? = null,
    @SerialName("flash_sale") val flashSale: Boolean? = null,
    @SerialName("audio_url") val audioUrl: String? = null,
    @SerialName("age_months") val ageMonths: Int? = null,
    @SerialName("is_negotiable") val isNegotiable: Boolean? = null,
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
    @SerialName("queue_id") val submissionId: String? = null,
    val status: String? = null,
    @SerialName("user_status") val userStatus: String? = null,
    val decision: String? = null,
    @SerialName("decision_reason") val decisionReason: String? = null,
    @SerialName("validation_errors") val validationErrors: List<String> = emptyList(),
    val mock: Boolean = false,
) {
    /** Effective status for UI — prefers server user_status, falls back to status. */
    val effectiveStatus: String? get() = userStatus ?: status
}

@Serializable
data class KycUploadResponse(
    val key: String = "",
    val url: String? = null,
    val size: Long? = null,
)

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
    val notifications: List<com.zaruda.app.domain.model.Notification> = emptyList(),
    val data: List<com.zaruda.app.domain.model.Notification> = emptyList(),
    val unreadCount: Int? = null,
) {
    val items: List<com.zaruda.app.domain.model.Notification> get() = if (notifications.isNotEmpty()) notifications else data
}

// -------- Chat --------
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
    val email: String? = null,
    val phone: String? = null,
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
    @SerialName("post_credits") val coins: Int? = null,
    val activityStats: RewardsActivityStatsDto = RewardsActivityStatsDto(),
    @SerialName("has_elite_badge") val hasEliteBadge: Boolean = false,
    val leaderboard: RewardsLeaderboardDto = RewardsLeaderboardDto(),
    val referralLedger: RewardsReferralLedgerDto = RewardsReferralLedgerDto(),
) {
    val isPremium: Boolean get() = currentPlan?.lowercase() == "premium"
}

@Serializable
data class RewardsActivityStatsDto(
    val salesCount: Int = 0,
    val purchasesCount: Int = 0,
    val referralsCount: Int = 0,
    val postsCount: Int = 0,
    val sharesCount: Int = 0,
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
    val referralMilestones: ReferralMilestoneStatus = ReferralMilestoneStatus(),
)

@Serializable
data class DailyCheckInStatus(
    val canClaim: Boolean = false,
    val streak: Int = 0,
    @SerialName("lastCheckinDate") val lastClaimDate: String? = null,
    @SerialName("nextReward") val todayReward: Int = 5,
    val weekProgress: List<Boolean> = emptyList(),
)

@Serializable
data class SpinStatus(
    val canSpin: Boolean = false,
    @SerialName("spinDate") val lastSpinDate: String? = null,
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
data class StoreRedeemRequest(
    val type: String,
    val postId: String? = null,
)

@Serializable
data class RedeemCoinsRequest(
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
    @SerialName("social_links") val socialLinks: Map<String, String>? = null,
    @SerialName("cover_image") val coverImage: String? = null,
    @SerialName("avatar") val avatar: String? = null,
)

// -------- Seller Payout DTOs (Razorpay payout linking) --------

@Serializable
data class PayoutBankDetails(
    @SerialName("account_number") val accountNumber: String? = null,
    val ifsc: String? = null,
    @SerialName("beneficiary_name") val beneficiaryName: String? = null,
)

@Serializable
data class PayoutLinkRequest(
    val type: String = "upi", // "upi" | "bank_account"
    @SerialName("upi_id") val upiId: String? = null,
    @SerialName("bank_account") val bankAccount: PayoutBankDetails? = null,
)

@Serializable
data class PayoutLinkResponse(
    val success: Boolean = false,
    val message: String? = null,
    val sandbox: Boolean = false,
    @SerialName("payout_method") val payoutMethod: String? = null,
)

@Serializable
data class PayoutMethodItem(
    val type: String? = null, // "upi" | "bank_account"
    @SerialName("upi_id") val upiId: String? = null,
    // Free-form JSONB from the server: { type, account_number, ifsc, upi_id, ... }
    val details: Map<String, String>? = null,
    val linked: Boolean = false,
) {
    val accountNumberDisplay: String? get() = details?.get("account_number")
    val ifscDisplay: String? get() = details?.get("ifsc")
    val upiDisplay: String? get() = upiId ?: details?.get("upi_id")
}

@Serializable
data class PayoutStatusResponse(
    val linked: Boolean = false,
    @SerialName("payout_methods") val payoutMethods: List<PayoutMethodItem> = emptyList(),
    @SerialName("razorpay_contact_id") val razorpayContactId: String? = null,
    @SerialName("razorpay_fund_account_id") val razorpayFundAccountId: String? = null,
)

// -------- Full Profile (single-call payload) --------

@Serializable
data class FullProfileResponse(
    val success: Boolean = false,
    val user: FullProfileUser? = null,
    val profile: FullProfileData? = null,
    val verification: FullProfileVerification? = null,
    val stats: FullProfileStats? = null,
    val payout: FullProfilePayout? = null,
    val completion: FullProfileCompletion? = null,
)

@Serializable
data class FullProfileUser(
    @SerialName("userId") val userId: String? = null,
    val name: String? = null,
    val email: String? = null,
    val phone: String? = null,
    val role: String? = null,
    @SerialName("currentPlan") val currentPlan: String? = null,
    @SerialName("rewardsRank") val rewardsRank: String? = null,
    @SerialName("rewardBadge") val rewardBadge: String? = null,
    val coins: Int = 0,
    @SerialName("createdAt") val createdAt: String? = null,
)

@Serializable
data class FullProfileData(
    @SerialName("fullName") val fullName: String? = null,
    @SerialName("avatarUrl") val avatarUrl: String? = null,
    @SerialName("coverImageUrl") val coverImageUrl: String? = null,
    val bio: String? = null,
    val location: FullProfileLocation? = null,
    @SerialName("socialLinks") val socialLinks: Map<String, String>? = null,
)

@Serializable
data class FullProfileLocation(
    val address: String? = null,
)

@Serializable
data class FullProfileVerification(
    @SerialName("emailVerified") val emailVerified: Boolean = false,
    @SerialName("phoneVerified") val phoneVerified: Boolean = false,
    @SerialName("aadhaarVerified") val aadhaarVerified: Boolean = false,
    @SerialName("kycStatus") val kycStatus: String? = null,
    @SerialName("trustScore") val trustScore: Int = 0,
    @SerialName("trustBadge") val trustBadge: String? = null,
    @SerialName("trustLevel") val trustLevel: String? = null,
)

@Serializable
data class FullProfileStats(
    @SerialName("activeListings") val activeListings: Int = 0,
    @SerialName("soldListings") val soldListings: Int = 0,
    @SerialName("totalSalesAmount") val totalSalesAmount: Double = 0.0,
)

@Serializable
data class FullProfilePayout(
    @SerialName("isLinked") val isLinked: Boolean = false,
    val type: String? = null,
    @SerialName("maskedAccount") val maskedAccount: String? = null,
)

@Serializable
data class FullProfileCompletion(
    val percentage: Int = 0,
    @SerialName("missingFields") val missingFields: List<String> = emptyList(),
)

@Serializable
data class PreferencesUpdateRequest(
    val location: String? = null,
    @SerialName("minPrice") val minPrice: Int? = null,
    @SerialName("maxPrice") val maxPrice: Int? = null,
    val categories: List<String>? = null,
)

@Serializable
data class PreferencesResponse(
    val location: String? = null,
    @SerialName("min_price") val minPrice: Int? = null,
    @SerialName("max_price") val maxPrice: Int? = null,
    val categories: List<String>? = null,
)

// -------- Chat extras --------
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
    val description: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    val images: List<String> = emptyList(),
    @SerialName("user_id") val userId: String? = null,
    @SerialName("user_name") val userName: String? = null,
    @SerialName("user_avatar") val userAvatar: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    // like_count = social feed style; likes = marketplace post style
    @SerialName("like_count") val likeCount: Int = 0,
    @SerialName("likes") val likesApi: Int = 0,
    @SerialName("comment_count") val commentCount: Int = 0,
    @SerialName("is_liked") val isLiked: Boolean = false,
    // view_count = social feed style; views_count = marketplace post style
    @SerialName("view_count") val viewCount: Int? = null,
    @SerialName("views_count") val viewsCount: Int? = null,
    @SerialName("post_id") val postId: String? = null,
    val price: Double? = null,
    val status: String? = null,
    @SerialName("category_name") val categoryName: String? = null,
    @SerialName("subcategory_name") val subcategoryName: String? = null,
    @SerialName("location") val location: String? = null,
    @SerialName("area") val area: String? = null,
    @SerialName("city") val city: String? = null,
    val user: FeedItemUser? = null,
) {
    val stableId: String get() = id ?: feedId ?: postId ?: "${userId}-${createdAt}"
    val displayName: String get() = userName ?: user?.name ?: "User"
    val displayContent: String get() = content ?: title ?: description ?: ""
    val effectiveLikes: Int get() = maxOf(likeCount, likesApi)
    val effectiveViews: Int get() = viewCount ?: viewsCount ?: 0
    val primaryImage: String? get() = imageUrl ?: images.firstOrNull()
}

@Serializable
data class FeedItemUser(
    val id: String? = null,
    val name: String? = null,
    val username: String? = null,
    val avatar: String? = null,
    @SerialName("profile_picture") val profilePicture: String? = null,
)

@Serializable
data class FeedResponse(
    val items: List<FeedItem> = emptyList(),
    val feed: List<FeedItem> = emptyList(),
    val posts: List<FeedItem> = emptyList(),
    val data: List<FeedItem> = emptyList(),
    val total: Int? = null,
) {
    // Handle server returning {posts:[...]}, {items:[...]}, {feed:[...]}, {data:[...]}
    val allItems: List<FeedItem> get() = when {
        posts.isNotEmpty() -> posts
        items.isNotEmpty() -> items
        feed.isNotEmpty() -> feed
        data.isNotEmpty() -> data
        else -> emptyList()
    }
}

@Serializable
data class CreateFeedRequest(
    // Server (POST /api/feed/add) reads req.body.description
    @SerialName("description") val content: String,
    @SerialName("post_id") val postId: String? = null,
    val images: List<String> = emptyList(),
    @SerialName("source") val source: String = "feed", // "feed" | "marketplace" — helps server route correctly
    @SerialName("type") val type: String = "text", // "text" | "image" | "link" — content type hint
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
    @SerialName("seller_response") val response: String? = null,
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
    @SerialName("totalReviews") val totalReviews: Int = 0,
    @SerialName("averageRating") val averageRating: String = "0.0",
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
    /** Seller (post owner) — required to initiate an in-app escrow sale. */
    @SerialName("seller_id") val sellerId: String? = null,
    /** Category name from the server (e.g. "Electronics") — drives the escrow badge. */
    @SerialName("category_name") val categoryName: String? = null,
    val quantity: Int = 1,
    val category: String? = null,
) {
    val stableId: String get() = id ?: postId ?: title.orEmpty()
    /** Escrow-eligible (Electronics only — platform policy). Canonical key match
     *  so subcategory names like "Mobiles"/"Laptops" also qualify, matching the
     *  server's category-name resolution. */
    val isElectronics: Boolean get() =
        com.zaruda.app.ui.wishlist.normalizeMarketplaceCategoryKey(categoryName ?: category) == "electronics"
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
    val category: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("logo_url") val logoUrl: String? = null,
    @SerialName("cover_url") val coverUrl: String? = null,
    @SerialName("member_count") val memberCount: Int = 0,
    @SerialName("post_count") val postCount: Int = 0,
    @SerialName("owner_id") val ownerId: String? = null,
    @SerialName("owner_name") val ownerName: String? = null,
    @SerialName("is_member") val isMember: Boolean = false,
    @SerialName("is_following") val isFollowing: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("is_verified") val isVerified: Boolean = false,
    @SerialName("is_premium") val isPremium: Boolean = false,
    @SerialName("follower_count") val followerCount: Int = 0,
    @SerialName("contact_email") val contactEmail: String? = null,
    @SerialName("contact_website") val contactWebsite: String? = null,
    @SerialName("contact_phone") val contactPhone: String? = null,
    val location: String? = null,
    val posts: List<com.zaruda.app.domain.model.Post> = emptyList(),
) {
    val stableId: String get() = channelId ?: id ?: name.orEmpty()
    val displayName: String get() = name ?: "Centre Page"
    /** Server marks following via either is_member or is_following. */
    val followed: Boolean get() = isMember || isFollowing
    val avatarUrl: String? get() = logoUrl ?: imageUrl
}

/** A social update/post made within a Centre Page (channel_posts table). */
@Serializable
data class ChannelPost(
    @SerialName("post_id") val postId: String? = null,
    @SerialName("channel_id") val channelId: String? = null,
    @SerialName("owner_id") val ownerId: String? = null,
    val description: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("video_url") val videoUrl: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
) {
    val stableId: String get() = postId ?: (description.orEmpty() + createdAt.orEmpty())
}

/** Response of GET /api/channels/:id — channel detail plus its update posts. */
@Serializable
data class ChannelDetailResponse(
    val channel: Channel = Channel(),
    val posts: List<ChannelPost> = emptyList(),
)

@Serializable
data class CreateChannelRequest(
    val name: String,
    val category: String,
    val description: String? = null,
    val location: String? = null,
    @SerialName("contact_email") val contactEmail: String? = null,
    @SerialName("contact_phone") val contactPhone: String? = null,
    @SerialName("contact_website") val contactWebsite: String? = null,
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
    val subject: String? = null,
    val category: String? = null,
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
// Server returns { success, slug, content, updatedAt, fallback } where content is JSONB.
@Serializable
data class CmsContentResponse(
    val success: Boolean = true,
    val slug: String? = null,
    val content: JsonElement? = null,
    val updatedAt: String? = null,
    val fallback: Boolean = false,
) {
    val displayContent: String get() {
        if (content is JsonPrimitive) {
            return content.contentOrNull ?: ""
        }
        if (content is JsonObject) {
            return content.values
                .filterIsInstance<JsonPrimitive>()
                .firstNotNullOfOrNull { it.contentOrNull }
                ?: ""
        }
        return ""
    }
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
    val model: String? = null,
    @SerialName("contact_number") val contactNumber: String? = null,
    @SerialName("age_months") val ageMonths: Int? = null,
    @SerialName("is_negotiable") val isNegotiable: Boolean? = null,
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
    val model: String? = null,
    @SerialName("contact_number") val contactNumber: String? = null,
    @SerialName("age_months") val ageMonths: Int? = null,
    @SerialName("is_negotiable") val isNegotiable: Boolean? = null,
)

// -------- Notification Preferences --------
@Serializable
data class NotificationPrefsResponse(
    @SerialName("email_enabled") val emailEnabled: Boolean = true,
    @SerialName("push_enabled") val pushEnabled: Boolean = true,
    @SerialName("sms_enabled") val smsEnabled: Boolean = false,
    @SerialName("marketing_enabled") val marketing: Boolean = false,
    @SerialName("order_updates_enabled") val sales: Boolean = true,
    @SerialName("price_drop_enabled") val priceDrops: Boolean = true,
    @SerialName("message_enabled") val chat: Boolean = true,
    // Legacy field aliases for backward compat
    val offers: Boolean = true,
    val system: Boolean = true,
)

@Serializable
data class NotificationPrefsRequest(
    @SerialName("email_enabled") val emailEnabled: Boolean? = null,
    @SerialName("push_enabled") val pushEnabled: Boolean? = null,
    @SerialName("sms_enabled") val smsEnabled: Boolean? = null,
    @SerialName("marketing_enabled") val marketing: Boolean? = null,
    @SerialName("order_updates_enabled") val sales: Boolean? = null,
    @SerialName("price_drop_enabled") val priceDrops: Boolean? = null,
    @SerialName("message_enabled") val chat: Boolean? = null,
    // Legacy aliases kept for compat
    val offers: Boolean? = null,
    val system: Boolean? = null,
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
    val userId: String? = null,
    val maxDepth: Int = 0,
    val total: Int = 0,
    val directCount: Int = 0,
    val indirectCount: Int = 0,
    val tree: ReferralNode? = null,
)

@Serializable
data class ReferralNode(
    val id: String = "",
    val name: String = "",
    val depth: Int = 0,
    @SerialName("joinDate") val joinDate: String? = null,
    val parentId: String? = null,
    val children: List<ReferralNode> = emptyList(),
) {
    fun flatten(): List<ReferralNode> {
        val result = mutableListOf<ReferralNode>()
        fun traverse(node: ReferralNode) {
            if (node.depth > 0) {
                result.add(node)
            }
            node.children.forEach { traverse(it) }
        }
        traverse(this)
        return result
    }
}

// -------- Referral Chain Status --------
@Serializable
data class ReferralChainStatusResponse(
    val referrals: List<ReferralChainMember> = emptyList(),
    val summary: ReferralChainSummary? = null,
)

@Serializable
data class ReferralChainMember(
    val userId: String = "",
    val username: String? = null,
    val fullName: String? = null,
    val avatarUrl: String? = null,
    val depth: Int = 0,
    val status: String = "pending", // pending, qualified, rewarded
    val isVerified: Boolean = false,
    val postCount: Int = 0,
    val transactionCount: Int = 0,
    val joinDate: String? = null,
)

@Serializable
data class ReferralChainSummary(
    val pending: Int = 0,
    val qualified: Int = 0,
    val rewarded: Int = 0,
    val total: Int = 0,
)

@Serializable
data class SaveSearchRequest(
    val query: String,
    val category: String? = null,
)

// -------- User social --------
@Serializable
data class ComplaintHistoryResponse(
    val complaints: List<ComplaintRecord> = emptyList(),
)

@Serializable
data class ComplaintRecord(
    val id: String? = null,
    @SerialName("reference_id") val referenceId: String? = null,
    val subject: String? = null,
    val description: String? = null,
    val status: String? = null,
    val evidence: List<String> = emptyList(),
    @SerialName("created_at") val createdAt: String? = null,
)

// -------- Followers / Following --------
@Serializable
data class FollowUserBrief(
    val id: String = "",
    val name: String? = null,
    val username: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("is_following_back") val isFollowingBack: Boolean = false,
    @SerialName("is_verified") val isVerified: Boolean = false,
) {
    val displayName: String get() = name ?: username ?: "User"
    val initials: String get() = displayName.take(2).uppercase()
}

@Serializable
data class FollowersResponse(
    val users: List<FollowUserBrief> = emptyList(),
    val total: Int = 0,
)

// -------- Profile Activity --------
@Serializable
data class ProfileActivityItem(
    val id: String = "",
    val type: String = "", // "post_created", "reviewed", "followed", "sold", "bought", "earned_badge"
    val description: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("reference_id") val referenceId: String? = null,
    @SerialName("reference_title") val referenceTitle: String? = null,
    @SerialName("reference_image") val referenceImage: String? = null,
)

@Serializable
data class ProfileActivityResponse(
    val activities: List<ProfileActivityItem> = emptyList(),
    val total: Int = 0,
)

// -------- Subscriptions --------
@Serializable
data class SubscriptionHistoryResponse(
    val subscriptions: List<SubscriptionRecord> = emptyList(),
)

@Serializable
data class SubscriptionRecord(
    val id: String? = null,
    val tier: String? = null,
    val status: String? = null,
    @SerialName("started_at") val startedAt: String? = null,
    @SerialName("expires_at") val expiresAt: String? = null,
    @SerialName("cancelled_at") val cancelledAt: String? = null,
)

@Serializable
data class MySubscriptionResponse(
    val subscription: SubscriptionRecord? = null,
    val active: Boolean = false,
)

@Serializable
data class ClaimTrialResponse(
    val success: Boolean = false,
    val message: String? = null,
    val subscription: SubscriptionRecord? = null,
)

// -------- Razorpay --------
@Serializable
data class RazorpayOrderRequest(
    val amount: Double,
    val currency: String = "INR",
    @SerialName("tier_id") val tierId: String? = null,
    @SerialName("plan_id") val planId: String? = null,
    @SerialName("sale_id") val saleId: String? = null,
    @SerialName("coinsToApply") val coinsToApply: Int = 0,
)

@Serializable
data class RazorpayOrderResponse(
    @SerialName("order_id") val orderId: String? = null,
    val amount: Double = 0.0,
    @SerialName("amount_paise") val amountPaise: Long? = null,
    val currency: String = "INR",
    @SerialName("key_id") val keyId: String? = null,
    @SerialName("sale_id") val saleId: String? = null,
    val mock: Boolean = false,
) {
    /** Back-compat alias used by the tier checkout. */
    val key: String? get() = keyId
}

@Serializable
data class RazorpayVerifyRequest(
    @SerialName("razorpay_order_id") val orderId: String,
    @SerialName("razorpay_payment_id") val paymentId: String,
    @SerialName("razorpay_signature") val signature: String,
)

@Serializable
data class SalePaymentVerifyResponse(
    val success: Boolean = true,
    val message: String? = null,
    @SerialName("sale_id") val saleId: String? = null,
    @SerialName("sale_status") val saleStatus: String? = null,
    @SerialName("payment_status") val paymentStatus: String? = null,
)

// -------- Notifications snooze --------
@Serializable
data class SnoozeRequest(
    val duration: Int = 60,
)

// -------- Saved search notification toggle --------
@Serializable
data class SavedSearchNotificationRequest(
    val enabled: Boolean,
)

// -------- Sales (new end-to-end sale flow) --------
@Serializable
data class SaleRequest(
    val postId: String,
    val sellerId: String,
    /** "IN_APP" (escrow) or "OUTSIDE" (direct cash/UPI) — omitted defaults to IN_APP on the server. */
    val paymentMode: String? = null,
)

@Serializable
data class SaleResponse(
    val success: Boolean = false,
    val sale: SaleInfo? = null,
    val message: String? = null,
)

@Serializable
data class SaleInfo(
    val id: Int = 0,
    val postId: String? = null,
    val buyerId: String? = null,
    val sellerId: String? = null,
    val status: String? = null,
    @SerialName("payment_mode") val paymentMode: String? = null,
    @SerialName("payment_status") val paymentStatus: String? = null,
    @SerialName("agreed_price") val agreedPrice: Double? = null,
    @SerialName("razorpay_order_id") val razorpayOrderId: String? = null,
    @SerialName("razorpay_payment_id") val razorpayPaymentId: String? = null,
    val reportedParty: String? = null,
    val fraudReason: String? = null,
    val adminNotified: Boolean = false,
    val createdAt: String? = null,
    val updatedAt: String? = null,
    val postTitle: String? = null,
    val postPrice: Double? = null,
    val postImages: List<String>? = null,
    val buyerName: String? = null,
    val sellerName: String? = null,
    @SerialName("buyer_rating") val buyerRating: Int? = null,
    @SerialName("buyer_comment") val buyerComment: String? = null,
    @SerialName("rated_at") val ratedAt: String? = null,
    @SerialName("shipping_tracking") val shippingTracking: String? = null,
    @SerialName("shipping_courier") val shippingCourier: String? = null,
    @SerialName("sold_from_location") val soldFromLocation: String? = null,
    @SerialName("sold_to_location") val soldToLocation: String? = null,
) {
    val isInApp: Boolean get() = paymentMode.equals("IN_APP", ignoreCase = true)
    val isPaid: Boolean get() = paymentStatus.equals("PAID", ignoreCase = true)
    val payableAmount: Double get() = agreedPrice ?: postPrice ?: 0.0
    /** Origin → Destination route badge (e.g. "Mumbai → Delhi") */
    val routeTag: String?
        get() {
            val from = soldFromLocation?.takeIf { it.isNotBlank() } ?: return null
            val to = soldToLocation?.takeIf { it.isNotBlank() } ?: return null
            return "$from → $to"
        }
}

@Serializable
data class SalesListResponse(
    val sales: List<SaleInfo> = emptyList(),
)

@Serializable
data class FraudReportRequest(
    val reportedParty: String,
    val reason: String,
)

@Serializable
data class SaleRateRequest(
    val rating: Int,
    val comment: String? = null,
)

/** Body for POST /api/sales/:id/mark-shipped — shipment evidence captured in-app. */
@Serializable
data class MarkShippedRequest(
    @SerialName("trackingNumber") val trackingNumber: String? = null,
    @SerialName("courierName") val courierName: String? = null,
    @SerialName("evidenceUrls") val evidenceUrls: List<String>? = null,
)

/** Server response for GET /api/sales/my/review-status — buyer's rating eligibility for one post. */
@Serializable
data class MyReviewStatusResponse(
    val success: Boolean = false,
    val eligible: Boolean = false,
    val rated: Boolean = false,
    val saleId: Int? = null,
    val status: String? = null,
    val buyerRating: Int? = null,
    val buyerComment: String? = null,
    val ratedAt: String? = null,
)

@Serializable
data class FraudResponseRequest(
    val message: String,
)

@Serializable
data class SuspensionStatusResponse(
    val suspended: Boolean = false,
    val permanentlyLocked: Boolean = false,
    val reason: String? = null,
    val remainingHours: Int = 0,
    val remainingMinutes: Int = 0,
    val suspendedUntil: String? = null,
    val responded: Boolean = false,
    val message: String? = null,
)

// -------- Order / Checkout --------
@Serializable
data class CreateOrderRequest(
    @SerialName("post_id") val postId: String,
    @SerialName("buyer_id") val buyerId: String,
    @SerialName("address_id") val addressId: String = "",
    @SerialName("payment_method") val paymentMethod: String = "UPI",
    val amount: Double = 0.0,
    val currency: String = "INR",
)

@Serializable
data class CreateOrderResponse(
    val success: Boolean = true,
    @SerialName("order_id") val orderId: String? = null,
    @SerialName("order_number") val orderNumber: String? = null,
    @SerialName("handover_otp") val handoverOtp: String? = null,
    @SerialName("transaction_id") val transactionId: String? = null,
    val message: String? = null,
    @SerialName("payment_url") val paymentUrl: String? = null,
)

@Serializable
data class TrendingSearchResponse(
    val queries: List<String> = emptyList(),
)

// -------- Public Wall Leaderboard --------
@Serializable
data class PublicWallEntry(
    val id: String? = null,
    val name: String = "User",
    val rank: String? = null,
    val rating: String? = null,
    val sales: Int? = null,
    val purchases: Int? = null,
    val coins: Int? = null,
    val verified: Boolean = false,
    @SerialName("total_coins") val totalCoins: Int? = null,
    val level: Int? = null,
    val badge: String? = null,
) {
    val displayName: String get() = name.ifBlank { "User" }
    val initials: String get() = name.take(2).uppercase().ifBlank { "U" }
}

@Serializable
data class PublicWallLeaderboardResponse(
    @SerialName("topSellers") val topSellers: List<PublicWallEntry> = emptyList(),
    @SerialName("topBuyers") val topBuyers: List<PublicWallEntry> = emptyList(),
    @SerialName("topUsers") val topUsers: List<PublicWallEntry> = emptyList(),
)

// ---- Subscription DTOs ----
@Serializable
data class SubscriptionPlan(
    val id: String,
    val name: String,
    val displayName: String = "",
    val priceINR: Int = 0,
    val features: List<String> = emptyList(),
    val maxListings: Int? = null,
    val maxImages: Int = 1,
    val dailyLimit: Int = 1,
    @SerialName("duration_days") val durationDays: Int = 30,
    val slug: String? = null,
)

@Serializable
data class SubscriptionPlansResponse(
    val plans: List<SubscriptionPlan>
)

// =====================================================================
// V1 SUBSCRIPTION DTOS
// =====================================================================

@Serializable
data class SubscriptionFeature(
    val feature_code: String = "",
    val feature_name: String = "",
    val description: String? = null,
    val feature_type: String = "boolean",
    val value: String = "false",
    val overage_price: Double? = null,
)

@Serializable
data class SubscriptionPlanV1(
    val plan_id: String = "",
    val plan_name: String = "",
    val slug: String? = null,
    val description: String? = null,
    val price: Double = 0.0,
    val currency: String = "INR",
    val billing_period: String = "monthly",
    val duration_days: Int = 30,
    val gst_rate: Double = 18.00,
    val sort_order: Int = 0,
    val features: List<SubscriptionFeature> = emptyList(),
)

@Serializable
data class MySubscriptionResponseV1(
    val subscription: ActiveSubscriptionV1? = null,
    val currentPlan: String = "BASIC",
    val features: List<SubscriptionFeature> = emptyList(),
    val isExpired: Boolean = false,
    val expiresInDays: Int = 0,
)

@Serializable
data class ActiveSubscriptionV1(
    val sub_id: String? = null,
    val plan_id: String? = null,
    val plan_name: String? = null,
    val slug: String? = null,
    val status: String? = null,
    val start_date: String? = null,
    val end_date: String? = null,
    val price: Double? = null,
    val duration_days: Int? = null,
)

@Serializable
data class CreateSubscriptionOrderRequest(
    val plan_id: String,
)

@Serializable
data class CreateSubscriptionOrderResponse(
    val success: Boolean = false,
    val sandbox: Boolean = false,
    val order: RazorpayOrder? = null,
    val plan: SubscriptionPlanV1? = null,
)

@Serializable
data class RazorpayOrder(
    val id: String = "",
    val amount: Int = 0,
    val currency: String = "INR",
    val receipt: String? = null,
)

@Serializable
data class VerifySubscriptionPaymentRequest(
    val razorpay_order_id: String,
    val razorpay_payment_id: String,
    val razorpay_signature: String,
    val plan_id: String,
)

@Serializable
data class VerifySubscriptionPaymentResponse(
    val success: Boolean = false,
    val message: String? = null,
    val currentPlan: String? = null,
    val subscription: ActiveSubscriptionV1? = null,
)

@Serializable
data class SubscriptionHistoryResponseV1(
    val success: Boolean = false,
    val history: List<ActiveSubscriptionV1> = emptyList(),
)

@Serializable
data class SubscriptionFeaturesResponse(
    val success: Boolean = false,
    val currentPlan: String = "BASIC",
    val features: List<SubscriptionFeature> = emptyList(),
)

@Serializable
data class CheckFeatureResponse(
    val success: Boolean = false,
    val allowed: Boolean = false,
    val featureCode: String = "",
    val currentPlan: String = "BASIC",
    val limit: Int? = null,
    val overagePrice: Double? = null,
)

// =====================================================================
// V1 ORDER DTOS
// =====================================================================

@Serializable
data class OrderV1(
    val order_id: String = "",
    val order_number: String = "",
    val buyer_id: String = "",
    val seller_id: String = "",
    val product_id: String = "",
    val total_amount: Double = 0.0,
    val status: String = "PENDING",
    val payment_status: String = "PENDING",
    val created_at: String? = null,
    val product_title: String? = null,
    val product_price: Double? = null,
)

@Serializable
data class OrdersListResponse(
    val success: Boolean = false,
    val orders: List<OrderV1> = emptyList(),
)

@Serializable
data class CreateOrderRequestV1(
    val product_id: String,
    val seller_id: String,
    val variant_id: String? = null,
    val quantity: Int = 1,
)

@Serializable
data class CreateOrderResponseV1(
    val success: Boolean = false,
    val order: OrderV1? = null,
)

@Serializable
data class OrderDetailResponse(
    val success: Boolean = false,
    val order: OrderV1? = null,
)

@Serializable
data class UpdateOrderStatusRequest(
    val status: String,
)

@Serializable
data class OrderStatusHistory(
    val history_id: String = "",
    val order_id: String = "",
    val old_status: String? = null,
    val new_status: String = "",
    val created_at: String? = null,
)

// =====================================================================
// V1 DISPUTE DTOS
// =====================================================================

@Serializable
data class Dispute(
    val dispute_id: String = "",
    val order_id: String = "",
    val raised_by: String = "",
    val raised_against: String = "",
    val dispute_type: String = "",
    val description: String = "",
    val status: String = "OPEN",
    val created_at: String? = null,
    val order_number: String? = null,
)

@Serializable
data class DisputesListResponse(
    val success: Boolean = false,
    val disputes: List<Dispute> = emptyList(),
)

@Serializable
data class CreateDisputeRequest(
    val order_id: String,
    val dispute_type: String,
    val description: String,
    val raised_against: String,
)

@Serializable
data class CreateDisputeResponse(
    val success: Boolean = false,
    val dispute: Dispute? = null,
)

@Serializable
data class DisputeMessage(
    val message_id: String = "",
    val dispute_id: String = "",
    val sender_id: String = "",
    val message: String = "",
    val created_at: String? = null,
)

@Serializable
data class DisputeEvidence(
    val evidence_id: String = "",
    val dispute_id: String = "",
    val submitted_by: String = "",
    val evidence_type: String = "",
    val object_key: String? = null,
    val content: String? = null,
    val description: String? = null,
    val created_at: String? = null,
)

@Serializable
data class DisputeDetailResponse(
    val success: Boolean = false,
    val dispute: Dispute? = null,
    val messages: List<DisputeMessage> = emptyList(),
    val evidence: List<DisputeEvidence> = emptyList(),
)

@Serializable
data class AddDisputeMessageRequest(
    val message: String,
)

@Serializable
data class AddDisputeEvidenceRequest(
    val evidence_type: String,
    val object_key: String? = null,
    val content: String? = null,
    val description: String? = null,
)

// =====================================================================
// V1 SHIPMENT DTOS
// =====================================================================

@Serializable
data class Shipment(
    val shipment_id: String = "",
    val order_id: String = "",
    val carrier: String? = null,
    val tracking_number: String? = null,
    val lr_number: String? = null,
    val status: String = "PENDING",
    val created_at: String? = null,
    val order_number: String? = null,
)

@Serializable
data class ShipmentsListResponse(
    val success: Boolean = false,
    val shipments: List<Shipment> = emptyList(),
)

@Serializable
data class CreateShipmentRequest(
    val order_id: String,
    val carrier: String? = null,
    val tracking_number: String? = null,
    val lr_number: String? = null,
)

@Serializable
data class CreateShipmentResponse(
    val success: Boolean = false,
    val shipment: Shipment? = null,
)

@Serializable
data class ShipmentDetailResponse(
    val success: Boolean = false,
    val shipment: Shipment? = null,
)

@Serializable
data class UpdateShipmentStatusRequest(
    val status: String,
    val location: String? = null,
    val description: String? = null,
)

@Serializable
data class ConfirmDeliveryRequest(
    val notes: String? = null,
)

// =====================================================================
// V1 PAGE DTOS
// =====================================================================

@Serializable
data class Page(
    val page_id: String = "",
    val owner_id: String = "",
    val name: String = "",
    val slug: String = "",
    val description: String? = null,
    val avatar_url: String? = null,
    val cover_url: String? = null,
    val category: String? = null,
    val is_verified: Boolean = false,
    val follower_count: Int = 0,
    val created_at: String? = null,
)

@Serializable
data class PagesListResponse(
    val success: Boolean = false,
    val pages: List<Page> = emptyList(),
)

@Serializable
data class CreatePageRequest(
    val name: String,
    val description: String? = null,
    val category: String? = null,
)

@Serializable
data class CreatePageResponse(
    val success: Boolean = false,
    val page: Page? = null,
)

@Serializable
data class PageDetailResponse(
    val success: Boolean = false,
    val page: Page? = null,
)

@Serializable
data class UpdatePageRequest(
    val name: String? = null,
    val description: String? = null,
    val avatar_url: String? = null,
    val cover_url: String? = null,
    val category: String? = null,
)

@Serializable
data class PagePost(
    val post_id: String = "",
    val page_id: String = "",
    val author_id: String = "",
    val content: String = "",
    val is_pinned: Boolean = false,
    val status: String = "PUBLISHED",
    val created_at: String? = null,
    val author_name: String? = null,
)

@Serializable
data class PagePostsListResponse(
    val success: Boolean = false,
    val posts: List<PagePost> = emptyList(),
)

@Serializable
data class CreatePagePostRequest(
    val content: String,
    val media: String? = null,
)

@Serializable
data class CreatePagePostResponse(
    val success: Boolean = false,
    val post: PagePost? = null,
)

// =====================================================================
// V1 MEDIA DTOS
// =====================================================================

@Serializable
data class MediaItem(
    val media_id: String = "",
    val post_id: String? = null,
    val user_id: String = "",
    val object_key: String = "",
    val media_type: String = "image",
    val mime_type: String? = null,
    val file_size: Int? = null,
    val width: Int? = null,
    val height: Int? = null,
    val status: String = "READY",
    val created_at: String? = null,
)

@Serializable
data class RecordMediaUploadRequest(
    val post_id: String? = null,
    val object_key: String,
    val media_type: String,
    val mime_type: String? = null,
    val file_size: Int? = null,
    val width: Int? = null,
    val height: Int? = null,
    val duration: Int? = null,
)

@Serializable
data class RecordMediaUploadResponse(
    val success: Boolean = false,
    val media: MediaItem? = null,
)

@Serializable
data class MediaDetailResponse(
    val success: Boolean = false,
    val media: MediaItem? = null,
)

// =====================================================================
// V1 SEARCH DTOS
// =====================================================================

@Serializable
data class SearchProduct(
    val product_id: String = "",
    val title: String = "",
    val description: String? = null,
    val price: Double = 0.0,
    val condition: String? = null,
    val category_name: String? = null,
    val category_slug: String? = null,
    val primary_image: String? = null,
    val created_at: String? = null,
)

@Serializable
data class SearchPagination(
    val page: Int = 1,
    val limit: Int = 20,
    val total: Int = 0,
    val totalPages: Int = 0,
)

@Serializable
data class SearchProductsResponse(
    val success: Boolean = false,
    val products: List<SearchProduct> = emptyList(),
    val pagination: SearchPagination? = null,
)

@Serializable
data class SearchPost(
    val post_id: String = "",
    val title: String = "",
    val description: String? = null,
    val price: Double? = null,
    val created_at: String? = null,
)

@Serializable
data class SearchPostsResponse(
    val success: Boolean = false,
    val posts: List<SearchPost> = emptyList(),
    val pagination: SearchPagination? = null,
)

@Serializable
data class SearchPagesResponse(
    val success: Boolean = false,
    val pages: List<Page> = emptyList(),
)

@Serializable
data class SearchUser(
    val user_id: String = "",
    val username: String = "",
    val email: String = "",
)

@Serializable
data class SearchUsersResponse(
    val success: Boolean = false,
    val users: List<SearchUser> = emptyList(),
)

// =====================================================================
// V1 REFUND DTOS
// =====================================================================

@Serializable
data class Refund(
    val refund_id: String = "",
    val transaction_id: String = "",
    val amount: Double = 0.0,
    val reason: String? = null,
    val status: String = "PENDING",
    val created_at: String? = null,
)

@Serializable
data class RefundsListResponse(
    val success: Boolean = false,
    val refunds: List<Refund> = emptyList(),
)

@Serializable
data class RequestRefundRequest(
    val transaction_id: String,
    val amount: Double,
    val reason: String? = null,
)

@Serializable
data class RequestRefundResponse(
    val success: Boolean = false,
    val refund: Refund? = null,
)

@Serializable
data class RefundDetailResponse(
    val success: Boolean = false,
    val refund: Refund? = null,
)

// =====================================================================
// V1 SETTLEMENT DTOS
// =====================================================================

@Serializable
data class SettlementRecord(
    val settlement_id: String = "",
    val period_start: String = "",
    val period_end: String = "",
    val total_orders: Int = 0,
    val gross_amount: Double = 0.0,
    val platform_fees: Double = 0.0,
    val net_amount: Double = 0.0,
    val status: String = "PENDING",
    val created_at: String? = null,
)

@Serializable
data class SettlementsListResponse(
    val success: Boolean = false,
    val settlements: List<SettlementRecord> = emptyList(),
)

@Serializable
data class CurrentSettlement(
    val total_orders: Int = 0,
    val gross_amount: Double = 0.0,
    val total_fees: Double = 0.0,
    val estimated_payout: Double = 0.0,
)

@Serializable
data class CurrentSettlementResponse(
    val success: Boolean = false,
    val current: CurrentSettlement? = null,
)

@Serializable
data class SettlementDetailResponse(
    val success: Boolean = false,
    val settlement: SettlementRecord? = null,
)

// =====================================================================
// V1 RESPONSE DTOS (for ZarudaApiV1)
// =====================================================================

@Serializable
data class SubscriptionPlansResponseV1(
    val success: Boolean = false,
    val plans: List<SubscriptionPlanV1> = emptyList(),
)

// =====================================================================
// PURCHASE REVIEW / USER SOLD POSTS DTOS
// =====================================================================

@Serializable
data class PurchaseReviewRequestV1(
    @SerialName("sale_id") val saleId: String,
    @SerialName("post_id") val postId: String,
    val rating: Int,
    val comment: String? = null,
)

@Serializable
data class UserSoldPostsResponseV1(
    val success: Boolean = false,
    // Server returns the list under `sold_posts` (see server salesController.getSellerSoldPosts).
    // `posts` kept for backward-compat with any older shape.
    @SerialName("sold_posts") val soldPosts: List<UserSoldPostV1> = emptyList(),
    val posts: List<UserSoldPostV1> = emptyList(),
    // Seller trust-passport summary
    @SerialName("seller_id") val sellerId: String? = null,
    @SerialName("seller_name") val sellerName: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("is_kyc_verified") val isKycVerified: Boolean = false,
    @SerialName("total_sold") val totalSold: Int = 0,
    @SerialName("total_bought") val totalBought: Int = 0,
    @SerialName("average_rating") val averageRating: Double = 0.0,
    @SerialName("star_string") val starString: String? = null,
    @SerialName("trust_score") val trustScore: Int = 0,
    @SerialName("trust_badge") val trustBadge: String? = null,
    val total: Int = 0,
    val page: Int = 1,
    val limit: Int = 20,
) {
    val items: List<UserSoldPostV1> get() = if (soldPosts.isNotEmpty()) soldPosts else posts
}

@Serializable
data class UserBoughtPostsResponseV1(
    val success: Boolean = false,
    @SerialName("bought_posts") val boughtPosts: List<UserSoldPostV1> = emptyList(),
    @SerialName("user_id") val userId: String? = null,
    @SerialName("seller_name") val userName: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    @SerialName("is_kyc_verified") val isKycVerified: Boolean = false,
    @SerialName("total_bought") val totalBought: Int = 0,
    val total: Int = 0,
    val page: Int = 1,
    val limit: Int = 20,
)

@Serializable
data class UserSoldPostV1(
    // Sale / transaction identifiers
    @SerialName("sale_id") val saleId: String? = null,
    @SerialName("post_id") val postId: String? = null,
    val id: String? = null,
    @SerialName("user_id") val userId: String? = null,
    // Post details (server sends post_title / post_price for the public endpoint)
    val title: String? = null,
    @SerialName("post_title") val postTitle: String? = null,
    val description: String? = null,
    val price: Double? = null,
    @SerialName("post_price") val postPrice: Double? = null,
    val images: List<String>? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    val location: String? = null,
    val status: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("sold_at") val soldAt: String? = null,
    @SerialName("sale_date") val saleDate: String? = null,
    @SerialName("category_name") val categoryName: String? = null,
    val category: String? = null,
    @SerialName("sellerName") val sellerName: String? = null,
    @SerialName("userName") val userName: String? = null,
    @SerialName("avg_rating") val avgRating: Double = 0.0,
    @SerialName("review_count") val reviewCount: Int = 0,
    @SerialName("views_count") val viewsCount: Int = 0,
    val likes: Int = 0,
    val shares: Int = 0,
    // Buyer rating & review left by the buyer on the completed sale (the trust signal)
    @SerialName("buyer_rating") val buyerRating: Double? = null,
    @SerialName("buyer_comment") val buyerComment: String? = null,
    @SerialName("buyer_name") val buyerName: String? = null,
    @SerialName("rated_at") val ratedAt: String? = null,
    @SerialName("rating_stars") val ratingStars: String? = null,
) {
    val displayTitle: String get() = postTitle ?: title ?: "Sold item"
    val displayPrice: Double get() = postPrice ?: price ?: 0.0
}
