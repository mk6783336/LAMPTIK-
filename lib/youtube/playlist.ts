import { AppError } from "@/lib/errors";
import { timedFetch } from "@/lib/http";

/**
 * YouTube playlist listing through the same public InnerTube endpoint the
 * watch page uses. The RSS alternative (`feeds/videos.xml?playlist_id=…`)
 * answers 404 for playlists now, and scraping 2 MB of `ytInitialData` for
 * the same JSON is strictly worse — one POST returns up to 100 entries.
 *
 * This module never resolves a stream: each item is handed to the existing
 * single-video pipeline, so playlist support cannot regress downloads.
 */

const BROWSE_URL =
  "https://www.youtube.com/youtubei/v1/browse?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false";

/** The public web client key/version pair YouTube serves its own pages with. */
const WEB_CLIENT = {
  clientName: "WEB",
  clientVersion: "2.20241010.00.00",
  hl: "en",
  gl: "US",
} as const;

const MAX_ITEMS = 50;

export interface PlaylistItem {
  id: string;
  title: string;
  thumbnail: string | null;
  /** Canonical watch URL for the existing YouTube downloader. */
  url: string;
}

export interface PlaylistSummary {
  id: string;
  title: string;
  /** Items returned in this response (capped at MAX_ITEMS). */
  count: number;
  items: PlaylistItem[];
}

/** Extract a playlist id from a full URL, a share URL, or a bare id. */
export function parsePlaylistId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const fromQuery = raw.match(/[?&]list=([A-Za-z0-9_-]{10,80})/);
  const candidate = fromQuery?.[1] ?? (/^[A-Za-z0-9_-]{10,80}$/.test(raw) ? raw : null);
  if (!candidate) return null;

  // `RD…` is a generated radio/mix id, not a saved playlist; it also has no
  // stable contents, so accepting it would produce a page that never loads.
  if (candidate.startsWith("RD")) return null;

  return candidate;
}

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringAt(value: unknown, ...path: string[]): string | null {
  let current: unknown = value;
  for (const key of path) {
    if (!isRecord(current)) return null;
    current = current[key];
  }
  return typeof current === "string" && current.trim() ? current.trim() : null;
}

/**
 * Find playlist entries wherever InnerTube nests them. YouTube has moved
 * this shape twice (`playlistVideoRenderer` → `lockupViewModel`); matching on
 * the stable fields (`contentType` + 11-char `contentId`) survives both.
 */
function collectItems(root: unknown): PlaylistItem[] {
  const items: PlaylistItem[] = [];
  const seen = new Set<string>();

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const entry of node) visit(entry);
      return;
    }
    if (!isRecord(node)) return;

    const contentId = node.contentId;
    const contentType = node.contentType;
    if (
      typeof contentId === "string" &&
      /^[A-Za-z0-9_-]{11}$/.test(contentId) &&
      contentType === "LOCKUP_CONTENT_TYPE_VIDEO" &&
      !seen.has(contentId)
    ) {
      const title =
        stringAt(node, "metadata", "lockupMetadataViewModel", "title", "content") ??
        // Older payload shape, still served for some clients.
        stringAt(node, "title", "runs", "0", "text") ??
        `${contentId}`;

      const sources = (node.contentImage as Json | undefined)?.thumbnailViewModel;
      const sourceList =
        isRecord(sources) &&
        isRecord(sources.image) &&
        Array.isArray(sources.image.sources)
          ? sources.image.sources
          : [];

      // The last source is the largest rendition YouTube offers.
      const largest = sourceList
        .filter(isRecord)
        .map((source) => (typeof source.url === "string" ? source.url : null))
        .filter((url): url is string => Boolean(url))
        .pop();

      seen.add(contentId);
      items.push({
        id: contentId,
        title,
        thumbnail: largest ?? `https://i.ytimg.com/vi/${contentId}/hqdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${contentId}`,
      });
      return;
    }

    for (const value of Object.values(node)) visit(value);
  };

  visit(root);
  return items.slice(0, MAX_ITEMS);
}

export async function fetchPlaylist(rawInput: string): Promise<PlaylistSummary> {
  const id = parsePlaylistId(rawInput);
  if (!id) {
    throw new AppError(
      "INVALID_URL",
      "That isn't a YouTube playlist link.",
      "Paste a link that contains `list=` — e.g. https://www.youtube.com/playlist?list=PL…",
    );
  }

  let response: Response;
  try {
    response = await timedFetch(
      BROWSE_URL,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
        body: JSON.stringify({
          context: { client: WEB_CLIENT },
          browseId: `VL${id}`,
        }),
      },
      12_000,
    );
  } catch {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "YouTube is responding slowly right now.",
      "Try the playlist again in a few seconds.",
    );
  }

  if (!response.ok) {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "YouTube didn't return that playlist.",
      "Check that the playlist is public, then try again.",
    );
  }

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!isRecord(payload)) {
    throw new AppError(
      "PROVIDER_UNAVAILABLE",
      "YouTube returned an unreadable playlist.",
      "Try again in a minute.",
    );
  }

  const items = collectItems(payload);

  if (items.length === 0) {
    throw new AppError(
      "VIDEO_NOT_FOUND",
      "That playlist is empty, private, or deleted.",
      "Open it on YouTube first — only public playlists can be listed.",
    );
  }

  const title =
    stringAt(payload, "metadata", "playlistMetadataRenderer", "title") ??
    stringAt(payload, "header", "playlistHeaderRenderer", "title", "simpleText") ??
    "YouTube playlist";

  return { id, title, count: items.length, items };
}
