package com.mhub.feature.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.core.common.result.Result
import com.mhub.core.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

// ─── OTP Login Screen ────────────────────────────────────────────────────

data class OtpLoginUiState(
    val phone: String = "",
    val otp: String = "",
    val step: OtpStep = OtpStep.ENTER_PHONE,
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val message: String? = null,
    val errorMessage: String? = null,
)

enum class OtpStep { ENTER_PHONE, ENTER_OTP }

@Composable
fun OtpLoginScreen(
    onLoginSuccess: () -> Unit,
    onBack: () -> Unit,
    viewModel: OtpLoginViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current

    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) onLoginSuccess()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Sign in with OTP") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(24.dp)
                .semantics { contentDescription = "OTP login screen" },
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            when (uiState.step) {
                OtpStep.ENTER_PHONE -> {
                    Text(
                        "Enter your phone number",
                        style = MaterialTheme.typography.headlineSmall,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "We'll send you a one-time verification code",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(32.dp))

                    OutlinedTextField(
                        value = uiState.phone,
                        onValueChange = viewModel::updatePhone,
                        label = { Text("Phone Number") },
                        placeholder = { Text("+1 234 567 8900") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Phone,
                            imeAction = ImeAction.Done,
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = {
                                focusManager.clearFocus()
                                viewModel.sendOtp()
                            },
                        ),
                    )

                    Spacer(Modifier.height(24.dp))

                    uiState.errorMessage?.let { error ->
                        Text(
                            error,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(bottom = 8.dp),
                        )
                    }

                    Button(
                        onClick = viewModel::sendOtp,
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        enabled = !uiState.isLoading && uiState.phone.isNotBlank(),
                    ) {
                        if (uiState.isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.onPrimary,
                            )
                        } else {
                            Text("Send OTP")
                        }
                    }
                }

                OtpStep.ENTER_OTP -> {
                    Text(
                        "Enter verification code",
                        style = MaterialTheme.typography.headlineSmall,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        "Code sent to ${uiState.phone}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(32.dp))

                    OutlinedTextField(
                        value = uiState.otp,
                        onValueChange = viewModel::updateOtp,
                        label = { Text("Verification Code") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Number,
                            imeAction = ImeAction.Done,
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = {
                                focusManager.clearFocus()
                                viewModel.verifyOtp()
                            },
                        ),
                    )

                    Spacer(Modifier.height(24.dp))

                    uiState.message?.let { msg ->
                        Text(
                            msg,
                            color = MaterialTheme.colorScheme.primary,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(bottom = 4.dp),
                        )
                    }
                    uiState.errorMessage?.let { error ->
                        Text(
                            error,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(bottom = 8.dp),
                        )
                    }

                    Button(
                        onClick = viewModel::verifyOtp,
                        modifier = Modifier.fillMaxWidth().height(50.dp),
                        enabled = !uiState.isLoading && uiState.otp.length >= 4,
                    ) {
                        if (uiState.isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = MaterialTheme.colorScheme.onPrimary,
                            )
                        } else {
                            Text("Verify")
                        }
                    }

                    Spacer(Modifier.height(16.dp))

                    TextButton(onClick = viewModel::resendOtp) {
                        Text("Resend Code")
                    }

                    TextButton(onClick = { viewModel.goBackToPhone() }) {
                        Text("Change Phone Number")
                    }
                }
            }
        }
    }
}

// ─── OTP Login ViewModel ─────────────────────────────────────────────────

@HiltViewModel
class OtpLoginViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(OtpLoginUiState())
    val uiState = _uiState.asStateFlow()

    fun updatePhone(phone: String) {
        _uiState.update { it.copy(phone = phone, errorMessage = null) }
    }

    fun updateOtp(otp: String) {
        if (otp.length <= 6) {
            _uiState.update { it.copy(otp = otp, errorMessage = null) }
        }
    }

    fun sendOtp() {
        val phone = _uiState.value.phone.trim()
        if (phone.isBlank()) {
            _uiState.update { it.copy(errorMessage = "Please enter your phone number") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            when (val result = authRepository.sendOtp(phone)) {
                is Result.Success -> _uiState.update {
                    it.copy(isLoading = false, step = OtpStep.ENTER_OTP, message = "Code sent!")
                }
                is Result.Error -> _uiState.update {
                    it.copy(isLoading = false, errorMessage = result.message ?: "Failed to send OTP")
                }
                is Result.Loading -> {}
            }
        }
    }

    fun verifyOtp() {
        val phone = _uiState.value.phone.trim()
        val otp = _uiState.value.otp.trim()

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            when (val result = authRepository.verifyOtp(phone, otp)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, isSuccess = true) }
                is Result.Error -> _uiState.update {
                    it.copy(isLoading = false, errorMessage = result.message ?: "Invalid code")
                }
                is Result.Loading -> {}
            }
        }
    }

    fun resendOtp() {
        sendOtp()
    }

    fun goBackToPhone() {
        _uiState.update { it.copy(step = OtpStep.ENTER_PHONE, otp = "", errorMessage = null, message = null) }
    }
}
