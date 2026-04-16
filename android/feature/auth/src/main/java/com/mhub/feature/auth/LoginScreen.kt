package com.mhub.feature.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
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
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onNavigateToSignup: () -> Unit,
    onNavigateToForgotPassword: () -> Unit,
    onNavigateToOtpLogin: () -> Unit = {},
    viewModel: LoginViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val focusManager = LocalFocusManager.current

    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) onLoginSuccess()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(24.dp)
            .semantics { contentDescription = "Login screen" },
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = "Welcome to MHub",
            style = MaterialTheme.typography.headlineMedium,
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = "Sign in to continue",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        Spacer(modifier = Modifier.height(32.dp))

        // Identifier field
        OutlinedTextField(
            value = uiState.identifier,
            onValueChange = viewModel::updateIdentifier,
            label = { Text("Email or Phone") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Email,
                imeAction = ImeAction.Next,
            ),
            keyboardActions = KeyboardActions(
                onNext = { focusManager.moveFocus(FocusDirection.Down) },
            ),
            isError = uiState.identifierError != null,
            supportingText = uiState.identifierError?.let { { Text(it) } },
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Password field
        var passwordVisible by remember { mutableStateOf(false) }
        OutlinedTextField(
            value = uiState.password,
            onValueChange = viewModel::updatePassword,
            label = { Text("Password") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            visualTransformation = if (passwordVisible) VisualTransformation.None
            else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Done,
            ),
            keyboardActions = KeyboardActions(
                onDone = {
                    focusManager.clearFocus()
                    viewModel.login()
                },
            ),
            trailingIcon = {
                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                    Icon(
                        imageVector = if (passwordVisible) Icons.Filled.Visibility
                        else Icons.Filled.VisibilityOff,
                        contentDescription = if (passwordVisible) "Hide password" else "Show password",
                    )
                }
            },
            isError = uiState.passwordError != null,
            supportingText = uiState.passwordError?.let { { Text(it) } },
        )

        Spacer(modifier = Modifier.height(8.dp))

        // Forgot password
        TextButton(
            onClick = onNavigateToForgotPassword,
            modifier = Modifier.align(Alignment.End),
        ) {
            Text("Forgot Password?")
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Error message
        uiState.errorMessage?.let { error ->
            Text(
                text = error,
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.padding(bottom = 8.dp),
            )
        }

        // Login button
        Button(
            onClick = viewModel::login,
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp),
            enabled = !uiState.isLoading,
        ) {
            if (uiState.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary,
                )
            } else {
                Text("Sign In")
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Sign up link
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Don't have an account?", style = MaterialTheme.typography.bodyMedium)
            TextButton(onClick = onNavigateToSignup) {
                Text("Sign Up")
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedButton(
            onClick = onNavigateToOtpLogin,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Sign in with OTP")
        }
    }
}
