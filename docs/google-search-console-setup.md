# Google Search Console — coverage and clicks in the weekly report

## Why this matters

Bing tells us what Bing knows. Google is where the traffic is, and Search
Console is the only place that answers two different questions:

1. **Coverage** — for each URL, Google's own verdict: indexed, crawled but not
   indexed, discovered but never crawled, or unknown to Google altogether. The
   public `site:` query cannot answer this; it returns a sample, not a status.
2. **Clicks** — how many people actually arrived from Google, and from which
   page. Coverage is a means; this is the number that decides whether the site
   earns anything.

Both are pulled in the weekly **Index Check** run, immediately after the Bing
measurement, so one Summary tab shows both engines.

## What the report contains

| Section | Source | Notes |
|---|---|---|
| Verdict counts (`PASS` / `PARTIAL` / `FAIL` / `NEUTRAL`) | URL Inspection API | One call per sitemap URL |
| Coverage-state breakdown | URL Inspection API | Google's own prose, e.g. `Crawled - currently not indexed` |
| List of URLs Google has not indexed, with last crawl date | URL Inspection API | In a collapsible block |
| Clicks / impressions / CTR / average position, last 28 days vs the 28 before | Search Analytics API | Ends 3 days ago, because Google finalises data behind today |
| Top pages by impressions | Search Analytics API | In a collapsible block |

The verdict semantics worth knowing:

- `PASS` — indexed.
- `PARTIAL` — indexed, but with an issue Google reports separately.
- `FAIL` — Google knows the URL and has excluded it (redirect, `noindex`, soft 404).
- `NEUTRAL` — Google has **no information**, which includes "discovered, not
  crawled". It does not mean the page is broken, only that no decision exists yet.

## One-time setup (about five minutes)

### 1. Enable the API

1. Open the [Google Cloud console](https://console.cloud.google.com/apis/library/searchconsole.googleapis.com)
   and pick (or create) a project.
2. Enable **Google Search Console API**. This single API covers both the
   Webmasters v3 endpoints and the URL Inspection endpoint.

### 2. Create a service account and its key

1. **IAM & Admin → Service accounts → Create service account.** Any name works;
   no roles are needed, because access comes from Search Console, not IAM.
2. Open the account → **Keys → Add key → Create new key → JSON**. The file
   downloads once; it cannot be retrieved again.

### 3. Give the service account access to the property

1. In the key JSON, copy `client_email` — it looks like
   `lamptik-gsc@your-project.iam.gserviceaccount.com`.
2. Open [Search Console](https://search.google.com/search-console) → select the
   `lamptik.online` property → **Settings → Users and permissions → Add user**.
3. Paste the service-account email and grant **Full** (or **Owner**).
   **Restricted** is not enough: the URL Inspection API is not available to
   restricted users, and every call returns `403`.

This step is the one people skip. The API does not fail with a helpful message
when it is missing — `sites.list` simply returns an empty array.

### 4. Store the secret

Repository → **Settings → Secrets and variables → Actions → New repository secret**:

| Name | Value |
|---|---|
| `GSC_SERVICE_ACCOUNT_JSON` | The **entire** JSON key file. Base64 also works. |

Optional repository **variable** (Settings → Secrets and variables → Actions →
**Variables**), only needed when the property is a URL-prefix property:

| Name | Value | When |
|---|---|---|
| `GSC_PROPERTY` | `https://www.lamptik.online/` | Only if the site is verified as a URL-prefix property. A domain property (`sc-domain:lamptik.online`) is detected automatically. |

A domain property and a URL-prefix property hold separate data, and URLs outside
the named property are rejected, so the script picks whichever property the
service account can actually see.

## Verify before trusting the schedule

```bash
GSC_SERVICE_ACCOUNT_JSON="$(cat path/to/key.json)" \
  node scripts/gsc-check.mjs
```

A healthy run prints the property, its permission level, the sitemap size, the
verdict counts and the click totals. To preview the report exactly as GitHub
renders it:

```bash
GITHUB_STEP_SUMMARY=/tmp/gsc.md GSC_SERVICE_ACCOUNT_JSON="$(cat key.json)" \
  node scripts/gsc-check.mjs && cat /tmp/gsc.md
```

Without the secret the step prints that it is unconfigured, writes a short note
to the Summary and **exits 0** — a missing optional secret never fails a
scheduled job.

## Limits and behaviour

| Limit | Value | Effect here |
|---|---|---|
| URL Inspection quota | 2 000 queries/day per property, 600/minute | 51 URLs weekly is ~2.5% of the daily allowance |
| Search Analytics | No practical limit for this volume | Two aggregate queries plus one page query per run |
| Data freshness | Clicks/impressions lag 2–3 days | The window ends 3 days ago so no day is half-counted |
| Inspected URLs per run | `GSC_URL_LIMIT`, default 60 | Raise it only if the sitemap outgrows the cap |
| Time budget | `GSC_API_BUDGET_MS`, default 240 s | A slow API yields a partial report, not a killed job |

A partial sweep is not stored as the baseline: a run with failures or a cut-off
sets `pass: null` in `.gsc-check-state.json`, so the following week's delta is
never computed against a lower bound.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `token exchange failed: Invalid grant: account not found` | Key from a deleted service account, or a truncated secret | Recreate the key and replace the secret |
| `token exchange failed: invalid_grant` with `Invalid JWT Signature` | Secret was edited or line breaks were lost | Re-paste the raw JSON, or base64-encode it |
| `the service account has access to no lamptik.online property` | Step 3 was skipped, or the wrong Google account verified the site | Add the `client_email` under the property's Users and permissions |
| `Google Search Console was configured but failed: … 403` | Service account added as **Restricted** | Change it to Full or Owner |
| Clicks are 0 while impressions are not | Ranking on page 2+, or the wrong query intent | Expected early on; coverage must come first |
| `Property … inspected 0 of 51` | Every inspection failed — usually the 403 above | Check the note under the coverage table for the first error |

## Related

- [`docs/bing-webmaster-setup.md`](bing-webmaster-setup.md) — the Bing half of the same report.
- [`.github/workflows/index-check.yml`](../.github/workflows/index-check.yml) — schedules both.
- [`scripts/gsc-check.mjs`](../scripts/gsc-check.mjs) — the implementation.
