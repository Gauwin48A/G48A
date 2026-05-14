# Add project specific ProGuard rules here.
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# --- Capacitor WebView JS Bridge ---
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.plugin.** { *; }

# --- Capacitor Plugins ---
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class com.getcapacitor.Bridge { *; }
-keep class com.getcapacitor.JSObject { *; }
-keep class com.getcapacitor.PluginCall { *; }

# --- Firebase / FCM ---
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# --- AndroidX ---
-keep class androidx.** { *; }
-dontwarn androidx.**

# --- Keep line numbers for debugging stack traces ---
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
