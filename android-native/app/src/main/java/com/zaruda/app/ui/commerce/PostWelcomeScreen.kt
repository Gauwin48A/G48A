package com.zaruda.app.ui.commerce

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
import com.zaruda.app.R
import com.zaruda.app.ui.components.AppErrorState
import com.zaruda.app.core.ApiResult
import com.zaruda.app.data.remote.dto.*
import com.zaruda.app.data.repository.*
import com.zaruda.app.domain.model.Post
import com.zaruda.app.ui.common.LinkColor
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

@Composable
fun PostWelcomeScreen(onBack: () -> Unit, onStartPost: () -> Unit) {
    Box(Modifier.fillMaxSize().background(bgGradient)) {
        Column(Modifier.fillMaxSize()) {
            ScreenTopBar(stringResource(R.string.sell_title), onBack)
            Column(
                Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(
                    Modifier.size(96.dp).clip(RoundedCornerShape(24.dp))
                        .background(Brush.radialGradient(listOf(Color(0xFF60A5FA), Color(0xFF2563EB)))),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Filled.Sell, null, tint = Color.White, modifier = Modifier.size(48.dp)) }
                Spacer(Modifier.height(24.dp))
                Text(stringResource(R.string.sell_ready), fontWeight = FontWeight.Bold, fontSize = 24.sp, color = Color(0xFF1E293B))
                Spacer(Modifier.height(8.dp))
                Text(stringResource(R.string.sell_subtitle), fontSize = 15.sp, color = Color(0xFF64748B))
                Spacer(Modifier.height(28.dp))
                // FlowStep visual progress
                Surface(shape = RoundedCornerShape(14.dp), color = Color.White, shadowElevation = 2.dp, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp)) {
                        Text(stringResource(R.string.sell_how_it_works), fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                        Spacer(Modifier.height(12.dp))
                        val steps = listOf(
                            Triple(Icons.Filled.PhotoCamera, stringResource(R.string.sell_step_photos), stringResource(R.string.sell_step_photos_desc)),
                            Triple(Icons.Filled.Description, stringResource(R.string.sell_step_details), stringResource(R.string.sell_step_details_desc)),
                            Triple(Icons.Filled.PriceChange, stringResource(R.string.sell_step_price), stringResource(R.string.sell_step_price_desc)),
                        )
                        steps.forEachIndexed { idx, (icon, title, desc) ->
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Box(Modifier.size(32.dp).clip(CircleShape).background(Color(0xFF2563EB)), contentAlignment = Alignment.Center) {
                                        Text("${idx + 1}", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                    }
                                    if (idx < 2) Box(Modifier.width(2.dp).height(24.dp).background(Color(0xFFDBEAFE)))
                                }
                                Spacer(Modifier.width(14.dp))
                                Column(Modifier.padding(bottom = if (idx < 2) 24.dp else 0.dp)) {
                                    Text(title, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = Color(0xFF1E293B))
                                    Text(desc, fontSize = 12.sp, color = Color(0xFF64748B))
                                }
                            }
                        }
                    }
                }
                Spacer(Modifier.height(28.dp))
                // Tier badge display
                Surface(shape = RoundedCornerShape(12.dp), color = Color(0xFFFEF3C7), modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.Stars, null, tint = Color(0xFFF59E0B), modifier = Modifier.size(20.dp))
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text(stringResource(R.string.sell_free_plan), fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = Color(0xFF92400E))
                            Text(stringResource(R.string.sell_upgrade_hint), fontSize = 11.sp, color = Color(0xFFB45309))
                        }
                    }
                }
            }
            // ── Sticky bottom CTA ──
            Surface(shadowElevation = 8.dp, color = Color.White) {
                Button(
                    onClick = onStartPost,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Color.Transparent),
                    contentPadding = PaddingValues(0.dp),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 16.dp).height(54.dp),
                ) {
                    Box(
                        Modifier.fillMaxSize().clip(RoundedCornerShape(14.dp)).background(brandGrad),
                        contentAlignment = Alignment.Center,
                    ) { Text(stringResource(R.string.sell_start_listing), color = Color.White, fontWeight = FontWeight.Bold, fontSize = 16.sp) }
                }
            }
        }
    }
}

// ──────────────────────────────────────────────────────────────────────────────
// EditPostScreen
// ──────────────────────────────────────────────────────────────────────────────
data class EditPostUiState(
    val loading: Boolean = true,
    val saving: Boolean = false,
    val uploading: Boolean = false,
    val uploadProgress: Float = 0f,
    val error: String? = null,
    val success: Boolean = false,
    val title: String = "",
    val description: String = "",
    val price: String = "",
    val location: String = "",
    val condition: String = "",
    val brand: String = "",
    val model: String = "",
    val warranty: String = "",
    val ageMonths: String = "",
    val contactPreference: String = "call",
    val flashSale: Boolean = false,
    val existingImages: List<String> = emptyList(),
    val fieldErrors: Map<String, String> = emptyMap(),
)