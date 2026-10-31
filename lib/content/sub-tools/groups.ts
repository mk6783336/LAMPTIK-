import type { SubTool } from "@/lib/content/sub-tool-types";

import { SUB_TOOL_MAP } from "./index";

/**
 * The fifteen sub-tools, arranged by the task a visitor arrives with.
 *
 * Alphabetical or platform-ordered lists make sense to the person who built
 * the site; a visitor searching "youtube mp3" does not care that Story
 * downloaders exist. Each group below is one *task* — save the video, save the
 * sound, beat a 24-hour expiry, get past a device or a login wall — so a
 * reader can find their page without knowing our URL structure.
 *
 * `SUB_TOOL_MAP` is the source of truth: a slug that has no entry is dropped
 * rather than rendered as a dead link, and every tool in the index belongs to
 * exactly one group (asserted by the count check below).
 */
export interface ToolGroup {
  id: string;
  /** Heading phrased as the task, not the platform. */
  title: string;
  /** One sentence a visitor can decide from. */
  intent: string;
  slugs: readonly string[];
}

export const TOOL_GROUPS: readonly ToolGroup[] = [
  {
    id: "video",
    title: "Save the video",
    intent:
      "Full-resolution MP4 with the watermark untouched — the stream the platform published, not a re-encode of it.",
    slugs: [
      "youtube-to-mp4-1080p",
      "youtube-shorts-downloader",
      "facebook-reels-downloader",
    ],
  },
  {
    id: "photos",
    title: "Save a photo post",
    intent:
      "TikTok photo mode has no video stream at all. This page reads the slides instead and saves each image at the resolution TikTok serves.",
    slugs: ["tiktok-photo-downloader"],
  },
  {
    id: "audio",
    title: "Save the sound",
    intent:
      "MP3 and M4A taken from the source audio track, so a 128 kbps upload stays 128 kbps instead of being padded to a fake 320.",
    slugs: [
      "youtube-to-mp3",
      "youtube-shorts-to-mp3",
      "youtube-music-to-mp3",
      "tiktok-mp3-downloader",
      "instagram-reels-audio",
    ],
  },
  {
    id: "playlists",
    title: "Work through a playlist",
    intent:
      "A playlist is a list, not a file. This page lists the videos in order and opens each one in the same single-video downloader.",
    slugs: ["youtube-playlist-downloader"],
  },
  {
    id: "stories",
    title: "Beat the 24-hour expiry",
    intent:
      "Stories delete themselves a day after posting. These two save the frame before it disappears — no watermark, no login.",
    slugs: ["tiktok-story-downloader", "instagram-story-downloader"],
  },
  {
    id: "access",
    title: "iPhone and short links",
    intent:
      "The two things that actually block a download: the device you are on, and the shape of the URL. Login walls and \"without an app\" variants belong on the platform pages themselves.",
    slugs: [
      "youtube-video-download-iphone",
      "tiktok-video-download-iphone",
      "vt-tiktok-com-downloader",
    ],
  },
];

export interface ResolvedToolGroup extends Omit<ToolGroup, "slugs"> {
  tools: SubTool[];
}

/** Groups with their slugs resolved to entries, empty groups removed. */
export const GROUPED_TOOLS: readonly ResolvedToolGroup[] = TOOL_GROUPS.map((group) => ({
  id: group.id,
  title: group.title,
  intent: group.intent,
  tools: group.slugs.flatMap((slug) => {
    const tool = SUB_TOOL_MAP[slug];
    return tool ? [tool] : [];
  }),
})).filter((group) => group.tools.length > 0);

/** Total tools listed on the hub — shown in the count chips and schema. */
export const GROUPED_TOOL_COUNT = GROUPED_TOOLS.reduce(
  (total, group) => total + group.tools.length,
  0,
);

/**
 * Card heading: the page title without its ` - benefit` / ` — benefit` tail.
 * Titles are keyword-first, so the head is already the human-readable name.
 */
export function toolLabel(tool: SubTool): string {
  return tool.title.split(/\s+[—–-]\s+/)[0] ?? tool.title;
}
