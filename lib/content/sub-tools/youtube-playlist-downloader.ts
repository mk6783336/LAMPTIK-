import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Playlist intent. The honest mechanic: a playlist is a list, not a file.
 * This page lists the videos, then hands each one to the existing
 * single-video downloader — no second extractor, no bulk ZIP.
 */
export const entry: SubTool = {
  slug: "youtube-playlist-downloader",
  platform: "youtube",
  toolKind: "playlist",
  title: "YouTube Playlist Downloader - Save Videos in Order",
  socialTitle:
    "YouTube Playlist Downloader - List a Playlist and Save Each Video in 1080p or MP3",
  description:
    "Paste a public YouTube playlist and list its videos in order. Open any one in the 1080p or MP3 downloader. No sign-up, no install and no bulk ZIP.",
  keywords: [
    "YouTube playlist downloader",
    "download YouTube playlist",
    "save YouTube playlist videos",
    "YouTube playlist MP4",
    "YouTube playlist MP3",
    "download playlist without app",
  ],
  eyebrow: "YouTube playlists - listed first, saved one by one",
  h1Lead: "A whole playlist.",
  h1Accent: "One clean file at a time.",
  lede:
    "A playlist is a list, not a single file, so a downloader that promises one ZIP is either building a second, fragile extractor or quietly dropping half your videos. This page reads the public playlist through YouTube's own browse data, keeps the creator's order, and opens each video in the same 1080p and MP3 downloader the rest of the site uses.",
  chips: ["First 50 videos", "1080p MP4 or MP3", "No sign-in"],
  facts: [
    ["Listing", "First 50 videos"],
    ["Per video", "1080p, 720p, 360p, MP3"],
    ["Bulk ZIP", "Not offered"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Paste the playlist link",
      body:
        "Any URL containing list= works: a /playlist?list=PL… link, a video shared from inside a playlist, or a music.youtube.com playlist. The page lists the first 50 public videos in the order they appear, with titles and thumbnails, so you can confirm it is the right mix before downloading anything.",
    },
    {
      title: "Open a video and pick its format",
      body:
        "Each row hands that video to the standard YouTube downloader with the link already filled in. Choose 1080p, 720p, 360p or MP3, save it, then come back for the next one. Nothing about the resolution, ad gate or file naming changes just because the video came from a playlist.",
    },
  ],
  faqs: [
    {
      question: "Can I download the whole playlist as one ZIP?",
      answer:
        "No, and it is a deliberate choice. A ZIP would force every video into one quality setting, multiply the chance that one blocked track breaks the batch, and make a 40-video playlist fail as a whole. One file at a time keeps each download independent and gives you the quality picker for every video.",
    },
    {
      question: "Why are only the first 50 videos listed?",
      answer:
        "The listing is capped at 50 so a 500-video playlist does not turn into a page that is slow on a phone. If you need a later video, open the playlist on YouTube, copy that video's own link and paste it into the downloader - it resolves exactly the same way.",
    },
    {
      question: "Do private or unlisted playlists work?",
      answer:
        "Private playlists never do: YouTube returns nothing without the owner's session. Unlisted playlists are hit and miss because the listing request is anonymous; if yours does not load, the playlist is not publicly readable. Public playlists are the supported case.",
    },
    {
      question: "Does it work with YouTube Music playlists?",
      answer:
        "Yes, as long as the link carries a list= id and the playlist is public. The videos are then saved through the standard YouTube downloader, which already handles music uploads, artwork and long DJ sets, and offers MP3 alongside MP4.",
    },
    {
      question: "Are the videos downloaded in playlist order?",
      answer:
        "The list keeps the creator's order and numbers each row, so you can work through it top to bottom. The files themselves save individually with their own titles; nothing is renamed into a sequence, which means a re-ordered playlist on YouTube cannot scramble files you already saved.",
    },
    {
      question: "Do I need a YouTube account?",
      answer:
        "No. Listing and downloading both work signed out. An account is only useful on YouTube itself if the playlist is private, and in that case this tool cannot see it either.",
    },
  ],
  appName: "LAMP TIK YouTube Playlist Downloader",
  features: [
    "List the first 50 videos of any public YouTube playlist",
    "Keep the creator's order with titles and thumbnails",
    "Open each video in the 1080p / 720p / 360p / MP3 downloader",
    "Works with share links and music.youtube.com playlists",
    "No account, no install, no bulk ZIP",
  ],
  related: [
    "youtube-to-mp4-1080p",
    "youtube-to-mp3",
    "youtube-shorts-downloader",
  ],
};
