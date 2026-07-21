package com.zaruda.app.data.local.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "posts")
data class PostEntity(
    @PrimaryKey val id: String,
    val title: String?,
    val description: String?,
    val price: Double?,
    val currency: String?,
    val imageUrl: String?,
    val imagesJson: String,          // JSON-encoded List<String>
    val category: String?,
    val categoryId: String?,
    val categoryName: String?,
    val location: String?,
    val createdAt: String?,
    val userId: String?,
    val userName: String?,
    val status: String?,
    val viewCount: Int?,
    val condition: String?,
    val brand: String?,
    val sellerName: String?,
    val cachedAt: Long = System.currentTimeMillis(),
)
