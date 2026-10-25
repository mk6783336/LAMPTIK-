/**
 * Bridge endpoint list — shared by the Node resolver (`lib/youtube-ytdlp.ts`)
 * and the Edge download route, which has to recognise ANY configured bridge
 * host as a hand-off target.
 *
 * Two ways to configure a failover pair:
 *
 *   YTDLP_BRIDGE_URL=https://bridge.lamptik.online,https://me-lamptik.hf.space
 *   YTDLP_BRIDGE_BACKUP_URL=https://me-lamptik.hf.space
 *
 * The first entry is the primary (normally the residential PC behind a
 * tunnel); the rest are failover, tried in order. Kept free of Node imports so
 * the Edge runtime can bundle it safely.
 */

const MAX_BRIDGES = 4;

function normalise(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[\s,]+/)
    .map((entry) => entry.trim().replace(/\/+$/, ""))
    .filter((entry) => /^https:\/\/[^\s]{4,2048}$/.test(entry));
}

/** Ordered, de-duplicated bridge bases (no trailing slash). */
export function bridgeEndpoints(): string[] {
  const configured = [
    ...normalise(process.env.YTDLP_WORKER_URL),
    ...normalise(process.env.NEXT_PUBLIC_YTDLP_WORKER_URL),
    ...normalise(process.env.YTDLP_BRIDGE_URL),
    ...normalise(process.env.YTDLP_BRIDGE_BACKUP_URL),
  ];

  const unique: string[] = [];
  for (const candidate of configured) {
    if (unique.some((entry) => entry.toLowerCase() === candidate.toLowerCase())) continue;
    unique.push(candidate);
    if (unique.length >= MAX_BRIDGES) break;
  }
  return unique;
}

/** The primary bridge, or null when none is configured. */
export function primaryBridgeUrl(): string | null {
  return bridgeEndpoints()[0] ?? null;
}

/** True when a URL points at any configured bridge host. */
export function isBridgeHost(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    return false;
  }
  return bridgeEndpoints().some((base) => {
    try {
      return new URL(base).host === host;
    } catch {
      return false;
    }
  });
}
