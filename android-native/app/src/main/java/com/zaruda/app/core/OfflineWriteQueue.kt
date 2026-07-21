package com.zaruda.app.core

import android.content.Context
import android.util.Log
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.zaruda.app.data.local.OfflineQueueDao
import com.zaruda.app.data.local.QueuedAction
import com.zaruda.app.data.remote.MhubApi
import com.zaruda.app.data.remote.dto.SendMessageRequest
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "OfflineSync"

@EntryPoint
@InstallIn(SingletonComponent::class)
interface OfflineSyncEntryPoint {
    fun queueDao(): OfflineQueueDao
    fun api(): MhubApi
}

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
    private val appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val entryPoint = EntryPointAccessors.fromApplication(
            appContext,
            OfflineSyncEntryPoint::class.java,
        )
        val dao = entryPoint.queueDao()
        val api = entryPoint.api()

        val pending = dao.getAll()
        if (pending.isEmpty()) return Result.success()

        Log.d(TAG, "Processing ${pending.size} queued offline actions")

        val json = Json { ignoreUnknownKeys = true }
        var anyFailed = false

        for (item in pending) {
            try {
                val payload = runCatching { json.parseToJsonElement(item.payload) as? JsonObject }.getOrNull()
                when (item.action) {
                    "toggle_wishlist" -> {
                        val postId = payload?.get("postId")?.jsonPrimitive?.content ?: continue
                        val add = payload["add"]?.jsonPrimitive?.content?.toBoolean() ?: true
                        if (add) api.addWishlist(postId) else api.removeWishlist(postId)
                    }
                    "send_message" -> {
                        val conversationId = payload?.get("conversationId")?.jsonPrimitive?.content ?: continue
                        val text = payload["text"]?.jsonPrimitive?.content ?: continue
                        api.sendMessage(conversationId, SendMessageRequest(content = text))
                    }
                    else -> {
                        Log.w(TAG, "Unknown queued action: ${item.action} — dropping")
                    }
                }
                dao.delete(item.id)
                Log.d(TAG, "Synced action ${item.action} id=${item.id}")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to sync action ${item.action} id=${item.id}: ${e.message}")
                anyFailed = true
            }
        }

        return if (anyFailed) Result.retry() else Result.success()
    }
}
