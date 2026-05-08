package com.mhub.app.data.remote

import com.mhub.app.data.remote.dto.*
import com.mhub.app.domain.model.Post
import com.mhub.app.domain.model.User
import okhttp3.RequestBody
import retrofit2.http.*

interface MhubApi {

    // ---- Health ----
    @GET("api/health")
    suspend fun health(): HealthResponse

    // ---- Push Notifications ----
    @POST("api/push/register")
    suspend fun registerPushToken(@Body body: PushTokenRequest): MessageResponse

    @DELETE("api/push/unregister")
    suspend fun unregisterPushToken(@Body body: PushTokenRequest): MessageResponse

    // ---- Auth ----
    @POST("api/auth/google")
    suspend fun googleSignIn(@Body body: GoogleAuthRequest): AuthResponse

    @POST("api/auth/login")
    suspend fun emailLogin(@Body body: EmailLoginRequest): AuthResponse

    @POST("api/auth/signup")
    suspend fun emailSignup(@Body body: EmailSignupRequest): AuthResponse

    @POST("api/auth/forgot-password")
    suspend fun forgotPassword(@Body body: ForgotPasswordRequest): MessageResponse

    @POST("api/auth/reset-password")
    suspend fun resetPassword(@Body body: ResetPasswordRequest): MessageResponse

    @GET("api/auth/csrf-token")
    suspend fun csrfToken(): CsrfTokenResponse

    @POST("api/auth/logout")
    suspend fun logout(): MessageResponse

    @GET("api/auth/me")
    suspend fun me(): User

    // ---- Auth extended (OTP/2FA/Aadhaar) ----
    @POST("api/auth/send-otp")
    suspend fun sendOtp(@Body body: SendOtpRequest): MessageResponse

    @POST("api/auth/aadhaar/send-otp")
    suspend fun aadhaarSendOtp(@Body body: AadhaarSendOtpRequest): AadhaarOtpResponse

    @POST("api/auth/aadhaar/verify-otp")
    suspend fun aadhaarVerifyOtp(@Body body: AadhaarVerifyOtpRequest): AadhaarVerifyResponse

    @POST("api/auth/pan/verify")
    suspend fun panVerify(@Body body: PanVerifyRequest): MessageResponse

    @POST("api/auth/aadhaar/complete-signup")
    suspend fun completeAadhaarSignup(@Body body: CompleteAadhaarSignupRequest): AuthResponse

    @POST("api/auth/change-password")
    suspend fun changePassword(@Body body: ChangePasswordRequest): MessageResponse

    @POST("api/auth/2fa/setup")
    suspend fun twoFaSetup(): TwoFaSetupResponse

    @POST("api/auth/2fa/verify")
    suspend fun twoFaVerify(@Body body: TwoFaVerifyRequest): TwoFaVerifyResponse

    @POST("api/auth/2fa/disable")
    suspend fun twoFaDisable(@Body body: TwoFaVerifyRequest): MessageResponse

    // ---- Posts ----
    @GET("api/posts")
    suspend fun posts(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("category") categoryId: String? = null,
        @Query("q") query: String? = null,
        @Query("sort") sort: String? = null,
    ): PostsResponse

    @GET("api/posts/{id}")
    suspend fun post(@Path("id") id: String): PostDetailResponse

    @POST("api/posts")
    suspend fun createPost(@Body body: CreatePostRequest): IdResponse

    @GET("api/posts/mine")
    suspend fun myPosts(): PostsResponse

    @DELETE("api/posts/{id}")
    suspend fun deletePost(@Path("id") id: String): MessageResponse

    @PUT("api/posts/{id}")
    suspend fun updatePostMultipart(
        @Path("id") id: String,
        @Body body: RequestBody,
    ): MessageResponse

    @GET("api/posts/{id}/report")
    suspend fun reportPost(@Path("id") id: String): MessageResponse

    @POST("api/posts/{id}/like")
    suspend fun likePost(@Path("id") id: String): MessageResponse

    @POST("api/posts/{id}/view")
    suspend fun viewPost(@Path("id") id: String): MessageResponse

    @POST("api/recently-viewed/track")
    suspend fun trackRecentlyViewed(@Body body: TrackViewRequest): MessageResponse

    // ---- Recommendations ----
    @GET("api/recommendations")
    suspend fun recommendations(
        @Query("search") search: String? = null,
        @Query("category_id") categoryId: String? = null,
        @Query("minPrice") minPrice: Double? = null,
        @Query("maxPrice") maxPrice: Double? = null,
        @Query("location") location: String? = null,
    ): PostsResponse

    // ---- Brands ----
    @GET("api/brands")
    suspend fun brands(): BrandsResponse

    // ---- Trust ----
    @GET("api/trust/score/{userId}")
    suspend fun trustScore(@Path("userId") userId: String): TrustScoreResponse

    // ---- Category Stats ----
    @GET("api/categories/stats")
    suspend fun categoryStats(): CategoryStatsResponse

    @GET("api/categories/{id}/subcategories")
    suspend fun subcategories(@Path("id") id: String): CategoriesResponse

    // ---- Categories ----
    @GET("api/categories")
    suspend fun categories(): CategoriesResponse

    // ---- Uploads (raw image body, Content-Type: image/*) ----
    @POST("api/uploads/post-image")
    suspend fun uploadPostImage(@Body body: RequestBody): UploadResponse

    // ---- KYC ----
    @POST("api/users/kyc/upload")
    suspend fun uploadKycDoc(
        @Query("slot") slot: String,
        @Body body: RequestBody,
    ): KycUploadResponse

    @POST("api/users/kyc/submit")
    suspend fun submitKyc(@Body body: KycSubmitRequest): KycSubmitResponse

    @GET("api/users/kyc/status")
    suspend fun kycStatus(): KycStatusResponse

    // ---- Wishlist ----
    @GET("api/wishlist")
    suspend fun wishlist(): WishlistResponse

    @POST("api/wishlist/{id}")
    suspend fun addWishlist(@Path("id") id: String): MessageResponse

    @DELETE("api/wishlist/{id}")
    suspend fun removeWishlist(@Path("id") id: String): MessageResponse

    // ---- Notifications ----
    @GET("api/notifications")
    suspend fun notifications(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 30,
    ): NotificationsResponse

    @POST("api/notifications/{id}/read")
    suspend fun markRead(@Path("id") id: String): MessageResponse

    @DELETE("api/notifications/{id}")
    suspend fun deleteNotification(@Path("id") id: String): MessageResponse

    @POST("api/notifications/mark-all-read")
    suspend fun markAllRead(): MessageResponse

    // ---- Chat ----
    @GET("api/chat/conversations")
    suspend fun conversations(): ConversationsResponse

    @GET("api/chat/conversations/{id}")
    suspend fun messages(@Path("id") conversationId: String): MessagesResponse

    @POST("api/chat/conversations/{id}/messages")
    suspend fun sendMessage(
        @Path("id") conversationId: String,
        @Body body: SendMessageRequest,
    ): MessageResponse

    @POST("api/chat/conversations/{recipientId}/start")
    suspend fun startConversation(
        @Path("recipientId") recipientId: String,
        @Body body: SendMessageRequest,
    ): MessageResponse

    // ---- Rewards ----
    @GET("api/rewards")
    suspend fun rewards(): RewardsOverviewResponse

    // ---- Coins / Engagement ----
    @GET("api/coins/balance")
    suspend fun coinBalance(): CoinBalanceResponse

    @GET("api/coins/history")
    suspend fun coinHistory(@Query("limit") limit: Int = 50): CoinHistoryResponse

    @GET("api/coins/engagement")
    suspend fun engagementStatus(): EngagementStatusResponse

    @GET("api/coins/rewards-config")
    suspend fun rewardsConfig(): RewardsConfigResponse

    @POST("api/coins/daily-checkin")
    suspend fun dailyCheckIn(): DailyCheckInResponse

    @POST("api/coins/spin")
    suspend fun spinWheel(): SpinResultResponse

    @POST("api/coins/scratch")
    suspend fun scratchCard(): ScratchResultResponse

    @POST("api/coins/store-redeem")
    suspend fun storeRedeem(@Body body: StoreRedeemRequest): StoreRedeemResponse

    @POST("api/coins/referral-milestones")
    suspend fun claimReferralMilestone(): MessageResponse

    @GET("api/referral/leaderboard")
    suspend fun referralLeaderboard(
        @Query("period") period: String = "weekly",
        @Query("limit") limit: Int = 5,
    ): ReferralLeaderboardResponse

    // ---- Profile Update ----
    @POST("api/profile/update")
    suspend fun updateProfile(@Body body: ProfileUpdateRequest): MessageResponse

    // ---- Dashboard ----
    @GET("api/dashboard")
    suspend fun dashboard(): DashboardResponse

    // ---- Posts extended ----
    @GET("api/posts/sold")
    suspend fun soldPosts(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): PostsResponse

    @GET("api/posts/bought")
    suspend fun boughtPosts(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): PostsResponse

    @GET("api/posts/nearby")
    suspend fun nearbyPosts(
        @Query("lat") lat: Double,
        @Query("lng") lng: Double,
        @Query("radius") radius: Int = 10,
    ): PostsResponse

    @PATCH("api/posts/{id}")
    suspend fun updatePost(
        @Path("id") id: String,
        @Body body: CreatePostRequest,
    ): MessageResponse

    // ---- Feed / Social ----
    @GET("api/feed")
    suspend fun feed(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
    ): FeedResponse

    @GET("api/feed/{id}")
    suspend fun feedDetail(@Path("id") id: String): FeedItem

    @GET("api/feed/my")
    suspend fun myFeed(
        @Query("page") page: Int = 1,
    ): FeedResponse

    @POST("api/feed")
    suspend fun createFeedPost(@Body body: CreateFeedRequest): IdResponse

    @GET("api/wall")
    suspend fun publicWall(@Query("userId") userId: String): FeedResponse

    // ---- Reviews ----
    @GET("api/reviews")
    suspend fun reviews(@Query("userId") userId: String): ReviewsResponse

    @POST("api/reviews")
    suspend fun submitReview(@Body body: ReviewRequest): MessageResponse

    // ---- Offers ----
    @GET("api/offers")
    suspend fun offers(
        @Query("type") type: String = "received",
    ): OffersResponse

    @POST("api/offers/{id}/accept")
    suspend fun acceptOffer(@Path("id") id: String): MessageResponse

    @POST("api/offers/{id}/decline")
    suspend fun declineOffer(@Path("id") id: String): MessageResponse

    @PATCH("api/offers/{id}")
    suspend fun patchOffer(
        @Path("id") id: String,
        @Body body: OfferActionRequest,
    ): MessageResponse

    @POST("api/offers")
    suspend fun makeOffer(@Body body: MakeOfferRequest): MessageResponse

    // ---- Cart ----
    @GET("api/cart")
    suspend fun cart(): CartResponse

    @POST("api/cart/{postId}")
    suspend fun addToCart(@Path("postId") postId: String): MessageResponse

    @DELETE("api/cart/{postId}")
    suspend fun removeFromCart(@Path("postId") postId: String): MessageResponse

    @PATCH("api/cart/{postId}")
    suspend fun updateCartQty(
        @Path("postId") postId: String,
        @Body body: CartQtyRequest,
    ): MessageResponse

    @POST("api/cart/coupon")
    suspend fun applyCoupon(@Body body: CouponRequest): CouponResponse

    // ---- Recently Viewed ----
    @GET("api/recently-viewed")
    suspend fun recentlyViewed(): PostsResponse

    // ---- Saved Searches ----
    @GET("api/saved-searches")
    suspend fun savedSearches(): SavedSearchesResponse

    @DELETE("api/saved-searches/{id}")
    suspend fun deleteSavedSearch(@Path("id") id: String): MessageResponse

    // ---- Compare ----
    @GET("api/compare")
    suspend fun compareList(): PostsResponse

    // ---- Channels ----
    @GET("api/channels")
    suspend fun channels(): ChannelsResponse

    @POST("api/channels")
    suspend fun createChannel(@Body body: CreateChannelRequest): IdResponse

    @GET("api/channels/{id}")
    suspend fun channelDetail(@Path("id") id: String): Channel

    @POST("api/channels/{id}/follow")
    suspend fun followChannel(@Path("id") id: String): MessageResponse

    @DELETE("api/channels/{id}/follow")
    suspend fun unfollowChannel(@Path("id") id: String): MessageResponse

    // ---- Centres ----
    @GET("api/centres")
    suspend fun centres(): CentresResponse

    @POST("api/centres")
    suspend fun createCentre(@Body body: CreateCentreRequest): IdResponse

    @GET("api/centres/{id}")
    suspend fun centreDetail(@Path("id") id: String): Centre

    @GET("api/centres/{id}/listings")
    suspend fun centreListings(@Path("id") id: String): PostsResponse

    // ---- Complaints / Feedback ----
    @POST("api/complaints")
    suspend fun submitComplaint(@Body body: ComplaintRequest): MessageResponse

    @POST("api/feedback")
    suspend fun submitFeedback(@Body body: FeedbackRequest): MessageResponse

    // ---- Analytics ----
    @GET("api/analytics")
    suspend fun analytics(): AnalyticsResponse

    @GET("api/seller-analytics/stats")
    suspend fun sellerAnalyticsStats(
        @Query("range") range: String? = null,
    ): SellerAnalyticsResponse

    @GET("api/analytics/posts")
    suspend fun analyticsPerPost(
        @Query("range") range: String? = null,
    ): PostAnalyticsResponse

    @GET("api/analytics/categories")
    suspend fun analyticsCategories(
        @Query("range") range: String? = null,
    ): CategoryAnalyticsResponse

    // ---- Security ----
    @GET("api/auth/sessions")
    suspend fun sessions(@Query("limit") limit: Int = 25): SessionsResponse

    @DELETE("api/auth/sessions/{id}")
    suspend fun revokeSession(@Path("id") id: String): MessageResponse

    @DELETE("api/auth/sessions")
    suspend fun revokeAllSessions(): MessageResponse

    @GET("api/auth/2fa/status")
    suspend fun twoFaStatus(): TwoFaStatusResponse

    // ---- Account ----
    @DELETE("api/users/me")
    suspend fun deleteAccount(@Body body: DeleteAccountRequest): MessageResponse

    @GET("api/verification/status")
    suspend fun verificationStatus(): VerificationStatusResponse

    @POST("api/verification/request")
    suspend fun requestVerification(@Body body: VerificationRequest): MessageResponse

    // ---- Admin ----
    @GET("api/admin/dashboard")
    suspend fun adminDashboard(): AdminDashboardResponse

    // ---- Sale Transactions ----
    @POST("api/transactions/initiate")
    suspend fun initiateSale(@Body body: InitiateSaleRequest): SaleResponse

    @POST("api/transactions/confirm")
    suspend fun confirmSale(@Body body: ConfirmSaleRequest): SaleResponse

    @GET("api/transactions/pending")
    suspend fun pendingSales(): PendingSalesResponse

    @POST("api/transactions/undone")
    suspend fun undoSale(@Body body: UndoSaleRequest): MessageResponse

    @GET("api/transactions/undone")
    suspend fun undoneHistory(): UndoneHistoryResponse

    // ---- Payments ----
    @GET("api/payments/upi-details")
    suspend fun paymentUpiDetails(): PaymentUpiDetailsResponse

    @GET("api/payments/status")
    suspend fun paymentHistory(): PaymentHistoryResponse

    @POST("api/payments/submit")
    suspend fun submitPayment(@Body body: SubmitPaymentRequest): MessageResponse

    // ---- Reviews extended ----
    @GET("api/reviews/user/{userId}")
    suspend fun userReviews(@Path("userId") userId: String): ReviewsResponse

    @PATCH("api/reviews/{id}/helpful")
    suspend fun markReviewHelpful(@Path("id") id: String): MessageResponse

    @POST("api/reviews/{id}/respond")
    suspend fun respondToReview(
        @Path("id") id: String,
        @Body body: ReviewRespondRequest,
    ): MessageResponse

    // ---- Tier / Payment ----
    @GET("api/tiers")
    suspend fun tiers(): TiersResponse

    @POST("api/subscriptions")
    suspend fun subscribe(@Body body: SubscribeRequest): MessageResponse

    // ---- Legal / CMS ----
    @GET("api/cms/terms")
    suspend fun termsContent(): CmsContentResponse

    @GET("api/cms/privacy")
    suspend fun privacyContent(): CmsContentResponse

    @GET("api/cms/refund")
    suspend fun refundContent(): CmsContentResponse

    @GET("api/cms/support-policy")
    suspend fun supportPolicyContent(): CmsContentResponse

    // ---- Invite ----
    @GET("api/invite/{code}")
    suspend fun inviteInfo(@Path("code") code: String): InviteResponse
}
