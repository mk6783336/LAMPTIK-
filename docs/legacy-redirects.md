# The six legacy redirects

`next.config.ts` carries six permanent redirects. They are not leftovers: each
one holds a URL that already earned links, indexing or hover-previews, and each
one exists because the page behind it was folded into a stronger page. Deleting
any of them would turn those inbound links into 404s.

| # | Source | Destination | Status | Why it exists |
|---|---|---|---|---|
| 1 | `/tiktok-downloader` | `/` | 308 | The TikTok downloader **is** the home page. This is the keyword URL people type and old backlinks use; a 404 here would drop a navigational query that already points at us. |
| 2 | `/guides/repurpose-short-videos-across-tiktok-reels-shorts` | `/guides/repurpose-tiktok-videos-for-youtube-shorts-instagram-reels` | 308 | Two guides answered the same repurposing query with near-identical copy, so Google had to pick one and the other split its own signal. The weaker duplicate was folded into the survivor. |
| 3 | `/instagram-reels-download-iphone` | `/instagram-reels-downloader` | 308 | A modifier page that restated the Instagram page. At this domain authority every such page split internal links and crawl budget with the page it duplicated, and none of them could outrank it. The iPhone question moved onto the survivor. |
| 4 | `/instagram-reels-download-without-login` | `/instagram-reels-downloader` | 308 | Same consolidation: "without login" is an objection the main page already answers in its copy and FAQ. |
| 5 | `/facebook-video-download-without-app` | `/facebook-video-downloader` | 308 | Same consolidation for Facebook: "no app" is the Facebook page's core promise, not a separate page. |
| 6 | `/fb-watch-downloader` | `/facebook-video-downloader` | 308 | A second URL for Watch downloads. Two pages competing on one query is worse than one page that ranks. |

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
