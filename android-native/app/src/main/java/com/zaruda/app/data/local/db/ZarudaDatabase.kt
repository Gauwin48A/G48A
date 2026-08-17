package com.zaruda.app.data.local.db

import androidx.room.Database
import androidx.room.RoomDatabase
import com.zaruda.app.data.local.OfflineQueueDao
import com.zaruda.app.data.local.QueuedAction

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
    version = 4,
    exportSchema = false,
)
abstract class ZarudaDatabase : RoomDatabase() {
    abstract fun postDao(): PostDao
    abstract fun categoryDao(): CategoryDao
    abstract fun offlineQueueDao(): OfflineQueueDao
    abstract fun cartItemDao(): CartItemDao
    abstract fun wishlistItemDao(): WishlistItemDao
    abstract fun recentlyViewedDao(): RecentlyViewedDao
    abstract fun addressDao(): AddressDao

    companion object {
        /** v3 → v4: cart items gain seller_id (for Electronics in-app escrow purchases). */
        val MIGRATION_3_4 = object : androidx.room.migration.Migration(3, 4) {
            override fun migrate(db: androidx.sqlite.db.SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE cart_items ADD COLUMN sellerId TEXT DEFAULT NULL")
            }
        }
    }
}
