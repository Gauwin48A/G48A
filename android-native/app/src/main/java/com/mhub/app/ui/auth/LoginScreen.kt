package com.mhub.app.ui.auth

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.mhub.app.BuildConfig
import com.mhub.app.R
import com.mhub.app.ui.components.AppTextField
import com.mhub.app.ui.components.ErrorBanner
import com.mhub.app.ui.components.PrimaryButton
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onSignedIn: () -> Unit,
    onOpenSettings: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var isSignUp by rememberSaveable { mutableStateOf(false) }
    var identifier by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var fullName by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var phone by rememberSaveable { mutableStateOf("") }

    LaunchedEffect(state.success) { if (state.success) onSignedIn() }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = {},
                actions = {
                    IconButton(onClick = onOpenSettings) {
                        Icon(Icons.Default.Settings, contentDescription = stringResource(R.string.nav_settings))
                    }
                },
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(24.dp))

            Text(
                text = stringResource(R.string.app_name),
                style = MaterialTheme.typography.displayLarge,
                color = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = if (isSignUp) stringResource(R.string.signup_title) else stringResource(R.string.login_title),
                style = MaterialTheme.typography.headlineMedium,
                textAlign = TextAlign.Center,
            )
            Text(
                text = if (isSignUp) stringResource(R.string.signup_subtitle) else stringResource(R.string.login_subtitle),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 4.dp),
            )
            Spacer(Modifier.height(24.dp))

            ErrorBanner(message = state.error)

            AnimatedVisibility(visible = isSignUp) {
                Column {
                    AppTextField(
                        value = fullName,
                        onValueChange = { fullName = it },
                        label = stringResource(R.string.field_full_name),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(12.dp))
                    AppTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = stringResource(R.string.field_email),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(12.dp))
                    AppTextField(
                        value = phone,
                        onValueChange = { phone = it },
                        label = stringResource(R.string.field_phone),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(12.dp))
                }
            }

            AnimatedVisibility(visible = !isSignUp) {
                Column {
                    AppTextField(
                        value = identifier,
                        onValueChange = { identifier = it },
                        label = stringResource(R.string.field_identifier),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Spacer(Modifier.height(12.dp))
                }
            }

            AppTextField(
                value = password,
                onValueChange = { password = it },
                label = stringResource(R.string.field_password),
                isPassword = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(20.dp))

            PrimaryButton(
                text = if (isSignUp) stringResource(R.string.action_create_account) else stringResource(R.string.action_sign_in),
                loading = state.loading,
                onClick = {
                    viewModel.clearError()
                    if (isSignUp) {
                        viewModel.signUp(fullName, email, phone, password)
                    } else {
                        viewModel.signInWithEmail(identifier, password)
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(12.dp))
            TextButton(onClick = {
                isSignUp = !isSignUp
                viewModel.clearError()
            }) {
                Text(
                    if (isSignUp) stringResource(R.string.action_sign_in_prompt)
                    else stringResource(R.string.action_sign_up_prompt),
                    style = MaterialTheme.typography.bodyMedium,
                )
            }

            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
            ) {
                HorizontalDivider(Modifier.weight(1f))
                Text(
                    "  OR  ",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                HorizontalDivider(Modifier.weight(1f))
            }

            OutlinedButton(
                onClick = {
                    viewModel.clearError()
                    scope.launch {
                        val result = GoogleSignInHelper.signIn(
                            context = context,
                            webClientId = BuildConfig.GOOGLE_WEB_CLIENT_ID,
                            filterByAuthorizedAccounts = true,
                        )
                        when (result) {
                            is GoogleSignInHelper.Result.Success -> viewModel.signInWithGoogle(result.idToken)
                            is GoogleSignInHelper.Result.Error -> viewModel.onGoogleError(result.message)
                            GoogleSignInHelper.Result.Cancelled -> Unit
                        }
                    }
                },
                enabled = !state.loading,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(16.dp),
            ) {
                Text(stringResource(R.string.action_sign_in_google), style = MaterialTheme.typography.titleMedium)
            }

            Spacer(Modifier.height(20.dp))
            Text(
                stringResource(R.string.login_legal),
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(32.dp))
        }
    }
}
