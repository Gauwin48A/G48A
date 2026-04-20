package com.mhub.app.ui.kyc

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.HourglassBottom
import androidx.compose.material.icons.filled.Upload
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
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
                title = { Text(stringResource(R.string.kyc_title), fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface,
                ),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .imePadding()
                .padding(horizontal = 16.dp, vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            StatusCard(status = state.status.kycStatus)
            Text(
                text = stringResource(R.string.kyc_intro),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )

            ErrorBanner(message = state.error)

            if (state.status.kycStatus != "verified" && state.status.kycStatus != "pending") {
                Text(
                    text = stringResource(R.string.kyc_doc_type),
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.SemiBold,
                )

                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    DocTypeChip("aadhaar", stringResource(R.string.kyc_doc_aadhaar), state.docType, viewModel::setDocType)
                    DocTypeChip("pan", stringResource(R.string.kyc_doc_pan), state.docType, viewModel::setDocType)
                    DocTypeChip("passport", stringResource(R.string.kyc_doc_passport), state.docType, viewModel::setDocType)
                    DocTypeChip("driving_license", stringResource(R.string.kyc_doc_dl), state.docType, viewModel::setDocType)
                }

                AppTextField(
                    value = state.docNumber,
                    onValueChange = {
                        viewModel.setDocNumber(it.uppercase())
                        viewModel.clearError()
                    },
                    label = stringResource(R.string.kyc_doc_number),
                    keyboardType = if (state.docType == "aadhaar") KeyboardType.Number else KeyboardType.Text,
                )

                UploadSlot(
                    label = stringResource(R.string.kyc_upload_front),
                    uri = state.frontUri,
                    onPick = {
                        pickFront.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                    },
                )
                UploadSlot(
                    label = stringResource(R.string.kyc_upload_back),
                    uri = state.backUri,
                    onPick = {
                        pickBack.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                    },
                )
                UploadSlot(
                    label = stringResource(R.string.kyc_upload_selfie),
                    uri = state.selfieUri,
                    onPick = {
                        pickSelfie.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                    },
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
private fun StatusCard(status: String) {
    val (label, tint, icon) = when (status) {
        "verified" -> Triple(stringResource(R.string.kyc_status_verified), Color(0xFF067647), Icons.Default.CheckCircle)
        "pending" -> Triple(stringResource(R.string.kyc_status_pending), Color(0xFFB54708), Icons.Default.HourglassBottom)
        "rejected" -> Triple(stringResource(R.string.kyc_status_rejected), MaterialTheme.colorScheme.error, Icons.Default.CheckCircle)
        else -> Triple(stringResource(R.string.kyc_status_none), MaterialTheme.colorScheme.onSurfaceVariant, Icons.Default.HourglassBottom)
    }

    Surface(
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(icon, contentDescription = null, tint = tint)
            Text(text = label, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun DocTypeChip(
    value: String,
    label: String,
    selected: String,
    onSelect: (String) -> Unit,
) {
    FilterChip(selected = selected == value, onClick = { onSelect(value) }, label = { Text(label) })
}

@Composable
private fun UploadSlot(label: String, uri: Uri?, onPick: () -> Unit) {
    Surface(
        onClick = onPick,
        shape = RoundedCornerShape(16.dp),
        color = MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(62.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
                contentAlignment = Alignment.Center,
            ) {
                if (uri != null) {
                    AsyncImage(
                        model = uri,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                } else {
                    Icon(Icons.Default.Upload, contentDescription = null)
                }
            }
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(text = label, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                Text(
                    text = if (uri == null) "Tap to upload" else "Selected",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}
