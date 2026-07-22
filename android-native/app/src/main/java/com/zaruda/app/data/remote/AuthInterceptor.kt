package com.zaruda.app.data.remote

import com.zaruda.app.data.local.TokenStore
import okhttp3.Interceptor
import okhttp3.Response
import org.json.JSONObject

/**
 * Adds `Authorization: Bearer <token>` when available.
 * Reads the in-memory cached token directly (non-blocking).
 */
class AuthInterceptor(
    private val tokenStore: TokenStore,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = tokenStore.accessTokenImmediate()
        val original = chain.request()
        val builder = original.newBuilder()
            .header("Accept", "application/json")
            .header("X-Client-Platform", "android-native")
        // CRITICAL: Do NOT add the (potentially expired) access token to the refresh endpoint.
        // The refresh endpoint must be called WITHOUT an Authorization header so the server
        // can validate the refresh token from the request body alone.
        // If we add an expired access token here, the server may reject the refresh request,
        // causing token refresh to fail and forcing the user to re-login.
        val isRefreshEndpoint = original.url.encodedPath.contains("refresh-token")
        if (!token.isNullOrBlank() && original.header("Authorization") == null && !isRefreshEndpoint) {
            builder.header("Authorization", "Bearer $token")
            val userId = try {
                val parts = token.split(".")
                if (parts.size == 3) {
                    val payload = String(android.util.Base64.decode(parts[1], android.util.Base64.URL_SAFE), Charsets.UTF_8)
                    JSONObject(payload).optString("sub", "")
                } else ""
            } catch (_: Exception) { "" }.let { id ->
                if (id.isBlank() && token.contains("demo")) "demo_user" else if (id.isBlank()) token else id
            }
            builder.header("X-User-Id", userId)
        } else if (original.header("X-User-Id") == null) {
            builder.header("X-User-Id", "demo_user")
        }
        return chain.proceed(builder.build())
    }
}
