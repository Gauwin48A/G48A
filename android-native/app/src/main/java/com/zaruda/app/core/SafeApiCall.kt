package com.zaruda.app.core

import kotlinx.coroutines.CancellationException
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import retrofit2.HttpException
import java.io.IOException
import java.net.SocketTimeoutException

private val json = Json { ignoreUnknownKeys = true; coerceInputValues = true }

/**
 * Run a suspending block and map failures to [ApiError] so UI code never deals with raw exceptions.
 */
suspend inline fun <T> safeApiCall(crossinline block: suspend () -> T): ApiResult<T> {
    return try {
        ApiResult.Success(block())
    } catch (ce: CancellationException) {
        throw ce
    } catch (e: SocketTimeoutException) {
        ApiResult.Failure(ApiError.Timeout)
    } catch (e: IOException) {
        ApiResult.Failure(ApiError.Network)
    } catch (e: HttpException) {
        val code = e.code()
        val body = runCatching { e.response()?.errorBody()?.string().orEmpty() }.getOrDefault("")
        val msg = parseErrorMessage(body) ?: "Request failed ($code)"
        val url = runCatching { e.response()?.raw()?.request?.url?.encodedPath }.getOrDefault("?")
        AppLogger.apiError(url ?: "?", "HTTP $code: $msg")
        if (code == 401) ApiResult.Failure(ApiError.Unauthorized)
        else if (code == 403) ApiResult.Failure(ApiError.Forbidden)
        else ApiResult.Failure(ApiError.Http(code, msg))
    } catch (e: Throwable) {
        ApiResult.Failure(ApiError.Unknown(e.message ?: "Unexpected error"))
    }
}

fun parseErrorMessage(body: String?): String? {
    if (body.isNullOrBlank()) return null
    return runCatching {
        val obj = json.parseToJsonElement(body).jsonObject
        (obj["error"] ?: obj["message"])?.jsonPrimitive?.content
    }.getOrNull()
}
