package com.mhub.app.di

import android.content.Context
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.mhub.app.BuildConfig
import com.mhub.app.data.local.AppPreferences
import com.mhub.app.data.local.TokenStore
import com.mhub.app.data.remote.AppCookieJar
import com.mhub.app.data.remote.AuthInterceptor
import com.mhub.app.data.remote.LocaleInterceptor
import com.mhub.app.data.remote.MhubApi
import com.mhub.app.data.remote.RetryInterceptor
import com.mhub.app.data.remote.SecurityHeadersInterceptor
import com.mhub.app.data.remote.TokenRefreshAuthenticator
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
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .writeTimeout(20, TimeUnit.SECONDS)
            .callTimeout(30, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            // Connection pool tuned for 10M+ user scale: keep 8 idle connections alive for 3 min
            .connectionPool(ConnectionPool(8, 3, TimeUnit.MINUTES))
            // Force HTTP/2 + HTTP/1.1 for multiplexed requests
            .protocols(listOf(Protocol.HTTP_2, Protocol.HTTP_1_1))
            .cookieJar(cookieJar)
            .authenticator(authenticator)
            .addInterceptor(AuthInterceptor(tokenStore))
            .addInterceptor(localeInterceptor)
            .addInterceptor(SecurityHeadersInterceptor(cookieJar))
            .addInterceptor(RetryInterceptor())
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
