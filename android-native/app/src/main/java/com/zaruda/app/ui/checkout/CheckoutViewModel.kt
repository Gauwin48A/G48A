package com.zaruda.app.ui.checkout

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.CreateOrderRequest
import com.zaruda.app.data.remote.dto.CreateOrderResponse
import com.zaruda.app.data.repository.AuthRepository
import com.zaruda.app.data.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CheckoutUiState(
    val savedName: String = "",
    val savedPhone: String = "",
    val savedAddress: String = "",
    val address: String = "",
    val recipientName: String = "",
    val recipientPhone: String = "",
    val paymentMethod: String = "UPI",
    val placing: Boolean = false,
    val orderId: String? = null,
    val orderNumber: String? = null,
    val handoverOtp: String? = null,
    val error: String? = null,
    val placed: Boolean = false,
)

@HiltViewModel
class CheckoutViewModel @Inject constructor(
    private val orderRepo: OrderRepository,
    private val authRepo: AuthRepository,
    private val savedState: SavedStateHandle,
    private val analytics: com.zaruda.app.core.AnalyticsHelper,
    private val crashlytics: com.zaruda.app.core.CrashlyticsHelper,
) : ViewModel() {
    private val _state = MutableStateFlow(CheckoutUiState())
    val state: StateFlow<CheckoutUiState> = _state.asStateFlow()

    init {
        loadUserProfile()
    }

    private fun loadUserProfile() {
        viewModelScope.launch {
            when (val userRes = authRepo.me()) {
                is ApiResult.Success -> {
                    val user = userRes.data
                    val addr = user.address ?: user.location ?: ""
                    _state.value = _state.value.copy(
                        savedName = user.displayName ?: "",
                        savedPhone = user.phone ?: "",
                        savedAddress = addr,
                        recipientName = user.displayName ?: "",
                        recipientPhone = user.phone ?: "",
                        address = addr,
                    )
                }
                is ApiResult.Failure -> {}
            }
        }
    }

    fun setAddress(address: String) {
        _state.value = _state.value.copy(address = address)
    }

    fun setDeliveryDetails(name: String, phone: String, address: String) {
        _state.value = _state.value.copy(
            recipientName = name,
            recipientPhone = phone,
            address = address,
        )
    }

    fun setPaymentMethod(method: String) {
        _state.value = _state.value.copy(paymentMethod = method)
    }

    fun placeOrder(subtotal: Double) {
        if (_state.value.placing) return
        viewModelScope.launch {
            _state.value = _state.value.copy(placing = true, error = null)
            val request = CreateOrderRequest(
                postId = savedState.get<String>("postId") ?: "cart",
                buyerId = savedState.get<String>("buyerId") ?: "me",
                addressId = _state.value.address,
                paymentMethod = _state.value.paymentMethod,
                amount = subtotal,
            )
            when (val result = orderRepo.placeOrder(request)) {
                is ApiResult.Success -> {
                    val orderId = result.data.orderId ?: "order_${System.currentTimeMillis()}"
                    val orderNum = result.data.orderNumber ?: result.data.transactionId ?: orderId
                    val otp = result.data.handoverOtp
                    analytics.logOrderCompleted(orderId, subtotal)
                    crashlytics.logBreadcrumb("CHECKOUT", "Order placed successfully: $orderId ($orderNum)")
                    _state.value = _state.value.copy(
                        placing = false,
                        placed = true,
                        orderId = orderId,
                        orderNumber = orderNum,
                        handoverOtp = otp,
                    )
                }
                is ApiResult.Failure -> {
                    val errorMsg = result.error.message
                    crashlytics.logApiError(result.error, "CHECKOUT", "Failed to place order for amount $subtotal")
                    analytics.logError("ORDER_FAILURE", errorMsg)
                    _state.value = _state.value.copy(
                        placing = false,
                        error = errorMsg,
                    )
                }
            }
        }
    }

    fun resetError() {
        _state.value = _state.value.copy(error = null)
    }
}
