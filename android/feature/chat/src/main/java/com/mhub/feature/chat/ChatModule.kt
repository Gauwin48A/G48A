package com.mhub.feature.chat

import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Named
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object ChatModule {

    @Provides
    @Singleton
    fun provideChatSocketManager(
        @Named("ws_base_url") wsBaseUrl: String,
    ): ChatSocketManager = ChatSocketManager(wsBaseUrl)
}
