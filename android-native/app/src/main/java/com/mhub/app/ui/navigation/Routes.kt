package com.mhub.app.ui.navigation

object Routes {
    const val SPLASH = "splash"

    // Auth graph
    const val AUTH_GRAPH = "auth"
    const val LOGIN = "auth/login"
    const val SIGNUP = "auth/signup"
    const val FORGOT_PASSWORD = "auth/forgot-password"
    const val RESET_PASSWORD = "auth/reset-password/{token}"
    fun resetPassword(token: String): String = "auth/reset-password/$token"

    // Main graph
    const val MAIN_GRAPH = "main"
    const val HOME = "main/category-hub"
    const val ALL_POSTS = "main/all-posts"
    const val FOR_YOU = "main/for-you"
    const val FEED = "main/feed"
    const val REWARDS = "main/rewards"
    const val PROFILE = "main/profile"
    const val MORE = "main/more"

    // Legacy aliases retained while routes migrate to web-style IA.
    const val EXPLORE = ALL_POSTS
    const val NOTIFICATIONS = "main/notifications"
    const val WISHLIST = "main/wishlist"
    const val DASHBOARD = "main/dashboard"

    // Full screen routes
    const val SEARCH = "search"
    const val CATEGORIES = "categories"
    const val POST_DETAIL = "post/{postId}"
    fun postDetail(id: String): String = "post/$id"

    const val CREATE_POST = "post/create"
    const val EDIT_POST = "post/edit/{postId}"
    fun editPost(id: String): String = "post/edit/$id"
    const val MY_POSTS = "post/mine"
    const val POST_WELCOME = "post/welcome"
    const val TIER_SELECTION = "tier-selection"
    const val KYC = "kyc"
    const val SETTINGS = "settings"
    const val CHAT = "chat"

    // Commerce
    const val BOUGHT_POSTS = "bought-posts"
    const val SOLD_POSTS = "sold-posts"
    const val BUYER_VIEW = "buyer-view"
    const val SALE_DONE = "saledone"
    const val SALE_UNDONE = "saleundone"
    const val OFFERS = "offers"
    const val PAYMENT = "payment"
    const val CART = "cart"
    const val RECENTLY_VIEWED = "recently-viewed"
    const val SAVED_SEARCHES = "saved-searches"
    const val COMPARE = "compare"
    const val NEARBY = "nearby"

    // Social
    const val FEED_DETAIL = "feed/{feedId}"
    fun feedDetail(id: String): String = "feed/$id"
    const val MY_FEED = "my-feed"
    const val FEED_POST_ADD = "feed/post-add"
    const val PUBLIC_WALL = "public-wall"
    const val COMPLAINTS = "complaints"
    const val FEEDBACK = "feedback"
    const val REVIEWS = "reviews/{userId}"
    fun reviews(userId: String): String = "reviews/$userId"

    // Account
    const val SECURITY = "security"
    const val ACCOUNT_DELETE = "account/delete"
    const val VERIFICATION = "verification"
    const val ANALYTICS = "analytics"

    // Channels
    const val CHANNELS = "channels"
    const val CHANNEL_CREATE = "channels/create"
    const val CHANNEL_DETAIL = "channels/{channelId}"
    fun channelDetail(id: String): String = "channels/$id"
    const val CENTRE_LIST = "centre"
    const val CENTRE_CREATE = "centre/create"
    const val CENTRE_DETAIL = "centre/{centreId}"
    fun centreDetail(id: String): String = "centre/$id"
    const val CENTRE_LISTINGS = "centre/{centreId}/listings"
    fun centreListings(id: String): String = "centre/$id/listings"

    // Legal
    const val TERMS = "terms"
    const val PRIVACY = "privacy"
    const val REFUND = "refund"
    const val SUPPORT_POLICY = "support-policy"
    const val ADMIN_PANEL = "admin-panel"
    const val INVITE = "invite/{code}"
    fun invite(code: String): String = "invite/$code"
}
