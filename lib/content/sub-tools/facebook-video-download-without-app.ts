import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * App-free intent. The question behind it is usually "do I have to install
 * something from a pop-up?" — so the page is explicit about browser-only
 * operation, public-content limits, and where the file lands on each device.
 */
export const entry: SubTool = {
  slug: "facebook-video-download-without-app",
  platform: "facebook",
  title: "Facebook Video Download Without App - HD MP4",
  socialTitle: "Download a Facebook Video Without Installing Anything",
  description:
    "Download a public Facebook video without installing anything: paste the post, Watch or fb.watch link and save the HD MP4 in your browser. No login, no extension.",
  keywords: [
    "facebook video download without app",
    "download fb video no app",
    "facebook video downloader online",
    "save facebook video hd",
    "fb video download browser",
    "facebook watch download",
  ],
  eyebrow: "Facebook videos - browser only, nothing installed",
  h1Lead: "Facebook videos.",
  h1Accent: "No app, no login.",
  lede:
    "Most 'Facebook downloader' results push an APK or a browser extension before they show you a file. This page is just a browser tab: paste the link, get the MP4, and nothing gets installed on your phone or computer.",
  chips: ["No install", "HD first", "fb.watch links"],
  facts: [
    ["Install", "Nothing"],
    ["Quality", "HD, SD fallback"],
    ["Scope", "Public videos"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Copy the video link in Facebook",
      body:
        "Tap Share under the video, then Copy link. A post URL, a /watch/ URL, a /reel/ URL and the short fb.watch form are all accepted. Private, friends-only and group videos cannot be resolved because there is no public stream behind them.",
    },
    {
      title: "Download straight from the browser",
      body:
        "Paste the link, wait for the stream probe, then choose Download HD MP4. The file streams from Facebook's CDN with an attachment header, so the browser saves it instead of opening a tab — even for long Watch uploads that run past a gigabyte.",
    },
  ],
  faqs: [
    {
      question: "Do I have to install an app or extension?",
      answer:
        "No. There is nothing to install and no permissions to grant. The site runs in Safari, Chrome, Firefox and Edge on iPhone, Android, Windows, macOS and Linux.",
    },
    {
      question: "Can I download private or group videos?",
      answer:
        "No. Those need a logged-in session with permission to view them, and this tool never asks for Facebook credentials. Public page videos, public Watch uploads and public Reels work.",
    },
    {
      question: "What is the maximum video size?",
      answer:
        "There is no fixed ceiling because the file is streamed through rather than buffered in memory. Hour-long Watch uploads over 1GB download on the same path as a short clip, limited mainly by your connection.",
    },
    {
      question: "Why did I get SD instead of HD?",
      answer:
        "Because Facebook did not expose an HD variant for that upload. The tool requests HD first and falls back to the highest-bitrate SD stream, and the result panel tells you which one you received.",
    },
    {
      question: "Does the file have a watermark?",
      answer:
        "No. Facebook's video files carry no watermark, and nothing is re-encoded here, so the MP4 matches what the platform's player streams.",
    },
  ],
  appName: "LAMP TIK Facebook Video Downloader",
  features: [
    "Browser-only: no app, APK or extension",
    "HD rendition first, SD as an honest fallback",
    "Long Watch uploads over 1GB",
    "fb.watch and share links resolved server-side",
    "Free, no login, no account",
  ],
  related: ["facebook-reels-downloader", "fb-watch-downloader", "instagram-reels-download-without-login"],
  guides: [
    { slug: "how-to-download-large-facebook-videos-in-1080p-hd" },
    { slug: "browser-vs-app-tiktok-downloaders-safety", anchor: "Browser tools vs APK apps" },
    { slug: "is-downloading-tiktok-videos-legal", anchor: "Copyright and personal use" },
  ],
};
