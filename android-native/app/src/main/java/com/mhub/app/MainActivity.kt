package com.mhub.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.mhub.app.ui.MhubApp
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    private var debugRoute by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        val splash = installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        applyDebugIntent(intent)

        // Keep splash on-screen only for the first composition to avoid white flash.
        var keepSplash = true
        splash.setKeepOnScreenCondition { keepSplash }

        setContent {
            MhubApp(
                onReady = { keepSplash = false },
                debugRouteOverride = debugRoute,
            )
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        applyDebugIntent(intent)
    }

    private fun applyDebugIntent(intent: Intent?) {
        debugRoute = intent?.getStringExtra("debug_route")
    }
}
