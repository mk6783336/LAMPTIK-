import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Country intent, German edition — in English, on purpose.
 *
 * The site already has a German-language landing at /de. This page is the
 * English-language answer for readers in Germany, and its job is to name the
 * two blocks that are genuinely German: the UrhG private-copy rule under §53,
 * and a licensing-driven region lock that people routinely misdiagnose as a
 * broken downloader. It mounts the YouTube downloader, the platform where both
 * of those bite hardest.
 */
export const entry: SubTool = {
  slug: "download-videos-germany",
  platform: "youtube",
  title: "YouTube Video Downloader Germany - MP4 & MP3",
  socialTitle: "YouTube Video herunterladen - MP4 and Honest MP3 for Germany",
  description:
    "Download YouTube videos in Germany as MP4 or MP3: paste the link, no app. Region locks and DRM are named, not bypassed. TikTok video herunterladen too.",
  keywords: [
    "youtube downloader germany",
    "youtube video herunterladen",
    "youtube video download germany 1080p",
    "youtube to mp3 germany",
    "tiktok video herunterladen",
    "tiktok video download ohne wasserzeichen",
    "youtube video downloader kostenlos",
  ],
  eyebrow: "Germany · YouTube herunterladen · MP4 + MP3",
  h1Lead: "YouTube video downloader,",
  h1Accent: "One MP4, and an honest MP3.",
  lede:
    "The request in Germany is usually typed as \"YouTube video herunterladen\" — this is the English answer, with the German-language landing at /de. Paste a watch, /shorts/, youtu.be or music.youtube.com link and save the MP4 YouTube published, or one honest MP3 of its audio with the bitrate actually received. TikTok, Reels and Facebook sit one tap below. Region locks and DRM are reported, not routed around.",
  chips: ["YouTube first", "MP4 + MP3", "No app"],
  facts: [
    ["Copyright basis", "UrhG · §53 private copies"],
    ["DRM", "§95a — not bypassed"],
    ["Audio", "What YouTube serves, not 320k"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Paste any YouTube link shape",
      body:
        "watch?v=, /shorts/<id>, youtu.be/<id> and music.youtube.com/watch?v= all resolve to the same video, and the link can arrive with playlist, tracking or timestamp parameters attached — they are stripped before the request. A channel URL is not a video; a playlist is a list, and the playlist page lists its items instead of returning whichever video happened to be first.",
    },
    {
      title: "Pick MP4 or MP3, and read the bitrate",
      body:
        "MP4 gives you the muxed rendition YouTube serves; measured on 2026-11-13 that was 640×360 even for a 4K upload, because above 720p the platform splits video and audio into separate tracks. MP3 gives you one encode from the source audio track, and the tool reports the bitrate it actually received — typically around 128 to 160 kbps, because that is what YouTube uploads carry. A converter advertising a fixed 320 kbps is padding the same audio into a larger container: more bytes, no more detail.",
    },
  ],
  notes: [
    {
      title: "UrhG in plain terms",
      body:
        "German copyright is stricter than US fair use. Section 44a permits temporary, incidental reproductions that are part of a lawful use. Section 53 permits private copies for personal use, including for a small circle of people you know personally, but not public distribution and not copies made from an obviously unlawful source. Section 95a separately prohibits circumventing technical protection measures, so breaking DRM is its own violation regardless of what §53 would allow. This is the framework, not legal advice for your case.",
    },
    {
      title: "\"In deinem Land nicht verfügbar\" is not a bug",
      body:
        "That message means YouTube geo-restricted the upload — music licensing, sports rights and broadcaster deals are the usual causes, and the GEMA-era blockades made the wording famous in Germany. The resolver reports the block; it does not route around it through another country. A VPN can change the region the server sees, and it still does not make the file yours to use, which is why this page does not offer one.",
    },
    {
      title: "Two German-language details worth knowing",
      body:
        "The site's German landing lives at /de and explains the same resolver in German — useful if the query was typed in German. And the privacy questions German readers ask first are answered on the site itself rather than in a banner: no account, no app install, no login handed to a third party, and the ad and consent setup is described in the privacy page instead of being buried.",
    },
  ],
  faqs: [
    {
      question: "Is downloading a YouTube video legal in Germany?",
      answer:
        "Section 53 UrhG allows private copies for personal use, and downloading from what is obviously an unlawful source is excluded; uploading, sharing or monetising the copy is outside the exception entirely. Section 95a prohibits circumventing DRM as a separate matter. Widely done and rarely pursued is not the same as permitted — the framework is described here, not applied to your situation.",
    },
    {
      question: "Can this get around a region-locked video?",
      answer:
        "No. When YouTube answers that a video is unavailable in your country, the resolver reports that answer rather than proxying the request through another region. The restriction is part of the licence the uploader agreed to; a downloader that claims to bypass it is either failing quietly or doing something you should not rely on.",
    },
    {
      question: "Why is my MP3 not 320 kbps?",
      answer:
        "Because YouTube does not serve 320 kbps audio. Its audio tracks sit around 128 to 160 kbps, so a 320 kbps file made from one is the same signal in a bigger container. You can have the source M4A, or one honest MP3 encode of it, with the measured bitrate shown rather than a label.",
    },
    {
      question: "Do I need to install anything in Germany, or accept cookies?",
      answer:
        "Nothing to install — the download runs in the browser you already have open. The site's consent banner is there for the advertising and analytics parts, and the tool itself works without granting it; refusing consent does not disable the download.",
    },
    {
      question: "Does it work for ARD, ZDF or other German broadcasters?",
      answer:
        "No. Those players use DRM and, for much of their catalogue, a time-limited availability window that is enforced server-side. This page handles public, unencrypted streams — YouTube, TikTok, Instagram and Facebook — and says so rather than offering a button that cannot work.",
    },
    {
      question: "Wie lade ich ein YouTube-Video in Deutschland herunter?",
      answer:
        "Link kopieren, oben einfügen, dann MP4 oder MP3 wählen — ohne App, Konto oder Wasserzeichen. Regionalsperren und DRM werden gemeldet, nicht umgangen; die deutschsprachige Seite dafür ist /de.",
    },
  ],
  appName: "LAMP TIK - YouTube Video Downloader (MP4 & MP3)",
  features: [
    "YouTube MP4, Shorts and youtu.be links",
    "MP3 with the bitrate actually received",
    "music.youtube.com recognised without rewriting",
    "TikTok, Reels and Facebook from one page",
    "No app, account or install",
    "Free and unlimited",
  ],
  related: [
    "download-videos-united-states",
    "download-videos-united-kingdom",
    "download-videos-canada",
  ],
  relatedHeading: "The same page for another country",
  guides: [
    {
      slug: "download-tiktok-audio-as-mp3",
      anchor: "Why 320 kbps is a container, not detail",
    },
    { slug: "is-downloading-tiktok-videos-legal" },
    { slug: "why-tiktok-video-quality-drops-after-upload" },
  ],
};
