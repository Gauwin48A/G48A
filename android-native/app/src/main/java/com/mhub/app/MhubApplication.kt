package com.mhub.app

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.decode.DataSource
import coil.disk.DiskCache
import coil.memory.MemoryCache
import coil.request.CachePolicy
import coil.util.DebugLogger
import com.google.firebase.FirebaseApp
import com.google.firebase.crashlytics.FirebaseCrashlytics
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class MhubApplication : Application(), ImageLoaderFactory {

    override fun onCreate() {
        super.onCreate()
        com.mhub.app.core.notifications.NotificationChannelHelper.createNotificationChannels(this)
        // Init Firebase on a background thread to avoid blocking main thread at startup
        Thread { initFirebaseSafely() }.also { it.isDaemon = true; it.start() }
    }

    private fun initFirebaseSafely() {
        try {
            FirebaseApp.initializeApp(this)
            FirebaseCrashlytics.getInstance().setCrashlyticsCollectionEnabled(!BuildConfig.DEBUG)
        } catch (_: Exception) {
            // Firebase init fails gracefully when google-services.json has placeholder values.
            // App continues to work without crash reporting / analytics / FCM.
        }
    }

    override fun newImageLoader(): ImageLoader {
        return ImageLoader.Builder(this)
            .memoryCachePolicy(CachePolicy.ENABLED)
            .memoryCache {
                MemoryCache.Builder(this)
                    .maxSizePercent(0.30)  // 30% of heap — aggressive cache for 10M users
                    .strongReferencesEnabled(true)
                    .build()
            }
            .diskCachePolicy(CachePolicy.ENABLED)
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("image_cache"))
                    .maxSizeBytes(150L * 1024 * 1024) // 150MB disk cache
                    .build()
            }
            .crossfade(150) // Fast crossfade (150ms)
            .respectCacheHeaders(false) // Always use our cache policy — faster
            .networkCachePolicy(CachePolicy.ENABLED)
            .build()
    }
}
