package com.mhub.app.ui.parity

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Article
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Category
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Diversity3
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.mhub.app.ui.components.AppTextField
import com.mhub.app.ui.components.PrimaryButton

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WebParityHubScreen(
    onBack: () -> Unit,
    onOpenPage: (String) -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Web parity pages", fontWeight = FontWeight.Bold)
                        Text(
                            "Mirrors localhost:8081 route map",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(
                horizontal = WebParityTokens.ScreenHorizontalPadding,
                vertical = WebParityTokens.ScreenVerticalPadding,
            ),
            verticalArrangement = Arrangement.spacedBy(WebParityTokens.SectionSpacing),
        ) {
            WebRouteGroup.entries.forEach { group ->
                val items = WebRouteCatalog.grouped[group].orEmpty()
                if (items.isNotEmpty()) {
                    item {
                        Text(
                            text = "${group.label} (${items.size})",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(vertical = 4.dp),
                        )
                    }
                    items(items, key = { it.key }) { route ->
                        Card(
                            onClick = { onOpenPage(route.key) },
                            shape = RoundedCornerShape(WebParityTokens.ItemRadius),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(WebParityTokens.InsetPadding),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        text = route.title,
                                        style = MaterialTheme.typography.titleSmall,
                                        fontWeight = FontWeight.SemiBold,
                                    )
                                    if (route.authRequired) {
                                        AssistChip(
                                            onClick = {},
                                            label = { Text("Auth") },
                                            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
                                        )
                                    }
                                }
                                Text(
                                    text = route.canonicalPath,
                                    style = MaterialTheme.typography.labelLarge,
                                    color = MaterialTheme.colorScheme.primary,
                                )
                                Text(
                                    text = route.summary,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
            item { Spacer(Modifier.height(20.dp)) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WebParityDetailScreen(
    pageKey: String,
    onBack: () -> Unit,
) {
    val route = WebRouteCatalog.byKey(pageKey)
    val context = LocalContext.current
    val spec = route?.let { WebParitySpecs.spec(it) }
    var previewState by rememberSaveable(pageKey) { mutableStateOf(RoutePreviewState.SUCCESS) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = route?.title ?: "Route preview",
                        fontWeight = FontWeight.Bold,
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        if (route == null || spec == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
                contentAlignment = Alignment.Center,
            ) {
                Text("Unknown route key: $pageKey")
            }
            return@Scaffold
        }

        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(
                horizontal = WebParityTokens.ScreenHorizontalPadding,
                vertical = WebParityTokens.ScreenVerticalPadding,
            ),
            verticalArrangement = Arrangement.spacedBy(WebParityTokens.SectionSpacing),
        ) {
            item {
                Card(
                    shape = RoundedCornerShape(WebParityTokens.CardRadius),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(WebParityTokens.InsetPadding),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                imageVector = iconForGroup(route.group),
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.primary,
                            )
                            Text(route.group.label, style = MaterialTheme.typography.titleSmall)
                            if (route.authRequired) {
                                FilterChip(
                                    selected = true,
                                    onClick = {},
                                    label = { Text("Auth required") },
                                )
                            }
                        }
                        Text(
                            text = route.canonicalPath,
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            text = route.summary,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        if (route.aliases.isNotEmpty()) {
                            Text(
                                text = "Aliases: ${route.aliases.joinToString()}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                        OutlinedButton(
                            onClick = {
                                val target = route.canonicalPath
                                    .replace(":id", "demo")
                                    .replace(":postId", "demo")
                                    .replace(":userId", "demo")
                                    .replace(":token", "demo")
                                    .replace(":code", "demo")
                                val uri = Uri.parse("http://localhost:8081$target")
                                context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                            },
                        ) {
                            Text("Open web reference")
                        }
                    }
                }
            }

            item {
                Text(
                    text = "Android-friendly route parity",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            item {
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    RoutePreviewState.entries.forEach { state ->
                        FilterChip(
                            selected = previewState == state,
                            onClick = { previewState = state },
                            label = { Text(state.label) },
                        )
                    }
                }
            }

            item {
                AndroidParityTemplate(
                    route = route,
                    spec = spec,
                    previewState = previewState,
                )
            }
        }
    }
}

@Composable
private fun AndroidParityTemplate(
    route: WebRouteReference,
    spec: RouteUxSpec,
    previewState: RoutePreviewState,
) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        when (route.group) {
            WebRouteGroup.AUTH -> AuthTemplate(route, spec, previewState)
            WebRouteGroup.DISCOVERY -> DiscoveryTemplate(route, spec, previewState)
            WebRouteGroup.COMMERCE -> CommerceTemplate(route, spec, previewState)
            WebRouteGroup.SOCIAL -> SocialTemplate(route, spec, previewState)
            WebRouteGroup.ACCOUNT -> AccountTemplate(route, spec, previewState)
            WebRouteGroup.CHANNELS -> ChannelsTemplate(route, spec, previewState)
            WebRouteGroup.LEGAL -> LegalTemplate(route, spec, previewState)
        }
    }
}

@Composable
private fun AuthTemplate(route: WebRouteReference, spec: RouteUxSpec, previewState: RoutePreviewState) {
    RouteTemplateCard(spec = spec, previewState = previewState, emptyText = "No auth prompts available.") {
        if (!RouteBehaviorContent(route.key)) {
            AppTextField(value = "", onValueChange = {}, label = "Email or phone")
            AppTextField(value = "", onValueChange = {}, label = "Password", isPassword = true)
        }
    }
}

@Composable
private fun DiscoveryTemplate(route: WebRouteReference, spec: RouteUxSpec, previewState: RoutePreviewState) {
    RouteTemplateCard(spec = spec, previewState = previewState, emptyText = "No discovery results available.") {
        if (!RouteBehaviorContent(route.key)) {
            AppTextField(value = "", onValueChange = {}, label = "Search listings")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AssistChip(onClick = {}, label = { Text("Nearby") })
                AssistChip(onClick = {}, label = { Text("Fresh") })
                AssistChip(onClick = {}, label = { Text("Verified") })
            }
            repeat(2) {
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Box(
                            modifier = Modifier
                                .size(64.dp)
                                .background(MaterialTheme.colorScheme.primaryContainer, RoundedCornerShape(10.dp)),
                        )
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("Listing title", fontWeight = FontWeight.SemiBold)
                            Text("INR 12,500", color = MaterialTheme.colorScheme.primary)
                            Text("City - 2h ago", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CommerceTemplate(route: WebRouteReference, spec: RouteUxSpec, previewState: RoutePreviewState) {
    RouteTemplateCard(spec = spec, previewState = previewState, emptyText = "No commerce items available.") {
        if (!RouteBehaviorContent(route.key)) {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp),
            ) {}
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = true, onClick = {}, label = { Text("Buy") })
                FilterChip(selected = false, onClick = {}, label = { Text("Offer") })
                FilterChip(selected = false, onClick = {}, label = { Text("Save") })
            }
        }
    }
}

@Composable
private fun SocialTemplate(route: WebRouteReference, spec: RouteUxSpec, previewState: RoutePreviewState) {
    RouteTemplateCard(spec = spec, previewState = previewState, emptyText = "No social activity available.") {
        if (!RouteBehaviorContent(route.key)) {
            repeat(3) { idx ->
                Card(
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Activity item #${idx + 1}", fontWeight = FontWeight.SemiBold)
                        Text("Message preview and contextual details.", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}

@Composable
private fun AccountTemplate(route: WebRouteReference, spec: RouteUxSpec, previewState: RoutePreviewState) {
    RouteTemplateCard(spec = spec, previewState = previewState, emptyText = "No account records available.") {
        if (!RouteBehaviorContent(route.key)) {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = MaterialTheme.colorScheme.primaryContainer,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Account summary", fontWeight = FontWeight.SemiBold)
                    Text("Verification, security and preferences", style = MaterialTheme.typography.bodySmall)
                }
            }
            repeat(2) {
                OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                    Text("Account action ${it + 1}")
                }
            }
        }
    }
}

@Composable
private fun ChannelsTemplate(route: WebRouteReference, spec: RouteUxSpec, previewState: RoutePreviewState) {
    RouteTemplateCard(spec = spec, previewState = previewState, emptyText = "No channels available.") {
        if (!RouteBehaviorContent(route.key)) {
            repeat(2) {
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text("Channel ${it + 1}", fontWeight = FontWeight.SemiBold)
                            Text("Listings - Followers", style = MaterialTheme.typography.bodySmall)
                        }
                        AssistChip(onClick = {}, label = { Text("Open") })
                    }
                }
            }
        }
    }
}

@Composable
private fun LegalTemplate(route: WebRouteReference, spec: RouteUxSpec, previewState: RoutePreviewState) {
    RouteTemplateCard(spec = spec, previewState = previewState, emptyText = "No legal document preview available.") {
        if (!RouteBehaviorContent(route.key)) {
            Surface(
                shape = RoundedCornerShape(14.dp),
                color = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    text = "Policy body preview. Typography and spacing are adapted for Android readability.",
                    modifier = Modifier.padding(12.dp),
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }
    }
}

@Composable
private fun ColumnScope.RouteBehaviorContent(routeKey: String): Boolean {
    when (routeKey) {
        "signup" -> {
            var fullName by rememberSaveable(routeKey) { mutableStateOf("") }
            var email by rememberSaveable("${routeKey}_email") { mutableStateOf("") }
            var phone by rememberSaveable("${routeKey}_phone") { mutableStateOf("") }
            var password by rememberSaveable("${routeKey}_password") { mutableStateOf("") }
            var confirm by rememberSaveable("${routeKey}_confirm") { mutableStateOf("") }
            AppTextField(value = fullName, onValueChange = { fullName = it }, label = "Full name")
            AppTextField(value = email, onValueChange = { email = it }, label = "Email")
            AppTextField(value = phone, onValueChange = { phone = it }, label = "Phone")
            AppTextField(value = password, onValueChange = { password = it }, label = "Password", isPassword = true)
            AppTextField(value = confirm, onValueChange = { confirm = it }, label = "Confirm password", isPassword = true)
            return true
        }

        "forgot_password" -> {
            var identifier by rememberSaveable(routeKey) { mutableStateOf("") }
            AppTextField(value = identifier, onValueChange = { identifier = it }, label = "Email or phone")
            OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth()) { Text("Send reset link") }
            return true
        }

        "reset_password" -> {
            var token by rememberSaveable(routeKey) { mutableStateOf("") }
            var newPassword by rememberSaveable("${routeKey}_pass") { mutableStateOf("") }
            AppTextField(value = token, onValueChange = { token = it }, label = "Reset token")
            AppTextField(value = newPassword, onValueChange = { newPassword = it }, label = "New password", isPassword = true)
            return true
        }

        "category_hub" -> {
            var selectedGroup by rememberSaveable(routeKey) { mutableStateOf("fashion") }
            val groups = listOf("electronics", "fashion", "vehicles", "others")
            Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                groups.forEach { group ->
                    FilterChip(
                        selected = selectedGroup == group,
                        onClick = { selectedGroup = group },
                        label = { Text(group.replaceFirstChar { it.uppercase() }) },
                    )
                }
            }
            Text(
                text = "Target route: ${RouteBehaviorRules.buildAllPostsRoute(selectedGroup, "")}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            repeat(2) { idx ->
                Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text("${selectedGroup.replaceFirstChar { it.uppercase() }} picks ${idx + 1}", fontWeight = FontWeight.SemiBold)
                            Text("Android tile with route-aware quick access.", style = MaterialTheme.typography.bodySmall)
                        }
                        AssistChip(onClick = {}, label = { Text("Open") })
                    }
                }
            }
            return true
        }

        "all_posts" -> {
            var selectedGroup by rememberSaveable(routeKey) { mutableStateOf("fashion") }
            var query by rememberSaveable("${routeKey}_query") { mutableStateOf("") }
            val groups = listOf("all", "electronics", "fashion", "vehicles", "others")
            AppTextField(value = query, onValueChange = { query = it }, label = "Search listings")
            Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                groups.forEach { group ->
                    FilterChip(
                        selected = selectedGroup == group,
                        onClick = { selectedGroup = group },
                        label = { Text(group.replaceFirstChar { it.uppercase() }) },
                    )
                }
            }
            Text(
                text = "Web parity URL: ${RouteBehaviorRules.buildAllPostsRoute(selectedGroup, query)}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            repeat(2) { idx ->
                Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Listing ${idx + 1} - ${selectedGroup.replaceFirstChar { it.uppercase() }}", fontWeight = FontWeight.SemiBold)
                        Text("INR ${14999 + idx * 1300} • 2.${idx} km • Updated now", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            return true
        }

        "add_post", "edit_post", "post_add", "post_welcome" -> {
            var title by rememberSaveable(routeKey) { mutableStateOf("") }
            var price by rememberSaveable("${routeKey}_price") { mutableStateOf("") }
            var location by rememberSaveable("${routeKey}_location") { mutableStateOf("") }
            AppTextField(value = title, onValueChange = { title = it }, label = "Listing title")
            AppTextField(value = price, onValueChange = { price = it }, label = "Price")
            AppTextField(value = location, onValueChange = { location = it }, label = "Location")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AssistChip(onClick = {}, label = { Text("Add photo") })
                AssistChip(onClick = {}, label = { Text("Select category") })
            }
            return true
        }

        "tiers" -> {
            var selectedTier by rememberSaveable(routeKey) { mutableStateOf("Silver") }
            Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Silver", "Gold", "Premium").forEach { tier ->
                    FilterChip(selected = selectedTier == tier, onClick = { selectedTier = tier }, label = { Text(tier) })
                }
            }
            Text("Selected plan: $selectedTier", style = MaterialTheme.typography.bodySmall)
            return true
        }

        "payment" -> {
            var amount by rememberSaveable(routeKey) { mutableStateOf("1499") }
            var method by rememberSaveable("${routeKey}_method") { mutableStateOf("UPI") }
            val validation = RouteBehaviorRules.paymentValidationMessage(amount, method)
            AppTextField(
                value = amount,
                onValueChange = { amount = it },
                label = "Amount",
                error = if (validation?.contains("amount", ignoreCase = true) == true) validation else null,
            )
            Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("UPI", "Card", "Wallet", "NetBanking").forEach { current ->
                    FilterChip(selected = method == current, onClick = { method = current }, label = { Text(current) })
                }
            }
            if (validation != null && validation.contains("method", ignoreCase = true)) {
                Text(validation, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
            } else {
                Text("Selected method: $method", style = MaterialTheme.typography.bodySmall)
            }
            OutlinedButton(onClick = {}, enabled = validation == null, modifier = Modifier.fillMaxWidth()) {
                Text("Proceed to payment")
            }
            return true
        }

        "chat" -> {
            var message by rememberSaveable(routeKey) { mutableStateOf("") }
            repeat(2) { idx ->
                Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                    Text("Message ${idx + 1}: Interested in your listing.", modifier = Modifier.padding(10.dp))
                }
            }
            AppTextField(value = message, onValueChange = { message = it }, label = "Type message")
            val canSend = RouteBehaviorRules.canSendChatMessage(message)
            if (!canSend && message.isNotBlank()) {
                Text("Message must be 1-500 characters.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
            }
            OutlinedButton(onClick = {}, enabled = canSend, modifier = Modifier.fillMaxWidth()) {
                Text("Send")
            }
            return true
        }

        "my_feed", "feed", "feed_detail", "public_wall" -> {
            var postText by rememberSaveable(routeKey) { mutableStateOf("") }
            AppTextField(value = postText, onValueChange = { postText = it }, label = "Write an update")
            repeat(2) { idx ->
                Card(shape = RoundedCornerShape(12.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                    Column(modifier = Modifier.padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Feed post ${idx + 1}", fontWeight = FontWeight.SemiBold)
                        Text("Mobile-ready timeline card with engagement actions.", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            return true
        }

        "activity", "dashboard" -> {
            Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Today", "Week", "Month").forEach {
                    AssistChip(onClick = {}, label = { Text(it) })
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Views 1.2K", "Offers 28", "Chats 14").forEach { metric ->
                    Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.surfaceVariant) {
                        Text(metric, modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp), style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            return true
        }

        "buyer_view", "sale_done", "sale_undone", "offers" -> {
            var offerAmount by rememberSaveable(routeKey) { mutableStateOf("12000") }
            AppTextField(value = offerAmount, onValueChange = { offerAmount = it }, label = "Offer amount")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = true, onClick = {}, label = { Text("Accept") })
                FilterChip(selected = false, onClick = {}, label = { Text("Counter") })
                FilterChip(selected = false, onClick = {}, label = { Text("Reject") })
            }
            return true
        }

        "channel_create", "centre_create" -> {
            var channelName by rememberSaveable(routeKey) { mutableStateOf("") }
            var about by rememberSaveable("${routeKey}_about") { mutableStateOf("") }
            AppTextField(value = channelName, onValueChange = { channelName = it }, label = "Channel name")
            AppTextField(value = about, onValueChange = { about = it }, label = "About")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AssistChip(onClick = {}, label = { Text("Set banner") })
                AssistChip(onClick = {}, label = { Text("Add rules") })
            }
            return true
        }

        "kyc", "verification" -> {
            var docType by rememberSaveable("${routeKey}_doc_type") { mutableStateOf("Aadhaar") }
            var idNumber by rememberSaveable(routeKey) { mutableStateOf("") }
            val invalidDocType = !RouteBehaviorRules.isValidKycDocumentType(docType)
            val invalidId = idNumber.isNotBlank() && !RouteBehaviorRules.isValidKycIdForType(docType, idNumber)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Aadhaar", "PAN", "Passport").forEach { current ->
                    FilterChip(
                        selected = docType == current,
                        onClick = { docType = current },
                        label = { Text(current) },
                    )
                }
            }
            if (invalidDocType) {
                Text("Unsupported document type selected.", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
            }
            AppTextField(
                value = idNumber,
                onValueChange = { idNumber = it },
                label = "Government ID number",
                error = if (invalidId) "Invalid ID format for $docType." else null,
            )
            OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                Text("Upload document")
            }
            return true
        }

        "profile" -> {
            var displayName by rememberSaveable(routeKey) { mutableStateOf("Rahul Sharma") }
            val validName = RouteBehaviorRules.isProfileNameValid(displayName)
            AppTextField(
                value = displayName,
                onValueChange = { displayName = it },
                label = "Display name",
                error = if (validName) null else "Name must be 2-60 characters.",
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AssistChip(onClick = {}, label = { Text("Edit profile") })
                AssistChip(onClick = {}, label = { Text("Trust badge") })
            }
            OutlinedButton(onClick = {}, enabled = validName, modifier = Modifier.fillMaxWidth()) {
                Text("Save profile changes")
            }
            return true
        }

        "invite" -> {
            var inviteCode by rememberSaveable(routeKey) { mutableStateOf("MHUB-DEMO") }
            AppTextField(value = inviteCode, onValueChange = { inviteCode = it }, label = "Invite code")
            Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                Text(
                    "Invite accepted flow mirrors web deep-link behavior with Android-safe fallback.",
                    modifier = Modifier.padding(12.dp),
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth()) { Text("Continue to signup") }
            return true
        }

        "security" -> {
            var twoFactorEnabled by rememberSaveable(routeKey) { mutableStateOf(true) }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = twoFactorEnabled,
                    onClick = { twoFactorEnabled = true },
                    label = { Text("2FA On") },
                )
                FilterChip(
                    selected = !twoFactorEnabled,
                    onClick = { twoFactorEnabled = false },
                    label = { Text("2FA Off") },
                )
            }
            repeat(2) { idx ->
                Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text("Active session ${idx + 1}", fontWeight = FontWeight.SemiBold)
                            Text("Android - Chennai - Just now", style = MaterialTheme.typography.bodySmall)
                        }
                        AssistChip(onClick = {}, label = { Text("Revoke") })
                    }
                }
            }
            return true
        }

        "account_delete" -> {
            var reason by rememberSaveable(routeKey) { mutableStateOf("Need a break") }
            AppTextField(value = reason, onValueChange = { reason = it }, label = "Reason")
            Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                Text(
                    "Deletion is irreversible. Android flow keeps confirmation and recovery steps explicit.",
                    modifier = Modifier.padding(12.dp),
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth()) { Text("Request account deletion") }
            return true
        }

        "for_you" -> {
            Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Recommended", "Trending", "Near you").forEach { tab ->
                    AssistChip(onClick = {}, label = { Text(tab) })
                }
            }
            repeat(2) { idx ->
                Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Recommended listing ${idx + 1}", fontWeight = FontWeight.SemiBold)
                        Text("Personalized from your browsing profile.", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            return true
        }

        "bought_posts", "sold_posts" -> {
            repeat(3) { idx ->
                Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text("Order #${idx + 1012}", fontWeight = FontWeight.SemiBold)
                            Text("INR ${12000 + idx * 1000}", style = MaterialTheme.typography.bodySmall)
                        }
                        FilterChip(selected = true, onClick = {}, label = { Text("Completed") })
                    }
                }
            }
            return true
        }

        "admin_panel" -> {
            Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Users", "Posts", "Flags", "Finance").forEach { panel ->
                    FilterChip(selected = panel == "Users", onClick = {}, label = { Text(panel) })
                }
            }
            repeat(2) { idx ->
                OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth()) { Text("Moderation action ${idx + 1}") }
            }
            return true
        }

        "complaints" -> {
            var subject by rememberSaveable(routeKey) { mutableStateOf("") }
            var detail by rememberSaveable("${routeKey}_detail") { mutableStateOf("") }
            AppTextField(value = subject, onValueChange = { subject = it }, label = "Subject")
            AppTextField(value = detail, onValueChange = { detail = it }, label = "Describe issue")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AssistChip(onClick = {}, label = { Text("Upload evidence") })
                AssistChip(onClick = {}, label = { Text("Track ticket") })
            }
            return true
        }

        "feedback" -> {
            var note by rememberSaveable(routeKey) { mutableStateOf("") }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Bug", "Suggestion", "UI").forEach { type ->
                    AssistChip(onClick = {}, label = { Text(type) })
                }
            }
            AppTextField(value = note, onValueChange = { note = it }, label = "Feedback details")
            OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth()) { Text("Submit feedback") }
            return true
        }

        "rewards" -> {
            Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("Reward balance: 2,450 coins", fontWeight = FontWeight.SemiBold)
                    Text("Next milestone: 3,000 coins", style = MaterialTheme.typography.bodySmall)
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AssistChip(onClick = {}, label = { Text("Invite friends") })
                AssistChip(onClick = {}, label = { Text("Redeem") })
            }
            return true
        }

        "subcategories" -> {
            Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("Phones", "Accessories", "Tablets", "Laptops").forEach { name ->
                    FilterChip(selected = name == "Phones", onClick = {}, label = { Text(name) })
                }
            }
            repeat(2) { idx ->
                Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                    Text("Subcategory tile ${idx + 1}", modifier = Modifier.padding(12.dp))
                }
            }
            return true
        }

        "compare" -> {
            Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text("Listing A vs Listing B", fontWeight = FontWeight.SemiBold)
                    Text("Price: 12,500 vs 13,200", style = MaterialTheme.typography.bodySmall)
                    Text("Condition: Like new vs Good", style = MaterialTheme.typography.bodySmall)
                    Text("Distance: 1.2km vs 4.8km", style = MaterialTheme.typography.bodySmall)
                }
            }
            OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth()) { Text("Open detailed compare") }
            return true
        }

        "cart" -> {
            repeat(2) { idx ->
                Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text("Cart item ${idx + 1}", fontWeight = FontWeight.SemiBold)
                            Text("INR ${9999 + idx * 1400}", style = MaterialTheme.typography.bodySmall)
                        }
                        AssistChip(onClick = {}, label = { Text("Remove") })
                    }
                }
            }
            OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth()) { Text("Proceed to checkout") }
            return true
        }

        "recently_viewed" -> {
            repeat(3) { idx ->
                Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                    Text("Recently viewed listing ${idx + 1}", modifier = Modifier.padding(12.dp))
                }
            }
            OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth()) { Text("Clear history") }
            return true
        }

        "saved_searches" -> {
            var query by rememberSaveable(routeKey) { mutableStateOf("iphone under 20000") }
            AppTextField(value = query, onValueChange = { query = it }, label = "Saved query")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(selected = true, onClick = {}, label = { Text("Instant alerts") })
                FilterChip(selected = false, onClick = {}, label = { Text("Daily digest") })
            }
            OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth()) { Text("Save search") }
            return true
        }

        "nearby" -> {
            var radius by rememberSaveable(routeKey) { mutableStateOf("10 km") }
            AppTextField(value = radius, onValueChange = { radius = it }, label = "Search radius")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AssistChip(onClick = {}, label = { Text("Use GPS") })
                AssistChip(onClick = {}, label = { Text("Set manual area") })
            }
            repeat(2) { idx ->
                Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                    Text("Nearby listing ${idx + 1} - ${idx + 1}.3 km", modifier = Modifier.padding(12.dp))
                }
            }
            return true
        }

        "terms", "privacy", "refund", "support_policy" -> {
            repeat(3) { idx ->
                Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Section ${idx + 1}", fontWeight = FontWeight.SemiBold)
                        Text("Policy copy optimized for Android reading and navigation.", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth()) { Text("Acknowledge") }
            return true
        }

        "analytics" -> {
            Row(modifier = Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("7D", "30D", "90D").forEach { period ->
                    FilterChip(selected = period == "30D", onClick = {}, label = { Text(period) })
                }
            }
            repeat(3) { idx ->
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(72.dp),
                ) {
                    Text(
                        "Analytics panel ${idx + 1}",
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
            return true
        }

        "channels", "channel_detail" -> {
            repeat(3) { idx ->
                Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text("Channel ${idx + 1}", fontWeight = FontWeight.SemiBold)
                            Text("1.${idx}k followers - 2${idx} posts", style = MaterialTheme.typography.bodySmall)
                        }
                        AssistChip(onClick = {}, label = { Text("Follow") })
                    }
                }
            }
            return true
        }

        "centre_list", "centre_listings", "centre_detail" -> {
            repeat(2) { idx ->
                Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Centre ${idx + 1}", fontWeight = FontWeight.SemiBold)
                        Text("Verified seller hub with local listings.", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth()) { Text("Manage centre") }
            return true
        }

        "reviews" -> {
            Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.primaryContainer, modifier = Modifier.fillMaxWidth()) {
                Text("Average rating 4.6 - 128 reviews", modifier = Modifier.padding(12.dp), fontWeight = FontWeight.SemiBold)
            }
            repeat(3) { idx ->
                Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Reviewer ${idx + 1}", fontWeight = FontWeight.SemiBold)
                        Text("Fast response and genuine product.", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            return true
        }
    }
    return false
}

@Composable
private fun RouteTemplateCard(
    spec: RouteUxSpec,
    previewState: RoutePreviewState,
    emptyText: String,
    content: @Composable ColumnScope.() -> Unit,
) {
    Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(WebParityTokens.InsetPadding),
            verticalArrangement = Arrangement.spacedBy(WebParityTokens.BlockSpacing),
        ) {
            Text(spec.headline, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            if (spec.highlights.isNotEmpty()) {
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    spec.highlights.forEach { tag ->
                        AssistChip(onClick = {}, label = { Text(tag) })
                    }
                }
            }

            when (previewState) {
                RoutePreviewState.LOADING -> {
                    repeat(3) {
                        Surface(
                            shape = RoundedCornerShape(WebParityTokens.SectionRadius),
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(46.dp),
                        ) {}
                    }
                }

                RoutePreviewState.EMPTY -> {
                    Text(emptyText, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                RoutePreviewState.ERROR -> {
                    Text(
                        "Could not load this state. Retry pattern should be available on Android.",
                        color = MaterialTheme.colorScheme.error,
                    )
                    OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                        Text("Retry")
                    }
                }

                RoutePreviewState.SUCCESS -> {
                    content()
                }
            }

            spec.sections.forEach { section ->
                Surface(
                    shape = RoundedCornerShape(WebParityTokens.SectionRadius),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text(section.title, fontWeight = FontWeight.SemiBold)
                        Text(section.description, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }

            PrimaryButton(text = spec.primaryAction, onClick = {})
            if (spec.secondaryAction != null) {
                OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                    Text(spec.secondaryAction)
                }
            }
        }
    }
}

private fun iconForGroup(group: WebRouteGroup): ImageVector = when (group) {
    WebRouteGroup.AUTH -> Icons.Default.Lock
    WebRouteGroup.DISCOVERY -> Icons.Default.Category
    WebRouteGroup.COMMERCE -> Icons.Default.Storefront
    WebRouteGroup.SOCIAL -> Icons.Default.Diversity3
    WebRouteGroup.ACCOUNT -> Icons.Default.AccountCircle
    WebRouteGroup.CHANNELS -> Icons.AutoMirrored.Filled.Article
    WebRouteGroup.LEGAL -> Icons.Default.Description
}
