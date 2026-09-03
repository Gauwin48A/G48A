package com.zaruda.app.di

import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.analytics.ktx.analytics
import com.google.firebase.crashlytics.FirebaseCrashlytics
import com.google.firebase.crashlytics.ktx.crashlytics
import com.google.firebase.ktx.Firebase
import com.google.firebase.messaging.FirebaseMessaging
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module providing Firebase service singletons.
 *
 * All Firebase instances are process-scoped singletons. Inject them
 * directly into ViewModels, Repositories, or Services.
 *
 * Note: FirebaseAuth is not provided here because Google ID tokens
 * are sent directly to the backend (which verifies via Firebase Admin SDK).
 * If you need client-side Firebase Auth (e.g. for email/password via Firebase),
 * add firebase-auth-ktx to build.gradle.kts and uncomment the provider.
 */
@Module
@InstallIn(SingletonComponent::class)
object FirebaseModule {

    @Provides
    @Singleton
    fun provideFirebaseAnalytics(): FirebaseAnalytics = Firebase.analytics

    @Provides
    @Singleton
    fun provideFirebaseCrashlytics(): FirebaseCrashlytics = Firebase.crashlytics

    @Provides
    @Singleton
    fun provideFirebaseMessaging(): FirebaseMessaging = FirebaseMessaging.getInstance()
}
