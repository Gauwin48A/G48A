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
    // OTP 2FA challenge
    val requireOtp: Boolean = false,
    val otpPhone: String = "",
    val otpCountdown: Int = 0,
    // Aadhaar 4-step signup
    val signupStep: Int = 1,  // 1=Aadhaar, 2=OTP, 3=PAN, 4=Password
    val signupToken: String? = null,
    val txnId: String? = null,
    val aadhaarVerified: Boolean = false,
    val panVerified: Boolean = false,
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
                is ApiResult.Success -> {
                    val authRes = res.data
                    if (authRes.requireOtp) {
                        _state.value = AuthUiState(loading = false, requireOtp = true, otpPhone = identifier, otpCountdown = 120)
                        startOtpCountdown()
                    } else {
                        _state.value = AuthUiState(loading = false, success = true)
                    }
                }
                is ApiResult.Failure -> _state.value = AuthUiState(loading = false, error = res.error.message)
            }
        }
    }

    fun sendOtp() {
        val phone = _state.value.otpPhone
        if (phone.isBlank()) return
        viewModelScope.launch {
            repo.sendLoginOtp(phone)
            _state.value = _state.value.copy(otpCountdown = 120)
            startOtpCountdown()
        }
    }

    fun cancelOtp() {
        _state.value = AuthUiState()
    }

    /** Quick demo login — bypasses validation, uses hardcoded test credentials. */
    fun demoLogin() {
        if (_state.value.loading) return
        _state.value = AuthUiState(loading = true)
        viewModelScope.launch {
            when (val res = repo.signInWithEmail("9876543210", "Testing123")) {
                is ApiResult.Success -> {
                    val authRes = res.data
                    if (authRes.requireOtp) {
                        _state.value = AuthUiState(loading = false, requireOtp = true, otpPhone = "9876543210", otpCountdown = 120)
                        startOtpCountdown()
                    } else {
                        _state.value = AuthUiState(loading = false, success = true)
                    }
                }
                is ApiResult.Failure -> _state.value = AuthUiState(loading = false, error = "Demo login failed: ${res.error.message}")
            }
        }
    }

    private fun startOtpCountdown() {
        viewModelScope.launch {
            var count = _state.value.otpCountdown
            while (count > 0) {
                kotlinx.coroutines.delay(1000)
                count--
                if (_state.value.requireOtp) {
                    _state.value = _state.value.copy(otpCountdown = count)
                } else break
            }
        }
    }

    // ── Aadhaar 4-step signup flow ──
    fun aadhaarSendOtp(aadhaar: String, mobile: String) {
        if (_state.value.loading) return
        if (aadhaar.length != 12 || !aadhaar.all { it.isDigit() }) {
            _state.value = _state.value.copy(error = "Enter a valid 12-digit Aadhaar number")
            return
        }
        if (mobile.length != 10) {
            _state.value = _state.value.copy(error = "Enter a valid 10-digit mobile number")
            return
        }
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.aadhaarSendOtp(aadhaar, mobile)) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, signupStep = 2, txnId = r.data.txnId)
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
            }
        }
    }

    fun aadhaarVerifyOtp(aadhaar: String, mobile: String, otp: String) {
        if (_state.value.loading) return
        if (otp.length != 6) { _state.value = _state.value.copy(error = "Enter 6-digit OTP"); return }
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = repo.aadhaarVerifyOtp(aadhaar, mobile, otp, _state.value.txnId)) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, signupStep = 3, signupToken = r.data.signupToken, aadhaarVerified = true)
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
            }
        }
    }

    fun panVerify(pan: String) {
        val token = _state.value.signupToken
        if (token == null) { _state.value = _state.value.copy(error = "Signup token missing"); return }
        if (!pan.matches(Regex("[A-Z]{5}[0-9]{4}[A-Z]"))) { _state.value = _state.value.copy(error = "Invalid PAN format (e.g. ABCDE1234F)"); return }
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (repo.panVerify(token, pan)) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, signupStep = 4, panVerified = true)
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = "PAN verification failed")
            }
        }
    }

    fun skipPan() {
        _state.value = _state.value.copy(signupStep = 4)
    }

    fun completeAadhaarSignup(password: String, confirmPassword: String, pan: String?, referral: String?) {
        val token = _state.value.signupToken
        if (token == null) { _state.value = _state.value.copy(error = "Signup token missing"); return }
        if (password.length < 12) { _state.value = _state.value.copy(error = "Password must be at least 12 characters"); return }
        if (password != confirmPassword) { _state.value = _state.value.copy(error = "Passwords don't match"); return }
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (repo.completeAadhaarSignup(token, password, pan, referral)) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, success = true)
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = "Signup failed")
            }
        }
    }

    fun resetSignupStep() {
        _state.value = AuthUiState(signupStep = 1)
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
