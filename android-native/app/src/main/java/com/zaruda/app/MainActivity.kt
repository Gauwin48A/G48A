package com.zaruda.app

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.mutableStateOf
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.zaruda.app.core.ConnectivityObserver
import com.zaruda.app.core.LocaleManager
import com.zaruda.app.ui.ZarudaApp
import dagger.hilt.android.AndroidEntryPoint
import org.json.JSONObject
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {

    @Inject lateinit var connectivityObserver: ConnectivityObserver
    @Inject lateinit var localeManager: LocaleManager

    private val deepLinkUri = mutableStateOf<String?>(null)

    /**
     * Callback set by TierSelectionScreen to handle Razorpay payment results.
     * Razorpay SDK finds these methods via reflection on the Activity.
     */
    var onRazorpayCallback: ((razorpayPaymentId: String, response: JSONObject) -> Unit)? = null

    override fun attachBaseContext(newBase: Context) {
        val localeCtx = if (::localeManager.isInitialized) {
            localeManager.applyToContext(newBase)
        } else {
            newBase
        }
        super.attachBaseContext(localeCtx)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        val splash = installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        handleDeepLink(intent)

        var keepSplash = true
        splash.setKeepOnScreenCondition { keepSplash }

        setContent {
            ZarudaApp(
                onReady = { keepSplash = false },
                connectivityObserver = connectivityObserver,
                deepLinkUri = deepLinkUri.value,
                onDeepLinkConsumed = { deepLinkUri.value = null },
                localeManager = localeManager,
            )
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleDeepLink(intent)
    }

    private fun handleDeepLink(intent: Intent?) {
        val uri = intent?.data?.toString()
        if (uri != null) deepLinkUri.value = uri
    }

    // ── Razorpay callbacks: SDK finds these via reflection ────────────────
    fun onPaymentSuccess(razorpayPaymentId: String, response: JSONObject) {
        onRazorpayCallback?.invoke(razorpayPaymentId, response)
        onRazorpayCallback = null
    }

    fun onPaymentError(code: Int, response: String) {
        android.util.Log.w("Razorpay", "Payment error: code=$code msg=$response")
        onRazorpayCallback = null
    }
}
