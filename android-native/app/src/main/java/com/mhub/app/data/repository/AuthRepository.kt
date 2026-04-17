package com.mhub.app.data.repository

import com.mhub.app.core.ApiResult
import com.mhub.app.core.safeApiCall
import com.mhub.app.data.local.TokenStore
import com.mhub.app.data.remote.MhubApi
import com.mhub.app.data.remote.dto.GoogleAuthRequest
import com.mhub.app.domain.model.User
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: MhubApi,
    private val tokenStore: TokenStore,
) {
    val isAuthenticated: Flow<Boolean> = tokenStore.accessToken.map { !it.isNullOrBlank() }
    val accessTokenFlow: StateFlow<String?> = tokenStore.accessToken

    /** Exchanges a Google ID token for an app JWT. */
    suspend fun signInWithGoogle(idToken: String): ApiResult<User?> = safeApiCall {
        val res = api.googleSignIn(GoogleAuthRequest(idToken))
        val token = res.token ?: error("Server did not return token")
        tokenStore.save(token, res.refreshToken)
        res.user
    }

    suspend fun logout(): ApiResult<Unit> = safeApiCall {
        runCatching { api.logout() }
        tokenStore.clear()
        Unit
    }

    suspend fun me(): ApiResult<User> = safeApiCall { api.me() }
}
