package com.mhub.feature.chat

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ConversationListUiState(
    val conversations: List<Conversation> = emptyList(),
    val isLoading: Boolean = true,
    val error: String? = null,
)

@HiltViewModel
class ConversationListViewModel @Inject constructor(
    private val chatSocketManager: ChatSocketManager,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ConversationListUiState())
    val uiState: StateFlow<ConversationListUiState> = _uiState.asStateFlow()

    init {
        // In production, fetch conversations from REST API
        // For now, set as loaded with empty list
        _uiState.update { it.copy(isLoading = false) }
    }

    fun refresh() {
        _uiState.update { it.copy(isLoading = true) }
        // TODO: Fetch from API when chat endpoints are available on server
        _uiState.update { it.copy(isLoading = false) }
    }
}
