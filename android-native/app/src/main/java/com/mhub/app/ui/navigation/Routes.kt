package com.mhub.app.ui.navigation

/** Typed route constants for Navigation-Compose. */
object Routes {
    const val SPLASH = "splash"

    // Auth graph
    const val AUTH_GRAPH = "auth"
    const val LOGIN = "auth/login"
    const val SIGNUP = "auth/signup"

    // Main graph
    const val MAIN_GRAPH = "main"
    const val HOME = "main/home"
    const val CATEGORIES = "main/categories"
    const val WISHLIST = "main/wishlist"
    const val PROFILE = "main/profile"

    const val SEARCH = "search"
    const val POST_DETAIL = "post/{postId}"
    fun postDetail(id: String) = "post/$id"

    const val CREATE_POST = "post/create"
    const val MY_POSTS = "post/mine"
    const val KYC = "kyc"

    const val SETTINGS = "settings"
}
