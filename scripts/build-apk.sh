#!/usr/bin/env bash
set -e

# Use Java 21 explicitly (avoid 'current' which may point to Java 11)
for _jdir in /home/codespace/java/21.0.10-ms /usr/local/sdkman/candidates/java/21.0.10-ms /home/codespace/java/25.0.2-ms; do
    if [ -f "$_jdir/bin/java" ]; then
        export JAVA_HOME="$_jdir"
        break
    fi
done
export PATH="$JAVA_HOME/bin:$PATH"
echo "Using Java: $(java -version 2>&1 | head -1)"

ANDROID_SDK_DIR="$HOME/android-sdk"

# Download Android SDK command-line tools if not present
if [ ! -f "$ANDROID_SDK_DIR/cmdline-tools/latest/bin/sdkmanager" ]; then
    echo "=== Downloading Android SDK command-line tools ==="
    mkdir -p "$ANDROID_SDK_DIR/cmdline-tools"
    cd /tmp
    wget -q "https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip" -O cmdline-tools.zip
    unzip -q cmdline-tools.zip -d cmdline-tools-extract
    mv cmdline-tools-extract/cmdline-tools "$ANDROID_SDK_DIR/cmdline-tools/latest"
    rm -rf cmdline-tools.zip cmdline-tools-extract
    echo "Done downloading cmdline-tools"
fi

export ANDROID_HOME="$ANDROID_SDK_DIR"
export ANDROID_SDK_ROOT="$ANDROID_SDK_DIR"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH"

# Accept licenses & install required components (skipped if already installed)
echo "=== Ensuring Android SDK components are installed ==="
yes | sdkmanager --licenses > /dev/null 2>&1 || true
sdkmanager --install "platform-tools" "platforms;android-35" "build-tools;35.0.0" 2>&1 | tail -3

echo "ANDROID_HOME=$ANDROID_HOME"

# Write local.properties
echo "MHUB_API_BASE_URL=https://ideal-xylophone-77v6x7w9g6whpr6v-5001.app.github.dev/" > /workspaces/Mhub/android-native/local.properties
echo "sdk.dir=$ANDROID_HOME" >> /workspaces/Mhub/android-native/local.properties
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
