package com.mhub.core.network.interceptor

import com.mhub.core.network.cookie.PersistentCookieJar
import com.mhub.core.network.BuildConfig
import okhttp3.Interceptor
import okhttp3.Response
import timber.log.Timber
import javax.inject.Inject

/**
 * Interceptor that reads the XSRF-TOKEN cookie and attaches it as
 * the X-XSRF-TOKEN header on state-changing requests (POST, PUT, DELETE, PATCH).
 *
 * Mirrors the double-submit cookie pattern used by the MHub server.
 */
class CsrfInterceptor @Inject constructor(
    private val cookieJar: PersistentCookieJar,
) : Interceptor {

    private val stateMutatingMethods = setOf("POST", "PUT", "DELETE", "PATCH")

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()

        if (request.method in stateMutatingMethods) {
            val csrfToken = cookieJar.getCsrfToken(BuildConfig.API_BASE_URL)
            if (csrfToken != null) {
                val newRequest = request.newBuilder()
                    .header("X-XSRF-TOKEN", csrfToken)
                    .build()
                Timber.d("CSRF token attached to ${request.method} ${request.url}")
                return chain.proceed(newRequest)
            } else {
                Timber.w("No CSRF token available for ${request.method} ${request.url}")
            }
        }

        return chain.proceed(request)
    }
}
