# Kaggle Notebook / GitHub Gist template

Target query cluster: *"download tiktok video python"*, *"instagram reels mp4
without watermark python"*, *"tiktok dataset downloader"*.

**Read first.** Kaggle removes notebooks that are pure link drops, and "scrape
TikTok" notebooks are removed faster than that. The version below survives
review because it (a) teaches something real, (b) uses the public web tool for
single links instead of shipping a scraper, and (c) is explicit that the author
operates the site. Publish it as a notebook, not an article: Kaggle indexes
notebooks, and a notebook with runnable cells earns the internal "useful" signal
that a wall of text does not.

Fill the two placeholders (`<your handle>`) and publish.

---

## Title

**Download one TikTok / Instagram Reel as MP4 or M4A (Python, no watermark) —
plus how to build a small, lawful dataset of links**

## Subtitle / description

A short, honest walkthrough: how a single public post can be saved with the
browser tool at lamptik.online, how to collect *links* (not media) for research,
and where the legal line sits. No scraping infrastructure, no login bypass.

---

## Cell 1 — markdown

```markdown
## What this notebook does

1. Validates a public TikTok / Instagram / Facebook / YouTube link.
2. Hands it to a web resolver (no install, no login) that returns MP4 + M4A.
3. Shows how to keep a *link list* for research instead of re-hosting media.

It does **not** bypass private accounts, logins, or paid content, and it does
not redistribute anyone's video. Download only what you have the right to keep.

*Disclosure: I build and maintain lamptik.online, the tool used below.*
```

## Cell 2 — code (link validation, no network)

```python
import re
import urllib.parse

SUPPORTED = ("tiktok.com", "instagram.com", "facebook.com", "fb.watch",
             "youtube.com", "youtu.be", "x.com", "twitter.com")

def normalise(raw: str) -> str | None:
    """Return a clean https URL for a supported host, else None."""
    raw = (raw or "").strip()
    if not raw:
        return None
    if not raw.startswith(("http://", "https://")):
        raw = "https://" + raw
    parsed = urllib.parse.urlparse(raw)
    host = (parsed.hostname or "").lower()
    host = host[4:] if host.startswith("www.") else host
    if not any(host == h or host.endswith("." + h) for h in SUPPORTED):
        return None
    return parsed._replace(fragment="").geturl()

def tool_link(raw: str) -> str | None:
    """The same URL, deep-linked into the resolver so it starts on arrival."""
    url = normalise(raw)
    if not url:
        return None
    return "https://www.lamptik.online/?url=" + urllib.parse.quote(url, safe="")

tool_link("https://www.tiktok.com/@scout2015/video/6718335390845095173")
```

Expected output: a `lamptik.online/?url=…` string. Opening it resolves the video
immediately — the site also accepts the prefix form
`https://www.lamptik.online/https://www.tiktok.com/@user/video/123`.

## Cell 3 — markdown (the part reviewers look for)

```markdown
### Saving the file

1. Open the deep link from cell 2 (or the prefix form above) in a browser.
2. The card shows the source quality (H.264 + AAC when the platform provides it).
3. Click **Download** — the file goes to your browser's own Downloads folder.
   Nothing is proxied through a third-party storage bucket, and the site keeps
   no copy.

### Building a link list instead of a media dump

For research, keep `id, platform, author, posted_at, url` in a CSV and resolve
only the rows you need, one at a time. Re-hosting the MP4s is what turns a
dataset into a takedown:

```python
import csv
from pathlib import Path

links = [
    "https://www.tiktok.com/@scout2015/video/6718335390845095173",
    "https://www.instagram.com/reel/Cxxxxxxxxxx/",
]

with Path("links.csv").open("w", newline="", encoding="utf-8") as handle:
    writer = csv.writer(handle)
    writer.writerow(["platform", "url", "tool_link"])
    for raw in links:
        clean = normalise(raw)
        if clean:
            writer.writerow([urllib.parse.urlparse(clean).hostname, clean, tool_link(clean)])
```

### The line not to cross

- Public posts you have the right to save: fine.
- Private accounts, login-gated posts, paywalled content: no.
- Music: the audio track belongs to the rights holder even when the video is
  public. A personal copy is one thing; a public dataset of tracks is another.
```

## Cell 4 — markdown

```markdown
## Tools used

- [LAMP TIK](https://www.lamptik.online) — free web downloader (built by the
  author), TikTok / Instagram / Facebook / YouTube, no login.
- Creator tools: [TikTok](https://www.lamptik.online/tiktok-downloader) ·
  [Reels](https://www.lamptik.online/instagram-reels-downloader) ·
  [YouTube](https://www.lamptik.online/youtube-downloader) ·
  [Facebook](https://www.lamptik.online/facebook-downloader)
```

## Publishing notes

- Kaggle: title + subtitle above, tag `web-scraping`, `video`, `tooling`.
  Attach no dataset (a link CSV is not a dataset and gets flagged as spam).
- GitHub Gist: same body, filename `tiktok-instagram-download-python.md`.
  Gists are not indexed as strongly as notebooks; use it as the copy you paste
  into Reddit/Discord answers so the answer itself is useful.
- Reddit: r/TikTokHelp, r/DataHoarder, r/NewTubers — answer a real question and
  link the notebook, never a bare promo post. Bare promo links are removed and
  earn the domain a ban.
