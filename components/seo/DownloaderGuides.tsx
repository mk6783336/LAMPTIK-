import { howToNode, JsonLd } from "@/components/seo/JsonLd";
import { siteUrl } from "@/lib/site";

/**
 * `DownloaderGuides` — the reusable content silo under a downloader.
 *
 * Three jobs, and all three exist because the page above it is a tool, not an
 * article: a comparison matrix that answers "which file should I pick", a
 * four-step ordered list (copy → paste → choose → save) that is also valid
 * `HowTo` markup, and the troubleshooting block for the one failure every
 * phone hits — the file saved, but it is not where the visitor expects.
 *
 * Copy is per variant, never one paragraph pasted across pages: Google reads
 * three near-identical matrices under three different URLs as thin content,
 * which is the exact thing this page is meant to fix.
 *
 * Rendering rules it obeys: no table element wider than 390px (each row is a
 * stacked card, two value columns at every width), 12px type floor, and every
 * number below is a property of the container format, not a promise about a
 * particular upload.
 */

export type GuideVariant = "audio" | "containers" | "story";

interface Matrix {
  heading: string;
  lead: string;
  columns: readonly [string, string];
  rows: ReadonlyArray<readonly [string, string, string]>;
  footnote: string;
}

interface GuideContent {
  anchor: string;
  heading: string;
  lede: string;
  matrix: Matrix;
  steps: ReadonlyArray<readonly [string, string]>;
  troubleshooting: ReadonlyArray<readonly [string, string]>;
}

const GUIDES: Record<GuideVariant, GuideContent> = {
  audio: {
    anchor: "audio-formats",
    heading: "128 kbps, 320 kbps, M4A and MP3 — what the file really is",
    lede:
      "An audio download cannot be better than the track the platform stored. What you choose here is how much of it survives the copy: the bitrate and the container decide whether the file is a clean copy of the source or a second generation of it.",
    matrix: {
      heading: "128 kbps MP3 against 320 kbps MP3",
      lead:
        "Same music, different amount of it. The bitrate is how many bits describe each second of sound, so the file size difference below is arithmetic, not marketing.",
      columns: ["128 kbps MP3", "320 kbps MP3"],
      rows: [
        ["A 3-minute track", "about 2.8 MB", "about 7.2 MB"],
        ["Highest frequency kept", "around 16 kHz", "around 20 kHz"],
        ["Sounds right for", "speech, podcasts, voice notes", "music, DJ sets, archiving"],
        ["Cymbals and sibilance", "smear into a hiss", "stay separate"],
        ["If the source was 128", "no loss at all", "no gain, only a bigger file"],
      ],
      footnote:
        "320 kbps does not restore detail that was never there. If the uploaded audio was already compressed at 128 kbps, encoding it at 320 only makes the file larger — the honest choice is the one closest to the source.",
    },
    steps: [
      ["Copy the post link", "Share → Copy link inside the app. A profile URL is not a post, so copy from the video itself."],
      ["Paste it into the field above", "The platform is detected from the URL; TikTok, Instagram, Facebook and YouTube links all resolve."],
      ["Choose MP3 320 or M4A", "M4A is the audio stream the platform serves and needs no re-encode. MP3 320 is the same audio re-wrapped for players that still ask for MP3."],
      ["Save the file", "The browser's download manager takes it from there — no app, no account, nothing stored on this site."],
    ],
    troubleshooting: [
      [
        "iPhone: the file is in Files, not Photos",
        "Safari saves downloads to Files → On My iPhone → Downloads (or iCloud Drive → Downloads). Music is not a photo, so it never appears in the Photos app — open Files, tap the file and share it into whatever player you use. If Files shows an empty Downloads folder, the download was blocked by private browsing: leave Private mode and repeat.",
      ],
      [
        "Android: check the Downloads app, then Gallery",
        "Chrome writes to /storage/emulated/0/Download, which the Files/Downloads app lists immediately. Gallery apps only index folders they watch for media, so a fresh MP3 can be missing from Gallery for a few minutes — pull down to refresh, or open it from Files once and the media scanner picks it up.",
      ],
      [
        "“Download failed” with plenty of space",
        "Two common causes: the phone is on a captive-portal Wi-Fi that intercepts the file request, or the browser has been denied storage permission. Switch to mobile data once to confirm which; if it then saves, the network was rewriting the response.",
      ],
    ],
  },
  containers: {
    anchor: "video-formats",
    heading: "MP4 or WebM — the container decides where the file will open",
    lede:
      "Both hold the same video. The difference is who agrees to play it: MP4 with H.264 is the format every phone, editor and upload form accepts, while WebM is smaller and open but frequently refused at the last step.",
    matrix: {
      heading: "MP4 (H.264 + AAC) against WebM (VP9 + Opus)",
      lead:
        "A 1080p clip is a 1080p clip inside either container. What changes is compatibility, file size at equal quality, and whether the destination app will import it at all.",
      columns: ["MP4 · H.264", "WebM · VP9"],
      rows: [
        ["iPhone Photos", "imports and plays", "usually refuses to import"],
        ["Premiere, Final Cut, CapCut", "native", "supported, slower to scrub"],
        ["Instagram / TikTok upload", "accepted", "often re-encoded or rejected"],
        ["Size at equal quality", "baseline", "roughly 20–35% smaller"],
        ["Browser playback", "everywhere", "Chrome, Firefox, Edge — not older Safari"],
      ],
      footnote:
        "When a platform offers both, take MP4 unless the file is only ever going to sit in a browser. This site asks the CDN for the MP4 the platform published, so a 1080p choice is a real 1920×1080 stream — never an upscale of a 720p one.",
    },
    steps: [
      ["Copy the video link", "Share → Copy link, or copy the address bar. Watch, share and /shorts/ links are all read the same way."],
      ["Paste it above", "The link is parsed server-side before anything is fetched, so a malformed or non-video URL is rejected instead of half-resolved."],
      ["Pick the rendition", "Every height the platform actually published is listed with its resolution and bitrate. The tallest real rendition is first, and a 720p fallback is never labelled HD."],
      ["Save the MP4", "The file streams from the CDN straight into your download manager, sized correctly, with the video's own title as the filename."],
    ],
    troubleshooting: [
      [
        "iPhone: 1080p MP4 lands in Files, and Photos needs one more tap",
        "Safari downloads go to Files → Downloads. To get the clip into the camera roll, open it there and choose Share → Save Video; dragging it into Photos from the Files share sheet is the step people miss. A WebM never appears in Photos at all, which is the practical reason to prefer MP4.",
      ],
      [
        "Android: the file is in /Download, Gallery may lag",
        "Chrome writes to the Download folder and the Files app shows it at once. Gallery apps index on a media scan, so a large MP4 can take a few seconds to appear; opening it once from Files is enough to register it.",
      ],
      [
        "The video plays but has no sound",
        "That means the chosen file is a video-only rendition. Progressive MP4s carry both tracks; the separate video-only stream does not. Pick the MP4 that lists an audio codec rather than the highest video-only resolution.",
      ],
    ],
  },
  story: {
    anchor: "story-format",
    heading: "Photo slides, video slides, and the 24-hour window",
    lede:
      "A story is not one file. It is a sequence of slides that each expire, and a photo slide and a video slide leave the platform by different routes — which is why a link that works for one can return nothing for the other.",
    matrix: {
      heading: "Photo slide against video slide",
      lead:
        "Both are saved at the resolution the creator uploaded. Neither carries the username tag, because the tag is drawn by the app when it renders a story, not baked into the media file.",
      columns: ["Photo slide", "Video slide"],
      rows: [
        ["Saved as", "JPEG/WebP at upload size", "MP4 with its own audio"],
        ["Watermark / username tag", "none in the file", "none in the file"],
        ["Expires after", "24 hours from posting", "24 hours from posting"],
        ["Stickers and text", "part of the uploaded image", "part of the uploaded video"],
        ["Multiple slides", "one link per slide", "one link per slide"],
      ],
      footnote:
        "“Original resolution” means the file the creator's phone uploaded. If the story was recorded at 720p, the download is 720p — nothing here upscales, and a tool that claims otherwise is resampling pixels it does not have.",
    },
    steps: [
      ["Copy the story link", "Open the story and use Share → Copy link. A profile link (tiktok.com/@name) has no item id and cannot identify which slide you meant."],
      ["Paste it above", "The resolver expands the short link and reads the story item, so the slide you were looking at is the one that comes back."],
      ["Choose the slide's file", "Video slides arrive as MP4 with their audio; photo slides arrive as the original image, without playback UI or overlay burned in."],
      ["Save before the window closes", "Once the 24 hours are up the media is no longer served to anyone outside the creator's archive — no tool can recover it after that."],
    ],
    troubleshooting: [
      [
        "iPhone: where a saved story actually goes",
        "Files → On My iPhone → Downloads for both photos and video. Photos needs Share → Save Video (or Save Image) from there; a JPEG saved through Safari does not appear in the camera roll by itself. If the story is a photo, saving it from Files into Photos keeps the original pixels — screenshots do not.",
      ],
      [
        "Android: Downloads first, Gallery second",
        "Chrome stores the file in /Download and the Files app lists it immediately; the Gallery picks it up on the next media scan. A story video that “did not download” is usually sitting there already.",
      ],
      [
        "The link worked minutes ago and now returns nothing",
        "That is the 24-hour window closing, not a broken tool. Expired stories answer with an empty item rather than an error, because the platform stops serving the media entirely. Save while the story is live.",
      ],
    ],
  },
};

export function DownloaderGuides({
  variant,
  pageUrl,
  updatedAt,
}: {
  variant: GuideVariant;
  /** Canonical URL of the page this block sits on — used by the HowTo node. */
  pageUrl: string;
  /** ISO date of the last content edit for this block. */
  updatedAt?: string;
}) {
  const guide = GUIDES[variant];
  const url = pageUrl || siteUrl;

  const jsonLd = howToNode({
    id: `${url}/#${guide.anchor}-howto`,
    name: guide.heading,
    description: guide.lede,
    steps: guide.steps.map(([title, body]) => ({ title, body })),
    url,
    anchor: guide.anchor,
  });

  return (
    <section id={guide.anchor} className="section-pad scroll-mt-24 border-t border-[var(--line)]">
      <JsonLd data={jsonLd} />
      <div className="shell max-w-3xl">
        <p className="eyebrow">
          <span aria-hidden="true" className="eyebrow-dot" />
          Formats and fixes
        </p>
        <h2 className="balance mt-4 text-3xl font-semibold leading-tight tracking-headline">
          {guide.heading}
        </h2>
        <p className="pretty mt-3 text-sm leading-relaxed text-[var(--text-2)]">{guide.lede}</p>

        {/* Comparison matrix. A real <table> is wrong at 390px, so each row is
            a card with the label above two value columns — the same data, no
            horizontal scroll, and still two columns at every width. */}
        <h3 className="mt-8 text-xl font-semibold tracking-headline">{guide.matrix.heading}</h3>
        <p className="pretty mt-2 text-sm leading-relaxed text-[var(--text-2)]">
          {guide.matrix.lead}
        </p>
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--glass-border)]">
          <div className="grid grid-cols-2 gap-2 bg-[var(--field-strong)] px-4 py-2.5">
            <span className="micro text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
              {guide.matrix.columns[0]}
            </span>
            <span className="micro text-xs font-semibold uppercase tracking-wide text-[var(--text-3)]">
              {guide.matrix.columns[1]}
            </span>
          </div>
          {guide.matrix.rows.map(([label, left, right], index) => (
            <div
              key={label}
              className={cnRow(index)}
            >
              <p className="micro text-xs text-[var(--text-3)]">{label}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <p className="text-sm leading-snug text-[var(--text-1)]">{left}</p>
                <p className="text-sm leading-snug text-[var(--text-1)]">{right}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="pretty mt-3 text-xs leading-relaxed text-[var(--text-3)]">
          {guide.matrix.footnote}
        </p>

        <h3 className="mt-10 text-xl font-semibold tracking-headline">Four steps, start to finish</h3>
        <ol className="mt-4 space-y-3">
          {guide.steps.map(([title, body], index) => (
            <li
              key={title}
              className="flex gap-3.5 rounded-xl border border-[var(--glass-border)] bg-[var(--field)] p-4"
            >
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] font-mono text-sm font-bold text-[var(--accent-text)]"
              >
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-semibold tracking-tight">{title}</p>
                <p className="pretty mt-1 text-sm leading-relaxed text-[var(--text-2)]">{body}</p>
              </div>
            </li>
          ))}
        </ol>

        <h3 className="mt-10 text-xl font-semibold tracking-headline">
          When the file saves but the phone cannot find it
        </h3>
        <div className="mt-4 space-y-3">
          {guide.troubleshooting.map(([title, body]) => (
            <div
              key={title}
              className="rounded-xl border border-[var(--glass-border)] border-l-2 border-l-[var(--accent)] bg-[var(--field)] p-4"
            >
              <p className="text-sm font-semibold tracking-tight">{title}</p>
              <p className="pretty mt-1.5 text-sm leading-relaxed text-[var(--text-2)]">{body}</p>
            </div>
          ))}
        </div>

        {updatedAt ? (
          <p className="mt-6 text-xs text-[var(--text-3)]">
            Format notes reviewed {updatedAt}.
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** Zebra rows without a ternary in the JSX attribute list above. */
function cnRow(index: number): string {
  return index % 2 === 0
    ? "border-t border-[var(--glass-border)] px-4 py-3"
    : "border-t border-[var(--glass-border)] bg-[var(--field)] px-4 py-3";
}
