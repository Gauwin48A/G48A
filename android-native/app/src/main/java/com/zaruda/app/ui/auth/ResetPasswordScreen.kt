package com.zaruda.app.ui.auth
import com.zaruda.app.ui.theme.ColorTokens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random
import kotlinx.coroutines.delay
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ResetPasswordUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val success: Boolean = false,
)

@HiltViewModel
class ResetPasswordViewModel @Inject constructor(
    private val repo: AuthRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ResetPasswordUiState())
    val state: StateFlow<ResetPasswordUiState> = _state.asStateFlow()

    fun submit(token: String, newPassword: String, confirmPassword: String) {
        if (_state.value.loading) return
        if (newPassword.isBlank() || confirmPassword.isBlank()) {
            _state.value = _state.value.copy(error = "Please fill in all fields")
            return
        }
        if (newPassword != confirmPassword) {
            _state.value = _state.value.copy(error = "Passwords do not match")
            return
        }
        val hasUpper = newPassword.any { it.isUpperCase() }
        val hasLower = newPassword.any { it.isLowerCase() }
        val hasDigit = newPassword.any { it.isDigit() }
        val hasSpecial = newPassword.any { it in "!@#\$%^&*" }
        val isLong = newPassword.length >= 12
        if (!isLong || !hasUpper || !hasLower || !hasDigit || !hasSpecial) {
            _state.value = _state.value.copy(
                error = "Password must be 12+ chars with uppercase, lowercase, number, and special char (!@#\$%^&*)"
            )
            return
        }
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val res = repo.resetPassword(token, newPassword)) {
                is ApiResult.Success -> _state.value = ResetPasswordUiState(success = true)
                is ApiResult.Failure -> _state.value = _state.value.copy(
                    loading = false, error = res.error.message,
                )
            }
        }
    }
}

@Composable
fun ResetPasswordScreen(
    token: String,
    onBack: () -> Unit,
    onGoToLogin: () -> Unit,
    viewModel: ResetPasswordViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var password by rememberSaveable { mutableStateOf("") }
    var confirmPassword by rememberSaveable { mutableStateOf("") }
    var showPw by rememberSaveable { mutableStateOf(false) }
    var showConfirm by rememberSaveable { mutableStateOf(false) }

    val darkTheme = ColorTokens.isDarkTheme()
    val pageGradient = Brush.verticalGradient(if (darkTheme) listOf(Color(0xFF0F1422), Color(0xFF161D2D), Color(0xFF1A2540)) else listOf(Color(0xFFF0F9FF), Color(0xFFEFF6FF), Color(0xFFE0E7FF)))
    val brandGradient = Brush.horizontalGradient(if (darkTheme) listOf(Color(0xFF1E3A5F), Color(0xFF2563EB)) else listOf(Color(0xFF3B82F6), Color(0xFF2563EB)))
    val linkColor = if (darkTheme) Color(0xFF93C5FD) else Color(0xFF2563EB)
    val labelText = if (darkTheme) Color(0xFFE2E8F0) else Color(0xFF374151)
    val borderColor = if (darkTheme) Color(0xFF334155) else Color(0xFFE5E7EB)

    Box(modifier = Modifier.fillMaxSize().background(pageGradient)) {
        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding()
                .padding(WindowInsets.statusBars.asPaddingValues())
                .padding(horizontal = 16.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().widthIn(max = 460.dp).clickable { onBack() },
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = linkColor, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("Back to Login", color = linkColor, fontSize = 14.sp, fontWeight = FontWeight.Medium)
            }
            Spacer(Modifier.height(20.dp))
            Surface(
                modifier = Modifier.fillMaxWidth().widthIn(max = 460.dp)
                    .shadow(16.dp, RoundedCornerShape(24.dp)),
                shape = RoundedCornerShape(24.dp), color = if (darkTheme) Color(0xFF1E293B) else Color.White,
            ) {
                Column(Modifier.fillMaxWidth()) {
                    Column(
                        Modifier.fillMaxWidth().background(brandGradient).padding(vertical = 26.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Box(
                            Modifier.size(56.dp).clip(RoundedCornerShape(16.dp))
                                .background(Color.White.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                if (state.success) Icons.Filled.CheckCircle else Icons.Filled.Lock,
                                null, tint = Color.White, modifier = Modifier.size(28.dp),
                            )
                        }
                        Spacer(Modifier.height(14.dp))
                        Text(
                            if (state.success) "Password Reset!" else "Reset Password",
                            color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp,
                        )
                        Spacer(Modifier.height(4.dp))
                        Text(
                            if (state.success) "Redirecting to login…" else "Create a new secure password",
                            color = Color(0xFFDBEAFE), fontSize = 13.sp,
                        )
                    }
                    Column(
                        Modifier.fillMaxWidth().padding(24.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                    ) {
                        state.error?.let { msg ->
                            Row(
                                Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp))
                                    .background(if (darkTheme) Color(0xFF451A03) else Color(0xFFFFFBEB)).padding(12.dp),
                                verticalAlignment = Alignment.Top,
                            ) {
                                Icon(Icons.Filled.WarningAmber, null, tint = if (darkTheme) Color(0xFFFBBF24) else Color(0xFFB45309), modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(msg, color = if (darkTheme) Color(0xFFFDE68A) else Color(0xFF92400E), fontSize = 12.sp)
                            }
                        }
                        if (state.success) {
                            Text(
                                "Your password has been reset successfully.",
                                color = if (darkTheme) Color(0xFF94A3B8) else Color(0xFF6B7280), fontSize = 14.sp,
                            )
                            // Auto-redirect after 3 seconds
                            LaunchedEffect(Unit) {
                                kotlinx.coroutines.delay(3000)
                                onGoToLogin()
                            }
                            GradientButton("Go to Login", brandGradient, true) { onGoToLogin() }
                        } else {
                            // Password requirements derived from password value
                            val hasUpper = password.any { it.isUpperCase() }
                            val hasLower = password.any { it.isLowerCase() }
                            val hasDigit = password.any { it.isDigit() }
                            val hasSpecial = password.any { it in "!@#\$%^&*" }
                            val isLong = password.length >= 12
                            val allMet = hasUpper && hasLower && hasDigit && hasSpecial && isLong

                            Text("New Password", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = labelText)
                            OutlinedTextField(
                                value = password, onValueChange = { password = it },
                                placeholder = { Text("Enter new password", color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8)) },
                                singleLine = true, shape = RoundedCornerShape(12.dp),
                                visualTransformation = if (showPw) VisualTransformation.None else PasswordVisualTransformation(),
                                trailingIcon = {
                                    IconButton(onClick = { showPw = !showPw }) {
                                        Icon(if (showPw) Icons.Filled.VisibilityOff else Icons.Filled.Visibility, null, tint = Color(0xFF6B7280))
                                    }
                                },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = if (darkTheme) Color(0xFF60A5FA) else Color(0xFF3B82F6), unfocusedBorderColor = borderColor,
                                    focusedContainerColor = if (darkTheme) Color(0xFF1E293B) else Color.White, unfocusedContainerColor = if (darkTheme) Color(0xFF1E293B) else Color.White,
                                ),
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                            )
                            if (password.isNotEmpty()) {
                                Surface(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(10.dp),
                                    color = if (darkTheme) Color(0xFF1E293B) else Color(0xFFF8FAFC),
                                ) {
                                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                                        Text("Password requirements", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = if (darkTheme) Color(0xFF94A3B8) else Color(0xFF64748B))
                                        PasswordReqRow("12+ characters", isLong)
                                        PasswordReqRow("Uppercase letter (A-Z)", hasUpper)
                                        PasswordReqRow("Lowercase letter (a-z)", hasLower)
                                        PasswordReqRow("Number (0-9)", hasDigit)
                                        PasswordReqRow("Special character (!@#\$%^&*)", hasSpecial)
                                    }
                                }
                            }
                            Text("Confirm Password", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = labelText)
                            OutlinedTextField(
                                value = confirmPassword, onValueChange = { confirmPassword = it },
                                placeholder = { Text("Confirm new password", color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8)) },
                                singleLine = true, shape = RoundedCornerShape(12.dp),
                                visualTransformation = if (showConfirm) VisualTransformation.None else PasswordVisualTransformation(),
                                trailingIcon = {
                                    IconButton(onClick = { showConfirm = !showConfirm }) {
                                        Icon(if (showConfirm) Icons.Filled.VisibilityOff else Icons.Filled.Visibility, null, tint = Color(0xFF6B7280))
                                    }
                                },
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = if (darkTheme) Color(0xFF60A5FA) else Color(0xFF3B82F6), unfocusedBorderColor = borderColor,
                                    focusedContainerColor = if (darkTheme) Color(0xFF1E293B) else Color.White, unfocusedContainerColor = if (darkTheme) Color(0xFF1E293B) else Color.White,
                                ),
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                            )
                            // Instant red mismatch warning pill (live, before submit).
                            if (confirmPassword.isNotBlank() && confirmPassword != password) {
                                Surface(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(10.dp),
                                    color = Color(0xFFEF4444).copy(alpha = if (darkTheme) 0.18f else 0.10f),
                                ) {
                                    Row(
                                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 9.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        Icon(
                                            Icons.Filled.WarningAmber,
                                            null,
                                            tint = if (darkTheme) Color(0xFFFCA5A5) else Color(0xFFDC2626),
                                            modifier = Modifier.size(16.dp),
                                        )
                                        Text(
                                            "Passwords do not match",
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.SemiBold,
                                            color = if (darkTheme) Color(0xFFFECACA) else Color(0xFFB91C1C),
                                        )
                                    }
                                }
                            }
                            val canSubmit = !state.loading && password.isNotBlank() && confirmPassword.isNotBlank() && allMet
                            GradientButton(
                                if (state.loading) "Resetting…" else "Reset Password",
                                brandGradient, canSubmit,
                            ) { viewModel.submit(token, password, confirmPassword) }
                        }
                    }
                }
            }
            Spacer(Modifier.height(24.dp))
        }

        // CRED-style confetti celebration on successful reset.
        if (state.success) {
            ConfettiOverlay()
        }
    }
}

private data class ConfettiParticle(
    val startX: Float,
    val startY: Float,
    val velocity: Float,
    val angle: Float,
    val size: Float,
    val spin: Float,
    val color: Color,
)

@Composable
private fun ConfettiOverlay() {
    val confettiColors = listOf(
        Color(0xFFF59E0B),
        Color(0xFF10B981),
        Color(0xFF3B82F6),
        Color(0xFFF87171),
        Color(0xFFA78BFA),
        Color(0xFFFDE68A),
        Color.White,
    )
    val particles = remember {
        List(110) { index ->
            val rng = Random(index * 7919L + 17)
            ConfettiParticle(
                startX = 0.5f + (rng.nextFloat() - 0.5f) * 0.12f,
                startY = 0.32f,
                velocity = 0.30f + rng.nextFloat() * 0.45f,
                angle = (-90f + (rng.nextFloat() - 0.5f) * 110f) * (PI.toFloat() / 180f),
                size = 5f + rng.nextFloat() * 7f,
                spin = (rng.nextFloat() - 0.5f) * 900f,
                color = confettiColors[index % confettiColors.size],
            )
        }
    }
    val progress = remember { Animatable(0f) }
    val haptic = LocalHapticFeedback.current
    LaunchedEffect(Unit) {
        // Heavy celebratory thud.
        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
        delay(70)
        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
        progress.animateTo(1f, animationSpec = tween(1400, easing = FastOutSlowInEasing))
    }

    Canvas(modifier = Modifier.fillMaxSize()) {
        val t = progress.value
        val gravity = 1.35f
        particles.forEach { p ->
            val travel = p.velocity * t
            val x = (p.startX + cos(p.angle) * travel * 0.6f) * size.width
            val y = (p.startY + sin(p.angle) * travel + gravity * t * t * 0.55f) * size.height
            if (y > size.height * 1.15f) return@forEach
            val alpha = (1f - t).coerceIn(0f, 1f)
            val rectSize = p.size * (if (t < 0.5f) 1f else 1f - (t - 0.5f) * 0.6f)
            withTransform({
                translate(left = x, top = y)
                rotate(degrees = p.spin * t, pivot = androidx.compose.ui.geometry.Offset(rectSize / 2f, rectSize / 2f))
            }) {
                drawRect(
                    color = p.color.copy(alpha = alpha),
                    topLeft = androidx.compose.ui.geometry.Offset.Zero,
                    size = androidx.compose.ui.geometry.Size(rectSize, rectSize * 0.55f),
                )
            }
        }
    }
}

@Composable
private fun PasswordReqRow(label: String, met: Boolean) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        Icon(
            if (met) Icons.Filled.CheckCircle else Icons.Filled.Lock,
            null,
            tint = if (met) Color(0xFF22C55E) else Color(0xFFCBD5E1),
            modifier = Modifier.size(14.dp),
        )
        Text(label, fontSize = 11.sp, color = if (met) Color(0xFF166534) else Color(0xFF94A3B8))
    }
}

@Composable
private fun GradientButton(text: String, gradient: Brush, enabled: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick, enabled = enabled,
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, disabledContainerColor = Color.Transparent),
        contentPadding = PaddingValues(0.dp),
        modifier = Modifier.fillMaxWidth().height(48.dp),
    ) {
        Box(
            Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp)).background(
                if (enabled) gradient else Brush.horizontalGradient(listOf(Color(0xFFCBD5E1), Color(0xFFCBD5E1))),
            ),
            contentAlignment = Alignment.Center,
        ) {
            Text(text, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        }
    }
}
