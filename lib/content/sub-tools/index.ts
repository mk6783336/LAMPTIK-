import type { SubTool } from "@/lib/content/sub-tool-types";

import { entry as facebookReels } from "./facebook-reels-downloader";
import { entry as facebookVideoNoApp } from "./facebook-video-download-without-app";
import { entry as fbWatch } from "./fb-watch-downloader";
import { entry as instagramReelsAudio } from "./instagram-reels-audio";
import { entry as instagramReelsIphone } from "./instagram-reels-download-iphone";
import { entry as instagramReelsNoLogin } from "./instagram-reels-download-without-login";
import { entry as instagramStory } from "./instagram-story-downloader";
import { entry as tiktokMp3 } from "./tiktok-mp3-downloader";
import { entry as tiktokPhoto } from "./tiktok-photo-downloader";
import { entry as tiktokStory } from "./tiktok-story-downloader";
import { entry as tiktokVideoIphone } from "./tiktok-video-download-iphone";
import { entry as vtTiktok } from "./vt-tiktok-com-downloader";
import { entry as youtubePlaylist } from "./youtube-playlist-downloader";
import { entry as youtubeMusicToMp3 } from "./youtube-music-to-mp3";
import { entry as youtubeShorts } from "./youtube-shorts-downloader";
import { entry as youtubeShortsToMp3 } from "./youtube-shorts-to-mp3";
import { entry as youtubeToMp3 } from "./youtube-to-mp3";
import { entry as youtubeToMp4 } from "./youtube-to-mp4-1080p";
import { entry as youtubeVideoIphone } from "./youtube-video-download-iphone";

/**
 * Every programmatic sub-tool page, in navigation order.
 *
 * The original six cover a format (MP3, Shorts, Stories, Reels); the ten
 * after them cover a long-tail question — a resolution, a device, a link
 * shape, or a login concern — and each one links back to the related tools
 * and to the guides that explain its mechanics.
 *
 * This array is the single source for the nineteen routes, the sitemap entries
 * and the cross-links — a page that exists but is not listed here would be an
 * orphan, and an entry here without a route file would 404 in the sitemap.
 */
export const SUB_TOOLS: readonly SubTool[] = [
  tiktokMp3,
  youtubeToMp3,
  tiktokStory,
  instagramStory,
  facebookReels,
  youtubeShorts,
  youtubeToMp4,
  youtubeShortsToMp3,
  youtubeMusicToMp3,
  youtubeVideoIphone,
  tiktokVideoIphone,
  vtTiktok,
  instagramReelsNoLogin,
  instagramReelsIphone,
  facebookVideoNoApp,
  fbWatch,
  // Batch three: two new surfaces (photo mode, playlist listing) and the
  // Reels-audio answer. The photo and playlist pages mount dedicated panels;
  // their `toolKind` keeps the video downloader out of an input shape it
  // cannot resolve.
  tiktokPhoto,
  youtubePlaylist,
  instagramReelsAudio,
];

export const SUB_TOOL_MAP: Readonly<Record<string, SubTool>> = Object.fromEntries(
  SUB_TOOLS.map((tool) => [tool.slug, tool]),
);

export function getSubTool(slug: string): SubTool | undefined {
  return SUB_TOOL_MAP[slug];
}
