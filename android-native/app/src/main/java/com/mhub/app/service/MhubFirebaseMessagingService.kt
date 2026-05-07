package com.mhub.app.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.mhub.app.MainActivity
import com.mhub.app.R
import com.mhub.app.data.local.TokenStore
import com.mhub.app.data.remote.MhubApi
import com.mhub.app.data.remote.dto.PushTokenRequest
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class MhubFirebaseMessagingService : FirebaseMessagingService() {

    @Inject lateinit var api: MhubApi
    @Inject lateinit var tokenStore: TokenStore

    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    companion object {
        private const val CHANNEL_ID = "mhub_general"
        private const val CHANNEL_NAME = "MHub Notifications"
        private const val NOTIFICATION_ID_BASE = 1000
    }

    /** Called when FCM delivers a new registration token. */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        if (tokenStore.isAuthenticated) {
            registerTokenWithServer(token)
        }
    }

    /** Called when a message arrives while the app is in the foreground. */
    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        val title = message.notification?.title ?: message.data["title"] ?: return
        val body  = message.notification?.body  ?: message.data["body"]  ?: return
        showNotification(title, body, message.messageId?.hashCode() ?: System.currentTimeMillis().toInt())
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

    private fun showNotification(title: String, body: String, id: Int) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_DEFAULT,
                )
            )
        }

        val tapIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        manager.notify(NOTIFICATION_ID_BASE + id, notification)
    }
}
