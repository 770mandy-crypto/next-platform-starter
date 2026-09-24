#!/usr/bin/env bash
# Builds an installable Android file (APK) on any Linux/Mac machine with
# Docker — no Android Studio needed. Output: build/GiveBack.apk
# (The usual way is automatic: .github/workflows/android.yml builds it on
# GitHub and publishes it on the Releases page. This script is for building
# it on your own computer.)
#
#   EXPO_PUBLIC_SUPABASE_URL=... EXPO_PUBLIC_SUPABASE_ANON_KEY=... ./scripts/build-android.sh
#
# Optional: GOOGLE_MAPS_ANDROID_KEY (in-app maps), EXPO_PUBLIC_AI_ENABLED=true,
# MAVEN_MIRROR=1 (use Google's Maven Central mirror when Maven Central
# rate-limits your network).
#
# The APK is signed with React Native's standard development key: fine for
# installing on your own phones and for testers. Google Play gets its own key
# (Play App Signing) when the app is published there.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${EXPO_PUBLIC_SUPABASE_URL:?Set EXPO_PUBLIC_SUPABASE_URL (Supabase → Project Settings → API)}"
: "${EXPO_PUBLIC_SUPABASE_ANON_KEY:?Set EXPO_PUBLIC_SUPABASE_ANON_KEY (Supabase → Project Settings → API)}"
IMAGE=reactnativecommunity/react-native-android:latest

npx expo prebuild --platform android --clean --no-install

args=(--rm -v "$PWD":"$PWD" -w "$PWD/android"
  -e EXPO_PUBLIC_SUPABASE_URL -e EXPO_PUBLIC_SUPABASE_ANON_KEY -e EXPO_PUBLIC_AI_ENABLED
  -e GOOGLE_MAPS_ANDROID_KEY -e NODE_ENV=production -e CI=1)
gradle_args=(assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a,armeabi-v7a)
if [[ "${MAVEN_MIRROR:-}" == "1" ]]; then
  args+=(-v "$PWD/scripts/maven-mirror.init.gradle:/tmp/mirror.init.gradle:ro")
  gradle_args+=(--init-script /tmp/mirror.init.gradle)
fi
# Behind a proxy (corporate networks, cloud sandboxes): pass it through.
if [[ -n "${HTTPS_PROXY:-}" ]]; then
  args+=(--network host -e HTTPS_PROXY -e HTTP_PROXY -e NO_PROXY -e JAVA_TOOL_OPTIONS)
  [[ -f /etc/ssl/certs/java/cacerts ]] && args+=(-v /etc/ssl/certs/java/cacerts:/etc/ssl/certs/java/cacerts:ro)
fi

docker run "${args[@]}" "$IMAGE" ./gradlew "${gradle_args[@]}"

mkdir -p build
cp android/app/build/outputs/apk/release/app-release.apk build/GiveBack.apk
echo "✔ build/GiveBack.apk"
