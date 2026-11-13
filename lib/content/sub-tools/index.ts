import type { SubTool } from "@/lib/content/sub-tool-types";

import { entry as canada } from "./download-videos-canada";
import { entry as germany } from "./download-videos-germany";
import { entry as unitedKingdom } from "./download-videos-united-kingdom";
import { entry as unitedStates } from "./download-videos-united-states";
import { entry as facebookLiveReplay } from "./download-facebook-live-video";
import { entry as facebookReels } from "./facebook-reels-downloader";
import { entry as instagramReelsAudio } from "./instagram-reels-audio";
import { entry as instagramReelsToMp4 } from "./instagram-reels-to-mp4";
import { entry as tiktokMp3 } from "./tiktok-mp3-downloader";
import { entry as tiktokPhoto } from "./tiktok-photo-downloader";
import { entry as tiktokVideoForCapcut } from "./tiktok-video-for-capcut";
import { entry as tiktokVideoIphone } from "./tiktok-video-download-iphone";
import { entry as vtTiktok } from "./vt-tiktok-com-downloader";
import { entry as youtubePlaylist } from "./youtube-playlist-downloader";
import { entry as youtubeMusicToMp3 } from "./youtube-music-to-mp3";
import { entry as youtubeShorts } from "./youtube-shorts-downloader";
import { entry as youtubeShortsToMp3 } from "./youtube-shorts-to-mp3";
import { entry as youtubeAudioBitrate } from "./youtube-audio-bitrate";
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
 * This array is the single source for every route, the sitemap entries
 * and the cross-links — a page that exists but is not listed here would be an
 * orphan, and an entry here without a route file would 404 in the sitemap.
 *
 * Four entries used to sit here that were the same topic as a platform page
 * with a modifier bolted on — "Instagram Reels on iPhone", "Reels without
 * login", "Facebook without an app", "fb.watch". Each split the internal links
 * and the crawl budget of the page it duplicated, so they were retired in
 * favour of the platform pages, with the questions worth keeping moved onto
 * them. See the redirects in next.config.ts.
 */
export const SUB_TOOLS: readonly SubTool[] = [
  tiktokMp3,
  youtubeToMp3,
  facebookReels,
  youtubeShorts,
  youtubeToMp4,
  youtubeShortsToMp3,
  youtubeMusicToMp3,
  youtubeVideoIphone,
  tiktokVideoIphone,
  vtTiktok,
  // Batch three: two new surfaces (photo mode, playlist listing) and the
  // Reels-audio answer. The photo and playlist pages mount dedicated panels;
  // their `toolKind` keeps the video downloader out of an input shape it
  // cannot resolve.
  tiktokPhoto,
  youtubePlaylist,
  instagramReelsAudio,
  // Batch four: creator-tool intents. Each one is a *file* question rather than
  // a platform question — the format an editor accepts, the fact that a Reel is
  // already MP4, and the bitrate YouTube actually serves — so none of them
  // repeats a page that already exists.
  tiktokVideoForCapcut,
  instagramReelsToMp4,
  youtubeAudioBitrate,
  // Batch five: the country cluster. Not another platform or format — the same
  // four resolvers answered for one market, because the two things that block
  // a download (what the local copyright rules allow, and which videos the
  // platform refuses to serve there) are country-specific in a way that no
  // single global page can say. Each one mounts a *different* platform so the
  // four are not one page with a country name swapped in.
  unitedStates,
  unitedKingdom,
  canada,
  germany,
  // Batch six: one archival intent, not a format one. A finished Facebook
  // Live is an ordinary video object, and the replay question ("after it
  // ends") is the only live-stream phrasing that can be answered truthfully.
  facebookLiveReplay,
];

export const SUB_TOOL_MAP: Readonly<Record<string, SubTool>> = Object.fromEntries(
  SUB_TOOLS.map((tool) => [tool.slug, tool]),
);

export function getSubTool(slug: string): SubTool | undefined {
  return SUB_TOOL_MAP[slug];
}
