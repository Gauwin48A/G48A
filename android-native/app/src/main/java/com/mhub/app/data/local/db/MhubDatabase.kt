package com.mhub.app.data.local.db

import androidx.room.Database
import androidx.room.RoomDatabase
import com.mhub.app.data.local.OfflineQueueDao
import com.mhub.app.data.local.QueuedAction

@Database(
    entities = [PostEntity::class, CategoryEntity::class, QueuedAction::class],
    version = 2,
    exportSchema = false,
)
abstract class MhubDatabase : RoomDatabase() {
    abstract fun postDao(): PostDao
    abstract fun categoryDao(): CategoryDao
    abstract fun offlineQueueDao(): OfflineQueueDao
}
