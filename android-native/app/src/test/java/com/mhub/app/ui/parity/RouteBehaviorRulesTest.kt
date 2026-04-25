package com.mhub.app.ui.parity

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RouteBehaviorRulesTest {

    @Test
    fun category_group_normalization_and_route_building() {
        assertTrue(RouteBehaviorRules.normalizeCategoryGroup("fashion") == "fashion")
        assertTrue(RouteBehaviorRules.normalizeCategoryGroup("FASHION") == "fashion")
        assertTrue(RouteBehaviorRules.normalizeCategoryGroup(" vehicles ") == "vehicles")
        assertTrue(RouteBehaviorRules.normalizeCategoryGroup("fashion-trends") == "all")
        assertTrue(RouteBehaviorRules.normalizeCategoryGroup(null) == "all")

        assertTrue(
            RouteBehaviorRules.buildAllPostsRoute("fashion", "iphone 14") ==
                "/all-posts?category_group=fashion&query=iphone+14",
        )
        assertTrue(RouteBehaviorRules.buildAllPostsRoute("all", "") == "/all-posts")
    }

    @Test
    fun commerce_offer_amount_validation() {
        assertTrue(RouteBehaviorRules.isValidOfferAmount("500"))
        assertFalse(RouteBehaviorRules.isValidOfferAmount("50"))
        assertFalse(RouteBehaviorRules.isValidOfferAmount("abc"))
    }

    @Test
    fun chat_message_validation() {
        assertTrue(RouteBehaviorRules.canSendChatMessage("Interested in this listing"))
        assertFalse(RouteBehaviorRules.canSendChatMessage("   "))
        assertFalse(RouteBehaviorRules.canSendChatMessage("x".repeat(600)))
    }

    @Test
    fun profile_name_validation() {
        assertTrue(RouteBehaviorRules.isProfileNameValid("Rahul Sharma"))
        assertFalse(RouteBehaviorRules.isProfileNameValid("A"))
        assertFalse(RouteBehaviorRules.isProfileNameValid(" ".repeat(10)))
    }

    @Test
    fun kyc_id_validation() {
        assertTrue(RouteBehaviorRules.isValidKycId("ABCD123456"))
        assertFalse(RouteBehaviorRules.isValidKycId("123"))
        assertFalse(RouteBehaviorRules.isValidKycId(""))
    }

    @Test
    fun kyc_document_type_and_format_validation() {
        assertTrue(RouteBehaviorRules.isValidKycDocumentType("Aadhaar"))
        assertFalse(RouteBehaviorRules.isValidKycDocumentType("Voter ID"))

        assertTrue(RouteBehaviorRules.isValidKycIdForType("Aadhaar", "123412341234"))
        assertFalse(RouteBehaviorRules.isValidKycIdForType("Aadhaar", "1234"))
        assertTrue(RouteBehaviorRules.isValidKycIdForType("PAN", "abcde1234f"))
        assertFalse(RouteBehaviorRules.isValidKycIdForType("PAN", "ABCDE12345"))
    }

    @Test
    fun payment_amount_validation() {
        assertTrue(RouteBehaviorRules.isValidPaymentAmount("1499.00"))
        assertFalse(RouteBehaviorRules.isValidPaymentAmount("0"))
        assertFalse(RouteBehaviorRules.isValidPaymentAmount("-1"))
        assertFalse(RouteBehaviorRules.isValidPaymentAmount("x1"))
    }

    @Test
    fun payment_method_and_composed_validation() {
        assertTrue(RouteBehaviorRules.isValidPaymentMethod("UPI"))
        assertFalse(RouteBehaviorRules.isValidPaymentMethod("Cheque"))
        assertTrue(RouteBehaviorRules.paymentValidationMessage("1200", "Card") == null)
        assertTrue(
            RouteBehaviorRules.paymentValidationMessage("0", "UPI") ==
                "Enter a valid amount greater than 0.",
        )
        assertTrue(
            RouteBehaviorRules.paymentValidationMessage("1200", "Cheque") ==
                "Choose a supported payment method.",
        )
    }
}
