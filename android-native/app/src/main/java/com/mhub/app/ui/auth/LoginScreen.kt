package com.mhub.app.ui.auth

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.mhub.app.BuildConfig
import com.mhub.app.R
import com.mhub.app.ui.components.AppTextField
import com.mhub.app.ui.components.ErrorBanner
import com.mhub.app.ui.components.PrimaryButton
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    onSignedIn: () -> Unit,
    onOpenSettings: () -> Unit,
    onPreviewApp: () -> Unit = {},
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

    LaunchedEffect(state.success) {
        if (state.success) onSignedIn()
    }

    Scaffold(containerColor = MaterialTheme.colorScheme.background) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .imePadding(),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(
                        Brush.verticalGradient(
                            listOf(
                                MaterialTheme.colorScheme.primary,
                                MaterialTheme.colorScheme.secondary,
                            ),
                        ),
                    )
                    .padding(horizontal = 20.dp)
                    .padding(top = 18.dp, bottom = 24.dp),
            ) {
                IconButton(
                    onClick = onOpenSettings,
                    modifier = Modifier
                        .statusBarsPadding()
                        .align(Alignment.TopEnd),
                ) {
                    Icon(
                        imageVector = Icons.Default.Settings,
                        contentDescription = stringResource(R.string.nav_settings),
                        tint = MaterialTheme.colorScheme.onPrimary,
                    )
                }

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 54.dp, bottom = 12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Surface(
                        shape = RoundedCornerShape(18.dp),
                        color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.18f),
                    ) {
                        Icon(
                            imageVector = Icons.Default.ShoppingBag,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.padding(16.dp),
                        )
                    }
                    Text(
                        text = stringResource(R.string.app_name),
                        style = MaterialTheme.typography.displayMedium,
                        color = MaterialTheme.colorScheme.onPrimary,
                        fontWeight = FontWeight.ExtraBold,
                    )
                    Text(
                        text = stringResource(R.string.auth_brand_subtitle),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.9f),
                    )
                }
            }

            Surface(
                shape = RoundedCornerShape(topStart = 26.dp, topEnd = 26.dp),
                color = MaterialTheme.colorScheme.surface,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp, vertical = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text(
                        text = if (isSignUp) {
                            stringResource(R.string.signup_title)
                        } else {
                            stringResource(R.string.login_title)
                        },
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        text = if (isSignUp) {
                            stringResource(R.string.signup_subtitle)
                        } else {
                            stringResource(R.string.login_subtitle)
                        },
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )

                    ErrorBanner(message = state.error)

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
                                    is GoogleSignInHelper.Result.Success -> {
                                        viewModel.signInWithGoogle(result.idToken)
                                    }

                                    is GoogleSignInHelper.Result.Error -> {
                                        viewModel.onGoogleError(result.message)
                                    }

                                    GoogleSignInHelper.Result.Cancelled -> Unit
                                }
                            }
                        },
                        enabled = !state.loading,
                        shape = RoundedCornerShape(16.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(stringResource(R.string.action_sign_in_google))
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        TextButton(onClick = {
                            isSignUp = false
                            viewModel.clearError()
                        }) {
                            Text(
                                text = stringResource(R.string.auth_tab_signin),
                                fontWeight = if (!isSignUp) FontWeight.Bold else FontWeight.Medium,
                            )
                        }
                        Spacer(Modifier.width(6.dp))
                        TextButton(onClick = {
                            isSignUp = true
                            viewModel.clearError()
                        }) {
                            Text(
                                text = stringResource(R.string.auth_tab_signup),
                                fontWeight = if (isSignUp) FontWeight.Bold else FontWeight.Medium,
                            )
                        }
                    }

                    AnimatedVisibility(visible = isSignUp) {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            AppTextField(
                                value = fullName,
                                onValueChange = { fullName = it },
                                label = stringResource(R.string.field_full_name),
                            )
                            AppTextField(
                                value = email,
                                onValueChange = { email = it },
                                label = stringResource(R.string.field_email),
                                keyboardType = KeyboardType.Email,
                            )
                            AppTextField(
                                value = phone,
                                onValueChange = { phone = it },
                                label = stringResource(R.string.field_phone),
                                keyboardType = KeyboardType.Phone,
                            )
                        }
                    }

                    AnimatedVisibility(visible = !isSignUp) {
                        AppTextField(
                            value = identifier,
                            onValueChange = { identifier = it },
                            label = stringResource(R.string.field_identifier),
                            keyboardType = KeyboardType.Email,
                        )
                    }

                    AppTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = stringResource(R.string.field_password),
                        isPassword = true,
                    )

                    PrimaryButton(
                        text = if (isSignUp) {
                            stringResource(R.string.action_create_account)
                        } else {
                            stringResource(R.string.action_sign_in)
                        },
                        loading = state.loading,
                        onClick = {
                            viewModel.clearError()
                            if (isSignUp) {
                                viewModel.signUp(fullName, email, phone, password)
                            } else {
                                viewModel.signInWithEmail(identifier, password)
                            }
                        },
                    )

                    if (BuildConfig.DEBUG) {
                        OutlinedButton(
                            onClick = onPreviewApp,
                            shape = RoundedCornerShape(16.dp),
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text("Preview app (debug)")
                        }
                    }

                    Text(
                        text = stringResource(R.string.login_legal),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 6.dp, bottom = 8.dp),
                    )
                }
            }
        }
    }
}
