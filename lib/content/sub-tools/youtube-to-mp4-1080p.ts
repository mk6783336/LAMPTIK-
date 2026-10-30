import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Resolution intent: "youtube to mp4 1080p". The page has to answer the one
 * question that decides trust here — whether the 1080p label is real or an
 * upscaled 720p copy — so the copy is built around picking the tallest
 * rendition YouTube published instead of padding a smaller one.
 */
export const entry: SubTool = {
  slug: "youtube-to-mp4-1080p",
  platform: "youtube",
  title: "YouTube to MP4 1080p - Download HD Video Free",
  socialTitle: "YouTube to MP4 - Save the Real 1080p Stream, Not an Upscale",
  description:
    "Convert a YouTube link to MP4 up to 1080p: paste a watch, share or Shorts URL and save the HD rendition YouTube published. Free, no app, no account.",
  keywords: [
    "youtube to mp4",
    "youtube to mp4 1080p",
    "download youtube video 1080p",
    "youtube mp4 converter",
    "youtube hd download",
    "youtube video to mp4",
  ],
  eyebrow: "YouTube to MP4 - the published stream, not a screen recording",
  h1Lead: "YouTube to MP4.",
  h1Accent: "Up to 1080p, straight from the source.",
  lede:
    "A 1080p label means nothing if the file was recorded off a player. This page resolves the MP4 renditions YouTube publishes for the video, keeps the tallest one the upload actually carries, and saves it without an intermediate re-encode.",
  chips: ["MP4 H.264", "Up to 1080p", "Shorts and watch links"],
  facts: [
    ["Best height", "Up to 1080p"],
    ["Container", "MP4 / H.264"],
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
      title: "Take the tallest published rendition",
      body:
        "The resolver compares the video's MP4 renditions and keeps the highest one: 1080p when the upload carries it, 720p when that is the source ceiling. Nothing is upscaled, so a 720p video never arrives padded to a fake 1080p and bloated for it.",
    },
  ],
  faqs: [
    {
      question: "Why is my downloaded '1080p' video only 720p?",
      answer:
        "Because the upload itself tops out at 720p. YouTube stores each video in the renditions the creator's original allowed, and a 720p source has no 1080p pixels to hand out. The result panel shows the height and byte size you actually got, so the label always matches the file.",
    },
    {
      question: "Does it work for YouTube Shorts?",
      answer:
        "Yes. A /shorts/ URL resolves exactly like a watch link, and the vertical 1080x1920 frame is preserved rather than cropped into a landscape box.",
    },
    {
      question: "Is the audio included, or do I have to merge it?",
      answer:
        "Included. The saved MP4 is a muxed file with its AAC audio track already inside, so it plays in QuickTime, VLC and every phone gallery without a second step.",
    },
    {
      question: "Does a 1080p60 video stay at 60 fps?",
      answer:
        "Yes, when YouTube publishes a 60 fps rendition for that upload. The tool picks by resolution and bitrate, not by frame rate, and it never drops or blends frames, so motion stays as smooth as the source.",
    },
    {
      question: "Do I need to install anything?",
      answer:
        "No. The whole conversion runs from this page in Safari, Chrome, Firefox or Edge on iPhone, Android, Windows, macOS and Linux.",
    },
  ],
  appName: "LAMP TIK YouTube to MP4 Converter",
  features: [
    "Download YouTube videos as MP4 up to 1080p",
    "Keeps the tallest rendition the upload exposes",
    "Muxed AAC audio, no separate merge step",
    "Accepts watch, youtu.be and /shorts/ links",
    "Free with no account, app or extension",
  ],
  related: ["youtube-to-mp3", "youtube-shorts-downloader", "youtube-video-download-iphone"],
  guides: [
    { slug: "why-tiktok-video-quality-drops-after-upload", anchor: "Why video quality drops after upload" },
    { slug: "repurpose-tiktok-videos-for-youtube-shorts-instagram-reels" },
    { slug: "is-downloading-tiktok-videos-legal", anchor: "Is downloading videos legal?" },
  ],
};
