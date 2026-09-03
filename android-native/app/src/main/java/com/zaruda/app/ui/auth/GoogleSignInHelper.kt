package com.zaruda.app.ui.auth

import android.content.Context
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException
import com.zaruda.app.BuildConfig
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * GoogleSignInHelper — modern Credential Manager 1-Tap Google Sign-In.
 *
 * Replaces the legacy GoogleSignInClient with the Jetpack Credential Manager API,
 * which provides a faster, more reliable, and more secure Google Sign-In experience.
 *
 * When [isConfigured] returns false, all Google sign-in UI should be hidden.
 */
@Singleton
class GoogleSignInHelper @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    companion object {
        private const val TAG = "GoogleSignInHelper"

        /**
         * Check whether a valid Google OAuth Web Client ID is configured.
         * Returns true only when the build has a non-empty, non-placeholder client ID.
         */
        fun isConfigured(): Boolean {
            val clientId = BuildConfig.GOOGLE_WEB_CLIENT_ID
            return clientId.isNotBlank()
                && !clientId.contains("REPLACE_WITH")
                && !clientId.contains("your_")
                && clientId.endsWith(".apps.googleusercontent.com")
        }
    }

    private val credentialManager: CredentialManager by lazy {
        CredentialManager.create(context)
    }

    /**
     * Launch Google 1-Tap Sign-In and return the Google ID token.
     *
     * Returns the raw Google ID token string on success, or null on failure/cancellation.
     * This is a suspending function that should be called from a coroutine scope.
     */
    suspend fun signIn(): String? {
        if (!isConfigured()) {
            Log.w(TAG, "signIn called but Google Sign-In is not configured")
            return null
        }

        val googleIdOption = GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false) // Show all Google accounts, not just previously authorized
            .setAutoSelectEnabled(true) // Enable auto-select if user has only one Google account
            .setServerClientId(BuildConfig.GOOGLE_WEB_CLIENT_ID)
            .build()

        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        return try {
            val response = withContext(Dispatchers.IO) {
                credentialManager.getCredential(
                    context = context,
                    request = request,
                )
            }
            parseCredentialResponse(response)
        } catch (e: GetCredentialCancellationException) {
            Log.d(TAG, "Google Sign-In cancelled by user")
            null
        } catch (e: GetCredentialException) {
            Log.w(TAG, "Google Sign-In failed: ${e.message}")
            null
        } catch (e: Exception) {
            Log.e(TAG, "Google Sign-In unexpected error", e)
            null
        }
    }

    /**
     * Parse the Credential Manager response and extract the Google ID token.
     */
    private fun parseCredentialResponse(response: GetCredentialResponse): String? {
        val credential = response.credential

        return try {
            val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
            googleIdTokenCredential.idToken
        } catch (e: GoogleIdTokenParsingException) {
            Log.w(TAG, "Failed to parse Google ID token: ${e.message}")
            null
        } catch (e: Exception) {
            Log.e(TAG, "Unexpected error parsing credential", e)
            null
        }
    }

    /**
     * Clear any cached credentials (e.g. on logout).
     * Note: Credential Manager doesn't have a direct sign-out like GoogleSignInClient,
     * but clearing preferences can help reset the state.
     */
    fun signOut(onComplete: (() -> Unit)? = null) {
        // Credential Manager doesn't cache sessions the same way legacy GoogleSignIn did.
        // The user will be shown the account picker on next sign-in attempt.
        Log.d(TAG, "Google sign-out (Credential Manager) — no cached session to clear")
        onComplete?.invoke()
    }

    /**
     * Revoke access — not directly supported by Credential Manager.
     * For full account disconnect, users should manage via Google account settings.
     */
    fun revokeAccess(onComplete: (() -> Unit)? = null) {
        Log.d(TAG, "Google revoke access — Credential Manager does not support direct revoke")
        onComplete?.invoke()
    }
}
