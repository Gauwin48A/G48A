package com.mhub.app.ui.post

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.CreatePostRequest
import com.mhub.app.data.repository.CategoriesRepository
import com.mhub.app.data.repository.PostsRepository
import com.mhub.app.data.repository.UploadRepository
import com.mhub.app.domain.model.Category
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CreatePostState(
    val categories: List<Category> = emptyList(),
    val selectedCategory: Category? = null,
    val imageUris: List<Uri> = emptyList(),
    val uploadedUrls: List<String> = emptyList(),
    val uploading: Boolean = false,
    val submitting: Boolean = false,
    val success: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class CreatePostViewModel @Inject constructor(
    private val postsRepo: PostsRepository,
    private val categoriesRepo: CategoriesRepository,
    private val uploadRepo: UploadRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(CreatePostState())
    val state: StateFlow<CreatePostState> = _state.asStateFlow()

    init { loadCategories() }

    private fun loadCategories() = viewModelScope.launch {
        when (val r = categoriesRepo.all()) {
            is ApiResult.Success -> _state.value = _state.value.copy(categories = r.data)
            is ApiResult.Failure -> _state.value = _state.value.copy(error = r.error.message)
        }
    }

    fun selectCategory(c: Category) { _state.value = _state.value.copy(selectedCategory = c) }

    fun clearError() { _state.value = _state.value.copy(error = null) }

    fun setImages(uris: List<Uri>) {
        _state.value = _state.value.copy(imageUris = uris.take(8), uploadedUrls = emptyList())
    }

    fun uploadImagesAndSubmit(
        title: String,
        description: String,
        priceText: String,
        location: String,
        bytesProvider: suspend (Uri) -> Pair<ByteArray, String>?,
    ) {
        if (_state.value.submitting || _state.value.uploading) return
        val price = priceText.toDoubleOrNull()
        _state.value = _state.value.copy(error = null, uploading = true)
        viewModelScope.launch {
            val urls = mutableListOf<String>()
            for (uri in _state.value.imageUris) {
                val pair = bytesProvider(uri)
                if (pair == null) {
                    _state.value = _state.value.copy(uploading = false, error = "Could not read image")
                    return@launch
                }
                val (bytes, mime) = pair
                when (val r = uploadRepo.uploadPostImage(bytes, mime)) {
                    is ApiResult.Success -> urls += r.data
                    is ApiResult.Failure -> {
                        _state.value = _state.value.copy(uploading = false, error = r.error.message)
                        return@launch
                    }
                }
            }
            _state.value = _state.value.copy(uploading = false, submitting = true, uploadedUrls = urls)

            val req = CreatePostRequest(
                title = title.trim(),
                description = description.trim().ifBlank { null },
                price = price,
                location = location.trim().ifBlank { null },
                categoryId = _state.value.selectedCategory?.stableId,
                images = urls,
            )
            when (val r = postsRepo.create(req)) {
                is ApiResult.Success -> _state.value = _state.value.copy(submitting = false, success = true)
                is ApiResult.Failure -> _state.value = _state.value.copy(submitting = false, error = r.error.message)
            }
        }
    }
}
