package com.mhub.app.core

/**
 * Minimal, ergonomic Result type for network and repository layer.
 * Avoids Kotlin's built-in kotlin.Result in public API (it has compiler restrictions).
 */
sealed interface ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>
    data class Failure(val error: ApiError) : ApiResult<Nothing>
}

sealed class ApiError(open val message: String) {
    object Network : ApiError("Can't reach MHub services. Check your internet or API URL in Settings.")
    object Timeout : ApiError("Server took too long to respond. Please try again.")
    object Unauthorized : ApiError("Authentication required. Please sign in.")
    object Forbidden : ApiError("You don't have permission to access this resource.")
    data class Http(val code: Int, override val message: String) : ApiError(message)
    data class Unknown(override val message: String) : ApiError(message)
}

inline fun <T, R> ApiResult<T>.map(transform: (T) -> R): ApiResult<R> = when (this) {
    is ApiResult.Success -> ApiResult.Success(transform(data))
    is ApiResult.Failure -> this
}

inline fun <T> ApiResult<T>.onSuccess(block: (T) -> Unit): ApiResult<T> {
    if (this is ApiResult.Success) block(data)
    return this
}

inline fun <T> ApiResult<T>.onFailure(block: (ApiError) -> Unit): ApiResult<T> {
    if (this is ApiResult.Failure) block(error)
    return this
}
