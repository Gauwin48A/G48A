package com.mhub.app.data.remote

import com.mhub.app.data.local.TokenStore
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.Authenticator
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route

/**
 * OkHttp Authenticator that handles 401 responses by attempting token refresh.
 * On success, retries the original request with the new access token.
 * On failure, clears tokens (forces re-login).
 */
class TokenRefreshAuthenticator(
    private val tokenStore: TokenStore,
    private val json: Json,
    private val baseUrlProvider: () -> String,
) : Authenticator {

    @Volatile
    private var isRefreshing = false

    override fun authenticate(route: Route?, response: Response): Request? {
        // Don't retry if we already tried refreshing
        if (response.request.header("X-Retry-After-Refresh") != null) return null
        // Don't retry refresh endpoint itself
        if (response.request.url.encodedPath.contains("refresh-token")) return null

        synchronized(this) {
            // Double-check: maybe another thread already refreshed
            val currentToken = runBlocking { tokenStore.accessTokenBlocking() }
            val requestToken = response.request.header("Authorization")?.removePrefix("Bearer ")

            // If token changed since this request was made, just retry with new token
            if (currentToken != null && currentToken != requestToken) {
                return response.request.newBuilder()
                    .header("Authorization", "Bearer $currentToken")
                    .header("X-Retry-After-Refresh", "1")
                    .build()
            }

            if (isRefreshing) return null
            isRefreshing = true
        }

        try {
            val refreshToken = runBlocking { tokenStore.refreshTokenBlocking() } ?: run {
                runBlocking { tokenStore.clear() }
                return null
            }

            val refreshResult = attemptRefresh(refreshToken)
            if (refreshResult != null) {
                runBlocking {
                    tokenStore.save(refreshResult.accessToken, refreshResult.refreshToken)
                }
                return response.request.newBuilder()
                    .header("Authorization", "Bearer ${refreshResult.accessToken}")
                    .header("X-Retry-After-Refresh", "1")
                    .build()
            } else {
                runBlocking { tokenStore.clear() }
                return null
            }
        } finally {
            synchronized(this) { isRefreshing = false }
        }
    }

    private fun attemptRefresh(refreshToken: String): RefreshResult? {
        val baseUrl = baseUrlProvider()
        val url = "${baseUrl.trimEnd('/')}/$REFRESH_PATH"
        val body = """{"refreshToken":"$refreshToken"}"""
            .toRequestBody("application/json".toMediaType())

        // Use a minimal client without the auth interceptor to avoid loops
        val client = OkHttpClient.Builder()
            .callTimeout(java.time.Duration.ofSeconds(15))
            .build()

        val request = Request.Builder()
            .url(url)
            .post(body)
            .header("Accept", "application/json")
            .header("X-Client-Platform", "android-native")
            .build()

        return try {
            val response = client.newCall(request).execute()
            if (response.isSuccessful) {
                val responseBody = response.body?.string() ?: return null
                json.decodeFromString<RefreshResult>(responseBody)
            } else {
                null
            }
        } catch (_: Exception) {
            null
        }
    }

    private companion object {
        const val REFRESH_PATH = "api/auth/refresh-token"
    }
}

@kotlinx.serialization.Serializable
private data class RefreshResult(
    val accessToken: String,
    val refreshToken: String? = null,
)
