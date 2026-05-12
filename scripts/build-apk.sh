#!/usr/bin/env bash
set -e

# Source profile to get ANDROID_HOME etc
[ -f "$HOME/.bashrc" ] && source "$HOME/.bashrc" 2>/dev/null || true
[ -f "$HOME/.profile" ] && source "$HOME/.profile" 2>/dev/null || true
[ -f "$HOME/.sdkman/bin/sdkman-init.sh" ] && source "$HOME/.sdkman/bin/sdkman-init.sh" 2>/dev/null || true

export JAVA_HOME=/usr/local/sdkman/candidates/java/21.0.10-ms
export PATH="$JAVA_HOME/bin:$PATH"
echo "Using Java: $(java -version 2>&1 | head -1)"
echo "ANDROID_HOME=$ANDROID_HOME"
echo "ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT"
echo "=== Searching for Android SDK ==="
ls /home/codespace/ 2>/dev/null
ls /home/codespace/java/ 2>/dev/null
ls /home/codespace/android/ 2>/dev/null || echo "No /home/codespace/android"
cat /workspaces/.codespaces/shared/.env-secrets 2>/dev/null | head -20 || echo "No .env-secrets"
find /home/codespace -name "adb" 2>/dev/null | head -5 || true
ANDROID_SDK=""
ADB_PATH=$(which adb 2>/dev/null || find /usr/local /opt /home/codespace -name "adb" 2>/dev/null | head -1)
if [ -n "$ADB_PATH" ]; then
    # adb is in platform-tools, SDK is 2 levels up
    ANDROID_SDK=$(dirname "$(dirname "$ADB_PATH")")
fi
# Fallback: try common Codespace paths
if [ -z "$ANDROID_SDK" ] || [ ! -d "$ANDROID_SDK" ]; then
    for p in "/usr/local/lib/android/sdk" "/home/codespace/android" "$HOME/Android/Sdk"; do
        [ -d "$p" ] && ANDROID_SDK="$p" && break
    done
fi
echo "Android SDK: $ANDROID_SDK"
echo "adb: $ADB_PATH"

# Update local.properties with both API URL and sdk.dir
echo "MHUB_API_BASE_URL=https://ideal-xylophone-77v6x7w9g6whpr6v-5001.app.github.dev/" > /workspaces/Mhub/android-native/local.properties
[ -n "$ANDROID_SDK" ] && echo "sdk.dir=$ANDROID_SDK" >> /workspaces/Mhub/android-native/local.properties
echo "local.properties written:"
cat /workspaces/Mhub/android-native/local.properties
echo "=== Building APK ==="
cd /workspaces/Mhub/android-native
./gradlew :app:assembleDebug --no-configuration-cache -q
echo "=== APK DONE ==="
ls -lh app/build/outputs/apk/debug/app-debug.apk

mkdir -p /tmp/apk-serve
cp app/build/outputs/apk/debug/app-debug.apk /tmp/apk-serve/mhub.apk
echo ""
echo "========================================================"
echo "  APK is ready at /tmp/apk-serve/mhub.apk"
echo ""
echo "  ACTION NEEDED — in PORTS tab, make port 9000 Public"
echo "  APK URL: https://ideal-xylophone-77v6x7w9g6whpr6v-9000.app.github.dev/mhub.apk"
echo "========================================================"
echo ""
cd /tmp/apk-serve
python3 -m http.server 9000
