package com.mhub.core.data.di

import android.content.Context
import androidx.room.Room
import com.mhub.core.data.local.MhubDatabase
import com.mhub.core.data.local.dao.CategoryDao
import com.mhub.core.data.local.dao.NotificationDao
import com.mhub.core.data.local.dao.PostDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): MhubDatabase {
        return Room.databaseBuilder(
            context,
            MhubDatabase::class.java,
            "mhub_database"
        )
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides fun providePostDao(db: MhubDatabase): PostDao = db.postDao()
    @Provides fun provideCategoryDao(db: MhubDatabase): CategoryDao = db.categoryDao()
    @Provides fun provideNotificationDao(db: MhubDatabase): NotificationDao = db.notificationDao()
}
