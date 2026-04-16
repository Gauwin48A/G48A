package com.mhub.core.data.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import com.mhub.core.data.local.dao.PostDao
import com.mhub.core.data.local.entity.toEntity
import com.mhub.core.network.api.PostsApi
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import timber.log.Timber
import java.util.concurrent.TimeUnit

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted workerParams: WorkerParameters,
    private val postsApi: PostsApi,
    private val postDao: PostDao,
) : CoroutineWorker(appContext, workerParams) {

    override suspend fun doWork(): Result {
        return try {
            Timber.d("SyncWorker: starting background sync")

            // Sync posts
            val response = postsApi.getPosts(page = 1, limit = 50)
            if (response.isSuccessful) {
                val posts = response.body()?.posts ?: emptyList()
                postDao.upsertAll(posts.map { it.toEntity() })
                Timber.d("SyncWorker: synced ${posts.size} posts")
            }

            // Clean stale cache (older than 7 days)
            val staleBefore = System.currentTimeMillis() - TimeUnit.DAYS.toMillis(7)
            postDao.deleteStale(staleBefore)

            Result.success()
        } catch (e: Exception) {
            Timber.e(e, "SyncWorker: sync failed")
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }

    companion object {
        const val WORK_NAME = "mhub_background_sync"

        fun buildPeriodicRequest(): PeriodicWorkRequest {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(true)
                .build()

            return PeriodicWorkRequestBuilder<SyncWorker>(
                repeatInterval = 6,
                repeatIntervalTimeUnit = TimeUnit.HOURS,
            )
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    WorkRequest.MIN_BACKOFF_MILLIS,
                    TimeUnit.MILLISECONDS,
                )
                .build()
        }
    }
}
