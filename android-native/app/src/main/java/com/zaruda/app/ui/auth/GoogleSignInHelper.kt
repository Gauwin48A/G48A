package com.zaruda.app.ui.auth

import android.content.Context
import android.content.Intent
import android.util.Log
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.zaruda.app.BuildConfig
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * GoogleSignInHelper — safely gates Google Sign-In behind a valid OAuth Web Client ID.
 *
 * When `isConfigured()` returns false (no Web Client ID set), all Google login UI
 * elements should be hidden, and [signIn] is a no-op. This prevents runtime crashes
 * when Google OAuth is not yet provisioned (e.g. local dev, staging, or before Play Console setup).
 *
 * Usage in LoginScreen:
 *   if (GoogleSignInHelper.isConfigured()) { /* show Google button */ }
 */
@Singleton
class GoogleSignInHelper @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    companion object {
        private const val TAG = "GoogleSignInHelper"

        /**
         * Check whether a valid Google OAuth Web Client ID is configured.
         *
         * Returns `true` only when the build has a non-empty, non-placeholder client ID.
         * Safe to call from any thread — reads BuildConfig only.
         */
        fun isConfigured(): Boolean {
            val clientId = BuildConfig.GOOGLE_WEB_CLIENT_ID
            return clientId.isNotBlank()
                && !clientId.contains("REPLACE_WITH")
                && !clientId.contains("your_")
                && clientId.endsWith(".apps.googleusercontent.com")
        }
    }

    private val googleSignInClient: GoogleSignInClient? by lazy {
        if (!isConfigured()) {
            Log.d(TAG, "Google Sign-In not configured — skipping client init")
            return@lazy null
        }
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(BuildConfig.GOOGLE_WEB_CLIENT_ID)
            .requestEmail()
            .build()
        GoogleSignIn.getClient(context, gso)
    }

    /**
     * Launch the Google Sign-In intent. Returns an [Intent] to be used with
     * `ActivityResultContracts.StartActivityForResult`, or `null` if not configured.
     */
    fun signInIntent(): Intent? {
        if (!isConfigured()) {
            Log.w(TAG, "signInIntent called but Google Sign-In is not configured")
            return null
        }
        return googleSignInClient?.signInIntent
    }

    /**
     * Parse the result from the Google Sign-In activity result.
     * Returns the idToken on success, or null on failure/cancellation.
     */
    fun parseResult(data: Intent?): String? {
        if (data == null) return null
        return try {
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            val account = task.getResult(ApiException::class.java)
            account?.idToken
        } catch (e: ApiException) {
            Log.w(TAG, "Google Sign-In failed: code=${e.statusCode}, message=${e.statusMessage}")
            null
        }
    }

    /**
     * Sign out from Google (e.g. on app logout) to clear cached credentials.
     */
    fun signOut(onComplete: (() -> Unit)? = null) {
        if (!isConfigured()) { onComplete?.invoke(); return }
        googleSignInClient?.signOut()?.addOnCompleteListener { onComplete?.invoke() }
    }

    /**
     * Revoke access (full disconnect, e.g. account deletion).
     */
    fun revokeAccess(onComplete: (() -> Unit)? = null) {
        if (!isConfigured()) { onComplete?.invoke(); return }
        googleSignInClient?.revokeAccess()?.addOnCompleteListener { onComplete?.invoke() }
    }
}
