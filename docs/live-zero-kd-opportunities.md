# Live zero-KD opportunities

Measured 2026-11-09 09:02 UTC by `npm run seo:radar`. 27 queries scored against live SERPs; 208 phrases harvested from Google Suggest (us, gb, de, fr, ca, au, sa) and Bing autocomplete.

**Source honesty.** The SERP column is read from `bing.com live HTML SERP`. Google's own HTML is not scraped — it consent-walls or 429s a scripted client within a few requests, and working around that is what gets an IP banned. Bing's index is current and public; treat these verdicts as a screen for which page deserves hand-written depth, not as a ranking promise.

**Verdict rules.** 2+ forum/UGC results (reddit, quora, github, medium, tiktok.com/discover) in the top 5 → `TRUE ZERO-KD`. snaptik.app + ssstik.io + savefrom.net in the top 3 with exact-match titles → `LOCKED HEAD TERM`. Everything else → `CONTESTED`.

## TRUE ZERO-KD — write the page now

_Nothing measured in this run._

## CONTESTED — open but defended

| # | Query | Verdict | Weakness | Weak spots in the top 5 | Incumbents in the top 3 | Exact-match titles (top 5) | Our page |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `twitter video downloader 1080p without watermark` | CONTESTED | 3.6/10 | — | — | 0 | `/twitter-video-downloader` |
| 2 | `how to tiktok video downloader` | CONTESTED | 3.6/10 | — | — | 0 | `/` |
| 3 | `instagram reels downloader without watermark mark` | CONTESTED | 3.6/10 | — | — | 0 | `/instagram-reels-downloader` |
| 4 | `instagram reels downloader without watermark hd free` | CONTESTED | 3.6/10 | — | — | 0 | `/instagram-reels-downloader` |
| 5 | `capcut youtube video downloader` | CONTESTED | 3.6/10 | — | — | 0 | `/youtube-downloader` |
| 6 | `how to download video from capcut` | CONTESTED | 3.6/10 | — | — | 0 | `/youtube-downloader` |
| 7 | `how do you save a video from capcut` | CONTESTED | 3.6/10 | — | — | 0 | `/youtube-downloader` |
| 8 | `iphone fb video downloader app` | CONTESTED | 3.6/10 | — | — | 0 | `/facebook-video-downloader` |
| 9 | `iphone facebook video download shortcut` | CONTESTED | 3.6/10 | — | — | 0 | `/facebook-video-downloader` |
| 10 | `twitter video downloader without watermark` | CONTESTED | 3.6/10 | — | — | 0 | `/twitter-video-downloader` |
| 11 | `twitter video downloader without watermark online` | CONTESTED | 3.6/10 | — | — | 0 | `/twitter-video-downloader` |
| 12 | `capcut tiktok safe zone` | CONTESTED | 3.6/10 | — | — | 0 | `/tiktok-safe-zone-checker` |
| 13 | `how is tiktok money calculator` | CONTESTED | 3.6/10 | — | — | 0 | `/tiktok-money-calculator` |
| 14 | `tiktok calculator tiktok money calculator influencer earnings` | CONTESTED | 3.6/10 | — | — | 0 | `/tiktok-money-calculator` |
| 15 | `youtube thumbnail downloader online` | CONTESTED | 3.6/10 | — | — | 0 | `/video-thumbnail-downloader` |

## LOCKED HEAD TERM — do not fight it

_Nothing measured in this run._

## DISCARDED — the SERP did not answer this query

- `how to do capcut on tiktok` — off-topic SERP (0/10 results mention the query); not scored, no verdict.
- `how to use capcut on tiktok` — off-topic SERP (0/10 results mention the query); not scored, no verdict.
- `how to save instagram reels without watermark` — off-topic SERP (0/10 results mention the query); not scored, no verdict.
- `best iphone facebook video downloader` — off-topic SERP (0/3 results mention the query); not scored, no verdict.
- `how to withdraw tiktok money calculator` — off-topic SERP (0/10 results mention the query); not scored, no verdict.

## How to use this file

1. Pick a `TRUE ZERO-KD` row whose `Our page` is a page we already have — that is the cheapest win.
2. Put the exact query in the page's `<title>` or its first `<h2>`, and add the question to that page's FAQ array (the FAQ JSON-LD is generated from the same array, so schema and copy cannot drift).
3. Re-run `npm run seo:radar` after a deploy: a phrase that leaves the zero-KD set was won or lost, and the file records which.

Raw data: `.scratch/seo-radar.json` (27 HTTP requests, 0 SERP failures).
