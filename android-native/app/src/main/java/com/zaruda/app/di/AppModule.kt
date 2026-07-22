package com.zaruda.app.di

import android.content.Context
import androidx.room.Room
import com.zaruda.app.core.ConnectivityObserver
import com.zaruda.app.data.local.AppPreferences
import com.zaruda.app.data.local.TokenStore
import com.zaruda.app.data.local.db.AddressDao
import com.zaruda.app.data.local.db.CartItemDao
import com.zaruda.app.data.local.db.CategoryDao
import com.zaruda.app.data.local.db.ZarudaDatabase
import com.zaruda.app.data.local.db.PostDao
import com.zaruda.app.data.local.db.RecentlyViewedDao
import com.zaruda.app.data.local.db.WishlistItemDao
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
    fun provideZarudaDatabase(@ApplicationContext context: Context): ZarudaDatabase =
        Room.databaseBuilder(context, ZarudaDatabase::class.java, "zaruda.db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides fun providePostDao(db: ZarudaDatabase): PostDao = db.postDao()

    @Provides fun provideCategoryDao(db: ZarudaDatabase): CategoryDao = db.categoryDao()

    @Provides fun provideOfflineQueueDao(db: ZarudaDatabase): com.zaruda.app.data.local.OfflineQueueDao = db.offlineQueueDao()

    @Provides fun provideCartItemDao(db: ZarudaDatabase): CartItemDao = db.cartItemDao()

    @Provides fun provideWishlistItemDao(db: ZarudaDatabase): WishlistItemDao = db.wishlistItemDao()

    @Provides fun provideRecentlyViewedDao(db: ZarudaDatabase): RecentlyViewedDao = db.recentlyViewedDao()

    @Provides fun provideAddressDao(db: ZarudaDatabase): AddressDao = db.addressDao()
}
