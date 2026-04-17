package com.mhub.app.data.repository

import com.mhub.app.core.ApiResult
import com.mhub.app.core.safeApiCall
import com.mhub.app.data.remote.MhubApi
import com.mhub.app.data.remote.dto.CreatePostRequest
import com.mhub.app.data.remote.dto.KycStatusResponse
import com.mhub.app.data.remote.dto.KycSubmitRequest
import com.mhub.app.data.remote.dto.KycSubmitResponse
import com.mhub.app.domain.model.Category
import com.mhub.app.domain.model.Post
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PostsRepository @Inject constructor(private val api: MhubApi) {
    suspend fun feed(
        page: Int = 1,
        limit: Int = 20,
        categoryId: String? = null,
        query: String? = null,
    ): ApiResult<List<Post>> = safeApiCall {
        api.posts(page, limit, categoryId, query).items
    }

    suspend fun detail(id: String): ApiResult<Post> = safeApiCall { api.post(id) }

    suspend fun create(req: CreatePostRequest): ApiResult<String> = safeApiCall {
        api.createPost(req).id ?: error("No id returned")
    }

    suspend fun mine(): ApiResult<List<Post>> = safeApiCall { api.myPosts().items }

    suspend fun delete(id: String): ApiResult<Unit> = safeApiCall { api.deletePost(id); Unit }
}

@Singleton
class CategoriesRepository @Inject constructor(private val api: MhubApi) {
    suspend fun all(): ApiResult<List<Category>> = safeApiCall { api.categories().items }
}

@Singleton
class WishlistRepository @Inject constructor(private val api: MhubApi) {
    suspend fun list(): ApiResult<List<Post>> = safeApiCall { api.wishlist().posts }
    suspend fun add(postId: String): ApiResult<Unit> = safeApiCall { api.addWishlist(postId); Unit }
    suspend fun remove(postId: String): ApiResult<Unit> = safeApiCall { api.removeWishlist(postId); Unit }
}

@Singleton
class UploadRepository @Inject constructor(private val api: MhubApi) {
    suspend fun uploadPostImage(bytes: ByteArray, mime: String): ApiResult<String> = safeApiCall {
        val body: RequestBody = bytes.toRequestBody(mime.toMediaType())
        api.uploadPostImage(body).url ?: error("Upload failed: no URL")
    }

    suspend fun uploadKycDoc(bytes: ByteArray, mime: String, slot: String): ApiResult<String> = safeApiCall {
        val body: RequestBody = bytes.toRequestBody(mime.toMediaType())
        api.uploadKycDoc(slot, body).key
    }
}

@Singleton
class KycRepository @Inject constructor(private val api: MhubApi) {
    suspend fun status(): ApiResult<KycStatusResponse> = safeApiCall { api.kycStatus() }
    suspend fun submit(req: KycSubmitRequest): ApiResult<KycSubmitResponse> =
        safeApiCall { api.submitKyc(req) }
}
