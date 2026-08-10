package com.zaruda.app.data.repository

import com.zaruda.app.core.ApiResult
import com.zaruda.app.core.safeApiCall
import com.zaruda.app.data.remote.ZarudaApiV1
import com.zaruda.app.data.remote.dto.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for v1 subscription management — plans, purchase, features, cancellation.
 */
@Singleton
class SubscriptionRepositoryV1 @Inject constructor(
    private val api: ZarudaApiV1,
) {
    suspend fun plans(): ApiResult<SubscriptionPlansResponseV1> = safeApiCall { api.getSubscriptionPlans() }

    suspend fun my(): ApiResult<MySubscriptionResponseV1> = safeApiCall { api.mySubscription() }

    suspend fun createOrder(planId: String): ApiResult<CreateSubscriptionOrderResponse> =
        safeApiCall { api.createSubscriptionOrder(CreateSubscriptionOrderRequest(plan_id = planId)) }

    suspend fun verifyPayment(
        orderId: String,
        paymentId: String,
        signature: String,
        planId: String,
    ): ApiResult<VerifySubscriptionPaymentResponse> =
        safeApiCall {
            api.verifySubscriptionPayment(
                VerifySubscriptionPaymentRequest(
                    razorpay_order_id = orderId,
                    razorpay_payment_id = paymentId,
                    razorpay_signature = signature,
                    plan_id = planId,
                )
            )
        }

    suspend fun history(): ApiResult<SubscriptionHistoryResponseV1> = safeApiCall { api.subscriptionHistory() }

    suspend fun cancel(): ApiResult<Unit> = safeApiCall { api.cancelSubscription(); Unit }

    suspend fun features(): ApiResult<SubscriptionFeaturesResponse> = safeApiCall { api.mySubscriptionFeatures() }

    suspend fun checkFeature(featureCode: String): ApiResult<CheckFeatureResponse> =
        safeApiCall { api.checkFeature(featureCode) }
}

/**
 * Repository for v1 order management — list, create, update status, cancel.
 */
@Singleton
class OrderRepositoryV1 @Inject constructor(
    private val api: ZarudaApiV1,
) {
    suspend fun list(role: String = "buyer"): ApiResult<OrdersListResponse> =
        safeApiCall { api.orders(role = role) }

    suspend fun create(productId: String, sellerId: String, variantId: String? = null, quantity: Int = 1): ApiResult<CreateOrderResponseV1> =
        safeApiCall {
            api.createOrder(CreateOrderRequestV1(product_id = productId, seller_id = sellerId, variant_id = variantId, quantity = quantity))
        }

    suspend fun detail(id: String): ApiResult<OrderDetailResponse> =
        safeApiCall { api.orderDetail(id) }

    suspend fun updateStatus(id: String, status: String): ApiResult<Unit> =
        safeApiCall { api.updateOrderStatus(id, UpdateOrderStatusRequest(status = status)); Unit }

    suspend fun cancel(id: String): ApiResult<Unit> =
        safeApiCall { api.cancelOrder(id); Unit }
}

/**
 * Repository for v1 dispute lifecycle — list, create, messages, evidence.
 */
@Singleton
class DisputeRepositoryV1 @Inject constructor(
    private val api: ZarudaApiV1,
) {
    suspend fun list(): ApiResult<DisputesListResponse> = safeApiCall { api.disputes() }

    suspend fun create(orderId: String, disputeType: String, description: String, raisedAgainst: String): ApiResult<CreateDisputeResponse> =
        safeApiCall {
            api.createDispute(CreateDisputeRequest(order_id = orderId, dispute_type = disputeType, description = description, raised_against = raisedAgainst))
        }

    suspend fun detail(id: String): ApiResult<DisputeDetailResponse> =
        safeApiCall { api.disputeDetail(id) }

    suspend fun addMessage(id: String, message: String): ApiResult<Unit> =
        safeApiCall { api.addDisputeMessage(id, AddDisputeMessageRequest(message = message)); Unit }

    suspend fun addEvidence(id: String, evidenceType: String, objectKey: String? = null, content: String? = null, description: String? = null): ApiResult<Unit> =
        safeApiCall {
            api.addDisputeEvidence(id, AddDisputeEvidenceRequest(evidence_type = evidenceType, object_key = objectKey, content = content, description = description)); Unit
        }
}

/**
 * Repository for v1 shipment tracking — list, create, status updates, delivery confirmation.
 */
@Singleton
class ShipmentRepositoryV1 @Inject constructor(
    private val api: ZarudaApiV1,
) {
    suspend fun list(): ApiResult<ShipmentsListResponse> = safeApiCall { api.shipments() }

    suspend fun create(orderId: String, carrier: String? = null, trackingNumber: String? = null): ApiResult<CreateShipmentResponse> =
        safeApiCall {
            api.createShipment(CreateShipmentRequest(order_id = orderId, carrier = carrier, tracking_number = trackingNumber))
        }

    suspend fun detail(id: String): ApiResult<ShipmentDetailResponse> =
        safeApiCall { api.shipmentDetail(id) }

    suspend fun updateStatus(id: String, status: String): ApiResult<Unit> =
        safeApiCall { api.updateShipmentStatus(id, UpdateShipmentStatusRequest(status = status)); Unit }

    suspend fun confirmDelivery(id: String, notes: String? = null): ApiResult<Unit> =
        safeApiCall { api.confirmDelivery(id, ConfirmDeliveryRequest(notes = notes)); Unit }
}

/**
 * Repository for v1 user pages — CRUD, follow/unfollow, posts.
 */
@Singleton
class PageRepositoryV1 @Inject constructor(
    private val api: ZarudaApiV1,
) {
    suspend fun my(): ApiResult<PagesListResponse> = safeApiCall { api.myPages() }

    suspend fun create(name: String, description: String? = null, category: String? = null): ApiResult<CreatePageResponse> =
        safeApiCall { api.createPage(CreatePageRequest(name = name, description = description, category = category)) }

    suspend fun detail(id: String): ApiResult<PageDetailResponse> =
        safeApiCall { api.pageDetail(id) }

    suspend fun update(id: String, name: String? = null, description: String? = null): ApiResult<Unit> =
        safeApiCall { api.updatePage(id, UpdatePageRequest(name = name, description = description)); Unit }

    suspend fun follow(id: String): ApiResult<Unit> =
        safeApiCall { api.followPage(id); Unit }

    suspend fun unfollow(id: String): ApiResult<Unit> =
        safeApiCall { api.unfollowPage(id); Unit }

    suspend fun posts(id: String): ApiResult<PagePostsListResponse> =
        safeApiCall { api.pagePosts(id) }

    suspend fun createPost(id: String, content: String, media: String? = null): ApiResult<CreatePagePostResponse> =
        safeApiCall { api.createPagePost(id, CreatePagePostRequest(content = content, media = media)) }
}

/**
 * Repository for v1 media recording (R2 upload pattern).
 */
@Singleton
class MediaRepositoryV1 @Inject constructor(
    private val api: ZarudaApiV1,
) {
    suspend fun record(objectKey: String, mediaType: String, fileSize: Int? = null, mimeType: String? = null, postId: String? = null): ApiResult<RecordMediaUploadResponse> =
        safeApiCall { api.recordMediaUpload(RecordMediaUploadRequest(object_key = objectKey, media_type = mediaType, file_size = fileSize, mime_type = mimeType, post_id = postId)) }

    suspend fun detail(id: String): ApiResult<MediaDetailResponse> =
        safeApiCall { api.mediaDetail(id) }

    suspend fun delete(id: String): ApiResult<Unit> =
        safeApiCall { api.deleteMedia(id); Unit }
}

/**
 * Repository for v1 full-text search across products, posts, pages, and users.
 */
@Singleton
class SearchRepositoryV1 @Inject constructor(
    private val api: ZarudaApiV1,
) {
    suspend fun products(
        query: String,
        category: String? = null,
        minPrice: Double? = null,
        maxPrice: Double? = null,
        page: Int = 1,
        limit: Int = 20,
    ): ApiResult<SearchProductsResponse> =
        safeApiCall { api.searchProducts(query, category, minPrice, maxPrice, page, limit) }

    suspend fun posts(query: String, page: Int = 1, limit: Int = 20): ApiResult<SearchPostsResponse> =
        safeApiCall { api.searchPosts(query, page, limit) }

    suspend fun pages(query: String, page: Int = 1, limit: Int = 20): ApiResult<SearchPagesResponse> =
        safeApiCall { api.searchPages(query, page, limit) }

    suspend fun users(query: String, page: Int = 1, limit: Int = 20): ApiResult<SearchUsersResponse> =
        safeApiCall { api.searchUsers(query, page, limit) }
}

/**
 * Repository for v1 payment refunds.
 */
@Singleton
class RefundRepositoryV1 @Inject constructor(
    private val api: ZarudaApiV1,
) {
    suspend fun list(): ApiResult<RefundsListResponse> = safeApiCall { api.refunds() }

    suspend fun request(transactionId: String, amount: Double, reason: String? = null): ApiResult<RequestRefundResponse> =
        safeApiCall { api.requestRefund(RequestRefundRequest(transaction_id = transactionId, amount = amount, reason = reason)) }

    suspend fun detail(id: String): ApiResult<RefundDetailResponse> =
        safeApiCall { api.refundDetail(id) }
}

/**
 * Repository for v1 seller settlement summaries.
 */
@Singleton
class SettlementRepositoryV1 @Inject constructor(
    private val api: ZarudaApiV1,
) {
    suspend fun list(): ApiResult<SettlementsListResponse> = safeApiCall { api.settlements() }

    suspend fun current(): ApiResult<CurrentSettlementResponse> = safeApiCall { api.currentSettlement() }

    suspend fun detail(id: String): ApiResult<SettlementDetailResponse> =
        safeApiCall { api.settlementDetail(id) }
}

@Singleton
class PurchaseReviewRepositoryV1 @Inject constructor(
    private val api: ZarudaApiV1,
) {
    suspend fun submitReview(body: PurchaseReviewRequestV1): ApiResult<MessageResponse> =
        safeApiCall { api.purchaseReview(body) }

    suspend fun getUserSoldPosts(
        userId: String,
        category: String? = null,
        page: Int = 1,
        limit: Int = 20,
    ): ApiResult<UserSoldPostsResponseV1> = safeApiCall {
        api.getUserSoldPosts(userId = userId, category = category, page = page, limit = limit)
    }
}
