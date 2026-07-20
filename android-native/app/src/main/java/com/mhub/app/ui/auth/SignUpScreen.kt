package com.mhub.app.ui.auth

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
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
import kotlinx.coroutines.delay

@Composable
fun SignUpScreen(
    onSignedUp: () -> Unit,
    onBack: () -> Unit,
    onSignIn: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    var aadhaar by rememberSaveable { mutableStateOf("") }
    var mobile by rememberSaveable { mutableStateOf("") }
    var otp by rememberSaveable { mutableStateOf("") }
    var pan by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var confirmPassword by rememberSaveable { mutableStateOf("") }
    var referralCode by rememberSaveable { mutableStateOf("") }
    var passwordVisible by rememberSaveable { mutableStateOf(false) }

    LaunchedEffect(state.success) { if (state.success) onSignedUp() }
    LaunchedEffect(Unit) { viewModel.resetSignupStep() }

    val darkTheme = androidx.compose.foundation.isSystemInDarkTheme()
    val pageGradient = Brush.verticalGradient(if (darkTheme) listOf(Color(0xFF0F1422), Color(0xFF161D2D), Color(0xFF1A2540)) else listOf(Color(0xFFF0F9FF), Color(0xFFEFF6FF), Color(0xFFE0E7FF)))
    val brandGradient = Brush.horizontalGradient(if (darkTheme) listOf(Color(0xFF1E3A5F), Color(0xFF2563EB)) else listOf(Color(0xFF0EA5E9), Color(0xFF2563EB)))
    val linkColor = if (darkTheme) Color(0xFF93C5FD) else Color(0xFF2563EB)
    val labelText = if (darkTheme) Color(0xFFE2E8F0) else Color(0xFF374151)
    val mutedText = if (darkTheme) Color(0xFF94A3B8) else Color(0xFF6B7280)
    val borderColor = if (darkTheme) Color(0xFF334155) else Color(0xFFE5E7EB)
    val step = state.signupStep

    Box(modifier = Modifier.fillMaxSize().background(pageGradient)) {
        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding()
                .padding(WindowInsets.statusBars.asPaddingValues()).padding(horizontal = 16.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(Modifier.fillMaxWidth().widthIn(max = 460.dp).clickable { if (step == 1) onBack() else viewModel.resetSignupStep() }, verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = linkColor, modifier = Modifier.size(16.dp))
                Spacer(Modifier.width(6.dp))
                Text(if (step == 1) "Back to Login" else "Back to Step 1", color = linkColor, fontSize = 14.sp, fontWeight = FontWeight.Medium)
            }
            Spacer(Modifier.height(20.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                (1..4).forEach { i ->
                    val active = i <= step
                    Box(Modifier.size(if (i == step) 12.dp else 10.dp).clip(CircleShape)
                        .background(if (active) Color(0xFF2563EB) else Color(0xFFCBD5E1)))
                }
            }
            Spacer(Modifier.height(4.dp))
            Text(
                when (step) { 1 -> "Step 1: Aadhaar Verification"; 2 -> "Step 2: OTP Verification"; 3 -> "Step 3: PAN Verification"; else -> "Step 4: Set Password" },
                fontSize = 12.sp, color = mutedText
            )
            Spacer(Modifier.height(16.dp))

            Surface(
                modifier = Modifier.fillMaxWidth().widthIn(max = 460.dp).shadow(elevation = 16.dp, shape = RoundedCornerShape(24.dp)),
                shape = RoundedCornerShape(24.dp), color = if (darkTheme) Color(0xFF1E293B) else Color.White,
            ) {
                Column(Modifier.fillMaxWidth()) {
                    Box(Modifier.fillMaxWidth().background(brandGradient).padding(vertical = 22.dp), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Box(Modifier.size(48.dp).clip(RoundedCornerShape(14.dp)).background(Color.White.copy(alpha = 0.2f)), contentAlignment = Alignment.Center) {
                                Icon(Icons.Filled.Person, null, tint = Color.White, modifier = Modifier.size(24.dp))
                            }
                            Spacer(Modifier.height(10.dp))
                            Text("Create Account", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 20.sp)
                            Text("Trust-first verification", color = Color(0xFFDBEAFE), fontSize = 12.sp)
                        }
                    }
                    Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                        state.error?.let { msg ->
                            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(if (darkTheme) Color(0xFF451A03) else Color(0xFFFFFBEB)).padding(12.dp), verticalAlignment = Alignment.Top) {
                                Icon(Icons.Filled.WarningAmber, null, tint = if (darkTheme) Color(0xFFFBBF24) else Color(0xFFB45309), modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(msg, color = if (darkTheme) Color(0xFFFDE68A) else Color(0xFF92400E), fontSize = 12.sp)
                            }
                        }
                        when (step) {
                            1 -> {
                                Text("Aadhaar Number", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = labelText)
                                OutlinedTextField(
                                    value = aadhaar, onValueChange = { aadhaar = it.filter(Char::isDigit).take(12) },
                                    placeholder = { Text("Enter 12-digit Aadhaar", color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8)) },
                                    singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().height(52.dp),
                                    colors = suTfColors(borderColor, darkTheme),
                                    trailingIcon = { if (aadhaar.length == 12) Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF22C55E)) },
                                    supportingText = { Text("${aadhaar.length}/12", fontSize = 11.sp, color = if (aadhaar.length == 12) Color(0xFF22C55E) else mutedText) }
                                )
                                Text("Mobile Number", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = labelText)
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Box(Modifier.height(52.dp).clip(RoundedCornerShape(12.dp)).background(if (darkTheme) Color(0xFF1E293B) else Color(0xFFF3F4F6)).padding(horizontal = 14.dp), contentAlignment = Alignment.Center) {
                                        Text("+91", color = labelText, fontWeight = FontWeight.SemiBold)
                                    }
                                    OutlinedTextField(
                                        value = mobile, onValueChange = { mobile = it.filter(Char::isDigit).take(10) },
                                        placeholder = { Text("9876543210", color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8)) },
                                        singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                                        shape = RoundedCornerShape(12.dp), modifier = Modifier.weight(1f).height(52.dp),
                                        colors = suTfColors(borderColor, darkTheme),
                                    )
                                }
                                Text("Enter the mobile number linked to your Aadhaar", fontSize = 12.sp, color = mutedText)
                                Spacer(Modifier.height(4.dp))
                                SuGradientButton("Verify Aadhaar", enabled = aadhaar.length == 12 && mobile.length == 10 && !state.loading, loading = state.loading, gradient = brandGradient) {
                                    viewModel.aadhaarSendOtp(aadhaar, mobile)
                                }
                            }
                            2 -> {
                                var resendCountdown by remember { mutableStateOf(60) }
                                LaunchedEffect(Unit) {
                                    while (resendCountdown > 0) {
                                        delay(1000)
                                        resendCountdown--
                                    }
                                }
                                Text("Enter OTP", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = labelText)
                                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                    Text("We sent a 6-digit OTP to +91 $mobile", fontSize = 12.sp, color = mutedText)
                                    if (resendCountdown > 0) {
                                        Text("Resend in ${resendCountdown}s", fontSize = 11.sp, color = mutedText)
                                    } else {
                                        TextButton(onClick = { resendCountdown = 60 }, contentPadding = PaddingValues(0.dp)) {
                                            Text("Resend OTP", fontSize = 11.sp, color = linkColor)
                                        }
                                    }
                                }
                                OutlinedTextField(
                                    value = otp, onValueChange = { otp = it.filter(Char::isDigit).take(6) },
                                    placeholder = { Text("Enter 6-digit OTP", color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8)) },
                                    singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                    shape = RoundedCornerShape(12.dp), modifier = Modifier.fillMaxWidth().height(52.dp),
                                    colors = suTfColors(borderColor, darkTheme),
                                    supportingText = { Text("${otp.length}/6", fontSize = 11.sp, color = if (otp.length == 6) Color(0xFF22C55E) else mutedText) }
                                )
                                SuGradientButton("Verify OTP", enabled = otp.length == 6 && !state.loading, loading = state.loading, gradient = brandGradient) {
                                    viewModel.aadhaarVerifyOtp(aadhaar, mobile, otp)
                                }
                            }
                            3 -> {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Aadhaar verified!", color = Color(0xFF22C55E), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                }
                                Spacer(Modifier.height(4.dp))
                                Text("PAN Number (optional)", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = labelText)
                                OutlinedTextField(
                                    value = pan, onValueChange = { pan = it.uppercase().take(10) },
                                    placeholder = { Text("ABCDE1234F", color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8)) },
                                    singleLine = true, shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.fillMaxWidth().height(52.dp), colors = suTfColors(borderColor, darkTheme),
                                )
                                Text("Format: 5 letters + 4 digits + 1 letter", fontSize = 11.sp, color = mutedText)
                                SuGradientButton("Verify PAN", enabled = pan.matches(Regex("[A-Z]{5}[0-9]{4}[A-Z]")) && !state.loading, loading = state.loading, gradient = brandGradient) {
                                    viewModel.panVerify(pan)
                                }
                                TextButton(onClick = { viewModel.skipPan() }) { Text("Skip PAN for now", color = linkColor, fontSize = 13.sp) }
                            }
                            4 -> {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(Icons.Filled.CheckCircle, null, tint = Color(0xFF22C55E), modifier = Modifier.size(18.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Identity verified!", color = Color(0xFF22C55E), fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                                }
                                Spacer(Modifier.height(4.dp))
                                Text("Create Password", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = labelText)
                                // Password requirements checklist
                                Surface(shape = RoundedCornerShape(10.dp), color = if (darkTheme) Color(0xFF1E293B) else Color(0xFFF9FAFB), modifier = Modifier.fillMaxWidth()) {
                                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                        Text("Requirements:", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = labelText)
                                        val reqs = listOf(
                                            "12+ characters" to (password.length >= 12),
                                            "Uppercase letter" to password.any { it.isUpperCase() },
                                            "Lowercase letter" to password.any { it.isLowerCase() },
                                            "Number" to password.any { it.isDigit() },
                                            "Special character" to password.any { !it.isLetterOrDigit() }
                                        )
                                        reqs.forEach { (label, met) ->
                                            Row(verticalAlignment = Alignment.CenterVertically) {
                                                Text(if (met) "✅" else "❌", fontSize = 10.sp)
                                                Spacer(Modifier.width(6.dp))
                                                Text(label, fontSize = 11.sp, color = if (met) Color(0xFF22C55E) else mutedText)
                                            }
                                        }
                                    }
                                }
                                OutlinedTextField(
                                    value = password, onValueChange = { password = it },
                                    placeholder = { Text("Min 12 characters", color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8)) },
                                    singleLine = true, shape = RoundedCornerShape(12.dp),
                                    visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                    trailingIcon = { IconButton(onClick = { passwordVisible = !passwordVisible }) { Icon(if (passwordVisible) Icons.Filled.VisibilityOff else Icons.Filled.Visibility, null, tint = mutedText) } },
                                    modifier = Modifier.fillMaxWidth().height(52.dp), colors = suTfColors(borderColor, darkTheme),
                                )
                                val strength = when {
                                    password.length >= 16 && password.any { it.isDigit() } && password.any { !it.isLetterOrDigit() } -> Triple("Strong", Color(0xFF22C55E), 1f)
                                    password.length >= 12 -> Triple("Medium", Color(0xFFF59E0B), 0.66f)
                                    password.isNotEmpty() -> Triple("Weak", Color(0xFFEF4444), 0.33f)
                                    else -> null
                                }
                                strength?.let { (label, color, frac) ->
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Box(Modifier.weight(1f).height(4.dp).clip(RoundedCornerShape(2.dp)).background(color.copy(alpha = 0.2f))) {
                                            Box(Modifier.fillMaxHeight().fillMaxWidth(frac).clip(RoundedCornerShape(2.dp)).background(color))
                                        }
                                        Spacer(Modifier.width(8.dp))
                                        Text(label, fontSize = 11.sp, color = color, fontWeight = FontWeight.SemiBold)
                                    }
                                }
                                Text("Confirm Password", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = labelText)
                                OutlinedTextField(
                                    value = confirmPassword, onValueChange = { confirmPassword = it },
                                    placeholder = { Text("Re-enter password", color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8)) },
                                    singleLine = true, shape = RoundedCornerShape(12.dp),
                                    visualTransformation = PasswordVisualTransformation(),
                                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                                    modifier = Modifier.fillMaxWidth().height(52.dp), colors = suTfColors(borderColor, darkTheme),
                                )
                                Text("Referral Code (optional)", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = labelText)
                                OutlinedTextField(
                                    value = referralCode, onValueChange = { referralCode = it.take(20) },
                                    placeholder = { Text("Enter referral code", color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8)) },
                                    singleLine = true, shape = RoundedCornerShape(12.dp),
                                    modifier = Modifier.fillMaxWidth().height(52.dp), colors = suTfColors(borderColor, darkTheme),
                                )
                                Spacer(Modifier.height(4.dp))
                                SuGradientButton("Create Account", enabled = password.length >= 12 && password == confirmPassword && !state.loading, loading = state.loading, gradient = brandGradient) {
                                    viewModel.completeAadhaarSignup(password, confirmPassword, pan.ifBlank { null }, referralCode.ifBlank { null })
                                }
                            }
                        }
                        Text("By signing up, you agree to MHub Terms of Service and Privacy Policy.", color = mutedText, fontSize = 11.sp)
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                            Text("Already have an account?", color = mutedText, fontSize = 13.sp)
                            Spacer(Modifier.width(4.dp))
                            TextButton(onClick = onSignIn, contentPadding = PaddingValues(0.dp)) { Text("Sign in here", color = linkColor, fontSize = 13.sp, fontWeight = FontWeight.SemiBold) }
                        }
                    }
                }
            }
            Spacer(Modifier.height(24.dp))
        }
    }
}

@Composable
private fun SuGradientButton(text: String, enabled: Boolean, loading: Boolean, gradient: Brush, onClick: () -> Unit) {
    Button(
        onClick = onClick, enabled = enabled, shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent, disabledContainerColor = Color.Transparent),
        contentPadding = PaddingValues(0.dp), modifier = Modifier.fillMaxWidth().height(48.dp),
    ) {
        Box(Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp)).background(if (enabled) gradient else Brush.horizontalGradient(listOf(Color(0xFFCBD5E1), Color(0xFFCBD5E1)))), contentAlignment = Alignment.Center) {
            if (loading) CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp, modifier = Modifier.size(20.dp))
            else Text(text, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        }
    }
}

@Composable
private fun suTfColors(borderColor: Color, darkTheme: Boolean) = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = if (darkTheme) Color(0xFF60A5FA) else Color(0xFF3B82F6), unfocusedBorderColor = borderColor,
    focusedContainerColor = if (darkTheme) Color(0xFF1E293B) else Color.White, unfocusedContainerColor = if (darkTheme) Color(0xFF1E293B) else Color.White,
)
