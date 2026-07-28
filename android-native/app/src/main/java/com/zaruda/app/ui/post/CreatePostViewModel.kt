package com.zaruda.app.ui.post

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.core.ApiResult
import com.zaruda.app.core.userFacingMessage
import com.zaruda.app.data.remote.dto.CreatePostRequest
import com.zaruda.app.data.remote.dto.DraftRequest
import com.zaruda.app.data.remote.dto.DraftResponse
import com.zaruda.app.data.repository.AuthRepository
import com.zaruda.app.data.repository.CategoriesRepository
import com.zaruda.app.data.repository.DraftRepository
import com.zaruda.app.data.repository.PostsRepository
import com.zaruda.app.data.repository.UploadRepository
import com.zaruda.app.domain.model.Category
import com.zaruda.app.ui.common.InputValidators
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class CreatePostState(
    val categories: List<Category> = emptyList(),
    val selectedCategory: Category? = null,
    val subcategories: List<Category> = emptyList(),
    val selectedSubcategory: Category? = null,
    val imageUris: List<Uri> = emptyList(),
    val uploadedUrls: List<String> = emptyList(),
    val uploading: Boolean = false,
    val submitting: Boolean = false,
    val success: Boolean = false,
    val error: String? = null,
    /** Plan-tier-derived per-listing image cap. */
    val maxImages: Int = 1,
    /** Loaded draft to restore. */
    val draftData: DraftResponse? = null,
    val savingDraft: Boolean = false,
    val draftSaved: Boolean = false,
) {
    companion object {
        /** Image caps per plan tier (mirrors web client/src/utils/planLimits.js). */
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
    private val draftRepo: DraftRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(CreatePostState())
    val state: StateFlow<CreatePostState> = _state.asStateFlow()

    init {
        loadCategories()
        loadUserPlan()
        loadDraft()
    }

    // ── Loading ──────────────────────────────────────────────────────────

    private fun loadUserPlan() = viewModelScope.launch {
        when (val r = authRepo.me()) {
            is ApiResult.Success -> {
                val tier = r.data.currentPlan?.lowercase()?.trim() ?: "basic"
                _state.value = _state.value.copy(maxImages = CreatePostState.limitFor(tier))
            }
            is ApiResult.Failure -> Unit // keep defaults
        }
    }

    private fun loadCategories() = viewModelScope.launch {
        when (val r = categoriesRepo.all()) {
            is ApiResult.Success -> _state.value = _state.value.copy(categories = r.data)
            is ApiResult.Failure -> _state.value = _state.value.copy(error = r.error.userFacingMessage("load listing categories"))
        }
    }

    private fun loadSubcategories(categoryId: String) = viewModelScope.launch {
        _state.value = _state.value.copy(subcategories = emptyList())
        when (val r = categoriesRepo.subcategories(categoryId)) {
            is ApiResult.Success -> _state.value = _state.value.copy(subcategories = r.data)
            is ApiResult.Failure -> {} // silently ignore
        }
    }

    private fun loadDraft() = viewModelScope.launch {
        when (val r = draftRepo.get()) {
            is ApiResult.Success -> {
                val draft = r.data
                _state.value = _state.value.copy(draftData = draft)
                // Auto-select category if draft has one
                if (draft.categoryId != null && draft.categoryId.isNotBlank()) {
                    val cat = _state.value.categories.find { it.stableId == draft.categoryId }
                    if (cat != null) {
                        selectCategory(cat)
                    }
                }
            }
            is ApiResult.Failure -> {} // no saved draft
        }
    }

    // ── User actions ─────────────────────────────────────────────────────

    fun selectCategory(c: Category) {
        _state.value = _state.value.copy(selectedCategory = c, selectedSubcategory = null, error = null)
        loadSubcategories(c.stableId)
    }

    fun selectSubcategory(c: Category) { _state.value = _state.value.copy(selectedSubcategory = c, error = null) }
    fun clearError() { _state.value = _state.value.copy(error = null) }

    fun setImages(uris: List<Uri>) {
        val cap = _state.value.maxImages.coerceAtLeast(1)
        _state.value = _state.value.copy(
            imageUris = uris.take(cap),
            uploadedUrls = emptyList(),
            error = null,
        )
    }

    // ── Draft auto-save ──────────────────────────────────────────────────

    fun saveDraft(title: String?, description: String?, priceText: String?, location: String?) {
        if (_state.value.savingDraft) return
        viewModelScope.launch {
            _state.value = _state.value.copy(savingDraft = true, draftSaved = false)
            val price = priceText?.takeIf { it.isNotBlank() }?.let(InputValidators::parsePositiveAmount)
            val req = DraftRequest(
                title = title?.trim()?.takeIf { it.isNotBlank() },
                description = description?.trim()?.takeIf { it.isNotBlank() },
                price = price,
                categoryId = _state.value.selectedCategory?.stableId,
                location = location?.trim()?.takeIf { it.isNotBlank() },
            )
            when (draftRepo.save(req)) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(savingDraft = false, draftSaved = true)
                    // Auto-clear "Draft saved" indicator after 3s
                    launch {
                        delay(3000)
                        _state.value = _state.value.copy(draftSaved = false)
                    }
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(savingDraft = false)
            }
        }
    }

    fun clearDraft() {
        viewModelScope.launch {
            draftRepo.clear()
            _state.value = _state.value.copy(draftData = null, draftSaved = false)
        }
    }

    // ── Image upload & submit ────────────────────────────────────────────

    fun uploadImagesAndSubmit(
        title: String,
        description: String,
        priceText: String,
        location: String,
        bytesProvider: suspend (Uri) -> Pair<ByteArray, String>?,
    ) {
        if (_state.value.submitting || _state.value.uploading) return
        val validationError = validateSubmission(title, priceText)
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
                        _state.value = _state.value.copy(uploading = false, error = r.error.userFacingMessage("upload your listing photo"))
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
                subcategoryId = snapshot.selectedSubcategory?.stableId,
                images = urls,
            )
            when (val r = postsRepo.create(req)) {
                is ApiResult.Success -> _state.value = _state.value.copy(submitting = false, success = true)
                is ApiResult.Failure -> _state.value = _state.value.copy(submitting = false, error = r.error.userFacingMessage("publish this listing"))
            }
        }
    }

    private fun validateSubmission(title: String, priceText: String): String? {
        if (!InputValidators.isValidTitle(title)) return "Title must be 3-120 characters"
        if (!InputValidators.hasSufficientImages(_state.value.imageUris.size)) return "Add at least one photo"
        if (_state.value.selectedCategory == null) return "Select a category"
        if (_state.value.selectedSubcategory == null) return "Select a subcategory"
        if (priceText.isNotBlank() && InputValidators.parsePositiveAmount(priceText) == null) return "Enter a valid price"
        return null
    }
}
