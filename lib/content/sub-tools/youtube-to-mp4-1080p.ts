import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Resolution intent: "youtube to mp4 1080p".
 *
 * The page was written around picking the tallest rendition, which assumed a
 * 1080p file existed to pick. It does not: YouTube ships 1080p as a video-only
 * DASH track plus a separate audio track, and this site neither merges nor
 * transcodes. Measured 2026-11-13 against the live resolver, three sources —
 * "Me at the Zoo" (240p), a 1080p music video and a 4K 60 fps upload — all came
 * back as the same 640×360 muxed MP4. So the page keeps the query in its
 * keywords and answers it honestly instead of labelling the file 1080p.
 */
export const entry: SubTool = {
  slug: "youtube-to-mp4-1080p",
  platform: "youtube",
  title: "YouTube to MP4 1080p - What You Actually Get",
  socialTitle: "YouTube to MP4 - Measured 640×360, Not 1080p",
  description:
    "Convert a YouTube link to MP4. Measured 2026-11-13: the resolver returns one muxed 640×360 file even for 1080p and 4K uploads. No fake 1080p label, no upscale.",
  keywords: [
    "youtube to mp4",
    "youtube to mp4 1080p",
    "download youtube video 1080p",
    "youtube mp4 converter",
    "youtube hd download",
    "youtube video to mp4",
  ],
  eyebrow: "YouTube to MP4 - the file that arrives, measured",
  h1Lead: "YouTube to MP4.",
  h1Accent: "640×360, and here is why.",
  lede:
    "YouTube does not store 1080p as one file. It ships a video-only track and a separate audio track, and putting them together is a transcode this site does not run. What it can hand you is the muxed MP4 YouTube still serves to a plain player — and on 2026-11-13 that measured 640×360 for a 240p clip, a 1080p music video and a 4K 60 fps upload alike. This page labels the file with the height it has.",
  chips: ["MP4 H.264", "640×360 measured", "Watch and /shorts/ links"],
  facts: [
    ["Delivered height", "640×360 (measured 2026-11-13)"],
    ["Why not 1080p", "1080p is a separate video track"],
    ["Audio", "AAC, muxed"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Paste the watch, share or /shorts/ link",
      body:
        "All three URL shapes resolve to the same video ID, so a youtu.be share copied on a phone works without editing. Playlist and channel links are rejected up front because there is no single stream behind them.",
    },
    {
      title: "Take the one file the resolver returns",
      body:
        "There is no quality picker because there is no second file. The resolver returns YouTube's muxed progressive MP4 — the only stream that already carries its own audio — and the panel labels it with the height it really has. Nothing is upscaled, so a small file never arrives wearing a 1080p name.",
    },
  ],
  faqs: [
    {
      question: "Why is my downloaded video 640×360 and not 1080p?",
      answer:
        "Because 1080p is not a single downloadable file on YouTube. Above 720p the platform publishes a video-only track and a separate audio track, and joining them means re-encoding on a server. This site does not do that, so it serves the muxed MP4 that already plays with sound — measured at 640×360 on 2026-11-13 for a 240p clip, a 1080p music video and a 4K 60 fps upload alike.",
    },
    {
      question: "Does it work for YouTube Shorts?",
      answer:
        "Yes. A /shorts/ URL resolves exactly like a watch link and returns the same muxed MP4. The frame is whatever that stream carries — 640×360 in the same measurement — so a vertical Short is not relabelled as 1080×1920.",
    },
    {
      question: "Is the audio included, or do I have to merge it?",
      answer:
        "Included. The saved MP4 is a muxed file with its AAC audio track already inside, so it plays in QuickTime, VLC and every phone gallery without a second step. That is the whole reason the file is 360p rather than 1080p: the audio is already in it.",
    },
    {
      question: "Can I pick 1080p or 720p?",
      answer:
        "No, and no downloader can offer you a real 1080p file without merging tracks server-side. A page that shows a 1080p button for a file like this one has either re-encoded it or renamed a smaller stream. This page shows the single file it has, with its measured height, so what you see is what lands in your downloads folder.",
    },
    {
      question: "Do I need to install anything?",
      answer:
        "No. The whole conversion runs from this page in Safari, Chrome, Firefox or Edge on iPhone, Android, Windows, macOS and Linux.",
    },
  ],
  appName: "LAMP TIK YouTube to MP4 Converter",
  features: [
    "Saves YouTube's muxed MP4 — 640×360 in the 2026-11-13 measurement",
    "No 1080p label on a 360p file and no upscale",
    "Muxed AAC audio, no separate merge step",
    "Accepts watch, youtu.be and /shorts/ links",
    "Free with no account, app or extension",
  ],
  related: ["youtube-to-mp3", "youtube-shorts-downloader", "youtube-video-download-iphone"],
  formatGuide: "containers",
  guides: [
    { slug: "why-tiktok-video-quality-drops-after-upload", anchor: "Why video quality drops after upload" },
    { slug: "download-tiktok-video-without-watermark" },
    { slug: "is-downloading-tiktok-videos-legal", anchor: "Is downloading videos legal?" },
  ],
};
