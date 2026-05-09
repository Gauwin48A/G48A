package com.mhub.app.ui.checkout

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CreditCard
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocalShipping
import androidx.compose.material.icons.filled.Phone
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.mhub.app.ui.components.StepProgressIndicator
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.UUID

/** Four-step checkout flow: Address → Payment → Review → Confirm */

// ─────────────────────────────────────────────────────────────────────────────
// Address Screen
// ─────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutAddressScreen(
    onBack: () -> Unit,
    onNext: (name: String, phone: String, address: String) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var line1 by remember { mutableStateOf("") }
    var line2 by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var state by remember { mutableStateOf("") }
    var pincode by remember { mutableStateOf("") }

    var nameError by remember { mutableStateOf("") }
    var phoneError by remember { mutableStateOf("") }
    var line1Error by remember { mutableStateOf("") }
    var cityError by remember { mutableStateOf("") }
    var stateError by remember { mutableStateOf("") }
    var pincodeError by remember { mutableStateOf("") }

    fun validate(): Boolean {
        nameError    = if (name.isBlank()) "Name is required" else ""
        phoneError   = if (phone.length != 10) "Enter valid 10-digit phone number" else ""
        line1Error   = if (line1.isBlank()) "Address is required" else ""
        cityError    = if (city.isBlank()) "City is required" else ""
        stateError   = if (state.isBlank()) "State is required" else ""
        pincodeError = if (pincode.length != 6) "Enter valid 6-digit PIN code" else ""
        return listOf(nameError, phoneError, line1Error, cityError, stateError, pincodeError).all { it.isEmpty() }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Delivery Address") },
                navigationIcon = {
                    IconButton(onClick = onBack, modifier = Modifier.semantics { contentDescription = "Go back" }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = null)
                    }
                },
            )
        },
    ) { pad ->
        Column(modifier = Modifier.padding(pad).fillMaxSize()) {
            StepProgressIndicator(
                steps = listOf("Address", "Payment", "Review", "Confirm"),
                currentStep = 0,
                modifier = Modifier.padding(16.dp),
            )
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Spacer(Modifier.height(4.dp))
                ValidatedField("Full Name", name, nameError, onValue = { name = it }, keyboardType = KeyboardType.Text)
                ValidatedField("Phone Number", phone, phoneError, onValue = { phone = it }, keyboardType = KeyboardType.Phone)
                ValidatedField("Address Line 1", line1, line1Error, onValue = { line1 = it })
                ValidatedField("Address Line 2 (Optional)", line2, "", onValue = { line2 = it })
                ValidatedField("City", city, cityError, onValue = { city = it })
                ValidatedField("State", state, stateError, onValue = { state = it })
                ValidatedField("PIN Code", pincode, pincodeError, onValue = { pincode = it }, keyboardType = KeyboardType.Number)
                Spacer(Modifier.height(8.dp))
            }
            Button(
                onClick = {
                    if (validate()) {
                        val fullAddress = "$line1${if (line2.isNotBlank()) ", $line2" else ""}, $city, $state - $pincode"
                        onNext(name, phone, fullAddress)
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .height(52.dp)
                    .semantics { contentDescription = "Continue to payment" },
            ) { Text("Continue to Payment", fontWeight = FontWeight.Bold) }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment Screen
// ─────────────────────────────────────────────────────────────────────────────

private enum class PaymentMethod { UPI, CARD, NET_BANKING, COD }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutPaymentScreen(
    onBack: () -> Unit,
    onNext: (method: String) -> Unit,
) {
    var selectedMethod by remember { mutableStateOf(PaymentMethod.UPI) }
    var upiId by remember { mutableStateOf("") }
    var cardNumber by remember { mutableStateOf("") }
    var cardExpiry by remember { mutableStateOf("") }
    var cardCvv by remember { mutableStateOf("") }
    var cardName by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Payment Method") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Go back") }
                },
            )
        },
    ) { pad ->
        Column(modifier = Modifier.padding(pad).fillMaxSize()) {
            StepProgressIndicator(
                steps = listOf("Address", "Payment", "Review", "Confirm"),
                currentStep = 1,
                modifier = Modifier.padding(16.dp),
            )
            Column(
                modifier = Modifier
                    .weight(1f)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Text(
                    "Choose Payment Method",
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.Bold),
                    modifier = Modifier.semantics { heading() },
                )
                Spacer(Modifier.height(4.dp))

                listOf(
                    PaymentMethod.UPI         to "UPI",
                    PaymentMethod.CARD        to "Credit / Debit Card",
                    PaymentMethod.NET_BANKING to "Net Banking",
                    PaymentMethod.COD         to "Cash on Delivery",
                ).forEach { (method, label) ->
                    PaymentOptionRow(
                        label = label,
                        isSelected = selectedMethod == method,
                        onSelect = { selectedMethod = method },
                    )
                }

                // UPI input
                if (selectedMethod == PaymentMethod.UPI) {
                    OutlinedTextField(
                        value = upiId,
                        onValueChange = { upiId = it },
                        label = { Text("UPI ID (e.g. name@upi)") },
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                        singleLine = true,
                    )
                }

                // Card inputs
                if (selectedMethod == PaymentMethod.CARD) {
                    OutlinedTextField(
                        value = cardNumber,
                        onValueChange = { if (it.length <= 16) cardNumber = it },
                        label = { Text("Card Number") },
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                        singleLine = true,
                        placeholder = { Text("1234 5678 9012 3456") },
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        OutlinedTextField(
                            value = cardExpiry,
                            onValueChange = { if (it.length <= 5) cardExpiry = it },
                            label = { Text("MM/YY") },
                            modifier = Modifier.weight(1f),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                        )
                        OutlinedTextField(
                            value = cardCvv,
                            onValueChange = { if (it.length <= 3) cardCvv = it },
                            label = { Text("CVV") },
                            modifier = Modifier.weight(1f),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            singleLine = true,
                        )
                    }
                    OutlinedTextField(
                        value = cardName,
                        onValueChange = { cardName = it },
                        label = { Text("Cardholder Name") },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                }

                // Net banking — bank selection
                if (selectedMethod == PaymentMethod.NET_BANKING) {
                    listOf("SBI", "HDFC", "ICICI", "Axis", "Kotak", "Other").forEach { bank ->
                        Text(
                            bank,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { }
                                .padding(vertical = 10.dp, horizontal = 4.dp),
                        )
                        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.4f))
                    }
                }

                // COD note
                if (selectedMethod == PaymentMethod.COD) {
                    Surface(
                        color = MaterialTheme.colorScheme.tertiaryContainer,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(
                            "Cash on Delivery available. Pay when you receive your order.",
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(12.dp),
                        )
                    }
                }
            }
            Button(
                onClick = { onNext(selectedMethod.name) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .height(52.dp)
                    .semantics { contentDescription = "Continue to order review" },
            ) { Text("Review Order", fontWeight = FontWeight.Bold) }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Order Review Screen
// ─────────────────────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutReviewScreen(
    address: String,
    paymentMethod: String,
    onBack: () -> Unit,
    onPlaceOrder: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var isPlacing by remember { mutableStateOf(false) }

    // Mock order summary
    val subtotal = 12999.0
    val tax = subtotal * 0.18
    val shipping = 0.0
    val total = subtotal + tax + shipping

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Order Review") },
                navigationIcon = {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Go back") }
                },
            )
        },
    ) { pad ->
        Column(modifier = Modifier.padding(pad).fillMaxSize()) {
            StepProgressIndicator(
                steps = listOf("Address", "Payment", "Review", "Confirm"),
                currentStep = 2,
                modifier = Modifier.padding(16.dp),
            )
            LazyColumn(
                modifier = Modifier.weight(1f).padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item {
                    ReviewSection(title = "Delivery Address", icon = Icons.Filled.Home) {
                        Text(address, style = MaterialTheme.typography.bodyMedium)
                    }
                }
                item {
                    ReviewSection(title = "Payment", icon = Icons.Filled.CreditCard) {
                        Text(paymentMethod.replace("_", " "), style = MaterialTheme.typography.bodyMedium)
                    }
                }
                item {
                    ReviewSection(title = "Price Summary", icon = Icons.Filled.LocalShipping) {
                        Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            PriceLine("Subtotal", "₹${subtotal.toInt()}")
                            PriceLine("GST (18%)", "₹${tax.toInt()}")
                            PriceLine("Shipping", if (shipping == 0.0) "FREE" else "₹${shipping.toInt()}")
                            Spacer(Modifier.height(4.dp))
                            HorizontalDivider()
                            Spacer(Modifier.height(4.dp))
                            PriceLine("Total", "₹${total.toInt()}", isBold = true)
                        }
                    }
                }
                item {
                    Surface(
                        color = MaterialTheme.colorScheme.secondaryContainer,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.LocalShipping, contentDescription = null, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(8.dp))
                            Text("Estimated delivery: 3–5 business days", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
                item { Spacer(Modifier.height(8.dp)) }
            }
            Button(
                onClick = {
                    scope.launch {
                        isPlacing = true
                        delay(1500L)
                        isPlacing = false
                        onPlaceOrder()
                    }
                },
                enabled = !isPlacing,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
                    .height(52.dp)
                    .semantics { contentDescription = "Place order for ₹${total.toInt()}" },
            ) {
                if (isPlacing) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                }
                Text("Place Order · ₹${total.toInt()}", fontWeight = FontWeight.Bold)
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Order Confirmation Screen
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun OrderConfirmationScreen(
    onContinueShopping: () -> Unit,
    onViewOrder: () -> Unit,
) {
    val orderId = remember { "MH${UUID.randomUUID().toString().take(8).uppercase()}" }

    Box(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Icon(
                Icons.Filled.CheckCircle,
                contentDescription = "Order placed successfully",
                tint = Color(0xFF4CAF50),
                modifier = Modifier.size(80.dp),
            )
            Text(
                "Order Placed!",
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF2E7D32),
                ),
            )
            Text(
                "Order ID: $orderId",
                style = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurfaceVariant),
            )
            Text(
                "Thank you for your order. Estimated delivery in 3–5 business days.",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(8.dp))
            Button(
                onClick = onViewOrder,
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) { Text("View Order") }
            androidx.compose.material3.OutlinedButton(
                onClick = onContinueShopping,
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) { Text("Continue Shopping") }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Order Failed Screen
// ─────────────────────────────────────────────────────────────────────────────

@Composable
fun OrderFailedScreen(
    onRetry: () -> Unit,
    onGoToCart: () -> Unit,
) {
    Box(
        modifier = Modifier.fillMaxSize().padding(24.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Icon(
                Icons.Filled.ErrorOutline,
                contentDescription = "Order failed",
                tint = MaterialTheme.colorScheme.error,
                modifier = Modifier.size(80.dp),
            )
            Text(
                "Payment Failed",
                style = MaterialTheme.typography.headlineMedium.copy(
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.error,
                ),
            )
            Text(
                "Something went wrong. Your payment could not be processed.",
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
            )
            Button(
                onClick = onRetry,
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) { Text("Retry Payment") }
            androidx.compose.material3.OutlinedButton(
                onClick = onGoToCart,
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) { Text("Go to Cart") }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

@Composable
private fun ValidatedField(
    label: String,
    value: String,
    error: String,
    onValue: (String) -> Unit,
    keyboardType: KeyboardType = KeyboardType.Text,
) {
    val errTrimmed = error.trim()
    OutlinedTextField(
        value = value,
        onValueChange = onValue,
        label = { Text(label) },
        isError = errTrimmed.isNotEmpty(),
        supportingText = if (errTrimmed.isNotEmpty()) {
            { Text(errTrimmed, color = MaterialTheme.colorScheme.error) }
        } else null,
        modifier = Modifier
            .fillMaxWidth()
            .semantics { if (errTrimmed.isNotEmpty()) contentDescription = "$label: $errTrimmed" },
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = ImeAction.Next),
        singleLine = true,
    )
}

@Composable
private fun PaymentOptionRow(label: String, isSelected: Boolean, onSelect: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(8.dp),
        color = if (isSelected) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClickLabel = "Select $label") { onSelect() }
            .semantics { contentDescription = "$label payment method${if (isSelected) ", selected" else ""}" },
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            RadioButton(selected = isSelected, onClick = onSelect)
            Spacer(Modifier.width(8.dp))
            Text(label, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal))
        }
    }
}

@Composable
private fun ReviewSection(
    title: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    content: @Composable () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        tonalElevation = 1.dp,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.width(8.dp))
                Text(title, style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold))
            }
            Spacer(Modifier.height(8.dp))
            content()
        }
    }
}

@Composable
private fun PriceLine(label: String, value: String, isBold: Boolean = false) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = if (isBold) FontWeight.Bold else FontWeight.Normal))
        Text(value, style = MaterialTheme.typography.bodyMedium.copy(fontWeight = if (isBold) FontWeight.Bold else FontWeight.Normal))
    }
}
