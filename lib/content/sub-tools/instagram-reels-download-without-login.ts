import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Login-free intent. The trust question is the whole page: most downloaders
 * ask for an Instagram session, and answering "we never touch one" is more
 * persuasive than repeating feature copy from the main Reels page.
 */
export const entry: SubTool = {
  slug: "instagram-reels-download-without-login",
  platform: "instagram",
  title: "Instagram Reels Download Without Login - Public Reels",
  socialTitle: "Instagram Reels Download Without Login - No Account, No Cookies",
  description:
    "Download a public Instagram Reel without logging in: no account, no cookies, no OAuth. Paste the Reel link and save the original MP4 with its audio track.",
  keywords: [
    "instagram reels download without login",
    "download instagram reels no account",
    "instagram reel downloader no login",
    "save reels without logging in",
    "instagram anonymous download",
    "ig reels download",
  ],
  eyebrow: "Instagram Reels - public links, zero login",
  h1Lead: "Instagram Reels.",
  h1Accent: "Public links, no login.",
  lede:
    "Most Reel downloaders ask you to sign in so they can read Instagram through your session. This one never does: it resolves public posts from the server, with no account, no cookie and no browser extension holding your credentials.",
  chips: ["No login", "No cookies", "Original MP4"],
  facts: [
    ["Account needed", "None"],
    ["Scope", "Public Reels only"],
    ["Output", "MP4 with audio"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Copy the Reel link",
      body:
        "In Instagram tap the three dots on the Reel, then Copy link. The URL looks like instagram.com/reel/CODE/; /reels/, /p/ and /tv/ links are accepted too. You can copy it from a logged-out browser tab as well — the link itself is all the tool needs.",
    },
    {
      title: "Resolve it without a session",
      body:
        "The server requests the public post, reads Instagram's own video versions, and picks the highest-bitrate progressive MP4 that already carries picture and audio. No login wall is bypassed because no private content is touched: a post that requires a session to view simply returns a clear message.",
    },
  ],
  faqs: [
    {
      question: "Do I need an Instagram account to download a Reel?",
      answer:
        "No. Paste the Reel link and download. The tool never asks for a username, password, cookie or OAuth approval, and it keeps no session of yours to lose.",
    },
    {
      question: "Can it download Reels from private accounts?",
      answer:
        "No, and that is intentional. Private posts are not public content, so there is no stream for the server to fetch. Tools that offer this are using someone's logged-in session to read them, which is exactly the risk this page avoids.",
    },
    {
      question: "Why do other downloaders ask me to log in?",
      answer:
        "Because they read Instagram through your browser session or ask for your cookies to get past rate limits. That hands an unrelated site access to your account. Here the request is made server-side against public data only.",
    },
    {
      question: "Instagram shows a login wall in my browser — will the link still work?",
      answer:
        "Usually yes. The wall is a client-side prompt; the public post data is still served. Paste the copied link here and the server resolves it directly.",
    },
    {
      question: "Is the audio included?",
      answer:
        "Yes. The saved MP4 is a muxed file with Instagram's original audio track, so music and voice arrive in sync without a separate merge.",
    },
  ],
  appName: "LAMP TIK Instagram Reels Downloader",
  features: [
    "Downloads public Reels with no login or cookies",
    "Original-bitrate MP4 with audio included",
    "Accepts /reel/, /reels/, /p/ and /tv/ links",
    "Never requests Instagram credentials",
    "Free, unlimited, no app",
  ],
  related: [
    "instagram-reels-download-iphone",
    // The audio page is the natural next question after "no login": it saves
    // the same public Reel and explains where the sound actually lives.
    "instagram-reels-audio",
    "instagram-story-downloader",
  ],
  guides: [
    { slug: "how-to-download-instagram-reels-in-hd" },
    { slug: "browser-vs-app-tiktok-downloaders-safety", anchor: "Why browser tools are safer" },
    { slug: "is-downloading-tiktok-videos-legal", anchor: "Copyright and personal use" },
  ],
};
