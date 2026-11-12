# The sixteen legacy redirects

`next.config.ts` carries sixteen permanent redirects. They are not leftovers: each
one holds a URL that already earned links, indexing or hover-previews, and each
one exists because the page behind it was folded into a stronger page. Deleting
any of them would turn those inbound links into 404s.

| # | Source | Destination | Status | Why it exists |
|---|---|---|---|---|
| 1 | `/tiktok-downloader` | `/` | 308 | The TikTok downloader **is** the home page. This is the keyword URL people type and old backlinks use; a 404 here would drop a navigational query that already points at us. |
| 2 | `/guides/repurpose-short-videos-across-tiktok-reels-shorts` | `/guides/why-tiktok-video-quality-drops-after-upload` | 308 | Two guides answered the same repurposing query with near-identical copy, so Google had to pick one and the other split its own signal. The weaker duplicate was folded into the survivor. |
| 3 | `/instagram-reels-download-iphone` | `/instagram-reels-downloader` | 308 | A modifier page that restated the Instagram page. At this domain authority every such page split internal links and crawl budget with the page it duplicated, and none of them could outrank it. The iPhone question moved onto the survivor. |
| 4 | `/instagram-reels-download-without-login` | `/instagram-reels-downloader` | 308 | Same consolidation: "without login" is an objection the main page already answers in its copy and FAQ. |
| 5 | `/facebook-video-download-without-app` | `/facebook-video-downloader` | 308 | Same consolidation for Facebook: "no app" is the Facebook page's core promise, not a separate page. |
| 6 | `/fb-watch-downloader` | `/facebook-video-downloader` | 308 | A second URL for Watch downloads. Two pages competing on one query is worse than one page that ranks. |
| 7 | `/guides/download-tiktok-without-logo-iphone-android` | `/guides/download-tiktok-video-without-watermark` | 308 | Fourteen guide URLs earned 26 impressions and zero clicks in 28 finalised days, and no single query reached two impressions. The guides were consolidated by intent into four hubs; the device-by-device iPhone/Android copy now lives in the download hub. |
| 8 | `/guides/tiktok-short-links-not-working` | `/guides/download-tiktok-video-without-watermark` | 308 | Short-link resolution is the same story as the download itself — what a vt/vm link is, and why it fails — so it became a section of the download hub. |
| 9 | `/guides/iphone-safari-downloads-to-files-and-photos` | `/guides/download-tiktok-video-without-watermark` | 308 | Files → Photos is the last step of the iPhone download, not a separate article; it is now a section there. |
| 10 | `/guides/tiktok-audio-bitrate-and-sound-quality` | `/guides/download-tiktok-audio-as-mp3` | 308 | Bitrates, AAC and MP3 extraction answered one question split across two pages. The audio hub carries both. |
| 11 | `/guides/repurpose-tiktok-videos-for-youtube-shorts-instagram-reels` | `/guides/why-tiktok-video-quality-drops-after-upload` | 308 | Repurposing is a consequence of the export settings the quality hub documents; the copy moved there. |
| 12 | `/guides/mp4-wont-import-capcut-premiere-pro` | `/guides/why-tiktok-video-quality-drops-after-upload` | 308 | Codec and container diagnosis belongs beside the export settings that prevent it. |
| 13 | `/guides/1080p-60fps-download-edit-upload-workflow` | `/guides/why-tiktok-video-quality-drops-after-upload` | 308 | The workflow is the same re-encode story as the quality hub, with the frame-rate checks it already had. |
| 14 | `/guides/browser-vs-app-tiktok-downloaders-safety` | `/guides/is-downloading-tiktok-videos-legal` | 308 | The safety comparison is part of the legal hub's question — what is allowed, and which tool deserves trust — so it renders there. |
| 15 | `/guides/how-to-download-instagram-reels-in-hd` | `/instagram-reels-downloader` | 308 | Platform-specific instructions that duplicated the tool page they described. The redirect sends readers straight to the resolver. |
| 16 | `/guides/how-to-download-large-facebook-videos-in-1080p-hd` | `/facebook-video-downloader` | 308 | Same consolidation for Facebook: the link shapes and 1GB handling are the tool page's own promise. |

`permanent: true` makes Next answer **308**, which is the method-preserving
form of 301 — search engines treat it as permanent and transfer the signal.

## The two rules this file is guarding

1. **A redirect source is never linked.** An internal `href` pointing at a
   source works, so nothing in review objects, but every crawler and visitor
   spends an extra round trip and Ahrefs reports a 3XX warning forever. Write
   the destination.
2. **A destination must stay a 200.** A redirect to a page that has since been
   renamed is worse than a 404: the 404 at least says so, while the chain
   silently ends on a dead URL.

## How both are enforced

| Rule | Check | Runs |
|---|---|---|
| Never link a source | `scripts/check-content-links.mjs` reads the sources out of `next.config.ts` and fails on any matching `href` in `app/`, `components/`, `lib/` | `npm run verify` (every commit, offline) |
| Destination returns 200 | `scripts/check-redirects.mjs` requests each source with redirects disabled, asserts a 3xx and the expected `Location`, then follows it and asserts `200` | `npm run check:redirects`, and the weekly Index Check workflow |

```bash
npm run check:redirects                     # against production
INDEX_CHECK_ORIGIN=http://localhost:3100 npm run check:redirects   # against a local build
```

The live check is deliberately **not** part of `npm run verify`: verify must
stay a pre-commit gate that works offline. A redirect that breaks because a
deploy broke it is a deployment fact, not a commit fact.

## Retiring one

A redirect may only be removed when nothing points at the source any more —
no sitemap entry, no internal link, and no inbound links in the link profile.
Until then the destination can be updated (point it at the new canonical page)
but the source row must stay. When you do remove one, delete its row here and
from `next.config.ts` in the same commit; the two lists are meant to match.
