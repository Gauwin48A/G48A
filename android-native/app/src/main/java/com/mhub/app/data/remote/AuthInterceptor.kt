package com.mhub.app.data.remote

import com.mhub.app.data.local.TokenStore
import okhttp3.Interceptor
import okhttp3.Response

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
        if (!token.isNullOrBlank() && original.header("Authorization") == null) {
            builder.header("Authorization", "Bearer $token")
        }
        return chain.proceed(builder.build())
    }
}
