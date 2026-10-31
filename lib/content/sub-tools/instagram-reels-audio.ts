import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Reels-audio intent, answered honestly.
 *
 * Instagram mixes the soundtrack into the video and publishes no audio-only
 * stream. The page therefore saves the Reel with its audio intact and
 * explains how to reuse or extract the sound, instead of advertising a
 * one-click MP3 that would be a transcode at best and a lie at worst.
 */
export const entry: SubTool = {
  slug: "instagram-reels-audio",
  platform: "instagram",
  title: "Instagram Reels Audio - Save the Original Sound",
  socialTitle:
    "Instagram Reels Audio - Save the Reel With Its Original Sound (No Fake MP3)",
  description:
    "Instagram has no separate audio file. Save the Reel with its original soundtrack intact, then reuse the sound on Instagram or extract MP3 from the MP4.",
  keywords: [
    "Instagram Reels audio",
    "download Instagram Reel audio",
    "Instagram original audio",
    "save Reel sound",
    "Instagram Reels MP3",
    "Instagram audio download no login",
  ],
  eyebrow: "Instagram Reels - the original track, untouched",
  h1Lead: "Instagram audio.",
  h1Accent: "The sound, straight from the Reel.",
  lede:
    "Instagram does not publish a Reel's audio as a separate file: the soundtrack is muxed into the video as an AAC track. This page saves that Reel with the audio untouched, then tells you the two honest ways to reuse the sound - Instagram's own Use audio flow, or an offline extraction from the MP4 you just saved.",
  chips: ["Original sound intact", "No login", "No fake MP3"],
  facts: [
    ["Audio track", "AAC, inside the MP4"],
    ["Separate MP3", "Not published by IG"],
    ["Works with", "Reels and video posts"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Paste the Reel link",
      body:
        "Copy the Reel in Instagram (Share then Copy link) and paste it above. Public Reels, video posts and IGTV links resolve; photo carousels do not, because there is no video or audio track to save. No Instagram account is needed on this site.",
    },
    {
      title: "Save the file that carries the sound",
      body:
        "The download is the Reel itself, MP4 with its original AAC audio - not a re-encode and not a silent video. To reuse the sound in your own Reel, tap Use audio on the original post in Instagram, which is the route the creator's rights allow. To keep an MP3 locally, extract it from the saved MP4 offline.",
    },
  ],
  faqs: [
    {
      question: "Can I download just the audio as an MP3?",
      answer:
        "Not from Instagram, because there is no audio-only stream to fetch. Any site offering a one-click Reels MP3 is either converting the video server-side or serving a different file than it claims. This page does not pretend: it gives you the Reel with the original audio, and the MP3 step happens from that file on your device.",
    },
    {
      question: "How do I turn the saved Reel into an MP3?",
      answer:
        "Use a local converter, not a website: in VLC, Media then Convert/Save and choose MP3; or with ffmpeg run: ffmpeg -i reel.mp4 -vn -c:a libmp3lame -q:a 2 sound.mp3. Both are free, work offline, and keep the file off anyone else's server.",
    },
    {
      question: "Is the audio quality reduced by downloading the Reel?",
      answer:
        "No. The MP4 is the stream Instagram serves to a browser, with its AAC track untouched, so no extra generation of loss is added. Turning that AAC into MP3 later is a lossy step, which is why saving the MP4 first is the better master to keep.",
    },
    {
      question: "Can I use someone else's Reel audio in my own Reel?",
      answer:
        "Use Instagram's own Use audio button on the post - that is what the feature is for, and it keeps attribution and licensing inside the platform. Downloading the file does not grant rights to the music; a licensed track still belongs to its rights holders, and reposting it elsewhere can be claimed.",
    },
    {
      question: "Does this work without logging in?",
      answer:
        "Yes for public Reels. Instagram hides private accounts and age-restricted posts from anonymous requests, so those links fail with a clear message rather than a loop. You never enter an Instagram password on this site.",
    },
    {
      question: "Why did I get a video when I asked for audio?",
      answer:
        "Because the sound lives inside that video. A Reel is one muxed stream: separating the audio into a new file is a transcoding job, and doing it server-side would mean re-encoding every request. The MP4 keeps the highest-quality copy; extraction takes seconds locally.",
    },
  ],
  appName: "LAMP TIK Instagram Reels Audio Saver",
  features: [
    "Save the Reel with its original AAC soundtrack intact",
    "No fake MP3 conversion and no re-encode",
    "Works with public Reels, video posts and IGTV links",
    "No Instagram login and no app",
    "Clear, offline route from the saved MP4 to MP3",
  ],
  related: [
    "instagram-story-downloader",
    "tiktok-mp3-downloader",
    "youtube-music-to-mp3",
  ],
  guides: [{ slug: "how-to-download-instagram-reels-in-hd" }],
};
