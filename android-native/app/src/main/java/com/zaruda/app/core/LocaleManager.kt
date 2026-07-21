package com.zaruda.app.core

import android.content.Context
import android.content.res.Configuration
import androidx.appcompat.app.AppCompatDelegate
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.core.os.LocaleListCompat
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton
import javax.inject.Provider
import com.zaruda.app.data.repository.AuthRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Centralized locale manager that provides reactive locale state.
 * When the locale changes, all UI that observes [currentLocale] rebuilds automatically,
 * and all locale-aware API interceptors use the updated locale.
 *
 * Integrates with AppCompatDelegate for per-app language support and
 * provides [localeVersion] to force data refresh across the app.
 */
@Singleton
class LocaleManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val authRepositoryProvider: Provider<AuthRepository>,
) {
    private val _currentLocale = MutableStateFlow(getPersistedLocale())
    val currentLocale: StateFlow<Locale> = _currentLocale.asStateFlow()

    /** Unique counter that increments on every locale change, used to force data refresh. */
    private val _localeVersion = MutableStateFlow(0L)
    val localeVersion: StateFlow<Long> = _localeVersion.asStateFlow()

    /** List of supported locale codes. */
    val supportedLocales = listOf(
        "en", "hi", "es", "fr", "ar", "bn", "ta", "te", "kn", "mr", "gu", "ml", "pa", "ur",
        "de", "pt", "it", "ja", "ko", "zh", "ru", "tr", "nl", "pl", "th",
    )

    /**
     * Set locale across the entire app. Updates:
     * 1. SharedPreferences persistence
     * 2. Reactive StateFlow (triggers Compose recomposition)
     * 3. AppCompatDelegate (triggers Activity recreation for XML resources)
     * 4. Locale version counter (forces API data reload)
     */
    fun setLocale(languageCode: String) {
        val locale = Locale(languageCode)
        Locale.setDefault(locale)
        persistLocale(languageCode)
        _currentLocale.value = locale
        _localeVersion.value++
        // Sync with AppCompat per-app language system
        AppCompatDelegate.setApplicationLocales(
            LocaleListCompat.forLanguageTags(languageCode),
        )
        // Sync language selection with backend if logged in
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val repository = authRepositoryProvider.get()
                if (repository.isCurrentlyAuthenticated) {
                    repository.updatePreferredLanguage(languageCode)
                }
            } catch (e: Exception) {
                android.util.Log.e("LocaleManager", "Failed to sync language selection: ${e.message}")
            }
        }
    }

    fun applyToContext(base: Context): Context {
        val locale = _currentLocale.value
        val config = Configuration(base.resources.configuration).apply {
            setLocale(locale)
        }
        return base.createConfigurationContext(config)
    }

    /** Get the current language code (e.g., "en", "hi"). */
    val currentLanguageCode: String
        get() = _currentLocale.value.language

    private fun getPersistedLocale(): Locale {
        val prefs = context.getSharedPreferences("mhub_locale", Context.MODE_PRIVATE)
        val code = prefs.getString("locale_code", "en") ?: "en"
        return Locale(code)
    }

    private fun persistLocale(code: String) {
        context.getSharedPreferences("mhub_locale", Context.MODE_PRIVATE)
            .edit()
            .putString("locale_code", code)
            .apply()
    }
}

val LocalLocaleManager = staticCompositionLocalOf<LocaleManager> {
    error("LocaleManager not provided")
}
