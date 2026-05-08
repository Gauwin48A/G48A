package com.mhub.app.data.local

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.PrimaryKey
import androidx.room.Query

@Entity(tableName = "offline_queue")
data class QueuedAction(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val action: String,
    val payload: String,
    val createdAt: Long,
)

@Dao
interface OfflineQueueDao {
    @Insert
    suspend fun insert(item: QueuedAction)

    @Query("SELECT * FROM offline_queue ORDER BY createdAt ASC")
    suspend fun getAll(): List<QueuedAction>

    @Query("DELETE FROM offline_queue WHERE id = :id")
    suspend fun delete(id: Long)

    @Query("DELETE FROM offline_queue")
    suspend fun clear()
}
