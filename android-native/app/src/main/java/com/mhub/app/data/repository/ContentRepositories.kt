package com.mhub.app.data.repository

import com.mhub.app.core.ApiResult
import com.mhub.app.core.safeApiCall
import com.mhub.app.data.local.db.CategoryDao
import com.mhub.app.data.local.db.CategoryEntity
import com.mhub.app.data.local.db.PostDao
import com.mhub.app.data.local.db.PostEntity
import com.mhub.app.data.remote.MhubApi
import com.mhub.app.data.remote.dto.*
import com.mhub.app.domain.model.Category
import com.mhub.app.domain.model.Notification
import com.mhub.app.domain.model.Post
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject
import javax.inject.Singleton

// Cache TTL: 10 minutes
private const val CACHE_TTL_MS = 10 * 60 * 1000L

private fun Post.toEntity() = PostEntity(
    id = stableId,
    title = title,
    description = description,
    price = price,
    currency = currency,
    imageUrl = imageUrl,
    imagesJson = Json.encodeToString(images),
    category = category,
    categoryId = categoryId,
    categoryName = categoryName,
    location = location,
    createdAt = createdAt,
    userId = userId,
    userName = userName,
    status = status,
    viewCount = viewCount,
    condition = condition,
    brand = brand,
    sellerName = sellerName,
)

private fun PostEntity.toDomain() = Post(
    id = id,
    title = title,
    description = description,
    price = price,
    currency = currency,
    imageUrl = imageUrl,
    images = runCatching { Json.decodeFromString<List<String>>(imagesJson) }.getOrDefault(emptyList()),
    category = category,
    categoryId = categoryId,
    categoryName = categoryName,
    location = location,
    createdAt = createdAt,
    userId = userId,
    userName = userName,
    status = status,
    viewCount = viewCount,
    condition = condition,
    brand = brand,
    sellerName = sellerName,
)

private fun Category.toEntity() = CategoryEntity(
    id = stableId,
    name = name,
    iconUrl = iconUrl,
    slug = slug,
    categoryGroup = categoryGroup,
    productCount = productCount,
)

private fun CategoryEntity.toDomain() = Category(
    id = id,
    name = name,
    iconUrl = iconUrl,
    slug = slug,
    categoryGroup = categoryGroup,
    productCount = productCount,
)

@Singleton
class PostsRepository @Inject constructor(
    private val api: MhubApi,
    private val postDao: PostDao,
) {
    suspend fun feed(
        page: Int = 1,
        limit: Int = 20,
        categoryId: String? = null,
        query: String? = null,
        sort: String? = null,
        condition: String? = null,
        subcategory: String? = null,
    ): ApiResult<List<Post>> {
        val result = safeApiCall { api.posts(page, limit, categoryId, query, sort, condition, subcategory).items }
        if (result is ApiResult.Success && page == 1) {
            // Cache page 1 results; evict entries older than TTL
            postDao.evictStale(System.currentTimeMillis() - CACHE_TTL_MS)
            postDao.insertAll(result.data.map { it.toEntity() })
        }
        if (result is ApiResult.Failure) {
            // Return cached posts as fallback on network failure
            val cached = if (categoryId != null) postDao.getByCategory(categoryId)
                         else postDao.getAll()
            if (cached.isNotEmpty()) return ApiResult.Success(cached.map { it.toDomain() })
        }
        return result
    }

    suspend fun detail(id: String): ApiResult<Post> = safeApiCall {
        api.post(id).post ?: error("Post not found")
    }

    suspend fun create(req: CreatePostRequest): ApiResult<String> = safeApiCall {
        api.createPost(req).id ?: error("No id returned")
    }

    suspend fun update(id: String, req: CreatePostRequest): ApiResult<Unit> = safeApiCall {
        api.updatePost(id, req); Unit
    }

    suspend fun mine(): ApiResult<List<Post>> = safeApiCall { api.myPosts().items }

    suspend fun sold(page: Int = 1): ApiResult<List<Post>> = safeApiCall { api.soldPosts(page).items }

    suspend fun bought(page: Int = 1): ApiResult<List<Post>> = safeApiCall { api.boughtPosts(page).items }

    suspend fun nearby(lat: Double, lng: Double, radius: Int = 10): ApiResult<List<Post>> = safeApiCall {
        api.nearbyPosts(lat, lng, radius).items
    }

    suspend fun recentlyViewed(): ApiResult<List<Post>> = safeApiCall { api.recentlyViewed().items }
    suspend fun deleteRecentlyViewed(postId: String): ApiResult<Unit> = safeApiCall { api.deleteRecentlyViewed(postId); Unit }
    suspend fun clearRecentlyViewed(): ApiResult<Unit> = safeApiCall { api.clearRecentlyViewed(); Unit }

    suspend fun compareList(): ApiResult<List<Post>> = safeApiCall { api.compareList().items }
    suspend fun addToCompare(postId: String): ApiResult<Unit> = safeApiCall { api.addToCompare(postId); Unit }
    suspend fun removeFromCompare(postId: String): ApiResult<Unit> = safeApiCall { api.removeFromCompare(postId); Unit }
    suspend fun clearCompare(): ApiResult<Unit> = safeApiCall { api.clearCompare(); Unit }

    suspend fun report(id: String): ApiResult<Unit> = safeApiCall { api.reportPost(id); Unit }

    suspend fun delete(id: String): ApiResult<Unit> = safeApiCall { api.deletePost(id); Unit }

    suspend fun markSold(id: String): ApiResult<Unit> = safeApiCall { api.markPostSold(id); Unit }

    suspend fun batchView(postIds: List<String>): ApiResult<Unit> = safeApiCall {
        api.batchViewPosts(mapOf("postIds" to postIds)); Unit
    }

    suspend fun toggleWishlist(postId: String): ApiResult<Unit> = safeApiCall {
        api.toggleWishlist(postId); Unit
    }
}

@Singleton
class CategoriesRepository @Inject constructor(
    private val api: MhubApi,
    private val categoryDao: CategoryDao,
) {
    suspend fun all(): ApiResult<List<Category>> {
        val result = safeApiCall { api.categories().items }
        if (result is ApiResult.Success) {
            categoryDao.insertAll(result.data.map { it.toEntity() })
        }
        if (result is ApiResult.Failure) {
            val cached = categoryDao.getAll()
            if (cached.isNotEmpty()) return ApiResult.Success(cached.map { it.toDomain() })
        }
        return result
    }
    suspend fun stats(): ApiResult<List<CategoryStat>> = safeApiCall { api.categoryStats().stats }
    suspend fun subcategories(categoryId: String): ApiResult<List<Category>> =
        safeApiCall { api.subcategories(categoryId).items }
}

@Singleton
class WishlistRepository @Inject constructor(private val api: MhubApi) {
    suspend fun list(): ApiResult<List<Post>> = safeApiCall { api.wishlist().posts }
    suspend fun add(postId: String): ApiResult<Unit> = safeApiCall { api.addWishlist(postId); Unit }
    suspend fun remove(postId: String): ApiResult<Unit> = safeApiCall { api.removeWishlist(postId); Unit }
}

@Singleton
class UploadRepository @Inject constructor(private val api: MhubApi) {
    suspend fun uploadPostImage(bytes: ByteArray, mime: String): ApiResult<String> = safeApiCall {
        val body: RequestBody = bytes.toRequestBody(mime.toMediaType())
        api.uploadPostImage(body).url ?: error("Upload failed: no URL")
    }

    suspend fun uploadKycDoc(bytes: ByteArray, mime: String, slot: String): ApiResult<String> = safeApiCall {
        val body: RequestBody = bytes.toRequestBody(mime.toMediaType())
        api.uploadKycDoc(slot, body).key
    }
}

@Singleton
class KycRepository @Inject constructor(private val api: MhubApi) {
    suspend fun status(): ApiResult<KycStatusResponse> = safeApiCall { api.kycStatus() }
    suspend fun submit(req: KycSubmitRequest): ApiResult<KycSubmitResponse> =
        safeApiCall { api.submitKyc(req) }
    suspend fun aadhaarSendOtp(req: AadhaarSendOtpRequest): ApiResult<AadhaarOtpResponse> =
        safeApiCall { api.aadhaarSendOtp(req) }
    suspend fun aadhaarVerifyOtp(req: AadhaarVerifyOtpRequest): ApiResult<AadhaarVerifyResponse> =
        safeApiCall { api.aadhaarVerifyOtp(req) }
}

@Singleton
class NotificationsRepository @Inject constructor(private val api: MhubApi) {
    suspend fun list(page: Int = 1): ApiResult<List<Notification>> = safeApiCall {
        api.notifications(page = page).items
    }
    suspend fun markRead(id: String): ApiResult<Unit> = safeApiCall { api.markRead(id); Unit }
    suspend fun markAllRead(): ApiResult<Unit> = safeApiCall { api.markAllRead(); Unit }
    suspend fun delete(id: String): ApiResult<Unit> = safeApiCall { api.deleteNotification(id); Unit }
    suspend fun snooze(id: String, duration: Int = 60): ApiResult<Unit> = safeApiCall {
        api.snoozeNotification(id, SnoozeRequest(duration)); Unit
    }
}

@Singleton
class ChatRepository @Inject constructor(private val api: MhubApi) {
    suspend fun conversations(): ApiResult<List<com.mhub.app.domain.model.ChatConversation>> = safeApiCall {
        api.conversations().conversations
    }
    suspend fun messages(conversationId: String): ApiResult<List<com.mhub.app.domain.model.ChatMessage>> = safeApiCall {
        api.messages(conversationId).items
    }
    suspend fun send(conversationId: String, content: String): ApiResult<Unit> = safeApiCall {
        api.sendMessage(conversationId, SendMessageRequest(content = content)); Unit
    }
    suspend fun deleteMessage(conversationId: String, messageId: String): ApiResult<Unit> = safeApiCall {
        api.deleteChatMessage(conversationId, messageId); Unit
    }
    suspend fun blockUser(userId: String): ApiResult<Unit> = safeApiCall {
        api.blockUser(userId); Unit
    }
    suspend fun reportConversation(conversationId: String): ApiResult<Unit> = safeApiCall {
        api.reportConversation(conversationId, ChatReportRequest("spam")); Unit
    }
    suspend fun addReaction(messageId: String, emoji: String): ApiResult<Unit> = safeApiCall {
        api.addMessageReaction(messageId, ChatReactionRequest(emoji)); Unit
    }
    suspend fun markConversationRead(conversationId: String): ApiResult<Unit> = safeApiCall {
        api.markConversationRead(conversationId); Unit
    }
    suspend fun uploadChatFile(bytes: ByteArray, mimeType: String): ApiResult<String> = safeApiCall {
        val body = bytes.toRequestBody(mimeType.toMediaType())
        api.uploadChatFile(body).url ?: error("No URL returned from upload")
    }
}

@Singleton
class RewardsRepository @Inject constructor(private val api: MhubApi) {
    suspend fun overview(): ApiResult<RewardsOverviewResponse> = safeApiCall { api.rewards() }
    suspend fun coinBalance(): ApiResult<com.mhub.app.data.remote.dto.CoinBalanceResponse> = safeApiCall { api.coinBalance() }
    suspend fun coinHistory(): ApiResult<com.mhub.app.data.remote.dto.CoinHistoryResponse> = safeApiCall { api.coinHistory() }
    suspend fun engagementStatus(): ApiResult<com.mhub.app.data.remote.dto.EngagementStatusResponse> = safeApiCall { api.engagementStatus() }
    suspend fun rewardsConfig(): ApiResult<com.mhub.app.data.remote.dto.RewardsConfigResponse> = safeApiCall { api.rewardsConfig() }
    suspend fun dailyCheckIn(): ApiResult<com.mhub.app.data.remote.dto.DailyCheckInResponse> = safeApiCall { api.dailyCheckIn() }
    suspend fun spinWheel(): ApiResult<com.mhub.app.data.remote.dto.SpinResultResponse> = safeApiCall { api.spinWheel() }
    suspend fun scratchCard(): ApiResult<com.mhub.app.data.remote.dto.ScratchResultResponse> = safeApiCall { api.scratchCard() }
    suspend fun storeRedeem(type: String, postId: String? = null): ApiResult<com.mhub.app.data.remote.dto.StoreRedeemResponse> =
        safeApiCall { api.storeRedeem(com.mhub.app.data.remote.dto.StoreRedeemRequest(type, postId)) }
    suspend fun claimReferralMilestone(): ApiResult<com.mhub.app.data.remote.dto.MessageResponse> = safeApiCall { api.claimReferralMilestone() }
    suspend fun referralLeaderboard(): ApiResult<com.mhub.app.data.remote.dto.ReferralLeaderboardResponse> = safeApiCall { api.referralLeaderboard() }
    suspend fun updateProfile(body: com.mhub.app.data.remote.dto.ProfileUpdateRequest): ApiResult<com.mhub.app.data.remote.dto.MessageResponse> =
        safeApiCall { api.updateProfile(body) }
}

@Singleton
class DashboardRepository @Inject constructor(private val api: MhubApi) {
    suspend fun get(): ApiResult<DashboardResponse> = safeApiCall { api.dashboard() }
    suspend fun coinBalance(): ApiResult<CoinBalanceResponse> = safeApiCall { api.coinBalance() }
    suspend fun dailyCode(): ApiResult<DailyCodeResponse> = safeApiCall { api.dailyCode() }
    suspend fun trustScore(userId: String): ApiResult<TrustScoreResponse> = safeApiCall { api.trustScore(userId) }
}

@Singleton
class UserSocialRepository @Inject constructor(private val api: MhubApi) {
    suspend fun follow(userId: String): ApiResult<Unit> = safeApiCall { api.followUser(userId); Unit }
    suspend fun unfollow(userId: String): ApiResult<Unit> = safeApiCall { api.unfollowUser(userId); Unit }
    suspend fun blockUser(userId: String): ApiResult<Unit> = safeApiCall { api.blockUser(userId); Unit }
    suspend fun myComplaints(): ApiResult<ComplaintHistoryResponse> = safeApiCall { api.myComplaints() }
    suspend fun dataExport(): ApiResult<Unit> = safeApiCall { api.dataExport(); Unit }
}

@Singleton
class ReviewsRepository @Inject constructor(private val api: MhubApi) {
    suspend fun forUser(userId: String): ApiResult<ReviewsResponse> = safeApiCall { api.reviews(userId) }
    suspend fun submit(req: ReviewRequest): ApiResult<Unit> = safeApiCall { api.submitReview(req); Unit }
    suspend fun markHelpful(id: String): ApiResult<Unit> = safeApiCall { api.markReviewHelpful(id); Unit }
    suspend fun respond(id: String, response: String): ApiResult<Unit> = safeApiCall {
        api.respondToReview(id, ReviewRespondRequest(response = response)); Unit
    }
}

@Singleton
class OffersRepository @Inject constructor(private val api: MhubApi) {
    suspend fun list(type: String = "received"): ApiResult<List<Offer>> = safeApiCall { api.offers(type).offers }
    suspend fun accept(id: String): ApiResult<Unit> = safeApiCall { api.acceptOffer(id); Unit }
    suspend fun decline(id: String): ApiResult<Unit> = safeApiCall { api.declineOffer(id); Unit }
    suspend fun counter(id: String, price: Double): ApiResult<Unit> = safeApiCall {
        api.patchOffer(id, OfferActionRequest(action = "counter", counterPrice = price)); Unit
    }
    suspend fun makeOffer(postId: String, amount: Double): ApiResult<Unit> = safeApiCall {
        api.makeOffer(MakeOfferRequest(postId = postId, amount = amount)); Unit
    }
}

@Singleton
class CartRepository @Inject constructor(private val api: MhubApi) {
    suspend fun get(): ApiResult<CartResponse> = safeApiCall { api.cart() }
    suspend fun add(postId: String): ApiResult<Unit> = safeApiCall { api.addToCart(postId); Unit }
    suspend fun remove(postId: String): ApiResult<Unit> = safeApiCall { api.removeFromCart(postId); Unit }
    suspend fun updateQty(postId: String, qty: Int): ApiResult<Unit> = safeApiCall {
        api.updateCartQty(postId, CartQtyRequest(quantity = qty)); Unit
    }
    suspend fun applyCoupon(code: String): ApiResult<CouponResponse> = safeApiCall {
        api.applyCoupon(CouponRequest(code = code))
    }
}

@Singleton
class SavedSearchesRepository @Inject constructor(private val api: MhubApi) {
    suspend fun list(): ApiResult<List<SavedSearch>> = safeApiCall { api.savedSearches().searches }
    suspend fun save(query: String, category: String?): ApiResult<Unit> = safeApiCall { api.saveSearch(SaveSearchRequest(query, category)); Unit }
    suspend fun delete(id: String): ApiResult<Unit> = safeApiCall { api.deleteSavedSearch(id); Unit }
    suspend fun toggleNotification(id: String, enabled: Boolean): ApiResult<Unit> = safeApiCall {
        api.toggleSavedSearchNotification(id, SavedSearchNotificationRequest(enabled)); Unit
    }
}

@Singleton
class ChannelsRepository @Inject constructor(private val api: MhubApi) {
    suspend fun list(): ApiResult<List<Channel>> = safeApiCall { api.channels().channels }
    suspend fun detail(id: String): ApiResult<Channel> = safeApiCall { api.channelDetail(id) }
    suspend fun create(req: CreateChannelRequest): ApiResult<String> = safeApiCall {
        api.createChannel(req).id ?: error("No id")
    }
    suspend fun follow(id: String): ApiResult<Unit> = safeApiCall { api.followChannel(id); Unit }
    suspend fun unfollow(id: String): ApiResult<Unit> = safeApiCall { api.unfollowChannel(id); Unit }
}

@Singleton
class CentresRepository @Inject constructor(private val api: MhubApi) {
    suspend fun list(): ApiResult<List<Centre>> = safeApiCall { api.centres().centres }
    suspend fun detail(id: String): ApiResult<Centre> = safeApiCall { api.centreDetail(id) }
    suspend fun listings(id: String): ApiResult<List<Post>> = safeApiCall { api.centreListings(id).items }
    suspend fun create(req: CreateCentreRequest): ApiResult<String> = safeApiCall {
        api.createCentre(req).id ?: error("No id")
    }
}

@Singleton
class ComplaintsRepository @Inject constructor(private val api: MhubApi) {
    suspend fun submit(req: ComplaintRequest): ApiResult<Unit> = safeApiCall { api.submitComplaint(req); Unit }
    suspend fun submitFeedback(req: FeedbackRequest): ApiResult<Unit> = safeApiCall { api.submitFeedback(req); Unit }
    suspend fun addEvidence(id: String, bytes: ByteArray, mimeType: String): ApiResult<Unit> = safeApiCall {
        val body = bytes.toRequestBody(mimeType.toMediaType())
        val part = okhttp3.MultipartBody.Part.createFormData("evidence", "evidence", body)
        api.addComplaintEvidence(id, part); Unit
    }
}

@Singleton
class AnalyticsRepository @Inject constructor(private val api: MhubApi) {
    suspend fun get(): ApiResult<AnalyticsResponse> = safeApiCall { api.analytics() }
    suspend fun sellerStats(range: String? = null): ApiResult<SellerAnalyticsResponse> = safeApiCall {
        api.sellerAnalyticsStats(range)
    }
    suspend fun postAnalytics(range: String? = null): ApiResult<List<PostAnalytic>> = safeApiCall {
        api.analyticsPerPost(range).posts
    }
    suspend fun categoryAnalytics(range: String? = null): ApiResult<List<CategoryAnalytic>> = safeApiCall {
        api.analyticsCategories(range).categories
    }
}

@Singleton
class SecurityRepository @Inject constructor(private val api: MhubApi) {
    suspend fun sessions(): ApiResult<List<UserSession>> = safeApiCall { api.sessions().sessions }
    suspend fun revokeSession(id: String): ApiResult<Unit> = safeApiCall { api.revokeSession(id); Unit }
    suspend fun revokeAll(): ApiResult<Unit> = safeApiCall { api.revokeAllSessions(); Unit }
    suspend fun twoFaStatus(): ApiResult<TwoFaStatusResponse> = safeApiCall { api.twoFaStatus() }
    suspend fun changePassword(current: String, new: String): ApiResult<Unit> = safeApiCall {
        api.changePassword(ChangePasswordRequest(currentPassword = current, newPassword = new)); Unit
    }
    suspend fun twoFaSetup(): ApiResult<TwoFaSetupResponse> = safeApiCall { api.twoFaSetup() }
    suspend fun twoFaVerify(code: String): ApiResult<TwoFaVerifyResponse> = safeApiCall {
        api.twoFaVerify(TwoFaVerifyRequest(code = code))
    }
    suspend fun twoFaDisable(code: String): ApiResult<Unit> = safeApiCall {
        api.twoFaDisable(TwoFaVerifyRequest(code = code)); Unit
    }
}

@Singleton
class AccountRepository @Inject constructor(private val api: MhubApi) {
    suspend fun deleteAccount(reason: String?): ApiResult<Unit> = safeApiCall {
        api.deleteAccount(DeleteAccountRequest(reason)); Unit
    }
    suspend fun verificationStatus(): ApiResult<VerificationStatusResponse> = safeApiCall {
        api.verificationStatus()
    }
    suspend fun requestVerification(req: VerificationRequest): ApiResult<Unit> = safeApiCall {
        api.requestVerification(req); Unit
    }
}

@Singleton
class TiersRepository @Inject constructor(private val api: MhubApi) {
    suspend fun list(): ApiResult<List<Tier>> = safeApiCall { api.tiers().tiers }
    suspend fun subscribe(req: SubscribeRequest): ApiResult<Unit> = safeApiCall {
        api.subscribe(req); Unit
    }
    suspend fun activateTrial(): ApiResult<Unit> = safeApiCall { api.activateTrial(); Unit }
    suspend fun cancelSubscription(id: String): ApiResult<Unit> = safeApiCall { api.cancelSubscription(id); Unit }
    suspend fun subscriptionHistory(): ApiResult<List<SubscriptionRecord>> = safeApiCall {
        api.subscriptionHistory().subscriptions
    }
    suspend fun mySubscription(): ApiResult<MySubscriptionResponse> = safeApiCall { api.mySubscription() }
}

@Singleton
class CmsRepository @Inject constructor(private val api: MhubApi) {
    suspend fun terms(): ApiResult<CmsContentResponse> = safeApiCall { api.termsContent() }
    suspend fun privacy(): ApiResult<CmsContentResponse> = safeApiCall { api.privacyContent() }
    suspend fun refund(): ApiResult<CmsContentResponse> = safeApiCall { api.refundContent() }
    suspend fun supportPolicy(): ApiResult<CmsContentResponse> = safeApiCall { api.supportPolicyContent() }
}

@Singleton
class InviteRepository @Inject constructor(private val api: MhubApi) {
    suspend fun info(code: String): ApiResult<InviteResponse> = safeApiCall { api.inviteInfo(code) }
}

@Singleton
class AdminRepository @Inject constructor(private val api: MhubApi) {
    suspend fun dashboard(): ApiResult<AdminDashboardResponse> = safeApiCall { api.adminDashboard() }
    suspend fun sendWarning(userId: String, message: String): ApiResult<Unit> = safeApiCall {
        api.adminSendWarning(mapOf("userId" to userId, "message" to message)); Unit
    }
}

@Singleton
class TransactionsRepository @Inject constructor(private val api: MhubApi) {
    suspend fun initiate(req: InitiateSaleRequest): ApiResult<InitiateSaleResponse> = safeApiCall { api.initiateSale(req) }
    suspend fun confirm(req: ConfirmSaleRequest): ApiResult<ConfirmSaleResponse> = safeApiCall { api.confirmSale(req) }
    suspend fun pending(): ApiResult<List<PendingSale>> = safeApiCall { api.pendingSales().sales }
    suspend fun undoSale(req: UndoSaleRequest): ApiResult<Unit> = safeApiCall { api.undoSale(req); Unit }
    suspend fun undoneHistory(): ApiResult<List<UndoneRecord>> = safeApiCall { api.undoneHistory().records }
    suspend fun soldHistory(page: Int = 1): ApiResult<List<Post>> = safeApiCall { api.soldPosts(page).items }
    suspend fun boughtHistory(page: Int = 1): ApiResult<List<Post>> = safeApiCall { api.boughtPosts(page).items }
}

@Singleton
class PaymentsRepository @Inject constructor(private val api: MhubApi) {
    suspend fun upiDetails(): ApiResult<PaymentUpiDetailsResponse> = safeApiCall { api.paymentUpiDetails() }
    suspend fun history(): ApiResult<List<PaymentHistoryItem>> = safeApiCall { api.paymentHistory().payments }
    suspend fun submit(req: SubmitPaymentRequest): ApiResult<Unit> = safeApiCall { api.submitPayment(req); Unit }
    suspend fun createRazorpayOrder(amount: Double, tierId: String? = null): ApiResult<RazorpayOrderResponse> = safeApiCall {
        api.createRazorpayOrder(RazorpayOrderRequest(amount = amount, tierId = tierId))
    }
    suspend fun verifyRazorpayPayment(orderId: String, paymentId: String, signature: String): ApiResult<Unit> = safeApiCall {
        api.verifyRazorpayPayment(RazorpayVerifyRequest(orderId, paymentId, signature)); Unit
    }
}

@Singleton
class BrandsRepository @Inject constructor(private val api: MhubApi) {
    suspend fun list(): ApiResult<List<Brand>> = safeApiCall { api.brands().brands }
}

@Singleton
class RecommendationsRepository @Inject constructor(private val api: MhubApi) {
    suspend fun forYou(
        search: String? = null,
        categoryId: String? = null,
        minPrice: Double? = null,
        maxPrice: Double? = null,
        location: String? = null,
    ): ApiResult<List<Post>> = safeApiCall {
        api.recommendations(search, categoryId, minPrice, maxPrice, location).items
    }
}

@Singleton
class TrustRepository @Inject constructor(private val api: MhubApi) {
    suspend fun score(userId: String): ApiResult<TrustScoreResponse> = safeApiCall { api.trustScore(userId) }
}

@Singleton
class SocialRepository @Inject constructor(private val api: MhubApi) {
    suspend fun feed(page: Int = 1): ApiResult<List<FeedItem>> = safeApiCall { api.feed(page).allItems }
    suspend fun feedDetail(id: String): ApiResult<FeedItem> = safeApiCall { api.feedDetail(id) }
    suspend fun myFeed(page: Int = 1): ApiResult<List<FeedItem>> = safeApiCall { api.myFeed(page).allItems }
    suspend fun publicWall(userId: String): ApiResult<List<FeedItem>> = safeApiCall { api.publicWall(userId).allItems }
    suspend fun publicWallLeaderboard(): ApiResult<PublicWallLeaderboardResponse> = safeApiCall { api.publicWallLeaderboard() }
    suspend fun createPost(req: CreateFeedRequest): ApiResult<String> = safeApiCall {
        api.createFeedPost(req).id ?: error("No id")
    }
    suspend fun likePost(id: String): ApiResult<Unit> = safeApiCall { api.likePost(id); Unit }
    suspend fun bookmarkPost(id: String): ApiResult<Unit> = safeApiCall { api.addWishlist(id); Unit }
    suspend fun viewPost(id: String): ApiResult<Unit> = safeApiCall { api.viewPost(id); Unit }
    suspend fun trackViewed(postId: String): ApiResult<Unit> = safeApiCall {
        api.trackRecentlyViewed(TrackViewRequest(postId = postId)); Unit
    }
}

@Singleton
class PriceAlertsRepository @Inject constructor(private val api: MhubApi) {
    suspend fun subscribe(postId: String): ApiResult<Unit> = safeApiCall { api.subscribePriceAlert(PriceAlertRequest(postId)); Unit }
    suspend fun unsubscribe(postId: String): ApiResult<Unit> = safeApiCall { api.unsubscribePriceAlert(postId); Unit }
}

@Singleton
class BoostRepository @Inject constructor(private val api: MhubApi) {
    suspend fun boost(postId: String, tier: String = "basic", duration: Int = 24): ApiResult<Unit> = safeApiCall { api.boostPost(postId, BoostRequest(tier, duration)); Unit }
    suspend fun status(postId: String): ApiResult<BoostStatusResponse> = safeApiCall { api.boostStatus(postId) }
}

@Singleton
class SponsoredRepository @Inject constructor(private val api: MhubApi) {
    suspend fun list(limit: Int = 10): ApiResult<List<Post>> = safeApiCall { api.sponsoredPosts(limit).items }
    suspend fun forYou(limit: Int = 20, page: Int = 1): ApiResult<List<Post>> = safeApiCall { api.forYouPosts(limit, page).items }
}

@Singleton
class DraftRepository @Inject constructor(private val api: MhubApi) {
    suspend fun get(): ApiResult<DraftResponse> = safeApiCall { api.getDraft() }
    suspend fun save(req: DraftRequest): ApiResult<Unit> = safeApiCall { api.saveDraft(req); Unit }
    suspend fun clear(): ApiResult<Unit> = safeApiCall { api.clearDraft(); Unit }
}

@Singleton
class NotificationPrefsRepository @Inject constructor(private val api: MhubApi) {
    suspend fun get(): ApiResult<NotificationPrefsResponse> = safeApiCall { api.notificationPreferences() }
    suspend fun update(req: NotificationPrefsRequest): ApiResult<Unit> = safeApiCall { api.updateNotificationPreferences(req); Unit }
}

@Singleton
class DailyCodeRepository @Inject constructor(private val api: MhubApi) {
    suspend fun get(): ApiResult<DailyCodeResponse> = safeApiCall { api.dailyCode() }
}

@Singleton
class ReferralTreeRepository @Inject constructor(private val api: MhubApi) {
    suspend fun tree(): ApiResult<ReferralTreeResponse> = safeApiCall { api.referralTree() }
}
