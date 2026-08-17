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
import com.zaruda.app.data.repository.BrandsRepository
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
    // ── New fields ─────────────────────────────────────────────────────
    val condition: String? = null,
    val brand: String = "",
    val model: String = "",
    val brandSuggestions: List<String> = emptyList(),
    val contactNumber: String = "",
    val ageMonths: Int? = null,
    val isNegotiable: Boolean = false,
    val loadingBrands: Boolean = false,
    val categoriesLoading: Boolean = false,
    val subcategoriesLoading: Boolean = false,
    // ── Flash sale ─────────────────────────────────────────────────────
    val flashSale: Boolean = false,
) {
    companion object {
        /**
         * Image caps per plan tier — mirrors server/src/config/tierRules.js
         * (maxImages): every plan gets 1 photo per post, Premium gets 10.
         */
        val IMAGE_LIMIT: Map<String, Int> = mapOf(
            "basic" to 1,
            "starter" to 1,
            "silver" to 3,
            "gold" to 5,
            "premium" to 10,
            "platinum" to 10,
        )
        fun limitFor(tier: String?): Int = IMAGE_LIMIT[tier?.lowercase()?.trim()] ?: 1

        /** Condition options for the chip selector. */
        val CONDITIONS: List<String> = listOf("New", "Like New", "Used", "Refurbished")
    }
}

@HiltViewModel
class CreatePostViewModel @Inject constructor(
    private val postsRepo: PostsRepository,
    private val categoriesRepo: CategoriesRepository,
    private val uploadRepo: UploadRepository,
    private val authRepo: AuthRepository,
    private val draftRepo: DraftRepository,
    private val brandsRepo: BrandsRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(CreatePostState())
    val state: StateFlow<CreatePostState> = _state.asStateFlow()

    init {
        loadCategories()
        loadUserPlan()
        loadBrands()
        loadDraft()
        prefillContactNumber()
    }

    // ── Loading ──────────────────────────────────────────────────────────

    private fun loadUserPlan() = viewModelScope.launch {
        if (authRepo.isDemoSession) {
            _state.value = _state.value.copy(maxImages = CreatePostState.limitFor("premium"))
            return@launch
        }
        when (val r = authRepo.me()) {
            is ApiResult.Success -> {
                val tier = r.data.currentPlan?.lowercase()?.trim() ?: "basic"
                _state.value = _state.value.copy(maxImages = CreatePostState.limitFor(tier))
            }
            is ApiResult.Failure -> Unit
        }
    }

    private fun loadCategories() = viewModelScope.launch {
        _state.value = _state.value.copy(categoriesLoading = true)
        when (val r = categoriesRepo.all()) {
            is ApiResult.Success -> _state.value = _state.value.copy(categories = r.data, categoriesLoading = false)
            is ApiResult.Failure -> _state.value = _state.value.copy(
                categoriesLoading = false,
                error = r.error.userFacingMessage("load listing categories"),
            )
        }
    }

    /** Retry loading the category list after a transient failure. */
    fun retryCategories() = loadCategories()

    private fun loadSubcategories(categoryId: String) = viewModelScope.launch {
        _state.value = _state.value.copy(subcategories = emptyList(), subcategoriesLoading = true)
        when (val r = categoriesRepo.subcategories(categoryId)) {
            is ApiResult.Success -> {
                val list = if (r.data.isNotEmpty()) r.data else listOf(
                    Category(id = "${categoryId}_gen", name = "General"),
                    Category(id = "${categoryId}_acc", name = "Accessories"),
                    Category(id = "${categoryId}_oth", name = "Others"),
                )
                _state.value = _state.value.copy(subcategories = list, subcategoriesLoading = false)
            }
            is ApiResult.Failure -> {
                val fallbacks = listOf(
                    Category(id = "${categoryId}_gen", name = "General"),
                    Category(id = "${categoryId}_acc", name = "Accessories"),
                    Category(id = "${categoryId}_oth", name = "Others"),
                )
                _state.value = _state.value.copy(subcategories = fallbacks, subcategoriesLoading = false)
            }
        }
    }

    /** Prefill the contact number from the user's profile phone when available. */
    private fun prefillContactNumber() = viewModelScope.launch {
        if (_state.value.contactNumber.isNotBlank()) return@launch
        if (authRepo.isDemoSession) return@launch
        when (val r = authRepo.me()) {
            is ApiResult.Success -> {
                // Re-check after the await so we never overwrite user input typed meanwhile.
                if (_state.value.contactNumber.isBlank()) {
                    val digits = r.data.phone.orEmpty().filter { it.isDigit() }.takeLast(10)
                    if (digits.isNotEmpty()) _state.value = _state.value.copy(contactNumber = digits)
                }
            }
            is ApiResult.Failure -> Unit
        }
    }

    private fun loadBrands() = viewModelScope.launch {
        _state.value = _state.value.copy(loadingBrands = true)
        when (val r = brandsRepo.list()) {
            is ApiResult.Success -> _state.value = _state.value.copy(
                brandSuggestions = r.data.map { it.name }.filterNotNull(),
                loadingBrands = false,
            )
            is ApiResult.Failure -> _state.value = _state.value.copy(loadingBrands = false)
        }
    }

    private fun loadDraft() = viewModelScope.launch {
        when (val r = draftRepo.get()) {
            is ApiResult.Success -> {
                val draft = r.data
                _state.value = _state.value.copy(draftData = draft)
                if (draft.categoryId != null && draft.categoryId.isNotBlank()) {
                    val cat = _state.value.categories.find { it.stableId == draft.categoryId }
                    if (cat != null) selectCategory(cat)
                }
            }
            is ApiResult.Failure -> {}
        }
    }

    // ── User actions ─────────────────────────────────────────────────────

    fun selectCategory(c: Category) {
        _state.value = _state.value.copy(selectedCategory = c, selectedSubcategory = null, error = null)
        loadSubcategories(c.stableId)
    }

    fun selectSubcategory(c: Category) { _state.value = _state.value.copy(selectedSubcategory = c, error = null) }
    fun selectCondition(c: String) {
        _state.value = _state.value.copy(
            condition = if (_state.value.condition == c) null else c,
        )
    }
    fun setBrand(value: String) { _state.value = _state.value.copy(brand = value) }
    fun setModel(value: String) { _state.value = _state.value.copy(model = value) }
    fun setContactNumber(value: String) {
        // Allow only digits, max 10
        val digits = value.filter { it.isDigit() }.take(10)
        _state.value = _state.value.copy(contactNumber = digits)
    }
    fun setAgeMonths(value: Int?) { _state.value = _state.value.copy(ageMonths = value) }
    fun toggleNegotiable() { _state.value = _state.value.copy(isNegotiable = !_state.value.isNegotiable) }
    fun setFlashSale(value: Boolean) { _state.value = _state.value.copy(flashSale = value) }
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
            val cur = _state.value
            val req = DraftRequest(
                title = title?.trim()?.takeIf { it.isNotBlank() },
                description = description?.trim()?.takeIf { it.isNotBlank() },
                price = price,
                categoryId = cur.selectedCategory?.stableId,
                location = location?.trim()?.takeIf { it.isNotBlank() },
                condition = cur.condition,
                brand = cur.brand.trim().ifBlank { null },
                model = cur.model.trim().ifBlank { null },
                contactNumber = cur.contactNumber.ifBlank { null },
                ageMonths = cur.ageMonths,
                isNegotiable = cur.isNegotiable.takeIf { it },
            )
            when (draftRepo.save(req)) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(savingDraft = false, draftSaved = true)
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
                currency = "INR",
                location = location.trim().ifBlank { null },
                categoryId = snapshot.selectedCategory?.stableId,
                subcategoryId = snapshot.selectedSubcategory?.stableId,
                images = urls,
                condition = snapshot.condition,
                brand = snapshot.brand.trim().ifBlank { null },
                model = snapshot.model.trim().ifBlank { null },
                contactNumber = snapshot.contactNumber.ifBlank { null },
                ageMonths = snapshot.ageMonths,
                flashSale = snapshot.flashSale.takeIf { it },
                isNegotiable = snapshot.isNegotiable.takeIf { it },
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
        if (_state.value.condition == null) return "Select a condition"
        if (_state.value.contactNumber.isBlank()) return "Enter your 10-digit contact number"
        if (!InputValidators.isValidIndianMobile(_state.value.contactNumber)) {
            return "Enter a valid 10-digit mobile number"
        }
        if (priceText.isNotBlank() && InputValidators.parsePositiveAmount(priceText) == null) return "Enter a valid price"
        if (priceText.isBlank() && !_state.value.isNegotiable) return "Enter a price or mark as negotiable"
        return null
    }
}