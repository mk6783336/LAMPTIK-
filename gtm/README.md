# Google Tag Manager — `GTM-PF5KDMW4`

The site pushes two custom events onto `dataLayer` (see `lib/analytics.ts`):

| Event | Parameters |
| --- | --- |
| `download_start` | `platform`, `format` (`mp4` / `m4a` / `mp3` / `audio`), `delivery` (`proxy` / `direct` / `bridge`), `quality` (`hd` / `sd`, video only) |
| `platform_switch` | `from`, `to` |

`GTM-PF5KDMW4-events.json` is an importable container file that creates the
Data Layer variables and Custom Event triggers for those two events. **It
contains no tags on purpose.**

## Why no tags

The direct GA4 tag in `components/google-analytics.tsx` already sends both
events to `G-TLNZNDJD4J` through `gtag()`. A GA4 tag inside this container
would send them a second time to the same property, and a GA4 Configuration
tag would also duplicate every page view. So the container is set up to
*receive* the events; attach only destinations that are not already covered
by the direct tag.

If GTM should own GA4 instead, that is a migration, not an addition: remove
the `gtag('config', …)` call and the `gtagCommand("event", …)` call in
`lib/analytics.ts` first, then add the Google tag and GA4 event tags in GTM
and turn off GA4's enhanced-measurement history listener. Do not do both.

## Import (about two minutes)

1. Open <https://tagmanager.google.com> → container **`GTM-PF5KDMW4`**.
2. **Admin → Import Container → Choose container file** →
   `gtm/GTM-PF5KDMW4-events.json`.
3. Choose workspace **New**, title it `LampTik events`, click **Save**.
4. Pick **Merge**, and **Overwrite conflicting tags, triggers, and variables**.
   (Never pick Overwrite here: it replaces the whole workspace with the file.)
5. Review the preview — expect **6 variables and 2 triggers added, 0 tags** —
   then **Confirm**.
6. **Preview** → connect to `https://www.lamptik.online`, accept the consent
   bar, then paste a video and press a download button. In the Tag Assistant
   event list you should see `download_start` with the parameters above; a
   navigation between downloaders should show `platform_switch`.
7. Back in the workspace: **Submit → Publish**.

The `accountId` / `containerId` values in the file are `0` by design. The
import screen maps the file onto whichever container you import it into.

## Adding a destination later

Create the tag, fire it on `CE - download_start` or `CE - platform_switch`,
and map its fields to `{{DLV - platform}}`, `{{DLV - format}}`,
`{{DLV - delivery}}`, `{{DLV - quality}}`, `{{DLV - from}}`, `{{DLV - to}}`.
`DLV - quality` is empty for audio downloads, so never require it.
