#!/usr/bin/env bash
# ==============================================================================
# Zaruda Platform - Android Release AAB & APK Build Helper
# ==============================================================================

set -e

echo "=============================================================================="
echo "Building Zaruda Android Release Bundle (.aab) for Google Play Console..."
echo "=============================================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "[1/3] Checking signing keystore configuration..."
if [ ! -f "keystore.properties" ]; then
    echo "[WARNING] keystore.properties not found!"
    echo "Build will proceed, but signing will use fallback config unless keystore.properties is provided."
fi

echo "[2/3] Cleaning previous build artifacts..."
./gradlew clean

echo "[3/3] Compiling and generating Release App Bundle (bundleRelease)..."
./gradlew bundleRelease

echo "=============================================================================="
echo "[SUCCESS] Release AAB Generated Successfully!"
echo "Location: app/build/outputs/bundle/release/app-release.aab"
echo "Ready for Google Play Console upload!"
echo "=============================================================================="
