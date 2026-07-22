package com.zaruda.app.ui.chat

import android.widget.Toast
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.DoneAll
import androidx.compose.material.icons.filled.MoreVert
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Report
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.repository.ChatRepository
import com.zaruda.app.domain.model.ChatConversation
import com.zaruda.app.domain.model.ChatMessage
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

// ─── State ─────────────────────────────────────────────────────────────────

data class ChatUiState(
    val loading: Boolean = true,
    val refreshing: Boolean = false,
    val conversations: List<ChatConversation> = emptyList(),
    val activeConversation: ChatConversation? = null,
    val messages: List<ChatMessage> = emptyList(),
    val messagesLoading: Boolean = false,
    val sendingMessage: Boolean = false,
    val messageText: String = "",
    val error: String? = null,
    val unreadCount: Int = 0,
)

// ─── ViewModel ──────────────────────────────────────────────────────────────

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val chatRepo: ChatRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ChatUiState())
    val state: StateFlow<ChatUiState> = _state.asStateFlow()

    private var pollJob: Job? = null

    init { loadConversations() }

    fun loadConversations() {
        _state.value = _state.value.copy(loading = _state.value.conversations.isEmpty(), refreshing = false, error = null)
        viewModelScope.launch {
            when (val r = chatRepo.conversations()) {
                is ApiResult.Success -> {
                    val convos = r.data
                    val unread = convos.sumOf { it.unreadCount }
                    _state.value = _state.value.copy(
                        loading = false, refreshing = false,
                        conversations = convos, unreadCount = unread,
                    )
                    startPolling()
                }
                is ApiResult.Failure -> {
                    _state.value = _state.value.copy(
                        loading = false, refreshing = false,
                        error = "Could not load conversations",
                    )
                }
            }
        }
    }

    fun refresh() {
        _state.value = _state.value.copy(refreshing = true)
        loadConversations()
    }

    fun selectConversation(conv: ChatConversation) {
        _state.value = _state.value.copy(activeConversation = conv, messages = emptyList(), messagesLoading = true, messageText = "")
        loadMessages(conv)
    }

    private fun loadMessages(conv: ChatConversation) {
        val convId = conv.conversationId ?: conv.id ?: return
        viewModelScope.launch {
            when (val r = chatRepo.messages(convId)) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(messagesLoading = false, messages = r.data)
                }
                is ApiResult.Failure -> {
                    _state.value = _state.value.copy(messagesLoading = false, error = "Could not load messages")
                }
            }
        }
    }

    fun setMessageText(text: String) {
        _state.value = _state.value.copy(messageText = text)
    }

    fun sendMessage() {
        val text = _state.value.messageText.trim()
        val conv = _state.value.activeConversation ?: return
        if (text.isBlank()) return
        val convId = conv.conversationId ?: conv.id ?: return

        _state.value = _state.value.copy(sendingMessage = true, messageText = "")
        viewModelScope.launch {
            when (val r = chatRepo.send(convId, text)) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(sendingMessage = false)
                    loadMessages(conv)
                }
                is ApiResult.Failure -> {
                    _state.value = _state.value.copy(sendingMessage = false, error = "Failed to send message")
                }
            }
        }
    }

    fun deleteMessage(conversationId: String, messageId: String) {
        viewModelScope.launch {
            chatRepo.deleteMessage(conversationId, messageId)
            val conv = _state.value.activeConversation ?: return@launch
            loadMessages(conv)
        }
    }

    fun reportConversation(conversationId: String) {
        viewModelScope.launch {
            chatRepo.reportConversation(conversationId)
        }
    }

    private fun startPolling() {
        pollJob?.cancel()
        pollJob = viewModelScope.launch {
            while (isActive) {
                delay(10_000)
                chatRepo.conversations().let { r ->
                    if (r is ApiResult.Success) {
                        val convos = r.data
                        val unread = convos.sumOf { it.unreadCount }
                        _state.value = _state.value.copy(conversations = convos, unreadCount = unread)
                    }
                }
            }
        }
    }

    fun goBackToConversations() {
        _state.value = _state.value.copy(activeConversation = null, messages = emptyList())
    }

    override fun onCleared() {
        super.onCleared()
        pollJob?.cancel()
    }
}

// ─── Screen ─────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    onBack: () -> Unit,
    viewModel: ChatViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()

    if (state.activeConversation != null) {
        ChatWindow(
            conversation = state.activeConversation!!,
            messages = state.messages,
            messagesLoading = state.messagesLoading,
            sendingMessage = state.sendingMessage,
            messageText = state.messageText,
            onMessageTextChange = { viewModel.setMessageText(it) },
            onSendMessage = { viewModel.sendMessage() },
            onBack = { viewModel.goBackToConversations() },
            onDeleteMessage = { convId, msgId -> viewModel.deleteMessage(convId, msgId) },
            onReport = { convId -> viewModel.reportConversation(convId) },
        )
        return
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("Messages", fontWeight = FontWeight.Bold)
                        Text(
                            "${state.conversations.size} conversations",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                actions = {
                    if (state.unreadCount > 0) {
                        Box(Modifier.padding(end = 8.dp)) {
                            Box(
                                Modifier.size(20.dp).clip(CircleShape).background(Color(0xFFEF4444)),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    "${state.unreadCount}",
                                    color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Bold,
                                )
                            }
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        when {
            state.loading -> {
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            state.error != null && state.conversations.isEmpty() -> {
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(Icons.Filled.Person, null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text("No conversations yet", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text("Your messages will appear here", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            else -> {
                PullToRefreshBox(
                    isRefreshing = state.refreshing,
                    onRefresh = { viewModel.refresh() },
                    modifier = Modifier.fillMaxSize().padding(padding),
                ) {
                    LazyColumn(contentPadding = PaddingValues(vertical = 8.dp)) {
                        items(state.conversations, key = { it.conversationId ?: it.id ?: it.otherUserId ?: "" }) { conv ->
                            ConversationRow(
                                conversation = conv,
                                onClick = { viewModel.selectConversation(conv) },
                            )
                        }
                    }
                }
            }
        }
    }
}

// ─── Conversation Row ───────────────────────────────────────────────────────

@Composable
private fun ConversationRow(
    conversation: ChatConversation,
    onClick: () -> Unit,
) {
    val lastMsgText = conversation.lastMessage
    val lastMsgTime = conversation.lastMessageTime
    val hasUnread = conversation.unreadCount > 0
    val bgColor by animateColorAsState(
        targetValue = if (hasUnread) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.15f) else Color.Transparent,
        label = "conv_bg",
    )

    Surface(
        onClick = onClick,
        color = bgColor,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            val name = conversation.otherUserName ?: "User"
            val initial = name.firstOrNull()?.uppercase() ?: "?"
            val avatarUrl = conversation.otherUserAvatar
            if (avatarUrl != null) {
                AsyncImage(
                    model = avatarUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(48.dp).clip(CircleShape),
                )
            } else {
                Box(
                    modifier = Modifier.size(48.dp).clip(CircleShape).background(
                        Brush.linearGradient(listOf(Color(0xFF818CF8), Color(0xFFA855F7)))
                    ),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(initial, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 20.sp)
                }
            }

            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = name,
                        fontWeight = if (hasUnread) FontWeight.Bold else FontWeight.Medium,
                        fontSize = 14.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    val time = relativeChatTime(lastMsgTime)
                    if (time.isNotBlank()) {
                        Text(time, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                Spacer(Modifier.height(2.dp))
                Text(
                    text = lastMsgText ?: "No messages yet",
                    fontSize = 13.sp,
                    color = if (hasUnread) MaterialTheme.colorScheme.onSurface else MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }

            if (hasUnread) {
                Box(Modifier.size(10.dp).clip(CircleShape).background(Color(0xFFEF4444)))
            }
        }
    }
}

// ─── Chat Window ────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ChatWindow(
    conversation: ChatConversation,
    messages: List<ChatMessage>,
    messagesLoading: Boolean,
    sendingMessage: Boolean,
    messageText: String,
    onMessageTextChange: (String) -> Unit,
    onSendMessage: () -> Unit,
    onBack: () -> Unit,
    onDeleteMessage: (String, String) -> Unit,
    onReport: (String) -> Unit,
) {
    val listState = rememberLazyListState()
    var showMenu by remember { mutableStateOf(false) }
    val currentUserId = "me"
    val convId = conversation.conversationId ?: conversation.id ?: ""

    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        val name = conversation.otherUserName ?: "User"
                        val initial = name.firstOrNull()?.uppercase() ?: "?"
                        Box(
                            Modifier.size(36.dp).clip(CircleShape).background(
                                Brush.linearGradient(listOf(Color(0xFF818CF8), Color(0xFFA855F7)))
                            ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(initial, fontWeight = FontWeight.Bold, color = Color.White, fontSize = 16.sp)
                        }
                        Column {
                            Text(name, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                            Text(
                                "${messages.size} messages",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                actions = {
                    Box {
                        IconButton(onClick = { showMenu = true }) {
                            Icon(Icons.Filled.MoreVert, null)
                        }
                        DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
                            DropdownMenuItem(
                                text = { Text("Report conversation") },
                                leadingIcon = { Icon(Icons.Filled.Report, null, modifier = Modifier.size(18.dp)) },
                                onClick = { showMenu = false; onReport(convId) },
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).imePadding()) {
            Box(Modifier.weight(1f).fillMaxWidth()) {
                when {
                    messagesLoading -> {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                    }
                    messages.isEmpty() -> {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Text("No messages yet. Say hello!", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    else -> {
                        LazyColumn(
                            state = listState,
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            items(messages, key = { it.id ?: it.messageId ?: "" }) { msg ->
                                val isMine = msg.senderId == currentUserId
                                ChatBubble(message = msg, isMine = isMine)
                            }
                        }
                    }
                }
            }

            Surface(tonalElevation = 2.dp, shadowElevation = 4.dp, color = MaterialTheme.colorScheme.surface) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp).navigationBarsPadding(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    OutlinedTextField(
                        value = messageText,
                        onValueChange = onMessageTextChange,
                        placeholder = { Text("Type a message...") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(24.dp),
                        maxLines = 4,
                        enabled = !sendingMessage,
                    )
                    IconButton(
                        onClick = onSendMessage,
                        enabled = messageText.isNotBlank() && !sendingMessage,
                        modifier = Modifier.size(44.dp),
                    ) {
                        if (sendingMessage) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        } else {
                            Surface(
                                shape = CircleShape,
                                color = if (messageText.isNotBlank()) Color(0xFF2563EB) else MaterialTheme.colorScheme.surfaceVariant,
                                modifier = Modifier.size(44.dp),
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        Icons.AutoMirrored.Filled.Send,
                                        null,
                                        tint = if (messageText.isNotBlank()) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
                                        modifier = Modifier.size(20.dp),
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ─── Chat Bubble ────────────────────────────────────────────────────────────

@Composable
private fun ChatBubble(
    message: ChatMessage,
    isMine: Boolean,
) {
    val bubbleColor = if (isMine) Color(0xFF2563EB) else MaterialTheme.colorScheme.surfaceVariant
    val textColor = if (isMine) Color.White else MaterialTheme.colorScheme.onSurface
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = if (isMine) Alignment.End else Alignment.Start,
    ) {
        Surface(
            shape = RoundedCornerShape(
                topStart = 16.dp, topEnd = 16.dp,
                bottomStart = if (isMine) 16.dp else 4.dp,
                bottomEnd = if (isMine) 4.dp else 16.dp,
            ),
            color = bubbleColor,
            shadowElevation = 1.dp,
        ) {
            Column(Modifier.padding(horizontal = 14.dp, vertical = 10.dp)) {
                Text(
                    text = message.content ?: "",
                    color = textColor,
                    fontSize = 14.sp,
                )
                val time = relativeChatTime(message.createdAt)
                if (time.isNotBlank()) {
                    Spacer(Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(time, fontSize = 10.sp, color = textColor.copy(alpha = 0.6f))
                        if (isMine && message.isRead) {
                            Icon(Icons.Filled.DoneAll, null, tint = Color.White.copy(alpha = 0.6f), modifier = Modifier.size(12.dp))
                        }
                    }
                }
            }
        }
    }
}

// ─── Utils ──────────────────────────────────────────────────────────────────

private fun relativeChatTime(dateStr: String?): String {
    if (dateStr.isNullOrBlank()) return ""
    return try {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US).also { it.timeZone = java.util.TimeZone.getTimeZone("UTC") }
        val sdf2 = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).also { it.timeZone = java.util.TimeZone.getTimeZone("UTC") }
        val date = try { sdf2.parse(dateStr) } catch (_: Exception) { sdf.parse(dateStr) } ?: return ""
        val now = System.currentTimeMillis()
        val diffMs = now - date.time
        if (diffMs < 24 * 60 * 60 * 1000L) {
            val mins = diffMs / 60_000
            val hours = mins / 60
            when {
                mins < 1 -> "now"
                mins < 60 -> "${mins}m"
                else -> "${hours}h"
            }
        } else {
            val displaySdf = java.text.SimpleDateFormat("dd MMM", java.util.Locale.US)
            displaySdf.format(date)
        }
    } catch (_: Exception) { "" }
}
