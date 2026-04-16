package com.mhub.core.common.model

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: Int = 0,
    val name: String = "",
    val email: String? = null,
    val phone: String? = null,
    val avatar: String? = null,
    val bio: String? = null,
    val isVerified: Boolean = false,
    val role: String = "user",
    val createdAt: String? = null,
)
