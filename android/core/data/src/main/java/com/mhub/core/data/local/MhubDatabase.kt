package com.mhub.core.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.mhub.core.data.local.dao.PostDao
import com.mhub.core.data.local.dao.CategoryDao
import com.mhub.core.data.local.dao.NotificationDao
import com.mhub.core.data.local.entity.PostEntity
import com.mhub.core.data.local.entity.CategoryEntity
import com.mhub.core.data.local.entity.NotificationEntity
import com.mhub.core.data.local.converter.Converters

@Database(
    entities = [
        PostEntity::class,
        CategoryEntity::class,
        NotificationEntity::class,
    ],
    version = 2,
    exportSchema = true,
)
@TypeConverters(Converters::class)
abstract class MhubDatabase : RoomDatabase() {
    abstract fun postDao(): PostDao
    abstract fun categoryDao(): CategoryDao
    abstract fun notificationDao(): NotificationDao
}
