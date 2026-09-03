package com.zaruda.app.ui.auth
import com.zaruda.app.ui.theme.ColorTokens

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel

@Composable
fun SignUpScreen(
    onSignedUp: () -> Unit,
    onBack: () -> Unit,
    onSignIn: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var name by rememberSaveable { mutableStateOf("") }
    var mobile by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var confirmPassword by rememberSaveable { mutableStateOf("") }
    var referralCode by rememberSaveable { mutableStateOf("") }
    var passwordVisible by rememberSaveable { mutableStateOf(false) }
    var confirmPasswordVisible by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(state.success) { if (state.success) onSignedUp() }

    val darkTheme = ColorTokens.isDarkTheme()
    val pageGradient = Brush.verticalGradient(
        if (darkTheme) listOf(Color(0xFF0F1422), Color(0xFF161D2D), Color(0xFF1A2540))
        else listOf(Color(0xFFF0F9FF), Color(0xFFEFF6FF), Color(0xFFE0E7FF))
    )
    val brandGradient = Brush.horizontalGradient(
        if (darkTheme) listOf(Color(0xFF1E3A5F), Color(0xFF2563EB))
        else listOf(Color(0xFF0EA5E9), Color(0xFF2563EB))
    )
    val linkColor = if (darkTheme) Color(0xFF93C5FD) else Color(0xFF2563EB)
    val labelText = if (darkTheme) Color(0xFFE2E8F0) else Color(0xFF374151)
    val mutedText = if (darkTheme) Color(0xFF94A3B8) else Color(0xFF6B7280)
    val borderColor = if (darkTheme) Color(0xFF334155) else Color(0xFFE5E7EB)
    val successColor = Color(0xFF22C55E)
    val warningColor = Color(0xFFF59E0B)

    // Password strength calculation
    val passwordStrength = remember(password) {
        when {
            password.isEmpty() -> 0
            password.length < 6 -> 1
            password.length < 8 -> 2
            password.length >= 8 && password.any { it.isDigit() } && password.any { !it.isLetterOrDigit() } -> 4
            password.length >= 8 && password.any { it.isDigit() } -> 3
            else -> 2
        }
    }
    val strengthColor = when (passwordStrength) {
        1 -> Color(0xFFEF4444)
        2 -> warningColor
        3 -> Color(0xFF3B82F6)
        4 -> successColor
        else -> borderColor
    }
    val strengthLabel = when (passwordStrength) {
        1 -> "Weak"
        2 -> "Fair"
        3 -> "Good"
        4 -> "Strong"
        else -> ""
    }

    // Real-time validation
    val emailValid = email.isBlank() || android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
    val phoneValid = mobile.isBlank() || (mobile.length == 10 && mobile.first() in '6'..'9')
    val passwordsMatch = confirmPassword.isBlank() || password == confirmPassword
    val canSubmit = name.isNotBlank() &&
            email.isNotBlank() && emailValid &&
            mobile.length == 10 && phoneValid &&
            password.length >= 6 &&
            password == confirmPassword &&
            !state.loading

    Box(modifier = Modifier.fillMaxSize().background(pageGradient)) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(WindowInsets.statusBars.asPaddingValues())
                .padding(horizontal = 16.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Back button
            Row(
                Modifier
                    .fillMaxWidth()
                    .widthIn(max = 460.dp)
                    .clickable { onBack() },
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = linkColor, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text("Back to Login", color = linkColor, fontSize = 14.sp, fontWeight = FontWeight.Medium)
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
                Column(Modifier.fillMaxWidth()) {
                    // Card header
                    Box(
                        Modifier
                            .fillMaxWidth()
                            .background(brandGradient)
                            .padding(vertical = 22.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(
                                Modifier
                                    .size(48.dp)
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(Color.White.copy(alpha = 0.2f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Filled.PersonAdd, null, tint = Color.White, modifier = Modifier.size(24.dp))
                            }
                            Spacer(Modifier.height(10.dp))
                            Text("Create Account", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                            Text("Join the community", color = Color(0xFFDBEAFE), fontSize = 12.sp)
                        }
                    }

                    Column(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 24.dp, vertical = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // Error banner
                        state.error?.let { msg ->
                            Row(
                                Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(if (darkTheme) Color(0xFF451A03) else Color(0xFFFFFBEB))
                                    .padding(12.dp),
                                verticalAlignment = Alignment.Top
                            ) {
                                Icon(Icons.Filled.WarningAmber, null, tint = if (darkTheme) Color(0xFFFBBF24) else Color(0xFFB45309), modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(msg, color = if (darkTheme) Color(0xFFFDE68A) else Color(0xFF92400E), fontSize = 12.sp)
                            }
                        }

                        // Full Name
                        Text("Full Name", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = labelText)
                        OutlinedTextField(
                            value = name,
                            onValueChange = { name = it },
                            placeholder = { Text("e.g. Rahul Sharma", color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8)) },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            colors = suTfColors(borderColor, darkTheme)
                        )

                        // Email Address
                        Text("Email Address", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = labelText)
                        OutlinedTextField(
                            value = email,
                            onValueChange = { email = it.trim() },
                            placeholder = { Text("e.g. rahul@example.com", color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8)) },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            colors = suTfColors(borderColor, darkTheme)
                        )
                        if (email.isNotBlank() && !emailValid) {
                            Text("Enter a valid email address", color = Color(0xFFEF4444), fontSize = 11.sp)
                        }

                        // Mobile Number
                        Text("Mobile Number", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = labelText)
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Box(
                                Modifier
                                    .height(52.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(if (darkTheme) Color(0xFF1E293B) else Color(0xFFF3F4F6))
                                    .padding(horizontal = 14.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("+91", color = labelText, fontWeight = FontWeight.SemiBold)
                            }
                            OutlinedTextField(
                                value = mobile,
                                onValueChange = { mobile = it.filter(Char::isDigit).take(10) },
                                placeholder = { Text("9876543210", color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8)) },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier.weight(1f).height(52.dp),
                                colors = suTfColors(borderColor, darkTheme)
                            )
                        }
                        if (mobile.isNotBlank() && !phoneValid) {
                            Text("Enter a valid 10-digit mobile number starting with 6-9", color = Color(0xFFEF4444), fontSize = 11.sp)
                        }

                        // Password
                        Text("Password", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = labelText)
                        OutlinedTextField(
                            value = password,
                            onValueChange = { password = it },
                            placeholder = { Text("At least 6 characters", color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8)) },
                            singleLine = true,
                            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            colors = suTfColors(borderColor, darkTheme),
                            trailingIcon = {
                                IconButton(onClick = { passwordVisible = !passwordVisible }) {
                                    Icon(
                                        if (passwordVisible) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                                        contentDescription = null,
                                        tint = mutedText
                                    )
                                }
                            }
                        )
                        // Password strength indicator
                        if (password.isNotBlank()) {
                            Row(
                                modifier = Modifier.fillMaxWidth().animateContentSize(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                // Strength bar
                                Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                                    for (i in 1..4) {
                                        Box(
                                            Modifier
                                                .weight(1f)
                                                .height(4.dp)
                                                .clip(RoundedCornerShape(2.dp))
                                                .background(if (i <= passwordStrength) strengthColor else borderColor)
                                        )
                                    }
                                }
                                Text(strengthLabel, color = strengthColor, fontSize = 11.sp, fontWeight = FontWeight.Medium)
                            }
                        }

                        // Confirm Password
                        Text("Confirm Password", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = labelText)
                        OutlinedTextField(
                            value = confirmPassword,
                            onValueChange = { confirmPassword = it },
                            placeholder = { Text("Re-enter your password", color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8)) },
                            singleLine = true,
                            visualTransformation = if (confirmPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            colors = suTfColors(borderColor, darkTheme),
                            trailingIcon = {
                                IconButton(onClick = { confirmPasswordVisible = !confirmPasswordVisible }) {
                                    Icon(
                                        if (confirmPasswordVisible) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                                        contentDescription = null,
                                        tint = mutedText
                                    )
                                }
                            }
                        )
                        if (confirmPassword.isNotBlank() && !passwordsMatch) {
                            Text("Passwords don't match", color = Color(0xFFEF4444), fontSize = 11.sp)
                        }

                        // Referral Code (Optional)
                        Text("Referral Code (Optional)", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = labelText)
                        OutlinedTextField(
                            value = referralCode,
                            onValueChange = { referralCode = it.uppercase() },
                            placeholder = { Text("ZARUDA100", color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8)) },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            colors = suTfColors(borderColor, darkTheme)
                        )

                        Spacer(Modifier.height(4.dp))

                        // Sign Up button
                        SuGradientButton(
                            label = "Create Account",
                            enabled = canSubmit,
                            loading = state.loading,
                            gradient = brandGradient
                        ) {
                            viewModel.signUp(
                                fullName = name.trim(),
                                email = email.trim(),
                                phone = mobile,
                                password = password,
                                referral = referralCode.ifBlank { null }
                            )
                        }

                        // Legal text
                        Text(
                            "By signing up, you agree to our Terms of Service and Privacy Policy.",
                            fontSize = 11.sp,
                            color = mutedText,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                            modifier = Modifier.fillMaxWidth().padding(top = 4.dp)
                        )
                    }
                }
            }

            // ── Google 1-Tap Sign-Up ────────────────────────────────────
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
                            text = "Sign up with Google",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }
            }

            // ── Divider + Sign in link ──────────────────────────────────
            Spacer(Modifier.height(8.dp))
            Row(
                Modifier.fillMaxWidth().widthIn(max = 460.dp).padding(horizontal = 16.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Already have an account? ", fontSize = 13.sp, color = mutedText)
                Text(
                    "Sign in here",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = linkColor,
                    modifier = Modifier.clickable { onSignIn() }
                )
            }
        }
    }
}

@Composable
private fun suTfColors(borderC: Color, darkTheme: Boolean) = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = Color(0xFF2563EB),
    unfocusedBorderColor = borderC,
    focusedContainerColor = if (darkTheme) Color(0xFF0F172A) else Color(0xFFFAFAFA),
    unfocusedContainerColor = if (darkTheme) Color(0xFF0F172A) else Color(0xFFFAFAFA),
    focusedTextColor = if (darkTheme) Color.White else Color(0xFF0F172A),
    unfocusedTextColor = if (darkTheme) Color.White else Color(0xFF0F172A),
)

@Composable
private fun SuGradientButton(
    label: String,
    enabled: Boolean,
    loading: Boolean,
    gradient: Brush,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.fillMaxWidth().height(50.dp),
        shape = RoundedCornerShape(14.dp),
        contentPadding = PaddingValues(0.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, disabledContainerColor = Color(0xFF94A3B8).copy(alpha = 0.4f))
    ) {
        Box(
            modifier = Modifier.fillMaxSize().background(if (enabled) gradient else Brush.linearGradient(listOf(Color(0xFFCBD5E1), Color(0xFF94A3B8)))),
            contentAlignment = Alignment.Center
        ) {
            if (loading) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
            else Text(label, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
        }
    }
}
