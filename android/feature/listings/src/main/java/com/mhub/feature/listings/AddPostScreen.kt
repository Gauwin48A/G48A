package com.mhub.feature.listings

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AddAPhoto
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.core.common.result.Result
import com.mhub.core.common.util.ImageUploader
import com.mhub.core.data.repository.PostRepository
import com.mhub.core.network.model.CreatePostRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@Composable
fun AddPostScreen(
    onPostCreated: () -> Unit,
    onBack: () -> Unit,
    viewModel: AddPostViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetMultipleContents()
    ) { uris: List<Uri> ->
        viewModel.addImages(uris)
    }

    LaunchedEffect(uiState.isSuccess) {
        if (uiState.isSuccess) onPostCreated()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Create Listing") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
                .semantics { contentDescription = "Create listing form" },
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            // Image picker section
            Text("Photos", style = MaterialTheme.typography.titleSmall)
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(uiState.imageUris) { uri ->
                    Box(modifier = Modifier.size(100.dp)) {
                        AsyncImage(
                            model = uri,
                            contentDescription = "Selected image",
                            modifier = Modifier
                                .fillMaxSize()
                                .clip(RoundedCornerShape(8.dp)),
                            contentScale = ContentScale.Crop,
                        )
                        IconButton(
                            onClick = { viewModel.removeImage(uri) },
                            modifier = Modifier.align(Alignment.TopEnd).size(24.dp),
                        ) {
                            Icon(
                                Icons.Default.Close,
                                "Remove image",
                                tint = MaterialTheme.colorScheme.onError,
                                modifier = Modifier
                                    .background(MaterialTheme.colorScheme.error, RoundedCornerShape(12.dp))
                                    .padding(2.dp),
                            )
                        }
                    }
                }
                if (uiState.imageUris.size < 10) {
                    item {
                        Box(
                            modifier = Modifier
                                .size(100.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .border(2.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp))
                                .clickable { imagePickerLauncher.launch("image/*") },
                            contentAlignment = Alignment.Center,
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.AddAPhoto, "Add photos")
                                Text("Add", style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
            }

            OutlinedTextField(value = uiState.title, onValueChange = viewModel::updateTitle, label = { Text("Title *") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            OutlinedTextField(value = uiState.description, onValueChange = viewModel::updateDescription, label = { Text("Description") }, modifier = Modifier.fillMaxWidth(), minLines = 3, maxLines = 6)
            OutlinedTextField(value = uiState.price, onValueChange = viewModel::updatePrice, label = { Text("Price (INR)") }, modifier = Modifier.fillMaxWidth(), singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))

            // Condition dropdown
            var conditionExpanded by remember { mutableStateOf(false) }
            ExposedDropdownMenuBox(
                expanded = conditionExpanded,
                onExpandedChange = { conditionExpanded = it },
            ) {
                OutlinedTextField(
                    value = uiState.condition,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Condition") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = conditionExpanded) },
                    modifier = Modifier.fillMaxWidth().menuAnchor(),
                )
                ExposedDropdownMenu(
                    expanded = conditionExpanded,
                    onDismissRequest = { conditionExpanded = false },
                ) {
                    listOf("New", "Like New", "Good", "Fair", "Poor").forEach { condition ->
                        DropdownMenuItem(
                            text = { Text(condition) },
                            onClick = {
                                viewModel.updateCondition(condition)
                                conditionExpanded = false
                            },
                        )
                    }
                }
            }

            OutlinedTextField(value = uiState.location, onValueChange = viewModel::updateLocation, label = { Text("Location") }, modifier = Modifier.fillMaxWidth(), singleLine = true)

            uiState.errorMessage?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            if (uiState.uploadProgress > 0f && uiState.uploadProgress < 1f) {
                LinearProgressIndicator(
                    progress = { uiState.uploadProgress },
                    modifier = Modifier.fillMaxWidth(),
                )
                Text("Uploading images...", style = MaterialTheme.typography.bodySmall)
            }

            Spacer(modifier = Modifier.height(8.dp))

            Button(onClick = viewModel::submit, modifier = Modifier.fillMaxWidth().height(50.dp), enabled = !uiState.isLoading) {
                if (uiState.isLoading) CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                else Text("Post Listing")
            }
        }
    }
}

data class AddPostUiState(
    val title: String = "",
    val description: String = "",
    val price: String = "",
    val location: String = "",
    val condition: String = "",
    val imageUris: List<Uri> = emptyList(),
    val uploadedImageUrls: List<String> = emptyList(),
    val uploadProgress: Float = 0f,
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val errorMessage: String? = null,
)

@HiltViewModel
class AddPostViewModel @Inject constructor(
    private val postRepository: PostRepository,
    private val imageUploader: ImageUploader,
) : ViewModel() {
    private val _uiState = MutableStateFlow(AddPostUiState())
    val uiState = _uiState.asStateFlow()

    fun updateTitle(v: String) { _uiState.update { it.copy(title = v, errorMessage = null) } }
    fun updateDescription(v: String) { _uiState.update { it.copy(description = v) } }
    fun updatePrice(v: String) { _uiState.update { it.copy(price = v) } }
    fun updateLocation(v: String) { _uiState.update { it.copy(location = v) } }
    fun updateCondition(v: String) { _uiState.update { it.copy(condition = v) } }

    fun addImages(uris: List<Uri>) {
        val current = _uiState.value.imageUris
        val newList = (current + uris).take(10)
        _uiState.update { it.copy(imageUris = newList) }
    }

    fun removeImage(uri: Uri) {
        _uiState.update { it.copy(imageUris = it.imageUris - uri) }
    }

    fun submit() {
        val s = _uiState.value
        if (s.title.isBlank()) { _uiState.update { it.copy(errorMessage = "Title is required") }; return }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            // Upload images first
            val uploadedUrls = mutableListOf<String>()
            if (s.imageUris.isNotEmpty()) {
                s.imageUris.forEachIndexed { index, uri ->
                    _uiState.update { it.copy(uploadProgress = (index.toFloat()) / s.imageUris.size) }
                    val result = imageUploader.uploadImage(uri)
                    result.onSuccess { uploadedUrls.add(it.url) }
                    result.onFailure { e ->
                        _uiState.update { it.copy(isLoading = false, uploadProgress = 0f, errorMessage = "Failed to upload image: ${e.message}") }
                        return@launch
                    }
                }
                _uiState.update { it.copy(uploadProgress = 1f) }
            }

            val request = CreatePostRequest(
                title = s.title,
                description = s.description.ifBlank { null },
                price = s.price.toDoubleOrNull(),
                location = s.location.ifBlank { null },
                condition = s.condition.ifBlank { null },
                images = uploadedUrls,
            )
            when (val result = postRepository.createPost(request)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, isSuccess = true) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, uploadProgress = 0f, errorMessage = result.message ?: "Failed to create post") }
                is Result.Loading -> {}
            }
        }
    }
}
