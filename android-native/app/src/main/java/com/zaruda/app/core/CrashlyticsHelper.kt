package com.zaruda.app.core

import android.util.Log
import com.google.firebase.crashlytics.ktx.crashlytics
import com.google.firebase.ktx.Firebase
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Firebase Crashlytics convenience wrapper.
 *
 * Provides typed helper methods for breadcrumbs, custom keys, and exception
 * recording so callers never deal with raw Crashlytics API. Safe to inject
 * anywhere via Hilt.
 */
@Singleton
class CrashlyticsHelper @Inject constructor() {

    private val crashlytics = Firebase.crashlytics

    // ── User identity ──────────────────────────────────────────────────────

    fun setUserId(userId: String) {
        crashlytics.setUserId(userId)
    }

    fun setUser(userId: String, email: String? = null, role: String? = null) {
        crashlytics.setUserId(userId)
        if (!email.isNullOrBlank()) crashlytics.setCustomKey("user_email", email)
        if (!role.isNullOrBlank()) crashlytics.setCustomKey("user_role", role)
    }

    fun clearUser() {
        crashlytics.setUserId("")
        crashlytics.setCustomKey("user_email", "")
        crashlytics.setCustomKey("user_role", "")
    }

    fun recordHttpError(url: String, statusCode: Int, message: String) {
        crashlytics.log("HTTP $statusCode for $url: $message")
        crashlytics.setCustomKey("last_failed_http_code", statusCode)
        crashlytics.setCustomKey("last_failed_http_url", url)
    }

    // ── Custom keys (appear in crash reports for filtering) ─────────────────

    fun setCustomKey(key: String, value: String) {
        crashlytics.setCustomKey(key, value)
    }

    fun setCustomKey(key: String, value: Int) {
        crashlytics.setCustomKey(key, value)
    }

    fun setCustomKey(key: String, value: Long) {
        crashlytics.setCustomKey(key, value)
    }

    fun setCustomKey(key: String, value: Float) {
        crashlytics.setCustomKey(key, value)
    }

    fun setCustomKey(key: String, value: Double) {
        crashlytics.setCustomKey(key, value)
    }

    fun setCustomKey(key: String, value: Boolean) {
        crashlytics.setCustomKey(key, value)
    }

    // ── Logging ────────────────────────────────────────────────────────────

    fun log(message: String) {
        crashlytics.log(message)
        Log.d("Crashlytics", message)
    }

    fun logBreadcrumb(event: String, message: String) {
        crashlytics.log("$event: $message")
    }

    // ── Exception recording ────────────────────────────────────────────────

    fun recordException(throwable: Throwable, message: String = "") {
        if (message.isNotEmpty()) {
            crashlytics.log("$message: ${throwable.message}")
        }
        crashlytics.recordException(throwable)
    }

    // ── Non-fatal error reporting ──────────────────────────────────────────

    fun logNonFatal(throwable: Throwable, tag: String = "", context: String = "") {
        val breadcrumb = buildString {
            if (tag.isNotEmpty()) append("[$tag] ")
            if (context.isNotEmpty()) append("$context: ")
            append(throwable.message ?: "Unknown error")
        }
        crashlytics.log(breadcrumb)
        crashlytics.recordException(throwable)
    }

    fun logApiError(apiError: com.zaruda.app.core.ApiError, tag: String = "", context: String = "") {
        val breadcrumb = buildString {
            if (tag.isNotEmpty()) append("[$tag] ")
            if (context.isNotEmpty()) append("$context: ")
            append(apiError.message)
        }
        crashlytics.log(breadcrumb)
        if (apiError is com.zaruda.app.core.ApiError.Http && apiError.code >= 500) {
            recordHttpError(context, apiError.code, apiError.message)
        }
    }
}
