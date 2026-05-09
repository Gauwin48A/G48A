package com.mhub.app.data.local.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface RecentlyViewedDao {
    @Query("SELECT * FROM recently_viewed ORDER BY viewedAt DESC LIMIT 50")
    fun observeAll(): Flow<List<RecentlyViewedEntity>>

    @Query("SELECT * FROM recently_viewed ORDER BY viewedAt DESC LIMIT 50")
    suspend fun getAll(): List<RecentlyViewedEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: RecentlyViewedEntity)

    @Query("DELETE FROM recently_viewed WHERE postId = :postId")
    suspend fun delete(postId: String)

    @Query("DELETE FROM recently_viewed")
    suspend fun clearAll()
}
