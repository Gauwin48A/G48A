package com.mhub.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.mutableStateOf
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.mhub.app.core.ConnectivityObserver
import com.mhub.app.ui.MhubApp
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var connectivityObserver: ConnectivityObserver

    private val deepLinkUri = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        val splash = installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Handle initial deep link
        handleDeepLink(intent)

        var keepSplash = true
        splash.setKeepOnScreenCondition { keepSplash }

        setContent {
            MhubApp(
                onReady = { keepSplash = false },
                connectivityObserver = connectivityObserver,
                deepLinkUri = deepLinkUri.value,
                onDeepLinkConsumed = { deepLinkUri.value = null },
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
}
