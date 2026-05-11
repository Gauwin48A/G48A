package com.mhub.app.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.mhub.app.BuildConfig
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "mhub_prefs")

enum class ThemeMode { SYSTEM, LIGHT, DARK }

@Singleton
class AppPreferences @Inject constructor(private val context: Context) {

    private val baseUrlKey = stringPreferencesKey("api_base_url")
    private val themeModeKey = stringPreferencesKey("theme_mode")
    private val lastCategoryKey = stringPreferencesKey("last_category_key")
    private val recentSearchesKey = stringPreferencesKey("recent_searches_json")

    private fun categoryTabKey(categoryKey: String) =
        stringPreferencesKey("last_category_tab_${categoryKey.lowercase()}")

    val themeMode: Flow<ThemeMode> = context.dataStore.data.map { prefs ->
        when (prefs[themeModeKey]) {
            "light" -> ThemeMode.LIGHT
            "dark" -> ThemeMode.DARK
            else -> ThemeMode.SYSTEM
        }
    }

    suspend fun setThemeMode(mode: ThemeMode) {
        context.dataStore.edit { it[themeModeKey] = mode.name.lowercase() }
    }

    val lastOpenedCategory: Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[lastCategoryKey]
    }

    suspend fun setLastOpenedCategory(categoryKey: String) {
        context.dataStore.edit { it[lastCategoryKey] = categoryKey.lowercase() }
    }

    fun lastCategoryTab(categoryKey: String): Flow<String?> = context.dataStore.data.map { prefs ->
        prefs[categoryTabKey(categoryKey)]
    }

    suspend fun lastCategoryTabValue(categoryKey: String): String? =
        context.dataStore.data.first()[categoryTabKey(categoryKey)]

    suspend fun setLastCategoryTab(categoryKey: String, tabName: String) {
        context.dataStore.edit { prefs ->
            prefs[categoryTabKey(categoryKey)] = tabName
        }
    }

    val baseUrl: Flow<String> = context.dataStore.data.map { prefs ->
        prefs[baseUrlKey]?.takeIf { it.isNotBlank() } ?: BuildConfig.DEFAULT_API_BASE_URL
    }

    suspend fun setBaseUrl(value: String) {
        val normalized = value.trim().let { if (it.endsWith("/")) it else "$it/" }
        context.dataStore.edit { it[baseUrlKey] = normalized }
    }

    /** Read once with a sane default. Safe for use at startup. */
    suspend fun baseUrlOrDefault(): String = try {
        context.dataStore.data.first()[baseUrlKey]?.takeIf { it.isNotBlank() }
            ?: BuildConfig.DEFAULT_API_BASE_URL
    } catch (_: Throwable) {
        BuildConfig.DEFAULT_API_BASE_URL
    }

    // Recent searches (persisted as pipe-delimited string, max 10)
    suspend fun getRecentSearches(): List<String> = try {
        val raw = context.dataStore.data.first()[recentSearchesKey] ?: ""
        if (raw.isBlank()) emptyList() else raw.split("|").take(10)
    } catch (_: Throwable) { emptyList() }

    suspend fun saveRecentSearches(queries: List<String>) {
        context.dataStore.edit { it[recentSearchesKey] = queries.take(10).joinToString("|") }
    }
}
