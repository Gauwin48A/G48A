package com.mhub.app.ui.common

import java.util.Locale

object InputValidators {
    private val emailRegex = Regex(
        pattern = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
    )
    private val tenDigitPhoneRegex = Regex("^[0-9]{10}$")
    private val baseUrlRegex = Regex("^https?://[A-Za-z0-9._:-]+/?$")
    private val aadhaarRegex = Regex("^\\d{12}$")
    private val panRegex = Regex("^[A-Z]{5}\\d{4}[A-Z]$")
    private val passportRegex = Regex("^[A-Z][0-9]{7}$")
    private val drivingLicenseRegex = Regex("^[A-Z0-9-]{8,20}$")

    fun isValidEmail(value: String): Boolean = emailRegex.matches(value.trim())

    fun normalizePhone(value: String): String = value.filter { it.isDigit() }.takeLast(10)

    fun isValidPhone(value: String): Boolean = tenDigitPhoneRegex.matches(normalizePhone(value))

    fun isValidEmailOrPhone(value: String): Boolean {
        val trimmed = value.trim()
        return isValidEmail(trimmed) || isValidPhone(trimmed)
    }

    fun isStrongPassword(password: String, minLength: Int = 8): Boolean = password.length >= minLength

    fun isValidFullName(name: String): Boolean = name.trim().length in 2..60

    fun isValidTitle(title: String, minLength: Int = 3, maxLength: Int = 120): Boolean {
        val length = title.trim().length
        return length in minLength..maxLength
    }

    fun hasSufficientImages(imageCount: Int, minCount: Int = 1): Boolean = imageCount >= minCount

    fun parsePositiveAmount(raw: String): Double? {
        val parsed = raw.trim().toDoubleOrNull() ?: return null
        return parsed.takeIf { it > 0.0 }
    }

    fun toDisplayBaseUrl(raw: String, fallback: String): String {
        val trimmed = raw.trim()
        if (trimmed.isEmpty()) return ensureTrailingSlash(fallback)
        return ensureTrailingSlash(trimmed)
    }

    fun isHttpUrl(value: String): Boolean = baseUrlRegex.matches(value.trim())

    fun normalizeKycDocType(value: String): String = value.trim().lowercase(Locale.ROOT)

    fun normalizeKycDocNumber(value: String): String =
        value.trim().replace(" ", "").uppercase(Locale.ROOT)

    fun sanitizeKycDocNumberInput(docType: String, value: String): String {
        val normalizedType = normalizeKycDocType(docType)
        val raw = value.uppercase(Locale.ROOT)
        val filtered = when (normalizedType) {
            "aadhaar" -> raw.filter { it.isDigit() }.take(12)
            "pan" -> raw.filter { it.isLetterOrDigit() }.take(10)
            "passport" -> raw.filter { it.isLetterOrDigit() }.take(8)
            "driving_license" -> raw.filter { it.isLetterOrDigit() || it == '-' }.take(20)
            else -> raw.trim()
        }
        return normalizeKycDocNumber(filtered)
    }

    fun isValidKycDocumentNumber(docType: String, docNumber: String): Boolean {
        val normalizedType = normalizeKycDocType(docType)
        val normalizedNumber = normalizeKycDocNumber(docNumber)
        return when (normalizedType) {
            "aadhaar" -> aadhaarRegex.matches(normalizedNumber)
            "pan" -> panRegex.matches(normalizedNumber)
            "passport" -> passportRegex.matches(normalizedNumber)
            "driving_license" -> drivingLicenseRegex.matches(normalizedNumber)
            else -> normalizedNumber.length >= 4
        }
    }

    fun requiresKycBackImage(docType: String): Boolean {
        val normalizedType = normalizeKycDocType(docType)
        return normalizedType == "aadhaar" || normalizedType == "driving_license"
    }

    fun kycDocValidationMessage(docType: String): String {
        return when (normalizeKycDocType(docType)) {
            "aadhaar" -> "Enter a valid 12-digit Aadhaar number"
            "pan" -> "Enter a valid PAN (e.g. ABCDE1234F)"
            "passport" -> "Enter a valid passport number (e.g. A1234567)"
            "driving_license" -> "Enter a valid driving license number"
            else -> "Enter a valid document number"
        }
    }

    fun isSecureOrLocalDevUrl(value: String): Boolean {
        val normalized = value.trim().lowercase(Locale.ROOT)
        if (!isHttpUrl(normalized)) return false
        if (normalized.startsWith("https://")) return true

        // Allow local emulator/dev loopback URLs over HTTP.
        return normalized.startsWith("http://10.0.2.2") ||
            normalized.startsWith("http://127.0.0.1") ||
            normalized.startsWith("http://localhost")
    }

    private fun ensureTrailingSlash(value: String): String =
        if (value.endsWith("/")) value else "$value/"
}
