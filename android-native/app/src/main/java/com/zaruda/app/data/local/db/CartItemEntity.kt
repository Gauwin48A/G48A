package com.zaruda.app.data.local.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "cart_items")
data class CartItemEntity(
    @PrimaryKey val id: String,
    val postId: String,
    val title: String,
    val price: Double,
    val originalPrice: Double,
    val imageUrl: String,
    val category: String,
    val brand: String,
    /** Seller (post owner) id — lets local/offline cart items initiate escrow purchases. */
    val sellerId: String? = null,
    val selectedColor: String,
    val selectedSize: String,
    val quantity: Int,
    val inStock: Boolean,
    val addedAt: Long = System.currentTimeMillis(),
)
