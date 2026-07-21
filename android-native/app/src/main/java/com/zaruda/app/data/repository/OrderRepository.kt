package com.zaruda.app.data.repository

import com.zaruda.app.core.ApiResult
import com.zaruda.app.core.safeApiCall
import com.zaruda.app.data.remote.MhubApi
import com.zaruda.app.data.remote.dto.CreateOrderRequest
import com.zaruda.app.data.remote.dto.CreateOrderResponse
import com.zaruda.app.data.remote.dto.InitiateSaleRequest
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OrderRepository @Inject constructor(private val api: MhubApi) {

    /** Last placed order — kept in memory for confirmation screen. */
    var lastOrder: CreateOrderResponse? = null
        private set

    suspend fun placeOrder(request: CreateOrderRequest): ApiResult<CreateOrderResponse> {
        // Try the orders endpoint first; fall back to transactions/initiate
        val result = safeApiCall { api.createOrder(request) }
        if (result is ApiResult.Success) {
            lastOrder = result.data
            return result
        }
        // Fallback: use existing initiateSale endpoint
        val fallback = safeApiCall {
            api.initiateSale(
                InitiateSaleRequest(
                    postId = request.postId,
                    buyerId = request.buyerId,
                    agreedPrice = request.amount,
                ),
            )
        }
        return when (fallback) {
            is ApiResult.Success -> {
                val txnId = fallback.data.transaction?.transactionId ?: "MH-${System.currentTimeMillis()}"
                val mapped = CreateOrderResponse(
                    success = true,
                    orderId = txnId,
                    transactionId = txnId,
                    message = fallback.data.message,
                )
                lastOrder = mapped
                ApiResult.Success(mapped)
            }
            is ApiResult.Failure -> ApiResult.Failure(fallback.error)
        }
    }
}
