package com.mhub.core.network.interceptor

import com.mhub.core.network.api.AuthApi
import com.mhub.core.network.BuildConfig
import okhttp3.Interceptor
import okhttp3.Response
import timber.log.Timber
import java.util.concurrent.atomic.AtomicBoolean
import javax.inject.Inject
import javax.inject.Provider

/**
 * Interceptor that handles 401 responses by attempting a token refresh.
 *
 * - On 401, tries POST /api/auth/refresh-token once.
 * - If refresh succeeds, replays the original request.
 * - If refresh also fails, propagates the 401.
 * - Uses an AtomicBoolean to prevent concurrent refresh attempts.
 */
class TokenRefreshInterceptor @Inject constructor(
    private val authApiProvider: Provider<AuthApi>,
) : Interceptor {

    private val isRefreshing = AtomicBoolean(false)

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val response = chain.proceed(request)

        // Don't retry refresh or CSRF endpoints
        if (request.url.encodedPath.contains("refresh-token") ||
            request.url.encodedPath.contains("csrf-token")
        ) {
            return response
        }

        if (response.code == 401 || response.code == 403) {
            if (isRefreshing.compareAndSet(false, true)) {
                try {
                    Timber.d("Token expired, attempting refresh...")
                    val refreshResponse = authApiProvider.get()
                        .refreshTokenSync()
                        .execute()

                    if (refreshResponse.isSuccessful) {
                        Timber.d("Token refresh succeeded, replaying request")
                        response.close()
                        return chain.proceed(request.newBuilder().build())
                    } else {
                        Timber.w("Token refresh failed with ${refreshResponse.code()}")
                    }
                } catch (e: Exception) {
                    Timber.e(e, "Token refresh threw exception")
                } finally {
                    isRefreshing.set(false)
                }
            }
        }

        return response
    }
}
