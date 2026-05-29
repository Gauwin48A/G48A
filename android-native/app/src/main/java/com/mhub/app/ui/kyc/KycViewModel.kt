package com.mhub.app.ui.kyc

import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.mhub.app.core.ApiResult
import com.mhub.app.data.remote.dto.KycStatusResponse
import com.mhub.app.data.remote.dto.KycSubmitRequest
import com.mhub.app.data.repository.KycRepository
import com.mhub.app.data.repository.UploadRepository
import com.mhub.app.ui.common.InputValidators
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import javax.inject.Inject

data class KycState(
    val loading: Boolean = true,
    val status: KycStatusResponse = KycStatusResponse(),
    val docType: String = "aadhaar",
    val docNumber: String = "",
    val frontUri: Uri? = null,
    val backUri: Uri? = null,
    val selfieUri: Uri? = null,
    val submitting: Boolean = false,
    val success: Boolean = false,
    val error: String? = null,
)

@HiltViewModel
class KycViewModel @Inject constructor(
    private val kycRepo: KycRepository,
    private val uploadRepo: UploadRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(KycState())
    val state: StateFlow<KycState> = _state.asStateFlow()
    private var pollingJob: Job? = null

    init { refresh() }

    fun refresh() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val r = kycRepo.status()) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(loading = false, status = r.data)
                    // Auto-poll every 30 s while status is "pending" so user sees update without restarting app
                    val isPending = r.data.kycStatus.lowercase().let {
                        it.contains("pending") || it.contains("under_review") || it.contains("review")
                    } == true
                    if (isPending) startStatusPolling() else stopStatusPolling()
                }
                is ApiResult.Failure -> _state.value = _state.value.copy(loading = false, error = r.error.message)
            }
        }
    }

    /** Poll every 30 s while KYC status is pending — stops automatically when resolved. */
    private fun startStatusPolling() {
        if (pollingJob?.isActive == true) return
        pollingJob = viewModelScope.launch {
            while (isActive) {
                delay(30_000)
                when (val r = kycRepo.status()) {
                    is ApiResult.Success -> {
                        _state.value = _state.value.copy(status = r.data)
                        val stillPending = r.data.kycStatus.lowercase().let {
                            it.contains("pending") || it.contains("under_review") || it.contains("review")
                        } == true
                        if (!stillPending) break // status resolved — stop polling
                    }
                    is ApiResult.Failure -> break // stop polling on error
                }
            }
        }
    }

    private fun stopStatusPolling() {
        pollingJob?.cancel()
        pollingJob = null
    }

    override fun onCleared() {
        super.onCleared()
        stopStatusPolling()
    }

    fun setDocType(v: String) {
        _state.value = _state.value.copy(
            docType = InputValidators.normalizeKycDocType(v),
            docNumber = "",
            error = null,
        )
    }
    fun setDocNumber(v: String) {
        val current = _state.value
        _state.value = current.copy(
            docNumber = InputValidators.sanitizeKycDocNumberInput(current.docType, v),
        )
    }
    fun setFront(uri: Uri) { _state.value = _state.value.copy(frontUri = uri) }
    fun setBack(uri: Uri) { _state.value = _state.value.copy(backUri = uri) }
    fun setSelfie(uri: Uri) { _state.value = _state.value.copy(selfieUri = uri) }
    fun clearError() { _state.value = _state.value.copy(error = null) }

    fun submit(bytesProvider: suspend (Uri) -> Pair<ByteArray, String>?) {
        val s = _state.value
        if (s.submitting) return
        if (s.frontUri == null) { _state.value = s.copy(error = "Front image required"); return }
        if (!InputValidators.isValidKycDocumentNumber(s.docType, s.docNumber)) {
            _state.value = s.copy(error = InputValidators.kycDocValidationMessage(s.docType))
            return
        }
        if (InputValidators.requiresKycBackImage(s.docType) && s.backUri == null) {
            _state.value = s.copy(error = "Back image required for selected document type")
            return
        }

        val normalizedDocNumber = InputValidators.normalizeKycDocNumber(s.docNumber)
        _state.value = s.copy(submitting = true, error = null, success = false)
        viewModelScope.launch {
            suspend fun upload(uri: Uri, slot: String): String? {
                val pair = bytesProvider(uri) ?: run {
                    _state.value = _state.value.copy(submitting = false, error = "Could not read image")
                    return null
                }
                return when (val r = uploadRepo.uploadKycDoc(pair.first, pair.second, slot)) {
                    is ApiResult.Success -> r.data
                    is ApiResult.Failure -> {
                        _state.value = _state.value.copy(submitting = false, error = r.error.message)
                        null
                    }
                }
            }

            val frontKey = upload(s.frontUri, "front") ?: return@launch
            val backKey = s.backUri?.let { upload(it, "back") }
            val selfieKey = s.selfieUri?.let { upload(it, "selfie") }

            val req = KycSubmitRequest(
                docType = s.docType,
                docNumber = normalizedDocNumber,
                docFrontKey = frontKey,
                docBackKey = backKey,
                selfieKey = selfieKey,
            )
            when (val r = kycRepo.submit(req)) {
                is ApiResult.Success -> {
                    _state.value = _state.value.copy(submitting = false, success = true)
                    refresh()
                }
                is ApiResult.Failure ->
                    _state.value = _state.value.copy(submitting = false, error = r.error.message)
            }
        }
    }
}
