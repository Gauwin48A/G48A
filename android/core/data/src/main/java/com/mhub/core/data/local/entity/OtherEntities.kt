package com.mhub.core.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.mhub.core.common.model.Category
import com.mhub.core.common.model.Notification

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey val id: Int,
    val name: String,
    val slug: String,
    val icon: String?,
    val image: String?,
    val parentId: Int?,
    val postCount: Int,
    val cachedAt: Long = System.currentTimeMillis(),
)

fun CategoryEntity.toModel() = Category(
    id = id, name = name, slug = slug, icon = icon,
    image = image, parentId = parentId, postCount = postCount,
)

fun Category.toEntity() = CategoryEntity(
    id = id, name = name, slug = slug, icon = icon,
    image = image, parentId = parentId, postCount = postCount,
)

@Entity(tableName = "notifications")
data class NotificationEntity(
    @PrimaryKey val id: Int,
    val title: String,
    val body: String,
    val type: String,
    val isRead: Boolean,
    val data: String?, // JSON-serialized Map<String, String>
    val createdAt: String?,
    val cachedAt: Long = System.currentTimeMillis(),
)

fun NotificationEntity.toModel() = Notification(
    id = id, title = title, body = body,
    type = type, isRead = isRead,
    data = data?.let {
        try {
            kotlinx.serialization.json.Json.decodeFromString<Map<String, String>>(it)
        } catch (_: Exception) { null }
    },
    createdAt = createdAt,
)

fun Notification.toEntity() = NotificationEntity(
    id = id, title = title, body = body,
    type = type, isRead = isRead,
    data = data?.let {
        kotlinx.serialization.json.Json.encodeToString(
            kotlinx.serialization.builtins.MapSerializer(
                kotlinx.serialization.builtins.serializer<String>(),
                kotlinx.serialization.builtins.serializer<String>(),
            ), it
        )
    },
    createdAt = createdAt,
)
