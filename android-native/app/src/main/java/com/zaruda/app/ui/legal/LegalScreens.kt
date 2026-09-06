package com.zaruda.app.ui.legal

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.ImeAction
import android.content.Intent
import android.net.Uri
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.*
import com.zaruda.app.data.repository.*
import com.zaruda.app.ui.theme.ColorTokens
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

private fun bgGradient(isDark: Boolean): Brush {
    return if (isDark) Brush.verticalGradient(listOf(Color(0xFF0F172A), Color(0xFF1E293B), Color(0xFF1E3A5F)))
    else Brush.verticalGradient(listOf(Color(0xFFF0F9FF), Color(0xFFEFF6FF), Color(0xFFE0E7FF)))
}

@Composable
private fun LegalTopBar(title: String, onBack: () -> Unit) {
    val isDark = ColorTokens.isDark
    Row(
        Modifier.fillMaxWidth()
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = if (isDark) Color(0xFF93C5FD) else Color(0xFF2563EB)) }
        Spacer(Modifier.width(8.dp))
        Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = if (isDark) Color(0xFFF1F5F9) else Color(0xFF1E293B))
    }
}

// ─── Shared CMS ViewModel & State ─────────────────────────────────────────────
data class CmsUiState(val loading: Boolean = true, val content: String? = null, val error: String? = null)

private suspend fun loadCms(fn: suspend () -> ApiResult<CmsContentResponse>, onResult: (CmsUiState) -> Unit) {
    when (val r = fn()) {
        is ApiResult.Success -> onResult(CmsUiState(loading = false, content = r.data.displayContent))
        is ApiResult.Failure -> onResult(CmsUiState(loading = false, error = r.error.message))
    }
}

@HiltViewModel
class TermsViewModel @Inject constructor(private val repo: CmsRepository) : ViewModel() {
    private val _state = MutableStateFlow(CmsUiState())
    val state: StateFlow<CmsUiState> = _state.asStateFlow()
    init { viewModelScope.launch { loadCms(repo::terms) { _state.value = it } } }
}

@HiltViewModel
class PrivacyViewModel @Inject constructor(private val repo: CmsRepository) : ViewModel() {
    private val _state = MutableStateFlow(CmsUiState())
    val state: StateFlow<CmsUiState> = _state.asStateFlow()
    init { viewModelScope.launch { loadCms(repo::privacy) { _state.value = it } } }
}

@HiltViewModel
class RefundViewModel @Inject constructor(private val repo: CmsRepository) : ViewModel() {
    private val _state = MutableStateFlow(CmsUiState())
    val state: StateFlow<CmsUiState> = _state.asStateFlow()
    init { viewModelScope.launch { loadCms(repo::refund) { _state.value = it } } }
}

@Composable
private fun CmsScreen(title: String, icon: ImageVector, state: CmsUiState, onBack: () -> Unit, fallbackContent: String? = null) {
    val isDark = ColorTokens.isDark
    val bodyText = state.content?.takeIf { it.isNotBlank() } ?: fallbackContent
    
    Box(modifier = Modifier.fillMaxSize().background(ColorTokens.Background)) {
        // Layer 1: Contextual Hero Backdrop
        Box(
            modifier = Modifier.fillMaxWidth().height(200.dp)
                .background(bgGradient(isDark))
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(80.dp)
                    .offset(y = (-20).dp),
                tint = Color.White.copy(alpha = 0.2f)
            )
        }

        // Layer 2: Top Floating Bar
        LegalTopBar(title, onBack)

        // Layer 3: 32dp Curved Sheet
        Surface(
            shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
            color = ColorTokens.Surface,
            modifier = Modifier.fillMaxSize().padding(top = 160.dp)
        ) {
            Column(Modifier.fillMaxSize()) {
                // Tactile Drag Handle
                Box(modifier = Modifier.fillMaxWidth().padding(top = 12.dp, bottom = 8.dp), contentAlignment = Alignment.Center) {
                    Box(modifier = Modifier.width(40.dp).height(4.dp).clip(CircleShape).background(Color.Gray.copy(alpha = 0.3f)))
                }

                when {
                    state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
                    bodyText != null -> {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(start = 24.dp, end = 24.dp, top = 8.dp, bottom = 32.dp),
                            verticalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            item {
                                Text(
                                    title,
                                    fontWeight = FontWeight.Black,
                                    fontSize = 24.sp,
                                    color = ColorTokens.OnBackground
                                )
                                Spacer(Modifier.height(16.dp))
                                Text(
                                    bodyText,
                                    fontSize = 15.sp,
                                    color = ColorTokens.OnSurfaceVariant,
                                    lineHeight = 26.sp, // Typography improvements
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Start
                                )
                            }
                        }
                    }
                    else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(state.error ?: "Content unavailable", color = ColorTokens.OnSurfaceVariant)
                    }
                }
            }
        }
    }
}

@Composable
fun TermsScreen(onBack: () -> Unit, viewModel: TermsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    CmsScreen("Terms & Conditions", Icons.Filled.Gavel, state, onBack,
        fallbackContent = """
Terms & Conditions

1. Acceptance of Terms
By accessing or using this platform, you agree to be bound by these Terms & Conditions. If you do not agree, please do not use the Platform.

2. Description of Service
The platform is a marketplace platform that connects buyers and sellers for local commerce. We facilitate listings, messaging, and transaction coordination.

3. User Accounts
You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your login credentials.

4. Listings & Sales
Sellers are responsible for the accuracy of their listings. The platform is not a party to any sale transaction and acts solely as a facilitator.

5. Prohibited Activities
Users may not list prohibited items, engage in fraud, or misuse the platform in any way as determined by the platform's discretion.

6. Limitation of Liability
The platform is not liable for any damages arising from the use of the Platform, including but not limited to failed transactions, misrepresented items, or disputes between users.

7. Modifications
The platform reserves the right to modify these terms at any time. Users will be notified of material changes.

For complete terms, please visit our website or contact support through the app.
        """.trimIndent()
    )
}

@Composable
fun PrivacyScreen(onBack: () -> Unit, viewModel: PrivacyViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    CmsScreen("Privacy Policy", Icons.Filled.PrivacyTip, state, onBack,
        fallbackContent = """
Privacy Policy

1. Information We Collect
We collect information you provide during registration (name, email, phone number, location) and usage data (listings, messages, transactions).

2. How We Use Your Information
Your information is used to operate and improve the Platform, process transactions, send notifications, and personalize your experience.

3. Data Sharing
We do not sell your personal information. We may share data with service providers who help operate the Platform (e.g., cloud hosting, analytics), subject to strict confidentiality agreements.

4. Data Security
We implement reasonable security measures to protect your data. However, no method of transmission over the Internet is 100% secure.

5. Your Rights
You can access, update, or delete your account data at any time through your profile settings.

6. Contact
For privacy-related inquiries, please contact us through the Feedback section in the app.

This policy was last updated on August 1, 2026.
        """.trimIndent()
    )
}

@Composable
fun RefundScreen(onBack: () -> Unit, viewModel: RefundViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    CmsScreen("Refund Policy", Icons.Filled.CurrencyRupee, state, onBack,
        fallbackContent = """
Refund Policy

1. Marketplace Facilitator
The platform is a marketplace facilitator and does not directly handle payments or refunds. All transactions occur directly between buyers and sellers.

2. Dispute Resolution
If an item is not as described or a transaction fails, buyers should first contact the seller directly via the in-app chat.

3. Mediation
If the buyer and seller cannot resolve the dispute, The platform offers mediation through the Complaints section. Our team will review the case and facilitate a fair resolution.

4. In-App Payments
For transactions processed through the platform's in-app payment system, the payment is held securely until both parties confirm satisfaction.

5. Chargebacks
Buyers who initiate chargebacks without first attempting to resolve the dispute through the platform may have their account restricted.

For assistance, please file a complaint through the app's Complaints section.
        """.trimIndent()
    )
}

// ─── Help & Support ──────────────────────────────────────────────────────────
private data class HelpFaq(val question: String, val answer: String, val category: String)

private val helpFaqs: List<HelpFaq> = listOf(
    HelpFaq("How do I create an account?", "Tap Sign Up on the login screen and register with your email or mobile number, then verify the one-time password (OTP) sent to you. You can browse and buy right away; to sell you'll also need an active plan and KYC verification.", "Account"),
    HelpFaq("I forgot my password. How do I reset it?", "On the login screen tap Forgot Password, enter your registered email or phone number, and follow the instructions sent to you to set a new password.", "Account"),
    HelpFaq("How do I secure my account?", "Open Profile → Security to set a strong password and enable two-factor authentication (2FA). With 2FA on, you'll need a one-time code when logging in from a new device.", "Account"),
    HelpFaq("Can I use the app in my language?", "Yes. The app supports English, Hindi, Telugu, Tamil, Kannada, Marathi, Bengali and Gujarati. Switch anytime from More → Appearance & Language.", "Account"),

    HelpFaq("How do I buy an item?", "Browse or search listings in Electronics, Fashion, Vehicles and Others. Open an item to view details, then contact the seller, express interest or send an offer, or buy in-app when the listing offers that option.", "Buying"),
    HelpFaq("What is the Interest / Offer option?", "It tells the seller that you want to buy. You can send an offer amount with a short message; the seller can accept or decline it. Once accepted, you'll be guided to complete the purchase.", "Buying"),
    HelpFaq("What is the In-App Buy option?", "On Electronics listings that offer it, your payment is held securely and released to the seller only after you confirm you've received the item. It protects both sides and is the recommended way to buy electronics.", "Buying"),
    HelpFaq("When can I see a seller's contact number?", "A seller's number is revealed when the seller is KYC-verified with an active plan and you are verified too. Otherwise, connect with the seller through the app.", "Buying"),
    HelpFaq("Where do I find my purchases?", "Open Profile → Orders → Order History, or the Bought Posts section, to see everything you've bought, track its status and raise any issues.", "Buying"),
    HelpFaq("What are Wishlist, Compare and Saved Searches?", "Tap the heart on a listing to save it to Wishlist. Compare lets you view similar listings side by side, and Saved Searches notifies you when new listings match your filters.", "Buying"),

    HelpFaq("How do I start selling?", "Tap Sell from the home screen. You need an active plan (free or paid) and completed KYC (Aadhaar + PAN). Then add photos, a title and description, price and category, and publish your listing.", "Selling"),
    HelpFaq("What do the plans include?", "The Free plan includes 1 photo per post. Paid plans add more photos, better visibility, promoted listings, analytics, a profile badge and priority support.", "Selling"),
    HelpFaq("How do I mark a listing as sold?", "Open the listing and choose More → Sale Done. Made a mistake? Use Repost to bring the listing back.", "Selling"),
    HelpFaq("How do I get paid for an in-app sale?", "Once the buyer confirms receipt, in-app payments are released to your payout account. Add your UPI or bank details under Profile → Payout Account.", "Selling"),
    HelpFaq("How do I track how my listings are doing?", "Open Profile → Seller Analytics to see views, likes and engagement for your posts. Analytics access is included with paid plans.", "Selling"),

    HelpFaq("Why do I need KYC?", "KYC (Aadhaar + PAN) confirms that sellers are real people, which builds trust and keeps the marketplace safe. KYC verification is required to publish listings.", "KYC & Verification"),
    HelpFaq("How do I complete KYC?", "Go to More → Verification, verify your Aadhaar with an OTP, verify your PAN, and submit. An active plan is required to complete KYC.", "KYC & Verification"),
    HelpFaq("How long does KYC take?", "Most verifications are approved within 24–48 hours. You'll get a notification when your status changes to verified.", "KYC & Verification"),

    HelpFaq("What payment methods are accepted?", "In-app purchases are processed through a secure gateway using UPI, cards and net banking. Direct deals are arranged between the buyer and seller.", "Plans & Payments"),
    HelpFaq("Can I cancel a paid plan?", "Yes. Open the Plans page and cancel anytime; you keep your benefits until the end of the current billing period.", "Plans & Payments"),
    HelpFaq("How do refunds work?", "Refunds are handled through the order flow or via a complaint. In-app payments are returned to you if the item is never delivered or isn't as described. See the Refund Policy for details.", "Plans & Payments"),

    HelpFaq("What are the Public Wall and Feed?", "They are community spaces for discussions, local updates and posts. You can follow channels, write reviews and interact with other members.", "Community & Rewards"),
    HelpFaq("How do Rewards and Coins work?", "Earn coins through daily check-ins, spins, engagement and referral milestones. Redeem them in the Rewards store for discounts and perks.", "Community & Rewards"),
    HelpFaq("How do referrals work?", "Share your invite link from the Rewards page. When friends join, you earn bonus coins through referral milestones and can climb the referral leaderboard.", "Community & Rewards"),

    HelpFaq("How do I report a post or user?", "Open the post and tap Report, or block a user from their profile. Our safety team reviews every report.", "Safety & Disputes"),
    HelpFaq("What should I do if a deal goes wrong?", "File a complaint from More → Complaints with the order or listing details. Our team mediates between buyer and seller. In fraud cases, payments are held and accounts may be frozen until the case is reviewed.", "Safety & Disputes"),
    HelpFaq("How is my data protected?", "Your data is encrypted in transit and at rest, tokens are stored securely, and we never sell your personal information. See the Privacy Policy for details.", "Safety & Disputes"),

    HelpFaq("I'm not receiving notifications. What should I do?", "Check that notifications are enabled for the app in your phone's Settings and that in-app notification preferences are on, then restart the app.", "App & Technical"),
    HelpFaq("Can I use the app offline?", "Yes — core browsing works with cached content, and actions such as saving to your wishlist are queued and synced automatically when you're back online.", "App & Technical"),
    HelpFaq("How do I contact support?", "Use More → Feedback for suggestions and More → Complaints for disputes.", "App & Technical"),
)

private val helpCategories = listOf(
    "All", "Account", "Buying", "Selling", "KYC & Verification", "Plans & Payments",
    "Community & Rewards", "Safety & Disputes", "App & Technical",
)

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
// ──────────────────────────────────────────────────────────────────────────
// Help & Support ViewModel — loads the user's real complaint tickets
// ──────────────────────────────────────────────────────────────────────────

@HiltViewModel
class HelpSupportViewModel @Inject constructor(
    private val repo: UserSocialRepository,
    private val tokenStore: com.zaruda.app.data.local.TokenStore,
) : ViewModel() {
    private val _tickets = MutableStateFlow<List<ComplaintRecord>?>(null)
    val tickets: StateFlow<List<ComplaintRecord>?> = _tickets.asStateFlow()

    private val _ticketsLoading = MutableStateFlow(false)
    val ticketsLoading: StateFlow<Boolean> = _ticketsLoading.asStateFlow()

    init { refresh() }

    fun refresh() {
        if (tokenStore.accessToken.value == null) {
            _tickets.value = null
            return
        }
        viewModelScope.launch {
            _ticketsLoading.value = true
            _tickets.value = when (val r = repo.myComplaints()) {
                is ApiResult.Success -> r.data.complaints
                is ApiResult.Failure -> emptyList()
            }
            _ticketsLoading.value = false
        }
    }
}

@Composable
fun HelpSupportScreen(
    onBack: () -> Unit,
    onOpenFeedback: () -> Unit = {},
    onOpenComplaints: () -> Unit = {},
    viewModel: HelpSupportViewModel = hiltViewModel(),
) {
    val isDark = ColorTokens.isDark
    val context = LocalContext.current
    var query by rememberSaveable { mutableStateOf("") }
    var category by rememberSaveable { mutableStateOf("All") }
    val tickets by viewModel.tickets.collectAsState()
    val ticketsLoading by viewModel.ticketsLoading.collectAsState()

    val filtered = remember(query, category) {
        helpFaqs.filter { faq ->
            (category == "All" || faq.category == category) &&
                (query.isBlank() || faq.question.contains(query, ignoreCase = true) || faq.answer.contains(query, ignoreCase = true))
        }
    }

    Scaffold(
        floatingActionButton = {
            FloatingActionButton(
                onClick = onOpenFeedback,
                containerColor = ColorTokens.Primary,
                contentColor = Color.White
            ) {
                Icon(Icons.Filled.Chat, contentDescription = "Chat Support")
            }
        },
        containerColor = ColorTokens.Background
    ) { scaffoldPadding ->
        Box(modifier = Modifier.fillMaxSize().padding(scaffoldPadding)) {
            // Layer 1: Backdrop
            Box(
                modifier = Modifier.fillMaxWidth().height(200.dp)
                    .background(bgGradient(isDark))
            ) {
                Icon(
                    imageVector = Icons.Filled.SupportAgent,
                    contentDescription = null,
                    modifier = Modifier
                        .align(Alignment.Center)
                        .size(80.dp)
                        .offset(y = (-20).dp),
                    tint = Color.White.copy(alpha = 0.2f)
                )
            }
            
            // Layer 2: Floating Top Bar
            LegalTopBar("Help & Support", onBack)
            
            // Layer 3: Curved Sheet
            Surface(
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                color = ColorTokens.Surface,
                modifier = Modifier.fillMaxSize().padding(top = 160.dp)
            ) {
                Column(Modifier.fillMaxSize()) {
                    Box(modifier = Modifier.fillMaxWidth().padding(top = 12.dp, bottom = 8.dp), contentAlignment = Alignment.Center) {
                        Box(modifier = Modifier.width(40.dp).height(4.dp).clip(CircleShape).background(Color.Gray.copy(alpha = 0.3f)))
                    }

                    Column(
                        Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, bottom = 100.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        // Ticket Tracker Section — real complaints from GET /complaints/my
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = ColorTokens.SurfaceVariant.copy(alpha = 0.5f),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Column(Modifier.padding(18.dp)) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text("Your Open Tickets", fontWeight = FontWeight.Bold, fontSize = 16.sp, color = ColorTokens.OnSurface, modifier = Modifier.weight(1f))
                                    TextButton(onClick = onOpenComplaints, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 0.dp)) {
                                        Text("View all", fontSize = 12.sp)
                                    }
                                    IconButton(onClick = { viewModel.refresh() }, enabled = !ticketsLoading) {
                                        if (ticketsLoading) {
                                            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                                        } else {
                                            Icon(Icons.Filled.Refresh, contentDescription = "Refresh tickets", tint = ColorTokens.OnSurfaceVariant, modifier = Modifier.size(18.dp))
                                        }
                                    }
                                }
                                Spacer(Modifier.height(8.dp))
                                when {
                                    tickets == null -> {
                                        Text(
                                            "Sign in to see your complaint tickets and their live status.",
                                            fontSize = 12.sp, color = ColorTokens.OnSurfaceVariant,
                                        )
                                    }
                                    tickets!!.isEmpty() -> {
                                        Text(
                                            "No open tickets — if anything goes wrong with a deal, raise a complaint from the transaction screen.",
                                            fontSize = 12.sp, color = ColorTokens.OnSurfaceVariant,
                                        )
                                    }
                                    else -> {
                                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                            tickets!!.take(3).forEach { ticket ->
                                                Row(
                                                    verticalAlignment = Alignment.CenterVertically,
                                                    modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(8.dp)).background(ColorTokens.Background).padding(12.dp)
                                                ) {
                                                    Icon(Icons.Filled.ReportProblem, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(20.dp))
                                                    Spacer(Modifier.width(12.dp))
                                                    Column(modifier = Modifier.weight(1f)) {
                                                        Text(ticket.subject ?: "Support ticket", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                                        Text(
                                            listOfNotNull(
                                                ticket.status?.replaceFirstChar { it.uppercase() },
                                                ticket.referenceId?.let { "Ref: $it" },
                                            ).joinToString(" • ").ifEmpty { "In review" },
                                            fontSize = 11.sp, color = ColorTokens.OnSurfaceVariant,
                                                        )
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                // Header card with contact channels
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = if (isDark) Color(0xFF1E293B) else Color.White,
                    shadowElevation = if (isDark) 0.dp else 2.dp,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(Modifier.padding(18.dp)) {
                        Text("How can we help you?", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = if (isDark) Color(0xFFF1F5F9) else Color(0xFF1E293B))
                        Spacer(Modifier.height(4.dp))
                        Text("Guides, answers and direct support for everything on the platform.", fontSize = 13.sp, color = if (isDark) Color(0xFF94A3B8) else Color(0xFF64748B))
                        Spacer(Modifier.height(12.dp))
                        HelpContactRow(Icons.Filled.Comment, "In-app Feedback — raise suggestions & rate features", onClick = onOpenFeedback)
                        HelpContactRow(Icons.Filled.Report, "Complaints & disputes — track and raise tickets", onClick = onOpenComplaints)
                    }
                }

                // Search
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    placeholder = { Text("Search help articles…", fontSize = 13.sp, color = if (isDark) Color(0xFF94A3B8) else Color(0xFF64748B)) },
                    leadingIcon = { Icon(Icons.Filled.Search, null, tint = if (isDark) Color(0xFF93C5FD) else Color(0xFF2563EB)) },
                    trailingIcon = if (query.isNotBlank()) {
                        {
                            IconButton(onClick = { query = "" }) { Icon(Icons.Filled.Close, contentDescription = "Clear search") }
                        }
                    } else null,
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = if (isDark) Color(0xFF3B82F6) else Color(0xFF2563EB),
                        unfocusedBorderColor = if (isDark) Color(0xFF334155) else Color(0xFFE2E8F0),
                        focusedContainerColor = if (isDark) Color(0xFF1E293B) else Color.White,
                        unfocusedContainerColor = if (isDark) Color(0xFF1E293B) else Color.White,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                )

                // Category chips
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(helpCategories) { cat ->
                        FilterChip(
                            selected = category == cat,
                            onClick = { category = cat },
                            label = { Text(cat, fontSize = 12.sp) },
                            colors = FilterChipDefaults.filterChipColors(selectedContainerColor = Color(0xFF2563EB), selectedLabelColor = Color.White),
                            shape = RoundedCornerShape(20.dp),
                        )
                    }
                }

                if (filtered.isEmpty()) {
                    Surface(shape = RoundedCornerShape(16.dp), color = if (isDark) Color(0xFF1E293B) else Color.White, modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.fillMaxWidth().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text("🔍", fontSize = 28.sp)
                            Spacer(Modifier.height(8.dp))
                            Text("No articles match your search.", fontSize = 14.sp, color = if (isDark) Color(0xFF94A3B8) else Color(0xFF64748B))
                            Spacer(Modifier.height(4.dp))
                            Text("Try a different keyword, or submit a request via More → Feedback.", fontSize = 12.sp, color = if (isDark) Color(0xFF64748B) else Color(0xFF94A3B8))
                        }
                    }
                } else {
                    filtered.forEach { faq -> HelpFaqRow(faq, isDark) }
                }

                // Support promise
                Surface(shape = RoundedCornerShape(16.dp), color = if (isDark) Color(0xFF1E293B) else Color.White, shadowElevation = if (isDark) 0.dp else 2.dp, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Our support promise", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = if (isDark) Color(0xFFF1F5F9) else Color(0xFF1E293B))
                        HelpBullet("We respond to every in-app inquiry within 24–48 hours on business days.", isDark)
                        HelpBullet("We help with accounts, listings, orders, payments, KYC and disputes.", isDark)
                        HelpBullet("Safety and fraud issues are prioritised and handled by a senior team member.", isDark)
                        HelpBullet("Grievances acknowledged within 48h and resolved within 30 days by Wyntech Labs per Consumer Protection Rules 2020.", isDark)
                    }
                }

                // Still need help
                Surface(shape = RoundedCornerShape(16.dp), color = if (isDark) Color(0xFF1E3A5F) else Color(0xFFEFF6FF), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Still need help?", fontWeight = FontWeight.Bold, fontSize = 15.sp, color = if (isDark) Color(0xFFF1F5F9) else Color(0xFF1E293B))
                        Text("Reach us any time using the Feedback and Complaints forms inside the app. For urgent safety concerns, mention “Urgent” in your message so we can prioritise it.", fontSize = 13.sp, lineHeight = 20.sp, color = if (isDark) Color(0xFFCBD5E1) else Color(0xFF374151))
                    }
                }
                Spacer(Modifier.height(8.dp))
            }
            } // close inner column
            } // close surface
        }
    }
}

@Composable
private fun HelpContactRow(icon: ImageVector, label: String, onClick: (() -> Unit)? = null) {
    val isDark = ColorTokens.isDark
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(30.dp).clip(RoundedCornerShape(8.dp)).background(if (isDark) Color(0xFF2563EB).copy(alpha = 0.25f) else Color(0xFF2563EB).copy(alpha = 0.1f)), contentAlignment = Alignment.Center) {
            Icon(icon, null, tint = if (isDark) Color(0xFF93C5FD) else Color(0xFF2563EB), modifier = Modifier.size(16.dp))
        }
        Spacer(Modifier.width(10.dp))
        Text(label, fontSize = 13.sp, color = if (isDark) Color(0xFFCBD5E1) else Color(0xFF475569))
    }
}

@Composable
private fun HelpFaqRow(faq: HelpFaq, isDark: Boolean) {
    var expanded by remember { mutableStateOf(false) }
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = if (isDark) Color(0xFF1E293B) else Color.White,
        shadowElevation = if (isDark) 0.dp else 1.dp,
        modifier = Modifier.fillMaxWidth().clickable { expanded = !expanded },
    ) {
        Column(Modifier.padding(horizontal = 16.dp, vertical = 14.dp).animateContentSize()) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(faq.question, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = if (isDark) Color(0xFFF1F5F9) else Color(0xFF1E293B), modifier = Modifier.weight(1f).padding(end = 8.dp))
                Icon(if (expanded) Icons.Filled.ExpandLess else Icons.Filled.ExpandMore, null, tint = if (isDark) Color(0xFF93C5FD) else Color(0xFF2563EB), modifier = Modifier.size(20.dp))
            }
            if (expanded) {
                Spacer(Modifier.height(8.dp))
                Text(faq.answer, fontSize = 13.sp, lineHeight = 20.sp, color = if (isDark) Color(0xFFCBD5E1) else Color(0xFF475569))
            }
        }
    }
}

@Composable
private fun HelpBullet(text: String, isDark: Boolean) {
    Row(verticalAlignment = Alignment.Top) {
        Text("•  ", fontSize = 13.sp, color = if (isDark) Color(0xFF93C5FD) else Color(0xFF2563EB))
        Text(text, fontSize = 13.sp, lineHeight = 19.sp, color = if (isDark) Color(0xFFCBD5E1) else Color(0xFF475569), modifier = Modifier.weight(1f))
    }
}

@Composable
fun ShippingPolicyScreen(onBack: () -> Unit) {
    CmsScreen(
        title = "Shipping Policy",
        icon = Icons.Filled.LocalShipping,
        state = CmsUiState(
            loading = false,
            content = """
Shipping Policy

1. Shipping Responsibility
Shipping is the responsibility of the seller. The platform acts as a marketplace facilitator and does not directly handle shipping or logistics.

2. Delivery Timelines
Estimated delivery timelines are provided by sellers. The platform is not responsible for delays caused by sellers or logistics partners.

3. Shipping Costs
Shipping costs, if any, are set by the seller and displayed on the listing page before purchase.

4. Tracking
Where available, sellers will provide tracking information after dispatch. Buyers can track their orders from the "Bought Posts" section.

5. Damaged / Lost Shipments
If a shipment arrives damaged or is lost in transit, buyers should report the issue within 48 hours via the Complaints section. The platform will mediate between buyer and seller.

6. Local Pickup
Many transactions on the platform support local pickup. Buyers and sellers can coordinate pickup details via the in-app chat.

7. Return Shipping
Return shipping costs are borne by the buyer unless the item was misrepresented or defective. See our Refund Policy for details.

For questions about shipping, please contact us through the app's Feedback section.
            """.trimIndent(),
        ),
        onBack = onBack,
    )
}

// ─── AdminPanelScreen ─────────────────────────────────────────────────────────
data class AdminUiState(
    val loading: Boolean = true,
    val stats: AdminStats = AdminStats(),
    val flaggedUsers: List<AdminFlaggedUser> = emptyList(),
    val flaggedPosts: List<AdminFlaggedPost> = emptyList(),
    val recentActivity: List<AdminActivity> = emptyList(),
    val error: String? = null,
    val tab: String = "users",
    val search: String = "",    val hasAdminAccess: Boolean = false,
    val selectedUsers: Set<String> = emptySet(),
    val selectedPosts: Set<String> = emptySet(),
    val undoAction: UndoAction? = null,
    val showWarningDialog: String? = null,
    val warningMessage: String = "",
    val flagCategory: String = "all"
)

data class UndoAction(
    val type: String,
    val targetId: String,
    val previousStatus: String,
    val timestamp: Long = System.currentTimeMillis())

@HiltViewModel
class AdminViewModel @Inject constructor(private val repo: AdminRepository, private val authRepo: com.zaruda.app.data.repository.AuthRepository) : ViewModel() {
    private val _state = MutableStateFlow(AdminUiState())
    val state: StateFlow<AdminUiState> = _state.asStateFlow()
    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()
    init { load() }
    fun load() { viewModelScope.launch {
        // Check admin access via user role from AuthRepository
        val hasAccess = when (val me = authRepo.me()) {
            is ApiResult.Success -> me.data.role == "admin" || me.data.role == "super_admin"
            is ApiResult.Failure -> false
        }
        if (!hasAccess) {
            _state.value = AdminUiState(loading = false, hasAdminAccess = false, error = "Access Denied")
            return@launch
        }
        when (val r = repo.dashboard()) {
            is ApiResult.Success -> _state.value = AdminUiState(loading = false, stats = r.data.stats, flaggedUsers = r.data.flaggedUsers, flaggedPosts = r.data.flaggedPosts, recentActivity = r.data.recentActivity, hasAdminAccess = true)
            is ApiResult.Failure -> _state.value = AdminUiState(loading = false, error = r.error.message, hasAdminAccess = true)
        }
    } }
    fun refresh() { viewModelScope.launch { _refreshing.value = true; load(); _refreshing.value = false } }
    fun setTab(t: String) { _state.value = _state.value.copy(tab = t) }
    fun setSearch(v: String) { _state.value = _state.value.copy(search = v) }
    fun setFlagCategory(c: String) { _state.value = _state.value.copy(flagCategory = c) }
    fun toggleUserSelection(id: String) {
        val current = _state.value.selectedUsers
        _state.value = _state.value.copy(selectedUsers = if (current.contains(id)) current - id else current + id)
    }
    fun togglePostSelection(id: String) {
        val current = _state.value.selectedPosts
        _state.value = _state.value.copy(selectedPosts = if (current.contains(id)) current - id else current + id)
    }
    fun selectAllUsers() {
        val allIds = _state.value.flaggedUsers.mapNotNull { it.id }.toSet()
        _state.value = _state.value.copy(selectedUsers = allIds)
    }
    fun clearUserSelection() { _state.value = _state.value.copy(selectedUsers = emptySet()) }
    fun selectAllPosts() {
        val allIds = _state.value.flaggedPosts.mapNotNull { it.id }.toSet()
        _state.value = _state.value.copy(selectedPosts = allIds)
    }
    fun clearPostSelection() { _state.value = _state.value.copy(selectedPosts = emptySet()) }
    fun approveUser(id: String) { 
        val user = _state.value.flaggedUsers.find { it.id == id }
        val prevStatus = user?.status ?: "flagged"
        _state.value = _state.value.copy(
            flaggedUsers = _state.value.flaggedUsers.map { if ((it.id ?: "") == id) it.copy(status = "approved") else it },
            undoAction = UndoAction("approve_user", id, prevStatus)
        )
    }
    fun rejectUser(id: String) { 
        val user = _state.value.flaggedUsers.find { it.id == id }
        val prevStatus = user?.status ?: "flagged"
        _state.value = _state.value.copy(
            flaggedUsers = _state.value.flaggedUsers.map { if ((it.id ?: "") == id) it.copy(status = "rejected") else it },
            undoAction = UndoAction("reject_user", id, prevStatus)
        )
    }
    fun banUser(id: String) { 
        val user = _state.value.flaggedUsers.find { it.id == id }
        val prevStatus = user?.status ?: "flagged"
        _state.value = _state.value.copy(
            flaggedUsers = _state.value.flaggedUsers.map { if ((it.id ?: "") == id) it.copy(status = "banned") else it },
            undoAction = UndoAction("ban_user", id, prevStatus)
        )
    }
    fun approvePost(id: String) { 
        val post = _state.value.flaggedPosts.find { it.id == id }
        val prevStatus = post?.status ?: "flagged"
        _state.value = _state.value.copy(
            flaggedPosts = _state.value.flaggedPosts.map { if ((it.id ?: "") == id) it.copy(status = "approved") else it },
            undoAction = UndoAction("approve_post", id, prevStatus)
        )
    }
    fun removePost(id: String) { 
        val post = _state.value.flaggedPosts.find { it.id == id }
        _state.value = _state.value.copy(
            flaggedPosts = _state.value.flaggedPosts.filter { (it.id ?: "") != id },
            undoAction = UndoAction("remove_post", id, post?.status ?: "flagged")
        )
    }
    fun bulkBanUsers() {
        val ids = _state.value.selectedUsers
        _state.value = _state.value.copy(
            flaggedUsers = _state.value.flaggedUsers.map { if (ids.contains(it.id)) it.copy(status = "banned") else it },
            selectedUsers = emptySet()
        )
    }
    fun bulkRemovePosts() {
        val ids = _state.value.selectedPosts
        _state.value = _state.value.copy(
            flaggedPosts = _state.value.flaggedPosts.filter { !ids.contains(it.id) },
            selectedPosts = emptySet()
        )
    }
    fun undo() {
        val undo = _state.value.undoAction ?: return
        when (undo.type) {
            "approve_user", "reject_user", "ban_user" -> {
                _state.value = _state.value.copy(
                    flaggedUsers = _state.value.flaggedUsers.map { if (it.id == undo.targetId) it.copy(status = undo.previousStatus) else it },
                    undoAction = null
                )
            }
            "approve_post" -> {
                _state.value = _state.value.copy(
                    flaggedPosts = _state.value.flaggedPosts.map { if (it.id == undo.targetId) it.copy(status = undo.previousStatus) else it },
                    undoAction = null
                )
            }
            "remove_post" -> {
                // Can't undo removal easily - would need to store removed post
                _state.value = _state.value.copy(undoAction = null)
            }
        }
    }
    fun clearUndo() { _state.value = _state.value.copy(undoAction = null) }
    fun showWarningDialog(userId: String) { _state.value = _state.value.copy(showWarningDialog = userId) }
    fun hideWarningDialog() { _state.value = _state.value.copy(showWarningDialog = null, warningMessage = "") }
    fun setWarningMessage(msg: String) { _state.value = _state.value.copy(warningMessage = msg) }
    fun sendWarning() {
        val userId = _state.value.showWarningDialog ?: return
        val message = _state.value.warningMessage
        viewModelScope.launch {
            repo.sendWarning(userId, message)
            _state.value = _state.value.copy(showWarningDialog = null, warningMessage = "")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminPanelScreen(onBack: () -> Unit, viewModel: AdminViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    val refreshing by viewModel.refreshing.collectAsState()
    val tabs = listOf("users" to "Users", "posts" to "Posts", "flags" to "Flags", "activity" to "Activity")
    val snackbarHostState = remember { SnackbarHostState() }
    
    // Auto-dismiss undo after 12 seconds
    LaunchedEffect(state.undoAction) {
        state.undoAction?.let { undo ->
            val result = snackbarHostState.showSnackbar(
                message = "Action performed",
                actionLabel = "Undo",
                duration = SnackbarDuration.Long
            )
            if (result == SnackbarResult.ActionPerformed) {
                viewModel.undo()
            } else {
                kotlinx.coroutines.delay(500)
                viewModel.clearUndo()
            }
        }
    }
    
    // Confirmation dialog state
    var confirmAction by remember { mutableStateOf<Triple<String, String, () -> Unit>?>(null) }
    confirmAction?.let { (title, message, action) ->
        AlertDialog(
            onDismissRequest = { confirmAction = null },
            title = { Text(title) },
            text = { Text(message) },
            confirmButton = { TextButton(onClick = { action(); confirmAction = null }) { Text("Confirm", color = Color(0xFFEF4444)) } },
            dismissButton = { TextButton(onClick = { confirmAction = null }) { Text("Cancel") } },
        )
    }
    
    // Warning dialog
    state.showWarningDialog?.let { userId ->
        AlertDialog(
            onDismissRequest = { viewModel.hideWarningDialog() },
            title = { Text("Send Warning") },
            text = {
                Column {
                    Text("Send a warning to this user:")
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = state.warningMessage,
                        onValueChange = { viewModel.setWarningMessage(it) },
                        placeholder = { Text("Enter warning message...") },
                        minLines = 3,
                        maxLines = 5,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = { viewModel.sendWarning() },
                    enabled = state.warningMessage.isNotBlank()
                ) { Text("Send") }
            },
            dismissButton = { TextButton(onClick = { viewModel.hideWarningDialog() }) { Text("Cancel") } }
        )
    }
    
    // Access denied screen
    val adminDark = ColorTokens.isDark
    if (!state.loading && !state.hasAdminAccess) {
        Box(Modifier.fillMaxSize().background(bgGradient(adminDark)), contentAlignment = Alignment.Center) {
            Column(Modifier.fillMaxSize()) {
                LegalTopBar("Admin Panel", onBack)
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                        Box(Modifier.size(80.dp).clip(CircleShape).background(Color(0xFFFEE2E2)), contentAlignment = Alignment.Center) {
                            Icon(Icons.Filled.Block, null, tint = Color(0xFFEF4444), modifier = Modifier.size(40.dp))
                        }
                        Spacer(Modifier.height(20.dp))
                        Text("Access Denied", fontWeight = FontWeight.Bold, fontSize = 22.sp, color = Color(0xFFEF4444))
                        Spacer(Modifier.height(8.dp))
                        Text("You don't have permission to access this area.", fontSize = 14.sp, color = if (adminDark) Color(0xFFCBD5E1) else Color(0xFF64748B), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                        Spacer(Modifier.height(20.dp))
                        Button(onClick = onBack, shape = RoundedCornerShape(12.dp)) { Text("Go Back") }
                    }
                }
            }
        }
        return
    }
    Box(Modifier.fillMaxSize().background(bgGradient(adminDark))) {
        Scaffold(
            snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
            containerColor = Color.Transparent
        ) { paddingValues ->
            Column(Modifier.fillMaxSize().padding(paddingValues)) {
                LegalTopBar("Admin Panel", onBack)
                if (state.loading) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = if (adminDark) Color(0xFF93C5FD) else Color(0xFF2563EB)) }
                else PullToRefreshBox(isRefreshing = refreshing, onRefresh = { viewModel.refresh() }, modifier = Modifier.fillMaxSize()) { LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // Stats grid
                item {
                    val s = state.stats
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("Users" to "${s.totalUsers}" to Color(0xFF2563EB), "Posts" to "${s.totalPosts}" to Color(0xFF22C55E), "Flagged" to "${s.flaggedPosts}" to Color(0xFFEF4444)).forEach { (pair, color) ->
                            val (label, value) = pair
                            Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = if (ColorTokens.isDarkTheme()) 0.dp else 2.dp, modifier = Modifier.weight(1f)) {
                                Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(value, fontWeight = FontWeight.Bold, fontSize = 20.sp, color = color)
                                    Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
                item {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("Restricted" to "${state.stats.restrictedUsers}" to Color(0xFFF59E0B), "Today Sign" to "${state.stats.todaySignups}" to Color(0xFF8B5CF6), "Today Post" to "${state.stats.todayPosts}" to Color(0xFF06B6D4)).forEach { (pair, color) ->
                            val (label, value) = pair
                            Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = if (ColorTokens.isDarkTheme()) 0.dp else 2.dp, modifier = Modifier.weight(1f)) {
                                Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text(value, fontWeight = FontWeight.Bold, fontSize = 20.sp, color = color)
                                    Text(label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                }
                // Tabs
                item {
                    TabRow(selectedTabIndex = tabs.indexOfFirst { it.first == state.tab }.coerceAtLeast(0), containerColor = Color.Transparent) {
                        tabs.forEach { (key, label) ->
                            Tab(selected = state.tab == key, onClick = { viewModel.setTab(key) },
                                text = { Text(label, fontWeight = if (state.tab == key) FontWeight.SemiBold else FontWeight.Normal) })
                        }
                    }
                }
                // Search
                item {
                    OutlinedTextField(value = state.search, onValueChange = { viewModel.setSearch(it) },
                        placeholder = { Text("Search…") }, leadingIcon = { Icon(Icons.Filled.Search, null) },
                        singleLine = true, shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB), focusedContainerColor = Color.White, unfocusedContainerColor = Color.White))
                }
                when (state.tab) {
                    "users" -> {
                        // Bulk action toolbar
                        if (state.selectedUsers.isNotEmpty()) {
                            item {
                                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF2563EB), modifier = Modifier.fillMaxWidth()) {
                                    Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Text("${state.selectedUsers.size} selected", color = Color.White, fontWeight = FontWeight.SemiBold)
                                        Spacer(Modifier.weight(1f))
                                        TextButton(onClick = { viewModel.clearUserSelection() }) { Text("Clear", color = Color.White) }
                                        Button(
                                            onClick = { confirmAction = Triple("Ban Selected Users", "Ban ${state.selectedUsers.size} users?") { viewModel.bulkBanUsers() } },
                                            shape = RoundedCornerShape(8.dp),
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                        ) { Text("Ban Selected", fontSize = 12.sp) }
                                    }
                                }
                            }
                        } else {
                            item {
                                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                    Checkbox(checked = state.flaggedUsers.isNotEmpty() && state.selectedUsers.size == state.flaggedUsers.size, onCheckedChange = { if (it) viewModel.selectAllUsers() else viewModel.clearUserSelection() })
                                    Text("Select All", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                                }
                            }
                        }
                        val filtered = state.flaggedUsers.filter { u -> state.search.isBlank() || (u.name ?: "").contains(state.search, true) || (u.email ?: "").contains(state.search, true) }
                        if (filtered.isEmpty()) item { Text("No flagged users", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        items(filtered, key = { it.id ?: it.name ?: "" }) { user ->
                            Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                                Column {
                                    Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Checkbox(
                                            checked = state.selectedUsers.contains(user.id),
                                            onCheckedChange = { user.id?.let { viewModel.toggleUserSelection(it) } }
                                        )
                                        Box(Modifier.size(36.dp).clip(CircleShape).background(Color(0xFFFEE2E2)), contentAlignment = Alignment.Center) {
                                            Icon(Icons.Filled.Person, null, tint = Color(0xFFEF4444), modifier = Modifier.size(18.dp))
                                        }
                                        Spacer(Modifier.width(10.dp))
                                        Column(Modifier.weight(1f)) {
                                            Text(user.name ?: "Unknown", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                                            Text(user.reason ?: "Flagged", fontSize = 11.sp, color = Color(0xFFEF4444))
                                        }
                                        val statusColor = when (user.status) {
                                            "approved" -> Color(0xFF22C55E)
                                            "rejected" -> Color(0xFFEF4444)
                                            "banned" -> Color(0xFF7C3AED)
                                            else -> Color(0xFFEF4444)
                                        }
                                        Surface(shape = RoundedCornerShape(8.dp), color = statusColor.copy(alpha = 0.1f)) {
                                            Text(user.status ?: "flagged", fontSize = 10.sp, color = statusColor, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                        }
                                        IconButton(onClick = { user.id?.let { viewModel.showWarningDialog(it) } }) {
                                            Icon(Icons.Filled.Warning, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(18.dp))
                                        }
                                    }
                                    // Action buttons
                                    if (user.status == null || user.status == "flagged") {
                                        Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Button(onClick = { viewModel.approveUser(user.id ?: "") }, shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)), modifier = Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) { Text("Approve", fontSize = 11.sp) }
                                            Button(onClick = { confirmAction = Triple("Reject User", "Are you sure you want to reject this user?") { viewModel.rejectUser(user.id ?: "") } }, shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF59E0B)), modifier = Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) { Text("Reject", fontSize = 11.sp) }
                                            Button(onClick = { confirmAction = Triple("Ban User", "Are you sure you want to ban this user? This action is serious.") { viewModel.banUser(user.id ?: "") } }, shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)), modifier = Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) { Text("Ban", fontSize = 11.sp) }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    "posts" -> {
                        // Bulk action toolbar
                        if (state.selectedPosts.isNotEmpty()) {
                            item {
                                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFF2563EB), modifier = Modifier.fillMaxWidth()) {
                                    Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Text("${state.selectedPosts.size} selected", color = Color.White, fontWeight = FontWeight.SemiBold)
                                        Spacer(Modifier.weight(1f))
                                        TextButton(onClick = { viewModel.clearPostSelection() }) { Text("Clear", color = Color.White) }
                                        Button(
                                            onClick = { confirmAction = Triple("Remove Selected Posts", "Remove ${state.selectedPosts.size} posts?") { viewModel.bulkRemovePosts() } },
                                            shape = RoundedCornerShape(8.dp),
                                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
                                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                                        ) { Text("Remove Selected", fontSize = 12.sp) }
                                    }
                                }
                            }
                        } else {
                            item {
                                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                    Checkbox(checked = state.flaggedPosts.isNotEmpty() && state.selectedPosts.size == state.flaggedPosts.size, onCheckedChange = { if (it) viewModel.selectAllPosts() else viewModel.clearPostSelection() })
                                    Text("Select All", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                                }
                            }
                        }
                        val filtered = state.flaggedPosts.filter { p -> state.search.isBlank() || (p.title ?: "").contains(state.search, true) }
                        if (filtered.isEmpty()) item { Text("No flagged posts", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        items(filtered, key = { it.id ?: it.title ?: "" }) { post ->
                            Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.surface, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                                Column {
                                    Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                        Checkbox(
                                            checked = state.selectedPosts.contains(post.id),
                                            onCheckedChange = { post.id?.let { viewModel.togglePostSelection(it) } }
                                        )
                                        Icon(Icons.Filled.Flag, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(18.dp))
                                        Spacer(Modifier.width(10.dp))
                                        Column(Modifier.weight(1f)) {
                                            Text(post.title ?: "Post", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                                            Text(post.reason ?: "Flagged", fontSize = 11.sp, color = Color(0xFFF59E0B))
                                        }
                                        val statusColor = if (post.status == "approved") Color(0xFF22C55E) else Color(0xFFF59E0B)
                                        Surface(shape = RoundedCornerShape(8.dp), color = statusColor.copy(alpha = 0.1f)) {
                                            Text(post.status ?: "flagged", fontSize = 10.sp, color = statusColor, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp))
                                        }
                                    }
                                    // Post action buttons
                                    if (post.status == null || post.status == "flagged") {
                                        Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            Button(onClick = { viewModel.approvePost(post.id ?: "") }, shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF22C55E)), modifier = Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) { Text("Approve", fontSize = 11.sp) }
                                            Button(onClick = { confirmAction = Triple("Remove Post", "Are you sure you want to remove this flagged post?") { viewModel.removePost(post.id ?: "") } }, shape = RoundedCornerShape(8.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)), modifier = Modifier.weight(1f), contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) { Text("Remove", fontSize = 11.sp) }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    "flags" -> {
                        item { Text("Auto-Detection Rules", fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = MaterialTheme.colorScheme.onSurface) }
                        item {
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                listOf("all" to "All", "spam" to "Spam", "scam" to "Scam", "fake" to "Fake", "duplicate" to "Duplicate", "inappropriate" to "Inappropriate").forEach { (key, label) ->
                                    FilterChip(
                                        selected = state.flagCategory == key,
                                        onClick = { viewModel.setFlagCategory(key) },
                                        label = { Text(label, fontSize = 11.sp) },
                                        shape = RoundedCornerShape(20.dp)
                                    )
                                }
                            }
                        }
                        val flaggedByCategory = when (state.flagCategory) {
                            "all" -> state.flaggedPosts
                            else -> state.flaggedPosts.filter { (it.reason ?: "").contains(state.flagCategory, true) }
                        }
                        if (flaggedByCategory.isEmpty()) item { Text("No flags in this category", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        items(flaggedByCategory, key = { it.id ?: it.title ?: "" }) { post ->
                            Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                    val categoryColor = when {
                                        (post.reason ?: "").contains("spam", true) -> Color(0xFFEF4444)
                                        (post.reason ?: "").contains("scam", true) -> Color(0xFFDC2626)
                                        (post.reason ?: "").contains("fake", true) -> Color(0xFFF59E0B)
                                        (post.reason ?: "").contains("duplicate", true) -> Color(0xFF8B5CF6)
                                        else -> Color(0xFF64748B)
                                    }
                                    Box(Modifier.size(8.dp).clip(CircleShape).background(categoryColor))
                                    Spacer(Modifier.width(10.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(post.title ?: "Post", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface, maxLines = 1)
                                        Text(post.reason ?: "Flagged", fontSize = 11.sp, color = categoryColor)
                                    }
                                    IconButton(onClick = { post.id?.let { viewModel.approvePost(it) } }) {
                                        Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(18.dp))
                                    }
                                    IconButton(onClick = { post.id?.let { viewModel.removePost(it) } }) {
                                        Icon(Icons.Filled.Delete, null, tint = Color(0xFFEF4444), modifier = Modifier.size(18.dp))
                                    }
                                }
                            }
                        }
                    }
                    "activity" -> {
                        if (state.recentActivity.isEmpty()) item { Text("No recent activity", color = MaterialTheme.colorScheme.onSurfaceVariant) }
                        items(state.recentActivity, key = { it.id ?: it.description ?: "" }) { act ->
                            Surface(shape = RoundedCornerShape(12.dp), color = Color.White, shadowElevation = 1.dp, modifier = Modifier.fillMaxWidth()) {
                                Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Filled.History, null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(10.dp))
                                    Column(Modifier.weight(1f)) {
                                        Text(act.description ?: act.type ?: "Action", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurface)
                                        if (act.createdAt != null) Text(act.createdAt.take(16).replace("T", " "), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    }
                                }
                            }
                        }
                    }
                }
            } }
        }
    }
}
}

// ─── InviteScreen ─────────────────────────────────────────────────────────────
data class InviteUiState(val loading: Boolean = true, val inviterName: String? = null, val bonus: String? = null, val valid: Boolean = false, val error: String? = null)

@HiltViewModel
class InviteViewModel @Inject constructor(private val repo: InviteRepository) : ViewModel() {
    private val _state = MutableStateFlow(InviteUiState())
    val state: StateFlow<InviteUiState> = _state.asStateFlow()
    fun load(code: String) { viewModelScope.launch {
        when (val r = repo.info(code)) {
            is ApiResult.Success -> _state.value = InviteUiState(loading = false, valid = r.data.valid, inviterName = r.data.inviterName, bonus = r.data.bonus?.toString())
            is ApiResult.Failure -> _state.value = InviteUiState(loading = false, error = r.error.message)
        }
    } }
}

@Composable
fun InviteScreen(code: String, onBack: () -> Unit, viewModel: InviteViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    LaunchedEffect(code) { viewModel.load(code) }
    val inviteDark = ColorTokens.isDark
    Box(Modifier.fillMaxSize().background(bgGradient(inviteDark)), contentAlignment = Alignment.Center) {
        Column(Modifier.fillMaxSize()) {
            LegalTopBar("Invite", onBack)
            when {
                state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = if (inviteDark) Color(0xFF93C5FD) else Color(0xFF2563EB)) }
                state.valid -> Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Box(Modifier.size(80.dp).clip(CircleShape).background(Color(0xFF2563EB)), contentAlignment = Alignment.Center) {
                        Icon(Icons.Filled.PersonAdd, null, tint = Color.White, modifier = Modifier.size(40.dp))
                    }
                    Spacer(Modifier.height(20.dp))
                    Text("You've been invited!", fontWeight = FontWeight.Bold, fontSize = 22.sp, color = if (inviteDark) Color(0xFFF1F5F9) else Color(0xFF1E293B))
                    if (state.inviterName != null) { Spacer(Modifier.height(8.dp)); Text("by ${state.inviterName}", fontSize = 15.sp, color = if (inviteDark) Color(0xFF94A3B8) else Color(0xFF64748B)) }
                    if (state.bonus != null) {
                        Spacer(Modifier.height(16.dp))
                        Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFFFFF7ED)) {
                            Row(Modifier.padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Filled.Stars, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text("Bonus: ${state.bonus} coins on sign up!", fontWeight = FontWeight.SemiBold, color = Color(0xFF92400E))
                            }
                        }
                    }
                    Spacer(Modifier.height(28.dp))
                    Button(onClick = onBack, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)), modifier = Modifier.padding(horizontal = 32.dp).fillMaxWidth().height(50.dp)) { Text("Sign Up & Accept", fontWeight = FontWeight.SemiBold) }
                }
                else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
                        Icon(Icons.Filled.LinkOff, null, tint = if (inviteDark) Color(0xFF475569) else Color(0xFFCBD5E1), modifier = Modifier.size(64.dp))
                        Spacer(Modifier.height(16.dp))
                        Text("Invalid Invite", fontWeight = FontWeight.SemiBold, fontSize = 18.sp, color = if (inviteDark) Color(0xFFCBD5E1) else Color(0xFF374151))
                        Spacer(Modifier.height(8.dp))
                        Text(state.error ?: "This invite link is invalid or has expired.", fontSize = 14.sp, color = if (inviteDark) Color(0xFF94A3B8) else Color(0xFF64748B))
                        Spacer(Modifier.height(20.dp))
                        Button(onClick = onBack, shape = RoundedCornerShape(12.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB))) { Text("Go Back") }
                    }
                }
            }
        }
    }
}

// ─── NotFoundScreen ───────────────────────────────────────────────────────────
@Composable
fun NotFoundScreen(onBack: () -> Unit) {
    val nfDark = ColorTokens.isDark
    Box(Modifier.fillMaxSize().background(bgGradient(nfDark)), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
            Box(
                Modifier.size(120.dp).clip(CircleShape).background(if (nfDark) Color(0xFF1E293B) else Color(0xFFEFF6FF)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.SearchOff, null, tint = if (nfDark) Color(0xFF93C5FD) else Color(0xFF2563EB), modifier = Modifier.size(56.dp))
            }
            Spacer(Modifier.height(20.dp))
            Text("404", fontWeight = FontWeight.Bold, fontSize = 64.sp, color = if (nfDark) Color(0xFF93C5FD) else Color(0xFF2563EB))
            Spacer(Modifier.height(8.dp))
            Text("Page Not Found", fontWeight = FontWeight.Bold, fontSize = 22.sp, color = if (nfDark) Color(0xFFF1F5F9) else Color(0xFF1E293B))
            Spacer(Modifier.height(8.dp))
            Text("The page you're looking for doesn't exist or has been moved.", fontSize = 14.sp, color = if (nfDark) Color(0xFF94A3B8) else Color(0xFF64748B), modifier = Modifier.padding(horizontal = 16.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
            Spacer(Modifier.height(28.dp))
            Button(onClick = onBack, shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)), modifier = Modifier.fillMaxWidth().height(50.dp)) { Text("Go Home", fontWeight = FontWeight.SemiBold) }
            Spacer(Modifier.height(12.dp))
            TextButton(onClick = onBack) { Text("Go back", color = if (nfDark) Color(0xFF94A3B8) else Color(0xFF64748B)) }
        }
    }
}

