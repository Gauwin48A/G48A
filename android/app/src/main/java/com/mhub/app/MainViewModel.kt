package com.mhub.app

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.core.common.util.ConnectivityObserver
import com.mhub.core.common.util.ConnectivityStatus
import com.mhub.core.data.repository.AuthRepository
import com.mhub.core.data.repository.NotificationRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val notificationRepository: NotificationRepository,
    connectivityObserver: ConnectivityObserver,
) : ViewModel() {

    val isAuthenticated = authRepository.isAuthenticated
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    val unreadNotificationCount = notificationRepository.observeUnreadCount()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), 0)

    val connectivityStatus = connectivityObserver.observe()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ConnectivityStatus.AVAILABLE)

    fun bootstrap() {
        viewModelScope.launch {
            authRepository.bootstrapCsrf()
            authRepository.checkSession()
        }
    }
}
