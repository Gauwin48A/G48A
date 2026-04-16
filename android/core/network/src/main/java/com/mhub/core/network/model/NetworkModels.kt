package com.mhub.core.network.model

import com.mhub.core.common.model.Category
import com.mhub.core.common.model.Notification
import com.mhub.core.common.model.Post
import com.mhub.core.common.model.User
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ─── Auth Request/Response ───────────────────────────────────────────────

@Serializable
data class LoginRequest(
    val identifier: String,
    val password: String,
)

@Serializable
data class SignupRequest(
    val name: String,
    val email: String,
    val phone: String,
    val password: String,
)

@Serializable
data class SendOtpRequest(
    val phone: String,
    val purpose: String = "signup",
)

@Serializable
data class VerifyOtpRequest(
    val phone: String,
    val otp: String,
)

@Serializable
data class ForgotPasswordRequest(
    val identifier: String,
)

@Serializable
data class ResetPasswordRequest(
    val token: String,
    val password: String,
)

@Serializable
data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String,
)

@Serializable
data class GoogleLoginRequest(
    val idToken: String,
)

@Serializable
data class CsrfTokenResponse(
    val token: String? = null,
)

@Serializable
data class AuthResponse(
    val success: Boolean = false,
    val message: String? = null,
    val user: User? = null,
    val token: String? = null,
)

@Serializable
data class SessionResponse(
    val authenticated: Boolean = false,
    val user: User? = null,
)

@Serializable
data class UserResponse(
    val user: User? = null,
)

@Serializable
data class OtpResponse(
    val success: Boolean = false,
    val message: String? = null,
)

@Serializable
data class MessageResponse(
    val success: Boolean = false,
    val message: String? = null,
)

@Serializable
data class SessionInfo(
    val id: String = "",
    val deviceName: String? = null,
    val deviceType: String? = null,
    val ipAddress: String? = null,
    val lastActive: String? = null,
    val isCurrent: Boolean = false,
)

@Serializable
data class SessionsListResponse(
    val sessions: List<SessionInfo> = emptyList(),
)

// ─── Posts ────────────────────────────────────────────────────────────────

@Serializable
data class PostsListResponse(
    val posts: List<Post> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
    val totalPages: Int = 1,
)

@Serializable
data class PostDetailResponse(
    val post: Post? = null,
)

@Serializable
data class CreatePostRequest(
    val title: String,
    val description: String? = null,
    val price: Double? = null,
    val currency: String = "INR",
    val categoryId: Int? = null,
    val subcategoryId: Int? = null,
    val condition: String? = null,
    val location: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val images: List<String> = emptyList(),
)

// ─── Categories ──────────────────────────────────────────────────────────

@Serializable
data class CategoriesResponse(
    val categories: List<Category> = emptyList(),
)

@Serializable
data class SubcategoriesResponse(
    val subcategories: List<Category> = emptyList(),
)

// ─── Notifications ───────────────────────────────────────────────────────

@Serializable
data class NotificationsResponse(
    val notifications: List<Notification> = emptyList(),
    val total: Int = 0,
    val page: Int = 1,
)

@Serializable
data class UnreadCountResponse(
    val count: Int = 0,
)

// ─── Profile ─────────────────────────────────────────────────────────────

@Serializable
data class ProfileResponse(
    val user: User? = null,
)

@Serializable
data class UpdateProfileRequest(
    val name: String? = null,
    val bio: String? = null,
    val avatar: String? = null,
)

// ─── Push ─────────────────────────────────────────────────────────────────

@Serializable
data class PushTokenRequest(
    val token: String,
    @SerialName("device_type") val deviceType: String = "android",
    @SerialName("device_name") val deviceName: String? = null,
)

// ─── Search ──────────────────────────────────────────────────────────────

@Serializable
data class SavedSearchesResponse(
    val searches: List<SavedSearch> = emptyList(),
)

@Serializable
data class SavedSearch(
    val id: Int = 0,
    val query: String = "",
    val filters: Map<String, String>? = null,
    val createdAt: String? = null,
)

@Serializable
data class SaveSearchRequest(
    val query: String,
    val filters: Map<String, String>? = null,
)

// ─── API Error ───────────────────────────────────────────────────────────

@Serializable
data class ApiError(
    val message: String? = null,
    val error: String? = null,
    val statusCode: Int? = null,
)
