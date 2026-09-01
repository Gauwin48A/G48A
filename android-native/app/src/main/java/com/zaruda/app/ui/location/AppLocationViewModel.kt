package com.zaruda.app.ui.location

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.core.LocationSetupManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AppLocationViewModel @Inject constructor(
    private val locationManager: LocationSetupManager,
) : ViewModel() {

    val currentCity = locationManager.currentLocationName
        .stateIn(viewModelScope, SharingStarted.Eagerly, "Detecting...")

    val currentArea = locationManager.currentAreaName
        .stateIn(viewModelScope, SharingStarted.Eagerly, "")

    val isLocationSet = locationManager.isLocationSet
        .stateIn(viewModelScope, SharingStarted.Eagerly, false)

    init {
        detectLocation()
    }

    fun detectLocation() {
        viewModelScope.launch {
            try {
                locationManager.autoDetectAndSetup()
            } catch (_: Exception) {
                if (locationManager.currentLocationName.value == "Detecting...") {
                    locationManager.setLocation("Unknown", 0.0, 0.0)
                }
            }
        }
    }
}
