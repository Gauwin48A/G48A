package com.mhub.app.core

import android.util.Log

/**
 * Centralized diagnostic logger for production stabilization.
 * All categories are tagged for easy Logcat filtering.
 * Filter in Logcat: tag:MHub-*
 */
object AppLogger {
    private val ENABLED = com.mhub.app.BuildConfig.DEBUG

    // ─── Navigation ──────────────────────────────────────────────────────────
    fun navPush(route: String) {
        if (ENABLED) Log.d("MHub-Nav", "→ PUSH: $route")
    }

    fun navPop(route: String?) {
        if (ENABLED) Log.d("MHub-Nav", "← POP: ${route ?: "unknown"}")
    }

    fun navTabSwitch(tab: String) {
        if (ENABLED) Log.d("MHub-Nav", "⇄ TAB: $tab")
    }

    fun navDrawer(open: Boolean) {
        if (ENABLED) Log.d("MHub-Nav", if (open) "☰ DRAWER OPEN" else "☰ DRAWER CLOSE")
    }

    // ─── Authentication ──────────────────────────────────────────────────────
    fun authLogin(identifier: String) {
        if (ENABLED) Log.d("MHub-Auth", "✓ LOGIN: ${identifier.take(3)}***")
    }

    fun authLogout() {
        if (ENABLED) Log.d("MHub-Auth", "✗ LOGOUT")
    }

    fun authTokenRefresh(success: Boolean) {
        if (ENABLED) Log.d("MHub-Auth", if (success) "🔄 TOKEN REFRESH: success" else "🔄 TOKEN REFRESH: FAILED")
    }

    fun authTokenExpired() {
        if (ENABLED) Log.w("MHub-Auth", "⚠ TOKEN EXPIRED — needs re-login")
    }

    fun authStateChange(isAuthenticated: Boolean, guestBrowsing: Boolean) {
        if (ENABLED) Log.d("MHub-Auth", "AUTH STATE: authenticated=$isAuthenticated, guest=$guestBrowsing")
    }

    // ─── API Layer ───────────────────────────────────────────────────────────
    fun apiRequest(method: String, path: String) {
        if (ENABLED) Log.d("MHub-API", "→ $method $path")
    }

    fun apiResponse(path: String, code: Int, durationMs: Long) {
        val level = if (code in 200..299) Log.DEBUG else Log.WARN
        Log.println(level, "MHub-API", "← $code $path (${durationMs}ms)")
    }

    fun apiError(path: String, error: String) {
        if (ENABLED) Log.e("MHub-API", "✗ $path: $error")
    }

    fun apiRetry(path: String, attempt: Int) {
        if (ENABLED) Log.w("MHub-API", "↻ RETRY #$attempt: $path")
    }

    // ─── Locale ──────────────────────────────────────────────────────────────
    fun localeChange(from: String, to: String) {
        if (ENABLED) Log.d("MHub-Locale", "🌐 LOCALE: $from → $to")
    }

    fun localeReload(vmName: String) {
        if (ENABLED) Log.d("MHub-Locale", "♻ RELOAD: $vmName")
    }

    // ─── State/Lifecycle ─────────────────────────────────────────────────────
    fun vmInit(name: String) {
        if (ENABLED) Log.d("MHub-State", "VM INIT: $name")
    }

    fun vmCleared(name: String) {
        if (ENABLED) Log.d("MHub-State", "VM CLEARED: $name")
    }

    fun lifecycleEvent(screen: String, event: String) {
        if (ENABLED) Log.d("MHub-Lifecycle", "$screen: $event")
    }
}
