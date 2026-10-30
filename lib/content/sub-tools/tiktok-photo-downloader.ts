import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Photo-mode intent. A TikTok slideshow is not a video: it has no playable
 * stream, which is why the video resolver deliberately rejects it. The copy
 * here explains that mechanic instead of pretending the video flow covers it.
 */
export const entry: SubTool = {
  slug: "tiktok-photo-downloader",
  platform: "tiktok",
  toolKind: "photo",
  title: "TikTok Photo & Slideshow Downloader - Every Slide",
  socialTitle:
    "TikTok Photo Downloader - Save Every Slide of a Slideshow in Original Quality",
  description:
    "Save every photo in a TikTok slideshow at the resolution TikTok serves. Paste the post link, tap a slide, get a clean image. No app, login or watermark.",
  keywords: [
    "TikTok photo downloader",
    "TikTok slideshow downloader",
    "download TikTok slideshow images",
    "TikTok photo mode download",
    "save TikTok carousel photos",
    "TikTok images without watermark",
  ],
  eyebrow: "TikTok photo mode - every slide, one at a time",
  h1Lead: "TikTok slideshows.",
  h1Accent: "Every slide, saved.",
  lede:
    "A photo post is not a video with the sound turned off: TikTok publishes an ordered set of images and no MP4 at all, which is exactly why video downloaders refuse these links. This page reads that image set and gives every slide its own clean file - no screenshot, no crop, no recompression.",
  chips: ["No watermark", "Original image format", "Up to 35 slides"],
  facts: [
    ["Source", "Photo-mode post"],
    ["Saved as", "Original JPG / WebP"],
    ["Slides per post", "Up to 35"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Paste the photo post link",
      body:
        "Copy the post in TikTok (Share then Copy link) and paste it here. Both /@user/photo/… links and vt.tiktok.com short links work. The resolver asks for the post's image set, not a stream, and keeps the slides in the order the creator published them.",
    },
    {
      title: "Tap the slides you actually want",
      body:
        "Each thumbnail is a separate download: the file is named after the post and the slide number, so a 12-photo carousel does not become twelve files called image. Nothing is re-encoded, so a WebP slide stays WebP at its original resolution rather than being flattened to a lower-quality JPEG.",
    },
  ],
  faqs: [
    {
      question: "Why does the normal TikTok downloader reject this link?",
      answer:
        "Because there is nothing to download as video. TikTok's photo mode exposes an image list, not an MP4, and the video resolver only handles real streams. This page uses the image list, which keeps both tools honest instead of making the video downloader pretend to succeed.",
    },
    {
      question: "Can I save all the slides at once?",
      answer:
        "Not as a ZIP. Every slide is saved individually from its own button, which is what keeps each file at the original resolution without repacking it. Most carousels are under fifteen slides, so it is a handful of taps rather than a batch job.",
    },
    {
      question: "Why do some slides save as WebP instead of JPG?",
      answer:
        "Because that is the format TikTok serves for that image. WebP opens in every current phone gallery, Chrome, Safari and Windows Photos. Converting it to JPG here would re-encode the picture and lose detail, so the original container is kept.",
    },
    {
      question: "Does the post's sound come with the photos?",
      answer:
        "Not inside the images, because images carry no audio. When the post has a soundtrack, a separate Save the original sound button appears and downloads TikTok's audio track, so you can keep the photos and the sound without screen-recording either.",
    },
    {
      question: "Do private or friends-only photo posts work?",
      answer:
        "No. TikTok only returns images for posts that are public at the moment you paste the link. A private post answers with a clear error rather than an empty grid, and deleting the link from your side does not make it public.",
    },
    {
      question: "Is there a watermark on the saved photos?",
      answer:
        "No. The slides are the clean image files the post serves to a browser, not a screenshot of the TikTok player, so the username overlay and the moving watermark never enter the file.",
    },
  ],
  appName: "LAMP TIK TikTok Photo Downloader",
  features: [
    "Save every slide of a TikTok photo-mode post",
    "Original image resolution and container (JPG or WebP)",
    "Up to 35 slides per carousel",
    "Optional original-sound download for the post",
    "No watermark, no app, no account",
  ],
  related: [
    "tiktok-mp3-downloader",
    "vt-tiktok-com-downloader",
    "tiktok-video-download-iphone",
  ],
  guides: [
    { slug: "download-tiktok-video-without-watermark" },
    { slug: "is-downloading-tiktok-videos-legal" },
  ],
};
