package com.mhub.app.ui.commerce

import android.content.Intent
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.CompareArrows
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.*
import androidx.compose.material3.AlertDialog
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.app.R
import com.mhub.app.ui.components.AppErrorState
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.*
import com.mhub.app.data.repository.*
import com.mhub.app.domain.model.Post
import com.mhub.app.ui.common.LinkColor
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import javax.inject.Inject

// ──────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ──────────────────────────────────────────────────────────────────────────────

internal val bgGradient get() = Brush.verticalGradient(listOf(Color(0xFFF0F9FF), Color(0xFFEFF6FF), Color(0xFFE0E7FF)))
internal val brandGrad get() = Brush.horizontalGradient(listOf(Color(0xFF3B82F6), Color(0xFF2563EB)))

@Composable
internal fun ScreenTopBar(title: String, onBack: () -> Unit) {
    Row(
        Modifier.fillMaxWidth()
            .padding(WindowInsets.statusBars.asPaddingValues())
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        IconButton(onClick = onBack, modifier = Modifier.size(36.dp)) {
            Icon(Icons.AutoMirrored.Filled.ArrowBack, null, tint = Color(0xFF2563EB))
        }
        Spacer(Modifier.width(8.dp))
        Text(title, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Color(0xFF1E293B))
    }
}

@Composable
internal fun PostListItem(post: Post, onClick: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp), color = Color.White, shadowElevation = 2.dp,
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
            if (post.primaryImage != null) {
                AsyncImage(
                    model = post.primaryImage, contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(70.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)),
                )
            } else {
                Box(
                    Modifier.size(70.dp).clip(RoundedCornerShape(10.dp)).background(Color(0xFFF1F5F9)),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Filled.Image, null, tint = Color(0xFFCBD5E1), modifier = Modifier.size(28.dp)) }
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(post.displayTitle, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B), maxLines = 2)
                if (post.price != null) {
                    Spacer(Modifier.height(4.dp))
                    Text("₹${post.price.toLong()}", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = Color(0xFF2563EB))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    post.status?.let { s ->
                        StatusChip(s)
                    }
                    post.status?.let { c ->
                        Surface(shape = RoundedCornerShape(20.dp), color = Color(0xFFF1F5F9)) {
                            Text(c.replaceFirstChar { it.uppercase() }, fontSize = 11.sp, color = Color(0xFF475569), modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
                        }
                    }
                }
                post.location?.let { loc ->
                    Spacer(Modifier.height(2.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.LocationOn, null, tint = Color(0xFF94A3B8), modifier = Modifier.size(12.dp))
                        Spacer(Modifier.width(2.dp))
                        Text(loc, fontSize = 11.sp, color = Color(0xFF94A3B8), maxLines = 1)
                    }
                }
                post.createdAt?.take(10)?.let { date ->
                    Text(date, fontSize = 11.sp, color = Color(0xFFCBD5E1))
                }
            }
        }
    }
}

@Composable
internal fun StatusChip(status: String) {
    val (bg, fg) = when (status.lowercase()) {
        "active" -> Color(0xFFDCFCE7) to Color(0xFF166534)
        "sold" -> Color(0xFFDBEAFE) to Color(0xFF1D4ED8)
        "pending" -> Color(0xFFFEF9C3) to Color(0xFF854D0E)
        else -> Color(0xFFF1F5F9) to Color(0xFF475569)
    }
    Surface(shape = RoundedCornerShape(20.dp), color = bg) {
        Text(status.replaceFirstChar { it.uppercase() }, fontSize = 11.sp, color = fg,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp))
    }
}

@Composable
internal fun EmptyState(icon: @Composable () -> Unit, title: String, subtitle: String) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
            icon()
            Spacer(Modifier.height(16.dp))
            Text(title, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = Color(0xFF374151))
            Spacer(Modifier.height(6.dp))
            Text(subtitle, fontSize = 13.sp, color = Color(0xFF64748B))
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// CompareItemHolder — singleton holding posts selected for side-by-side comparison
// ──────────────────────────────────────────────────────────────────────────────
object CompareItemHolder {
    var posts: List<Post> = emptyList()
}

@Composable
internal fun MhubTextFieldWithCounter(
    label: String, value: String, onValueChange: (String) -> Unit,
    maxLength: Int = 200, maxLines: Int = 1, minLines: Int = 1, error: String? = null,
) {
    Column {
        Row(Modifier.fillMaxWidth()) {
            Text(label, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151), modifier = Modifier.weight(1f))
            Text("${value.length}/$maxLength", fontSize = 11.sp, color = if (value.length > maxLength * 0.9) Color(0xFFEF4444) else Color(0xFF94A3B8))
        }
        Spacer(Modifier.height(4.dp))
        OutlinedTextField(
            value = value, onValueChange = onValueChange, singleLine = maxLines == 1,
            maxLines = maxLines, minLines = minLines,
            shape = RoundedCornerShape(12.dp),
            isError = error != null,
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFF3B82F6),
                unfocusedBorderColor = if (error != null) Color(0xFFEF4444) else Color(0xFFE5E7EB),
                focusedContainerColor = Color.White, unfocusedContainerColor = Color.White,
                errorBorderColor = Color(0xFFEF4444), errorContainerColor = Color(0xFFFFF5F5),
            ),
            modifier = Modifier.fillMaxWidth(),
        )
        if (error != null) {
            Text(error, fontSize = 11.sp, color = Color(0xFFDC2626), modifier = Modifier.padding(start = 4.dp, top = 2.dp))
        }
    }
}

@Composable
internal fun MhubTextField(label: String, value: String, onValueChange: (String) -> Unit, maxLines: Int = 1, minLines: Int = 1) {
    Column {
        Text(label, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF374151))
        Spacer(Modifier.height(4.dp))
        OutlinedTextField(
            value = value, onValueChange = onValueChange, singleLine = maxLines == 1,
            maxLines = maxLines, minLines = minLines,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = Color(0xFF3B82F6), unfocusedBorderColor = Color(0xFFE5E7EB),
                focusedContainerColor = Color.White, unfocusedContainerColor = Color.White,
            ),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}