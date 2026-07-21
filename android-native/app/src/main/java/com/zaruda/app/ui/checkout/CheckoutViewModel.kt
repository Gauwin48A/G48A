package com.zaruda.app.ui.checkout

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.CreateOrderRequest
import com.zaruda.app.data.remote.dto.CreateOrderResponse
import com.zaruda.app.data.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CheckoutUiState(
    val address: String = "",
    val paymentMethod: String = "UPI",
    val placing: Boolean = false,
    val orderId: String? = null,
    val error: String? = null,
    val placed: Boolean = false,
)

@HiltViewModel
class CheckoutViewModel @Inject constructor(
    private val orderRepo: OrderRepository,
    private val savedState: SavedStateHandle,
) : ViewModel() {
    private val _state = MutableStateFlow(CheckoutUiState())
    val state: StateFlow<CheckoutUiState> = _state.asStateFlow()

    fun setAddress(address: String) {
        _state.value = _state.value.copy(address = address)
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
                    _state.value = _state.value.copy(
                        placing = false,
                        placed = true,
                        orderId = result.data.orderId,
                    )
                }
                is ApiResult.Failure -> {
                    _state.value = _state.value.copy(
                        placing = false,
                        error = result.error.message ?: "Order failed. Please try again.",
                    )
                }
            }
        }
    }

    fun resetError() {
        _state.value = _state.value.copy(error = null)
    }
}
