# Tier-1 competitor-gap execution (November 2026)

What was measured, what shipped, and what could not be measured on this machine.
Read the last section before treating any number here as a target.

## 1. Method and its limits

**Measured live.** Google Autocomplete (`suggestqueries.google.com`,
`client=firefox`, `hl=en`) pulled for six country codes — `us, gb, de, ca, au,
sa` — against five seed terms. Autocomplete is real, country-scoped demand: a
suggestion that appears under `gl=sa` is being typed by Saudi users, not
inferred from a global volume estimate.

**Not measured.** Ahrefs has no API key on this machine, so this document
contains **no keyword difficulty, no volume, and no competitor ranking
positions**. Anything below is presence/absence of a query in a market. Where a
competitor is named, it is because the page already ranks for that query's
intent (snaptik.app, ssstik.io, fastdl.app, twdown.net, savefrom.net are the
incumbents for every TikTok/Instagram download query), not because a
backlink or traffic number was pulled.

That distinction matters: a page can rank for `tiktok slideshow downloader`
without any difficulty estimate. It cannot be ranked #1 on request.

## 2. The gap keywords found (live autocomplete)

| Market | Query surfaced | Page that must own it | Before |
|---|---|---|---|
| us, gb, de, ca, au, sa | `tiktok video downloader without watermark hd`, `… 4k without watermark` | `/` (TikTok root) | already titled for it |
| us, gb, ca, au, de, sa | `tiktok slideshow downloader`, `tiktok slideshow pictures`, `tiktok slideshow downloader no watermark` | `/tiktok-photo-downloader` | page existed, **none of these phrases were in it** |
| us, gb, ca, au, de, sa | `instagram reel audio extractor`, `instagram reel audio save`, `instagram reel audio downloader remove watermark` | `/instagram-reels-audio` | page existed, **only "finder"/"extraction" were covered** |
| us, gb, ca, au, de | `twitter gif saver`, `twitter gif converter`, `twitter gif downloader iphone`, `twitter gif to mp4` | `/twitter-video-downloader` | page knew "GIF" but not the `saver`/`converter`/`to mp4` forms |
| us, gb, de, ca, au | `facebook private video download`, `… downloader without mark`, `… to mp4 converter` | `/facebook-video-downloader` | title already carried "Private"; the long forms did not |
| us, gb, de, ca, au | `tiktok video download 1080p` (and the 60fps wording in the US list) | `/tiktok-video-for-capcut` (new) | page did not exist |

Notable absences — do **not** build for these:

- `tiktok video downloader with watermark` / `with username` appear in every
  market. They are people looking for the *watermarked* copy (often to re-post
  with attribution). This site deliberately serves the clean stream; a page
  promising the watermarked one would contradict every other page.
- `… apk` appears in us, gb, de, ca, au, sa. There is no APK and there never
  will be (AGENTS.md). The copy answers it in one line ("no app, no apk")
  instead of shipping a page that cannot deliver.

## 3. What shipped in code

### English pages — keyword clusters added to metadata

- `lib/content/sub-tools/tiktok-photo-downloader.ts` — four slideshow forms.
- `lib/content/sub-tools/instagram-reels-audio.ts` — extractor / save /
  iphone / remove-watermark forms.
- `app/(site)/twitter-video-downloader/page.tsx` — GIF saver, converter,
  iphone, gif-to-mp4.
- `app/(site)/facebook-video-downloader/page.tsx` — private-video long forms,
  Watch HD, Reels HD, fb.watch.

Keywords alone do not rank a page; they are the surface a rewrite can use. The
copy on each page already answers the intent, which is why no page was
rewritten to chase a phrase it cannot serve.

### French (`/fr`) — three new platform pages

`/fr` was the locale with the longest measured engagement in Ahrefs Web
Analytics and the only Tier-1 language in that set with no per-network pages.
Added:

- `/fr/instagram-reels-downloader`
- `/fr/youtube-downloader`
- `/fr/facebook-video-downloader`

Written in French for the French query (`sans filigrane`, `sans application`,
`lien fb.watch`), not machine-translated from the English page. Copy lives in
`lib/i18n/platform/fr.ts`; registration is data — `PLATFORM_LOCALES`,
`PLATFORM_LANDINGS` and the hreflang cluster in
`platformLanguageAlternates`. The localized hub, the header switcher, the
footer and `sitemap.ts` pick them up with no further change.

German, Spanish and Arabic already carried all three platform pages, so the
work there was linking and anchor text, not new routes.

### Reciprocal, keyword-rich links on every localized page

`components/seo/localized-landing.tsx` used to render the sibling cards with
the bare platform name ("Instagram", "Facebook", "YouTube"). Each anchor now
uses the sibling page's own title up to its em dash — `Instagram Reels
herunterladen in HD`, `Descargar videos de Facebook en HD`, `تنزيل فيديوهات
يوتيوب` — so the anchor is, in the target language, the query the target page
answers. Twitter / X is linked as well, explicitly marked English, because it
has no translated page and a translated label would be a lie.

### Ad timing — the 20-second trap removed

`components/ads/AdScripts.tsx` armed the three networks 20s after load unless
the visitor interacted first. Ahrefs reports a 26-second average mobile visit,
so most phone sessions ended before a single impression. Now:

- armed by the first `pointerdown` / `touchstart` / `keydown` / `wheel`, or
- `requestIdleCallback(arm, { timeout: 2500 })` after load, with a hard
  `setTimeout(arm, 2500)` as the ceiling.

`scroll` is still not a trigger: a restored scroll position fires it on every
reload. `CLS` stays 0 because `AdSlot` reserves its aspect-ratio box from the
first paint (see `2f0dd10`), and the guard script that clamps the HilltopAds
fixed card on mobile travels in the same block.

## 4. Internal-link graph

Every page in the site is reachable from `/` in at most two hops:

1. `/` → header (four platforms + Guides), footer (all 18 sub-tools, 11 language
   roots, six guides), `/tools` hub.
2. `/tools` → every English sub-tool, all 33 localized platform pages, every
   guide group.

The 157 "uncrawled" internal links Ahrefs reported are not orphaned links: they
are links inside pages Google had not crawled yet. The cause is crawl budget on
a one-month-old domain, not a missing edge. The fix that is in our control is
the one applied here — fewer, more descriptive paths from a small number of
strong pages, not more pages.

## 5. What this document cannot claim

- **No KD ≤ 15 filtering.** Without Ahrefs/Semrush access, "low difficulty" is
  an assumption. The pages chosen are low-competition by inspection (long-tail,
  explicit intent, incumbents answer them with a generic tool page), not by a
  measured KD.
- **No traffic forecast.** Indexation is the gate: on the last check, most of
  the sitemap was still "unknown to Google". New pages compete for the same
  crawl budget.
- **Geo-targeting is content, not cloaking.** Tier-1 RPM comes from the real
  visitor's country. Serving different content to Tier-1 bots, or buying "US
  traffic", is what terminates a Monetag/Adsterra/HilltopAds account.
