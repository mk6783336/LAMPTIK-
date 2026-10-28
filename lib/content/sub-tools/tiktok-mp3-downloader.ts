import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * /tiktok-mp3-downloader
 *
 * Search intent: "tiktok to mp3", "extract tiktok sound". The page has to
 * answer the one thing every visitor wonders after a bad conversion — why the
 * file they got sounds muffled — so the copy is built around the difference
 * between pulling the source audio track and re-encoding a video.
 */
export const entry: SubTool = {
  slug: "tiktok-mp3-downloader",
  platform: "tiktok",
  title: "TikTok to MP3 Converter - Original Sound, No Re-encode",
  socialTitle: "TikTok to MP3 Converter - Extract the Original Sound at Full Quality",
  description:
    "Convert TikTok videos to MP3 from the original audio track - up to 320 kbps, no video re-encode, no watermark and no sign-up. Paste a link and save the sound.",
  keywords: [
    "tiktok to mp3",
    "tiktok mp3 downloader",
    "extract tiktok sound",
    "tiktok audio download",
    "download tiktok sound without video",
    "tiktok mp3 320kbps",
  ],
  eyebrow: "TikTok to MP3 - free, no app required",
  h1Lead: "TikTok sounds.",
  h1Accent: "Pulled straight from the source.",
  lede:
    "Paste any TikTok link and get the audio as MP3 or M4A - taken from the video's own sound track rather than re-encoded from a downloaded MP4, so nothing is added and nothing is lost on the way.",
  chips: ["Original audio track", "MP3 + M4A", "No watermark"],
  facts: [
    ["Output", "MP3 / M4A audio"],
    ["Bitrate", "Up to 320 kbps"],
    ["Source", "Original audio track"],
    ["Price", "Free, no sign-up"],
  ],
  steps: [
    {
      title: "Paste the video link",
      body:
        "Copy the post in TikTok (Share, then Copy link) and paste it above. Full tiktok.com URLs plus vt.tiktok.com and vm.tiktok.com short links resolve in the same request - the redirect is followed server-side, so you never have to open a browser tab just to reveal the real URL.",
    },
    {
      title: "We take the audio, not a video conversion",
      body:
        "The resolver reads the source file TikTok's CDN serves and isolates its audio stream. That stream is handed to the encoder exactly once. Nothing is decoded from a 720p or 1080p video first, which is why the result has none of the hollow, underwater top end you hear from converters that record the video and then strip it.",
    },
  ],
  faqs: [
    {
      question: "Does this really give me a 320 kbps TikTok MP3?",
      answer:
        "It gives you the best audio that exists for that post. Many TikToks are uploaded with 128 kbps AAC, and no converter can invent detail that was never recorded - a tool that hands you a \"320 kbps\" file from a 128 kbps source has simply inflated the bitrate. When the creator uploaded a higher-quality track, that is what you receive.",
    },
    {
      question: "Why do some TikTok MP3s sound muffled?",
      answer:
        "Usually because they are a second-generation copy: the converter downloaded the watermarked MP4, played it back, and re-recorded the audio. Each of those steps loses high frequencies. LAMP TIK extracts the audio track from the source stream in one pass, so there is no re-encode and no added noise.",
    },
    {
      question: "Can I save just the sound without the video file?",
      answer:
        "Yes. Choose Download MP3 audio and only the audio is transferred - the video is never written to your device, which also makes it much faster on mobile data.",
    },
    {
      question: "Do I need to install anything for MP3 downloads?",
      answer:
        "No. Audio extraction runs entirely in the browser on this page — no app, no extension, no sign-up is required for any format here.",
    },
    {
      question: "Whose audio am I downloading, and can I repost it?",
      answer:
        "The sound belongs to the creator and often to a third-party rights holder. Download it for personal use - offline listening, edits you have permission to make - and credit the creator. Republishing someone else's audio commercially needs their permission.",
    },
  ],
  appName: "LAMP TIK TikTok to MP3 Converter",
  features: [
    "Extract the original TikTok audio track",
    "MP3 and M4A output, up to 320 kbps",
    "No video re-encode, no added noise",
    "Works with vt.tiktok.com and vm.tiktok.com short links",
    "No watermark, no account, no app required",
  ],
  related: ["tiktok-video-download-iphone", "vt-tiktok-com-downloader", "tiktok-story-downloader"],
};
