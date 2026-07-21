package com.zaruda.app.data.remote

import android.content.Context
import android.provider.Settings
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import okhttp3.Interceptor
import okhttp3.Response
import java.security.SecureRandom
import java.util.UUID
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
 * Interceptor that adds required native client identity and write-request security headers:
 * - X-Client-Platform / X-Platform
 * - X-Device-Fingerprint / X-Device-Id
 * - X-MHub-Timestamp
 * - X-MHub-Nonce (cryptographically random)
 * - X-XSRF-TOKEN (read from cookie jar)
 */
class SecurityHeadersInterceptor(
    private val cookieJar: AppCookieJar,
    context: Context,
) : Interceptor {
    private val secureRandom = SecureRandom()
    private val appContext = context.applicationContext
    private val deviceFingerprint: String by lazy { buildDeviceFingerprint(appContext) }

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val method = request.method.uppercase()
        val builder = request.newBuilder()
            .header("X-Client-Platform", "android-native")
            .header("X-Platform", "android")
            .header("X-Device-Fingerprint", deviceFingerprint)
            .header("X-Device-Id", deviceFingerprint)

        if (method in listOf("POST", "PUT", "PATCH", "DELETE")) {
            val timestamp = System.currentTimeMillis().toString()
            builder.header("X-MHub-Timestamp", timestamp)
            builder.header("X-MHub-Nonce", "android-$timestamp-${secureRandom.nextLong().toULong()}")

            // Read XSRF-TOKEN from cookie jar
            val cookies = cookieJar.loadForRequest(request.url)
            val xsrfCookie = cookies.find { it.name == "XSRF-TOKEN" }
            if (xsrfCookie != null) {
                builder.header("X-XSRF-TOKEN", xsrfCookie.value)
            }

            return chain.proceed(builder.build())
        }

        return chain.proceed(builder.build())
    }

    private companion object {
        private const val PREFS_NAME = "mhub_device_identity"
        private const val INSTALL_ID_KEY = "install_id"
        private val invalidChars = Regex("[^A-Za-z0-9_.-]")

        fun buildDeviceFingerprint(context: Context): String {
            val androidId = runCatching {
                Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
            }.getOrNull()
                ?.takeIf { it.isNotBlank() && it != "9774d56d682e549c" }

            val stableId = androidId ?: getOrCreateInstallId(context)
            return "android-$stableId"
                .replace(invalidChars, "_")
                .take(128)
        }

        fun getOrCreateInstallId(context: Context): String {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val existing = prefs.getString(INSTALL_ID_KEY, null)
            if (!existing.isNullOrBlank()) return existing
            val generated = UUID.randomUUID().toString()
            prefs.edit().putString(INSTALL_ID_KEY, generated).apply()
            return generated
        }
    }
}
