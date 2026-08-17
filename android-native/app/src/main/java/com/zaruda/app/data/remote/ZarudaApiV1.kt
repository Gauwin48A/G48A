package com.zaruda.app.data.remote

import com.zaruda.app.data.remote.dto.*
import retrofit2.http.*

/**
 * Retrofit API interface for Zaruda v1 endpoints.
 * Separated from ZarudaApi.kt to keep the v1 schema focused and manageable.
 * All paths use /api/v1/ prefix.
 */
interface ZarudaApiV1 {

    // ──────────────────────────────────────────────────────
    // SUBSCRIPTIONS
    // ──────────────────────────────────────────────────────

    @GET("api/v1/subscriptions/plans")
    suspend fun getSubscriptionPlans(): SubscriptionPlansResponseV1

    @GET("api/v1/subscriptions/my")
    suspend fun mySubscription(): MySubscriptionResponseV1

    @POST("api/v1/subscriptions/create-order")
    suspend fun createSubscriptionOrder(@Body body: CreateSubscriptionOrderRequest): CreateSubscriptionOrderResponse

    @POST("api/v1/subscriptions/verify-payment")
    suspend fun verifySubscriptionPayment(@Body body: VerifySubscriptionPaymentRequest): VerifySubscriptionPaymentResponse

    @GET("api/v1/subscriptions/history")
    suspend fun subscriptionHistory(): SubscriptionHistoryResponseV1

    @POST("api/v1/subscriptions/cancel")
    suspend fun cancelSubscription(): MessageResponse

    @GET("api/v1/subscriptions/features")
    suspend fun mySubscriptionFeatures(): SubscriptionFeaturesResponse

    @GET("api/v1/subscriptions/check-feature/{featureCode}")
    suspend fun checkFeature(@Path("featureCode") featureCode: String): CheckFeatureResponse

    // ──────────────────────────────────────────────────────
    // ORDERS
    // ──────────────────────────────────────────────────────

    @GET("api/v1/orders")
    suspend fun orders(@Query("role") role: String = "buyer"): OrdersListResponse

    @POST("api/v1/orders")
    suspend fun createOrder(@Body body: CreateOrderRequestV1): CreateOrderResponseV1

    @GET("api/v1/orders/{id}")
    suspend fun orderDetail(@Path("id") id: String): OrderDetailResponse

    @PATCH("api/v1/orders/{id}/status")
    suspend fun updateOrderStatus(@Path("id") id: String, @Body body: UpdateOrderStatusRequest): MessageResponse

    @POST("api/v1/orders/{id}/cancel")
    suspend fun cancelOrder(@Path("id") id: String): MessageResponse

    // ──────────────────────────────────────────────────────
    // DISPUTES
    // ──────────────────────────────────────────────────────

    @GET("api/v1/disputes")
    suspend fun disputes(): DisputesListResponse

    @POST("api/v1/disputes")
    suspend fun createDispute(@Body body: CreateDisputeRequest): CreateDisputeResponse

    @GET("api/v1/disputes/{id}")
    suspend fun disputeDetail(@Path("id") id: String): DisputeDetailResponse

    @POST("api/v1/disputes/{id}/messages")
    suspend fun addDisputeMessage(@Path("id") id: String, @Body body: AddDisputeMessageRequest): MessageResponse

    @POST("api/v1/disputes/{id}/evidence")
    suspend fun addDisputeEvidence(@Path("id") id: String, @Body body: AddDisputeEvidenceRequest): MessageResponse

    // ──────────────────────────────────────────────────────
    // SHIPMENTS
    // ──────────────────────────────────────────────────────

    @GET("api/v1/shipments")
    suspend fun shipments(): ShipmentsListResponse

    @POST("api/v1/shipments")
    suspend fun createShipment(@Body body: CreateShipmentRequest): CreateShipmentResponse

    @GET("api/v1/shipments/{id}")
    suspend fun shipmentDetail(@Path("id") id: String): ShipmentDetailResponse

    @PATCH("api/v1/shipments/{id}/status")
    suspend fun updateShipmentStatus(@Path("id") id: String, @Body body: UpdateShipmentStatusRequest): MessageResponse

    @POST("api/v1/shipments/{id}/confirm-delivery")
    suspend fun confirmDelivery(@Path("id") id: String, @Body body: ConfirmDeliveryRequest): MessageResponse

    // ──────────────────────────────────────────────────────
    // PAGES
    // ──────────────────────────────────────────────────────

    @GET("api/v1/pages")
    suspend fun myPages(): PagesListResponse

    @POST("api/v1/pages")
    suspend fun createPage(@Body body: CreatePageRequest): CreatePageResponse

    @GET("api/v1/pages/{id}")
    suspend fun pageDetail(@Path("id") id: String): PageDetailResponse

    @PATCH("api/v1/pages/{id}")
    suspend fun updatePage(@Path("id") id: String, @Body body: UpdatePageRequest): MessageResponse

    @POST("api/v1/pages/{id}/follow")
    suspend fun followPage(@Path("id") id: String): MessageResponse

    @POST("api/v1/pages/{id}/unfollow")
    suspend fun unfollowPage(@Path("id") id: String): MessageResponse

    @GET("api/v1/pages/{id}/posts")
    suspend fun pagePosts(@Path("id") id: String): PagePostsListResponse

    @POST("api/v1/pages/{id}/posts")
    suspend fun createPagePost(@Path("id") id: String, @Body body: CreatePagePostRequest): CreatePagePostResponse

    // ──────────────────────────────────────────────────────
    // MEDIA
    // ──────────────────────────────────────────────────────

    @POST("api/v1/media/upload")
    suspend fun recordMediaUpload(@Body body: RecordMediaUploadRequest): RecordMediaUploadResponse

    @GET("api/v1/media/{id}")
    suspend fun mediaDetail(@Path("id") id: String): MediaDetailResponse

    @DELETE("api/v1/media/{id}")
    suspend fun deleteMedia(@Path("id") id: String): MessageResponse

    // ──────────────────────────────────────────────────────
    // SEARCH
    // ──────────────────────────────────────────────────────

    @GET("api/v1/search/products")
    suspend fun searchProducts(
        @Query("q") query: String,
        @Query("category") category: String? = null,
        @Query("min_price") minPrice: Double? = null,
        @Query("max_price") maxPrice: Double? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): SearchProductsResponse

    @GET("api/v1/search/posts")
    suspend fun searchPosts(
        @Query("q") query: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): SearchPostsResponse

    @GET("api/v1/search/pages")
    suspend fun searchPages(
        @Query("q") query: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): SearchPagesResponse

    @GET("api/v1/search/users")
    suspend fun searchUsers(
        @Query("q") query: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): SearchUsersResponse

    // ──────────────────────────────────────────────────────
    // REFUNDS
    // ──────────────────────────────────────────────────────

    @GET("api/v1/refunds")
    suspend fun refunds(): RefundsListResponse

    @POST("api/v1/refunds")
    suspend fun requestRefund(@Body body: RequestRefundRequest): RequestRefundResponse

    @GET("api/v1/refunds/{id}")
    suspend fun refundDetail(@Path("id") id: String): RefundDetailResponse

    // ──────────────────────────────────────────────────────
    // SETTLEMENTS
    // ──────────────────────────────────────────────────────

    @GET("api/v1/settlements")
    suspend fun settlements(): SettlementsListResponse

    @GET("api/v1/settlements/current")
    suspend fun currentSettlement(): CurrentSettlementResponse

    @GET("api/v1/settlements/{id}")
    suspend fun settlementDetail(@Path("id") id: String): SettlementDetailResponse

    // ---- Reviews / Purchase Rating ----

    @POST("api/v1/reviews/purchase")
    suspend fun purchaseReview(@Body body: PurchaseReviewRequestV1): MessageResponse

    // ---- User Sold Posts (with ratings) ----

    @GET("api/v1/posts/user/{userId}/sold")
    suspend fun getUserSoldPosts(
        @Path("userId") userId: String,
        @Query("category") category: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): UserSoldPostsResponseV1

    // ---- User Bought Posts (public trust signal) ----

    @GET("api/v1/posts/user/{userId}/bought")
    suspend fun getUserBoughtPosts(
        @Path("userId") userId: String,
        @Query("category") category: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): UserBoughtPostsResponseV1
}
