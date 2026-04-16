package com.mhub.core.network.api

import com.mhub.core.network.model.*
import retrofit2.Response
import retrofit2.http.*

interface CategoriesApi {

    @GET("api/categories")
    suspend fun getCategories(): Response<CategoriesResponse>

    @GET("api/subcategories")
    suspend fun getSubcategories(
        @Query("categoryId") categoryId: Int? = null,
    ): Response<SubcategoriesResponse>
}

interface NotificationsApi {

    @GET("api/notifications")
    suspend fun getNotifications(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): Response<NotificationsResponse>

    @PUT("api/notifications/{id}/read")
    suspend fun markAsRead(@Path("id") id: Int): Response<MessageResponse>

    @PUT("api/notifications/read-all")
    suspend fun markAllAsRead(): Response<MessageResponse>

    @GET("api/notifications/unread-count")
    suspend fun getUnreadCount(): Response<UnreadCountResponse>
}

interface ProfileApi {

    @GET("api/profile")
    suspend fun getProfile(): Response<ProfileResponse>

    @PUT("api/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<ProfileResponse>
}

interface PushApi {

    @POST("api/push/register")
    suspend fun registerToken(@Body request: PushTokenRequest): Response<MessageResponse>

    @POST("api/push/unregister")
    suspend fun unregisterToken(@Body request: PushTokenRequest): Response<MessageResponse>
}

interface WishlistApi {

    @GET("api/wishlist")
    suspend fun getWishlist(): Response<PostsListResponse>

    @POST("api/wishlist/{postId}")
    suspend fun addToWishlist(@Path("postId") postId: Int): Response<MessageResponse>

    @DELETE("api/wishlist/{postId}")
    suspend fun removeFromWishlist(@Path("postId") postId: Int): Response<MessageResponse>
}

interface SearchApi {

    @GET("api/posts")
    suspend fun search(
        @Query("search") query: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("sort") sort: String? = null,
    ): Response<PostsListResponse>

    @GET("api/saved-searches")
    suspend fun getSavedSearches(): Response<SavedSearchesResponse>

    @POST("api/saved-searches")
    suspend fun saveSearch(@Body request: SaveSearchRequest): Response<MessageResponse>

    @DELETE("api/saved-searches/{id}")
    suspend fun deleteSavedSearch(@Path("id") id: Int): Response<MessageResponse>
}
