package com.mhub.app.data.local.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val id: String,
    val name: String?,
    val iconUrl: String?,
    val slug: String?,
    val categoryGroup: String?,
    val productCount: Int,
    val cachedAt: Long = System.currentTimeMillis(),
)
