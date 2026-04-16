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
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.SavedStateHandle
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
fun EditPostScreen(
    onPostUpdated: () -> Unit,
    onPostDeleted: () -> Unit,
    onBack: () -> Unit,
    viewModel: EditPostViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    var showDeleteDialog by remember { mutableStateOf(false) }

    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetMultipleContents()
    ) { uris -> viewModel.addNewImages(uris) }

    LaunchedEffect(uiState.isSuccess) { if (uiState.isSuccess) onPostUpdated() }
    LaunchedEffect(uiState.isDeleted) { if (uiState.isDeleted) onPostDeleted() }

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete Listing") },
            text = { Text("Are you sure you want to delete this listing? This cannot be undone.") },
            confirmButton = {
                TextButton(
                    onClick = { showDeleteDialog = false; viewModel.deletePost() },
                    colors = ButtonDefaults.textButtonColors(contentColor = MaterialTheme.colorScheme.error),
                ) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { showDeleteDialog = false }) { Text("Cancel") } },
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit Listing") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { showDeleteDialog = true }) {
                        Icon(Icons.Default.Delete, "Delete", tint = MaterialTheme.colorScheme.error)
                    }
                },
            )
        },
    ) { padding ->
        if (uiState.isLoadingPost) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                // Existing images
                Text("Photos", style = MaterialTheme.typography.titleSmall)
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(uiState.existingImageUrls) { url ->
                        Box(modifier = Modifier.size(100.dp)) {
                            AsyncImage(
                                model = url,
                                contentDescription = "Post image",
                                modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(8.dp)),
                                contentScale = ContentScale.Crop,
                            )
                            IconButton(
                                onClick = { viewModel.removeExistingImage(url) },
                                modifier = Modifier.align(Alignment.TopEnd).size(24.dp),
                            ) {
                                Icon(
                                    Icons.Default.Close, "Remove",
                                    tint = MaterialTheme.colorScheme.onError,
                                    modifier = Modifier.background(MaterialTheme.colorScheme.error, RoundedCornerShape(12.dp)).padding(2.dp),
                                )
                            }
                        }
                    }
                    items(uiState.newImageUris) { uri ->
                        Box(modifier = Modifier.size(100.dp)) {
                            AsyncImage(
                                model = uri,
                                contentDescription = "New image",
                                modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(8.dp)),
                                contentScale = ContentScale.Crop,
                            )
                            IconButton(
                                onClick = { viewModel.removeNewImage(uri) },
                                modifier = Modifier.align(Alignment.TopEnd).size(24.dp),
                            ) {
                                Icon(
                                    Icons.Default.Close, "Remove",
                                    tint = MaterialTheme.colorScheme.onError,
                                    modifier = Modifier.background(MaterialTheme.colorScheme.error, RoundedCornerShape(12.dp)).padding(2.dp),
                                )
                            }
                        }
                    }
                    if ((uiState.existingImageUrls.size + uiState.newImageUris.size) < 10) {
                        item {
                            Box(
                                modifier = Modifier
                                    .size(100.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .border(2.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(8.dp))
                                    .clickable { imagePickerLauncher.launch("image/*") },
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(Icons.Default.AddAPhoto, "Add photos")
                            }
                        }
                    }
                }

                OutlinedTextField(value = uiState.title, onValueChange = viewModel::updateTitle, label = { Text("Title *") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                OutlinedTextField(value = uiState.description, onValueChange = viewModel::updateDescription, label = { Text("Description") }, modifier = Modifier.fillMaxWidth(), minLines = 3, maxLines = 6)
                OutlinedTextField(value = uiState.price, onValueChange = viewModel::updatePrice, label = { Text("Price") }, modifier = Modifier.fillMaxWidth(), singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                OutlinedTextField(value = uiState.location, onValueChange = viewModel::updateLocation, label = { Text("Location") }, modifier = Modifier.fillMaxWidth(), singleLine = true)

                uiState.errorMessage?.let {
                    Text(it, color = MaterialTheme.colorScheme.error)
                }

                Spacer(Modifier.height(8.dp))

                Button(onClick = viewModel::submit, modifier = Modifier.fillMaxWidth().height(50.dp), enabled = !uiState.isLoading) {
                    if (uiState.isLoading) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                    else Text("Update Listing")
                }
            }
        }
    }
}

data class EditPostUiState(
    val postId: Int = 0,
    val title: String = "",
    val description: String = "",
    val price: String = "",
    val location: String = "",
    val condition: String = "",
    val existingImageUrls: List<String> = emptyList(),
    val newImageUris: List<Uri> = emptyList(),
    val isLoadingPost: Boolean = true,
    val isLoading: Boolean = false,
    val isSuccess: Boolean = false,
    val isDeleted: Boolean = false,
    val errorMessage: String? = null,
)

@HiltViewModel
class EditPostViewModel @Inject constructor(
    savedStateHandle: SavedStateHandle,
    private val postRepository: PostRepository,
    private val imageUploader: ImageUploader,
) : ViewModel() {

    private val postId: Int = savedStateHandle["postId"] ?: 0
    private val _uiState = MutableStateFlow(EditPostUiState(postId = postId))
    val uiState = _uiState.asStateFlow()

    init {
        loadPost()
    }

    private fun loadPost() {
        viewModelScope.launch {
            when (val result = postRepository.fetchPost(postId)) {
                is Result.Success -> {
                    val post = result.data
                    _uiState.update {
                        it.copy(
                            isLoadingPost = false,
                            title = post.title,
                            description = post.description ?: "",
                            price = post.price?.toString() ?: "",
                            location = post.location ?: "",
                            condition = post.condition ?: "",
                            existingImageUrls = post.images,
                        )
                    }
                }
                is Result.Error -> _uiState.update { it.copy(isLoadingPost = false, errorMessage = result.message) }
                is Result.Loading -> {}
            }
        }
    }

    fun updateTitle(v: String) { _uiState.update { it.copy(title = v, errorMessage = null) } }
    fun updateDescription(v: String) { _uiState.update { it.copy(description = v) } }
    fun updatePrice(v: String) { _uiState.update { it.copy(price = v) } }
    fun updateLocation(v: String) { _uiState.update { it.copy(location = v) } }
    fun removeExistingImage(url: String) { _uiState.update { it.copy(existingImageUrls = it.existingImageUrls - url) } }
    fun addNewImages(uris: List<Uri>) { _uiState.update { it.copy(newImageUris = (it.newImageUris + uris).take(10 - it.existingImageUrls.size)) } }
    fun removeNewImage(uri: Uri) { _uiState.update { it.copy(newImageUris = it.newImageUris - uri) } }

    fun submit() {
        val s = _uiState.value
        if (s.title.isBlank()) { _uiState.update { it.copy(errorMessage = "Title is required") }; return }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }

            val uploadedUrls = mutableListOf<String>()
            for (uri in s.newImageUris) {
                val result = imageUploader.uploadImage(uri)
                result.onSuccess { uploadedUrls.add(it.url) }
                result.onFailure { e ->
                    _uiState.update { it.copy(isLoading = false, errorMessage = "Upload failed: ${e.message}") }
                    return@launch
                }
            }

            val allImages = s.existingImageUrls + uploadedUrls
            val request = CreatePostRequest(
                title = s.title,
                description = s.description.ifBlank { null },
                price = s.price.toDoubleOrNull(),
                location = s.location.ifBlank { null },
                condition = s.condition.ifBlank { null },
                images = allImages,
            )
            when (val result = postRepository.updatePost(postId, request)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, isSuccess = true) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, errorMessage = result.message ?: "Update failed") }
                is Result.Loading -> {}
            }
        }
    }

    fun deletePost() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            when (postRepository.deletePost(postId)) {
                is Result.Success -> _uiState.update { it.copy(isLoading = false, isDeleted = true) }
                is Result.Error -> _uiState.update { it.copy(isLoading = false, errorMessage = "Delete failed") }
                is Result.Loading -> {}
            }
        }
    }
}
