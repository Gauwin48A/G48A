package com.mhub.app.di

import android.content.Context
import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.mhub.app.BuildConfig
import com.mhub.app.data.local.AppPreferences
import com.mhub.app.data.local.TokenStore
import com.mhub.app.data.remote.AppCookieJar
import com.mhub.app.data.remote.AuthInterceptor
import com.mhub.app.data.remote.MhubApi
import com.mhub.app.data.remote.RetryInterceptor
import com.mhub.app.data.remote.SecurityHeadersInterceptor
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
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
    fun provideOkHttp(tokenStore: TokenStore, cookieJar: AppCookieJar): OkHttpClient {
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC
            else HttpLoggingInterceptor.Level.NONE
        }
        return OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .callTimeout(45, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .cookieJar(cookieJar)
            .addInterceptor(AuthInterceptor(tokenStore))
            .addInterceptor(SecurityHeadersInterceptor(cookieJar))
            .addInterceptor(RetryInterceptor())
            .addInterceptor(logging)
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
