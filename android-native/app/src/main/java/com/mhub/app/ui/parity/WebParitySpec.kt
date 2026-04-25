package com.mhub.app.ui.parity

enum class RoutePreviewState(val label: String) {
    SUCCESS("Success"),
    LOADING("Loading"),
    EMPTY("Empty"),
    ERROR("Error"),
}

data class RouteUxSection(
    val title: String,
    val description: String,
)

data class RouteUxSpec(
    val headline: String,
    val primaryAction: String,
    val secondaryAction: String?,
    val highlights: List<String>,
    val sections: List<RouteUxSection>,
)

object WebParitySpecs {
    fun spec(route: WebRouteReference): RouteUxSpec {
        val defaultAction = defaultPrimaryAction(route)
        val commonSections = defaultSections(route, defaultAction)
        val override = overrides[route.key]
        if (override != null) return override
        return RouteUxSpec(
            headline = route.title,
            primaryAction = defaultAction,
            secondaryAction = defaultSecondaryAction(route),
            highlights = defaultHighlights(route),
            sections = commonSections,
        )
    }

    private fun defaultPrimaryAction(route: WebRouteReference): String = when (route.group) {
        WebRouteGroup.AUTH -> "Continue"
        WebRouteGroup.DISCOVERY -> "Open listing"
        WebRouteGroup.COMMERCE -> "Take action"
        WebRouteGroup.SOCIAL -> "Open activity"
        WebRouteGroup.ACCOUNT -> "Save settings"
        WebRouteGroup.CHANNELS -> "Open channel"
        WebRouteGroup.LEGAL -> "Review policy"
    }

    private fun defaultSecondaryAction(route: WebRouteReference): String? = when (route.group) {
        WebRouteGroup.AUTH -> "Use OTP"
        WebRouteGroup.DISCOVERY -> "Refine filters"
        WebRouteGroup.COMMERCE -> "Save for later"
        WebRouteGroup.SOCIAL -> "Mute thread"
        WebRouteGroup.ACCOUNT -> "Learn more"
        WebRouteGroup.CHANNELS -> "Follow"
        WebRouteGroup.LEGAL -> null
    }

    private fun defaultHighlights(route: WebRouteReference): List<String> = buildList {
        add(route.canonicalPath)
        if (route.authRequired) add("Auth required")
        if (route.aliases.isNotEmpty()) add("${route.aliases.size} alias route(s)")
    }

    private fun defaultSections(route: WebRouteReference, action: String): List<RouteUxSection> = listOf(
        RouteUxSection("Purpose", route.summary),
        RouteUxSection("Primary flow", "Surface key content quickly on mobile and keep tap targets thumb-friendly."),
        RouteUxSection("Primary action", "Main CTA: $action"),
    )

    private val overrides: Map<String, RouteUxSpec> = mapOf(
        "login" to RouteUxSpec(
            headline = "Welcome back",
            primaryAction = "Sign in",
            secondaryAction = "Forgot password",
            highlights = listOf("Trust-first sign in", "Low friction", "Secure"),
            sections = listOf(
                RouteUxSection("Identity input", "Email/phone field with clear validation states."),
                RouteUxSection("Credential input", "Password visibility toggle with inline help."),
                RouteUxSection("Recovery paths", "Forgot password and sign-up remain visible above fold."),
            ),
        ),
        "signup" to RouteUxSpec(
            headline = "Create account",
            primaryAction = "Create account",
            secondaryAction = "Already have account",
            highlights = listOf("Onboarding", "Identity", "Consent"),
            sections = listOf(
                RouteUxSection("Profile basics", "Full name, email and phone with explicit error guidance."),
                RouteUxSection("Security setup", "Password strength cues and confirmation pattern."),
                RouteUxSection("Consent", "Terms acceptance near CTA and accessible to screen readers."),
            ),
        ),
        "forgot_password" to RouteUxSpec(
            headline = "Recover access",
            primaryAction = "Send reset link",
            secondaryAction = "Back to sign in",
            highlights = listOf("Recovery", "Single-field flow"),
            sections = listOf(
                RouteUxSection("Identifier input", "Accept phone or email with consistent formatting."),
                RouteUxSection("Delivery feedback", "Clear success state for sent links or OTP."),
                RouteUxSection("Fallback path", "Offer support contact if delivery fails."),
            ),
        ),
        "search" to RouteUxSpec(
            headline = "Search listings",
            primaryAction = "Apply filters",
            secondaryAction = "Clear filters",
            highlights = listOf("Instant suggestions", "Category chips", "Sort"),
            sections = listOf(
                RouteUxSection("Query", "Search bar with recent history and autocomplete."),
                RouteUxSection("Refine", "Filter chips for location, category, price and freshness."),
                RouteUxSection("Results", "Dense mobile cards with quick open and quick save actions."),
            ),
        ),
        "category_hub" to RouteUxSpec(
            headline = "Choose your world",
            primaryAction = "Open category",
            secondaryAction = "Explore all",
            highlights = listOf("Category-first", "Visual cards"),
            sections = listOf(
                RouteUxSection("Category cards", "Large visual cards with listing count and short context."),
                RouteUxSection("Context switching", "Switching category should preserve filter memory."),
                RouteUxSection("Entry point", "Acts as root browsing destination for first-time users."),
            ),
        ),
        "all_posts" to RouteUxSpec(
            headline = "All listings",
            primaryAction = "Open listing",
            secondaryAction = "Sort",
            highlights = listOf("Infinite feed", "Price + location"),
            sections = listOf(
                RouteUxSection("Feed density", "Card rhythm optimized for one-hand scrolling."),
                RouteUxSection("Card metadata", "Title, price, location, freshness and verification badges."),
                RouteUxSection("Fast actions", "Save, compare and share available without entering detail."),
            ),
        ),
        "post_detail" to RouteUxSpec(
            headline = "Listing detail",
            primaryAction = "Contact seller",
            secondaryAction = "Make offer",
            highlights = listOf("Gallery", "Seller trust", "Transaction intent"),
            sections = listOf(
                RouteUxSection("Hero gallery", "Swipeable media with compact pagination indicators."),
                RouteUxSection("Trust indicators", "KYC status, seller activity and rating signals."),
                RouteUxSection("Intent actions", "Call, chat, offer and wishlist as clear action row."),
            ),
        ),
        "add_post" to RouteUxSpec(
            headline = "Create listing",
            primaryAction = "Publish",
            secondaryAction = "Save draft",
            highlights = listOf("Step flow", "Validation", "Media"),
            sections = listOf(
                RouteUxSection("Listing essentials", "Title, category and pricing before advanced sections."),
                RouteUxSection("Media upload", "Image priority, cover selection and failure recovery."),
                RouteUxSection("Publish review", "Final review pane with required-field checkpoints."),
            ),
        ),
        "tiers" to RouteUxSpec(
            headline = "Choose visibility plan",
            primaryAction = "Select tier",
            secondaryAction = "Compare plans",
            highlights = listOf("Pricing", "Boost visibility"),
            sections = listOf(
                RouteUxSection("Plan cards", "Clear differentiation by reach, duration and perks."),
                RouteUxSection("Cost clarity", "Monthly / per-listing totals shown before payment."),
                RouteUxSection("Selection state", "Sticky selected tier with summary at bottom."),
            ),
        ),
        "payment" to RouteUxSpec(
            headline = "Complete payment",
            primaryAction = "Pay now",
            secondaryAction = "Change method",
            highlights = listOf("Order summary", "Gateway status"),
            sections = listOf(
                RouteUxSection("Amount summary", "Itemized totals and fees, no hidden values."),
                RouteUxSection("Method selection", "UPI, card and wallet options with remembered choice."),
                RouteUxSection("Post-payment", "Success and retry states with transaction id visibility."),
            ),
        ),
        "feed" to RouteUxSpec(
            headline = "Community feed",
            primaryAction = "Open post",
            secondaryAction = "Create post",
            highlights = listOf("Timeline", "Engagement", "Short updates"),
            sections = listOf(
                RouteUxSection("Timeline", "Mixed content stream with compact interaction controls."),
                RouteUxSection("Engagement", "Like/comment/share actions with tactile spacing."),
                RouteUxSection("Feed controls", "Sort and scope filters for local relevance."),
            ),
        ),
        "chat" to RouteUxSpec(
            headline = "Messages",
            primaryAction = "Send message",
            secondaryAction = "Attach media",
            highlights = listOf("Conversations", "Realtime"),
            sections = listOf(
                RouteUxSection("Conversation list", "Unread indicators, seller context and listing references."),
                RouteUxSection("Thread view", "Message bubbles with delivery/read states."),
                RouteUxSection("Composer", "Multiline input with attachment and quick-response entry points."),
            ),
        ),
        "dashboard" to RouteUxSpec(
            headline = "Performance dashboard",
            primaryAction = "View insights",
            secondaryAction = "Export summary",
            highlights = listOf("KPIs", "Recent activity"),
            sections = listOf(
                RouteUxSection("KPI strip", "Views, leads, offers and conversions."),
                RouteUxSection("Trend charts", "Daily/weekly graphs readable on small screens."),
                RouteUxSection("Action list", "Top optimizations linked to relevant screens."),
            ),
        ),
        "profile" to RouteUxSpec(
            headline = "Profile and trust",
            primaryAction = "Edit profile",
            secondaryAction = "Verification status",
            highlights = listOf("Identity", "Seller reputation"),
            sections = listOf(
                RouteUxSection("Identity header", "Avatar, plan badge, verification and quick trust info."),
                RouteUxSection("Action modules", "Listings, chat, settings and security grouped clearly."),
                RouteUxSection("Account controls", "Sign out and account delete safely separated."),
            ),
        ),
        "kyc" to RouteUxSpec(
            headline = "Verify identity",
            primaryAction = "Submit KYC",
            secondaryAction = "Track status",
            highlights = listOf("Compliance", "Document flow"),
            sections = listOf(
                RouteUxSection("Document capture", "Front/back upload with guidance and examples."),
                RouteUxSection("Validation", "Inline checks before submission."),
                RouteUxSection("Status lifecycle", "Pending, approved and rejected states with reasons."),
            ),
        ),
        "channels" to RouteUxSpec(
            headline = "Channels",
            primaryAction = "Open channel",
            secondaryAction = "Create channel",
            highlights = listOf("Communities", "Listing clusters"),
            sections = listOf(
                RouteUxSection("Discovery", "Find channels by topic, city and activity."),
                RouteUxSection("Channel cards", "Followers, listing count and latest activity."),
                RouteUxSection("Entry actions", "Join/follow plus quick open for current members."),
            ),
        ),
        "channel_create" to RouteUxSpec(
            headline = "Create channel",
            primaryAction = "Publish channel",
            secondaryAction = "Preview channel",
            highlights = listOf("Owner setup", "Identity"),
            sections = listOf(
                RouteUxSection("Brand basics", "Name, handle, description and category."),
                RouteUxSection("Moderation rules", "Visible expectations and posting permissions."),
                RouteUxSection("Launch state", "Post-creation onboarding with first listing prompt."),
            ),
        ),
        "terms" to RouteUxSpec(
            headline = "Terms and conditions",
            primaryAction = "Acknowledge",
            secondaryAction = null,
            highlights = listOf("Legal", "Readable structure"),
            sections = listOf(
                RouteUxSection("Readable typography", "Comfortable line length and strong heading hierarchy."),
                RouteUxSection("Anchored sections", "Sticky section index for long policy text."),
                RouteUxSection("Version context", "Last updated timestamp and change summary."),
            ),
        ),
    )
}
