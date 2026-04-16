package com.mhub.core.data.repository

import com.mhub.core.common.model.Category
import com.mhub.core.common.model.Notification
import com.mhub.core.common.model.Post
import com.mhub.core.common.model.User
import com.mhub.core.common.result.Result
import com.mhub.core.data.local.dao.CategoryDao
import com.mhub.core.data.local.dao.NotificationDao
import com.mhub.core.data.local.entity.toEntity
import com.mhub.core.data.local.entity.toModel
import com.mhub.core.network.api.CategoriesApi
import com.mhub.core.network.api.NotificationsApi
import com.mhub.core.network.api.ProfileApi
import com.mhub.core.network.api.WishlistApi
import com.mhub.core.network.model.UpdateProfileRequest
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import timber.log.Timber
import javax.inject.Inject

// ─── Category Repository ─────────────────────────────────────────────────

interface CategoryRepository {
    fun observeCategories(): Flow<List<Category>>
    suspend fun fetchCategories(): Result<List<Category>>
    suspend fun fetchSubcategories(categoryId: Int): Result<List<Category>>
}

class CategoryRepositoryImpl @Inject constructor(
    private val categoriesApi: CategoriesApi,
    private val categoryDao: CategoryDao,
) : CategoryRepository {

    override fun observeCategories(): Flow<List<Category>> =
        categoryDao.observeAll().map { entities -> entities.map { it.toModel() } }

    override suspend fun fetchCategories(): Result<List<Category>> {
        return try {
            val response = categoriesApi.getCategories()
            if (response.isSuccessful) {
                val categories = response.body()?.categories ?: emptyList()
                categoryDao.upsertAll(categories.map { it.toEntity() })
                Result.Success(categories)
            } else {
                Result.Error(Exception("Failed to fetch categories"))
            }
        } catch (e: Exception) {
            Timber.e(e, "Fetch categories error")
            Result.Error(e)
        }
    }

    override suspend fun fetchSubcategories(categoryId: Int): Result<List<Category>> {
        return try {
            val response = categoriesApi.getSubcategories(categoryId)
            if (response.isSuccessful) {
                val subs = response.body()?.subcategories ?: emptyList()
                categoryDao.upsertAll(subs.map { it.toEntity() })
                Result.Success(subs)
            } else {
                Result.Error(Exception("Failed to fetch subcategories"))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}

// ─── Notification Repository ─────────────────────────────────────────────

interface NotificationRepository {
    fun observeNotifications(): Flow<List<Notification>>
    fun observeUnreadCount(): Flow<Int>
    suspend fun fetchNotifications(page: Int = 1): Result<List<Notification>>
    suspend fun markAsRead(id: Int): Result<Unit>
    suspend fun markAllAsRead(): Result<Unit>
}

class NotificationRepositoryImpl @Inject constructor(
    private val notificationsApi: NotificationsApi,
    private val notificationDao: NotificationDao,
) : NotificationRepository {

    override fun observeNotifications(): Flow<List<Notification>> =
        notificationDao.observeAll().map { entities -> entities.map { it.toModel() } }

    override fun observeUnreadCount(): Flow<Int> =
        notificationDao.observeUnreadCount()

    override suspend fun fetchNotifications(page: Int): Result<List<Notification>> {
        return try {
            val response = notificationsApi.getNotifications(page)
            if (response.isSuccessful) {
                val notifications = response.body()?.notifications ?: emptyList()
                notificationDao.upsertAll(notifications.map { it.toEntity() })
                Result.Success(notifications)
            } else {
                Result.Error(Exception("Failed to fetch notifications"))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun markAsRead(id: Int): Result<Unit> {
        return try {
            notificationsApi.markAsRead(id)
            notificationDao.markRead(id)
            Result.Success(Unit)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun markAllAsRead(): Result<Unit> {
        return try {
            notificationsApi.markAllAsRead()
            notificationDao.markAllRead()
            Result.Success(Unit)
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}

// ─── Profile Repository ──────────────────────────────────────────────────

interface ProfileRepository {
    suspend fun getProfile(): Result<User>
    suspend fun updateProfile(name: String?, bio: String?, avatar: String?): Result<User>
}

class ProfileRepositoryImpl @Inject constructor(
    private val profileApi: ProfileApi,
) : ProfileRepository {

    override suspend fun getProfile(): Result<User> {
        return try {
            val response = profileApi.getProfile()
            if (response.isSuccessful) {
                val user = response.body()?.user ?: return Result.Error(Exception("No profile"))
                Result.Success(user)
            } else {
                Result.Error(Exception("Failed to load profile"))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun updateProfile(name: String?, bio: String?, avatar: String?): Result<User> {
        return try {
            val response = profileApi.updateProfile(UpdateProfileRequest(name, bio, avatar))
            if (response.isSuccessful) {
                val user = response.body()?.user ?: return Result.Error(Exception("No profile"))
                Result.Success(user)
            } else {
                Result.Error(Exception("Failed to update profile"))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }
}

// ─── Wishlist Repository ─────────────────────────────────────────────────

interface WishlistRepository {
    suspend fun getWishlist(): Result<List<Post>>
    suspend fun addToWishlist(postId: Int): Result<Unit>
    suspend fun removeFromWishlist(postId: Int): Result<Unit>
    suspend fun isInWishlist(postId: Int): Boolean
}

class WishlistRepositoryImpl @Inject constructor(
    private val wishlistApi: WishlistApi,
) : WishlistRepository {

    private val _wishlistIds = mutableSetOf<Int>()

    override suspend fun getWishlist(): Result<List<Post>> {
        return try {
            val response = wishlistApi.getWishlist()
            if (response.isSuccessful) {
                val posts = response.body()?.posts ?: emptyList()
                _wishlistIds.clear()
                _wishlistIds.addAll(posts.map { it.id })
                Result.Success(posts)
            } else {
                Result.Error(Exception("Failed to load wishlist"))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun addToWishlist(postId: Int): Result<Unit> {
        return try {
            val response = wishlistApi.addToWishlist(postId)
            if (response.isSuccessful) {
                _wishlistIds.add(postId)
                Result.Success(Unit)
            } else {
                Result.Error(Exception("Failed to add to wishlist"))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun removeFromWishlist(postId: Int): Result<Unit> {
        return try {
            val response = wishlistApi.removeFromWishlist(postId)
            if (response.isSuccessful) {
                _wishlistIds.remove(postId)
                Result.Success(Unit)
            } else {
                Result.Error(Exception("Failed to remove from wishlist"))
            }
        } catch (e: Exception) {
            Result.Error(e)
        }
    }

    override suspend fun isInWishlist(postId: Int): Boolean = postId in _wishlistIds
}
