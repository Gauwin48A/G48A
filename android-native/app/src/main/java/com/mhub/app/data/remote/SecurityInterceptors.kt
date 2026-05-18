package com.mhub.app.data.remote

import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.Interceptor
import okhttp3.Response
import java.security.SecureRandom
import java.util.concurrent.ConcurrentHashMap

/**
 * Simple in-memory cookie jar that stores cookies per host.
 * Required for CSRF token flow (server sets XSRF-TOKEN cookie).
 */
class AppCookieJar : CookieJar {
    private val store = ConcurrentHashMap<String, MutableList<Cookie>>()

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        val host = url.host
        val existing = store.getOrPut(host) { mutableListOf() }
        for (cookie in cookies) {
            existing.removeAll { it.name == cookie.name }
            existing.add(cookie)
        }
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        return store[url.host]?.filter { !it.expiresAt.let { exp -> exp != 0L && exp < System.currentTimeMillis() } } ?: emptyList()
    }
}

/**
 * Interceptor that adds required security headers for write requests:
 * - X-MHub-Timestamp
 * - X-MHub-Nonce (cryptographically random)
 * - X-XSRF-TOKEN (read from cookie jar)
 */
class SecurityHeadersInterceptor(private val cookieJar: AppCookieJar) : Interceptor {
    private val secureRandom = SecureRandom()

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val method = request.method.uppercase()

        if (method in listOf("POST", "PUT", "PATCH", "DELETE")) {
            val builder = request.newBuilder()
            builder.header("X-MHub-Timestamp", System.currentTimeMillis().toString())
            builder.header("X-MHub-Nonce", "android-${System.currentTimeMillis()}-${secureRandom.nextLong().toULong()}")

            // Read XSRF-TOKEN from cookie jar
            val cookies = cookieJar.loadForRequest(request.url)
            val xsrfCookie = cookies.find { it.name == "XSRF-TOKEN" }
            if (xsrfCookie != null) {
                builder.header("X-XSRF-TOKEN", xsrfCookie.value)
            }

            return chain.proceed(builder.build())
        }

        return chain.proceed(request)
    }
}
