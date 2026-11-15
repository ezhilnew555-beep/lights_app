@echo off
echo ===================================================
echo Building Standalone APK with Expo EAS Build (Cloud)
echo ===================================================
echo This will upload the JS bundle and configurations to Expo
echo and compile the APK in the cloud. No local Android SDK/Gradle required!
echo.
echo Launching EAS Build...
npx eas-cli build --platform android --profile preview
echo.
echo Build process initiated.
pause
