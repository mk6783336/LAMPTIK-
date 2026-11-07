import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Editing-workflow intent: "tiktok video for capcut", "download tiktok video
 * to edit", "capcut tiktok template source".
 *
 * The page exists because the query is about a *file an editor accepts*, not
 * about saving a clip to watch. TikTok already serves H.264 with AAC — the
 * pair CapCut imports without a transcode — so the honest promise is that the
 * download is editor-ready as-is, and the usual "unsupported format" blame
 * belongs to HEVC phone recordings, not to this tool.
 */
export const entry: SubTool = {
  slug: "tiktok-video-for-capcut",
  platform: "tiktok",
  title: "TikTok Video for CapCut — Clean MP4 to Edit",
  socialTitle:
    "Download a TikTok Video for CapCut — Watermark-Free H.264 MP4 That Imports",
  description:
    "Get a watermark-free TikTok clip CapCut actually imports: H.264 MP4 with AAC audio, up to 1080p. Paste the link, save the file, drop it on the timeline.",
  keywords: [
    "tiktok video for capcut",
    "download tiktok video to edit",
    "tiktok to capcut",
    "capcut tiktok video download",
    "tiktok video editing source",
    "download tiktok without watermark for editing",
    "capcut unsupported format tiktok",
  ],
  eyebrow: "TikTok → CapCut, without a transcode",
  h1Lead: "TikTok footage.",
  h1Accent: "The file CapCut opens.",
  lede:
    "CapCut imports H.264 video with AAC audio, and that is exactly what TikTok serves to its own player — so the clean download is editable as-is, on desktop and on mobile. What usually breaks an import is not the download: it is HEVC from a phone recording, or a re-uploaded clip that was already compressed twice.",
  chips: ["H.264 + AAC", "No watermark", "Up to 1080p"],
  facts: [
    ["Container", "MP4"],
    ["Video", "H.264 (AVC)"],
    ["Audio", "AAC, in the same file"],
    ["Cost", "Free"],
  ],
  steps: [
    {
      title: "Paste the post link",
      body:
        "Copy the link in TikTok (Share → Copy link) and paste it above. Full tiktok.com URLs and vt.tiktok.com / vm.tiktok.com short links both resolve — the redirect is followed server-side, so there is no need to expand the link yourself first.",
    },
    {
      title: "Save the clean MP4 and import it",
      body:
        "Download HD MP4 for the highest rendition the creator uploaded, or SD when you only need a light clip to cut against. In CapCut, New project → Import, and the file lands on the timeline with its audio already attached. No conversion step, and no separate audio file to line up.",
    },
  ],
  faqs: [
    {
      question: "Will CapCut import a TikTok video directly?",
      answer:
        "Yes, when the file is the platform's own H.264 MP4 — which is what this page hands you. CapCut's importer reads the codec inside the MP4, not the extension, and H.264/AAC is the one pair every build of CapCut supports on Windows, macOS, iOS and Android.",
    },
    {
      question: "Why does CapCut say \"unsupported format\" for my video?",
      answer:
        "Almost always because the file is HEVC/H.265 rather than H.264. iPhone recordings default to High Efficiency (HEVC) and Windows CapCut refuses them without the HEVC extension installed. A TikTok download from this page is H.264, so it does not hit that path; a screen recording or an AirDropped iPhone clip can. Re-encoding once with H.264 fixes it permanently.",
    },
    {
      question: "Does the download keep the original resolution and frame rate?",
      answer:
        "It keeps what TikTok serves publicly — commonly 720×1280 or 1080×1920, at the clip's own frame rate. TikTok re-encodes every upload, so the file is the platform's rendition rather than the creator's camera master; there is no higher-quality copy available from the link, and no tool can invent one.",
    },
    {
      question: "Is it really watermark-free, and is that fine for editing?",
      answer:
        "The watermark is composited by TikTok's own share-menu export, not baked into the stream, so the file fetched here has none. Editing your own uploads is unambiguously fine. Editing someone else's clip does not transfer their rights — the footage stays theirs, and a licensed track inside it still belongs to the rights holder wherever you publish the result.",
    },
    {
      question: "Can I edit on my phone instead of a desktop?",
      answer:
        "Yes. On iPhone the MP4 lands in Files, and CapCut's iOS build imports from there; on Android it goes to Downloads and shows up in CapCut's gallery picker. On iOS the one extra step is Files → long-press → Share → Save to Photos if you want it in the photo library as well.",
    },
    {
      question: "Do I need the audio as a separate MP3 for editing?",
      answer:
        "No — the sound is inside the MP4 and CapCut reads it as a linked audio track, which is what you want for sync. A separate MP3 only helps when you are reusing the sound on its own; that is what the TikTok MP3 page is for.",
    },
  ],
  appName: "LAMP TIK TikTok Video Downloader for CapCut",
  features: [
    "Watermark-free H.264 MP4 that CapCut imports without converting",
    "AAC audio muxed in — no separate track to sync",
    "Up to 1080p, the highest rendition TikTok publishes",
    "SD alternative for light proxy clips",
    "Short links (vt.tiktok.com, vm.tiktok.com) resolved server-side",
  ],
  related: ["tiktok-mp3-downloader", "tiktok-photo-downloader", "youtube-to-mp4-1080p"],
  guides: [
    { slug: "mp4-wont-import-capcut-premiere-pro", anchor: "why CapCut rejects an MP4" },
    { slug: "1080p-60fps-download-edit-upload-workflow" },
  ],
};
