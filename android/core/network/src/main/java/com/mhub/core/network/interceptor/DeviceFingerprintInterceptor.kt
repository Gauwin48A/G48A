package com.mhub.core.network.interceptor

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import android.provider.Settings
import dagger.hilt.android.qualifiers.ApplicationContext
import okhttp3.Interceptor
import okhttp3.Response
import java.security.MessageDigest
import javax.inject.Inject

/**
 * Attaches a device fingerprint header (X-Device-Fingerprint) to every request.
 * The server uses this for device binding and anomaly detection.
 */
class DeviceFingerprintInterceptor @Inject constructor(
    @ApplicationContext private val context: Context,
) : Interceptor {

    private val fingerprint: String by lazy { generateFingerprint() }

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request().newBuilder()
            .header("X-Device-Fingerprint", fingerprint)
            .header("X-Device-Type", "android")
            .header("X-App-Version", getAppVersion())
            .build()
        return chain.proceed(request)
    }

    @SuppressLint("HardwareIds")
    private fun generateFingerprint(): String {
        val androidId = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
        val raw = "${Build.MANUFACTURER}|${Build.MODEL}|${Build.FINGERPRINT}|$androidId"
        val digest = MessageDigest.getInstance("SHA-256")
        return digest.digest(raw.toByteArray())
            .joinToString("") { "%02x".format(it) }
    }

    private fun getAppVersion(): String {
        return try {
            context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "unknown"
        } catch (_: Exception) {
            "unknown"
        }
    }
}
