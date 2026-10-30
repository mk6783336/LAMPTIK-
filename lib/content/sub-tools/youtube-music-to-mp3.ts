import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * YouTube Music intent. The link shape is the differentiator: music.youtube.com
 * URLs carry the same video ID, so the honest answer is that the song resolves
 * like a watch link — but playlists and albums do not, because there is no
 * single audio stream behind them.
 */
export const entry: SubTool = {
  slug: "youtube-music-to-mp3",
  platform: "youtube",
  title: "YouTube Music to MP3 - Save Songs at Source Quality",
  socialTitle: "YouTube Music to MP3 - One Song, Its Own Audio Track, No Re-encode",
  description:
    "Paste a music.youtube.com or YouTube song link and save its audio as M4A or MP3. One track at a time, no re-encode from a video, no sign-up.",
  keywords: [
    "youtube music to mp3",
    "youtube music downloader",
    "download youtube music",
    "music.youtube.com mp3",
    "youtube song download mp3",
    "yt music to mp3",
  ],
  eyebrow: "YouTube Music to MP3 - songs, not screen recordings",
  h1Lead: "YouTube Music.",
  h1Accent: "Songs, at the rate they were published.",
  lede:
    "A song on YouTube Music is the same video you would open on youtube.com, with the same audio track behind it. Paste the track link and this page writes that track out once, without recording the player or stacking a second compression pass on top.",
  chips: ["music.youtube.com links", "M4A or MP3", "No re-encode"],
  facts: [
    ["Accepts", "music.youtube.com"],
    ["Output", "M4A / MP3"],
    ["Scope", "One track per link"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Copy the song link, not the playlist",
      body:
        "Open the track in YouTube Music, tap the three dots and choose Share, then Copy link. A URL that contains a playlist parameter still resolves to the song in it; a link that only points at a playlist or an album has no single audio stream and is rejected with that explanation.",
    },
    {
      title: "Take the track's own audio",
      body:
        "The resolver reads the audio stream YouTube published for that song and writes it out once. There is no decode from the video and no second lossy generation, so the file sounds like the stream the app plays rather than a copy of a copy.",
    },
  ],
  faqs: [
    {
      question: "Do music.youtube.com links work?",
      answer:
        "Yes. They carry the same video ID as the equivalent youtube.com watch link, so the resolver treats them identically. You do not need to convert the URL by hand first.",
    },
    {
      question: "Can I download a whole playlist or album?",
      answer:
        "No, and that is deliberate: a playlist URL has no single audio stream behind it. Paste one track link at a time. Bulk downloading is the fastest way to get rate-limited, and it is also where most copyright complaints originate.",
    },
    {
      question: "Why does the MP3 not say 320 kbps?",
      answer:
        "Because the source is usually 128 to 256 kbps AAC, and the tool reports what it actually produced. Re-encoding that to 320 kbps would make the file bigger and slightly worse, not better — there is no hidden detail to recover.",
    },
    {
      question: "Does it work for songs that need a subscription?",
      answer:
        "Only tracks that play without an account resolve. Premium-only or region-locked items have no public stream to fetch, and the page says so instead of returning a broken file.",
    },
    {
      question: "Do I need YouTube Music installed?",
      answer:
        "No. The link is all that matters, and the download runs in the browser on any phone or computer.",
    },
  ],
  appName: "LAMP TIK YouTube Music to MP3 Converter",
  features: [
    "Accepts music.youtube.com and youtube.com song links",
    "Keeps the published audio rate, no fake 320 kbps",
    "M4A source track or MP3 encode",
    "No app, account or extension required",
    "Free and unlimited",
  ],
  related: ["youtube-to-mp3", "youtube-to-mp4-1080p", "youtube-shorts-to-mp3"],
  guides: [
    { slug: "tiktok-audio-bitrate-and-sound-quality", anchor: "What audio compression really costs" },
    { slug: "is-downloading-tiktok-videos-legal", anchor: "Copyright and personal use" },
    { slug: "repurpose-tiktok-videos-for-youtube-shorts-instagram-reels" },
  ],
};
