package com.mhub.app.data.remote

import com.mhub.app.data.remote.dto.*
import com.mhub.app.domain.model.Post
import com.mhub.app.domain.model.User
import okhttp3.RequestBody
import retrofit2.http.*

interface MhubApi {

    // ---- Auth ----
    @POST("api/auth/google")
    suspend fun googleSignIn(@Body body: GoogleAuthRequest): AuthResponse

    @POST("api/auth/logout")
    suspend fun logout(): MessageResponse

    @GET("api/auth/me")
    suspend fun me(): User

    // ---- Posts ----
    @GET("api/posts")
    suspend fun posts(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("category") categoryId: String? = null,
        @Query("q") query: String? = null,
    ): PostsResponse

    @GET("api/posts/{id}")
    suspend fun post(@Path("id") id: String): Post

    @POST("api/posts")
    suspend fun createPost(@Body body: CreatePostRequest): IdResponse

    @GET("api/posts/mine/list")
    suspend fun myPosts(): PostsResponse

    @DELETE("api/posts/{id}")
    suspend fun deletePost(@Path("id") id: String): MessageResponse

    // ---- Categories ----
    @GET("api/categories")
    suspend fun categories(): CategoriesResponse

    // ---- Uploads (raw image body, Content-Type: image/*) ----
    @POST("api/uploads/post-image")
    suspend fun uploadPostImage(@Body body: RequestBody): UploadResponse

    // ---- KYC ----
    @POST("api/kyc/upload")
    suspend fun uploadKycDoc(
        @Query("slot") slot: String,
        @Body body: RequestBody,
    ): KycUploadResponse

    @POST("api/kyc/submit")
    suspend fun submitKyc(@Body body: KycSubmitRequest): KycSubmitResponse

    @GET("api/kyc/status")
    suspend fun kycStatus(): KycStatusResponse

    // ---- Wishlist ----
    @GET("api/wishlist")
    suspend fun wishlist(): WishlistResponse

    @POST("api/wishlist/{id}")
    suspend fun addWishlist(@Path("id") id: String): MessageResponse

    @DELETE("api/wishlist/{id}")
    suspend fun removeWishlist(@Path("id") id: String): MessageResponse
}
