# Keep Hilt generated classes
-keep class dagger.hilt.internal.** { *; }
-keep class * extends dagger.hilt.android.internal.managers.ViewComponentManager { *; }

# ── R8 fixes for the Hilt ImmutableMap duplicate-key crash ───────────────────
# Crash: "Multiple entries with same key: K6.I=true" at startup from
# com.google.common.collect.ImmutableMap$Builder while Hilt builds its
# ViewModel registry (DaggerZarudaApplication_HiltComponents_SingletonC builds
# ImmutableMap<String,Boolean>/<String,Provider> with 76 @HiltViewModel keys).
# R8's code-simplification + field optimizations collapse the LazyClassKey
# registry keys -> duplicate entries. IMPORTANT: specifying `-optimizations`
# REPLACES AGP's default set (proguard-android-optimize.txt), which already
# disables code/simplification/arithmetic and field/*. So we re-specify the
# full conservative default here (field merging + class merging + arithmetic
# code simplification all disabled), keeping every other R8 optimization.
-optimizations !code/simplification/arithmetic,!field/*,!class/merging/*

# Keep every @HiltViewModel class name stable (un-obfuscated) so Hilt's
# generated ImmutableMap registries can never collapse two distinct keys onto
# the same obfuscated name/class. Also keep the generated Dagger components
# that build these maps. (There are duplicate simple names today, e.g.
# MyPostsViewModel in ui.commerce + ui.post, RecentlyViewedViewModel in
# ui.categoryapp + ui.commerce.)
-keep class com.zaruda.app.**ViewModel { *; }
-keep class com.zaruda.app.DaggerZarudaApplication_HiltComponents** { *; }

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

# Razorpay SDK Proguard Rules
-keep class com.razorpay.** { *; }
-dontwarn com.razorpay.**
-dontwarn proguard.annotation.Keep
-dontwarn proguard.annotation.KeepClassMembers
-dontwarn proguard.annotation.**

# ── ML Kit / Play Services ML ────────────────────────────────────────────
# CRITICAL: R8's class-merging optimization merges ML Kit internal classes that
# are used as Class keys in Guava ImmutableMap registries. This produces
# "Multiple entries with same key" (ImmutableMap$Builder$DuplicateKey) at
# startup (crash traced to com.google.android.gms.internal.mlkit_common.zzah).
# Keeping these classes prevents R8 from merging them into one identity.
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.mlkit_common.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_barcode.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_common.** { *; }
-keep class com.google.android.gms.internal.mlkit_vision_text.** { *; }
-keep class com.google.android.gms.internal.mlkit_translate.** { *; }

# Guava ImmutableMap - avoid any R8 interference with its builders
-keep class com.google.common.collect.ImmutableMap { *; }
-keep class com.google.common.collect.ImmutableMap$* { *; }
-dontwarn com.google.common.collect.ImmutableMap

