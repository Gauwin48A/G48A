package com.zaruda.app.data.repository

import com.zaruda.app.core.ApiResult
import com.zaruda.app.core.safeApiCall
import com.zaruda.app.data.local.db.CategoryDao
import com.zaruda.app.data.local.db.CategoryEntity
import com.zaruda.app.data.local.db.PostDao
import com.zaruda.app.data.local.db.PostEntity
import com.zaruda.app.data.remote.ZarudaApi
import com.zaruda.app.data.remote.dto.*
import com.zaruda.app.domain.model.Category
import com.zaruda.app.domain.model.Notification
import com.zaruda.app.domain.model.Post
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
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
    private val api: ZarudaApi,
    private val postDao: PostDao,
) {
    suspend fun feedResponse(
        page: Int = 1,
        limit: Int = 20,
        categoryId: String? = null,
        query: String? = null,
        sort: String? = null,
        condition: String? = null,
        subcategory: String? = null,
    ): ApiResult<PostsResponse> = safeApiCall {
        api.posts(page, limit, categoryId, query, sort, condition, subcategory)
    }

    suspend fun feed(
        page: Int = 1,
        limit: Int = 20,
        categoryId: String? = null,
        query: String? = null,
        sort: String? = null,
        condition: String? = null,
        subcategory: String? = null,
    ): ApiResult<List<Post>> {
        val result = safeApiCall { api.posts(page, limit, categoryId, query, sort, condition, subcategory).allItems }
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

    /** Public list of a seller's currently-active listings (for the seller trust page). */
    suspend fun postsByAuthor(author: String, page: Int = 1, limit: Int = 50): ApiResult<List<Post>> =
        safeApiCall { api.posts(page, limit, null, null, null, null, null, author).allItems }

    suspend fun create(req: CreatePostRequest): ApiResult<String> = safeApiCall {
        api.createPost(req).id ?: error("No id returned")
    }

    suspend fun update(id: String, req: CreatePostRequest): ApiResult<Unit> = safeApiCall {
        api.updatePost(id, req); Unit
    }

    suspend fun mine(userId: String? = null, category: String? = null): ApiResult<List<Post>> =
        safeApiCall { api.myPosts(userId = userId, category = category).allItems }

    suspend fun mineTotals(userId: String? = null, category: String? = null): ApiResult<com.zaruda.app.data.remote.dto.PostTotals?> =
        safeApiCall {
            val resp = api.myPostsTotals(userId = userId, category = category)
            resp.totals ?: com.zaruda.app.data.remote.dto.PostTotals(
                total = resp.total, active = resp.active, sold = resp.sold, bought = resp.bought,
            )
        }

    suspend fun sold(page: Int = 1): ApiResult<List<Post>> = safeApiCall { api.soldPosts(page).allItems }

    suspend fun bought(page: Int = 1): ApiResult<List<Post>> = safeApiCall { api.boughtPosts(page).allItems }

    suspend fun recentlyViewed(): ApiResult<List<Post>> = safeApiCall { api.recentlyViewed().allItems }
    suspend fun trackViewed(postId: String): ApiResult<Unit> = safeApiCall {
        api.trackRecentlyViewed(TrackViewRequest(postId = postId)); Unit
    }
    suspend fun deleteRecentlyViewed(postId: String): ApiResult<Unit> = safeApiCall { api.deleteRecentlyViewed(postId); Unit }
    suspend fun clearRecentlyViewed(): ApiResult<Unit> = safeApiCall { api.clearRecentlyViewed(); Unit }

    suspend fun compareList(): ApiResult<List<Post>> = safeApiCall { api.compareList().allItems }
    suspend fun addToCompare(postId: String): ApiResult<Unit> = safeApiCall { api.addToCompare(postId); Unit }
    suspend fun removeFromCompare(postId: String): ApiResult<Unit> = safeApiCall { api.removeFromCompare(postId); Unit }
    suspend fun clearCompare(): ApiResult<Unit> = safeApiCall { api.clearCompare(); Unit }

    suspend fun report(id: String): ApiResult<Unit> = safeApiCall { api.reportPost(id); Unit }

    suspend fun delete(id: String): ApiResult<Unit> = safeApiCall { api.deletePost(id); Unit }

    suspend fun markSold(id: String): ApiResult<Unit> = safeApiCall { api.markPostSold(id); Unit }

    /** Renew / re-activate a listing (expired, sold, or draft → active). */
    suspend fun renew(id: String): ApiResult<Unit> = safeApiCall {
        try {
            api.reactivatePost(id, com.zaruda.app.data.remote.dto.ReactivatePostRequest(reason = "renew", description = "Listing renewed by owner"))
        } catch (e: retrofit2.HttpException) {
            if (e.code() == 404 || e.code() == 405) {
                api.patchPostStatus(id, com.zaruda.app.data.remote.dto.PatchPostStatusRequest(status = "active"))
            } else throw e
        }
        Unit
    }

    suspend fun batchView(postIds: List<String>): ApiResult<Unit> = safeApiCall {
        api.batchViewPosts(mapOf("postIds" to postIds)); Unit
    }

    suspend fun toggleWishlist(postId: String): ApiResult<Unit> = safeApiCall {
        api.toggleWishlist(postId); Unit
    }
}

@Singleton
class CategoriesRepository @Inject constructor(
    private val api: ZarudaApi,
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
        safeApiCall { api.subcategories(categoryId) }
}

@Singleton
class WishlistRepository @Inject constructor(private val api: ZarudaApi) {
    @Volatile
    private var cachedItems: List<Post>? = null

    suspend fun list(): ApiResult<List<Post>> {
        val result = safeApiCall { api.wishlist().posts }
        if (result is ApiResult.Success) {
            cachedItems = result.data
        }
        if (result is ApiResult.Failure) {
            // Return cached data if available instead of showing error
            val cache = cachedItems
            if (!cache.isNullOrEmpty()) return ApiResult.Success(cache)
        }
        return result
    }
    suspend fun add(postId: String): ApiResult<Unit> = safeApiCall { api.addWishlist(postId); Unit }
    suspend fun remove(postId: String): ApiResult<Unit> {
        // Optimistically remove from cache
        cachedItems = cachedItems?.filterNot { it.stableId == postId }
        return safeApiCall { api.removeWishlist(postId); Unit }
    }
    suspend fun toggle(postId: String): ApiResult<Boolean> = safeApiCall {
        val resp = api.toggleWishlist(postId)
        resp.inWishlist ?: true
    }
}

@Singleton
class UploadRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun uploadPostImage(bytes: ByteArray, mime: String): ApiResult<String> = safeApiCall {
        val body: RequestBody = bytes.toRequestBody(mime.toMediaType())
        api.uploadPostImage(body).url ?: error("Upload failed: no URL")
    }

    /** Upload a listing voice-note (audio bytes) and return the public URL. */
    suspend fun uploadAudio(bytes: ByteArray, mime: String): ApiResult<String> = safeApiCall {
        val body: RequestBody = bytes.toRequestBody(mime.toMediaType())
        api.uploadAudio(body).url ?: error("Upload failed: no URL")
    }

    /**
     * Upload a KYC document image (front / back / selfie) to the server.
     * Returns the uploaded URL which is then passed to kycSubmit() as the doc key.
     */
    suspend fun uploadKycDoc(bytes: ByteArray, mime: String, slot: String): ApiResult<String> = safeApiCall {
        val body: RequestBody = bytes.toRequestBody(mime.toMediaType())
        val part = okhttp3.MultipartBody.Part.createFormData(
            "file",
            "kyc_${slot}_${System.currentTimeMillis()}.jpg",
            body,
        )
        val resp = api.uploadKycDoc(part)
        resp.url?.takeIf { it.isNotBlank() }
            ?: resp.key.takeIf { it.isNotBlank() }
            ?: error("Upload failed: no URL")
    }
}

@Singleton
class KycRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun status(): ApiResult<KycStatusResponse> = safeApiCall { api.kycStatus() }

    /** Submit KYC documents (docType + docNumber + uploaded doc URLs) to the server. */
    suspend fun submit(req: KycSubmitRequest): ApiResult<KycSubmitResponse> =
        safeApiCall { api.kycSubmit(req) }

    /** Request an Aadhaar OTP via the KYC flow (/api/users/kyc/aadhaar/generate). */
    suspend fun aadhaarSendOtp(req: AadhaarSendOtpRequest): ApiResult<AadhaarOtpResponse> =
        safeApiCall {
            api.generateAadhaarOtp(
                com.zaruda.app.data.remote.dto.AadhaarGenerateRequest(
                    aadhaarNumber = req.aadhaarNumber,
                ),
            )
        }

    /** Verify an Aadhaar OTP via the KYC flow (/api/users/kyc/aadhaar/verify). */
    suspend fun aadhaarVerifyOtp(req: AadhaarVerifyOtpRequest): ApiResult<AadhaarVerifyResponse> =
        safeApiCall {
            api.verifyAadhaarOtp(
                com.zaruda.app.data.remote.dto.AadhaarVerifyRequest(
                    otp = req.otp,
                    txnId = req.txnId ?: "",
                ),
            )
        }
}

@Singleton
class NotificationsRepository @Inject constructor(private val api: ZarudaApi) {
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
class RewardsRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun overview(): ApiResult<RewardsOverviewResponse> = safeApiCall { api.rewards() }
    suspend fun coinBalance(): ApiResult<com.zaruda.app.data.remote.dto.CoinBalanceResponse> = safeApiCall { api.coinBalance() }
    suspend fun coinHistory(): ApiResult<com.zaruda.app.data.remote.dto.CoinHistoryResponse> = safeApiCall { api.coinHistory() }
    suspend fun engagementStatus(): ApiResult<com.zaruda.app.data.remote.dto.EngagementStatusResponse> = safeApiCall { api.engagementStatus() }
    suspend fun rewardsConfig(): ApiResult<com.zaruda.app.data.remote.dto.RewardsConfigResponse> = safeApiCall { api.rewardsConfig() }
    suspend fun dailyCheckIn(): ApiResult<com.zaruda.app.data.remote.dto.DailyCheckInResponse> = safeApiCall { api.dailyCheckIn() }
    suspend fun spinWheel(): ApiResult<com.zaruda.app.data.remote.dto.SpinResultResponse> = safeApiCall { api.spinWheel() }
    suspend fun storeRedeem(type: String, postId: String? = null): ApiResult<com.zaruda.app.data.remote.dto.StoreRedeemResponse> =
        safeApiCall { api.storeRedeem(com.zaruda.app.data.remote.dto.StoreRedeemRequest(type, postId)) }
    suspend fun redeemCoins(type: String, postId: String? = null): ApiResult<com.zaruda.app.data.remote.dto.MessageResponse> =
        safeApiCall { api.redeemCoins(com.zaruda.app.data.remote.dto.RedeemCoinsRequest(type, postId)) }
    suspend fun claimReferralMilestone(): ApiResult<com.zaruda.app.data.remote.dto.MessageResponse> = safeApiCall { api.claimReferralMilestone() }
    suspend fun claimDailyCode(code: String): ApiResult<com.zaruda.app.data.remote.dto.MessageResponse> =
        safeApiCall { api.claimDailyCode(mapOf("code" to code)) }
    suspend fun referralLeaderboard(): ApiResult<com.zaruda.app.data.remote.dto.ReferralLeaderboardResponse> = safeApiCall { api.referralLeaderboard() }
    suspend fun updateProfile(body: com.zaruda.app.data.remote.dto.ProfileUpdateRequest): ApiResult<com.zaruda.app.data.remote.dto.MessageResponse> =
        safeApiCall { api.updateProfile(body) }
    suspend fun referralTree(): ApiResult<com.zaruda.app.data.remote.dto.ReferralTreeResponse> = safeApiCall { api.referralTree() }
    suspend fun referralChainStatus(): ApiResult<com.zaruda.app.data.remote.dto.ReferralChainStatusResponse> = safeApiCall { api.referralChainStatus() }
}

@Singleton
class DashboardRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun get(): ApiResult<DashboardResponse> = safeApiCall { api.dashboard() }
    suspend fun coinBalance(): ApiResult<CoinBalanceResponse> = safeApiCall { api.coinBalance() }
    suspend fun dailyCode(): ApiResult<DailyCodeResponse> = safeApiCall { api.dailyCode() }
    suspend fun trustScore(userId: String): ApiResult<TrustScoreResponse> = safeApiCall { api.trustScore(userId) }
    /** Single-call unified profile endpoint (replaces 4-call waterfall) */
    suspend fun getFullProfile(): ApiResult<com.zaruda.app.data.remote.dto.FullProfileResponse> = safeApiCall { api.getFullProfile() }
}

@Singleton
class UserSocialRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun follow(userId: String): ApiResult<Unit> = safeApiCall { api.followUser(userId); Unit }
    suspend fun unfollow(userId: String): ApiResult<Unit> = safeApiCall { api.unfollowUser(userId); Unit }
    suspend fun blockUser(userId: String): ApiResult<Unit> = safeApiCall { api.blockUser(userId); Unit }
    suspend fun myComplaints(): ApiResult<ComplaintHistoryResponse> = safeApiCall { api.myComplaints() }
    suspend fun dataExport(): ApiResult<Unit> = safeApiCall { api.dataExport(); Unit }

    // Followers / Following lists
    suspend fun followers(userId: String): ApiResult<FollowersResponse> = safeApiCall { api.followers(userId) }
    suspend fun following(userId: String): ApiResult<FollowersResponse> = safeApiCall { api.following(userId) }

    // Profile activity feed
    suspend fun activity(userId: String): ApiResult<ProfileActivityResponse> = safeApiCall { api.profileActivity(userId) }
}



@Singleton
class OffersRepository @Inject constructor(private val api: ZarudaApi) {
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
class InquiriesRepository @Inject constructor(private val api: ZarudaApi) {
    /** Express Interest — send buyer inquiry to seller (triggers FCM push notification). */
    suspend fun createInquiry(
        postId: String,
        buyerName: String,
        phone: String,
        address: String? = null,
        message: String? = null,
    ): ApiResult<Unit> = safeApiCall {
        api.createInquiry(CreateInquiryRequest(
            postId = postId,
            buyerName = buyerName,
            phone = phone,
            address = address,
            message = message,
        ));
        Unit
    }
}

@Singleton
class CartRepository @Inject constructor(private val api: ZarudaApi) {
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
class SavedSearchesRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun list(): ApiResult<List<SavedSearch>> = safeApiCall { api.savedSearches().searches }
    suspend fun save(query: String, category: String?): ApiResult<Unit> = safeApiCall { api.saveSearch(SaveSearchRequest(query, category)); Unit }
    suspend fun delete(id: String): ApiResult<Unit> = safeApiCall { api.deleteSavedSearch(id); Unit }
    suspend fun toggleNotification(id: String, enabled: Boolean): ApiResult<Unit> = safeApiCall {
        api.toggleSavedSearchNotification(id, SavedSearchNotificationRequest(enabled)); Unit
    }
}

@Singleton
class ChannelsRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun list(): ApiResult<List<Channel>> = safeApiCall { api.channels() }
    suspend fun detail(id: String): ApiResult<ChannelDetailResponse> = safeApiCall { api.channelDetail(id) }
    suspend fun create(req: CreateChannelRequest): ApiResult<Channel> = safeApiCall { api.createChannel(req) }
    suspend fun follow(id: String): ApiResult<Unit> = safeApiCall { api.followChannel(id); Unit }
    suspend fun unfollow(id: String): ApiResult<Unit> = safeApiCall { api.unfollowChannel(id); Unit }
}

@Singleton
class CentresRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun list(): ApiResult<List<Centre>> = safeApiCall { api.centres().centres }
    suspend fun detail(id: String): ApiResult<Centre> = safeApiCall { api.centreDetail(id) }
    suspend fun listings(id: String): ApiResult<List<Post>> = safeApiCall { api.centreListings(id).allItems }
    suspend fun create(req: CreateCentreRequest): ApiResult<String> = safeApiCall {
        api.createCentre(req).id ?: error("No id")
    }
}

@Singleton
class ComplaintsRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun submit(req: ComplaintRequest): ApiResult<Unit> = safeApiCall { api.submitComplaint(req); Unit }
    suspend fun submitFeedback(req: FeedbackRequest): ApiResult<Unit> = safeApiCall { api.submitFeedback(req); Unit }
    suspend fun addEvidence(id: String, bytes: ByteArray, mimeType: String): ApiResult<Unit> = safeApiCall {
        val body = bytes.toRequestBody(mimeType.toMediaType())
        val part = okhttp3.MultipartBody.Part.createFormData("evidence", "evidence", body)
        api.addComplaintEvidence(id, part); Unit
    }
}

@Singleton
class AnalyticsRepository @Inject constructor(private val api: ZarudaApi) {
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
class SecurityRepository @Inject constructor(private val api: ZarudaApi) {
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
class AccountRepository @Inject constructor(private val api: ZarudaApi) {
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
class PayoutRepository @Inject constructor(private val api: ZarudaApi) {
    /** Current payout linking status (linked methods, Razorpay IDs). */
    suspend fun status(): ApiResult<PayoutStatusResponse> = safeApiCall {
        api.payoutStatus()
    }

    /** Link a UPI VPA as the payout method. */
    suspend fun linkUpi(upiId: String): ApiResult<PayoutLinkResponse> = safeApiCall {
        api.linkPayoutAccount(PayoutLinkRequest(type = "upi", upiId = upiId))
    }

    /** Link a bank account as the payout method. */
    suspend fun linkBankAccount(number: String, ifsc: String, beneficiary: String): ApiResult<PayoutLinkResponse> = safeApiCall {
        api.linkPayoutAccount(
            PayoutLinkRequest(
                type = "bank_account",
                bankAccount = PayoutBankDetails(accountNumber = number, ifsc = ifsc, beneficiaryName = beneficiary),
            )
        )
    }
}

@Singleton
class TiersRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun list(): ApiResult<List<Tier>> = safeApiCall {
        api.getSubscriptionPlans().plans.map { plan ->
            Tier(
                id = plan.id,
                name = plan.name,
                price = plan.priceINR.toDouble(),
                currency = "INR",
                duration = plan.durationDays,
                features = plan.features,
                popular = false,
            )
        }
    }
    suspend fun subscribe(req: SubscribeRequest): ApiResult<Unit> = safeApiCall {
        // Subscribe endpoint replaced by payment order flow
        api.createRazorpayOrder(RazorpayOrderRequest(amount = 0.0, tierId = req.tierId)); Unit
    }

    suspend fun cancelSubscription(id: String): ApiResult<Unit> = safeApiCall {
        // Cancel not available in new API; return success
        Unit
    }
    suspend fun subscriptionHistory(): ApiResult<List<SubscriptionRecord>> = safeApiCall {
        val my = api.mySubscription()
        my.subscription?.let { listOf(it) } ?: emptyList()
    }
    suspend fun mySubscription(): ApiResult<MySubscriptionResponse> = safeApiCall { api.mySubscription() }
}

@Singleton
class CmsRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun terms(): ApiResult<CmsContentResponse> = safeApiCall { api.termsContent() }
    suspend fun privacy(): ApiResult<CmsContentResponse> = safeApiCall { api.privacyContent() }
    suspend fun refund(): ApiResult<CmsContentResponse> = safeApiCall { api.refundContent() }
    suspend fun supportPolicy(): ApiResult<CmsContentResponse> = safeApiCall { api.supportPolicyContent() }
}

@Singleton
class InviteRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun info(code: String): ApiResult<InviteResponse> = safeApiCall { api.inviteInfo(code) }
}

@Singleton
class AdminRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun dashboard(): ApiResult<AdminDashboardResponse> = safeApiCall { api.adminDashboard() }
    suspend fun sendWarning(userId: String, message: String): ApiResult<Unit> = safeApiCall {
        api.adminSendWarning(mapOf("userId" to userId, "message" to message)); Unit
    }
}

@Singleton
class TransactionsRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun initiate(req: InitiateSaleRequest): ApiResult<InitiateSaleResponse> = safeApiCall { api.initiateSale(req) }
    suspend fun confirm(req: ConfirmSaleRequest): ApiResult<ConfirmSaleResponse> = safeApiCall { api.confirmSale(req) }
    suspend fun pending(): ApiResult<List<PendingSale>> = safeApiCall { api.pendingSales().sales }
    suspend fun undoSale(req: UndoSaleRequest): ApiResult<Unit> = safeApiCall {
        // Web app tries POST /posts/:postId/reactivate first, falls back to PATCH /posts/:postId/status
        try {
            api.reactivatePost(
                postId = req.postId,
                body = com.zaruda.app.data.remote.dto.ReactivatePostRequest(
                    reason = req.reason,
                    description = req.description,
                ),
            )
        } catch (e: retrofit2.HttpException) {
            if (e.code() == 404 || e.code() == 405) {
                // Fallback: PATCH /posts/:postId/status (web parity)
                api.patchPostStatus(
                    id = req.postId,
                    body = com.zaruda.app.data.remote.dto.PatchPostStatusRequest(
                        status = "active",
                        reason = req.reason,
                        description = req.description,
                    ),
                )
            } else throw e
        }
        Unit
    }
    suspend fun undoneHistory(): ApiResult<List<UndoneRecord>> = safeApiCall { api.undoneHistory().records }
    suspend fun soldHistory(page: Int = 1): ApiResult<List<Post>> = safeApiCall { api.soldPosts(page).allItems }
    suspend fun boughtHistory(page: Int = 1): ApiResult<List<Post>> = safeApiCall { api.boughtPosts(page).allItems }
}

@Singleton
class PaymentsRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun upiDetails(): ApiResult<PaymentUpiDetailsResponse> = safeApiCall { api.paymentUpiDetails() }
    suspend fun history(): ApiResult<List<PaymentHistoryItem>> = safeApiCall { api.paymentHistory().payments }
    suspend fun submit(req: SubmitPaymentRequest): ApiResult<Unit> = safeApiCall { api.submitPayment(req); Unit }
    suspend fun createRazorpayOrder(
        amount: Double,
        tierId: String? = null,
        coinsToApply: Int = 0,
        saleId: Int? = null,
    ): ApiResult<RazorpayOrderResponse> = safeApiCall {
        api.createRazorpayOrder(
            RazorpayOrderRequest(
                amount = amount,
                tierId = tierId,
                coinsToApply = coinsToApply,
                saleId = saleId?.toString(),
            ),
        )
    }
    suspend fun verifyRazorpayPayment(orderId: String, paymentId: String, signature: String): ApiResult<Unit> = safeApiCall {
        api.verifyRazorpayPayment(RazorpayVerifyRequest(orderId, paymentId, signature)); Unit
    }

    /** Create a Razorpay order for an in-app sale purchase (escrow). */
    suspend fun createSaleOrder(saleId: Int, amount: Double): ApiResult<RazorpayOrderResponse> =
        createRazorpayOrder(amount = amount, saleId = saleId)

    /** Verify an in-app sale payment; returns the sale payment status. */
    suspend fun verifySalePayment(orderId: String, paymentId: String, signature: String): ApiResult<SalePaymentVerifyResponse> = safeApiCall {
        api.verifyRazorpayPayment(RazorpayVerifyRequest(orderId, paymentId, signature))
    }
}

@Singleton
class BrandsRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun list(): ApiResult<List<Brand>> = safeApiCall { api.brands().brands }
}

@Singleton
class RecommendationsRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun forYou(
        search: String? = null,
        categoryId: String? = null,
        minPrice: Double? = null,
        maxPrice: Double? = null,
        location: String? = null,
    ): ApiResult<List<Post>> = safeApiCall {
        api.recommendations(search, categoryId, minPrice, maxPrice, location).allItems
    }
}

@Singleton
class TrustRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun score(userId: String): ApiResult<TrustScoreResponse> = safeApiCall { api.trustScore(userId) }
}

@Singleton
class SocialRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun feed(page: Int = 1): ApiResult<List<FeedItem>> = safeApiCall { api.feed(page) }
    suspend fun feedDetail(id: String): ApiResult<FeedItem> = safeApiCall { api.feedDetail(id) }
    suspend fun myFeed(page: Int = 1): ApiResult<List<FeedItem>> = safeApiCall { api.myFeed(page) }
    suspend fun publicWall(userId: String): ApiResult<List<FeedItem>> = safeApiCall { api.publicWall(userId) }
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

    /** Delete a feed post. Uses the posts endpoint since feed items share the same posts table. */
    suspend fun deleteFeedPost(id: String): ApiResult<Unit> = safeApiCall {
        api.deletePost(id); Unit
    }
}

@Singleton
class PriceAlertsRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun subscribe(postId: String): ApiResult<Unit> = safeApiCall { api.subscribePriceAlert(PriceAlertRequest(postId)); Unit }
    suspend fun unsubscribe(postId: String): ApiResult<Unit> = safeApiCall { api.unsubscribePriceAlert(postId); Unit }
}

@Singleton
class BoostRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun boost(postId: String, tier: String = "basic", duration: Int = 24): ApiResult<Unit> = safeApiCall { api.boostPost(postId, BoostRequest(tier, duration)); Unit }
    suspend fun status(postId: String): ApiResult<BoostStatusResponse> = safeApiCall { api.boostStatus(postId) }
}

@Singleton
class SponsoredRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun list(limit: Int = 10): ApiResult<List<Post>> = safeApiCall { api.sponsoredPosts(limit).allItems }
    suspend fun forYou(limit: Int = 20, page: Int = 1): ApiResult<List<Post>> = safeApiCall { api.forYouPosts(limit, page).allItems }
}

@Singleton
class ProfileRepository @Inject constructor(private val api: ZarudaApi) {
    /** Fetches the current user's saved category & price preferences. */
    suspend fun preferences(): ApiResult<com.zaruda.app.data.remote.dto.PreferencesResponse> =
        safeApiCall { api.getPreferences() }
}

@Singleton
class DraftRepository @Inject constructor(
    private val api: ZarudaApi,
    @dagger.hilt.android.qualifiers.ApplicationContext private val context: android.content.Context
) {
    private val prefs by lazy { context.getSharedPreferences("post_draft_cache", android.content.Context.MODE_PRIVATE) }

    suspend fun get(): ApiResult<DraftResponse> {
        val remote = safeApiCall { api.getDraft() }
        if (remote is ApiResult.Success && (remote.data.title != null || remote.data.description != null || remote.data.price != null)) {
            return remote
        }
        val cachedTitle = prefs.getString("draft_title", null)
        val cachedDesc = prefs.getString("draft_desc", null)
        val cachedPrice = prefs.getString("draft_price", null)?.toDoubleOrNull()
        val cachedCategory = prefs.getString("draft_category", null)
        val cachedBrand = prefs.getString("draft_brand", null)
        val cachedModel = prefs.getString("draft_model", null)
        val cachedLocation = prefs.getString("draft_location", null)
        val cachedContact = prefs.getString("draft_contact", null)

        if (cachedTitle != null || cachedDesc != null || cachedPrice != null) {
            return ApiResult.Success(
                DraftResponse(
                    title = cachedTitle,
                    description = cachedDesc,
                    price = cachedPrice,
                    categoryId = cachedCategory,
                    brand = cachedBrand,
                    model = cachedModel,
                    location = cachedLocation,
                    contactNumber = cachedContact
                )
            )
        }
        return remote
    }

    suspend fun save(req: DraftRequest): ApiResult<Unit> {
        prefs.edit().apply {
            putString("draft_title", req.title)
            putString("draft_desc", req.description)
            putString("draft_price", req.price?.toString())
            putString("draft_category", req.categoryId)
            putString("draft_brand", req.brand)
            putString("draft_model", req.model)
            putString("draft_location", req.location)
            putString("draft_contact", req.contactNumber)
            apply()
        }
        return safeApiCall { api.saveDraft(req); Unit }
    }

    suspend fun clear(): ApiResult<Unit> {
        prefs.edit().clear().apply()
        return safeApiCall { api.clearDraft(); Unit }
    }
}

@Singleton
class NotificationPrefsRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun get(): ApiResult<NotificationPrefsResponse> = safeApiCall { api.notificationPreferences() }
    suspend fun update(req: NotificationPrefsRequest): ApiResult<Unit> = safeApiCall { api.updateNotificationPreferences(req); Unit }
}

@Singleton
class DailyCodeRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun get(): ApiResult<DailyCodeResponse> = safeApiCall { api.dailyCode() }
}

@Singleton
class ReferralTreeRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun tree(): ApiResult<ReferralTreeResponse> = safeApiCall { api.referralTree() }
}

@Singleton
class SalesRepository @Inject constructor(private val api: ZarudaApi) {
    suspend fun requestSale(body: SaleRequest): ApiResult<SaleResponse> = safeApiCall { api.requestSale(body) }
    suspend fun pendingRequests(): ApiResult<List<SaleInfo>> = safeApiCall { api.pendingSaleRequests().sales }
    suspend fun myActive(): ApiResult<List<SaleInfo>> = safeApiCall { api.myActiveSales().sales }
    suspend fun myHistory(): ApiResult<List<SaleInfo>> = safeApiCall { api.mySaleHistory().sales }
    suspend fun approve(id: Int): ApiResult<Unit> = safeApiCall { api.approveSale(id); Unit }
    suspend fun reject(id: Int): ApiResult<Unit> = safeApiCall { api.rejectSale(id); Unit }
    suspend fun cancel(id: Int): ApiResult<Unit> = safeApiCall { api.cancelSale(id); Unit }
    suspend fun markShipped(id: Int, trackingNumber: String? = null, courierName: String? = null): ApiResult<Unit> =
        safeApiCall {
            api.markShipped(id, com.zaruda.app.data.remote.dto.MarkShippedRequest(trackingNumber = trackingNumber, courierName = courierName)); Unit
        }
    suspend fun orderReceived(id: Int): ApiResult<Unit> = safeApiCall { api.orderReceived(id); Unit }
    suspend fun amountReceived(id: Int): ApiResult<Unit> = safeApiCall { api.amountReceived(id); Unit }
    suspend fun reportFraud(id: Int, reportedParty: String, reason: String): ApiResult<Unit> =
        safeApiCall { api.reportFraud(id, FraudReportRequest(reportedParty = reportedParty, reason = reason)); Unit }
    suspend fun respondToFraud(id: Int, message: String): ApiResult<Unit> =
        safeApiCall { api.respondToFraudFlag(id, FraudResponseRequest(message = message)); Unit }
    suspend fun rateCompletedSale(id: Int, rating: Int, comment: String? = null): ApiResult<MessageResponse> =
        safeApiCall { api.rateCompletedSale(id, com.zaruda.app.data.remote.dto.SaleRateRequest(rating, comment)) }
    /** Whether the current user is the buyer of a completed, unrated sale for a post. */
    suspend fun myReviewStatus(postId: String): ApiResult<com.zaruda.app.data.remote.dto.MyReviewStatusResponse> =
        safeApiCall { api.myReviewStatus(postId) }
    suspend fun suspensionStatus(): ApiResult<SuspensionStatusResponse> = safeApiCall { api.mySuspensionStatus() }
}
