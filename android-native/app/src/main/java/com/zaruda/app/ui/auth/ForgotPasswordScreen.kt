package com.zaruda.app.ui.auth
import com.zaruda.app.ui.theme.ColorTokens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.R
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ForgotPasswordUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val sent: Boolean = false,
    val sentToIdentifier: String = "",
    val message: String? = null,
)

@HiltViewModel
class ForgotPasswordViewModel @Inject constructor(
    private val repo: AuthRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ForgotPasswordUiState())
    val state: StateFlow<ForgotPasswordUiState> = _state.asStateFlow()

    fun submit(identifier: String) {
        if (_state.value.loading) return
        if (identifier.isBlank()) {
            _state.value = _state.value.copy(error = "Enter your email, phone, or username.")
            return
        }
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val res = repo.forgotPassword(identifier)) {
                is ApiResult.Success -> _state.value = ForgotPasswordUiState(
                    loading = false,
                    sent = true,
                    sentToIdentifier = identifier,
                    message = res.data
                        ?: "If an account exists, reset instructions were sent.",
                )
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    loading = false,
                    error = res.error.message,
                )
            }
        }
    }

    fun reset() {
        _state.value = ForgotPasswordUiState()
    }
}

/**
 * ForgotPasswordScreen — Compose port of `Zaruda/client/src/pages/Auth/ForgotPassword.jsx`.
 */
@Composable
fun ForgotPasswordScreen(
    onBack: () -> Unit,
    viewModel: ForgotPasswordViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var identifier by rememberSaveable { mutableStateOf("") }
    @Suppress("UNUSED_VARIABLE") val scope = rememberCoroutineScope()

    val darkTheme = ColorTokens.isDarkTheme()
    val pageGradient = Brush.verticalGradient(
        if (darkTheme) listOf(Color(0xFF0F1422), Color(0xFF161D2D), Color(0xFF1A2540)) else listOf(Color(0xFFF0F9FF), Color(0xFFEFF6FF), Color(0xFFE0E7FF)),
    )
    val brandGradient = Brush.horizontalGradient(
        if (darkTheme) listOf(Color(0xFF1E3A5F), Color(0xFF2563EB)) else listOf(Color(0xFF3B82F6), Color(0xFF2563EB)), // blue-500 → blue-600
    )
    val mutedText = if (darkTheme) Color(0xFF94A3B8) else Color(0xFF6B7280)
    val labelText = if (darkTheme) Color(0xFFE2E8F0) else Color(0xFF374151)
    val borderColor = if (darkTheme) Color(0xFF334155) else Color(0xFFE5E7EB)
    val linkColor = if (darkTheme) Color(0xFF93C5FD) else Color(0xFF2563EB)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(pageGradient),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(WindowInsets.statusBars.asPaddingValues())
                .padding(horizontal = 16.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Back link
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 460.dp)
                    .clickable { onBack() },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = null,
                    tint = linkColor,
                    modifier = Modifier.size(16.dp),
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    text = stringResource(R.string.forgot_back_to_login),
                    color = linkColor,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                )
            }

            Spacer(Modifier.height(20.dp))

            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 460.dp)
                    .shadow(elevation = 16.dp, shape = RoundedCornerShape(24.dp)),
                shape = RoundedCornerShape(24.dp),
                color = if (darkTheme) Color(0xFF1E293B) else Color.White,
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    // Header gradient
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(brandGradient)
                            .padding(vertical = 26.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(Color.White.copy(alpha = 0.20f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                imageVector = if (state.sent) {
                                    Icons.Filled.CheckCircle
                                } else {
                                    Icons.Filled.Mail
                                },
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(28.dp),
                            )
                        }
                        Spacer(Modifier.height(14.dp))
                        Text(
                            text = stringResource(
                                if (state.sent) R.string.forgot_check_email
                                else R.string.forgot_title,
                            ),
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 22.sp,
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = stringResource(
                                if (state.sent) R.string.forgot_check_email_subtitle
                                else R.string.forgot_subtitle,
                            ),
                            color = Color(0xFFDBEAFE), // blue-100
                            fontSize = 13.sp,
                        )
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 24.dp, vertical = 24.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        // Status message
                        state.message?.let { msg ->
                            val isSuccess = state.sent
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(
                                        if (isSuccess) if (darkTheme) Color(0xFF064E3B) else Color(0xFFECFDF5)
                                        else if (darkTheme) Color(0xFF451A03) else Color(0xFFFFFBEB),
                                    )
                                    .padding(12.dp),
                                verticalAlignment = Alignment.Top,
                            ) {
                                Icon(
                                    imageVector = if (isSuccess) {
                                        Icons.Filled.CheckCircle
                                    } else {
                                        Icons.Filled.WarningAmber
                                    },
                                    contentDescription = null,
                                    tint = if (isSuccess) if (darkTheme) Color(0xFF34D399) else Color(0xFF047857) else if (darkTheme) Color(0xFFFBBF24) else Color(0xFFB45309),
                                    modifier = Modifier.size(16.dp),
                                )
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    text = msg,
                                    color = if (isSuccess) if (darkTheme) Color(0xFF6EE7B7) else Color(0xFF065F46) else if (darkTheme) Color(0xFFFDE68A) else Color(0xFF92400E),
                                    fontSize = 12.sp,
                                )
                            }
                        }
                        state.error?.let { msg ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(if (darkTheme) Color(0xFF451A03) else Color(0xFFFFFBEB))
                                    .padding(12.dp),
                                verticalAlignment = Alignment.Top,
                            ) {
                                Icon(
                                    imageVector = Icons.Filled.WarningAmber,
                                    contentDescription = null,
                                    tint = if (darkTheme) Color(0xFFFBBF24) else Color(0xFFB45309),
                                    modifier = Modifier.size(16.dp),
                                )
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    text = msg,
                                    color = if (darkTheme) Color(0xFFFDE68A) else Color(0xFF92400E),
                                    fontSize = 12.sp,
                                )
                            }
                        }

                        if (state.sent) {
                            Text(
                                text = "${stringResource(R.string.forgot_sent_to)} ${state.sentToIdentifier}. " +
                                    stringResource(R.string.forgot_check_inbox),
                                color = mutedText,
                                fontSize = 14.sp,
                            )
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = stringResource(R.string.forgot_didnt_receive),
                                    color = mutedText,
                                    fontSize = 13.sp,
                                )
                                Spacer(Modifier.width(4.dp))
                                TextButton(
                                    onClick = { viewModel.reset(); identifier = "" },
                                    contentPadding = PaddingValues(0.dp),
                                ) {
                                    Text(
                                        text = stringResource(R.string.forgot_try_again),
                                        color = linkColor,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Medium,
                                    )
                                }
                            }
                        } else {
                            Text(
                                text = stringResource(R.string.forgot_field_label),
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 14.sp,
                                color = labelText,
                            )
                            OutlinedTextField(
                                value = identifier,
                                onValueChange = { identifier = it },
                                placeholder = {
                                    Text(
                                        stringResource(R.string.forgot_field_placeholder),
                                        color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8),
                                    )
                                },
                                singleLine = true,
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = if (darkTheme) Color(0xFF60A5FA) else Color(0xFF3B82F6),
                                    unfocusedBorderColor = borderColor,
                                    focusedContainerColor = if (darkTheme) Color(0xFF1E293B) else Color.White,
                                    unfocusedContainerColor = if (darkTheme) Color(0xFF1E293B) else Color.White,
                                ),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(52.dp),
                            )

                            Button(
                                onClick = { viewModel.submit(identifier) },
                                enabled = !state.loading && identifier.isNotBlank(),
                                shape = RoundedCornerShape(12.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = Color.Transparent,
                                    disabledContainerColor = Color.Transparent,
                                ),
                                contentPadding = PaddingValues(0.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp),
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(
                                            if (!state.loading && identifier.isNotBlank()) {
                                                brandGradient
                                            } else {
                                                Brush.horizontalGradient(
                                                    listOf(Color(0xFFCBD5E1), Color(0xFFCBD5E1)),
                                                )
                                            },
                                        ),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    if (state.loading) {
                                        CircularProgressIndicator(
                                            color = Color.White,
                                            strokeWidth = 2.dp,
                                            modifier = Modifier.size(20.dp),
                                        )
                                    } else {
                                        Text(
                                            text = stringResource(R.string.forgot_send_button),
                                            color = Color.White,
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 16.sp,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

/** End of file. */
