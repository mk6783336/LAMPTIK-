/**
 * Below-the-fold SEO content for the three tool routes — and the ONLY place
 * the FAQ copy lives.
 *
 * Why one source: Google's structured-data policy requires every `FAQPage`
 * question and answer to be visible on the page. Rendering the accordion and
 * the JSON-LD from the same array makes that impossible to break.
 */

export type ToolId = "tiktok" | "instagram" | "facebook";

export interface ToolStep {
  title: string;
  body: string;
}

export interface ToolFaq {
  question: string;
  answer: string;
}

export interface ComparisonRow {
  label: string;
  ours: string;
  theirs: string;
}

export interface ToolLink {
  href: string;
  anchor: string;
  note: string;
}

export interface ToolSeo {
  eyebrow: string;
  heading: string;
  lede: string;
  /** One line of framing above the comparison table — unique per platform. */
  comparisonLede: string;
  steps: [ToolStep, ToolStep, ToolStep];
  faqs: ToolFaq[];
  comparison: ComparisonRow[];
  links: ToolLink[];
  /** Short noun used inside schema + table copy ("TikTok videos"). */
  noun: string;
}

/**
 * No table row is reused between the three tool pages. Duplicate comparison
 * copy across sibling URLs is exactly the thin-content pattern Google
 * discounts, and each platform's real failure modes are different anyway —
 * so each table names its own machinery.
 */
const TIKTOK_ROWS: ComparisonRow[] = [
  {
    label: "play vs wmplay",
    ours: "TikTok publishes two URLs per video — `play` (clean master) and `wmplay` (stamped). We request `play` and never touch the other.",
    theirs: "They fetch the share-sheet `wmplay` copy, then call it watermark-free anyway",
  },
  {
    label: "Overlay removal",
    ours: "Nothing is removed because nothing is added: no logo, no @username, no drifting watermark",
    theirs: "A baked-in logo cropped or blurred out — which also cuts your subject",
  },
  {
    label: "Original sound",
    ours: "The MP3 comes from the video's own audio track (~128 kbps), extracted — not a video re-encode",
    theirs: "Download the MP4, then transcode it to audio: two lossy generations before you press play",
  },
  {
    label: "1080p60 selection",
    ours: "The highest H.264 variant offered — 1080p and 60 fps whenever the creator uploaded it",
    theirs: "A hard 720p30 cap, or the first rendition the API happens to list",
  },
  {
    label: "vt / vm links",
    ours: "Short links are expanded server-side and the ID extracted in the same request",
    theirs: "“Invalid URL” until you open the app and copy a long link by hand",
  },
  {
    label: "Retention",
    ours: "Signed CDN URLs only — no saved links, no media copies, no download counters",
    theirs: "A growing table of every URL pasted in, and often the files themselves",
  },
];

export const TOOL_SEO: Record<ToolId, ToolSeo> = {
  tiktok: {
    eyebrow: "How it works",
    heading: "How to download a TikTok video without a watermark",
    lede: "Three steps, about three seconds. No app, no account, nothing installed.",
    comparisonLede:
      "TikTok hands out a stamped copy through its share sheet and keeps the clean master for the app. Most downloaders grab the wrong one — here is what actually differs.",
    noun: "TikTok videos",
    steps: [
      {
        title: "Paste the link",
        body: "Copy the video in TikTok (Share → Copy link) and paste it above. Full tiktok.com URLs, vt.tiktok.com and vm.tiktok.com short links all resolve — the ID is parsed server-side before any request goes out.",
      },
      {
        title: "Edge H.264 stream probe",
        body: "We ask TikTok's CDN for the source stream and verify it before you see a button: real MP4 signature, H.264 video, AAC audio, and an exact byte size. If the signed link is stale, it is re-resolved once automatically.",
      },
      {
        title: "Instant MP4 save",
        body: "Tap Download HD MP4 and the file streams straight from the CDN to your device — never through a slow re-encode. It saves under the video's original title, so your gallery stays searchable.",
      },
    ],
    faqs: [
      {
        question: "How do I download a TikTok video without a watermark?",
        answer:
          "Copy the video link in TikTok, paste it into the field at the top of this page, and choose Download HD MP4. LAMP TIK requests the original source stream from TikTok's CDN rather than the watermarked copy the share sheet saves, so the file arrives clean.",
      },
      {
        question: "Is this TikTok downloader really free?",
        answer:
          "Yes. Every download — HD MP4, SD MP4 and MP3 — is free and unlimited. There is no account, no trial, no credit card, and no download counter that runs out. The site is funded by advertising instead of subscriptions.",
      },
      {
        question: "What video quality can I download?",
        answer:
          "You get the highest resolution TikTok exposes for that post, which is 1080p Full HD for most uploads since 2022 and 720p for older ones. The result panel shows the exact quality, codec and byte size before you download, so there are no surprises.",
      },
      {
        question: "Do vt.tiktok.com and vm.tiktok.com short links work?",
        answer:
          "Yes. Paste the short link exactly as TikTok's share sheet gives it. Our server follows the redirect chain, extracts the video ID, and resolves the stream. If a redirect is blocked, the short link goes to the extractor directly.",
      },
      {
        question: "Why is the download called “no watermark” if the video is the same file?",
        answer:
          "TikTok stores two versions of every video: the clean source for playback inside the app, and a stamped copy for sharing outside it. We fetch the first. Nothing is edited or re-encoded, so the file is bit-identical to what TikTok's own player streams.",
      },
      {
        question: "Can I download on iPhone, Android and PC without an app?",
        answer:
          "Yes. LAMP TIK runs in Safari, Chrome, Firefox and Edge. On iPhone the MP4 lands in Files; on Android it saves to Downloads or Gallery; on desktop it goes to your normal downloads folder. Nothing to install and no extension needed.",
      },
    ],
    comparison: TIKTOK_ROWS,
    links: [
      {
        href: "/youtube-downloader",
        anchor: "YouTube video downloader 1080p HD",
        note: "Shorts, long videos & MP3 in full HD — no app needed.",
      },
      {
        href: "/instagram-reels-downloader",
        anchor: "Instagram Reels downloader",
        note: "Save IG Reels and videos in original HD MP4.",
      },
      {
        href: "/facebook-video-downloader",
        anchor: "Facebook video downloader HD",
        note: "Watch videos, Reels and fb.watch links — including 1GB+ files.",
      },
      {
        href: "/guides/download-tiktok-video-without-watermark",
        anchor: "Download a TikTok video without a watermark",
        note: "The full walkthrough, start to finish.",
      },
      {
        href: "/guides/download-tiktok-audio-as-mp3",
        anchor: "Download TikTok audio as MP3",
        note: "Extract the original sound at ~128 kbps.",
      },
      {
        href: "/guides/tiktok-short-links-not-working",
        anchor: "vt.tiktok.com link not working",
        note: "The four reasons short links fail, and the fix for each.",
      },
      {
        href: "/guides/download-tiktok-without-logo-iphone-android",
        anchor: "Download TikTok without the logo on iPhone and Android",
        note: "Where the file lands on each device.",
      },
    ],
  },

  instagram: {
    eyebrow: "How it works",
    heading: "How to download Instagram Reels in original HD",
    lede: "Paste a Reel link, get the exact 1080p MP4 Instagram's player streams. No login required.",
    comparisonLede:
      "Instagram serves one master file per Reel. The differences between downloaders are about whether they hand you that master intact — resolution, audio track, and whether the file plays offline at all.",
    noun: "Instagram Reels",
    steps: [
      {
        title: "Paste the link",
        body: "Copy the Reel in Instagram (••• → Copy link) and paste it above. instagram.com/reel, /reels, /p, /tv and instagr.am short links are all recognised.",
      },
      {
        title: "Edge H.264 stream probe",
        body: "The server resolves the post, pulls the highest-bitrate MP4 Instagram serves, and verifies the container and codec before a button appears — so you never save a broken or audio-less file.",
      },
      {
        title: "Instant MP4 save",
        body: "Tap Download HD MP4. The file streams from Instagram's CDN at full speed and saves under the post's caption, watermark-free, straight into your gallery.",
      },
    ],
    faqs: [
      {
        question: "How do I download an Instagram Reel without a watermark?",
        answer:
          "Open the Reel, tap ••• → Copy link, then paste it into the field above and choose Download HD MP4. Instagram's own stream has no watermark, so the saved file is clean without any extra processing.",
      },
      {
        question: "Do I need to log in or connect my Instagram account?",
        answer:
          "No. LAMP TIK only reads public posts, so there is no login, no OAuth screen and no cookie from your account involved. Private accounts cannot be downloaded, by design — that protects other people's content.",
      },
      {
        question: "What quality do Instagram Reels download in?",
        answer:
          "The original resolution Instagram stores, usually 1080×1920 (Full HD) for Reels posted after 2021. The panel shows the exact dimensions, codec and file size before you save, and the audio track is included.",
      },
      {
        question: "Can I download IGTV videos, photo posts and carousels?",
        answer:
          "IGTV and /tv links download normally. Photo posts and carousels have no video stream, so the tool tells you that clearly instead of handing you a broken file. Video posts inside a carousel download as their MP4.",
      },
      {
        question: "Is downloading Instagram videos allowed?",
        answer:
          "For your own content, yes. For other people's, only with their permission — downloading does not grant you rights to republish, and Instagram's terms still apply. LAMP TIK is independent and not affiliated with Meta.",
      },
      {
        question: "Does it work on iPhone and Android?",
        answer:
          "Yes. On iPhone, Safari saves to Files (long-press the file to move it into Photos). On Android, it lands in Downloads or Gallery. No app, no shortcut, no extension — just the browser you already have.",
      },
    ],
    comparison: [
      {
        label: "video_versions",
        ours: "We read Instagram's `video_versions` and take the progressive MP4 that already carries picture and sound in one file",
        theirs: "They pull from the DASH manifest and hand you a video-only stream — then quietly ship no audio at all",
      },
      {
        label: "DASH-only HEVC",
        ours: "Reels that only expose HEVC or VP9 over DASH are remuxed into a plain H.264 MP4 that opens anywhere",
        theirs: "A file Safari refuses to open, or a black frame with sound and no picture",
      },
      {
        label: "Audio sync",
        ours: "The original track keeps its native offset, so lip-sync survives on long Reels and slowed audio",
        theirs: "Audio joined after the fact — a few frames of drift by the last beat",
      },
      {
        label: "Reel quality",
        ours: "The highest-bitrate 1080×1920 rendition, untouched — never upscaled, never re-compressed",
        theirs: "A screen recording of the player: soft, 60 fps motion smeared to 24",
      },
      {
        label: "Login wall",
        ours: "Public posts resolve with no session, no cookie and no account link",
        theirs: "“Log in to continue”, or an extension that reads your logged-in feed",
      },
      {
        label: "Photo posts",
        ours: "Carousels and photo-only posts are detected up front and explained — never a fake .mp4",
        theirs: "A “download” that writes a 0-byte file no player will open",
      },
    ],
    links: [
      {
        href: "/youtube-downloader",
        anchor: "YouTube video downloader 1080p HD",
        note: "Shorts, long videos & MP3 in full HD — no app needed.",
      },
      {
        href: "/",
        anchor: "TikTok video downloader without watermark",
        note: "HD MP4 and MP3 from any TikTok link.",
      },
      {
        href: "/facebook-video-downloader",
        anchor: "Facebook video downloader HD",
        note: "Reels, Watch uploads and fb.watch links.",
      },
      {
        href: "/guides/how-to-download-instagram-reels-in-hd",
        anchor: "Download Instagram Reels in HD",
        note: "Device-by-device instructions and quality notes.",
      },
      {
        href: "/guides/repurpose-tiktok-videos-for-youtube-shorts-instagram-reels",
        anchor: "Repurpose videos across TikTok, Reels and Shorts",
        note: "Export specs that survive every re-encode.",
      },
      {
        href: "/guides/browser-vs-app-tiktok-downloaders-safety",
        anchor: "Are browser downloaders safer than apps?",
        note: "Why nothing needs installing.",
      },
      {
        href: "/guides/is-downloading-tiktok-videos-legal",
        anchor: "Is downloading videos legal?",
        note: "Copyright, fair use and personal use, plainly.",
      },
    ],
  },

  facebook: {
    eyebrow: "How it works",
    heading: "How to download a Facebook video in HD",
    lede: "Watch pages, page uploads, Reels and fb.watch links — including long 1GB+ files.",
    comparisonLede:
      "Facebook videos are where most downloaders quietly fail: redirect chains, size ceilings and silent quality downgrades. These are the differences you notice on the actual file.",
    noun: "Facebook videos",
    steps: [
      {
        title: "Paste the link",
        body: "Copy the video's link from Facebook (Share → Copy link) and paste it above. fb.watch and /share/v/ short links are expanded server-side, so you never have to hunt for the canonical URL.",
      },
      {
        title: "Edge H.264 stream probe",
        body: "We resolve every redirect, request the highest-bandwidth variant Facebook exposes (HD first, SD as fallback), and verify it is a real MP4 with an audio track before showing download buttons.",
      },
      {
        title: "Instant MP4 save",
        body: "Tap Download HD MP4. The stream is proxied with attachment headers, so the browser saves the file instead of opening a tab — even for hour-long uploads.",
      },
    ],
    faqs: [
      {
        question: "How do I download a Facebook video in HD?",
        answer:
          "Copy the video's link, paste it above and choose Download HD MP4. When Facebook exposes an HD variant we serve that; otherwise you get the highest-bitrate SD stream available, and the panel shows which one you are getting.",
      },
      {
        question: "Can I download long Facebook videos over 1GB?",
        answer:
          "Yes. Large uploads stream through the proxy rather than being buffered on the server, so a 1GB or hour-long Watch video downloads without a memory limit or a timeout — the same path as a short clip.",
      },
      {
        question: "Do fb.watch and share links work?",
        answer:
          "Yes. fb.watch/xxxxx and facebook.com/share/v/ links redirect several times; the server follows the chain to the canonical video URL before extracting the stream, so short links behave exactly like full ones.",
      },
      {
        question: "Why does a Facebook video sometimes fail?",
        answer:
          "Private, friends-only, group-restricted and region-locked videos have no public stream to fetch — that is a permission boundary, not a bug. Age-gated posts can also require a login cookie we deliberately never use.",
      },
      {
        question: "Is the downloaded file watermarked?",
        answer:
          "No. Facebook's own video files carry no watermark or logo overlay, and we never re-encode, so the MP4 you save is the file Facebook's player streams — original resolution, original audio.",
      },
      {
        question: "Do I need an account or an app to download Facebook videos?",
        answer:
          "Neither. LAMP TIK works in any modern browser on iPhone, Android, Windows and macOS with no login. Nothing is installed and no Facebook credentials are ever requested.",
      },
    ],
    comparison: [
      {
        label: "Candidate probing",
        ours: "Every `progressive_url` and `playable_url` candidate is probed in parallel; the fastest muxed stream wins",
        theirs: "One guessed rendition, and a spinner forever when the guess was wrong",
      },
      {
        label: "Silent VP9",
        ours: "VP9 candidates that ship without an audio track are rejected — you always get muxed H.264 + AAC",
        theirs: "A “successful” download that plays silently in QuickTime and not at all on older Androids",
      },
      {
        label: "Public Watch & Reels",
        ours: "Public Watch pages, page videos and Reels resolve; friends-only and group posts say so plainly",
        theirs: "“Enter your Facebook password to continue” — the shape of a credential phish",
      },
      {
        label: "1GB+ uploads",
        ours: "Long uploads stream through the proxy with no size ceiling and no timeout",
        theirs: "“File too large”, or a connection that dies at 80% and restarts from zero",
      },
      {
        label: "fb.watch chains",
        ours: "fb.watch and /share/v/ redirects are followed server-side — one paste, canonical URL found for you",
        theirs: "You must dig the /videos/ permalink out of the page source first",
      },
      {
        label: "HD honesty",
        ours: "HD requested first, SD as fallback, and the panel tells you which one you actually received",
        theirs: "A 360p rendition quietly labelled “HD”, with the real bitrate hidden",
      },
    ],
    links: [
      {
        href: "/youtube-downloader",
        anchor: "YouTube video downloader 1080p HD",
        note: "Shorts, long videos & MP3 in full HD — no app needed.",
      },
      {
        href: "/",
        anchor: "TikTok video downloader without watermark",
        note: "HD MP4 and MP3 from any TikTok link.",
      },
      {
        href: "/instagram-reels-downloader",
        anchor: "Instagram Reels downloader",
        note: "Original-quality Reels at full 1080p.",
      },
      {
        href: "/guides/how-to-download-large-facebook-videos-in-1080p-hd",
        anchor: "Download large Facebook videos in 1080p",
        note: "How long uploads are handled end to end.",
      },
      {
        href: "/guides/why-tiktok-video-quality-drops-after-upload",
        anchor: "Why video quality drops after upload",
        note: "Export settings that survive compression.",
      },
      {
        href: "/guides/tiktok-audio-bitrate-and-sound-quality",
        anchor: "TikTok audio bitrate and sound quality",
        note: "What compression really costs you.",
      },
      {
        href: "/guides/browser-vs-app-tiktok-downloaders-safety",
        anchor: "Browser downloaders vs APK apps",
        note: "The smallest attack surface, explained.",
      },
    ],
  },
};
