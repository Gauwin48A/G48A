import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("org.jetbrains.kotlin.kapt")
    id("com.google.devtools.ksp")
    id("com.google.dagger.hilt.android")
    id("com.google.gms.google-services")
    id("com.google.firebase.crashlytics")
    id("androidx.baselineprofile")
}

val keystorePropsFile = rootProject.file("keystore.properties")
val keystoreProps = Properties().apply {
    if (keystorePropsFile.exists()) {
        load(FileInputStream(keystorePropsFile))
    }
}

// Load secrets from local.properties (never committed to VCS)
val localPropsFile = rootProject.file("local.properties")
val localProps = Properties().apply {
    if (localPropsFile.exists()) load(FileInputStream(localPropsFile))
}
fun localProp(key: String, fallback: String = "") =
    (System.getenv(key.replace(".", "_")) ?: localProps.getProperty(key) ?: fallback)

android {
    // Priority: env override → local.properties → emulator fallback (http://10.0.2.2:5001/)
    // An empty URL crashes the app at startup (OkHttp "no scheme found"), so never default to "".
    val stagingApiBaseUrl = System.getenv("ZARUDA_STAGING_API_BASE_URL")
        ?: System.getenv("MHUB_STAGING_API_BASE_URL")
        ?: localProp("ZARUDA_API_BASE_URL", localProp("MHUB_API_BASE_URL", "https://api.zarudatech.com/"))
    namespace = "com.zaruda.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.zaruda.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 3
        versionName = "1.2.0"


        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables { useSupportLibrary = true }

        // Default API URL — override at runtime via Settings screen.
        buildConfigField(
            "String",
            "DEFAULT_API_BASE_URL",
            "\"$stagingApiBaseUrl\""
        )
        buildConfigField(
            "String",
            "STAGING_API_BASE_URL",
            "\"$stagingApiBaseUrl\""
        )
        // Native-only mode — WEB_REPLICA_MODE permanently disabled.
        buildConfigField(
            "boolean",
            "WEB_REPLICA_MODE",
            "false"
        )
        // Google OAuth Web Client ID — leave empty/placeholder to disable Google Sign-In
        buildConfigField(
            "String",
            "GOOGLE_WEB_CLIENT_ID",
            "\"${localProp("GOOGLE_WEB_CLIENT_ID", "")}\""
        )
    }

    signingConfigs {
        create("release") {
            if (keystorePropsFile.exists()) {
                storeFile = rootProject.file(keystoreProps.getProperty("storeFile"))
                storePassword = keystoreProps.getProperty("storePassword")
                keyAlias = keystoreProps.getProperty("keyAlias")
                keyPassword = keystoreProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
            buildConfigField("boolean", "WEB_REPLICA_MODE", "false")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            if (keystorePropsFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        isCoreLibraryDesugaringEnabled = true
    }

    kotlinOptions {
        jvmTarget = "17"
        freeCompilerArgs += listOf(
            "-Xjvm-default=all-compatibility",
            "-opt-in=kotlin.RequiresOptIn",
            "-opt-in=androidx.compose.runtime.ExperimentalComposeApi",
        )
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += setOf(
                "/META-INF/{AL2.0,LGPL2.1}",
                "/META-INF/DEPENDENCIES",
                "/META-INF/LICENSE*",
                "/META-INF/NOTICE*",
                "META-INF/*.version",
                "META-INF/gradle/incremental.annotation.processors"
            )
        }
    }

    lint {
        abortOnError = false
        checkDependencies = true
        warningsAsErrors = false
    }

    // ── Firebase Crashlytics: automatic ProGuard mapping upload for release builds ──
    // The com.google.firebase.crashlytics Gradle plugin automatically uploads
    // mapping.txt when isMinifyEnabled = true in release builds. This block
    // explicitly configures the upload behavior and ensures task dependencies.
    firebaseCrashlytics {
        // Automatically de-obfuscates crash reports in Firebase Console
        mappingFileUploadEnabled = true
    }

}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile>().configureEach {
    exclude(
        "**/ui/channels/CentreScreens.kt",
    )
}

// ── Verify ProGuard mapping file after release build ───────────────────────────
tasks.register("verifyMappingFile") {
    description = "Verify R8 produced a ProGuard mapping file for Crashlytics upload"
    group = "verification"
    dependsOn("assembleRelease")
    doLast {
        val mappingFile = layout.buildDirectory.file("outputs/mapping/release/mapping.txt").get().asFile
        if (mappingFile.exists()) {
            val sizeKB = mappingFile.length() / 1024
            println("✅ ProGuard mapping file found: ${mappingFile.absolutePath} (${sizeKB} KB)")
            println("   → Will be automatically uploaded to Firebase Crashlytics by the Gradle plugin")
        } else {
            throw GradleException("❌ mapping.txt not found at ${mappingFile.absolutePath} — R8 did not produce mapping output")
        }
    }
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.3")

    // AndroidX core
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.activity:activity-compose:1.9.3")

    // Compose BOM
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.foundation:foundation")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")

    // Navigation
    implementation("androidx.navigation:navigation-compose:2.8.4")
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")

    // Hilt DI (uses kapt to avoid KSP file-generation conflict with internal shaded Room processor)
    implementation("com.google.dagger:hilt-android:2.52")
    kapt("com.google.dagger:hilt-compiler:2.52")

    // Networking: Retrofit + OkHttp + kotlinx-serialization
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.jakewharton.retrofit:retrofit2-kotlinx-serialization-converter:1.0.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")

    // DataStore (preferences)
    implementation("androidx.datastore:datastore-preferences:1.1.1")

    // Security-crypto for EncryptedSharedPreferences (token storage)
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    // Location (GPS / FusedLocationProvider) — web parity
    implementation("com.google.android.gms:play-services-location:21.3.0")

    // Google Sign-In — Credential Manager 1-Tap (modern replacement for legacy GoogleSignIn)
    implementation("com.google.android.gms:play-services-auth:21.3.0")
    implementation("androidx.credentials:credentials:1.3.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")

    // Paging 3 — web parity pagination for post feed
    implementation("androidx.paging:paging-runtime-ktx:3.3.4")
    implementation("androidx.paging:paging-compose:3.3.4")

    // Image loading
    implementation("io.coil-kt:coil-compose:2.7.0")
    implementation("com.razorpay:checkout:1.6.33")

    // Accompanist system UI / permissions
    implementation("com.google.accompanist:accompanist-permissions:0.36.0")

    // Firebase BOM — manages all Firebase library versions
    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-crashlytics-ktx")
    implementation("com.google.firebase:firebase-analytics-ktx")
    implementation("com.google.firebase:firebase-messaging-ktx")

    // Room — offline cache (uses kapt to avoid KSP conflict with Hilt)
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    kapt("androidx.room:room-compiler:2.6.1")

    // CameraX + ML Kit Barcode Scanning
    implementation("androidx.camera:camera-core:1.4.1")
    implementation("androidx.camera:camera-camera2:1.4.1")
    implementation("androidx.camera:camera-lifecycle:1.4.1")
    implementation("androidx.camera:camera-view:1.4.1")
    implementation("com.google.mlkit:barcode-scanning:17.3.0")

    // Biometric authentication
    implementation("androidx.biometric:biometric:1.1.0")

    // WorkManager for offline queue / background sync
    implementation("androidx.work:work-runtime-ktx:2.10.0")

    // Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")
    testImplementation("io.mockk:mockk:1.13.12")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation(platform("androidx.compose:compose-bom:2024.12.01"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")

    // Baseline Profile — wired to :baselineprofile module
    baselineProfile(project(":baselineprofile"))
}
