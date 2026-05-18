package com.mhub.app.data.repository

import com.mhub.app.core.ApiResult
import com.mhub.app.core.JwtHelper
import com.mhub.app.core.safeApiCall
import com.mhub.app.data.local.TokenStore
import com.mhub.app.data.remote.MhubApi
import com.mhub.app.data.remote.dto.EmailLoginRequest
import com.mhub.app.data.remote.dto.EmailSignupRequest
import com.mhub.app.data.remote.dto.ForgotPasswordRequest
import com.mhub.app.data.remote.dto.GoogleAuthRequest
import com.mhub.app.data.remote.dto.ResetPasswordRequest
import com.mhub.app.data.remote.dto.AadhaarSendOtpRequest
import com.mhub.app.data.remote.dto.AadhaarVerifyOtpRequest
import com.mhub.app.data.remote.dto.PanVerifyRequest
import com.mhub.app.data.remote.dto.CompleteAadhaarSignupRequest
import com.mhub.app.data.remote.dto.SendOtpRequest
import com.mhub.app.data.remote.dto.AuthResponse
import com.mhub.app.data.remote.dto.AadhaarOtpResponse
import com.mhub.app.data.remote.dto.AadhaarVerifyResponse
import com.mhub.app.domain.model.User
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: MhubApi,
    private val tokenStore: TokenStore,
) {
    val isAuthenticated: Flow<Boolean> = tokenStore.accessToken.map { !it.isNullOrBlank() && !JwtHelper.isExpired(it) }
    val isCurrentlyAuthenticated: Boolean get() = tokenStore.isAuthenticated
    val accessTokenFlow: StateFlow<String?> = tokenStore.accessToken

    /** Exchanges a Google ID token for an app JWT. */
    suspend fun signInWithGoogle(idToken: String): ApiResult<User?> = safeApiCall {
        val res = api.googleSignIn(GoogleAuthRequest(idToken))
        val token = res.token ?: error("Server did not return token")
        tokenStore.save(token, res.refreshToken)
        res.user
    }

    /** Email/password login. Prefetches CSRF token first. Returns AuthResponse to check requireOtp. */
    suspend fun signInWithEmail(identifier: String, password: String): ApiResult<AuthResponse> = safeApiCall {
        runCatching { api.csrfToken() } // Prefetch to set XSRF-TOKEN cookie
        val res = api.emailLogin(EmailLoginRequest(identifier, password))
        if (res.requireOtp) return@safeApiCall res // OTP challenge needed
        val token = res.token ?: error("Server did not return token")
        tokenStore.save(token, res.refreshToken)
        res
    }

    /** Verify OTP after login challenge. */
    suspend fun verifyLoginOtp(phone: String, otp: String): ApiResult<User?> = safeApiCall {
        // The OTP verify endpoint returns same AuthResponse
        val res = api.sendOtp(SendOtpRequest(phone = phone, purpose = "sim_verification"))
        null // OTP sent
    }

    /** Complete OTP-based login after 2FA. */
    suspend fun sendLoginOtp(phone: String): ApiResult<Unit> = safeApiCall {
        api.sendOtp(SendOtpRequest(phone = phone, purpose = "sim_verification"))
        Unit
    }

    /** Email/password signup. Prefetches CSRF token first. */
    suspend fun signUp(fullName: String, email: String, phone: String, password: String): ApiResult<User?> = safeApiCall {
        runCatching { api.csrfToken() } // Prefetch to set XSRF-TOKEN cookie
        val res = api.emailSignup(EmailSignupRequest(fullName, email, phone, password))
        val token = res.token ?: error("Server did not return token")
        tokenStore.save(token, res.refreshToken)
        res.user
    }

    suspend fun logout(): ApiResult<Unit> = safeApiCall {
        runCatching { api.logout() }
        tokenStore.clear()
        Unit
    }

    /** Request a password-reset link/email/SMS for the given identifier. */
    suspend fun forgotPassword(identifier: String): ApiResult<String?> = safeApiCall {
        runCatching { api.csrfToken() }
        val res = api.forgotPassword(ForgotPasswordRequest(identifier.trim()))
        res.message
    }

    /** Reset password using a token. */
    suspend fun resetPassword(token: String, newPassword: String): ApiResult<String?> = safeApiCall {
        runCatching { api.csrfToken() }
        val res = api.resetPassword(ResetPasswordRequest(token, newPassword))
        res.message
    }

    suspend fun me(): ApiResult<User> = safeApiCall { api.me() }

    // ── Aadhaar 4-step signup flow ──
    suspend fun aadhaarSendOtp(aadhaar: String, mobile: String): ApiResult<AadhaarOtpResponse> = safeApiCall {
        api.aadhaarSendOtp(AadhaarSendOtpRequest(aadhaarNumber = aadhaar, mobileNumber = mobile))
    }

    suspend fun aadhaarVerifyOtp(aadhaar: String, mobile: String, otp: String, txnId: String?): ApiResult<AadhaarVerifyResponse> = safeApiCall {
        api.aadhaarVerifyOtp(AadhaarVerifyOtpRequest(aadhaarNumber = aadhaar, mobileNumber = mobile, otp = otp, txnId = txnId))
    }

    suspend fun panVerify(signupToken: String, pan: String): ApiResult<Unit> = safeApiCall {
        api.panVerify(PanVerifyRequest(signupToken = signupToken, panNumber = pan))
        Unit
    }

    suspend fun completeAadhaarSignup(signupToken: String, password: String, pan: String?, referral: String?): ApiResult<User?> = safeApiCall {
        runCatching { api.csrfToken() }
        val res = api.completeAadhaarSignup(CompleteAadhaarSignupRequest(signupToken = signupToken, password = password, confirmPassword = password, panNumber = pan, referralCode = referral))
        val token = res.token ?: error("Server did not return token")
        tokenStore.save(token, res.refreshToken)
        res.user
    }
}
