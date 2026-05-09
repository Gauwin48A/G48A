package com.mhub.app.di

import android.content.Context
import androidx.room.Room
import com.mhub.app.core.ConnectivityObserver
import com.mhub.app.data.local.AppPreferences
import com.mhub.app.data.local.TokenStore
import com.mhub.app.data.local.db.AddressDao
import com.mhub.app.data.local.db.CartItemDao
import com.mhub.app.data.local.db.CategoryDao
import com.mhub.app.data.local.db.MhubDatabase
import com.mhub.app.data.local.db.PostDao
import com.mhub.app.data.local.db.RecentlyViewedDao
import com.mhub.app.data.local.db.WishlistItemDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideTokenStore(@ApplicationContext context: Context): TokenStore = TokenStore(context)

    @Provides
    @Singleton
    fun provideAppPreferences(@ApplicationContext context: Context): AppPreferences = AppPreferences(context)

    @Provides
    @Singleton
    fun provideConnectivityObserver(@ApplicationContext context: Context): ConnectivityObserver =
        ConnectivityObserver(context)

    @Provides
    @Singleton
    fun provideMhubDatabase(@ApplicationContext context: Context): MhubDatabase =
        Room.databaseBuilder(context, MhubDatabase::class.java, "mhub.db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides fun providePostDao(db: MhubDatabase): PostDao = db.postDao()

    @Provides fun provideCategoryDao(db: MhubDatabase): CategoryDao = db.categoryDao()

    @Provides fun provideOfflineQueueDao(db: MhubDatabase): com.mhub.app.data.local.OfflineQueueDao = db.offlineQueueDao()

    @Provides fun provideCartItemDao(db: MhubDatabase): CartItemDao = db.cartItemDao()

    @Provides fun provideWishlistItemDao(db: MhubDatabase): WishlistItemDao = db.wishlistItemDao()

    @Provides fun provideRecentlyViewedDao(db: MhubDatabase): RecentlyViewedDao = db.recentlyViewedDao()

    @Provides fun provideAddressDao(db: MhubDatabase): AddressDao = db.addressDao()
}
