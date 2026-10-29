import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * /facebook-reels-downloader — the vertical-reel intent inside Facebook, which
 * behaves unlike a Watch video: reels are 9:16, carry their own audio track,
 * and are usually shared as fb.watch short links rather than /videos/ URLs.
 */
export const entry: SubTool = {
  slug: "facebook-reels-downloader",
  platform: "facebook",
  title: "Facebook Reels Downloader — Save FB Reels MP4 HD",
  socialTitle: "Facebook Reels Downloader — Save FB Reels to MP4 in 1080p",
  description:
    "Download Facebook Reels in 1080p MP4 with the original audio. Paste a reel or fb.watch link and save it watermark-free — free, no login, phone or desktop.",
  keywords: [
    "facebook reels downloader",
    "download facebook reels",
    "fb reels video download",
    "save facebook reel mp4",
    "fb.watch reel downloader",
    "facebook reels download HD",
  ],
  eyebrow: "Facebook · Reels · No login",
  h1Lead: "Facebook Reels.",
  h1Accent: "Straight to MP4.",
  lede:
    "Reels are vertical, sound-led and easy to lose in the feed. Paste a reel link or an fb.watch share link and save the original 9:16 MP4 with its audio intact.",
  chips: ["9:16 vertical", "Original reel audio", "fb.watch links"],
  facts: [
    ["Cost", "Free"],
    ["Aspect", "9:16 vertical"],
    ["Quality", "Up to 1080p"],
    ["Links", "Reels + fb.watch"],
  ],
  steps: [
    {
      title: "Copy the reel, not the page",
      body:
        "Tap Share on the reel and Copy link. Facebook hands out an fb.watch short link for reels, and that short link resolves to a reel id rather than a page video id — the resolver follows the redirect and picks the vertical rendition, not the page's 16:9 preview.",
    },
    {
      title: "Save the reel rendition",
      body:
        "You get the reel's own MP4: 9:16, up to 1080p, with the audio track the creator attached. There is no Facebook logo burned in, so the file drops cleanly into Shorts, Reels or TikTok if you are reposting your own content.",
    },
  ],
  faqs: [
    {
      question: "What is the difference between a Facebook reel and a Watch video?",
      answer:
        "A reel is a short vertical clip (9:16) with its own audio track, shared through the reels player and usually linked as fb.watch. A Watch video is a landscape or square upload living on a page or profile, linked as /videos/ or /watch/?v=. The two use different media objects, which is why a reel link fails on tools built only for page videos.",
    },
    {
      question: "Do fb.watch short links work?",
      answer:
        "Yes. fb.watch links are expanded server-side, the reel id is extracted, and the media is resolved in the same request. You do not need to open the link in a browser first or convert it by hand.",
    },
    {
      question: "Can I download a reel from a private group?",
      answer:
        "No. Reels inside private groups are visible only to members, so their media URLs are not public. Public page and profile reels work; anything behind a group membership does not, and no tool can change that without your Facebook session.",
    },
    {
      question: "Is the audio kept?",
      answer:
        "Yes. The reel is saved as its original MP4, so the creator's audio, licensed music bed and voice-over all stay in sync. Nothing is re-encoded or muted, and there is no separate audio extraction step to run.",
    },
    {
      question: "Will the file still be vertical?",
      answer:
        "Yes. Reels are stored as 9:16 and the download preserves that aspect ratio at the source resolution, up to 1080x1920. No letterboxing or cropping is applied on our side.",
    },
  ],
  appName: "LAMP TIK Facebook Reels Downloader",
  features: [
    "Facebook Reels saved as 9:16 MP4 up to 1080p",
    "fb.watch and share short links resolved automatically",
    "Original reel audio preserved",
    "No Facebook login required",
    "Works on phone, tablet and desktop browsers",
    "Free and unlimited downloads",
  ],
  related: [
    "facebook-video-download-without-app",
    "fb-watch-downloader",
    "instagram-story-downloader",
  ],
};
