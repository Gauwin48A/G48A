package com.mhub.app.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val success: Boolean = false,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val repo: AuthRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    val isAuthenticated: StateFlow<Boolean> =
        repo.isAuthenticated.stateIn(viewModelScope, SharingStarted.Eagerly, false)

    fun clearError() { _state.value = _state.value.copy(error = null) }

    fun signInWithGoogle(idToken: String) {
        if (_state.value.loading) return
        _state.value = AuthUiState(loading = true)
        viewModelScope.launch {
            when (val res = repo.signInWithGoogle(idToken)) {
                is ApiResult.Success -> _state.value = AuthUiState(loading = false, success = true)
                is ApiResult.Failure -> _state.value = AuthUiState(loading = false, error = res.error.message)
            }
        }
    }

    fun onGoogleError(message: String) {
        _state.value = AuthUiState(loading = false, error = message)
    }

    fun logout() {
        viewModelScope.launch { repo.logout() }
    }
}
