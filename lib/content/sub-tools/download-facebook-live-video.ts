import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * /download-facebook-live-video
 *
 * Search intent: "download facebook live video after it ends", "save facebook
 * live stream". The intent is archival, and it is the one live-stream query
 * that is honest to answer: once a broadcast finishes Facebook publishes a
 * normal video object for the replay, which is exactly what the Facebook
 * resolver already reads (`/videos/<id>`, `watch/?v=`, share links).
 *
 * What this page must NOT claim: downloading a stream while it is still
 * running. There is no finished file mid-broadcast, and a tool that hands one
 * over is handing over a partial fragment. The copy says so in the first
 * sentence and again in the FAQ, because that is the difference between
 * answering this query and lying to it.
 */
export const entry: SubTool = {
  slug: "download-facebook-live-video",
  platform: "facebook",
  title: "Download Facebook Live Video After It Ends — HD MP4",
  socialTitle: "Download a Facebook Live Replay as MP4 — Full HD, No App",
  description:
    "Save a finished Facebook Live broadcast as MP4 from its replay link — full length, the quality Facebook published, no screen recording and no app or login.",
  keywords: [
    "download facebook live video",
    "facebook live video downloader",
    "save facebook live stream after it ends",
    "download facebook live replay",
    "facebook live video to mp4",
    "facebook livestream download online",
  ],
  eyebrow: "Facebook · Live replays · No app",
  h1Lead: "Facebook Live replays.",
  h1Accent: "Saved as the original MP4, not a screen recording.",
  lede:
    "Once a broadcast ends, Facebook publishes it as an ordinary video — same id, same renditions, full length. Paste that replay link and the file comes down as MP4. While the stream is still running there is no finished file to save, and this page will say that rather than hand you a fragment.",
  chips: ["After the broadcast ends", "Full length, no recording", "No login, no app"],
  facts: [
    ["When it works", "After the stream ends"],
    ["Output", "MP4, audio included"],
    ["Length", "Whole replay, not a clip"],
    ["Chat", "Not part of the video"],
  ],
  steps: [
    {
      title: "Open the replay, not the live player",
      body:
        "When a broadcast finishes, Facebook keeps the video on the page timeline and gives it a normal address: /videos/<id>, watch/?v=<id> or a share link that redirects to one of them. Copy the address from the replay page — copying it while the red LIVE badge is still showing gets you a page with no finished media behind it.",
    },
    {
      title: "Paste it, save the MP4, check the length",
      body:
        "The resolver expands share links, extracts the video id and asks Facebook for the renditions it actually published; a two-hour broadcast arrives as one long file with nothing trimmed. It streams from Facebook's CDN straight into your download manager, so compare the duration with the replay before deleting the source — a truncated large file is a dropped connection, not a short broadcast.",
    },
  ],
  notes: [
    {
      title: "Why a live stream has no file until it ends",
      body:
        "A broadcast is delivered as a continuous stream of short segments; there is no single finished object while it runs. Facebook only assembles the replay after the encoder stops and the post-processing finishes, which is why a download attempted mid-broadcast returns nothing usable. For a very long stream, the replay can take a few minutes to appear even after the broadcast drops.",
    },
    {
      title: "Group and friends-only broadcasts",
      body:
        "Public page broadcasts and public group replays resolve. Closed and secret groups, and friends-only posts, are not served to an anonymous request — no tool can read them without a session, and this one never asks for your credentials. If a group video fails while a public one works, that is the reason, not a broken link.",
    },
    {
      title: "What the replay does not contain",
      body:
        "Comments, reactions and the live chat are separate objects and are not part of the MP4. If the broadcast used Facebook's own overlays (a countdown, a comment ticker), those were rendered by the player and may not appear in the file either. Archiving the conversation means archiving the page, not the video.",
    },
  ],
  faqs: [
    {
      question: "Can I download a Facebook Live while it is still streaming?",
      answer:
        "No. During a broadcast Facebook serves segments, not a file, so there is nothing complete to save — anything claiming otherwise returns a partial fragment that usually stops playing a few seconds in. Wait for the broadcast to end and for the replay to appear on the page, then use that link. For long streams the replay can lag a few minutes behind the end of the broadcast.",
    },
    {
      question: "How do I find the link to a live video after it ends?",
      answer:
        "Open the page or profile that broadcast it and scroll to the post — Facebook keeps the replay on the timeline and in the Videos tab. Copy the address bar (it looks like facebook.com/…/videos/1234567890/) or use Share → Copy link. Both resolve here; you do not need to strip any tracking parameters first.",
    },
    {
      question: "What quality does a Live replay download in?",
      answer:
        "Whatever Facebook encoded for that broadcast — commonly 720p, sometimes 1080p when the broadcaster uploaded a high-bitrate feed, and lower for weak mobile streams. The panel prints the real resolution of each rendition rather than labelling a 360p fallback as HD, and nothing here upscales, because upscaling cannot add detail the encoder discarded.",
    },
    {
      question: "Does this work for a live video in a private group?",
      answer:
        "Only for public groups. A closed or secret group's replay is not served to an anonymous request, so no browser tool can fetch it without a logged-in session — and asking you to hand over a password to download a video would be a far worse trade than missing the file. Public page broadcasts, public group replays and personal public videos all work.",
    },
    {
      question: "Is it legal to archive someone else's live stream?",
      answer:
        "The broadcast belongs to whoever made it. Saving it for personal viewing, study or accessibility is the ordinary case; republishing it, monetising it or using it as your own footage needs the creator's permission, and a church or business service is no different. If you are archiving your own stream, you already hold the rights — keep the file as the master and upload from it.",
    },
  ],
  appName: "LAMP TIK Facebook Live Video Downloader",
  features: [
    "Saves a finished Live broadcast as one MP4",
    "Full length — the whole replay, never a clip",
    "Real resolution shown per rendition, no fake HD",
    "Share links and /videos/ links both resolve",
    "No account, no app and no screen recording",
  ],
  related: ["facebook-reels-downloader", "instagram-story-downloader", "youtube-to-mp4-1080p"],
};
