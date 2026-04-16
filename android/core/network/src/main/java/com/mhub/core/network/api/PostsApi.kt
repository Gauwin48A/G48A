package com.mhub.core.network.api

import com.mhub.core.network.model.*
import retrofit2.Response
import retrofit2.http.*

interface PostsApi {

    @GET("api/posts")
    suspend fun getPosts(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("category") category: String? = null,
        @Query("subcategory") subcategory: String? = null,
        @Query("search") search: String? = null,
        @Query("sort") sort: String? = null,
        @Query("minPrice") minPrice: Double? = null,
        @Query("maxPrice") maxPrice: Double? = null,
        @Query("condition") condition: String? = null,
        @Query("location") location: String? = null,
        @Query("lat") latitude: Double? = null,
        @Query("lng") longitude: Double? = null,
        @Query("radius") radius: Int? = null,
    ): Response<PostsListResponse>

    @GET("api/posts/{id}")
    suspend fun getPost(@Path("id") id: Int): Response<PostDetailResponse>

    @POST("api/posts")
    suspend fun createPost(@Body request: CreatePostRequest): Response<PostDetailResponse>

    @PUT("api/posts/{id}")
    suspend fun updatePost(
        @Path("id") id: Int,
        @Body request: CreatePostRequest,
    ): Response<PostDetailResponse>

    @DELETE("api/posts/{id}")
    suspend fun deletePost(@Path("id") id: Int): Response<MessageResponse>

    @GET("api/posts/user/{userId}")
    suspend fun getUserPosts(
        @Path("userId") userId: Int,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): Response<PostsListResponse>
}
