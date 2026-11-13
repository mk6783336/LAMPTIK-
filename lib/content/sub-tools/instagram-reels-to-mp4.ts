import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Format intent, not a device or login modifier: "instagram reels to mp4",
 * "save reel as mp4", "reels mp4 download".
 *
 * Instagram publishes a Reel as one progressive MP4 (H.264 + AAC muxed), which
 * is why there is no separate audio file to offer — see the Reels-audio page.
 * This page answers the format question specifically: what container, what
 * codec, what dimensions, and why the "MP4 converter" framing is a red herring
 * when the platform already serves MP4.
 */
export const entry: SubTool = {
  slug: "instagram-reels-to-mp4",
  platform: "instagram",
  title: "Instagram Reels to MP4 — The Original File, Saved As-Is",
  socialTitle:
    "Instagram Reels to MP4 — Save the Original File With Its Audio",
  description:
    "Instagram already serves Reels as MP4, so there is nothing to convert. Save the original H.264 file with its audio intact — measured 720×1280 on 2026-11-13 — no login, no watermark.",
  keywords: [
    "instagram reels to mp4",
    "reels to mp4",
    "save instagram reel as mp4",
    "instagram reel mp4 download",
    "instagram reels mp4 1080p",
    "convert instagram reel to mp4",
    "download reel without login",
  ],
  eyebrow: "Reels · already MP4, saved as-is",
  h1Lead: "Reels to MP4.",
  h1Accent: "No converter in the middle.",
  lede:
    "A Reel is not a proprietary format waiting to be converted: Instagram's player streams a progressive MP4 — H.264 video with AAC audio in the same file — so the download is a copy of that stream, not a re-encode of it. Paste a Reel, /p/, /tv/ or instagr.am link and you get the file at its published size, audio included.",
  chips: ["Original MP4", "Audio included", "No login"],
  facts: [
    ["Container", "MP4"],
    ["Video", "H.264 (AVC)"],
    ["Aspect", "9:16, 720×1280 class (measured)"],
    ["Cost", "Free"],
  ],
  steps: [
    {
      title: "Copy the Reel link",
      body:
        "In Instagram, tap Share on the Reel and choose Copy link — or copy the address bar URL on the web. Reels, video posts, /tv/ and instagr.am links all resolve. Carousels that contain only photos are refused on purpose: there is no video stream behind them, so a \"download\" would write an empty file.",
    },
    {
      title: "Save the MP4 you were already streaming",
      body:
        "The result panel offers the file with its resolution and size shown before you commit, then hands it to your browser's download manager. On a phone that means Files on iOS and Downloads on Android; nothing is buffered by this site and no file is stored after your session.",
    },
  ],
  faqs: [
    {
      question: "Do I need an MP4 converter for a Reel?",
      answer:
        "No. Instagram serves Reels as MP4 (H.264 + AAC) to its own web player, so a \"converter\" would be re-encoding a file that already has the format you want — and every re-encode loses quality. Saving the original stream is both faster and cleaner.",
    },
    {
      question: "Where is the Reel's audio?",
      answer:
        "Inside the same MP4, as an AAC track. Instagram publishes no audio-only stream, so any site advertising a one-click Reels MP3 is converting the video server-side or serving something else. If you only want the sound, save the MP4 and extract the audio locally — the Reels-audio page walks through both routes.",
    },
    {
      question: "What resolution and aspect ratio do I get?",
      answer:
        "Whatever Instagram published: Reels are 9:16, usually 1080×1920, and the older ones can be 720×1280. The file is vertical, so a horizontal player will letterbox it — the dimensions are shown in the result panel before the download starts.",
    },
    {
      question: "Why did a private or age-restricted Reel fail?",
      answer:
        "Instagram only serves those media URLs to an authenticated session that already has permission to view the post. There is nothing public to fetch, so the resolve fails with a message instead of looping. This page never asks for an Instagram password — any tool that does is harvesting credentials.",
    },
    {
      question: "Does the saved file carry a watermark?",
      answer:
        "No. The MP4 is the stream Instagram sends a browser to play; the username overlay you sometimes see is drawn by the app UI or added when a video is reposted through a third-party saver. Saving the original stream gives you the file without that overlay.",
    },
    {
      question: "Can I re-upload the MP4 somewhere else?",
      answer:
        "Technically yes, but the rights do not travel with the file. The creator owns the footage and the music is licensed to that post, so republishing is a copyright question rather than a technical one. For your own uploads, or with the creator's permission, there is nothing in the file to stop you.",
    },
  ],
  appName: "LAMP TIK Instagram Reels MP4 Downloader",
  features: [
    "Saves the original progressive MP4 Instagram streams (no re-encode)",
    "H.264 video with AAC audio in one file",
    "Native 9:16 1080×1920 quality where the creator published it",
    "Works with /reel/, /p/, /tv/ and instagr.am links",
    "No login, no app, nothing stored after the session",
  ],
  related: ["instagram-reels-audio", "tiktok-video-for-capcut"],
  guides: [
    {
      slug: "download-tiktok-video-without-watermark",
      anchor: "Download the Reel from its source stream",
    },
    { slug: "why-tiktok-video-quality-drops-after-upload", anchor: "if the MP4 will not import" },
  ],
};
