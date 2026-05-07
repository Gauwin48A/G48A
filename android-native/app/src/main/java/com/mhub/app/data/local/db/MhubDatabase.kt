package com.mhub.app.data.local.db

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [PostEntity::class, CategoryEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class MhubDatabase : RoomDatabase() {
    abstract fun postDao(): PostDao
    abstract fun categoryDao(): CategoryDao
}
