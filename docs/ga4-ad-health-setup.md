# Ad fill health — daily zone report and regression alerts

## Why this matters

A broken page is loud: it throws, it renders wrong, someone complains. A dead
ad zone is silent. The slot still reserves its space, the page still works, and
the only symptom is impressions that never happen — which shows up as "revenue
is a bit low", weeks later, with nothing to point at.

The site already reports one `ad_slot_result` event per auction
(`lib/ad-telemetry.ts`), including the zone key and one of three outcomes. The
daily **Ad Fill Health** workflow turns those events into each zone's fill rate
and compares it against that zone's own recent past, then alerts on the change.

It also keeps three unrelated things apart, because they need unrelated fixes:

| Outcome | Meaning | What it tells you |
|---|---|---|
| `filled` | A creative painted | The zone has demand |
| `timeout` | No word before the 20s deadline | No bid — the dead-zone signal |
| `blocked` | The network's tag script errored | An ad-blocker, **not** missing demand |

Fill rate is therefore `filled / (filled + timeout)`. Counting `blocked` as a
miss would make every zone look dead in proportion to how many readers block
ads, and you would replace perfectly good zones chasing a number that never
moves.

## What the report contains

The traffic block sits under the zone table and covers the identical dates,
because a fill rate is a ratio over a sample nobody sized: a zone can look like
it "dropped" when the channel feeding it simply stopped sending people. Traffic
is reporting only — it never opens an issue and never closes one.

| Section | Source | Notes |
|---|---|---|
| Fill rate per zone, recent window | GA4 Data API | Default: last 3 days, ending 2 days ago |
| Baseline fill rate per zone | GA4 Data API | Default: the 14 days before the recent window |
| Auctions measured and blocked share | GA4 Data API | Blocked traffic shown, excluded from the rate |
| Placements using each zone | GA4 Data API | Answers "which slot do I fix?" |
| Verdict per zone (`ok` / `dropping` / `dead` / `blocked` / `new`) | Script | Sorted so problems come first |
| Traffic for the same window: sessions, users, page views | GA4 Data API | Totals over the recent window |
| Where the sessions came from (source / medium) | GA4 Data API | Top 10 by sessions |
| Top pages | GA4 Data API | Top 10 by page views |

The report lands in the workflow run's **Summary** tab, and the console log
carries the same table.

**A zone is flagged** when, on at least `GA4_MIN_AUCTIONS` measurable auctions:

- its fill rate falls by `GA4_DROP_POINTS` or more against the baseline, or
- it fills nothing at all — the dead-zone case, which has no delta to trip.

## Setup status

The Google side is configured. The values below are the ones in force, so a
future run that fails can be diagnosed instead of re-derived:

| Item | Value |
|---|---|
| GA4 property | `561275135` (`hu dev`) — the stream `lamptik` carries this site's traffic |
| Measurement id | `G-8YQHV877RV` (the second property, `G-TLNZNDJD4J`, also receives page views) |
| Cloud project | `rich-atom-475012-v2` |
| Service account | `lamptik-reporting@rich-atom-475012-v2.iam.gserviceaccount.com` |
| APIs enabled | Google Analytics Data API, Google Search Console API |
| GA4 access | the account is a **Viewer** on the property |
| Search Console | the account is **Full** on `sc-domain:lamptik.online` |
| Custom dimensions | all four, event-scoped (below) |

The property id is also the script's default (`DEFAULT_PROPERTY` in
`scripts/ads-health.mjs`), so the `GA4_PROPERTY_ID` repository variable is
optional. The only outstanding item is the secret — see step 4.

### 1. Register the four custom dimensions

GA4 will not let the Data API group by an event parameter until that parameter
is registered as a custom dimension. Without this step the API answers
`400` and the job prints exactly this instruction instead of a report.

1. Open GA4 → **Admin → Custom definitions → Create custom dimension**.
2. Create each of these, scope **Event**, parameter name exactly as written:

   | Dimension name | Event parameter |
   |---|---|
   | Ad zone key | `zone_key` |
   | Ad slot | `slot` |
   | Ad outcome | `outcome` |
   | Ad wait ms | `wait_ms` |

   GA4 rejects parentheses in a dimension name (`Ad wait (ms)` fails validation
   with "must consist of letters, numbers, spaces, or underscores"), so the
   display name drops them. Only the parameter name matters to the API.

3. New dimensions can take up to 24–48 hours before they are queryable. If the
   first run reports the dimension error, wait a day and re-run — do not change
   the telemetry.

`wait_ms` is not used by the alerting rule yet; register it anyway, so the
first time you need to ask "slow auction or dead zone" the data is already
there instead of starting the clock then.

### 2. Enable the API

1. Open the [Google Cloud console](https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com)
   and pick the project that holds the service account you already use for
   Search Console.
2. Enable **Google Analytics Data API**.

### 3. Give the service account access to the property

1. If you already ran the Search Console setup, reuse that account: copy its
   `client_email` from the key JSON.
2. In GA4 → **Admin → Property access management → +** → paste the
   `client_email` → role **Viewer**. (Analyst also works; anything that can read
   reports.)
3. This is the step people skip. Without it the API answers `403` and the
   message does not mention permissions at all.

### 4. Store the secret (the one step that needs the owner)

Repository → **Settings → Secrets and variables → Actions → New repository
secret**:

| Kind | Name | Value |
|---|---|---|
| Secret | `GA4_SERVICE_ACCOUNT_JSON` | The entire key JSON (base64 also works) |

`GSC_SERVICE_ACCOUNT_JSON` is accepted as a fallback for the secret, so one key
can serve both Search Console and GA4 — if that secret already exists, nothing
else is needed.

A repository **variable** `GA4_PROPERTY_ID` is optional: the script defaults to
`561275135`. Set it only to point the report at a different property.

Once the secret is saved, run the job: **Actions → Ad Fill Health → Run
workflow**. A red run now means a real API problem, not missing configuration.

## Running it

**Scheduled:** every day at 06:20 UTC.

**On demand:** Actions → **Ad Fill Health** → *Run workflow*.

**Locally**, against the real property:

```bash
GA4_PROPERTY_ID=123456789 \
GA4_SERVICE_ACCOUNT_JSON="$(cat path/to/key.json)" \
node scripts/ads-health.mjs
```

Locally without credentials, `--skip-if-unconfigured` prints what is missing
and exits `0`. The scheduled workflow passes that flag too, and the reason is
evidence rather than preference: with the secret missing, the job exited 1
seven seconds into every run, so the red badge meant "not set up" far more
often than "a zone regressed" — the one alert this job exists to send was
buried under its own configuration noise.

The run still refuses to pass for a healthy one. It writes **Ad fill health:
not configured — this run passed without measuring anything** to the run's
Summary tab, and `configured=false` is a separate output from `alerts`, so a
missing key can never be read as a zone that recovered. Once
`GA4_SERVICE_ACCOUNT_JSON` exists, a red run means a real API or zone problem
again.

## Tuning

All optional, set as repository **variables** (Settings → Secrets and variables
→ Actions → Variables):

| Variable | Default | Effect |
|---|---:|---|
| `GA4_RECENT_DAYS` | `3` | Window whose rate is judged — shorter reacts faster, noisier |
| `GA4_BASELINE_DAYS` | `14` | The zone's own normal, measured before the recent window |
| `GA4_MIN_AUCTIONS` | `40` | Volume floor; quiet zones never alert on noise |
| `GA4_DROP_POINTS` | `20` | Percentage-point drop that counts as a regression |
| `GA4_DATA_LAG_DAYS` | `2` | Days skipped at the end, because GA4 finalises late |

## How the alert arrives

- A regression opens an issue titled **[ads] Fill rate regression**, labelled
  `ads-health`, and **fails the run**. The failed scheduled run is what makes
  GitHub email the repository owner — the issue is the record, the red run is
  the notification.
- Repeat regressions comment on the same issue instead of opening a new one.
- The first run that measures every zone back inside the thresholds comments
  and closes the issue. A run with no data does not close it: `measured` is
  reported separately from `alerts` precisely so "nothing yet" cannot be read
  as "recovered".

## Limits worth knowing

- **GA4 is not realtime here.** A day finalises up to 48h behind, so an alert
  describes the state a couple of days ago, not this morning. For "right now",
  the site's own `__lamptikAds()` inspection (dev builds) or the GA4 Realtime
  tab is the tool.
- **Traffic never fails the run.** If the traffic queries error (quota, a
  renamed dimension), the summary says so in one line and the fill-rate report
  and its alert still go out. A missing traffic table is not a reason to lose
  the dead-zone signal.
- **Quiet zones stay quiet.** Under `GA4_MIN_AUCTIONS` there is not enough data
  to call a drop a drop, and the zone shows status `new` or `ok` rather than a
  false alarm.
- **One zone, one auction.** If several placements still share a zone key, the
  report shows them together, because that is how the network sees them. The
  fix is per-placement zones (`NEXT_PUBLIC_ADSTERRA_ZONE_*`), plus the
  `…_MOBILE` keys for the leaderboards that become 300×250 on phones — not a
  report change.
