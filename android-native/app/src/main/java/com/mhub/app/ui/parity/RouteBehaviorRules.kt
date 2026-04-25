package com.mhub.app.ui.parity

object RouteBehaviorRules {
    private val supportedCategoryGroups = setOf("all", "electronics", "fashion", "vehicles", "others")
    private val supportedPaymentMethods = setOf("UPI", "Card", "Wallet", "NetBanking")
    private val supportedKycDocTypes = setOf("Aadhaar", "PAN", "Passport", "Driving Licence")

    fun normalizeCategoryGroup(value: String?): String {
        val normalized = value
            ?.trim()
            ?.lowercase()
            ?.replace("-", "")
            ?.replace("_", "")
            .orEmpty()

        return when (normalized) {
            "electronics" -> "electronics"
            "fashion" -> "fashion"
            "vehicles" -> "vehicles"
            "others" -> "others"
            "all", "" -> "all"
            else -> "all"
        }
    }

    fun buildAllPostsRoute(categoryGroup: String?, query: String?): String {
        val group = normalizeCategoryGroup(categoryGroup)
        val search = query?.trim().orEmpty()
        val params = mutableListOf<String>()
        if (group in supportedCategoryGroups && group != "all") {
            params += "category_group=$group"
        }
        if (search.isNotEmpty()) {
            params += "query=${search.replace(" ", "+")}"
        }
        return if (params.isEmpty()) "/all-posts" else "/all-posts?${params.joinToString("&")}"
    }

    fun isValidOfferAmount(value: String, min: Int = 100): Boolean {
        val parsed = value.trim().toIntOrNull() ?: return false
        return parsed >= min
    }

    fun canSendChatMessage(message: String, maxLen: Int = 500): Boolean {
        val trimmed = message.trim()
        return trimmed.isNotEmpty() && trimmed.length <= maxLen
    }

    fun isProfileNameValid(name: String): Boolean {
        val trimmed = name.trim()
        return trimmed.length in 2..60
    }

    fun isValidKycDocumentType(docType: String): Boolean = supportedKycDocTypes.contains(docType.trim())

    fun isValidKycId(idNumber: String): Boolean {
        val normalized = idNumber.filter { it.isLetterOrDigit() }
        return normalized.length in 8..20
    }

    fun isValidKycIdForType(docType: String, idNumber: String): Boolean {
        val compact = idNumber.filter { it.isLetterOrDigit() }
        val upper = compact.uppercase()
        return when (docType.trim()) {
            "Aadhaar" -> compact.length == 12 && compact.all { it.isDigit() }
            "PAN" -> upper.matches(Regex("^[A-Z]{5}[0-9]{4}[A-Z]$"))
            "Passport" -> compact.length in 7..9
            "Driving Licence" -> compact.length in 10..18
            else -> isValidKycId(compact)
        }
    }

    fun isValidPaymentMethod(method: String): Boolean = supportedPaymentMethods.contains(method.trim())

    fun isValidPaymentAmount(amount: String): Boolean {
        val parsed = amount.trim().toDoubleOrNull() ?: return false
        return parsed > 0.0
    }

    fun paymentValidationMessage(amount: String, method: String): String? {
        if (!isValidPaymentAmount(amount)) return "Enter a valid amount greater than 0."
        if (!isValidPaymentMethod(method)) return "Choose a supported payment method."
        return null
    }
}
