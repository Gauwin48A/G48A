package com.mhub.core.common.model

import kotlinx.serialization.Serializable

@Serializable
data class Category(
    val id: Int = 0,
    val name: String = "",
    val slug: String = "",
    val icon: String? = null,
    val image: String? = null,
    val parentId: Int? = null,
    val postCount: Int = 0,
)

@Serializable
data class Notification(
    val id: Int = 0,
    val title: String = "",
    val body: String = "",
    val type: String = "",
    val isRead: Boolean = false,
    val data: Map<String, String>? = null,
    val createdAt: String? = null,
)
