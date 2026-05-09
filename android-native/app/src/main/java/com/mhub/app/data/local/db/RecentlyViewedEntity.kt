package com.mhub.app.data.local.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "recently_viewed")
data class RecentlyViewedEntity(
    @PrimaryKey val postId: String,
    val title: String,
    val price: Double,
    val imageUrl: String,
    val category: String,
    val brand: String,
    val rating: Float,
    val viewedAt: Long = System.currentTimeMillis(),
)
