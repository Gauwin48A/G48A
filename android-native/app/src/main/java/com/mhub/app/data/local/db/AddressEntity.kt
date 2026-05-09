package com.mhub.app.data.local.db

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "addresses")
data class AddressEntity(
    @PrimaryKey val id: String,
    val name: String,
    val phone: String,
    val line1: String,
    val line2: String,
    val city: String,
    val state: String,
    val pincode: String,
    val isDefault: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
)
