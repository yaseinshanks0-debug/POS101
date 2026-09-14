# Add project specific ProGuard rules here.
# Keep ML Kit & Firebase model names
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.internal.** { *; }