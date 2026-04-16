package com.mhub.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.StrictMode
import dagger.hilt.android.HiltAndroidApp
import timber.log.Timber

@HiltAndroidApp
class MhubApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        // Logging
        if (BuildConfig.DEBUG) {
            Timber.plant(Timber.DebugTree())
            enableStrictMode()
        }

        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        val manager = getSystemService(NotificationManager::class.java) ?: return
        val channels = listOf(
            NotificationChannel(
                CHANNEL_CHAT, "Chat Messages",
                NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "Messages from chats" },
            NotificationChannel(
                CHANNEL_TRANSACTIONS, "Transactions",
                NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "Transaction and payment updates" },
            NotificationChannel(
                CHANNEL_PROMOTIONS, "Promotions",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply { description = "Deals and promotional offers" },
            NotificationChannel(
                CHANNEL_REWARDS, "Rewards",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply { description = "Reward and referral notifications" },
            NotificationChannel(
                CHANNEL_SYSTEM, "System",
                NotificationManager.IMPORTANCE_LOW
            ).apply { description = "System alerts and security notices" },
            NotificationChannel(
                CHANNEL_GENERAL, "General",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply { description = "General notifications" },
        )
        manager.createNotificationChannels(channels)
    }

    private fun enableStrictMode() {
        StrictMode.setThreadPolicy(
            StrictMode.ThreadPolicy.Builder()
                .detectDiskReads()
                .detectDiskWrites()
                .detectNetwork()
                .penaltyLog()
                .build()
        )
        StrictMode.setVmPolicy(
            StrictMode.VmPolicy.Builder()
                .detectLeakedSqlLiteObjects()
                .detectLeakedClosableObjects()
                .detectActivityLeaks()
                .penaltyLog()
                .build()
        )
    }

    companion object {
        const val CHANNEL_CHAT = "chat_messages"
        const val CHANNEL_TRANSACTIONS = "transactions"
        const val CHANNEL_PROMOTIONS = "promotions"
        const val CHANNEL_REWARDS = "rewards"
        const val CHANNEL_SYSTEM = "system"
        const val CHANNEL_GENERAL = "general"
    }
}
