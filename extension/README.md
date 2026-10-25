# LampTik Chrome Extension

A Manifest V3 extension that puts a **⚡ Download** button on YouTube watch and
Shorts pages, a floating **⚡ Download** pill on TikTok / Instagram Reels /
Facebook videos, and a full downloader in the toolbar popup. Every download is
resolved and streamed by `lamptik.online`, so the extension itself holds no
extractor code and never touches the page's own scripts.

## What it does

| Surface | Behaviour |
| --- | --- |
| YouTube `watch` / `shorts` | Button injected into the action bar next to Share/Subscribe. Opens an in-page glass popover with the title, thumbnail, **Download HD MP4**, **Download MP3** and a link to the site. |
| TikTok, Instagram Reels, Facebook | Floating pill in the bottom-right corner that opens the same popover. |
| Toolbar popup | Detects the active tab's video, resolves it, and offers the same one-click MP4 / MP3 downloads. |

The popover shows the page's own title and thumbnail immediately, then resolves
the stream in the background, so the download buttons are ready by the time you
click them. Resolution failures show the server's own message with a **Retry**.

## Permissions, and why

| Permission | Used for |
| --- | --- |
| `activeTab` | Read the current tab's URL after you click the extension icon. |
| `storage` | Reserved for per-browser preferences; nothing is written today. |
| `host_permissions` (`youtube.com`, `tiktok.com`, `instagram.com`, `facebook.com`) | Inject the button/pill on those sites only. |
| `host_permissions` (`www.lamptik.online`) | Call the resolver and the attachment download endpoint from the background worker. |

No `tabs` history, no cookies, no analytics, no remote code. The background
worker keeps only an in-memory resolve cache (5 minutes) and Chrome clears it
whenever the worker idles.

## Install (unpacked)

1. Download `lamptik-chrome-extension.zip` from
   <https://www.lamptik.online/downloads/lamptik-chrome-extension.zip> and unzip it
   into a folder you will keep.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the unzipped folder.
5. Open any YouTube video — the **⚡ Download** button appears beside Share.

Edge and other Chromium browsers accept the same folder through
`edge://extensions` → *Load unpacked*.

## Files

```
extension/
  manifest.json    MV3 definition (permissions, content scripts, popup)
  background.js    resolution worker: POST /api/youtube or /api/fetch, 5-min cache
  content.js       button/pill injection, popover, download hand-off
  content.css      scoped styles (every selector namespaced `lamptik-`)
  popup.html/.js   toolbar popup UI
  icons/           16 / 32 / 48 / 128 px toolbar icons
```

## Packaging

The website ships a ZIP built from this folder:

```bash
npm run extension:package    # → public/downloads/lamptik-chrome-extension.zip
```

Re-run it after any change to `extension/` so the hosted ZIP matches the source.

## How a download works

1. The content script (or popup) sends the page URL to `background.js`.
2. The worker posts `{ "url": … }` to `https://www.lamptik.online/api/youtube`
   (YouTube) or `/api/fetch` (TikTok / Instagram / Facebook).
3. The response's `media.videoHd` / `media.audioMp3` attachment URLs are
   absolutised and bound to the popover buttons.
4. Clicking a button starts a same-tab attachment navigation: lamptik answers
   with `Content-Disposition: attachment`, so Chrome's download manager takes
   the file and the YouTube tab stays exactly where it was.

A raw CDN URL (no `/api/download` in it) is opened in its own tab instead, so a
failed response can never navigate the user away from the page they are on.
