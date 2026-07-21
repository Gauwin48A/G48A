package com.zaruda.app.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.launch
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.zaruda.app.R

/**
 * LoginScreen — pixel-faithful Compose port of `Mhub/client/src/pages/Auth/Login.jsx`.
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
    var mobile by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var passwordVisible by rememberSaveable { mutableStateOf(false) }

    val mobileDigits = remember(mobile) { mobile.filter { it.isDigit() }.take(10) }
    val isValidMobile = remember(mobileDigits) {
        mobileDigits.length == 10 && mobileDigits.first() in '6'..'9'
    }
    val canSubmit = isValidMobile && password.isNotBlank() && !state.loading

    LaunchedEffect(state.success) {
        if (state.success) onSignedIn()
    }

    // ── Theme-aware palette ───────────────────────────────────
    val darkTheme = androidx.compose.foundation.isSystemInDarkTheme()
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
            // ── Back button ──────────────────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 460.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.clickable { onBack?.invoke() },
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = null,
                        tint = mutedText,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(
                        text = stringResource(R.string.auth_back),
                        color = mutedText,
                        fontSize = 14.sp,
                    )
                }
            }

            Spacer(Modifier.height(20.dp))

            // ── Shield + heading ─────────────────────────────────────
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .shadow(elevation = 8.dp, shape = RoundedCornerShape(16.dp))
                    .clip(RoundedCornerShape(16.dp))
                    .background(brandGradient),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    imageVector = Icons.Default.Shield,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(32.dp),
                )
            }
            Spacer(Modifier.height(20.dp))
            Text(
                text = stringResource(R.string.auth_welcome_back),
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = if (darkTheme) Color(0xFFF1F5F9) else Color(0xFF111827),
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = stringResource(R.string.auth_sign_in_subtitle),
                fontSize = 14.sp,
                color = mutedText,
                textAlign = TextAlign.Center,
            )

            Spacer(Modifier.height(24.dp))

            // ── Sign-In Card ─────────────────────────────────────────
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .widthIn(max = 460.dp)
                    .shadow(elevation = 16.dp, shape = RoundedCornerShape(24.dp)),
                shape = RoundedCornerShape(24.dp),
                color = if (darkTheme) Color(0xFF1E293B) else Color.White,
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    // Card header (gradient)
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(brandGradient)
                            .padding(vertical = 22.dp),
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
                        }
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 24.dp, vertical = 24.dp),
                        verticalArrangement = Arrangement.spacedBy(18.dp),
                    ) {
                        // Mobile Number label
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = Icons.Default.Phone,
                                contentDescription = null,
                                tint = labelText,
                                modifier = Modifier.size(16.dp),
                            )
                            Spacer(Modifier.width(6.dp))
                            Text(
                                text = stringResource(R.string.auth_mobile_number),
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 14.sp,
                                color = labelText,
                            )
                        }

                        // +91 prefix + mobile input (joined, two-tone)
                        Row(modifier = Modifier.fillMaxWidth()) {
                            Box(
                                modifier = Modifier
                                    .height(52.dp)
                                    .background(
                                        color = prefixBg,
                                        shape = RoundedCornerShape(
                                            topStart = 12.dp,
                                            bottomStart = 12.dp,
                                        ),
                                    )
                                    .padding(horizontal = 14.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    text = stringResource(R.string.auth_country_code),
                                    color = prefixText,
                                    fontSize = 14.sp,
                                )
                            }
                            OutlinedTextField(
                                value = mobile,
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
                                shape = RoundedCornerShape(
                                    topEnd = 12.dp,
                                    bottomEnd = 12.dp,
                                ),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = if (darkTheme) Color(0xFF60A5FA) else Color(0xFF0EA5E9),
                                    unfocusedBorderColor = borderColor,
                                    focusedContainerColor = if (darkTheme) Color(0xFF1E293B) else Color.White,
                                    unfocusedContainerColor = if (darkTheme) Color(0xFF1E293B) else Color.White,
                                ),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(52.dp),
                            )
                        }
                        Text(
                            text = stringResource(R.string.auth_mobile_help),
                            color = if (mobile.isNotBlank() && !isValidMobile) (if (darkTheme) Color(0xFFFCA5A5) else Color(0xFFDC2626)) else helpText,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(start = 2.dp),
                        )

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
                                    viewModel.signInWithEmail(mobileDigits, password)
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
                                viewModel.clearError()
                                viewModel.signInWithEmail(mobileDigits, password)
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

            // ── Demo Login Button (temporary convenience) ────────────
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

            // ── Google Sign-In ────────────────────────────────────────
            Spacer(Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth().widthIn(max = 460.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                androidx.compose.material3.HorizontalDivider(modifier = Modifier.weight(1f))
                Text("OR", color = mutedText, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                androidx.compose.material3.HorizontalDivider(modifier = Modifier.weight(1f))
            }
            Spacer(Modifier.height(8.dp))
            val googleContext = LocalContext.current
            val googleScope = rememberCoroutineScope()
            var googleLoading by remember { mutableStateOf(false) }
            androidx.compose.material3.OutlinedButton(
                onClick = {
                    googleScope.launch {
                        googleLoading = true
                        val result = GoogleSignInHelper.signIn(googleContext, com.zaruda.app.BuildConfig.GOOGLE_WEB_CLIENT_ID)
                        when (result) {
                            is GoogleSignInHelper.Result.Success -> viewModel.signInWithGoogle(result.idToken)
                            is GoogleSignInHelper.Result.Error -> viewModel.setError(result.message)
                            is GoogleSignInHelper.Result.Cancelled -> { /* no-op */ }
                        }
                        googleLoading = false
                    }
                },
                enabled = !state.loading && !googleLoading,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth().widthIn(max = 460.dp).height(48.dp),
            ) {
                if (googleLoading) {
                    CircularProgressIndicator(strokeWidth = 2.dp, modifier = Modifier.size(18.dp))
                } else {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("G", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp, color = Color(0xFF4285F4))
                        Text("Continue with Google", fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
                    }
                }
            }

        }
    }
}
