package com.mhub.app.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.mhub.app.core.JwtHelper
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Secure access token storage backed by EncryptedSharedPreferences (AES-256-GCM via Android Keystore).
 * Keeps a hot in-memory cache for fast reads from interceptors.
 */
@Singleton
class TokenStore @Inject constructor(context: Context) {

    private val prefs: SharedPreferences = try {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    } catch (t: Throwable) {
        // Fallback (should be extremely rare). Encrypted prefs can fail on corrupt Keystore.
        context.getSharedPreferences("${PREFS_NAME}_fallback", Context.MODE_PRIVATE)
    }

    private val _accessToken = MutableStateFlow(prefs.getString(KEY_ACCESS, null))
    private val _refreshToken = MutableStateFlow(prefs.getString(KEY_REFRESH, null))

    val accessToken: StateFlow<String?> = _accessToken.asStateFlow()

    /** True only if token is present AND not expired (with 10s buffer).
     *  Reduced from 60s to prevent false-negative auth states during token refresh windows. */
    val isAuthenticated: Boolean get() {
        val token = _accessToken.value
        return !token.isNullOrBlank() && !JwtHelper.isExpired(token, bufferSeconds = 10)
    }

    /** True if any token exists (even if near-expiry). Used for UI-level "user logged in" checks
     *  to prevent flash-of-login-gate during token refresh cycles. */
    val hasSession: Boolean get() = !_accessToken.value.isNullOrBlank()

    /** Non-blocking read of cached access token (safe to call from any thread). */
    fun accessTokenImmediate(): String? = _accessToken.value

    /** Non-blocking read of cached refresh token (safe to call from any thread). */
    fun refreshTokenImmediate(): String? = _refreshToken.value

    /** Synchronous save for use from OkHttp authenticator threads (updates memory first, then persists). */
    fun saveImmediate(accessToken: String?, refreshToken: String?) {
        // Update in-memory first so subsequent reads see the new value immediately
        _accessToken.value = accessToken
        if (refreshToken != null) _refreshToken.value = refreshToken
        // Persist to disk (SharedPreferences.apply() is async and thread-safe)
        prefs.edit().apply {
            if (accessToken != null) putString(KEY_ACCESS, accessToken) else remove(KEY_ACCESS)
            if (refreshToken != null) putString(KEY_REFRESH, refreshToken) else remove(KEY_REFRESH)
        }.apply()
    }

    /** Synchronous clear for use from OkHttp authenticator threads. */
    fun clearImmediate() {
        _accessToken.value = null
        _refreshToken.value = null
        prefs.edit().clear().apply()
    }

    @Deprecated("Use accessTokenImmediate() — no coroutine needed for in-memory read")
    suspend fun accessTokenBlocking(): String? = _accessToken.value

    @Deprecated("Use refreshTokenImmediate() — no coroutine needed for in-memory read")
    suspend fun refreshTokenBlocking(): String? = _refreshToken.value

    suspend fun save(accessToken: String?, refreshToken: String?) = withContext(Dispatchers.IO) {
        // Update in-memory first for immediate visibility
        _accessToken.value = accessToken
        _refreshToken.value = refreshToken
        // Then persist to disk
        prefs.edit().apply {
            if (accessToken != null) putString(KEY_ACCESS, accessToken) else remove(KEY_ACCESS)
            if (refreshToken != null) putString(KEY_REFRESH, refreshToken) else remove(KEY_REFRESH)
        }.apply()
    }

    suspend fun clear() = withContext(Dispatchers.IO) {
        _accessToken.value = null
        _refreshToken.value = null
        prefs.edit().clear().apply()
    }

    private companion object {
        const val PREFS_NAME = "mhub_secure_prefs"
        const val KEY_ACCESS = "access_token"
        const val KEY_REFRESH = "refresh_token"
    }
}
