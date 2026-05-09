package com.mhub.app.ui.chat

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Chat
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.AttachFile
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Report
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.ChatRepository
import com.mhub.app.domain.model.ChatConversation
import com.mhub.app.domain.model.ChatMessage
import com.mhub.app.ui.components.AppEmptyState
import com.mhub.app.ui.components.AppErrorState
import com.mhub.app.ui.components.ErrorBanner
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChatState(
    val loading: Boolean = true,
    val conversations: List<ChatConversation> = emptyList(),
    val selectedConversation: ChatConversation? = null,
    val messages: List<ChatMessage> = emptyList(),
    val messagesLoading: Boolean = false,
    val error: String? = null,
    val currentUserId: String? = null,
    val sending: Boolean = false,
    val searchQuery: String = "",
    val isTyping: Boolean = false,
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val repo: ChatRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ChatState())
    val state: StateFlow<ChatState> = _state.asStateFlow()

    private var pollingJob: kotlinx.coroutines.Job? = null

    init { loadConversations() }

    fun loadConversations() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val result = repo.conversations()) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    loading = false,
                    conversations = result.data,
                )
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    loading = false,
                    error = result.error.message,
                )
            }
        }
    }

    fun openConversation(conv: ChatConversation) {
        pollingJob?.cancel()
        _state.value = _state.value.copy(
            selectedConversation = conv,
            messagesLoading = true,
            messages = emptyList(),
            error = null,
        )
        viewModelScope.launch {
            when (val result = repo.messages(conv.stableId)) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    messagesLoading = false,
                    messages = result.data,
                )
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    messagesLoading = false,
                    error = result.error.message,
                )
            }
        }
        // Start polling for new messages
        pollingJob = viewModelScope.launch {
            while (true) {
                kotlinx.coroutines.delay(5000)
                val convId = _state.value.selectedConversation?.stableId ?: break
                when (val result = repo.messages(convId)) {
                    is ApiResult.Success -> _state.value = _state.value.copy(messages = result.data)
                    is ApiResult.Failure -> {} // silent
                }
            }
        }
    }

    fun sendMessage(content: String) {
        val conv = _state.value.selectedConversation ?: return
        val trimmed = content.trim()
        if (trimmed.isBlank()) return
        _state.value = _state.value.copy(sending = true, error = null)
        viewModelScope.launch {
            when (val result = repo.send(conv.stableId, trimmed)) {
                is ApiResult.Success -> {
                    val optimistic = ChatMessage(content = trimmed, senderId = "me")
                    _state.value = _state.value.copy(
                        sending = false,
                        messages = _state.value.messages + optimistic,
                    )
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    sending = false,
                    error = result.error.message,
                )
            }
        }
    }

    fun closeConversation() {
        pollingJob?.cancel()
        _state.value = _state.value.copy(selectedConversation = null, messages = emptyList())
    }

    fun setSearchQuery(query: String) {
        _state.value = _state.value.copy(searchQuery = query)
    }

    fun deleteMessage(msgId: String) {
        _state.value = _state.value.copy(messages = _state.value.messages.filter { it.stableId != msgId })
        viewModelScope.launch { /* repo.deleteMessage(msgId) */ }
    }

    fun blockUser() {
        val conv = _state.value.selectedConversation ?: return
        viewModelScope.launch { /* repo.blockUser(conv.otherUserId) */ }
    }

    fun reportConversation() {
        val conv = _state.value.selectedConversation ?: return
        viewModelScope.launch { /* repo.reportConversation(conv.stableId) */ }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    onBack: () -> Unit,
    onNavigateToLogin: () -> Unit = {},
    viewModel: ChatViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    // ProtectedChat gate (web-parity: ChatScreen.jsx ProtectedChat wrapper)
    if (state.currentUserId.isNullOrBlank()) {
        androidx.compose.foundation.layout.Box(
            modifier = androidx.compose.ui.Modifier.fillMaxSize(),
            contentAlignment = androidx.compose.ui.Alignment.Center,
        ) {
            androidx.compose.foundation.layout.Column(
                horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally,
                verticalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(16.dp),
                modifier = androidx.compose.ui.Modifier.padding(32.dp),
            ) {
                Text("🔒", fontSize = 48.sp)
                Text("Sign in to Message", fontWeight = FontWeight.Bold, fontSize = 20.sp, color = Color(0xFF1E293B))
                Text("Create an account or sign in to send and receive messages with sellers.", color = Color(0xFF64748B), textAlign = TextAlign.Center)
                Button(
                    onClick = onNavigateToLogin,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2563EB)),
                    modifier = androidx.compose.ui.Modifier.fillMaxWidth(),
                ) { Text("Sign In / Sign Up", fontWeight = FontWeight.SemiBold) }
                OutlinedButton(onClick = onBack, shape = RoundedCornerShape(12.dp), modifier = androidx.compose.ui.Modifier.fillMaxWidth()) {
                    Text("Go Back")
                }
            }
        }
        return
    }

    if (state.selectedConversation != null) {
        MessageThreadScreen(
            conversation = state.selectedConversation!!,
            messages = state.messages,
            loading = state.messagesLoading,
            sending = state.sending,
            currentUserId = state.currentUserId,
            errorMessage = state.error,
            onSend = { viewModel.sendMessage(it) },
            onBack = { viewModel.closeConversation() },
        )
    } else {
        ConversationListScreen(
            state = state,
            onConversationClick = { viewModel.openConversation(it) },
            onBack = onBack,
            onRetry = { viewModel.loadConversations() },
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ConversationListScreen(
    state: ChatState,
    onConversationClick: (ChatConversation) -> Unit,
    onBack: () -> Unit,
    onRetry: () -> Unit,
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Messages", fontWeight = FontWeight.Bold)
                        if (state.conversations.isNotEmpty()) {
                            Text(
                                "${state.conversations.size} conversation${if (state.conversations.size != 1) "s" else ""}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
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
        var searchQuery by remember { mutableStateOf("") }
        Column(Modifier.fillMaxSize().padding(padding)) {
            // Search bar
            OutlinedTextField(
                value = searchQuery, onValueChange = { searchQuery = it },
                placeholder = { Text("Search messages\u2026") },
                leadingIcon = { Icon(Icons.AutoMirrored.Filled.Chat, null) },
                trailingIcon = { if (searchQuery.isNotEmpty()) IconButton(onClick = { searchQuery = "" }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Clear") } },
                singleLine = true, shape = RoundedCornerShape(12.dp),
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = MaterialTheme.colorScheme.primary, unfocusedBorderColor = Color(0xFFE5E7EB)),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp),
            )
        when {
            state.loading -> Box(
                Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) { CircularProgressIndicator(color = MaterialTheme.colorScheme.primary) }

            state.error != null -> Box(
                Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                AppErrorState(
                    title = "Messages unavailable",
                    message = state.error,
                    onRetry = onRetry,
                    retryLabel = "Retry",
                )
            }

            state.conversations.isEmpty() -> Box(
                Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                AppEmptyState(
                    icon = Icons.AutoMirrored.Filled.Chat,
                    title = "No messages yet",
                    subtitle = "Start a conversation from any listing page.",
                )
            }

            else -> {
                val filteredConvs = state.conversations.filter { conv ->
                    searchQuery.isBlank() || (conv.otherUserName ?: "").contains(searchQuery, true) || (conv.postTitle ?: "").contains(searchQuery, true) || (conv.lastMessage ?: "").contains(searchQuery, true)
                }
                LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 90.dp),
            ) {
                items(filteredConvs, key = { it.stableId }) { conv ->
                    ConversationItem(conv = conv, onClick = { onConversationClick(conv) })
                    HorizontalDivider(
                        modifier = Modifier.padding(start = 76.dp),
                        thickness = 0.5.dp,
                        color = MaterialTheme.colorScheme.outlineVariant,
                    )
                }
            } }
        }
        }
    }
}

@Composable
private fun ConversationItem(conv: ChatConversation, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(0.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Avatar with online dot
            Box {
                Box(
                    modifier = Modifier
                        .size(48.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        text = conv.initials,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                    )
                }
                // Online indicator dot
                Box(
                    modifier = Modifier
                        .size(14.dp)
                        .align(Alignment.BottomEnd)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(2.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF22C55E)),
                )
            }

            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = conv.displayName,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = if (conv.unreadCount > 0) FontWeight.Bold else FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    conv.lastMessageTime?.let { time ->
                        Text(
                            text = formatChatTime(time),
                            style = MaterialTheme.typography.labelSmall,
                            color = if (conv.unreadCount > 0)
                                MaterialTheme.colorScheme.primary
                            else
                                MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = conv.lastMessage ?: "No messages yet",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        fontWeight = if (conv.unreadCount > 0) FontWeight.Medium else FontWeight.Normal,
                        modifier = Modifier.weight(1f),
                    )
                    if (conv.unreadCount > 0) {
                        Spacer(Modifier.width(8.dp))
                        Box(
                            modifier = Modifier
                                .size(20.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primary),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = if (conv.unreadCount > 9) "9+" else conv.unreadCount.toString(),
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onPrimary,
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }

                // Post title if available
                conv.postTitle?.let { title ->
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = MaterialTheme.colorScheme.primaryContainer,
                    ) {
                        Text(
                            text = "Re: $title",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onPrimaryContainer,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp),
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
private fun MessageThreadScreen(
    conversation: ChatConversation,
    messages: List<ChatMessage>,
    loading: Boolean,
    sending: Boolean,
    currentUserId: String?,
    errorMessage: String?,
    onSend: (String) -> Unit,
    onBack: () -> Unit,
    viewModel: ChatViewModel = hiltViewModel(),
) {
    var input by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    val focusManager = LocalFocusManager.current
    val state by viewModel.state.collectAsState()
    var showMenu by remember { mutableStateOf(false) }
    var showBlockDialog by remember { mutableStateOf(false) }
    var showReportDialog by remember { mutableStateOf(false) }
    var showSearchBar by remember { mutableStateOf(false) }
    var deleteTargetId by remember { mutableStateOf<String?>(null) }
    var reactionTargetId by remember { mutableStateOf<String?>(null) }

    // Confirmation dialogs
    if (showBlockDialog) {
        AlertDialog(
            onDismissRequest = { showBlockDialog = false },
            title = { Text("Block User") },
            text = { Text("Are you sure you want to block ${conversation.displayName}? They won't be able to message you.") },
            confirmButton = { TextButton(onClick = { viewModel.blockUser(); showBlockDialog = false; onBack() }) { Text("Block", color = MaterialTheme.colorScheme.error) } },
            dismissButton = { TextButton(onClick = { showBlockDialog = false }) { Text("Cancel") } },
        )
    }
    if (showReportDialog) {
        AlertDialog(
            onDismissRequest = { showReportDialog = false },
            title = { Text("Report Conversation") },
            text = { Text("Report this conversation for spam, harassment, or inappropriate content?") },
            confirmButton = { TextButton(onClick = { viewModel.reportConversation(); showReportDialog = false; onBack() }) { Text("Report", color = MaterialTheme.colorScheme.error) } },
            dismissButton = { TextButton(onClick = { showReportDialog = false }) { Text("Cancel") } },
        )
    }
    deleteTargetId?.let { id ->
        AlertDialog(
            onDismissRequest = { deleteTargetId = null },
            title = { Text("Delete Message") },
            text = { Text("Delete this message? This cannot be undone.") },
            confirmButton = { TextButton(onClick = { viewModel.deleteMessage(id); deleteTargetId = null }) { Text("Delete", color = MaterialTheme.colorScheme.error) } },
            dismissButton = { TextButton(onClick = { deleteTargetId = null }) { Text("Cancel") } },
        )
    }
    reactionTargetId?.let { id ->
        AlertDialog(
            onDismissRequest = { reactionTargetId = null },
            title = { Text("React to message") },
            text = {
                Row(horizontalArrangement = Arrangement.SpaceEvenly, modifier = Modifier.fillMaxWidth()) {
                    listOf("❤️", "👍", "😂", "😮", "😢", "🙏").forEach { emoji ->
                        Text(emoji, style = MaterialTheme.typography.headlineMedium, modifier = Modifier.padding(8.dp))
                    }
                }
            },
            confirmButton = { TextButton(onClick = { reactionTargetId = null }) { Text("Done") } },
        )
    }

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) listState.animateScrollToItem(messages.size - 1)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        // Avatar with online dot
                        Box {
                            Box(
                                modifier = Modifier.size(36.dp).clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(conversation.initials, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onPrimaryContainer)
                            }
                            Box(modifier = Modifier.size(10.dp).align(Alignment.BottomEnd).clip(CircleShape).background(MaterialTheme.colorScheme.surface).padding(1.dp).clip(CircleShape).background(Color(0xFF22C55E)))
                        }
                        Column {
                            Text(
                                text = conversation.displayName,
                                fontWeight = FontWeight.Bold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                style = MaterialTheme.typography.bodyLarge,
                            )
                            Text(
                                text = "Online",
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFF22C55E),
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { showSearchBar = !showSearchBar }) {
                        Icon(Icons.Filled.Search, contentDescription = "Search messages")
                    }
                    Box {
                        IconButton(onClick = { showMenu = true }) {
                            Icon(Icons.Filled.MoreVert, contentDescription = "More options")
                        }
                        DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                            DropdownMenuItem(
                                text = { Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Filled.Block, null, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text("Block User") } },
                                onClick = { showMenu = false; showBlockDialog = true },
                            )
                            DropdownMenuItem(
                                text = { Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Filled.Report, null, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(8.dp)); Text("Report Conversation") } },
                                onClick = { showMenu = false; showReportDialog = true },
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        bottomBar = {
            Surface(
                shadowElevation = 8.dp,
                color = MaterialTheme.colorScheme.surface,
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                        .imePadding()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OutlinedTextField(
                        value = input,
                        onValueChange = { input = it },
                        placeholder = { Text("Type a message...") },
                        leadingIcon = {
                            IconButton(onClick = { /* TODO: attach file */ }) {
                                Icon(Icons.Filled.AttachFile, "Attach", tint = Color(0xFF94A3B8), modifier = Modifier.size(20.dp))
                            }
                        },
                        singleLine = false,
                        maxLines = 4,
                        shape = RoundedCornerShape(24.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MaterialTheme.colorScheme.primary,
                            unfocusedBorderColor = MaterialTheme.colorScheme.outline,
                        ),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Default),
                        modifier = Modifier.weight(1f),
                    )
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(
                                if (input.isNotBlank()) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.surfaceVariant,
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        IconButton(
                            onClick = {
                                if (input.isNotBlank()) {
                                    onSend(input)
                                    input = ""
                                    focusManager.clearFocus()
                                }
                            },
                            enabled = input.isNotBlank() && !sending,
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.Send,
                                contentDescription = "Send",
                                tint = if (input.isNotBlank()) MaterialTheme.colorScheme.onPrimary
                                else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        when {
            loading -> Box(
                Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center,
            ) { CircularProgressIndicator(color = MaterialTheme.colorScheme.primary) }

            else -> Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding),
            ) {
                ErrorBanner(
                    message = errorMessage,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                )

                // Search bar in thread
                if (showSearchBar) {
                    OutlinedTextField(
                        value = state.searchQuery,
                        onValueChange = { viewModel.setSearchQuery(it) },
                        placeholder = { Text("Search in conversation…") },
                        leadingIcon = { Icon(Icons.Filled.Search, null) },
                        trailingIcon = { if (state.searchQuery.isNotEmpty()) IconButton(onClick = { viewModel.setSearchQuery("") }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Clear") } },
                        singleLine = true,
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = MaterialTheme.colorScheme.primary,
                            unfocusedBorderColor = Color(0xFFE5E7EB),
                        ),
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                    )
                }

                if (messages.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        AppEmptyState(
                            icon = Icons.AutoMirrored.Filled.Chat,
                            title = "Say hello!",
                            subtitle = "Start the conversation below.",
                        )
                    }
                } else {
                    val filteredMessages = if (state.searchQuery.isBlank()) messages else messages.filter {
                        it.displayContent.contains(state.searchQuery, ignoreCase = true)
                    }
                    LazyColumn(
                        state = listState,
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        items(filteredMessages, key = { it.stableId }) { msg ->
                            val isMe = msg.senderId == currentUserId || msg.senderId == "me"
                            MessageBubble(
                                message = msg,
                                isMe = isMe,
                                onLongPress = {
                                    if (isMe) deleteTargetId = msg.stableId
                                    else reactionTargetId = msg.stableId
                                },
                            )
                        }
                        // Enhanced typing indicator
                        if (state.isTyping || sending) {
                            item {
                                val infiniteTransition = rememberInfiniteTransition(label = "typing")
                                val dotAlpha1 by infiniteTransition.animateFloat(
                                    0.3f, 1f, infiniteRepeatable(tween(600), RepeatMode.Reverse), label = "dot1"
                                )
                                val dotAlpha2 by infiniteTransition.animateFloat(
                                    0.3f, 1f, infiniteRepeatable(tween(600, delayMillis = 200), RepeatMode.Reverse), label = "dot2"
                                )
                                val dotAlpha3 by infiniteTransition.animateFloat(
                                    0.3f, 1f, infiniteRepeatable(tween(600, delayMillis = 400), RepeatMode.Reverse), label = "dot3"
                                )
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.Start,
                                ) {
                                    Surface(
                                        shape = RoundedCornerShape(18.dp),
                                        color = MaterialTheme.colorScheme.surfaceVariant,
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                                            horizontalArrangement = Arrangement.spacedBy(3.dp),
                                        ) {
                                            Box(Modifier.size(8.dp).background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = dotAlpha1), CircleShape))
                                            Box(Modifier.size(8.dp).background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = dotAlpha2), CircleShape))
                                            Box(Modifier.size(8.dp).background(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = dotAlpha3), CircleShape))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun MessageBubble(message: ChatMessage, isMe: Boolean, onLongPress: () -> Unit = {}) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = if (isMe) Arrangement.End else Arrangement.Start,
    ) {
        if (!isMe) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.secondaryContainer),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "U",
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSecondaryContainer,
                )
            }
            Spacer(Modifier.width(6.dp))
        }

        Column(horizontalAlignment = if (isMe) Alignment.End else Alignment.Start) {
            Surface(
                shape = RoundedCornerShape(
                    topStart = if (isMe) 18.dp else 4.dp,
                    topEnd = if (isMe) 4.dp else 18.dp,
                    bottomStart = 18.dp,
                    bottomEnd = 18.dp,
                ),
                color = if (isMe) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.surface,
                shadowElevation = 1.dp,
                modifier = Modifier.combinedClickable(
                    onClick = {},
                    onLongClick = onLongPress,
                ),
            ) {
                Text(
                    text = message.displayContent,
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (isMe) MaterialTheme.colorScheme.onPrimary
                    else MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                )
            }
            message.createdAt?.let { ts ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text(
                        text = formatChatTime(ts),
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f),
                    )
                    if (isMe) {
                        Text(
                            text = if (message.isRead) "✓✓" else "✓",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (message.isRead) Color(0xFF2563EB) else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                        )
                    }
                }
            }
        }
    }
}

private fun formatChatTime(iso: String): String {
    return try {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.getDefault())
        sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
        val date = sdf.parse(iso.take(19)) ?: return iso
        val diff = System.currentTimeMillis() - date.time
        val mins = diff / 60000
        val hrs = mins / 60
        val days = hrs / 24
        when {
            mins < 1 -> "now"
            mins < 60 -> "${mins}m"
            hrs < 24 -> "${hrs}h"
            days < 7 -> "${days}d"
            else -> java.text.SimpleDateFormat("MMM d", java.util.Locale.getDefault()).format(date)
        }
    } catch (e: Exception) {
        ""
    }
}
