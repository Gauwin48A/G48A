package com.zaruda.app.core

import android.os.Bundle
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.analytics.ktx.analytics
import com.google.firebase.ktx.Firebase
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Firebase Analytics convenience wrapper.
 *
 * Provides typed helper methods for common Zaruda events so callers never
 * deal with raw Bundle construction. Safe to inject anywhere via Hilt.
 */
@Singleton
class AnalyticsHelper @Inject constructor() {

    private val analytics: FirebaseAnalytics = Firebase.analytics

    // ── Generic ────────────────────────────────────────────────────────────

    fun logEvent(eventName: String, params: Bundle? = null) {
        analytics.logEvent(eventName, params)
    }

    // ── Screen tracking ────────────────────────────────────────────────────

    fun logScreenView(screenName: String, screenClass: String) {
        val params = Bundle().apply {
            putString(FirebaseAnalytics.Param.SCREEN_NAME, screenName)
            putString(FirebaseAnalytics.Param.SCREEN_CLASS, screenClass)
        }
        analytics.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW, params)
    }

    // ── Auth events ────────────────────────────────────────────────────────

    fun logLogin(method: String) {
        val params = Bundle().apply {
            putString(FirebaseAnalytics.Param.METHOD, method)
        }
        analytics.logEvent(FirebaseAnalytics.Event.LOGIN, params)
    }

    fun logSignUp(method: String) {
        val params = Bundle().apply {
            putString(FirebaseAnalytics.Param.METHOD, method)
        }
        analytics.logEvent(FirebaseAnalytics.Event.SIGN_UP, params)
    }

    // ── Commerce events ────────────────────────────────────────────────────

    fun logPurchase(itemId: String, itemName: String, price: Double, currency: String) {
        val params = Bundle().apply {
            putString(FirebaseAnalytics.Param.ITEM_ID, itemId)
            putString(FirebaseAnalytics.Param.ITEM_NAME, itemName)
            putDouble(FirebaseAnalytics.Param.PRICE, price)
            putString(FirebaseAnalytics.Param.CURRENCY, currency)
        }
        analytics.logEvent(FirebaseAnalytics.Event.PURCHASE, params)
    }

    fun logAddToCart(itemId: String, itemName: String, price: Double) {
        val params = Bundle().apply {
            putString(FirebaseAnalytics.Param.ITEM_ID, itemId)
            putString(FirebaseAnalytics.Param.ITEM_NAME, itemName)
            putDouble(FirebaseAnalytics.Param.PRICE, price)
        }
        analytics.logEvent(FirebaseAnalytics.Event.ADD_TO_CART, params)
    }

    // ── Search & share ─────────────────────────────────────────────────────

    fun logSearch(searchTerm: String) {
        val params = Bundle().apply {
            putString(FirebaseAnalytics.Param.SEARCH_TERM, searchTerm)
        }
        analytics.logEvent(FirebaseAnalytics.Event.SEARCH, params)
    }

    fun logShare(contentType: String, itemId: String, method: String) {
        val params = Bundle().apply {
            putString(FirebaseAnalytics.Param.CONTENT_TYPE, contentType)
            putString(FirebaseAnalytics.Param.ITEM_ID, itemId)
            putString(FirebaseAnalytics.Param.METHOD, method)
        }
        analytics.logEvent(FirebaseAnalytics.Event.SHARE, params)
    }

    // ── Zaruda custom events ───────────────────────────────────────────────

    fun logPostView(postId: String, postTitle: String) {
        val params = Bundle().apply {
            putString("post_id", postId)
            putString("post_title", postTitle)
        }
        analytics.logEvent("post_view", params)
    }

    fun logLocationDetected(method: String, city: String) {
        val params = Bundle().apply {
            putString("detection_method", method)
            putString("city", city)
        }
        analytics.logEvent("location_detected", params)
    }

    fun logCategoryEnter(categoryKey: String, entryType: String) {
        val params = Bundle().apply {
            putString("category_key", categoryKey)
            putString("entry_type", entryType)
        }
        analytics.logEvent("launcher_enter_category", params)
    }

    // ── User properties ────────────────────────────────────────────────────

    fun setUserProperty(name: String, value: String?) {
        analytics.setUserProperty(name, value)
    }

    fun setUserId(userId: String?) {
        analytics.setUserId(userId)
    }

    fun setUserContext(userId: String?, role: String? = null) {
        analytics.setUserId(userId)
        if (!role.isNullOrBlank()) {
            analytics.setUserProperty("user_role", role)
        }
    }

    fun logOrderCompleted(orderId: String, amount: Double, currency: String = "INR") {
        val params = Bundle().apply {
            putString(FirebaseAnalytics.Param.TRANSACTION_ID, orderId)
            putDouble(FirebaseAnalytics.Param.VALUE, amount)
            putString(FirebaseAnalytics.Param.CURRENCY, currency)
        }
        analytics.logEvent(FirebaseAnalytics.Event.PURCHASE, params)
    }

    fun logError(errorCode: String, errorMessage: String) {
        val params = Bundle().apply {
            putString("error_code", errorCode)
            putString("error_message", errorMessage.take(100))
        }
        analytics.logEvent("app_error", params)
    }
}
