import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Short-link intent: "vt.tiktok.com downloader". The searcher already has a
 * link that other tools reject, so the page explains the redirect chain and
 * why server-side expansion is what makes it work.
 */
export const entry: SubTool = {
  slug: "vt-tiktok-com-downloader",
  platform: "tiktok",
  title: "vt.tiktok.com Downloader - Resolve Short Links",
  socialTitle: "vt.tiktok.com Downloader - Follow the Short Link to the Real Video",
  description:
    "Paste a vt.tiktok.com or vm.tiktok.com link and get the video behind it: the redirect is followed server-side, then the watermark-free MP4 or MP3 is saved.",
  keywords: [
    "vt.tiktok.com downloader",
    "vm.tiktok.com download",
    "tiktok short link downloader",
    "download vt tiktok video",
    "tiktok short url",
    "resolve tiktok link",
  ],
  eyebrow: "vt.tiktok.com - short link, expanded server-side",
  h1Lead: "vt.tiktok.com links.",
  h1Accent: "Expanded, then downloaded.",
  lede:
    "A vt.tiktok.com link is a redirect, not a video address. This page follows that redirect on the server, pulls the numeric post ID out of the destination, and resolves the source stream — so a short link pasted from the share sheet works without opening the app.",
  chips: ["vt and vm links", "Server-side redirect", "No watermark"],
  facts: [
    ["Accepts", "vt / vm short links"],
    ["Redirect", "Followed server-side"],
    ["Output", "MP4 + MP3"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Paste the short link exactly as copied",
      body:
        "TikTok's share sheet gives you something like vt.tiktok.com/ZMxxxxx/. Do not open it in a browser and copy the address bar first: the redirect is handled here, including the mobile user agent some of those hops require. The same parser accepts vm.tiktok.com and full tiktok.com URLs.",
    },
    {
      title: "Resolve the post behind the redirect",
      body:
        "The server follows the chain to the canonical /@user/video/ID URL, extracts the ID, and requests the source stream. Only after a real MP4 is confirmed do the download buttons appear, so a dead or expired short link fails with an explanation instead of a broken file.",
    },
  ],
  faqs: [
    {
      question: "What is a vt.tiktok.com link?",
      answer:
        "It is TikTok's short share domain. It holds no video itself — it redirects to the full tiktok.com/@creator/video/ID URL. The video ID only exists at the end of that chain, which is why tools that read the short URL directly fail.",
    },
    {
      question: "Why does the short link fail on other downloaders?",
      answer:
        "Usually because the redirect needs a mobile user agent, or because the site tries to resolve the short URL client-side and is blocked by CORS. Following it server-side, with the right headers, avoids both failures.",
    },
    {
      question: "Do vt and vm links differ?",
      answer:
        "Only in hostname. Both redirect to the same canonical video URL and are parsed identically here. If one form fails, it is an expired link rather than a format the tool cannot read.",
    },
    {
      question: "Can I paste the full tiktok.com URL instead?",
      answer:
        "Yes. Full URLs, vt.tiktok.com and vm.tiktok.com links all work; the short form is simply expanded before the ID is read.",
    },
    {
      question: "The link expired — what now?",
      answer:
        "Open the video in TikTok and share it again to get a fresh short link. Expired or revoked links have no destination to follow, and no downloader can reconstruct one.",
    },
  ],
  appName: "LAMP TIK vt.tiktok.com Downloader",
  features: [
    "Expands vt.tiktok.com and vm.tiktok.com redirects server-side",
    "Watermark-free HD MP4 from the source stream",
    "MP3 audio from the video's own track",
    "Falls back to the full URL parser when a redirect is blocked",
    "Free, no account, no app",
  ],
  related: ["tiktok-mp3-downloader", "tiktok-video-download-iphone", "tiktok-story-downloader"],
  guides: [
    { slug: "tiktok-short-links-not-working", anchor: "Why short links stop working" },
    { slug: "download-tiktok-video-without-watermark" },
    { slug: "browser-vs-app-tiktok-downloaders-safety" },
  ],
};
