package com.mhub.app.ui.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.android.libraries.identity.googleid.GoogleIdTokenParsingException

/**
 * Thin wrapper around Credential Manager + Google Identity Services.
 * Returns either the Google ID token (JWT) to send to the backend, or a user-facing error.
 */
object GoogleSignInHelper {

    sealed interface Result {
        data class Success(val idToken: String) : Result
        data class Error(val message: String, val recoverable: Boolean = true) : Result
        data object Cancelled : Result
    }

    suspend fun signIn(
        context: Context,
        webClientId: String,
        filterByAuthorizedAccounts: Boolean = false,
    ): Result {
        if (webClientId.isBlank() || webClientId.startsWith("REPLACE_")) {
            return Result.Error("Google Sign-In not configured. Set GOOGLE_WEB_CLIENT_ID.", recoverable = false)
        }
        val option = GetGoogleIdOption.Builder()
            .setServerClientId(webClientId)
            .setFilterByAuthorizedAccounts(filterByAuthorizedAccounts)
            .setAutoSelectEnabled(false)
            .build()

        val request = GetCredentialRequest.Builder()
            .addCredentialOption(option)
            .build()

        val cm = CredentialManager.create(context)
        return try {
            val response = cm.getCredential(context, request)
            val cred = response.credential
            if (cred is androidx.credentials.CustomCredential &&
                cred.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
            ) {
                try {
                    val google = GoogleIdTokenCredential.createFrom(cred.data)
                    Result.Success(google.idToken)
                } catch (e: GoogleIdTokenParsingException) {
                    Result.Error("Invalid Google credential")
                }
            } else {
                Result.Error("Unexpected credential type")
            }
        } catch (e: NoCredentialException) {
            // Retry with no filter to allow selecting any Google account.
            if (filterByAuthorizedAccounts) signIn(context, webClientId, false)
            else Result.Error("No Google accounts on this device. Add one in Settings.")
        } catch (e: GetCredentialException) {
            if (e.type.contains("USER_CANCELED", ignoreCase = true)) Result.Cancelled
            else Result.Error(e.message ?: "Google Sign-In failed")
        }
    }
}
