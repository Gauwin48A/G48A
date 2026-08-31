package com.zaruda.app.ui.auth

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.core.ApiResult
import com.zaruda.app.core.JwtHelper
import com.zaruda.app.data.repository.AuthRepository
import com.zaruda.app.ui.common.InputValidators
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
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

    private companion object {
        const val TAG = "AuthViewModel"
    }

    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    val isAuthenticated: StateFlow<Boolean> =
        repo.isAuthenticated.stateIn(viewModelScope, SharingStarted.Eagerly, repo.isCurrentlyAuthenticated)

    /** True if a token string is present (regardless of expiry). Used for startDestination. */
    val hasSession: Boolean get() = repo.hasSession
    /** True if the stored session is a local demo session (no real JWT issued by the server). */
    val isDemoSession: Boolean get() = repo.isDemoSession

    init {
        // On startup, if a session exists but the access token is expired, proactively refresh.
        // This prevents the app from landing on the login screen just because a short-lived
        // access token expired while the app was in the background.
        if (repo.hasSession && !repo.isCurrentlyAuthenticated) {
            viewModelScope.launch {
                repo.tryRefreshToken()
                // isAuthenticated flow will auto-update when tokenStore.accessToken changes
            }
        }
    }

    val isAdmin: StateFlow<Boolean> =
        repo.accessTokenFlow.map { token ->
            val role = JwtHelper.extractClaim(token, "role")
            role == "admin" || role == "super_admin"
        }.stateIn(viewModelScope, SharingStarted.Eagerly, false)

    val currentUserId: StateFlow<String?> =
        repo.accessTokenFlow.map { token ->
            JwtHelper.extractClaim(token, "userId") ?: JwtHelper.extractClaim(token, "id")
        }.stateIn(viewModelScope, SharingStarted.Eagerly, null)

    fun clearError() { _state.value = _state.value.copy(error = null) }
    fun setError(msg: String) { _state.value = _state.value.copy(error = msg, loading = false) }

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
        if (_state.value.loading) return
        val phone = _state.value.otpPhone
        if (phone.isBlank()) return
        _state.value = _state.value.copy(loading = true)
        viewModelScope.launch {
            runCatching { repo.sendLoginOtp(phone) }
            _state.value = _state.value.copy(loading = false, otpCountdown = 120)
            startOtpCountdown()
        }
    }

    fun cancelOtp() {
        _state.value = AuthUiState()
    }

    fun verifyLoginOtp(phone: String, otp: String) {
        if (_state.value.loading) return
        if (otp.length != 6) { _state.value = _state.value.copy(error = "Enter 6-digit OTP"); return }
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val res = repo.verifyLoginOtp(phone, otp)) {
                is ApiResult.Success -> _state.value = AuthUiState(loading = false, success = true)
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = res.error.message)
            }
        }
    }

    /** Quick demo login — immediately creates a local offline demo session without server attempts. */
    fun demoLogin() {
        if (_state.value.loading) return
        _state.value = AuthUiState(loading = true)
        viewModelScope.launch {
            Log.d(TAG, "demoLogin invoked")

            // Skip server credential attempts — directly create a local demo session
            // This is instant and avoids slow timeouts when the backend is not running.
            repo.startLocalDemoSession()
            _state.value = AuthUiState(loading = false, success = true)
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
            when (val res = repo.panVerify(token, pan)) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, signupStep = 4, panVerified = true)
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = res.error.message)
            }
        }
    }

    fun skipPan() {
        _state.value = _state.value.copy(signupStep = 4)
    }

    fun completeAadhaarSignup(email: String, password: String, confirmPassword: String, pan: String?, referral: String?) {
        val token = _state.value.signupToken
        if (token == null) { _state.value = _state.value.copy(error = "Signup token missing"); return }
        if (password.length < 12) { _state.value = _state.value.copy(error = "Password must be at least 12 characters"); return }
        if (password != confirmPassword) { _state.value = _state.value.copy(error = "Passwords don't match"); return }
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val res = repo.completeAadhaarSignup(token, password, email, pan, referral)) {
                is ApiResult.Success -> _state.value = _state.value.copy(loading = false, success = true)
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = res.error.message)
            }
        }
    }

    fun resetSignupStep() {
        _state.value = AuthUiState(signupStep = 1)
    }

    // signUp removed — SignUpScreen uses the Aadhaar 4-step flow instead

    fun logout() {
        viewModelScope.launch { repo.logout() }
    }

    /**
     * Proactively refresh the access token if it is expired.
     * Safe to call from any screen (e.g., before navigation to content screens).
     * Returns immediately; the actual refresh runs in the background.
     */
    fun tryRefreshToken() {
        viewModelScope.launch { repo.tryRefreshToken() }
    }
}
