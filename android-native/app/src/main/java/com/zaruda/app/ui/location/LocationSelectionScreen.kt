package com.zaruda.app.ui.location

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.shouldShowRationale
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.zaruda.app.R
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import java.util.concurrent.TimeUnit
import javax.inject.Inject

data class CitySuggestion(
    val name: String,
    val state: String = "",
    val lat: Double,
    val lng: Double,
    val isPopular: Boolean = false
)

data class LocationState(
    val query: String = "",
    val results: List<CitySuggestion> = emptyList(),
    val loading: Boolean = false,
    val error: String? = null,
    val detecting: Boolean = false,
    val currentCity: String? = null
)

@HiltViewModel
class LocationViewModel @Inject constructor(
    private val locationManager: com.zaruda.app.core.LocationSetupManager,
) : ViewModel() {
    private val _state = MutableStateFlow(LocationState(results = POPULAR_CITIES))
    val state: StateFlow<LocationState> = _state.asStateFlow()

    val isMockLocation: StateFlow<Boolean> = locationManager.isMockLocation
    fun isDeveloperMockEnabled(): Boolean = locationManager.isDeveloperMockEnabled()

    fun updateQuery(q: String) {
        _state.value = _state.value.copy(query = q)
        if (q.length < 3) {
            _state.value = _state.value.copy(results = POPULAR_CITIES, error = null)
        } else {
            search(q)
        }
    }

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(5, TimeUnit.SECONDS)
        .build()

    private var searchJob: kotlinx.coroutines.Job? = null

    private suspend fun searchOsmNominatim(query: String): List<CitySuggestion> = withContext(Dispatchers.IO) {
        try {
            val qTrim = query.trim()
            val isPincode = qTrim.matches("^\\d{6}$".toRegex())
            val url = if (isPincode) {
                "https://nominatim.openstreetmap.org/search?format=jsonv2&postalcode=$qTrim&country=India&limit=10&addressdetails=1"
            } else {
                "https://nominatim.openstreetmap.org/search?format=jsonv2&q=${java.net.URLEncoder.encode(qTrim, "UTF-8")}&limit=10&addressdetails=1"
            }
            val request = Request.Builder()
                .url(url)
                .header("User-Agent", "ZarudaApp/1.0 (marketplace)")
                .build()
            val response = httpClient.newCall(request).execute()
            if (!response.isSuccessful) return@withContext emptyList()
            val body = response.body?.string() ?: return@withContext emptyList()
            val arr = JSONArray(body)
            val results = mutableListOf<CitySuggestion>()
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                val lat = obj.optDouble("lat", 0.0)
                val lng = obj.optDouble("lon", 0.0)
                val addr = obj.optJSONObject("address")
                val suburb = addr?.optString("suburb", "")?.takeIf { it.isNotBlank() }
                    ?: addr?.optString("neighbourhood", "")?.takeIf { it.isNotBlank() }
                    ?: ""
                val city = addr?.optString("city", "")?.takeIf { it.isNotBlank() }
                    ?: addr?.optString("town", "")?.takeIf { it.isNotBlank() }
                    ?: addr?.optString("village", "")?.takeIf { it.isNotBlank() }
                    ?: addr?.optString("municipality", "")?.takeIf { it.isNotBlank() }
                    ?: ""
                val pcode = addr?.optString("postcode", "")?.takeIf { it.isNotBlank() } ?: if (isPincode) qTrim else ""
                val state = addr?.optString("state", "") ?: ""

                val displayName = when {
                    suburb.isNotBlank() && pcode.isNotBlank() -> "$suburb $pcode"
                    city.isNotBlank() && pcode.isNotBlank() -> "$city $pcode"
                    pcode.isNotBlank() -> pcode
                    suburb.isNotBlank() && city.isNotBlank() -> "$suburb, $city"
                    city.isNotBlank() -> city
                    else -> query
                }

                if (lat != 0.0 && lng != 0.0 && displayName.isNotBlank()) {
                    results.add(CitySuggestion(
                        name = displayName,
                        state = state,
                        lat = lat,
                        lng = lng,
                        isPopular = false
                    ))
                }
            }
            results.distinctBy { it.name.lowercase() + it.lat.toString().take(5) }.take(10)
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun search(q: String) {
        // Debounce: cancel any in-flight search, wait 350ms, then call API
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            kotlinx.coroutines.delay(350) // debounce to avoid OSM rate limiting
            _state.value = _state.value.copy(loading = true, error = null)
            val osmResults = searchOsmNominatim(q)
            val results = if (osmResults.isEmpty()) {
                // Fallback: show popular cities filtered by query
                POPULAR_CITIES.filter { it.name.contains(q, ignoreCase = true) || it.state.contains(q, ignoreCase = true) }
            } else osmResults
            _state.value = _state.value.copy(loading = false, results = results, error = if (results.isEmpty()) "No cities found. Try a different search." else null)
        }
    }

    fun autoDetectAndSetup() {
        _state.value = _state.value.copy(detecting = true)
        viewModelScope.launch {
            locationManager.autoDetectAndSetup(highAccuracy = true)
            val cityName = locationManager.currentLocationName.value
            _state.value = _state.value.copy(detecting = false, currentCity = cityName)
            if (cityName.isNotBlank() && !cityName.contains("fail") && !cityName.contains("Permission")) {
                _state.value = _state.value.copy(results = listOf(CitySuggestion(name = cityName, state = "", lat = 0.0, lng = 0.0, isPopular = false)))
            }
        }
    }

    companion object {
        val POPULAR_CITIES = listOf(
            CitySuggestion("Hyderabad", "Telangana", 17.385, 78.4867, true),
            CitySuggestion("Vijayawada", "Andhra Pradesh", 16.5062, 80.648, true),
            CitySuggestion("Bengaluru", "Karnataka", 12.9716, 77.5946, true),
            CitySuggestion("Chennai", "Tamil Nadu", 13.0827, 80.2707, true),
            CitySuggestion("Mumbai", "Maharashtra", 19.076, 72.8777, true),
            CitySuggestion("Delhi", "Delhi", 28.7041, 77.1025, true)
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class, com.google.accompanist.permissions.ExperimentalPermissionsApi::class)
@Composable
fun LocationSelectionScreen(
    onBack: () -> Unit,
    onSelect: (CitySuggestion) -> Unit,
    viewModel: LocationViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    val locationPermissionState = com.google.accompanist.permissions.rememberPermissionState(
        android.Manifest.permission.ACCESS_COARSE_LOCATION
    )
    val isMockLocation by viewModel.isMockLocation.collectAsState()
    val isDeveloperMock by remember { mutableStateOf(viewModel.isDeveloperMockEnabled()) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Select Location", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .background(Color(0xFFF8FAFC))
        ) {
            // ... Search Bar remains same
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.primary,
                shadowElevation = 4.dp
            ) {
                OutlinedTextField(
                    value = state.query,
                    onValueChange = { viewModel.updateQuery(it) },
                    placeholder = { Text("Search city, area or landmark...", color = Color.White.copy(alpha = 0.7f)) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    leadingIcon = { Icon(Icons.Default.Search, null, tint = Color.White) },
                    trailingIcon = if (state.query.isNotEmpty()) {
                        { IconButton(onClick = { viewModel.updateQuery("") }) { Icon(Icons.Default.Clear, null, tint = Color.White) } }
                    } else null,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color.White,
                        unfocusedBorderColor = Color.White.copy(alpha = 0.5f),
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    ),
                    shape = RoundedCornerShape(12.dp)
                )
            }

            // GPS Button with Permission Handling
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .clickable {
                        if (locationPermissionState.status.isGranted) {
                            viewModel.autoDetectAndSetup()
                        } else {
                            locationPermissionState.launchPermissionRequest()
                        }
                    },
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF22C55E))
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.MyLocation, null, tint = Color.White)
                    Spacer(Modifier.width(12.dp))
                    Text(
                        if (locationPermissionState.status.isGranted) "Detect My Current Location" else "Grant Location Access",
                        color = Color.White,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(Modifier.weight(1f))
                    if (state.detecting) CircularProgressIndicator(Modifier.size(20.dp), color = Color.White, strokeWidth = 2.dp)
                }
            }

            // ⚠️ Mock GPS Warning
            if (isMockLocation || isDeveloperMock) {
                Card(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 4.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFEF2F2))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Warning, null, tint = Color(0xFFDC2626))
                        Spacer(Modifier.width(10.dp))
                        Text(
                            "Fake GPS detected. Location-based features may be restricted.",
                            color = Color(0xFFDC2626),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            // Show rationale if permission was denied
            if (!locationPermissionState.status.isGranted && locationPermissionState.status.shouldShowRationale) {
                Text(
                    "Zaruda uses location to find listings near you. Please grant permission for a better experience.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(horizontal = 24.dp)
                )
            }

            // Results
            Text(
                text = if (state.query.length >= 3) "Search Results" else "Popular Cities",
                style = MaterialTheme.typography.labelLarge,
                color = Color.Gray,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )

            if (state.loading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            } else {
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    items(state.results) { city ->
                        LocationRow(city = city, onClick = { onSelect(city) })
                        HorizontalDivider(modifier = Modifier.padding(horizontal = 16.dp), color = Color.LightGray.copy(alpha = 0.3f))
                    }
                }
            }
        }
    }
}

@Composable
fun LocationRow(city: CitySuggestion, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(CircleShape)
                .background(if (city.isPopular) Color(0xFFEFF6FF) else Color(0xFFF1F5F9)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.LocationOn,
                contentDescription = null,
                tint = if (city.isPopular) Color(0xFF3B82F6) else Color.Gray,
                modifier = Modifier.size(20.dp)
            )
        }
        Spacer(Modifier.width(16.dp))
        Column {
            Text(city.name, fontWeight = FontWeight.Bold, fontSize = 16.sp)
            if (city.state.isNotEmpty()) {
                Text(city.state, fontSize = 12.sp, color = Color.Gray)
            }
        }
    }
}
