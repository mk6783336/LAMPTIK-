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

| Section | Source | Notes |
|---|---|---|
| Fill rate per zone, recent window | GA4 Data API | Default: last 3 days, ending 2 days ago |
| Baseline fill rate per zone | GA4 Data API | Default: the 14 days before the recent window |
| Auctions measured and blocked share | GA4 Data API | Blocked traffic shown, excluded from the rate |
| Placements using each zone | GA4 Data API | Answers "which slot do I fix?" |
| Verdict per zone (`ok` / `dropping` / `dead` / `blocked` / `new`) | Script | Sorted so problems come first |

The report lands in the workflow run's **Summary** tab, and the console log
carries the same table.

**A zone is flagged** when, on at least `GA4_MIN_AUCTIONS` measurable auctions:

- its fill rate falls by `GA4_DROP_POINTS` or more against the baseline, or
- it fills nothing at all — the dead-zone case, which has no delta to trip.

## One-time setup (about ten minutes)

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
   | Ad wait (ms) | `wait_ms` |

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

### 4. Store the secret and the property id

Repository → **Settings → Secrets and variables → Actions**:

| Kind | Name | Value |
|---|---|---|
| Secret | `GA4_SERVICE_ACCOUNT_JSON` | The entire key JSON (base64 also works) |
| Variable | `GA4_PROPERTY_ID` | The **numeric** property id, e.g. `123456789` |

`GSC_SERVICE_ACCOUNT_JSON` is accepted as a fallback for the secret, so one key
can serve both Search Console and GA4. The property id is under GA4 →
**Admin → Property settings**; it is a number, not the `G-…` measurement id.

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
and exits `0`; the workflow does not pass that flag on purpose, because a green
run that measured nothing is worse than a red one that says so.

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
- **Quiet zones stay quiet.** Under `GA4_MIN_AUCTIONS` there is not enough data
  to call a drop a drop, and the zone shows status `new` or `ok` rather than a
  false alarm.
- **One zone, one auction.** If several placements still share a zone key, the
  report shows them together, because that is how the network sees them. The
  fix is per-placement zones (`NEXT_PUBLIC_ADSTERRA_ZONE_*`), plus the
  `…_MOBILE` keys for the leaderboards that become 300×250 on phones — not a
  report change.
