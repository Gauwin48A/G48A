package com.mhub.app.data.remote

import okhttp3.Interceptor
import okhttp3.Response
import java.io.IOException

/**
 * Simple exponential-backoff retry for transient failures (IOException / 5xx) on idempotent GETs.
 * Keeps UX snappy on flaky mobile networks.
 */
class RetryInterceptor(
    private val maxRetries: Int = 2,
    private val initialDelayMs: Long = 300,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        if (request.method != "GET") return chain.proceed(request)

        var attempt = 0
        var delay = initialDelayMs
        var lastError: IOException? = null
        while (attempt <= maxRetries) {
            try {
                val response = chain.proceed(request)
                if (response.code < 500 || response.code == 501) return response
                response.close()
            } catch (e: IOException) {
                lastError = e
            }
            attempt++
            if (attempt > maxRetries) break
            try {
                Thread.sleep(delay)
            } catch (_: InterruptedException) {
                Thread.currentThread().interrupt()
            }
            delay = (delay * 2).coerceAtMost(2000)
        }
        lastError?.let { throw it }
        return chain.proceed(request)
    }
}
