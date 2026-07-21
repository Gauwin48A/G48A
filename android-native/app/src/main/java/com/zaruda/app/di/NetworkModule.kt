package com.zaruda.app.di

import android.content.Context
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.zaruda.app.BuildConfig
import com.zaruda.app.data.local.AppPreferences
import com.zaruda.app.data.local.TokenStore
import com.zaruda.app.data.remote.AppCookieJar
import com.zaruda.app.data.remote.AuthInterceptor
import com.zaruda.app.data.remote.LocaleInterceptor
import com.zaruda.app.data.remote.MhubApi
import com.zaruda.app.data.remote.RetryInterceptor
import com.zaruda.app.data.remote.SecurityHeadersInterceptor
import com.zaruda.app.data.remote.TokenRefreshAuthenticator
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.Cache
import okhttp3.CacheControl
import okhttp3.ConnectionPool
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Protocol
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import java.io.File
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        explicitNulls = false
        isLenient = true
    }

    @Provides
    @Singleton
    fun provideCookieJar(): AppCookieJar = AppCookieJar()

    @Provides
    @Singleton
    fun provideOkHttp(
        @ApplicationContext context: Context,
        tokenStore: TokenStore,
        cookieJar: AppCookieJar,
        json: Json,
        appPreferences: AppPreferences,
        localeInterceptor: LocaleInterceptor,
    ): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC
            else HttpLoggingInterceptor.Level.NONE
        }
        val authenticator = TokenRefreshAuthenticator(
            tokenStore = tokenStore,
            json = json,
            baseUrlProvider = { runBlocking { appPreferences.baseUrlOrDefault() } },
        )
        // 25MB HTTP response cache — reduces network calls by serving stale-while-revalidate
        val httpCache = Cache(File(context.cacheDir, "http_cache"), 25L * 1024 * 1024)
        // Network interceptor: add Cache-Control to GET responses that lack it
        val cacheInterceptor = Interceptor { chain ->
            val response = chain.proceed(chain.request())
            if (chain.request().method == "GET" && response.header("Cache-Control") == null) {
                response.newBuilder()
                    .header("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
                    .removeHeader("Pragma")
                    .build()
            } else response
        }
        return OkHttpClient.Builder()
            .cache(httpCache)
            .connectTimeout(3, TimeUnit.SECONDS)
            .readTimeout(8, TimeUnit.SECONDS)
            .writeTimeout(10, TimeUnit.SECONDS)
            .callTimeout(10, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            // Connection pool tuned for 10M+ user scale: keep 8 idle connections alive for 3 min
            .connectionPool(ConnectionPool(8, 3, TimeUnit.MINUTES))
            // Force HTTP/2 + HTTP/1.1 for multiplexed requests
            .protocols(listOf(Protocol.HTTP_2, Protocol.HTTP_1_1))
            .cookieJar(cookieJar)
            .authenticator(authenticator)
            .addInterceptor(ApiVersionInterceptor())
            .addInterceptor(AuthInterceptor(tokenStore))
            .addInterceptor(localeInterceptor)
            .addInterceptor(RetryInterceptor())
            .addInterceptor(SecurityHeadersInterceptor(cookieJar, context))
            .addInterceptor(logging)
            .addNetworkInterceptor(cacheInterceptor)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(
        @ApplicationContext context: Context,
        client: OkHttpClient,
        json: Json,
        appPreferences: AppPreferences,
    ): Retrofit {
        // Read once at startup; users can change via Settings (requires restart).
        val baseUrl = runBlocking { appPreferences.baseUrlOrDefault() }
        return Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
    }

    @Provides
    @Singleton
    fun provideApi(retrofit: Retrofit): MhubApi = retrofit.create(MhubApi::class.java)
}

private class ApiVersionInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): okhttp3.Response {
        val originalRequest = chain.request()
        val originalUrl = originalRequest.url
        val pathSegments = originalUrl.pathSegments

        if (pathSegments.isNotEmpty() && pathSegments[0] == "api" && (pathSegments.size < 2 || pathSegments[1] != "v1")) {
            val newSegments = mutableListOf<String>()
            newSegments.add("api")
            newSegments.add("v1")
            for (i in 1 until pathSegments.size) {
                newSegments.add(pathSegments[i])
            }

            val urlBuilder = originalUrl.newBuilder()
            // Clear path segments from back to front
            for (i in pathSegments.size - 1 downTo 0) {
                urlBuilder.removePathSegment(i)
            }
            // Add new segments
            for (segment in newSegments) {
                urlBuilder.addPathSegment(segment)
            }

            val finalRequest = originalRequest.newBuilder()
                .url(urlBuilder.build())
                .build()
            return chain.proceed(finalRequest)
        }

        return chain.proceed(originalRequest)
    }
}

