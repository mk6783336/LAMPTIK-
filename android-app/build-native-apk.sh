#!/usr/bin/env bash
# Build, align and sign the native LAMP TIK APK without Gradle.
#
# The app is deliberately framework-only (no AndroidX, no Material), so the
# whole build is: aapt2 (resources+assets) -> javac -> d8 -> zipalign ->
# apksigner. Requires JDK 21 and Android SDK build-tools 35+ / platform 34.
#
#   ANDROID_HOME=... JAVA_HOME=... ./android-app/build-native-apk.sh
#
# Signing: the release key lives at android-app/release-key.jks — COMMITTED
# to the repository so every local build, CI run and rebuild signs with the
# EXACT SAME certificate. Regenerating a key on any build would strand
# installed users on INSTALL_FAILED_UPDATE_INCOMPATIBLE, which is exactly the
# "App not installed." failure this layout exists to prevent.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$ROOT/android-app/app/src/main"
OUT="$ROOT/public/downloads"
WORK="${WORK:-$ROOT/.scratch/apk-build34}"

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-${LOCALAPPDATA:-$HOME}/Android/Sdk}}"
# Newest installed build-tools by default. d8 34.0.0 crashes with an internal
# NullPointerException on class files from JDK 18+: javac now emits a
# MethodParameters attribute (with null names) on anonymous-class constructors,
# which that R8 version cannot parse. 35.0.0+ handles them fine, so never pin
# the old tools.
if [ -z "${BUILD_TOOLS:-}" ]; then
  BT="$(ls -d "$SDK"/build-tools/*/ 2>/dev/null | sed 's:/*$::' | sort -V | tail -1)"
fi
BT="${BUILD_TOOLS:-${BT:-$SDK/build-tools/34.0.0}}"
PLATFORM="${ANDROID_JAR:-$SDK/platforms/android-34/android.jar}"

# Windows build-tools ship .bat/.exe wrappers; POSIX ones don't.
exe() {
  if [ -f "$1.bat" ]; then echo "$1.bat"; elif [ -f "$1.exe" ]; then echo "$1.exe"; else echo "$1"; fi
}
D8="$(exe "$BT/d8")"
APKSIGNER="$(exe "$BT/apksigner")"
ZIPALIGN="$(exe "$BT/zipalign")"
AAPT2="$(exe "$BT/aapt2")"

VERSION_CODE="${VERSION_CODE:-35}"
VERSION_NAME="${VERSION_NAME:-3.5}"
KEYSTORE="${KEYSTORE:-$ROOT/android-app/release-key.jks}"
mkdir -p "$(dirname "$KEYSTORE")"
KS_PASS="${KS_PASS:-lamptik2026}"
KS_ALIAS="${KS_ALIAS:-lamptik}"

[ -f "$AAPT2" ] || { echo "aapt2 not found in $BT" >&2; exit 1; }
[ -f "$PLATFORM" ] || { echo "android.jar not found at $PLATFORM" >&2; exit 1; }

echo "==> clean $WORK"
rm -rf "$WORK"
mkdir -p "$WORK/compiled" "$WORK/classes" "$WORK/gen" "$WORK/dex" "$OUT"

echo "==> aapt2 compile"
"$AAPT2" compile --dir "$APP/res" -o "$WORK/compiled/res.zip"

echo "==> aapt2 link (resources + assets)"
"$AAPT2" link \
  -o "$WORK/base.apk" \
  -I "$PLATFORM" \
  --manifest "$APP/AndroidManifest.xml" \
  --java "$WORK/gen" \
  --min-sdk-version 24 \
  --target-sdk-version 33 \
  --version-code "$VERSION_CODE" \
  --version-name "$VERSION_NAME" \
  "$WORK/compiled/res.zip"

echo "==> javac"
# Argfiles are whitespace separated, so every path is quoted; on Windows the
# entries are converted to native paths (javac rejects MSYS `/e/...` roots).
topath() {
  if command -v cygpath >/dev/null 2>&1; then cygpath -m "$1"; else printf '%s' "$1"; fi
}
find "$APP/java" "$WORK/gen" -name '*.java' | while IFS= read -r file; do
  printf '"%s"\n' "$(topath "$file")"
done > "$WORK/sources.txt"
javac -encoding UTF-8 -source 1.8 -target 1.8 -nowarn \
  -bootclasspath "$PLATFORM" -classpath "$PLATFORM" \
  -d "$WORK/classes" @"$WORK/sources.txt"

echo "==> d8"
# d8's argfile parser keeps quotes literally, so run from $WORK and pass
# package-relative class paths (they never contain spaces).
(
  cd "$WORK"
  find classes -name '*.class' > classes.txt
  "$D8" --release --min-api 24 --lib "$(topath "$PLATFORM")" --output dex @classes.txt
)

echo "==> package assets + dex"
mkdir -p "$WORK/tools"
javac -encoding UTF-8 -d "$WORK/tools" "$ROOT/android-app/tools/PackAssets.java"
java -cp "$(topath "$WORK/tools")" PackAssets \
  "$(topath "$WORK/base.apk")" \
  "$(topath "$WORK/unsigned-unaligned.apk")" \
  "$(topath "$APP/assets")" \
  "$(topath "$WORK/dex/classes.dex")"

echo "==> zipalign"
"$ZIPALIGN" -f -p 4 "$WORK/unsigned-unaligned.apk" "$WORK/unsigned.apk"

if [ ! -f "$KEYSTORE" ]; then
  echo "==> generate release keystore (FIRST RUN ONLY — back it up; it must never change)"
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" \
    -storetype PKCS12 \
    -alias "$KS_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$KS_PASS" \
    -keypass "$KS_PASS" \
    -dname "CN=LAMP TIK, OU=Mobile, O=LampTik, L=Global, ST=CA, C=US"
fi

APK="$OUT/lamptik-v${VERSION_NAME}.apk"
echo "==> apksigner"
"$APKSIGNER" sign \
  --min-sdk-version 21 \
  --ks "$KEYSTORE" \
  --ks-key-alias "$KS_ALIAS" \
  --ks-pass "pass:$KS_PASS" \
  --key-pass "pass:$KS_PASS" \
  --v1-signing-enabled true \
  --v2-signing-enabled true \
  --v3-signing-enabled true \
  --out "$APK" \
  "$WORK/unsigned.apk"

rm -f "$OUT"/*.idsig
"$APKSIGNER" verify --min-sdk-version 21 --verbose "$APK"

# Android 11–15 hard requirement, verified on the SIGNED artifact:
# resources.arsc must be uncompressed (STORED) and 4-byte aligned, and
# zipalign -p must have run BEFORE apksigner. -c checks in place without
# touching the file; a failure here is a release blocker, never a warning.
echo "==> zipalign verify (resources.arsc uncompressed + aligned)"
"$ZIPALIGN" -c -p 4 "$APK"

# Keep every earlier filename pointing at the SAME signed binary so links that
# were cached by users and search engines never 404.
for legacy in "$OUT/lamptik-v3.0.apk" "$OUT/lamptik-v3.1.apk" "$OUT/lamptik-v3.2.apk" "$OUT/lamptik-v3.3.apk" "$OUT/lamptik-v3.4.apk"; do
  if [ "$APK" != "$legacy" ]; then
    cp -f "$APK" "$legacy"
    echo "==> legacy alias $(basename "$legacy")"
  fi
done
ls -l "$APK"
