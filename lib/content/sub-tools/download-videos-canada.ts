import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Country intent, Canadian edition.
 *
 * Mounts the Facebook downloader: Canada is one of the markets where the
 * long-form Watch upload and the page-posted clip still dominate the download
 * question, and the failure people hit there — a page URL instead of a post
 * permalink, or a login-walled group — is specific enough to answer directly.
 *
 * Legally this is the one country in the cluster with a genuine user-generated
 * content exception (s.29.21), so the note names it rather than recycling the
 * fair-dealing paragraph from the UK page.
 */
export const entry: SubTool = {
  slug: "download-videos-canada",
  platform: "facebook",
  title: "Download Videos in Canada - Facebook HD Without an App",
  socialTitle: "Download Videos in Canada - Facebook, Reels, TikTok and YouTube",
  description:
    "Save Facebook videos in HD in Canada. Reels, TikTok and YouTube links save the MP4 each platform serves, audio included, straight to Downloads. No app, no login.",
  keywords: [
    "download facebook video canada",
    "facebook video downloader canada hd",
    "download videos in canada",
    "save facebook video without app canada",
    "tiktok downloader canada",
    "instagram reels downloader canada",
    "youtube downloader canada free",
  ],
  eyebrow: "Canada · Facebook first, all four platforms",
  h1Lead: "Downloading videos",
  h1Accent: "in Canada.",
  lede:
    "Facebook first — this page mounts the Facebook downloader, because the long Watch upload and the page-posted clip are where Canadian links most often fail — with Reels, TikTok and YouTube one tap below. Paste a public link and the HD MP4 arrives with its audio already muxed in; no app, no account, and no login form asking for a password it has no business holding.",
  chips: ["Canadian English", "HD Watch videos", "No app"],
  facts: [
    ["Copyright basis", "Copyright Act · s.29"],
    ["Mashups", "s.29.21, non-commercial"],
    ["Best quality", "1080p where offered"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Get a post permalink, not a page address",
      body:
        "A Facebook share card (fb.watch/xxxx) works as-is; the server follows the redirect chain and pulls the video ID out of it, so you never have to expand the short link by hand. A page or group address does not work, because a homepage has no video attached to it — you need the post itself: /videos/<id>, /reel/<id> or the permalink from the post's timestamp menu. The page detects the difference and names it instead of failing silently.",
    },
    {
      title: "Take the HD rendition, and check the audio",
      body:
        "Facebook publishes the same clip in several renditions — roughly 360p through 1080p — and offers some of them as video-only files meant to be paired with a separate audio track. A downloader that grabs the first candidate hands you a file that plays silently. This page accepts only a muxed H.264 + AAC stream, which is why the HD row sometimes takes a second longer to appear: the probe runs before the button does.",
    },
  ],
  notes: [
    {
      title: "Canada has a real user-generated content exception",
      body:
        "Section 29 of the Copyright Act is fair dealing for research, private study, education, parody or satire. Section 29.21 goes further and covers non-commercial user-generated content — the mashup or remix case — provided the copy is not itself infringing, the use is non-commercial, and the source is credited where reasonable. Section 41.27 is the anti-circumvention provision, so breaking a DRM layer is a separate wrong from copying. A description of the framework, not legal advice.",
    },
    {
      title: "The Facebook shapes that cannot be opened",
      body:
        "Private groups, friends-only posts and Marketplace listings sit behind a session, so there is no public stream for the resolver to ask for — the page says that rather than presenting a download button that will fail. Facebook also drops the video when a page removes a post or a rights holder files a claim, and the old permalink then returns the page instead of the file.",
    },
    {
      title: "French, if that is the language of the question",
      body:
        "The site's French landing covers the same resolver in French, for readers in Quebec and elsewhere. It is a translated landing page rather than a translated copy of this one: the mechanics are identical, the explanation is in French, and no page here assumes which province you are in.",
    },
  ],
  faqs: [
    {
      question: "How do I download a Facebook video in Canada?",
      answer:
        "Open the post, copy its link — the share card (fb.watch) or the timestamp permalink both work — paste it above and choose the HD download. The MP4 arrives with AAC audio already inside it, so it plays with sound in QuickTime, VLC or Photos without a second track to merge.",
    },
    {
      question: "Why does a page or group link fail?",
      answer:
        "Because a page address points at a feed, not a video. The resolver needs a post permalink such as /videos/<id> or /reel/<id>. Private groups and friends-only posts fail for a different reason — they require a login to read at all — and this site does not accept logins, so those are refused rather than attempted.",
    },
    {
      question: "Is downloading a video legal in Canada?",
      answer:
        "The Copyright Act has fair dealing under s.29 and, unusually, a non-commercial user-generated content exception under s.29.21 that covers mashups and remixes when the source is credited and the use is not commercial. Republishing a full clip unchanged is not that exception. Breaking DRM is separately prohibited by s.41.27. Not legal advice for a particular use.",
    },
    {
      question: "Why is the file so large?",
      answer:
        "Facebook Watch uploads can run to a gigabyte or more, and HD renditions are not re-compressed for downloaders — you get the file the platform published. A long video at 1080p is simply big. If size matters more than detail, the standard-definition rendition is a fraction of it.",
    },
    {
      question: "Can I get the audio only?",
      answer:
        "Yes. The MP3 route takes the audio track from the same link, so a clip you only want to listen to does not need the video downloaded first. On iPhone the audio lands in Files rather than Photos, because Photos does not index music.",
    },
  ],
  appName: "LAMP TIK - Video Downloader for Canada",
  features: [
    "Facebook HD Watch videos, page posts and Reels",
    "fb.watch and /share/ links unwrapped server-side",
    "Audio verified before a download button appears",
    "Instagram, TikTok and YouTube from the same page",
    "MP3 extraction from the same link",
    "Free, no account, no app",
  ],
  related: [
    "download-videos-united-states",
    "download-videos-united-kingdom",
    "download-videos-germany",
  ],
  relatedHeading: "The same page for another country",
  guides: [
    { slug: "download-tiktok-video-without-watermark" },
    { slug: "is-downloading-tiktok-videos-legal", anchor: "The legal question, in plain terms" },
    { slug: "why-tiktok-video-quality-drops-after-upload" },
  ],
};
