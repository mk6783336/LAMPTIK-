# Tier-1 keyword map (US, UK, CA, AU, DE, NL)

Method: Google Autocomplete (`suggestqueries.google.com`, `client=firefox`) pulled
per country code — `gl=us|gb|ca|au|de|nl` — for 11 seed terms across the four
supported platforms. Autocomplete is country-scoped, real-time demand: a phrase
that only appears under `gl=us` is being typed by US users. No volume estimates
are invented here; this is presence/absence per market, which is what decides
whether a page can rank for a Tier-1 query at all.

These are **page-level targets for pages that already exist**. Nothing here
requires a new route.

## The six modifiers that appear in every Tier-1 market

| Modifier | Where it shows up | Page that must own it |
|---|---|---|
| `without watermark` / `no watermark` | all 6, every platform seed | every tool page (already the core promise) |
| `free` | all 6 | titles + descriptions |
| `hd` / `high quality` | all 6 | `/youtube-shorts-downloader`, `/facebook-video-downloader` |
| `extension` (desktop intent) | US, GB, CA, AU, NL | not served — deliberate: no browser extension is shipped |
| `app` (mobile intent) | all 6 | answered in copy: "no app required" |
| `iphone` / `android` | US, GB, CA, AU | `/tiktok-video-download-iphone`, `/youtube-video-download-iphone` exist |

## Platform-by-platform, with the exact Tier-1 phrases

### TikTok MP3 — `/tiktok-mp3-downloader`
Present in **all six** markets as the top or second suggestion:
`tiktok mp3 download without watermark`, `tiktok mp3 downloader without watermark`,
`tiktok mp3 download app`, `tiktok mp3 converter online`.
The page previously led with "Original Sound, No Re-encode" — accurate, but it
did not contain the phrase Tier-1 users type. Retitled to lead with
`TikTok MP3 Download Without Watermark`.

### Instagram Reels audio — `/instagram-reels-audio`
Present in all six: `instagram reels audio finder`, `instagram reels audio
extraction (online)`, `instagram reels audio download copy paste`.
High-intent (`finder`, `copy paste`) and the incumbents answer it badly.
The page's honest stance — Instagram publishes no audio-only stream — must stay;
the title now carries `Finder … Extract` without promising a fake MP3.

### YouTube Shorts — `/youtube-shorts-downloader`
All six: `youtube shorts download app`, `fast`, `audio format`, `music`,
`high quality free`. AU and GB additionally use `mp3 convert audio`, which is
what `/youtube-shorts-to-mp3` serves — link the two pages to each other.
Title now carries `1080p Free`.

### Facebook video — `/facebook-video-downloader`
The standout Tier-1 gap in the whole set: `facebook private video downloader`
appears in **us, gb, ca, au, de, nl** — every market, every pull — and the page
contained neither "private" nor "no watermark" in its metadata. Both are now in
the title, description and keyword list. Keep the copy honest: a private video
is only downloadable when the visitor can already open it.

## Not covered, and why it is a decision rather than an oversight

`twitter video downloader`, `x video downloader` and `snapchat video downloader`
have strong, consistent demand in all six markets and the site has no resolver
for either platform. Adding them means a new extraction path per platform, not a
new page: a page that 404s on resolve is worse than no page. Treat it as a
separate build decision, not an SEO task.

## What not to do

- **Do not geo-fake traffic or cloaking.** Serving different content to Tier-1
  bots, or buying "US traffic" panels, is what gets an Adsterra/Monetag/Hilltop
  account terminated; RPM is set by the real visitor's country and cannot be
  spoofed from the publishing side.
- **Do not mass-produce pages while 75 of 76 sitemap URLs are unknown to
  Google.** Indexation is the gate: a new page competes for the same crawl
  budget as the pages that already exist.
- **Do not translate into more locales for Tier-1 RPM.** The translations that
  exist (es, de, fr, pt, tr, …) target markets with lower RPM than the English
  pages. English pages win Tier-1; that is where the effort belongs.

## Sequence that actually moves revenue

1. Get the 76 existing URLs indexed (sitemap submitted, IndexNow pushed).
2. Let the retitled pages accumulate impressions; only then rewrite further.
3. Once there is Tier-1 session data, move the ad stack up-market: Adsterra and
   Hilltop are low-CPM fill; a Tier-1 audience is what makes an AdSense/Ezoic-
   class network viable, and those require real traffic before they approve.
