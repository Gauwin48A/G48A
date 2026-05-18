package com.mhub.app.core

import android.util.Base64
import org.json.JSONObject

/**
 * Lightweight JWT helper for client-side token expiry checking.
 * Does NOT verify signatures — only decodes the payload for expiry checks.
 */
object JwtHelper {

    /**
     * Returns true if the given JWT is expired or will expire within [bufferSeconds].
     * Returns true (expired) for null/blank/malformed tokens.
     */
    fun isExpired(token: String?, bufferSeconds: Long = 60): Boolean {
        if (token.isNullOrBlank()) return true
        return try {
            val parts = token.split(".")
            if (parts.size != 3) return true
            val payload = String(Base64.decode(parts[1], Base64.URL_SAFE or Base64.NO_WRAP))
            val json = JSONObject(payload)
            val exp = json.optLong("exp", 0L)
            if (exp == 0L) return true
            val nowSec = System.currentTimeMillis() / 1000
            nowSec + bufferSeconds >= exp
        } catch (_: Exception) {
            true
        }
    }

    /**
     * Returns seconds until expiry (negative if already expired).
     * Returns -1 for null/blank/malformed tokens.
     */
    fun secondsUntilExpiry(token: String?): Long {
        if (token.isNullOrBlank()) return -1
        return try {
            val parts = token.split(".")
            if (parts.size != 3) return -1
            val payload = String(Base64.decode(parts[1], Base64.URL_SAFE or Base64.NO_WRAP))
            val json = JSONObject(payload)
            val exp = json.optLong("exp", 0L)
            if (exp == 0L) return -1
            exp - System.currentTimeMillis() / 1000
        } catch (_: Exception) {
            -1
        }
    }
}
