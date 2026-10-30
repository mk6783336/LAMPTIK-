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
| `site:lamptik.online` on Bing | **0 results** ("There are no results") |
| Same query on DuckDuckGo (Bing index) | **0 results** |
| URLs in sitemap | 51 |
| Bingbot → `/` | `200`, no challenge |
| Bingbot → `/robots.txt` | `200`, `Allow: /` |
| Bingbot → `/sitemap.xml` | `200`, 51 `<loc>` |
| IndexNow → `www.bing.com/indexnow` | `200` (accepted) |
| IndexNow → `api.indexnow.org` | `200` (accepted) |

The site is fully crawlable and IndexNow is accepting submissions — yet nothing
is indexed. That gap is the signature of an **unverified property**: submissions
are queued but carry no crawl priority, and there is no sitemap attached
because Bing only accepts sitemaps from a verified site.

Verification is the unlock. There is no code-only fix.

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
3. Set it in Vercel → Project `lamp-tik` → Settings → Environment Variables, for
   **Production, Preview and Development**:

   ```
   NEXT_PUBLIC_BING_SITE_VERIFICATION=A1B2C3D4E5F6...
   ```

4. Redeploy, then confirm the tag is in the served HTML:

   ```bash
   curl -s https://www.lamptik.online/ | grep -o 'msvalidate\.01[^>]*'
   ```

5. Click **Verify** in Bing. The value is unique to the account and the site, so
   rotating it in Bing requires updating the variable and redeploying.

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

## Re-measuring without an account

```bash
# Pages Bing has indexed (0 = not in the index at all)
curl -s -A "Mozilla/5.0 (compatible; bingbot/2.0)" \
  "https://www.bing.com/search?q=site%3Alamptik.online" \
  | grep -c 'There are no results'
```

`1` means zero indexed; `0` means Bing has something. DuckDuckGo's HTML endpoint
`https://html.duckduckgo.com/html/?q=site%3Alamptik.online` is an independent
read of the same index and is worth checking alongside it.
