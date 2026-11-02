# Bing Webmaster Tools — verification and sitemap submission

## Why this matters

Bing is not a rounding error for this site, for two reasons:

1. **DuckDuckGo, Yahoo, Ecosia and most "privacy" search engines read Bing's
   index.** A page missing from Bing is missing from all of them.
2. **Bing powers Copilot's web answers.** AI-citation traffic is how a new
   utility site gets its first real visitors.

Measured state on 31 Oct 2026, before verification:

| Check | Result |
|---|---|
| URLs in sitemap | 51 |
| Bingbot → `/` | `200`, no challenge |
| Bingbot → `/robots.txt` | `200`, `Allow: /` |
| Bingbot → `/sitemap.xml` | `200`, 51 `<loc>` |
| IndexNow → `www.bing.com/indexnow` | `200` (accepted) |
| IndexNow → `api.indexnow.org` | `200` (accepted) |
| `site:lamptik.online` on Bing | **not measurable** — see below |
| `site:lamptik.online` on DuckDuckGo | **not measurable** — see below |

### Resolved on 2 Nov 2026 — the host was wrong

The measurement above hid the actual blocker, because every signal it checks
was already green. The problem was **which host owned the property**:

| Fact | Before | Now |
|---|---|---|
| Property in Bing | `https://lamptik.online/` (apex, verified) | `https://www.lamptik.online/` (verified) |
| Apex behaviour | `308 → https://www.lamptik.online/` | unchanged |
| Sitemap attached to the host that serves | **none** (`GetFeeds` → `[]`) | 76 URLs, `Status: Pending` |
| Verification meta / XML on www | `404` / absent | `200` both |

A verified apex property that redirects is not the site Bing indexes. Every
sitemap URL, canonical and hreflang pointed at `www`, so all 76 URLs sat outside
the property that owned the crawl budget: Bing reported 50 URLs *discovered but
never crawled* and zero indexed, week after week, while the checks said
"crawlable, sitemap valid, IndexNow accepted".

`AddSite` for the www host returns the verification token in
`AuthenticationCode`, and `VerifySite` completes verification once the token is
served — no UI click needed:

```bash
K=…  # Webmaster API key

curl -s -X POST "https://ssl.bing.com/webmaster/api.svc/json/AddSite?apikey=$K" \
  -H 'Content-Type: application/json' \
  -d '{"siteUrl":"https://www.lamptik.online/"}'
# → GetUserSites now lists it with IsVerified:false and its AuthenticationCode

curl -s -X POST "https://ssl.bing.com/webmaster/api.svc/json/VerifySite?apikey=$K" \
  -H 'Content-Type: application/json' \
  -d '{"siteUrl":"https://www.lamptik.online/"}'
# → {"d":true}, and IsVerified flips to true

curl -s -X POST "https://ssl.bing.com/webmaster/api.svc/json/SubmitFeed?apikey=$K" \
  -H 'Content-Type: application/json' \
  -d '{"siteUrl":"https://www.lamptik.online/","feedUrl":"https://www.lamptik.online/sitemap.xml"}'
```

`VerifySite` is undocumented in the JSON API reference but answers `200` with
`{"d":true}`; `VerifyUserSite` and `Verify` are both `404`. The token itself is
public — it is served in every page's `<head>` — so it ships as the default in
`lib/verification.ts` rather than depending on a Vercel variable being present
in all three environments.

After verification the submission queue was flushed once: 76 URLs via
`SubmitUrlBatch` (quota 98/day → 22 left that day) and 76 more via
`node scripts/indexnow.mjs --all`. Bing's own crawl is the remaining wait.

### Why the index count is unknown, not zero

An earlier version of this document reported "0 of 51 indexed" from a `site:`
query. That reading was wrong, and the way it was wrong matters:

Bing serves a **degraded page to automated clients**. The query comes back
`200` with ten result blocks, but the blocks are unrelated filler. The control
test is decisive:

```bash
curl -s -A "Mozilla/5.0 (compatible; bingbot/2.0)" \
  "https://www.bing.com/search?q=site%3Awikipedia.org" \
  | grep -oE 'https?://[a-z0-9.-]+' | sort -u | head
# → reddit.com, go.microsoft.com, support.microsoft.com … no wikipedia.org
```

A `site:` query that cannot find **Wikipedia** is not reporting on this site
at all. DuckDuckGo is worse: its HTML endpoint answers `202` with an
anti-automation page. So the honest state is *unknown* — neither engine will
tell a bot how much it has indexed.

What *is* certain: the site is crawlable, the sitemap is valid and served, and
IndexNow accepts every submission. Verification is still the unlock — an
unverified property has no sitemap attached and no crawl priority — but it has
never been demonstrated that Bing refuses to index this site.

`scripts/index-check.mjs` encodes this lesson: it validates every `site:` query
against a control domain and reports `unmeasurable` rather than `0` when the
engine refuses to answer. The only authoritative count is the Webmaster API,
available once the property exists.

## Fastest method — import from Google Search Console

No token, no file, no DNS record. This is the recommended path because Google
Search Console is already verified for this domain.

1. Sign in at <https://www.bing.com/webmasters> with the Microsoft account that
   should own the property.
2. On the "Add your site" screen choose **"Import from Google Search Console"**.
3. Authorise Bing to read Search Console, tick `lamptik.online`, confirm.
4. Bing imports the property **already verified**, along with any sitemaps and
   the existing URL history. Nothing needs to be added to the codebase.

Skip to [After verification](#after-verification) once the property appears.

## Method 2 — HTML meta tag

1. In Bing Webmaster Tools: **Add site** → enter
   `https://www.lamptik.online` → choose **HTML meta tag**.
2. Copy the `content` value — it looks like
   `<meta name="msvalidate.01" content="A1B2C3D4E5F6..." />`.
3. The token for `www` is already the default in `lib/verification.ts`
   (`BING_WWW_VERIFICATION_TOKEN`), so nothing has to be configured. An
   environment variable still wins, which is what a re-issued token needs:

   ```
   NEXT_PUBLIC_BING_SITE_VERIFICATION=A1B2C3D4E5F6...
   ```

4. Confirm the tag is in the served HTML:

   ```bash
   curl -s https://www.lamptik.online/ | grep -o 'msvalidate\.01[^>]*'
   ```

5. Verify with the API (`VerifySite`, above) or the **Verify** button. The value
   is unique to the account and the site, so a rotated token means updating the
   constant and redeploying.

## Method 3 — XML file

1. In Bing Webmaster Tools choose **XML file**; it shows a UUID.
2. Set it in Vercel:

   ```
   BING_SITE_AUTH_UUID=00000000000000000000000000000000
   ```

3. Redeploy. `https://www.lamptik.online/BingSiteAuth.xml` then serves:

   ```xml
   <?xml version="1.0"?>
   <users>
     <user>00000000000000000000000000000000</user>
   </users>
   ```

   With the variable unset the route answers `404` on purpose — a malformed
   file is remembered by Bing as a failed verification.

4. Click **Verify**.

## After verification

Do these once, in order:

1. **Submit the sitemap.** Sitemaps → *Submit sitemap* →
   `https://www.lamptik.online/sitemap.xml`. This is the step that was
   impossible before verification.
2. **Submit all 51 URLs.** URL Submission → paste the sitemap URL list. Bing's
   daily quota is small for a new site (often 10), so submit the highest-value
   pages first: `/`, `/youtube-downloader`, `/tiktok-mp3-downloader`,
   `/tools`, then the locale landings.
3. **Copy the API key** from Settings → API access. Setting it as
   `BING_WEBMASTER_API_KEY` lets a workflow read
   `GetUrlSubmissionQuota` and `GetUrlTrafficInfo` — the only way to see quota
   and impressions programmatically, since the public `site:` query is all we
   can measure without an account.
4. **Re-run IndexNow** so the queue is refreshed now that the property is
   verified:

   ```bash
   node scripts/indexnow.mjs --all
   ```

## What to expect

Bing's first crawl of a newly verified, low-authority property typically takes
**3–10 days**, and it will not crawl all 51 URLs at once. Publish, then wait a
week before judging — re-checking daily only creates the impression of a
failure that has not happened yet.

The honest expectation for a site this age: Bing will index a subset, rank it
for niche and long-tail queries, and send a slow trickle of traffic. It is a
second channel alongside Google, not a cure for the authority problem.

## Re-measuring

Run the check by hand, or wait for the weekly workflow (`.github/workflows/index-check.yml`):

```bash
node scripts/index-check.mjs
```

It reports sitemap size, robots.txt admission, and verification status
every week, and adds Bing/DuckDuckGo page counts **only when the control domain
proves the engine is answering honestly**. An `unmeasurable` line means exactly
that — never that the site has no pages indexed.

## Automatic submission of new pages

The weekly workflow also runs `scripts/bing-submit.mjs`, which pushes URLs into
Bing's crawl queue with `SubmitUrlBatch`. It runs **after** the index check, so
the report always describes the state before that week's nudge.

It is deliberately not a blanket resubmit. This site's allowance is **100/day and
200/month**, so re-sending all 51 URLs every week would spend 204 a month —
exhausting the quota and teaching Bing to treat the submissions as noise.

| Rule | Effect |
|---|---|
| `--new-only` | Only URLs absent from `.bing-submit-state.json` are sent |
| `--stale-after-days 30` | A URL Bing accepted but ignored is re-nudged monthly |
| Quota read first | The batch is trimmed to what the remaining daily allowance allows, minus a 5-unit margin |
| Recorded after acceptance | A failed call never marks URLs as sent |
| No key configured | Skips with a notice instead of failing the job |

To push everything by hand — after a big content change, say:

```bash
BING_WEBMASTER_API_KEY=… node scripts/bing-submit.mjs
```

Add `BING_SUBMIT_DRY=1` to see the selection without sending anything.

## The authoritative count: Webmaster API key

Scraping cannot answer "how many pages are indexed" — no search endpoint will
tell a bot. The Webmaster API will, for a site you have verified.

**Generate the key** (requires the verified property from above):

1. Bing Webmaster Tools → **Settings** → **API access**.
2. Accept the terms, click **API key** → **Generate**.
3. Copy it.

**Store it** where the workflow can read it:

```bash
# Repository secret, never in the codebase
gh secret set BING_WEBMASTER_API_KEY
```

Or via the UI: repository → **Settings** → **Secrets and variables** → **Actions**
→ **New repository secret**, name `BING_WEBMASTER_API_KEY`.

With the secret present, `scripts/index-check.mjs` switches from scraping to the
API and the weekly report gains a real row:

```
| Bing (Webmaster API) | **12** of 51 checked | +3 |
| — crawled (has a crawl date) | 9 | — |
```

### What it measures, precisely

The API has **no aggregate "indexed pages" endpoint** — there is no field that
returns a site-wide total. What it does have is `GetUrlInfo(siteUrl, url)`, which
returns Bing's index record for one URL (`HttpStatus`, `LastCrawledDate`,
`IsPage`, `DocumentSize`), or `null` when Bing does not know that URL.

So the check walks **our own 51 sitemap URLs** and counts the non-null answers.
That is a real, reproducible measurement — and more actionable than a total,
because the report lists the exact URLs Bing has not picked up yet.

Endpoints used:

| Method | Purpose |
|---|---|
| `GetUserSites` | Validates the key and confirms the site is in the account |
| `GetUrlInfo` | Index record for one URL, `null` if unknown |

Both are JSON GETs:

```
https://ssl.bing.com/webmaster/api.svc/json/GetUserSites?apikey=KEY
https://ssl.bing.com/webmaster/api.svc/json/GetUrlInfo?apikey=KEY&siteUrl=SITE&url=URL
```

The service answers `HTTP 400` with `{"ErrorCode":3,"Message":"ERROR!!! InvalidApiKey"}`
for a bad key — verified live on 31 Oct 2026, so the legacy JSON route still
responds despite the August 2026 SOAP/POX retirement. If it is ever withdrawn,
the script reports the failure in the weekly summary and falls back to the
validated scrape rather than failing the job.

A failed key is surfaced verbatim in the report:

```
> Bing Webmaster API was configured but failed: GetUserSites failed — API error 3: ERROR!!! InvalidApiKey
```
