package com.mhub.app.core

import android.content.Context
import android.content.res.Configuration
import androidx.compose.runtime.staticCompositionLocalOf
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Centralized locale manager that provides reactive locale state.
 * When the locale changes, all UI that observes [currentLocale] rebuilds automatically,
 * and all locale-aware API interceptors use the updated locale.
 */
@Singleton
class LocaleManager @Inject constructor(
    @ApplicationContext private val context: Context,
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

    fun setLocale(languageCode: String) {
        val locale = Locale(languageCode)
        Locale.setDefault(locale)
        persistLocale(languageCode)
        _currentLocale.value = locale
        _localeVersion.value++
    }

    fun applyToContext(base: Context): Context {
        val locale = _currentLocale.value
        val config = Configuration(base.resources.configuration).apply {
            setLocale(locale)
        }
        return base.createConfigurationContext(config)
    }

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
