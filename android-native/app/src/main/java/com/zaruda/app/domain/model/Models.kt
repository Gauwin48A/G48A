package com.zaruda.app.domain.model

import androidx.compose.runtime.Immutable
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Immutable
@Serializable
data class User(
    @SerialName("user_id") val userId: String? = null,
    val id: String? = null,
    val email: String? = null,
    @SerialName("phone_number") val phone: String? = null,
    @SerialName("full_name") val fullName: String? = null,
    val name: String? = null,
    val username: String? = null,
    val role: String? = null,
    @SerialName("kyc_status") val kycStatus: String? = null,
    @SerialName("picture_url") val pictureUrl: String? = null,
    @SerialName("profile_image_url") val profileImageUrl: String? = null,
    @SerialName("current_plan") val currentPlan: String? = null,
    @SerialName("reward_badge") val rewardBadge: String? = null,
    @SerialName("rewards_rank") val rewardsRank: String? = null,
    @SerialName("preferred_language") val preferredLanguage: String? = null,
    @SerialName("cover_image") val coverImage: String? = null,
    @SerialName("follower_count") val followerCount: Int? = null,
    @SerialName("following_count") val followingCount: Int? = null,
    @SerialName("is_verified") val isVerified: Boolean? = null,
    @SerialName("shares_count") val sharesCount: Int? = null,
    @SerialName("bio") val bio: String? = null,
    @SerialName("website") val website: String? = null,
    @SerialName("social_links") val socialLinks: Map<String, String>? = null,
    @SerialName("post_credits") val coins: Int? = null,
) {
    val stableId: String get() = userId ?: id ?: email ?: phone ?: "unknown"
    val displayName: String get() = fullName ?: name ?: username ?: email ?: phone ?: "User"
    val avatar: String? get() = pictureUrl ?: profileImageUrl
    val isSeller: Boolean get() = role == "seller" || role == "admin"
    val isKycVerified: Boolean get() = kycStatus == "verified"
    val canCreatePosts: Boolean get() = isSeller && isKycVerified
    val isPremium: Boolean get() = currentPlan?.lowercase() == "premium"
}

@Immutable
@Serializable
data class Post(
    val id: String? = null,
    @SerialName("post_id") val postId: String? = null,
    val title: String? = null,
    val description: String? = null,
    val price: Double? = null,
    val currency: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    val images: List<String> = emptyList(),
    val category: String? = null,
    @SerialName("category_id") val categoryId: String? = null,
    @SerialName("category_name") val categoryName: String? = null,
    val location: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("user_id") val userId: String? = null,
    @SerialName("user_name") val userName: String? = null,
    val status: String? = null,
    @SerialName("view_count") val viewCount: Int? = null,
    @SerialName("views_count") val viewsCount: Int? = null,
    @SerialName("like_count") val likeCount: Int? = null,
    @SerialName("likes") val likesApi: Int? = null,
    val condition: String? = null,
    val brand: String? = null,
    @SerialName("seller_name") val sellerName: String? = null,
    @SerialName("subcategory") val subcategory: String? = null,
    @SerialName("subcategory_name") val subcategoryName: String? = null,
    @SerialName("model") val model: String? = null,
    @SerialName("interested_buyers") val interestedBuyers: Int? = null,
    // Extended fields for 20-field multi-token search (web-parity: SearchPage.jsx)
    val city: String? = null,
    val state: String? = null,
    val color: String? = null,
    val size: String? = null,
    val tags: List<String>? = null,
    @SerialName("user_handle") val userHandle: String? = null,
    val hashtags: List<String>? = null,
    val year: Int? = null,
    val mileage: Int? = null,
    @SerialName("ram_storage") val ramStorage: String? = null,
    @SerialName("is_promoted") val isPromoted: Boolean? = null,
    @SerialName("seller_verified") val sellerVerified: Boolean? = null,
    @SerialName("latitude") val latitude: Double? = null,
    @SerialName("longitude") val longitude: Double? = null,
    @SerialName("distance") val distance: Double? = null,
    // Promo/boost fields
    @SerialName("boost_level") val boostLevel: Int? = null,
    @SerialName("promo_label") val promoLabel: String? = null,
    @SerialName("tier") val tier: String? = null,
    @SerialName("reward_badge") val rewardBadge: String? = null,
    @SerialName("is_flash_sale") val isFlashSale: Boolean? = null,
    @SerialName("is_negotiable") val isNegotiable: Boolean? = null,
    @SerialName("original_price") val originalPrice: Double? = null,
    @SerialName("tier_priority") val tierPriority: Int? = null,
    @SerialName("is_premium") val isPremium: Boolean? = null,
    @SerialName("completed_sales") val completedSales: Int? = null,
    @SerialName("response_rate") val responseRate: Int? = null,
    @SerialName("member_since") val memberSince: String? = null,
    @SerialName("pricing_type") val pricingType: String? = null,
    @SerialName("availability") val availability: String? = null,
    @SerialName("warranty") val warranty: String? = null,
    @SerialName("listing_id") val listingId: String? = null,
    @SerialName("expires_at") val expiresAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null,
    // Contact number shared by the seller (shown when viewer has KYC + active plan)
    @SerialName("contact_number") val contactNumber: String? = null,
    // Electronics escrow protection: true = this listing is escrow-eligible
    // (in-app payment, 2.5% platform fee); false/null = direct/outside payment.
    @SerialName("is_escrow_eligible") val isEscrowEligible: Boolean? = null,
    @SerialName("escrow_fee_pct") val escrowFeePct: Double? = null,
) {
    val stableId: String get() = id ?: postId ?: "${title}-${createdAt}"
    val primaryImage: String? get() = imageUrl ?: images.firstOrNull()
    val displayTitle: String get() = title ?: "Untitled"
    // Resolve both API naming conventions
    val views: Int? get() = viewCount ?: viewsCount
    val likes: Int? get() = likeCount ?: likesApi
}

@Immutable
@Serializable
data class Category(
    val id: String? = null,
    @SerialName("category_id") val categoryId: String? = null,
    @SerialName("subcategory_id") val subcategoryId: String? = null,
    val name: String? = null,
    @SerialName("icon_url") val iconUrl: String? = null,
    val slug: String? = null,
    @SerialName("category_group") val categoryGroup: String? = null,
    @SerialName("product_count") val productCount: Int = 0,
) {
    val stableId: String get() = id ?: subcategoryId ?: categoryId ?: slug ?: name.orEmpty()
    val displayName: String get() = name ?: slug ?: "Unnamed"
}

@Immutable
@Serializable
data class Notification(
    val id: String? = null,
    @SerialName("notification_id") val notificationId: String? = null,
    val type: String? = null,
    val title: String? = null,
    val message: String? = null,
    val body: String? = null,
    @SerialName("is_read") val isRead: Boolean = false,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("post_id") val postId: String? = null,
    @SerialName("actor_name") val actorName: String? = null,
    @SerialName("actor_avatar") val actorAvatar: String? = null,
    @SerialName("expires_at") val expiresAt: String? = null,
) {
    val stableId: String get() = id ?: notificationId ?: "${type}-${createdAt}"
    val displayTitle: String get() = title ?: actorName ?: "Notification"
    val displayMessage: String get() = message ?: body ?: ""
}

@Immutable
@Serializable
data class KycSubmission(
    val id: String? = null,
    val status: String? = null,
    @SerialName("doc_type") val docType: String? = null,
    @SerialName("doc_number_masked") val docNumberMasked: String? = null,
    @SerialName("rejection_reason") val rejectionReason: String? = null,
    @SerialName("submitted_at") val submittedAt: String? = null,
    @SerialName("reviewed_at") val reviewedAt: String? = null,
)
