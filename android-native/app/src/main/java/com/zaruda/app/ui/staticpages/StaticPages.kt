package com.zaruda.app.ui.staticpages

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
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
                    "MHub — Your Local Marketplace",
                    style = MaterialTheme.typography.headlineSmall.copy(fontWeight = FontWeight.Bold),
                    modifier = Modifier.semantics { heading() },
                )
            }
            item {
                Text(
                    "MHub is India's fastest-growing hyper-local marketplace that connects buyers and sellers in your neighbourhood. From Electronics and Fashion to Grocery and Furniture — find everything you need, just around the corner.",
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
            item {
                AboutSection(
                    title = "Our Mission",
                    body = "To empower every Indian to buy and sell confidently and conveniently, fostering a trusted community marketplace where everyone wins.",
                )
            }
            item {
                AboutSection(
                    title = "Our Vision",
                    body = "A world where every neighbourhood has a thriving digital marketplace, reducing waste, supporting local sellers, and making commerce accessible.",
                )
            }
            item {
                AboutSection(
                    title = "Why Choose MHub?",
                    body = "✓ 100% verified sellers\n✓ Secure payments\n✓ Easy returns & refunds\n✓ Delivery within 48 hours\n✓ 6 Indian languages supported\n✓ Rewards & loyalty programme",
                )
            }
            item {
                AboutSection(
                    title = "Version",
                    body = "MHub App v1.1.0 · Made with ❤️ in India",
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
                ContactRow(icon = Icons.Filled.Email, label = "support@mhub.in")
                ContactRow(icon = Icons.Filled.Phone, label = "+91 1800-XXX-XXXX (Toll Free)")
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
    FaqItem("How do I place an order?", "Browse products, add to cart, and proceed to checkout. Fill in your address and payment details, then tap 'Place Order'.", "Orders"),
    FaqItem("What payment methods are accepted?", "We accept UPI, Credit/Debit Cards, Net Banking, and Cash on Delivery.", "Payments"),
    FaqItem("How do I track my order?", "Go to Profile → Order History and tap on any order to see its tracking timeline.", "Orders"),
    FaqItem("What is the return policy?", "Most products can be returned within 7 days of delivery. Go to Order History and tap 'Return' on the relevant order.", "Returns"),
    FaqItem("How do I cancel an order?", "Go to Profile → Order History, tap on the order, and select 'Cancel Order' (available within 1 hour of placing).", "Orders"),
    FaqItem("Is my data secure?", "Yes. We use end-to-end encryption, secure token storage, and CSRF protection. We never store raw card details.", "Security"),
    FaqItem("How does the Rewards programme work?", "Earn coins by shopping, referring friends, daily check-ins, and completing challenges. Redeem coins for discounts.", "Rewards"),
    FaqItem("How do I become a seller?", "Tap 'Sell' on the home screen, complete KYC, and start listing products. No subscription needed for the first 10 listings.", "Selling"),
    FaqItem("How do I verify my account (KYC)?", "Go to Profile → KYC Verification and upload your Aadhaar and PAN documents. Verification takes 24–48 hours.", "Account"),
    FaqItem("Can I use MHub in my language?", "Yes! MHub supports English, Hindi, Bengali, Kannada, Marathi, Tamil and Telugu. Change in Settings → Language.", "App"),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FAQScreen(onBack: () -> Unit) {
    var query by remember { mutableStateOf("") }
    val filtered = remember(query) {
        if (query.isBlank()) faqs
        else faqs.filter { it.question.contains(query, ignoreCase = true) || it.answer.contains(query, ignoreCase = true) }
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
