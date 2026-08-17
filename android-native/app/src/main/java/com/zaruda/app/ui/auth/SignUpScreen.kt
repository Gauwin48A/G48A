package com.zaruda.app.ui.auth
import com.zaruda.app.ui.theme.ColorTokens

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
                            Text("Step 1 of 3: Account Details", color = Color(0xFFDBEAFE), fontSize = 12.sp)
                        }
                    }

                    Column(
                        Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 24.dp, vertical = 20.dp),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
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

                        Text("Referral Code (Optional)", fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = labelText)
                        OutlinedTextField(
                            value = referralCode,
                            onValueChange = { referralCode = it.uppercase() },
                            placeholder = { Text("MHUB100", color = if (darkTheme) Color(0xFF64748B) else Color(0xFF94A3B8)) },
                            singleLine = true,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            colors = suTfColors(borderColor, darkTheme)
                        )

                        Spacer(Modifier.height(6.dp))

                        SuGradientButton(
                            label = "Continue to Plan Selection",
                            enabled = name.isNotBlank() && mobile.length == 10 && password.length >= 6 && !state.loading,
                            loading = state.loading,
                            gradient = brandGradient
                        ) {
                            viewModel.completeAadhaarSignup(password = password, confirmPassword = password, pan = null, referral = referralCode.ifBlank { null })
                        }

                        Row(
                            Modifier.fillMaxWidth().padding(top = 4.dp),
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
