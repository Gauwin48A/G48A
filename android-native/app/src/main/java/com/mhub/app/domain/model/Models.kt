package com.mhub.app.domain.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class User(
    @SerialName("user_id") val userId: String? = null,
    val id: String? = null,
    val email: String? = null,
    @SerialName("phone_number") val phone: String? = null,
    @SerialName("full_name") val fullName: String? = null,
    val username: String? = null,
    val role: String? = null,
    @SerialName("kyc_status") val kycStatus: String? = null,
    @SerialName("picture_url") val pictureUrl: String? = null,
    @SerialName("profile_image_url") val profileImageUrl: String? = null,
) {
    val stableId: String get() = userId ?: id ?: email ?: phone ?: "unknown"
    val displayName: String get() = fullName ?: username ?: email ?: phone ?: "User"
    val avatar: String? get() = pictureUrl ?: profileImageUrl
    val isSeller: Boolean get() = role == "seller" || role == "admin"
    val isKycVerified: Boolean get() = kycStatus == "verified"
    val canCreatePosts: Boolean get() = isSeller && isKycVerified
}

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
) {
    val stableId: String get() = id ?: postId ?: "${title}-${createdAt}"
    val primaryImage: String? get() = imageUrl ?: images.firstOrNull()
    val displayTitle: String get() = title ?: "Untitled"
}

@Serializable
data class Category(
    val id: String? = null,
    @SerialName("category_id") val categoryId: String? = null,
    val name: String? = null,
    @SerialName("icon_url") val iconUrl: String? = null,
    val slug: String? = null,
) {
    val stableId: String get() = id ?: categoryId ?: slug ?: name.orEmpty()
    val displayName: String get() = name ?: slug ?: "Unnamed"
}

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
