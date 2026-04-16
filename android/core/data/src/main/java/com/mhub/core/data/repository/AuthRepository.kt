package com.mhub.core.data.repository

import com.mhub.core.common.model.User
import com.mhub.core.common.result.Result
import com.mhub.core.network.api.AuthApi
import com.mhub.core.network.model.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import timber.log.Timber
import javax.inject.Inject

interface AuthRepository {
    val currentUser: Flow<User?>
    val isAuthenticated: Flow<Boolean>
    suspend fun bootstrapCsrf(): Result<Unit>
    suspend fun checkSession(): Result<User?>
    suspend fun login(identifier: String, password: String): Result<User>
    suspend fun signup(name: String, email: String, phone: String, password: String): Result<User>
    suspend fun sendOtp(phone: String): Result<Unit>
    suspend fun verifyOtp(phone: String, otp: String): Result<User>
    suspend fun forgotPassword(identifier: String): Result<String>
    suspend fun resetPassword(token: String, password: String): Result<String>
    suspend fun logout(): Result<Unit>
    suspend fun refreshToken(): Result<Unit>
    fun clearSession()
}

class AuthRepositoryImpl @Inject constructor(
    private val authApi: AuthApi,
) : AuthRepository {

    private val _currentUser = MutableStateFlow<User?>(null)
    override val currentUser: Flow<User?> = _currentUser.asStateFlow()

    private val _isAuthenticated = MutableStateFlow(false)
    override val isAuthenticated: Flow<Boolean> = _isAuthenticated.asStateFlow()

    override suspend fun bootstrapCsrf(): Result<Unit> {
        return try {
            val response = authApi.getCsrfToken()
            if (response.isSuccessful) {
                Timber.d("CSRF token bootstrapped")
                Result.Success(Unit)
            } else {
                Result.Error(Exception("CSRF bootstrap failed: ${response.code()}"))
            }
        } catch (e: Exception) {
            Timber.e(e, "CSRF bootstrap error")
            Result.Error(e)
        }
    }

    override suspend fun checkSession(): Result<User?> {
        return try {
            val response = authApi.getSession()
            if (response.isSuccessful) {
                val session = response.body()
                if (session?.authenticated == true) {
                    _currentUser.value = session.user
                    _isAuthenticated.value = true
                    Result.Success(session.user)
                } else {
                    _isAuthenticated.value = false
                    Result.Success(null)
                }
            } else {
                _isAuthenticated.value = false
                Result.Success(null)
            }
        } catch (e: Exception) {
            Timber.e(e, "Session check error")
            Result.Error(e)
        }
    }

    override suspend fun login(identifier: String, password: String): Result<User> {
        return try {
            val response = authApi.login(LoginRequest(identifier, password))
            if (response.isSuccessful && response.body()?.success == true) {
                val user = response.body()?.user ?: return Result.Error(Exception("No user in response"))
                _currentUser.value = user
                _isAuthenticated.value = true
                Result.Success(user)
            } else {
                val msg = response.body()?.message ?: "Login failed"
                Result.Error(Exception(msg), msg)
            }
        } catch (e: Exception) {
            Timber.e(e, "Login error")
            Result.Error(e, "Network error. Please try again.")
        }
    }

    override suspend fun signup(name: String, email: String, phone: String, password: String): Result<User> {
        return try {
            val response = authApi.signup(SignupRequest(name, email, phone, password))
            if (response.isSuccessful && response.body()?.success == true) {
                val user = response.body()?.user ?: return Result.Error(Exception("No user in response"))
                _currentUser.value = user
                _isAuthenticated.value = true
                Result.Success(user)
            } else {
                val msg = response.body()?.message ?: "Signup failed"
                Result.Error(Exception(msg), msg)
            }
        } catch (e: Exception) {
            Timber.e(e, "Signup error")
            Result.Error(e, "Network error. Please try again.")
        }
    }

    override suspend fun sendOtp(phone: String): Result<Unit> {
        return try {
            val response = authApi.sendOtp(SendOtpRequest(phone))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(Unit)
            } else {
                val msg = response.body()?.message ?: "Failed to send OTP"
                Result.Error(Exception(msg), msg)
            }
        } catch (e: Exception) {
            Result.Error(e, "Network error")
        }
    }

    override suspend fun verifyOtp(phone: String, otp: String): Result<User> {
        return try {
            val response = authApi.verifyOtp(VerifyOtpRequest(phone, otp))
            if (response.isSuccessful && response.body()?.success == true) {
                val user = response.body()?.user ?: return Result.Error(Exception("No user"))
                _currentUser.value = user
                _isAuthenticated.value = true
                Result.Success(user)
            } else {
                val msg = response.body()?.message ?: "OTP verification failed"
                Result.Error(Exception(msg), msg)
            }
        } catch (e: Exception) {
            Result.Error(e, "Network error")
        }
    }

    override suspend fun forgotPassword(identifier: String): Result<String> {
        return try {
            val response = authApi.forgotPassword(ForgotPasswordRequest(identifier))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()?.message ?: "Reset link sent")
            } else {
                val msg = response.body()?.message ?: "Failed"
                Result.Error(Exception(msg), msg)
            }
        } catch (e: Exception) {
            Result.Error(e, "Network error")
        }
    }

    override suspend fun resetPassword(token: String, password: String): Result<String> {
        return try {
            val response = authApi.resetPassword(ResetPasswordRequest(token, password))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.Success(response.body()?.message ?: "Password reset")
            } else {
                val msg = response.body()?.message ?: "Reset failed"
                Result.Error(Exception(msg), msg)
            }
        } catch (e: Exception) {
            Result.Error(e, "Network error")
        }
    }

    override suspend fun logout(): Result<Unit> {
        return try {
            authApi.logout()
            clearSession()
            Result.Success(Unit)
        } catch (e: Exception) {
            clearSession()
            Result.Error(e)
        }
    }

    override suspend fun refreshToken(): Result<Unit> {
        return try {
            val response = authApi.refreshToken()
            if (response.isSuccessful) Result.Success(Unit)
            else Result.Error(Exception("Refresh failed"))
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override fun clearSession() {
        _currentUser.value = null
        _isAuthenticated.value = false
    }
}
