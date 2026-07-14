package com.mhub.app.data.repository

import android.util.Base64
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
import com.mhub.app.data.remote.dto.RefreshTokenRequest
import com.mhub.app.data.remote.dto.VerifyOtpRequest
import com.mhub.app.data.remote.dto.AuthResponse
import com.mhub.app.data.remote.dto.AadhaarOtpResponse
import com.mhub.app.data.remote.dto.AadhaarVerifyResponse
import com.mhub.app.data.local.db.PostDao
import com.mhub.app.data.local.db.CategoryDao
import com.mhub.app.data.local.db.WishlistItemDao
import com.mhub.app.data.local.db.CartItemDao
import com.mhub.app.domain.model.User
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withTimeout
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: MhubApi,
    private val tokenStore: TokenStore,
    private val postDao: PostDao,
    private val categoryDao: CategoryDao,
    private val wishlistItemDao: WishlistItemDao,
    private val cartItemDao: CartItemDao,
) {
    val isAuthenticated: Flow<Boolean> = tokenStore.accessToken.map { token ->
        !token.isNullOrBlank() && (tokenStore.isDemoSession || !JwtHelper.isExpired(token, bufferSeconds = 10))
    }
    val isCurrentlyAuthenticated: Boolean get() = tokenStore.isAuthenticated
    /** True if a token string is stored, regardless of whether it is expired. */
    val hasSession: Boolean get() = tokenStore.hasSession
    /** True if the stored token is a local demo session (not a real server-issued token). */
    val isDemoSession: Boolean get() = tokenStore.isDemoSession
    val accessTokenFlow: StateFlow<String?> = tokenStore.accessToken

    suspend fun startLocalDemoSession() {
        val nowSec = System.currentTimeMillis() / 1000
        val header = JSONObject()
            .put("alg", "none")
            .put("typ", "JWT")
            .toString()
        val payload = JSONObject()
            .put("sub", "demo_user")
            .put("id", "demo_user")
            .put("userId", "demo_user")
            .put("role", "user")
            .put("name", "Demo User")
            .put("email", "demo@mhub.local")
            .put("exp", nowSec + 30L * 24 * 60 * 60)
            .toString()
        val token = "${header.toBase64Url()}.${payload.toBase64Url()}.demo"
        tokenStore.save(token, "local-demo-refresh-token")
    }

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

    /** Verify OTP after login challenge — calls POST /api/auth/verify-otp. */
    suspend fun verifyLoginOtp(phone: String, otp: String): ApiResult<AuthResponse> = safeApiCall {
        runCatching { api.csrfToken() }
        val res = api.verifyOtp(VerifyOtpRequest(phone = phone, otp = otp))
        if (res.token != null) {
            tokenStore.save(res.token, res.refreshToken)
        }
        res
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
        // Clear all user-specific Room DB caches so a different user won't see stale data
        postDao.clearAll()
        categoryDao.clearAll()
        wishlistItemDao.clearAll()
        cartItemDao.clearAll()
        Unit
    }

    /** Proactively refresh an expired access token using the stored refresh token.
     *  Retries once on failure with a 2-second delay to handle transient server/network issues.
     *  Uses the latest refresh token on retry to avoid stale-token race conditions with the
     *  TokenRefreshAuthenticator (which runs on the OkHttp thread pool). */
    suspend fun tryRefreshToken(): Boolean {
        // Short-circuit: token is already valid (within 10s buffer)
        if (isCurrentlyAuthenticated) return true

        val refreshToken = tokenStore.refreshTokenImmediate() ?: return false
        return try {
            val res = api.refreshToken(RefreshTokenRequest(refreshToken))
            val newToken = res.token ?: return false
            tokenStore.save(newToken, res.refreshToken)
            true
        } catch (_: Exception) {
            // Check if another thread (TokenRefreshAuthenticator) already refreshed
            if (isCurrentlyAuthenticated) return true

            // Retry once — use LATEST refresh token to avoid races with authenticator
            try {
                kotlinx.coroutines.delay(2000)
                // Re-read refresh token — may have changed if authenticator succeeded
                val latestRefresh = tokenStore.refreshTokenImmediate() ?: return false
                val res = api.refreshToken(RefreshTokenRequest(latestRefresh))
                val newToken = res.token ?: return false
                tokenStore.save(newToken, res.refreshToken)
                true
            } catch (_: Exception) {
                false
            }
        }
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

    /** Quick health check with short timeout to determine if server is reachable. */
    suspend fun isServerReachable(): Boolean = try {
        kotlinx.coroutines.withTimeout(4000L) {
            api.health()
            true
        }
    } catch (_: Exception) {
        false
    }

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

private fun String.toBase64Url(): String =
    Base64.encodeToString(toByteArray(Charsets.UTF_8), Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)

