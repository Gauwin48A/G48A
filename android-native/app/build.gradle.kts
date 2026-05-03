import java.util.Properties
import java.io.FileInputStream

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.google.devtools.ksp")
    id("com.google.dagger.hilt.android")
}

val keystorePropsFile = rootProject.file("keystore.properties")
val keystoreProps = Properties().apply {
    if (keystorePropsFile.exists()) {
        load(FileInputStream(keystorePropsFile))
    }
}

android {
    val stagingApiBaseUrl = System.getenv("MHUB_STAGING_API_BASE_URL") ?: ""
    namespace = "com.mhub.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.mhub.app"
        minSdk = 24
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables { useSupportLibrary = true }

        // Default production API URL — override at runtime via Settings screen.
        buildConfigField(
            "String",
            "DEFAULT_API_BASE_URL",
            "\"http://10.0.2.2:5001/\""
        )
        // Google OAuth 2.0 Web Client ID (type "Web application" in Google Cloud Console).
        // REPLACE with your own; this is the `audience` the server verifies.
        buildConfigField(
            "String",
            "GOOGLE_WEB_CLIENT_ID",
            "\"REPLACE_WITH_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com\""
        )
        buildConfigField(
            "String",
            "STAGING_API_BASE_URL",
            "\"$stagingApiBaseUrl\""
        )
        // Web reference base URL used by parity WebView screens.
        buildConfigField(
            "String",
            "WEB_REFERENCE_BASE_URL",
            "\"http://10.0.2.2:8081/\""
        )
        // Debug parity login defaults (kept empty by default; set in debug build type).
        buildConfigField(
            "String",
            "PARITY_TEST_IDENTIFIER",
            "\"\""
        )
        buildConfigField(
            "String",
            "PARITY_TEST_PASSWORD",
            "\"\""
        )
        buildConfigField(
            "boolean",
            "PARITY_AUTO_LOGIN_ENABLED",
            "false"
        )
        // When enabled, primary Android routes render the same web pages inside WebView.
        buildConfigField(
            "boolean",
            "WEB_REPLICA_MODE",
            "false"
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
            buildConfigField("String", "PARITY_TEST_IDENTIFIER", "\"9876543210\"")
            buildConfigField("String", "PARITY_TEST_PASSWORD", "\"Test@12345\"")
            buildConfigField("boolean", "PARITY_AUTO_LOGIN_ENABLED", "true")
            buildConfigField("boolean", "WEB_REPLICA_MODE", "true")
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
            "-Xjvm-default=all",
            "-opt-in=kotlin.RequiresOptIn"
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
}

dependencies {
    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.3")

    // AndroidX core
    implementation("androidx.core:core-ktx:1.13.1")
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

    // Hilt DI
    implementation("com.google.dagger:hilt-android:2.52")
    ksp("com.google.dagger:hilt-compiler:2.52")

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

    // Image loading
    implementation("io.coil-kt:coil-compose:2.7.0")

    // Accompanist system UI / permissions
    implementation("com.google.accompanist:accompanist-permissions:0.36.0")

    // Google Sign-In via Credential Manager
    implementation("androidx.credentials:credentials:1.3.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.3.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")

    // Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation(platform("androidx.compose:compose-bom:2024.12.01"))
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
}
