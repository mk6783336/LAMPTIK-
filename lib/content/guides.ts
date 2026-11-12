/**
 * Editorial content for the guides hub.
 *
 * Four hubs, not fourteen pages.
 *
 * Search Console measured the previous set over 28 finalised days: fourteen
 * guide URLs earned 26 impressions between them and zero clicks, and not one of
 * their queries reached two impressions. They were not ranking badly — they
 * were answering questions too small to have an audience, each on its own URL,
 * which also meant fourteen crawl targets competing with the money pages for a
 * crawl budget Google is already rationing (79 of 98 URLs indexed).
 *
 * So the guides were consolidated by intent instead of by keyword:
 *
 *   A. download      — watermark, every device, short links, Files → Photos
 *   B. audio         — M4A vs MP3, bitrates, what an extraction contains
 *   C. quality       — export settings, repurposing, editor imports, round trips
 *   D. legal & safety — copyright, enforcement, APKs vs extensions
 *
 * The retired URLs 301 to the hub that absorbed their content (see
 * `next.config.ts`), and the two platform-specific guides redirect into the
 * Instagram and Facebook tool pages, which is where their readers were trying
 * to go anyway.
 *
 * Every block here renders as visible page content — the JSON-LD only
 * describes what readers already see.
 */
export interface GuideSection {
  heading: string;
  paragraphs: string[];
  list?: string[];
}

export interface Guide {
  slug: string;
  title: string;
  /**
   * Compact browser-tab / SERP title. The root layout appends " · LAMP TIK",
   * so keep this at ≤ 51 characters to stay under Google's ~62-char cut.
   * The full `title` still renders as the page H1 and as the JSON-LD headline.
   */
  metaTitle?: string;
  description: string;
  updatedAt: string;
  /** Short answer surfaced under the H1 — targets featured snippets. */
  shortAnswer: string;
  sections: GuideSection[];
  related: string[];
}

export const GUIDES: Guide[] = [
  {
    slug: "download-tiktok-video-without-watermark",
    title: "How to Download a TikTok Video Without a Watermark — on Any Device",
    metaTitle: "Download TikTok Without Watermark (Any Device)",
    description:
      "Save any public TikTok as a clean HD MP4, on iPhone, Android or desktop: why watermarks exist, what a vt.tiktok.com link is, and where the file actually lands.",
    updatedAt: "2026-11-12",
    shortAnswer:
      "Copy the video's link from TikTok's share menu, paste it into LAMP TIK, and tap Download Without Watermark. The tool resolves the original MP4 that TikTok's CDN serves to its own app — the same file, minus the animated username overlay that the share menu adds. On iPhone it lands in Files, on Android in Downloads or Gallery.",
    sections: [
      {
        heading: "Why TikTok adds a watermark",
        paragraphs: [
          "When you save a video through TikTok's own share menu, the app composites a second layer over the footage: an animated watermark with the creator's username and the TikTok mark, positioned to move between corners so it can't be cropped out cleanly. The watermarked file is a re-encode — the platform renders a new MP4 with the overlay burned in.",
          "Public videos also exist as a clean original: the stream the TikTok player itself requests. It carries no overlay, because the watermark is added by the app's export path, not by the source file. A downloader that fetches that source stream returns the video exactly as the creator uploaded it.",
        ],
      },
      {
        heading: "Step by step, on phone and desktop",
        list: [
          "In TikTok, tap Share → Copy link. On desktop, open the video page and copy the URL from the address bar.",
          "Paste the link into the field on this page. Short links (vt.tiktok.com or vm.tiktok.com) work as-is — no need to expand them.",
          "Tap Download HD MP4 (No Watermark). The tool resolves the video ID, requests the source stream, and shows you the title, creator, duration, resolution and file size before anything downloads.",
          "On iPhone and iOS, Safari writes the file to Files → On My iPhone → Downloads. In Files, long-press it → Share → Save to Video to put it in Photos.",
          "On Android the file saves to Downloads and Gallery picks it up on the next media scan. Chrome, Samsung Internet and Firefox all work.",
          "On a slow connection, use Download Fast MP4 (SD) for a smaller file of the same video — it is still watermark-free.",
        ],
        paragraphs: [
          "The whole flow takes a few seconds. Nothing is installed, no account is created, and the resolved link is not stored after your session.",
        ],
      },
      {
        heading: "A short link is a redirect, not a video",
        paragraphs: [
          "When you tap Copy link, TikTok hands you a shortened URL: vt.tiktok.com for most of the world, vm.tiktok.com in some Asian regions. The code after the domain maps to a full video URL on TikTok's servers. Nothing about the video lives at the short link itself — it is a pointer, resolved fresh on every request, which is why pasting it into a downloader works.",
          "That also explains the failures. A link cut off mid-message points at nothing; a short link whose video was made private stops redirecting; a region-locked post lands on a login wall; and lookalike domains (tt.site, tiktokv.com) are not TikTok links at all. Only tiktok.com, vt.tiktok.com and vm.tiktok.com are real.",
          "Paste the complete short link — trailing slash included. The tool resolves it server-side, so browser restrictions on redirects never apply. If it still fails, open the link yourself first: if it does not play in TikTok, no downloader can fetch it, and the reason is the video, not the link.",
        ],
      },
      {
        heading: "Why the file is in Files and not in Photos (iPhone)",
        paragraphs: [
          "Photos is not a downloads folder. Apple keeps it a curated library: only media that arrives through the camera, a share-sheet action, AirDrop, iCloud or the Photos API is written there. Safari's download manager has no permission to add to it, so a downloaded MP4 stays in Files until you hand it over explicitly. That is a deliberate boundary, not a bug, and it is why \"the download worked but the video isn't in my gallery\" is the most common iPhone complaint about any downloader.",
          "If Save to Photos is missing from the share sheet, one of four things is true: the download has not finished (a partial file cannot be imported), the format is not one Photos accepts (MP4 H.264/HEVC and MOV are fine; WebM, MKV and audio files are not), the phone has no room for a second copy, or the share sheet was opened from a preview player instead of a long-press on the file.",
        ],
        list: [
          "Open the page in Safari, not inside TikTok's in-app browser — in-app browsers cannot write to Files at all.",
          "Pause Private Relay or a VPN for the download: signed media URLs are tied to your IP, and a mid-transfer IP change invalidates them.",
          "Turn off Low Power Mode, which suspends background transfers when the screen locks.",
          "If a download stalls at 99%, leave the tab open for a minute — Safari resumes a dropped transfer rather than restarting from zero.",
        ],
      },
      {
        heading: "What determines the quality",
        paragraphs: [
          "You always get the highest resolution the creator uploaded and TikTok still serves publicly. Most uploads since 2022 are 1080p or higher; older or heavily re-shared videos may be 720p. The result panel shows the file size before you download, which is the quickest honest signal of quality — a 15-second HD clip is typically 3–8 MB, while the same clip at low resolution is under 1 MB.",
          "Audio is separate. The MP3 button extracts the video's sound track — the original sound, or the licensed music TikTok mixed in — so you don't need to download a video to get a ringtone or sample.",
        ],
      },
      {
        heading: "Stories, photo slideshows and other platforms",
        paragraphs: [
          "TikTok stories and photo slideshows are image collections, not video streams — there is no MP4 for any downloader to extract. LAMP TIK detects photo posts and tells you so instead of producing a broken file. Videos embedded inside a story screen are still regular video posts and download normally through their own link.",
          "Instagram Reels, Facebook videos and YouTube links use the same flow on their own pages: paste the post link and pick the highest rendition the platform published. A Reel is usually 1080×1920; a Facebook Watch upload can run past 1 GB, and long files stream from the platform's CDN straight to your disk rather than through a server that has to buffer them first.",
        ],
        list: [
          "Video posts (regular TikToks): fully supported, watermark-free, up to the creator's max resolution.",
          "Photo slideshows: not downloadable as video — the tool detects and flags them.",
          "Story-only posts: expire after 24 hours and are never exposed as public streams.",
        ],
      },
      {
        heading: "Common reasons a download fails",
        list: [
          "Private videos: only public videos can be resolved. If the link opens to a login screen in TikTok, it can't be downloaded — and any tool that asks for your password is harvesting it.",
          "Deleted or removed videos: if the creator deleted it or TikTok removed it for a policy violation, the stream no longer exists.",
          "Region-locked videos: some content is limited to certain countries. Resolving from another region will fail.",
          "Expired stream links: signed CDN URLs are short-lived. If a download errors out, fetch the video again — every request issues a fresh URL.",
        ],
        paragraphs: [
          "If the link works in the TikTok app but fails here, wait a minute and retry. TikTok rate-limits aggressively during traffic spikes, and a fresh request usually succeeds.",
        ],
      },
    ],
    related: [
      "download-tiktok-audio-as-mp3",
      "why-tiktok-video-quality-drops-after-upload",
      "is-downloading-tiktok-videos-legal",
    ],
  },
  {
    slug: "download-tiktok-audio-as-mp3",
    title: "Download TikTok Audio as MP3 — Bitrates, M4A and What You Actually Get",
    metaTitle: "Download TikTok Audio as MP3 (Bitrates)",
    description:
      "How to extract just the audio from a public TikTok, why M4A and MP3 are different buttons, what bitrate you really get, and the legal limits of reusing a sound.",
    updatedAt: "2026-11-12",
    shortAnswer:
      "Paste the video's link into LAMP TIK, then choose Download Audio for TikTok's original track (M4A/AAC when that is what the platform serves) or Download Audio (MP3) for a true MP3 encoded on our bridge. Either way you get sound only, at roughly the bitrate TikTok published — around 128 kbps — with no video track attached.",
    sections: [
      {
        heading: "Sound-only downloads, explained",
        paragraphs: [
          "Every TikTok video carries two audio possibilities: an original sound recorded by the creator, or a licensed track from TikTok's music library. Both are delivered as an audio stream alongside the video stream, which means a downloader can request that stream on its own instead of pulling the whole MP4 and stripping the sound afterwards.",
          "The result is a plain audio file with no video track and no watermark. It works for ringtones, samples, podcast clips, offline listening, or archiving a sound you created yourself.",
        ],
      },
      {
        heading: "Original sound vs. licensed music",
        paragraphs: [
          "TikTok labels the audio on every post. In the result panel you will see either an \"original sound - username\" credit, which means the creator recorded or uploaded that audio, or an official track name with an artist, which means the sound comes from TikTok's licensed catalogue and may be region-restricted.",
          "That label matters for how you can use the file. An original sound belongs to its creator; a licensed track belongs to the rights holders and to TikTok's licence. Downloading either one does not transfer ownership. If you only need the sound for personal listening, neither distinction changes the download — but it changes what you may legally do with it afterwards.",
        ],
      },
      {
        heading: "M4A or MP3 — which button should you press?",
        paragraphs: [
          "TikTok commonly serves audio as AAC inside an M4A container at around 128 kbps. That is the original track: downloading it does not add a second lossy generation, and it is the best copy the platform will give you.",
          "Some players and older devices do not open M4A cleanly, so the result also offers Download Audio (MP3). That button asks our bridge to decode the same source track and encode a real MP3 with ffmpeg. It is a genuine MP3, not an M4A file renamed — but it is still a second lossy encode, so it cannot sound better than the AAC source. Nothing is upscaled to a fake 320 kbps: the bitrate you get is tied to the bitrate TikTok published.",
          "Choose M4A when compatibility is not a problem and you want the least-processed copy. Choose MP3 when you need a file that opens in an old car stereo, a sample pack, or a player that refuses AAC.",
        ],
      },
      {
        heading: "How TikTok encodes audio, and why 320 kbps claims are noise",
        paragraphs: [
          "Every upload gets re-encoded on TikTok's servers. The music or original sound is compressed to AAC — the modern sibling of MP3, with better stereo imaging and fewer artefacts on cymbals and sibilance at the same bitrate — at around 128 kbps stereo for delivery. It is a deliberate balance: crisp on phone speakers and earbuds, small enough to load on congested networks. Some quieter or more complex material survives a little softer; the platform does not publish per-video bitrates, but ~128 kbps is the practical norm.",
          "So a tool promising a fixed 320 kbps from a 128 kbps source is padding the file, not improving it. Extracting once preserves exactly what TikTok serves; re-encoding at a lower bitrate than the source is where real damage accumulates.",
        ],
        list: [
          "The video's full soundtrack: the creator's original sound, the licensed music TikTok mixed in, or both — exactly as your device played it.",
          "About 128 kbps of quality: matching TikTok's delivery, ideal for ringtones, samples, podcasts and reference listening.",
          "No watermark and no video track: a plain audio file that works offline in any player.",
          "The music title when available: shown in the result panel, so you know whether you are saving \"original sound - username\" or an official track.",
        ],
      },
      {
        heading: "Step by step on phone and desktop",
        list: [
          "In TikTok, tap Share → Copy link on the public video. On desktop, copy the URL from the address bar.",
          "Paste it into the field on this page and let the tool resolve the post.",
          "In the result panel, choose Download Audio for the original M4A/AAC track, or Download Audio (MP3) for a true MP3.",
          "On iPhone the file lands in Files → Downloads; move it into Music or share it to another app from there. An MP3 will never appear in Photos, because Photos does not hold audio; for a ringtone the supported route is GarageBand (create an audio project, drag the file in, trim under 30 seconds, Share → Ringtone → Export).",
          "On Android it saves to Downloads and is picked up by most music players. On desktop it goes to your normal downloads folder — rename it if you keep several sounds, since the default name follows the video title.",
        ],
        paragraphs: [],
      },
      {
        heading: "Working with it as an editor",
        list: [
          "Don't expect more than the source gives — you cannot EQ 128 kbps into a master. For commercial release, license the track properly.",
          "Avoid double encoding: extract once, use that file directly. Re-saving through lossy formats stacks artefacts.",
          "Match loudness, not peaks: bring the clip to about −14 LUFS to sit alongside your other sources.",
          "Use it as a reference: creators routinely pull their own published audio to sync re-edits, subtitles and cross-posts — legitimate and lossless-enough for the purpose.",
        ],
        paragraphs: [
          "TikTok audio is compressed by design, and honest tools preserve rather than inflate what is there. Understand the ceiling, use it within it, and your saves will sound exactly like the app — everywhere, forever.",
        ],
      },
      {
        heading: "When the audio is silent or missing",
        list: [
          "Photo posts and slideshows have no audio stream at all; the page will say so instead of handing you an empty file.",
          "A muted video has no audio track to extract. Check that the post actually plays sound in TikTok before blaming the downloader.",
          "Region-locked licensed music may be stripped or unavailable outside the country where the post was published.",
          "If the MP3 encoder is temporarily unavailable, the original M4A track is still offered — the audio itself is never lost just because the bridge is busy.",
          "A download that stops at the last few percent is usually a browser or connection issue, not a bad file; retry once before assuming the sound is gone.",
        ],
        paragraphs: [],
      },
      {
        heading: "Legal and ethical limits",
        paragraphs: [
          "Downloading for personal listening, offline playback, or quoting a short clip is generally tolerated. Re-publishing someone else's original sound as your own, or using licensed music in monetized content outside TikTok, is not covered by TikTok's licence. Credit the creator when you share the sound, keep commercial use to tracks you have licensed, and respect a takedown if one arrives.",
        ],
      },
    ],
    related: [
      "download-tiktok-video-without-watermark",
      "why-tiktok-video-quality-drops-after-upload",
      "is-downloading-tiktok-videos-legal",
    ],
  },
  {
    slug: "why-tiktok-video-quality-drops-after-upload",
    title: "TikTok Quality, Export Settings and Re-uploading Without Losing Detail",
    metaTitle: "TikTok Quality & Export Settings",
    description:
      "Why crisp footage looks soft after upload, the export settings that survive TikTok's re-encode, how to cross-post to Shorts and Reels, and how to fix an MP4 an editor refuses.",
    updatedAt: "2026-11-12",
    shortAnswer:
      "TikTok re-encodes every upload to its own delivery ladder. If your file arrives low-bitrate, heavily compressed or at an awkward resolution, the second encode has nothing clean to work with and the result looks soft. Export 1080×1920, H.264, 30 or 60 fps, at 10–16 Mbps, and keep one master per project — every extra generation costs detail no setting can put back.",
    sections: [
      {
        heading: "TikTok re-encodes everything — your export is the input",
        paragraphs: [
          "Nothing you upload survives untouched. TikTok transcodes every video into several delivery renditions, commonly led by a 1080p stream at a few Mbps, with 720p, 540p and lower versions behind it for weak connections. Re-encoding is lossy, and lossy-on-lossy compounds: detail that was already smeared by a low-bitrate first encode gets smeared again by the second. This is why a video that looked perfect in your camera roll can look soft after posting.",
          "The fix is not to fight the re-encode. It is to give the encoder a clean master: stable detail, controlled noise and a healthy bitrate. Those are the things a second encode can preserve. Banding, crushed shadows and thin compressed edges are what it destroys first.",
        ],
      },
      {
        heading: "The delivery ladder: why your 4K upload still looks 1080p",
        paragraphs: [
          "TikTok does not publish the exact bitrate ladder, and it changes with device, region and traffic. In practice a 1080×1920 upload is usually delivered near 1080p at roughly 2–4 Mbps, while 720p and 540p renditions sit below that. The player chooses a rendition from your connection speed, so two viewers can watch the same post at visibly different quality.",
          "Uploading 4K does not guarantee a 4K playback path. For most accounts TikTok normalises vertical video to 1080p, and a heavy 4K file that gets downscaled can look worse than a clean 1080p export because the encoder has less bitrate headroom to spend. Export the resolution you want delivered, at a high bitrate, rather than treating 4K as a quality guarantee.",
        ],
      },
      {
        heading: "Best export settings for TikTok",
        list: [
          "Resolution: 1080×1920 (full HD vertical). Export 1080p with a high bitrate instead of trusting TikTok to downscale a 4K file well.",
          "Frame rate: match what you shot — 30 fps for talking head, 60 fps for motion and gameplay. Do not convert 30 fps to 60 fps by duplicating frames; that adds no motion and makes the encode harder.",
          "Codec: H.264 (High profile) for maximum compatibility. HEVC uploads work but can trigger an extra transcode on some Android devices.",
          "Bitrate: 10–16 Mbps for 1080p30, 16–24 Mbps for 1080p60. Higher is fine — TikTok compresses down, but you cannot add detail back after the fact.",
          "Keyframes: every 1–2 seconds (roughly 2× your frame rate). Very long GOPs make scrubbing and rendition switching harder and can smear fast motion.",
          "Audio: AAC, 48 kHz, 128–256 kbps stereo. TikTok re-encodes audio too, so leave headroom rather than exporting a clipped master.",
        ],
        paragraphs: [
          "The keyframe point is the one most creators miss. A keyframe is a complete frame the encoder can start from; the frames between keyframes describe only what changed. If you set a keyframe every ten seconds, the encoder has to guess its way through fast motion for ten seconds at a time, and the artefacts survive TikTok's second encode. A one-to-two-second interval gives it frequent clean anchors.",
        ],
      },
      {
        heading: "Why the first two seconds look worst",
        paragraphs: [
          "Short-form video opens on movement: a face entering frame, a hand waving, a cut from a bright scene to a dark one. Those are exactly the moments a low-bitrate encoder handles badly, and they land in the first two seconds — the window that decides whether a viewer stays. If your hook is soft, the rest of the video rarely gets watched, even when the middle is sharp.",
          "Give the opening shot more bitrate than the rest of the timeline if your editor supports it. Avoid heavy film grain, fog and rapid flicker in the first second; those patterns are expensive to encode and turn to blocky mush first. A clean, high-contrast opening frame survives compression far better than a noisy one.",
        ],
      },
      {
        heading: "How to verify the damage before you upload",
        list: [
          "Compare file size, not just resolution. A one-minute 1080p clip at 10–16 Mbps should be roughly 75–120 MB; a 15 MB file at the same length is heavily compressed before TikTok ever touches it.",
          "Inspect a single frame at 100% in your editor. If edges are already smeared and shadows are blocky in the export, the upload will make both worse.",
          "Play the export on a phone, not only on your monitor. Phone screens are denser; compression artefacts that disappear on a desktop preview are obvious there.",
          "Download your own post afterwards with a tool that returns the source stream, then compare it with the original export. If the downloaded file is much smaller, the platform served a lower rendition — the app may still have played the better one on a fast connection.",
        ],
        paragraphs: [
          "That makes downloading your own post a useful diagnostic. If the app looks sharp but the downloaded file looks soft, you received a lower rendition and can retry on a better connection. If both look soft, the problem happened at upload and the fix belongs in your export settings. A downloader returns the stream the platform serves; it cannot recover detail the platform already discarded, but it does avoid adding another generation of loss.",
        ],
      },
      {
        heading: "Repurposing your own videos for Shorts and Reels",
        paragraphs: [
          "If you created the video, you own the copyright: moving it to YouTube Shorts or Instagram Reels is your right, and cross-posting is how most creators grow. The mistake is not the repost itself — it is the source file most people use. Downloading through TikTok's share menu gives you a re-compressed copy with a burned-in animated watermark, and that file becomes the master for every other platform.",
          "Two things go wrong with a watermarked master. Visually, the bouncing username overlay competes with your captions and on-screen text in the first two seconds. Practically, both Shorts and Reels can detect the TikTok watermark, and watermarked uploads historically get less distribution because they read as recycled content. The overlay also sits in the corners where each platform's own UI later renders.",
        ],
        list: [
          "Copy the link of your own video inside TikTok (Share → Copy link) and resolve the original HD stream.",
          "Save the watermark-free MP4 — it lands as lamptik-<id>.mp4 in your downloads folder.",
          "Trim in your editor: Shorts allows up to 60 seconds, Reels up to 90. Cut the intro/outro beats that do not serve the new audience.",
          "Export once at 1080×1920, H.264, 10–16 Mbps. Upload that single export to each platform — never re-export between uploads.",
          "Set a fresh title and hook per platform, normalise audio to about −14 LUFS, and choose cover frames deliberately. Identical copy across three apps reads as spam.",
        ],
      },
      {
        heading: "1080p60: what a round trip actually costs",
        paragraphs: [
          "Resolution and frame rate are the numbers people quote, but bitrate decides whether the result looks sharp. Doubling the frame rate doubles the frames a codec must describe, so a 60fps clip needs roughly 1.5–2× the bitrate of the same scene at 30fps to look equally clean. Platforms know this and encode accordingly: a 1080p60 upload typically streams back at a few megabits per second, far below the 45–60 Mbps a camera records at.",
          "The rule that matters: decode once, encode once. Importing a compressed file, editing it and exporting it once is unavoidable — exporting twice, or exporting an intermediate you then re-import and export again, is pure loss for no benefit. Three hops are usually visible; five are obvious.",
        ],
        list: [
          "ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate,avg_frame_rate,bit_rate -of default=nw=1 input.mp4 — 60/1 is real 60fps; 30/1 means the platform served you 30.",
          "Set the timeline frame rate to the clip's own rate before you cut; a 60fps clip on a 30fps sequence drops every other frame and reads as judder, not as a bad download.",
          "Export H.264 at CRF 18–20 for the master, keep yuv420p and the High profile for 8-bit delivery, and add -movflags +faststart so the file previews before it finishes downloading.",
          "Never upload a file you downloaded from the same platform as your master — that is a second generation before the platform adds a third.",
        ],
      },
      {
        heading: "When an MP4 will not import in CapCut or Premiere Pro",
        paragraphs: [
          "An MP4 is a box, not a format: it can hold H.264, H.265/HEVC, VP9 or AV1 video and AAC, Opus or AC-3 audio. Editors accept the box and reject the codec inside it. Chrome, VLC and QuickTime ship a wide set of decoders because they play whatever the internet sends; Premiere, CapCut, Resolve and Final Cut ship a narrower set because they decode in real time while you scrub. A file that plays perfectly can still be refused.",
          "Check the real codec first: VLC → Tools → Codec information (\"H264 - MPEG-4 AVC\" is safe; \"HEVC\" or \"VP9\" is the problem), MediaInfo (Video → Format), or QuickTime → Show Movie Inspector. Then convert once with ffmpeg — CRF 18 is visually lossless for most footage, and -pix_fmt yuv420p avoids a profile some editors refuse.",
          "Where the bad file comes from is usually the phone, not the downloader. Since iOS 11, iPhone records in HEVC by default (\"High Efficiency\" in Settings → Camera → Formats) and wraps it in a .mov or .mp4 that plays everywhere but imports nowhere on Windows. TikTok and Instagram, by contrast, serve H.264 with AAC — the compatible pair — which is why a clean TikTok or Reels MP4 is usually import-ready as-is while a 4K YouTube grab usually is not.",
        ],
        list: [
          "ffmpeg -i input.mp4 -c:v libx264 -crf 18 -preset veryfast -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart output.mp4",
          "For a variable-frame-rate clip that stutters on the timeline, add -vsync cfr -r 30 (or 60) to force a constant rate — that is also the fix for audio drifting out of sync on long clips.",
          "Premiere on Windows needs the HEVC Video Extensions package for HEVC; without it the file shows \"unsupported format\". H.264 always works.",
          "CapCut desktop is stricter about audio: a video-only stream can fail the import outright, so add a silent AAC track if you stripped the audio.",
          "Resolve's free version refuses 10-bit H.264 — transcode to ProRes or DNxHR for grading. Final Cut prefers ProRes for long 4K timelines.",
        ],
      },
    ],
    related: [
      "download-tiktok-video-without-watermark",
      "download-tiktok-audio-as-mp3",
      "is-downloading-tiktok-videos-legal",
    ],
  },
  {
    slug: "is-downloading-tiktok-videos-legal",
    title: "Is Downloading TikTok Videos Legal? Copyright, Safety and Enforcement",
    metaTitle: "Is Downloading TikTok Videos Legal?",
    description:
      "The honest answer on copyright, TikTok's terms, fair use and commercial reuse — plus why browser downloaders are safer than modded APKs and extensions.",
    updatedAt: "2026-11-12",
    shortAnswer:
      "Downloading a public TikTok video for personal, offline viewing sits in a gray area: TikTok's terms restrict it, copyright law is what actually decides, and enforcement targets republishers and commercial reuse rather than someone watching on a plane. Re-uploading someone else's video, stripping credit, or using it in anything monetized can infringe copyright outright.",
    sections: [
      {
        heading: "Copyright belongs to the creator, not to TikTok",
        paragraphs: [
          "The moment a creator records and uploads a video, copyright in that footage belongs to them — automatically, in virtually every country that signed the Berne Convention, with no registration required. Uploading grants TikTok a broad licence to host, transcode and display the work. That licence is between the creator and the platform. It does not extend to you, and it does not turn a public post into public property.",
          "This is the part most \"is it legal?\" answers skip: the question is not whether the video is visible, it is whether you have permission to make a copy. Visibility governs access. Copyright governs copies. A public video is easy to reach and still fully protected.",
        ],
      },
      {
        heading: "What TikTok's Terms of Service actually say",
        paragraphs: [
          "TikTok's terms grant users a personal, non-commercial licence to view content inside the app, and separately prohibit copying, reproducing or downloading content except where the platform itself offers that feature or you have the rights holder's permission. Re-uploading a video you downloaded — with or without a credit — means redistributing someone else's work without a licence, which the terms forbid and copyright law treats as infringement.",
          "Worth being precise about the distinction: breaching a platform's terms is a contractual matter between you and TikTok, and the usual consequence is an account action. Infringing copyright is a legal matter between you and the creator, and the consequences can be a takedown, a strike, a demonetisation, or in the worst cases a claim. Saving a video for yourself and re-uploading it are separated by that gap, and it is a wide one.",
        ],
      },
      {
        heading: "Fair use and fair dealing: narrower than people assume",
        paragraphs: [
          "In the United States, fair use is a four-factor balancing test: the purpose and character of your use (commentary, criticism, teaching, parody and other transformative uses fare best), the nature of the work, how much of it you took, and whether your use undercuts the market for the original. The UK, Canada, Australia and the EU use variants called fair dealing, which enumerate specific purposes rather than balancing openly.",
          "Applied honestly, the test rarely protects what downloaders actually do. Quoting eight seconds of a video in a review you narrate is a very different act from re-uploading the whole clip to your own account, and the second does not become lawful because a caption credits the creator. Attribution is an ethical norm and a courtesy; it is not a licence. The factor that sinks most cases is the fourth: if your upload substitutes for the original, you have taken the market value, not merely the footage.",
        ],
      },
      {
        heading: "Personal use versus commercial use: where the line falls",
        paragraphs: [
          "There is no worldwide statute that says \"personal downloading is legal\". What exists is a patchwork: private-copying exceptions in some EU member states funded by levies on blank media, a private-study defence in the UK that was struck down in 2015, and no general private-copying right at all in the US, where the practical tolerance comes from enforcement priorities rather than from permission.",
          "What is consistent across jurisdictions is the direction of risk. Saving a clip to watch offline, to show a friend, or to keep a reference of your own work carries the least exposure. Using it in anything that earns money, gets published, or forms part of a product carries the most — advertising, brand content, courses, stock libraries and monetised repost accounts all sit firmly in that second category, whether or not the video is watermarked.",
        ],
      },
      {
        heading: "What enforcement actually looks like",
        paragraphs: [
          "Creators and rights holders rarely sue individual viewers; the cost makes no sense. What they use instead is the takedown machinery, and it is fast. A copyright complaint to TikTok removes the infringing post and counts against the account; repeated strikes end accounts. On YouTube, Content ID matches uploaded audio and video against registered works automatically, and the practical result is that a monetised channel's revenue is redirected to the rights holder before anyone speaks to a lawyer. Meta runs an equivalent system for Reels and Facebook video.",
          "That machinery explains the pattern people observe. Downloading is not what triggers action, because a private copy is invisible to a platform. Publishing is what triggers action, because that is the moment the copy becomes visible, matchable and rivalrous with the original.",
        ],
      },
      {
        heading: "Downloading responsibly: a checklist that holds up",
        list: [
          "Download what you have a concrete reason to keep — offline viewing, a personal archive of your own posts, a reference copy for a project you own.",
          "Never re-upload someone else's video as your own, with or without a caption credit, and never strip a creator's handle or watermark to obscure the source.",
          "Ask before publishing: a short message asking permission is free, usually answered, and settles the question permanently.",
          "Treat music separately from video: a licensed track inside a TikTok clip is licensed for TikTok, not for your channel or your ad.",
          "Honour takedowns immediately. A creator asking you to remove their content is exercising a right, not making a request.",
          "Keep the source: note where a clip came from while you still remember, so you can credit, license or delete it later.",
        ],
        paragraphs: [],
      },
      {
        heading: "Browser, APK or extension: three very different risk profiles",
        paragraphs: [
          "People reach for a downloader in three forms: a website you paste links into, a modified TikTok APK (\"mod\") that adds a save button, and a browser extension that injects download buttons into TikTok's page. All three promise the same file. What differs is where the code runs — and that single fact determines your exposure.",
          "A modified APK requests everything the real app does — contacts, storage, microphone, camera — plus whatever the modder added. Bundled adware and trojans are the norm in that category, the binary rarely matches any official build, side-loading disables the store's safety review, and TikTok actively detects modified clients. A \"TikTok downloader\" extension is code with privileged access to every page you visit; the worst case is a permissions grab that reads session cookies, and it inherits your logged-in session, so any compromise runs as you.",
          "A browser-based downloader executes the extraction on its own server and hands your device a plain file over HTTPS. There is no app to install, no extension with page privileges, no sideloaded binary, and no TikTok login — the tool processes only the link you paste, without retaining it. The residual risks are ordinary web risks, which is why the checklist below matters.",
        ],
        list: [
          "HTTPS with a valid certificate — non-negotiable baseline.",
          "A real privacy policy and terms page: who runs it, and what it stores (the answer should be close to \"nothing\").",
          "It never asks you to log in to TikTok or paste credentials anywhere — no legitimate tool needs them.",
          "Files arrive as attachments from a clear domain, not through a chain of redirects and pop-ups.",
          "Ads are standard disclosure-based units (check /ads.txt for the publisher), not fake download buttons that navigate away.",
          "No forced app installs: \"Download our app to continue\" is the web version of the mod problem.",
        ],
      },
      {
        heading: "What LAMP TIK does — and deliberately does not do",
        list: [
          "Resolves media that is already public. There is no login, no cookie injection, and no attempt to reach friends-only or private posts.",
          "Does not bypass DRM, paywalls or region locks. If the platform will not serve a rendition to an anonymous request, the tool reports that instead of working around it.",
          "Does not keep your files. Downloads are streamed from the platform's CDN to your device; nothing you save is stored on our servers.",
          "Does not decide whether your use is lawful. That depends on your jurisdiction and what you do with the file, and no downloader can make that judgement for you.",
        ],
        paragraphs: [
          "This page is general information, not legal advice. If a specific use matters commercially, ask a lawyer qualified in your country — the answer changes with jurisdiction and with what you intend to publish.",
        ],
      },
      {
        heading: "If you are the creator: protecting your own work",
        paragraphs: [
          "The same rules run in your favour. You own your uploads, which means you can authorise reuse, and you can also withdraw it — most platforms let you file a copyright complaint against an account that reposted your video, and doing so is routine rather than aggressive. Registering your work with a collection society or a content-matching service extends the same protection to platforms you do not post on, because those systems match the file, not the account.",
          "The practical corollary: putting your own video through a downloader to move it between your own accounts is your right as the rights holder, and it is the single most common legitimate use of a tool like this.",
        ],
      },
    ],
    related: [
      "download-tiktok-video-without-watermark",
      "download-tiktok-audio-as-mp3",
      "why-tiktok-video-quality-drops-after-upload",
    ],
  },
];

export function getGuide(slug: string): Guide | null {
  return GUIDES.find((guide) => guide.slug === slug) ?? null;
}

// Exported for sitemap and guides page
export const GUIDE_LIST: Guide[] = GUIDES;
