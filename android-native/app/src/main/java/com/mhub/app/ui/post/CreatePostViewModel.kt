package com.mhub.app.ui.post

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.CreatePostRequest
import com.mhub.app.data.repository.AuthRepository
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
    val draftSaved: Boolean = false,
    /** Plan-tier-derived per-listing image cap (web-parity: basic=1, bronze=3, silver=5, gold/premium=10). */
    val maxImages: Int = 1,
    val planTier: String = "basic",
    val kycVerified: Boolean = false,
    val showKycGate: Boolean = false,
    val audioUri: Uri? = null,
) {
    companion object {
        /** Mirror of web `client/src/utils/planLimits.js` image caps. */
        val IMAGE_LIMIT: Map<String, Int> = mapOf(
            "basic" to 1,
            "bronze" to 3,
            "silver" to 5,
            "gold" to 10,
            "premium" to 10,
            "platinum" to 10,
        )
        fun limitFor(tier: String?): Int = IMAGE_LIMIT[tier?.lowercase()?.trim()] ?: 1
    }
}

@HiltViewModel
class CreatePostViewModel @Inject constructor(
    private val postsRepo: PostsRepository,
    private val categoriesRepo: CategoriesRepository,
    private val uploadRepo: UploadRepository,
    private val authRepo: AuthRepository,
    private val draftRepo: com.mhub.app.data.repository.DraftRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(CreatePostState())
    val state: StateFlow<CreatePostState> = _state.asStateFlow()

    init {
        loadCategories()
        loadUserPlan()
    }

    private fun loadUserPlan() = viewModelScope.launch {
        when (val r = authRepo.me()) {
            is ApiResult.Success -> {
                val tier = r.data.currentPlan?.lowercase()?.trim() ?: "basic"
                _state.value = _state.value.copy(
                    planTier = tier,
                    maxImages = CreatePostState.limitFor(tier),
                    kycVerified = r.data.isKycVerified,
                    showKycGate = !r.data.isKycVerified,
                )
            }
            is ApiResult.Failure -> Unit // keep defaults; user may be logged-out
        }
    }

    fun dismissKycGate() { _state.value = _state.value.copy(showKycGate = false) }

    private fun loadCategories() = viewModelScope.launch {
        when (val r = categoriesRepo.all()) {
            is ApiResult.Success -> _state.value = _state.value.copy(categories = r.data)
            is ApiResult.Failure -> _state.value = _state.value.copy(error = r.error.message)
        }
    }

    fun selectCategory(c: Category) { _state.value = _state.value.copy(selectedCategory = c, error = null) }

    fun clearError() { _state.value = _state.value.copy(error = null) }

    fun saveDraft(title: String, description: String, priceText: String) {
        viewModelScope.launch {
            draftRepo.save(com.mhub.app.data.remote.dto.DraftRequest(
                title = title.trim().ifBlank { null },
                description = description.trim().ifBlank { null },
                price = priceText.trim().toDoubleOrNull(),
                categoryId = _state.value.selectedCategory?.stableId,
            ))
        }
    }

    fun setAudioUri(uri: Uri?) {
        _state.value = _state.value.copy(audioUri = uri)
    }

    fun setImages(uris: List<Uri>) {
        val cap = _state.value.maxImages.coerceAtLeast(1)
        _state.value = _state.value.copy(
            imageUris = uris.take(cap),
            uploadedUrls = emptyList(),
            error = null,
        )
    }

    fun uploadImagesAndSubmit(
        title: String,
        description: String,
        priceText: String,
        location: String,
        brand: String = "",
        model: String = "",
        condition: String = "",
        contactNumber: String = "",
        warrantyStatus: String = "",
        flashSale: Boolean = false,
        ageMonths: String = "",
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
                brand = brand.trim().ifBlank { null },
                model = model.trim().ifBlank { null },
                condition = condition.ifBlank { null },
                contactNumber = contactNumber.trim().takeIf { it.length == 10 },
                warrantyStatus = warrantyStatus.ifBlank { null },
                flashSale = if (flashSale) true else null,
                ageMonths = ageMonths.trim().toIntOrNull(),
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
