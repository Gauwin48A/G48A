package com.mhub.app.ui.navigation

object Routes {
    const val SPLASH = "splash"

    // Auth graph
    const val AUTH_GRAPH = "auth"
    const val LOGIN = "auth/login"
    const val SIGNUP = "auth/signup"

    // Main graph
    const val MAIN_GRAPH = "main"
    const val HOME = "main/home"
    const val EXPLORE = "main/explore"
    const val NOTIFICATIONS = "main/notifications"
    const val WISHLIST = "main/wishlist"
    const val PROFILE = "main/profile"

    // Full screen routes
    const val SEARCH = "search"
    const val CATEGORIES = "categories"
    const val POST_DETAIL = "post/{postId}"
    fun postDetail(id: String): String = "post/$id"

    const val CREATE_POST = "post/create"
    const val MY_POSTS = "post/mine"
    const val KYC = "kyc"
    const val SETTINGS = "settings"
    const val CHAT = "chat"
    const val WEB_PARITY_HUB = "parity/hub"
    const val WEB_PARITY_DETAIL = "parity/page/{pageKey}"
    fun webParityDetail(key: String): String = "parity/page/$key"
}
