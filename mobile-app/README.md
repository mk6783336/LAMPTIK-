# LampTik — Android app (Expo / React Native)

The app is a thin, native shell over the same resolvers the website runs
(`https://www.lamptik.online/api/youtube` and `/api/fetch`). Nothing is
duplicated: a fix shipped to the site reaches every installed copy instantly.

## What it does

- **Clipboard auto-detection** — copy a YouTube, TikTok, Instagram or Facebook
  link anywhere and LampTik picks it up the moment you open the app
  (`src/hooks/useClipboardWatcher.ts`).
- **Share sheet** — from YouTube/TikTok/Instagram/Facebook tap *Share* →
  **LampTik** and the video resolves before the app has finished animating in
  (`src/hooks/useShareIntent.ts`, `android.intentFilters` in `app.json`).
- **Quality picker** — 1080p MP4, 720p MP4 or MP3 audio, with a real byte-size
  label when the resolver knows it.
- **Native download** — bytes stream straight to disk with
  `expo-file-system`'s resumable downloader (never buffered in JS memory), then
  land in the phone gallery through `expo-media-library`.
- **History** — last 50 downloads with the local file kept on the device.

## Run it

```bash
cd mobile-app
npm install
npx expo start          # press "a" for Android, or scan the QR with Expo Go
```

`npx expo start --clear` if you changed `app.json` plugins.

## Build the installable APK (no Play Store needed)

```bash
cd mobile-app
npm install -g eas-cli        # once
eas login                     # free Expo account
eas build -p android --profile preview
```

`eas.json` gives the `preview` profile `"buildType": "apk"` and internal
distribution, so the command prints a direct `.apk` download link. Publish that
link in `NEXT_PUBLIC_APK_DOWNLOAD_URL` (Vercel env) and the website's `/apps`
page starts serving it.

## Share → LampTik on Android

`app.json` declares an `android.intent.action.SEND` filter for `text/plain`.
Android merges it into the system share sheet, so LampTik appears next to
WhatsApp/Telegram when a video is shared from another app. The incoming text is
parsed in `src/hooks/useShareIntent.ts` (it tolerates the promo copy those apps
append, and picks the first `https://` URL).

## Backend

| Action | Endpoint |
| --- | --- |
| YouTube resolve | `POST https://www.lamptik.online/api/youtube` `{ "url": "…" }` |
| TikTok / Instagram / Facebook resolve | `POST https://www.lamptik.online/api/fetch` `{ "url": "…" }` |
| Media bytes | the returned `media.videoHd` / `media.audioMp3` (`/api/download?…`) |

Responses are `{ ok: true, media }` or `{ ok: false, error }`. Provider outages
come back as **HTTP 200 with `ok: false`**, so the client checks the payload
flag, not `response.ok`.

Override the origin for staging with `EXPO_PUBLIC_API_ORIGIN`.

## Notes

- The folder is excluded from the website's `tsconfig.json` and `.eslintignore`,
  so `npm run verify` in the repo root never typechecks React Native code.
- 1080p can be missing on a video whose only streams are 360p; the picker
  disables that option instead of failing the download.
