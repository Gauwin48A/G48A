@echo off
REM ==============================================================================
REM Zaruda Platform - Android Release AAB & APK Build Helper
REM ==============================================================================

echo ==============================================================================
echo Building Zaruda Android Release Bundle (.aab) for Google Play Console...
echo ==============================================================================

cd /d "%~dp0"

echo [1/3] Checking signing keystore configuration...
if not exist "keystore.properties" (
    echo [WARNING] keystore.properties not found!
    echo Build will proceed, but signing will use debug config unless keystore.properties is provided.
)

echo [2/3] Cleaning previous build artifacts...
call gradlew.bat clean

echo [3/3] Compiling and generating Release App Bundle (bundleRelease)...
call gradlew.bat bundleRelease

if %ERRORLEVEL% equ 0 (
    echo ==============================================================================
    echo [SUCCESS] Release AAB Generated Successfully!
    echo Location: app\build\outputs\bundle\release\app-release.aab
    echo Ready for Google Play Console upload!
    echo ==============================================================================
) else (
    echo ==============================================================================
    echo [ERROR] Build failed. Please check the error logs above.
    echo ==============================================================================
)

pause
