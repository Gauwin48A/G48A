package com.mhub.core.network.cookie

import android.content.Context
import android.webkit.CookieManager
import okhttp3.Cookie
import okhttp3.CookieJar
import okhttp3.HttpUrl
import timber.log.Timber

/**
 * Persistent cookie jar that stores cookies via Android's WebKit CookieManager.
 * Cookies survive app restarts and are shared across OkHttp requests.
 */
class PersistentCookieJar(context: Context) : CookieJar {

    private val cookieManager: CookieManager = CookieManager.getInstance().apply {
        setAcceptCookie(true)
    }

    override fun saveFromResponse(url: HttpUrl, cookies: List<Cookie>) {
        val urlString = url.toString()
        cookies.forEach { cookie ->
            cookieManager.setCookie(urlString, cookie.toString())
            Timber.d("Cookie saved: ${cookie.name} for $urlString")
        }
        cookieManager.flush()
    }

    override fun loadForRequest(url: HttpUrl): List<Cookie> {
        val urlString = url.toString()
        val cookieString = cookieManager.getCookie(urlString) ?: return emptyList()

        return cookieString.split(";")
            .mapNotNull { cookiePart ->
                Cookie.parse(url, cookiePart.trim())
            }
    }

    /**
     * Get the XSRF-TOKEN value from stored cookies for the given URL.
     */
    fun getCsrfToken(baseUrl: String): String? {
        val cookieString = cookieManager.getCookie(baseUrl) ?: return null
        return cookieString.split(";")
            .map { it.trim() }
            .firstOrNull { it.startsWith("XSRF-TOKEN=") }
            ?.substringAfter("XSRF-TOKEN=")
    }

    fun clearAll() {
        cookieManager.removeAllCookies(null)
        cookieManager.flush()
    }
}
