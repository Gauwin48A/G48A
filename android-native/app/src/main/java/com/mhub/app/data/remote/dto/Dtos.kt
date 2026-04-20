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
