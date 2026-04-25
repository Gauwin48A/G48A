package com.mhub.app.data.remote.dto

import com.mhub.app.domain.model.Category
import com.mhub.app.domain.model.KycSubmission
import com.mhub.app.domain.model.Post
import com.mhub.app.domain.model.User
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

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
data class CsrfTokenResponse(val csrfToken: String? = null)

@Serializable
data class AuthResponse(
    val success: Boolean = true,
    val token: String? = null,
    val refreshToken: String? = null,
    val user: User? = null,
)

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
data class CreatePostRequest(
    val title: String,
    val description: String? = null,
    val price: Double? = null,
    val currency: String = "INR",
    val location: String? = null,
    @SerialName("category_id") val categoryId: String? = null,
    val images: List<String> = emptyList(),
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
    val points: Int = 0,
)
