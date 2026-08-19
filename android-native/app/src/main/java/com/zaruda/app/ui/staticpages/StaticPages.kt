package com.zaruda.app.ui.staticpages

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Comment
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.res.stringResource
import com.zaruda.app.R

// ─────────────────────────────────────────────────────────────────────────────
// About Us
// ─────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AboutUsScreen(onBack: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.about_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack, modifier = Modifier.semantics { contentDescription = "Go back" }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        },
    ) { pad ->
        LazyColumn(
            modifier = Modifier.padding(pad).padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Spacer(Modifier.height(8.dp))
                Text(
                    stringResource(R.string.about_headline),
                    style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                    modifier = Modifier.semantics { heading() },
                )
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
                Spacer(Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun AboutSection(title: String, body: String) {
    Column {
        Text(title, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
        Spacer(Modifier.height(6.dp))
        Text(body, style = MaterialTheme.typography.bodyMedium)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contact Us
// ─────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContactUsScreen(onBack: () -> Unit) {
    var name by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var message by remember { mutableStateOf("") }
    var submitted by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.contact_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack, modifier = Modifier.semantics { contentDescription = "Go back" }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        },
    ) { pad ->
        LazyColumn(
            modifier = Modifier.padding(pad).padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                Spacer(Modifier.height(8.dp))
                Text(stringResource(R.string.contact_get_in_touch), style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold))
                Spacer(Modifier.height(4.dp))
                Text(stringResource(R.string.contact_subtitle), style = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurfaceVariant))
            }
            // Direct contact info
            item {
                ContactRow(icon = Icons.Filled.Email, label = "support@zaruda.app")
                ContactRow(icon = Icons.Filled.Comment, label = "In-app: More → Feedback / Complaints")
            }
            if (!submitted) {
                item {
                    HorizontalDivider()
                    Spacer(Modifier.height(4.dp))
                    Text(stringResource(R.string.contact_send_message), style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.Bold))
                }
                item {
                    OutlinedTextField(
                        value = name, onValueChange = { name = it },
                        label = { Text(stringResource(R.string.contact_your_name)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                }
                item {
                    OutlinedTextField(
                        value = email, onValueChange = { email = it },
                        label = { Text(stringResource(R.string.contact_email)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                }
                item {
                    OutlinedTextField(
                        value = message, onValueChange = { message = it },
                        label = { Text(stringResource(R.string.contact_message)) },
                        modifier = Modifier.fillMaxWidth().height(120.dp),
                        maxLines = 5,
                    )
                }
                item {
                    Button(
                        onClick = { if (name.isNotBlank() && email.isNotBlank() && message.isNotBlank()) submitted = true },
                        modifier = Modifier.fillMaxWidth().height(48.dp),
                    ) { Text(stringResource(R.string.contact_send)) }
                    Spacer(Modifier.height(24.dp))
                }
            } else {
                item {
                    Surface(
                        color = MaterialTheme.colorScheme.primaryContainer,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            stringResource(R.string.contact_success, email),
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.padding(16.dp),
                        )
                    }
                    Spacer(Modifier.height(24.dp))
                }
            }
        }
    }
}

@Composable
private fun ContactRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(20.dp), tint = MaterialTheme.colorScheme.primary)
        androidx.compose.foundation.layout.Spacer(Modifier.size(8.dp))
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
    FaqItem("Can I use Zaruda in my language?", "Yes. Zaruda supports English, Hindi, Telugu, Tamil, Kannada, Marathi, Bengali and Gujarati. Switch anytime from More → Appearance & Language.", "App"),
    FaqItem("How do I buy an item?", "Browse or search listings in Electronics, Fashion, Vehicles and Others. Open an item to view details, then contact the seller, express interest or send an offer, or buy safely in-app when the listing carries the escrow lock badge.", "Buying"),
    FaqItem("What is Escrow Protection?", "On escrow-eligible listings your payment is held securely and released to the seller only after you confirm you've received the item — protecting both sides. A 2.5% platform fee applies to escrow-protected purchases and is shown before you pay.", "Buying"),
    FaqItem("Where do I find my purchases?", "Open Profile → Orders → Order History, or the Bought Posts section, to see everything you've bought, track its status and raise any issues.", "Buying"),
    FaqItem("How do I start selling?", "Tap Sell from the home screen. You need an active plan (free or paid) and completed KYC (Aadhaar + PAN). Then add photos, a title and description, price and category, and publish your listing.", "Selling"),
    FaqItem("How do I mark a listing as sold?", "Open the listing and choose More → Sale Done. Need to extend or renew your listing? Use Repost from My Listings to bring it back active.", "Selling"),
    FaqItem("Why do I need KYC?", "KYC (Aadhaar + PAN) confirms that sellers are real people, which builds trust and keeps the marketplace safe. KYC verification is required to publish listings.", "Account"),
    FaqItem("How do I complete KYC?", "Go to More → Verification, verify your Aadhaar with an OTP, verify your PAN, and submit. An active plan is required to complete KYC. Most verifications are approved within 24–48 hours.", "Account"),
    FaqItem("What do the plans include?", "The Free plan includes 1 photo per post. Paid plans add more photos, better visibility, promoted listings, analytics, a profile badge and priority support.", "Plans"),
    FaqItem("How do refunds work?", "Refunds are handled through the order flow or via a complaint. Escrow funds are returned to you if the item is never delivered or isn't as described. See the Refund Policy for details.", "Plans"),
    FaqItem("How do Rewards and Coins work?", "Earn coins through daily check-ins, spins, engagement and referral milestones. Redeem them in the Rewards store for discounts and perks.", "Rewards"),
    FaqItem("How do I report a post or user?", "Open the post and tap Report, or block a user from their profile. Our safety team reviews every report.", "Safety"),
    FaqItem("What should I do if a deal goes wrong?", "File a complaint from More → Complaints with the order or listing details. Our team mediates between buyer and seller. In fraud cases, payments are held and accounts may be frozen until the case is reviewed.", "Safety"),
    FaqItem("How do I contact support?", "Email support@zaruda.app, or use More → Feedback for suggestions and More → Complaints for disputes. We respond within 24–48 hours on business days.", "Support"),
)

@OptIn(ExperimentalMaterial3Api::class)
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

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.faq_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack, modifier = Modifier.semantics { contentDescription = "Go back" }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        },
    ) { pad ->
        Column(modifier = Modifier.padding(pad)) {
            // Search bar
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                label = { Text(stringResource(R.string.faq_search_hint)) },
                leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                trailingIcon = if (query.isNotBlank()) {
                    {
                        IconButton(onClick = { query = "" }, modifier = Modifier.semantics { contentDescription = "Clear search" }) {
                            Icon(Icons.Filled.Close, contentDescription = null)
                        }
                    }
                } else null,
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
            )

            // Category filter chips
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(horizontal = 16.dp),
                modifier = Modifier.padding(bottom = 4.dp),
            ) {
                items(categories, key = { it }) { cat ->
                    FilterChip(
                        selected = category == cat,
                        onClick = { category = cat },
                        label = { Text(cat, fontSize = 12.sp) },
                        colors = FilterChipDefaults.filterChipColors(selectedContainerColor = MaterialTheme.colorScheme.primary, selectedLabelColor = MaterialTheme.colorScheme.onPrimary),
                        shape = RoundedCornerShape(20.dp),
                    )
                }
            }

            if (filtered.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("🔍", style = MaterialTheme.typography.displayMedium)
                        Spacer(Modifier.height(12.dp))
                        Text(stringResource(R.string.faq_no_results), style = MaterialTheme.typography.titleMedium)
                    }
                }
            } else {
                LazyColumn {
                    items(filtered, key = { it.question }) { faq ->
                        FaqRow(faq = faq)
                        HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp))
                    }
                    item { Spacer(Modifier.height(24.dp)) }
                }
            }
        }
    }
}

@Composable
private fun FaqRow(faq: FaqItem) {
    var expanded by remember { mutableStateOf(false) }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClickLabel = if (expanded) "Collapse answer" else "Expand answer") { expanded = !expanded }
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
            Text(faq.answer, style = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurfaceVariant))
        }
    }
}
