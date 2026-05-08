package com.mhub.app.ui.home

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material3.ExperimentalMaterial3Api
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
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// ── App definitions ──────────────────────────────────────────────────────────

private data class AppMode(
    val key: String,
    val label: String,
    val tagline: String,
    val description: String,
    val emoji: String,
    val gradientColors: List<Color>,
    val glowColor: Color,
)

private val APP_MODES = listOf(
    AppMode(
        key = "electronics",
        label = "Electronics",
        tagline = "Phones, laptops & gadgets",
        description = "Explore the latest mobiles, laptops, cameras, and all things tech.",
        emoji = "📱",
        gradientColors = listOf(Color(0xFF3B82F6), Color(0xFF4F46E5), Color(0xFF7C3AED)),
        glowColor = Color(0xFF4F46E5),
    ),
    AppMode(
        key = "fashion",
        label = "Fashion",
        tagline = "Clothing, shoes & accessories",
        description = "Discover trending outfits, footwear, bags and accessories.",
        emoji = "👗",
        gradientColors = listOf(Color(0xFFEC4899), Color(0xFFF43F5E), Color(0xFFEF4444)),
        glowColor = Color(0xFFEC4899),
    ),
    AppMode(
        key = "vehicles",
        label = "Vehicles",
        tagline = "Cars, bikes & spare parts",
        description = "Browse cars, motorcycles, auto parts and accessories.",
        emoji = "🚗",
        gradientColors = listOf(Color(0xFF10B981), Color(0xFF14B8A6), Color(0xFF0891B2)),
        glowColor = Color(0xFF10B981),
    ),
    AppMode(
        key = "others",
        label = "Others",
        tagline = "Home, services, jobs & more",
        description = "Find home goods, services, jobs, real estate and everything else.",
        emoji = "✨",
        gradientColors = listOf(Color(0xFFA855F7), Color(0xFF7C3AED), Color(0xFF4F46E5)),
        glowColor = Color(0xFFA855F7),
    ),
)

// ── Screen ────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CategoryModeScreen(
    initialActiveApp: String = "",
    onBack: () -> Unit,
    onSelectApp: (String) -> Unit,
) {
    var selectedApp by rememberSaveable { mutableStateOf(initialActiveApp) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Category Mode", fontWeight = FontWeight.Bold)
                        Text("Choose your active experience", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Hero header
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(Brush.horizontalGradient(listOf(Color(0xFF1E1B4B), Color(0xFF4C1D95), Color(0xFF6D28D9)))),
            ) {
                Column(modifier = Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Box(
                            modifier = Modifier.size(44.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.15f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(Icons.Default.GridView, null, tint = Color.White, modifier = Modifier.size(26.dp))
                        }
                        Column {
                            Text("CHOOSE YOUR WORLD", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.75f), letterSpacing = 1.5.sp, fontWeight = FontWeight.Bold)
                            Text("Select Active Experience", style = MaterialTheme.typography.titleMedium, color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                    Text(
                        "Your selection becomes the active experience across feed, listings, and every page until you switch.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.8f),
                    )
                    if (selectedApp.isNotBlank()) {
                        val current = APP_MODES.find { it.key == selectedApp }
                        if (current != null) {
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = Color.White.copy(alpha = 0.15f),
                                modifier = Modifier,
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                                ) {
                                    Box(Modifier.size(6.dp).clip(CircleShape).background(Color(0xFF4ADE80)))
                                    Text("Active: ${current.label}", style = MaterialTheme.typography.labelSmall, color = Color.White, fontWeight = FontWeight.SemiBold)
                                    Text("• Switch anytime", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.6f))
                                }
                            }
                        }
                    }
                }
            }

            Text("Select App Mode", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)

            // App tiles grid (2x2)
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                APP_MODES.chunked(2).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                        row.forEach { app ->
                            AppModeTile(
                                app = app,
                                isActive = selectedApp == app.key,
                                modifier = Modifier.weight(1f),
                                onSelect = {
                                    selectedApp = app.key
                                    onSelectApp(app.key)
                                },
                            )
                        }
                        // Fill remaining space if odd count (shouldn't happen with 4 apps)
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }

            // Clear mode button
            if (selectedApp.isNotBlank()) {
                OutlinedButton(
                    onClick = {
                        selectedApp = ""
                        onSelectApp("")
                    },
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text("Clear Mode (Browse All)", style = MaterialTheme.typography.labelMedium)
                }
            }

            // How it works section
            Text("How Category Mode Works", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                CategoryModeFeature(
                    number = "1",
                    title = "Pick Your World",
                    description = "Select from Electronics, Fashion, Vehicles, or Others as your active experience.",
                    color = Color(0xFF6366F1),
                )
                CategoryModeFeature(
                    number = "2",
                    title = "Filtered Discovery",
                    description = "All listings, search results, and recommendations will be scoped to your chosen category.",
                    color = Color(0xFF10B981),
                )
                CategoryModeFeature(
                    number = "3",
                    title = "Switch Anytime",
                    description = "Return to this screen from Category Hub to switch your active mode at any time.",
                    color = Color(0xFFF59E0B),
                )
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun AppModeTile(
    app: AppMode,
    isActive: Boolean,
    modifier: Modifier = Modifier,
    onSelect: () -> Unit,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.96f else 1f,
        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
        label = "tile_scale",
    )

    Box(
        modifier = modifier
            .scale(scale)
            .clip(RoundedCornerShape(20.dp))
            .then(
                if (isActive) Modifier.border(3.dp, Color.White.copy(alpha = 0.8f), RoundedCornerShape(20.dp))
                else Modifier,
            )
            .background(Brush.linearGradient(app.gradientColors))
            .clickable(interactionSource = interactionSource, indication = null, onClick = onSelect)
            .padding(16.dp),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Text(app.emoji, fontSize = 32.sp)
                if (isActive) {
                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = Color.White.copy(alpha = 0.25f),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(3.dp),
                        ) {
                            Box(Modifier.size(5.dp).clip(CircleShape).background(Color(0xFF4ADE80)))
                            Text("Active", style = MaterialTheme.typography.labelSmall, color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(app.label, style = MaterialTheme.typography.titleMedium, color = Color.White, fontWeight = FontWeight.ExtraBold)
                Text(app.tagline, style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.8f), maxLines = 2)
            }
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = Color.White.copy(alpha = 0.2f),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    modifier = Modifier
                        .padding(horizontal = 10.dp, vertical = 8.dp)
                        .fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        if (isActive) "Continue →" else "Enter",
                        style = MaterialTheme.typography.labelMedium,
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Icon(
                        if (isActive) Icons.Default.CheckCircle else Icons.AutoMirrored.Filled.ArrowForward,
                        null,
                        tint = Color.White,
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun CategoryModeFeature(
    number: String,
    title: String,
    description: String,
    color: Color,
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Box(
                modifier = Modifier.size(32.dp).clip(CircleShape).background(color),
                contentAlignment = Alignment.Center,
            ) {
                Text(number, color = Color.White, fontWeight = FontWeight.ExtraBold, style = MaterialTheme.typography.labelLarge)
            }
            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(title, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
