import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * /instagram-story-downloader — targets the story/highlight intent, which is
 * a different query (and a different failure mode) from Reels: stories expire
 * after 24 hours but highlights persist, and both are vertical, sound-first
 * clips that the Reels resolver handles through the same protected-media path.
 */
export const entry: SubTool = {
  slug: "instagram-story-downloader",
  platform: "instagram",
  title: "Instagram Story Downloader — Save Stories in HD",
  socialTitle: "Instagram Story & Highlights Downloader — Save in Full HD",
  description:
    "Download Instagram stories and highlights in full HD MP4 before they vanish after 24 hours. Paste a story or highlight link, save the original file free — no login.",
  keywords: [
    "instagram story downloader",
    "download instagram stories",
    "instagram highlights downloader",
    "save instagram story video",
    "instagram story saver HD",
    "download instagram story without login",
  ],
  eyebrow: "Instagram · Stories & highlights · Free",
  h1Lead: "Instagram stories.",
  h1Accent: "Saved before they expire.",
  lede:
    "Stories disappear after 24 hours and highlights disappear with the account. Paste a story or highlight link and keep the original vertical clip — audio included, quality untouched.",
  chips: ["Stories + highlights", "HD 1080p vertical", "Photos too"],
  facts: [
    ["Cost", "Free"],
    ["Login", "Not required"],
    ["Quality", "Source HD"],
    ["Formats", "MP4 + JPG"],
  ],
  steps: [
    {
      title: "Copy the story link from Instagram",
      body:
        "Open the story, tap the three-dot menu and choose Copy link (or share the highlight to yourself and copy that URL). The link contains the story media id, which is what we resolve — the public profile is never crawled.",
    },
    {
      title: "Resolve, preview, save",
      body:
        "The resolver returns the story's own media object: an MP4 for video stories, a JPG for photo stories, with the original aspect ratio. Tap the download button and the file lands in your gallery named after the account and timestamp.",
    },
  ],
  faqs: [
    {
      question: "Can I download a story after the 24 hours are over?",
      answer:
        "Only if it was saved to a highlight. Stories that were never highlighted are deleted from Instagram's servers and cannot be recovered by any tool. Highlight media stays available for as long as the account keeps the highlight, which is why highlight links keep working months later.",
    },
    {
      question: "Do I need to log in or follow the account?",
      answer:
        "No. There is no Instagram login, no cookies and no follower requirement. You paste a public story or highlight link and the resolver reads the media that the link already points to.",
    },
    {
      question: "Why does a private account story fail?",
      answer:
        "Private stories are served only to approved followers, so the media URL is not public. No downloader can fetch them without the account owner's session, and any site claiming otherwise is asking for your password — do not give it.",
    },
    {
      question: "Are photo stories supported?",
      answer:
        "Yes. Photo stories and photo highlights are saved as JPG at the resolution Instagram served, without the on-screen stickers or text overlays being re-rendered — you get the composited frame exactly as viewers saw it.",
    },
    {
      question: "Does the download keep the original audio?",
      answer:
        "Yes. Video stories are downloaded as the original MP4, so the music track, voice-over and any added audio stay in sync. Nothing is re-encoded, so there is no quality loss and no audio drift.",
    },
  ],
  appName: "LAMP TIK Instagram Story Downloader",
  features: [
    "Instagram stories saved as MP4 before the 24-hour expiry",
    "Highlight albums downloaded at full resolution",
    "Photo stories saved as JPG",
    "Original audio track preserved, no re-encode",
    "No Instagram login or follower requirement",
    "Free and unlimited, in any browser",
  ],
  related: [
    "instagram-reels-download-without-login",
    "instagram-reels-download-iphone",
    "facebook-reels-downloader",
  ],
};
