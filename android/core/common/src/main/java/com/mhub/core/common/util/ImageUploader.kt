package com.mhub.core.common.util

import android.content.Context
import android.net.Uri
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

data class ImageUploadResult(
    val url: String,
    val filename: String,
)

@Singleton
class ImageUploader @Inject constructor(
    @ApplicationContext private val context: Context,
    private val okHttpClient: OkHttpClient,
    @javax.inject.Named("base_url") private val baseUrl: String,
) {
    suspend fun uploadImage(uri: Uri): Result<ImageUploadResult> = withContext(Dispatchers.IO) {
        try {
            val contentResolver = context.contentResolver
            val mimeType = contentResolver.getType(uri) ?: "image/jpeg"
            val inputStream = contentResolver.openInputStream(uri)
                ?: return@withContext Result.failure(Exception("Cannot open file"))

            val bytes = inputStream.use { it.readBytes() }
            val fileName = getFileName(uri) ?: "image_${System.currentTimeMillis()}.jpg"

            val requestBody = MultipartBody.Builder()
                .setType(MultipartBody.FORM)
                .addFormDataPart(
                    "image",
                    fileName,
                    bytes.toRequestBody(mimeType.toMediaType()),
                )
                .build()

            val request = Request.Builder()
                .url("${baseUrl}api/upload/image")
                .post(requestBody)
                .build()

            val response = okHttpClient.newCall(request).execute()
            if (response.isSuccessful) {
                val body = response.body?.string() ?: ""
                // Parse the URL from JSON response
                val urlRegex = """"url"\s*:\s*"([^"]+)"""".toRegex()
                val match = urlRegex.find(body)
                val imageUrl = match?.groupValues?.get(1)
                    ?: return@withContext Result.failure(Exception("No URL in response"))

                Result.success(ImageUploadResult(url = imageUrl, filename = fileName))
            } else {
                Result.failure(Exception("Upload failed: ${response.code}"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Image upload error")
            Result.failure(e)
        }
    }

    suspend fun uploadMultipleImages(uris: List<Uri>): List<Result<ImageUploadResult>> {
        return uris.map { uploadImage(it) }
    }

    private fun getFileName(uri: Uri): String? {
        val cursor = context.contentResolver.query(uri, null, null, null, null)
        return cursor?.use {
            if (it.moveToFirst()) {
                val nameIndex = it.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                if (nameIndex >= 0) it.getString(nameIndex) else null
            } else null
        }
    }
}
