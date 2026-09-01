package com.zaruda.app.ui.common

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class InputValidatorsTest {

    @Test
    fun email_and_phone_validation() {
        assertTrue(InputValidators.isValidEmail("rahul.sharma@zaruda.com"))
        assertFalse(InputValidators.isValidEmail("rahul.sharma"))

        assertTrue(InputValidators.isValidPhone("9876543210"))
        assertTrue(InputValidators.isValidPhone("+91 98765 43210"))
        assertFalse(InputValidators.isValidPhone("12345"))

        assertTrue(InputValidators.isValidEmailOrPhone("rahul.sharma@zaruda.com"))
        assertTrue(InputValidators.isValidEmailOrPhone("+91 98765 43210"))
        assertFalse(InputValidators.isValidEmailOrPhone("invalid-user"))
    }

    @Test
    fun password_name_and_amount_validation() {
        assertTrue(InputValidators.isStrongPassword("Password123!"))
        assertFalse(InputValidators.isStrongPassword("short"))

        assertTrue(InputValidators.isValidFullName("Rahul Sharma"))
        assertFalse(InputValidators.isValidFullName("A"))
        assertTrue(InputValidators.isValidTitle("iPhone 14 Pro"))
        assertFalse(InputValidators.isValidTitle("ab"))
        assertTrue(InputValidators.hasSufficientImages(1))
        assertFalse(InputValidators.hasSufficientImages(0))

        assertNotNull(InputValidators.parsePositiveAmount("1499.00"))
        assertNull(InputValidators.parsePositiveAmount("0"))
        assertNull(InputValidators.parsePositiveAmount("-10"))
        assertNull(InputValidators.parsePositiveAmount("abc"))
    }

    @Test
    fun base_url_validation() {
        assertEquals(
            "http://10.0.2.2:5001/",
            InputValidators.toDisplayBaseUrl("http://10.0.2.2:5001", "https://api.example.com/"),
        )
        assertTrue(InputValidators.isHttpUrl("https://api.example.com/"))
        assertTrue(InputValidators.isSecureOrLocalDevUrl("https://api.example.com/"))
        assertTrue(InputValidators.isSecureOrLocalDevUrl("http://10.0.2.2:5001/"))
        assertFalse(InputValidators.isSecureOrLocalDevUrl("http://remote.example.com/"))
        assertFalse(InputValidators.isSecureOrLocalDevUrl("ftp://api.example.com"))
    }

    @Test
    fun kyc_document_validation() {
        assertTrue(InputValidators.isValidKycDocumentNumber("aadhaar", "123412341234"))
        assertFalse(InputValidators.isValidKycDocumentNumber("aadhaar", "1234"))

        assertTrue(InputValidators.isValidKycDocumentNumber("pan", "ABCDE1234F"))
        assertFalse(InputValidators.isValidKycDocumentNumber("pan", "ABCD1234F"))

        assertTrue(InputValidators.isValidKycDocumentNumber("passport", "A1234567"))
        assertFalse(InputValidators.isValidKycDocumentNumber("passport", "12345678"))

        assertTrue(InputValidators.isValidKycDocumentNumber("driving_license", "DL-0420110149646"))
        assertFalse(InputValidators.isValidKycDocumentNumber("driving_license", "1234"))
        assertEquals("ABCDE1234F", InputValidators.sanitizeKycDocNumberInput("pan", "abcde 1234f"))
        assertEquals("123412341234", InputValidators.sanitizeKycDocNumberInput("aadhaar", "1234-1234-1234"))

        assertTrue(InputValidators.requiresKycBackImage("aadhaar"))
        assertTrue(InputValidators.requiresKycBackImage("driving_license"))
        assertFalse(InputValidators.requiresKycBackImage("pan"))
    }
}
