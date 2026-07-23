package com.zaruda.app.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.zaruda.app.MainActivity
import com.zaruda.app.R
import com.zaruda.app.data.local.TokenStore
import com.zaruda.app.data.remote.ZarudaApi
import com.zaruda.app.data.remote.dto.PushTokenRequest
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject
import android.util.Log


@AndroidEntryPoint
class ZarudaFirebaseMessagingService : FirebaseMessagingService() {

    @Inject lateinit var api: ZarudaApi
    @Inject lateinit var tokenStore: TokenStore

    private val serviceJob = SupervisorJob()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)

    override fun onDestroy() {
        super.onDestroy()
        serviceJob.cancel()
    }

    companion object {
        const val CHANNEL_CHAT        = "chat_messages"
        const val CHANNEL_TRANSACTION = "transactions"
        const val CHANNEL_PROMOTION   = "promotions"
        const val CHANNEL_REWARD      = "rewards"
        const val CHANNEL_SYSTEM      = "system"
        const val CHANNEL_GENERAL     = "general"

        private const val NOTIFICATION_ID_BASE = 1000
    }

    /** Called when FCM delivers a new registration token. */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d("ZARUDA-FCM", "✅ FCM Token = $token")
        
        if (tokenStore.isAuthenticated) {
            registerTokenWithServer(token)
        }
    }

    /** Called when a message arrives while the app is in foreground or data-only message in background. */
    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)


Log.d("ZARUDA-FCM", "✅ Push notification received")
Log.d("ZARUDA-FCM", "Title = ${message.notification?.title}")
Log.d("ZARUDA-FCM", "Data = ${message.data}")

        val title = message.notification?.title ?: message.data["title"] ?: "MHub Alert"
        val body  = message.notification?.body  ?: message.data["message"] ?: message.data["body"] ?: ""
        val imageUrl = message.notification?.imageUrl?.toString() ?: message.data["image_url"] ?: message.data["image"]
        val deepLink = message.data["deep_link"] ?: message.data["action"] ?: ""
        val type = message.data["type"] ?: "system"

        val serverChannelId = message.data["android_channel_id"] ?: message.data["channelId"]
        val channelId = serverChannelId ?: when {
            type.contains("chat", ignoreCase = true) || type.contains("message", ignoreCase = true) -> CHANNEL_CHAT
            type.contains("transaction", ignoreCase = true) || type.contains("order", ignoreCase = true) || type.contains("pay", ignoreCase = true) -> CHANNEL_TRANSACTION
            type.contains("promo", ignoreCase = true) || type.contains("offer", ignoreCase = true) || type.contains("marketing", ignoreCase = true) -> CHANNEL_PROMOTION
            type.contains("reward", ignoreCase = true) || type.contains("coin", ignoreCase = true) -> CHANNEL_REWARD
            type.contains("system", ignoreCase = true) || type.contains("security", ignoreCase = true) -> CHANNEL_SYSTEM
            else -> CHANNEL_GENERAL
        }

        val notifId = message.messageId?.hashCode() ?: System.currentTimeMillis().toInt()
        showNotification(title, body, imageUrl, deepLink, type, channelId, notifId)
    }

    private fun registerTokenWithServer(fcmToken: String) {
        serviceScope.launch {
            runCatching {
                api.registerPushToken(
                    PushTokenRequest(
                        token = fcmToken,
                        deviceType = "android",
                        deviceName = Build.MODEL,
                    )
                )
            }
        }
    }

    private fun showNotification(
        title: String,
        body: String,
        imageUrl: String?,
        deepLink: String,
        type: String,
        channelId: String,
        id: Int
    ) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ensureChannels(manager)
        }

        val tapIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (deepLink.isNotEmpty()) {
                putExtra("DEEP_LINK", deepLink)
            }
            putExtra("NOTIFICATION_TYPE", type)
        }

        val pendingIntent = PendingIntent.getActivity(
            this, id, tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)

        if (!imageUrl.isNull_or_blank()) {
            val bitmap = downloadBitmap(imageUrl!!)
            if (bitmap != null) {
                builder.setStyle(
                    NotificationCompat.BigPictureStyle()
                        .bigPicture(bitmap)
                        .setBigContentTitle(title)
                        .setSummaryText(body)
                )
            }
        }

        manager.notify(NOTIFICATION_ID_BASE + id, builder.build())
    }

    private fun String?.isNull_or_blank(): Boolean = this == null || this.trim().isEmpty()

    private fun downloadBitmap(urlStr: String): Bitmap? {
        return try {
            val url = URL(urlStr)
            val connection = url.openConnection() as HttpURLConnection
            connection.doInput = true
            connection.connectTimeout = 5000
            connection.readTimeout = 5000
            connection.connect()
            val input = connection.inputStream
            BitmapFactory.decodeStream(input)
        } catch (e: Exception) {
            null
        }
    }

    private fun ensureChannels(manager: NotificationManager) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        listOf(
            NotificationChannel(CHANNEL_CHAT,        "Chat & Messages",  NotificationManager.IMPORTANCE_HIGH),
            NotificationChannel(CHANNEL_TRANSACTION, "Orders & Payments", NotificationManager.IMPORTANCE_HIGH),
            NotificationChannel(CHANNEL_PROMOTION,   "Promotions & Deals", NotificationManager.IMPORTANCE_DEFAULT),
            NotificationChannel(CHANNEL_REWARD,      "Rewards & Coins",   NotificationManager.IMPORTANCE_DEFAULT),
            NotificationChannel(CHANNEL_SYSTEM,      "System & Security", NotificationManager.IMPORTANCE_HIGH),
            NotificationChannel(CHANNEL_GENERAL,     "General Alerts",    NotificationManager.IMPORTANCE_DEFAULT),
        ).forEach { channel ->
            if (manager.getNotificationChannel(channel.id) == null) {
                manager.createNotificationChannel(channel)
            }
        }
    }
}
