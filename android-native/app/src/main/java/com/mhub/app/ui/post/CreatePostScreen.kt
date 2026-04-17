package com.mhub.app.ui.post

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import com.mhub.app.R
import com.mhub.app.ui.components.AppTextField
import com.mhub.app.ui.components.ErrorBanner
import com.mhub.app.ui.components.PrimaryButton

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreatePostScreen(
    onBack: () -> Unit,
    onPublished: () -> Unit,
    viewModel: CreatePostViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    var title by rememberSaveable { mutableStateOf("") }
    var description by rememberSaveable { mutableStateOf("") }
    var priceText by rememberSaveable { mutableStateOf("") }
    var location by rememberSaveable { mutableStateOf("") }
    var expanded by remember { mutableStateOf(false) }

    val pickImages = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia(maxItems = 8),
    ) { uris: List<Uri> -> if (uris.isNotEmpty()) viewModel.setImages(uris) }

    LaunchedEffect(state.success) { if (state.success) onPublished() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.post_create_title)) },
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
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            ErrorBanner(message = state.error)

            AppTextField(
                value = title,
                onValueChange = { title = it; viewModel.clearError() },
                label = stringResource(R.string.post_title),
                imeAction = ImeAction.Next,
            )
            AppTextField(
                value = description,
                onValueChange = { description = it },
                label = stringResource(R.string.post_description),
                singleLine = false,
                imeAction = ImeAction.Next,
            )
            AppTextField(
                value = priceText,
                onValueChange = { v -> priceText = v.filter { it.isDigit() || it == '.' } },
                label = stringResource(R.string.post_price),
                keyboardType = KeyboardType.Decimal,
                imeAction = ImeAction.Next,
            )
            AppTextField(
                value = location,
                onValueChange = { location = it },
                label = stringResource(R.string.post_location),
                imeAction = ImeAction.Done,
            )

            ExposedDropdownMenuBox(
                expanded = expanded,
                onExpandedChange = { expanded = !expanded },
            ) {
                OutlinedTextField(
                    value = state.selectedCategory?.displayName ?: "",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text(stringResource(R.string.post_category)) },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor(),
                )
                ExposedDropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                    state.categories.forEach { c ->
                        DropdownMenuItem(
                            text = { Text(c.displayName) },
                            onClick = { viewModel.selectCategory(c); expanded = false },
                        )
                    }
                }
            }

            OutlinedButton(
                onClick = {
                    pickImages.launch(
                        androidx.activity.result.PickVisualMediaRequest(
                            ActivityResultContracts.PickVisualMedia.ImageOnly
                        )
                    )
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Icon(Icons.Default.AddAPhoto, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text(stringResource(R.string.post_add_images) + " (${state.imageUris.size}/8)")
            }

            if (state.imageUris.isNotEmpty()) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(state.imageUris) { uri ->
                        AsyncImage(
                            model = uri,
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(96.dp)
                                .clip(RoundedCornerShape(12.dp)),
                        )
                    }
                }
            }

            if (state.uploading) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.post_uploading_images))
                }
            }

            PrimaryButton(
                text = stringResource(R.string.post_publish),
                loading = state.submitting || state.uploading,
                enabled = title.length >= 3,
                onClick = {
                    viewModel.uploadImagesAndSubmit(
                        title = title,
                        description = description,
                        priceText = priceText,
                        location = location,
                        bytesProvider = { uri ->
                            runCatching {
                                val resolver = context.contentResolver
                                val bytes = resolver.openInputStream(uri)?.use { it.readBytes() }
                                    ?: return@runCatching null
                                val mime = resolver.getType(uri) ?: "image/jpeg"
                                bytes to mime
                            }.getOrNull()
                        },
                    )
                },
            )
        }
    }
}
