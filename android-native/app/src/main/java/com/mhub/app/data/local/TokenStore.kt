package com.mhub.app.data.local

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
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
    val isAuthenticated: Boolean get() = !_accessToken.value.isNullOrBlank()

    suspend fun accessTokenBlocking(): String? = withContext(Dispatchers.IO) { _accessToken.value }
    suspend fun refreshTokenBlocking(): String? = withContext(Dispatchers.IO) { _refreshToken.value }

    suspend fun save(accessToken: String?, refreshToken: String?) = withContext(Dispatchers.IO) {
        prefs.edit().apply {
            if (accessToken != null) putString(KEY_ACCESS, accessToken) else remove(KEY_ACCESS)
            if (refreshToken != null) putString(KEY_REFRESH, refreshToken) else remove(KEY_REFRESH)
        }.apply()
        _accessToken.value = accessToken
        _refreshToken.value = refreshToken
    }

    suspend fun clear() = withContext(Dispatchers.IO) {
        prefs.edit().clear().apply()
        _accessToken.value = null
        _refreshToken.value = null
    }

    private companion object {
        const val PREFS_NAME = "mhub_secure_prefs"
        const val KEY_ACCESS = "access_token"
        const val KEY_REFRESH = "refresh_token"
    }
}
