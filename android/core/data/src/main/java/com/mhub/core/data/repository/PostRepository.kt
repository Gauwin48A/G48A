package com.mhub.core.data.repository

import com.mhub.core.common.model.Post
import com.mhub.core.common.result.Result
import com.mhub.core.data.local.dao.PostDao
import com.mhub.core.data.local.entity.toEntity
import com.mhub.core.data.local.entity.toModel
import com.mhub.core.network.api.PostsApi
import com.mhub.core.network.model.CreatePostRequest
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import timber.log.Timber
import javax.inject.Inject

interface PostRepository {
    fun observePosts(): Flow<List<Post>>
    fun observePost(id: Int): Flow<Post?>
    suspend fun fetchPosts(page: Int = 1, category: String? = null, search: String? = null): Result<List<Post>>
    suspend fun fetchPost(id: Int): Result<Post>
    suspend fun fetchUserPosts(userId: Int, page: Int = 1): Result<List<Post>>
    suspend fun createPost(request: CreatePostRequest): Result<Post>
    suspend fun updatePost(id: Int, request: CreatePostRequest): Result<Post>
    suspend fun deletePost(id: Int): Result<Unit>
}

class PostRepositoryImpl @Inject constructor(
    private val postsApi: PostsApi,
    private val postDao: PostDao,
) : PostRepository {

    override fun observePosts(): Flow<List<Post>> =
        postDao.observeAll().map { entities -> entities.map { it.toModel() } }

    override fun observePost(id: Int): Flow<Post?> =
        postDao.observeById(id).map { it?.toModel() }

    override suspend fun fetchPosts(page: Int, category: String?, search: String?): Result<List<Post>> {
        return try {
            val response = postsApi.getPosts(page = page, category = category, search = search)
            if (response.isSuccessful) {
                val posts = response.body()?.posts ?: emptyList()
                postDao.upsertAll(posts.map { it.toEntity() })
                Result.Success(posts)
            } else {
                Result.Error(Exception("Failed to fetch posts: ${response.code()}"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Fetch posts error")
            Result.Error(e, "Could not load posts. Check your connection.")
        }
    }

    override suspend fun fetchPost(id: Int): Result<Post> {
        return try {
            val response = postsApi.getPost(id)
            if (response.isSuccessful) {
                val post = response.body()?.post ?: return Result.Error(Exception("Post not found"))
                postDao.upsert(post.toEntity())
                Result.Success(post)
            } else {
                Result.Error(Exception("Post not found"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Fetch post error")
            Result.Error(e)
        }
    }

    override suspend fun fetchUserPosts(userId: Int, page: Int): Result<List<Post>> {
        return try {
            val response = postsApi.getUserPosts(userId, page)
            if (response.isSuccessful) {
                val posts = response.body()?.posts ?: emptyList()
                Result.Success(posts)
            } else {
                Result.Error(Exception("Failed to fetch user posts: ${response.code()}"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Fetch user posts error")
            Result.Error(e, "Could not load your posts.")
        }
    }

    override suspend fun createPost(request: CreatePostRequest): Result<Post> {
        return try {
            val response = postsApi.createPost(request)
            if (response.isSuccessful) {
                val post = response.body()?.post ?: return Result.Error(Exception("No post returned"))
                postDao.upsert(post.toEntity())
                Result.Success(post)
            } else {
                Result.Error(Exception("Failed to create post"))
            }
        } catch (e: Exception) {
            Result.Error(e, "Could not create post")
        }
    }

    override suspend fun updatePost(id: Int, request: CreatePostRequest): Result<Post> {
        return try {
            val response = postsApi.updatePost(id, request)
            if (response.isSuccessful) {
                val post = response.body()?.post ?: return Result.Error(Exception("No post returned"))
                postDao.upsert(post.toEntity())
                Result.Success(post)
            } else {
                Result.Error(Exception("Failed to update post"))
            }
        } catch (e: Exception) {
            Result.Error(e, "Could not update post")
        }
    }

    override suspend fun deletePost(id: Int): Result<Unit> {
        return try {
            val response = postsApi.deletePost(id)
            if (response.isSuccessful) {
                postDao.getById(id)?.let { postDao.delete(it) }
                Result.Success(Unit)
            } else {
                Result.Error(Exception("Failed to delete post"))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}
