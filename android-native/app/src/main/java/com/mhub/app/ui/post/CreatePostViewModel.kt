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
import com.mhub.app.ui.common.InputValidators
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

    fun selectCategory(c: Category) { _state.value = _state.value.copy(selectedCategory = c, error = null) }

    fun clearError() { _state.value = _state.value.copy(error = null) }

    fun setImages(uris: List<Uri>) {
        _state.value = _state.value.copy(
            imageUris = uris.take(8),
            uploadedUrls = emptyList(),
            error = null,
        )
    }

    fun uploadImagesAndSubmit(
        title: String,
        description: String,
        priceText: String,
        location: String,
        bytesProvider: suspend (Uri) -> Pair<ByteArray, String>?,
    ) {
        if (_state.value.submitting || _state.value.uploading) return
        val validationError = validateSubmission(
            title = title,
            priceText = priceText,
        )
        if (validationError != null) {
            _state.value = _state.value.copy(error = validationError)
            return
        }

        val snapshot = _state.value
        val price = priceText.trim().takeIf { it.isNotEmpty() }?.let(InputValidators::parsePositiveAmount)
        _state.value = snapshot.copy(error = null, uploading = true)
        viewModelScope.launch {
            val urls = mutableListOf<String>()
            for (uri in snapshot.imageUris) {
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
                categoryId = snapshot.selectedCategory?.stableId,
                images = urls,
            )
            when (val r = postsRepo.create(req)) {
                is ApiResult.Success -> _state.value = _state.value.copy(submitting = false, success = true)
                is ApiResult.Failure -> _state.value = _state.value.copy(submitting = false, error = r.error.message)
            }
        }
    }

    private fun validateSubmission(title: String, priceText: String): String? {
        if (!InputValidators.isValidTitle(title)) {
            return "Title must be 3-120 characters"
        }
        if (!InputValidators.hasSufficientImages(_state.value.imageUris.size)) {
            return "Add at least one photo"
        }
        if (_state.value.selectedCategory == null) {
            return "Select a category"
        }
        if (priceText.isNotBlank() && InputValidators.parsePositiveAmount(priceText) == null) {
            return "Enter a valid price"
        }
        return null
    }
}
