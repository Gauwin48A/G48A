package com.zaruda.app.core

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.tasks.Tasks
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.Locale
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.*

/**
 * Location service that provides GPS detection via FusedLocationProviderClient
 * and falls back to IP geolocation (ip-api.com) when GPS is unavailable.
 *
 * Mirrors the web app's detection pipeline:
 *   1. GPS (FusedLocationProvider) — most accurate
 *   2. IP Geolocation (ip-api.com) — fallback
 *   3. Persisted from SharedPreferences — instant restore
 */
@Singleton
class LocationSetupManager @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    companion object {
        private const val TAG = "LocationSetupManager"
        private const val PREFS_NAME = "zaruda_location"
        private const val KEY_CITY = "saved_city"
        private const val KEY_AREA = "saved_area"
        private const val KEY_LAT = "saved_lat"
        private const val KEY_LNG = "saved_lng"

        // IP geolocation service — HTTPS free tier, no API key required
        private const val IP_API_URL = "https://ip-api.com/json/?fields=status,message,city,lat,lon"
        private const val IP_API_FALLBACK_URL = "https://ipapi.co/json/"

        /** Haversine formula — distance in km between two lat/lng points. */
        fun distanceKm(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
            val r = 6371.0 // Earth radius in km
            val dLat = Math.toRadians(lat2 - lat1)
            val dLon = Math.toRadians(lon2 - lon1)
            val a = sin(dLat / 2).pow(2) + cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLon / 2).pow(2)
            return r * 2 * atan2(sqrt(a), sqrt(1 - a))
        }
    }

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // FusedLocationProviderClient — Google Play Services for reliable GPS
    private val fusedLocationClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)

    // OkHttp client for IP geolocation calls
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(5, TimeUnit.SECONDS)
        .build()

    // Location data
    private val _currentLocationName = MutableStateFlow("Detecting...")
    val currentLocationName: StateFlow<String> = _currentLocationName.asStateFlow()

    private val _currentAreaName = MutableStateFlow("")
    val currentAreaName: StateFlow<String> = _currentAreaName.asStateFlow()

    private val _isLocationSet = MutableStateFlow(false)
    val isLocationSet: StateFlow<Boolean> = _isLocationSet.asStateFlow()

    /** True if the device location is suspected to be faked (mock provider). */
    private val _isMockLocation = MutableStateFlow(false)
    val isMockLocation: StateFlow<Boolean> = _isMockLocation.asStateFlow()

    var lastLat: Double? = null
        private set
    var lastLng: Double? = null
        private set

    init {
        // Restore persisted location on startup for instant availability
        val savedCity = prefs.getString(KEY_CITY, "") ?: ""
        val savedArea = prefs.getString(KEY_AREA, "") ?: ""
        val savedLat = prefs.getString(KEY_LAT, "") ?: ""
        val savedLng = prefs.getString(KEY_LNG, "") ?: ""
        if (savedCity.isNotEmpty()) {
            _currentLocationName.value = savedCity
            _currentAreaName.value = savedArea
            _isLocationSet.value = true
            lastLat = savedLat.toDoubleOrNull()
            lastLng = savedLng.toDoubleOrNull()
        }
    }

    /**
     * Auto-detect location using the web app's detection pipeline:
     *   1. GPS (FusedLocationProvider) — best accuracy
     *   2. IP Geolocation — fallback when GPS fails
     *   3. Persisted value — fallback when both fail
     */
    @SuppressLint("MissingPermission")
    suspend fun autoDetectAndSetup() {
        val hasPermission = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED || ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasPermission) {
            // Try IP geolocation even without GPS permission
            val ipResult = ipGeolocate()
            if (ipResult != null) {
                applyLocation(ipResult.city, ipResult.lat, ipResult.lng)
                return
            }
            _currentLocationName.value = "All India"
            return
        }

        withContext(Dispatchers.IO) {
            try {
                // Step 1: Try Android LocationManager (instant lastKnown, no blocking)
                var location: android.location.Location? = null
                try {
                    val lm = context.getSystemService(Context.LOCATION_SERVICE) as? android.location.LocationManager
                    if (lm != null) {
                        val providers = listOf(android.location.LocationManager.GPS_PROVIDER, android.location.LocationManager.NETWORK_PROVIDER)
                            .filter { runCatching { lm.isProviderEnabled(it) }.getOrDefault(false) }
                        // Try last known location from each provider (instant, no blocking)
                        for (provider in providers) {
                            location = runCatching { lm.getLastKnownLocation(provider) }.getOrNull()
                            if (location != null) break
                        }
                    }
                if (location == null) {
                    location = try {
                        kotlinx.coroutines.suspendCancellableCoroutine { cont ->
                            fusedLocationClient.lastLocation
                                .addOnSuccessListener { loc ->
                                    if (cont.isActive) cont.resume(loc) {}
                                }
                                .addOnFailureListener {
                                    if (cont.isActive) cont.resume(null) {}
                                }
                        }
                    } catch (_: Exception) { null }
                }

                if (location != null) {
                    android.util.Log.d(TAG, "GPS location found: ${location.latitude}, ${location.longitude}")
                    // 🛡️ Fake GPS / Mock Location Protection
                    if (location.isFromMockProvider) {
                        _isMockLocation.value = true
                        android.util.Log.w(TAG, "⚠️ Mock GPS location detected — flagging as spoofed")
                    } else {
                        _isMockLocation.value = false
                    }

                    // Hyper-Local geocoding: subLocality → locality → adminArea
                    val geocoder = Geocoder(context, Locale.getDefault())
                    val addresses = try {
                        geocoder.getFromLocation(location.latitude, location.longitude, 1)
                    } catch (_: Exception) { null }
                    val address = addresses?.firstOrNull()

                    // Neighborhood / hub name (e.g. JNTU, Kukatpally, Gachibowli, Hitec City)
                    val areaName = address?.subLocality
                        ?: address?.subAdminArea
                        ?: ""
                    val cityName = address?.locality
                        ?: address?.adminArea
                        ?: "Current Location"

                    _currentAreaName.value = areaName
                    applyLocation(cityName, location.latitude, location.longitude)
                    return@withContext
                }

                // Step 2: GPS returned null, try IP geolocation fallback
                val ipResult = ipGeolocate()
                if (ipResult != null) {
                    applyLocation(ipResult.city, ipResult.lat, ipResult.lng)
                    return@withContext
                }

                // Step 3: Both failed — fall back to persisted value
                val savedCity = prefs.getString(KEY_CITY, "") ?: ""
                if (savedCity.isNotEmpty()) {
                    _currentLocationName.value = savedCity
                    _isLocationSet.value = true
                    lastLat = prefs.getString(KEY_LAT, "")?.toDoubleOrNull()
                    lastLng = prefs.getString(KEY_LNG, "")?.toDoubleOrNull()
                } else {
                    _currentLocationName.value = "All India"
                }
            } catch (e: Exception) {
                // Step 2 (fallback): IP geolocation if GPS threw an error
                try {
                    val ipResult = ipGeolocate()
                    if (ipResult != null) {
                        applyLocation(ipResult.city, ipResult.lat, ipResult.lng)
                        return@withContext
                    }
                } catch (_: Exception) {
                    _currentLocationName.value = "All India"
                }
                if (_currentLocationName.value == "Detecting...") {
                    _currentLocationName.value = "All India"
                }
            }
        }
    }

    /**
     * IP geolocation fallback using HTTPS endpoints.
     */
    private suspend fun ipGeolocate(): IpLocationResult? = withContext(Dispatchers.IO) {
        // Try primary HTTPS endpoint (ip-api.com)
        try {
            val request = Request.Builder()
                .url(IP_API_URL)
                .header("User-Agent", "ZarudaApp/1.0")
                .build()

            val response = httpClient.newCall(request).execute()
            if (response.isSuccessful) {
                val body = response.body?.string()
                if (body != null) {
                    val json = JSONObject(body)
                    if (json.optString("status") == "success") {
                        val city = json.optString("city")
                        val lat = json.optDouble("lat")
                        val lng = json.optDouble("lon")
                        if (city.isNotEmpty() && lat != 0.0 && lng != 0.0) {
                            return@withContext IpLocationResult(city, lat, lng)
                        }
                    }
                }
            }
        } catch (_: Exception) {}

        // Try secondary HTTPS endpoint (ipapi.co)
        try {
            val request = Request.Builder()
                .url(IP_API_FALLBACK_URL)
                .header("User-Agent", "ZarudaApp/1.0")
                .build()

            val response = httpClient.newCall(request).execute()
            if (response.isSuccessful) {
                val body = response.body?.string()
                if (body != null) {
                    val json = JSONObject(body)
                    val city = json.optString("city")
                    val lat = json.optDouble("latitude")
                    val lng = json.optDouble("longitude")
                    if (city.isNotEmpty() && lat != 0.0 && lng != 0.0) {
                        return@withContext IpLocationResult(city, lat, lng)
                    }
                }
            }
        } catch (_: Exception) {}

        null
    }

    /**
     * Apply a detected location: update state flows, persist to SharedPreferences.
     */
    private fun applyLocation(cityName: String, lat: Double, lng: Double) {
        _currentLocationName.value = cityName
        _isLocationSet.value = true
        lastLat = lat
        lastLng = lng
        prefs.edit()
            .putString(KEY_CITY, cityName)
            .putString(KEY_AREA, _currentAreaName.value)
            .putString(KEY_LAT, lat.toString())
            .putString(KEY_LNG, lng.toString())
            .apply()
    }

    /** Set location from user selection (city search) */
    fun setLocation(cityName: String, lat: Double, lng: Double) {
        _currentLocationName.value = cityName
        _isLocationSet.value = true
        lastLat = lat
        lastLng = lng
        prefs.edit()
            .putString(KEY_CITY, cityName)
            .putString(KEY_LAT, lat.toString())
            .putString(KEY_LNG, lng.toString())
            .apply()
    }

    /**
     * Check if developer mock location settings are enabled system-wide.
     * This catches GPS spoofing apps that don't use the mock location provider flag.
     */
    fun isDeveloperMockEnabled(): Boolean {
        return try {
            Settings.Secure.getInt(context.contentResolver, Settings.Secure.ALLOW_MOCK_LOCATION) == 1
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Distance-based sorting: filter a list of lat/lng items within [radiusKm] km.
     * Returns items sorted by distance (nearest first).
     */
    fun <T> sortByDistance(
        items: List<T>,
        radiusKm: Double,
        toLatLng: (T) -> Pair<Double, Double>,
    ): List<T> {
        val originLat = lastLat ?: return emptyList()
        val originLng = lastLng ?: return emptyList()
        return items
            .map { it to distanceKm(originLat, originLng, toLatLng(it).first, toLatLng(it).second) }
            .filter { it.second <= radiusKm }
            .sortedBy { it.second }
            .map { it.first }
    }

    /** Data class for IP geolocation results */
    private data class IpLocationResult(
        val city: String,
        val lat: Double,
        val lng: Double,
    )
}
