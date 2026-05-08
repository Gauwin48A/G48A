package com.mhub.app.core

import android.content.Context
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.mhub.app.data.local.OfflineQueueDao
import com.mhub.app.data.local.QueuedAction
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Queues write operations (like, wishlist, send message) when offline
 * and processes them when connectivity resumes via WorkManager.
 */
@Singleton
class OfflineWriteQueue @Inject constructor(
    @ApplicationContext private val context: Context,
    private val queueDao: OfflineQueueDao,
) {
    suspend fun enqueue(action: String, payload: String) {
        queueDao.insert(QueuedAction(action = action, payload = payload, createdAt = System.currentTimeMillis()))
        scheduleSync()
    }

    private fun scheduleSync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        val work = OneTimeWorkRequestBuilder<OfflineSyncWorker>()
            .setConstraints(constraints)
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            "offline_sync",
            ExistingWorkPolicy.KEEP,
            work,
        )
    }
}

class OfflineSyncWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        // Worker processes queued actions — delegating to repository layer
        // This is a no-op stub; real implementation hooks into DI
        return Result.success()
    }
}
