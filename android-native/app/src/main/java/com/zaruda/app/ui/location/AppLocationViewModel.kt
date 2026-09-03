package com.zaruda.app.ui.location

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.core.LocationSetupManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AppLocationViewModel @Inject constructor(
    private val locationManager: LocationSetupManager,
    private val analytics: com.zaruda.app.core.AnalyticsHelper,
) : ViewModel() {

    val currentCity = locationManager.currentLocationName
        .stateIn(viewModelScope, SharingStarted.Eagerly, "Detecting...")

    val currentArea = locationManager.currentAreaName
        .stateIn(viewModelScope, SharingStarted.Eagerly, "")

    val currentPincode = locationManager.currentPincode
        .stateIn(viewModelScope, SharingStarted.Eagerly, "")

    val isLocationSet = locationManager.isLocationSet
        .stateIn(viewModelScope, SharingStarted.Eagerly, false)

    /** Returns true if location was detected within the cooldown window. */
    fun isLocationFresh(): Boolean = locationManager.isLocationFresh()

    private val _isDetecting = MutableStateFlow(false)
    val isDetecting: StateFlow<Boolean> = _isDetecting.asStateFlow()

    init {
        // Only auto-detect if location hasn't been restored from SharedPreferences
        if (!locationManager.isLocationSet.value) {
            detectLocation()
        }
    }

    fun selectCity(name: String, lat: Double, lng: Double) {
        analytics.logLocationDetected("manual_selection", name)
        locationManager.setLocation(name, lat, lng)
    }

    /**
     * Detects location only if not already set.
     * Call this manually from UI (e.g. permission grant) — it checks cache first.
     */
    fun detectLocation(force: Boolean = false) {
        if (!force && locationManager.isLocationSet.value) return
        viewModelScope.launch {
            try {
                _isDetecting.value = true
                // force=true (manual refresh) → HIGH_ACCURACY; auto-detect → BALANCED_POWER
                locationManager.autoDetectAndSetup(highAccuracy = force)
            } catch (_: Exception) {} finally {
                _isDetecting.value = false
            }
        }
    }
}
