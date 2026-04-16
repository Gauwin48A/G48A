package com.mhub.feature.profile

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import coil.compose.AsyncImage
import com.mhub.core.common.model.User
import com.mhub.core.common.result.Result
import com.mhub.core.data.repository.ProfileRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class EditProfileUiState(
    val name: String = "",
    val bio: String = "",
    val avatarUrl: String? = null,
    val newAvatarUri: Uri? = null,
    val isLoading: Boolean = true,
    val isSaving: Boolean = false,
    val isSaved: Boolean = false,
    val error: String? = null,
)

@Composable
fun EditProfileScreen(
    onBack: () -> Unit,
    onSaved: () -> Unit,
    viewModel: EditProfileViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()

    LaunchedEffect(uiState.isSaved) {
        if (uiState.isSaved) onSaved()
    }

    val imagePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let { viewModel.updateAvatar(it) }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Edit Profile") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    TextButton(
                        onClick = viewModel::save,
                        enabled = !uiState.isSaving,
                    ) {
                        if (uiState.isSaving) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                        } else {
                            Text("Save")
                        }
                    }
                },
            )
        },
    ) { padding ->
        when {
            uiState.isLoading -> {
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            else -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    // Avatar
                    Box(
                        modifier = Modifier.size(120.dp),
                        contentAlignment = Alignment.BottomEnd,
                    ) {
                        val imageModel = uiState.newAvatarUri ?: uiState.avatarUrl
                        if (imageModel != null) {
                            AsyncImage(
                                model = imageModel,
                                contentDescription = "Profile photo",
                                modifier = Modifier.size(120.dp).clip(CircleShape),
                                contentScale = ContentScale.Crop,
                            )
                        } else {
                            Surface(
                                modifier = Modifier.size(120.dp).clip(CircleShape),
                                color = MaterialTheme.colorScheme.primaryContainer,
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(
                                        uiState.name.take(1).uppercase(),
                                        style = MaterialTheme.typography.headlineLarge,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                                    )
                                }
                            }
                        }
                        FloatingActionButton(
                            onClick = { imagePicker.launch("image/*") },
                            modifier = Modifier.size(36.dp),
                            containerColor = MaterialTheme.colorScheme.primary,
                        ) {
                            Icon(
                                Icons.Default.CameraAlt,
                                contentDescription = "Change photo",
                                modifier = Modifier.size(18.dp),
                            )
                        }
                    }

                    Spacer(Modifier.height(32.dp))

                    OutlinedTextField(
                        value = uiState.name,
                        onValueChange = viewModel::updateName,
                        label = { Text("Display Name") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                    )

                    Spacer(Modifier.height(16.dp))

                    OutlinedTextField(
                        value = uiState.bio,
                        onValueChange = viewModel::updateBio,
                        label = { Text("Bio") },
                        modifier = Modifier.fillMaxWidth(),
                        minLines = 3,
                        maxLines = 5,
                    )

                    Spacer(Modifier.height(16.dp))

                    uiState.error?.let { error ->
                        Text(
                            error,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }
                }
            }
        }
    }
}

@HiltViewModel
class EditProfileViewModel @Inject constructor(
    private val profileRepository: ProfileRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(EditProfileUiState())
    val uiState = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    private fun loadProfile() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            when (val result = profileRepository.getProfile()) {
                is Result.Success -> {
                    val user = result.data
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            name = user.name,
                            bio = user.bio ?: "",
                            avatarUrl = user.avatar,
                        )
                    }
                }
                is Result.Error -> _uiState.update {
                    it.copy(isLoading = false, error = result.message ?: "Failed to load profile")
                }
                is Result.Loading -> {}
            }
        }
    }

    fun updateName(name: String) {
        _uiState.update { it.copy(name = name, error = null) }
    }

    fun updateBio(bio: String) {
        _uiState.update { it.copy(bio = bio, error = null) }
    }

    fun updateAvatar(uri: Uri) {
        _uiState.update { it.copy(newAvatarUri = uri, error = null) }
    }

    fun save() {
        val state = _uiState.value
        if (state.name.isBlank()) {
            _uiState.update { it.copy(error = "Name is required") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSaving = true, error = null) }
            // TODO: Upload newAvatarUri to server and get URL back
            val avatarUrl = state.newAvatarUri?.toString() // Placeholder
            when (val result = profileRepository.updateProfile(
                name = state.name,
                bio = state.bio.ifBlank { null },
                avatar = avatarUrl,
            )) {
                is Result.Success -> _uiState.update { it.copy(isSaving = false, isSaved = true) }
                is Result.Error -> _uiState.update {
                    it.copy(isSaving = false, error = result.message ?: "Failed to save")
                }
                is Result.Loading -> {}
            }
        }
    }
}
