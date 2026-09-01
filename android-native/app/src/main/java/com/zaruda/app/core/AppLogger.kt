package com.zaruda.app.core

import android.util.Log

/**
 * Centralized diagnostic logger for production stabilization.
 * All categories are tagged for easy Logcat filtering.
 * Filter in Logcat: tag:Zaruda-*
 */
object AppLogger {
    private val ENABLED = com.zaruda.app.BuildConfig.DEBUG

    // ─── Navigation ──────────────────────────────────────────────────────────
    fun navPush(route: String) {
        if (ENABLED) Log.d("Zaruda-Nav", "→ PUSH: $route")
    }

    fun navPop(route: String?) {
        if (ENABLED) Log.d("Zaruda-Nav", "← POP: ${route ?: "unknown"}")
    }

    fun navTabSwitch(tab: String) {
        if (ENABLED) Log.d("Zaruda-Nav", "⇄ TAB: $tab")
    }

    fun navDrawer(open: Boolean) {
        if (ENABLED) Log.d("Zaruda-Nav", if (open) "☰ DRAWER OPEN" else "☰ DRAWER CLOSE")
    }

    // ─── Authentication ──────────────────────────────────────────────────────
    fun authLogin(identifier: String) {
        if (ENABLED) Log.d("Zaruda-Auth", "✓ LOGIN: ${identifier.take(3)}***")
    }

    fun authLogout() {
        if (ENABLED) Log.d("Zaruda-Auth", "✗ LOGOUT")
    }

    fun authTokenRefresh(success: Boolean) {
        if (ENABLED) Log.d("Zaruda-Auth", if (success) "↻ TOKEN REFRESH: success" else "↻ TOKEN REFRESH: FAILED")
    }

    fun authTokenExpired() {
        if (ENABLED) Log.w("Zaruda-Auth", "⚠ TOKEN EXPIRED — needs re-login")
    }

    fun authStateChange(isAuthenticated: Boolean, guestBrowsing: Boolean) {
        if (ENABLED) Log.d("Zaruda-Auth", "AUTH STATE: authenticated=$isAuthenticated, guest=$guestBrowsing")
    }

    // ─── API Layer ───────────────────────────────────────────────────────────
    fun apiRequest(method: String, path: String) {
        if (ENABLED) Log.d("Zaruda-API", "→ $method $path")
    }

    fun apiResponse(path: String, code: Int, durationMs: Long) {
        val level = if (code in 200..299) Log.DEBUG else Log.WARN
        Log.println(level, "Zaruda-API", "← $code $path (${durationMs}ms)")
    }

    fun apiError(path: String, error: String) {
        if (ENABLED) Log.e("Zaruda-API", "✗ $path: $error")
    }

    fun apiRetry(path: String, attempt: Int) {
        if (ENABLED) Log.w("Zaruda-API", "↻ RETRY #$attempt: $path")
    }

    // ─── Locale ──────────────────────────────────────────────────────────────
    fun localeChange(from: String, to: String) {
        if (ENABLED) Log.d("Zaruda-Locale", "🌐 LOCALE: $from → $to")
    }

    fun localeReload(vmName: String) {
        if (ENABLED) Log.d("Zaruda-Locale", "♻ RELOAD: $vmName")
    }

    // ─── State/Lifecycle ─────────────────────────────────────────────────────
    fun vmInit(name: String) {
        if (ENABLED) Log.d("Zaruda-State", "VM INIT: $name")
    }

    fun vmCleared(name: String) {
        if (ENABLED) Log.d("Zaruda-State", "VM CLEARED: $name")
    }

    fun lifecycleEvent(screen: String, event: String) {
        if (ENABLED) Log.d("Zaruda-Lifecycle", "$screen: $event")
    }
}
