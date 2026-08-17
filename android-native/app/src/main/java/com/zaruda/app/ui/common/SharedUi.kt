package com.zaruda.app.ui.common
import com.zaruda.app.ui.theme.ColorTokens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.WarningAmber
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/** Standard page background gradient matching web sky-50 → blue-50 → indigo-100. */
val PageGradient = Brush.verticalGradient(listOf(Color(0xFFF0F9FF), Color(0xFFEFF6FF), Color(0xFFE0E7FF)))

/** Dark page background gradient */
val PageGradientDark = Brush.verticalGradient(listOf(Color(0xFF0F1422), Color(0xFF131B2E), Color(0xFF152035)))

/** Brand button gradient blue-500 → blue-600. */
val BrandGradient = Brush.horizontalGradient(listOf(Color(0xFF3B82F6), Color(0xFF2563EB)))

/** Dark brand button gradient */
val BrandGradientDark = Brush.horizontalGradient(listOf(Color(0xFF1E3A5F), Color(0xFF2563EB)))

val LinkColor = Color(0xFF2563EB)
val LinkColorDark = Color(0xFF93C5FD)
val LabelColor = Color(0xFF374151)
val LabelColorDark = Color(0xFFE2E8F0)
val MutedColor = Color(0xFF6B7280)
val MutedColorDark = Color(0xFF94A3B8)
val BorderColor = Color(0xFFE5E7EB)
val BorderColorDark = Color(0xFF334155)
val ErrorBg = Color(0xFFFFFBEB)
val ErrorBgDark = Color(0xFF451A03)
val ErrorIcon = Color(0xFFB45309)
val ErrorIconDark = Color(0xFFFBBF24)
val ErrorText = Color(0xFF92400E)
val ErrorTextDark = Color(0xFFFDE68A)
val HeaderBlue100 = Color(0xFFDBEAFE)

@Composable
fun PageScaffold(
    title: String,
    onBack: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val isDark = ColorTokens.isDarkTheme()
    val bg = if (isDark) PageGradientDark else PageGradient
    val link = if (isDark) LinkColorDark else LinkColor
    Box(modifier = Modifier.fillMaxSize().background(bg)) {
        Column(
            modifier = Modifier.fillMaxSize()
                .padding(WindowInsets.statusBars.asPaddingValues())
                .padding(horizontal = 16.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            if (onBack != null) {
                Row(
                    modifier = Modifier.fillMaxWidth().widthIn(max = 460.dp)
                        .clickable { onBack() },
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = link, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Back", color = link, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                }
                Spacer(Modifier.height(12.dp))
            }
            content()
        }
    }
}

@Composable
fun CardWithHeader(
    title: String,
    subtitle: String,
    icon: ImageVector,
    content: @Composable ColumnScope.() -> Unit,
) {
    val isDark = ColorTokens.isDarkTheme()
    val brandGrad = if (isDark) BrandGradientDark else BrandGradient
    val cardColor = if (isDark) Color(0xFF1E293B) else Color.White
    Surface(
        modifier = Modifier.fillMaxWidth().widthIn(max = 460.dp),
        shape = RoundedCornerShape(24.dp), color = cardColor,
        shadowElevation = 16.dp,
    ) {
        Column(Modifier.fillMaxWidth()) {
            Column(
                Modifier.fillMaxWidth().background(brandGrad).padding(vertical = 26.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(
                    Modifier.size(56.dp).clip(RoundedCornerShape(16.dp))
                        .background(Color.White.copy(alpha = 0.2f)),
                    contentAlignment = Alignment.Center,
                ) { Icon(icon, null, tint = Color.White, modifier = Modifier.size(28.dp)) }
                Spacer(Modifier.height(14.dp))
                Text(title, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                Spacer(Modifier.height(4.dp))
                Text(subtitle, color = HeaderBlue100, fontSize = 13.sp)
            }
            Column(Modifier.fillMaxWidth().padding(24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                content()
            }
        }
    }
}

@Composable
fun ErrorBanner(message: String) {
    val isDark = ColorTokens.isDarkTheme()
    val bg = if (isDark) ErrorBgDark else ErrorBg
    val icon = if (isDark) ErrorIconDark else ErrorIcon
    val text = if (isDark) ErrorTextDark else ErrorText
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(bg).padding(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Icon(Icons.Filled.WarningAmber, null, tint = icon, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(8.dp))
        Text(message, color = text, fontSize = 12.sp)
    }
}

@Composable
fun GradientActionButton(
    text: String,
    enabled: Boolean = true,
    gradient: Brush = BrandGradient,
    onClick: () -> Unit,
) {
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
        ) { Text(text, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 16.sp) }
    }
}
