package com.mhub.app.data.remote

import com.mhub.app.core.LocaleManager
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * OkHttp interceptor that adds Accept-Language header based on the current locale.
 * Ensures all API responses respect the user's language selection.
 */
@Singleton
class LocaleInterceptor @Inject constructor(
    private val localeManager: LocaleManager,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val locale = localeManager.currentLocale.value
        val request = chain.request().newBuilder()
            .header("Accept-Language", locale.language)
            .build()
        return chain.proceed(request)
    }
}
