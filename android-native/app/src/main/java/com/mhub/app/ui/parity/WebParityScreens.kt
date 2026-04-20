package com.mhub.app.ui.parity

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Article
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
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            WebRouteGroup.entries.forEach { group ->
                val items = WebRouteCatalog.grouped[group].orEmpty()
                if (items.isNotEmpty()) {
                    item {
                        Text(
                            text = group.label,
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier.padding(vertical = 4.dp),
                        )
                    }
                    items(items, key = { it.key }) { route ->
                        Card(
                            onClick = { onOpenPage(route.key) },
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
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
        if (route == null) {
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
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Card(
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
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
                    text = "Android-friendly parity layout",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            item {
                AndroidParityTemplate(route = route)
            }
        }
    }
}

@Composable
private fun AndroidParityTemplate(route: WebRouteReference) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        when (route.group) {
            WebRouteGroup.AUTH -> AuthTemplate(route)
            WebRouteGroup.DISCOVERY -> DiscoveryTemplate(route)
            WebRouteGroup.COMMERCE -> CommerceTemplate(route)
            WebRouteGroup.SOCIAL -> SocialTemplate(route)
            WebRouteGroup.ACCOUNT -> AccountTemplate(route)
            WebRouteGroup.CHANNELS -> ChannelsTemplate(route)
            WebRouteGroup.LEGAL -> LegalTemplate(route)
        }
    }
}

@Composable
private fun AuthTemplate(route: WebRouteReference) {
    Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(route.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            AppTextField(value = "", onValueChange = {}, label = "Email or phone")
            AppTextField(value = "", onValueChange = {}, label = "Password", isPassword = true)
            PrimaryButton(text = if (route.key == "signup") "Create account" else "Continue", onClick = {})
        }
    }
}

@Composable
private fun DiscoveryTemplate(route: WebRouteReference) {
    Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(route.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            AppTextField(value = "", onValueChange = {}, label = "Search")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AssistChip(onClick = {}, label = { Text("Trending") })
                AssistChip(onClick = {}, label = { Text("Nearby") })
                AssistChip(onClick = {}, label = { Text("Fresh") })
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
                            Text("City • 2h ago", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CommerceTemplate(route: WebRouteReference) {
    Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(route.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
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
            PrimaryButton(text = "Primary action", onClick = {})
        }
    }
}

@Composable
private fun SocialTemplate(route: WebRouteReference) {
    Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(route.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            repeat(3) {
                Card(
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                ) {
                    Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("Activity item #${it + 1}", fontWeight = FontWeight.SemiBold)
                        Text("Message preview and contextual details.", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }
}

@Composable
private fun AccountTemplate(route: WebRouteReference) {
    Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(route.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
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
            repeat(3) {
                OutlinedButton(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                    Text("Account action ${it + 1}")
                }
            }
        }
    }
}

@Composable
private fun ChannelsTemplate(route: WebRouteReference) {
    Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(route.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
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
                            Text("Listings • Followers", style = MaterialTheme.typography.bodySmall)
                        }
                        AssistChip(onClick = {}, label = { Text("Open") })
                    }
                }
            }
        }
    }
}

@Composable
private fun LegalTemplate(route: WebRouteReference) {
    Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(route.title, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(route.summary, color = MaterialTheme.colorScheme.onSurfaceVariant)
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

private fun iconForGroup(group: WebRouteGroup): ImageVector = when (group) {
    WebRouteGroup.AUTH -> Icons.Default.Lock
    WebRouteGroup.DISCOVERY -> Icons.Default.Category
    WebRouteGroup.COMMERCE -> Icons.Default.Storefront
    WebRouteGroup.SOCIAL -> Icons.Default.Diversity3
    WebRouteGroup.ACCOUNT -> Icons.Default.AccountCircle
    WebRouteGroup.CHANNELS -> Icons.Default.Article
    WebRouteGroup.LEGAL -> Icons.Default.Description
}
