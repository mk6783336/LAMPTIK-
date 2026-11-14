# Tier-1 launch pack — measured tkhd story

Copy for r/VideoEditing, r/NewTubers, r/TikTokCreators, r/webdev, Hacker News,
DEV.to, AlternativeTo and Product Hunt.

Everything here rests on one measured fact, not a slogan: the MP4 that each
platform hands a downloader on 2026-11-13 declared these dimensions in its own
`tkhd` (track header) box.

| Platform | Delivered file (tkhd) | What the tool's label usually says | Sample |
|---|---|---|---|
| TikTok | 576×1024 | 1080p / HD | 3 posts: 2019, 2022, 2025 uploads |
| YouTube | 640×360 | 1080p | 3 videos, one uploaded as a 4K master |
| Instagram Reels | 718×1276 · 720×1280 · 576×1024 | 1080×1920 | 3 public reels |
| Facebook | up to 1080×1920 (one reel returned 360×640 on a second read) | 1080p / HD | 3 public reels |
| X (Twitter) | 3840×2160 | 1080p (an understatement) | @NASA post |

Method: fetch through our own resolver, read the first bytes of the response,
parse the `tkhd` box. No number below came from a platform's marketing page.
The site's CI re-checks the same numbers: `scripts/check-claims.mjs` holds the
measured ceiling per platform and fails the build if any page promises above it.

**Rules of engagement, for every platform below.** Answer the question in the
thread first; a link only where the linked page is the answer. Disclose that it
is your site. Never post the same text twice. If a subreddit or community
forbids self-promotion, post the data with no link and let people ask.

---

## Reddit

### r/VideoEditing — the technical discovery angle

Title:

> Most "1080p" downloader labels are describing a file the platform never sends

Body:

> I read the `tkhd` box (the track header that carries coded width/height) from
> the MP4 that TikTok, YouTube, Instagram, Facebook and X actually hand back
> when a downloader resolves a public post. Same files, five different answers:
>
> - TikTok: 576×1024 on all three posts I tried (2019, 2022, 2025 uploads)
> - YouTube: 640×360 — including on a video uploaded as a 4K master
> - Instagram Reels: 718×1276, 720×1280, 576×1024
> - Facebook: up to 1080×1920, and one reel came back 360×640 on a second read
> - X: 3840×2160 (the one place the file matched the biggest label)
>
> The pattern is that the "1080p" on a downloader page is the top rung of the
> platform's playback ladder, not the rendition its API returns. If you are
> pulling clips for an edit, this matters twice: you are importing upscaled
> pixels, and your second encode starts from a smaller source than you think.
>
> One command to check any file you already downloaded:
> `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 clip.mp4`
>
> I ended up putting the measurements in a build check on my own site so the
> copy cannot drift past what the routes serve, but the numbers are the point
> here — happy to paste more samples if useful.

Link (only if the thread is about download quality or codec choices):
`https://www.lamptik.online/guides/measured-video-files-vs-1080p-labels`

### r/NewTubers — the practical angle

Title:

> Your Shorts export is fine. The download you take back is usually 640×360.

Body:

> Common loop: export a Short, upload it, download it again later to reuse, and
> wonder why the footage looks softer in the second edit. I measured what a
> downloader receives from YouTube on 2026-11-13: 640×360 on three videos,
> including one uploaded as a 4K master. The watch page was offering the full
> ladder; the served MP4 was the 360p-class rendition.
>
> So the loss is not your export settings — it is the rung the API returned.
> Keep your originals. If you must re-download, check the dimensions before
> importing: `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 clip.mp4`
>
> Full table for TikTok/IG/FB/X as well, all from the file's own header:
> `https://www.lamptik.online/guides/measured-video-files-vs-1080p-labels`

### r/TikTokCreators — the answer-first angle

Title:

> TikTok's own player looks sharper than the file any downloader gets — here is why

Body:

> The app plays a higher rendition than the one its play address serves to a
> downloader. Three posts I measured (a 2019 upload, a 2022 one, a 2025 one)
> all came back 576×1024, while the app rendered them sharper on the same
> phone. Nothing is broken: the app is streaming a different rung of the same
> ladder.
>
> If you are reposting your own content, download from the app's own "Save
> video" if you need the composited version, or keep the original export —
> re-downloading through any web tool gets you that 576×1024 file. Quick check
> on any file: `ffprobe` prints width/height from the `tkhd` box in one line.
>
> Measurements and method: `https://www.lamptik.online/guides/measured-video-files-vs-1080p-labels`

### r/webdev — the engineering angle

Title:

> I put MP4 tkhd measurements in the build so marketing copy cannot claim 1080p

Body:

> A downloader's copy drifts toward whatever converts, and "1080p" converts.
> The file usually does not: when I parsed the `tkhd` box of what five
> platforms actually serve (2026-11-13), TikTok was 576×1024, YouTube 640×360,
> Instagram a 720p-class rendition, Facebook up to 1080×1920, X 3840×2160.
>
> So the claim table is code now. `scripts/check-claims.mjs` maps each platform
> to its measured ceiling; every sentence in the site copy is scanned, and a
> number above the ceiling fails `npm run verify`. Translations are scanned
> too — that is where a stale "1080p" had survived for months.
>
> The measurement is opt-in (`--measure`): it replays three sample URLs per
> platform, reads the response's `tkhd`, and rewrites the table only when a
> fresh sample agrees. Offline builds stay deterministic, so a slow CDN cannot
> silently move a ceiling.
>
> Write-up with the numbers and the ffprobe one-liner:
> `https://www.lamptik.online/guides/measured-video-files-vs-1080p-labels`

---

## Hacker News — Show HN

Title:

> Show HN: I measured the MP4s downloaders actually get, then gated my copy on it

Body:

> Downloader sites all advertise 1080p. I wanted to know what the file's own
> container says, so I fetched the same public posts through my resolver and
> parsed the `tkhd` (track header) box of each response. On 2026-11-13:
>
> TikTok 576×1024 (3 posts, 2019–2025) · YouTube 640×360 (3 videos, one 4K
> master) · Instagram Reels 718×1276 / 720×1280 / 576×1024 · Facebook up to
> 1080×1920, with one reel returning 360×640 on a second read · X 3840×2160.
>
> The interesting part is not the numbers, it is that the label and the file can
> both be "true" to the platform: the ladder describes playback renditions,
> while a downloader gets whichever rung the API returns. Most pages turn the
> ladder's ceiling into a promise.
>
> So the claims are checked in CI. A table maps each platform to its measured
> ceiling, every page's copy (including translations) is scanned, and a
> resolution above the ceiling fails the build. `--measure` replays sample URLs,
> parses tkhd, and only rewrites the table when a fresh sample agrees.
>
> Site: https://www.lamptik.online — the comparison page with the method:
> https://www.lamptik.online/guides/measured-video-files-vs-1080p-labels
>
> Feedback I would value: is tkhd the right level of proof, or should the gate
> read the decoded frame dimensions as well?

---

## DEV.to — technical article

Title:

> Stop claiming 1080p: parsing MP4 tkhd boxes in CI

Intro (first 3 paragraphs, then the outline):

> Every downloader landing page says 1080p. Almost none of them read the file
> they hand you. An MP4 declares its own coded dimensions in the `tkhd` box,
> written at encode time — so a build can compare the promise with the bytes
> instead of trusting the copy.
>
> I sampled three public posts per platform through my own resolver on
> 2026-11-13 and parsed the first bytes of each response. TikTok served
> 576×1024, YouTube 640×360 (including for a 4K master), Instagram a 720p-class
> rendition, Facebook up to 1080×1920 with an unstable ladder, and X 3840×2160.
> The spread is the story: the label is a rung on a playback ladder, the file
> is one rung of it.
>
> The gate is deliberately boring. A table maps each platform to a measured
> ceiling; every sentence of site copy is scanned by the same script that runs
> in `npm run verify`; a number above the ceiling fails the build. Measurement
> is a separate, opt-in pass that replays sample URLs and rewrites the table
> only when a sample agrees.

Outline:

1. What `tkhd` is, and the 40 lines of code that read it
2. Why "1080p" is a ladder, not a file (with the measured table)
3. The failure mode: copy drifts, no test notices
4. The claim table as executable policy (capability evidence + numbers)
5. Translating the gate: why scanning locales mattered
6. What the gate cannot do (bitrate, frame rate, per-request volatility)
7. Reproduce it: ffprobe one-liner + link to the comparison page

Canonical link at the end (not a keyword-stuffed CTA):
`https://www.lamptik.online/guides/measured-video-files-vs-1080p-labels`

---

## AlternativeTo

Submit as an alternative to: SnapTik, SSSTik, SaveFrom, SnapDownloader.

Short description (max 200 chars):

> Browser-based downloader for TikTok, Instagram, YouTube, Facebook and X that
> shows the measured width × height of the file before you save it — no app,
> no account, no popunder on load.

Long description:

> LAMP TIK resolves public posts and hands the file straight to the browser's
> download manager. The result panel reports the real dimensions of the stream
> the platform returned, taken from the MP4 header, instead of promising the
> top rung of its playback ladder. On 2026-11-13 those measurements were
> 576×1024 for TikTok, 640×360 for YouTube, a 720p-class rendition for
> Instagram, up to 1080×1920 for Facebook and 3840×2160 for X.
>
> No install, no login, no watermark. Nothing third-party loads before you ask
> for a file, no overlay covers the download button, and the single sponsored
> surface opens only after a hand-off, at most once every four hours.
>
> Comparison and method: https://www.lamptik.online/guides/measured-video-files-vs-1080p-labels

Category: Video & Movies · Platforms: Web

---

## Product Hunt

Tagline (60 chars max):

> Downloader that shows the file's real dimensions

Description:

> Paste a public TikTok, Instagram, YouTube, Facebook or X link and see the
> width, height and size of the stream before you save it. No app, no account,
> no watermark, and nothing loading over the page while you use it. The
> dimensions come from the MP4's own header, not from the platform's marketing
> ladder — the same reason the site's copy is gated in CI against measured
> ceilings.

First comment (maker comment):

> Why this exists: I kept seeing downloaders advertise 1080p while handing back
> 640×360, so I started parsing the `tkhd` box of what the platforms actually
> serve. TikTok 576×1024, YouTube 640×360, Instagram 720p-class, Facebook up to
> 1080×1920, X 3840×2160 — all measured 2026-11-13. The site now prints those
> numbers before you download and fails its own build if the copy promises
> more. Happy to answer anything about the measurement or the claim gate.

---

## Order to post, and what not to do

1. DEV.to article first (citable, no gatekeeper).
2. Hacker News on a weekday morning US time; be present for comments.
3. Reddit after the article exists, one sub per day, tailored body each time.
4. AlternativeTo and Product Hunt last — they need a stable URL and traffic to
   look alive.

- Do not post the same paragraph in two subreddits; moderators check profiles.
- Do not ask for upvotes anywhere; it is the fastest way to get the domain
  banned.
- Do not claim HD for TikTok or YouTube in any comment. The measured files are
  576×1024 and 640×360 — the whole point of the post is that this claim is
  false.
