package com.mhub.app.service

// TODO: Enable when Firebase is configured (google-services.json + plugins)
// This service requires firebase-messaging dependency which is disabled until
// Firebase project is set up.

/*
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.mhub.app.MainActivity
import com.mhub.app.R
import timber.log.Timber

class MhubFirebaseMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Timber.d("FCM token refreshed: ${token.take(10)}...")
        getSharedPreferences("mhub_fcm", MODE_PRIVATE)
            .edit()
            .putString("fcm_token", token)
            .putBoolean("token_sent", false)
            .apply()
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        Timber.d("FCM message received: ${message.data}")

        val title = message.notification?.title ?: message.data["title"] ?: "MHub"
        val body = message.notification?.body ?: message.data["body"] ?: ""
        val type = message.data["type"] ?: "general"
        val targetId = message.data["targetId"]

        showNotification(title, body, type, targetId)
    }

    private fun showNotification(title: String, body: String, type: String, targetId: String?) {
        val channelId = when (type) {
            "chat" -> "chat_messages"
            "post_update", "price_drop" -> "post_updates"
            "order", "purchase" -> "orders"
            "promo", "marketing" -> "promotions"
            else -> "general"
        }

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("notification_type", type)
            targetId?.let { putExtra("target_id", it) }
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        val notificationManager = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }
}
*/
