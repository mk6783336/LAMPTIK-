/**
 * Instant answers + mechanism comparisons for the programmatic sub-tools.
 *
 * Two jobs, both SEO:
 *
 * 1. `quickAnswer` is the snippet block under the H1 — the query people type,
 *    then two sentences that answer it without a scroll. Google's featured
 *    snippets and every AI answer engine quote this shape far more often than
 *    a marketing paragraph, and it costs a slow connection nothing.
 * 2. `comparison` is the mechanism-by-mechanism table request: what this tool
 *    does versus what a generic online downloader does. Rendered as cards, not
 *    a wide table, because a 3-column table at 390px is horizontal overflow.
 *
 * Kept in one module rather than spread across the fifteen entries so the
 * claims can be read side by side and none of them can quietly contradict
 * another. Every row describes machinery this repository actually has — the
 * resolver files it names are the ones in `lib/`.
 */
export interface SubToolAnswer {
  query: string;
  answer: string;
  comparison: Array<{ label: string; ours: string; theirs: string }>;
}

export const SUB_TOOL_ANSWERS: Record<string, SubToolAnswer> = {
  // ---------------------------------------------------------------------
  // Country cluster. The comparison rows here are about what a given market
  // changes — a region lock, a DRM service, a share-link shape — rather than
  // repeating the generic "ours vs theirs" rows, which would make four pages
  // read as one page four times.
  // ---------------------------------------------------------------------
  "download-videos-united-states": {
    query: "How do I download a video in the United States?",
    answer:
      "Paste the public link into the field above — TikTok, Reels, YouTube or Facebook — and tap the download button: the MP4 goes to your browser's Downloads folder with no app and no account. US copyright still belongs to the person who made the clip; fair use under 17 U.S.C. §107 is a defence you argue afterwards, not a permission granted up front.",
    comparison: [
      {
        label: "Where the file comes from",
        ours: "The public stream the platform serves its own player",
        theirs: "A screen recording of playback, interface and notifications included",
      },
      {
        label: "What it refuses",
        ours: "Private, friends-only and deleted posts — reported, never attempted with a session",
        theirs: "A login form that asks for your password to reach them",
      },
    ],
  },

  "download-videos-united-kingdom": {
    query: "How do I download an Instagram Reel in the UK?",
    answer:
      "Copy the Reel's link from the three-dot menu, paste it above and download: you get the 1080×1920 MP4 with its AAC audio already inside, with no login and no app. Public Reels resolve anonymously; private accounts are refused rather than opened with your credentials.",
    comparison: [
      {
        label: "Reels audio",
        ours: "The progressive MP4, audio track intact — it plays with sound first time",
        theirs: "The video-only rendition, which arrives silent",
      },
      {
        label: "DRM services",
        ours: "iPlayer, ITVX, Channel 4 and Prime are named as unsupported, before you paste a link",
        theirs: "A \"works on everything\" promise that fails after the ad has played",
      },
    ],
  },

  "download-videos-canada": {
    query: "How do I download a Facebook video in HD in Canada?",
    answer:
      "Copy the post's link — fb.watch cards and permalinks both work — paste it above and choose the HD download. The MP4 arrives with its audio muxed in, so a long Watch upload plays with sound in QuickTime or VLC without a second track to merge.",
    comparison: [
      {
        label: "Share links",
        ours: "fb.watch and /share/ chains unwrapped on the server, so no manual expansion",
        theirs: "A canonical /videos/ permalink you have to dig out of the page source",
      },
      {
        label: "Silent 1080p",
        ours: "Video-only renditions are rejected before any button appears",
        theirs: "A \"successful\" HD download that plays with no audio at all",
      },
    ],
  },

  "download-videos-germany": {
    query: "How do I download a YouTube video in Germany?",
    answer:
      "Paste the watch, Shorts, youtu.be or music.youtube.com link and choose MP4 or MP3: the video comes as the rendition YouTube published, and the MP3 reports the bitrate it actually received — usually 128 to 160 kbps, because that is what YouTube uploads carry. A video blocked for Germany stays blocked; that answer is reported, not routed around.",
    comparison: [
      {
        label: "Region locks",
        ours: "Reported as the platform's own answer — no proxy in another country is used",
        theirs: "Claims to bypass them, or fails quietly after a long wait",
      },
      {
        label: "Bitrate",
        ours: "Measured from the audio track that arrived, typically around 128–160 kbps",
        theirs: "A fixed \"320 kbps\" label on audio padded into a bigger container",
      },
    ],
  },

  "tiktok-video-for-capcut": {
    query: "How do I get a TikTok video into CapCut?",
    answer:
      "Paste the TikTok link here and save the HD MP4, then import that file in CapCut. TikTok already serves H.264 video with AAC audio — the pair every CapCut build reads — so there is no conversion step and the audio arrives attached to the clip.",
    comparison: [
      {
        label: "What you import",
        ours: "The platform's own H.264/AAC stream, watermark-free",
        theirs: "A screen recording of the player, UI and all, which then needs cropping",
      },
      {
        label: "Audio on the timeline",
        ours: "Muxed AAC — CapCut links it automatically, in sync",
        theirs: "A separate recorder track that drifts against the picture",
      },
      {
        label: "The usual import failure",
        ours: "Not possible from this file: H.264 is accepted everywhere",
        theirs: "HEVC from a phone recording, which Windows CapCut refuses",
      },
    ],
  },

  "instagram-reels-to-mp4": {
    query: "Is there a way to convert an Instagram Reel to MP4?",
    answer:
      "There is nothing to convert: Instagram's player already streams Reels as a progressive MP4 — H.264 video with AAC audio in one file. Saving that stream gives you the MP4 at its published 1080×1920 size without an extra encode.",
    comparison: [
      {
        label: "The file",
        ours: "The exact MP4 Instagram sends its own player",
        theirs: "A re-encode of a re-encode, run through a cloud converter",
      },
      {
        label: "Audio",
        ours: "AAC inside the MP4, untouched",
        theirs: "Sometimes stripped, which is why the clip plays silent",
      },
      {
        label: "Dimensions",
        ours: "9:16, 1080×1920 where the creator published it",
        theirs: "Downscaled to fit a free-tier conversion limit",
      },
    ],
  },

  "youtube-mp3-320kbps": {
    query: "Can I get a YouTube video as a 320 kbps MP3?",
    answer:
      "No — YouTube's audio tops out around 128–160 kbps, so a 320 kbps file made from it is the same audio in a bigger container. This tool gives you the source M4A plus one honest MP3 encode, and shows the bitrate it actually received instead of a label.",
    comparison: [
      {
        label: "Bitrate shown",
        ours: "Whatever the source serves, measured — commonly ~128–160 kbps",
        theirs: "A hard-coded \"320 kbps\" label on every file",
      },
      {
        label: "Generations",
        ours: "The source AAC itself, or one MP3 encode from it",
        theirs: "Decode, pad, re-encode — three steps, no extra detail",
      },
      {
        label: "What the bigger file means",
        ours: "Stated plainly: bytes, not resolution of detail",
        theirs: "Presented as higher quality, which it cannot be",
      },
    ],
  },
  "tiktok-mp3-downloader": {
    query: "How do I convert a TikTok video to MP3?",
    answer:
      "Paste the TikTok link, then tap Download Audio (MP3). The audio is taken from the video's own sound track in one pass and encoded once — no MP4 is downloaded and re-recorded first, so nothing is added and nothing is lost.",
    comparison: [
      {
        label: "Source of the audio",
        ours: "The audio stream TikTok's CDN serves with the video, requested directly",
        theirs: "The watermarked share-sheet MP4, played back and recorded again",
      },
      {
        label: "Generations of loss",
        ours: "One encode, from the original AAC track",
        theirs: "Two or three, each one dulling the top end",
      },
      {
        label: "Bitrate honesty",
        ours: "Whatever the creator uploaded, commonly ~128 kbps AAC — a true MP3 encode is offered alongside it",
        theirs: "A label that says 320 kbps on a file padded up from 128",
      },
    ],
  },

  "tiktok-photo-downloader": {
    query: "How do I download TikTok photos and slideshows?",
    answer:
      "Paste the post link and the tool lists every image in the slideshow at its original resolution, one tap each. Photo posts have no video stream at all — the panel says so instead of handing you a broken MP4.",
    comparison: [
      {
        label: "What a photo post is",
        ours: "Detected as an image set before any download button appears",
        theirs: "Treated as a video, so the \"download\" writes a 0-byte file",
      },
      {
        label: "Resolution",
        ours: "The full-size image URLs the post itself loads",
        theirs: "A screenshot of the player, complete with on-screen UI",
      },
      {
        label: "Slideshow order",
        ours: "Every slide, in post order, numbered in the file name",
        theirs: "Only the first slide, or all of them unnumbered",
      },
    ],
  },

  "tiktok-story-downloader": {
    query: "Can I download a TikTok story before it expires?",
    answer:
      "Yes, while it is still live. A story is public for 24 hours and only then disappears, so paste its link during that window — the panel resolves the video slides in the story; photo-only story posts have no video stream to save.",
    comparison: [
      {
        label: "Story vs post",
        ours: "The link is inspected and the story's media type reported before you commit",
        theirs: "One generic \"download\" path that fails silently on stories",
      },
      {
        label: "Expiry",
        ours: "States the 24-hour window plainly, so a failure is never misread as a bug",
        theirs: "Promises story downloads that stopped being possible",
      },
      {
        label: "Watermark",
        ours: "The source stream, no overlay",
        theirs: "A re-shared copy with the account handle burned in",
      },
    ],
  },

  "tiktok-video-download-iphone": {
    query: "How do I download a TikTok video on iPhone without an app?",
    answer:
      "Copy the link in TikTok, open this page in Safari, paste, and tap Download HD MP4. The file lands in Files → Downloads; long-press it and choose Share → Save Video to put it in Photos.",
    comparison: [
      {
        label: "Install",
        ours: "Nothing — Safari, Chrome or Firefox is the whole client",
        theirs: "An app, a shortcut, or a profile that must be trusted first",
      },
      {
        label: "Where the file goes",
        ours: "Files → Downloads, then Photos after one Share tap",
        theirs: "\"Saved\" with no path given, usually into an app sandbox you cannot find",
      },
      {
        label: "Quality",
        ours: "Up to 1080p, the highest H.264 variant TikTok exposes",
        theirs: "A 720p re-encode of the watermarked copy",
      },
    ],
  },

  "vt-tiktok-com-downloader": {
    query: "How do I download a vt.tiktok.com short link?",
    answer:
      "Paste the short link exactly as TikTok's share sheet gives it — trailing slash and all. The redirect is followed server-side, the video ID is extracted, and the stream is resolved in the same request, so you never have to expand the link yourself.",
    comparison: [
      {
        label: "Short-link handling",
        ours: "vt/vm redirects followed on the server, ID parsed before any upstream call",
        theirs: "\"Invalid URL\" until you open the app and copy a long link by hand",
      },
      {
        label: "Pasted text",
        ours: "The first valid URL is lifted out of share-sheet noise automatically",
        theirs: "The whole message is rejected as malformed input",
      },
      {
        label: "Expired signatures",
        ours: "A stale CDN link is re-resolved once, server-side, without a re-paste",
        theirs: "A dead link you must go back and copy again",
      },
    ],
  },

  "instagram-reels-audio": {
    // The old answer promised "an audio file with no video track attached" and
    // "the post's audio track, extracted once" — which the page's own FAQ
    // contradicted ("Why did I get a video when I asked for audio?") and which
    // the resolver cannot do: Instagram publishes no audio-only stream. A
    // snippet block is the one line a searcher reads before clicking, so a
    // claim there has to match the file that actually arrives.
    query: "How do I download audio from an Instagram Reel?",
    answer:
      "Copy the Reel's link, paste it above and download: that saves the Reel with its original AAC soundtrack, not a silent video and not a re-encode. Instagram publishes no audio-only stream, so the MP3 comes from that saved MP4 on your own device — VLC's Convert/Save, or one ffmpeg command.",
    comparison: [
      {
        label: "Login wall",
        ours: "Public Reels resolve with no session and no cookie",
        theirs: "\"Log in to continue\", or a browser extension reading your feed",
      },
      {
        label: "What the file is",
        ours: "The Reel itself, MP4 with the original AAC track and no re-encode",
        theirs: "An \"MP3\" that is a server-side transcode of the video, adding a second lossy generation",
      },
      {
        label: "Getting the MP3",
        ours: "Extracted locally from the file you already have, with an exact one-line command",
        theirs: "Held behind a countdown, a re-upload, or a paid \"HD\" tier",
      },
    ],
  },

  "facebook-reels-downloader": {
    query: "How do I download a Facebook Reel?",
    answer:
      "Copy the Reel's link — fb.watch, /share/r/ or /reel/ all work — paste it, and tap Download HD MP4. Redirect chains are resolved server-side, and only a muxed H.264 + AAC file is offered, so it never arrives silent.",
    comparison: [
      {
        label: "Share links",
        ours: "fb.watch and /share/r/ chains unwrapped on the server",
        theirs: "A canonical /videos/ permalink you must dig out of the page source",
      },
      {
        label: "Silent files",
        ours: "Video-only VP9 candidates rejected — audio is verified before a button appears",
        theirs: "A \"successful\" download that plays silently in QuickTime",
      },
      {
        label: "Audio and picture",
        ours: "One muxed progressive stream",
        theirs: "Separate tracks joined after the fact, drifting out of sync",
      },
    ],
  },

  "youtube-to-mp3": {
    query: "How do I convert a YouTube video to MP3?",
    answer:
      "Paste the watch, youtu.be or Shorts link and pick MP3. The highest-bitrate audio track YouTube exposes is fetched and encoded once on our bridge, so the file is a real MP3 rather than an M4A renamed.",
    comparison: [
      {
        label: "Encoder",
        ours: "ffmpeg on the bridge, from the original audio track",
        theirs: "A server-side re-encode of an already-downscaled stream",
      },
      {
        label: "Bitrate",
        ours: "Tied to what YouTube published — no invented 320 kbps",
        theirs: "A fixed 320 kbps label on padded audio",
      },
      {
        label: "Long videos",
        ours: "Audio is fetched as a stream, so a two-hour talk is not buffered in memory",
        theirs: "A timeout around the ten-minute mark",
      },
    ],
  },

  "youtube-shorts-to-mp3": {
    query: "How do I get the audio from a YouTube Short?",
    answer:
      "Paste the /shorts/ link and choose MP3. Shorts are ordinary videos served vertically, so the audio track is identical to the long-form path — extracted once, not recorded from playback.",
    comparison: [
      {
        label: "Shorts links",
        ours: "/shorts/<id> parsed directly, no redirect to the watch page needed",
        theirs: "\"Unsupported URL\" until you rewrite the link by hand",
      },
      {
        label: "Speed",
        ours: "Audio only — the video stream is never transferred",
        theirs: "The full MP4 downloaded, then stripped",
      },
      {
        label: "Output",
        ours: "A true MP3 encode, or the original M4A track",
        theirs: "A file with an .mp3 extension that is really AAC",
      },
    ],
  },

  "youtube-music-to-mp3": {
    query: "Can I download a song from YouTube Music as MP3?",
    answer:
      "Paste the music.youtube.com link and pick MP3. The same resolver handles it, with artwork and track metadata shown so you can confirm you have the right version before saving.",
    comparison: [
      {
        label: "music.youtube.com links",
        ours: "Recognised as watch URLs — no rewriting required",
        theirs: "Rejected unless you strip the domain yourself",
      },
      {
        label: "Album art",
        ours: "Shown with the track so a live version is not mistaken for the studio cut",
        theirs: "A bare filename with no metadata",
      },
      {
        label: "Audio quality",
        ours: "The best track YouTube serves for that upload, encoded once",
        theirs: "A re-encode with clipped peaks",
      },
    ],
  },

  "youtube-playlist-downloader": {
    query: "How do I download a whole YouTube playlist?",
    answer:
      "Paste the playlist link and the browser lists every video in it with its own download button. Playlists are enumerated server-side, so a 200-video list loads page by page instead of timing out.",
    comparison: [
      {
        label: "Enumeration",
        ours: "Server-side paging over the playlist, so length is not a limit",
        theirs: "One request per video, timing out somewhere past the first page",
      },
      {
        label: "Selection",
        ours: "Pick individual videos; nothing downloads until you choose",
        theirs: "All-or-nothing, with no preview of what is in the list",
      },
      {
        label: "Missing items",
        ours: "Private and deleted entries are shown as unavailable rather than skipped silently",
        theirs: "A short file count with no explanation",
      },
    ],
  },

  "youtube-shorts-downloader": {
    query: "How do I download a YouTube Short in HD?",
    answer:
      "Paste the /shorts/ link and tap Download HD MP4. You get the vertical 1080×1920 stream with its audio track, at the highest quality YouTube exposes for that upload.",
    comparison: [
      {
        label: "Aspect ratio",
        ours: "The native 1080×1920 vertical stream, untouched",
        theirs: "A letterboxed 16:9 conversion with black bars",
      },
      {
        label: "Codec",
        ours: "H.264 + AAC, verified by an MP4 probe before the button appears",
        theirs: "AV1 or VP9 that older phones and editors cannot open",
      },
      {
        label: "Audio",
        ours: "Muxed, so it plays with sound first time",
        theirs: "Video-only for Shorts served over DASH",
      },
    ],
  },

  "youtube-to-mp4-1080p": {
    query: "How do I download a YouTube video in 1080p?",
    answer:
      "Paste the link and choose the tallest rendition listed. The resolver asks for the highest progressive H.264 stream with audio already muxed in — 1080p when the upload carries it, 720p otherwise — which is the format that plays everywhere: no separate video and audio tracks to merge.",
    comparison: [
      {
        label: "Stream selection",
        ours: "Progressive 1080p H.264 picked whenever YouTube offers it",
        theirs: "The first rendition listed, often 360p",
      },
      {
        label: "Audio",
        ours: "Muxed in the file you download",
        theirs: "A silent 1080p file because DASH splits the tracks",
      },
      {
        label: "Verification",
        ours: "Container and codec probed, byte size shown before download",
        theirs: "A \"1080p\" button that produces whatever the API returned",
      },
    ],
  },

  "youtube-video-download-iphone": {
    query: "How do I download a YouTube video on iPhone?",
    answer:
      "Paste the link in Safari and tap Download MP4. Safari saves it to Files → Downloads; long-press the file and choose Share → Save Video to add it to Photos. No app and no Shortcut is needed.",
    comparison: [
      {
        label: "Client",
        ours: "The Safari tab you already have open",
        theirs: "An app install, a Shortcut, or a profile to trust",
      },
      {
        label: "Where it saves",
        ours: "Files → Downloads, with the Photos step spelled out",
        theirs: "Nowhere you can find afterwards",
      },
      {
        label: "Formats",
        ours: "MP4 for video, MP3 or M4A for audio, from the same link",
        theirs: "One format, usually with no audio track",
      },
    ],
  },
};
