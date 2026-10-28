import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Link-shape intent: "fb.watch downloader". The useful angle is the redirect
 * chain — fb.watch carries no video ID, so the server has to follow hops until
 * the canonical /videos/ URL appears before it can probe a stream.
 */
export const entry: SubTool = {
  slug: "fb-watch-downloader",
  platform: "facebook",
  title: "fb.watch Downloader - Save Facebook Videos in HD",
  socialTitle: "fb.watch Downloader - Follow the Short Link to the Actual Video",
  description:
    "Paste an fb.watch link and get the video behind it: the redirect chain is followed server-side, then the HD MP4 is saved to your device. No app, no login.",
  keywords: [
    "fb.watch downloader",
    "download fb.watch video",
    "fb watch link download",
    "facebook fb.watch mp4",
    "save fb.watch video",
    "fb watch downloader online",
  ],
  eyebrow: "fb.watch - short link, resolved to the video",
  h1Lead: "fb.watch links.",
  h1Accent: "The video behind the redirect.",
  lede:
    "An fb.watch URL is a share shortener: it holds no video ID, just a hop to the real post. This page follows that hop (and the ones after it) on the server, finds the canonical video URL, and only then asks Facebook for the HD stream.",
  chips: ["fb.watch and /share/v/", "Redirects followed", "No login"],
  facts: [
    ["Accepts", "fb.watch short links"],
    ["Redirects", "Followed server-side"],
    ["Output", "MP4, HD first"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Paste the fb.watch link as copied",
      body:
        "In the Facebook app tap Share, then Copy link — the result usually looks like fb.watch/xxxxxxx/ or facebook.com/share/v/xxxx/. Do not open it and copy the address bar: the short form is handled here, including the intermediate redirects that expire after a while.",
    },
    {
      title: "Resolve, probe, then save",
      body:
        "The server follows the chain to the canonical video URL, requests the HD variant and checks for a real MP4 with an audio track. Only then do download buttons appear. That extra step is why a link other tools call 'invalid' can still resolve here.",
    },
  ],
  faqs: [
    {
      question: "What is an fb.watch link?",
      answer:
        "It is Facebook's short share domain for videos. It redirects to the full post or /videos/ URL, which is where the actual video ID lives. A tool that treats the short URL as the video address has nothing to fetch.",
    },
    {
      question: "Why do other downloaders say the fb.watch link is invalid?",
      answer:
        "Because they skip the redirect chain, or they give up when an intermediate hop requires a normal browser user agent. Following every hop server-side, then parsing the canonical URL, is what makes the same link work here.",
    },
    {
      question: "Does the link expire?",
      answer:
        "fb.watch links can stop resolving after a while, and a share link copied from a deleted post never resolves at all. If that happens, open the video in Facebook and share it again for a fresh link.",
    },
    {
      question: "Can I download private or group videos from an fb.watch link?",
      answer:
        "No. The short link may redirect to a private post, but there is no public stream without an authorized session — and this tool never asks for your Facebook login.",
    },
    {
      question: "Do I need the Facebook app to use this?",
      answer:
        "No. Paste the link in any browser. The download runs on the server and the file is handed to your normal downloads folder.",
    },
  ],
  appName: "LAMP TIK fb.watch Downloader",
  features: [
    "Follows fb.watch and /share/v/ redirect chains",
    "Saves the HD MP4 Facebook exposes",
    "Handles long Watch uploads without a size ceiling",
    "No login, app or extension",
    "Free and unlimited",
  ],
  related: ["facebook-video-download-without-app", "facebook-reels-downloader", "tiktok-video-download-iphone"],
  guides: [
    { slug: "how-to-download-large-facebook-videos-in-1080p-hd" },
    { slug: "browser-vs-app-tiktok-downloaders-safety", anchor: "Why nothing needs installing" },
    { slug: "is-downloading-tiktok-videos-legal", anchor: "Is downloading videos legal?" },
  ],
};
