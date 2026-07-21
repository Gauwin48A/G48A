# Keep Hilt generated classes
-keep class dagger.hilt.internal.** { *; }
-keep class * extends dagger.hilt.android.internal.managers.ViewComponentManager { *; }

# Retrofit / OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn retrofit2.**
-keepattributes Signature, InnerClasses, EnclosingMethod, RuntimeVisibleAnnotations, AnnotationDefault
-keep,allowobfuscation,allowshrinking interface retrofit2.Call
-keep,allowobfuscation,allowshrinking class retrofit2.Response

# kotlinx.serialization
-keepattributes *Annotation*,InnerClasses
-dontnote kotlinx.serialization.**
-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class com.zaruda.app.**$$serializer { *; }
-keepclassmembers class com.zaruda.app.** {
    *** Companion;
}
-keepclasseswithmembers class com.zaruda.app.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Compose
-dontwarn androidx.compose.**

# Tink (used by security-crypto) pulls in errorprone annotations not on the classpath
-dontwarn com.google.errorprone.annotations.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn org.openjsse.**
-dontwarn org.bouncycastle.**

# Keep model data classes
-keep class com.zaruda.app.domain.model.** { *; }
-keep class com.zaruda.app.data.remote.dto.** { *; }

# Keep application class
-keep class com.zaruda.app.MhubApplication { *; }
