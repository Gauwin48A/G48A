package com.mhub.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.mhub.app.ui.MhubApp
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        val splash = installSplashScreen()
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Keep splash on-screen only for the first composition to avoid white flash.
        var keepSplash = true
        splash.setKeepOnScreenCondition { keepSplash }

        setContent {
            MhubApp(onReady = { keepSplash = false })
        }
    }
}
