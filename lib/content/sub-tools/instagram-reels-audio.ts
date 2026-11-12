import type { SubTool } from "@/lib/content/sub-tool-types";

/**
 * Getting the sound out of an Instagram Reel, answered honestly.
 *
 * Search Console gives this page two queries in 90 days and both are
 * "download the audio" wording: `instagram reel audio download` (position 63)
 * and `insta post audio extractor` (position 47). The page was titled for
 * "Finder … Extract", so it ranked for wording it did not carry and did not
 * rank for the wording it did — position 47 is not a CTR problem, it is a
 * relevance one.
 *
 * Instagram mixes the soundtrack into the video and publishes no audio-only
 * stream, so the page still refuses to promise a one-click MP3: it saves the
 * Reel with its audio intact and explains the two honest routes to the sound.
 * The query now appears in the title, the H1, the first sentence, the steps and
 * the FAQ, which is the only thing a rewrite can change.
 */
export const entry: SubTool = {
  slug: "instagram-reels-audio",
  platform: "instagram",
  // 57 characters, exact query first. Both measured queries contain this
  // phrase, and the earlier "Finder" wording contained neither.
  title: "Instagram Reel Audio Download - Save the Sound, Get MP3",
  socialTitle:
    "Instagram Reel Audio Download - Save the Reel With Its Original Sound, Then MP3",
  // 154 characters: query, then the two things that decide the click —
  // no login, and a route to MP3 that does not cost money.
  description:
    "Download Instagram Reel audio: save the Reel with its original sound, no login or watermark, then turn that MP4 into MP3 locally on iPhone or Android.",
  keywords: [
    "Instagram Reel audio download",
    "download audio from Instagram Reel",
    "instagram reel audio extractor",
    "insta post audio extractor",
    "instagram reel audio downloader remove watermark",
    "Instagram Reels audio",
    "Instagram Reels audio finder",
    "instagram reel audio save",
    "save instagram reel audio mp3 iphone",
    "Instagram Reels audio extraction",
    "download Reels audio copy paste",
    "Instagram original audio",
    "save Reel sound",
    "Instagram audio download no login",
  ],
  eyebrow: "Instagram Reels - download the audio, keep the sound",
  h1Lead: "Instagram Reel audio download.",
  h1Accent: "The sound, straight from the post.",
  lede:
    "Instagram never publishes a Reel's audio as its own file: the soundtrack is an AAC track muxed into the video. So this page does the part that is real. It downloads the Reel with the audio untouched, then shows the two honest routes to a reusable sound - Instagram's own Use audio flow, or an offline extraction from the MP4 you just saved. No login, no watermark, no fake MP3.",
  chips: ["Original sound intact", "No login", "No fake MP3"],
  facts: [
    ["Audio track", "AAC, inside the MP4"],
    ["Separate MP3", "Not published by IG"],
    ["Works with", "Reels and video posts"],
    ["Price", "Free"],
  ],
  steps: [
    {
      title: "Paste the Reel link",
      body:
        "Open the Reel in Instagram, tap Share then Copy link, and paste it above. Public Reels, video posts and IGTV links resolve without an account; photo carousels do not, because there is no audio track to save.",
    },
    {
      title: "Download the Reel, then take the MP3",
      body:
        "The file you get is the Reel itself - MP4 with its original AAC audio, not a silent video and not a re-encode. To reuse the sound inside Instagram, tap Use audio on the original post. To keep an MP3, extract it from that MP4 on your own device: VLC (Media, Convert/Save, MP3) or ffmpeg -i reel.mp4 -vn -c:a libmp3lame -q:a 2 sound.mp3.",
    },
  ],
  faqs: [
    {
      question: "How do I download audio from an Instagram Reel?",
      answer:
        "Copy the Reel's link (Share, then Copy link), paste it above, and press download. That saves the Reel with its original AAC soundtrack intact - Instagram does not publish an audio-only stream, so the sound arrives inside the MP4 and becomes an MP3 on your device in the next step.",
    },
    {
      question: "Can I download just the audio as an MP3?",
      answer:
        "Not straight from Instagram, because there is no audio-only stream to fetch. Any site offering a one-click Reels MP3 is either converting the video server-side or serving a different file than it claims. This page does not pretend: it gives you the Reel with the original audio, and the MP3 step happens from that file on your device.",
    },
    {
      question: "How do I turn the saved Reel into an MP3?",
      answer:
        "Use a local converter, not a website: in VLC, Media then Convert/Save and choose MP3; or with ffmpeg run: ffmpeg -i reel.mp4 -vn -c:a libmp3lame -q:a 2 sound.mp3. Both are free, work offline, and keep the file off anyone else's server.",
    },
    {
      question: "Does the download remove the Instagram watermark or username?",
      answer:
        "The file is the stream Instagram serves to a browser, so it carries no Instagram watermark and no burned-in username - that overlay is added by the app when you re-share inside Instagram, not by this download. What it does keep is the creator's own text and stickers, because they are part of the video.",
    },
    {
      question: "Is the audio quality reduced by downloading the Reel?",
      answer:
        "No. The MP4 is the stream Instagram serves to a browser, with its AAC track untouched, so no extra generation of loss is added. Turning that AAC into MP3 later is a lossy step, which is why saving the MP4 first is the better master to keep.",
    },
    {
      question: "Can I use someone else's Reel audio in my own Reel?",
      answer:
        "Use Instagram's own Use audio button on the post - that is what the feature is for, and it keeps attribution and licensing inside the platform. Downloading the file does not grant rights to the music; a licensed track still belongs to its rights holders, and reposting it elsewhere can be claimed.",
    },
    {
      question: "Does this work without logging in?",
      answer:
        "Yes for public Reels. Instagram hides private accounts and age-restricted posts from anonymous requests, so those links fail with a clear message rather than a loop. You never enter an Instagram password on this site.",
    },
  ],
  appName: "LAMP TIK Instagram Reel Audio Downloader",
  features: [
    "Save the Reel with its original AAC soundtrack intact",
    "No fake MP3 conversion and no re-encode",
    "Works with public Reels, video posts and IGTV links",
    "No Instagram login and no app",
    "Clear, offline route from the saved MP4 to MP3",
  ],
  related: ["instagram-reels-to-mp4", "instagram-story-downloader", "tiktok-mp3-downloader"],
  guides: [{ slug: "download-tiktok-audio-as-mp3", anchor: "M4A, MP3 and the bitrate ceiling" }],
};
