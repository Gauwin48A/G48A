package com.mhub.app.data.local.db

import androidx.room.*

@Dao
interface PostDao {
    @Query("SELECT * FROM posts ORDER BY cachedAt DESC")
    suspend fun getAll(): List<PostEntity>

    @Query("SELECT * FROM posts WHERE categoryId = :categoryId ORDER BY cachedAt DESC")
    suspend fun getByCategory(categoryId: String): List<PostEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(posts: List<PostEntity>)

    @Query("DELETE FROM posts")
    suspend fun clearAll()

    @Query("DELETE FROM posts WHERE cachedAt < :olderThan")
    suspend fun evictStale(olderThan: Long)
}
