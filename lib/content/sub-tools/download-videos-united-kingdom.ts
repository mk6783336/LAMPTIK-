import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Country intent, UK edition.
 *
 * Mounts the Reels downloader rather than TikTok's: the page is one of four
 * country variants, and mounting a different platform on each keeps them from
 * being four copies of one page with the country name swapped. The two facts
 * that are actually British are the absence of a general private-copying
 * exception in the CDPA, and the DRM wall around iPlayer, ITVX and Channel 4 —
 * so the copy names both instead of implying a VPN fixes either.
 */
export const entry: SubTool = {
  slug: "download-videos-united-kingdom",
  platform: "instagram",
  title: "Download Videos in the UK - Reels Without a Watermark",
  socialTitle: "Download Videos in the United Kingdom - Reels, TikTok, YouTube, Facebook",
  description:
    "Save Instagram Reels, TikTok, YouTube and Facebook videos in the UK: paste the link, get the MP4 with its audio. No app, no login, no watermark.",
  keywords: [
    "download instagram reels uk",
    "instagram reels downloader united kingdom",
    "download videos in the uk",
    "save reels without app uk",
    "tiktok downloader uk no watermark",
    "youtube downloader uk free",
    "download video from facebook uk",
  ],
  eyebrow: "United Kingdom · Reels first, all four platforms",
  h1Lead: "Downloading videos",
  h1Accent: "in the United Kingdom.",
  lede:
    "Reels first — this page mounts the Reels downloader — with TikTok, YouTube and Facebook one tap below. Public links resolve without a login, and the MP4 arrives with its AAC audio already inside it, so it plays first time in QuickTime, VLC or Photos. British English throughout, but nothing here is gated to UK visitors: the country pages explain the local rules, they do not enforce them.",
  chips: ["UK English", "1080×1920 Reels", "No login"],
  facts: [
    ["Copyright basis", "CDPA 1988 · s.30"],
    ["DRM media", "Not supported"],
    ["Reel size", "1080×1920 where offered"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Copy the Reel's link, not a screenshot",
      body:
        "In Instagram, tap the three dots on the Reel and choose Copy link, or Share then Copy link: both give an instagram.com/reel/<id> URL. A profile or explore URL is not a post, and the page says that rather than guessing which Reel you meant. Stories and highlights are a different shape — they expire or are albums, so they have their own pages instead of being folded into this one.",
    },
    {
      title: "Confirm it plays with sound",
      body:
        "Instagram serves Reels as one progressive MP4 — H.264 video with AAC audio muxed in — so the saved file has sound on the first play. A silent download means the tool took the video-only rendition and left the audio track behind, which is the most common silent failure in this category. Save to local Downloads rather than a synced folder: a cloud client writing into the file mid-download is the second.",
    },
  ],
  notes: [
    {
      title: "What UK copyright says, and does not",
      body:
        "The Copyright, Designs and Patents Act 1988 has no general private-copying exception: unlike Germany, \"it is only for me\" is not by itself a defence here. What exists is fair dealing under s.30 for criticism, review, quotation and reporting current events — narrow, and usually conditional on sufficient acknowledgement. Copying a whole Reel to repost it is not fair dealing with a caption on top. This is a description of the framework, not legal advice.",
    },
    {
      title: "The DRM wall you will still hit",
      body:
        "BBC iPlayer, ITVX, Channel 4 and NOW all ship Widevine-encrypted media. No downloader can open that and this one does not pretend to: the stream is encrypted, not merely country-locked, which is why a VPN changes nothing about it. The same applies to Amazon Prime and Netflix. What this page does handle is public, unencrypted media — the ordinary Reel, TikTok, YouTube or Facebook video.",
    },
    {
      title: "\"No login\" is the security claim, not a slogan",
      body:
        "Instagram serves public Reels to anonymous requests, so nothing here needs your password, your cookies or a session token. That is the practical difference from the browser extensions that read your feed with your own session: they get the video, and they also get the ability to act as you. If a download tool asks for an Instagram login, the account is the thing being collected.",
    },
  ],
  faqs: [
    {
      question: "Can I download an Instagram Reel in the UK without logging in?",
      answer:
        "Yes. Public Reels are served to anonymous requests, so the page resolves the link with no account, no cookie and no session. Private accounts are refused outright — there is no login form on this site, which is the point: a public post needs no credential and a private one should not be opened with yours.",
    },
    {
      question: "Will a VPN let me download from BBC iPlayer or ITVX?",
      answer:
        "No. Those services use Widevine DRM, so the bytes are encrypted rather than merely region-restricted. A VPN can change which country the server thinks you are in; it cannot decrypt the stream, and no browser-side downloader can either. The UK-only content people most often ask about is exactly the content this tool does not touch.",
    },
    {
      question: "Is it legal to download Reels in the UK?",
      answer:
        "The CDPA has no blanket private-copying exception, so the answer turns on purpose: fair dealing for criticism, review, quotation or news reporting is the narrow lawful ground, and republishing someone else's Reel is not covered by it. Personal saves are widely done and rarely pursued, which is not the same as being permitted. The legal guide linked below covers the distinction; neither page is legal advice.",
    },
    {
      question: "Why does my Reel save as 1080×1920?",
      answer:
        "Because that is the shape Instagram publishes Reels in: 9:16 vertical at 1080×1920, H.264 with AAC audio. Nothing is cropped or letterboxed on the way out. If an uploader posted at a lower resolution, the file matches what was published — the tool reports the real size rather than scaling it up.",
    },
    {
      question: "Do Reels carry a watermark or username stamp?",
      answer:
        "No. Unlike TikTok's save button, Instagram does not burn the account handle into the Reels stream, so there is nothing to crop out — the file you get is the stream Instagram served its own player. Videos that do carry an on-screen handle were published that way by the creator.",
    },
  ],
  appName: "LAMP TIK - Video Downloader for the United Kingdom",
  features: [
    "Instagram Reels, TikTok, YouTube and Facebook",
    "Progressive MP4 with its AAC audio intact",
    "No login, cookie or session used",
    "Stories and highlights handled on their own pages",
    "Works in Safari, Chrome and Firefox",
    "Free and unlimited",
  ],
  related: [
    "download-videos-united-states",
    "download-videos-canada",
    "download-videos-germany",
  ],
  relatedHeading: "The same page for another country",
  guides: [
    { slug: "download-tiktok-video-without-watermark" },
    { slug: "is-downloading-tiktok-videos-legal", anchor: "Where the legal line sits" },
    {
      slug: "why-tiktok-video-quality-drops-after-upload",
      anchor: "What a re-encode costs on a long video",
    },
  ],
};
