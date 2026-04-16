package com.mhub.core.network.api

import com.mhub.core.network.model.*
import retrofit2.Call
import retrofit2.Response
import retrofit2.http.*

interface AuthApi {

    @GET("api/auth/csrf-token")
    suspend fun getCsrfToken(): Response<CsrfTokenResponse>

    @GET("api/auth/session")
    suspend fun getSession(): Response<SessionResponse>

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("api/auth/signup")
    suspend fun signup(@Body request: SignupRequest): Response<AuthResponse>

    @POST("api/auth/send-otp")
    suspend fun sendOtp(@Body request: SendOtpRequest): Response<OtpResponse>

    @POST("api/auth/verify-otp")
    suspend fun verifyOtp(@Body request: VerifyOtpRequest): Response<AuthResponse>

    @POST("api/auth/forgot-password")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequest): Response<MessageResponse>

    @POST("api/auth/reset-password")
    suspend fun resetPassword(@Body request: ResetPasswordRequest): Response<MessageResponse>

    @POST("api/auth/refresh-token")
    suspend fun refreshToken(): Response<AuthResponse>

    /** Synchronous version for use in OkHttp interceptor */
    @POST("api/auth/refresh-token")
    fun refreshTokenSync(): Call<AuthResponse>

    @POST("api/auth/logout")
    suspend fun logout(): Response<MessageResponse>

    @GET("api/auth/me")
    suspend fun getMe(): Response<UserResponse>

    @POST("api/auth/change-password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): Response<MessageResponse>

    @GET("api/auth/sessions")
    suspend fun getSessions(): Response<SessionsListResponse>

    @DELETE("api/auth/sessions/{sessionId}")
    suspend fun revokeSession(@Path("sessionId") sessionId: String): Response<MessageResponse>

    @DELETE("api/auth/sessions")
    suspend fun revokeAllSessions(): Response<MessageResponse>

    @POST("api/auth/social/google")
    suspend fun googleLogin(@Body request: GoogleLoginRequest): Response<AuthResponse>
}
