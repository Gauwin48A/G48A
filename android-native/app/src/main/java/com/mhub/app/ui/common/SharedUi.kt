package com.mhub.app.ui.common

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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

/** Brand button gradient blue-500 → blue-600. */
val BrandGradient = Brush.horizontalGradient(listOf(Color(0xFF3B82F6), Color(0xFF2563EB)))

val LinkColor = Color(0xFF2563EB)
val LabelColor = Color(0xFF374151)
val MutedColor = Color(0xFF6B7280)
val BorderColor = Color(0xFFE5E7EB)
val ErrorBg = Color(0xFFFFFBEB)
val ErrorIcon = Color(0xFFB45309)
val ErrorText = Color(0xFF92400E)
val HeaderBlue100 = Color(0xFFDBEAFE)

@Composable
fun PageScaffold(
    title: String,
    onBack: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize().background(PageGradient)) {
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
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = LinkColor, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Back", color = LinkColor, fontSize = 14.sp, fontWeight = FontWeight.Medium)
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
    Surface(
        modifier = Modifier.fillMaxWidth().widthIn(max = 460.dp),
        shape = RoundedCornerShape(24.dp), color = Color.White,
        shadowElevation = 16.dp,
    ) {
        Column(Modifier.fillMaxWidth()) {
            Column(
                Modifier.fillMaxWidth().background(BrandGradient).padding(vertical = 26.dp),
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
    Row(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(ErrorBg).padding(12.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Icon(Icons.Filled.WarningAmber, null, tint = ErrorIcon, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(8.dp))
        Text(message, color = ErrorText, fontSize = 12.sp)
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
