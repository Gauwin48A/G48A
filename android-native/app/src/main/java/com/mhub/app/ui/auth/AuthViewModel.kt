package com.mhub.app.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.AuthRepository
import com.mhub.app.ui.common.InputValidators
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val success: Boolean = false,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val repo: AuthRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    val isAuthenticated: StateFlow<Boolean> =
        repo.isAuthenticated.stateIn(viewModelScope, SharingStarted.Eagerly, false)

    fun clearError() { _state.value = _state.value.copy(error = null) }

    fun signInWithGoogle(idToken: String) {
        if (_state.value.loading) return
        _state.value = AuthUiState(loading = true)
        viewModelScope.launch {
            when (val res = repo.signInWithGoogle(idToken)) {
                is ApiResult.Success -> _state.value = AuthUiState(loading = false, success = true)
                is ApiResult.Failure -> _state.value = AuthUiState(loading = false, error = res.error.message)
            }
        }
    }

    fun signInWithEmail(identifier: String, password: String) {
        if (_state.value.loading) return
        if (identifier.isBlank() || password.isBlank()) {
            _state.value = AuthUiState(error = "Email/phone and password are required")
            return
        }
        if (!InputValidators.isValidEmailOrPhone(identifier)) {
            _state.value = AuthUiState(error = "Enter a valid email or 10-digit phone number")
            return
        }
        if (!InputValidators.isStrongPassword(password)) {
            _state.value = AuthUiState(error = "Password must be at least 8 characters")
            return
        }
        _state.value = AuthUiState(loading = true)
        viewModelScope.launch {
            when (val res = repo.signInWithEmail(identifier, password)) {
                is ApiResult.Success -> _state.value = AuthUiState(loading = false, success = true)
                is ApiResult.Failure -> _state.value = AuthUiState(loading = false, error = res.error.message)
            }
        }
    }

    fun signUp(fullName: String, email: String, phone: String, password: String) {
        if (_state.value.loading) return
        if (fullName.isBlank() || email.isBlank() || phone.isBlank() || password.isBlank()) {
            _state.value = AuthUiState(error = "All fields are required")
            return
        }
        if (!InputValidators.isValidFullName(fullName)) {
            _state.value = AuthUiState(error = "Enter a full name (2-60 characters)")
            return
        }
        if (!InputValidators.isValidEmail(email)) {
            _state.value = AuthUiState(error = "Enter a valid email address")
            return
        }
        if (!InputValidators.isValidPhone(phone)) {
            _state.value = AuthUiState(error = "Enter a valid 10-digit phone number")
            return
        }
        if (!InputValidators.isStrongPassword(password)) {
            _state.value = AuthUiState(error = "Password must be at least 8 characters")
            return
        }
        _state.value = AuthUiState(loading = true)
        viewModelScope.launch {
            when (val res = repo.signUp(fullName, email, phone, password)) {
                is ApiResult.Success -> _state.value = AuthUiState(loading = false, success = true)
                is ApiResult.Failure -> _state.value = AuthUiState(loading = false, error = res.error.message)
            }
        }
    }

    fun onGoogleError(message: String) {
        _state.value = AuthUiState(loading = false, error = message)
    }

    fun logout() {
        viewModelScope.launch { repo.logout() }
    }
}
