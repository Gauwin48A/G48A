package com.mhub.app.data.local.db

import androidx.room.Database
import androidx.room.RoomDatabase
import com.mhub.app.data.local.OfflineQueueDao
import com.mhub.app.data.local.QueuedAction

@Database(
    entities = [
        PostEntity::class,
        CategoryEntity::class,
        QueuedAction::class,
        CartItemEntity::class,
        WishlistItemEntity::class,
        RecentlyViewedEntity::class,
        AddressEntity::class,
    ],
    version = 3,
    exportSchema = false,
)
abstract class MhubDatabase : RoomDatabase() {
    abstract fun postDao(): PostDao
    abstract fun categoryDao(): CategoryDao
    abstract fun offlineQueueDao(): OfflineQueueDao
    abstract fun cartItemDao(): CartItemDao
    abstract fun wishlistItemDao(): WishlistItemDao
    abstract fun recentlyViewedDao(): RecentlyViewedDao
    abstract fun addressDao(): AddressDao
}
