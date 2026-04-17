package com.mhub.app.ui.kyc

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.HourglassBottom
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.mhub.app.R
import com.mhub.app.ui.components.AppTextField
import com.mhub.app.ui.components.ErrorBanner
import com.mhub.app.ui.components.PrimaryButton

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun KycScreen(
    onBack: () -> Unit,
    viewModel: KycViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    val pickFront = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        uri?.let(viewModel::setFront)
    }
    val pickBack = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        uri?.let(viewModel::setBack)
    }
    val pickSelfie = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        uri?.let(viewModel::setSelfie)
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.kyc_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            KycStatusCard(state.status.kycStatus)
            Text(stringResource(R.string.kyc_intro), color = MaterialTheme.colorScheme.onSurfaceVariant)

            ErrorBanner(message = state.error)

            if (state.status.kycStatus != "verified" && state.status.kycStatus != "pending") {
                DocTypePicker(
                    selected = state.docType,
                    onSelect = viewModel::setDocType,
                )
                AppTextField(
                    value = state.docNumber,
                    onValueChange = { viewModel.setDocNumber(it.uppercase()); viewModel.clearError() },
                    label = stringResource(R.string.kyc_doc_number),
                    keyboardType = if (state.docType == "aadhaar") KeyboardType.Number else KeyboardType.Text,
                )

                UploadSlot(
                    label = stringResource(R.string.kyc_upload_front),
                    uri = state.frontUri,
                    onPick = { pickFront.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                )
                UploadSlot(
                    label = stringResource(R.string.kyc_upload_back),
                    uri = state.backUri,
                    onPick = { pickBack.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                )
                UploadSlot(
                    label = stringResource(R.string.kyc_upload_selfie),
                    uri = state.selfieUri,
                    onPick = { pickSelfie.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)) },
                )

                PrimaryButton(
                    text = stringResource(R.string.kyc_submit),
                    loading = state.submitting,
                    enabled = state.frontUri != null && state.docNumber.length >= 4,
                    onClick = {
                        viewModel.submit { uri ->
                            runCatching {
                                val resolver = context.contentResolver
                                val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
                                    ?: return@runCatching null
                                val mime = resolver.getType(uri) ?: "image/jpeg"
                                bytes to mime
                            }.getOrNull()
                        }
                    },
                )
            }
        }
    }
}

@Composable
private fun KycStatusCard(status: String) {
    val (textRes, color, icon) = when (status) {
        "verified" -> Triple(R.string.kyc_status_verified, Color(0xFF16A34A), Icons.Default.CheckCircle)
        "pending" -> Triple(R.string.kyc_status_pending, Color(0xFFF59E0B), Icons.Default.HourglassBottom)
        "rejected" -> Triple(R.string.kyc_status_rejected, MaterialTheme.colorScheme.error, Icons.Default.CheckCircle)
        else -> Triple(R.string.kyc_status_none, MaterialTheme.colorScheme.onSurfaceVariant, Icons.Default.HourglassBottom)
    }
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Icon(icon, contentDescription = null, tint = color)
            Text(stringResource(textRes), style = MaterialTheme.typography.titleMedium)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DocTypePicker(selected: String, onSelect: (String) -> Unit) {
    val options = listOf(
        "aadhaar" to stringResource(R.string.kyc_doc_aadhaar),
        "pan" to stringResource(R.string.kyc_doc_pan),
        "passport" to stringResource(R.string.kyc_doc_passport),
        "driving_license" to stringResource(R.string.kyc_doc_dl),
    )
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(stringResource(R.string.kyc_doc_type), style = MaterialTheme.typography.labelLarge)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            options.forEach { (value, label) ->
                FilterChip(
                    selected = selected == value,
                    onClick = { onSelect(value) },
                    label = { Text(label) },
                )
            }
        }
    }
}

@Composable
private fun UploadSlot(label: String, uri: Uri?, onPick: () -> Unit) {
    OutlinedCard(onClick = onPick, modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            if (uri != null) {
                AsyncImage(
                    model = uri,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.size(56.dp).clip(RoundedCornerShape(8.dp)),
                )
            } else {
                Box(
                    Modifier
                        .size(56.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant),
                    contentAlignment = Alignment.Center,
                ) { Icon(Icons.Default.Upload, contentDescription = null) }
            }
            Column {
                Text(label, style = MaterialTheme.typography.titleSmall)
                Text(
                    if (uri == null) "Tap to select" else "Selected",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
