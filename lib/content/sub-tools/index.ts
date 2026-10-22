import type { SubTool } from "@/lib/content/sub-tool-types";

import { entry as facebookReels } from "./facebook-reels-downloader";
import { entry as instagramStory } from "./instagram-story-downloader";
import { entry as tiktokMp3 } from "./tiktok-mp3-downloader";
import { entry as tiktokStory } from "./tiktok-story-downloader";
import { entry as youtubeShorts } from "./youtube-shorts-downloader";
import { entry as youtubeToMp3 } from "./youtube-to-mp3";

/**
 * Every programmatic sub-tool page, in navigation order.
 *
 * This array is the single source for the six routes, the sitemap entries and
 * the footer matrix — a page that exists but is not listed here would be an
 * orphan, and an entry here without a route file would 404 in the sitemap.
 */
export const SUB_TOOLS: readonly SubTool[] = [
  tiktokMp3,
  youtubeToMp3,
  tiktokStory,
  instagramStory,
  facebookReels,
  youtubeShorts,
];

export const SUB_TOOL_MAP: Readonly<Record<string, SubTool>> = Object.fromEntries(
  SUB_TOOLS.map((tool) => [tool.slug, tool]),
);

export function getSubTool(slug: string): SubTool | undefined {
  return SUB_TOOL_MAP[slug];
}
