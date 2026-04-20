package com.mhub.app.ui.parity

enum class WebRouteGroup(val label: String) {
    AUTH("Auth"),
    DISCOVERY("Discovery"),
    COMMERCE("Commerce"),
    SOCIAL("Social"),
    ACCOUNT("Account"),
    CHANNELS("Channels"),
    LEGAL("Legal & System"),
}

data class WebRouteReference(
    val key: String,
    val title: String,
    val canonicalPath: String,
    val aliases: List<String> = emptyList(),
    val group: WebRouteGroup,
    val authRequired: Boolean,
    val summary: String,
)

object WebRouteCatalog {
    val all: List<WebRouteReference> = listOf(
        WebRouteReference("login", "Login", "/login", group = WebRouteGroup.AUTH, authRequired = false, summary = "Account sign in with recovery actions."),
        WebRouteReference("signup", "Sign up", "/signup", group = WebRouteGroup.AUTH, authRequired = false, summary = "Create new marketplace account."),
        WebRouteReference("forgot_password", "Forgot password", "/forgot-password", group = WebRouteGroup.AUTH, authRequired = false, summary = "Request password reset link."),
        WebRouteReference("reset_password", "Reset password", "/reset-password/:token", aliases = listOf("/reset-password"), group = WebRouteGroup.AUTH, authRequired = false, summary = "Reset account password using token."),

        WebRouteReference("category_hub", "Category hub", "/category-hub", aliases = listOf("/", "/home"), group = WebRouteGroup.DISCOVERY, authRequired = false, summary = "Primary browse landing with category-first navigation."),
        WebRouteReference("all_posts", "All posts", "/all-posts", aliases = listOf("/listings"), group = WebRouteGroup.DISCOVERY, authRequired = false, summary = "Main listing feed with filters and sort."),
        WebRouteReference("for_you", "For you", "/for-you", group = WebRouteGroup.DISCOVERY, authRequired = false, summary = "Personalized recommendation stream."),
        WebRouteReference("my_home", "My home", "/my-home", group = WebRouteGroup.DISCOVERY, authRequired = true, summary = "Signed-in personalized home dashboard."),
        WebRouteReference("nearby", "Nearby", "/nearby", group = WebRouteGroup.DISCOVERY, authRequired = true, summary = "Location scoped nearby listings."),
        WebRouteReference("search", "Search", "/search", group = WebRouteGroup.DISCOVERY, authRequired = false, summary = "Global listing and content search."),
        WebRouteReference("subcategories", "Subcategories", "/subcategories", aliases = listOf("/categories"), group = WebRouteGroup.DISCOVERY, authRequired = false, summary = "Category drill down and subcategory selection."),

        WebRouteReference("post_detail", "Post detail", "/post/:id", aliases = listOf("/listing/:id"), group = WebRouteGroup.COMMERCE, authRequired = false, summary = "Listing details, media gallery, actions and seller context."),
        WebRouteReference("add_post", "Add post", "/add-post", aliases = listOf("/sell"), group = WebRouteGroup.COMMERCE, authRequired = true, summary = "Create standard marketplace listing."),
        WebRouteReference("post_welcome", "Post welcome", "/post-welcome", group = WebRouteGroup.COMMERCE, authRequired = true, summary = "Guided start before listing creation."),
        WebRouteReference("edit_post", "Edit post", "/edit-post/:postId", group = WebRouteGroup.COMMERCE, authRequired = true, summary = "Update existing listing content."),
        WebRouteReference("tiers", "Tier selection", "/tier-selection", aliases = listOf("/tiers", "/pricing"), group = WebRouteGroup.COMMERCE, authRequired = true, summary = "Plan and boost pricing selection."),
        WebRouteReference("payment", "Payment", "/payment", group = WebRouteGroup.COMMERCE, authRequired = true, summary = "Checkout and payment processing flow."),
        WebRouteReference("cart", "Cart", "/cart", group = WebRouteGroup.COMMERCE, authRequired = true, summary = "Pending purchases and checkout items."),
        WebRouteReference("wishlist", "Wishlist", "/wishlist", group = WebRouteGroup.COMMERCE, authRequired = true, summary = "Saved listings and quick open actions."),
        WebRouteReference("recently_viewed", "Recently viewed", "/recently-viewed", group = WebRouteGroup.COMMERCE, authRequired = true, summary = "History of recently opened listings."),
        WebRouteReference("saved_searches", "Saved searches", "/saved-searches", group = WebRouteGroup.COMMERCE, authRequired = true, summary = "Saved query subscriptions and shortcuts."),
        WebRouteReference("compare", "Compare", "/compare", group = WebRouteGroup.COMMERCE, authRequired = false, summary = "Side-by-side listing comparison."),
        WebRouteReference("bought_posts", "Bought posts", "/bought-posts", group = WebRouteGroup.COMMERCE, authRequired = true, summary = "Purchase history and bought items."),
        WebRouteReference("sold_posts", "Sold posts", "/sold-posts", group = WebRouteGroup.COMMERCE, authRequired = true, summary = "Sold inventory and completion status."),
        WebRouteReference("buyer_view", "Buyer view", "/buyer-view", group = WebRouteGroup.COMMERCE, authRequired = true, summary = "Buyer-focused view of listings and actions."),
        WebRouteReference("sale_done", "Sale done", "/saledone", group = WebRouteGroup.COMMERCE, authRequired = true, summary = "Mark listing sale as completed."),
        WebRouteReference("sale_undone", "Sale undone", "/saleundone", group = WebRouteGroup.COMMERCE, authRequired = true, summary = "Reopen or cancel previously completed sale."),
        WebRouteReference("offers", "Offers", "/offers", group = WebRouteGroup.COMMERCE, authRequired = false, summary = "Incoming and outgoing offer management."),

        WebRouteReference("feed", "Feed", "/feed", group = WebRouteGroup.SOCIAL, authRequired = false, summary = "Social feed timeline and stories."),
        WebRouteReference("feed_detail", "Feed detail", "/feed/:id", group = WebRouteGroup.SOCIAL, authRequired = false, summary = "Single feed post detail and comments."),
        WebRouteReference("my_feed", "My feed", "/my-feed", group = WebRouteGroup.SOCIAL, authRequired = true, summary = "User authored feed stream."),
        WebRouteReference("post_add", "Feed post add", "/post_add", aliases = listOf("/feed/feedpostadd"), group = WebRouteGroup.SOCIAL, authRequired = true, summary = "Create a social feed post."),
        WebRouteReference("public_wall", "Public wall", "/public-wall", group = WebRouteGroup.SOCIAL, authRequired = false, summary = "Community public updates and highlights."),
        WebRouteReference("chat", "Chat", "/chat", aliases = listOf("/chats"), group = WebRouteGroup.SOCIAL, authRequired = true, summary = "Direct messaging and conversation list."),
        WebRouteReference("notifications", "Notifications", "/notifications", group = WebRouteGroup.SOCIAL, authRequired = true, summary = "Activity alerts, offers and reminders."),
        WebRouteReference("complaints", "Complaints", "/complaints", group = WebRouteGroup.SOCIAL, authRequired = true, summary = "Issue reporting and dispute tracking."),
        WebRouteReference("feedback", "Feedback", "/feedback", group = WebRouteGroup.SOCIAL, authRequired = true, summary = "Feedback submission and rating entry."),
        WebRouteReference("reviews", "Reviews", "/reviews/:userId", group = WebRouteGroup.SOCIAL, authRequired = false, summary = "Public rating and review profile."),

        WebRouteReference("dashboard", "Dashboard", "/dashboard", group = WebRouteGroup.ACCOUNT, authRequired = true, summary = "Account-level metrics and shortcuts."),
        WebRouteReference("activity", "Activity hub", "/activity", group = WebRouteGroup.ACCOUNT, authRequired = true, summary = "Unified entry for chat, offers and reviews."),
        WebRouteReference("profile", "Profile", "/profile", group = WebRouteGroup.ACCOUNT, authRequired = true, summary = "Account profile and personal settings."),
        WebRouteReference("security", "Security", "/security", group = WebRouteGroup.ACCOUNT, authRequired = true, summary = "Security controls, sessions, 2FA and alerts."),
        WebRouteReference("account_delete", "Delete account", "/account/delete", group = WebRouteGroup.ACCOUNT, authRequired = true, summary = "Account deletion request workflow."),
        WebRouteReference("verification", "Verification", "/verification", group = WebRouteGroup.ACCOUNT, authRequired = true, summary = "KYC and verification status dashboard."),
        WebRouteReference("kyc", "KYC", "/kyc", aliases = listOf("/aadhaar-verify"), group = WebRouteGroup.ACCOUNT, authRequired = true, summary = "Identity document submission and review status."),
        WebRouteReference("rewards", "Rewards", "/rewards", group = WebRouteGroup.ACCOUNT, authRequired = true, summary = "Rewards, referrals and incentives."),
        WebRouteReference("analytics", "Analytics", "/analytics", group = WebRouteGroup.ACCOUNT, authRequired = true, summary = "Seller analytics, trends and insights."),

        WebRouteReference("channels", "Channels", "/channels", group = WebRouteGroup.CHANNELS, authRequired = false, summary = "Browse channels and communities."),
        WebRouteReference("channel_create", "Create channel", "/channels/create", group = WebRouteGroup.CHANNELS, authRequired = true, summary = "Create and configure a new channel."),
        WebRouteReference("channel_detail", "Channel detail", "/channels/:id", group = WebRouteGroup.CHANNELS, authRequired = false, summary = "Channel profile and posted listings."),
        WebRouteReference("centre_list", "Centre list", "/centre", group = WebRouteGroup.CHANNELS, authRequired = true, summary = "Centre-mode list and management."),
        WebRouteReference("centre_create", "Create centre", "/centre/create", group = WebRouteGroup.CHANNELS, authRequired = true, summary = "Create centre page and profile."),
        WebRouteReference("centre_listings", "Centre listings", "/centre/:id/listings", group = WebRouteGroup.CHANNELS, authRequired = true, summary = "Listings published under a centre."),
        WebRouteReference("centre_detail", "Centre detail", "/centre/:id", group = WebRouteGroup.CHANNELS, authRequired = true, summary = "Centre profile detail and actions."),

        WebRouteReference("invite", "Invite redirect", "/invite/:code", group = WebRouteGroup.LEGAL, authRequired = false, summary = "Deep-link invite acceptance flow."),
        WebRouteReference("terms", "Terms and conditions", "/terms-and-conditions", aliases = listOf("/terms", "/t&c"), group = WebRouteGroup.LEGAL, authRequired = false, summary = "Legal terms and platform policies."),
        WebRouteReference("privacy", "Privacy policy", "/privacy-policy", group = WebRouteGroup.LEGAL, authRequired = false, summary = "Privacy and data usage information."),
        WebRouteReference("refund", "Refund policy", "/refund-policy", group = WebRouteGroup.LEGAL, authRequired = false, summary = "Refund and cancellation policy details."),
        WebRouteReference("support_policy", "Support ticket policy", "/support-ticket-policy", group = WebRouteGroup.LEGAL, authRequired = false, summary = "Support response and ticket handling policy."),
        WebRouteReference("admin_panel", "Admin panel", "/admin-panel", group = WebRouteGroup.LEGAL, authRequired = true, summary = "Operational controls and moderation tools."),
        WebRouteReference("not_found", "Not found", "*", group = WebRouteGroup.LEGAL, authRequired = false, summary = "Fallback route for unknown paths."),
    )

    fun byKey(key: String): WebRouteReference? = all.firstOrNull { it.key == key }

    val grouped: Map<WebRouteGroup, List<WebRouteReference>> = all.groupBy { it.group }
}
