package com.zaruda.app.ui.auth
import com.zaruda.app.ui.theme.ColorTokens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Fingerprint
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import kotlin.math.roundToInt
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.zaruda.app.R

/**
 * LoginScreen — pixel-faithful Compose port of `Zaruda/client/src/pages/Auth/Login.jsx`.
 *
 * Visual structure (matches web):
 *   - Light sky/blue gradient background
 *   - Back button (top-left)
 *   - Centered shield icon in blue gradient rounded box
 *   - "Welcome Back" h2 + "Sign in with your mobile number" subtitle
 *   - Card (rounded-2xl, shadow-xl):
 *       - Header band (sky-500 → blue-600 gradient): "Sign In" + "Use your Aadhaar-registered mobile number"
 *       - Body: +91 mobile field, password field with eye toggle,
 *               "Don't have an account? Sign up here" + "Forgot Password?",
 *               error banner, Sign In button (gradient).
 *
 * Backend wiring re-uses [AuthViewModel.signInWithEmail] (which accepts mobile or email).
 */
@Composable
fun LoginScreen(
    onSignedIn: () -> Unit,
    onSignUp: () -> Unit = {},
    onForgotPassword: () -> Unit = {},

    onBack: (() -> Unit)? = null,
    viewModel: AuthViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val haptic = LocalHapticFeedback.current
    var mobile by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var passwordVisible by rememberSaveable { mutableStateOf(false) }
    var loginMode by rememberSaveable { mutableStateOf("phone") } // "phone" or "email"

    val mobileDigits = remember(mobile) { mobile.filter { it.isDigit() }.take(10) }
    val isValidMobile = remember(mobileDigits) {
        mobileDigits.length == 10 && mobileDigits.first() in '6'..'9'
    }
    // Auto-format as "XXXXX XXXXX" while keeping the raw digits for validation/submission.
    val formattedMobile = remember(mobileDigits) {
        if (mobileDigits.length > 5) "${mobileDigits.take(5)} ${mobileDigits.drop(5)}" else mobileDigits
    }
    val isValidEmail = remember(email) {
        email.isNotBlank() && android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }
    val identifier = remember(loginMode, mobileDigits, email) {
        if (loginMode == "email") email.trim() else mobileDigits
    }
    val canSubmit = when (loginMode) {
        "email" -> isValidEmail && password.isNotBlank() && !state.loading
        else -> isValidMobile && password.isNotBlank() && !state.loading
    }

    LaunchedEffect(state.success) {
        if (state.success) onSignedIn()
    }

    // ── Theme-aware palette ───────────────────────────────────
    val darkTheme = ColorTokens.isDarkTheme()
    val pageGradient = Brush.verticalGradient(
        if (darkTheme) listOf(
            Color(0xFF0F1422),
            Color(0xFF161D2D),
            Color(0xFF1A2540),
        ) else listOf(
            Color(0xFFF0F9FF), // sky-50
            Color(0xFFEFF6FF), // blue-50
            Color(0xFFE0E7FF), // indigo-100
        ),
    )
    val brandGradient = Brush.horizontalGradient(
        if (darkTheme) listOf(
            Color(0xFF1E3A5F),
            Color(0xFF2563EB),
        ) else listOf(Color(0xFF0EA5E9), Color(0xFF2563EB)),
    )
    val mutedText = if (darkTheme) Color(0xFF94A3B8) else Color(0xFF6B7280)
    val labelText = if (darkTheme) Color(0xFFE2E8F0) else Color(0xFF374151)
    val helpText = mutedText
    val borderColor = if (darkTheme) Color(0xFF334155) else Color(0xFFE5E7EB)
    val prefixBg = if (darkTheme) Color(0xFF1E293B) else Color(0xFFF3F4F6)
    val prefixText = if (darkTheme) Color(0xFF94A3B8) else Color(0xFF6B7280)
    val linkColor = if (darkTheme) Color(0xFF93C5FD) else Color(0xFF2563EB)

    val sheetContainerColor = if (darkTheme) Color(0xFF0F172A) else Color(0xFFF8FAFC)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(pageGradient),
    ) {
        // ── Layer 1: Ambient Glowing Aura Canvas ─────────────────────
        androidx.compose.foundation.Canvas(modifier = Modifier.fillMaxSize()) {
            drawCircle(
                color = Color(0xFF3B82F6).copy(alpha = if (darkTheme) 0.15f else 0.25f),
                radius = size.width * 0.45f,
                center = androidx.compose.ui.geometry.Offset(size.width * 0.2f, size.height * 0.12f)
            )
            drawCircle(
                color = Color(0xFF059669).copy(alpha = if (darkTheme) 0.12f else 0.20f),
                radius = size.width * 0.35f,
                center = androidx.compose.ui.geometry.Offset(size.width * 0.85f, size.height * 0.25f)
            )
        }

        Column(modifier = Modifier.fillMaxSize()) {
            // ── Layer 2: Floating Glass Top Bar ─────────────────────
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                shape = RoundedCornerShape(24.dp),
                color = (if (darkTheme) Color(0xFF1E293B) else Color.White).copy(alpha = 0.85f),
                border = BorderStroke(1.dp, (if (darkTheme) Color(0xFF334155) else Color(0xFFE2E8F0)).copy(alpha = 0.6f)),
                shadowElevation = 4.dp,
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.clickable { onBack?.invoke() },
                    ) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = null,
                            tint = if (darkTheme) Color.White else Color(0xFF1E293B),
                            modifier = Modifier.size(18.dp),
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = stringResource(R.string.auth_back),
                            color = if (darkTheme) Color.White else Color(0xFF1E293B),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }

                    Surface(
                        shape = RoundedCornerShape(20.dp),
                        color = Color(0xFF059669).copy(alpha = 0.12f),
                        border = BorderStroke(1.dp, Color(0xFF059669).copy(alpha = 0.3f)),
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text("🛡️ Zaruda Security", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = Color(0xFF059669))
                        }
                    }
                }
            }

            // ── Layer 1 Hero Brand Header ────────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .shadow(elevation = 8.dp, shape = RoundedCornerShape(16.dp))
                        .clip(RoundedCornerShape(16.dp))
                        .background(brandGradient),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = Icons.Default.Shield,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(28.dp),
                    )
                }
                Spacer(Modifier.height(10.dp))
                Text(
                    text = stringResource(R.string.auth_welcome_back),
                    fontSize = 24.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = if (darkTheme) Color(0xFFF1F5F9) else Color(0xFF111827),
                    textAlign = TextAlign.Center,
                )
                Text(
                    text = stringResource(R.string.auth_sign_in_subtitle),
                    fontSize = 13.sp,
                    color = mutedText,
                    textAlign = TextAlign.Center,
                )
            }

            // ── Layer 3: 32dp Curved Content Canvas ──────────────────
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                shape = RoundedCornerShape(topStart = 32.dp, topEnd = 32.dp),
                color = sheetContainerColor,
                shadowElevation = 12.dp,
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                        .imePadding()
                        .padding(horizontal = 16.dp, vertical = 20.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    // ── Sign-In Card ─────────────────────────────────────────
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .widthIn(max = 460.dp)
                            .shadow(elevation = 12.dp, shape = RoundedCornerShape(24.dp)),
                        shape = RoundedCornerShape(24.dp),
                        color = if (darkTheme) Color(0xFF1E293B) else Color.White,
                    ) {
                        Column(modifier = Modifier.fillMaxWidth()) {
                            // Card header (gradient)
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(brandGradient)
                                    .padding(vertical = 18.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = stringResource(R.string.auth_sign_in),
                                color = Color.White,
                                fontWeight = FontWeight.Bold,
                                fontSize = 22.sp,
                            )
                            Spacer(Modifier.height(4.dp))
                            Text(
                                text = stringResource(R.string.auth_aadhaar_hint),
                                color = if (darkTheme) Color(0xFFBFDBFE) else Color(0xFFE0F2FE),
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center,
                            )
                            Spacer(Modifier.height(8.dp))
                            Surface(
                                shape = RoundedCornerShape(20.dp),
                                color = Color.White.copy(alpha = 0.18f),
                            ) {
                                Text(
                                    text = "🛡️ 50k+ Aadhaar Verified Sellers",
                                    color = Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                )
                            }
                        }
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 24.dp, vertical = 24.dp),
                        verticalArrangement = Arrangement.spacedBy(18.dp),
                    ) {
                        // Phone / Email toggle
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (darkTheme) Color(0xFF0F172A) else Color(0xFFF3F4F6))
                                .padding(3.dp),
                        ) {
                            listOf("phone" to "Phone", "email" to "Email").forEach { (mode, label) ->
                                val selected = loginMode == mode
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (selected) brandGradient else Brush.horizontalGradient(listOf(Color.Transparent, Color.Transparent)))
                                        .clickable { loginMode = mode; viewModel.clearError() }
                                        .padding(vertical = 10.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        text = label,
                                        color = if (selected) Color.White else mutedText,
                                        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                                        fontSize = 13.sp,
                                    )
                                }
                            }
                        }

                        // Identifier field (phone or email based on toggle)
                        if (loginMode == "phone") {
                            Text(
                                text = stringResource(R.string.auth_mobile_number),
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 14.sp,
                                color = labelText,
                            )
                            Row(modifier = Modifier.fillMaxWidth()) {
                                Box(
                                    modifier = Modifier
                                        .height(52.dp)
                                        .background(
                                            color = prefixBg,
                                            shape = RoundedCornerShape(topStart = 12.dp, bottomStart = 12.dp),
                                        )
                                        .padding(horizontal = 14.dp),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        text = "🇮🇳 +91",
                                        color = prefixText,
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Bold,
                                    )
                                }
                                OutlinedTextField(
                                    value = formattedMobile,
                                    onValueChange = { input ->
                                        mobile = input.filter { it.isDigit() }.take(10)
                                        if (state.error != null) viewModel.clearError()
                                    },
                                    placeholder = {
                                        Text(
                                            stringResource(R.string.auth_mobile_placeholder),
                                            color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8),
                                        )
                                    },
                                    singleLine = true,
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                    shape = RoundedCornerShape(topEnd = 12.dp, bottomEnd = 12.dp),
                                    colors = OutlinedTextFieldDefaults.colors(
                                        focusedBorderColor = if (darkTheme) Color(0xFF60A5FA) else Color(0xFF0EA5E9),
                                        unfocusedBorderColor = borderColor,
                                        focusedContainerColor = if (darkTheme) Color(0xFF1E293B) else Color.White,
                                        unfocusedContainerColor = if (darkTheme) Color(0xFF1E293B) else Color.White,
                                    ),
                                    modifier = Modifier.weight(1f).height(52.dp),
                                )
                            }
                            Text(
                                text = stringResource(R.string.auth_mobile_help),
                                color = if (mobile.isNotBlank() && !isValidMobile) (if (darkTheme) Color(0xFFFCA5A5) else Color(0xFFDC2626)) else helpText,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(start = 2.dp),
                            )
                        } else {
                            // Email field
                            Text(
                                text = "Email Address",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 14.sp,
                                color = labelText,
                            )
                            OutlinedTextField(
                                value = email,
                                onValueChange = {
                                    email = it.trim()
                                    if (state.error != null) viewModel.clearError()
                                },
                                placeholder = {
                                    Text(
                                        "e.g. rahul@example.com",
                                        color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8),
                                    )
                                },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                                shape = RoundedCornerShape(12.dp),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = if (darkTheme) Color(0xFF60A5FA) else Color(0xFF0EA5E9),
                                    unfocusedBorderColor = borderColor,
                                    focusedContainerColor = if (darkTheme) Color(0xFF1E293B) else Color.White,
                                    unfocusedContainerColor = if (darkTheme) Color(0xFF1E293B) else Color.White,
                                ),
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                            )
                            if (email.isNotBlank() && !isValidEmail) {
                                Text(
                                    text = "Enter a valid email address",
                                    color = if (darkTheme) Color(0xFFFCA5A5) else Color(0xFFDC2626),
                                    fontSize = 12.sp,
                                    modifier = Modifier.padding(start = 2.dp),
                                )
                            }
                        }

                        // Password label
                        Text(
                            text = stringResource(R.string.auth_password),
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            color = labelText,
                        )
                        OutlinedTextField(
                            value = password,
                            onValueChange = {
                                password = it
                                if (state.error != null) viewModel.clearError()
                            },
                            placeholder = {
                                Text(                                        stringResource(R.string.auth_password_placeholder),
                                        color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8),
                                    )
                            },
                            singleLine = true,
                            visualTransformation = if (passwordVisible) {
                                VisualTransformation.None
                            } else {
                                PasswordVisualTransformation()
                            },
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = androidx.compose.ui.text.input.ImeAction.Done),
                            keyboardActions = KeyboardActions(onDone = {
                                if (canSubmit) {
                                    viewModel.clearError()
                                    viewModel.signInWithEmail(identifier, password)
                                }
                            }),
                            trailingIcon = {
                                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                    Icon(
                                        imageVector = if (passwordVisible) {
                                            Icons.Default.VisibilityOff
                                        } else {
                                            Icons.Default.Visibility
                                        },
                                        contentDescription = stringResource(
                                            if (passwordVisible) R.string.password_hide else R.string.password_show,
                                        ),
                                        tint = mutedText,
                                    )
                                }
                            },
                            shape = RoundedCornerShape(12.dp),
                            colors = OutlinedTextFieldDefaults.colors(                            focusedBorderColor = if (darkTheme) Color(0xFF60A5FA) else Color(0xFF0EA5E9),
                            unfocusedBorderColor = borderColor,
                            focusedContainerColor = if (darkTheme) Color(0xFF1E293B) else Color.White,
                            unfocusedContainerColor = if (darkTheme) Color(0xFF1E293B) else Color.White,
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                    )

                        // Sign-up + Forgot password row
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = stringResource(R.string.auth_dont_have_account),
                                    color = mutedText,
                                    fontSize = 13.sp,
                                )
                                Spacer(Modifier.width(4.dp))
                                TextButton(
                                    onClick = onSignUp,
                                    contentPadding = androidx.compose.foundation.layout.PaddingValues(
                                        horizontal = 0.dp,
                                        vertical = 0.dp,
                                    ),
                                ) {
                                    Text(
                                        text = stringResource(R.string.auth_sign_up_here),
                                        color = linkColor,
                                        fontWeight = FontWeight.Medium,
                                        fontSize = 13.sp,
                                    )
                                }
                            }
                            TextButton(
                                onClick = onForgotPassword,
                                contentPadding = androidx.compose.foundation.layout.PaddingValues(
                                    horizontal = 0.dp,
                                    vertical = 0.dp,
                                ),
                            ) {
                                Text(
                                    text = stringResource(R.string.auth_forgot_password),
                                    color = linkColor,
                                    fontWeight = FontWeight.Medium,
                                    fontSize = 13.sp,
                                )
                            }
                        }

                        // Error banner (web amber style)
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
                                    imageVector = Icons.Default.WarningAmber,
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

                        // Sign In button (gradient)
                        Button(
                            onClick = {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                viewModel.clearError()
                                viewModel.signInWithEmail(identifier, password)
                            },                                enabled = canSubmit,
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.Transparent,
                                disabledContainerColor = Color.Transparent,
                            ),
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(0.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp),
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(
                                        if (canSubmit) brandGradient else Brush.horizontalGradient(
                                            listOf(if (darkTheme) Color(0xFF334155) else Color(0xFFCBD5E1), if (darkTheme) Color(0xFF334155) else Color(0xFFCBD5E1)),
                                        ),
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
                                        text = stringResource(R.string.auth_sign_in),
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

            // ── Google 1-Tap Sign-In ────────────────────────────────────
            if (GoogleSignInHelper.isConfigured()) {
                Spacer(Modifier.height(12.dp))
                androidx.compose.material3.OutlinedButton(
                    onClick = {
                        viewModel.clearError()
                        viewModel.signInWithGoogle()
                    },
                    enabled = !state.loading,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .widthIn(max = 460.dp)
                        .height(48.dp),
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center,
                    ) {
                        // Google 'G' icon (simplified as text)
                        Box(
                            modifier = Modifier
                                .size(20.dp)
                                .clip(RoundedCornerShape(4.dp))
                                .background(Color.White),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                text = "G",
                                color = Color(0xFF4285F4),
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                            )
                        }
                        Spacer(Modifier.width(10.dp))
                        Text(
                            text = "Continue with Google",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }
            }

            // ── Divider ───────────────────────────────────────────────────
            if (GoogleSignInHelper.isConfigured()) {
                Spacer(Modifier.height(4.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .widthIn(max = 460.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(1.dp)
                            .background(borderColor),
                    )
                    Text(
                        text = "  OR  ",
                        color = mutedText,
                        fontSize = 12.sp,
                    )
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(1.dp)
                            .background(borderColor),
                    )
                }
            }

            // ── Demo Login ─────────────────────────────────────────────────
            Spacer(Modifier.height(12.dp))
            androidx.compose.material3.OutlinedButton(
                onClick = { viewModel.demoLogin() },
                enabled = !state.loading,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 460.dp)
                    .height(44.dp),
            ) {
                if (state.loading) {
                    CircularProgressIndicator(
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(18.dp),
                    )
                } else {
                    Text(
                        text = "\uD83D\uDD11 Demo Login",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }

            // ── 1-Tap Biometric Instant Login ──────────────────────────────
            Spacer(Modifier.height(8.dp))
            Surface(
                onClick = {
                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                    viewModel.demoLogin()
                },
                shape = RoundedCornerShape(12.dp),
                color = if (darkTheme) Color(0xFF1E293B) else Color(0xFFEFF6FF),
                border = BorderStroke(1.dp, if (darkTheme) Color(0xFF3B82F6).copy(alpha = 0.4f) else Color(0xFF3B82F6).copy(alpha = 0.25f)),
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 460.dp)
                    .height(44.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxSize(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                ) {
                    Icon(
                        Icons.Filled.Fingerprint,
                        contentDescription = "Biometric Login",
                        tint = Color(0xFF3B82F6),
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "1-Tap Biometric Instant Login",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = Color(0xFF2563EB),
                    )
                }
            }

            // ── Live Deal Security Ticker (auto-scrolling marquee) ──────────
            SecurityTicker(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 460.dp)
                    .padding(horizontal = 16.dp, vertical = 10.dp),
            )

            // ── Continue as Guest ──────────────────────────────────────────
            Spacer(Modifier.height(8.dp))
            TextButton(
                onClick = { onSignedIn() },
                modifier = Modifier.padding(vertical = 4.dp),
            ) {
                Text(
                    text = "🛍️ Explore Marketplace as Guest →",
                    color = linkColor,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            Text(
                text = "By signing in, you agree to our Terms & Privacy Policy",
                color = mutedText,
                fontSize = 11.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 8.dp, bottom = 16.dp),
            )

        }
    }
}
}
}

/**
 * Auto-scrolling live-deal security ticker (marquee).
 * Renders the trust message set twice and translates one copy width per loop for a seamless crawl.
 */
@Composable
private fun SecurityTicker(
    modifier: Modifier = Modifier,
) {
    val items = listOf(
        "50,000+ Aadhaar Verified Users",
        "100% Verified Local Sellers",
        "Zero Fraud Policy",
        "Secure In-App Payments",
    )
    var copyWidth by remember { androidx.compose.runtime.mutableIntStateOf(0) }
    val infinite = rememberInfiniteTransition(label = "securityTicker")
    val ratio by infinite.animateFloat(
        initialValue = 0f,
        targetValue = -1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 18000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "tickerOffset",
    )

    val darkTheme = ColorTokens.isDarkTheme()
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF059669).copy(alpha = 0.10f))
            .height(34.dp)
            .clipToBounds(),
        contentAlignment = Alignment.CenterStart,
    ) {
        Row(
            modifier = Modifier.offset { IntOffset((ratio * copyWidth).roundToInt(), 0) },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            repeat(2) { copyIndex ->
                Row(
                    modifier = Modifier.onSizeChanged { size ->
                        // Measure one copy; the second copy starts exactly one width later.
                        if (copyIndex == 0 && size.width > 0) copyWidth = size.width
                    },
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    items.forEachIndexed { i, item ->
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.padding(horizontal = 14.dp),
                        ) {
                            Text("🛡️", fontSize = 12.sp)
                            Text(
                                item,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium,
                                color = if (darkTheme) Color(0xFF6EE7B7) else Color(0xFF047857),
                            )
                        }
                        if (i < items.lastIndex) {
                            Text("•", fontSize = 10.sp, color = if (darkTheme) Color(0xFF10B981) else Color(0xFF10B981))
                        }
                    }
                }
            }
        }
    }
}
