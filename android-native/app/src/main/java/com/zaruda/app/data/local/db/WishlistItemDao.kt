package com.zaruda.app.data.local.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface WishlistItemDao {
    @Query("SELECT * FROM wishlist_items ORDER BY savedAt DESC")
    fun observeAll(): Flow<List<WishlistItemEntity>>

    @Query("SELECT * FROM wishlist_items ORDER BY savedAt DESC")
    suspend fun getAll(): List<WishlistItemEntity>

    @Query("SELECT COUNT(*) FROM wishlist_items")
    fun observeCount(): Flow<Int>

    @Query("SELECT EXISTS(SELECT 1 FROM wishlist_items WHERE postId = :postId)")
    fun observeContains(postId: String): Flow<Boolean>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: WishlistItemEntity)

    @Query("DELETE FROM wishlist_items WHERE postId = :postId")
    suspend fun deleteByPostId(postId: String)

    @Query("DELETE FROM wishlist_items WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM wishlist_items")
    suspend fun clearAll()
}
