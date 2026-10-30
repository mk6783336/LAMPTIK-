import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Shorts-to-audio intent. Shorts are the same videos at a different URL, so
 * the useful answer is not "yes it works" but what the source audio really
 * is (usually 128-256 kbps AAC) and why a 320 kbps claim is padding.
 */
export const entry: SubTool = {
  slug: "youtube-shorts-to-mp3",
  platform: "youtube",
  title: "YouTube Shorts to MP3 - Extract Shorts Audio",
  socialTitle: "YouTube Shorts to MP3 - Pull the Sound Without Re-encoding the Video",
  description:
    "Turn a YouTube Short into audio: paste the /shorts/ link and save the sound as M4A, or as MP3 for a smaller file that plays anywhere. Free, no app.",
  keywords: [
    "youtube shorts to mp3",
    "shorts audio download",
    "youtube shorts mp3 converter",
    "download sound from youtube shorts",
    "shorts to audio",
    "yt shorts mp3",
  ],
  eyebrow: "YouTube Shorts to MP3 - source audio, not a re-record",
  h1Lead: "YouTube Shorts.",
  h1Accent: "The sound, on its own.",
  lede:
    "A Short is a normal YouTube video in a vertical frame, so its audio is a normal YouTube audio track. This page takes that track once, without decoding the video first, and writes it out as M4A or MP3.",
  chips: ["M4A or MP3", "No video download", "Shorts, watch and share links"],
  facts: [
    ["Output", "M4A / MP3"],
    ["Source audio", "AAC, 128-256 kbps"],
    ["Length", "Up to 3 minutes"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Paste the Shorts link",
      body:
        "In the YouTube app open the Short, tap Share, then Copy link. The URL will look like youtube.com/shorts/VIDEO_ID or youtu.be/VIDEO_ID; both resolve to the same audio ladder here.",
    },
    {
      title: "Save the source track, not a video copy",
      body:
        "The resolver reads the audio stream YouTube publishes for that video. You can keep it as M4A, which is the exact AAC track, or ask for MP3 when you need the more universally accepted container. Either way the video is never downloaded or re-encoded first.",
    },
  ],
  faqs: [
    {
      question: "Can I extract audio from a YouTube Short?",
      answer:
        "Yes. Shorts expose the same audio track as a regular upload, so the extraction works exactly the same way. Only the delivery URL shape differs.",
    },
    {
      question: "Is the MP3 really 320 kbps?",
      answer:
        "It is the best rate the upload carries, and YouTube normally stores 128 to 256 kbps AAC. A converter that promises a flat 320 kbps is padding a lower-rate source, which adds file size without adding detail. The panel shows the real size so you can judge it.",
    },
    {
      question: "What is the difference between the M4A and MP3 buttons?",
      answer:
        "M4A is the untouched AAC track: smallest file, no generation loss, plays on every modern phone and player. MP3 is an encode for older car stereos and software that refuses AAC. When quality matters, take the M4A.",
    },
    {
      question: "Do I get the music and the voice?",
      answer:
        "You get the Short's mixed audio exactly as viewers hear it, including the creator's voice, music and sound effects. Stems are not published by YouTube, so they cannot be separated here.",
    },
    {
      question: "Does it work without an app on iPhone and Android?",
      answer:
        "Yes. The page runs in the browser you already have, and the finished audio lands in Files on iPhone or Downloads on Android.",
    },
  ],
  appName: "LAMP TIK YouTube Shorts to MP3 Converter",
  features: [
    "Extract audio from any public YouTube Short",
    "M4A source track or MP3 encode",
    "No video download before conversion",
    "Accepts /shorts/ and youtu.be links",
    "Free, no account, no app",
  ],
  related: ["youtube-to-mp3", "youtube-shorts-downloader", "youtube-music-to-mp3"],
  guides: [
    { slug: "tiktok-audio-bitrate-and-sound-quality", anchor: "Audio bitrate and sound quality" },
    { slug: "repurpose-tiktok-videos-for-youtube-shorts-instagram-reels" },
    { slug: "is-downloading-tiktok-videos-legal", anchor: "Is downloading videos legal?" },
  ],
};
