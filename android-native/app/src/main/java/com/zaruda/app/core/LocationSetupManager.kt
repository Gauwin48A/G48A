package com.zaruda.app.core

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Geocoder
import android.location.Location
import android.os.Looper
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.util.Locale
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.*

/**
 * Hyper-Local PIN Code Location System — Core Engine.
 *
 * Zero API cost: Uses native Android Geocoder + FusedLocationProviderClient.
 * Dual HTTPS fallback: ip-api.com + ipapi.co when GPS is unavailable.
 * Instant 0ms restore: Persists city, area, pincode, lat, lng to SharedPreferences.
 */
@Singleton
class LocationSetupManager @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    companion object {
        internal const val TAG = "LocationSetupManager"
        private const val PREFS_NAME = "zaruda_location"
        private const val KEY_CITY = "saved_city"
        private const val KEY_AREA = "saved_area"
        private const val KEY_PINCODE = "saved_pincode"
        private const val KEY_LAT = "saved_lat"
        private const val KEY_LNG = "saved_lng"
        private const val KEY_LAST_DETECTION_TIME = "last_detection_time"

        private const val IP_API_URL = "https://ip-api.com/json/?fields=status,message,city,lat,lon"
        private const val IP_API_FALLBACK_URL = "https://ipapi.co/json/"

        /** Cooldown: skip re-detection if last successful detection was within this window. */
        private const val DETECTION_COOLDOWN_MS = 30 * 60 * 1000L // 30 minutes

        /** Distance delta threshold (km) — skip re-geocoding if user moved < 500m. */
        private const val DISTANCE_DELTA_THRESHOLD_KM = 0.5

        /** Timeout for a fresh GPS fix when lastKnown is unavailable. */
        private const val GPS_FIX_TIMEOUT_MS = 10_000L

        /** Haversine formula — distance in km between two lat/lng points. */
        fun distanceKm(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
            val r = 6371.0
            val dLat = Math.toRadians(lat2 - lat1)
            val dLon = Math.toRadians(lon2 - lon1)
            val a = sin(dLat / 2).pow(2) + cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLon / 2).pow(2)
            return r * 2 * atan2(sqrt(a), sqrt(1 - a))
        }
    }

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private val fusedLocationClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(5, TimeUnit.SECONDS)
        .build()

    /** Timestamp (millis) of last successful detection. Persisted across restarts. */
    private var lastDetectionTime: Long = prefs.getLong(KEY_LAST_DETECTION_TIME, 0L)
        private set

    /** Returns true if location was detected within the cooldown window. */
    fun isLocationFresh(): Boolean {
        if (!_isLocationSet.value) return false
        return System.currentTimeMillis() - lastDetectionTime < DETECTION_COOLDOWN_MS
    }

    // ── State Flows ────────────────────────────────────────────────────────

    private val _currentLocationName = MutableStateFlow("Detecting...")
    val currentLocationName: StateFlow<String> = _currentLocationName.asStateFlow()

    private val _currentAreaName = MutableStateFlow("")
    val currentAreaName: StateFlow<String> = _currentAreaName.asStateFlow()

    private val _currentPincode = MutableStateFlow("")
    val currentPincode: StateFlow<String> = _currentPincode.asStateFlow()

    private val _isLocationSet = MutableStateFlow(false)
    val isLocationSet: StateFlow<Boolean> = _isLocationSet.asStateFlow()

    private val _isMockLocation = MutableStateFlow(false)
    val isMockLocation: StateFlow<Boolean> = _isMockLocation.asStateFlow()

    var lastLat: Double? = null
        private set
    var lastLng: Double? = null
        private set

    // ── Instant Restore from SharedPreferences ─────────────────────────────

    init {
        val savedCity = prefs.getString(KEY_CITY, "") ?: ""
        val savedArea = prefs.getString(KEY_AREA, "") ?: ""
        val savedPin = prefs.getString(KEY_PINCODE, "") ?: ""
        val savedLat = prefs.getString(KEY_LAT, "") ?: ""
        val savedLng = prefs.getString(KEY_LNG, "") ?: ""
        if (savedCity.isNotEmpty()) {
            _currentLocationName.value = savedCity
            _currentAreaName.value = savedArea
            _currentPincode.value = savedPin
            _isLocationSet.value = true
            lastLat = savedLat.toDoubleOrNull()
            lastLng = savedLng.toDoubleOrNull()
        }
    }

    // ── Battery-Optimized GPS ─────────────────────────────────────────────

    /**
     * Request a single GPS fix with the given accuracy priority.
     *   - BALANCED_POWER: ~50-100m accuracy, 80% less battery — used for auto-detect.
     *   - HIGH_ACCURACY: ~5-15m accuracy — used only on manual refresh.
     * Returns null on timeout or failure.
     */
    @SuppressLint("MissingPermission")
    private suspend fun requestGpsFix(highAccuracy: Boolean = false): Location? {
        val priority = if (highAccuracy) Priority.PRIORITY_HIGH_ACCURACY
            else Priority.PRIORITY_BALANCED_POWER_ACCURACY
        val intervalMs = if (highAccuracy) 500L else 2000L

        val locationRequest = LocationRequest.Builder(priority, intervalMs)
            .setMaxUpdates(1)
            .setDurationMillis(GPS_FIX_TIMEOUT_MS)
            .setWaitForAccurateLocation(highAccuracy)
            .build()

        return withTimeoutOrNull(GPS_FIX_TIMEOUT_MS) {
            suspendCancellableCoroutine { cont ->
                val callback = object : LocationCallback() {
                    override fun onLocationResult(result: LocationResult) {
                        fusedLocationClient.removeLocationUpdates(this)
                        if (cont.isActive) cont.resume(result.lastLocation) {}
                    }
                }
                fusedLocationClient.requestLocationUpdates(
                    locationRequest, callback, Looper.getMainLooper()
                )
                cont.invokeOnCancellation {
                    fusedLocationClient.removeLocationUpdates(callback)
                }
            }
        }
    }

    // ── Auto-Detect Pipeline ───────────────────────────────────────────────

    /**
     * Auto-detect location using the detection pipeline:
     *   1. GPS (FusedLocationProvider) — best accuracy with PIN Code level geocoding
     *   2. IP Geolocation — fallback when GPS fails
     *   3. Offline PIN Code database — instant fallback for known pincodes
     *   4. Persisted value — final fallback
     *
     * @param highAccuracy when true, uses PRIORITY_HIGH_ACCURACY (manual refresh);
     *        when false, uses PRIORITY_BALANCED_POWER_ACCURACY (auto-detect, battery-saving).
     */
    @SuppressLint("MissingPermission")
    suspend fun autoDetectAndSetup(highAccuracy: Boolean = false) {
        // Skip if location is already set and was detected within the cooldown window
        if (isLocationFresh()) return

        val hasPermission = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED || ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasPermission) {
            val ipResult = ipGeolocate()
            if (ipResult != null) {
                applyLocation(ipResult.city, ipResult.lat, ipResult.lng)
                return
            }
            _currentLocationName.value = "All India"
            _isLocationSet.value = true
            return
        }

        withContext(Dispatchers.IO) {
            try {
                // Step 1: Try GPS — lastKnown (instant) → fresh fix (battery-optimized)
                var location: Location? = null
                try {
                    val lm = context.getSystemService(Context.LOCATION_SERVICE) as? android.location.LocationManager
                    if (lm != null) {
                        val providers = listOf(
                            android.location.LocationManager.GPS_PROVIDER,
                            android.location.LocationManager.NETWORK_PROVIDER
                        ).filter { runCatching { lm.isProviderEnabled(it) }.getOrDefault(false) }
                        for (provider in providers) {
                            location = runCatching { lm.getLastKnownLocation(provider) }.getOrNull()
                            if (location != null) break
                        }
                    }
                } catch (_: Exception) { }

                // Step 1b: If no lastKnown, request fresh fix (battery-optimized or high-accuracy)
                if (location == null) {
                    location = requestGpsFix(highAccuracy = highAccuracy)
                }

                if (location != null) {
                    // 🛡️ Anti-Fraud: detect mock / spoofed GPS
                    val isMock = location.isFromMockProvider
                    _isMockLocation.value = isMock
                    if (isMock) {
                        android.util.Log.w(TAG, "⚠️ Mock GPS provider detected — flagging location")
                    }

                    // ⚡ Distance Delta Throttling (500m Movement Threshold)
                    val prevLat = lastLat
                    val prevLng = lastLng
                    if (prevLat != null && prevLng != null && _isLocationSet.value) {
                        val distKm = distanceKm(prevLat, prevLng, location.latitude, location.longitude)
                        if (distKm < DISTANCE_DELTA_THRESHOLD_KM && _currentLocationName.value.isNotBlank()
                            && _currentLocationName.value != "All India" && _currentLocationName.value != "Detecting..."
                        ) {
                            android.util.Log.d(TAG, "⚡ Distance delta < ${DISTANCE_DELTA_THRESHOLD_KM}km ($distKm km) — reusing cached location")
                            return@withContext
                        }
                    }

                    // Hyper-Local geocoding: subLocality + postalCode → locality
                    val geocoder = Geocoder(context, Locale.getDefault())
                    val addresses = try {
                        geocoder.getFromLocation(location.latitude, location.longitude, 1)
                    } catch (_: Exception) { null }
                    val address = addresses?.firstOrNull()

                    val postalCode = address?.postalCode ?: ""
                    val areaName = address?.subLocality
                        ?: address?.subAdminArea
                        ?: ""
                    val cityName = address?.locality
                        ?: address?.adminArea
                        ?: "Current Location"

                    _currentAreaName.value = areaName
                    _currentPincode.value = postalCode

                    // Pincode-level location label:
                    //   "Kukatpally 500085" or "Hyderabad 500085" or "500085"
                    val displayLabel = when {
                        areaName.isNotBlank() && postalCode.isNotBlank() -> "$areaName $postalCode"
                        postalCode.isNotBlank() && cityName.isNotBlank() -> "$cityName $postalCode"
                        postalCode.isNotBlank() -> postalCode
                        areaName.isNotBlank() -> "$areaName, $cityName"
                        else -> cityName
                    }

                    applyLocation(displayLabel, location.latitude, location.longitude)
                    return@withContext
                }

                // Step 2: GPS returned null — IP geolocation fallback
                val ipResult = ipGeolocate()
                if (ipResult != null) {
                    applyLocation(ipResult.city, ipResult.lat, ipResult.lng)
                    return@withContext
                }

                // Step 3: Offline PIN Code database fallback
                val savedPin = prefs.getString(KEY_PINCODE, "") ?: ""
                if (savedPin.length == 6 && savedPin.all { it.isDigit() }) {
                    val offlineCity = resolvePincodeOffline(savedPin)
                    if (offlineCity != null) {
                        applyLocation(offlineCity, lastLat ?: 0.0, lastLng ?: 0.0)
                        return@withContext
                    }
                }

                // Step 4: Restored persisted value
                val savedCity = prefs.getString(KEY_CITY, "") ?: ""
                if (savedCity.isNotEmpty()) {
                    _currentLocationName.value = savedCity
                    _isLocationSet.value = true
                } else {
                    _currentLocationName.value = "All India"
                    _isLocationSet.value = true
                }
            } catch (_: Exception) {
                _currentLocationName.value = "All India"
                _isLocationSet.value = true
            }
        }
    }

    // ── Offline PIN Code Database ─────────────────────────────────────────

    /**
     * Seed data: major Indian metro PIN codes → city/area name.
     * Loaded once; can be overridden by assets/pincodes.json if bundled.
     */
    private fun loadPincodeDatabase(): Map<String, String> {
        // Try loading from assets first
        try {
            val json = context.assets.open("pincodes.json").bufferedReader().use { it.readText() }
            val obj = JSONObject(json)
            val map = mutableMapOf<String, String>()
            val keys = obj.keys()
            while (keys.hasNext()) {
                val key = keys.next()
                map[key] = obj.getString(key)
            }
            android.util.Log.d(TAG, "📦 Loaded ${map.size} PIN codes from assets/pincodes.json")
            return map
        } catch (_: Exception) { }

        // Fallback: embedded seed data for major metros
        android.util.Log.d(TAG, "📦 Using embedded seed PIN code database")
        return mapOf(
            // Hyderabad
            "500001" to "Abids, Hyderabad", "500003" to "Afzalgunj, Hyderabad",
            "500004" to "Golconda, Hyderabad", "500006" to "Tarnaka, Hyderabad",
            "500007" to "Osmania University, Hyderabad", "500008" to "Sitaphalmandi, Hyderabad",
            "500010" to "Chaderghat, Hyderabad", "500011" to "Malkajgiri, Hyderabad",
            "500012" to "Secunderabad, Hyderabad", "500013" to "Tappachabutra, Hyderabad",
            "500014" to "Moula Ali, Hyderabad", "500015" to "Nacharam, Hyderabad",
            "500016" to "Chilakalaguda, Hyderabad", "500017" to "Sri Nagar Colony, Hyderabad",
            "500018" to "Banjara Hills, Hyderabad", "500019" to "Jubilee Hills, Hyderabad",
            "500020" to "Somajiguda, Hyderabad", "500022" to "Ameerpet, Hyderabad",
            "500023" to "SR Nagar, Hyderabad", "500024" to "Erragadda, Hyderabad",
            "500025" to "Moosapet, Hyderabad", "500026" to "Bharat Nagar, Hyderabad",
            "500027" to "Kukatpally, Hyderabad", "500028" to "Chanda Nagar, Hyderabad",
            "500029" to "Gachibowli, Hyderabad", "500030" to "HITEC City, Hyderabad",
            "500031" to "Madinaguda, Hyderabad", "500032" to "Chandanagar, Hyderabad",
            "500033" to "Lingampally, Hyderabad", "500034" to "Narsingi, Hyderabad",
            "500035" to "Manikonda, Hyderabad", "500036" to "Nanakramguda, Hyderabad",
            "500037" to "Kondapur, Hyderabad", "500038" to "Serilingampally, Hyderabad",
            "500039" to "Ramachandrapuram, Hyderabad", "500040" to "Patancheru, Hyderabad",
            "500041" to "Balanagar, Hyderabad", "500042" to "Kukatpally HB Colony, Hyderabad",
            "500043" to "Pragathi Nagar, Hyderabad", "500044" to "Nizampet, Hyderabad",
            "500045" to "Bachupally, Hyderabad", "500046" to "Kompally, Hyderabad",
            "500047" to "Quthbullapur, Hyderabad", "500048" to "Gajwel, Hyderabad",
            "500049" to "Medchal, Hyderabad", "500050" to "Shamirpet, Hyderabad",
            "500051" to "Alwal, Hyderabad", "500052" to "Bowenpally, Hyderabad",
            "500053" to "Trimulgherry, Hyderabad", "500054" to "Secunderabad, Hyderabad",
            "500055" to "West Marredpally, Hyderabad", "500056" to "East Marredpally, Hyderabad",
            "500057" to "RTC X Roads, Hyderabad", "500058" to "Lalaguda, Hyderabad",
            "500059" to "Malkajgiri, Hyderabad", "500060" to "Akbar Road, Hyderabad",
            "500061" to "Dilsukhnagar, Hyderabad", "500062" to "LB Nagar, Hyderabad",
            "500063" to "Vanasthalipuram, Hyderabad", "500064" to "Hayathnagar, Hyderabad",
            "500065" to "Uppal, Hyderabad", "500066" to "Ramanayyapeta, Hyderabad",
            "500067" to "Secunderabad, Hyderabad", "500068" to "ECIL, Hyderabad",
            "500069" to "A.S.Rao Nagar, Hyderabad", "500070" to "Kapra, Hyderabad",
            "500072" to "Neredmet, Hyderabad", "500073" to "Padmarao Nagar, Hyderabad",
            "500074" to "Safilguda, Hyderabad", "500075" to "Madhapur, Hyderabad",
            "500076" to "Gopanpally, Hyderabad", "500077" to "Kokapet, Hyderabad",
            "500078" to "Financial District, Hyderabad", "500079" to "Nanakramguda, Hyderabad",
            "500080" to "Tellapur, Hyderabad", "500081" to "Boduppal, Hyderabad",
            "500082" to "Peerzadiguda, Hyderabad", "500083" to "Ghatkesar, Hyderabad",
            "500084" to "Keesara, Hyderabad", "500085" to "Kukatpally, Hyderabad",
            "500086" to "Jeedimetla, Hyderabad", "500087" to "Gajwel, Hyderabad",
            "500088" to "Thorrur, Hyderabad", "500089" to "Shamshabad, Hyderabad",
            "500090" to "Maheshwaram, Hyderabad",
            // Bengaluru
            "560001" to "Shivajinagar, Bengaluru", "560002" to "Basavanagudi, Bengaluru",
            "560003" to "Basaveshwari Nagar, Bengaluru", "560004" to "Malleshwaram, Bengaluru",
            "560005" to "Jayamahal, Bengaluru", "560006" to "Seshadripuram, Bengaluru",
            "560007" to "Gandhi Nagar, Bengaluru", "560008" to "Vidyaranyapura, Bengaluru",
            "560009" to "Yelahanka, Bengaluru", "560010" to "Jakkur, Bengaluru",
            "560011" to "Hebbal, Bengaluru", "560012" to "Sahakara Nagar, Bengaluru",
            "560013" to "RT Nagar, Bengaluru", "560014" to "Sanjay Nagar, Bengaluru",
            "560015" to "Sadashivanagar, Bengaluru", "560016" to "Rajajinagar, Bengaluru",
            "560017" to "Vijayanagar, Bengaluru", "560018" to "Chord Road, Bengaluru",
            "560019" to "Kengeri, Bengaluru", "560020" to "Nagarbhavi, Bengaluru",
            "560021" to "Chamrajpet, Bengaluru", "560022" to "Govindarajanagar, Bengaluru",
            "560023" to "Kamakshipalya, Bengaluru", "560024" to "Peenya, Bengaluru",
            "560025" to "Jalahalli, Bengaluru", "560026" to "Mathikere, Bengaluru",
            "560027" to "Yeshwanthpur, Bengaluru", "560028" to "Ppeenya Industrial Area, Bengaluru",
            "560029" to "Dasanapura, Bengaluru", "560030" to "Uttarahalli, Bengaluru",
            "560031" to "Bommanahalli, Bengaluru", "560032" to "Bilekahalli, Bengaluru",
            "560033" to "Arekere, Bengaluru", "560034" to "HSR Layout, Bengaluru",
            "560035" to "Koramangala, Bengaluru", "560036" to "Madiwala, Bengaluru",
            "560037" to "BTM Layout, Bengaluru", "560038" to "Jayanagar, Bengaluru",
            "560039" to "JP Nagar, Bengaluru", "560040" to "Banashankari, Bengaluru",
            "560041" to "Kumaraswamy Layout, Bengaluru", "560042" to "Govindapura, Bengaluru",
            "560043" to "Begur, Bengaluru", "560044" to "Electronic City, Bengaluru",
            "560045" to "Hosur Road, Bengaluru", "560046" to "Mallasandra, Bengaluru",
            "560047" to "Tavarekere, Bengaluru", "560048" to "Ulsoor, Bengaluru",
            "560049" to "Domlur, Bengaluru", "560050" to "Indiranagar, Bengaluru",
            "560051" to "Old Airport Road, Bengaluru", "560052" to "Marathahalli, Bengaluru",
            "560053" to "Kadubeesanahalli, Bengaluru", "560054" to "Bellandur, Bengaluru",
            "560055" to "Sarjapur Road, Bengaluru", "560056" to "Bommanahalli, Bengaluru",
            "560057" to "Banaswadi, Bengaluru", "560058" to "Kalyan Nagar, Bengaluru",
            "560059" to "Horamavu, Bengaluru", "560060" to "Ramamurthy Nagar, Bengaluru",
            "560061" to "KR Puram, Bengaluru", "560062" to "Hoodi, Bengaluru",
            "560063" to "Whitefield, Bengaluru", "560064" to "ITPL, Bengaluru",
            "560065" to "Varthur, Bengaluru", "560066" to "Gunjur, Bengaluru",
            "560067" to "Old Madras Road, Bengaluru", "560068" to "Bommasandra, Bengaluru",
            "560069" to "Ananthapura, Bengaluru", "560070" to "Nagasandra, Bengaluru",
            "560071" to "Doddabommasandra, Bengaluru", "560072" to "Vidyaranyapura, Bengaluru",
            "560073" to "Kodigehalli, Bengaluru", "560074" to "Sarjapur, Bengaluru",
            "560075" to "Dommasandra, Bengaluru", "560076" to "Attibele, Bengaluru",
            "560077" to "Anekal, Bengaluru", "560078" to "Devarachikkanahalli, Bengaluru",
            "560079" to "Kudlu Gate, Bengaluru", "560080" to "HSR Layout, Bengaluru",
            // Mumbai
            "400001" to "Fort, Mumbai", "400002" to "Kalbadevi, Mumbai",
            "400003" to "Girgaon, Mumbai", "400004" to "Grant Road, Mumbai",
            "400005" to "Mumbai Central, Mumbai", "400006" to "Marine Lines, Mumbai",
            "400007" to "Churchgate, Mumbai", "400008" to "Colaba, Mumbai",
            "400009" to "Nariman Point, Mumbai", "400010" to "Mazgaon, Mumbai",
            "400011" to "Jacob Circle, Mumbai", "400012" to "Parel, Mumbai",
            "400013" to "Dadar, Mumbai", "400014" to "Matunga, Mumbai",
            "400015" to "Sion, Mumbai", "400016" to "Kurla, Mumbai",
            "400017" to "Vidyavihar, Mumbai", "400018" to "Ghatkopar, Mumbai",
            "400019" to "Vikhroli, Mumbai", "400020" to "Bhandup, Mumbai",
            "400021" to "Mulund, Mumbai", "400022" to "Powai, Mumbai",
            "400023" to "Chembur, Mumbai", "400024" to "Govandi, Mumbai",
            "400025" to "Deonar, Mumbai", "400026" to "Kurla, Mumbai",
            "400027" to "Vidyavihar, Mumbai", "400028" to "Kurla, Mumbai",
            "400029" to "Chunabhatti, Mumbai", "400030" to "Wadala, Mumbai",
            "400031" to "Sewri, Mumbai", "400032" to "Sion, Mumbai",
            "400033" to "Mankhurd, Mumbai", "400034" to "Vashi, Navi Mumbai",
            "400035" to "Sanpada, Navi Mumbai", "400036" to "Juinagar, Navi Mumbai",
            "400037" to "Nerul, Navi Mumbai", "400038" to "Belapur, Navi Mumbai",
            "400039" to "Turbhe, Navi Mumbai", "400040" to "Kopar Khairane, Navi Mumbai",
            "400041" to "Ghansoli, Navi Mumbai", "400042" to "Airoli, Navi Mumbai",
            "400043" to "Rabale, Navi Mumbai", "400044" to "Ghodbunder, Thane",
            "400045" to "Thane West, Thane", "400046" to "Thane East, Thane",
            "400047" to "Mumbra, Thane", "400048" to "Divapolis, Thane",
            "400049" to "Mira Road, Thane", "400050" to "Bhayandar, Thane",
            "400051" to "Nalasopara, Thane", "400052" to "Vasai, Thane",
            "400053" to "Virar, Thane", "400054" to "Boisar, Thane",
            "400055" to "Andheri West, Mumbai", "400056" to "Andheri East, Mumbai",
            "400057" to "MIDC Andheri, Mumbai", "400058" to "Jogeshwari, Mumbai",
            "400059" to "Goregaon, Mumbai", "400060" to "Malad, Mumbai",
            "400061" to "Kandivali, Mumbai", "400062" to "Borivali, Mumbai",
            "400063" to "Dahisar, Mumbai", "400064" to "Bhayandar, Thane",
            "400065" to "Vile Parle, Mumbai", "400066" to "Santacruz, Mumbai",
            "400067" to "Bandra, Mumbai", "400068" to "Khar, Mumbai",
            "400069" to "Bandra East, Mumbai", "400070" to "Kurla, Mumbai",
            "400071" to "Kalina, Mumbai", "400072" to "Vakola, Mumbai",
            "400073" to "Mumbai Central, Mumbai", "400074" to "Dadar, Mumbai",
            "400075" to "Matunga, Mumbai", "400076" to "Mahim, Mumbai",
            "400077" to "Worli, Mumbai", "400078" to "Prabhadevi, Mumbai",
            "400079" to "Lower Parel, Mumbai", "400080" to "Elphinstone Road, Mumbai",
            "400081" to "Parel, Mumbai", "400082" to "Nagar, Mumbai",
            "400083" to "Chinchpokli, Mumbai", "400084" to "Byculla, Mumbai",
            "400085" to "Agripada, Mumbai", "400086" to "Jacob Circle, Mumbai",
            "400087" to "Hindu Colony, Mumbai", "400088" to "Chembur, Mumbai",
            "400089" to "Chembur Colony, Mumbai", "400090" to "Govandi, Mumbai",
            // Delhi
            "110001" to "New Delhi", "110002" to "New Delhi", "110003" to "New Delhi",
            "110004" to "New Delhi", "110005" to "New Delhi", "110006" to "New Delhi",
            "110007" to "New Delhi", "110008" to "New Delhi", "110009" to "New Delhi",
            "110010" to "New Delhi", "110011" to "New Delhi", "110012" to "New Delhi",
            "110013" to "New Delhi", "110014" to "New Delhi", "110015" to "New Delhi",
            "110016" to "New Delhi", "110017" to "New Delhi", "110018" to "New Delhi",
            "110019" to "New Delhi", "110020" to "New Delhi", "110021" to "New Delhi",
            "110022" to "New Delhi", "110023" to "New Delhi", "110024" to "New Delhi",
            "110025" to "New Delhi", "110026" to "New Delhi", "110027" to "New Delhi",
            "110028" to "New Delhi", "110029" to "New Delhi", "110030" to "New Delhi",
            "110031" to "New Delhi", "110032" to "New Delhi", "110033" to "New Delhi",
            "110034" to "New Delhi", "110035" to "New Delhi", "110036" to "New Delhi",
            "110037" to "New Delhi", "110038" to "New Delhi", "110039" to "New Delhi",
            "110040" to "New Delhi", "110041" to "New Delhi", "110042" to "New Delhi",
            "110043" to "New Delhi", "110044" to "New Delhi", "110045" to "New Delhi",
            "110046" to "New Delhi", "110047" to "New Delhi", "110048" to "New Delhi",
            "110049" to "New Delhi", "110050" to "New Delhi", "110051" to "New Delhi",
            "110052" to "New Delhi", "110053" to "New Delhi", "110054" to "New Delhi",
            "110055" to "New Delhi", "110056" to "New Delhi", "110057" to "New Delhi",
            "110058" to "New Delhi", "110059" to "New Delhi", "110060" to "New Delhi",
            "110061" to "New Delhi", "110062" to "New Delhi", "110063" to "New Delhi",
            "110064" to "New Delhi", "110065" to "New Delhi", "110066" to "New Delhi",
            "110067" to "New Delhi", "110068" to "New Delhi", "110069" to "New Delhi",
            "110070" to "New Delhi", "110071" to "New Delhi", "110072" to "New Delhi",
            "110073" to "New Delhi", "110074" to "New Delhi", "110075" to "New Delhi",
            "110076" to "New Delhi", "110077" to "New Delhi", "110078" to "New Delhi",
            "110079" to "New Delhi", "110080" to "New Delhi", "110081" to "New Delhi",
            "110082" to "New Delhi", "110083" to "New Delhi", "110084" to "New Delhi",
            "110085" to "New Delhi", "110086" to "New Delhi", "110087" to "New Delhi",
            "110088" to "New Delhi", "110089" to "New Delhi", "110090" to "New Delhi",
            "110091" to "New Delhi", "110092" to "New Delhi", "110093" to "New Delhi",
            "110094" to "New Delhi", "110095" to "New Delhi", "110096" to "New Delhi",
            // Chennai
            "600001" to "Parrys, Chennai", "600002" to "George Town, Chennai",
            "600003" to "Tondiarpet, Chennai", "600004" to "Royapuram, Chennai",
            "600005" to "Mylapore, Chennai", "600006" to "Adyar, Chennai",
            "600007" to "Chetpet, Chennai", "600008" to "Kilpauk, Chennai",
            "600009" to "Kodambakkam, Chennai", "600010" to "T Nagar, Chennai",
            "600011" to "Ashok Nagar, Chennai", "600012" to "Vadapalani, Chennai",
            "600013" to "Anna Nagar, Chennai", "600014" to "Aminjikarai, Chennai",
            "600015" to "Alandur, Chennai", "600016" to "Guindy, Chennai",
            "600017" to "Nanganallur, Chennai", "600018" to "Meenambakkam, Chennai",
            "600019" to "Palavaram, Chennai", "600020" to "Tambaram, Chennai",
            "600021" to "Chrompet, Chennai", "600022" to "Pallavaram, Chennai",
            "600023" to "Nungambakkam, Chennai", "600024" to "Chetpet, Chennai",
            "600025" to "Egmore, Chennai", "600026" to "Vepery, Chennai",
            "600027" to "Purasawalkam, Chennai", "600028" to "Sowcarpet, Chennai",
            "600029" to "Broadway, Chennai", "600030" to "Mint, Chennai",
            "600031" to "Mambalam, Chennai", "600032" to "Saidapet, Chennai",
            "600033" to "Kodambakkam, Chennai", "600034" to "Kodambakkam, Chennai",
            "600035" to "Thiruvanmiyur, Chennai", "600036" to "Sholinganallur, Chennai",
            "600037" to "Perungudi, Chennai", "600038" to "Taramani, Chennai",
            "600039" to "Velachery, Chennai", "600040" to "Madipakkam, Chennai",
            "600041" to "Nanganallur, Chennai", "600042" to "Pallikaranai, Chennai",
            "600043" to "Neelankarai, Chennai", "600044" to "Injambakkam, Chennai",
            "600045" to "Chitlapakam, Chennai", "600046" to "Mudichur, Chennai",
            "600047" to "Urapakkam, Chennai", "600048" to "Guduvanchery, Chennai",
            "600049" to "Maraimalai Nagar, Chennai", "600050" to "Padappai, Chennai",
            // Vijayawada
            "520001" to "Governorpet, Vijayawada", "520002" to "Benz Circle, Vijayawada",
            "520003" to "Patamata, Vijayawada", "520004" to "Labbipet, Vijayawada",
            "520005" to "Bommayisalem, Vijayawada", "520006" to "Suryaraopet, Vijayawada",
            "520007" to "Eluru Road, Vijayawada", "520008" to "Ashok Nagar, Vijayawada",
            "520009" to "Kanuru, Vijayawada", "520010" to "Gunadala, Vijayawada",
            "520011" to "Gannavaram, Vijayawada", "520012" to "Kondapalli, Vijayawada",
            "520013" to "Tadigadapa, Vijayawada", "520014" to "Penamaluru, Vijayawada",
            "520015" to "Kankipadu, Vijayawada", "520016" to "Vuyyuru, Vijayawada",
            // Visakhapatnam
            "530001" to "Maharani Peta, Visakhapatnam",
            "530002" to "Waltair Uplands, Visakhapatnam",
            "530003" to "Seethammadhara, Visakhapatnam",
            "530004" to "Waltair Main Road, Visakhapatnam",
            "530005" to "Dwaraka Nagar, Visakhapatnam",
            "530006" to "Akkayyapalem, Visakhapatnam",
            "530007" to "MVP Colony, Visakhapatnam",
            "530008" to "Madhurawada, Visakhapatnam",
            "530009" to "Gajuwaka, Visakhapatnam",
            "530010" to "NAD, Visakhapatnam",
            "530011" to "Anakapalli, Visakhapatnam",
            "530012" to "Bheemunipatnam, Visakhapatnam",
            "530013" to "Pendurthi, Visakhapatnam",
            "530014" to "Tagarapuvalasa, Visakhapatnam",
            "530015" to "Gopalapatnam, Visakhapatnam",
            "530016" to "Chintalavalasa, Visakhapatnam",
            "530017" to "Yelamanchili, Visakhapatnam",
            "530018" to "Narsipatnam, Visakhapatnam",
            "530019" to "Paderu, Visakhapatnam",
            "530020" to "Araku Valley, Visakhapatnam",
            "530022" to "Daspalla Hills, Visakhapatnam",
            "530024" to "Simhachalam, Visakhapatnam",
            "530026" to "Kanaka Durga Temple, Visakhapatnam",
            "530027" to "Rushikonda, Visakhapatnam",
            "530028" to "R.C. Puram, Visakhapatnam",
            "530029" to "Autonagar, Visakhapatnam",
            "530030" to "Visakhapatnam Steel Plant, Visakhapatnam",
            "530031" to "New Colony, Visakhapatnam",
            "530032" to "Satyavani Nagar, Visakhapatnam",
            "530033" to "Railway New Colony, Visakhapatnam",
            "530034" to "Srinagar, Visakhapatnam",
            "530035" to "Housing Board Colony, Visakhapatnam",
            "530036" to "RTC Complex, Visakhapatnam",
            "530037" to "Jagadamba Centre, Visakhapatnam",
            "530038" to "Suryabagh, Visakhapatnam",
            "530039" to "Kirlampudi Layout, Visakhapatnam",
            "530040" to "Venkoji Nagar, Visakhapatnam",
            "530041" to "Tarapoda, Visakhapatnam",
            "530042" to "Pothinamallayya Palem, Visakhapatnam",
            "530043" to "Sujatha Nagar, Visakhapatnam",
            "530044" to "Chinagadili, Visakhapatnam",
            "530045" to "Devarapalli, Visakhapatnam",
            "530046" to "Duvvada, Visakhapatnam",
            "530047" to "Sabbavaram, Visakhapatnam",
            "530048" to "Chodavaram, Visakhapatnam",
            "530049" to "Golugonda, Visakhapatnam",
            "530050" to "Narsipatnam, Visakhapatnam",
            // Tier-2 cities
            "502001" to "Nizamabad, Telangana", "502002" to "Nizamabad, Telangana",
            "503001" to "Karimnagar, Telangana", "503002" to "Karimnagar, Telangana",
            "504001" to "Adilabad, Telangana", "505001" to "Warangal, Telangana",
            "505002" to "Warangal, Telangana", "506001" to "Khammam, Telangana",
            "507001" to "Nalgonda, Telangana", "508001" to "Mahabubnagar, Telangana",
            "509001" to "Medak, Telangana",
            "515001" to "Anantapur, Andhra Pradesh", "515002" to "Anantapur, Andhra Pradesh",
            "516001" to "Kurnool, Andhra Pradesh", "516002" to "Kurnool, Andhra Pradesh",
            "517001" to "Chittoor, Andhra Pradesh", "517002" to "Chittoor, Andhra Pradesh",
            "518001" to "Karimnagar, Andhra Pradesh",
            "520001" to "Vijayawada, Andhra Pradesh",
            "521001" to "Gudivada, Andhra Pradesh", "522001" to "Guntur, Andhra Pradesh",
            "522002" to "Guntur, Andhra Pradesh", "523001" to "Ongole, Andhra Pradesh",
            "524001" to "Nellore, Andhra Pradesh", "524002" to "Nellore, Andhra Pradesh",
            "525001" to "Eluru, Andhra Pradesh", "526001" to "Tirupati, Andhra Pradesh",
            "526002" to "Tirupati, Andhra Pradesh", "527001" to "Srikakulam, Andhra Pradesh",
            "528001" to "Kakinada, Andhra Pradesh", "529001" to "Kurnool, Andhra Pradesh",
            "531001" to "Vizianagaram, Andhra Pradesh",
        )
    }

    // ── IP Geolocation Fallback ────────────────────────────────────────────

    private suspend fun ipGeolocate(): IpLocationResult? = withContext(Dispatchers.IO) {
        // Primary: ip-api.com (free HTTPS, no API key)
        try {
            val request = Request.Builder()
                .url(IP_API_URL)
                .header("User-Agent", "ZarudaApp/1.0")
                .build()
            val response = httpClient.newCall(request).execute()
            if (response.isSuccessful) {
                val json = JSONObject(response.body?.string() ?: "")
                if (json.optString("status") == "success") {
                    return@withContext IpLocationResult(
                        json.optString("city"),
                        json.optDouble("lat"),
                        json.optDouble("lon")
                    )
                }
            }
        } catch (_: Exception) {}

        // Secondary: ipapi.co (free HTTPS, no API key)
        try {
            val request = Request.Builder()
                .url(IP_API_FALLBACK_URL)
                .header("User-Agent", "ZarudaApp/1.0")
                .build()
            val response = httpClient.newCall(request).execute()
            if (response.isSuccessful) {
                val json = JSONObject(response.body?.string() ?: "")
                val city = json.optString("city")
                val lat = json.optDouble("latitude")
                val lng = json.optDouble("longitude")
                if (city.isNotEmpty() && lat != 0.0 && lng != 0.0) {
                    return@withContext IpLocationResult(city, lat, lng)
                }
            }
        } catch (_: Exception) {}

        null
    }

    // ── Persist Location ───────────────────────────────────────────────────

    private fun applyLocation(cityName: String, lat: Double, lng: Double) {
        _currentLocationName.value = cityName
        _isLocationSet.value = true
        lastLat = lat
        lastLng = lng
        lastDetectionTime = System.currentTimeMillis()
        prefs.edit()
            .putString(KEY_CITY, cityName)
            .putString(KEY_AREA, _currentAreaName.value)
            .putString(KEY_PINCODE, _currentPincode.value)
            .putString(KEY_LAT, lat.toString())
            .putString(KEY_LNG, lng.toString())
            .putLong(KEY_LAST_DETECTION_TIME, lastDetectionTime)
            .apply()
    }

    /** Set location from user selection (city search screen) — persists all fields. */
    fun setLocation(cityName: String, lat: Double, lng: Double) {
        _currentLocationName.value = cityName
        _isLocationSet.value = true
        lastLat = lat
        lastLng = lng
        prefs.edit()
            .putString(KEY_CITY, cityName)
            .putString(KEY_AREA, _currentAreaName.value)
            .putString(KEY_PINCODE, _currentPincode.value)
            .putString(KEY_LAT, lat.toString())
            .putString(KEY_LNG, lng.toString())
            .apply()
    }

    /**
     * Offline Indian PIN Code database — in-memory fallback.
     * Seeded with major metro PIN codes; loaded from assets/pincodes.json if present.
     */
    private val pincodeDb: Map<String, String> by lazy { loadPincodeDatabase() }

    /** Check if developer mock location settings are enabled system-wide. */
    fun isDeveloperMockEnabled(): Boolean {
        return try {
            Settings.Secure.getInt(context.contentResolver, Settings.Secure.ALLOW_MOCK_LOCATION) == 1
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Resolve a 6-digit Indian PIN code to a city/area name using the offline database.
     * Returns null if the PIN code is not found.
     */
    fun resolvePincodeOffline(pincode: String): String? {
        return pincodeDb[pincode.trim()]
    }

    /** Distance-based sorting: filter items within [radiusKm] km, sorted nearest first. */
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

    private data class IpLocationResult(val city: String, val lat: Double, val lng: Double)
}
