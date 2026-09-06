package com.zaruda.app.ui.staticpages

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.zaruda.app.R
import com.zaruda.app.ui.theme.ColorTokens

/* ── Layer 1: Ambient Atmospheric Canvas Backdrop ─────────────────────────── */

@Composable
private fun StaticPagesAtmosphericBackdrop(
    isDark: Boolean,
    primaryColor: Color = Color(0xFF6366F1),
    secondaryColor: Color = Color(0xFF059669),
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(230.dp)
            .background(
                Brush.verticalGradient(
                    colors = if (isDark) {
                        listOf(
                            Color(0xFF0F172A),
                            Color(0xFF1E1B4B),
                            Color(0xFF0F172A),
                        )
                    } else {
                        listOf(
                            Color(0xFFEEF2FF),
                            Color(0xFFE0E7FF),
                            Color(0xFFF8FAFC),
                        )
                    }
                )
            )
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val canvasWidth = size.width
            val canvasHeight = size.height

            // Aura 1 - Top Left
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        primaryColor.copy(alpha = if (isDark) 0.30f else 0.40f),
                        Color.Transparent,
                    ),
                    center = Offset(canvasWidth * 0.20f, canvasHeight * 0.25f),
                    radius = canvasWidth * 0.60f,
                )
            )

            // Aura 2 - Top Right (Emerald Escrow Trust Aura)
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        secondaryColor.copy(alpha = if (isDark) 0.22f else 0.32f),
                        Color.Transparent,
                    ),
                    center = Offset(canvasWidth * 0.85f, canvasHeight * 0.35f),
                    radius = canvasWidth * 0.50f,
                )
            )
        }

        // Dark top vignette scrim for status bar readability
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(90.dp)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.45f),
                            Color.Transparent,
                        )
                    )
                )
        )

        // Ambient bottom gradient scrim where sheet meets backdrop
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(70.dp)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            if (isDark) Color(0xFF0F172A).copy(alpha = 0.80f) else Color(0xFFF8FAFC).copy(alpha = 0.85f),
                        )
                    )
                )
        )
    }
}

/* ── Layer 2: Pinned Floating Glassmorphic Top Bar ────────────────────────── */

@Composable
private fun StaticPagesFloatingTopBar(
    title: String,
    badgeText: String = "🛡️ Zaruda Escrow",
    isDark: Boolean,
    onBack: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 14.dp, vertical = 8.dp)
    ) {
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = if (isDark) Color.Black.copy(alpha = 0.65f) else Color.White.copy(alpha = 0.88f),
            border = BorderStroke(1.dp, if (isDark) Color.White.copy(alpha = 0.15f) else Color.Black.copy(alpha = 0.08f)),
            shadowElevation = 6.dp,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                // Back Button + Title
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Surface(
                        shape = CircleShape,
                        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                        modifier = Modifier.size(36.dp),
                        onClick = onBack,
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                contentDescription = "Back",
                                modifier = Modifier.size(18.dp),
                            )
                        }
                    }

                    Text(
                        text = title,
                        fontWeight = FontWeight.Bold,
                        fontSize = 17.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }

                // Trust Badge Pill
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFF059669).copy(alpha = 0.12f),
                    border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.35f)),
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 9.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text(
                            text = badgeText,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = Color(0xFF059669),
                        )
                    }
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// About Us
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun AboutUsScreen(onBack: () -> Unit) {
    val isDark = ColorTokens.isDark

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        // Layer 1: Ambient Atmospheric Canvas Backdrop
        StaticPagesAtmosphericBackdrop(
            isDark = isDark,
            primaryColor = Color(0xFF6366F1),
            secondaryColor = Color(0xFF059669),
        )

        // Layer 3: 32dp Curved Content Sheet
        Column(modifier = Modifier.fillMaxSize()) {
            Spacer(modifier = Modifier.height(108.dp))

            Surface(
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                color = MaterialTheme.colorScheme.background,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxSize(),
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Tactile Drag Handle
                    Box(
                        modifier = Modifier
                            .padding(top = 12.dp, bottom = 6.dp)
                            .width(44.dp)
                            .height(4.5.dp)
                            .clip(RoundedCornerShape(2.5.dp))
                            .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.35f))
                            .align(Alignment.CenterHorizontally),
                    )

                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        contentPadding = PaddingValues(top = 8.dp, bottom = 48.dp),
                    ) {
                        item {
                            Text(
                                stringResource(R.string.about_headline),
                                style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                                modifier = Modifier.semantics { heading() },
                            )
                        }

                        // Escrow Mission Trust Card
                        item {
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = Color(0xFF059669).copy(alpha = 0.08f),
                                border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.3f)),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Row(
                                    modifier = Modifier.padding(16.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    Text("🛡️", fontSize = 28.sp)
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            "India's 100% Escrow Marketplace",
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 14.sp,
                                            color = Color(0xFF059669),
                                        )
                                        Text(
                                            "Building transparent, verified, and scam-free local commerce powered by bank-grade escrow technology.",
                                            fontSize = 12.sp,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }

                        item {
                            Text(
                                stringResource(R.string.about_description),
                                style = MaterialTheme.typography.bodyMedium,
                            )
                        }
                        item {
                            AboutSection(
                                title = stringResource(R.string.about_mission_title),
                                body = stringResource(R.string.about_mission),
                            )
                        }
                        item {
                            AboutSection(
                                title = stringResource(R.string.about_vision_title),
                                body = stringResource(R.string.about_vision),
                            )
                        }
                        item {
                            AboutSection(
                                title = stringResource(R.string.about_why_title),
                                body = stringResource(R.string.about_why),
                            )
                        }
                        item {
                            AboutSection(
                                title = stringResource(R.string.about_version_title),
                                body = stringResource(R.string.about_version),
                            )
                        }
                    }
                }
            }
        }

        // Layer 2: Pinned Floating Glassmorphic Top Bar
        StaticPagesFloatingTopBar(
            title = stringResource(R.string.about_title),
            badgeText = "🛡️ About Zaruda",
            isDark = isDark,
            onBack = onBack,
        )
    }
}

@Composable
private fun AboutSection(title: String, body: String) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Text(title, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
            Spacer(Modifier.height(6.dp))
            Text(body, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contact Us
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun ContactUsScreen(onBack: () -> Unit) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var submitted by remember { mutableStateOf(false) }
    val isDark = ColorTokens.isDark
    val haptic = LocalHapticFeedback.current

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        // Layer 1: Ambient Atmospheric Canvas Backdrop
        StaticPagesAtmosphericBackdrop(
            isDark = isDark,
            primaryColor = Color(0xFF2563EB),
            secondaryColor = Color(0xFF059669),
        )

        // Layer 3: 32dp Curved Content Sheet
        Column(modifier = Modifier.fillMaxSize()) {
            Spacer(modifier = Modifier.height(108.dp))

            Surface(
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                color = MaterialTheme.colorScheme.background,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxSize(),
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Tactile Drag Handle
                    Box(
                        modifier = Modifier
                            .padding(top = 12.dp, bottom = 6.dp)
                            .width(44.dp)
                            .height(4.5.dp)
                            .clip(RoundedCornerShape(2.5.dp))
                            .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.35f))
                            .align(Alignment.CenterHorizontally),
                    )

                    LazyColumn(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp),
                        contentPadding = PaddingValues(top = 8.dp, bottom = 48.dp),
                    ) {
                        item {
                            Text(
                                stringResource(R.string.contact_get_in_touch),
                                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                stringResource(R.string.contact_subtitle),
                                style = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurfaceVariant),
                            )
                        }

                        // Direct contact info cards
                        item {
                            Surface(
                                shape = RoundedCornerShape(16.dp),
                                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                    ContactRow(icon = Icons.Filled.Comment, label = "In-App Feedback: More → Feedback")
                                    ContactRow(icon = Icons.Filled.Report, label = "Complaints & Disputes: More → Complaints")
                                    ContactRow(icon = Icons.Filled.Info, label = "Platform Operator: Wyntech Labs")
                                }
                            }
                        }

                        if (!submitted) {
                            item {
                                HorizontalDivider()
                                Spacer(Modifier.height(4.dp))
                                Text(
                                    stringResource(R.string.contact_send_message),
                                    style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold),
                                )
                            }
                            item {
                                OutlinedTextField(
                                    value = name,
                                    onValueChange = { name = it },
                                    label = { Text(stringResource(R.string.contact_your_name)) },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    singleLine = true,
                                )
                            }
                            item {
                                OutlinedTextField(
                                    value = email,
                                    onValueChange = { email = it },
                                    label = { Text(stringResource(R.string.contact_email)) },
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(12.dp),
                                    singleLine = true,
                                )
                            }
                            item {
                                OutlinedTextField(
                                    value = message,
                                    onValueChange = { message = it },
                                    label = { Text(stringResource(R.string.contact_message)) },
                                    modifier = Modifier.fillMaxWidth().height(120.dp),
                                    shape = RoundedCornerShape(12.dp),
                                    maxLines = 5,
                                )
                            }
                            item {
                                Button(
                                    onClick = {
                                        if (name.isNotBlank() && email.isNotBlank() && message.isNotBlank()) {
                                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                            submitted = true
                                        }
                                    },
                                    modifier = Modifier.fillMaxWidth().height(50.dp),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                                ) {
                                    Text(stringResource(R.string.contact_send), fontWeight = FontWeight.Bold)
                                }
                            }
                        } else {
                            item {
                                Surface(
                                    color = Color(0xFF059669).copy(alpha = 0.12f),
                                    shape = RoundedCornerShape(14.dp),
                                    border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.35f)),
                                    modifier = Modifier.fillMaxWidth(),
                                ) {
                                    Row(
                                        modifier = Modifier.padding(16.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                                    ) {
                                        Text("✅", fontSize = 24.sp)
                                        Text(
                                            stringResource(R.string.contact_success, email),
                                            style = MaterialTheme.typography.bodyMedium.copy(color = Color(0xFF059669), fontWeight = FontWeight.SemiBold),
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Layer 2: Pinned Floating Glassmorphic Top Bar
        StaticPagesFloatingTopBar(
            title = stringResource(R.string.contact_title),
            badgeText = "🛡️ 24/7 Escrow Support",
            isDark = isDark,
            onBack = onBack,
        )
    }
}

@Composable
private fun ContactRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(20.dp), tint = MaterialTheme.colorScheme.primary)
        Spacer(Modifier.width(10.dp))
        Text(label, style = MaterialTheme.typography.bodyMedium)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQ Screen
// ─────────────────────────────────────────────────────────────────────────────

private data class FaqItem(val question: String, val answer: String, val category: String)

private val faqs = listOf(
    FaqItem("How do I create an account?", "Tap Sign Up on the login screen and register with your email or mobile number, then verify the one-time password (OTP) sent to you. You can browse and buy right away.", "Account"),
    FaqItem("I forgot my password. How do I reset it?", "On the login screen tap Forgot Password, enter your registered email or phone number, and follow the instructions sent to you to set a new password.", "Account"),
    FaqItem("How do I secure my account?", "Open Profile → Security to set a strong password and enable two-factor authentication (2FA). With 2FA on, you'll need a one-time code when logging in from a new device.", "Account"),
    FaqItem("Can I use the app in my language?", "Yes. The app supports English, Hindi, Telugu, Tamil, Kannada, Marathi, Bengali and Gujarati. Switch anytime from More → Appearance & Language.", "App"),
    FaqItem("How do I buy an item?", "Browse or search listings in Electronics, Fashion, Vehicles and Others. Open an item to view details, then contact the seller, express interest or send an offer, or buy in-app when the listing offers that option.", "Buying"),
    FaqItem("What is the In-App Buy option?", "On Electronics listings that offer it, your payment is held securely and released to the seller only after you confirm you've received the item. It protects both sides and is the recommended way to buy electronics.", "Buying"),
    FaqItem("Where do I find my purchases?", "Open Profile → Orders → Order History, or the Bought Posts section, to see everything you've bought, track its status and raise any issues.", "Buying"),
    FaqItem("How do I start selling?", "Tap Sell from the home screen. You need an active plan (free or paid) and completed KYC (Aadhaar + PAN). Then add photos, a title and description, price and category, and publish your listing.", "Selling"),
    FaqItem("How do I mark a listing as sold?", "Open the listing and choose More → Sale Done. Made a mistake? Use Repost to bring the listing back.", "Selling"),
    FaqItem("Why do I need KYC?", "KYC (Aadhaar + PAN) confirms that sellers are real people, which builds trust and keeps the marketplace safe. KYC verification is required to publish listings.", "Account"),
    FaqItem("How do I complete KYC?", "Go to More → Verification, verify your Aadhaar with an OTP, verify your PAN, and submit. An active plan is required to complete KYC. Most verifications are approved within 24–48 hours.", "Account"),
    FaqItem("What do the plans include?", "The Free plan includes 1 photo per post. Paid plans add more photos, better visibility, promoted listings, analytics, a profile badge and priority support.", "Plans"),
    FaqItem("How do refunds work?", "Refunds are handled through the order flow or via a complaint. In-app payments are returned to you if the item is never delivered or isn't as described. See the Refund Policy for details.", "Plans"),
    FaqItem("How do Rewards and Coins work?", "Earn coins through daily check-ins, spins, engagement and referral milestones. Redeem them in the Rewards store for discounts and perks.", "Rewards"),
    FaqItem("How do I report a post or user?", "Open the post and tap Report, or block a user from their profile. Our safety team reviews every report.", "Safety"),
    FaqItem("What should I do if a deal goes wrong?", "File a complaint from More → Complaints with the order or listing details. Our team mediates between buyer and seller. In fraud cases, payments are held and accounts may be frozen until the case is reviewed.", "Safety"),
    FaqItem("How do I contact support?", "Use More → Feedback for suggestions and More → Complaints for disputes. Our team responds within 24–48 hours on business days.", "Support"),
)

@Composable
fun FAQScreen(onBack: () -> Unit) {
    var query by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("All") }
    val categories = remember { listOf("All") + faqs.map { it.category }.distinct() }
    val filtered = remember(query, category) {
        faqs.filter { faq ->
            (category == "All" || faq.category == category) &&
                (query.isBlank() || faq.question.contains(query, ignoreCase = true) || faq.answer.contains(query, ignoreCase = true))
        }
    }
    val isDark = ColorTokens.isDark
    val haptic = LocalHapticFeedback.current

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background),
    ) {
        // Layer 1: Ambient Atmospheric Canvas Backdrop
        StaticPagesAtmosphericBackdrop(
            isDark = isDark,
            primaryColor = Color(0xFF0891B2),
            secondaryColor = Color(0xFF6366F1),
        )

        // Layer 3: 32dp Curved Content Sheet
        Column(modifier = Modifier.fillMaxSize()) {
            Spacer(modifier = Modifier.height(108.dp))

            Surface(
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                color = MaterialTheme.colorScheme.background,
                shadowElevation = 8.dp,
                modifier = Modifier.fillMaxSize(),
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    // Tactile Drag Handle
                    Box(
                        modifier = Modifier
                            .padding(top = 12.dp, bottom = 6.dp)
                            .width(44.dp)
                            .height(4.5.dp)
                            .clip(RoundedCornerShape(2.5.dp))
                            .background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.35f))
                            .align(Alignment.CenterHorizontally),
                    )

                    // Search bar
                    OutlinedTextField(
                        value = query,
                        onValueChange = { query = it },
                        placeholder = { Text(stringResource(R.string.faq_search_hint)) },
                        leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                        trailingIcon = if (query.isNotBlank()) {
                            {
                                IconButton(
                                    onClick = { query = "" },
                                    modifier = Modifier.semantics { contentDescription = "Clear search" },
                                ) {
                                    Icon(Icons.Filled.Close, contentDescription = null)
                                }
                            }
                        } else null,
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 6.dp),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    )

                    // Category filter chips
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp),
                        modifier = Modifier.padding(bottom = 6.dp),
                    ) {
                        items(categories, key = { it }) { cat ->
                            val selected = category == cat
                            FilterChip(
                                selected = selected,
                                onClick = {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    category = cat
                                },
                                label = { Text(cat, fontSize = 12.sp, fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = Color(0xFF0891B2),
                                    selectedLabelColor = Color.White,
                                ),
                                shape = RoundedCornerShape(20.dp),
                            )
                        }
                    }

                    if (filtered.isEmpty()) {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(24.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("🔍", fontSize = 48.sp)
                                Spacer(Modifier.height(12.dp))
                                Text(
                                    stringResource(R.string.faq_no_results),
                                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                                )
                                Spacer(Modifier.height(8.dp))
                                TextButton(onClick = { query = ""; category = "All" }) {
                                    Text("Reset Search")
                                }
                            }
                        }
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(bottom = 48.dp),
                        ) {
                            items(filtered, key = { it.question }) { faq ->
                                FaqRow(faq = faq, haptic = haptic)
                                HorizontalDivider(
                                    modifier = Modifier.padding(horizontal = 16.dp),
                                    color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f),
                                )
                            }
                        }
                    }
                }
            }
        }

        // Layer 2: Pinned Floating Glassmorphic Top Bar
        StaticPagesFloatingTopBar(
            title = stringResource(R.string.faq_title),
            badgeText = "🛡️ Help Center",
            isDark = isDark,
            onBack = onBack,
        )
    }
}

@Composable
private fun FaqRow(faq: FaqItem, haptic: HapticFeedback? = null) {
    var expanded by remember { mutableStateOf(false) }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClickLabel = if (expanded) "Collapse answer" else "Expand answer") {
                haptic?.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                expanded = !expanded
            }
            .padding(horizontal = 16.dp, vertical = 14.dp)
            .animateContentSize()
            .semantics {
                contentDescription = "${faq.question}. ${if (expanded) "Expanded" else "Collapsed"}."
            },
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                faq.question,
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                modifier = Modifier.weight(1f).padding(end = 8.dp),
            )
            Icon(
                if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
            )
        }
        if (expanded) {
            Spacer(Modifier.height(8.dp))
            Text(
                faq.answer,
                style = MaterialTheme.typography.bodyMedium.copy(
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 20.sp,
                ),
            )
        }
    }
}
