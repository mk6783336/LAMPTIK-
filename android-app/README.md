# LAMP TIK for Android

A real native Android application (Java + framework views), not a WebView and
not a shortcut. It talks to the same resolver API the website uses and hands
every transfer to Android's own `DownloadManager`.

| | |
| --- | --- |
| Application ID | `online.lamptik.app` |
| Version | 3.3 (versionCode 33) |
| Min / target SDK | 24 (Android 7.0) / 34 |
| Artifact | `public/downloads/lamptik-v3.3.apk` |
| Endpoint | `/api/apk` (serves the same bytes) |

## Screens

1. **Home** — platform pills (All / TikTok / Instagram / Facebook / YouTube),
   link field with paste and clear actions, `Fetch & download`, the resolved
   result card (thumbnail, title, platform, duration, real sizes) and a single
   labelled sponsor card at the bottom of the page.
2. **Downloads** — everything `DownloadManager` knows about this app: live
   percentage, saved size and date, play/share for completed files, delete
   behind a confirmation, and an explicit "file moved or deleted" state.
3. **Settings** — Wi-Fi-only downloads, auto-fetch for shared links, privacy /
   terms / contact / website links, clear-all-history with confirmation, the
   installed version read from the package, and the licence notice.

There is no WebView in the APK. The only networking is `HttpURLConnection` to
`www.lamptik.online` and the media URLs that API returns; the only storage is
`DownloadManager` plus one `SharedPreferences` file.

## Build

The build is deliberately **Gradle-free**. The app depends on nothing outside
the Android framework, so a full release build is one script:

```bash
JAVA_HOME=/path/to/jdk-21 \
ANDROID_HOME=/path/to/Android/Sdk \
  bash android-app/build-native-apk.sh
```

Requirements: JDK 21, Android SDK platform 34, build-tools **35 or newer**
(`d8` in 34.0.0 crashes on JDK 18+ class files), `zip`-less packaging handled
by `tools/PackAssets.java`.

The script runs `aapt2 compile` → `aapt2 link` → `javac` → `d8` → asset/dex
packing → `zipalign` → `apksigner`, verifies the result, and copies the signed
binary onto the legacy filenames so old links keep working.

`android-app/app/build.gradle` and `android-app/settings.gradle` describe the
same project for anyone who opens it in Android Studio; they are not used by
the release build or by CI.

## Signing

The release key lives at **`.scratch/signing/release.keystore`** (gitignored,
never committed). `apksigner` signs with v1 + v2 + v3.

Certificate fingerprint of the shipping key:

```
SHA-256 7c62387530166f868513604b3c0b5b1cedbf5083d7be5717cd5c6410aba5a381
```

*Every* release must use this key — a different certificate means an installed
app cannot be updated in place (`INSTALL_FAILED_UPDATE_INCOMPATIBLE`).

Back the keystore file up somewhere safe and private (password manager). If it
is lost, the next release needs a new application ID to install alongside the
old one.

Regenerating it from scratch (only if you know the old one is gone):

```bash
keytool -genkeypair -v \
  -keystore .scratch/signing/release.keystore \
  -storetype PKCS12 -alias lamptik -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$KS_PASS" -keypass "$KS_PASS" \
  -dname "CN=LAMP TIK, OU=Mobile, O=LampTik, L=Global, ST=CA, C=US"
```

CI (`.github/workflows/build-apk.yml`) restores the key from two repository
secrets and refuses to build without them:

- `ANDROID_KEYSTORE_BASE64` — `base64 -w0 release.keystore`
- `ANDROID_KEYSTORE_PASSWORD` — the store/key password

The workflow also compares the built certificate against
`EXPECTED_CERT_SHA256`, so a wrong key fails the job instead of shipping.

## Verify a build

```bash
BT="$ANDROID_HOME/build-tools/35.0.0"
"$BT/apksigner" verify --print-certs public/downloads/lamptik-v3.3.apk
"$BT/aapt2" dump badging public/downloads/lamptik-v3.3.apk | head -3
unzip -l public/downloads/lamptik-v3.3.apk | tail -3
```

Expected: `package: name='online.lamptik.app' versionCode='33' versionName='3.3'`,
launchable activity `online.lamptik.app.MainActivity`, the certificate above,
and `classes.dex` + the Inter fonts inside the archive.

## Install

```bash
adb install -r public/downloads/lamptik-v3.3.apk
```

On a phone: open `https://www.lamptik.online/app-download`, download the APK,
allow "Install unknown apps" for the browser, install and launch. Upgrading
over 3.0–3.2 keeps the app's data because the signing key is identical.

## Releasing a new version

1. Bump `versionCode`/`versionName` in
   `app/src/main/AndroidManifest.xml`, `app/src/main/res/values/strings.xml`
   (`version_badge`), `app/build.gradle`, `android-app/build-native-apk.sh`,
   `lib/site.ts` and the CI workflow paths.
2. Build with the script; note the new byte size.
3. Put that size in `androidApp.sizeBytes` / `sizeLabel` in `lib/site.ts`.
4. `npm run verify` in the repository root.
5. Commit the source, the APK and the legacy aliases together.

## Known limitations

- No Play Store listing: distribution is the signed APK from the website.
- The sponsor slot is a labelled card that opens an external page. No
  advertising SDK is bundled, so no app ID, placement or revenue is claimed.
- Android's `DownloadManager` cannot pause/resume on demand through the public
  API; the app cancels or retries instead of faking a pause.
