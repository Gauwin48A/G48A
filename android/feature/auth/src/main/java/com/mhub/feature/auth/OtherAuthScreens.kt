package com.mhub.feature.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
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

// ─── Signup Screen ───────────────────────────────────────────────────────

@Composable
fun SignupScreen(
    onSignupSuccess: () -> Unit,
    onNavigateToLogin: () -> Unit,
    viewModel: SignupViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) onSignupSuccess()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp)
            .semantics { contentDescription = "Signup screen" },
        verticalArrangement = Arrangement.Center,
    ) {
        Text("Create Account", style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(8.dp))
        Text("Join MHub today", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(modifier = Modifier.height(32.dp))

        OutlinedTextField(value = uiState.name, onValueChange = viewModel::updateName, label = { Text("Full Name") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(value = uiState.email, onValueChange = viewModel::updateEmail, label = { Text("Email") }, modifier = Modifier.fillMaxWidth(), singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email))
        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(value = uiState.phone, onValueChange = viewModel::updatePhone, label = { Text("Phone Number") }, modifier = Modifier.fillMaxWidth(), singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone))
        Spacer(modifier = Modifier.height(12.dp))

        var passwordVisible by remember { mutableStateOf(false) }
        OutlinedTextField(
            value = uiState.password, onValueChange = viewModel::updatePassword,
            label = { Text("Password") }, modifier = Modifier.fillMaxWidth(), singleLine = true,
            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
            trailingIcon = {
                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                    Icon(if (passwordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff, contentDescription = "Toggle password")
                }
            },
        )
        Spacer(modifier = Modifier.height(16.dp))

        uiState.errorMessage?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall) }

        Spacer(modifier = Modifier.height(8.dp))

        Button(onClick = viewModel::signup, modifier = Modifier.fillMaxWidth().height(50.dp), enabled = !uiState.isLoading) {
            if (uiState.isLoading) CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
            else Text("Create Account")
        }

        Spacer(modifier = Modifier.height(24.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Already have an account?", style = MaterialTheme.typography.bodyMedium)
            TextButton(onClick = onNavigateToLogin) { Text("Sign In") }
        }
    }
}

// ─── Forgot Password Screen ──────────────────────────────────────────────

@Composable
fun ForgotPasswordScreen(
    onBack: () -> Unit,
    viewModel: ForgotPasswordViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Reset Password") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            Text("Forgot your password?", style = MaterialTheme.typography.headlineSmall)
            Spacer(modifier = Modifier.height(8.dp))
            Text("Enter your email or phone and we'll send you a reset link.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.height(24.dp))

            OutlinedTextField(value = uiState.identifier, onValueChange = viewModel::updateIdentifier, label = { Text("Email or Phone") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            Spacer(modifier = Modifier.height(16.dp))

            uiState.message?.let {
                Text(it, color = if (uiState.isSuccess) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                Spacer(modifier = Modifier.height(8.dp))
            }

            Button(onClick = viewModel::submit, modifier = Modifier.fillMaxWidth().height(50.dp), enabled = !uiState.isLoading) {
                if (uiState.isLoading) CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                else Text("Send Reset Link")
            }
        }
    }
}

// ─── ViewModels ──────────────────────────────────────────────────────────

data class SignupUiState(
    val name: String = "", val email: String = "", val phone: String = "", val password: String = "",
    val isLoading: Boolean = false, val isSuccess: Boolean = false, val errorMessage: String? = null,
)

@HiltViewModel
class SignupViewModel @Inject constructor(private val authRepository: AuthRepository) : ViewModel() {
    private val _uiState = MutableStateFlow(SignupUiState())
    val uiState = _uiState.asStateFlow()

    fun updateName(v: String) { _uiState.update { it.copy(name = v, errorMessage = null) } }
    fun updateEmail(v: String) { _uiState.update { it.copy(email = v, errorMessage = null) } }
    fun updatePhone(v: String) { _uiState.update { it.copy(phone = v, errorMessage = null) } }
    fun updatePassword(v: String) { _uiState.update { it.copy(password = v, errorMessage = null) } }

    fun signup() {
        val s = _uiState.value
        if (s.name.isBlank() || s.email.isBlank() || s.phone.isBlank() || s.password.length < 6) {
            _uiState.update { it.copy(errorMessage = "Please fill all fields (password min 6 chars)") }; return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            when (val result = authRepository.signup(s.name, s.email, s.phone, s.password)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, isSuccess = true) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, errorMessage = result.message ?: "Signup failed") }
                is Result.Loading -> {}
            }
        }
    }
}

data class ForgotPasswordUiState(
    val identifier: String = "", val isLoading: Boolean = false, val isSuccess: Boolean = false, val message: String? = null,
)

@HiltViewModel
class ForgotPasswordViewModel @Inject constructor(private val authRepository: AuthRepository) : ViewModel() {
    private val _uiState = MutableStateFlow(ForgotPasswordUiState())
    val uiState = _uiState.asStateFlow()

    fun updateIdentifier(v: String) { _uiState.update { it.copy(identifier = v, message = null) } }

    fun submit() {
        if (_uiState.value.identifier.isBlank()) { _uiState.update { it.copy(message = "Please enter email or phone") }; return }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            when (val result = authRepository.forgotPassword(_uiState.value.identifier)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, isSuccess = true, message = result.data) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, message = result.message ?: "Request failed") }
                is Result.Loading -> {}
            }
        }
    }
}

// ─── Reset Password Screen ──────────────────────────────────────────────

@Composable
fun ResetPasswordScreen(
    token: String,
    onResetSuccess: () -> Unit,
    onBack: () -> Unit,
    viewModel: ResetPasswordViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(token) { viewModel.setToken(token) }
    LaunchedEffect(uiState.isSuccess) { if (uiState.isSuccess) onResetSuccess() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("New Password") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier.fillMaxSize().padding(padding).padding(24.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            Text("Create New Password", style = MaterialTheme.typography.headlineSmall)
            Spacer(Modifier.height(8.dp))
            Text("Enter your new password below", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(24.dp))

            var passwordVisible by remember { mutableStateOf(false) }
            OutlinedTextField(
                value = uiState.password, onValueChange = viewModel::updatePassword,
                label = { Text("New Password") }, modifier = Modifier.fillMaxWidth(), singleLine = true,
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(if (passwordVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff, "Toggle")
                    }
                },
            )
            Spacer(Modifier.height(12.dp))

            var confirmVisible by remember { mutableStateOf(false) }
            OutlinedTextField(
                value = uiState.confirmPassword, onValueChange = viewModel::updateConfirmPassword,
                label = { Text("Confirm Password") }, modifier = Modifier.fillMaxWidth(), singleLine = true,
                visualTransformation = if (confirmVisible) VisualTransformation.None else PasswordVisualTransformation(),
                trailingIcon = {
                    IconButton(onClick = { confirmVisible = !confirmVisible }) {
                        Icon(if (confirmVisible) Icons.Filled.Visibility else Icons.Filled.VisibilityOff, "Toggle")
                    }
                },
            )
            Spacer(Modifier.height(16.dp))

            uiState.message?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                Spacer(Modifier.height(8.dp))
            }

            Button(onClick = viewModel::submit, modifier = Modifier.fillMaxWidth().height(50.dp), enabled = !uiState.isLoading) {
                if (uiState.isLoading) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                else Text("Reset Password")
            }
        }
    }
}

data class ResetPasswordUiState(
    val token: String = "",
    val password: String = "",
    val confirmPassword: String = "",
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val message: String? = null,
)

@HiltViewModel
class ResetPasswordViewModel @Inject constructor(
    private val authRepository: AuthRepository,
) : ViewModel() {
    private val _uiState = MutableStateFlow(ResetPasswordUiState())
    val uiState = _uiState.asStateFlow()

    fun setToken(token: String) { _uiState.update { it.copy(token = token) } }
    fun updatePassword(v: String) { _uiState.update { it.copy(password = v, message = null) } }
    fun updateConfirmPassword(v: String) { _uiState.update { it.copy(confirmPassword = v, message = null) } }

    fun submit() {
        val s = _uiState.value
        if (s.password.length < 6) { _uiState.update { it.copy(message = "Password must be at least 6 characters") }; return }
        if (s.password != s.confirmPassword) { _uiState.update { it.copy(message = "Passwords do not match") }; return }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            when (val result = authRepository.resetPassword(s.token, s.password)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, isSuccess = true) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, message = result.message ?: "Reset failed") }
                is Result.Loading -> {}
            }
        }
    }
}
