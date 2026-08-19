package com.zaruda.app.ui.scanner

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Size
import android.widget.Toast
import androidx.annotation.OptIn
import androidx.camera.core.CameraSelector
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.FlashOff
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.filled.OpenInBrowser
import androidx.compose.material.icons.filled.QrCode
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Share
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.accompanist.permissions.shouldShowRationale
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.Executors

// ── Result type for scanned content ─────────────────────
private sealed class ScanResult {
    data class Url(val url: String) : ScanResult()
    data class Product(val value: String) : ScanResult()
    data class Text(val value: String) : ScanResult()
    data class Contact(val name: String, val phone: String?) : ScanResult()
    data class Wifi(val ssid: String, val password: String?) : ScanResult()
}

private fun classifyBarcode(barcode: Barcode): ScanResult {
    return when (barcode.valueType) {
        Barcode.TYPE_URL -> ScanResult.Url(barcode.url?.url ?: barcode.rawValue.orEmpty())
        Barcode.TYPE_PRODUCT -> ScanResult.Product(barcode.rawValue.orEmpty())
        Barcode.TYPE_CONTACT_INFO -> {
            val contact = barcode.contactInfo
            ScanResult.Contact(
                name = contact?.name?.formattedName.orEmpty(),
                phone = contact?.phones?.firstOrNull()?.number
            )
        }
        Barcode.TYPE_WIFI -> {
            val wifi = barcode.wifi
            ScanResult.Wifi(ssid = wifi?.ssid.orEmpty(), password = wifi?.password)
        }
        else -> {
            val raw = barcode.rawValue.orEmpty()
            if (raw.startsWith("http://") || raw.startsWith("https://")) {
                ScanResult.Url(raw)
            } else {
                ScanResult.Text(raw)
            }
        }
    }
}

// ── Main Scanner Screen ─────────────────────────────────
@kotlin.OptIn(ExperimentalPermissionsApi::class)
@Composable
fun ScannerScreen(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit = {},
    onSearch: (String) -> Unit = {},
) {
    val cameraPermission = rememberPermissionState(Manifest.permission.CAMERA)

    LaunchedEffect(Unit) {
        if (!cameraPermission.status.isGranted) {
            cameraPermission.launchPermissionRequest()
        }
    }

    if (cameraPermission.status.isGranted) {
        ScannerContent(onBack = onBack, onOpenPost = onOpenPost, onSearch = onSearch)
    } else {
        PermissionDeniedScreen(
            showRationale = cameraPermission.status.shouldShowRationale,
            onRequestPermission = { cameraPermission.launchPermissionRequest() },
            onBack = onBack,
        )
    }
}

@Composable
private fun ScannerContent(
    onBack: () -> Unit,
    onOpenPost: (String) -> Unit,
    onSearch: (String) -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    var scannedResult by remember { mutableStateOf<ScanResult?>(null) }
    var rawValue by remember { mutableStateOf("") }
    var flashEnabled by remember { mutableStateOf(false) }
    var camera by remember { mutableStateOf<androidx.camera.core.Camera?>(null) }
    var scanning by remember { mutableStateOf(true) }

    val cameraExecutor = remember { Executors.newSingleThreadExecutor() }

    DisposableEffect(Unit) {
        onDispose { cameraExecutor.shutdown() }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // Camera Preview
        AndroidView(
            factory = { ctx ->
                val previewView = PreviewView(ctx).apply {
                    scaleType = PreviewView.ScaleType.FILL_CENTER
                }
                val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                cameraProviderFuture.addListener({
                    val cameraProvider = cameraProviderFuture.get()

                    val preview = Preview.Builder().build().also {
                        it.surfaceProvider = previewView.surfaceProvider
                    }

                    val barcodeOptions = BarcodeScannerOptions.Builder()
                        .setBarcodeFormats(
                            Barcode.FORMAT_QR_CODE,
                            Barcode.FORMAT_EAN_13,
                            Barcode.FORMAT_EAN_8,
                            Barcode.FORMAT_UPC_A,
                            Barcode.FORMAT_UPC_E,
                            Barcode.FORMAT_CODE_128,
                            Barcode.FORMAT_CODE_39,
                            Barcode.FORMAT_DATA_MATRIX,
                            Barcode.FORMAT_PDF417,
                        )
                        .build()
                    val barcodeScanner = BarcodeScanning.getClient(barcodeOptions)

                    val imageAnalysis = ImageAnalysis.Builder()
                        .setTargetResolution(Size(1280, 720))
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build()

                    imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy ->
                        @OptIn(ExperimentalGetImage::class)
                        val mediaImage = imageProxy.image
                        if (mediaImage != null && scanning) {
                            val image = InputImage.fromMediaImage(
                                mediaImage,
                                imageProxy.imageInfo.rotationDegrees
                            )
                            barcodeScanner.process(image)
                                .addOnSuccessListener { barcodes ->
                                    val first = barcodes.firstOrNull()
                                    if (first != null && scanning) {
                                        scanning = false
                                        rawValue = first.rawValue.orEmpty()
                                        scannedResult = classifyBarcode(first)
                                    }
                                }
                                .addOnCompleteListener {
                                    imageProxy.close()
                                }
                        } else {
                            imageProxy.close()
                        }
                    }

                    try {
                        cameraProvider.unbindAll()
                        camera = cameraProvider.bindToLifecycle(
                            lifecycleOwner,
                            CameraSelector.DEFAULT_BACK_CAMERA,
                            preview,
                            imageAnalysis,
                        )
                    } catch (_: Exception) { }
                }, ContextCompat.getMainExecutor(ctx))

                previewView
            },
            modifier = Modifier.fillMaxSize(),
        )

        // Viewfinder overlay
        ScannerOverlay()

        // Top bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 48.dp, start = 16.dp, end = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(
                onClick = onBack,
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.5f)),
            ) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White)
            }

            Text(
                "Scan QR / Barcode",
                color = Color.White,
                fontSize = 18.sp,
                fontWeight = FontWeight.SemiBold,
            )

            IconButton(
                onClick = {
                    flashEnabled = !flashEnabled
                    camera?.cameraControl?.enableTorch(flashEnabled)
                },
                modifier = Modifier
                    .size(44.dp)
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.5f)),
            ) {
                Icon(
                    if (flashEnabled) Icons.Default.FlashOn else Icons.Default.FlashOff,
                    "Flash",
                    tint = if (flashEnabled) Color(0xFFFFC107) else Color.White,
                )
            }
        }

        // Hint text
        if (scannedResult == null) {
            Text(
                "Point camera at a QR code or barcode",
                color = Color.White.copy(alpha = 0.8f),
                fontSize = 14.sp,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 160.dp),
            )
        }

        // Result card
        AnimatedVisibility(
            visible = scannedResult != null,
            enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
            exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
            modifier = Modifier.align(Alignment.BottomCenter),
        ) {
            scannedResult?.let { result ->
                ResultCard(
                    result = result,
                    rawValue = rawValue,
                    context = context,
                    onScanAgain = {
                        scannedResult = null
                        rawValue = ""
                        scanning = true
                    },
                    onOpenPost = onOpenPost,
                    onSearch = onSearch,
                )
            }
        }
    }
}

// ── Viewfinder overlay with scan-line animation ─────────
@Composable
private fun ScannerOverlay() {
    val infiniteTransition = rememberInfiniteTransition(label = "scan")
    val scanLineY by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "scanLine",
    )

    Canvas(modifier = Modifier.fillMaxSize()) {
        val viewfinderSize = size.minDimension * 0.65f
        val left = (size.width - viewfinderSize) / 2f
        val top = (size.height - viewfinderSize) / 2.5f
        val rect = Rect(left, top, left + viewfinderSize, top + viewfinderSize)
        val cornerLen = 40f
        val cornerRadius = 16f

        // Semi-transparent overlay
        drawRect(color = Color.Black.copy(alpha = 0.55f))

        // Cut out the viewfinder (transparent hole)
        drawRoundRect(
            color = Color.Transparent,
            topLeft = Offset(rect.left, rect.top),
            size = androidx.compose.ui.geometry.Size(rect.width, rect.height),
            cornerRadius = CornerRadius(cornerRadius),
            blendMode = BlendMode.Clear,
        )

        // Corner brackets (green accent)
        val bracketColor = Color(0xFF00E676)
        val strokeWidth = 4f

        // Top-left
        drawPath(
            path = Path().apply {
                moveTo(rect.left, rect.top + cornerLen)
                lineTo(rect.left, rect.top + cornerRadius)
                quadraticTo(rect.left, rect.top, rect.left + cornerRadius, rect.top)
                lineTo(rect.left + cornerLen, rect.top)
            },
            color = bracketColor,
            style = Stroke(width = strokeWidth),
        )
        // Top-right
        drawPath(
            path = Path().apply {
                moveTo(rect.right - cornerLen, rect.top)
                lineTo(rect.right - cornerRadius, rect.top)
                quadraticTo(rect.right, rect.top, rect.right, rect.top + cornerRadius)
                lineTo(rect.right, rect.top + cornerLen)
            },
            color = bracketColor,
            style = Stroke(width = strokeWidth),
        )
        // Bottom-left
        drawPath(
            path = Path().apply {
                moveTo(rect.left, rect.bottom - cornerLen)
                lineTo(rect.left, rect.bottom - cornerRadius)
                quadraticTo(rect.left, rect.bottom, rect.left + cornerRadius, rect.bottom)
                lineTo(rect.left + cornerLen, rect.bottom)
            },
            color = bracketColor,
            style = Stroke(width = strokeWidth),
        )
        // Bottom-right
        drawPath(
            path = Path().apply {
                moveTo(rect.right - cornerLen, rect.bottom)
                lineTo(rect.right - cornerRadius, rect.bottom)
                quadraticTo(rect.right, rect.bottom, rect.right, rect.bottom - cornerRadius)
                lineTo(rect.right, rect.bottom - cornerLen)
            },
            color = bracketColor,
            style = Stroke(width = strokeWidth),
        )

        // Animated scan line
        val lineY = rect.top + (rect.height * scanLineY)
        drawLine(
            color = Color(0xFF00E676).copy(alpha = 0.7f),
            start = Offset(rect.left + 8f, lineY),
            end = Offset(rect.right - 8f, lineY),
            strokeWidth = 2f,
        )
    }
}

// ── Result card ─────────────────────────────────────────
@Composable
private fun ResultCard(
    result: ScanResult,
    rawValue: String,
    context: Context,
    onScanAgain: () -> Unit,
    onOpenPost: (String) -> Unit,
    onSearch: (String) -> Unit,
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = Color.White),
        elevation = CardDefaults.cardElevation(defaultElevation = 12.dp),
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            // Type badge
            val (typeLabel, typeColor) = when (result) {
                is ScanResult.Url -> "URL" to Color(0xFF2196F3)
                is ScanResult.Product -> "Product" to Color(0xFF4CAF50)
                is ScanResult.Contact -> "Contact" to Color(0xFF9C27B0)
                is ScanResult.Wifi -> "Wi-Fi" to Color(0xFFFF9800)
                is ScanResult.Text -> "Text" to Color(0xFF607D8B)
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(typeColor.copy(alpha = 0.12f))
                        .padding(horizontal = 10.dp, vertical = 4.dp),
                ) {
                    Text(typeLabel, color = typeColor, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.width(8.dp))
                Icon(Icons.Default.QrCode, null, tint = Color(0xFF9E9E9E), modifier = Modifier.size(18.dp))
            }

            Spacer(Modifier.height(12.dp))

            // Content display
            when (result) {
                is ScanResult.Url -> {
                    Text(result.url, fontSize = 15.sp, color = Color(0xFF1565C0), maxLines = 3, overflow = TextOverflow.Ellipsis)
                }
                is ScanResult.Product -> {
                    Text("Barcode: ${result.value}", fontSize = 15.sp, color = Color(0xFF1B5E20), fontWeight = FontWeight.Medium)
                }
                is ScanResult.Contact -> {
                    Text(result.name, fontSize = 15.sp, fontWeight = FontWeight.Medium, color = Color(0xFF212121))
                    result.phone?.let { Text(it, fontSize = 13.sp, color = Color(0xFF757575)) }
                }
                is ScanResult.Wifi -> {
                    Text("Network: ${result.ssid}", fontSize = 15.sp, fontWeight = FontWeight.Medium, color = Color(0xFF212121))
                    result.password?.let { Text("Password: $it", fontSize = 13.sp, color = Color(0xFF757575)) }
                }
                is ScanResult.Text -> {
                    Text(result.value, fontSize = 15.sp, color = Color(0xFF212121), maxLines = 5, overflow = TextOverflow.Ellipsis)
                }
            }

            Spacer(Modifier.height(16.dp))

            // Action buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                // Copy
                IconButton(
                    onClick = {
                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        clipboard.setPrimaryClip(ClipData.newPlainText("Scanned", rawValue))
                        Toast.makeText(context, "Copied!", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFF5F5F5)),
                ) {
                    Icon(Icons.Default.ContentCopy, "Copy", tint = Color(0xFF616161), modifier = Modifier.size(20.dp))
                }

                // Share
                IconButton(
                    onClick = {
                        val sendIntent = Intent(Intent.ACTION_SEND).apply {
                            putExtra(Intent.EXTRA_TEXT, rawValue)
                            type = "text/plain"
                        }
                        context.startActivity(Intent.createChooser(sendIntent, "Share"))
                    },
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Color(0xFFF5F5F5)),
                ) {
                    Icon(Icons.Default.Share, "Share", tint = Color(0xFF616161), modifier = Modifier.size(20.dp))
                }

                Spacer(Modifier.weight(1f))

                // Primary action
                when (result) {
                    is ScanResult.Url -> {
                        Button(
                            onClick = {
                                try {
                                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(result.url)))
                                } catch (_: Exception) {
                                    Toast.makeText(context, "Can't open URL", Toast.LENGTH_SHORT).show()
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2196F3)),
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Icon(Icons.Default.OpenInBrowser, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Open URL")
                        }
                    }
                    is ScanResult.Product -> {
                        Button(
                            onClick = { onSearch(result.value) },
                            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50)),
                            shape = RoundedCornerShape(12.dp),
                        ) {
                            Icon(Icons.Default.Search, null, modifier = Modifier.size(18.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("Search Product")
                        }
                    }
                    else -> {}
                }
            }

            Spacer(Modifier.height(12.dp))

            // Scan Again
            Button(
                onClick = onScanAgain,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF212121)),
                shape = RoundedCornerShape(12.dp),
            ) {
                Icon(Icons.Default.QrCode, null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(8.dp))
                Text("Scan Again")
            }
        }
    }
}

// ── Permission denied screen ────────────────────────────
@Composable
private fun PermissionDeniedScreen(
    showRationale: Boolean,
    onRequestPermission: () -> Unit,
    onBack: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF121212))
            .padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            Icons.Default.QrCode,
            contentDescription = null,
            tint = Color.White,
            modifier = Modifier.size(72.dp),
        )
        Spacer(Modifier.height(24.dp))
        Text(
            "Camera Permission Required",
            color = Color.White,
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(12.dp))
        Text(
            if (showRationale)
                "Zaruda needs camera access to scan QR codes and barcodes. Please grant the permission."
            else
                "Camera permission was denied. Please enable it in your device Settings to use the scanner.",
            color = Color.White.copy(alpha = 0.7f),
            fontSize = 14.sp,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(32.dp))

        if (showRationale) {
            Button(
                onClick = onRequestPermission,
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00E676)),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Grant Permission", color = Color.Black, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(Modifier.height(12.dp))
        Button(
            onClick = onBack,
            colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.15f)),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text("Go Back", color = Color.White)
        }
    }
}
