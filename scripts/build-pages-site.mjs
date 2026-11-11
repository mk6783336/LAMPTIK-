#!/usr/bin/env node
/**
 * Build the GitHub Pages traffic funnel.
 *
 * Run:  npm run site:build
 *
 * Emits `docs/parasite-seo/site/`: the hub, the creator-tools page and eight
 * long-tail landing pages, plus a sitemap that lists all ten URLs. The pages are
 * generated rather than hand-written so that a shared header, the sibling-link
 * matrix and the JSON-LD cannot drift apart — and so that adding a page is one
 * entry in `PAGES`, not another copy of the same 200 lines.
 *
 * Rules the template enforces on every page:
 *   - one H1, then H2 sections that answer the query in the first sentence;
 *   - a FAQ whose questions are also the page's FAQPage JSON-LD (same array);
 *   - a working URL box that hands the link to the real resolver on
 *     lamptik.online — the static site never resolves anything itself;
 *   - dofollow contextual links to the matching canonical page;
 *   - links to all nine siblings, so the crawl graph is complete;
 *   - no external CSS/JS/fonts: one request, no layout shift, works offline.
 */

import fs from "node:fs";
import path from "node:path";

const OUT_DIR = path.join(process.cwd(), "docs/parasite-seo/site");
const SITE = "https://mk6783336.github.io";
const ORIGIN = "https://www.lamptik.online";
const UPDATED = "2026-11-11";

/** The eight landing pages, one per long-tail problem cluster. */
const PAGES = [
  {
    slug: "tiktok-1080p-h264-downloader",
    title: "TikTok 1080p H.264 downloader — the file Premiere and CapCut can open",
    description:
      "Download TikTok in 1080p H.264 MP4 with sound: what TikTok's play stream actually is, why a 1080p download can arrive silent, and how to get a file an editor will import.",
    h1: "TikTok in 1080p H.264 — the version an editor can actually open",
    tool: { path: "/", label: "TikTok downloader (no watermark)", mode: "url" },
    intro:
      "TikTok publishes each upload as a set of renditions, and the one the share sheet offers is not the one your editor wants. This page is about getting the 1080p H.264 file with its audio attached.",
    sections: [
      {
        h2: "Why the 1080p download is sometimes silent",
        body: [
          "TikTok's player can pull a video track and an audio track separately. A downloader that follows the player's manifest can save the video-only half, and you end up with a 1080p MP4 that has no sound anywhere — in QuickTime, Premiere or a phone gallery.",
          "The file worth keeping is the muxed progressive MP4: H.264 video and AAC audio in one container. If the tool cannot tell you the codec and the audio track before you press save, it is guessing.",
        ],
      },
      {
        h2: "H.264, not HEVC or AV1",
        body: [
          "Newer phones record HEVC to save space, and TikTok serves some uploads as VP9 or AV1. CapCut and older Premiere versions will refuse or stutter on those. H.264 High profile is the format every NLE on every machine decodes.",
          "If your only copy is HEVC, remux rather than re-encode: `ffmpeg -i in.mp4 -c copy out.mp4` fixes the container in seconds without touching quality.",
        ],
      },
      {
        h2: "Frames, bitrate and the 1080p ceiling",
        body: [
          "A 1080p TikTok is 1080×1920. Vertical, ~2–6 Mbps, 30 or 60 fps depending on the upload. There is no 4K to unlock — what the creator uploaded is the ceiling, and no downloader can invent detail that was never encoded.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I download a TikTok in 1080p without the watermark?",
        a: "Yes. TikTok keeps a clean `play` master and a stamped `wmplay` copy; requesting `play` gives you 1080p with no watermark and no re-encode.",
      },
      {
        q: "Why does my 1080p TikTok MP4 have no audio in Premiere?",
        a: "The downloaded file is a video-only stream. Re-download the muxed progressive MP4 (H.264 + AAC) or mux the pair with ffmpeg before importing.",
      },
      {
        q: "Does a 1080p download work on iPhone?",
        a: "Yes — Safari saves to Files, and Share → Save Video moves it into Photos. Nothing is installed.",
      },
    ],
    related: ["tiktok-slideshow-photo-saver", "fix-mp4-capcut-premiere-pro", "tiktok-safe-zone-1080x1920-checker"],
  },
  {
    slug: "instagram-reels-audio-mp3-extractor",
    title: "Instagram Reels audio extractor — save the original track as MP3 or M4A",
    description:
      "Extract a Reel's original audio to MP3 without a screen recording: where Instagram keeps the track, why the file matters, and how to get it onto an iPhone.",
    h1: "Save a Reel's audio, not a recording of it",
    tool: { path: "/instagram-reels-audio", label: "Reels audio extractor", mode: "url" },
    intro:
      "A Reel's audio is a real file on Instagram's CDN. Pulling it out is lossless; screen-recording it is not — you capture the speaker, the room and the compression twice.",
    sections: [
      {
        h2: "Original audio versus a screen recording",
        body: [
          "Recording a Reel with the phone mic re-encodes the sound and adds whatever the speaker plays back. Extracting the track gives you the exact AAC stream Instagram served, which is what you want for sampling or a voiceover reference.",
          "Instagram serves audio at roughly 128 kbps AAC inside the MP4. Converting that to MP3 will not add quality — it only changes the container.",
        ],
      },
      {
        h2: "Getting it onto an iPhone",
        body: [
          "Safari downloads land in Files → On My iPhone → Downloads. From there the MP3 opens in any player, and Share → Save to Files keeps it available offline.",
          "If you need it in a video project, keep it as M4A: re-encoding AAC to MP3 loses a generation for no benefit.",
        ],
      },
    ],
    faqs: [
      {
        q: "How do I save a Reel's audio to my iPhone?",
        a: "Copy the Reel link, open the extractor, choose audio, then find the file in Files → Downloads and move it wherever you keep media.",
      },
      {
        q: "Is the extracted audio the original quality?",
        a: "It is the same AAC stream Instagram streams — no re-record, no extra compression. Converting it to MP3 afterwards is a second lossy step.",
      },
      {
        q: "Can I extract audio from a private Reel?",
        a: "No. Private and followers-only posts have no public stream to fetch, by design.",
      },
    ],
    related: ["iphone-facebook-video-downloader", "tiktok-1080p-h264-downloader"],
  },
  {
    slug: "iphone-facebook-video-downloader",
    title: "Facebook video downloader for iPhone — Safari to camera roll, no app",
    description:
      "Download a Facebook video on iPhone with Safari: where the file goes, how to move it into Photos, and why long Watch videos download when other tools time out.",
    h1: "Facebook video to your iPhone camera roll, without an app",
    tool: { path: "/facebook-video-downloader", label: "Facebook downloader (HD, fb.watch)", mode: "url" },
    intro:
      "iOS cannot write into Photos from a website — that is a platform rule, not a missing feature. The two-step path below is what actually works in Safari, and it works for hour-long Watch videos too.",
    sections: [
      {
        h2: "The two-step save in Safari",
        body: [
          "Paste the link, choose Download HD MP4, and Safari puts the file in Files → On My iPhone → Downloads. Open Files, long-press the MP4, tap Share → Save Video, and it appears in Photos like a recorded clip.",
          "If the file plays inline instead of downloading, long-press the download button and choose Download Linked File.",
        ],
      },
      {
        h2: "fb.watch and share links",
        body: [
          "Facebook's short links redirect several times before reaching the video. A downloader has to follow that chain server-side; when it does, a fb.watch link behaves exactly like a full /videos/ URL.",
          "Long uploads stream through a proxy rather than being buffered, so an hour-long video does not hit a memory ceiling on the way to your phone.",
        ],
      },
    ],
    faqs: [
      {
        q: "Where do Facebook videos download to on iPhone?",
        a: "Files → On My iPhone → Downloads. Long-press the MP4 → Share → Save Video to add it to Photos.",
      },
      {
        q: "Why does a Facebook video sometimes fail to download?",
        a: "Private, friends-only, group-restricted or region-locked posts have no public stream — that is a permission boundary, not a bug.",
      },
      {
        q: "Do I need the Facebook app?",
        a: "No. The download happens in Safari, and nothing is installed or signed in.",
      },
    ],
    related: ["instagram-reels-audio-mp3-extractor", "tiktok-slideshow-photo-saver"],
  },
  {
    slug: "twitter-x-gif-to-mp4-converter",
    title: "X / Twitter GIF to MP4 — why the GIF is already an MP4, and how to save it",
    description:
      "Turn an X or Twitter GIF into a real MP4 file: the format X actually stores, why some GIFs have sound, and how to save one without a screen recorder.",
    h1: "X GIFs are MP4s — here is how to save one",
    tool: { path: "/twitter-video-downloader", label: "X video downloader", mode: "url" },
    intro:
      "Twitter has not stored GIFs as GIF for years. What you see looping is an H.264 MP4 with no audio track (or with one, if the uploader added sound). Saving it is a download, not a conversion.",
    sections: [
      {
        h2: "What X actually serves",
        body: [
          "The tweet's media object lists several MP4 variants at different bitrates. The highest one is usually 720p or 1080p, and it plays anywhere — Discord, Slack, Premiere, a phone gallery.",
          "Converting that MP4 to a literal .gif would multiply the file size by ten and drop the audio. Do it only if a tool requires the GIF format.",
        ],
      },
      {
        h2: "Save it on phone or desktop",
        body: [
          "On desktop, choosing the highest variant downloads a playable MP4. On iPhone the file lands in Files; on Android it goes to Downloads.",
          "If a GIF has sound, it is because the uploader posted a video — the same steps save it with the audio intact.",
        ],
      },
    ],
    faqs: [
      {
        q: "How do I download a GIF from X as MP4?",
        a: "Copy the post link, open the downloader and pick the highest-bitrate MP4 variant. No conversion is needed because X already stores it as MP4.",
      },
      {
        q: "Why does my downloaded GIF have no sound?",
        a: "Most X GIFs are silent by design — the media object has no audio track. If the original had sound, the MP4 variant carries it.",
      },
      {
        q: "Does this work for private accounts?",
        a: "No. Protected posts have no public media to fetch.",
      },
    ],
    related: ["tiktok-1080p-h264-downloader", "instagram-reels-audio-mp3-extractor"],
  },
  {
    slug: "tiktok-slideshow-photo-saver",
    title: "TikTok slideshow downloader — save photo posts and their audio",
    description:
      "Photo-mode TikToks have no MP4. What a slideshow actually is, how to save the images and the sound separately, and why most downloaders return a 0-byte file.",
    h1: "Photo posts and slideshows: there is no video to download",
    tool: { path: "/", label: "TikTok downloader", mode: "url" },
    intro:
      "A slideshow is a set of images plus an audio track, rendered by the app. Tools that promise “the video” for a photo post are either screen-recording or writing a broken file.",
    sections: [
      {
        h2: "What you can actually save",
        body: [
          "Each slide is a separate image at TikTok's stored resolution, and the sound is a normal audio stream. The animation, the timing and the transitions exist only inside the player.",
          "That is why a slideshow download gives you a folder of stills, not a 15-second clip — and why the honest answer is to say so up front.",
        ],
      },
      {
        h2: "Making the clip you wanted",
        body: [
          "If you need a video version, put the stills on a 1080×1920 timeline at the original timings and add the extracted audio. You control the motion instead of inheriting a screen capture.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can I download a TikTok slideshow as a video?",
        a: "Not as one file. TikTok renders slides in the app, so you get the individual images plus the audio track.",
      },
      {
        q: "Why did the downloader give me a 0-byte file?",
        a: "It asked for a video stream that a photo post does not have. A tool that detects this should explain it rather than write an empty file.",
      },
      {
        q: "Do photo posts work on iPhone?",
        a: "Yes — images save to Files from Safari, and the audio can be saved to Photos or kept in Files.",
      },
    ],
    related: ["tiktok-1080p-h264-downloader", "instagram-reels-audio-mp3-extractor"],
  },
  {
    slug: "tiktok-safe-zone-1080x1920-checker",
    title: "TikTok safe zone checker for 1080×1920 — where the UI actually covers your video",
    description:
      "The real TikTok and Reels safe area on a 1080×1920 canvas: which pixels the buttons and caption cover, and a checker that draws them over your own frame.",
    h1: "The 1080×1920 safe zone, measured rather than guessed",
    tool: { path: "/tiktok-safe-zone-checker", label: "Safe-zone checker", mode: "plain" },
    intro:
      "“Keep text in the middle” is not a specification. The right side is the action rail, the bottom-left is the caption block, and the two differ between TikTok and Reels.",
    sections: [
      {
        h2: "The numbers that matter",
        body: [
          "On a 1080×1920 canvas, the right rail occupies roughly the outer 120–150 px, and the caption plus sound label cover the bottom ~350 px on the left. The top carries a status strip on some devices.",
          "Keeping critical text inside the central 1080×1420 box survives both apps. Anything outside it is a bet on one viewer's device.",
        ],
      },
      {
        h2: "Check the frame, not the template",
        body: [
          "A template tells you where the overlays were on the designer's phone. A checker draws them over your actual frame at the real size, so a headline that looked fine on a mockup is visibly clipped before you upload.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is the TikTok safe zone in pixels?",
        a: "Treat the central 1080×1420 of a 1080×1920 frame as safe: the right rail and the bottom caption block both fall outside it.",
      },
      {
        q: "Is the Reels safe zone the same?",
        a: "Close but not identical — the action rail sits higher and the caption block is shorter. Testing both in the checker avoids re-editing later.",
      },
      {
        q: "Does the checker upload my image?",
        a: "No. It runs entirely in the browser.",
      },
    ],
    related: ["tiktok-money-rpm-calculator-2026", "tiktok-1080p-h264-downloader"],
  },
  {
    slug: "tiktok-money-rpm-calculator-2026",
    title: "TikTok RPM calculator 2026 — what 1,000 views actually pays",
    description:
      "Work out TikTok earnings from views and RPM, including the 24% US withholding, the difference between For You and search traffic, and why headline rates mislead.",
    h1: "What 1,000 views pays, with the withholding included",
    tool: { path: "/tiktok-money-calculator", label: "RPM calculator", mode: "plain" },
    intro:
      "RPM is revenue per mille — per thousand views — and it already nets out the platform's share. Most “TikTok pays X” articles quote a gross range and call it a rate.",
    sections: [
      {
        h2: "The only formula you need",
        body: [
          "Earnings ≈ (views ÷ 1000) × RPM. If you are not a US taxpayer, subtract the 24% US withholding from that figure. A $0.40 RPM on 100,000 views is about $40 before withholding.",
          "Traffic source changes the number: For You views and search views are monetised differently, so a single average across both is a rough guide.",
        ],
      },
      {
        h2: "Why the headline numbers disagree",
        body: [
          "Creator Rewards, the old Creator Fund and regional programmes all pay different rates, and most articles quote the best-case region. A calculator that takes your own RPM is more useful than one that publishes a “typical” figure.",
        ],
      },
    ],
    faqs: [
      {
        q: "How much does TikTok pay per 1,000 views?",
        a: "It varies by programme, region and traffic source. Put your own RPM into the calculator rather than trusting a single published average.",
      },
      {
        q: "What is the 24% withholding?",
        a: "The US withholds 24% of payouts to creators who are not US taxpayers unless a treaty reduces it.",
      },
      {
        q: "Do search views pay more than For You views?",
        a: "They can, because intent differs. The calculator lets you split the two instead of averaging them.",
      },
    ],
    related: ["tiktok-safe-zone-1080x1920-checker", "tiktok-1080p-h264-downloader"],
  },
  {
    slug: "fix-mp4-capcut-premiere-pro",
    title: "Fix “MP4 won't import” in CapCut and Premiere Pro — the four real causes",
    description:
      "Media offline, unsupported format, audio missing: the four reasons a downloaded MP4 fails to import, with the ffmpeg command that fixes each in seconds.",
    h1: "MP4 won't import? It is one of four things",
    tool: { path: "/guides/mp4-wont-import-capcut-premiere-pro", label: "the full walkthrough", mode: "plain" },
    intro:
      "The container says MP4, but the codecs inside decide whether an editor opens it. Four causes cover almost every “media offline” and “unsupported format” message.",
    sections: [
      {
        h2: "1. HEVC (H.265) and 2. VP9 / AV1",
        body: [
          "iPhones shoot HEVC by default and some platforms serve VP9 or AV1 straight from a DASH manifest. Premiere and older CapCut builds refuse both. Remuxing to H.264 fixes it without a visible quality loss at CRF 18.",
          "`ffmpeg -i in.mp4 -c:v libx264 -crf 18 -preset veryfast -c:a aac -b:a 192k out.mp4`",
        ],
      },
      {
        h2: "3. No audio track, 4. Variable frame rate",
        body: [
          "A video-only download imports with a silent clip, which reads as “broken audio”. A phone screen recording has a variable frame rate that drifts against the timeline — force a constant 30 or 60 fps on import.",
          "Both are properties of the file, not of your project settings, which is why changing the sequence preset never helps.",
        ],
      },
    ],
    faqs: [
      {
        q: "Why won't CapCut import my downloaded MP4?",
        a: "Most often the file is HEVC or a video-only stream. Re-encode to H.264 + AAC, or download the muxed H.264 file instead.",
      },
      {
        q: "Can I fix it without re-encoding?",
        a: "Yes for the container: `ffmpeg -c copy` remuxes HEVC into a file some editors accept. Converting to H.264 is the reliable fix.",
      },
      {
        q: "Why is the audio out of sync after import?",
        a: "A variable-frame-rate source. Set the import to a constant frame rate that matches the recording.",
      },
    ],
    related: ["tiktok-1080p-h264-downloader", "twitter-x-gif-to-mp4-converter"],
  },
  {
    slug: "video-thumbnail-downloader",
    title: "Video thumbnail downloader — the cover frame at the size it was uploaded",
    description:
      "Save a video's cover frame at full resolution instead of screenshotting it: where the platforms keep the thumbnail, which size to pick, and why a screenshot is never as sharp.",
    h1: "The cover frame, at the resolution it was actually stored",
    tool: { path: "/video-thumbnail-downloader", label: "thumbnail downloader", mode: "url" },
    intro:
      "A thumbnail is a separate image file, not a frame pulled out of the video. That is why the original is sharper than any screenshot of the player — and why asking for the largest size matters.",
    sections: [
      {
        h2: "Where the full-size image lives",
        body: [
          "Each platform stores the cover as its own JPEG or WebP at several widths. YouTube publishes `maxresdefault` (1280×720) beside the smaller `hqdefault`; TikTok and Instagram keep a 1080-wide vertical version for the feed. A downloader asks for the largest one that exists rather than the one the page happened to load.",
          "When a creator never uploaded a custom cover, YouTube falls back to a frame grab and `maxresdefault` can 404. The correct answer is then `sddefault` or `hqdefault` at 640×480 — a smaller real file beats a broken link.",
        ],
      },
      {
        h2: "Why a screenshot is softer",
        body: [
          "A phone screenshot captures the rendered player: the image has already been scaled to the screen, and the browser or app re-encodes it. Saving the stored file skips both steps, so the pixels you get are the pixels that were uploaded.",
          "That difference is visible the moment you need the image larger than a phone: a screenshot of a 1080-wide cover on a 390-pixel screen holds roughly a third of the detail.",
        ],
      },
      {
        h2: "What to use it for",
        body: [
          "Reference boards, a client deck, a comparison grid, or a re-upload where you own the video and want its original cover. Attribution still belongs to the creator, and a cover is their work even when the video is yours to download.",
        ],
      },
    ],
    faqs: [
      {
        q: "How do I download a video thumbnail in full resolution?",
        a: "Paste the video link into the thumbnail tool and pick the largest size offered. It returns the stored JPEG, not a screenshot of the player.",
      },
      {
        q: "Why does the YouTube maxres thumbnail not load?",
        a: "The uploader never set a custom cover, so no maxres image was generated. The 640×480 variant is the real fallback.",
      },
      {
        q: "Is a thumbnail different from a video frame?",
        a: "Yes. It is a separate image the creator chose, stored at its own resolution — so it can be sharper or entirely different from any frame in the clip.",
      },
    ],
    related: ["tiktok-1080p-h264-downloader", "tiktok-caption-hashtag-extractor"],
  },
  {
    slug: "tiktok-caption-hashtag-extractor",
    title: "TikTok caption and hashtag extractor — copy the text without retyping it",
    description:
      "Pull a TikTok caption and its hashtags out as plain editable text: emoji, line breaks and the exact wording preserved, with no OCR and no retyping.",
    h1: "The caption as text, not as a picture of text",
    tool: { path: "/tiktok-caption-hashtag-extractor", label: "caption & hashtag extractor", mode: "url" },
    intro:
      "Captions are the only part of a post that is plain text, and they are the part people retype by hand. Extraction returns the string the creator actually published, emoji and line breaks included.",
    sections: [
      {
        h2: "What comes back",
        body: [
          "The full caption, the hashtag list separated from the prose, and the @mentions, each on its own line so the text can go straight into a spreadsheet, a script or a note. Nothing is transcribed, so the wording cannot drift.",
          "Emoji survive because they are characters in the string, not pixels. That is the difference between extraction and pointing a phone at the screen.",
        ],
      },
      {
        h2: "Why hashtags are worth separating",
        body: [
          "A caption's hashtags are the only structured signal in it. Once they are a clean list you can compare which tags a niche actually reuses, build a starter set for your own posts, or keep a record of what you published without scrolling back through the app.",
          "Copying the whole caption keeps the hashtags glued to the sentence, which is why most people give up and retype them.",
        ],
      },
      {
        h2: "Language and right-to-left text",
        body: [
          "The extractor returns the caption in its original script, so Arabic, Urdu or Hindi captions stay readable instead of turning into boxes. Paste them somewhere that supports the same script and the text is unchanged.",
        ],
      },
    ],
    faqs: [
      {
        q: "How do I copy a TikTok caption with its hashtags?",
        a: "Paste the post link into the extractor. It returns the caption and a separate hashtag list as plain text you can copy in one click.",
      },
      {
        q: "Does it work for long captions?",
        a: "Yes — the whole caption is returned, including line breaks, up to the platform's own limit.",
      },
      {
        q: "Can I extract captions in bulk?",
        a: "One link at a time, which keeps the tool free and avoids hammering the platform. A list of links is fine to work through.",
      },
    ],
    related: ["video-thumbnail-downloader", "tiktok-1080p-h264-downloader"],
  },
  {
    slug: "bajar-videos-tiktok-sin-marca-de-agua",
    lang: "es",
    title: "Bajar videos de TikTok sin marca de agua — online, gratis y en HD",
    description:
      "Cómo bajar un video de TikTok sin marca de agua en HD desde el navegador del móvil o del ordenador: sin app, sin cuenta y con el audio incluido.",
    h1: "Bajar videos de TikTok sin marca de agua, en HD",
    tool: { path: "/es", label: "descargador de TikTok sin marca de agua", mode: "url" },
    intro:
      "TikTok guarda dos archivos por cada video: el original limpio que reproduce su reproductor y una copia con el logo incrustado. Descargar sin marca de agua no es editar nada: es pedir el primero.",
    sections: [
      {
        h2: "Por qué existe una versión sin marca de agua",
        body: [
          "El archivo `play` es el que se reproduce dentro de la aplicación y no lleva logo. El archivo `wmplay` es la copia que ofrece el botón de compartir, con la marca ya grabada en la imagen. Un descargador correcto pide `play`, así que el video que guardas nunca tuvo marca de agua que quitar.",
          "Recortar o difuminar el logo no es la misma cosa: pierdes parte del encuadre y la calidad baja porque el archivo se vuelve a comprimir. Si el resultado tiene menos detalle que el original, se está recodificando.",
        ],
      },
      {
        h2: "En el móvil: iPhone y Android",
        body: [
          "En iPhone, Safari guarda el archivo en Archivos → En mi iPhone → Descargas. Desde ahí puedes abrirlo o moverlo a Fotos con Compartir → Guardar video; una web no puede escribir directamente en el carrete, es una regla de iOS.",
          "En Android el MP4 aparece en Descargas y se abre con la galería o con cualquier reproductor. No hace falta instalar nada ni crear una cuenta.",
        ],
      },
      {
        h2: "HD de verdad, y con audio",
        body: [
          "La resolución máxima es la que subió el creador: si subió 1080×1920, eso es lo que hay; ningún descargador puede inventar detalle que nunca se grabó. Lo que sí debe comprobarse es que el archivo incluya pista de audio, porque algunos descargadores guardan solo la pista de video y el resultado se ve mudo en el editor.",
        ],
      },
    ],
    faqs: [
      {
        q: "¿Cómo bajo un video de TikTok sin marca de agua?",
        a: "Copia el enlace del video (Compartir → Copiar enlace), pégalo en el descargador y elige la calidad. El archivo que se guarda es el original limpio, sin logo.",
      },
      {
        q: "¿Se puede en HD y con sonido?",
        a: "Sí. Se descarga el MP4 en la máxima resolución publicada, con la pista de audio incluida, sin recodificar.",
      },
      {
        q: "¿Funciona en iPhone sin instalar apps?",
        a: "Sí. Todo ocurre en Safari; el archivo cae en Descargas y desde ahí lo pasas a Fotos.",
      },
      {
        q: "¿Es gratis?",
        a: "Sí, sin registro y sin límite de descargas diarias más allá del uso razonable.",
      },
    ],
    related: ["tiktok-1080p-h264-downloader", "instagram-reels-audio-mp3-extractor"],
  },
];

const SIBLINGS = [
  { href: "index.html", label: "Downloader hub" },
  { href: "creator-tools.html", label: "Creator tools" },
  ...PAGES.map((page) => ({ href: `${page.slug}.html`, label: page.h1.split("—")[0].trim() })),
];

const esc = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const STYLE = `
:root{--bg:#0b0d12;--panel:#12151d;--line:#232838;--text:#eef1f7;--muted:#a2acc2;--accent:#7cf2c8;--accent-2:#9d8bff}
@media (prefers-color-scheme:light){:root{--bg:#f7f8fb;--panel:#fff;--line:#e3e7ef;--text:#151a23;--muted:#5a6478;--accent:#0a7f62;--accent-2:#5b46d6}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}
.wrap{width:100%;max-width:900px;margin:0 auto;padding:0 18px}
header{padding:18px 0;border-bottom:1px solid var(--line)}
header .wrap{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.brand{font-weight:700;letter-spacing:-.02em;font-size:16px}.brand span{color:var(--accent)}
nav a{color:var(--muted);text-decoration:none;font-size:14px;margin-left:14px}
nav a:hover{color:var(--text)}
main{padding:34px 0 10px}
h1{font-size:clamp(26px,4.6vw,40px);line-height:1.1;letter-spacing:-.03em;margin:0 0 12px}
h2{font-size:clamp(20px,3.2vw,26px);letter-spacing:-.02em;margin:32px 0 10px}
h3{font-size:16px;margin:0 0 6px}
p{margin:0 0 12px}
.lede{color:var(--muted);max-width:64ch}
a{color:var(--accent)}
form{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0 8px}
input[type=url]{flex:1 1 300px;min-width:0;padding:12px 14px;border-radius:10px;border:1px solid var(--line);background:var(--panel);color:var(--text);font-size:15px}
input[type=url]:focus{outline:2px solid var(--accent);outline-offset:1px}
button{padding:12px 18px;border-radius:10px;border:0;background:var(--accent);color:#052e24;font-weight:700;font-size:15px;cursor:pointer}
.hint{color:var(--muted);font-size:13px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px;margin:12px 0}
details{border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:8px;background:var(--panel)}
summary{cursor:pointer;font-weight:600}
details p{color:var(--muted);margin:8px 0 0}
ul.siblings{list-style:none;padding:0;margin:8px 0 0;display:grid;gap:6px;grid-template-columns:1fr}
@media(min-width:640px){ul.siblings{grid-template-columns:1fr 1fr}}
ul.siblings a{display:block;padding:10px 12px;border:1px solid var(--line);border-radius:10px;text-decoration:none;font-size:14px;background:var(--panel)}
ul.siblings a:hover{border-color:var(--accent)}
footer{padding:24px 0 40px;border-top:1px solid var(--line);color:var(--muted);font-size:13px}
footer a{color:var(--muted)}
`;

/** JSON-LD must be valid JSON: escape nothing else, but never inject raw `</`. */
const jsonld = (data) => JSON.stringify(data).replace(/</g, "\\u003c");

function pageHtml(page) {
  const url = `${SITE}/${page.slug}.html`;
  const siblings = SIBLINGS.filter((entry) => entry.href !== `${page.slug}.html`).slice(0, 9);
  const graph = [
    {
      "@type": "WebPage",
      "@id": `${url}#page`,
      url,
      name: page.title,
      description: page.description,
      inLanguage: page.lang ?? "en",
      isPartOf: { "@id": `${SITE}/#site` },
    },
    {
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: page.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Downloader hub", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: page.h1, item: url },
      ],
    },
  ];

  const form =
    page.tool.mode === "url"
      ? `<form class="tool" autocomplete="off">
      <input type="url" inputmode="url" placeholder="Paste a ${page.slug.includes("facebook") ? "Facebook" : page.slug.includes("twitter") ? "X / Twitter" : page.slug.includes("instagram") ? "Instagram" : "TikTok"} link…" aria-label="Video link" required />
      <button type="submit">Open the downloader</button>
    </form>
    <p class="hint">The link is handed to <a href="${ORIGIN}${page.tool.path}">${page.tool.label}</a>, which resolves the file — this page never touches your download.</p>`
      : `<p><a class="cta" href="${ORIGIN}${page.tool.path}">Open ${page.tool.label} →</a></p>
    <p class="hint">Runs in the browser on ${ORIGIN.replace("https://", "")} — nothing is uploaded from this page.</p>`;

  return `<!doctype html>
<html lang="${page.lang ?? "en"}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}" />
<link rel="canonical" href="${url}" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${esc(page.title)}" />
<meta property="og:description" content="${esc(page.description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:site_name" content="free.video.tools" />
<style>${STYLE}</style>
<script type="application/ld+json">${jsonld({ "@context": "https://schema.org", "@graph": graph })}</script>
</head>
<body>
<header><div class="wrap">
  <div class="brand">free<span>.</span>video<span>.</span>tools</div>
  <nav><a href="index.html">Hub</a><a href="creator-tools.html">Creator tools</a><a href="#faq">FAQ</a></nav>
</div></header>
<main class="wrap">
  <h1>${esc(page.h1)}</h1>
  <p class="lede">${esc(page.intro)}</p>
  ${form}
  ${page.sections
    .map(
      (section) => `<h2>${esc(section.h2)}</h2>
  ${section.body.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("\n  ")}`,
    )
    .join("\n  ")}
  <h2 id="faq">Questions this page answers</h2>
  ${page.faqs.map((faq) => `<details><summary>${esc(faq.q)}</summary><p>${esc(faq.a)}</p></details>`).join("\n  ")}
  <h2>Keep reading</h2>
  <ul class="siblings">
    ${siblings.map((entry) => `<li><a href="${entry.href}">${esc(entry.label)}</a></li>`).join("\n    ")}
  </ul>
</main>
<footer><div class="wrap"><p>Independent guides. Not affiliated with TikTok, Instagram, Meta, Google or X. Download your own work or content you have permission to use. Updated ${UPDATED}.</p></div></footer>
<script>
(function(){
  var form=document.querySelector("form.tool");
  if(!form) return;
  var input=form.querySelector("input[type=url]");
  function open(url){var v=(url||"").trim();if(v) location.href="${ORIGIN}/?url="+encodeURIComponent(v);}
  form.addEventListener("submit",function(e){e.preventDefault();open(input.value);});
  input.addEventListener("paste",function(){setTimeout(function(){if(input.value.trim().length>10) open(input.value);},60);});
})();
</script>
</body>
</html>
`;
}

function sitemap() {
  const urls = [`${SITE}/`, `${SITE}/creator-tools.html`, ...PAGES.map((page) => `${SITE}/${page.slug}.html`)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url, index) => `  <url>
    <loc>${url}</loc>
    <lastmod>${UPDATED}</lastmod>
    <changefreq>${index < 2 ? "weekly" : "monthly"}</changefreq>
    <priority>${index === 0 ? "1.0" : index === 1 ? "0.8" : "0.7"}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  let written = 0;
  for (const page of PAGES) {
    const file = path.join(OUT_DIR, `${page.slug}.html`);
    fs.writeFileSync(file, pageHtml(page));
    written += 1;
    console.log(`[site] ${path.relative(process.cwd(), file)}`);
  }
  fs.writeFileSync(path.join(OUT_DIR, "sitemap.xml"), sitemap());
  console.log(`[site] sitemap.xml — ${PAGES.length + 2} URLs`);
  console.log(`[site] ${written} landing page(s) rebuilt`);
}

main();
