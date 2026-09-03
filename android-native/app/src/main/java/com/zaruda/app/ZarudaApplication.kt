package com.zaruda.app

import android.app.Application
import android.os.Build
import android.util.Log
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.disk.DiskCache
import coil.memory.MemoryCache
import coil.request.CachePolicy
import com.google.firebase.FirebaseApp
import com.google.firebase.crashlytics.FirebaseCrashlytics
import com.google.firebase.messaging.FirebaseMessaging
import com.zaruda.app.core.notifications.NotificationChannelHelper
import com.zaruda.app.data.local.TokenStore
import com.zaruda.app.data.remote.ZarudaApi
import com.zaruda.app.data.remote.dto.PushTokenRequest
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltAndroidApp
class ZarudaApplication : Application(), ImageLoaderFactory {

    companion object {
        private const val TAG = "ZARUDA-FCM"
    }

    @Inject lateinit var api: ZarudaApi
    @Inject lateinit var tokenStore: TokenStore

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()

        Log.d(TAG, "🚀 Zaruda Application Started")

        // Create notification channels
        NotificationChannelHelper.createNotificationChannels(this)

        // Initialize Firebase core & Crashlytics synchronously so early crashes are captured
        initFirebaseCore()

        // Fetch & register FCM token asynchronously
        fetchFcmTokenAsync()
    }

    private fun initFirebaseCore() {
        try {
            FirebaseApp.initializeApp(this)

            val crashlytics = FirebaseCrashlytics.getInstance()
            crashlytics.setCrashlyticsCollectionEnabled(!BuildConfig.DEBUG)
            crashlytics.setCustomKey("app_version", BuildConfig.VERSION_NAME)
            crashlytics.setCustomKey("build_type", BuildConfig.BUILD_TYPE)
            crashlytics.setCustomKey("device_model", Build.MODEL)
            crashlytics.setCustomKey("os_sdk", Build.VERSION.SDK_INT)

            Log.d(TAG, "✅ Firebase core and Crashlytics initialized synchronously")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Firebase core initialization failed", e)
        }
    }

    private fun fetchFcmTokenAsync() {
        appScope.launch {
            try {
                FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                    if (!task.isSuccessful) {
                        Log.e(TAG, "❌ Failed to obtain FCM Token", task.exception)
                        return@addOnCompleteListener
                    }

                    val token = task.result ?: return@addOnCompleteListener
                    Log.d(TAG, "✅ FCM Token obtained: $token")

                    // Cache the token so it can be registered after a later login, and
                    // register immediately when a session already exists.
                    tokenStore.saveFcmToken(token)
                    if (tokenStore.isAuthenticated) {
                        appScope.launch {
                            runCatching {
                                api.registerPushToken(
                                    PushTokenRequest(
                                        token = token,
                                        deviceType = "android",
                                        deviceName = Build.MODEL,
                                    )
                                )
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error retrieving FCM token", e)
            }
        }
    }

    override fun newImageLoader(): ImageLoader {
        return ImageLoader.Builder(this)
            .memoryCachePolicy(CachePolicy.ENABLED)
            .memoryCache {
                MemoryCache.Builder(this)
                    .maxSizePercent(0.30)
                    .strongReferencesEnabled(true)
                    .build()
            }
            .diskCachePolicy(CachePolicy.ENABLED)
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("image_cache"))
                    .maxSizeBytes(150L * 1024L * 1024L)
                    .build()
            }
            .networkCachePolicy(CachePolicy.ENABLED)
            .respectCacheHeaders(false)
            .crossfade(150)
            .build()
    }
}