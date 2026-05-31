package com.mhub.app.ui.auth

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.core.JwtHelper
import com.mhub.app.data.repository.AuthRepository
import com.mhub.app.ui.common.InputValidators
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

    private data class DemoCredential(val identifier: String, val password: String)

    private val demoCredentialCandidates = if (com.mhub.app.BuildConfig.DEBUG) {
        listOf(
            DemoCredential(identifier = "rahul.sharma@mhub.com", password = "Password123!"),
            DemoCredential(identifier = "user1", password = "Password123!"),
        )
    } else {
        emptyList()
    }

    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    val isAuthenticated: StateFlow<Boolean> =
        repo.isAuthenticated.stateIn(viewModelScope, SharingStarted.Eagerly, repo.isCurrentlyAuthenticated)

    /** True if a token string is present (regardless of expiry). Used for startDestination. */
    val hasSession: Boolean get() = repo.hasSession

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

    /** Quick demo login — uses hardcoded test credentials. Fails with error if server unreachable. */
    fun demoLogin() {
        if (_state.value.loading) return
        _state.value = AuthUiState(loading = true)
        viewModelScope.launch {
            Log.d(TAG, "demoLogin invoked")

            // Try real server credentials first
            for (credential in demoCredentialCandidates) {
                when (val res = repo.signInWithEmail(credential.identifier, credential.password)) {
                    is ApiResult.Success -> {
                        Log.d(TAG, "demoLogin credential success for ${credential.identifier}")
                        val authRes = res.data
                        if (authRes.requireOtp) {
                            _state.value = AuthUiState(
                                loading = false,
                                requireOtp = true,
                                otpPhone = credential.identifier,
                                otpCountdown = 120,
                            )
                            startOtpCountdown()
                        } else {
                            _state.value = AuthUiState(loading = false, success = true)
                        }
                        return@launch
                    }
                    is ApiResult.Failure -> {
                        Log.w(TAG, "demoLogin credential failed for ${credential.identifier}: ${res.error.message}")
                    }
                }
            }

            // All credentials failed — show the actual error
            _state.value = AuthUiState(loading = false, error = "Cannot connect to server. Please check your internet connection.")
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
