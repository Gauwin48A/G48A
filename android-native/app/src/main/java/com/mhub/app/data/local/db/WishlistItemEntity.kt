package com.mhub.app.data.local.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "wishlist_items")
data class WishlistItemEntity(
    @PrimaryKey val id: String,
    val postId: String,
    val title: String,
    val price: Double,
    val originalPrice: Double,
    val imageUrl: String,
    val category: String,
    val brand: String,
    val rating: Float,
    val reviewCount: Int,
    val savedAt: Long = System.currentTimeMillis(),
)
