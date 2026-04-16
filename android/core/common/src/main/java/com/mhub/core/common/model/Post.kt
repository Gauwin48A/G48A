package com.mhub.core.common.model

import kotlinx.serialization.Serializable

@Serializable
data class Post(
    val id: Int = 0,
    val title: String = "",
    val description: String? = null,
    val price: Double? = null,
    val currency: String = "INR",
    val images: List<String> = emptyList(),
    val categoryId: Int? = null,
    val categoryName: String? = null,
    val subcategoryId: Int? = null,
    val subcategoryName: String? = null,
    val condition: String? = null,
    val location: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val userId: Int = 0,
    val userName: String? = null,
    val userAvatar: String? = null,
    val isSold: Boolean = false,
    val isFeatured: Boolean = false,
    val viewCount: Int = 0,
    val createdAt: String? = null,
    val updatedAt: String? = null,
)
