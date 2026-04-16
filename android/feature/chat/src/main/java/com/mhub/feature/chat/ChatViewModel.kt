package com.mhub.feature.chat

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ChatUiState(
    val conversationId: Int = 0,
    val otherUserName: String = "",
    val messages: List<ChatMessage> = emptyList(),
    val isLoading: Boolean = true,
    val isOtherTyping: Boolean = false,
    val error: String? = null,
    val currentUserId: Int = 0,
)

@HiltViewModel
class ChatViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val chatSocketManager: ChatSocketManager,
    private val authRepository: com.mhub.core.data.repository.AuthRepository,
) : ViewModel() {

    private val conversationId: Int = savedStateHandle.get<Int>("conversationId") ?: 0

    private val _uiState = MutableStateFlow(ChatUiState(conversationId = conversationId))
    val uiState: StateFlow<ChatUiState> = _uiState.asStateFlow()

    private val _messageText = MutableStateFlow("")
    val messageText: StateFlow<String> = _messageText.asStateFlow()

    init {
        viewModelScope.launch {
            val userId = authRepository.currentUser.first()?.id ?: 0
            _uiState.update { it.copy(currentUserId = userId) }
        }
        chatSocketManager.joinConversation(conversationId)
        observeIncomingMessages()
        observeTyping()
        _uiState.update { it.copy(isLoading = false) }
    }

    private fun observeIncomingMessages() {
        viewModelScope.launch {
            chatSocketManager.observeMessages()
                .filter { it.conversationId == conversationId }
                .collect { message ->
                    _uiState.update { state ->
                        state.copy(messages = state.messages + message)
                    }
                }
        }
    }

    private fun observeTyping() {
        viewModelScope.launch {
            chatSocketManager.observeTyping().collect { (_, isTyping) ->
                _uiState.update { it.copy(isOtherTyping = isTyping) }
            }
        }
    }

    fun updateMessageText(text: String) {
        _messageText.value = text
        chatSocketManager.sendTyping(conversationId, text.isNotEmpty())
    }

    fun sendMessage() {
        val text = _messageText.value.trim()
        if (text.isEmpty()) return

        chatSocketManager.sendMessage(conversationId, text)
        _messageText.value = ""
        chatSocketManager.sendTyping(conversationId, false)
    }

    override fun onCleared() {
        chatSocketManager.leaveConversation(conversationId)
        super.onCleared()
    }
}
