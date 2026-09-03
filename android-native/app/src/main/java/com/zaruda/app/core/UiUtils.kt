package com.zaruda.app.core

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit
import kotlin.math.roundToInt

/**
 * UI/UX utility functions for common patterns across the app.
 * Reference: UI/UX Master Checklist items 10.5, 10.12, 49.10, 49.16
 */
object UiUtils {

    // ── Relative time (Checklist #10.5) ──────────────────────────────────────
    /**
     * Converts a timestamp to a relative time string like "2h ago", "Yesterday", "3d ago".
     * Used on PostCard, Notification items, and chat messages.
     */
    fun relativeTime(timestamp: String?): String {
        if (timestamp.isNullOrBlank()) return ""
        return try {
            val date = parseDate(timestamp) ?: return timestamp
            val now = System.currentTimeMillis()
            val diff = now - date.time
            when {
                diff < TimeUnit.MINUTES.toMillis(1) -> "Just now"
                diff < TimeUnit.HOURS.toMillis(1) -> "${diff / TimeUnit.MINUTES.toMillis(1)}m ago"
                diff < TimeUnit.DAYS.toMillis(1) -> "${diff / TimeUnit.HOURS.toMillis(1)}h ago"
                diff < TimeUnit.DAYS.toMillis(2) -> "Yesterday"
                diff < TimeUnit.DAYS.toMillis(7) -> "${diff / TimeUnit.DAYS.toMillis(1)}d ago"
                diff < TimeUnit.DAYS.toMillis(30) -> "${diff / TimeUnit.DAYS.toMillis(30)}mo ago"
                else -> SimpleDateFormat("MMM d", Locale.getDefault()).format(date)
            }
        } catch (_: Exception) {
            timestamp
        }
    }

    // ── Indian number formatting (Checklist #49.10) ──────────────────────────
    /**
     * Formats a number in Indian numbering system: ₹12,34,567 instead of ₹1,234,567
     */
    fun formatIndianPrice(amount: Double): String {
        if (amount == 0.0) return "₹0"
        val wholePart = amount.toLong()
        val decimalPart = ((amount - wholePart) * 100).roundToInt()

        val formatted = buildString {
            val str = wholePart.toString()
            val len = str.length
            // Last 3 digits
            append(str.substring(maxOf(0, len - 3)))
            // Groups of 2 from right
            var i = len - 3
            while (i > 0) {
                insert(0, ",")
                insert(0, str.substring(maxOf(0, i - 2), i))
                i -= 2
            }
        }

        return if (decimalPart > 0) "₹$formatted.$decimalPart" else "₹$formatted"
    }

    // ── Distance formatting (Checklist #10.12) ────────────────────────────────
    /**
     * Formats distance in km/m for display on PostCard.
     * Shows "2.5 km" for distances > 1km, "800 m" for < 1km.
     */
    fun formatDistance(meters: Double?): String {
        if (meters == null || meters < 0) return ""
        return if (meters >= 1000) {
            val km = meters / 1000.0
            "${String.format(Locale.US, "%.1f", km)} km"
        } else {
            "${meters.roundToInt()} m"
        }
    }

    /**
     * Calculates distance between two lat/lng points using Haversine formula.
     */
    fun haversineDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val r = 6371000.0 // Earth radius in meters
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return r * c
    }

    // ── Time-contextual greeting (Checklist #4.1) ────────────────────────────
    /**
     * Returns a time-appropriate greeting with emoji.
     */
    fun timeGreeting(): String {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        return when {
            hour in 5..11 -> "Good morning"
            hour in 12..16 -> "Good afternoon"
            hour in 17..20 -> "Good evening"
            else -> "Good night"
        }
    }

    fun timeGreetingEmoji(): String {
        val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
        return when {
            hour in 5..11 -> "\uD83C\uDF05" // sunrise
            hour in 12..16 -> "\u2600\uFE0F" // sun
            hour in 17..20 -> "\uD83C\uDF19" // moon
            else -> "\uD83C\uDF03" // night
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun parseDate(timestamp: String): Date? {
        val formats = listOf(
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
            "yyyy-MM-dd'T'HH:mm:ssXXX",
            "yyyy-MM-dd HH:mm:ss",
            "yyyy-MM-dd",
        )
        for (fmt in formats) {
            try {
                return SimpleDateFormat(fmt, Locale.US).parse(timestamp)
            } catch (_: Exception) { /* try next */ }
        }
        return null
    }
}
