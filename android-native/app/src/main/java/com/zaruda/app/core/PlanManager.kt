package com.zaruda.app.core

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.zaruda.app.R
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone
import java.util.concurrent.TimeUnit

// ─────────────────────────────────────────────────────────────────────────────
// Free Launch Plan — first 3 months after APP_LAUNCH_DATE, all users get
// a free plan automatically. After that, normal subscription flow applies.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true if the free 3-month launch promotion is still active.
 * Launch date: June 1, 2026. Promo ends: September 1, 2026.
 */
object FreeLaunchPlan {
    // App official launch date (update when going live)
    private val LAUNCH_DATE_MS: Long by lazy {
        Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
            set(2026, Calendar.JUNE, 1, 0, 0, 0)
            set(Calendar.MILLISECOND, 0)
        }.timeInMillis
    }

    private val PROMO_END_MS: Long by lazy {
        LAUNCH_DATE_MS + (90L * 24 * 60 * 60 * 1000) // 90 days
    }

    /** True while the 3-month free period is active. */
    fun isActive(): Boolean = System.currentTimeMillis() < PROMO_END_MS

    /** Days remaining in the promo period (0 if expired). */
    fun daysRemaining(): Long {
        val remaining = PROMO_END_MS - System.currentTimeMillis()
        return if (remaining > 0) remaining / (24L * 60 * 60 * 1000) else 0L
    }

    /** Human-readable end date string (e.g. "Sep 1, 2026"). */
    fun endDateLabel(): String {
        val sdf = SimpleDateFormat("MMM d, yyyy", Locale.ENGLISH)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(java.util.Date(PROMO_END_MS))
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan Expiry Notification Worker — runs daily, sends push notifications
// at 7 days, 3 days, and 1 day before plan expiry.
// ─────────────────────────────────────────────────────────────────────────────

private const val CHANNEL_ID = "mhub_plan_expiry"
private const val CHANNEL_NAME = "Plan & Subscription"

@EntryPoint
@InstallIn(SingletonComponent::class)
interface PlanNotificationEntryPoint {
    fun tiersRepository(): com.zaruda.app.data.repository.TiersRepository
    fun authRepository(): com.zaruda.app.data.repository.AuthRepository
}

class PlanExpiryNotificationWorker(
    private val appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val entryPoint = EntryPointAccessors.fromApplication(
            appContext,
            PlanNotificationEntryPoint::class.java,
        )
        val tiersRepo = entryPoint.tiersRepository()

        // Demo sessions have premium enabled by design — never send plan-expiry notifications
        if (entryPoint.authRepository().isDemoSession) return Result.success()

        val result = try {
            tiersRepo.mySubscription()
        } catch (_: Exception) {
            return Result.success() // Don't fail, just skip
        }

        if (result !is com.zaruda.app.core.ApiResult.Success) return Result.success()

        val sub = result.data.subscription ?: return Result.success()
        val expiresAt = sub.expiresAt ?: return Result.success()
        if (!result.data.active) return Result.success()

        val expMs = try {
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
                .also { it.timeZone = TimeZone.getTimeZone("UTC") }
                .parse(expiresAt)?.time ?: return Result.success()
        } catch (_: Exception) {
            return Result.success()
        }

        val now = System.currentTimeMillis()
        val daysLeft = (expMs - now) / (24L * 60 * 60 * 1000)

        when (daysLeft.toInt()) {
            7 -> sendNotification(
                title = "Plan expiring in 7 days",
                body = "Your Zaruda plan expires on ${expiresAt.take(10)}. Renew now to keep selling.",
                notifId = 1001,
            )
            3 -> sendNotification(
                title = "Plan expiring in 3 days",
                body = "Only 3 days left on your Zaruda plan! Renew to avoid service interruption.",
                notifId = 1002,
            )
            1 -> sendNotification(
                title = "Plan expires tomorrow!",
                body = "Your Zaruda plan expires tomorrow. Renew now to continue posting and selling.",
                notifId = 1003,
            )
            0 -> sendNotification(
                title = "Plan expired",
                body = "Your Zaruda plan has expired. Renew your subscription to post and sell again.",
                notifId = 1004,
            )
        }

        return Result.success()
    }

    private fun sendNotification(title: String, body: String, notifId: Int) {
        createNotificationChannel()
        val nm = appContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val intent = appContext.packageManager
            .getLaunchIntentForPackage(appContext.packageName)
            ?.apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK }

        val pending = PendingIntent.getActivity(
            appContext, notifId, intent ?: Intent(),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(appContext, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher_foreground)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(pending)
            .build()

        nm.notify(notifId, notification)
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Notifications about subscription plan status and expiry"
            }
            val nm = appContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }
    }
}

/**
 * Schedules the daily plan expiry check worker.
 * Call this once on app startup (after user is authenticated).
 */
fun schedulePlanExpiryChecks(context: Context) {
    val request = PeriodicWorkRequestBuilder<PlanExpiryNotificationWorker>(
        repeatInterval = 24,
        repeatIntervalTimeUnit = TimeUnit.HOURS,
    ).build()

    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        "plan_expiry_check",
        ExistingPeriodicWorkPolicy.KEEP,
        request,
    )
}
