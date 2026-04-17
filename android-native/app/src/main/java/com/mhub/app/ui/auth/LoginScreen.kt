package com.mhub.app.ui.auth

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.mhub.app.BuildConfig
import com.mhub.app.R
import com.mhub.app.ui.components.ErrorBanner
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
                .padding(horizontal = 32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = stringResource(R.string.app_name),
                style = MaterialTheme.typography.displayLarge,
                color = MaterialTheme.colorScheme.primary,
            )
            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.login_title),
                style = MaterialTheme.typography.headlineMedium,
                textAlign = TextAlign.Center,
            )
            Text(
                text = stringResource(R.string.login_subtitle),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 4.dp),
            )
            Spacer(Modifier.height(32.dp))

            ErrorBanner(message = state.error)

            Button(
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
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color(0xFF1A73E8),
                    contentColor = Color.White,
                ),
            ) {
                if (state.loading) {
                    CircularProgressIndicator(
                        color = Color.White,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(20.dp),
                    )
                } else {
                    Text(stringResource(R.string.action_sign_in_google), style = MaterialTheme.typography.titleMedium)
                }
            }

            Spacer(Modifier.height(24.dp))
            Text(
                stringResource(R.string.login_legal),
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
