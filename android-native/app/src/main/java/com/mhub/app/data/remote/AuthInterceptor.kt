package com.mhub.app.data.remote

import com.mhub.app.data.local.TokenStore
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response

/**
 * Adds `Authorization: Bearer <token>` when available.
 * Uses runBlocking only to read a small cached value; TokenStore reads from disk-cached in-memory.
 */
class AuthInterceptor(
    private val tokenStore: TokenStore,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = runBlocking { tokenStore.accessTokenBlocking() }
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
