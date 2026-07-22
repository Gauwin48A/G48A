package com.zaruda.app.core.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import com.zaruda.app.service.ZarudaFirebaseMessagingService

object NotificationChannelHelper {

    fun createNotificationChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

        val channels = listOf(
            NotificationChannel(
                ZarudaFirebaseMessagingService.CHANNEL_CHAT,
                "Chat & Messages",
                NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "Notifications for private messages and direct chats" },

            NotificationChannel(
                ZarudaFirebaseMessagingService.CHANNEL_TRANSACTION,
                "Orders & Payments",
                NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "Updates regarding your marketplace orders and payment status" },

            NotificationChannel(
                ZarudaFirebaseMessagingService.CHANNEL_PROMOTION,
                "Promotions & Deals",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply { description = "Special discounts, trending sales, and promotional alerts" },

            NotificationChannel(
                ZarudaFirebaseMessagingService.CHANNEL_REWARD,
                "Rewards & Coins",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply { description = "Daily streak rewards, coin balance updates, and referral bonuses" },

            NotificationChannel(
                ZarudaFirebaseMessagingService.CHANNEL_SYSTEM,
                "System & Security",
                NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "Security alerts, app updates, and account policy notices" },

            NotificationChannel(
                ZarudaFirebaseMessagingService.CHANNEL_GENERAL,
                "General Alerts",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply { description = "General platform updates and notifications" }
        )

        channels.forEach { channel ->
            if (manager.getNotificationChannel(channel.id) == null) {
                manager.createNotificationChannel(channel)
            }
        }
    }
}
