package com.mhub.app.data.remote

import com.mhub.app.core.AppLogger
import com.mhub.app.data.local.TokenStore
import kotlinx.serialization.json.Json
import okhttp3.Authenticator
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

/**
 * OkHttp Authenticator that handles 401 responses by attempting token refresh.
 * On success, retries the original request with the new access token.
 * On failure, clears tokens (forces re-login).
 *
 * Thread-safety: Uses a latch-based pattern so concurrent 401 responses wait
 * for the single in-flight refresh to complete, then all retry with the new token.
 */
class TokenRefreshAuthenticator(
    private val tokenStore: TokenStore,
    private val json: Json,
    private val baseUrlProvider: () -> String,
) : Authenticator {

    /**
     * Holds the active refresh latch. When non-null, a refresh is in progress.
     * Other threads wait on this latch instead of dropping the request.
     */
    private val activeLatch = AtomicReference<CountDownLatch?>(null)

    /** Holds the result of the most recent refresh attempt (null = failed). */
    @Volatile
    private var lastRefreshResult: RefreshResult? = null

    override fun authenticate(route: Route?, response: Response): Request? {
        // Don't retry if we already tried refreshing
        if (response.request.header("X-Retry-After-Refresh") != null) return null
        // Don't retry refresh endpoint itself
        if (response.request.url.encodedPath.contains("refresh-token")) return null

        // Check if token was already refreshed by another thread
        val currentToken = tokenStore.accessTokenImmediate()
        val requestToken = response.request.header("Authorization")?.removePrefix("Bearer ")

        if (currentToken != null && currentToken != requestToken) {
            // Another thread already refreshed — just retry with the new token
            return response.request.newBuilder()
                .header("Authorization", "Bearer $currentToken")
                .header("X-Retry-After-Refresh", "1")
                .build()
        }

        // Try to become the refresh leader
        val latch = CountDownLatch(1)
        val existingLatch = activeLatch.compareAndExchange(null, latch)

        if (existingLatch != null) {
            // Another thread is refreshing — wait for it
            val completed = existingLatch.await(20, TimeUnit.SECONDS)
            if (!completed) return null // Timed out waiting

            // Check if refresh succeeded
            val result = lastRefreshResult ?: return null
            return response.request.newBuilder()
                .header("Authorization", "Bearer ${result.accessToken}")
                .header("X-Retry-After-Refresh", "1")
                .build()
        }

        // We are the refresh leader
        try {
            val refreshToken = tokenStore.refreshTokenImmediate()
            if (refreshToken.isNullOrBlank()) {
                AppLogger.authTokenRefresh(false)
                // No refresh token available and we have a 401 — the session is unrecoverable.
                // Clear the stale access token so isAuthenticated emits false and the app
                // navigates to the login screen instead of silently failing on every API call.
                tokenStore.clearImmediate()
                lastRefreshResult = null
                return null
            }

            val refreshResult = attemptRefresh(refreshToken)
            if (refreshResult != null) {
                AppLogger.authTokenRefresh(true)
                tokenStore.saveImmediate(refreshResult.accessToken, refreshResult.refreshToken)
                lastRefreshResult = refreshResult
                return response.request.newBuilder()
                    .header("Authorization", "Bearer ${refreshResult.accessToken}")
                    .header("X-Retry-After-Refresh", "1")
                    .build()
            } else {
                AppLogger.authTokenRefresh(false)
                lastRefreshResult = null
                return null
            }
        } finally {
            // Release all waiting threads
            latch.countDown()
            activeLatch.set(null)
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
            } else if (response.code == 401 || response.code == 403) {
                // Server explicitly rejected the refresh token — clear tokens to force re-login
                AppLogger.apiError(REFRESH_PATH, "Refresh rejected: HTTP ${response.code}")
                tokenStore.clearImmediate()
                null
            } else {
                // Server error (4xx other than 401/403, or 5xx) — transient, don't clear tokens
                AppLogger.apiError(REFRESH_PATH, "Refresh failed: HTTP ${response.code}")
                null
            }
        } catch (e: Exception) {
            // Network error — transient, don't clear tokens (user can retry)
            AppLogger.apiError(REFRESH_PATH, "Network error: ${e.message}")
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
